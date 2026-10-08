/**
 * Trait counting and synergy bonuses. Each unique unit on the board counts
 * once per trait (duplicates do not stack), and the Hero's traits count too.
 */
import type { PassiveDef, TraitBreakpoint, TraitDef, UnitDef } from './types';

export interface TraitStatus {
  trait: TraitDef;
  count: number;
  /** Index of the highest reached breakpoint, or -1. */
  level: number;
  active: boolean;
  next: number | null;
}

export function countTraits(units: readonly UnitDef[], traits: readonly TraitDef[]): TraitStatus[] {
  const seen = new Map<string, Set<string>>();
  for (const u of units) {
    for (const t of [u.origin, u.cls]) {
      if (!seen.has(t)) seen.set(t, new Set());
      seen.get(t)!.add(u.id);
    }
  }
  const out: TraitStatus[] = [];
  for (const trait of traits) {
    const count = seen.get(trait.id)?.size ?? 0;
    let level = -1;
    trait.breakpoints.forEach((bp, i) => {
      if (count >= bp.count) level = i;
    });
    const nextBp = trait.breakpoints.find((bp) => bp.count > count);
    out.push({ trait, count, level, active: level >= 0, next: nextBp ? nextBp.count : null });
  }
  return out;
}

export function activeBreakpoint(s: TraitStatus): TraitBreakpoint | null {
  return s.level >= 0 ? s.trait.breakpoints[s.level] : null;
}

export function activeTraitIds(statuses: readonly TraitStatus[]): string[] {
  return statuses.filter((s) => s.active).map((s) => s.trait.id);
}

/**
 * Passives each unit receives from active traits. `units` is in board order;
 * the returned array lines up with it.
 */
export function traitPassivesFor(units: readonly UnitDef[], statuses: readonly TraitStatus[]): PassiveDef[][] {
  const out: PassiveDef[][] = units.map(() => []);
  for (const s of statuses) {
    const bp = activeBreakpoint(s);
    if (!bp) continue;
    let leaderGiven = false;
    units.forEach((u, i) => {
      const has = u.origin === s.trait.id || u.cls === s.trait.id;
      if (bp.team || has) out[i].push(...bp.passives);
      if (has && !leaderGiven && bp.leaderPassives) {
        out[i].push(...bp.leaderPassives);
        leaderGiven = true;
      }
    });
  }
  return out;
}

/** Gold per win from active traits. */
export function traitGoldPerWin(statuses: readonly TraitStatus[]): number {
  let g = 0;
  for (const s of statuses) g += activeBreakpoint(s)?.goldPerWin ?? 0;
  return g;
}
