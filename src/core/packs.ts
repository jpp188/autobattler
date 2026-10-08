/**
 * Pack odds and opening. The same functions drive the real pulls and the odds
 * preview tooltip, so the preview always shows the true numbers.
 */
import { CONFIG } from './config';
import { momentumPullBonus } from './momentum';
import type { Rng } from './rng';
import { RARITIES, rarityIndex, type PackDef, type PackInstance, type Rarity, type RarityWeights, type UnitDef } from './types';

export interface PullContext {
  /** 0 = prologue, 1..3 = acts. */
  act: number;
  momentum: Record<string, number>;
  /** Extra pull weight by trait from artifacts (fraction). */
  traitOdds: Record<string, number>;
  /** Rarity luck from artifacts (percent). */
  rarityLuck: number;
  /** Unit ids the player owns (for duplicate packs). */
  owned: readonly string[];
  /** Unit ids on the board (for mirror packs). */
  board: readonly string[];
  heroTraits: readonly string[];
  /** Force the best slot to be at least Rare (hero perk). */
  forceRare?: boolean;
}

export interface OpenedCard {
  unitId: string;
  rarity: Rarity;
}

export interface PackData {
  units: readonly UnitDef[];
  packs: ReadonlyMap<string, PackDef>;
}

export function emptyContext(act = 1): PullContext {
  return { act, momentum: {}, traitOdds: {}, rarityLuck: 0, owned: [], board: [], heroTraits: [] };
}

/** Units this pack instance can roll, before rarity selection. */
export function packCandidates(def: PackDef, inst: PackInstance, ctx: PullContext, units: readonly UnitDef[]): UnitDef[] {
  let list = units.slice();
  const traits = inst.traits ?? (def.filter?.traits ? [...def.filter.traits] : undefined);
  if (def.special === 'hero') {
    list = list.filter((u) => ctx.heroTraits.includes(u.origin) || ctx.heroTraits.includes(u.cls));
  } else if (traits && traits.length && def.special !== 'momentum') {
    list = list.filter((u) => traits.includes(u.origin) || traits.includes(u.cls));
  }
  if (def.filter?.rarities) list = list.filter((u) => def.filter!.rarities!.includes(u.rarity));
  if (def.filter?.roles) list = list.filter((u) => def.filter!.roles!.includes(u.role));
  return list;
}

/** Highest-momentum trait id, ties broken by id for determinism. */
export function topMomentumTrait(momentum: Record<string, number>): string | null {
  let best: string | null = null;
  let bestV = 0;
  for (const k of Object.keys(momentum).sort()) {
    if (momentum[k] > bestV) {
      best = k;
      bestV = momentum[k];
    }
  }
  return best;
}

function unitWeight(u: UnitDef, def: PackDef, ctx: PullContext): number {
  let w = 1;
  for (const t of [u.origin, u.cls]) {
    w += momentumPullBonus(ctx.momentum[t] ?? 0);
    w += ctx.traitOdds[t] ?? 0;
  }
  if (def.special === 'momentum') {
    const top = topMomentumTrait(ctx.momentum);
    if (top && (u.origin === top || u.cls === top)) w *= 4;
  }
  return w;
}

/** Raw rarity weights for a slot after slot overrides, guarantees, act lean and luck. */
export function slotWeights(def: PackDef, slot: number, ctx: PullContext): RarityWeights {
  const w: RarityWeights = { ...def.weights, ...(def.slotWeights?.[slot] ?? {}) };
  const g = def.guaranteed?.find((x) => x.slot === slot);
  const min = g ? rarityIndex(g.minRarity) : ctx.forceRare && slot === def.cards - 1 ? rarityIndex('rare') : 0;
  for (const r of RARITIES) {
    const i = rarityIndex(r);
    if (i < min) w[r] = 0;
    const act = Math.max(0, ctx.act - 1);
    w[r] *= 1 + CONFIG.packs.actLean * act * i;
    if (i >= 2) w[r] *= 1 + (ctx.rarityLuck / 100) * (i - 1);
  }
  return w;
}

/**
 * True probabilities of each rarity for one slot, after removing rarities
 * the pack's filters can't produce. Sums to 1 (or all zero if the pack is empty).
 */
export function slotOdds(def: PackDef, inst: PackInstance, slot: number, ctx: PullContext, units: readonly UnitDef[]): RarityWeights {
  const w = slotWeights(def, slot, ctx);
  const cands = packCandidates(def, inst, ctx, units);
  let total = 0;
  for (const r of RARITIES) {
    if (!cands.some((u) => u.rarity === r)) w[r] = 0;
    total += w[r];
  }
  if (total <= 0) {
    // Guarantee asked for a rarity the filter can't make: fall back to the best available.
    const best = [...RARITIES].reverse().find((r) => cands.some((u) => u.rarity === r));
    const out = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    if (best) out[best] = 1;
    return out;
  }
  for (const r of RARITIES) w[r] /= total;
  return w;
}

/** Average rarity odds per card across all slots (the odds-preview numbers). */
export function packOdds(def: PackDef, inst: PackInstance, ctx: PullContext, units: readonly UnitDef[]): RarityWeights {
  const out: RarityWeights = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  if (def.cards <= 0) return out;
  for (let s = 0; s < def.cards; s++) {
    const o = slotOdds(def, inst, s, ctx, units);
    for (const r of RARITIES) out[r] += o[r] / def.cards;
  }
  return out;
}

/** Probability that a unit of the given trait appears in one slot. */
export function traitSlotChance(def: PackDef, inst: PackInstance, slot: number, ctx: PullContext, units: readonly UnitDef[], trait: string): number {
  const odds = slotOdds(def, inst, slot, ctx, units);
  const cands = packCandidates(def, inst, ctx, units);
  let p = 0;
  for (const r of RARITIES) {
    const pool = cands.filter((u) => u.rarity === r);
    const total = pool.reduce((a, u) => a + unitWeight(u, def, ctx), 0);
    if (!total) continue;
    const match = pool.filter((u) => u.origin === trait || u.cls === trait).reduce((a, u) => a + unitWeight(u, def, ctx), 0);
    p += odds[r] * (match / total);
  }
  return p;
}

function rollSlot(def: PackDef, inst: PackInstance, slot: number, ctx: PullContext, units: readonly UnitDef[], rng: Rng): OpenedCard | null {
  const odds = slotOdds(def, inst, slot, ctx, units);
  const ri = rng.weightedIndex(RARITIES.map((r) => odds[r]));
  if (ri < 0) return null;
  const rarity = RARITIES[ri];
  const pool = packCandidates(def, inst, ctx, units).filter((u) => u.rarity === rarity);
  if (!pool.length) return null;
  const u = rng.weighted(pool, (x) => unitWeight(x, def, ctx));
  return { unitId: u.id, rarity: u.rarity };
}

/** Opens a pack and returns its cards (unit packs only; artifact packs return []). */
export function openPack(def: PackDef, inst: PackInstance, ctx: PullContext, units: readonly UnitDef[], rng: Rng): OpenedCard[] {
  if (def.special === 'artifact') return [];
  const cards: OpenedCard[] = [];
  let start = 0;
  const byId = (id: string) => units.find((u) => u.id === id);
  if (def.special === 'duplicate' || def.special === 'mirror') {
    const source = def.special === 'duplicate' ? ctx.owned : ctx.board;
    const choices = source.filter((id) => byId(id));
    const id = inst.unitId && byId(inst.unitId) ? inst.unitId : choices.length ? rng.pick(choices) : null;
    if (id) {
      cards.push({ unitId: id, rarity: byId(id)!.rarity });
      start = 1;
    }
  }
  for (let s = start; s < def.cards; s++) {
    const c = rollSlot(def, inst, s, ctx, units, rng);
    if (c) cards.push(c);
  }
  return cards;
}

/** Fills in the random parameters of a pack offer (which trait, etc). */
export function resolvePackInstance(def: PackDef, rng: Rng, traitIds: { origins: string[]; classes: string[] }): PackInstance {
  const inst: PackInstance = { defId: def.id, price: def.price };
  switch (def.special) {
    case 'origin':
      inst.traits = [rng.pick(traitIds.origins)];
      break;
    case 'class':
      inst.traits = [rng.pick(traitIds.classes)];
      break;
    case 'duo':
      inst.traits = [rng.pick(traitIds.origins), rng.pick(traitIds.classes)];
      break;
    case 'themedStarter':
      inst.traits = [rng.pick([...traitIds.origins, ...traitIds.classes])];
      break;
    default:
      if (def.filter?.traits) inst.traits = [...def.filter.traits];
  }
  return inst;
}

export function packDisplayName(def: PackDef, inst: PackInstance, traitName: (id: string) => string): string {
  if ((def.special === 'origin' || def.special === 'class' || def.special === 'themedStarter') && inst.traits?.length)
    return def.special === 'themedStarter' ? `${traitName(inst.traits[0])} Starter` : `${traitName(inst.traits[0])} ${def.special === 'origin' ? 'Origin' : 'Class'} Pack`;
  if (def.special === 'duo' && inst.traits?.length === 2) return `${traitName(inst.traits[0])}+${traitName(inst.traits[1])} Duo`;
  return def.name;
}
