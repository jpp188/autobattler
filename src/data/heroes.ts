import type { HeroDef } from '../core/types';
import { makeStats } from '../core/units';
import { E, S, step } from './dsl';

/**
 * Heroes fight on the board like other units, but their HP is the run's
 * life. They have high base HP, 2 passives, an ultimate and a run perk.
 */
export const HEROES: readonly HeroDef[] = [
  {
    id: 'kaede',
    name: 'Kaede',
    title: 'The Wandering Blade',
    rarity: 'epic',
    role: 'fighter',
    origin: 'jade',
    cls: 'blade',
    flavor: 'A disgraced captain of the Jade Guard, cutting her way back into the Emperor’s favour.',
    sprite: 'hero_kaede',
    look: { body: 'armor', build: 'slim', skin: 'skin', hair: 'red', main: 'jade', lower: 'ink', accent: 'gold', trim: 'red', hairStyle: 'ponytail', face: 'fierce', hat: 'headband', pauldron: 'layered', emblem: 'mon', weapon: 'katana', extra: 'scarf', big: true },
    stats: makeStats('fighter', 'rare', { hp: 2.65, ad: 1.2 }),
    passives: [
      { name: 'Captain’s Edge', trigger: 'static', stats: { crit: 0.15, critDmg: 0.2 } },
      { name: 'Second Wind', trigger: 'hpBelow', threshold: 0.35, steps: [step(S.self, [E.shield(0, 5, 0.25), E.buffPct('as', 30, 5)], 'jade')] },
    ],
    ult: {
      name: 'Thousand Leaf Cut',
      fx: 'petal',
      big: true,
      steps: [step(S.aroundTarget(1), [E.phys(240, 1.4)], 'petal'), step(S.self, [E.heal(0, 0.08)])],
    },
    perk: { name: 'Quartermaster', desc: 'Start each run with +1 bench slot.', effect: { k: 'benchSlots', n: 1 } },
    skins: [
      { id: 'kaede_default', name: 'Jade Captain', look: {} },
      { id: 'kaede_crimson', name: 'Crimson Ronin', look: { main: 'red', accent: 'ink', hair: 'ink', trim: 'snow', face: 'stern', mark: 'scar', hat: 'kasa', extra: 'cape' }, unlockedBy: 'kaede_act2' },
      { id: 'kaede_sakura', name: 'Sakura Festival', look: { main: 'pink', accent: 'steel', hair: 'pink', trim: 'snow', pattern: 'sakura', face: 'calm', mark: 'blush', hat: 'kanzashi', extra: 'ribbons' }, unlockedBy: 'kaede_win' },
    ],
  },
  {
    id: 'hoshi',
    name: 'Hoshi',
    title: 'Starlit Oracle',
    rarity: 'epic',
    role: 'caster',
    origin: 'celestial',
    cls: 'mystic',
    flavor: 'She read the end of the world in the stars and decided she disagreed.',
    sprite: 'hero_hoshi',
    look: { body: 'robe', build: 'slim', skin: 'skin', hair: 'blue', main: 'indigo', lower: 'blue', accent: 'gold', trim: 'snow', eyes: 'teal', pattern: 'stars', hairStyle: 'long', face: 'calm', hat: 'halo', emblem: 'star', weapon: 'staff', extra: 'aura', big: true },
    stats: makeStats('caster', 'rare', { hp: 2.6, ad: 1.1 }),
    passives: [
      { name: 'Foresight', trigger: 'battleStart', steps: [step(S.allAllies, [E.shield(120, 6)], 'star')] },
      { name: 'Constellation', trigger: 'everyNthAttack', n: 3, steps: [step(S.randomEnemies(2), [E.magic(90)], 'star')] },
    ],
    ult: {
      name: 'Starfall Prophecy',
      fx: 'star',
      big: true,
      steps: [step(S.aroundTarget(1), [E.magic(280), E.stun(1)], 'star', 7), step(S.lowestAlly(2), [E.heal(160)], 'heal')],
    },
    perk: { name: 'Fated Pull', desc: 'Your first pack each act has a Rare or better card.', effect: { k: 'firstPackRare' } },
    skins: [
      { id: 'hoshi_default', name: 'Starlit Oracle', look: {} },
      { id: 'hoshi_eclipse', name: 'Eclipse', look: { main: 'ink', accent: 'red', hair: 'steel', eyes: 'red', pattern: 'none', emblem: 'moon', hat: 'crescent' }, unlockedBy: 'hoshi_act2' },
      { id: 'hoshi_dawn', name: 'Dawn Priestess', look: { main: 'snow', lower: 'orange', accent: 'orange', trim: 'gold', hair: 'gold', eyes: 'orange', pattern: 'clouds', emblem: 'sun', hat: 'sun' }, unlockedBy: 'hoshi_win' },
    ],
  },
  {
    id: 'gorou',
    name: 'Gorou',
    title: 'Oni-Blooded Warden',
    rarity: 'epic',
    role: 'tank',
    origin: 'oni',
    cls: 'guardian',
    flavor: 'Half oni, all stubborn. He guards a village that is still afraid of him.',
    sprite: 'hero_gorou',
    look: { body: 'oni', build: 'heavy', skin: 'tan', hair: 'ink', main: 'blue', lower: 'indigo', accent: 'gold', trim: 'gold', hairStyle: 'spiky', face: 'stern', beard: 'stubble', mark: 'tusks', hat: 'horn', pauldron: 'fur', neck: 'beads', weapon: 'axe', extra: 'cape', big: true },
    stats: makeStats('tank', 'rare', { hp: 2.2, ad: 1.15 }),
    passives: [
      { name: 'Warden’s Hide', trigger: 'static', stats: { armor: 25, mr: 15 } },
      { name: 'Protective Roar', trigger: 'allyDeath', steps: [step(S.alliesAround(2), [E.shield(150, 4)], 'roar')] },
    ],
    ult: {
      name: 'Mountain Breaker',
      fx: 'burst',
      big: true,
      steps: [step(S.aroundSelf(1), [E.phys(180, 1), E.stun(1.25)], 'burst'), step(S.self, [E.shield(0, 4, 0.2)], 'shield')],
    },
    perk: { name: 'Hoarder', desc: 'Start each run with +12 gold.', effect: { k: 'startGold', n: 12 } },
    skins: [
      { id: 'gorou_default', name: 'Village Warden', look: {} },
      { id: 'gorou_ash', name: 'Ash Oni', look: { skin: 'steel', main: 'ink', lower: 'ink', accent: 'red', trim: 'red', mark: 'warpaint', hat: 'horns', pauldron: 'spiked' }, unlockedBy: 'gorou_act2' },
      { id: 'gorou_festival', name: 'Festival Drummer', look: { main: 'red', lower: 'snow', accent: 'gold', trim: 'snow', hair: 'orange', pattern: 'waves', face: 'grin', hat: 'headband', back: 'drums', weapon: 'drumsticks', extra: 'none' }, unlockedBy: 'gorou_win' },
    ],
  },
];
