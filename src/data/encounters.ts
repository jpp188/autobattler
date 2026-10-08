/**
 * Enemy encounters per act. Positions are from the enemy's side: row 0 is
 * their front line. Enemy stats also scale by act and floor (CONFIG.enemy).
 */
import type { EncounterDef, EncounterUnit, Star } from '../core/types';

const u = (unit: string, star: Star, col: number, row: number): EncounterUnit => ({ unit, star, col, row });

export const ENCOUNTERS: readonly EncounterDef[] = [
  // ================================================================ Prologue
  { id: 'p_bandits', name: 'Roadside Bandits', act: 0, kind: 'battle', floors: [0, 0], units: [u('bamboo_bandit', 1, 3, 0), u('bamboo_bandit', 1, 2, 1)] },
  { id: 'p_wisps', name: 'Marsh Lights', act: 0, kind: 'battle', floors: [2, 2], units: [u('wild_boar', 1, 3, 0), u('onibi', 1, 2, 2), u('onibi', 1, 4, 2)] },
  { id: 'p_goemon', name: 'Goemon’s Hideout', act: 0, kind: 'boss', mechanic: 'At half health Goemon calls two more bandits.', units: [u('boss_goemon', 1, 3, 0), u('bamboo_bandit', 1, 1, 1), u('onibi', 1, 5, 2)] },

  // ================================================================ Act 1: Bamboo Forest
  { id: 'a1_bandits', name: 'Bandit Ambush', act: 1, kind: 'battle', floors: [0, 6], units: [u('bamboo_bandit', 1, 2, 0), u('bamboo_bandit', 1, 4, 0), u('onibi', 1, 3, 2)] },
  { id: 'a1_boars', name: 'Boar Stampede', act: 1, kind: 'battle', floors: [0, 6], units: [u('wild_boar', 1, 3, 0), u('wild_boar', 1, 1, 0), u('kodama', 1, 2, 2)] },
  { id: 'a1_foxes', name: 'Fox Tricksters', act: 1, kind: 'battle', floors: [0, 8], units: [u('kitsune_cub', 1, 1, 0), u('kitsune_cub', 1, 5, 0), u('saru_archer', 1, 3, 3), u('tanuki', 1, 3, 0)] },
  { id: 'a1_spirits', name: 'Restless Spirits', act: 1, kind: 'battle', floors: [3, 10], units: [u('onibi', 1, 2, 2), u('onibi', 1, 4, 2), u('kodama', 1, 3, 3), u('wild_boar', 2, 3, 0)] },
  { id: 'a1_ronin', name: 'Ronin Band', act: 1, kind: 'battle', floors: [5, 14], units: [u('ronin', 2, 3, 0), u('bamboo_bandit', 1, 1, 0), u('bamboo_bandit', 1, 5, 0), u('star_archer', 1, 2, 3), u('onibi', 1, 4, 3)] },
  { id: 'a1_grove', name: 'Grove Guardians', act: 1, kind: 'battle', floors: [8, 14], units: [u('tanuki', 2, 3, 0), u('wild_boar', 2, 2, 0), u('kodama', 1, 1, 3), u('saru_archer', 2, 5, 3), u('kitsune_cub', 1, 6, 1)] },
  { id: 'a1_oni_camp', name: 'Oni Camp', act: 1, kind: 'battle', floors: [9, 14], units: [u('oni_grunt', 2, 3, 0), u('oni_grunt', 1, 4, 0), u('karasu', 2, 0, 1), u('chochin', 1, 3, 3), u('bamboo_bandit', 1, 2, 1)] },
  { id: 'a1_e_kappa', name: 'Kappa Pond', act: 1, kind: 'elite', units: [u('kappa', 2, 2, 0), u('kappa', 2, 4, 0), u('kodama', 2, 3, 3), u('onibi', 1, 1, 2)] },
  { id: 'a1_e_shrine', name: 'Haunted Shrine', act: 1, kind: 'elite', units: [u('chochin', 2, 2, 2), u('chochin', 1, 4, 2), u('bell_monk', 2, 3, 0), u('karasu', 1, 6, 0), u('onibi', 2, 3, 3)] },
  { id: 'a1_e_hunters', name: 'Beast Hunters', act: 1, kind: 'elite', units: [u('saru_archer', 2, 1, 3), u('star_archer', 2, 5, 3), u('komainu', 2, 3, 0), u('wild_boar', 2, 2, 0)] },
  { id: 'a1_boss_spider', name: 'Silk Hollow', act: 1, kind: 'boss', mechanic: 'Jorogumo summons two spiderlings every 6 seconds.', units: [u('boss_jorogumo', 1, 3, 2), u('wild_boar', 2, 2, 0), u('wild_boar', 2, 4, 0)] },
  { id: 'a1_boss_boar', name: 'The Boar God’s Den', act: 1, kind: 'boss', mechanic: 'Okkoto charges your backline every 5 seconds and enrages at half health.', units: [u('boss_inoshishi', 1, 3, 0), u('kodama', 2, 2, 3), u('kodama', 2, 4, 3)] },

  // ================================================================ Act 2: Mountain Shrine
  { id: 'a2_scouts', name: 'Tengu Patrol', act: 2, kind: 'battle', floors: [0, 6], units: [u('tengu_scout', 1, 1, 0), u('tengu_scout', 1, 5, 0), u('stone_lantern', 1, 3, 0), u('yamabushi', 1, 3, 3)] },
  { id: 'a2_lanterns', name: 'Lantern Row', act: 2, kind: 'battle', floors: [0, 6], units: [u('stone_lantern', 2, 2, 0), u('stone_lantern', 1, 4, 0), u('bone_archer', 1, 1, 3), u('bone_archer', 1, 5, 3)] },
  { id: 'a2_hermits', name: 'Hermit Circle', act: 2, kind: 'battle', floors: [2, 9], units: [u('yamabushi', 2, 3, 3), u('yamabushi', 1, 1, 2), u('bell_monk', 2, 3, 0), u('moon_rabbit', 1, 5, 3)] },
  { id: 'a2_bones', name: 'Bone Field', act: 2, kind: 'battle', floors: [4, 12], units: [u('bone_archer', 2, 2, 3), u('bone_archer', 1, 4, 3), u('oni_grunt', 2, 3, 0), u('hannya', 1, 1, 0), u('chochin', 1, 5, 2)] },
  { id: 'a2_court', name: 'Jade Pilgrims', act: 2, kind: 'battle', floors: [6, 14], units: [u('jade_lancer', 2, 2, 0), u('ashigaru', 2, 4, 0), u('talisman_scribe', 2, 3, 3), u('kunoichi', 1, 0, 1), u('yuki_onna', 1, 5, 3)] },
  { id: 'a2_nest', name: 'Tengu Nest', act: 2, kind: 'battle', floors: [8, 14], units: [u('tengu', 2, 3, 0), u('tengu_scout', 2, 1, 1), u('tengu_scout', 1, 5, 1), u('yamabushi', 2, 3, 3), u('stone_lantern', 2, 2, 0)] },
  { id: 'a2_e_raijin', name: 'Thunder Shrine', act: 2, kind: 'elite', units: [u('raijin', 2, 3, 3), u('oni_grunt', 2, 2, 0), u('oni_grunt', 2, 4, 0), u('chochin', 2, 1, 2)] },
  { id: 'a2_e_nue', name: 'Nue’s Lair', act: 2, kind: 'elite', units: [u('nue', 2, 3, 0), u('kitsune_cub', 2, 1, 0), u('kitsune_cub', 2, 5, 0), u('komainu', 2, 3, 1), u('saru_archer', 2, 3, 3)] },
  { id: 'a2_e_colossus', name: 'Sleeping Colossus', act: 2, kind: 'elite', units: [u('jade_colossus', 2, 3, 0), u('talisman_scribe', 2, 2, 3), u('talisman_scribe', 2, 4, 3), u('kunoichi', 2, 6, 0)] },
  { id: 'a2_boss_tengu', name: 'Peak of Kurama', act: 2, kind: 'boss', mechanic: 'Sojobo swaps the positions of three of your units every 7 seconds.', units: [u('boss_sojobo', 1, 3, 1), u('tengu_scout', 2, 1, 0), u('tengu_scout', 2, 5, 0), u('yamabushi', 2, 3, 3)] },
  { id: 'a2_boss_bones', name: 'The Ossuary', act: 2, kind: 'boss', mechanic: 'At half health Gashadokuro raises three Bone Guards and is invulnerable until they die.', units: [u('boss_gashadokuro', 1, 3, 0), u('bone_archer', 2, 1, 3), u('bone_archer', 2, 5, 3)] },

  // ================================================================ Act 3: Celestial Palace
  { id: 'a3_knights', name: 'Fallen Vanguard', act: 3, kind: 'battle', floors: [0, 6], units: [u('star_knight', 2, 2, 0), u('star_knight', 1, 4, 0), u('thunder_priest', 1, 3, 3), u('heavenly_lion', 1, 3, 0)] },
  { id: 'a3_cranes', name: 'Flock of the Void', act: 3, kind: 'battle', floors: [0, 8], units: [u('void_crane', 2, 1, 0), u('void_crane', 1, 5, 0), u('heavenly_lion', 2, 3, 0), u('thunder_priest', 1, 3, 3)] },
  { id: 'a3_choir', name: 'Thunder Choir', act: 3, kind: 'battle', floors: [3, 10], units: [u('thunder_priest', 2, 2, 3), u('thunder_priest', 2, 4, 3), u('heavenly_lion', 2, 3, 0), u('crane_dancer', 2, 0, 0), u('moon_rabbit', 2, 3, 2)] },
  { id: 'a3_beasts', name: 'Palace Menagerie', act: 3, kind: 'battle', floors: [5, 14], units: [u('heavenly_lion', 2, 3, 0), u('byakko', 1, 1, 0), u('kirin', 1, 5, 0), u('star_archer', 3, 3, 3), u('moon_rabbit', 2, 1, 3)] },
  { id: 'a3_guard', name: 'Imperial Guard', act: 3, kind: 'battle', floors: [7, 14], units: [u('star_knight', 2, 2, 0), u('star_knight', 2, 4, 0), u('heavenly_lion', 2, 3, 0), u('thunder_priest', 2, 2, 3), u('void_crane', 2, 6, 1), u('jade_phoenix', 1, 4, 3)] },
  { id: 'a3_e_shuten', name: 'Oni King’s Feast', act: 3, kind: 'elite', units: [u('shuten', 2, 3, 0), u('oni_grunt', 3, 2, 0), u('raijin', 2, 3, 3), u('hannya', 2, 5, 1)] },
  { id: 'a3_e_kirin', name: 'Kirin’s Meadow', act: 3, kind: 'elite', units: [u('kirin', 2, 3, 0), u('moon_rabbit', 3, 3, 3), u('crane_dancer', 2, 1, 0), u('star_knight', 2, 5, 0), u('thunder_priest', 2, 1, 3)] },
  { id: 'a3_e_phoenix', name: 'Phoenix Pyre', act: 3, kind: 'elite', units: [u('jade_phoenix', 2, 3, 3), u('jade_colossus', 2, 3, 0), u('yuki_onna', 2, 1, 3), u('kunoichi', 2, 5, 0)] },
  { id: 'a3_boss_emperor', name: 'Throne of Heaven', act: 3, kind: 'boss', mechanic: 'The Emperor is invulnerable until his two Star Sentinels fall, and heals his court every 8 seconds.', units: [u('boss_emperor', 1, 3, 3), u('heavenly_lion', 2, 2, 0), u('star_knight', 2, 4, 0)] },
  { id: 'a3_boss_moon', name: 'The Shattered Moon', act: 3, kind: 'boss', mechanic: 'Tsukuyomi swaps your units every 6 seconds, grows stronger each time, and vanishes at 40% HP.', units: [u('boss_void_moon', 1, 3, 1), u('void_crane', 2, 1, 0), u('void_crane', 2, 5, 0), u('thunder_priest', 2, 3, 3)] },
];

/** Bosses per act (2 per act; one is picked at random per run). */
export function bossesForAct(act: number): EncounterDef[] {
  return ENCOUNTERS.filter((e) => e.act === act && e.kind === 'boss');
}

/** Units that join fights as reinforcements, per act (index = act). */
export const REINFORCEMENTS: readonly (readonly string[])[] = [
  [],
  ['bamboo_bandit', 'wild_boar', 'onibi', 'kodama', 'saru_archer', 'tanuki', 'kitsune_cub'],
  ['tengu_scout', 'stone_lantern', 'bone_archer', 'yamabushi', 'oni_grunt', 'chochin', 'ashigaru'],
  ['star_knight', 'thunder_priest', 'void_crane', 'heavenly_lion', 'moon_rabbit'],
];
