/**
 * The master palette: 12 hue ramps × 4 shades = 48 colours. Each ramp goes
 * from shadow (0) to highlight (3). Sprites refer to ramps by name and pick a
 * shade, so recolouring a unit (skins!) is just swapping ramp names.
 */
export const RAMPS = {
  skin: ['#b0654a', '#e0956a', '#f7c39a', '#ffe6cc'],
  tan: ['#6b3f2e', '#9a5f42', '#c98a5e', '#e8b689'],
  red: ['#6e1a2a', '#b8293b', '#e8504a', '#ff9a7a'],
  orange: ['#7a3416', '#c4621e', '#f2953a', '#ffd08a'],
  gold: ['#7a5418', '#c4922a', '#f2c94a', '#fff2a8'],
  jade: ['#14523e', '#1f8a5e', '#3fd08a', '#a8f5c8'],
  teal: ['#164e5e', '#1e8a9a', '#3ccfd8', '#b4f4f0'],
  blue: ['#1a2e6e', '#2a5ab8', '#4a92f2', '#a8d4ff'],
  indigo: ['#1e1846', '#36307a', '#5a56b8', '#9a9ae8'],
  purple: ['#3e164e', '#6e2a8a', '#a650c8', '#e0a0f2'],
  pink: ['#6e1e4a', '#b83a7a', '#f26aa8', '#ffc0dc'],
  steel: ['#4a4e62', '#7e8498', '#bcc2d2', '#f4f6ff'],
  ink: ['#120c1c', '#2a2236', '#463a52', '#6e6080'],
} as const;

export type RampName = keyof typeof RAMPS;

/** Rarity outline / glow colours. */
export const RARITY_GLOW: Record<string, string> = {
  common: '#9aa0b4',
  uncommon: '#4ad870',
  rare: '#3a9cff',
  epic: '#b85aff',
  legendary: '#ffb020',
};

export const OUTLINE = '#120c1c';

export function shade(ramp: string, i: number): string {
  const r = (RAMPS as Record<string, readonly string[]>)[ramp] ?? RAMPS.steel;
  return r[Math.max(0, Math.min(3, i))];
}

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** All 48 palette colours (plus outline), for documentation and tests. */
export const PALETTE: string[] = Object.values(RAMPS).flat();
