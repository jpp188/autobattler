import type { Rarity } from '../core/types';

/** UI colours (as numbers for Phaser and strings for text). */
export const C = {
  bg: 0x120c1c,
  bgDeep: 0x07050b,
  panel: 0x2a1f3d,
  panelLight: 0x3d2f57,
  panelDark: 0x1a1226,
  border: 0xc9a36a,
  borderDark: 0x6b4f2e,
  text: 0xf3e9d2,
  dim: 0x9a8fae,
  gold: 0xffd24a,
  hp: 0x5ad16a,
  hpBack: 0x3a1a22,
  enemyHp: 0xe8504a,
  charge: 0x5ac8ff,
  shield: 0xd8e8ff,
  good: 0x7fe08a,
  bad: 0xff6a5a,
  player: 0x3a6ab0,
  enemy: 0xb04a4a,
};

export const T = {
  text: '#f3e9d2',
  dim: '#9a8fae',
  gold: '#ffd24a',
  good: '#7fe08a',
  bad: '#ff6a5a',
  title: '#ffd27a',
  blue: '#8fd0ff',
  ink: '#1a1226',
};

export const RARITY_COLOR: Record<Rarity, number> = {
  common: 0xb8b8c8,
  uncommon: 0x5fd17a,
  rare: 0x4aa8ff,
  epic: 0xc06aff,
  legendary: 0xffb32a,
};

export const RARITY_TEXT: Record<Rarity, string> = {
  common: '#c8c8d8',
  uncommon: '#6fe08a',
  rare: '#6ab8ff',
  epic: '#d08aff',
  legendary: '#ffc24a',
};

export function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function numToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
