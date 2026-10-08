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

// ------------------------------------------------------------- packs, artifacts, events, encounters
import type { ArtifactDef, EncounterDef, EventDef, PackDef } from '../core/types';
import { PACKS } from './packs';
import { ARTIFACTS } from './artifacts';
import { EVENTS } from './events';
import { ENCOUNTERS, bossesForAct } from './encounters';

export { PACKS, ARTIFACTS, EVENTS, ENCOUNTERS, bossesForAct };

export const PACK_MAP: ReadonlyMap<string, PackDef> = new Map(PACKS.map((p) => [p.id, p]));
const artifactMap = new Map<string, ArtifactDef>(ARTIFACTS.map((a) => [a.id, a]));
const eventMap = new Map<string, EventDef>(EVENTS.map((e) => [e.id, e]));
const encounterMap = new Map<string, EncounterDef>(ENCOUNTERS.map((e) => [e.id, e]));

export function getPack(id: string): PackDef {
  const p = PACK_MAP.get(id);
  if (!p) throw new Error(`Unknown pack ${id}`);
  return p;
}
export function getArtifact(id: string): ArtifactDef {
  const a = artifactMap.get(id);
  if (!a) throw new Error(`Unknown artifact ${id}`);
  return a;
}
export function getEvent(id: string): EventDef {
  const e = eventMap.get(id);
  if (!e) throw new Error(`Unknown event ${id}`);
  return e;
}
export function getEncounter(id: string): EncounterDef {
  const e = encounterMap.get(id);
  if (!e) throw new Error(`Unknown encounter ${id}`);
  return e;
}
export const ORIGIN_IDS = TRAITS.filter((t) => t.kind === 'origin').map((t) => t.id);
export const CLASS_IDS = TRAITS.filter((t) => t.kind === 'class').map((t) => t.id);

// ---------------------------------------------------------- achievements
import { ACHIEVEMENTS } from './achievements';
export { ACHIEVEMENTS };
const achievementMap = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export function getAchievement(id: string) {
  const a = achievementMap.get(id);
  if (!a) throw new Error(`Unknown achievement ${id}`);
  return a;
}
