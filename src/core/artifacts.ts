/**
 * Sums up artifact effects so the rest of the game can ask simple questions.
 */
import type { ArtifactDef, ArtifactEffect, CombatStatKey } from './types';

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
    }
  };
  for (const d of defs) d.effects.forEach(apply);
  t.shopDiscount = Math.min(50, t.shopDiscount);
  return t;
}
