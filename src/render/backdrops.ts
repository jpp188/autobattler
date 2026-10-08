/**
 * Per-act layered pixel backgrounds, drawn once into a canvas texture:
 *   0 Prologue  – the bamboo road at dusk
 *   1 Act I     – bamboo forest
 *   2 Act II    – mountain shrine at sunset
 *   3 Act III   – celestial palace among the clouds
 * Menus and the map dim the scene; battles show it fully. Each act also gets
 * a drifting ambient particle (petals, leaves, embers or stars).
 */
import Phaser from 'phaser';
import { disc, ellipse, makeTexture, px, type Ctx } from './canvas';

const W = 640;
const H = 360;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** A banded (dithered-step) sky gradient. */
function sky(c: Ctx, stops: string[], bands = 14, height = H): void {
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    c.fillStyle = mix(stops[seg], stops[seg + 1], lt);
    const y0 = Math.floor((i * height) / bands);
    c.fillRect(0, y0, W, Math.ceil(height / bands) + 1);
    // Dither row between bands.
    if (i > 0) for (let x = i % 2; x < W; x += 2) px(c, x, y0, mix(stops[seg], stops[seg + 1], Math.max(0, lt - 0.05)));
  }
}

/** A mountain ridge silhouette. */
function ridge(c: Ctx, base: number, amp: number, freq: number, color: string, seed: number, snow?: string): void {
  const r = rng(seed);
  const phase = r() * 100;
  for (let x = 0; x < W; x++) {
    const h = Math.round(amp * (0.55 + 0.3 * Math.sin(x * freq + phase) + 0.15 * Math.sin(x * freq * 3.1 + phase * 2)));
    px(c, x, base - h, color, 1, H - base + h);
    if (snow && h > amp * 0.78) px(c, x, base - h, snow, 1, Math.round((h - amp * 0.78) * 0.8) + 1);
  }
}

function stars(c: Ctx, n: number, maxY: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * maxY);
    const b = r();
    px(c, x, y, b > 0.9 ? '#fff2a8' : b > 0.5 ? '#c8c8ff' : '#6e6a9a');
    if (b > 0.97) {
      px(c, x - 1, y, 'rgba(255,255,255,0.5)');
      px(c, x + 1, y, 'rgba(255,255,255,0.5)');
      px(c, x, y - 1, 'rgba(255,255,255,0.5)');
      px(c, x, y + 1, 'rgba(255,255,255,0.5)');
    }
  }
}

/** Bamboo stalks with joints and leaves. */
function bamboo(c: Ctx, count: number, minW: number, maxW: number, dark: string, mid: string, light: string, seed: number, top = 0): void {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * W);
    const w = minW + Math.floor(r() * (maxW - minW + 1));
    const t = top + Math.floor(r() * 30);
    px(c, x, t, mid, w, H - t);
    px(c, x, t, light, 1, H - t);
    px(c, x + w - 1, t, dark, 1, H - t);
    for (let y = t + 10 + Math.floor(r() * 20); y < H; y += 24 + Math.floor(r() * 16)) {
      px(c, x - 1, y, dark, w + 2, 2);
      px(c, x, y - 1, light, w, 1);
      if (r() < 0.4) {
        // Leaf sprig.
        const dir = r() < 0.5 ? -1 : 1;
        for (let k = 0; k < 7; k++) px(c, x + (dir > 0 ? w + k : -k - 1), y - 2 - Math.floor(k / 2), k < 5 ? mid : light, 1, 2);
      }
    }
  }
}

function torii(c: Ctx, x: number, y: number, s: number, color: string, dark: string): void {
  px(c, x - 18 * s, y, color, 36 * s, 3 * s);
  px(c, x - 20 * s, y - 2 * s, dark, 40 * s, 2 * s);
  px(c, x - 15 * s, y + 8 * s, color, 30 * s, 2 * s);
  px(c, x - 12 * s, y, color, 3 * s, 40 * s);
  px(c, x + 9 * s, y, color, 3 * s, 40 * s);
  px(c, x - 2 * s, y + 3 * s, dark, 4 * s, 5 * s);
}

function pagoda(c: Ctx, x: number, base: number, tiers: number, wall: string, roof: string, glow: string): void {
  let y = base;
  for (let t = 0; t < tiers; t++) {
    const w = 40 - t * 7;
    px(c, x - w / 2 + 3, y - 12, wall, w - 6, 12);
    for (let i = 2; i < w - 6; i += 6) px(c, x - w / 2 + 3 + i, y - 9, glow, 2, 4);
    // Curved roof.
    px(c, x - w / 2 - 4, y - 14, roof, w + 8, 3);
    px(c, x - w / 2 - 6, y - 15, roof, 3, 2);
    px(c, x + w / 2 + 3, y - 15, roof, 3, 2);
    y -= 15;
  }
  px(c, x - 1, y - 10, roof, 2, 10);
}

function cloud(c: Ctx, x: number, y: number, w: number, color: string, shadow: string): void {
  for (let i = 0; i < w; i += 10) {
    const r = 6 + ((i * 7) % 5);
    disc(c, x + i, y - (i % 20 === 0 ? 3 : 0), r, color);
  }
  px(c, x - 6, y + 4, shadow, w + 10, 3);
}

function lantern(c: Ctx, x: number, y: number): void {
  disc(c, x, y, 9, 'rgba(255,190,110,0.12)');
  px(c, x - 3, y - 4, '#e8504a', 6, 8);
  px(c, x - 2, y - 3, '#ff9a7a', 2, 6);
  px(c, x - 3, y - 5, '#2a2236', 6, 1);
  px(c, x - 3, y + 4, '#2a2236', 6, 1);
  px(c, x, y - 12, '#2a2236', 1, 7);
}

function sakura(c: Ctx, x: number, y: number, seed: number): void {
  const r = rng(seed);
  px(c, x, y - 40, '#4a2a2a', 4, 40);
  px(c, x - 8, y - 34, '#4a2a2a', 10, 2);
  px(c, x + 3, y - 28, '#4a2a2a', 10, 2);
  for (let i = 0; i < 14; i++) disc(c, x + Math.floor(r() * 40) - 18, y - 40 - Math.floor(r() * 24) + 8, 5 + Math.floor(r() * 4), i % 3 ? '#f26aa8' : '#ffc0dc');
}

function drawAct(c: Ctx, act: number): void {
  if (act === 2) {
    // Mountain shrine at sunset.
    sky(c, ['#2a1846', '#7a2a5a', '#e8704a', '#ffc070'], 16, 230);
    disc(c, 470, 150, 22, '#ffe0a0');
    disc(c, 470, 150, 18, '#fff2c8');
    ridge(c, 200, 110, 0.009, '#5a2a52', 3, '#e8b0c8');
    ridge(c, 230, 70, 0.016, '#3e1e46', 4);
    pagoda(c, 140, 214, 4, '#2a1630', '#1a0c22', '#ffb060');
    torii(c, 520, 170, 1, '#c8302a', '#6e1a2a');
    ridge(c, 270, 40, 0.03, '#2a1630', 5);
    sakura(c, 60, 270, 7);
    sakura(c, 600, 280, 8);
    // Stone steps and ground.
    px(c, 0, 270, '#2a1f2a', W, H - 270);
    for (let i = 0; i < 6; i++) px(c, 250 + i * 6, 270 + i * 12, '#4a3a4a', 140 - i * 12, 4);
    for (let i = 0; i < 6; i++) lantern(c, 40 + i * 110, 250 + (i % 2) * 6);
  } else if (act === 3) {
    // Celestial palace above the clouds.
    sky(c, ['#07051a', '#1a1846', '#36307a', '#6a5aa8'], 16, 260);
    stars(c, 260, 220, 11);
    disc(c, 110, 70, 26, '#e8e0ff');
    disc(c, 118, 64, 24, '#1a1846');
    // Floating palace.
    const gold = '#f2c94a';
    for (const [x, base, tiers] of [
      [320, 190, 5],
      [220, 205, 3],
      [430, 200, 3],
    ] as const)
      pagoda(c, x, base, tiers, '#463a7a', '#c4922a', '#fff2a8');
    px(c, 180, 205, '#36307a', 290, 6);
    px(c, 180, 205, gold, 290, 1);
    cloud(c, 120, 235, 130, '#9a9ae8', '#5a56b8');
    cloud(c, 380, 230, 170, '#9a9ae8', '#5a56b8');
    cloud(c, -20, 270, 690, '#c8c8ff', '#7a76c8');
    px(c, 0, 280, '#5a56b8', W, H - 280);
    for (let x = 0; x < W; x += 3) px(c, x, 280 + ((x * 13) % 7), '#7a76c8', 2, 1);
  } else {
    // Bamboo forest (Prologue at dusk, Act I by day).
    const dusk = act === 0;
    sky(c, dusk ? ['#1e1840', '#5a3a6a', '#e89a6a', '#ffd08a'] : ['#2a6a7a', '#5aa89a', '#a8e0b0', '#e8f4c0'], 14, 230);
    if (dusk) disc(c, 520, 120, 16, '#fff2c8');
    ridge(c, 190, 80, 0.008, dusk ? '#4a3a5a' : '#4a8a7a', 1);
    ridge(c, 220, 50, 0.02, dusk ? '#2e2a46' : '#2e6a5a', 2);
    bamboo(c, 40, 3, 4, dusk ? '#1e2a2a' : '#1e5a3a', dusk ? '#2a3e36' : '#3a8a4a', dusk ? '#3a5a46' : '#6ac06a', 21, 40);
    bamboo(c, 14, 6, 9, dusk ? '#142018' : '#14523e', dusk ? '#1e3226' : '#1f8a5e', dusk ? '#2e4a36' : '#3fd08a', 22, 0);
    px(c, 0, 280, dusk ? '#1e2218' : '#2a4a22', W, H - 280);
    for (let x = 0; x < W; x += 4) px(c, x, 280 + ((x * 17) % 9), dusk ? '#2a3020' : '#3a6a2a', 2, 1);
    // A dirt road.
    ellipse(c, 320, 330, 260, 30, dusk ? '#3a2a22' : '#6b4a32');
    ellipse(c, 320, 330, 230, 22, dusk ? '#4a3a2a' : '#9a6a42');
    if (dusk) for (let i = 0; i < 4; i++) lantern(c, 80 + i * 160, 250 + (i % 2) * 8);
  }
}

/** Draws the act backdrop (and ambient particles) at the back of the scene. */
export function drawBackdrop(scene: Phaser.Scene, act: number, mode: 'battle' | 'map' | 'menu'): void {
  const a = Math.max(0, Math.min(3, act));
  const key = `bg_${a}`;
  if (!scene.textures.exists(key)) {
    if (scene.textures.exists(`ext_bg_${a}`)) {
      scene.add.image(0, 0, `ext_bg_${a}`).setOrigin(0, 0).setDisplaySize(W, H).setDepth(-10);
    } else makeTexture(scene, key, W, H, (c) => drawAct(c, a));
  }
  if (scene.textures.exists(key)) scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-10);
  if (mode !== 'battle') scene.add.rectangle(0, 0, W, H, 0x07050b, mode === 'map' ? 0.62 : 0.5).setOrigin(0, 0).setDepth(-9);
  ambient(scene, a);
}

/** Slow drifting particles: petals, leaves, embers or stars. */
function ambient(scene: Phaser.Scene, act: number): void {
  const colors = [[0xffc0dc, 0xf26aa8], [0x6ac06a, 0xa8f5c8], [0xffc0dc, 0xffb060], [0xfff2a8, 0xc8c8ff]][act];
  const r = rng(act * 31 + 7);
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    const y = r() * H;
    const dot = scene.add.rectangle(x, y, act === 3 ? 1 : 2, act === 3 ? 1 : 1, colors[i % 2], 0.8).setDepth(-8);
    const drift = () => {
      const dur = 9000 + r() * 9000;
      scene.tweens.add({
        targets: dot,
        x: dot.x + (act === 3 ? 0 : 60 + r() * 60),
        y: act === 3 ? dot.y : H + 10,
        alpha: act === 3 ? { from: 0.2, to: 1 } : 0.8,
        duration: dur,
        yoyo: act === 3,
        onComplete: () => {
          if (act !== 3) {
            dot.setPosition(r() * W - 60, -10);
            drift();
          }
        },
        repeat: act === 3 ? -1 : 0,
      });
    };
    drift();
  }
}
