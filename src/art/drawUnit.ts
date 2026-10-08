/**
 * The code-drawn pixel-art composer. Every unit is described by a SpriteLook
 * (body type, palette ramps, hair, hat, weapon, extra) and drawn here as
 * hi-bit chibi pixel art, facing right, in 5 frames:
 *   0, 1  idle (breathing bob)
 *   2     attack wind-up
 *   3     attack strike (lunge)
 *   4     hit flash (white silhouette)
 * Sizes are parametric so the same look renders at 32×32 (units) and 48×48
 * (Heroes) with crisp 1-pixel details at both sizes.
 */
import type { SpriteLook } from '../core/types';
import { OUTLINE, shade } from './palette';

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------ primitives

let C: Ctx;

function r(x: number, y: number, w: number, h: number, c: string): void {
  if (w <= 0 || h <= 0) return;
  C.fillStyle = c;
  C.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function p(x: number, y: number, c: string): void {
  C.fillStyle = c;
  C.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Filled ellipse, row by row (crisp pixel edges). */
function ell(cx: number, cy: number, rx: number, ry: number, c: string): void {
  C.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
    C.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/** A shaded ellipse: base, a highlight on the upper left and shadow lower right. */
function ellShaded(cx: number, cy: number, rx: number, ry: number, ramp: string): void {
  ell(cx, cy, rx, ry, shade(ramp, 1));
  ell(cx - 1, cy - 1, Math.max(1, rx - 1), Math.max(1, ry - 1), shade(ramp, 2));
  ell(cx - Math.ceil(rx / 2.5), cy - Math.ceil(ry / 2), Math.max(0, Math.floor(rx / 3)), Math.max(0, Math.floor(ry / 3)), shade(ramp, 3));
}

/** Plots a weapon or limb defined as points along an axis, rotated about (hx, hy). */
function plotRot(hx: number, hy: number, angleDeg: number, pts: readonly [number, number, string][]): void {
  const a = (angleDeg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  for (const [lx, ly, c] of pts) {
    // Local: y negative = along the weapon. Rotation clockwise by angle.
    const x = lx * ca - ly * sa;
    const y = lx * sa + ly * ca;
    p(hx + Math.round(x), hy + Math.round(y), c);
  }
}

function line(len: number, x: number, c: string, from = 0): [number, number, string][] {
  const out: [number, number, string][] = [];
  for (let i = from; i < len; i++) out.push([x, -i, c]);
  return out;
}

// ------------------------------------------------------------ frame context

interface F {
  ox: number;
  oy: number;
  S: number;
  k: number;
  look: SpriteLook;
  frame: number;
  big: boolean;
  /** Feet baseline (first row below the feet). */
  base: number;
  /** Centre x including the attack lunge. */
  cx: number;
  /** Vertical breathing offset for the upper body. */
  bob: number;
}

const K = (f: F, n: number) => Math.max(1, Math.round(n * f.k));

// ------------------------------------------------------------ weapons

type Pose = 'idle' | 'windup' | 'strike';

function pose(frame: number): Pose {
  return frame === 2 ? 'windup' : frame === 3 ? 'strike' : 'idle';
}

/** Draws a weapon held at the hand (hx, hy). */
function weapon(f: F, hx: number, hy: number): void {
  const w = f.look.weapon ?? 'none';
  const ps = pose(f.frame);
  const acc = f.look.accent;
  const L = (n: number) => K(f, n);
  const steel = [shade('steel', 3), shade('steel', 2), shade('steel', 1)];
  const wood = [shade('tan', 1), shade('tan', 2)];
  switch (w) {
    case 'sword':
    case 'katana': {
      const len = L(w === 'katana' ? 13 : 10);
      const ang = ps === 'idle' ? 30 : ps === 'windup' ? -50 : 100;
      const pts: [number, number, string][] = [];
      // Hilt and guard.
      pts.push([0, 1, shade('ink', 1)], [0, 2, shade('ink', 2)]);
      pts.push([-1, -1, shade('gold', 2)], [0, -1, shade('gold', 3)], [1, -1, shade('gold', 1)]);
      for (let i = 2; i < len; i++) {
        const curve = w === 'katana' && i > len * 0.6 ? 1 : 0;
        pts.push([curve, -i, steel[0]]);
        if (w === 'sword' || f.k > 1) pts.push([curve + 1, -i, steel[2]]);
      }
      plotRot(hx, hy, ang, pts);
      if (ps === 'strike') {
        // Slash arc.
        for (let i = 0; i < L(9); i++) p(hx + L(4) + Math.round(Math.sin((i / L(9)) * Math.PI) * L(4)), hy - L(7) + i * 1.2, 'rgba(255,255,255,0.75)');
      }
      break;
    }
    case 'spear': {
      const len = L(17);
      const ang = ps === 'idle' ? 10 : ps === 'windup' ? -20 : 90;
      const pts: [number, number, string][] = [...line(len, 0, wood[1], -L(4))];
      pts.push([0, -len, steel[0]], [0, -len - 1, steel[0]], [-1, -len + 1, steel[1]], [1, -len + 1, steel[2]], [0, -len - 2, steel[1]]);
      pts.push([-1, -len + 3, shade(acc, 2)], [1, -len + 3, shade(acc, 2)]);
      plotRot(hx, hy, ang, pts);
      break;
    }
    case 'staff': {
      const len = L(16);
      const ang = ps === 'idle' ? 0 : ps === 'windup' ? -25 : 40;
      plotRot(hx, hy, ang, line(len, 0, wood[0], -L(4)));
      const a = (ang * Math.PI) / 180;
      const tx = hx + Math.round(Math.sin(a) * len);
      const ty = hy - Math.round(Math.cos(a) * len);
      const orb = f.look.accent === 'gold' ? 'teal' : f.look.accent;
      ell(tx, ty - 1, L(2), L(2), shade(orb, 2));
      p(tx - 1, ty - 2, shade(orb, 3));
      if (ps === 'strike') ell(tx, ty - 1, L(3), L(3), 'rgba(255,255,255,0.35)');
      break;
    }
    case 'bow': {
      // Bow held in front; pulled string on wind-up.
      const h = L(7);
      const bx = hx + 1;
      for (let i = -h; i <= h; i++) {
        const bend = Math.round((1 - (i * i) / (h * h)) * L(2));
        p(bx + bend, hy + i, wood[1]);
        if (Math.abs(i) < h - 1 && f.k > 1) p(bx + bend + 1, hy + i, wood[0]);
      }
      const pull = ps === 'windup' ? L(4) : 0;
      for (let i = -h + 1; i < h; i++) {
        const x = bx - Math.round(pull * (1 - Math.abs(i) / h));
        p(x, hy + i, 'rgba(240,240,255,0.8)');
      }
      if (ps !== 'strike') r(bx - pull - 1, hy, L(7), 1, shade('tan', 3));
      else r(bx + L(4), hy, L(6), 1, 'rgba(255,255,255,0.7)');
      break;
    }
    case 'fan': {
      const open = ps === 'idle' ? 0.8 : 1;
      const rad = L(5);
      const base = ps === 'strike' ? 40 : ps === 'windup' ? -60 : -10;
      for (let i = -3; i <= 3; i++) {
        const ang = base + i * 18 * open;
        const pts: [number, number, string][] = [];
        for (let d = 1; d <= rad; d++) pts.push([0, -d, d === rad ? shade(acc, 3) : i % 2 ? shade(f.look.main, 2) : shade(f.look.main, 3)]);
        plotRot(hx, hy, ang, pts);
      }
      if (ps === 'strike') ell(hx + L(6), hy - L(2), L(2), L(3), 'rgba(200,255,240,0.35)');
      break;
    }
    case 'claws': {
      const reach = ps === 'strike' ? L(3) : 0;
      for (let i = 0; i < 3; i++) r(hx + 1 + reach, hy - 1 + i, L(3), 1, steel[0]);
      if (ps === 'strike') for (let i = 0; i < 3; i++) r(hx + L(5), hy - L(4) + i * L(3), L(4), 1, 'rgba(255,255,255,0.7)');
      break;
    }
    case 'daggers': {
      const ang = ps === 'idle' ? 70 : ps === 'windup' ? -40 : 110;
      plotRot(hx, hy, ang, [[0, 1, shade('ink', 2)], [0, -1, steel[1]], ...line(L(5), 0, steel[0], 2)]);
      break;
    }
    case 'shield': {
      const sx = hx + (ps === 'strike' ? L(2) : 0);
      const w2 = L(3);
      const h2 = L(5);
      r(sx - w2 + 1, hy - h2, w2 * 2, h2 * 2, shade(f.look.main, 1));
      r(sx - w2 + 2, hy - h2 + 1, w2 * 2 - 2, h2 * 2 - 2, shade(f.look.main, 2));
      r(sx - 1, hy - h2 + 2, 2, h2 * 2 - 4, shade(acc, 2));
      r(sx - w2 + 2, hy - 1, w2 * 2 - 2, 2, shade(acc, 2));
      p(sx - w2 + 2, hy - h2 + 1, shade(f.look.main, 3));
      break;
    }
    case 'orb': {
      const lift = f.frame === 1 ? 1 : 0;
      const ox = hx + (ps === 'strike' ? L(4) : L(1));
      const oy = hy - L(3) - lift - (ps === 'windup' ? L(3) : 0);
      const ramp = f.look.accent === 'gold' ? 'gold' : f.look.accent;
      ell(ox, oy, L(3), L(3), 'rgba(255,255,255,0.18)');
      ell(ox, oy, L(2), L(2), shade(ramp, 2));
      p(ox - 1, oy - 1, shade(ramp, 3));
      p(ox, oy - 1, '#ffffff');
      break;
    }
    case 'axe': {
      const len = L(11);
      const ang = ps === 'idle' ? 25 : ps === 'windup' ? -55 : 105;
      const pts: [number, number, string][] = [...line(len, 0, wood[1], -L(2))];
      for (let i = 0; i < L(5); i++) for (let j = 1; j <= L(4) - Math.floor(Math.abs(i - L(2.5)) / 2); j++) pts.push([j, -len + i, j === 1 ? steel[2] : steel[j === L(4) ? 0 : 1]]);
      plotRot(hx, hy, ang, pts);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------ extras behind the body

function tail(f: F, x: number, y: number, ramp: string): void {
  const sway = f.frame === 1 ? 1 : f.frame === 3 ? -1 : 0;
  const n = K(f, 7);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const tx = x - Math.round(t * K(f, 6)) - (i > n / 2 ? sway : 0);
    const ty = y - Math.round(Math.sin(t * Math.PI * 0.9) * K(f, 7));
    const rad = Math.max(1, Math.round(K(f, 2.2) * (1 - t * 0.3)));
    ell(tx, ty, rad, rad, shade(ramp, i < n - 2 ? 1 : 3));
    p(tx, ty - rad + 1, shade(ramp, 2));
  }
}

function wings(f: F, x: number, y: number, ramp: string): void {
  const flap = f.frame === 1 ? 1 : f.frame === 2 ? -2 : f.frame === 3 ? 2 : 0;
  const len = K(f, 9);
  for (let i = 0; i < len; i++) {
    const fx = x - i;
    const top = y - K(f, 6) + Math.round(i * 0.35) + Math.round((flap * i) / len);
    const h = Math.max(2, K(f, 9) - i);
    r(fx, top, 1, h, shade(ramp, i % 3 === 0 ? 0 : 1));
    p(fx, top, shade(ramp, 2));
    if (i % 3 === 1) p(fx, top + h - 1, shade(ramp, 0));
  }
}

function cape(f: F, x: number, top: number, bottom: number): void {
  const wave = f.frame === 1 || f.frame === 3 ? 1 : 0;
  const ramp = f.look.accent === 'gold' ? f.look.main : f.look.accent;
  for (let y = top; y < bottom; y++) {
    const spread = Math.round(((y - top) / (bottom - top)) * K(f, 3)) + (y > bottom - 3 ? wave : 0);
    r(x - spread - K(f, 3), y, K(f, 4) + spread, 1, shade(ramp, y % 4 === 0 ? 0 : 1));
  }
}

function aura(f: F): void {
  const ramp = f.look.accent;
  const pts = [
    [4, 8],
    [27, 6],
    [2, 20],
    [29, 17],
    [8, 3],
    [24, 26],
  ];
  pts.forEach(([x, y], i) => {
    if ((i + f.frame) % 3 === 0) return;
    const px2 = f.ox + Math.round(x * f.k);
    const py2 = f.oy + Math.round(y * f.k) - (f.frame % 2);
    p(px2, py2, shade(ramp, 3));
    if (i % 2 === 0) {
      p(px2 - 1, py2, 'rgba(255,255,255,0.5)');
      p(px2 + 1, py2, 'rgba(255,255,255,0.5)');
    }
  });
}

// ------------------------------------------------------------ heads

interface Head {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A chibi head facing right: face, eyes and hair. */
function head(f: F, hd: Head, opts: { snout?: boolean; beak?: boolean } = {}): void {
  const L = (n: number) => K(f, n);
  const { x, y, w, h } = hd;
  const skin = f.look.skin;
  const style = f.look.hairStyle ?? 'short';
  const hair = f.look.hair === 'none' ? skin : f.look.hair;
  // Long hair falls behind the head and shoulders.
  if (style === 'long' || style === 'twin' || style === 'mane') {
    const hl = style === 'mane' ? L(3) : 0;
    r(x - 1 - hl, y + 1, L(5) + hl, h + L(style === 'long' ? 7 : 3), shade(hair, 1));
    r(x - hl, y + 2, L(2), h + L(style === 'long' ? 6 : 2), shade(hair, 0));
  }
  if (style === 'mane') ell(x + w / 2 - 1, y + h / 2, w / 2 + L(3), h / 2 + L(2), shade(hair, 1));
  if (style === 'ponytail') {
    const sway = f.frame === 1 ? 1 : f.frame === 3 ? -1 : 0;
    for (let i = 0; i < L(7); i++) r(x - L(2) - Math.round(i * 0.6), y + L(2) + i, L(2), 1, shade(hair, i % 3 === 0 ? 0 : 1));
    p(x - L(2) - Math.round(L(7) * 0.6) + sway, y + L(2) + L(7), shade(hair, 1));
  }
  if (style === 'twin') {
    for (const side of [-1, 1]) {
      const tx = side < 0 ? x - L(2) : x + w;
      r(tx, y + L(3), L(2), h, shade(hair, 1));
      p(tx, y + L(3), shade(hair, 2));
    }
  }
  if (style === 'bun') {
    ell(x + L(2), y - L(1), L(2), L(2), shade(hair, 1));
    p(x + L(1), y - L(2), shade(hair, 2));
  }
  // Face (rounded rectangle) with shading.
  r(x + 1, y, w - 2, h, shade(skin, 2));
  r(x, y + 1, w, h - 2, shade(skin, 2));
  r(x + w - L(2), y + 1, L(2), h - 2, shade(skin, 1));
  r(x + 1, y + h - 1, w - 2, 1, shade(skin, 1));
  r(x + 1, y + 1, 1, h - 3, shade(skin, 3));
  // Snout or beak toward the facing side.
  if (opts.snout) {
    r(x + w - 1, y + h - L(4), L(3), L(3), shade(skin, 3));
    p(x + w + L(3) - 2, y + h - L(4), OUTLINE);
  }
  if (opts.beak) {
    r(x + w - 1, y + h - L(4), L(4), L(2), shade('gold', 2));
    r(x + w - 1, y + h - L(2), L(3), 1, shade('gold', 1));
  }
  // Eyes (big anime eyes facing right).
  const ey = y + Math.round(h * 0.45);
  const eh = L(2) + (f.k > 1 ? 1 : 0);
  const e1 = x + Math.round(w * 0.45);
  const e2 = x + Math.round(w * 0.8);
  const shut = f.frame === 4;
  for (const ex of [e1, e2]) {
    if (shut) {
      r(ex, ey + 1, L(1.5), 1, OUTLINE);
      continue;
    }
    r(ex, ey, L(1.5), eh, OUTLINE);
    p(ex, ey, f.k > 1 ? '#ffffff' : OUTLINE);
    if (f.k > 1) p(ex, ey + eh - 1, shade(f.look.accent === 'gold' ? f.look.main : f.look.accent, 2));
  }
  // Blush and mouth.
  if (!opts.snout && !opts.beak) {
    p(e2 - 1, ey + eh + 1, shade('pink', 2));
    p(x + Math.round(w * 0.65), y + h - L(2), shade(skin, 0));
  }
  // Hair on top: cap, fringe, and side lock at the back.
  if (style !== 'none' && f.look.hair !== 'none') {
    const top = style === 'spiky' ? L(2) : 1;
    r(x, y - top, w, L(3) + top, shade(hair, 1));
    r(x + 1, y - top, w - 2, L(2), shade(hair, 2));
    p(x + L(2), y - top, shade(hair, 3));
    p(x + L(3), y - top, shade(hair, 3));
    // Fringe: jagged bangs over the forehead.
    for (let i = 0; i < w; i += 2) r(x + i, y + L(3), 1, (i / 2) % 2 ? L(1) : L(2), shade(hair, 1));
    // Side hair at the back of the head.
    r(x - 1, y, L(3), h - L(2), shade(hair, 1));
    r(x - 1, y + 1, 1, h - L(3), shade(hair, 0));
    if (style === 'spiky') {
      for (let i = 0; i < 4; i++) {
        const sx = x + Math.round((i / 3) * (w - 2));
        r(sx, y - top - L(2) + (i % 2), L(1.5), L(2), shade(hair, i % 2 ? 1 : 2));
      }
      r(x - L(2), y + 1, L(2), L(2), shade(hair, 1));
    }
    if (style === 'short' && f.look.body !== 'beast') p(x + w - 1, y + L(3), shade(hair, 1));
  }
  if (style === 'hood') {
    const ramp = f.look.main;
    r(x - 1, y - 2, w + 2, L(4), shade(ramp, 1));
    r(x - 1, y, L(3), h, shade(ramp, 1));
    r(x, y - 2, w, 1, shade(ramp, 2));
  }
}

function hat(f: F, hd: Head): void {
  const L = (n: number) => K(f, n);
  const { x, y, w } = hd;
  const t = f.look.hat ?? 'none';
  const mid = x + Math.floor(w / 2);
  switch (t) {
    case 'kasa': {
      const half = Math.floor(w / 2) + L(4);
      for (let i = 0; i < L(4); i++) {
        const hw = Math.round(half * ((i + 1) / L(4)));
        r(mid - hw, y - L(4) + i, hw * 2, 1, shade('gold', i === L(4) - 1 ? 1 : 2));
      }
      p(mid, y - L(4) - 1, shade('gold', 3));
      r(mid - half, y, half * 2, 1, shade('tan', 1));
      break;
    }
    case 'crown': {
      const cw = Math.max(5, w - L(4));
      const cx2 = mid - Math.floor(cw / 2);
      r(cx2, y - L(3), cw, L(2), shade('gold', 2));
      for (let i = 0; i < cw; i += 2) p(cx2 + i, y - L(4), shade('gold', 3));
      p(mid, y - L(3), shade(f.look.accent === 'gold' ? 'red' : f.look.accent, 2));
      break;
    }
    case 'horns': {
      for (const [hx, dir] of [
        [x + L(2), -1],
        [x + w - L(3), 1],
      ] as const) {
        for (let i = 0; i < L(4); i++) r(hx + Math.round(dir * i * 0.4), y - 1 - i, i < L(2) ? L(2) : 1, 1, shade('gold', i === L(4) - 1 ? 3 : 2));
      }
      break;
    }
    case 'halo': {
      const bobH = f.frame === 1 ? 1 : 0;
      const hy = y - L(4) - bobH;
      const hw = Math.floor(w / 2);
      r(mid - hw + 1, hy, hw * 2 - 2, 1, shade('gold', 3));
      r(mid - hw + 1, hy + 2, hw * 2 - 2, 1, shade('gold', 2));
      p(mid - hw, hy + 1, shade('gold', 2));
      p(mid + hw - 1, hy + 1, shade('gold', 2));
      break;
    }
    case 'ears': {
      const ramp = f.look.hair === 'none' ? f.look.skin : f.look.hair;
      for (const ex of [x + L(1), x + w - L(4)]) {
        for (let i = 0; i < L(4); i++) r(ex + Math.floor(i / 2), y - i, L(3) - Math.floor(i / 1.5), 1, shade(ramp, i === 0 ? 1 : 2));
        p(ex + 1, y - 1, shade('pink', 2));
      }
      break;
    }
    case 'mask': {
      if (f.look.body === 'bird') {
        // A tengu mask: red with a long nose.
        r(x + L(3), y + L(3), w - L(3), L(4), shade('red', 2));
        r(x + w - 1, y + L(4), L(4), L(2), shade('red', 2));
        p(x + w + L(3) - 1, y + L(4), shade('red', 3));
        r(x + Math.round(w * 0.5), y + L(4), L(1.5), 1, OUTLINE);
        break;
      }
      // A kitsune mask worn on the side of the head.
      r(x - 1, y - 1, L(4), L(5), shade('steel', 3));
      p(x, y + L(1), shade('red', 2));
      p(x + L(2), y + L(1), shade('red', 2));
      r(x, y + L(3), L(2), 1, shade('red', 2));
      p(x - 1, y - 2, shade('steel', 3));
      break;
    }
    case 'helm': {
      const ramp = f.look.main;
      r(x - 1, y - L(2), w + 2, L(4), shade(ramp, 1));
      r(x, y - L(2), w, L(1), shade(ramp, 2));
      r(x - 1, y + L(2), L(3), L(4), shade(ramp, 0));
      // Kuwagata crest.
      for (let i = 0; i < L(4); i++) {
        p(mid - 1 - Math.round(i * 0.7), y - L(2) - i, shade('gold', 3));
        p(mid + 1 + Math.round(i * 0.7), y - L(2) - i, shade('gold', 2));
      }
      break;
    }
    case 'antlers': {
      for (const [ax, dir] of [
        [x + L(2), -1],
        [x + w - L(3), 1],
      ] as const) {
        for (let i = 0; i < L(6); i++) p(ax + Math.round(dir * i * 0.5), y - 1 - i, shade('tan', 3));
        p(ax + dir * L(2), y - L(3), shade('tan', 3));
        p(ax + dir * L(3), y - L(4), shade('tan', 3));
      }
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------ bodies

/** Bipeds: robe, armour, light clothing, oni, tengu and animal-folk. */
function biped(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const bulky = lk.body === 'oni' || lk.body === 'golem' || f.big;
  const tw = L(bulky ? 12 : 10) + (f.big && lk.body !== 'oni' ? 0 : 0);
  const th = L(lk.body === 'robe' ? 8 : 7);
  const legH = L(4);
  const torsoTop = f.base - legH - th + f.bob;
  const tl = f.cx - Math.floor(tw / 2);
  const hw = L(bulky ? 11 : 10);
  const hh = L(9);
  const hd: Head = { x: f.cx - Math.floor(hw / 2) + 1, y: torsoTop - hh + 1, w: hw, h: hh };
  const isAnimal = lk.body === 'beast';
  const ps = pose(f.frame);

  // Behind the body.
  if (lk.extra === 'cape') cape(f, tl + 1, torsoTop + 1, f.base - 1);
  if (lk.extra === 'wings') wings(f, tl + 1, torsoTop + L(2), lk.accent === 'gold' ? lk.main : lk.main);
  if (lk.extra === 'tail') tail(f, tl, f.base - legH, isAnimal ? lk.skin : lk.hair);
  if (lk.extra === 'scarf') {
    const wave = f.frame % 2;
    for (let i = 0; i < L(6); i++) r(tl - i, torsoTop + 1 + Math.round(i * 0.3) + ((i + wave) % 2), 1, L(2), shade(lk.accent === 'gold' ? 'red' : lk.accent, i % 2 ? 1 : 2));
  }

  // Back arm.
  const aw = L(bulky ? 3 : 2);
  const ah = L(6);
  r(tl - aw + 1, torsoTop + 1, aw, ah, shade(lk.body === 'oni' ? lk.skin : lk.main, 0));
  r(tl - aw + 1, torsoTop + ah, aw, L(2), shade(lk.skin, 1));

  // Legs and feet.
  const legW = L(bulky ? 4 : 3);
  const stride = ps === 'strike' ? L(2) : 0;
  const legRamp = lk.body === 'oni' ? lk.skin : lk.body === 'armor' ? lk.main : lk.body === 'beast' ? lk.skin : 'ink';
  for (const [lx, back] of [
    [f.cx - legW - 1 - stride, true],
    [f.cx + 1 + stride, false],
  ] as const) {
    r(lx, f.base - legH, legW, legH, shade(legRamp, back ? 0 : 1));
    r(lx, f.base - 1, legW + 1, 1, shade(lk.body === 'armor' ? lk.accent : 'ink', back ? 1 : 2));
  }

  // Torso by body type.
  const main = lk.main;
  const acc = lk.accent;
  if (lk.body === 'robe') {
    // A robe flaring to the feet, with a sash.
    for (let y = 0; y < th + legH - 1; y++) {
      const flare = Math.round((y / (th + legH)) * L(2));
      r(tl - flare, torsoTop + y, tw + flare * 2, 1, shade(main, 1));
      r(tl - flare + 1, torsoTop + y, Math.round((tw + flare * 2) * 0.55), 1, shade(main, 2));
    }
    r(tl, torsoTop + L(4), tw, L(2), shade(acc, 2));
    r(tl, torsoTop + L(4) + L(2) - 1, tw, 1, shade(acc, 1));
    // Crossed collar.
    for (let i = 0; i < L(3); i++) {
      p(f.cx - 1 + i, torsoTop + i, shade(lk.skin, 2));
      p(f.cx + 1 + i, torsoTop + i, shade('steel', 3));
    }
    r(tl + 1, torsoTop + L(6), 1, th + legH - L(7), shade(main, 3));
  } else if (lk.body === 'oni') {
    // Bare, muscular torso with a tiger-striped loincloth.
    r(tl, torsoTop, tw, th, shade(lk.skin, 2));
    r(tl + tw - L(3), torsoTop, L(3), th, shade(lk.skin, 1));
    r(f.cx, torsoTop + L(2), 1, L(3), shade(lk.skin, 1));
    r(tl + L(2), torsoTop + L(2), L(3), 1, shade(lk.skin, 1));
    r(f.cx + L(2), torsoTop + L(2), L(3), 1, shade(lk.skin, 1));
    r(tl, torsoTop + th - L(2), tw, L(3), shade(main === 'ink' ? 'gold' : main, 2));
    for (let i = 0; i < tw; i += L(3)) r(tl + i, torsoTop + th - L(2), 1, L(3), OUTLINE);
    r(tl, torsoTop + th - L(3), tw, 1, shade(acc, 2));
  } else if (lk.body === 'armor' || lk.body === 'golem') {
    // Lamellar armour: plates, pauldrons and tassets.
    r(tl, torsoTop, tw, th, shade(main, 1));
    r(tl + 1, torsoTop, tw - L(3), th - 1, shade(main, 2));
    for (let y = torsoTop + L(2); y < torsoTop + th; y += L(2)) r(tl + 1, y, tw - 2, 1, shade(main, 0));
    r(tl, torsoTop + th - L(2), tw, L(1), shade(acc, 2));
    // Tassets over the thighs.
    r(tl - 1, torsoTop + th - 1, tw + 2, L(3), shade(main, 1));
    for (let i = 0; i < tw + 2; i += L(3)) r(tl - 1 + i, torsoTop + th - 1, 1, L(3), shade(main, 0));
    // Pauldrons.
    r(tl - L(2), torsoTop - 1, L(4), L(3), shade(acc, 2));
    r(tl + tw - L(2), torsoTop - 1, L(4), L(3), shade(acc, 1));
    p(tl - L(2), torsoTop - 1, shade(acc, 3));
  } else {
    // Light clothing: tunic, belt; tengu and animal-folk get feathers or fur.
    r(tl, torsoTop, tw, th, shade(main, 1));
    r(tl + 1, torsoTop, Math.round(tw * 0.6), th - 1, shade(main, 2));
    r(tl, torsoTop + th - L(3), tw, L(1), shade(acc, 2));
    p(f.cx, torsoTop + th - L(3), shade('gold', 3));
    r(tl - 1, torsoTop + th - L(2), tw + 2, L(2), shade(main, 0));
    if (lk.body === 'bird') for (let i = 0; i < tw + 2; i += 2) p(tl - 1 + i, torsoTop + th, shade(main, 1));
    if (isAnimal) r(f.cx - 1, torsoTop + 1, L(3), th - L(3), shade(lk.skin, 3));
  }

  // Head.
  head(f, hd, { snout: isAnimal, beak: lk.body === 'bird' && lk.hat !== 'mask' });
  hat(f, hd);

  // Front arm and weapon.
  const shoulderX = tl + tw - 1;
  const shoulderY = torsoTop + 1;
  let hx = shoulderX + 1;
  let hy = shoulderY + ah - 1;
  const armRamp = lk.body === 'oni' ? lk.skin : main;
  if (ps === 'windup') {
    hx = shoulderX - L(1);
    hy = shoulderY - L(1);
    r(shoulderX - L(1), hy, aw, ah, shade(armRamp, 1));
  } else if (ps === 'strike') {
    hx = shoulderX + ah;
    hy = shoulderY + L(2);
    r(shoulderX, hy - 1, ah, aw, shade(armRamp, 1));
  } else {
    r(shoulderX, shoulderY, aw, ah, shade(armRamp, 1));
    r(shoulderX, shoulderY, 1, ah - 1, shade(armRamp, 2));
  }
  if (lk.weapon === 'shield') {
    weapon(f, f.cx + L(4), torsoTop + L(4));
  } else weapon(f, hx, hy);
  r(hx - 1, hy - 1, L(2), L(2), shade(lk.skin, 2));
  if (lk.weapon === 'daggers') weapon({ ...f, frame: f.frame === 3 ? 2 : f.frame }, tl - 1, torsoTop + ah);
}

/** Four-legged spirit beasts. */
function quadruped(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const ps = pose(f.frame);
  const pounce = ps === 'strike' ? L(3) : ps === 'windup' ? -L(1) : 0;
  const rx = L(f.big ? 9 : 7);
  const ry = L(f.big ? 5 : 4);
  const legH = L(4);
  const bodyCy = f.base - legH - ry + 1 + f.bob - (ps === 'strike' ? L(1) : 0);
  const bx = f.cx - L(2) + pounce;
  const fur = lk.main;
  // Tail.
  if (lk.extra === 'tail') tail(f, bx - rx + 1, bodyCy, lk.hair === 'none' ? fur : lk.hair);
  // Far legs.
  r(bx - rx + L(2), bodyCy + 1, L(2), legH + ry - 1 - 0, shade(fur, 0));
  r(bx + rx - L(4), bodyCy + 1 - (ps === 'strike' ? L(2) : 0), L(2), legH + ry - 1, shade(fur, 0));
  // Body.
  ellShaded(bx, bodyCy, rx, ry, fur);
  r(bx - rx + L(3), bodyCy + ry - L(2), rx * 2 - L(6), L(2), shade(lk.skin === fur ? 'steel' : lk.skin, 3));
  // Stripes or spots in the accent colour.
  for (let i = 0; i < 3; i++) r(bx - L(3) + i * L(3), bodyCy - ry + 1, 1, L(3), shade(lk.accent, 1));
  // Near legs with paws.
  for (const lx of [bx - rx + L(4), bx + rx - L(2)]) {
    const lift = lx > bx && ps === 'strike' ? L(2) : 0;
    r(lx, bodyCy + ry - 2 - lift, L(2), legH + 2, shade(fur, 1));
    r(lx, f.base - 1 - lift, L(3), 1, shade(fur, 0));
  }
  // Mane.
  const hx = bx + rx - L(1);
  const hy = bodyCy - ry - L(1);
  if (lk.hairStyle === 'mane') ellShaded(hx - L(1), hy + L(2), L(5), L(5), lk.hair === 'none' ? fur : lk.hair);
  // Head.
  const hr = L(f.big ? 5 : 4);
  ellShaded(hx, hy, hr, hr - 1, fur);
  // Snout.
  r(hx + hr - L(1), hy, L(3), L(3), shade(lk.skin === fur ? fur : lk.skin, 3));
  p(hx + hr + L(2) - 1, hy, OUTLINE);
  if (ps === 'strike') {
    r(hx + hr - L(1), hy + L(3), L(3), 1, OUTLINE);
    p(hx + hr, hy + L(3), '#ffffff');
  }
  // Eye.
  r(hx + L(1), hy - L(2), L(1.5), L(2), f.frame === 4 ? shade(fur, 1) : OUTLINE);
  p(hx + L(1), hy - L(2), shade(lk.accent, 3));
  const hd: Head = { x: hx - hr, y: hy - hr + 1, w: hr * 2, h: hr * 2 };
  hat(f, hd);
  if (lk.weapon === 'claws' && ps === 'strike') weapon(f, hx + hr + L(1), hy + L(2));
}

/** Floating flame spirits. */
function spirit(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const float = f.frame === 1 ? -1 : 0;
  const lunge = pose(f.frame) === 'strike' ? L(3) : 0;
  const cx = f.cx + lunge;
  const cy = f.base - L(9) + float;
  const rad = L(f.big ? 8 : 6);
  // Flame tongues rising from the body.
  for (let i = 0; i < 3; i++) {
    const fx = cx - rad + L(2) + i * L(4);
    const h = L(5) + ((i + f.frame) % 2) * L(2);
    for (let y = 0; y < h; y++) r(fx + Math.round(Math.sin(y * 0.8 + f.frame) * 0.8), cy - rad + 2 - y, Math.max(1, L(3) - Math.floor((y * 2) / h)), 1, shade(lk.main, y > h * 0.6 ? 3 : 2));
  }
  ellShaded(cx, cy, rad, rad, lk.main);
  ell(cx, cy + 1, rad - L(3), rad - L(3), shade(lk.accent === 'steel' ? lk.main : lk.accent, 3));
  // Wispy tail below.
  for (let i = 0; i < L(4); i++) r(cx - L(2) + Math.round(Math.sin(i + f.frame) * 1), cy + rad + i, L(4) - i, 1, shade(lk.main, 1));
  // Face.
  const ey = cy - L(1);
  for (const ex of [cx - L(2), cx + L(2)]) r(ex, ey, L(1.5), L(2), f.frame === 4 ? shade(lk.main, 1) : OUTLINE);
  p(cx, cy + L(2), OUTLINE);
  hat(f, { x: cx - rad + 1, y: cy - rad, w: rad * 2 - 1, h: rad * 2 });
}

/** Coiled serpents, nagas and the many-headed Orochi. */
function serpent(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const coilY = f.base - L(3);
  const scales = lk.main;
  // Coils.
  ellShaded(f.cx - L(3), coilY, L(8), L(3), scales);
  ellShaded(f.cx + L(2), coilY - L(4), L(6), L(3), scales);
  for (let i = -L(6); i < L(6); i += L(3)) p(f.cx - L(3) + i, coilY - 1, shade(lk.accent, 2));
  if (lk.skin === 'skin') {
    // A naga: humanoid upper body on the coils.
    const top = coilY - L(4) - L(8) + f.bob;
    const tw = L(9);
    const tl = f.cx - Math.floor(tw / 2) + L(2);
    if (lk.extra === 'aura') aura(f);
    r(tl, top, tw, L(8), shade(scales, 2));
    r(tl + tw - L(2), top, L(2), L(8), shade(scales, 1));
    r(tl, top + L(3), tw, L(1), shade(lk.accent, 2));
    const hw = L(10);
    const hd: Head = { x: tl - L(1), y: top - L(9) + 1, w: hw, h: L(9) };
    head(f, hd);
    hat(f, hd);
    weapon(f, tl + tw + 1, top + L(5));
    return;
  }
  const heads = f.big ? 3 : 1;
  for (let h = 0; h < heads; h++) {
    const off = (h - (heads - 1) / 2) * L(6);
    const strike = pose(f.frame) === 'strike' && h === Math.floor(heads / 2) ? L(3) : 0;
    const nx = f.cx + L(4) + off + strike;
    const ny = coilY - L(10) - Math.abs(off) / 3 + (f.frame === 1 ? 1 : 0);
    // Neck.
    for (let i = 0; i < L(8); i++) r(nx - L(1) - Math.round(i * 0.3), ny + L(2) + i, L(3), 1, shade(scales, i % 3 ? 1 : 2));
    // Head.
    ellShaded(nx, ny, L(3), L(2) + 1, scales);
    r(nx + L(2), ny, L(3), L(2), shade(scales, 2));
    p(nx + L(1), ny - 1, f.frame === 4 ? shade(scales, 1) : shade(lk.accent, 3));
    if (pose(f.frame) === 'strike') {
      p(nx + L(4), ny + L(2), '#ffffff');
      r(nx + L(5), ny + 1, L(2), 1, shade('red', 2));
    }
    hat(f, { x: nx - L(3), y: ny - L(2), w: L(6), h: L(4) });
  }
}

/** Jelly-like slimes. */
function slime(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const squash = f.frame === 1 ? 1 : f.frame === 2 ? -1 : 0;
  const lunge = pose(f.frame) === 'strike' ? L(3) : 0;
  const rx = L(f.big ? 9 : 7) + squash;
  const ry = L(f.big ? 7 : 5) - squash;
  const cy = f.base - ry - 1;
  ellShaded(f.cx + lunge, cy, rx, ry, lk.main);
  r(f.cx + lunge - rx + 1, f.base - 2, rx * 2 - 1, 1, shade(lk.main, 0));
  p(f.cx + lunge - Math.floor(rx / 2), cy - ry + 2, '#ffffff');
  for (const ex of [f.cx + lunge, f.cx + lunge + L(3)]) r(ex, cy - L(1), L(1.5), L(2), OUTLINE);
  r(f.cx + lunge + L(1), cy + L(2), L(2), 1, shade(lk.accent, 1));
}

/** Stone golems and statues. */
function golem(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const ps = pose(f.frame);
  const tw = L(f.big ? 15 : 12);
  const th = L(f.big ? 11 : 9);
  const legH = L(4);
  const top = f.base - legH - th + f.bob;
  const tl = f.cx - Math.floor(tw / 2);
  const stone = lk.main;
  // Back fist.
  r(tl - L(3), top + L(3), L(4), L(5), shade(stone, 0));
  // Legs.
  r(f.cx - L(5), f.base - legH, L(4), legH, shade(stone, 0));
  r(f.cx + L(1), f.base - legH, L(4), legH, shade(stone, 1));
  // Body blocks with cracks.
  r(tl, top, tw, th, shade(stone, 1));
  r(tl + 1, top, tw - L(4), th - L(2), shade(stone, 2));
  r(tl + L(2), top + L(2), L(3), L(2), shade(stone, 3));
  p(f.cx + L(2), top + L(4), shade(stone, 0));
  p(f.cx + L(3), top + L(5), shade(stone, 0));
  // Glowing rune.
  r(f.cx - 1, top + L(4), L(2), L(3), shade(lk.accent, 3));
  // Head block.
  const hw = L(f.big ? 9 : 8);
  const hh = L(6);
  const hx = f.cx - Math.floor(hw / 2) + L(1);
  const hy = top - hh + 1;
  r(hx, hy, hw, hh, shade(stone, 1));
  r(hx + 1, hy, hw - L(3), hh - 1, shade(stone, 2));
  r(hx + Math.round(hw * 0.45), hy + L(2), L(1.5), L(2), shade(lk.accent, 3));
  r(hx + Math.round(hw * 0.8), hy + L(2), L(1.5), L(2), shade(lk.accent, 3));
  hat(f, { x: hx, y: hy, w: hw, h: hh });
  // Front fist.
  const fx = tl + tw - L(1) + (ps === 'strike' ? L(4) : ps === 'windup' ? -L(2) : 0);
  const fy = top + L(3) - (ps === 'windup' ? L(3) : 0);
  r(fx, fy, L(5), L(5), shade(stone, 1));
  r(fx + 1, fy, L(3), L(2), shade(stone, 3));
  if (lk.weapon && lk.weapon !== 'none') weapon(f, fx + L(2), fy);
  if (ps === 'strike') for (let i = 0; i < 3; i++) p(fx + L(6) + i, fy + L(1) + i * 2, 'rgba(255,255,255,0.8)');
}

/** True birds (cranes, phoenixes): long neck, folded wings. */
function bird(f: F): void {
  const L = (n: number) => K(f, n);
  const lk = f.look;
  const ps = pose(f.frame);
  const body = lk.main;
  const cy = f.base - L(8) + f.bob;
  const lunge = ps === 'strike' ? L(3) : 0;
  // Legs.
  r(f.cx - L(1), cy + L(3), 1, f.base - cy - L(3), shade('gold', 1));
  r(f.cx + L(2), cy + L(3), 1, f.base - cy - L(3), shade('gold', 2));
  // Tail feathers.
  for (let i = 0; i < L(6); i++) r(f.cx - L(6) - i, cy - L(1) + Math.round(i * 0.5), L(2), 1, shade(lk.accent, i % 2 ? 2 : 3));
  // Body.
  ellShaded(f.cx, cy, L(6), L(4), body);
  // Wing.
  const flap = f.frame === 2 ? -L(4) : f.frame === 1 ? -1 : 0;
  for (let i = 0; i < L(7); i++) r(f.cx - L(4) + i, cy - L(2) + flap + Math.round(i * 0.3), 1, L(4) - Math.floor(i / 3), shade(body, i % 2 ? 0 : 1));
  // Neck and head.
  const nx = f.cx + L(4) + lunge;
  const ny = cy - L(8);
  for (let i = 0; i < L(7); i++) r(nx - Math.round(i * 0.4), ny + L(2) + i, L(2), 1, shade(body, 2));
  ellShaded(nx, ny, L(3), L(2) + 1, body);
  r(nx + L(2), ny, L(4), L(1), shade('gold', 2));
  r(nx + L(2), ny + 1, L(3), 1, shade('gold', 1));
  p(nx + L(1), ny - 1, f.frame === 4 ? shade(body, 1) : OUTLINE);
  // Crest.
  p(nx - L(1), ny - L(3), shade(lk.accent, 3));
  p(nx - L(2), ny - L(4), shade(lk.accent, 3));
  hat(f, { x: nx - L(3), y: ny - L(2), w: L(6), h: L(4) });
  if (ps === 'strike') for (let i = 0; i < 4; i++) p(nx + L(6) + i, ny + i - 1, 'rgba(255,240,200,0.8)');
}

// ------------------------------------------------------------ outline & glow

function outlineRegion(ox: number, oy: number, w: number, h: number, color: string, alphaMin = 1): void {
  const img = C.getImageData(ox, oy, w, h);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  C.fillStyle = color;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (a(x, y) < alphaMin && (a(x - 1, y) >= alphaMin || a(x + 1, y) >= alphaMin || a(x, y - 1) >= alphaMin || a(x, y + 1) >= alphaMin)) C.fillRect(ox + x, oy + y, 1, 1);
}

function flattenRegion(ox: number, oy: number, w: number, h: number, color: string): void {
  const img = C.getImageData(ox, oy, w, h);
  const n = parseInt(color.slice(1), 16);
  for (let i = 0; i < img.data.length; i += 4)
    if (img.data[i + 3] > 0) {
      img.data[i] = (n >> 16) & 255;
      img.data[i + 1] = (n >> 8) & 255;
      img.data[i + 2] = n & 255;
      img.data[i + 3] = 255;
    }
  C.putImageData(img, ox, oy);
}

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ------------------------------------------------------------ entry point

/**
 * Draws one animation frame into a size×size cell at (ox, oy).
 * `glow` is the rarity colour (drawn as a soft outer outline), `boss` adds a
 * red ground mark, `flat` paints the whole sprite one colour (silhouettes).
 */
export function drawUnitFrame(ctx: Ctx, ox: number, oy: number, size: number, look: SpriteLook, frame: number, glow: string, boss: boolean, flat?: string): void {
  C = ctx;
  const k = size / 32;
  const f: F = {
    ox,
    oy,
    S: size,
    k,
    look,
    frame,
    big: !!look.big,
    base: oy + size - 3,
    cx: ox + Math.floor(size / 2) - 1 + (frame === 3 ? Math.round(2 * k) : frame === 2 ? -1 : 0),
    bob: frame === 1 ? 1 : 0,
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, size, size);
  ctx.clip();
  // Ground shadow.
  if (!flat) ell(ox + size / 2 - 1, f.base, Math.round(8 * k), Math.max(1, Math.round(1.5 * k)), 'rgba(7,5,11,0.35)');
  const shadowData = flat ? null : ctx.getImageData(ox, oy, size, size);
  if (shadowData) ctx.clearRect(ox, oy, size, size);
  if (look.extra === 'aura' && look.body !== 'serpent') aura(f);
  const quad = look.body === 'beast' && (!look.weapon || look.weapon === 'none' || look.weapon === 'claws');
  if (look.body === 'spirit') spirit(f);
  else if (look.body === 'slime') slime(f);
  else if (look.body === 'golem') golem(f);
  else if (look.body === 'serpent') serpent(f);
  else if (look.body === 'bird' && (!look.weapon || look.weapon === 'none')) bird(f);
  else if (quad) quadruped(f);
  else biped(f);
  outlineRegion(ox, oy, size, size, OUTLINE, 128);
  if (frame === 4) flattenRegion(ox, oy, size, size, '#ffffff');
  if (flat) flattenRegion(ox, oy, size, size, flat);
  else {
    // Rarity glow: a soft outer outline in the rarity colour.
    outlineRegion(ox, oy, size, size, hexAlpha(glow, frame === 4 ? 0.2 : 0.55), 40);
    // Put the ground shadow back underneath.
    if (shadowData) {
      const top = ctx.getImageData(ox, oy, size, size);
      for (let i = 0; i < top.data.length; i += 4) {
        if (top.data[i + 3] === 0 && shadowData.data[i + 3] > 0) {
          top.data[i] = shadowData.data[i];
          top.data[i + 1] = shadowData.data[i + 1];
          top.data[i + 2] = shadowData.data[i + 2];
          top.data[i + 3] = shadowData.data[i + 3];
        }
      }
      ctx.putImageData(top, ox, oy);
    }
    if (boss) {
      r(ox + size / 2 - 9 * k, oy + size - 2, 18 * k, 1, '#ff4a4a');
      r(ox + size / 2 - 6 * k, oy + size - 1, 12 * k, 1, '#b8293b');
    }
  }
  ctx.restore();
}
