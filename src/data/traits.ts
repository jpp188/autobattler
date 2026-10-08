import type { TraitDef } from '../core/types';
import { E, S, step } from './dsl';

export const TRAITS: readonly TraitDef[] = [
  // ------------------------------------------------------------- Origins
  {
    id: 'celestial',
    name: 'Celestial',
    kind: 'origin',
    color: '#ffd96b',
    icon: 'sun',
    desc: 'Children of the heavenly court. Celestials mend their wounds with starlight.',
    breakpoints: [
      {
        count: 2,
        desc: 'Celestials heal 4% of max HP every 2s.',
        passives: [{ name: 'Starlight', trigger: 'interval', interval: 2, steps: [step(S.self, [E.heal(0, 0.04)], 'heal')] }],
      },
      {
        count: 4,
        desc: 'All allies heal 5% of max HP every 2s.',
        passives: [{ name: 'Starlight', trigger: 'interval', interval: 2, steps: [step(S.self, [E.heal(0, 0.05)], 'heal')] }],
        team: true,
      },
      {
        count: 6,
        desc: 'All allies heal 7% of max HP every 2s.',
        passives: [{ name: 'Heaven’s Grace', trigger: 'interval', interval: 2, steps: [step(S.self, [E.heal(0, 0.07)], 'heal')] }],
        team: true,
      },
    ],
  },
  {
    id: 'oni',
    name: 'Oni',
    kind: 'origin',
    color: '#ff5a4a',
    icon: 'horns',
    desc: 'Demons of the mountain fires. Oni grow stronger the more blood is spilled.',
    breakpoints: [
      { count: 2, desc: 'Oni gain +15% Attack.', passives: [{ name: 'Oni Fury', trigger: 'static', pctStats: { ad: 15 } }] },
      {
        count: 4,
        desc: 'Oni gain +30% Attack and 12% lifesteal.',
        passives: [{ name: 'Oni Fury', trigger: 'static', pctStats: { ad: 30 }, stats: { lifesteal: 0.12 } }],
      },
      {
        count: 6,
        desc: 'Oni gain +55% Attack and 25% lifesteal.',
        passives: [{ name: 'Oni Fury', trigger: 'static', pctStats: { ad: 55 }, stats: { lifesteal: 0.25 } }],
      },
    ],
  },
  {
    id: 'jade',
    name: 'Jade Court',
    kind: 'origin',
    color: '#5fe3a1',
    icon: 'jade',
    desc: 'Retainers of the Jade Emperor. Wealthy, disciplined and hard to break.',
    breakpoints: [
      {
        count: 2,
        desc: 'Jade Court units start with a 150 shield. +1 gold after a win.',
        goldPerWin: 1,
        passives: [{ name: 'Jade Ward', trigger: 'battleStart', steps: [step(S.self, [E.shield(150, 8)], 'jade')] }],
      },
      {
        count: 4,
        desc: 'Jade Court units start with a 350 shield. +2 gold after a win.',
        goldPerWin: 2,
        passives: [{ name: 'Jade Ward', trigger: 'battleStart', steps: [step(S.self, [E.shield(350, 8)], 'jade')] }],
      },
      {
        count: 6,
        desc: 'All allies start with a 450 shield. +3 gold after a win.',
        goldPerWin: 3,
        team: true,
        passives: [{ name: 'Imperial Ward', trigger: 'battleStart', steps: [step(S.self, [E.shield(450, 10)], 'jade')] }],
      },
    ],
  },
  {
    id: 'beast',
    name: 'Spirit Beast',
    kind: 'origin',
    color: '#5ad1e6',
    icon: 'paw',
    desc: 'Wild spirits of forest and sky. They strike fast and call kin to battle.',
    breakpoints: [
      { count: 2, desc: 'Spirit Beasts gain +20% Atk Speed.', passives: [{ name: 'Wild Rhythm', trigger: 'static', pctStats: { as: 20 } }] },
      {
        count: 4,
        desc: 'Spirit Beasts gain +35% Atk Speed. A Spirit Wisp joins the fight.',
        passives: [{ name: 'Wild Rhythm', trigger: 'static', pctStats: { as: 35 } }],
        leaderPassives: [{ name: 'Call of Kin', trigger: 'battleStart', steps: [step(S.self, [E.summon('spirit_wisp', 1, 1)])] }],
      },
      {
        count: 6,
        desc: 'Spirit Beasts gain +55% Atk Speed. A 2-star Spirit Wisp joins the fight.',
        passives: [{ name: 'Wild Rhythm', trigger: 'static', pctStats: { as: 55 } }],
        leaderPassives: [{ name: 'Call of Kin', trigger: 'battleStart', steps: [step(S.self, [E.summon('spirit_wisp', 1, 2)])] }],
      },
    ],
  },
  // ------------------------------------------------------------- Classes
  {
    id: 'blade',
    name: 'Blademaster',
    kind: 'class',
    color: '#e8e8f0',
    icon: 'sword',
    desc: 'Masters of steel. Their attacks have a chance to strike twice.',
    breakpoints: [
      {
        count: 2,
        desc: 'Blademasters’ attacks have a 25% chance to strike again.',
        passives: [{ name: 'Flurry', trigger: 'onAttack', chance: 0.25, steps: [step(S.target, [E.phys(0, 1)], 'slash')] }],
      },
      {
        count: 4,
        desc: '45% chance to strike again.',
        passives: [{ name: 'Flurry', trigger: 'onAttack', chance: 0.45, steps: [step(S.target, [E.phys(0, 1)], 'slash')] }],
      },
      {
        count: 6,
        desc: '70% chance to strike again, and strikes deal +20% damage.',
        passives: [{ name: 'Flurry', trigger: 'onAttack', chance: 0.7, steps: [step(S.target, [E.phys(0, 1.2)], 'slash')] }],
      },
    ],
  },
  {
    id: 'mystic',
    name: 'Mystic',
    kind: 'class',
    color: '#c38bff',
    icon: 'orb',
    desc: 'Sages of talisman and spirit. They shield the team from magic and empower spells.',
    breakpoints: [
      { count: 2, desc: 'All allies gain +20 Magic Res.', team: true, passives: [{ name: 'Warding Sigil', trigger: 'static', stats: { mr: 20 } }] },
      {
        count: 4,
        desc: 'All allies gain +40 Magic Res and +20% Ability Power.',
        team: true,
        passives: [{ name: 'Warding Sigil', trigger: 'static', stats: { mr: 40, power: 20 } }],
      },
      {
        count: 6,
        desc: 'All allies gain +70 Magic Res and +45% Ability Power.',
        team: true,
        passives: [{ name: 'Grand Sigil', trigger: 'static', stats: { mr: 70, power: 45 } }],
      },
    ],
  },
  {
    id: 'guardian',
    name: 'Guardian',
    kind: 'class',
    color: '#8fb4ff',
    icon: 'shield',
    desc: 'Shields of the realm. Guardians harden the whole line.',
    breakpoints: [
      { count: 2, desc: 'All allies gain +20 Armour.', team: true, passives: [{ name: 'Iron Line', trigger: 'static', stats: { armor: 20 } }] },
      {
        count: 4,
        desc: 'All allies gain +45 Armour.',
        team: true,
        passives: [{ name: 'Iron Line', trigger: 'static', stats: { armor: 45 } }],
      },
      {
        count: 6,
        desc: 'All allies gain +80 Armour and take 12% less damage.',
        team: true,
        passives: [{ name: 'Unbreakable', trigger: 'static', stats: { armor: 80, dmgReduce: 12 } }],
      },
    ],
  },
  {
    id: 'shadow',
    name: 'Shadowstep',
    kind: 'class',
    color: '#9d7bd8',
    icon: 'moon',
    desc: 'Assassins of the night. At the start of combat they leap to the enemy backline.',
    breakpoints: [
      {
        count: 2,
        desc: 'Shadowsteppers leap to the backline at the start of combat and gain +15% crit.',
        passives: [
          { name: 'Shadow Leap', trigger: 'battleStart', steps: [step(S.self, [E.dash('backline')], 'shadow')] },
          { name: 'Keen Edge', trigger: 'static', stats: { crit: 0.15 } },
        ],
      },
      {
        count: 4,
        desc: 'Leap, +30% crit and +40% crit damage.',
        passives: [
          { name: 'Shadow Leap', trigger: 'battleStart', steps: [step(S.self, [E.dash('backline')], 'shadow')] },
          { name: 'Keen Edge', trigger: 'static', stats: { crit: 0.3, critDmg: 0.4 } },
        ],
      },
      {
        count: 6,
        desc: 'Leap, +45% crit, +80% crit damage and 20% dodge.',
        passives: [
          { name: 'Shadow Leap', trigger: 'battleStart', steps: [step(S.self, [E.dash('backline')], 'shadow')] },
          { name: 'Keen Edge', trigger: 'static', stats: { crit: 0.45, critDmg: 0.8, dodge: 0.2 } },
        ],
      },
    ],
  },
];
