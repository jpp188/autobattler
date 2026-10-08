/**
 * Artifacts: run-long relics. Their effects are data; src/core/artifacts.ts
 * sums them up for the rest of the game. Only a few raise the board limit:
 * the main source of board slots is beating bosses (+1 each).
 */
import type { ArtifactDef } from '../core/types';
import { E, S, step } from './dsl';

export const ARTIFACTS: readonly ArtifactDef[] = [
  // ------------------------------------------------------------ Common
  { id: 'rice_pouch', name: 'Rice Pouch', tier: 'common', icon: 'pouch', color: '#e8d7a8', desc: '+2 gold after every win.', effects: [{ k: 'goldPerWin', n: 2 }] },
  { id: 'spare_mat', name: 'Spare Tatami', tier: 'common', icon: 'mat', color: '#b8c870', desc: '+1 bench slot.', effects: [{ k: 'benchSlots', n: 1 }] },
  { id: 'healing_herbs', name: 'Healing Herbs', tier: 'common', icon: 'herb', color: '#6ad08a', desc: 'Your Hero heals an extra 6% of max HP after every fight.', effects: [{ k: 'heroHealAfterFight', pct: 6 }] },
  { id: 'whetstone', name: 'Whetstone', tier: 'common', icon: 'stone', color: '#a0a8b8', desc: 'All your units gain +8% Attack.', effects: [{ k: 'teamStats', stats: { ad: 8 }, pct: true }] },
  { id: 'merchant_seal', name: 'Merchant’s Seal', tier: 'common', icon: 'seal', color: '#e86a5a', desc: 'Shop prices are 15% lower.', effects: [{ k: 'shopDiscount', pct: 15 }] },
  { id: 'paper_lantern', name: 'Paper Lantern', tier: 'common', icon: 'lantern', color: '#ff9a5a', desc: 'Units behind your front row gain +15 Ability Power.', effects: [{ k: 'unitStats', who: { row: 'back' }, stats: { power: 15 } }] },
  { id: 'straw_sandals', name: 'Straw Sandals', tier: 'common', icon: 'sandals', color: '#d8b870', desc: 'Units in your front row gain +180 HP.', effects: [{ k: 'unitStats', who: { row: 'front' }, stats: { hp: 180 } }] },
  { id: 'prayer_beads', name: 'Prayer Beads', tier: 'common', icon: 'beads', color: '#c86ad8', desc: 'Resting heals your Hero for an extra 20% of max HP.', effects: [{ k: 'restHeal', pct: 20 }] },
  // ------------------------------------------------------------ Uncommon
  { id: 'war_banner', name: 'War Banner', tier: 'uncommon', icon: 'banner', color: '#ff5a4a', desc: '+1 board slot.', effects: [{ k: 'boardLimit', n: 1 }] },
  { id: 'jade_abacus', name: 'Jade Abacus', tier: 'uncommon', icon: 'abacus', color: '#5fe3a1', desc: 'After each win, gain 1 gold per 10 gold you hold (max 4).', effects: [{ k: 'interest', per: 10, max: 4 }] },
  { id: 'storm_drum', name: 'Storm Drum', tier: 'uncommon', icon: 'drum', color: '#ffd96b', desc: 'Your units start each fight with 30 ult charge.', effects: [{ k: 'startCharge', n: 30 }] },
  { id: 'lucky_cat', name: 'Lucky Cat', tier: 'uncommon', icon: 'cat', color: '#fff2c8', desc: 'Rare, Epic and Legendary pulls are 30% more likely.', effects: [{ k: 'rarityLuck', pct: 30 }] },
  { id: 'iron_tea', name: 'Iron Tea Set', tier: 'uncommon', icon: 'tea', color: '#8fb4ff', desc: 'All your units gain +15 Armour and +15 Magic Res.', effects: [{ k: 'teamStats', stats: { armor: 15, mr: 15 } }] },
  { id: 'lone_wolf', name: 'Lone Wolf Charm', tier: 'uncommon', icon: 'charm', color: '#9ab4d8', desc: 'Your 1★ units gain +20% HP and +20% Attack.', effects: [{ k: 'unitStats', who: { maxStar: 1, hero: false }, stats: { hp: 20, ad: 20 }, pct: true }] },
  {
    id: 'bramble_mail',
    name: 'Bramble Mail',
    tier: 'uncommon',
    icon: 'mail',
    color: '#7ab85a',
    desc: 'Your Tanks gain +20 Armour, and each hit they take has a 30% chance to deal 50 physical damage back.',
    effects: [
      { k: 'unitStats', who: { roles: ['tank'] }, stats: { armor: 20 } },
      { k: 'unitPassive', who: { roles: ['tank'] }, passive: { name: 'Brambles', trigger: 'onHitTaken', chance: 0.3, steps: [step(S.attacker, [E.phys(50)])] } },
    ],
  },
  { id: 'kappa_fang', name: 'Kappa Fang', tier: 'uncommon', icon: 'fang', color: '#5ad8b8', desc: 'Your Fighters and Assassins heal for 15% of the damage they deal.', effects: [{ k: 'unitStats', who: { roles: ['fighter', 'assassin'] }, stats: { lifesteal: 0.15 } }] },
  { id: 'ward_talisman', name: 'Ward Talisman', tier: 'uncommon', icon: 'ofuda', color: '#f4e8c8', desc: 'Enemies have 10% less Attack.', effects: [{ k: 'enemyStats', stats: { ad: -10 }, pct: true }] },
  { id: 'gambler_dice', name: 'Gambler’s Dice', tier: 'uncommon', icon: 'dice', color: '#f0f0f0', desc: 'Your first 2 shop rerolls in each shop are free.', effects: [{ k: 'freeRerolls', n: 2 }] },
  // ------------------------------------------------------------ Rare
  { id: 'dragon_scale', name: 'Dragon Scale', tier: 'rare', icon: 'scale', color: '#5ad1e6', desc: 'Your Hero gains +25% max HP and +20 Armour.', effects: [{ k: 'heroMaxHp', pct: 25 }, { k: 'heroStats', stats: { armor: 20 } }] },
  { id: 'fortune_scroll', name: 'Fortune Scroll', tier: 'rare', icon: 'scroll', color: '#c38bff', desc: 'Pack rewards offer 1 extra choice. Units sell for +1 gold.', effects: [{ k: 'extraPackChoice' }, { k: 'sellBonus', n: 1 }] },
  { id: 'temple_gong', name: 'Temple Gong', tier: 'rare', icon: 'gong', color: '#ffb35a', desc: 'All your units gain +15% Atk Speed.', effects: [{ k: 'teamStats', stats: { as: 15 }, pct: true }] },
  {
    id: 'spirit_bell',
    name: 'Spirit Bell',
    tier: 'rare',
    icon: 'bell',
    color: '#8ae8ff',
    desc: 'Every 6 seconds your Hero heals all allies for 70 HP.',
    effects: [{ k: 'unitPassive', who: { heroOnly: true }, passive: { name: 'Spirit Bell', trigger: 'interval', interval: 6, steps: [step(S.allAllies, [E.heal(70)], 'heal')] } }],
  },
  {
    id: 'headsman_blade',
    name: 'Headsman’s Blade',
    tier: 'rare',
    icon: 'blade',
    color: '#e84a5a',
    desc: 'Your Assassins and Fighters execute enemies below 12% HP when they hit them.',
    effects: [{ k: 'unitPassive', who: { roles: ['assassin', 'fighter'] }, passive: { name: 'Headsman', trigger: 'onAttack', steps: [step(S.target, [E.execute(0.12)])] } }],
  },
  {
    id: 'thunder_charm',
    name: 'Raijin’s Charm',
    tier: 'rare',
    icon: 'bolt',
    color: '#ffe04a',
    desc: 'Every 4th attack of each of your units also deals 60 magic damage.',
    effects: [{ k: 'unitPassive', who: {}, passive: { name: 'Raijin’s Charm', trigger: 'everyNthAttack', n: 4, steps: [step(S.target, [E.magic(60)], 'lightning')] } }],
  },
  // ------------------------------------------------------------ Boss
  { id: 'imperial_standard', name: 'Imperial Standard', tier: 'boss', icon: 'standard', color: '#ffd24a', desc: '+1 board slot. All your units gain +10% HP.', effects: [{ k: 'boardLimit', n: 1 }, { k: 'teamStats', stats: { hp: 10 }, pct: true }] },
  { id: 'celestial_mirror', name: 'Celestial Mirror', tier: 'boss', icon: 'mirror', color: '#fff6d8', desc: 'At the start of each act, 2 random units gain +1 star.', effects: [{ k: 'actStarUp', n: 2 }] },
  { id: 'oni_crown', name: 'Oni Warlord’s Crown', tier: 'boss', icon: 'crown', color: '#ff4a6a', desc: 'All your units gain +20% Attack and +10% HP.', effects: [{ k: 'teamStats', stats: { ad: 20, hp: 10 }, pct: true }] },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    tier: 'boss',
    icon: 'feather',
    color: '#ff8a3c',
    desc: 'Your Hero heals 15% of max HP after every fight, and once per fight heals 40% of max HP when dropping below 30%.',
    effects: [
      { k: 'heroHealAfterFight', pct: 15 },
      { k: 'unitPassive', who: { heroOnly: true }, passive: { name: 'Rebirth', trigger: 'hpBelow', threshold: 0.3, once: true, steps: [step(S.self, [E.heal(0, 0.4)], 'fire')] } },
    ],
  },
  { id: 'dragon_pearl', name: 'Dragon Pearl', tier: 'boss', icon: 'pearl', color: '#7ae8ff', desc: 'Your units start each fight with 40 ult charge and gain ult charge 25% faster.', effects: [{ k: 'startCharge', n: 40 }, { k: 'teamStats', stats: { chargeGain: 25 } }] },
];
