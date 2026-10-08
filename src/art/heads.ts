/**
 * Heads for bipeds: face (with expression, eyes, brows, mouth, beard and
 * marks), hair styles, beast-folk heads (fox, tanuki, monkey, kappa, rabbit,
 * tengu, crow), skulls, and every hat.
 */
import { A, N, eyeR, hairR, hiRes, n, sway, trimR } from './ctx';
import { box, ell, glint, light, limb, line, newPart, px, quant, rbox, rect, rows } from './raster';
import type { ShadeOpts } from './raster';

export interface Head {
  x: number;
  y: number;
  w: number;
  h: number;
}

function hl(hd: Head, x: number, y: number): number {
  const nx = (x + 0.5 - (hd.x + hd.w / 2)) / (hd.w / 2 + 1);
  const ny = (y + 0.5 - (hd.y + hd.h / 2)) / (hd.h / 2 + 1);
  return light(nx, ny);
}

/** A pixel shaded as part of the head sphere. */
function hp(hd: Head, x: number, y: number, r: string, o: ShadeOpts = {}): void {
  px(x, y, r, quant(hl(hd, x, y), x, y, o));
}

const isFolk = (): boolean => {
  const s = A.look.species;
  return s === 'fox' || s === 'tanuki' || s === 'monkey' || s === 'kappa' || s === 'rabbit' || s === 'tengu' || s === 'crow';
};

// ------------------------------------------------------------ behind the body

/** Hair, halos and drapes that sit behind the torso. */
export function headBack(hd: Head): void {
  const L = A.look;
  const style = L.hairStyle ?? 'short';
  const hair = hairR();
  const sw = sway();
  const hat = L.hat ?? 'none';
  if (hat === 'sun') {
    newPart({ seam: false, rim: false });
    const cx = hd.x + Math.floor(hd.w / 2);
    const cy = hd.y + n(2);
    const R = N(8);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + (A.frame % 2) * 0.13;
      const r0 = R - N(2);
      const r1 = R + (i % 2 ? n(1) : n(3));
      line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 'gold', i % 2 ? 3 : 4);
    }
    ell(cx, cy, R - N(1), R - N(1), 'gold', { lo: 3, hi: 5 });
    ell(cx, cy, R - N(3), R - N(3), 'orange', { lo: 3, hi: 4 });
  }
  if (hat === 'crescent') {
    newPart({ seam: false, rim: false });
    const cx = hd.x + Math.floor(hd.w / 2) - n(1);
    const cy = hd.y + n(1);
    const R = N(7);
    for (let y = -R; y <= R; y++)
      for (let x = -R; x <= R; x++) {
        const d1 = x * x + y * y;
        const d2 = (x - n(3)) * (x - n(3)) + (y + n(1)) * (y + n(1));
        if (d1 <= R * R && d2 > (R - 1) * (R - 1) && x < n(2)) px(cx + x, cy + y, 'snow', quant(light(x / R, y / R), cx + x, cy + y, { lo: 3, hi: 5 }));
      }
  }
  if (style === 'hood' || hat === 'hood') {
    newPart();
    rows(hd.y + n(2), hd.y + hd.h + n(5), (y) => [hd.x - n(2) - Math.floor((y - hd.y) / 4), hd.x + n(3)], L.main, { lo: 1, hi: 3, bias: -0.1 });
  }
  newPart();
  if (style === 'long' || style === 'bob' || style === 'twin') {
    const len = style === 'long' ? n(9) : style === 'bob' ? n(1) : n(3);
    rows(hd.y + n(2), hd.y + hd.h + len, (y) => {
      const t = y - hd.y;
      const tip = y > hd.y + hd.h + len - n(2) ? n(1) : 0;
      return [hd.x - n(1) - (t > n(6) ? n(1) : 0) + tip - (y > hd.y + hd.h + len - n(3) ? Math.max(0, sw) : 0), hd.x + n(5) - tip];
    }, hair, { lo: 1, hi: 3, bias: -0.05 });
    // Strands.
    for (let x = hd.x; x < hd.x + n(5); x += 2) line(x, hd.y + hd.h - n(1), x, hd.y + hd.h + len - n(1), hair, 1);
    if (style === 'long' && L.accent) px(hd.x + n(1), hd.y + hd.h + n(1), trimR(), 4);
  }
  if (style === 'twin') {
    for (const tx of [hd.x - n(2), hd.x + hd.w - n(1)]) {
      limb(tx + n(1), hd.y + n(3), tx + n(1) - (tx < hd.x ? Math.max(0, sw) : 0), hd.y + hd.h + n(4), N(3), N(2), hair, { lo: 1, hi: 4 });
      rect(tx, hd.y + n(3), N(2), 1, trimR(), 4);
    }
  }
  if (style === 'ponytail') {
    const x0 = hd.x;
    const y0 = hd.y + n(2);
    limb(x0, y0, x0 - n(4) - Math.max(0, sw), y0 + n(10), N(4), N(1.5), hair, { lo: 1, hi: 4 });
    px(x0, y0, trimR(), 4);
    px(x0 + 1, y0 + 1, trimR(), 3);
  }
  if (style === 'mane') {
    ell(hd.x + hd.w / 2 - n(1), hd.y + hd.h / 2 + n(1), hd.w / 2 + n(3), hd.h / 2 + n(3), hair, { lo: 1, hi: 3, dither: 0.6 });
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.45 + (i / 8) * 1.3);
      const cx = hd.x + hd.w / 2 - n(1);
      const cy = hd.y + hd.h / 2 + n(1);
      const R = hd.w / 2 + n(4);
      px(cx + Math.cos(a) * R, cy - Math.sin(a) * R * 0.9, hair, 2);
    }
  }
  if (style === 'wild') {
    const cx = hd.x + n(3);
    const cy = hd.y + n(3);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.35 + i * 0.16);
      const R = N(9) + ((i + A.frame) % 2) * n(1);
      limb(cx, cy, cx - Math.cos(a) * R, cy - Math.sin(a) * R * 0.85, N(4), 1, hair, { lo: 1, hi: 4 });
    }
  }
}

// ------------------------------------------------------------ faces

function brows(nxX: number, fx: number, ey: number, kind: string, r: string): void {
  const s = 1;
  switch (kind) {
    case 'fierce':
    case 'wild':
      px(nxX, ey - 1, r, 0);
      px(nxX + 1, ey - 2, r, s);
      if (hiRes()) px(nxX + 2, ey - 2, r, s);
      px(fx, ey - 2, r, s);
      break;
    case 'stern':
      px(nxX, ey - 1, r, s);
      px(nxX + 1, ey - 1, r, s);
      px(fx, ey - 1, r, s);
      break;
    case 'sly':
      px(nxX, ey - 2, r, s);
      px(nxX + 1, ey - 3, r, s);
      px(fx, ey - 2, r, s);
      break;
    case 'serene':
      px(nxX + 1, ey - 2, r, 2);
      break;
    default:
      px(nxX, ey - 2, r, s);
      px(nxX + 1, ey - 2, r, s);
      if (hiRes()) px(fx, ey - 2, r, s);
      break;
  }
}

function eyes(nxX: number, fx: number, ey: number, kind: string, glow: boolean): void {
  const er = eyeR();
  const shut = A.frame === 4 || kind === 'serene';
  if (shut) {
    px(nxX, ey + 1, 'ink', 0);
    px(nxX + 1, ey + 1, 'ink', 0);
    px(fx, ey + 1, 'ink', 0);
    if (hiRes()) px(nxX - 1, ey, 'ink', 1);
    return;
  }
  if (glow) {
    px(nxX, ey, er, 5);
    px(nxX + 1, ey, er, 4);
    px(nxX, ey + 1, er, 3);
    px(fx, ey, er, 4);
    glint(nxX + 2, ey, 'rgba(255,255,255,0.35)');
    return;
  }
  if (hiRes()) {
    // 2×3 eye: lash line, iris with glint, lower iris.
    px(nxX, ey, 'ink', 0);
    px(nxX + 1, ey, 'ink', 0);
    px(nxX + 2, ey - 1, 'ink', 0);
    px(nxX, ey + 1, kind === 'wild' ? 'snow' : er, kind === 'wild' ? 5 : 2);
    px(nxX + 1, ey + 1, kind === 'wild' ? 'ink' : 'snow', kind === 'wild' ? 0 : 5);
    px(nxX, ey + 2, er, 3);
    px(nxX + 1, ey + 2, er, 4);
    px(fx, ey, 'ink', 0);
    px(fx, ey + 1, er, 2);
    px(fx, ey + 2, er, 3);
    if (kind === 'sly') {
      px(nxX, ey + 1, 'ink', 1);
      px(nxX + 1, ey + 1, 'ink', 1);
    }
    return;
  }
  px(nxX, ey, 'ink', 0);
  px(nxX + 1, ey, 'ink', 0);
  if (kind === 'wild') {
    px(nxX, ey + 1, 'snow', 5);
    px(nxX + 1, ey + 1, 'ink', 0);
  } else if (kind === 'sly' || kind === 'stern') {
    px(nxX, ey + 1, er, 2);
    px(nxX + 1, ey + 1, er, 3);
  } else {
    px(nxX, ey + 1, 'snow', 5);
    px(nxX + 1, ey + 1, er, 3);
  }
  px(fx, ey, 'ink', 0);
  px(fx, ey + 1, er, 2);
}

function mouth(mx: number, my: number, kind: string, skin: string): void {
  switch (kind) {
    case 'grin':
      px(mx - 1, my, 'ink', 0);
      px(mx, my, 'snow', 5);
      px(mx + 1, my, 'snow', 4);
      if (hiRes()) px(mx, my + 1, 'ink', 1);
      break;
    case 'wild':
      px(mx, my, 'ink', 0);
      px(mx + 1, my, 'ink', 0);
      px(mx, my + 1, 'red', 3);
      px(mx + 1, my + 1, 'ink', 0);
      break;
    case 'fierce':
      px(mx, my, 'ink', 1);
      px(mx + 1, my, 'ink', 1);
      break;
    case 'stern':
      px(mx, my, skin, 1);
      px(mx + 1, my, skin, 1);
      break;
    case 'sly':
      px(mx, my, skin, 1);
      px(mx + 1, my - 1, skin, 1);
      break;
    default:
      px(mx + 1, my, skin, 1);
      if (hiRes()) px(mx, my, skin, 2);
      break;
  }
}

function beard(hd: Head, kind: string | undefined, mx: number, my: number): void {
  if (!kind || kind === 'none') return;
  const hr = hairR();
  const { x, y, w, h } = hd;
  switch (kind) {
    case 'long':
      rows(my - n(1), y + h + n(5), (yy) => {
        const t = yy - (y + h);
        const half = t < 0 ? n(3) : Math.max(0, n(3) - Math.floor(t / 2));
        return [mx - half, mx + n(1) + (t < 0 ? n(1) : 0)];
      }, hr, { lo: 2, hi: 5 });
      for (let yy = y + h; yy < y + h + n(4); yy += 2) px(mx, yy, hr, 2);
      px(mx + 1, my, 'ink', 1);
      px(mx + 2, my, 'ink', 1);
      break;
    case 'full':
      rows(my - n(1), y + h + n(1), (yy) => [x + n(3), x + w - (yy === my - n(1) ? n(1) : 0)], hr, { lo: 1, hi: 4, dither: 0.5 });
      px(mx, my, 'ink', 0);
      px(mx + 1, my, 'ink', 0);
      break;
    case 'goatee':
      rect(mx, my + 1, N(2), N(2), hr, 2);
      px(mx, y + h, hr, 1);
      break;
    case 'mustache':
      px(mx - 1, my, hr, 1);
      px(mx, my - 1, hr, 2);
      px(mx + 1, my - 1, hr, 2);
      px(mx + 2, my, hr, 1);
      if (hiRes()) px(mx - 2, my + 1, hr, 1);
      break;
    case 'stubble':
      for (let yy = y + h - N(2); yy <= y + h - 1; yy++) for (let xx = x + n(4); xx < x + w - 1; xx++) if ((xx + yy) % 2 === 0 && !(yy === my && (xx === mx || xx === mx + 1))) px(xx, yy, A.look.skin, 2);
      break;
    default:
      break;
  }
}

function marks(hd: Head, kind: string | undefined, nxX: number, fx: number, ey: number, mx: number, my: number): void {
  if (!kind || kind === 'none') return;
  const { x, y, w } = hd;
  switch (kind) {
    case 'scar':
      px(nxX + 2, ey - 2, A.look.skin, 1);
      px(nxX + 1, ey - 1, A.look.skin, 1);
      px(nxX, ey + 2, A.look.skin, 1);
      px(nxX - 1, ey + 3, A.look.skin, 2);
      break;
    case 'eyepatch':
      line(nxX + 1, ey - 1, x + n(3), y + n(2), 'ink', 1);
      rect(nxX - (hiRes() ? 0 : 0), ey, N(2) + (hiRes() ? 1 : 0), N(2), 'ink', 1);
      px(nxX, ey, 'ink', 2);
      break;
    case 'warpaint':
      px(nxX, ey + 2, 'red', 3);
      px(nxX + 1, ey + 2, 'red', 3);
      px(fx, ey + 2, 'red', 3);
      if (hiRes()) {
        px(nxX, ey + 3, 'red', 2);
        px(fx, ey + 3, 'red', 2);
      }
      break;
    case 'tusks':
      px(mx + 1, my - 1, 'bone', 5);
      px(mx + 1, my, 'bone', 4);
      px(mx - 2, my, 'bone', 4);
      break;
    case 'third_eye':
      px(x + Math.round(w * 0.62), y + n(2), 'gold', 4);
      px(x + Math.round(w * 0.62), y + n(3), 'red', 3);
      break;
    case 'mask_cloth': {
      const m = A.look.main;
      rows(ey + 2, hd.y + hd.h - 1, (yy) => [x + n(3), x + w - (yy === ey + 2 ? 1 : 0)], m === 'ink' ? 'indigo' : m, { lo: 1, hi: 3 });
      for (let xx = x + n(4); xx < x + w; xx += 2) px(xx, ey + 3, m === 'ink' ? 'indigo' : m, 1);
      break;
    }
    case 'glasses':
      // Round spectacles: rims below the eyes and a bridge.
      px(nxX - 1, ey + 1, 'gold', 4);
      px(nxX + 2, ey + 1, 'gold', 3);
      line(nxX, ey + 2, nxX + 1, ey + 2, 'gold', 4);
      px(fx + 1, ey + 1, 'gold', 3);
      px(fx, ey + 2, 'gold', 3);
      if (hiRes()) line(nxX - 1, ey - 1, nxX + 2, ey - 1, 'gold', 3);
      break;
    case 'blush':
      px(nxX + 1, ey + 2, 'pink', 4);
      px(nxX + 2, ey + 2, 'pink', 3);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------ hair

function hairCap(hd: Head): void {
  const L = A.look;
  const style = L.hairStyle ?? 'short';
  if (style === 'none' || L.hair === 'none' || style === 'hood') return;
  const hr = hairR();
  const { x, y, w, h } = hd;
  const backW = N(style === 'topknot' ? 2.4 : 2.6);
  const longBack = style === 'long' || style === 'bob' || style === 'twin';
  const fringeY = y + N(2.5);
  const bang = (i: number) => (i % 3 === 1 ? n(1) : i % 3 === 2 ? 0 : -1 + (hiRes() ? 0 : 1));
  for (let yy = y - 1; yy < y + h; yy++)
    for (let xx = x - 1; xx < x + w + (style === 'bob' ? 0 : 0); xx++) {
      const i = xx - x;
      const j = yy - y;
      // Rounded top.
      if (j < 0 && (i < 1 || i > w - 3)) continue;
      if (j === 0 && i === w - 1) continue;
      if (xx === x - 1 && (j < 1 || j > h - n(2))) continue;
      const inBack = i < backW && yy < y + h - (longBack ? 0 : n(2));
      const inTop = yy < fringeY + (i > backW ? bang(i) : 0);
      const lock = style === 'bob' && i >= w - n(2) && yy < y + h - n(2);
      if (!inBack && !inTop && !lock) continue;
      hp(hd, xx, yy, hr, { lo: 1, hi: 4, bias: 0.05 });
    }
  // Shine band (the anime "halo" highlight).
  for (let i = backW - 1; i < w - n(2); i++) {
    const xx = x + i;
    px(xx, y + (i % 4 === 0 ? 1 : 0), hr, i < backW + n(3) ? 5 : 4);
  }
  // Strands in the back hair.
  for (let yy = y + n(4); yy < y + h - n(1); yy++) if ((yy - y) % 2 === 0) px(x + n(1), yy, hr, 1);
  if (style === 'spiky' || style === 'wild') {
    for (let i = 0; i < 4; i++) {
      const sx = x + n(1) + Math.round((i / 3) * (w - n(3)));
      const hgt = N(3) - (i === 3 ? 1 : 0);
      for (let j = 0; j < hgt; j++) px(sx - Math.floor(j / 2), y - 1 - j, hr, j === 0 ? 3 : 4);
      if (A.k > 1) for (let j = 0; j < hgt - 1; j++) px(sx + 1 - Math.floor(j / 2), y - 1 - j, hr, 2);
    }
    px(x - 2, y + n(2), hr, 2);
    px(x - 2, y + n(3), hr, 1);
  }
  if (style === 'bun') {
    ell(x + n(3), y - n(2), N(2.5), N(2), hr, { lo: 1, hi: 5 });
    line(x, y - n(2), x + n(6), y - n(4), trimR(), 4);
    px(x + n(6), y - n(4), 'gold', 5);
  }
  if (style === 'topknot') {
    rect(x + n(3), y - n(2), N(4), N(2), hr, 2);
    px(x + n(3), y - n(2), hr, 4);
    px(x + n(6), y - n(1), hr, 1);
    px(x + n(4), y, 'snow', 4);
  }
}

// ------------------------------------------------------------ main head

/** Draws the head (face, hair, features, hat) in front of the body. */
export function head(hd: Head, opts: { skull?: boolean } = {}): void {
  const L = A.look;
  const { x, y, w, h } = hd;
  const sp = L.species;
  const skin = L.skin;
  const kind = L.face ?? 'calm';
  newPart();
  if (opts.skull) {
    skull(hd);
    hat(hd);
    return;
  }
  // Face: a rounded block, sphere-shaded.
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if ((j === 0 || j === h - 1) && (i === 0 || i === w - 1)) continue;
      if (j === h - 1 && i < n(3)) continue;
      hp(hd, x + i, y + j, skin, { lo: 2, hi: 4, bias: 0.12 });
    }
  // Cheek/jaw: a darker back edge and chin line.
  for (let j = n(4); j < h - 1; j++) px(x, y + j, skin, 2);
  const ey = y + Math.round(h * 0.5);
  const nxX = x + w - n(3) - (hiRes() ? 1 : 0);
  const fx = x + Math.round(w * 0.42);
  const mx = nxX - (hiRes() ? 1 : 0);
  const my = y + h - n(2);
  // Ear.
  const showEar = (L.hairStyle === 'short' || L.hairStyle === 'topknot' || L.hairStyle === 'spiky' || L.hairStyle === 'none' || L.hairStyle === 'ponytail') && !isFolk();
  if (sp === 'tengu') hairCap(hd);
  if (sp && isFolk()) folkFace(hd, ey, nxX, fx, mx, my);
  if (!sp || !isFolk()) {
    hairCap(hd);
    if (showEar) {
      px(x + n(4), ey, skin, 3);
      px(x + n(4), ey + 1, skin, 2);
      if (hiRes()) px(x + n(4) + 1, ey + 1, skin, 1);
    }
    // Nose bump on the profile.
    px(x + w, ey + n(2), skin, 3);
    eyes(nxX, fx, ey, kind, false);
    brows(nxX, fx, ey, kind, L.hair === 'none' || L.hairStyle === 'none' ? skin : hairR());
    mouth(mx, my, kind, skin);
    beard(hd, L.beard, mx, my);
    marks(hd, L.mark, nxX, fx, ey, mx, my);
  }
  hat(hd);
}

/** Beast-folk faces. */
function folkFace(hd: Head, ey: number, nxX: number, fx: number, mx: number, my: number): void {
  const L = A.look;
  const { x, y, w, h } = hd;
  const fur = L.skin;
  const hr = hairR();
  const kind = L.face ?? 'calm';
  switch (L.species) {
    case 'fox': {
      // White cheeks and a pointed muzzle.
      rows(ey + 1, y + h - 1, (yy) => [x + n(4) + (yy - ey) - 1, x + w - 1], 'snow', { lo: 3, hi: 5 });
      rect(x + w, ey + n(1), N(2), N(2), fur, 3);
      px(x + w, ey + n(1) + N(2), 'snow', 4);
      px(x + w + N(2), ey + n(1), 'ink', 0);
      eyes(nxX, fx, ey, kind === 'calm' ? 'sly' : kind, false);
      px(nxX + 1, ey - 1, fur, 1);
      break;
    }
    case 'tanuki': {
      // Dark eye mask and pale muzzle.
      ell(x + w - n(1), ey + n(3), N(2.5), N(2), 'bone', { lo: 3, hi: 5 });
      rows(ey, ey + 1, () => [nxX - n(1), nxX + N(2)], 'ink', { lo: 2, hi: 3 });
      rows(ey, ey + 1, () => [fx - n(1), fx + n(1)], 'ink', { lo: 2, hi: 3 });
      px(x + w + n(1), ey + n(2), 'ink', 0);
      px(nxX, ey, 'snow', 5);
      px(nxX + 1, ey, 'ink', 0);
      px(nxX + 1, ey + 1, 'gold', 3);
      px(fx, ey + 1, 'gold', 2);
      // Top fur tuft.
      for (let i = 1; i < w - 1; i += 2) px(x + i, y - 1, fur, 3);
      break;
    }
    case 'monkey': {
      // A heart-shaped bare face inside a fur ring.
      rows(ey - 1, y + h - 1, (yy) => [x + n(4) + (yy < ey ? n(1) : 0), x + w - 1], 'pink', { lo: 2, hi: 4, bias: 0.1 });
      rect(x + w - n(1), ey + n(2), N(2), N(2), 'pink', 3);
      px(x + w + n(1) - 1, ey + n(2), 'pink', 1);
      eyes(nxX, fx, ey, kind, false);
      px(nxX, ey - 1, 'pink', 1);
      px(nxX + 1, ey - 1, 'pink', 1);
      mouth(mx, my, kind === 'calm' ? 'grin' : kind, 'pink');
      // Ear.
      px(x + n(3), ey, 'pink', 3);
      px(x + n(3), ey + 1, 'pink', 2);
      break;
    }
    case 'kappa': {
      // Hair ring around the dish, beak.
      for (let i = -1; i <= w; i++) px(x + i, y + (i % 2 === 0 ? 1 : 2), hr, i % 3 === 0 ? 2 : 3);
      for (let j = 0; j < n(5); j++) px(x - 1, y + 1 + j, hr, 2);
      rows(ey + n(1), ey + n(3), (yy) => [nxX - n(1), x + w + (yy === ey + n(2) ? n(2) : n(1))], 'gold', { lo: 2, hi: 4 });
      line(nxX - n(1), ey + n(2), x + w + n(2), ey + n(2), 'gold', 1);
      eyes(nxX - n(1), fx - n(1), ey - 1, kind, false);
      px(fx + n(1), ey + n(3), 'jade', 1);
      break;
    }
    case 'rabbit': {
      px(x + w, ey + n(2), 'pink', 4);
      rect(x + w - n(2), ey + n(3), N(1), N(2), 'snow', 5);
      px(x + w - n(1), ey + n(2), fur, 2);
      px(nxX, ey, 'ink', 0);
      px(nxX + 1, ey, 'ink', 0);
      px(nxX, ey + 1, 'red', 3);
      px(nxX + 1, ey + 1, 'snow', 5);
      px(fx, ey, 'ink', 0);
      px(fx, ey + 1, 'red', 2);
      // Cheek fluff.
      px(x + w - 1, y + h - 1, fur, 5);
      break;
    }
    case 'tengu': {
      // Red face with a long proud nose and bushy white brows.
      const len = N(5) + (A.pose === 'strike' ? n(1) : 0);
      for (let i = 0; i < len; i++) {
        px(x + w - 1 + i, ey + n(1), L.skin, i < len - 1 ? 4 : 3);
        px(x + w - 1 + i, ey + n(1) + 1, L.skin, i < len - 1 ? 2 : 1);
      }
      eyes(nxX - n(1), fx - n(1), ey, kind === 'calm' ? 'fierce' : kind, false);
      rect(nxX - n(2), ey - n(1) - 1, N(4), 1, hr, 5);
      px(nxX + n(2), ey - n(2), hr, 4);
      mouth(mx - n(1), my, kind === 'calm' ? 'stern' : kind, L.skin);
      beard(hd, L.beard, mx - n(1), my);
      break;
    }
    case 'crow': {
      // Feathered head with a heavy beak.
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((j === 0 || j === h - 1) && (i === 0 || i === w - 1)) continue; else hp(hd, x + i, y + j, L.skin, { lo: 2, hi: 5, bias: 0.15 });
      for (let j = 1; j < h; j += 2) for (let i = (j >> 1) % 3; i < w - n(2); i += 3) px(x + i, y + j, L.skin, 2);
      rows(ey + n(1), ey + n(3), (yy) => [x + w - n(2), x + w + n(4) - (yy - ey - n(1)) * 2], 'steel', { lo: 1, hi: 4 });
      px(x + w + n(1), ey + n(1), 'steel', 5);
      line(x + w - n(1), ey + n(2), x + w + n(2), ey + n(2), 'ink', 0);
      px(nxX - n(1), ey, 'gold', 5);
      px(nxX - n(1) + 1, ey, 'ink', 0);
      px(nxX - n(2), ey - 1, L.skin, 0);
      px(fx - n(1), ey, 'gold', 3);
      // Crest feathers.
      for (let i = 0; i < 3; i++) px(x + n(1) + i, y - 1 - (i % 2), hr, 2 + (i % 2));
      break;
    }
    default:
      break;
  }
  if (L.mark && L.mark !== 'none') marks(hd, L.mark, nxX, fx, ey, mx, my);
}

/** A skull with dark sockets and glowing eyes. */
function skull(hd: Head): void {
  const { x, y, w, h } = hd;
  const bone = A.look.skin === 'skin' ? 'bone' : A.look.skin;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if ((j === 0 || j === h - 1) && (i === 0 || i === w - 1)) continue;
      if (j >= h - n(3) && i < n(4)) continue;
      hp(hd, x + i, y + j, bone, { lo: 2, hi: 5, bias: 0.05 });
    }
  const ey = y + Math.round(h * 0.42);
  const nxX = x + w - n(4);
  const fx = x + Math.round(w * 0.38);
  // Sockets.
  rect(nxX, ey, N(3), N(3), 'ink', 0);
  rect(fx, ey, N(2), N(3), 'ink', 0);
  const er = A.look.eyes ?? 'red';
  if (A.frame !== 4) {
    px(nxX + n(1), ey + n(1), er, 5);
    px(fx, ey + n(1), er, 4);
  }
  // Nose hole and teeth.
  px(x + w - n(2), ey + n(3), 'ink', 1);
  const ty = y + h - n(3);
  for (let i = n(4); i < w; i++) {
    px(x + i, ty, 'ink', 0);
    px(x + i, ty + 1, bone, i % 2 ? 4 : 3);
    px(x + i, ty + 2, 'ink', i % 2 ? 0 : 1);
  }
  // Cracks.
  px(x + n(3), y + n(1), bone, 1);
  px(x + n(4), y + n(2), bone, 1);
  px(x + n(4), y + n(3), bone, 1);
}

// ------------------------------------------------------------ hats

export function hat(hd: Head): void {
  const L = A.look;
  const t = L.hat ?? 'none';
  const { x, y, w, h } = hd;
  const mid = x + Math.floor(w / 2);
  const tr = trimR();
  // Beast-folk ears come with the species.
  const sp = L.species;
  if (sp === 'rabbit') rabbitEars(hd);
  if ((sp === 'fox' || sp === 'tanuki') && t !== 'ears') animalEars(hd, sp === 'tanuki');
  if (sp === 'kappa' && t !== 'dish') dish(hd);
  if (t === 'none' || t === 'sun' || t === 'crescent' || t === 'hood') return;
  newPart();
  switch (t) {
    case 'kasa': {
      // Wide conical straw hat with woven rings.
      const half = Math.floor(w / 2) + N(4);
      const H = N(5);
      const top = y - H + n(2);
      for (let i = 0; i < H; i++) {
        const hw = Math.max(1, Math.round(half * ((i + 0.6) / H)));
        for (let xx = -hw; xx <= hw; xx++) {
          const b = light(xx / (hw + 1), -0.4 + (i / H) * 0.6);
          const s = quant(b, mid + xx, top + i, { lo: 1, hi: 5, bias: 0.05 });
          px(mid + xx + n(1), top + i, 'gold', (i + (xx & 1)) % 2 === 0 && i > 0 ? Math.max(1, s - 1) : s);
        }
      }
      line(mid - half + n(1), top + H - 1, mid + half + n(1), top + H - 1, 'wood', 2);
      px(mid + n(1), top - 1, 'gold', 5);
      // Chin tie.
      line(mid + n(3), top + H, mid + n(2), y + h - n(1), 'wood', 1);
      break;
    }
    case 'jingasa': {
      // A flat lacquered war hat with a gold mon.
      const half = Math.floor(w / 2) + N(3);
      const top = y - n(1);
      for (let i = 0; i < N(3); i++) {
        const hw = Math.round(half * (0.45 + (i / N(3)) * 0.55));
        for (let xx = -hw; xx <= hw; xx++) px(mid + xx + n(1), top + i, 'ink', quant(light(xx / (hw + 1), -0.5), mid + xx, top + i, { lo: 1, hi: 5 }));
      }
      line(mid - half + n(1), top + N(3) - 1, mid + half + n(1), top + N(3) - 1, 'ink', 1);
      px(mid + n(1), top, 'gold', 5);
      px(mid + n(1), top + 1, 'gold', 3);
      break;
    }
    case 'crown': {
      const cw = Math.max(5, w - N(3));
      const cx2 = mid - Math.floor(cw / 2) + n(1);
      box(cx2, y - N(3), cw, N(2), 'gold', { lo: 2, hi: 5, metal: true });
      for (let i = 0; i < cw; i += 2) px(cx2 + i, y - N(3) - 1, 'gold', 5);
      px(cx2 + Math.floor(cw / 2), y - N(2) - 1, L.accent === 'gold' ? 'red' : L.accent, 4);
      if (hiRes()) px(cx2 + 1, y - N(2), 'jade', 4);
      break;
    }
    case 'horns':
    case 'horn': {
      const hornR = L.skin === 'gold' ? 'bone' : 'bone';
      const list: [number, number][] = t === 'horn' ? [[mid + n(1), 0]] : [
        [x + n(3), -1],
        [x + w - n(3), 0.6],
      ];
      const len = N(t === 'horn' ? 5 : 4.5) + (A.big ? n(1) : 0);
      for (const [hx, dir] of list) {
        for (let i = 0; i < len; i++) {
          const wdt = i < len / 2 ? N(2) : 1;
          for (let j = 0; j < wdt; j++) px(hx + Math.round(dir * i * 0.45) + j, y - i, hornR, i >= len - 1 ? 5 : j === 0 ? 4 : 2);
        }
        px(hx, y, hornR, 1);
      }
      break;
    }
    case 'halo': {
      newPart({ seam: false, rim: false });
      const hy = y - N(3) - (A.frame === 1 ? 1 : 0);
      const hw = Math.floor(w / 2);
      line(mid - hw + 2, hy, mid + hw - 1, hy, 'gold', 5);
      line(mid - hw + 2, hy + 2, mid + hw - 1, hy + 2, 'gold', 3);
      px(mid - hw + 1, hy + 1, 'gold', 4);
      px(mid + hw, hy + 1, 'gold', 3);
      glint(mid, hy - 1, 'rgba(255,240,160,0.5)');
      break;
    }
    case 'ears':
      animalEars(hd, false);
      break;
    case 'mask': {
      // A kitsune festival mask worn on the side of the head.
      rbox(x - n(1), y - n(1), N(4), N(5), 'snow', { lo: 3, hi: 5 });
      px(x, y + n(1), 'red', 3);
      px(x + n(2), y + n(1), 'red', 3);
      line(x, y + n(3), x + n(2), y + n(3), 'red', 3);
      px(x - n(1), y - n(2), 'snow', 4);
      px(x + n(2), y - n(2), 'snow', 4);
      break;
    }
    case 'helm': {
      // Kabuto: bowl, neck guard and a gold kuwagata crest.
      const m = L.main;
      rows(y - n(2), y + n(2), (yy) => [x - n(1) + (yy === y - n(2) ? n(1) : 0), x + w - (yy === y - n(2) ? n(1) : 0)], m, { lo: 1, hi: 5, metal: true });
      for (let i = 0; i < N(4); i++) rows(y + n(2) + i, y + n(2) + i, () => [x - n(2) - Math.floor(i / 2), x + n(3)], m, { lo: 1, hi: 3 });
      for (let i = 0; i < N(4); i += 2) line(x - n(2) - Math.floor(i / 2), y + n(2) + i, x + n(3), y + n(2) + i, m, 1);
      line(x + n(2), y + n(1), x + w, y + n(1), 'gold', 4);
      // Crest.
      for (let i = 0; i < N(5); i++) {
        px(mid - Math.round(i * 0.6), y - n(2) - i, 'gold', i === N(5) - 1 ? 5 : 4);
        px(mid + n(1) + Math.round(i * 0.6), y - n(2) - i, 'gold', 3);
      }
      px(mid, y - n(2), tr === 'gold' ? 'red' : tr, 4);
      break;
    }
    case 'antlers': {
      for (const [ax, dir] of [
        [x + n(2), -1],
        [x + w - n(3), 1],
      ] as const) {
        for (let i = 0; i < N(6); i++) px(ax + Math.round(dir * i * 0.5), y - 1 - i, 'gold', i > N(4) ? 5 : 4);
        px(ax + dir * N(2), y - N(3), 'gold', 4);
        px(ax + dir * N(3), y - N(4), 'gold', 5);
        px(ax + dir * N(1), y - N(5), 'gold', 5);
      }
      break;
    }
    case 'eboshi': {
      // A tall black court hat leaning back.
      rows(y - N(7), y + n(1), (yy) => {
        const t2 = y + n(1) - yy;
        return [x + n(1) - Math.floor(t2 / 3), x + w - n(3) - Math.floor(t2 / 2)];
      }, 'ink', { lo: 1, hi: 5, metal: true });
      line(x + n(1), y + n(1), x + w - n(2), y + n(1), tr, 3);
      break;
    }
    case 'tokin': {
      // A small black pillbox on the forehead with a chin cord.
      const tx = x + Math.floor(w * 0.45);
      rbox(tx, y - N(2), N(4), N(3), 'ink', { lo: 2, hi: 5 });
      px(tx + n(1), y - N(2), 'ink', 5);
      line(tx + N(4) - 1, y + n(1), tx + N(4) - 1, y + h - n(2), 'ink', 2);
      break;
    }
    case 'headband': {
      const hb = L.hair === 'snow' || L.hair === 'bone' || L.hair === 'none' ? 'red' : 'snow';
      line(x - 1, y + n(3), x + w - 1, y + n(2), hb, 4);
      if (hiRes()) line(x - 1, y + n(3) + 1, x + w - 1, y + n(2) + 1, hb, 2);
      // Knot tails flutter behind.
      const s = sway();
      line(x - 1, y + n(3), x - N(4), y + n(4) + s, hb, 3);
      line(x - 1, y + n(4), x - N(3), y + n(6) + s, hb, 2);
      px(x + w - n(3), y + n(2), 'snow', 5);
      break;
    }
    case 'leaf': {
      // A tanuki's transformation leaf.
      const lx = mid - n(1);
      const ly = y - N(2);
      ell(lx, ly, N(2.5), N(1.5), 'moss', { lo: 2, hi: 5 });
      line(lx - N(3), ly + 1, lx + N(2), ly - 1, 'moss', 1);
      px(lx + N(3), ly - 1, 'moss', 4);
      break;
    }
    case 'dish':
      dish(hd);
      break;
    case 'imperial': {
      // Mianguan: a flat board with bead strings hanging front and back.
      box(x + n(2), y - N(3), w - n(3), N(2), 'ink', { lo: 1, hi: 4 });
      line(x, y - N(4), x + w, y - N(4), 'gold', 4);
      line(x, y - N(4) - 1, x + w, y - N(4) - 1, 'ink', 3);
      for (const bx of [x, x + w])
        for (let i = 0; i < N(2); i++) px(bx, y - N(3) + i, i % 2 ? 'red' : 'jade', 4);
      px(mid, y - N(3), 'gold', 5);
      break;
    }
    case 'hannya': {
      // The hannya mask covers the face: pale, horned, with a snarl.
      newPart({ seam: false });
      rows(y + n(2), y + h - 1, (yy) => [x + n(3), x + w - (yy > y + h - n(3) ? 0 : 1)], 'snow', { lo: 3, hi: 5 });
      const ey = y + Math.round(h * 0.45);
      px(x + w - n(3), ey, 'gold', 5);
      px(x + w - n(2), ey, 'ink', 0);
      px(x + n(5), ey, 'gold', 4);
      line(x + w - n(4), ey - 1, x + w - n(2), ey - 2, 'ink', 0);
      // Snarling mouth with fangs.
      rect(x + n(5), y + h - n(3), w - n(5), N(2), 'red', 2);
      px(x + n(6), y + h - n(3), 'snow', 5);
      px(x + w - n(2), y + h - n(3), 'snow', 5);
      for (const [hx, dir] of [
        [x + n(3), -1],
        [x + w - n(3), 1],
      ] as const)
        for (let i = 0; i < N(4); i++) px(hx + Math.round(dir * i * 0.5), y + n(1) - i, 'gold', i === N(4) - 1 ? 5 : 3);
      break;
    }
    case 'kanzashi': {
      // Ornate hairpins with dangling flowers.
      line(x + n(1), y + n(1), x + n(5), y - n(2), 'gold', 4);
      px(x + n(5), y - n(2), tr, 5);
      px(x + n(2), y - n(1), 'pink', 4);
      for (let i = 0; i < N(3); i++) px(x - n(1), y + n(2) + i, i % 2 ? 'gold' : tr, 4);
      break;
    }
    default:
      break;
  }
}

function animalEars(hd: Head, round: boolean): void {
  newPart();
  const L = A.look;
  const r = L.species === 'fox' || L.species === 'tanuki' ? L.skin : hairR();
  const { x, y, w } = hd;
  for (const [ex, back] of [
    [x + n(1), true],
    [x + w - n(4), false],
  ] as const) {
    const H = round ? N(2) : N(4);
    for (let i = 0; i < H; i++) {
      const ww = round ? N(3) : Math.max(1, N(3) - Math.floor((i * 3) / H));
      for (let j = 0; j < ww; j++) px(ex + j + (round ? 0 : Math.floor(i / 2)), y - i, r, back ? 2 : j === 0 ? 4 : 3);
    }
    if (!round) {
      px(ex + n(1), y - 1, 'pink', back ? 2 : 3);
      // Black ear tips for foxes.
      if (L.species === 'fox' || L.hat === 'ears') px(ex + Math.floor((H - 1) / 2), y - H + 1, 'ink', 2);
    }
  }
}

function rabbitEars(hd: Head): void {
  newPart();
  const fur = A.look.skin;
  const { x, y, w } = hd;
  const s = A.frame === 1 ? 1 : 0;
  for (const [ex, lean, back] of [
    [x + n(3), -1, true],
    [x + w - n(4), 0, false],
  ] as const) {
    const H = N(8);
    for (let i = 0; i < H; i++) {
      const xx = ex + Math.round(lean * i * 0.3) - (i > H - 3 && !back ? s : 0);
      px(xx, y - i, fur, back ? 2 : 4);
      px(xx + 1, y - i, back ? fur : 'pink', back ? 2 : 3);
      if (A.k > 1) px(xx + 2, y - i, fur, back ? 1 : 3);
    }
  }
}

function dish(hd: Head): void {
  newPart();
  const { x, y, w } = hd;
  const cx = x + Math.floor(w / 2) + n(1);
  rows(y - n(1), y, (yy) => (yy === y - n(1) ? [cx - N(2), cx + N(2)] : [cx - N(3), cx + N(3)]), 'bone', { lo: 3, hi: 5 });
  line(cx - N(2), y - n(1), cx + n(1), y - n(1), 'teal', 4);
  px(cx - n(1), y - n(1), 'teal', 5);
}
