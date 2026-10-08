/**
 * Turns lists of units into battle inputs: computes stats and attaches trait
 * passives for each side.
 */
import type { BattleUnitInput, Team } from './combat';
import type { Hex } from './hex';
import { countTraits, traitPassivesFor, type TraitStatus } from './traits';
import type { PassiveDef, Star, TraitDef, UnitDef } from './types';
import { combatStats, type StatOptions } from './units';

export interface TeamMember {
  def: UnitDef;
  star: Star;
  hex: Hex;
  isHero?: boolean;
  hp?: number;
  ownerUid?: number;
  stat?: StatOptions;
  extraPassives?: readonly PassiveDef[];
  startCharge?: number;
}

export function buildTeam(
  members: readonly TeamMember[],
  team: Team,
  traits: readonly TraitDef[],
): { inputs: BattleUnitInput[]; statuses: TraitStatus[] } {
  const statuses = countTraits(
    members.map((m) => m.def),
    traits,
  );
  const extra = traitPassivesFor(
    members.map((m) => m.def),
    statuses,
  );
  const inputs = members.map<BattleUnitInput>((m, i) => ({
    def: m.def,
    star: m.star,
    team,
    hex: m.hex,
    stats: combatStats(m.def.stats, m.star, m.stat),
    passives: [...m.def.passives, ...(m.extraPassives ?? []), ...extra[i]],
    isHero: m.isHero,
    hp: m.hp,
    ownerUid: m.ownerUid,
    startCharge: m.startCharge,
  }));
  return { inputs, statuses };
}
