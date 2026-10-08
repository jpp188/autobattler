/**
 * Achievements: six per Hero. Some unlock Hero skins (see heroes.ts).
 * Conditions are evaluated by src/core/achievements.ts.
 */
import type { AchievementDef } from '../core/types';

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // Kaede
  { id: 'kaede_act2', hero: 'kaede', name: 'Into the Mountains', desc: 'Reach Act II with Kaede.', cond: { k: 'reachAct', act: 2 } },
  { id: 'kaede_win', hero: 'kaede', name: 'Restored Honour', desc: 'Win a run with Kaede.', cond: { k: 'winRun' } },
  { id: 'kaede_blades', hero: 'kaede', name: 'Thousand Blades', desc: 'Activate Blademaster (6) with Kaede.', cond: { k: 'traitActive', trait: 'blade', count: 6 } },
  { id: 'kaede_solo', hero: 'kaede', name: 'Last One Standing', desc: 'Win a fight where only Kaede survives.', cond: { k: 'soloHeroWin' } },
  { id: 'kaede_3star', hero: 'kaede', name: 'Tempered Steel', desc: 'Make a 3★ Rare or better unit with Kaede.', cond: { k: 'threeStar', rarity: 'rare' } },
  { id: 'kaede_boss1', hero: 'kaede', name: 'Forest Cleared', desc: 'Defeat the Act I boss with Kaede.', cond: { k: 'beatBoss', act: 1 } },
  // Hoshi
  { id: 'hoshi_act2', hero: 'hoshi', name: 'Climbing Star', desc: 'Reach Act II with Hoshi.', cond: { k: 'reachAct', act: 2 } },
  { id: 'hoshi_win', hero: 'hoshi', name: 'Written in the Stars', desc: 'Win a run with Hoshi.', cond: { k: 'winRun' } },
  { id: 'hoshi_celestial', hero: 'hoshi', name: 'Heavenly Host', desc: 'Activate Celestial (6) with Hoshi.', cond: { k: 'traitActive', trait: 'celestial', count: 6 } },
  { id: 'hoshi_legend', hero: 'hoshi', name: 'Foretold', desc: 'Pull a Legendary unit with Hoshi.', cond: { k: 'legendaryPull' } },
  { id: 'hoshi_pair', hero: 'hoshi', name: 'Twin Comets', desc: 'Have two traits at 100 momentum at once with Hoshi.', cond: { k: 'momentumPair' } },
  { id: 'hoshi_epics', hero: 'hoshi', name: 'Constellation', desc: 'Reach Act III with 3 Epic or better units, playing Hoshi.', cond: { k: 'reachActWithRarity', act: 3, rarity: 'epic', count: 3 } },
  // Gorou
  { id: 'gorou_act2', hero: 'gorou', name: 'Up the Mountain', desc: 'Reach Act II with Gorou.', cond: { k: 'reachAct', act: 2 } },
  { id: 'gorou_win', hero: 'gorou', name: 'Village Saved', desc: 'Win a run with Gorou.', cond: { k: 'winRun' } },
  { id: 'gorou_wall', hero: 'gorou', name: 'Unbreakable Wall', desc: 'Activate Guardian (6) with Gorou.', cond: { k: 'traitActive', trait: 'guardian', count: 6 } },
  { id: 'gorou_flawless', hero: 'gorou', name: 'Not a Scratch', desc: 'Defeat a boss without Gorou taking damage.', cond: { k: 'winNoDamage' } },
  { id: 'gorou_hoard', hero: 'gorou', name: 'Dragon’s Hoard', desc: 'Hold 80 gold at once with Gorou.', cond: { k: 'goldHeld', n: 80 } },
  { id: 'gorou_boss2', hero: 'gorou', name: 'Shrine Breaker', desc: 'Defeat the Act II boss with Gorou.', cond: { k: 'beatBoss', act: 2 } },
];
