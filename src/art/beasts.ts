/**
 * Non-biped bodies: four-legged beasts by species, birds (crane, phoenix),
 * spirits (flame, wisp, chochin lantern, kodama), serpents (Orochi and
 * naga), spiders (and the spider-woman), golems (statue, stone toro) and
 * slimes.
 */
import { A, N, hairR, hiRes, n, pattern, sway, trimR } from './ctx';
import { tail, weapon, wings } from './gear';
import { hat, head } from './heads';
import type { Head } from './heads';
import { box, ell, glint, isCur as isOver, limb, line, newPart, px, rect, rows } from './raster';

// ------------------------------------------------------------ quadrupeds

export function quadruped(): void {
  const L = A.look;
  const ps = A.pose;
  const sp = L.species ?? 'fox';
  const small = L.build === 'slim' || (sp === 'fox' && !A.big);
  const pounce = ps === 'strike' ? N(3) : ps === 'windup' ? -n(1) : 0;
  const rx = N(A.big ? 9 : small ? 6 : 7) + (sp === 'tiger' && A.big ? n(1) : 0) - (sp === 'boar' ? n(1) : 0);
  const ry = N(A.big ? 5 : small ? 3.5 : 4) + (sp === 'boar' ? n(1) : 0);
  const legH = N(sp === 'kirin' ? 6 : sp === 'boar' || sp === 'tiger' ? 3.5 : small ? 3.5 : 4.5);
  const bodyCy = A.base - legH - ry + 1 + A.bob - (ps === 'strike' ? n(1) : 0);
  const bx = A.cx - n(sp === 'boar' ? 4 : 2) + pounce;
  const fur = L.main;
  const belly = L.skin === fur ? (sp === 'tiger' ? 'snow' : 'bone') : L.skin;
  const hoof = sp === 'kirin' || sp === 'boar';
  // Tail.
  if (L.extra === 'tail' || sp === 'nue') tail(bx - rx + n(2), bodyCy - n(1), sp === 'nue' ? 'moss' : L.hair === 'none' ? fur : L.hair);
  // Far legs.
  newPart();
  const legW = N(A.big ? 3 : 2.5);
  const legs = [bx - rx + N(2), bx + rx - N(4)];
  for (const lx of legs) {
    const lift = lx > bx && ps === 'strike' ? N(2) : 0;
    box(lx - n(1), bodyCy, legW, A.base - bodyCy - lift, fur, { lo: 1, hi: 2 });
    rect(lx - n(1), A.base - 1 - lift, legW + n(1), 1, hoof ? (sp === 'kirin' ? 'gold' : 'ink') : fur, 1);
  }
  // Body.
  newPart();
  ell(bx, bodyCy, rx, ry, fur, { lo: 1, hi: 4, dither: 0.5 });
  // Belly.
  rows(bodyCy + Math.floor(ry / 2), bodyCy + ry, (y) => [bx - rx + N(3) + (y - bodyCy) % 2, bx + rx - N(2)], belly, { lo: 2, hi: 4, onlyOver: true });
  // Species coat.
  if (sp === 'tiger' || sp === 'nue') pattern('stripes', bx - rx, bodyCy - ry, bx + rx, bodyCy + ry, 'ink');
  else if (sp === 'kirin') pattern('scales', bx - rx, bodyCy - ry, bx + rx, bodyCy + ry, trimR());
  else if (L.pattern) pattern(L.pattern, bx - rx, bodyCy - ry, bx + rx, bodyCy + ry, trimR());
  if (sp === 'boar') {
    // Bristle ridge along the back.
    for (let x = bx - rx + n(2); x < bx + rx - n(1); x += 2) {
      const yy = bodyCy - ry + Math.round(Math.abs(x - bx) / rx) - n(1);
      px(x, yy, hairR(), 3);
      px(x + 1, yy - 1, hairR(), 2);
    }
  }
  if (sp === 'komainu') for (let x = bx - rx + N(2); x < bx + rx - N(2); x += N(3)) ell(x, bodyCy - ry + n(1), N(1), N(1), hairR(), { lo: 2, hi: 4 });
  // Near legs.
  for (const lx of [bx - rx + N(4), bx + rx - N(2)]) {
    newPart();
    const lift = lx > bx && ps === 'strike' ? N(2) : 0;
    box(lx - n(1), bodyCy + n(1) - lift, legW + n(1), A.base - bodyCy - n(1), fur, { lo: 2, hi: 4 });
    const pawR = hoof ? (sp === 'kirin' ? 'gold' : 'ink') : sp === 'tiger' || sp === 'fox' ? 'snow' : fur;
    rect(lx - n(1), A.base - 1 - lift, legW + N(2), 1, pawR, hoof ? 3 : 4);
    if (!hoof) px(lx + legW, A.base - 1 - lift, pawR, 2);
    if (sp === 'kirin') {
      newPart({ seam: false, rim: false });
      ell(lx + n(1), A.base - n(1), N(2), N(1), 'snow', { lo: 3, hi: 5 });
    }
  }
  // Head.
  const hx = bx + rx - N(1);
  const hy = bodyCy - ry - (sp === 'boar' ? -n(1) : sp === 'kirin' ? N(4) : sp === 'tiger' ? -n(1) : N(1));
  const hr = N(A.big ? 4.5 : sp === 'fox' ? 3.8 : small ? 3.2 : 4) - (sp === 'tiger' ? n(1) : 0);
  const mane = L.hairStyle === 'mane' || sp === 'lion' || sp === 'komainu' || sp === 'kirin';
  if (mane) {
    newPart();
    const mr = hairR();
    if (sp === 'kirin') {
      limb(hx - n(1), hy, bx + rx - N(3), bodyCy - n(1), N(4), N(3), fur, { lo: 2, hi: 4 });
      for (let i = 0; i < N(5); i++) px(hx - N(2) - i, hy + n(1) + i, mr, i % 2 ? 3 : 5);
    } else {
      ell(hx - n(1), hy + n(2), hr + N(2), hr + N(2), mr, { lo: 1, hi: 4, dither: 0.8 });
      // Curls or flame tips.
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.4 + (i / 7) * 1.25);
        const R = hr + N(2.5);
        const fx = hx - n(1) + Math.cos(a) * R;
        const fy = hy + n(2) - Math.sin(a) * R;
        if (sp === 'lion') limb(fx, fy, fx + Math.cos(a) * n(2) - n(1), fy - Math.sin(a) * n(2) - n(1), N(2), 1, mr, { lo: 3, hi: 5 });
        else px(fx, fy, mr, 4);
      }
      if (sp === 'komainu') for (let i = 0; i < 5; i++) px(hx - N(2) + i * 2 - n(1), hy + N(3) + (i % 2), mr, 1);
    }
  }
  newPart();
  if (sp === 'boar') {
    // Low wedge head, flat snout disc and upturned tusks.
    const by = bodyCy - n(1);
    const bh = hx + n(1);
    // Wedge-shaped head sloping down to the snout.
    rows(by - hr + n(1), by + N(2), (y) => {
      const slope = Math.max(0, Math.round((by - y) * 0.9));
      return [bh - hr, bh + hr + N(2) - slope];
    }, fur, { lo: 1, hi: 4, round: 0.6 });
    newPart();
    rect(bh + hr + N(2), by - n(1), N(1.5), N(3), 'pink', 3);
    px(bh + hr + N(2), by - n(1), 'pink', 4);
    px(bh + hr + N(2), by + n(1), 'ink', 1);
    newPart();
    const tl2 = N(A.big ? 5 : 4);
    for (let i = 0; i < tl2; i++) {
      const tx = bh + hr + n(1) + Math.round(i * 0.4);
      px(tx, by + N(2) - i, 'bone', i === tl2 - 1 ? 5 : 4);
      if (i < tl2 - 1) px(tx - 1, by + N(2) - i, 'bone', 2);
    }
    px(bh + n(1), by - N(2), 'ink', 0);
    px(bh + n(2), by - N(2), L.eyes ?? 'red', A.frame === 4 ? 1 : 5);
    // Small ears and a shaggy crest.
    rect(bh - n(2), by - hr, N(2), N(2), fur, 2);
    px(bh - n(1), by - hr - n(1), fur, 4);
    for (let i = 0; i < 4; i++) px(bh - N(3) + i, by - hr + n(1) - (i % 2), hairR(), 2);
  } else if (sp === 'kirin') {
    // A long deer-dragon head with a beard and horn.
    ell(hx + n(1), hy, hr - n(1), hr - n(1), fur, { lo: 1, hi: 5 });
    rows(hy - n(1), hy + N(2), (y) => [hx + hr - n(1), hx + hr + N(3) - (y === hy + N(2) ? 1 : 0)], fur, { lo: 2, hi: 5 });
    px(hx + hr + N(3), hy, 'ink', 1);
    line(hx + hr, hy + N(3), hx + hr - n(1), hy + N(5), hairR(), 4);
    px(hx + n(1), hy - n(1), 'ink', 0);
    px(hx + n(2), hy - n(1), L.eyes ?? 'blue', 5);
  } else {
    ell(hx, hy, hr, hr - (sp === 'tiger' ? 0 : n(1)), fur, { lo: 1, hi: 4, dither: 0.4 });
    if (sp === 'nue') {
      // A monkey face.
      ell(hx + n(1), hy + n(1), hr - N(1.5), hr - N(2), 'pink', { lo: 2, hi: 4 });
    }
    const snoutL = sp === 'fox' ? N(3) : sp === 'tiger' || sp === 'nue' ? N(1.5) : N(2);
    const sx = hx + hr - n(1);
    const sy = hy + (sp === 'fox' ? 0 : n(1));
    const snR = sp === 'fox' || sp === 'tiger' ? 'snow' : sp === 'nue' ? 'pink' : belly;
    rows(sy, sy + N(2), (y) => [sx, sx + snoutL - (sp === 'fox' && y === sy + N(2) ? n(1) : 0)], snR, { lo: 3, hi: 5 });
    px(sx + snoutL, sy, 'ink', 0);
    if (sp === 'fox') rows(hy - n(1), hy + n(1), () => [sx, sx + snoutL - n(1)], fur, { lo: 3, hi: 4 });
    if (sp === 'tiger') {
      // Forehead and cheek stripes, pink nose.
      px(hx, hy - hr + n(1), 'ink', 1);
      px(hx, hy - hr + n(2), 'ink', 1);
      px(hx + n(2), hy - hr + n(1), 'ink', 1);
      px(hx - n(2), hy, 'ink', 1);
      px(hx - n(2), hy + n(1), 'ink', 1);
      px(sx + snoutL, sy, 'pink', 3);
      line(sx, sy + N(2), sx + snoutL, sy + N(2), 'ink', 1);
      px(sx + N(2), sy + n(1), 'snow', 5);
      glint(sx + N(3), sy + n(1), 'rgba(255,255,255,0.5)');
      glint(sx + N(3), sy + N(2), 'rgba(255,255,255,0.4)');
    }
    // Mouth: open on the strike (and always for the snarling guardians).
    if (ps === 'strike' || sp === 'komainu' || sp === 'lion') {
      line(sx, sy + N(2) + n(1), sx + snoutL, sy + N(2) + n(1), 'ink', 0);
      px(sx + snoutL - n(1), sy + N(2), 'snow', 5);
      px(sx + n(1), sy + N(2) + n(1), 'red', 3);
    }
    // Eye.
    const ex = hx + n(1);
    const ey = hy - N(1.5);
    if (A.frame === 4) line(ex, ey + 1, ex + n(1), ey + 1, 'ink', 0);
    else if (sp === 'fox') {
      px(ex, ey + 1, 'ink', 0);
      px(ex + 1, ey, 'ink', 0);
      px(ex + 1, ey + 1, L.eyes ?? 'gold', 4);
    } else if (sp === 'komainu' || sp === 'lion') {
      rect(ex, ey, N(2), N(2), 'snow', 5);
      px(ex + n(1), ey + n(1), 'ink', 0);
      px(ex - n(1), ey - n(1), hairR(), 2);
    } else {
      px(ex, ey, 'ink', 0);
      px(ex + 1, ey, L.eyes ?? (sp === 'tiger' ? 'blue' : 'gold'), 5);
      px(ex, ey + 1, L.eyes ?? (sp === 'tiger' ? 'blue' : 'gold'), 3);
    }
    // Ears.
    newPart();
    if (sp === 'fox' || L.hat === 'ears') {
      for (const [ex2, back] of [
        [hx - N(2), true],
        [hx + n(1), false],
      ] as const) {
        const eh = back ? N(3) : N(4);
        for (let i = 0; i < eh; i++) for (let j = 0; j < Math.max(1, N(3) - Math.floor(i * 0.8)); j++) px(ex2 + j + Math.floor(i / 3), hy - hr - i + n(1), i >= eh - 1 ? 'ink' : fur, back ? (i >= eh - 1 ? 1 : 3) : j === 0 ? 4 : 3);
        if (!back) px(ex2 + 1, hy - hr, 'pink', 3);
      }
    } else if (sp === 'tiger' || sp === 'nue' || sp === 'komainu' || sp === 'lion') {
      for (const [ex2, ey2, back] of [
        [hx - N(2), hy - hr, true],
        [hx + n(1), hy - hr - n(1), false],
      ] as const) {
        rect(ex2, ey2, N(2), N(2), fur, back ? 2 : 4);
        px(ex2 + 1, ey2 + 1, sp === 'tiger' ? 'ink' : 'pink', 2);
        px(ex2, ey2 - 1, fur, back ? 2 : 3);
      }
    }
  }
  const hd: Head = { x: hx - hr, y: hy - hr + 1, w: hr * 2, h: hr * 2 };
  if (L.hat && L.hat !== 'ears') hat(hd);
  // Collar pieces.
  if (L.neck === 'bib') {
    newPart();
    rows(hy + hr, hy + hr + N(2), (y) => [hx - N(2) + (y - hy - hr), hx + n(1)], 'red', { lo: 2, hi: 4 });
    px(hx, hy + hr + n(1), 'gold', 5);
  }
  if (L.neck === 'collar') {
    newPart();
    line(hx - N(3), hy + hr, hx + n(1), hy + hr + n(1), 'gold', 4);
    ell(hx - n(1), hy + hr + N(2), N(1), N(1), 'gold', { lo: 3, hi: 5 });
  }
  if (L.weapon === 'claws' && ps === 'strike') weapon(hx + hr + N(1), hy + N(2));
}

// ------------------------------------------------------------ birds

export function bird(): void {
  const L = A.look;
  const ps = A.pose;
  const sp = L.species ?? 'crane';
  const body = L.main;
  const phoenix = sp === 'phoenix';
  const cy = A.base - N(phoenix ? 9 : 10) + A.bob;
  const lunge = ps === 'strike' ? N(3) : 0;
  const cx = A.cx - n(1);
  // Legs.
  newPart();
  const legR = phoenix ? 'gold' : sp === 'crane' && body !== 'ink' ? 'ink' : 'red';
  line(cx - n(1), cy + N(3), cx - n(1), A.base - 1, legR, 2);
  line(cx + n(2), cy + N(3), cx + n(2) + (ps === 'strike' ? n(1) : 0), A.base - 1, legR, 3);
  px(cx + n(3), A.base - 1, legR, 3);
  // Tail plumes.
  newPart();
  if (phoenix) {
    for (let k = 0; k < 3; k++) {
      let x0 = cx - N(4);
      let y0 = cy;
      for (let i = 1; i <= N(10); i++) {
        const x1 = cx - N(4) - Math.round(i * (0.9 - k * 0.15));
        const y1 = cy + Math.round(i * (0.15 + k * 0.3)) + Math.round(Math.sin(i * 0.5 + A.frame + k) * 1);
        limb(x0, y0, x1, y1, N(2), N(1.5), k === 1 ? L.accent : body, { lo: 2, hi: 5 });
        x0 = x1;
        y0 = y1;
      }
      ell(x0, y0, N(1.5), N(1.5), L.accent, { lo: 3, hi: 5 });
      px(x0, y0, 'red', 3);
    }
  } else {
    for (let i = 0; i < N(5); i++) line(cx - N(5) - i, cy - n(1) + Math.round(i * 0.4), cx - N(3) - i, cy + N(2) + Math.round(i * 0.4), sp === 'crane' && body !== 'ink' ? 'ink' : L.accent, i % 2 ? 1 : 3);
  }
  // Raised wings for the phoenix.
  if (phoenix || L.extra === 'wings') wings(cx - n(1), cy - n(2), phoenix ? L.accent : body);
  // Body.
  newPart();
  ell(cx, cy, N(6), N(4), body, { lo: 1, hi: 4, dither: 0.5 });
  if (L.pattern) pattern(L.pattern, cx - N(6), cy - N(4), cx + N(6), cy + N(4), trimR());
  // Folded wing with primaries.
  newPart();
  const flap = A.frame === 2 ? -N(3) : A.frame === 1 ? -1 : 0;
  rows(cy - N(2) + flap, cy + N(3) + flap, (y) => [cx - N(5) + Math.floor((y - cy + N(2) - flap) / 2), cx + N(3) - Math.floor((y - cy - flap + N(2)) / 3)], body, { lo: 1, hi: 4 });
  for (let i = 0; i < N(4); i++) line(cx - N(5) + i * 2, cy + N(2) + flap, cx - N(6) + i * 2, cy + N(4) + flap, sp === 'crane' && body !== 'ink' ? 'ink' : L.accent, 2);
  // Neck and head.
  newPart();
  const nx = cx + N(4) + lunge;
  const ny = cy - N(phoenix ? 7 : 9);
  limb(cx + N(3), cy - n(1), nx - n(1), ny + N(2), N(3), N(2), body, { lo: 2, hi: 4 });
  ell(nx, ny, N(2.5), N(2), body, { lo: 2, hi: 5 });
  // Beak.
  const beakR = phoenix ? 'gold' : sp === 'crane' ? 'bone' : 'steel';
  line(nx + N(2), ny, nx + N(phoenix ? 4 : 6), ny + n(1), beakR, 4);
  line(nx + N(2), ny + n(1), nx + N(phoenix ? 3 : 5), ny + n(1), beakR, 2);
  // Eye and crown.
  px(nx + n(1), ny - n(1), A.frame === 4 ? body : 'ink', 0);
  if (hiRes()) px(nx + n(1) + 1, ny - n(1), 'snow', 5);
  if (sp === 'crane') rect(nx - n(1), ny - N(2), N(2), N(1), 'red', 4);
  if (phoenix) {
    for (let i = 0; i < 3; i++) limb(nx - n(1), ny - n(1), nx - N(3) - i * n(1), ny - N(4) - i, N(1.5), 1, L.accent, { lo: 3, hi: 5 });
  }
  hat({ x: nx - N(3), y: ny - N(2), w: N(6), h: N(4) });
  if (ps === 'strike') for (let i = 0; i < 4; i++) glint(nx + N(6) + i, ny + i - 1, 'rgba(255,240,200,0.8)');
}

// ------------------------------------------------------------ spirits

export function spirit(): void {
  const L = A.look;
  const sp = L.species ?? 'flame';
  const float = A.frame === 1 ? -1 : 0;
  const lunge = A.pose === 'strike' ? N(3) : 0;
  const cx = A.cx + lunge;
  if (sp === 'lantern') return chochin(cx, float);
  if (sp === 'kodama') return kodama(cx, float);
  const wisp = sp === 'wisp';
  const cy = A.base - N(wisp ? 10 : 9) + float;
  const rad = N(A.big ? 8 : wisp ? 4.5 : 6);
  const m = L.main;
  newPart({ seam: false });
  // Trailing tail.
  for (let i = 0; i < N(wisp ? 9 : 5); i++) {
    const t = i / N(wisp ? 9 : 5);
    const x = cx - Math.round(t * N(wisp ? 7 : 2)) - (wisp ? 0 : 0) + Math.round(Math.sin(i * 0.8 + A.frame) * 1);
    const y = cy + rad - n(1) + Math.round(t * N(wisp ? 4 : 5));
    ell(x, y, Math.max(0, Math.round((1 - t) * N(2.5))), Math.max(0, Math.round((1 - t) * N(1.5))), m, { lo: 2, hi: 3 });
  }
  // Flame tongues.
  for (let i = 0; i < 4; i++) {
    const fx = cx - rad + N(2) + i * Math.round((rad * 2 - N(3)) / 3);
    const h = N(wisp ? 4 : 5) + ((i + A.frame) % 2) * N(2);
    limb(fx, cy - rad + N(2), fx - n(1) + Math.round(Math.sin(i + A.frame) * 1), cy - rad - h + N(2), N(3), 1, m, { lo: 3, hi: 5 });
  }
  ell(cx, cy, rad, rad, m, { lo: 2, hi: 5, bias: 0.1, dither: 0.6 });
  // Hot core.
  const core = L.accent === 'steel' ? 'snow' : L.accent;
  ell(cx + n(1), cy + n(1), Math.max(1, rad - N(3)), Math.max(1, rad - N(3)), core, { lo: 4, hi: 5 });
  // Face.
  const ey = cy - n(1);
  if (A.frame === 4) {
    line(cx - N(2), ey + 1, cx - N(1), ey + 1, 'ink', 0);
    line(cx + N(2), ey + 1, cx + N(3), ey + 1, 'ink', 0);
  } else
    for (const ex of [cx - N(2), cx + N(2)]) {
      rect(ex, ey, N(1.5), N(2), 'ink', 0);
      px(ex, ey, 'snow', 5);
    }
  if (A.pose === 'strike' || wisp) {
    rect(cx, cy + N(2), N(2), N(1.5), 'ink', 0);
  } else px(cx + n(1), cy + N(2), 'ink', 0);
  for (let i = 0; i < 3; i++) glint(cx - rad + i * rad, cy - rad - N(4) - ((A.frame + i) % 3), `rgba(255,255,255,${0.25 + (i % 2) * 0.2})`);
  hat({ x: cx - rad + 1, y: cy - rad, w: rad * 2 - 1, h: rad * 2 });
}

/** Chochin-obake: a haunted paper lantern with one eye and a lolling tongue. */
function chochin(cx: number, float: number): void {
  const L = A.look;
  const top = A.base - N(19) + float;
  const bot = A.base - N(3) + float;
  const rw = N(A.big ? 7 : 6);
  const paper = L.main;
  // Handle and hook.
  newPart();
  line(cx, top - N(3), cx, top - n(1), 'wood', 3);
  line(cx, top - N(3), cx + N(3), top - N(3), 'wood', 2);
  // Body.
  newPart();
  rows(top, bot, (y) => {
    const t = (y - top) / (bot - top);
    const hw = Math.round(rw * Math.sqrt(Math.max(0, 1 - (2 * t - 1) * (2 * t - 1) * 0.75)));
    return [cx - hw, cx + hw];
  }, paper, { lo: 2, hi: 5, bias: 0.15, round: 0.9 });
  // Ribs.
  for (let y = top + N(2); y < bot - n(1); y += N(2)) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(rw * Math.sqrt(Math.max(0, 1 - (2 * t - 1) * (2 * t - 1) * 0.75)));
    line(cx - hw, y, cx + hw, y, paper, 2);
  }
  // Black lacquer rims.
  box(cx - N(4), top - n(1), N(8), N(2), 'ink', { lo: 1, hi: 4 });
  box(cx - N(4), bot - n(1), N(8), N(2), 'ink', { lo: 1, hi: 4 });
  px(cx - N(3), top - n(1), 'gold', 4);
  // Torn split mouth.
  newPart({ seam: false });
  const my = top + N(10);
  for (let i = -N(4); i <= N(5); i++) px(cx + i, my + (Math.abs(i) % 2), 'ink', 0);
  if (A.frame !== 4) {
    // Long tongue.
    const tl = A.pose === 'strike' ? N(6) : N(4);
    limb(cx + N(1), my + n(1), cx + N(2) + Math.round(tl / 2), my + tl, N(2.5), N(2), 'red', { lo: 2, hi: 5 });
    // One big eye, one squint.
    rect(cx + n(1), top + N(5), N(3), N(3), 'snow', 5);
    rect(cx + N(2), top + N(6), N(1.5), N(1.5), 'ink', 0);
    px(cx + N(2), top + N(5), L.eyes ?? 'gold', 4);
    line(cx - N(4), top + N(6), cx - N(2), top + N(7), 'ink', 0);
  }
  // Painted kanji smear.
  line(cx - N(4), top + N(12), cx - N(3), top + N(14), L.accent === 'gold' ? 'red' : L.accent, 2);
  // Glow.
  for (let i = 0; i < 4; i++) glint(cx - rw - N(2) + i * N(5), bot + N(1) + (i % 2), 'rgba(255,190,90,0.35)');
}

/** Kodama: a pale tree sprite with a hollow face that rattles. */
function kodama(cx: number, float: number): void {
  const L = A.look;
  const pale = L.main;
  const tilt = A.frame === 1 ? 1 : A.frame === 3 ? -1 : 0;
  // Stubby body.
  newPart();
  const by = A.base - N(6);
  rows(by, A.base - 1, (y) => [cx - N(2) - Math.floor((y - by) / 3), cx + N(2) + Math.floor((y - by) / 3)], pale, { lo: 2, hi: 4 });
  line(cx - n(1), A.base - 1, cx - n(1), A.base - N(2), pale, 1);
  limb(cx + N(2), by + N(2), cx + N(4), by + N(4) - (A.pose === 'windup' ? N(3) : 0), N(1.5), N(1.5), pale, { lo: 2, hi: 4 });
  // Big round head.
  newPart();
  const hx = cx + tilt;
  const hy = by - N(6) + float;
  ell(hx, hy, N(6), N(5.5), pale, { lo: 2, hi: 5, bias: 0.1 });
  if (A.frame !== 4) {
    ell(hx - N(2), hy - n(1), N(1), N(1.5), 'ink', { lo: 0, hi: 1 });
    ell(hx + N(2), hy - n(1), N(1), N(1.5), 'ink', { lo: 0, hi: 1 });
    ell(hx + n(1), hy + N(3), N(1), N(1), 'ink', { lo: 0, hi: 1 });
  } else line(hx - N(3), hy, hx + N(3), hy, 'ink', 1);
  // Moss and a sprout.
  newPart();
  line(hx, hy - N(5), hx + n(1), hy - N(8), L.accent, 3);
  ell(hx + N(2), hy - N(8), N(1.5), N(1), L.accent, { lo: 3, hi: 5 });
  ell(hx - n(1), hy - N(8), N(1), N(1), L.accent, { lo: 2, hi: 4 });
  for (let i = 0; i < 4; i++) px(hx - N(4) + i * 2, hy - N(4) + (i % 2), L.accent, 3);
}

// ------------------------------------------------------------ serpents

export function serpent(_biped: () => void): void {
  const L = A.look;
  const coilY = A.base - N(3);
  const sc = L.main;
  // Coils.
  newPart();
  ell(A.cx - N(3), coilY, N(9), N(3), sc, { lo: 1, hi: 4 });
  pattern('scales', A.cx - N(12), coilY - N(3), A.cx + N(6), coilY + N(3), sc);
  newPart();
  ell(A.cx + N(2), coilY - N(4), N(6), N(3), sc, { lo: 1, hi: 4 });
  pattern('scales', A.cx - N(4), coilY - N(7), A.cx + N(8), coilY - N(1), sc);
  line(A.cx - N(3), coilY + N(2), A.cx + N(5), coilY - N(2), L.skin === 'skin' ? 'gold' : L.skin, 4);
  if (L.skin === 'skin') {
    // Naga: humanoid upper body on the coils.
    const top = coilY - N(4) - N(8) + A.bob;
    const tw = N(9);
    const tl = A.cx - Math.floor(tw / 2) + N(2);
    newPart();
    box(tl, top, tw, N(8), sc, { lo: 1, hi: 4 });
    box(tl, top + N(4), tw, N(1), L.accent, { lo: 2, hi: 4 });
    const hd: Head = { x: tl - N(1), y: top - N(9) + 1, w: N(10), h: N(9) };
    head(hd);
    weapon(tl + tw + 1, top + N(5));
    return;
  }
  // Several heads on long necks.
  const heads = L.heads ?? (A.big ? 3 : 1);
  for (let h = 0; h < heads; h++) {
    const off = (h - (heads - 1) / 2) * N(heads > 3 ? 4 : 6);
    const centre = h === Math.floor(heads / 2);
    const strike = A.pose === 'strike' && centre ? N(3) : 0;
    const sw = (h + A.frame) % 2;
    const nx = A.cx + N(4) + off + strike;
    const ny = coilY - N(heads > 3 ? 13 : 10) + Math.round(Math.abs(off) / 2) + sw - (centre ? N(2) : 0);
    newPart();
    limb(A.cx + N(2) + Math.round(off / 2), coilY - N(5), nx - n(1), ny + N(2), N(2.5), N(2), sc, { lo: 1, hi: 3 });
    line(A.cx + N(3) + Math.round(off / 2), coilY - N(5), nx, ny + N(2), L.skin, 3);
    newPart();
    ell(nx, ny, N(2.5), N(2), sc, { lo: 1, hi: 4 });
    rows(ny - n(1), ny + n(1), (y) => [nx + N(1), nx + N(4) - (y === ny - n(1) ? 1 : 0)], sc, { lo: 2, hi: 4 });
    line(nx, ny + N(2), nx + N(3), ny + n(1), L.skin, 4);
    px(nx + n(1), ny - n(1), A.frame === 4 ? sc : L.accent, 5);
    px(nx, ny - n(1), 'ink', 0);
    // Horns.
    px(nx - N(2), ny - N(2), 'bone', 4);
    px(nx - N(3), ny - N(3), 'bone', 5);
    if (A.pose === 'strike' && centre) {
      px(nx + N(4), ny + N(2), 'snow', 5);
      line(nx + N(5), ny + n(1), nx + N(7), ny + n(1), 'red', 3);
      px(nx + N(7), ny, 'red', 4);
    }
  }
}

// ------------------------------------------------------------ spiders

export function spider(): void {
  const L = A.look;
  const ps = A.pose;
  const woman = L.skin === 'skin';
  const big = A.big;
  const ar = N(big ? 6 : woman ? 5.5 : 3.5);
  const cy = A.base - N(big ? 6 : woman ? 6 : 4) + A.bob;
  const bx = A.cx - N(woman ? 3 : 2) + (ps === 'strike' ? N(2) : 0);
  const leg = L.main === 'ink' ? 'indigo' : L.main;
  const band = L.accent;
  // Legs fan out behind the body: two pairs back, two pairs forward.
  const spread = big ? 1.4 : woman ? 1.2 : 1;
  const feet = [-10, -7, 6, 9];
  const ax = bx - N(woman ? 5 : 3);
  const ay = cy - N(1);
  const abdomen = () => {
    newPart();
    ell(ax, ay, ar, ar - N(1), L.main, { lo: 1, hi: 4 });
    for (let y = ay - ar; y <= ay + ar; y++)
      if ((y - ay + ar) % N(3) === 1)
        for (let x = ax - ar; x <= ax + ar; x++) if (isOver(x, y)) px(x, y, band, x < ax ? 4 : 3);
    px(ax - Math.round(ar / 2), ay - Math.round(ar / 2), L.main, 5);
  };
  if (woman) abdomen();
  for (const far of [true, false]) {
    feet.forEach((fo, i) => {
      newPart();
      const lift = (i + A.frame) % 2 && ps !== 'idle' ? N(1) : 0;
      const rootX = bx + (fo < 0 ? -N(1) : N(1));
      const rootY = cy;
      const fx = bx + Math.round(fo * spread * A.k) + (far ? (fo < 0 ? N(2) : -N(2)) : 0);
      const outer = i === 0 || i === 3;
      const kx = Math.round((rootX + fx) / 2) + (fo < 0 ? -n(1) : n(1));
      const ky = cy - ar - N(outer ? 0.5 : 2) - lift + (far ? N(1) : 0) - (woman ? N(2) : 0);
      const s0 = far ? 2 : 4;
      line(rootX, rootY, kx, ky, leg, s0);
      line(kx, ky, fx, A.base - 1, leg, s0 - 1);
      if (big) line(rootX, rootY + 1, kx, ky + 1, leg, s0 - 1);
      px(kx, ky, band, far ? 2 : 5);
      px(Math.round((kx * 2 + fx) / 3), Math.round((ky * 2 + A.base) / 3), band, far ? 2 : 4);
    });
  }
  if (!woman) abdomen();
  if (!woman) {
    // Head with a cluster of eyes.
    newPart();
    const hx = bx + N(3);
    ell(hx, cy, N(3), N(2.5), L.main, { lo: 1, hi: 4 });
    if (A.frame !== 4)
      for (const [ex, ey] of [
        [1, -1],
        [2, 0],
        [0, -1],
        [2, -2],
      ])
        px(hx + N(ex), cy + N(ey), L.eyes ?? 'red', ex === 2 ? 5 : 4);
    px(hx + N(3), cy + N(1), 'snow', 4);
    return;
  }
  // The spider-woman: a kimono-clad torso rising from the spider body.
  const top = cy - N(9);
  const tw = N(7);
  const tl = bx + N(1);
  newPart();
  box(tl, top, tw, N(9), L.lower ?? 'ink', { lo: 2, hi: 5 });
  for (let i = 0; i < N(4); i++) {
    px(tl + Math.floor(tw / 2) - n(1) + i, top + i, L.trim ?? 'snow', 4);
  }
  pattern('waves', tl, top + N(4), tl + tw, top + N(9), L.accent);
  box(tl, top + N(6), tw, N(2), L.accent, { lo: 2, hi: 5 });
  const hd: Head = { x: tl - N(1), y: top - N(9) + 1, w: N(10), h: N(9) };
  head(hd);
  newPart();
  const ps2 = A.pose;
  const hx = tl + tw + (ps2 === 'strike' ? N(4) : 0);
  const hy = top + (ps2 === 'windup' ? 0 : N(4));
  limb(tl + tw - n(1), top + n(2), hx, hy, N(2.5), N(3), L.lower ?? 'ink', { lo: 1, hi: 4 });
  weapon(hx, hy);
  rect(hx - 1, hy - 1, N(2), N(2), 'skin', 4);
  // Silk threads.
  for (let i = 0; i < 3; i++) glint(bx - N(6) + i * N(3), 0 + ((A.frame + i) % 2) + i * N(2), 'rgba(230,230,255,0.35)');
  for (let y = 0; y < top - N(9); y += 2) glint(bx - N(3), y, 'rgba(230,230,255,0.3)');
}

// ------------------------------------------------------------ golems

export function golem(): void {
  const L = A.look;
  if (L.species === 'toro') return toro();
  const ps = A.pose;
  const stone = L.main;
  const glow = L.accent;
  const tw = N(A.big ? 15 : 12);
  const th = N(A.big ? 10 : 8);
  const legH = N(4);
  const top = A.base - legH - th + A.bob;
  const tl = A.cx - Math.floor(tw / 2);
  // Back fist.
  newPart();
  box(tl - N(3), top + N(2), N(4), N(6), stone, { lo: 1, hi: 2 });
  rect(tl - N(3), top + N(7), N(4), N(2), stone, 1);
  // Legs.
  newPart();
  box(A.cx - N(5), A.base - legH - n(1), N(4), legH + n(1), stone, { lo: 1, hi: 2 });
  newPart();
  box(A.cx + N(1), A.base - legH - n(1), N(4), legH + n(1), stone, { lo: 2, hi: 4 });
  line(A.cx + N(1), A.base - N(2), A.cx + N(5) - 1, A.base - N(2), stone, 1);
  // Body block: carved armour, cracks and runes.
  newPart();
  rows(top, top + th, (y) => [tl + (y > top + th - N(3) ? n(1) : 0), tl + tw - 1 - (y > top + th - N(3) ? n(1) : 0)], stone, { lo: 1, hi: 5, round: 0.6, dither: 0.4 });
  for (let y = top + N(3); y < top + th; y += N(3)) line(tl + n(1), y, tl + tw - n(2), y, stone, 1);
  line(A.cx + N(3), top + n(1), A.cx + N(2), top + N(3), stone, 0);
  line(A.cx + N(2), top + N(3), A.cx + N(4), top + N(5), stone, 0);
  // Rune.
  newPart({ seam: false });
  const rx = A.cx - n(1);
  const ry = top + N(3);
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [0, 2],
    [1, 2],
    [-1, 1],
  ])
    px(rx + N(dx), ry + N(dy), glow, dx === 0 && dy === 1 ? 5 : 4);
  glint(rx, ry - n(1), 'rgba(255,255,220,0.35)');
  // Shoulder blocks.
  newPart();
  box(tl - n(1), top - n(1), N(4), N(3), stone, { lo: 1, hi: 5, metal: true });
  box(tl + tw - N(3), top - n(1), N(4), N(3), stone, { lo: 2, hi: 5, metal: true });
  // Head block.
  newPart();
  const hw = N(A.big ? 9 : 8);
  const hh = N(6);
  const hx = A.cx - Math.floor(hw / 2) + n(1);
  const hy = top - hh + 1;
  box(hx, hy, hw, hh, stone, { lo: 1, hi: 5, round: 0.6 });
  line(hx, hy + N(2), hx + hw - 1, hy + N(2), stone, 1);
  if (A.frame !== 4) {
    rect(hx + Math.round(hw * 0.45), hy + N(3), N(2), N(1), glow, 5);
    rect(hx + Math.round(hw * 0.8), hy + N(3), N(1), N(1), glow, 4);
  }
  hat({ x: hx, y: hy, w: hw, h: hh });
  // Front fist.
  newPart();
  const fx = tl + tw - n(1) + (ps === 'strike' ? N(4) : ps === 'windup' ? -N(2) : 0);
  const fy = top + N(3) - (ps === 'windup' ? N(3) : 0);
  box(fx, fy, N(5), N(5), stone, { lo: 1, hi: 5, metal: true });
  line(fx + n(1), fy + N(2), fx + N(4), fy + N(2), stone, 1);
  if (L.weapon && L.weapon !== 'none') weapon(fx + N(2), fy);
  if (ps === 'strike') for (let i = 0; i < 3; i++) glint(fx + N(6) + i, fy + N(1) + i * 2, 'rgba(255,255,255,0.8)');
}

/** A stone tōrō lantern that hops along. */
function toro(): void {
  const L = A.look;
  const stone = L.main;
  const glow = L.accent;
  const ps = A.pose;
  const hop = ps === 'windup' ? N(1) : ps === 'strike' ? -N(2) : A.bob;
  const cx = A.cx;
  const b = A.base - (ps === 'strike' ? N(1) : 0);
  // Base.
  newPart();
  box(cx - N(5), b - N(3), N(11), N(3), stone, { lo: 1, hi: 4 });
  // Post.
  newPart();
  box(cx - N(2), b - N(8) + hop, N(5), N(5), stone, { lo: 1, hi: 4 });
  line(cx - N(2), b - N(6) + hop, cx + N(2), b - N(6) + hop, stone, 1);
  // Platform.
  newPart();
  box(cx - N(5), b - N(10) + hop, N(11), N(2), stone, { lo: 2, hi: 5 });
  // Firebox with a glowing face.
  newPart();
  const fy = b - N(16) + hop;
  box(cx - N(4), fy, N(9), N(6), stone, { lo: 1, hi: 4 });
  rect(cx - N(2), fy + N(1), N(5), N(4), glow, 3);
  rect(cx - N(1), fy + N(2), N(3), N(2), glow, 5);
  if (A.frame !== 4) {
    px(cx - n(1), fy + N(2), 'ink', 0);
    px(cx + N(1), fy + N(2), 'ink', 0);
    if (ps === 'strike') rect(cx - n(1), fy + N(3) + n(1), N(3), N(1), 'ink', 0);
  }
  // Roof with curled corners.
  newPart();
  const ry = fy - N(3);
  rows(ry, ry + N(3), (y) => [cx - N(4) - (y - ry) * 2 + (y === ry + N(3) ? 0 : 0), cx + N(4) + (y - ry) * 2], stone, { lo: 1, hi: 5, vert: 0.8 });
  px(cx - N(10), ry + N(2), stone, 3);
  px(cx + N(10), ry + N(2), stone, 3);
  // Jewel finial.
  newPart();
  ell(cx, ry - N(2), N(1.5), N(1.5), stone, { lo: 2, hi: 5 });
  px(cx, ry - N(4), stone, 4);
  hat({ x: cx - N(4), y: ry - N(1), w: N(9), h: N(4) });
  // Moss.
  for (let i = 0; i < 4; i++) px(cx - N(5) + i * N(3), b - N(3) + (i % 2), 'moss', 3);
  if (L.weapon && L.weapon !== 'none') weapon(cx + N(6), fy + N(3));
  for (let i = 0; i < 3; i++) glint(cx - N(4) + i * N(4), fy - N(5) - ((A.frame + i) % 2), `rgba(255,220,140,${0.3 + i * 0.1})`);
}

// ------------------------------------------------------------ slimes

export function slime(): void {
  const L = A.look;
  const squash = A.frame === 1 ? 1 : A.frame === 2 ? -1 : 0;
  const lunge = A.pose === 'strike' ? N(3) : 0;
  const rx = N(A.big ? 9 : 7) + squash;
  const ry = N(A.big ? 7 : 5) - squash;
  const cy = A.base - ry - 1;
  newPart();
  ell(A.cx + lunge, cy, rx, ry, L.main, { lo: 1, hi: 5, dither: 0.6 });
  px(A.cx + lunge - Math.floor(rx / 2), cy - ry + n(2), 'snow', 5);
  if (A.frame !== 4) for (const ex of [A.cx + lunge, A.cx + lunge + N(3)]) rect(ex, cy - n(1), N(1.5), N(2), 'ink', 0);
  line(A.cx + lunge + n(1), cy + N(2), A.cx + lunge + N(2), cy + N(2), L.accent, 2);
  sway();
}
