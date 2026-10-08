/**
 * Text events with trade-offs. Outcomes are data handled by src/core/run.ts.
 */
import type { EventDef } from '../core/types';

export const EVENTS: readonly EventDef[] = [
  {
    id: 'fox_shrine',
    title: 'The Fox Shrine',
    art: 'shrine',
    text: 'A tiny shrine guarded by stone foxes. A voice from the offering box whispers: "Something precious for something rare."',
    choices: [
      { label: 'Offer a unit', hint: 'Sacrifice a unit you choose. Gain a Rare-guaranteed Elite Pack.', requires: { units: 1 }, outcomes: [{ k: 'sacrifice' }, { k: 'pack', pack: 'elite' }] },
      { label: 'Leave a coin', hint: 'Pay 5 gold. Gain a Basic Pack.', requires: { gold: 5 }, outcomes: [{ k: 'gold', n: -5 }, { k: 'pack', pack: 'basic' }] },
      { label: 'Bow and walk on', hint: 'Nothing happens.', outcomes: [{ k: 'nothing' }] },
    ],
  },
  {
    id: 'hot_spring',
    title: 'Mountain Hot Spring',
    art: 'spring',
    text: 'Steam curls from a hidden onsen beneath the cherry trees. Monkeys glare at you from the far side.',
    choices: [
      { label: 'Soak', hint: 'Your Hero heals 30% of max HP.', outcomes: [{ k: 'heroHp', pct: 30 }] },
      { label: 'Train in the cold falls', hint: 'Choose a unit: +120 HP permanently this run.', requires: { units: 1 }, outcomes: [{ k: 'train', stat: 'hp', amount: 120 }] },
    ],
  },
  {
    id: 'gambling_den',
    title: 'Dice in the Back Room',
    art: 'dice',
    text: 'A one-eyed oni shakes a cup of dice. "Double or nothing, traveller?"',
    choices: [
      {
        label: 'Bet 10 gold',
        hint: '50%: win 25 gold. 50%: lose it.',
        requires: { gold: 10 },
        outcomes: [{ k: 'gold', n: -10 }, { k: 'gamble', chance: 0.5, win: [{ k: 'gold', n: 25 }], lose: [{ k: 'nothing' }] }],
      },
      { label: 'Buy his lucky pack', hint: 'Pay 3 gold for a Gamble Pack.', requires: { gold: 3 }, outcomes: [{ k: 'gold', n: -3 }, { k: 'pack', pack: 'gamble' }] },
      { label: 'Walk away', hint: 'Keep your gold.', outcomes: [{ k: 'nothing' }] },
    ],
  },
  {
    id: 'wandering_smith',
    title: 'The Wandering Swordsmith',
    art: 'forge',
    text: 'An old smith hammers at a portable anvil. "Steel remembers who holds it. Give me time with one of your fighters."',
    choices: [
      { label: 'Temper a blade', hint: 'Choose a unit: +25 Attack permanently. Your Hero loses 8% HP.', requires: { units: 1 }, outcomes: [{ k: 'train', stat: 'ad', amount: 25 }, { k: 'heroHp', pct: -8 }] },
      { label: 'Buy a whetstone', hint: 'Pay 12 gold for a random artifact.', requires: { gold: 12 }, outcomes: [{ k: 'gold', n: -12 }, { k: 'artifact', tier: 'common' }] },
      { label: 'Leave', hint: 'Nothing happens.', outcomes: [{ k: 'nothing' }] },
    ],
  },
  {
    id: 'lantern_festival',
    title: 'Lantern Festival',
    art: 'lanterns',
    text: 'Paper lanterns drift over the river. Villagers invite you to join the celebration.',
    choices: [
      { label: 'Join the dance', hint: 'All trait momentum +15.', outcomes: [{ k: 'momentum', target: 'all', n: 15 }] },
      { label: 'Visit the stalls', hint: 'Gain a Mystery Pack.', outcomes: [{ k: 'pack', pack: 'mystery' }] },
    ],
  },
  {
    id: 'oni_toll',
    title: 'The Oni Toll Bridge',
    art: 'bridge',
    text: 'A huge oni blocks a red bridge. "Toll is twelve gold. Or a fight. I like fights."',
    choices: [
      { label: 'Pay the toll', hint: 'Lose 12 gold.', requires: { gold: 12 }, outcomes: [{ k: 'gold', n: -12 }] },
      { label: 'Fight him', hint: 'Your Hero loses 15% HP. Gain 18 gold.', outcomes: [{ k: 'heroHp', pct: -15 }, { k: 'gold', n: 18 }] },
      { label: 'Share your sake', hint: 'Sacrifice a unit you choose. The oni becomes a friend: gain an Oni Pack.', requires: { units: 1 }, outcomes: [{ k: 'sacrifice' }, { k: 'pack', pack: 'trait_oni' }] },
    ],
  },
  {
    id: 'star_well',
    title: 'Well of Fallen Stars',
    art: 'well',
    text: 'At the bottom of an old well, a star still glows. Something wants to be pulled up.',
    choices: [
      { label: 'Climb down', hint: 'Your Hero loses 20% HP. Choose a unit below 3 stars: it gains +1 star.', requires: { units: 1, heroHpPct: 25 }, outcomes: [{ k: 'heroHp', pct: -20 }, { k: 'starUp' }] },
      { label: 'Make a wish', hint: 'Gain a random Rare unit.', outcomes: [{ k: 'unit', rarity: 'rare' }] },
    ],
  },
  {
    id: 'tea_house',
    title: 'A Quiet Tea House',
    art: 'tea',
    text: 'A tea master pours in perfect silence. The steam smells of plum blossoms.',
    choices: [
      { label: 'Drink deeply', hint: 'Your Hero heals 15% HP and gains +80 max HP.', outcomes: [{ k: 'heroHp', pct: 15 }, { k: 'heroMaxHp', n: 80 }] },
      { label: 'Discuss strategy', hint: 'Your highest-momentum trait gains +30 momentum.', outcomes: [{ k: 'momentum', target: 'highest', n: 30 }] },
    ],
  },
  {
    id: 'kappa_bet',
    title: 'The Kappa’s Wager',
    art: 'pond',
    text: 'A kappa pops out of the pond. "Cucumber or a contest of strength? Winner takes a treasure."',
    choices: [
      { label: 'Wrestle', hint: '60%: gain an Uncommon artifact. 40%: your Hero loses 12% HP.', outcomes: [{ k: 'gamble', chance: 0.6, win: [{ k: 'artifact', tier: 'uncommon' }], lose: [{ k: 'heroHp', pct: -12 }] }] },
      { label: 'Offer cucumbers', hint: 'Pay 6 gold. Gain a Spirit Beast Pack.', requires: { gold: 6 }, outcomes: [{ k: 'gold', n: -6 }, { k: 'pack', pack: 'trait_beast' }] },
      { label: 'Back away slowly', hint: 'Nothing happens.', outcomes: [{ k: 'nothing' }] },
    ],
  },
  {
    id: 'ruined_library',
    title: 'Ruined Library',
    art: 'library',
    text: 'Scrolls of forgotten techniques lie scattered among the rubble.',
    choices: [
      { label: 'Study the scrolls', hint: 'Choose a unit: +20 Armour and +20 Magic Res permanently.', requires: { units: 1 }, outcomes: [{ k: 'train', stat: 'armor', amount: 20 }, { k: 'train', stat: 'mr', amount: 20 }] },
      { label: 'Sell the scrolls', hint: 'Gain 14 gold. All trait momentum -10.', outcomes: [{ k: 'gold', n: 14 }, { k: 'momentum', target: 'all', n: -10 }] },
    ],
  },
  {
    id: 'celestial_envoy',
    title: 'The Celestial Envoy',
    art: 'envoy',
    minAct: 2,
    text: 'A herald of the heavenly court descends on a cloud. "The Emperor offers a gift to those who kneel."',
    choices: [
      { label: 'Kneel', hint: 'Gain a Rare artifact. Your Hero loses 10% HP.', outcomes: [{ k: 'artifact', tier: 'rare' }, { k: 'heroHp', pct: -10 }] },
      { label: 'Refuse', hint: 'Gain a Celestial Pack.', outcomes: [{ k: 'pack', pack: 'trait_celestial' }] },
    ],
  },
  {
    id: 'shadow_market',
    title: 'The Shadow Market',
    art: 'market',
    minAct: 1,
    text: 'Masked merchants trade under moonlight. One offers a deal: "A legend, for your life’s blood."',
    choices: [
      { label: 'Accept', hint: 'Your Hero loses 30% HP. Gain a random Epic unit.', requires: { heroHpPct: 35 }, outcomes: [{ k: 'heroHp', pct: -30 }, { k: 'unit', rarity: 'epic' }] },
      { label: 'Browse', hint: 'Pay 8 gold for a Duo Pack.', requires: { gold: 8 }, outcomes: [{ k: 'gold', n: -8 }, { k: 'pack', pack: 'duo' }] },
      { label: 'Leave', hint: 'Nothing happens.', outcomes: [{ k: 'nothing' }] },
    ],
  },
];
