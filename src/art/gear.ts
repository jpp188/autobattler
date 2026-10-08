/**
 * Gear: weapons (held at the hand), things worn on the back, off-hand props,
 * neck pieces, chest emblems, and the flowing extras (wings, tails, capes,
 * scarves, celestial ribbons, auras).
 */
import { A, N, hiRes, n, sway, trimR } from './ctx';
import { shade } from './palette';
import { box, ell, glint, light, limb, line, newPart, px, quant, rect, rows } from './raster';

type WP = [number, number, string, number];

/** Plots weapon points (local: y negative runs along the weapon) rotated clockwise by `ang` about the hand. */
function rot(hx: number, hy: number, ang: number, pts: readonly WP[]): void {
  const a = (ang * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  for (const [lx, ly, r, s] of pts) px(hx + Math.round(lx * ca - ly * sa), hy + Math.round(lx * sa + ly * ca), r, s);
}

/** World position of a local weapon point. */
function at(hx: number, hy: number, ang: number, lx: number, ly: number): [number, number] {
  const a = (ang * Math.PI) / 180;
  return [hx + Math.round(lx * Math.cos(a) - ly * Math.sin(a)), hy + Math.round(lx * Math.sin(a) + ly * Math.cos(a))];
}

function slash(hx: number, hy: number, r: number): void {
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI * 0.9 - 0.2;
    const x = hx + Math.round(Math.sin(t) * r);
    const y = hy - Math.round(Math.cos(t) * r);
    glint(x, y, i % 3 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(220,235,255,0.6)');
    if (i > 2 && i < 9) glint(x - 1, y + 1, 'rgba(200,220,255,0.3)');
  }
}

const ANG: Record<string, [number, number, number]> = {
  blade: [58, -55, 100],
  long: [48, -40, 95],
  pole: [10, -22, 82],
  heavy: [40, -62, 108],
  wand: [22, -28, 52],
};

/** Draws the weapon held at hand (hx, hy). Returns true if it drew anything. */
export function weapon(hx: number, hy: number): void {
  const L = A.look;
  const w = L.weapon ?? 'none';
  if (w === 'none') return;
  newPart();
  const ps = A.pose;
  const pi = ps === 'idle' ? 0 : ps === 'windup' ? 1 : 2;
  const tr = trimR();
  const acc = L.accent;
  const big = A.big ? 1 : 0;
  const steel = (i: number) => (i % 5 === 0 ? 5 : 4);
  switch (w) {
    case 'katana':
    case 'nodachi':
    case 'sword': {
      const len = N(w === 'nodachi' ? 17 : w === 'katana' ? 13 : 10) + big;
      const ang = ANG[w === 'nodachi' ? 'long' : 'blade'][pi];
      const pts: WP[] = [];
      for (let i = 1; i <= N(w === 'nodachi' ? 4 : 3); i++) pts.push([0, i, i % 2 ? 'ink' : 'snow', i % 2 ? 1 : 3]);
      pts.push([0, N(w === 'nodachi' ? 4 : 3) + 1, 'gold', 4]);
      pts.push([-1, 0, 'gold', 4], [0, 0, 'gold', 5], [1, 0, 'gold', 2]);
      if (w === 'sword') pts.push([-2, 0, 'gold', 3], [2, 0, 'gold', 2]);
      for (let i = 1; i < len; i++) {
        const curve = w !== 'sword' && i > len * 0.6 ? 1 : 0;
        pts.push([curve, -i, 'steel', i === len - 1 ? 5 : steel(i)]);
        if (w === 'sword' || hiRes() || w === 'nodachi') pts.push([curve - 1, -i, 'steel', i === len - 1 ? 4 : 2]);
      }
      if (w === 'sword') pts.push([0, -len, 'steel', 5]);
      // Tassel on straight swords.
      if (w === 'sword') pts.push([0, N(4) + 1, acc, 4], [-1, N(4) + 2, acc, 3]);
      rot(hx, hy, ang, pts);
      if (ps === 'strike') slash(hx + n(2), hy - n(1), len - n(2));
      break;
    }
    case 'spear':
    case 'lance':
    case 'naginata': {
      const len = N(w === 'naginata' ? 15 : 17) + big;
      const ang = ANG.pole[pi];
      const shaftR = w === 'naginata' ? 'ink' : 'wood';
      const pts: WP[] = [];
      for (let i = -N(5); i < len; i++) {
        pts.push([0, -i, shaftR, i % 4 === 0 ? 2 : 3]);
        if (hiRes()) pts.push([1, -i, shaftR, 1]);
      }
      pts.push([0, N(5), 'gold', 4]);
      if (w === 'naginata') {
        pts.push([0, -len, 'gold', 5], [0, -len - 1, 'gold', 3]);
        const blade: [number, number][] = [
          [0, 2],
          [0, 3],
          [1, 4],
          [1, 5],
          [1, 6],
          [2, 7],
          [2, 8],
        ];
        for (const [bx, by] of blade.slice(0, N(5) + 2)) {
          pts.push([bx, -len - by, 'steel', 5]);
          pts.push([bx - 1, -len - by, 'steel', 3]);
        }
      } else {
        pts.push([0, -len, 'gold', 4]);
        for (let i = 1; i <= N(4); i++) {
          pts.push([0, -len - i, 'steel', i === N(4) ? 5 : 4]);
          if (i < N(3)) pts.push([-1, -len - i, 'steel', 2], [1, -len - i, 'steel', 3]);
        }
        // Red tassel.
        pts.push([-1, -len + 1, 'red', 4], [1, -len + 1, 'red', 3], [-1, -len + 2, 'red', 2], [1, -len + 2, 'red', 2]);
        if (w === 'lance') {
          const fl = tr === 'gold' ? acc : tr;
          const s = sway();
          for (let i = 0; i < N(5); i++) for (let j = 0; j < N(3) - Math.floor(i / 2); j++) pts.push([-1 - i, -len + 3 + j + (i > 2 ? s : 0), fl, j === 0 ? 4 : 3]);
        }
      }
      rot(hx, hy, ang, pts);
      if (ps === 'strike') {
        const [tx, ty] = at(hx, hy, ang, 0, -len - N(4));
        for (let i = 1; i < N(5); i++) glint(tx - i * 2, ty + (i % 2), 'rgba(255,255,255,0.55)');
      }
      break;
    }
    case 'kanabo': {
      const len = N(11) + big;
      const ang = ANG.heavy[pi];
      const pts: WP[] = [];
      for (let i = 1; i <= N(3); i++) pts.push([0, i, 'wood', 2], [1, i, 'wood', 1]);
      for (let i = 0; i < len; i++) {
        const wdt = i < len * 0.3 ? 2 : 3 + (hiRes() ? 1 : 0);
        for (let j = 0; j < wdt; j++) {
          const lx = j - Math.floor(wdt / 2);
          const b = light(lx / wdt + 0.1, -0.2);
          let s = quant(b, 0, 0, { lo: 1, hi: 4 });
          if ((i + j) % 3 === 0 && i > len * 0.3) s = 5;
          pts.push([lx, -i, 'steel', s]);
        }
      }
      pts.push([0, -len, 'steel', 3], [-1, -len, 'steel', 2]);
      rot(hx, hy, ang, pts);
      if (ps === 'strike') slash(hx + n(3), hy, len);
      break;
    }
    case 'axe': {
      const len = N(11) + big;
      const ang = ANG.heavy[pi];
      const pts: WP[] = [];
      for (let i = -N(2); i < len + 1; i++) pts.push([0, -i, 'wood', i % 3 === 0 ? 2 : 3]);
      const hd = N(5);
      for (let i = 0; i < hd; i++)
        for (let j = 1; j <= N(4) - Math.floor(Math.abs(i - hd / 2) / 2); j++) {
          const edge = j === N(4) - Math.floor(Math.abs(i - hd / 2) / 2);
          pts.push([j, -len + i, 'steel', edge ? 5 : j === 1 ? 2 : i < hd / 2 ? 4 : 3]);
        }
      pts.push([-1, -len + 1, 'steel', 2], [-1, -len + 2, 'steel', 2]);
      pts.push([0, -len + hd, acc === 'gold' ? 'red' : acc, 3]);
      rot(hx, hy, ang, pts);
      if (ps === 'strike') slash(hx + n(3), hy, len);
      break;
    }
    case 'mallet': {
      const len = N(10);
      const ang = ANG.heavy[pi];
      const pts: WP[] = [];
      for (let i = -N(2); i < len; i++) pts.push([0, -i, 'wood', 3]);
      for (let j = -N(3); j <= N(3); j++)
        for (let i = 0; i < N(4); i++) {
          const s = quant(light(0, (i - N(2)) / N(2)), 0, 0, { lo: 2, hi: 5 });
          pts.push([j, -len - i, j === -N(3) || j === N(3) ? 'gold' : 'tan', j === -N(3) || j === N(3) ? 3 : s]);
        }
      rot(hx, hy, ang, pts);
      if (ps === 'strike') slash(hx + n(3), hy, len + n(2));
      break;
    }
    case 'staff':
    case 'shakujo':
    case 'gohei':
    case 'brush':
    case 'kiseru': {
      const len = N(w === 'gohei' ? 8 : w === 'brush' ? 10 : w === 'kiseru' ? 11 : 16) + (w === 'staff' || w === 'shakujo' ? big : 0);
      const ang = w === 'staff' || w === 'shakujo' ? ANG.wand[pi] : [52, -30, 70][pi];
      const shaft = w === 'kiseru' ? 'ink' : w === 'shakujo' ? 'ink' : 'wood';
      const pts: WP[] = [];
      for (let i = -N(w === 'staff' || w === 'shakujo' ? 4 : 2); i < len; i++) pts.push([0, -i, shaft, i % 5 === 0 ? 4 : 3]);
      if (w === 'brush') {
        pts.push([0, -len, 'gold', 4]);
        for (let i = 1; i <= N(3); i++) pts.push([0, -len - i, 'ink', i === N(3) ? 2 : 1], [1, -len - i + 1, 'ink', 2]);
        pts.push([0, -len - N(3) - 1, 'ink', 0]);
      }
      if (w === 'kiseru') {
        pts.push([0, 1, 'gold', 4], [0, 2, 'gold', 5], [0, -len, 'gold', 4], [1, -len, 'gold', 3], [1, -len - 1, 'gold', 5], [2, -len - 1, 'gold', 3]);
        for (let i = 3; i < len - 2; i += 3) pts.push([0, -i, 'red', 3]);
      }
      if (w === 'gohei') {
        pts.push([0, -len, 'gold', 5]);
        const s = sway();
        for (const side of [-1, 1])
          for (let i = 0; i < N(5); i++) pts.push([side * (1 + (i % 2)) + (side > 0 ? s : 0), -len + i, 'snow', i % 2 ? 4 : 5]);
      }
      rot(hx, hy, ang, pts);
      const [tx, ty] = at(hx, hy, ang, 0, -len);
      if (w === 'staff') {
        const orb = L.accent === 'gold' ? 'teal' : L.accent;
        ell(tx, ty - n(1), N(2), N(2), orb, { lo: 2, hi: 5 });
        px(tx - 1, ty - n(2), 'snow', 5);
        px(tx - n(2), ty + n(1), 'gold', 4);
        px(tx + n(2), ty + n(1), 'gold', 3);
        glint(tx, ty - n(4), 'rgba(255,255,255,0.4)');
        if (ps === 'strike') for (let i = 0; i < 8; i++) glint(tx + Math.round(Math.cos(i) * N(4)), ty - n(1) + Math.round(Math.sin(i) * N(4)), 'rgba(255,255,255,0.45)');
      }
      if (w === 'shakujo') {
        // Ringed monk's staff.
        const R = N(3);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          if (Math.sin(a) > 0.8) continue;
          px(tx + Math.round(Math.cos(a) * (R - 1)), ty - R + Math.round(Math.sin(a) * R), 'gold', i < 6 ? 3 : 5);
        }
        px(tx - R, ty - n(1) + (A.frame % 2), 'gold', 4);
        px(tx + R - 1, ty - n(1) + ((A.frame + 1) % 2), 'gold', 4);
        px(tx, ty - 2 * R, 'gold', 5);
      }
      if (w === 'brush' && ps === 'strike') for (let i = 0; i < 6; i++) glint(tx + i, ty + Math.round(Math.sin(i) * 2), 'rgba(20,14,30,0.7)');
      if (w === 'kiseru') for (let i = 0; i < 3; i++) glint(tx + n(1) - (A.frame % 2), ty - n(3) - i * 2, 'rgba(220,220,240,0.4)');
      break;
    }
    case 'bow': {
      const h = N(8) + big;
      const bx = hx + 1;
      for (let i = -h; i <= h; i++) {
        const bend = Math.round((1 - (i * i) / (h * h)) * N(3));
        const s = i < -h / 2 ? 4 : i < h / 3 ? 3 : 2;
        px(bx + bend, hy + i, 'wood', s);
        if (Math.abs(i) < h - 1 && (hiRes() || Math.abs(i) < h / 3)) px(bx + bend + 1, hy + i, 'wood', 1);
        if (i === 0 || Math.abs(i) === 1) px(bx + bend, hy + i, acc === 'gold' ? 'red' : acc, 3);
      }
      px(bx, hy - h, 'gold', 5);
      px(bx, hy + h, 'gold', 4);
      const pull = ps === 'windup' ? N(4) : 0;
      newPart({ seam: false, rim: false });
      for (let i = -h + 1; i < h; i++) px(bx - Math.round(pull * (1 - Math.abs(i) / h)), hy + i, 'snow', 4);
      if (ps !== 'strike') {
        line(bx - pull - n(1), hy, bx + N(5), hy, 'wood', 4);
        px(bx + N(5) + 1, hy, 'steel', 5);
        px(bx - pull - n(1), hy - 1, 'red', 4);
        px(bx - pull - n(1), hy + 1, 'red', 3);
      } else for (let i = 0; i < N(7); i++) glint(bx + N(4) + i, hy, i % 2 ? 'rgba(255,255,255,0.8)' : 'rgba(255,240,180,0.6)');
      break;
    }
    case 'fan': {
      const open = ps === 'idle' ? 0.75 : 1;
      const rad = N(6);
      const base = ps === 'strike' ? 40 : ps === 'windup' ? -60 : -10;
      const leaf = L.main === acc || L.main === 'ink' || L.main === 'indigo' ? (L.trim && L.trim !== acc ? L.trim : 'snow') : L.main;
      for (let i = -4; i <= 4; i++) {
        const ang = base + i * 13 * open;
        const pts: WP[] = [];
        for (let d = 1; d <= rad; d++) {
          if (d <= 2) pts.push([0, -d, 'wood', 2]);
          else if (d === rad) pts.push([0, -d, acc, i % 2 ? 3 : 4]);
          else pts.push([0, -d, leaf, (i + 4) % 3 === 0 ? 2 : i < 0 ? 5 : 4]);
        }
        rot(hx, hy, ang, pts);
      }
      if (ps === 'strike') for (let i = 0; i < 9; i++) glint(hx + N(6) + Math.round(Math.sin(i) * 2), hy - N(4) + i, 'rgba(200,255,240,0.45)');
      break;
    }
    case 'claws': {
      const reach = ps === 'strike' ? N(3) : 0;
      for (let i = 0; i < 3; i++) {
        line(hx + 1 + reach, hy - 1 + i, hx + N(3) + reach, hy - 2 + i * 1, 'steel', i === 0 ? 5 : 4);
      }
      if (ps === 'strike') for (let i = 0; i < 3; i++) for (let j = 0; j < N(5); j++) glint(hx + N(5) + j, hy - N(4) + i * N(3) + Math.floor(j / 2), 'rgba(255,255,255,0.7)');
      break;
    }
    case 'daggers':
    case 'kusarigama': {
      const ang = ps === 'idle' ? 70 : ps === 'windup' ? -40 : 110;
      if (w === 'daggers') {
        rot(hx, hy, ang, [
          [0, 2, 'ink', 2],
          [-1, 3, 'ink', 1],
          [1, 3, 'ink', 1],
          [0, 1, 'ink', 3],
          [0, -1, 'steel', 3],
          [-1, -2, 'steel', 2],
          [0, -2, 'steel', 5],
          [1, -2, 'steel', 3],
          [0, -3, 'steel', 4],
          [0, -4, 'steel', 5],
          ...(hiRes() ? ([[0, -5, 'steel', 4]] as WP[]) : []),
        ]);
      } else {
        // Sickle with a chain to a weight.
        const pts: WP[] = [];
        for (let i = -1; i < N(4); i++) pts.push([0, -i, 'wood', 3]);
        for (let i = 0; i < N(4); i++) pts.push([i + 1, -N(4) + Math.floor(i / 2), 'steel', i === N(4) - 1 ? 5 : 4]);
        rot(hx, hy, ang, pts);
        newPart({ seam: false });
        const ex = ps === 'strike' ? hx + N(12) : hx - N(4);
        const ey = ps === 'strike' ? hy - N(2) : hy + N(5);
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const sag = Math.sin(t * Math.PI) * (ps === 'strike' ? 1 : 3);
          px(hx + (ex - hx) * t, hy + (ey - hy) * t + sag, 'steel', i % 2 ? 2 : 4);
        }
        ell(ex, ey, N(1), N(1), 'steel', { lo: 1, hi: 5 });
      }
      break;
    }
    case 'drumsticks': {
      const ang = ps === 'idle' ? 50 : ps === 'windup' ? -70 : 120;
      rot(hx, hy, ang, [...Array.from({ length: N(7) }, (_, i) => [0, -i, 'wood', i === N(7) - 1 ? 5 : 3] as WP), [1, -N(7) + 1, 'wood', 2]]);
      if (ps === 'strike') for (let i = 0; i < 6; i++) glint(hx + N(6) + (i % 3), hy - N(2) + i * 2 - 4, i % 2 ? 'rgba(255,255,160,0.9)' : 'rgba(140,200,255,0.8)');
      break;
    }
    case 'shield': {
      const sx = hx + (ps === 'strike' ? N(2) : 0);
      const w2 = N(4);
      const h2 = N(5);
      newPart();
      rows(hy - h2, hy + h2, (yy) => {
        const t = Math.abs(yy - hy) / h2;
        const inset = t > 0.8 ? 1 : 0;
        return [sx - w2 + inset, sx + w2 - inset];
      }, L.main, { lo: 1, hi: 5, metal: true });
      for (let yy = hy - h2 + 1; yy < hy + h2; yy++) {
        px(sx - w2 + 1, yy, trimR(), 3);
      }
      rect(sx - n(1), hy - n(1), N(3), N(3), trimR(), 4);
      px(sx, hy, 'snow', 5);
      px(sx - w2 + 2, hy - h2 + 1, 'snow', 5);
      break;
    }
    case 'orb': {
      const lift = A.frame === 1 ? 1 : 0;
      const ox = hx + (ps === 'strike' ? N(4) : N(1));
      const oy = hy - N(4) - lift - (ps === 'windup' ? N(3) : 0);
      const ramp = L.accent;
      newPart({ seam: false });
      ell(ox, oy, N(2.5), N(2.5), ramp, { lo: 2, hi: 5, bias: 0.15 });
      px(ox - n(1), oy - n(1), 'snow', 5);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + A.frame * 0.4;
        if (i % 3 === 0) glint(ox + Math.round(Math.cos(a) * N(4)), oy + Math.round(Math.sin(a) * N(4)), `${shade(ramp, 5)}aa`);
      }
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------ worn on the back

export interface Torso {
  tl: number;
  top: number;
  tw: number;
  th: number;
  cx: number;
  /** Head box. */
  hx: number;
  hy: number;
  hw: number;
}

export function backGear(t: Torso): void {
  const L = A.look;
  const b = L.back ?? 'none';
  if (b === 'none') return;
  newPart();
  const tr = trimR();
  switch (b) {
    case 'banner': {
      // Sashimono: a pole and flag rising above the head.
      const px0 = t.tl + n(2);
      const topY = Math.max(0, t.hy - N(8));
      line(px0, t.top + t.th - n(1), px0, topY, 'wood', 3);
      line(px0 - N(6), topY + 1, px0, topY + 1, 'wood', 2);
      const fl = L.accent === 'gold' ? L.main : L.accent;
      const s = sway();
      rows(topY + 2, topY + N(10), (yy) => [px0 - N(6) + (yy > topY + N(7) ? s : 0), px0 - 1], fl, { lo: 2, hi: 4, round: 0.4 });
      // Mon on the flag.
      const mx = px0 - N(3) - 1;
      const my = topY + N(5);
      for (const [dx, dy] of [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ])
        px(mx + dx, my + dy, tr === fl ? 'snow' : tr, 4);
      px(mx, my, 'snow', 5);
      px(px0, topY, 'gold', 5);
      break;
    }
    case 'quiver': {
      const qx = t.tl - n(1);
      for (let i = 0; i < N(9); i++) {
        rect(qx + Math.floor(i / 2), t.top + t.th - i, N(3), 1, 'wood', i % 3 === 0 ? 2 : 3);
      }
      rect(qx + Math.floor(N(9) / 2), t.top + t.th - N(9), N(3), 1, 'gold', 4);
      for (let i = 0; i < 3; i++) {
        const fx = qx + Math.floor(N(9) / 2) + i;
        line(fx, t.top + t.th - N(9), fx - n(2), t.top + t.th - N(12), 'wood', 4);
        px(fx - n(2), t.top + t.th - N(12), i === 1 ? 'snow' : 'red', 4);
        px(fx - n(2) - 1, t.top + t.th - N(12) + 1, i === 1 ? 'snow' : 'red', 3);
      }
      break;
    }
    case 'shell': {
      const cx = t.tl + n(1);
      const cy = t.top + Math.floor(t.th / 2);
      ell(cx, cy, N(5), N(6), 'moss', { lo: 1, hi: 4 });
      for (let y = cy - N(5); y <= cy + N(5); y++)
        for (let x = cx - N(4); x <= cx + N(4); x++) if ((x + (y >> 1)) % 3 === 0 && y % 2 === 0) px(x, y, 'moss', 1);
      for (let y = cy - N(6); y <= cy + N(6); y++) px(cx - N(5) + Math.round(Math.abs(y - cy) / 3), y, 'bone', 3);
      break;
    }
    case 'drums': {
      // Raijin's ring of taiko drums.
      const cx = t.cx - n(1);
      const cy = t.top + n(1);
      const R = N(12);
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI * (0.62 + (i / 24) * 1.25);
        px(cx + Math.cos(a) * R, cy - Math.sin(a) * R * 0.95, 'gold', 3);
      }
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.65 + (i / 5) * 1.2);
        const dx = cx + Math.round(Math.cos(a) * R);
        const dy = cy - Math.round(Math.sin(a) * R * 0.95);
        newPart();
        ell(dx, dy, N(2), N(2), 'red', { lo: 1, hi: 4 });
        px(dx, dy, 'gold', 5);
        px(dx - 1, dy, 'gold', 3);
        px(dx - N(2), dy, 'bone', 4);
      }
      break;
    }
    case 'bell': {
      // A bronze temple bell.
      const cx = t.tl + n(1);
      const top = t.hy + n(2);
      const H = N(14);
      rows(top, top + H, (yy) => {
        const tt = (yy - top) / H;
        const hw = tt < 0.15 ? N(3) + Math.round(tt * 20) : N(5) + (tt > 0.85 ? n(1) : 0);
        return [cx - hw, cx + hw];
      }, 'teal', { lo: 1, hi: 4, metal: true });
      for (let yy = top + N(3); yy < top + N(8); yy += 2) for (let xx = cx - N(4); xx <= cx + N(3); xx += 2) px(xx, yy, 'gold', 4);
      line(cx - N(5), top + N(10), cx + N(5), top + N(10), 'teal', 1);
      line(cx - N(5), top + N(12), cx + N(5), top + N(12), 'gold', 3);
      rect(cx - n(1), top - N(2), N(3), N(2), 'gold', 3);
      break;
    }
    case 'tokkuri': {
      const bx = t.tl;
      const by = t.top + n(1);
      ell(bx, by + N(5), N(3), N(3), 'bone', { lo: 2, hi: 5 });
      rect(bx - n(1), by + n(1), N(2), N(3), 'bone', 3);
      rect(bx - n(1), by, N(2), 1, 'ink', 2);
      rect(bx - N(2), by + N(4), N(4), N(2), 'blue', 3);
      px(bx - n(1), by + N(4), 'snow', 5);
      break;
    }
    case 'flame_ring': {
      newPart({ seam: false });
      const cx = t.cx;
      const cy = t.top;
      const R = N(12);
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * (0.55 + (i / 13) * 1.4);
        const fx = cx + Math.cos(a) * R;
        const fy = cy - Math.sin(a) * R;
        const hgt = N(3) + ((i + A.frame) % 2) * n(1);
        limb(fx, fy, fx + Math.cos(a) * hgt, fy - Math.sin(a) * hgt - n(1), N(3), 1, i % 2 ? 'orange' : 'red', { lo: 2, hi: 5 });
      }
      break;
    }
    case 'sword': {
      const x0 = t.tl - n(2);
      const y0 = t.top + t.th;
      for (let i = 0; i < N(14); i++) {
        px(x0 + Math.round(i * 0.6), y0 - i, 'ink', i % 4 === 0 ? 4 : 2);
        if (hiRes()) px(x0 + Math.round(i * 0.6) + 1, y0 - i, 'ink', 1);
      }
      const [hx, hy] = [x0 + Math.round(N(14) * 0.6), y0 - N(14)];
      px(hx, hy, 'gold', 4);
      line(hx + 1, hy - 1, hx + N(3), hy - N(3), 'snow', 3);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------ off-hand props

export function prop(hx: number, hy: number, t: Torso): void {
  const L = A.look;
  const p = L.prop ?? 'none';
  if (p === 'none') return;
  newPart();
  switch (p) {
    case 'gourd': {
      // Hung at the back hip.
      const gx = t.tl + n(1);
      const gy = t.top + t.th + n(1);
      ell(gx, gy - N(2), N(1.5), N(1.5), 'orange', { lo: 2, hi: 5 });
      ell(gx, gy + N(1), N(2), N(2), 'orange', { lo: 2, hi: 5 });
      px(gx, gy - n(1), 'red', 3);
      px(gx + n(1), gy - n(1), 'red', 4);
      break;
    }
    case 'scroll': {
      rect(hx - N(3), hy - n(1), N(5), N(3), 'snow', 4);
      for (let i = 0; i < N(4); i += 2) px(hx - N(3) + i + 1, hy, 'ink', 2);
      rect(hx - N(4), hy - N(2), N(1), N(5), 'wood', 3);
      px(hx - N(4), hy - N(2), 'gold', 5);
      rect(hx + N(2), hy - N(2), N(1), N(5), 'red', 3);
      break;
    }
    case 'sake_cup': {
      // A huge red lacquer sake dish raised in the off hand.
      const cy = hy - N(3);
      rows(cy, cy + N(2), (yy) => (yy === cy ? [hx - N(4), hx + N(3)] : yy === cy + N(2) ? [hx - N(2), hx + N(1)] : [hx - N(3), hx + N(2)]), 'red', { lo: 2, hi: 5 });
      line(hx - N(3), cy, hx + N(2), cy, 'gold', 4);
      px(hx - N(1), cy, 'snow', 5);
      line(hx - N(2), cy - (A.frame === 1 ? 0 : 0), hx, cy, 'bone', 5);
      break;
    }
    case 'conch': {
      ell(hx - n(1), hy - n(2), N(2.5), N(2), 'bone', { lo: 2, hi: 5 });
      px(hx + n(1), hy - n(2), 'orange', 4);
      px(hx - N(3), hy - n(1), 'bone', 3);
      line(hx - N(2), hy - N(3), hx + n(1), hy - N(3), 'orange', 3);
      break;
    }
    case 'talismans': {
      newPart({ seam: false });
      const pos: [number, number][] = [
        [t.tl - N(5), t.top - N(2)],
        [t.tl - N(3), t.top + N(4)],
        [t.tl + t.tw + N(4), t.hy - N(1)],
      ];
      pos.forEach(([x, y], i) => {
        const yy = y + ((A.frame + i) % 2);
        rect(x, yy, N(2), N(4), 'snow', 5);
        px(x, yy + n(1), 'red', 3);
        px(x + n(1), yy + N(2), 'red', 3);
        px(x + n(1), yy, 'snow', 4);
      });
      break;
    }
    case 'loot': {
      const sx = t.tl - n(1);
      const sy = t.top + t.th - n(1);
      ell(sx, sy, N(3), N(3), 'tan', { lo: 1, hi: 4, dither: 0.6 });
      px(sx, sy - N(3), 'wood', 1);
      px(sx + n(1), sy - N(3) - 1, 'gold', 5);
      px(sx - n(1), sy - N(3), 'gold', 4);
      break;
    }
    case 'lantern': {
      line(hx, hy, hx - n(2), hy - N(4), 'wood', 3);
      const lx = hx - N(3);
      const ly = hy - N(1);
      ell(lx, ly, N(2), N(2.5), 'orange', { lo: 3, hi: 5, bias: 0.2 });
      line(lx - N(2), ly - N(2) - 1, lx + N(2), ly - N(2) - 1, 'ink', 2);
      line(lx - N(2), ly + N(2) + 1, lx + N(2), ly + N(2) + 1, 'ink', 2);
      glint(lx, ly + N(4), 'rgba(255,200,120,0.4)');
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------ neck and chest

export function neckPiece(t: Torso): void {
  const L = A.look;
  const nk = L.neck ?? 'none';
  if (nk === 'none') return;
  newPart();
  const cx = t.cx + n(1);
  switch (nk) {
    case 'beads': {
      // Prayer beads across the chest.
      for (let i = 0; i <= N(6); i++) {
        const x = t.tl + n(1) + Math.round((i / N(6)) * (t.tw - n(2)));
        const y = t.top + Math.round(Math.sin((i / N(6)) * Math.PI) * N(4));
        px(x, y, i === N(3) ? 'red' : 'wood', i % 2 ? 4 : 2);
      }
      ell(cx, t.top + N(4), N(1), N(1), 'red', { lo: 2, hi: 5 });
      break;
    }
    case 'bib': {
      rows(t.top, t.top + N(4), (yy) => {
        const hw = Math.max(0, N(4) - (yy - t.top));
        return [cx - hw, cx + hw];
      }, 'red', { lo: 2, hi: 4 });
      px(cx, t.top + N(2), 'gold', 5);
      break;
    }
    case 'ruff': {
      rows(t.top - n(1), t.top + n(2), () => [t.tl - n(1), t.tl + t.tw], L.trim ?? 'bone', { lo: 2, hi: 5, dither: 1 });
      for (let x = t.tl; x < t.tl + t.tw; x += 2) px(x, t.top + n(2) + 1, L.trim ?? 'bone', 2);
      break;
    }
    case 'collar': {
      line(t.tl + n(1), t.top, t.tl + t.tw - n(1), t.top, 'gold', 4);
      line(t.tl + n(2), t.top + 1, t.tl + t.tw - n(2), t.top + 1, 'gold', 2);
      px(cx, t.top + 1, 'red', 4);
      break;
    }
    default:
      break;
  }
}

/** A small crest centred at (x, y). */
export function emblem(kind: string | undefined, x: number, y: number, r: string): void {
  if (!kind || kind === 'none') return;
  newPart({ seam: false });
  switch (kind) {
    case 'mon':
      px(x, y - 1, r, 4);
      px(x - 1, y, r, 4);
      px(x + 1, y, r, 3);
      px(x, y + 1, r, 3);
      px(x, y, 'snow', 5);
      break;
    case 'star':
      px(x, y - 1, 'gold', 5);
      px(x - 1, y, 'gold', 4);
      px(x + 1, y, 'gold', 4);
      px(x, y + 1, 'gold', 3);
      px(x, y, 'snow', 5);
      if (hiRes()) {
        px(x, y - 2, 'gold', 4);
        px(x, y + 2, 'gold', 3);
      }
      break;
    case 'sun':
      ell(x, y, 1, 1, 'gold', { lo: 4, hi: 5 });
      px(x, y - 2, 'orange', 4);
      px(x - 2, y, 'orange', 4);
      px(x + 2, y, 'orange', 3);
      px(x, y + 2, 'orange', 3);
      break;
    case 'moon':
      px(x - 1, y - 1, 'snow', 5);
      px(x - 1, y, 'snow', 5);
      px(x - 1, y + 1, 'snow', 4);
      px(x, y - 2, 'snow', 4);
      px(x, y + 2, 'snow', 3);
      break;
    case 'tomoe':
      px(x, y, r, 4);
      px(x + 1, y, r, 3);
      px(x + 1, y - 1, r, 4);
      px(x - 1, y + 1, r, 3);
      break;
    case 'flame':
      px(x, y - 2, 'gold', 5);
      px(x, y - 1, 'orange', 4);
      px(x - 1, y, 'red', 3);
      px(x, y, 'orange', 4);
      px(x + 1, y, 'red', 3);
      px(x, y + 1, 'red', 2);
      break;
    case 'pompoms':
      // Yamabushi yuigesa: fluffy balls down the chest.
      for (let i = 0; i < 3; i++) {
        const yy = y - N(2) + i * N(2);
        px(x, yy, r, 4);
        px(x + 1, yy, r, 3);
        px(x, yy + 1, r, 2);
      }
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------ flowing extras

/** Feathered, crow, bat or cloud wings rising behind the shoulders. */
export function wings(x: number, y: number, ramp: string): void {
  newPart();
  const style = A.look.wingStyle ?? 'feather';
  const flap = A.frame === 1 ? 1 : A.frame === 2 ? -2 : A.frame === 3 ? 2 : 0;
  const big = A.big ? 1.2 : 1;
  if (style === 'bat') {
    const tipX = x - N(9 * big);
    const tipY = y - N(7 * big) + flap;
    for (let i = 0; i <= 4; i++) {
      const fx = x + (tipX - x) * (i / 4);
      const fy = tipY + (i / 4) * N(9);
      line(x, y, fx, fy, ramp, 1);
    }
    rows(tipY, y + N(6), (yy) => {
      const t = (yy - tipY) / (y + N(6) - tipY);
      return [tipX + Math.round(t * N(6)), x - Math.round((1 - t) * N(1))];
    }, ramp, { lo: 1, hi: 3, round: 0.3 });
    for (let i = 1; i <= 3; i++) line(x, y, x - N(3 * i), y + N(7) - i, ramp, 1);
    px(tipX, tipY - 1, 'bone', 4);
    return;
  }
  if (style === 'cloud') {
    for (let i = 0; i < 3; i++) ell(x - N(3) - i * N(3), y - N(2) + i * N(2) + flap, N(3), N(2), 'snow', { lo: 3, hi: 5 });
    return;
  }
  const feathers = A.big ? 6 : 5;
  for (let i = 0; i < feathers; i++) {
    const a = Math.PI * (0.62 + i * 0.1) + flap * 0.06;
    const len = N((11 - i * 1.1) * big);
    const ex = x + Math.cos(a) * len;
    const ey = y - Math.sin(a) * len;
    limb(x, y, ex, ey, N(3), 1, ramp, { lo: 2, hi: style === 'crow' ? 4 : 5 });
    px(ex, ey, ramp, 5);
    if (style === 'crow') px((x + ex) / 2, (y + ey) / 2, ramp, 1);
  }
  // Covert feathers near the shoulder.
  ell(x - N(1), y - N(2), N(2.5), N(2), ramp, { lo: 2, hi: 4, dither: 0.5 });
}

/** Tails by style, attached at (x, y), trailing left. */
export function tail(x: number, y: number, ramp: string): void {
  const L = A.look;
  const style = L.tailStyle ?? 'fluffy';
  const sw = sway();
  const count = Math.max(1, L.tails ?? 1);
  for (let k = 0; k < count; k++) {
    newPart();
    const spread = count > 1 ? (k - (count - 1) / 2) * 0.35 : 0;
    if (style === 'fluffy' || style === 'plume') {
      const n0 = N(style === 'plume' ? 10 : 8);
      for (let i = 0; i < n0; i++) {
        const t = i / n0;
        const ang = Math.PI * (0.15 + t * 0.55 + spread);
        const tx = x - Math.round(Math.cos(ang - 0.3) * t * N(8)) - (i > n0 / 2 ? sw : 0);
        const ty = y - Math.round(Math.sin(ang) * t * N(8));
        const rad = style === 'plume' ? Math.max(1, N(1.5) - t) : Math.max(1, N(2.6) * Math.sin((0.2 + t * 0.8) * Math.PI * 0.85));
        const tip = t > 0.78;
        ell(tx, ty, rad, rad, tip ? (style === 'plume' ? A.look.accent : 'snow') : ramp, { lo: tip ? 3 : 1, hi: tip ? 5 : 4 });
      }
    } else if (style === 'thin' || style === 'snake') {
      const n0 = N(10);
      let px0 = x;
      let py0 = y;
      for (let i = 1; i <= n0; i++) {
        const t = i / n0;
        const nx2 = x - Math.round(t * N(7));
        const ny2 = y - Math.round(Math.sin(t * Math.PI * 1.2) * N(5)) + (i > n0 / 2 ? sw : 0);
        limb(px0, py0, nx2, ny2, style === 'snake' ? N(2.5) : N(1), style === 'snake' ? N(2) : N(1), ramp, { lo: 1, hi: 4 });
        px0 = nx2;
        py0 = ny2;
      }
      if (style === 'snake') {
        newPart();
        ell(px0, py0 - n(1), N(2), N(1.5), 'moss', { lo: 1, hi: 4 });
        px(px0 - n(1), py0 - n(2), 'gold', 5);
        if (A.pose === 'strike') px(px0 - N(3), py0, 'red', 3);
      }
    } else if (style === 'curl') {
      limb(x, y, x - N(2), y - N(3), N(3), N(3), ramp, { lo: 1, hi: 4 });
      ell(x - N(2), y - N(5) + (A.frame === 1 ? 1 : 0), N(3), N(3), ramp, { lo: 1, hi: 5, dither: 0.6 });
      px(x - N(2), y - N(5), ramp, 1);
      px(x - N(1), y - N(5), ramp, 1);
      px(x - N(2), y - N(4), ramp, 1);
    }
  }
}

export function cape(t: Torso, bottom: number): void {
  newPart();
  const L = A.look;
  const wave = A.frame === 1 || A.frame === 3 ? 1 : 0;
  const ramp = L.accent === 'gold' || L.accent === L.main ? L.main : L.accent;
  const lining = trimR() === ramp ? 'red' : trimR();
  const top = t.top;
  rows(top, bottom, (y) => {
    const s = Math.round(((y - top) / (bottom - top)) * N(4)) + (y > bottom - 3 ? wave : 0);
    return [t.tl - s - N(2), t.tl + t.tw - n(2)];
  }, ramp, { lo: 1, hi: 3, round: 0.5 });
  // Folds.
  for (let y = top + N(3); y < bottom; y++) {
    const s = Math.round(((y - top) / (bottom - top)) * N(4));
    px(t.tl - Math.floor(s / 2), y, ramp, 1);
    if ((y - top) % 3 === 0) px(t.tl - s - N(1), y, ramp, 3);
  }
  // Lining at the hem.
  for (let x = t.tl - N(6) - wave; x < t.tl; x++) px(x, bottom, lining, 3);
}

export function scarf(t: Torso): void {
  newPart();
  const L = A.look;
  const ramp = L.accent === 'gold' || L.accent === L.main ? (L.main === 'red' ? 'snow' : 'red') : L.accent;
  const y0 = t.top + n(1);
  const len = N(9);
  let px0 = t.tl + n(2);
  let py0 = y0;
  for (let i = 1; i <= len; i++) {
    const x = t.tl + n(2) - i;
    const y = y0 + Math.round(i * 0.3 + Math.sin(i * 0.9 - A.frame * 1.3) * (i / len) * N(1.5));
    limb(px0, py0, x, y, N(2.2), N(1.6), ramp, { lo: 2, hi: 4 });
    px0 = x;
    py0 = y;
  }
  px(px0 - 1, py0 + 1, ramp, 1);
}

/** Front part of the scarf: a wrap at the neck. */
export function scarfWrap(t: Torso): void {
  newPart();
  const L = A.look;
  const ramp = L.accent === 'gold' || L.accent === L.main ? (L.main === 'red' ? 'snow' : 'red') : L.accent;
  box(t.tl + n(1), t.top - n(1), t.tw - n(2), N(2), ramp, { lo: 2, hi: 4 });
  px(t.cx + n(2), t.top + n(1), ramp, 2);
}

/** Hagoromo: a celestial shawl looping above the shoulders. */
export function ribbons(t: Torso): void {
  newPart({ seam: false });
  const L = A.look;
  const r = L.trim ?? (L.accent === 'gold' ? 'pink' : L.accent);
  const s = A.frame === 1 ? 1 : 0;
  const cx = t.cx;
  const cy = t.top + n(1);
  const R = Math.round(t.tw / 2) + N(4);
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (0.05 + (i / 20) * 0.9);
    const x = cx + Math.cos(a) * R;
    const y = cy - Math.sin(a) * N(6) - s;
    px(x, y, r, i % 4 === 0 ? 5 : 4);
    px(x, y + 1, r, 2);
  }
  // Trailing ends.
  for (let i = 0; i < N(9); i++) {
    px(cx - R - Math.round(Math.sin(i * 0.6 + A.frame) * 1), cy + i, r, i % 3 === 0 ? 4 : 3);
    px(cx + R + Math.round(Math.sin(i * 0.6 + A.frame) * 1), cy + i, r, i % 3 === 0 ? 3 : 2);
  }
}

/** Sparkles orbiting the unit (translucent, no outline). */
export function aura(): void {
  const L = A.look;
  const ramp = L.accent === 'steel' ? L.main : L.accent;
  const pts = [
    [4, 8],
    [27, 6],
    [2, 19],
    [29, 16],
    [8, 2],
    [24, 25],
    [17, 1],
  ];
  pts.forEach(([x, y], i) => {
    if ((i + A.frame) % 3 === 0) return;
    const X = Math.round(x * A.k);
    const Y = Math.round(y * A.k) - (A.frame % 2);
    glint(X, Y, shade(ramp, 5));
    if (i % 2 === 0) {
      glint(X - 1, Y, `${shade(ramp, 4)}99`);
      glint(X + 1, Y, `${shade(ramp, 4)}99`);
      glint(X, Y - 1, `${shade(ramp, 4)}99`);
      glint(X, Y + 1, `${shade(ramp, 4)}99`);
    }
  });
}

