/**
 * Content registry: one place to look up any piece of data by id.
 */
import type { HeroDef, TraitDef, UnitDef } from '../core/types';
import { HEROES } from './heroes';
import { SUMMONS } from './summons';
import { TRAITS } from './traits';
import { UNITS } from './units';
import { ENEMIES } from './enemies';

export { HEROES, SUMMONS, TRAITS, UNITS, ENEMIES };

const unitMap = new Map<string, UnitDef>();
for (const u of [...UNITS, ...SUMMONS, ...ENEMIES, ...HEROES]) {
  if (unitMap.has(u.id)) throw new Error(`Duplicate unit id ${u.id}`);
  unitMap.set(u.id, u);
}
const traitMap = new Map<string, TraitDef>(TRAITS.map((t) => [t.id, t]));
const heroMap = new Map<string, HeroDef>(HEROES.map((h) => [h.id, h]));

export function getUnit(id: string): UnitDef {
  const u = unitMap.get(id);
  if (!u) throw new Error(`Unknown unit ${id}`);
  return u;
}
export function findUnit(id: string): UnitDef | undefined {
  return unitMap.get(id);
}
export function getTrait(id: string): TraitDef {
  const t = traitMap.get(id);
  if (!t) throw new Error(`Unknown trait ${id}`);
  return t;
}
export function getHero(id: string): HeroDef {
  const h = heroMap.get(id);
  if (!h) throw new Error(`Unknown hero ${id}`);
  return h;
}
export function isHeroId(id: string): boolean {
  return heroMap.has(id);
}
/** Units that can come out of packs. */
export const PACK_UNITS: readonly UnitDef[] = UNITS.filter((u) => !u.enemyOnly && !u.summon);
