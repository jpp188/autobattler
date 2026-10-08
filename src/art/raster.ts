/**
 * The hi-bit raster: sprites are not painted straight to a canvas but into a
 * small material buffer that stores, per pixel, a palette ramp, a shade (0-5)
 * and the id of the part that drew it. Shapes are shaded from a pseudo-3D
 * normal (spheres, cylinders) with one key light from the upper left, with
 * optional ordered dithering at band edges.
 *
 * When the frame is finished the buffer is resolved to colours with:
 *  - seams: where a front part overlaps a part behind it, the back part gets
 *    a dark contact line in its own ramp (selective interior outline);
 *  - rim light: a lighter edge along the right-hand silhouette;
 *  - outer outline: dark everywhere, but tinted by the adjacent ramp's deepest
 *    shade on the lit (top/left) side;
 *  - rarity glow, ground shadow, hit flash and flat silhouettes.
 *
 * Everything is a pure function of the drawing calls (no randomness).
 */
import { OUTLINE, RAMPS, rgb } from './palette';

const RAMP_NAMES = Object.keys(RAMPS);
const RAMP_ID: Record<string, number> = Object.fromEntries(RAMP_NAMES.map((n, i) => [n, i]));
const RAMP_RGB: [number, number, number][][] = RAMP_NAMES.map((n) => (RAMPS as Record<string, readonly string[]>)[n].map(rgb));
const STEEL = RAMP_ID.steel;
const OUT_RGB = rgb(OUTLINE);

/** 4×4 Bayer matrix, normalised to 0..1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export interface PartOpts {
  /** Casts a dark contact seam onto parts drawn before it (default true). */
  seam?: boolean;
  /** Takes rim light on its right edge (default true). */
  rim?: boolean;
  /** Receives seams from parts in front (default true). */
  takesSeam?: boolean;
}

export interface ShadeOpts {
  /** Darkest and lightest shade the shading may use (defaults 1 and 4). */
  lo?: number;
  hi?: number;
  /** Ordered dithering strength at band edges (0 none, 1 strong). */
  dither?: number;
  /** Brightness bias added before quantising (-1..1). */
  bias?: number;
  /** Metal: allow the full ramp and push highlights to specular. */
  metal?: boolean;
  /** Only draw over pixels already filled (for overlays). */
  onlyOver?: boolean;
}

let S = 32;
let ramp = new Int8Array(S * S);
let sh = new Uint8Array(S * S);
let part = new Uint16Array(S * S);
let partSeam: boolean[] = [];
let partRim: boolean[] = [];
let partTakes: boolean[] = [];
let cur = 0;
let fx: { x: number; y: number; c: string }[] = [];

export function begin(size: number): void {
  if (size !== S || ramp.length !== size * size) {
    S = size;
    ramp = new Int8Array(S * S);
    sh = new Uint8Array(S * S);
    part = new Uint16Array(S * S);
  }
  ramp.fill(-1);
  sh.fill(0);
  part.fill(0);
  partSeam = [false];
  partRim = [false];
  partTakes = [false];
  cur = 0;
  fx = [];
  newPart();
}

/** Starts a new part: everything drawn until the next call belongs to it. */
export function newPart(o: PartOpts = {}): number {
  cur++;
  partSeam[cur] = o.seam ?? true;
  partRim[cur] = o.rim ?? true;
  partTakes[cur] = o.takesSeam ?? true;
  return cur;
}

export function size(): number {
  return S;
}

function rid(name: string): number {
  return RAMP_ID[name] ?? STEEL;
}

/** Sets one pixel to a ramp and shade (clipped to the frame). */
export function px(x: number, y: number, r: string, s: number): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = y * S + x;
  ramp[i] = rid(r);
  sh[i] = Math.max(0, Math.min(5, Math.round(s)));
  part[i] = cur;
}

/** Recolours an existing pixel of the current frame, keeping its part. */
export function tint(x: number, y: number, r: string, s: number): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = y * S + x;
  if (ramp[i] < 0) return;
  ramp[i] = rid(r);
  sh[i] = Math.max(0, Math.min(5, Math.round(s)));
}

export function filled(x: number, y: number): boolean {
  x = Math.round(x);
  y = Math.round(y);
  return x >= 0 && y >= 0 && x < S && y < S && ramp[y * S + x] >= 0;
}

export function shadeAt(x: number, y: number): number {
  return filled(x, y) ? sh[Math.round(y) * S + Math.round(x)] : -1;
}

export function isCur(x: number, y: number): boolean {
  return filled(x, y) && part[Math.round(y) * S + Math.round(x)] === cur;
}

/** Translucent effect pixel drawn over the finished sprite (no outline). */
export function glint(x: number, y: number, c: string): void {
  fx.push({ x: Math.round(x), y: Math.round(y), c });
}

export function rect(x: number, y: number, w: number, h: number, r: string, s: number): void {
  for (let j = 0; j < Math.round(h); j++) for (let i = 0; i < Math.round(w); i++) px(Math.round(x) + i, Math.round(y) + j, r, s);
}

// ------------------------------------------------------------ lighting

const LX = -0.52;
const LY = -0.62;
const LZ = 0.59;

/** Brightness 0..1 for a surface normal (nx, ny, nz implied when omitted). */
export function light(nx: number, ny: number, nz?: number): number {
  const z = nz ?? Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const d = nx * LX + ny * LY + z * LZ;
  return Math.max(0, Math.min(1, 0.42 + 0.62 * d));
}

/** Quantises a brightness to a shade index with optional ordered dithering. */
export function quant(b: number, x: number, y: number, o: ShadeOpts = {}): number {
  const lo = o.lo ?? (o.metal ? 1 : 1);
  const hi = o.hi ?? (o.metal ? 5 : 4);
  const v = Math.max(0, Math.min(0.999, b + (o.bias ?? 0)));
  const n = hi - lo + 1;
  let t = v * n;
  if (o.dither) {
    const d = BAYER[(y & 3) * 4 + (x & 3)] - 0.5;
    t += d * o.dither;
  }
  return Math.max(lo, Math.min(hi, lo + Math.floor(t)));
}

function shadePx(x: number, y: number, r: string, b: number, o: ShadeOpts): void {
  if (o.onlyOver && !filled(x, y)) return;
  px(x, y, r, quant(b, x, y, o));
}

/** A filled ellipse shaded as a sphere. */
export function ell(cx: number, cy: number, rx: number, ry: number, r: string, o: ShadeOpts = {}): void {
  const ex = rx + 0.5;
  const ey = ry + 0.5;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / ex;
      const ny = (y - cy) / ey;
      if (nx * nx + ny * ny > 1) continue;
      shadePx(x, y, r, light(nx * 0.9, ny * 0.9), o);
    }
  }
}

/**
 * A shape given row by row: `fn(y)` returns the [left, right] pixel columns of
 * that row (inclusive) or null. Shaded as a vertical cylinder, lighter at the
 * top by `o.bias` and the row's position.
 */
export function rows(y0: number, y1: number, fn: (y: number) => [number, number] | null, r: string, o: ShadeOpts & { round?: number; vert?: number } = {}): void {
  const round = o.round ?? 0.85;
  const vert = o.vert ?? 0.35;
  const hgt = Math.max(1, y1 - y0);
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    const sp = fn(y);
    if (!sp) continue;
    const a = Math.round(sp[0]);
    const b = Math.round(sp[1]);
    const mid = (a + b) / 2;
    const half = Math.max(0.5, (b - a + 1) / 2);
    const ny = -vert + (2 * vert * (y - y0)) / hgt;
    for (let x = a; x <= b; x++) {
      const nx = ((x - mid) / half) * round;
      shadePx(x, y, r, light(nx, ny * 0.7), o);
    }
  }
}

/** A box shaded as a vertical cylinder. */
export function box(x: number, y: number, w: number, h: number, r: string, o: ShadeOpts & { round?: number; vert?: number } = {}): void {
  if (w <= 0 || h <= 0) return;
  rows(y, y + h - 1, () => [x, x + w - 1], r, o);
}

/** Rounded rectangle (corners clipped), shaded as a soft sphere. */
export function rbox(x: number, y: number, w: number, h: number, r: string, o: ShadeOpts = {}, corner = 1): void {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  for (let j = 0; j < h; j++) {
    const inset = j < corner ? corner - j : j >= h - corner ? j - (h - corner) + 1 : 0;
    for (let i = inset; i < w - inset; i++) {
      const nx = ((i + 0.5) / w - 0.5) * 1.6;
      const ny = ((j + 0.5) / h - 0.5) * 1.5;
      shadePx(x + i, y + j, r, light(nx, ny), o);
    }
  }
}

/** A 1-pixel line between two points. */
export function line(x0: number, y0: number, x1: number, y1: number, r: string, s: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, s);
}

/** A thick tapered stroke between two points (limbs, tails, necks). */
export function limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, r: string, o: ShadeOpts = {}): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  // Perpendicular for the cylinder normal.
  const px_ = -dy / len;
  const py_ = dx / len;
  const seen = new Set<number>();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    const rad = (w0 + (w1 - w0) * t) / 2;
    for (let yy = Math.floor(cy - rad); yy <= Math.ceil(cy + rad); yy++)
      for (let xx = Math.floor(cx - rad); xx <= Math.ceil(cx + rad); xx++) {
        const ddx = xx - cx;
        const ddy = yy - cy;
        if (ddx * ddx + ddy * ddy > rad * rad + 0.25) continue;
        const key = yy * 4096 + xx;
        if (seen.has(key)) continue;
        seen.add(key);
        const across = rad > 0 ? (ddx * px_ + ddy * py_) / (rad + 0.5) : 0;
        shadePx(xx, yy, r, light(across * px_, across * py_), o);
      }
  }
}

/**
 * Recolours pixels of the current part inside a box: `fn` gets the pixel and
 * its current shade and returns [ramp, shade] or null to leave it.
 */
export function overlay(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, s: number) => [string, number] | null, anyPart = false): void {
  for (let y = Math.max(0, Math.round(y0)); y <= Math.min(S - 1, Math.round(y1)); y++)
    for (let x = Math.max(0, Math.round(x0)); x <= Math.min(S - 1, Math.round(x1)); x++) {
      const i = y * S + x;
      if (ramp[i] < 0 || (!anyPart && part[i] !== cur)) continue;
      const res = fn(x, y, sh[i]);
      if (res) {
        ramp[i] = rid(res[0]);
        sh[i] = Math.max(0, Math.min(5, Math.round(res[1])));
      }
    }
}

/** Bounding box of everything drawn so far. */
export function bounds(): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = S;
  let y0 = S;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (ramp[y * S + x] >= 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}

// ------------------------------------------------------------ resolve

export interface FinishOpts {
  glow: string;
  boss: boolean;
  /** Hit flash: the whole sprite white. */
  flash: boolean;
  /** Flat silhouette colour. */
  flat?: string;
  /** Ground shadow ellipse: centre x, y and radii. */
  shadow?: { cx: number; cy: number; rx: number; ry: number };
}

function hexRgb(c: string): [number, number, number] {
  return rgb(c);
}

/** Resolves the buffer to pixels and writes them into the canvas at (ox, oy). */
export function finish(ctx: CanvasRenderingContext2D, ox: number, oy: number, o: FinishOpts): void {
  const N = S * S;
  const outR = new Int16Array(N).fill(-1);
  // 1. Seams: back pixels touching a front part that casts seams.
  const sh2 = new Uint8Array(sh);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (ramp[i] < 0 || !partTakes[part[i]]) continue;
      const me = part[i];
      let seam = false;
      // Front parts cast their contact shadow down and to the right (light is top-left);
      // the up/left sides get a softer one-step seam.
      if ((x > 0 && ramp[i - 1] >= 0 && part[i - 1] > me && partSeam[part[i - 1]]) || (y > 0 && ramp[i - S] >= 0 && part[i - S] > me && partSeam[part[i - S]])) seam = true;
      else if ((x < S - 1 && ramp[i + 1] >= 0 && part[i + 1] > me && partSeam[part[i + 1]]) || (y < S - 1 && ramp[i + S] >= 0 && part[i + S] > me && partSeam[part[i + S]])) {
        sh2[i] = Math.max(1, sh[i] - 1);
        continue;
      }
      if (seam) sh2[i] = Math.max(0, Math.min(sh[i] - 2, 1));
    }
  // 2. Rim light on the right-hand silhouette edge.
  for (let y = 1; y < S; y++)
    for (let x = 2; x < S; x++) {
      const i = y * S + x;
      if (ramp[i] < 0 || !partRim[part[i]]) continue;
      const rightEmpty = x === S - 1 || ramp[i + 1] < 0;
      if (!rightEmpty || ramp[i - 1] < 0 || ramp[i - 2] < 0 || ramp[i - S] < 0) continue;
      if (sh2[i] <= 2 && sh2[i] >= 1) sh2[i] = 3;
    }
  // 3. Colours.
  const img = ctx.getImageData(ox, oy, S, S);
  const d = img.data;
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (ramp[i] < 0) continue;
    const c = RAMP_RGB[ramp[i]][sh2[i]];
    d[i * 4] = c[0];
    d[i * 4 + 1] = c[1];
    d[i * 4 + 2] = c[2];
    d[i * 4 + 3] = 255;
    solid[i] = 1;
  }
  // 4. Outer outline: tinted on the lit side.
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (solid[i]) continue;
      const r = x < S - 1 && solid[i + 1] ? i + 1 : -1;
      const b = y < S - 1 && solid[i + S] ? i + S : -1;
      const l = x > 0 && solid[i - 1] ? i - 1 : -1;
      const t = y > 0 && solid[i - S] ? i - S : -1;
      if (r < 0 && b < 0 && l < 0 && t < 0) continue;
      // Lit side: the shape lies to the right or below this pixel.
      const lit = (r >= 0 || b >= 0) && l < 0 && t < 0;
      outR[i] = lit ? (b >= 0 ? ramp[b] : ramp[r]) : 99;
    }
  for (let i = 0; i < N; i++) {
    if (outR[i] < 0) continue;
    const c = outR[i] === 99 ? OUT_RGB : RAMP_RGB[outR[i]][0];
    d[i * 4] = c[0];
    d[i * 4 + 1] = c[1];
    d[i * 4 + 2] = c[2];
    d[i * 4 + 3] = 255;
    solid[i] = 1;
  }
  // 5. Flash / flat.
  if (o.flash || o.flat) {
    const c = o.flat ? hexRgb(o.flat) : [255, 255, 255];
    for (let i = 0; i < N; i++)
      if (solid[i]) {
        d[i * 4] = c[0];
        d[i * 4 + 1] = c[1];
        d[i * 4 + 2] = c[2];
      }
  }
  if (!o.flat) {
    // 6. Rarity glow ring around the outline.
    const g = hexRgb(o.glow);
    const ga = Math.round(255 * (o.flash ? 0.2 : 0.55));
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        if (solid[i]) continue;
        if ((x > 0 && solid[i - 1] === 1) || (x < S - 1 && solid[i + 1] === 1) || (y > 0 && solid[i - S] === 1) || (y < S - 1 && solid[i + S] === 1)) {
          d[i * 4] = g[0];
          d[i * 4 + 1] = g[1];
          d[i * 4 + 2] = g[2];
          d[i * 4 + 3] = ga;
          solid[i] = 2;
        }
      }
    // 7. Ground shadow under everything.
    if (o.shadow) {
      const { cx, cy, rx, ry } = o.shadow;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          if (x < 0 || y < 0 || x >= S || y >= S) continue;
          const nx = (x - cx) / (rx + 0.5);
          const ny = (y - cy) / (ry + 0.5);
          if (nx * nx + ny * ny > 1) continue;
          const i = y * S + x;
          if (solid[i]) continue;
          d[i * 4] = 7;
          d[i * 4 + 1] = 5;
          d[i * 4 + 2] = 11;
          d[i * 4 + 3] = nx * nx + ny * ny > 0.55 ? 60 : 95;
        }
    }
  }
  ctx.putImageData(img, ox, oy);
  // 8. Translucent effects on top.
  if (!o.flat && !o.flash)
    for (const f of fx) {
      if (f.x < 0 || f.y < 0 || f.x >= S || f.y >= S) continue;
      ctx.fillStyle = f.c;
      ctx.fillRect(ox + f.x, oy + f.y, 1, 1);
    }
  if (o.boss && !o.flat) {
    const k = S / 32;
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(ox + Math.round(S / 2 - 9 * k), oy + S - 2, Math.round(18 * k), 1);
    ctx.fillStyle = '#b8293b';
    ctx.fillRect(ox + Math.round(S / 2 - 6 * k), oy + S - 1, Math.round(12 * k), 1);
  }
}
