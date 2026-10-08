/**
 * The master palette: 17 hue ramps × 6 shades. Each ramp runs from a deep
 * shade (0, used for coloured outlines and seams) through shadow (1, 2), base
 * (3) and light (4) to a highlight (5, used for specular glints). The ramps
 * are hue-shifted the way hi-bit pixel art does it: shadows lean toward violet
 * and highlights toward warm yellow, so shading reads as light rather than as
 * "the same colour, darker".
 *
 * Sprites refer to ramps by name and pick a shade, so recolouring a unit
 * (skins!) is just swapping ramp names.
 */
export const RAMPS = {
  skin: ['#3a1a22', '#7a3a35', '#b8664c', '#e09a74', '#f4c6a0', '#ffead6'],
  tan: ['#1f1011', '#3f1f1c', '#6d3a2c', '#a3633e', '#c5986d', '#e6d3b4'],
  wood: ['#180d0d', '#2d1815', '#593526', '#8d5e3a', '#ba915e', '#dcc8a2'],
  red: ['#240b18', '#4a1226', '#81182f', '#c11f2a', '#e65a4e', '#f7b49a'],
  orange: ['#2c0b0e', '#5e1712', '#993115', '#dc6018', '#f0a25a', '#fadcaa'],
  gold: ['#2f160c', '#673814', '#a26716', '#e6af19', '#f2d860', '#fff5bc'],
  jade: ['#0d201f', '#164138', '#217356', '#2ead6e', '#5dd089', '#b0eec0'],
  moss: ['#101d0e', '#223819', '#426629', '#729b3b', '#a5c266', '#d8e4aa'],
  teal: ['#0d1822', '#163645', '#216878', '#2dafb4', '#5fd3c9', '#b2f0e2'],
  blue: ['#0d0b23', '#131748', '#1b307e', '#245cbc', '#5797db', '#acd8f4'],
  indigo: ['#0f0c17', '#19142a', '#2f2556', '#3e388a', '#6c5bb9', '#b3a4dc'],
  purple: ['#120e1d', '#251839', '#4b2768', '#80389f', '#b363c5', '#e2b2e4'],
  pink: ['#2d0e29', '#611a4e', '#972066', '#d62974', '#ea7598', '#f8c8cf'],
  steel: ['#1a191e', '#33323e', '#4c4d61', '#6a718a', '#9aa2b4', '#e4e8ef'],
  ink: ['#0e0d12', '#191622', '#262135', '#3c304f', '#59456e', '#7f6193'],
  bone: ['#2c201c', '#564133', '#8a6e4d', '#b8a57a', '#d8d1b2', '#f3f1e4'],
  snow: ['#202132', '#394160', '#5b75a4', '#a2b8cd', '#d1dee5', '#f6f9fa'],
} as const;

export type RampName = keyof typeof RAMPS;

export const SHADES = 6;

/** Rarity outline / glow colours. */
export const RARITY_GLOW: Record<string, string> = {
  common: '#9aa0b4',
  uncommon: '#4ad870',
  rare: '#3a9cff',
  epic: '#b85aff',
  legendary: '#ffb020',
};

/** The dark outer outline around every character. */
export const OUTLINE = '#120c1c';

/** Returns shade `i` (0 deep … 5 highlight) of a ramp; unknown ramps fall back to steel. */
export function shade(ramp: string, i: number): string {
  const r = (RAMPS as Record<string, readonly string[]>)[ramp] ?? RAMPS.steel;
  return r[Math.max(0, Math.min(SHADES - 1, Math.round(i)))];
}

export function isRamp(name: string): name is RampName {
  return name in RAMPS;
}

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** All palette colours, for documentation and tests. */
export const PALETTE: string[] = Object.values(RAMPS).flat();
