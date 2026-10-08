/**
 * Unit stat helpers: role templates, rarity and star multipliers, and the
 * final combat stats a unit brings into battle.
 */
import { CONFIG } from './config';
import type { CombatStatKey, CombatStats, PerStar, Rarity, Role, Star, Stats } from './types';

/** Builds a unit's 1-star base stats from its role and rarity, with optional multipliers. */
export function makeStats(role: Role, rarity: Rarity, mods: Partial<Stats> = {}, flat: Partial<Stats> = {}): Stats {
  const base = CONFIG.roleStats[role];
  const rm = CONFIG.rarityStatMult[rarity];
  const out = { ...base };
  // Rarity scales the "power" stats; utility stats stay with the role.
  out.hp = base.hp * rm;
  out.ad = base.ad * rm;
  out.armor = base.armor * (1 + (rm - 1) * 0.5);
  out.mr = base.mr * (1 + (rm - 1) * 0.5);
  for (const k of Object.keys(mods) as (keyof Stats)[]) out[k] *= mods[k]!;
  for (const k of Object.keys(flat) as (keyof Stats)[]) out[k] += flat[k]!;
  out.hp = Math.round(out.hp);
  out.ad = Math.round(out.ad);
  out.armor = Math.round(out.armor);
  out.mr = Math.round(out.mr);
  out.as = Math.round(out.as * 100) / 100;
  return out;
}

export function starValue(v: PerStar | undefined, star: Star): number {
  if (v === undefined) return 0;
  if (typeof v === 'number') return v;
  return v[star - 1];
}

export function emptyExtra(): Omit<CombatStats, keyof Stats> {
  return { power: 100, lifesteal: 0, dodge: 0, chargeGain: 100, dmgAmp: 0, dmgReduce: 0, critDmg: CONFIG.combat.critMultiplier };
}

export interface StatOptions {
  /** Multiplier applied to HP, AD and ability power (enemy scaling, hero growth). */
  powerMult?: number;
  /** Separate HP multiplier on top of powerMult (hero HP growth). */
  hpMult?: number;
  flat?: Partial<Record<CombatStatKey, number>>;
  /** Percent bonuses, e.g. { hp: 10 } = +10% HP. */
  pct?: Partial<Record<CombatStatKey, number>>;
}

/** Final combat stats for a unit at a star level. */
export function combatStats(base: Stats, star: Star, opts: StatOptions = {}): CombatStats {
  const sm = CONFIG.starStatMult[star - 1];
  const pm = opts.powerMult ?? 1;
  const hm = opts.hpMult ?? pm;
  const s: CombatStats = { ...base, ...emptyExtra() };
  s.hp = base.hp * sm * hm;
  s.ad = base.ad * sm * pm;
  s.power = 100 * pm;
  if (opts.flat) for (const k of Object.keys(opts.flat) as CombatStatKey[]) s[k] += opts.flat[k]!;
  if (opts.pct) for (const k of Object.keys(opts.pct) as CombatStatKey[]) s[k] *= 1 + opts.pct[k]! / 100;
  s.hp = Math.round(s.hp);
  s.ad = Math.round(s.ad);
  return s;
}

export const STAT_LABELS: Record<CombatStatKey, string> = {
  hp: 'HP',
  ad: 'Attack',
  as: 'Atk Speed',
  range: 'Range',
  armor: 'Armour',
  mr: 'Magic Res',
  crit: 'Crit',
  ms: 'Move',
  power: 'Ability Pow',
  lifesteal: 'Lifesteal',
  dodge: 'Dodge',
  chargeGain: 'Charge Gain',
  dmgAmp: 'Damage',
  dmgReduce: 'Dmg Reduce',
  critDmg: 'Crit Dmg',
};

/** Stats displayed as percentages when shown as flat values. */
export const FRACTION_STATS: ReadonlySet<CombatStatKey> = new Set(['crit', 'lifesteal', 'dodge']);
