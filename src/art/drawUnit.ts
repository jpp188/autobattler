/**
 * The code-drawn hi-bit pixel-art composer. Every unit is described by a
 * SpriteLook (body, palette ramps, build, species, hair, face, hat, weapon,
 * gear, patterns) and drawn here, facing right, in 5 frames:
 *   0, 1  idle (breathing bob)
 *   2     attack wind-up
 *   3     attack strike (lunge)
 *   4     hit flash (white silhouette)
 * Shapes are drawn into a material buffer (see raster.ts) that adds volume
 * shading, seams, coloured outlines and rim light when the frame is resolved.
 * Sizes are parametric so the same look renders at 32×32 (units) and 48×48
 * (Heroes); Heroes get extra 1-pixel detail.
 */
import type { SpriteLook } from '../core/types';
import { A, N, hiRes, lowerR, n, pattern, pose, trimR } from './ctx';
import { aura, backGear, cape, emblem, neckPiece, prop, ribbons, scarf, scarfWrap, tail, weapon, wings } from './gear';
import type { Torso } from './gear';
import { head, headBack } from './heads';
import type { Head } from './heads';
import { bird, golem, quadruped, serpent, slime, spider, spirit } from './beasts';
import { begin, box, ell, finish, limb, line, newPart, px, rect, rows } from './raster';

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------ biped helpers

function isFolkBody(): boolean {
  const s = A.look.species;
  return A.look.body === 'beast' || s === 'fox' || s === 'tanuki' || s === 'monkey' || s === 'kappa' || s === 'rabbit';
}

/** Ramp of sleeves and arms. */
function armRamp(): string {
  const L = A.look;
  if (L.body === 'oni') return L.skin;
  if (L.body === 'skeleton') return L.skin === 'skin' ? 'bone' : L.skin;
  if (isFolkBody() && L.main === L.skin) return L.skin;
  return L.main;
}

function hand(x: number, y: number): void {
  const L = A.look;
  newPart();
  const r = L.body === 'skeleton' ? (L.skin === 'skin' ? 'bone' : L.skin) : L.skin;
  rect(x - 1, y - 1, N(2), N(2), r, 3);
  px(x - 1, y - 1, r, 4);
  if (hiRes()) {
    px(x + 1, y + 1, r, 2);
    px(x - 1, y + 1, r, 2);
  }
}

function pauldrons(t: Torso): void {
  const L = A.look;
  const kind = L.pauldron ?? (L.body === 'armor' ? 'layered' : 'none');
  if (kind === 'none') return;
  const m = L.main;
  const tr = trimR();
  for (const [x, back] of [
    [t.tl - N(2), true],
    [t.tl + t.tw - N(3), false],
  ] as const) {
    newPart();
    const y = t.top - n(1);
    switch (kind) {
      case 'round':
        ell(x + N(2), y + N(2), N(2.5), N(2), m, { lo: 1, hi: 5, metal: true, bias: back ? -0.2 : 0 });
        px(x + N(2), y + N(2), 'gold', 5);
        break;
      case 'layered':
        // O-sode: stacked laced plates.
        for (let i = 0; i < 3; i++) {
          box(x - (back ? 0 : 0), y + i * N(1.5), N(5), N(2), m, { lo: back ? 1 : 2, hi: back ? 3 : 5, metal: true });
          for (let j = 1; j < N(5); j += 2) px(x + j, y + i * N(1.5) + N(1), tr, back ? 2 : 3);
        }
        break;
      case 'spiked':
        ell(x + N(2), y + N(2), N(2.5), N(2), m, { lo: 1, hi: 4, metal: true, bias: back ? -0.2 : 0 });
        px(x + N(2), y - n(1), 'steel', 5);
        px(x + N(2), y, 'steel', 4);
        px(x, y + n(1), 'steel', 4);
        break;
      case 'fur':
        ell(x + N(2), y + N(1), N(3), N(2), L.trim ?? 'bone', { lo: 2, hi: 5, dither: 1 });
        for (let j = 0; j < N(5); j += 2) px(x + j, y + N(3), L.trim ?? 'bone', 2);
        break;
      default:
        break;
    }
  }
}

/** Belt or sash at the waist. */
function sash(t: Torso, y: number, robe: boolean): void {
  const L = A.look;
  const kind = L.sash ?? 'plain';
  const r = L.accent === L.main ? trimR() : L.accent;
  newPart({ seam: false });
  const h = robe ? N(2) : N(1);
  box(t.tl, y, t.tw, h, kind === 'gold' ? 'gold' : r, { lo: 2, hi: kind === 'gold' ? 5 : 4, metal: kind === 'gold' });
  if (kind === 'checker') for (let x = t.tl; x < t.tl + t.tw; x++) for (let j = 0; j < h; j++) if ((x + j) % 2) px(x, y + j, 'snow', 4);
  if (kind === 'rope') for (let x = t.tl; x < t.tl + t.tw; x++) px(x, y + (x % 2), 'bone', x % 2 ? 3 : 5);
  if (kind === 'wave') for (let x = t.tl; x < t.tl + t.tw; x += 2) px(x, y, 'snow', 4);
  // Knot at the front with hanging tails.
  if (robe || kind === 'rope') {
    const kx = t.tl + t.tw - n(2);
    px(kx, y + h, kind === 'rope' ? 'bone' : r, 2);
    px(kx, y + h + 1, kind === 'rope' ? 'bone' : r, 3);
  } else px(t.cx + n(1), y, 'gold', 5);
}

// ------------------------------------------------------------ the biped rig

function biped(): void {
  const L = A.look;
  const body = L.body;
  const ps = A.pose;
  const folk = isFolkBody();
  const skeleton = body === 'skeleton';
  const build = L.build ?? (body === 'oni' ? 'heavy' : 'normal');
  const height = L.height ?? 'normal';
  const big = A.big ? 1 : 0;
  const tw = N(build === 'slim' ? 8 : build === 'heavy' ? 12 : 10) + n(big);
  const th = N(height === 'short' ? 6 : height === 'tall' ? 8 : 7) + n(big);
  const legH = N(height === 'short' ? 3 : height === 'tall' ? 5 : 4);
  const hw = N(build === 'heavy' ? 11 : 10) + (skeleton && A.big ? N(2) : 0);
  const hh = N(9) + (skeleton && A.big ? N(1) : 0);
  const lean = ps === 'windup' ? -1 : 0;
  const cx = A.cx;
  const top = A.base - legH - th + A.bob;
  const tl = cx - Math.floor(tw / 2) + lean;
  const hd: Head = { x: cx - Math.floor(hw / 2) + n(1) + lean, y: top - hh + n(1), w: hw, h: hh };
  const t: Torso = { tl, top, tw, th, cx: cx + lean, hx: hd.x, hy: hd.y, hw };
  const robe = body === 'robe';
  const waist = top + th - N(2);
  const main = L.main;
  const aw = N(build === 'heavy' ? 3.5 : build === 'slim' ? 2 : 2.6) + (skeleton ? -n(1) : 0);

  // ---- Behind the body.
  if (L.extra === 'cape') cape(t, A.base - n(1));
  backGear(t);
  if (L.extra === 'wings') wings(tl + n(2), top + n(2), L.wingStyle === 'cloud' ? 'snow' : L.wingStyle === 'crow' ? 'ink' : main);
  if (L.extra === 'tail') tail(tl + n(1), A.base - legH - n(1), folk ? L.skin : L.hair === 'none' ? L.skin : L.hair);
  if (L.extra === 'scarf') scarf(t);
  if (L.extra === 'ribbons') ribbons(t);
  headBack(hd);

  // ---- Back arm and off-hand prop.
  const arm = armRamp();
  const bsx = tl + n(2);
  const bsy = top + n(2);
  const bh: [number, number] = ps === 'windup' ? [tl - n(2), top + n(4)] : ps === 'strike' ? [tl + n(1), top + n(5)] : [tl - n(1), top + N(6)];
  if (L.prop === 'sake_cup' || L.prop === 'conch' || L.prop === 'lantern') {
    bh[0] = tl - n(1);
    bh[1] = top + n(1);
  }
  newPart();
  limb(bsx, bsy, bh[0], bh[1] - n(1), aw, aw + (robe ? n(1) : 0), arm, { lo: 1, hi: 3, bias: -0.15 });
  if (L.weapon === 'daggers' || L.weapon === 'drumsticks') {
    const f = A.frame;
    A.pose = f === 3 ? 'windup' : 'idle';
    weapon(bh[0], bh[1]);
    A.pose = ps;
  }
  hand(bh[0], bh[1]);
  prop(bh[0], bh[1], t);

  // ---- Legs and feet.
  const stride = ps === 'strike' ? n(2) : 0;
  const legW = N(build === 'heavy' ? 4 : build === 'slim' ? 2.5 : 3) - (skeleton ? n(1) : 0);
  const legR = body === 'oni' || (folk && L.main === L.skin) ? L.skin : skeleton ? (L.skin === 'skin' ? 'bone' : L.skin) : lowerR();
  for (const [lx, back] of [
    [cx - legW - stride + lean, true],
    [cx + n(1) + stride + lean, false],
  ] as const) {
    newPart();
    if (!robe) box(lx, A.base - legH - n(1), legW, legH + n(1), legR, { lo: back ? 1 : 2, hi: back ? 2 : 4 });
    // Shin guards for armour, wraps for light bodies.
    if (body === 'armor') box(lx, A.base - N(3), legW, N(2), main, { lo: back ? 1 : 2, hi: back ? 3 : 5, metal: true });
    if (body === 'light' && !folk) for (let y = A.base - N(3); y < A.base - 1; y += 2) line(lx, y, lx + legW - 1, y, 'bone', back ? 2 : 4);
    // Feet.
    const footR = folk || body === 'oni' ? L.skin : skeleton ? (L.skin === 'skin' ? 'bone' : L.skin) : body === 'armor' ? 'ink' : robe ? 'snow' : 'ink';
    box(lx, A.base - 1, legW + n(1), 1, footR, { lo: back ? 1 : 2, hi: back ? 2 : 4 });
    if (robe) line(lx, A.base - 1, lx + legW, A.base - 1, 'wood', back ? 1 : 2);
    if (folk || body === 'oni') px(lx + legW, A.base - 1, L.skin, back ? 2 : 4);
  }

  // ---- Lower garment.
  if (robe) {
    newPart();
    const lr = lowerR();
    const y1 = A.base - n(2);
    rows(waist, y1, (y) => {
      const f = Math.round(((y - waist) / (y1 - waist)) * N(2));
      return [tl - f, tl + tw - 1 + f];
    }, lr, { lo: 1, hi: 4, round: 0.7 });
    // Pleats.
    for (let x = tl + n(2); x < tl + tw; x += N(3)) line(x, waist + N(2), x - n(1), y1, lr, 1);
    if (L.trim) line(tl - N(2), y1, tl + tw - 1 + N(2), y1, L.trim, 3);
    pattern(L.pattern, tl - N(2), waist, tl + tw + N(2), y1, trimR());
  } else if (body === 'armor') {
    newPart();
    rows(waist + n(1), waist + N(4), (y) => [tl - n(1) - Math.floor((y - waist) / 3), tl + tw + Math.floor((y - waist) / 3)], main, { lo: 1, hi: 5, metal: true });
    for (let y = waist + N(2); y <= waist + N(4); y += N(2)) line(tl - n(1), y, tl + tw, y, main, 1);
    for (let x = tl + n(1); x < tl + tw; x += N(3)) line(x, waist + n(1), x, waist + N(4), main, 1);
    for (let x = tl; x < tl + tw; x += 2) px(x, waist + N(3), trimR(), 3);
  } else if (body === 'oni' || skeleton || (folk && L.main === L.skin)) {
    // Loincloth or fur shorts.
    newPart();
    const lr = L.lower ?? (body === 'oni' ? main : skeleton ? main : 'wood');
    if (!(skeleton && lr === L.skin)) {
      box(tl, waist, tw, N(3), lr, { lo: 1, hi: 4 });
      rows(waist + N(3), waist + N(5), (y) => [t.cx - n(1) - (waist + N(5) - y) + n(1), t.cx + n(2)], lr, { lo: 2, hi: 4 });
      pattern(L.pattern, tl, waist, tl + tw, waist + N(5), 'ink');
    }
  } else {
    // Tunic skirt over the hips.
    newPart();
    box(tl - n(1), waist, tw + n(2), N(3), main, { lo: 1, hi: 4 });
    line(tl - n(1), waist + N(3) - 1, tl + tw, waist + N(3) - 1, main, 1);
    pattern(L.pattern, tl - n(1), waist, tl + tw + n(1), waist + N(3), trimR());
  }

  // ---- Torso.
  newPart();
  const heavyBelly = (build === 'heavy' && folk) || L.species === 'tanuki';
  const torsoRamp = body === 'oni' || (folk && L.main === L.skin) ? L.skin : skeleton ? 'ink' : main;
  if (skeleton) {
    // Spine and ribcage.
    const bone = L.skin === 'skin' ? 'bone' : L.skin;
    line(t.cx - n(1), top, t.cx - n(1), waist + n(1), bone, 2);
    for (let y = top + n(1); y < waist; y += 2) {
      const w2 = Math.round((tw / 2) * (1 - ((y - top) / th) * 0.35));
      for (let x = t.cx - w2; x <= t.cx + w2 - n(1); x++) px(x, y, bone, x < t.cx ? 4 : 3);
      px(t.cx + w2 - n(1), y + 1, bone, 2);
    }
    rect(t.cx - N(3), waist, N(5), N(2), bone, 3);
    if (main !== bone && main !== L.skin) {
      // Scraps of old armour.
      newPart();
      box(tl, top, Math.floor(tw / 2), N(4), main, { lo: 1, hi: 4, metal: true });
      for (let x = tl; x < tl + Math.floor(tw / 2); x += 2) px(x, top + N(2), trimR(), 3);
    }
  } else {
    rows(top, waist + n(1), (y) => {
      const r = (y - top) / th;
      const pinch = !heavyBelly && build !== 'heavy' && r > 0.55 && r < 0.95 ? n(1) : 0;
      const belly = heavyBelly && r > 0.35 ? n(1) + (r > 0.55 && r < 0.9 ? n(1) : 0) : 0;
      return [tl + pinch - (heavyBelly ? n(0) : 0), tl + tw - 1 - pinch + belly];
    }, torsoRamp, { lo: 1, hi: 4, metal: body === 'armor', dither: body === 'armor' ? 0 : 0.35 });
    if (body === 'armor') {
      // Do: laced horizontal lames.
      for (let y = top + N(2); y < waist; y += N(2)) {
        line(tl + n(1), y, tl + tw - 2, y, main, 1);
        for (let x = tl + n(1) + (y % 2); x < tl + tw - 1; x += 2) px(x, y + 1, trimR(), 3);
      }
      px(tl + n(2), top + n(1), main, 5);
    } else if (body === 'oni') {
      // Muscles, then an open vest in the main colour.
      line(t.cx, top + N(2), t.cx, waist, L.skin, 1);
      line(tl + n(2), top + N(3), t.cx - n(1), top + N(3), L.skin, 2);
      line(t.cx + n(1), top + N(3), tl + tw - n(2), top + N(3), L.skin, 2);
      for (let y = top + N(5); y < waist; y += 2) {
        px(t.cx - n(1), y, L.skin, 2);
        px(t.cx + n(1), y, L.skin, 2);
      }
      px(tl + n(2), top + n(1), L.skin, 5);
      if (main !== L.skin) {
        newPart();
        rows(top, waist, (y) => [tl, tl + N(3) - Math.floor((y - top) / 4)], main, { lo: 1, hi: 4 });
        rows(top, waist, (y) => [tl + tw - N(2) + Math.floor((y - top) / 5), tl + tw - 1], main, { lo: 1, hi: 4 });
        pattern(L.pattern, tl, top, tl + tw, waist, L.pattern === 'stripes' ? 'ink' : trimR());
      }
    } else if (folk && L.main === L.skin) {
      // Bare fur with a pale belly.
      ell(t.cx + n(1), top + Math.round(th * 0.6), Math.floor(tw / 2) - n(1) + (heavyBelly ? n(1) : 0), Math.floor(th / 2) - n(1), L.species === 'kappa' ? 'gold' : 'bone', { lo: 2, hi: 5, dither: 0.5 });
      if (L.species === 'kappa') for (let y = top + N(3); y < waist; y += 2) line(t.cx - n(1), y, t.cx + N(3), y, 'gold', 2);
      if (heavyBelly) px(t.cx + n(2), top + Math.round(th * 0.6), 'bone', 1);
    } else {
      // Cloth: a crossed collar showing an inner layer.
      const inner = robe ? (L.trim ?? 'snow') : (L.trim ?? (main === 'ink' ? 'steel' : 'ink'));
      for (let i = 0; i < N(4); i++) {
        px(t.cx - n(1) + i, top + i, inner, 4);
        px(t.cx + n(1) + i, top + i, inner, 3);
        if (i < N(2)) px(t.cx + i, top + i, L.skin, 3);
      }
      line(t.cx + n(1) + N(4), top + N(4), t.cx + n(1) + N(4), waist, main, 1);
      // Folds under the arm.
      line(tl + tw - n(2), top + N(3), tl + tw - n(3), waist - n(1), main, 1);
      if (heavyBelly) ell(t.cx + n(2), top + Math.round(th * 0.62), N(3), N(2.5), L.skin === main ? 'bone' : L.skin, { lo: 2, hi: 5 });
      if (body === 'bird') for (let y = top + N(2); y < waist; y += 2) for (let x = tl + (y % 3); x < tl + tw; x += 3) px(x, y, main, 1);
    }
    if (!(body === 'oni')) pattern(L.pattern, tl, top, tl + tw, waist, body === 'beast' ? 'ink' : trimR());
  }
  if (!skeleton || main !== (L.skin === 'skin' ? 'bone' : L.skin)) sash(t, waist, robe);
  const em = L.emblem ?? 'none';
  emblem(em, t.cx + n(1), top + N(3), trimR());
  neckPiece(t);
  if (L.extra === 'scarf') scarfWrap(t);
  pauldrons(t);

  // ---- Head.
  head(hd, { skull: skeleton });

  // ---- Front arm, weapon and hand.
  const sx = tl + tw - n(2);
  const sy = top + n(2);
  let hx = sx + n(1);
  let hy = sy + N(5);
  const wpn = L.weapon ?? 'none';
  if (wpn === 'bow') {
    hx = sx + N(3);
    hy = sy + N(2);
    if (ps === 'strike') hx += n(1);
  } else if (ps === 'windup') {
    hx = sx - n(1);
    hy = sy - N(3);
  } else if (ps === 'strike') {
    hx = sx + N(6);
    hy = sy + n(1);
  }
  newPart();
  limb(sx, sy, hx, hy - (ps === 'idle' ? n(1) : 0), aw + (robe ? n(1) : 0), aw + (robe ? N(2) : 0), arm, { lo: 1, hi: 4 });
  if (body === 'armor') limb(sx + (hx - sx) * 0.5, sy + (hy - sy) * 0.5, hx, hy, aw, aw, 'ink', { lo: 1, hi: 3 });
  if (robe && L.trim) px(hx - (ps === 'strike' ? N(2) : 0), hy - (ps === 'strike' ? 0 : N(1)), L.trim, 4);
  if (wpn === 'shield') weapon(t.cx + N(4), top + N(4));
  else weapon(hx, hy);
  hand(hx, hy);
}

// ------------------------------------------------------------ entry point

/**
 * Draws one animation frame into a size×size cell at (ox, oy).
 * `glow` is the rarity colour (drawn as a soft outer outline), `boss` adds a
 * red ground mark, `flat` paints the whole sprite one colour (silhouettes).
 */
export function drawUnitFrame(ctx: Ctx, ox: number, oy: number, size: number, look: SpriteLook, frame: number, glow: string, boss: boolean, flat?: string): void {
  const k = size / 32;
  A.S = size;
  A.k = k;
  A.look = look;
  A.frame = frame;
  A.pose = pose(frame);
  A.big = !!look.big;
  A.base = size - 3;
  A.cx = Math.floor(size / 2) - 1 + (frame === 3 ? Math.round(2 * k) : frame === 2 ? -1 : 0);
  A.bob = frame === 1 ? 1 : 0;
  begin(size);
  if (look.extra === 'aura' && !flat && frame !== 4) aura();
  const b = look.body;
  const quad = b === 'beast' && (!look.weapon || look.weapon === 'none' || look.weapon === 'claws') && look.species !== 'tanuki' && look.species !== 'rabbit' && look.species !== 'monkey' && look.species !== 'kappa';
  if (b === 'spirit') spirit();
  else if (b === 'slime') slime();
  else if (b === 'golem') golem();
  else if (b === 'serpent') serpent(biped);
  else if (b === 'spider') spider();
  else if (b === 'bird' && (!look.weapon || look.weapon === 'none')) bird();
  else if (quad) quadruped();
  else biped();
  finish(ctx, ox, oy, {
    glow,
    boss,
    flash: frame === 4,
    flat,
    shadow: { cx: size / 2 - 1, cy: A.base, rx: Math.round(8 * k) + (look.big ? 1 : 0), ry: Math.max(1, Math.round(1.5 * k)) },
  });
}

