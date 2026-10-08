/**
 * Procedural pentatonic music: a calm koto-style loop for the map and menus
 * and a driving taiko loop for battles. Each track is an 8-bar pattern made
 * from a fixed seed, so it loops like composed music. Notes are scheduled a
 * little ahead of time with the Web Audio clock.
 */
import { AudioOut, noise, tone } from './engine';

type Track = 'map' | 'battle' | 'title';

// D minor pentatonic over two and a half octaves.
const SCALE = [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99];

interface Pattern {
  bpm: number;
  /** 16th-note steps per loop. */
  steps: number;
  melody: (number | null)[];
  bass: (number | null)[];
  drums: (0 | 1 | 2)[];
  lead: OscillatorType;
}

function makePattern(seed: number, battle: boolean): Pattern {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const steps = 8 * 16;
  const melody: (number | null)[] = [];
  const bass: (number | null)[] = [];
  const drums: (0 | 1 | 2)[] = [];
  // Two 4-bar phrases: A then a variation of A.
  const phrase: (number | null)[] = [];
  let note = 7;
  for (let i = 0; i < 64; i++) {
    const onBeat = i % 4 === 0;
    const play = battle ? (onBeat ? rnd() < 0.85 : rnd() < 0.35) : onBeat ? rnd() < 0.6 : i % 2 === 0 && rnd() < 0.2;
    if (play) {
      note = Math.max(4, Math.min(SCALE.length - 1, note + Math.round((rnd() - 0.5) * 4)));
      phrase.push(SCALE[note]);
    } else phrase.push(null);
  }
  for (let i = 0; i < steps; i++) {
    const m = phrase[i % 64];
    // The second phrase drops some notes and resolves on the tonic.
    if (i >= 64 && m && rnd() < 0.2) melody.push(null);
    else melody.push(i === steps - 16 ? SCALE[5] : m);
  }
  const roots = [0, 0, 3, 2, 0, 0, 3, 4];
  for (let i = 0; i < steps; i++) {
    const bar = Math.floor(i / 16);
    const r = SCALE[roots[bar]] / 2;
    bass.push(battle ? (i % 4 === 0 ? r : null) : i % 16 === 0 ? r : null);
    if (battle) drums.push(i % 16 === 0 || i % 16 === 10 ? 2 : i % 4 === 0 ? 1 : 0);
    else drums.push(i % 32 === 0 ? 1 : 0);
  }
  return { bpm: battle ? 116 : 72, steps, melody, bass, drums, lead: battle ? 'sawtooth' : 'triangle' };
}

const PATTERNS: Record<'map' | 'battle', Pattern> = {
  map: makePattern(4242, false),
  battle: makePattern(1717, true),
};

class MusicPlayer {
  private want: Track | null = null;
  private current: 'map' | 'battle' | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private trackGain: GainNode | null = null;

  constructor() {
    AudioOut.onReady(() => {
      if (this.want) this.start(this.want);
    });
  }

  play(track: Track): void {
    this.want = track;
    if (!AudioOut.ctx) return;
    this.start(track);
  }

  stop(): void {
    this.want = null;
    this.halt();
  }

  private start(track: Track): void {
    const t = track === 'battle' ? 'battle' : 'map';
    if (this.current === t && this.timer !== null) return;
    this.halt();
    const ctx = AudioOut.ctx!;
    this.current = t;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.trackGain = ctx.createGain();
    this.trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.trackGain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.8);
    this.trackGain.connect(AudioOut.music);
    this.timer = window.setInterval(() => this.schedule(), 60);
    this.schedule();
  }

  private halt(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const g = this.trackGain;
    const ctx = AudioOut.ctx;
    if (g && ctx) {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
      window.setTimeout(() => g.disconnect(), 900);
    }
    this.trackGain = null;
    this.current = null;
  }

  private schedule(): void {
    const ctx = AudioOut.ctx;
    if (!ctx || !this.current || !this.trackGain) return;
    const p = PATTERNS[this.current];
    const stepDur = 60 / p.bpm / 4;
    const bus = this.trackGain;
    while (this.nextTime < ctx.currentTime + 0.25) {
      const i = this.step % p.steps;
      const at = this.nextTime;
      const m = p.melody[i];
      if (m) {
        // Plucked lead with a soft octave shimmer.
        tone({ type: p.lead, freq: m, dur: this.current === 'battle' ? 0.22 : 0.9, vol: this.current === 'battle' ? 0.07 : 0.12, lp: this.current === 'battle' ? 2200 : 3000, at, bus });
        if (this.current === 'map') tone({ type: 'sine', freq: m * 2, dur: 0.5, vol: 0.025, at, bus });
      }
      const b = p.bass[i];
      if (b) tone({ type: 'triangle', freq: b, dur: this.current === 'battle' ? 0.3 : 2.4, vol: this.current === 'battle' ? 0.16 : 0.1, attack: this.current === 'battle' ? 0.005 : 0.3, at, bus });
      const d = p.drums[i];
      if (d === 2) {
        tone({ type: 'sine', freq: 110, to: 45, dur: 0.4, vol: 0.32, at, bus });
        noise({ dur: 0.06, freq: 250, vol: 0.12, at, bus });
      } else if (d === 1) {
        if (this.current === 'battle') noise({ dur: 0.04, freq: 2800, vol: 0.05, q: 4, at, bus });
        else tone({ type: 'sine', freq: 90, to: 50, dur: 0.6, vol: 0.12, at, bus });
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

export const Music = new MusicPlayer();
