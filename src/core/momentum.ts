/**
 * Trait Momentum: a 0..100 value per trait that rewards sticking with a trait
 * across fights. All constants live in CONFIG.momentum.
 */
import { CONFIG } from './config';

const M = CONFIG.momentum;

/** Momentum after a fight in which the trait was active. */
export function momentumGain(m: number, won: boolean): number {
  const gain = M.gainBase * (1 - m / M.gainDivisor) + (won ? M.winBonus : 0);
  return Math.min(M.max, m + gain);
}

/** Momentum after a fight in which the trait was not active. */
export function momentumDecay(m: number): number {
  return Math.max(0, Math.floor(m * M.decayMult) - M.decayFlat);
}

/** Highest threshold index reached (0..3), or -1 below the first threshold. */
export function momentumTier(m: number): number {
  let tier = -1;
  M.thresholds.forEach((t, i) => {
    if (m >= t) tier = i;
  });
  return tier;
}

/** Extra pull weight fraction for units of this trait (0.1 = +10%). */
export function momentumPullBonus(m: number): number {
  const t = momentumTier(m);
  return t < 0 ? 0 : M.pullBonus[t];
}

/** Stat bonus fraction for units of this trait. */
export function momentumStatBonus(m: number): number {
  const t = momentumTier(m);
  return t < 0 ? 0 : M.statBonus[t];
}

export interface MomentumChange {
  trait: string;
  before: number;
  after: number;
  /** Thresholds crossed upward (for the flash effect). */
  crossed: number[];
}

/** Applies the post-fight update to every trait. */
export function updateMomentum(
  momentum: Record<string, number>,
  allTraits: readonly string[],
  activeTraits: readonly string[],
  won: boolean,
): MomentumChange[] {
  const changes: MomentumChange[] = [];
  const active = new Set(activeTraits);
  for (const t of allTraits) {
    const before = momentum[t] ?? 0;
    const after = active.has(t) ? momentumGain(before, won) : momentumDecay(before);
    momentum[t] = after;
    const crossed = M.thresholds.filter((th) => before < th && after >= th);
    if (before !== after) changes.push({ trait: t, before, after, crossed: [...crossed] });
  }
  return changes;
}

/** Bonuses unlocked at a momentum value, as display text. */
export function momentumBonusText(m: number): string[] {
  const out: string[] = [];
  const t = momentumTier(m);
  if (t >= 0) out.push(`+${Math.round(M.pullBonus[t] * 100)}% pull chance`);
  if (t >= 1) out.push(`+${Math.round(M.statBonus[t] * 100)}% stats`);
  if (t >= 2) out.push('Trait pack in rewards');
  if (t >= 3) out.push('+1 star to a unit next act');
  return out;
}
