/**
 * Shared state for the frame being drawn (size, look, pose) and small helpers
 * used by every body, head and gear module in src/art.
 */
import type { SpriteLook } from '../core/types';
import { overlay } from './raster';

export type Pose = 'idle' | 'windup' | 'strike';

export const A = {
  S: 32,
  /** Scale: 1 for 32 px units, 1.5 for 48 px Heroes. */
  k: 1,
  look: {} as SpriteLook,
  frame: 0,
  pose: 'idle' as Pose,
  /** First row below the feet. */
  base: 29,
  /** Centre column including the attack lunge. */
  cx: 15,
  /** Vertical breathing offset for the upper body (0 or 1). */
  bob: 0,
  big: false,
};

/** Scales a 32-space length (may be 0). */
export function n(v: number): number {
  return Math.round(v * A.k);
}

/** Scales a 32-space length, at least 1. */
export function N(v: number): number {
  return Math.max(1, Math.round(v * A.k));
}

/** True at Hero size, where there is room for extra 1-pixel detail. */
export function hiRes(): boolean {
  return A.k > 1;
}

/** Secondary motion for hair, tails and cloth: -1, 0 or 1 by frame. */
export function sway(): number {
  return A.frame === 1 ? 1 : A.frame === 3 ? -1 : A.frame === 2 ? 1 : 0;
}

export function pose(frame: number): Pose {
  return frame === 2 ? 'windup' : frame === 3 ? 'strike' : 'idle';
}

/** The trim colour: explicit, else the accent unless it matches the main colour. */
export function trimR(): string {
  const l = A.look;
  return l.trim ?? (l.accent === l.main ? (l.main === 'gold' ? 'red' : 'gold') : l.accent);
}

export function eyeR(): string {
  const l = A.look;
  if (l.eyes) return l.eyes;
  return l.accent === 'gold' || l.accent === 'steel' || l.accent === 'ink' ? 'indigo' : l.accent;
}

/** Hair ramp, or the skin when the look has no hair. */
export function hairR(): string {
  const l = A.look;
  return l.hair === 'none' ? l.skin : l.hair;
}

/** Ramp of the lower garment. */
export function lowerR(): string {
  const l = A.look;
  if (l.lower) return l.lower;
  if (l.body === 'armor') return 'ink';
  if (l.body === 'light') return l.main === 'ink' ? 'indigo' : 'ink';
  return l.main;
}

/** A deterministic hash for scattering pattern details. */
export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Applies a cloth/fur pattern to the current part inside a box, keeping the
 * shading (the pattern colour takes the pixel's shade).
 */
export function pattern(kind: string | undefined, x0: number, y0: number, x1: number, y1: number, pr: string): void {
  if (!kind || kind === 'none') return;
  const ox = Math.round(x0);
  const oy = Math.round(y0);
  switch (kind) {
    case 'stripes':
      // Tiger stripes: slanted bars hanging from the back.
      overlay(x0, y0, x1, y1, (x, y, s) => {
        const ly = y - oy;
        const h = Math.round((y1 - y0) * 0.65);
        if (ly > h) return null;
        const lx = x - ox + Math.floor(ly / 2);
        const len = 2 + ((Math.floor(lx / 4) * 7) % 3);
        return lx % 4 === 0 && ly < len + 1 ? [pr, Math.min(s, 2)] : null;
      });
      break;
    case 'spots':
      overlay(x0, y0, x1, y1, (x, y, s) => ((x - ox) * 3 + (y - oy) * 5) % 9 === 0 ? [pr, s] : null);
      break;
    case 'scales':
      overlay(x0, y0, x1, y1, (x, y, s) => {
        const row = Math.floor((y - oy) / 2);
        const c = (x - ox + (row % 2) * 2) % 4;
        if ((y - oy) % 2 === 1) return c === 0 ? null : [pr, Math.max(1, s - 1)];
        return c === 2 ? [pr, Math.min(5, s + 1)] : null;
      });
      break;
    case 'checker':
      overlay(x0, y0, x1, y1, (x, y, s) => (((x - ox) >> 1) + ((y - oy) >> 1)) % 2 ? [pr, s] : null);
      break;
    case 'waves':
      // Seigaiha: stacked arcs.
      overlay(x0, y0, x1, y1, (x, y, s) => {
        const r = (y - oy) % 3;
        const c = (x - ox + (Math.floor((y - oy) / 3) % 2) * 2) % 4;
        return (r === 0 && (c === 1 || c === 2)) || (r === 1 && (c === 0 || c === 3)) ? [pr, Math.min(5, s + 1)] : null;
      });
      break;
    case 'clouds':
      overlay(x0, y0, x1, y1, (x, y, s) => {
        const c = (x - ox + Math.floor((y - oy) / 3) * 3) % 6;
        const r = (y - oy) % 3;
        return (r === 1 && c < 3) || (r === 0 && c === 1) ? [pr, Math.min(5, s + 1)] : null;
      });
      break;
    case 'sakura':
      overlay(x0, y0, x1, y1, (x, y, s) => {
        const gx = (x - ox + Math.floor((y - oy) / 5) * 2) % 5;
        const gy = (y - oy) % 5;
        if (gx === 2 && gy === 2) return ['gold', 4];
        if ((Math.abs(gx - 2) === 1 && gy === 2) || (gx === 2 && Math.abs(gy - 2) === 1)) return [pr, Math.max(4, s)];
        return null;
      });
      break;
    case 'stars':
      overlay(x0, y0, x1, y1, (x, y) => {
        const h = hash(x - ox, y - oy);
        return h < 0.06 ? ['gold', 5] : h < 0.1 ? ['snow', 4] : null;
      });
      break;
    case 'patches':
      overlay(x0, y0, x1, y1, (x, y, s) => {
        const lx = x - ox;
        const ly = y - oy;
        if (lx >= 1 && lx <= 3 && ly >= 2 && ly <= 4) return [pr, lx === 1 || ly === 2 ? s : Math.max(1, s - 1)];
        if (ly === 1 && lx % 2 === 0 && lx > 4) return [pr, 1];
        return null;
      });
      break;
    case 'flames':
      overlay(x0, y0, x1, y1, (x, y) => {
        const lx = x - ox;
        const h = 2 + ((lx * 5) % 4) + (lx % 3 === 0 ? 1 : 0);
        const fromBottom = Math.round(y1) - y;
        return fromBottom < h ? [pr, fromBottom < h - 2 ? 3 : 4] : null;
      });
      break;
    default:
      break;
  }
}
