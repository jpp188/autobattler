/**
 * Sums up artifact effects so the rest of the game can ask simple questions.
 */
import type { ArtifactDef, ArtifactEffect, CombatStatKey, PassiveDef, UnitFilter } from './types';

export interface ArtifactTotals {
  boardLimit: number;
  benchSlots: number;
  goldPerWin: number;
  traitOdds: Record<string, number>;
  rarityLuck: number;
  startCharge: number;
  heroHealAfterFight: number;
  shopDiscount: number;
  teamFlat: Partial<Record<CombatStatKey, number>>;
  teamPct: Partial<Record<CombatStatKey, number>>;
  heroFlat: Partial<Record<CombatStatKey, number>>;
  heroPct: Partial<Record<CombatStatKey, number>>;
  actStarUp: number;
  heroMaxHpPct: number;
  extraPackChoice: number;
  interest: { per: number; max: number } | null;
  sellBonus: number;
  /** Filtered stat bonuses and passives, checked per unit when a battle is built. */
  unitStats: { who: UnitFilter; stats: Partial<Record<CombatStatKey, number>>; pct: boolean }[];
  unitPassives: { who: UnitFilter; passive: PassiveDef }[];
  enemyFlat: Partial<Record<CombatStatKey, number>>;
  enemyPct: Partial<Record<CombatStatKey, number>>;
  restHeal: number;
  freeRerolls: number;
}

function add(target: Partial<Record<CombatStatKey, number>>, stats: Partial<Record<CombatStatKey, number>>): void {
  for (const [k, v] of Object.entries(stats)) target[k as CombatStatKey] = (target[k as CombatStatKey] ?? 0) + (v ?? 0);
}

export function artifactTotals(defs: readonly ArtifactDef[]): ArtifactTotals {
  const t: ArtifactTotals = {
    boardLimit: 0,
    benchSlots: 0,
    goldPerWin: 0,
    traitOdds: {},
    rarityLuck: 0,
    startCharge: 0,
    heroHealAfterFight: 0,
    shopDiscount: 0,
    teamFlat: {},
    teamPct: {},
    heroFlat: {},
    heroPct: {},
    actStarUp: 0,
    heroMaxHpPct: 0,
    extraPackChoice: 0,
    interest: null,
    sellBonus: 0,
    unitStats: [],
    unitPassives: [],
    enemyFlat: {},
    enemyPct: {},
    restHeal: 0,
    freeRerolls: 0,
  };
  const apply = (e: ArtifactEffect) => {
    switch (e.k) {
      case 'boardLimit':
        t.boardLimit += e.n;
        break;
      case 'benchSlots':
        t.benchSlots += e.n;
        break;
      case 'goldPerWin':
        t.goldPerWin += e.n;
        break;
      case 'traitOdds':
        t.traitOdds[e.trait] = (t.traitOdds[e.trait] ?? 0) + e.pct / 100;
        break;
      case 'rarityLuck':
        t.rarityLuck += e.pct;
        break;
      case 'startCharge':
        t.startCharge += e.n;
        break;
      case 'heroHealAfterFight':
        t.heroHealAfterFight += e.pct;
        break;
      case 'shopDiscount':
        t.shopDiscount += e.pct;
        break;
      case 'teamStats':
        add(e.pct ? t.teamPct : t.teamFlat, e.stats);
        break;
      case 'heroStats':
        add(e.pct ? t.heroPct : t.heroFlat, e.stats);
        break;
      case 'actStarUp':
        t.actStarUp += e.n;
        break;
      case 'heroMaxHp':
        t.heroMaxHpPct += e.pct;
        break;
      case 'extraPackChoice':
        t.extraPackChoice += 1;
        break;
      case 'interest':
        t.interest = { per: e.per, max: (t.interest?.max ?? 0) + e.max };
        break;
      case 'sellBonus':
        t.sellBonus += e.n;
        break;
      case 'unitStats':
        t.unitStats.push({ who: e.who, stats: e.stats, pct: !!e.pct });
        break;
      case 'unitPassive':
        t.unitPassives.push({ who: e.who, passive: e.passive });
        break;
      case 'enemyStats':
        add(e.pct ? t.enemyPct : t.enemyFlat, e.stats);
        break;
      case 'restHeal':
        t.restHeal += e.pct;
        break;
      case 'freeRerolls':
        t.freeRerolls += e.n;
        break;
    }
  };
  for (const d of defs) d.effects.forEach(apply);
  t.shopDiscount = Math.min(50, t.shopDiscount);
  return t;
}

/** Whether an artifact's unit filter matches a board unit. */
export function matchesFilter(who: UnitFilter, u: { role: string; row: number; star: number; isHero: boolean }): boolean {
  if (who.heroOnly) return u.isHero;
  if (u.isHero && who.hero === false) return false;
  if (who.roles && !who.roles.includes(u.role as never)) return false;
  if (who.row === 'front' && u.row !== 0) return false;
  if (who.row === 'back' && u.row === 0) return false;
  if (who.maxStar !== undefined && u.star > who.maxStar) return false;
  return true;
}
