/**
 * Small helpers that keep the data files short. They only build plain data
 * objects; there is no logic here.
 */
import type { AbilityStep, CombatStatKey, DamageType, Effect, FxKind, PerStar, TargetSel } from '../core/types';

export const S = {
  self: { pick: 'self' } as TargetSel,
  target: { pick: 'target' } as TargetSel,
  attacker: { pick: 'attacker' } as TargetSel,
  allEnemies: { pick: 'all', side: 'enemy' } as TargetSel,
  allAllies: { pick: 'all', side: 'ally', includeSelf: true } as TargetSel,
  nearest: (count: PerStar = 1): TargetSel => ({ pick: 'nearest', side: 'enemy', count }),
  farthest: (count: PerStar = 1): TargetSel => ({ pick: 'farthest', side: 'enemy', count }),
  lowestEnemy: (count: PerStar = 1): TargetSel => ({ pick: 'lowestHp', side: 'enemy', count }),
  lowestAlly: (count: PerStar = 1, includeSelf = true): TargetSel => ({ pick: 'lowestHp', side: 'ally', count, includeSelf }),
  randomEnemies: (count: PerStar): TargetSel => ({ pick: 'random', side: 'enemy', count }),
  highestAdAlly: (count: PerStar = 1): TargetSel => ({ pick: 'highestAd', side: 'ally', count, includeSelf: true }),
  /** Enemies within radius of the caster. */
  aroundSelf: (radius: PerStar): TargetSel => ({ pick: 'self', side: 'enemy', radius }),
  /** Allies within radius of the caster (including the caster). */
  alliesAround: (radius: PerStar): TargetSel => ({ pick: 'self', side: 'ally', radius, includeSelf: true }),
  /** The current target plus enemies within radius of it. */
  aroundTarget: (radius: PerStar): TargetSel => ({ pick: 'target', side: 'enemy', radius }),
};

export const E = {
  phys: (amount: PerStar, adRatio?: PerStar): Effect => ({ k: 'damage', amount, adRatio, dtype: 'physical' }),
  magic: (amount: PerStar, adRatio?: PerStar): Effect => ({ k: 'damage', amount, adRatio, dtype: 'magic' }),
  trueDmg: (amount: PerStar, adRatio?: PerStar): Effect => ({ k: 'damage', amount, adRatio, dtype: 'true' }),
  pctDmg: (maxHpPct: PerStar, dtype: DamageType = 'magic'): Effect => ({ k: 'damage', amount: 0, maxHpPct, dtype }),
  heal: (amount: PerStar, maxHpPct?: PerStar): Effect => ({ k: 'heal', amount, maxHpPct }),
  shield: (amount: PerStar, duration = 4, maxHpPct?: PerStar): Effect => ({ k: 'shield', amount, duration, maxHpPct }),
  stun: (duration: PerStar): Effect => ({ k: 'stun', duration }),
  buff: (stat: CombatStatKey, amount: PerStar, duration?: number, pct = false): Effect => ({ k: 'buff', stat, amount, duration, pct }),
  buffPct: (stat: CombatStatKey, amount: PerStar, duration?: number): Effect => ({ k: 'buff', stat, amount, duration, pct: true }),
  debuff: (stat: CombatStatKey, amount: PerStar, duration?: number, pct = false): Effect => ({ k: 'debuff', stat, amount, duration, pct }),
  debuffPct: (stat: CombatStatKey, amount: PerStar, duration?: number): Effect => ({ k: 'debuff', stat, amount, duration, pct: true }),
  dot: (dps: PerStar, duration: number, dtype: DamageType = 'magic'): Effect => ({ k: 'dot', dps, duration, dtype }),
  summon: (unit: string, count: PerStar, star?: PerStar): Effect => ({ k: 'summon', unit, count, star }),
  dash: (to: 'target' | 'backline' | 'away'): Effect => ({ k: 'dash', to }),
  charge: (amount: PerStar): Effect => ({ k: 'charge', amount }),
  taunt: (duration: PerStar): Effect => ({ k: 'taunt', duration }),
  cleanse: (): Effect => ({ k: 'cleanse' }),
  invuln: (duration: PerStar): Effect => ({ k: 'invulnerable', duration }),
  guarded: (tag: string): Effect => ({ k: 'guarded', tag }),
  swap: (): Effect => ({ k: 'swap' }),
  execute: (threshold: PerStar): Effect => ({ k: 'execute', threshold }),
  knockback: (distance: number): Effect => ({ k: 'knockback', distance }),
};

export function step(sel: TargetSel, effects: Effect[], fx?: FxKind, projectile?: number): AbilityStep {
  return { sel, effects, fx, projectile };
}
