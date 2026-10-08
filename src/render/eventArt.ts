/**
 * Event illustrations: a small painted landscape per event, drawn in code.
 * Each one is a sky, distant hills, ground and a centrepiece motif.
 */
import Phaser from 'phaser';
import { box, disc, ellipse, makeTexture, px, type Ctx } from './canvas';

export const EVENT_ART_W = 176;
export const EVENT_ART_H = 120;

interface Look {
  sky: [string, string];
  hill: string;
  ground: string;
  moon?: string;
  motif: (c: Ctx) => void;
}

const W = EVENT_ART_W;
const H = EVENT_ART_H;
const GROUND = 92;

function torii(c: Ctx, x: number, y: number, s: number, color: string): void {
  px(c, x - 14 * s, y, color, 28 * s, 3 * s);
  px(c, x - 12 * s, y + 6 * s, color, 24 * s, 2 * s);
  px(c, x - 10 * s, y, color, 3 * s, 30 * s);
  px(c, x + 7 * s, y, color, 3 * s, 30 * s);
  px(c, x - 16 * s, y - 2 * s, '#120c1c', 32 * s, 2 * s);
}

function lantern(c: Ctx, x: number, y: number, glow: string): void {
  disc(c, x, y, 7, 'rgba(255,200,120,0.18)');
  box(c, x - 3, y - 4, 6, 8, glow, '#6e1a2a');
  px(c, x - 1, y - 7, '#120c1c', 2, 3);
}

function stoneLantern(c: Ctx, x: number, y: number): void {
  px(c, x - 6, y - 22, '#8a8aa0', 12, 3);
  px(c, x - 4, y - 19, '#6a6a80', 8, 6);
  px(c, x - 2, y - 17, '#ffd27a', 4, 3);
  px(c, x - 5, y - 13, '#8a8aa0', 10, 2);
  px(c, x - 2, y - 11, '#6a6a80', 4, 9);
  px(c, x - 5, y - 2, '#8a8aa0', 10, 2);
}

function tree(c: Ctx, x: number, y: number, leaf: string, trunk = '#4a2a1a'): void {
  px(c, x - 1, y - 14, trunk, 3, 14);
  disc(c, x, y - 18, 8, leaf);
  disc(c, x - 6, y - 14, 5, leaf);
  disc(c, x + 6, y - 14, 5, leaf);
}

function stars(c: Ctx, seed: number): void {
  let s = seed;
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = s % W;
    s = (s * 9301 + 49297) % 233280;
    const y = s % 50;
    px(c, x, y, i % 4 === 0 ? '#fff2a8' : '#c8c8ff');
  }
}

const LOOKS: Record<string, Look> = {
  shrine: {
    sky: ['#2a1f4a', '#c86a5a'],
    hill: '#3a2a4a',
    ground: '#3a4a2a',
    motif: (c) => {
      torii(c, W / 2, 52, 1, '#c8302a');
      px(c, W / 2 - 6, 74, '#7a5a3a', 12, 8);
      px(c, W / 2 - 8, 72, '#4a2a1a', 16, 2);
      ellipse(c, W / 2 - 30, 88, 5, 3, '#c8c0b0');
      ellipse(c, W / 2 + 30, 88, 5, 3, '#c8c0b0');
      px(c, W / 2 - 32, 80, '#e8e0d0', 4, 6);
      px(c, W / 2 + 28, 80, '#e8e0d0', 4, 6);
    },
  },
  spring: {
    sky: ['#1a2a4a', '#6a8aaa'],
    hill: '#2a3a4a',
    ground: '#3a4a3a',
    motif: (c) => {
      ellipse(c, W / 2, 98, 50, 12, '#4a8ab0');
      ellipse(c, W / 2, 97, 40, 8, '#6ab0d0');
      for (let i = 0; i < 6; i++) px(c, W / 2 - 30 + i * 12, 70 - (i % 2) * 6, 'rgba(255,255,255,0.35)', 4, 14);
      tree(c, 26, GROUND, '#e8a0b8');
      tree(c, W - 24, GROUND, '#e8a0b8');
    },
  },
  dice: {
    sky: ['#120c1c', '#3a1a2a'],
    hill: '#2a1a2a',
    ground: '#4a2a1a',
    motif: (c) => {
      box(c, 30, 40, W - 60, 52, '#5a3a2a', '#2a1a12');
      lantern(c, 46, 54, '#e8504a');
      lantern(c, W - 46, 54, '#e8504a');
      box(c, W / 2 - 14, 70, 12, 12, '#f4f0e0', '#120c1c');
      box(c, W / 2 + 4, 72, 12, 12, '#f4f0e0', '#120c1c');
      px(c, W / 2 - 9, 75, '#c8302a', 2, 2);
      px(c, W / 2 + 6, 74, '#120c1c', 2, 2);
      px(c, W / 2 + 12, 80, '#120c1c', 2, 2);
    },
  },
  forge: {
    sky: ['#1a0c0c', '#5a2a1a'],
    hill: '#2a1a1a',
    ground: '#3a2a2a',
    motif: (c) => {
      box(c, W / 2 - 30, 50, 60, 42, '#4a3a3a', '#1a1212');
      disc(c, W / 2, 74, 12, '#f2953a');
      disc(c, W / 2, 74, 7, '#ffe27a');
      px(c, W / 2 - 40, 82, '#5a5a6a', 18, 6);
      px(c, W / 2 - 36, 78, '#8a8a9a', 10, 4);
      for (let i = 0; i < 8; i++) px(c, W / 2 - 10 + i * 3, 46 - (i % 3) * 5, '#ffd24a');
    },
  },
  lanterns: {
    sky: ['#0c0c2a', '#2a1a4a'],
    hill: '#1a1a3a',
    ground: '#1a2a2a',
    moon: '#f4f0d0',
    motif: (c) => {
      for (let i = 0; i < 7; i++) lantern(c, 20 + i * 23, 40 + ((i * 13) % 30), i % 2 ? '#f2953a' : '#e8504a');
      ellipse(c, W / 2, 102, 70, 8, '#2a3a6a');
    },
  },
  bridge: {
    sky: ['#2a1a3a', '#e8955a'],
    hill: '#3a2a3a',
    ground: '#2a3a2a',
    motif: (c) => {
      ellipse(c, W / 2, 104, 80, 10, '#3a5a8a');
      for (let x = 20; x < W - 20; x++) {
        const y = 78 - Math.round(Math.sin(((x - 20) / (W - 40)) * Math.PI) * 18);
        px(c, x, y, '#c8302a', 1, 3);
        if (x % 12 === 0) px(c, x, y - 8, '#c8302a', 2, 8);
      }
      px(c, 20, 70, '#c8302a', W - 40, 1);
    },
  },
  well: {
    sky: ['#1a1a2a', '#4a4a6a'],
    hill: '#2a2a3a',
    ground: '#2a3a2a',
    moon: '#d0d8ff',
    motif: (c) => {
      ellipse(c, W / 2, 86, 22, 7, '#6a6a7a');
      ellipse(c, W / 2, 84, 18, 5, '#0c0c1a');
      px(c, W / 2 - 22, 86, '#6a6a7a', 44, 8);
      px(c, W / 2 - 20, 54, '#4a2a1a', 3, 32);
      px(c, W / 2 + 17, 54, '#4a2a1a', 3, 32);
      px(c, W / 2 - 24, 52, '#2a1a12', 48, 4);
      px(c, W / 2, 56, '#a8a8b8', 1, 18);
    },
  },
  tea: {
    sky: ['#2a3a2a', '#8aaa7a'],
    hill: '#3a4a3a',
    ground: '#4a5a3a',
    motif: (c) => {
      box(c, 26, 46, W - 52, 46, '#c8b08a', '#5a3a2a');
      for (let x = 30; x < W - 30; x += 14) px(c, x, 48, '#a8906a', 1, 42);
      ellipse(c, W / 2, 84, 26, 5, '#5a3a2a');
      box(c, W / 2 - 7, 74, 14, 9, '#3a6a4a', '#1a2a1a');
      px(c, W / 2 + 7, 77, '#3a6a4a', 4, 2);
      px(c, W / 2 - 18, 80, '#f4f0e0', 5, 3);
      px(c, W / 2 + 14, 80, '#f4f0e0', 5, 3);
    },
  },
  pond: {
    sky: ['#1a2a3a', '#7aaaba'],
    hill: '#2a4a3a',
    ground: '#3a5a3a',
    motif: (c) => {
      ellipse(c, W / 2, 98, 60, 14, '#2a5a7a');
      ellipse(c, W / 2 - 20, 96, 6, 2, '#f2953a');
      ellipse(c, W / 2 + 18, 100, 6, 2, '#f4f0e0');
      ellipse(c, W / 2 + 4, 94, 5, 2, '#e8504a');
      ellipse(c, W / 2 - 40, 102, 6, 3, '#3a8a4a');
      tree(c, 22, GROUND, '#3a6a3a');
    },
  },
  library: {
    sky: ['#1a1220', '#3a2a3a'],
    hill: '#2a1a2a',
    ground: '#3a2a1a',
    motif: (c) => {
      box(c, 22, 30, W - 44, 62, '#4a2a1a', '#1a0c08');
      for (let r = 0; r < 4; r++) {
        px(c, 24, 44 + r * 14, '#2a1a10', W - 48, 2);
        for (let i = 0; i < 18; i++) px(c, 28 + i * 7, 34 + r * 14, ['#c8302a', '#3a6a8a', '#c8a03a', '#5a8a4a'][(i + r) % 4], 5, 10);
      }
      lantern(c, W / 2, 26, '#f2c94a');
    },
  },
  envoy: {
    sky: ['#0c0c2a', '#3a2a6a'],
    hill: '#2a2a4a',
    ground: '#2a2a3a',
    motif: (c) => {
      disc(c, W / 2, 50, 20, 'rgba(255,240,180,0.15)');
      ellipse(c, W / 2, 86, 8, 3, '#120c1c');
      px(c, W / 2 - 6, 56, '#f4f0e0', 12, 28);
      px(c, W / 2 - 4, 46, '#f2d0b0', 8, 10);
      px(c, W / 2 - 8, 44, '#f2c94a', 16, 3);
      px(c, W / 2 - 10, 60, '#a650c8', 4, 18);
      px(c, W / 2 + 6, 60, '#a650c8', 4, 18);
      stoneLantern(c, 30, GROUND);
      stoneLantern(c, W - 30, GROUND);
    },
  },
  market: {
    sky: ['#2a1a2a', '#e8955a'],
    hill: '#3a2a3a',
    ground: '#4a3a2a',
    motif: (c) => {
      for (let i = 0; i < 3; i++) {
        const x = 20 + i * 50;
        box(c, x, 56, 40, 36, '#5a3a2a', '#2a1a12');
        for (let k = 0; k < 5; k++) px(c, x + k * 8, 50, k % 2 ? '#f4f0e0' : '#c8302a', 8, 8);
        px(c, x + 4, 76, ['#f2c94a', '#3a8a4a', '#a650c8'][i], 32, 4);
      }
      lantern(c, 38, 42, '#e8504a');
      lantern(c, 138, 42, '#e8504a');
    },
  },
};

function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return h;
}

/** Returns the texture key for an event's illustration, drawing it on first use. */
export function eventArtTexture(scene: Phaser.Scene, art: string): string {
  const key = `event_${art}`;
  if (scene.textures.exists(key)) return key;
  if (scene.textures.exists(`ext_event_${art}`)) return `ext_event_${art}`;
  const look = LOOKS[art] ?? LOOKS.shrine;
  makeTexture(scene, key, W, H, (c) => {
    // Banded sky.
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      c.fillStyle = mix(look.sky[0], look.sky[1], t);
      c.fillRect(0, Math.floor((i * GROUND) / bands), W, Math.ceil(GROUND / bands) + 1);
    }
    stars(c, hash(art));
    if (look.moon) disc(c, W - 30, 22, 9, look.moon);
    // Hills.
    for (let x = 0; x < W; x++) {
      const h = 18 + Math.round(Math.sin(x / 17 + hash(art)) * 6 + Math.sin(x / 7) * 2);
      px(c, x, GROUND - h, look.hill, 1, h);
    }
    px(c, 0, GROUND, look.ground, W, H - GROUND);
    for (let x = 0; x < W; x += 5) px(c, x + ((x / 5) % 2), GROUND + 3 + ((x * 7) % 9), shadeStr(look.ground), 2, 1);
    look.motif(c);
    // Frame.
    c.strokeStyle = '#07050b';
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, W - 1, H - 1);
  });
  return key;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function shadeStr(hex: string): string {
  const p = parseInt(hex.slice(1), 16);
  const ch = (sh: number) => Math.round(((p >> sh) & 255) * 0.75);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
