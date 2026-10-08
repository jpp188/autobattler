/**
 * Synthesised sound effects (Web Audio, no sample files). Each effect is a
 * tiny recipe of tones and noise bursts. Repeats of the same sound within a
 * few milliseconds are dropped so busy fights stay clean.
 */
import { AudioOut, noise, tone } from './engine';

// Pentatonic notes (D minor pentatonic around the middle of the keyboard).
const N = { D4: 293.66, F4: 349.23, G4: 392, A4: 440, C5: 523.25, D5: 587.33, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66 };

const RECIPES: Record<string, () => void> = {
  click: () => tone({ type: 'square', freq: 880, to: 660, dur: 0.05, vol: 0.08, lp: 3000 }),
  place: () => {
    noise({ dur: 0.06, freq: 500, vol: 0.25, q: 2 });
    tone({ type: 'triangle', freq: 220, to: 160, dur: 0.08, vol: 0.2 });
  },
  error: () => {
    tone({ type: 'square', freq: 180, dur: 0.09, vol: 0.12, lp: 1200 });
    tone({ type: 'square', freq: 140, dur: 0.12, vol: 0.12, lp: 1200, delay: 0.08 });
  },
  gold: () => {
    tone({ type: 'square', freq: N.A5, dur: 0.07, vol: 0.09, lp: 5000 });
    tone({ type: 'square', freq: N.D6, dur: 0.16, vol: 0.09, lp: 5000, delay: 0.06 });
  },
  travel: () => {
    noise({ dur: 0.05, freq: 900, vol: 0.15, q: 3 });
    noise({ dur: 0.05, freq: 700, vol: 0.15, q: 3, delay: 0.14 });
  },
  fightStart: () => {
    taiko(0, 0.5);
    taiko(0.18, 0.4);
    tone({ type: 'sawtooth', freq: N.D4, to: N.D5, dur: 0.45, vol: 0.12, lp: 1800, delay: 0.3 });
  },
  swing: () => noise({ dur: 0.12, freq: 2500, to: 700, vol: 0.12, q: 1.5 }),
  hit: () => {
    noise({ dur: 0.07, freq: 900, to: 300, vol: 0.22, q: 1 });
    tone({ type: 'sine', freq: 140, to: 70, dur: 0.08, vol: 0.18 });
  },
  crit: () => {
    noise({ dur: 0.1, freq: 1500, to: 400, vol: 0.28, q: 1 });
    tone({ type: 'square', freq: N.A5, to: N.D6, dur: 0.12, vol: 0.08, lp: 4000 });
  },
  cast: () => {
    for (let i = 0; i < 3; i++) tone({ type: 'sine', freq: [N.D5, N.F5, N.A5][i], dur: 0.18, vol: 0.1, delay: i * 0.05 });
  },
  ult: () => {
    noise({ dur: 0.5, freq: 300, to: 80, vol: 0.35, q: 0.8 });
    tone({ type: 'sawtooth', freq: 110, to: 55, dur: 0.5, vol: 0.18, lp: 900 });
    for (const [i, f] of [N.D5, N.A5, N.D6].entries()) tone({ type: 'triangle', freq: f, dur: 0.6, vol: 0.1, delay: 0.04 * i });
  },
  death: () => {
    tone({ type: 'triangle', freq: 330, to: 90, dur: 0.35, vol: 0.18 });
    noise({ dur: 0.2, freq: 400, to: 150, vol: 0.12 });
  },
  victory: () => {
    [N.D5, N.F5, N.G5, N.A5, N.D6].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.22, vol: 0.09, lp: 4000, delay: i * 0.1 }));
    tone({ type: 'triangle', freq: N.D4, dur: 0.9, vol: 0.18, delay: 0.4 });
    tone({ type: 'triangle', freq: N.A4, dur: 0.9, vol: 0.14, delay: 0.4 });
  },
  defeat: () => {
    [N.A4, N.G4, N.F4, N.D4].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.4, vol: 0.16, delay: i * 0.22 }));
    taiko(0.9, 0.4);
  },
  packOpen: () => {
    noise({ dur: 0.25, freq: 3000, to: 1200, vol: 0.18, q: 0.7 });
    tone({ type: 'sine', freq: N.D6, dur: 0.3, vol: 0.06, delay: 0.15 });
  },
  reveal_common: () => tone({ type: 'triangle', freq: N.D5, dur: 0.15, vol: 0.12 }),
  reveal_uncommon: () => {
    tone({ type: 'triangle', freq: N.D5, dur: 0.15, vol: 0.12 });
    tone({ type: 'triangle', freq: N.A5, dur: 0.22, vol: 0.12, delay: 0.07 });
  },
  reveal_rare: () => [N.D5, N.F5, N.A5].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.25, vol: 0.07, lp: 3500, delay: i * 0.06 })),
  reveal_epic: () => {
    [N.D5, N.G5, N.A5, N.D6].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.3, vol: 0.07, lp: 4000, delay: i * 0.06 }));
    noise({ dur: 0.4, freq: 5000, vol: 0.06, q: 3, delay: 0.1 });
  },
  reveal_legendary: () => {
    taiko(0, 0.5);
    [N.D5, N.F5, N.G5, N.A5, N.C6, N.D6].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.35, vol: 0.07, lp: 5000, delay: 0.1 + i * 0.07 }));
    for (const f of [N.D4, N.A4, N.D5]) tone({ type: 'sawtooth', freq: f, dur: 1.4, vol: 0.06, lp: 2500, attack: 0.1, delay: 0.5 });
    noise({ dur: 1.0, freq: 6000, vol: 0.06, q: 4, delay: 0.5, attack: 0.2 });
  },
  mergeCharge: () => tone({ type: 'sawtooth', freq: 200, to: 900, dur: 0.45, vol: 0.08, lp: 2500, attack: 0.2 }),
  merge: () => {
    noise({ dur: 0.18, freq: 1800, vol: 0.18 });
    for (const f of [N.D5, N.A5, N.D6]) tone({ type: 'triangle', freq: f, dur: 0.5, vol: 0.1 });
  },
};

function taiko(delay: number, vol: number): void {
  tone({ type: 'sine', freq: 120, to: 50, dur: 0.35, vol, delay });
  noise({ dur: 0.08, freq: 300, vol: vol * 0.5, delay });
}

const lastPlayed: Record<string, number> = {};

export type SfxName = keyof typeof RECIPES | string;

export const Sfx = {
  play(name: SfxName, vol = 1): void {
    if (!AudioOut.ready || vol <= 0) return;
    const now = AudioOut.ctx!.currentTime;
    if (now - (lastPlayed[name] ?? -1) < 0.035) return;
    lastPlayed[name] = now;
    const recipe = RECIPES[name];
    if (recipe) recipe();
  },
  names(): string[] {
    return Object.keys(RECIPES);
  },
};
