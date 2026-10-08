/**
 * Artifacts: run-long relics. Their effects are data; src/core/artifacts.ts
 * sums them up for the rest of the game.
 */
import type { ArtifactDef } from '../core/types';

export const ARTIFACTS: readonly ArtifactDef[] = [
  // ------------------------------------------------------------ Common
  { id: 'rice_pouch', name: 'Rice Pouch', tier: 'common', icon: 'pouch', color: '#e8d7a8', desc: '+2 gold after every win.', effects: [{ k: 'goldPerWin', n: 2 }] },
  { id: 'spare_mat', name: 'Spare Tatami', tier: 'common', icon: 'mat', color: '#b8c870', desc: '+1 bench slot.', effects: [{ k: 'benchSlots', n: 1 }] },
  { id: 'healing_herbs', name: 'Healing Herbs', tier: 'common', icon: 'herb', color: '#6ad08a', desc: 'Your Hero heals an extra 6% of max HP after every fight.', effects: [{ k: 'heroHealAfterFight', pct: 6 }] },
  { id: 'whetstone', name: 'Whetstone', tier: 'common', icon: 'stone', color: '#a0a8b8', desc: 'All your units gain +8% Attack.', effects: [{ k: 'teamStats', stats: { ad: 8 }, pct: true }] },
  { id: 'merchant_seal', name: 'Merchant’s Seal', tier: 'common', icon: 'seal', color: '#e86a5a', desc: 'Shop prices are 15% lower.', effects: [{ k: 'shopDiscount', pct: 15 }] },
  // ------------------------------------------------------------ Uncommon
  { id: 'war_banner', name: 'War Banner', tier: 'uncommon', icon: 'banner', color: '#ff5a4a', desc: '+1 board slot.', effects: [{ k: 'boardLimit', n: 1 }] },
  { id: 'jade_abacus', name: 'Jade Abacus', tier: 'uncommon', icon: 'abacus', color: '#5fe3a1', desc: 'After each win, gain 1 gold per 10 gold you hold (max 4).', effects: [{ k: 'interest', per: 10, max: 4 }] },
  { id: 'storm_drum', name: 'Storm Drum', tier: 'uncommon', icon: 'drum', color: '#ffd96b', desc: 'Your units start each fight with 30 ult charge.', effects: [{ k: 'startCharge', n: 30 }] },
  { id: 'lucky_cat', name: 'Lucky Cat', tier: 'uncommon', icon: 'cat', color: '#fff2c8', desc: 'Rare, Epic and Legendary pulls are 30% more likely.', effects: [{ k: 'rarityLuck', pct: 30 }] },
  { id: 'iron_tea', name: 'Iron Tea Set', tier: 'uncommon', icon: 'tea', color: '#8fb4ff', desc: 'All your units gain +15 Armour and +15 Magic Res.', effects: [{ k: 'teamStats', stats: { armor: 15, mr: 15 } }] },
  // ------------------------------------------------------------ Rare
  { id: 'dragon_scale', name: 'Dragon Scale', tier: 'rare', icon: 'scale', color: '#5ad1e6', desc: 'Your Hero gains +25% max HP and +20 Armour.', effects: [{ k: 'heroMaxHp', pct: 25 }, { k: 'heroStats', stats: { armor: 20 } }] },
  { id: 'fortune_scroll', name: 'Fortune Scroll', tier: 'rare', icon: 'scroll', color: '#c38bff', desc: 'Pack rewards offer 1 extra choice. Units sell for +1 gold.', effects: [{ k: 'extraPackChoice' }, { k: 'sellBonus', n: 1 }] },
  { id: 'temple_gong', name: 'Temple Gong', tier: 'rare', icon: 'gong', color: '#ffb35a', desc: '+1 board slot. All your units gain +10% Atk Speed.', effects: [{ k: 'boardLimit', n: 1 }, { k: 'teamStats', stats: { as: 10 }, pct: true }] },
  // ------------------------------------------------------------ Boss
  { id: 'imperial_standard', name: 'Imperial Standard', tier: 'boss', icon: 'standard', color: '#ffd24a', desc: '+2 board slots.', effects: [{ k: 'boardLimit', n: 2 }] },
  { id: 'celestial_mirror', name: 'Celestial Mirror', tier: 'boss', icon: 'mirror', color: '#fff6d8', desc: '+1 board slot. At the start of each act, a random unit gains +1 star.', effects: [{ k: 'boardLimit', n: 1 }, { k: 'actStarUp', n: 1 }] },
  { id: 'oni_crown', name: 'Oni Warlord’s Crown', tier: 'boss', icon: 'crown', color: '#ff4a6a', desc: '+1 board slot. All your units gain +15% Attack and +10% HP.', effects: [{ k: 'boardLimit', n: 1 }, { k: 'teamStats', stats: { ad: 15, hp: 10 }, pct: true }] },
  { id: 'phoenix_feather', name: 'Phoenix Feather', tier: 'boss', icon: 'feather', color: '#ff8a3c', desc: '+1 board slot. Your Hero heals 15% of max HP after every fight.', effects: [{ k: 'boardLimit', n: 1 }, { k: 'heroHealAfterFight', pct: 15 }] },
];
