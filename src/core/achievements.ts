/**
 * Achievement checks against the current run. Pure: returns the ids of
 * achievements newly met; the caller records them in meta progress.
 */
import type { AchievementDef } from './types';
import { rarityIndex } from './types';
import { boardTraitStatuses, type RunState } from './run';
import { getUnit } from '../data';

export function achievementMet(run: RunState, a: AchievementDef): boolean {
  if (a.hero !== run.heroId) return false;
  const c = a.cond;
  const units = run.roster.units.filter((u) => !u.hero);
  switch (c.k) {
    case 'winRun':
      return !!run.result?.won;
    case 'reachAct':
      return run.act >= c.act;
    case 'reachActWithRarity':
      return run.act >= c.act && units.filter((u) => rarityIndex(getUnit(u.defId).rarity) >= rarityIndex(c.rarity)).length >= c.count;
    case 'soloHeroWin':
      return run.stats.soloHeroWins > 0;
    case 'momentumPair':
      return run.stats.maxMomentumPairs >= 2;
    case 'threeStar':
      return units.some((u) => u.star === 3 && (!c.rarity || rarityIndex(getUnit(u.defId).rarity) >= rarityIndex(c.rarity)));
    case 'beatBoss':
      return run.act > c.act || (!!run.result?.won && run.act >= c.act);
    case 'goldHeld':
      return run.gold >= c.n;
    case 'traitActive':
      return boardTraitStatuses(run).some((s) => s.trait.id === c.trait && s.count >= c.count);
    case 'legendaryPull':
      return run.pulled.some((id) => getUnit(id).rarity === 'legendary');
    case 'winNoDamage':
      return (run.stats.flawlessBossWins ?? 0) > 0;
  }
}

/** Ids of achievements met by this run that are not already unlocked. */
export function newAchievements(run: RunState, all: readonly AchievementDef[], unlocked: readonly string[]): string[] {
  return all.filter((a) => !unlocked.includes(a.id) && achievementMet(run, a)).map((a) => a.id);
}
