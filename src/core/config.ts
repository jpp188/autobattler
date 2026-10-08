/**
 * Every tuning number in one place. Change values here to rebalance the game.
 */
import type { Rarity, RarityWeights, Role, Stats } from './types';

export const CONFIG = {
  /** Fixed simulation tick rate. */
  tickRate: 20,
  /** Seconds before overtime starts ramping damage. */
  overtimeStart: 35,
  /** Extra damage percent per second of overtime. */
  overtimeAmpPerSec: 12,
  /** Seconds before a battle is forcibly ended. */
  maxBattleSeconds: 120,
  /** Hero HP fraction lost if a battle times out. */
  timeoutHeroDamagePct: 0.25,

  board: {
    cols: 7,
    rowsPerSide: 4,
    startLimit: 5,
    maxLimit: 9,
    benchSlots: 8,
    maxBenchSlots: 10,
  },

  combat: {
    chargePerAttack: 10,
    chargePerHitTaken: 3,
    chargeMax: 100,
    defaultCastTime: 0.5,
    critMultiplier: 1.5,
    /** Melee attacks land this many seconds after the swing starts. */
    meleeWindup: 0.15,
    projectileSpeed: 8,
  },

  rarityStatMult: { common: 1.0, uncommon: 1.15, rare: 1.3, epic: 1.45, legendary: 1.6 } as Record<Rarity, number>,
  /** HP and attack damage multipliers per star level. */
  starStatMult: [1, 1.8, 3.2] as const,

  /** Role stat templates for a 1-star Common (before rarity multiplier). */
  roleStats: {
    tank: { hp: 700, ad: 45, as: 0.6, range: 1, armor: 45, mr: 40, crit: 0.05, ms: 2 },
    fighter: { hp: 600, ad: 60, as: 0.7, range: 1, armor: 30, mr: 30, crit: 0.1, ms: 2 },
    assassin: { hp: 480, ad: 65, as: 0.8, range: 1, armor: 20, mr: 20, crit: 0.25, ms: 2.5 },
    marksman: { hp: 450, ad: 55, as: 0.75, range: 4, armor: 15, mr: 15, crit: 0.15, ms: 2 },
    caster: { hp: 450, ad: 40, as: 0.65, range: 3, armor: 15, mr: 25, crit: 0.05, ms: 2 },
    support: { hp: 500, ad: 40, as: 0.65, range: 3, armor: 20, mr: 30, crit: 0.05, ms: 2 },
  } as Record<Role, Stats>,

  hero: {
    /** Hero stats grow each act: multiplier = 1 + perAct × act. */
    statGrowthPerAct: 0.45,
    /** Hero max HP growth per act (separate so the run's health grows too). */
    hpGrowthPerAct: 0.5,
    healAfterWinPct: 0.1,
    restHealPct: 0.35,
    trainHpBonus: 150,
    trainAdBonus: 20,
  },

  momentum: {
    max: 100,
    gainBase: 25,
    gainDivisor: 125,
    winBonus: 5,
    decayMult: 0.45,
    decayFlat: 5,
    thresholds: [25, 50, 75, 100] as const,
    /** Extra pull weight (fraction) at each threshold, by index. */
    pullBonus: [0.1, 0.2, 0.3, 0.4] as const,
    /** Stat bonus (fraction) at each threshold, by index. */
    statBonus: [0, 0.05, 0.05, 0.1] as const,
    traitPackAt: 75,
    starUpAt: 100,
  },

  economy: {
    startGold: 10,
    goldBattle: 6,
    goldElite: 12,
    goldBoss: 25,
    goldLoss: 2,
    /** Win streak bonus by streak length (index = streak, capped at the last). */
    streakBonus: [0, 0, 1, 2, 3] as const,
    sellBase: { common: 1, uncommon: 2, rare: 4, epic: 6, legendary: 10 } as Record<Rarity, number>,
    /** Sale value multiplier per star (a 2-star is two copies, a 3-star four). */
    sellStarMult: [1, 2, 4] as const,
    shopPackCount: [4, 6] as const,
    shopArtifactCount: 2,
    rerollCosts: [0, 2, 4, 7, 10, 15] as const,
    healServicePrice: 8,
    healServicePct: 0.3,
    removeServicePrice: 3,
    artifactPrice: { common: 12, uncommon: 18, rare: 26, boss: 40 } as Record<string, number>,
    treasureGold: [12, 20] as const,
  },

  packs: {
    /** Rarity weight multiplier per act above the first: w × (1 + actLean × act × rarityIndex). */
    actLean: 0.08,
    rewardChoices: 3,
  },

  enemy: {
    /** Enemy stat multiplier per act (index = act, 0 = prologue). */
    actMult: [0.8, 1.0, 1.75, 2.85] as const,
    /** Additional multiplier per floor within an act. */
    floorMult: 0.035,
    eliteMult: 1.2,
    bossMult: 1.05,
  },

  map: {
    floors: 15,
    width: 7,
    paths: 4,
    prologueNodes: 5,
  },
} as const;

export type Config = typeof CONFIG;

export const DEFAULT_PACK_WEIGHTS: RarityWeights = { common: 60, uncommon: 28, rare: 9, epic: 2.5, legendary: 0.5 };
