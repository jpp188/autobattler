/**
 * The Web Audio graph: one context, created on the player's first tap or
 * click (browsers block audio before that), with master, music and effects
 * buses whose volumes come from the settings.
 */
import type { Settings } from '../core/meta';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private settings: Settings | null = null;
  private listeners: (() => void)[] = [];

  /** Call once at startup: unlocks audio on the first user gesture. */
  installUnlock(): void {
    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** Runs `fn` once audio is available (immediately if it already is). */
  onReady(fn: () => void): void {
    if (this.ctx) fn();
    else this.listeners.push(fn);
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    // A gentle compressor keeps stacked battle sounds from clipping.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    if (this.settings) this.apply(this.settings);
    const ls = this.listeners;
    this.listeners = [];
    for (const fn of ls) fn();
  }

  apply(s: Settings): void {
    this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.02);
    this.music.gain.setTargetAtTime(s.music * 0.5, t, 0.05);
    this.sfx.gain.setTargetAtTime(s.sfx, t, 0.02);
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  noise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 1;
    for (let i = 0; i < d.length; i++) {
      s = (s * 16807) % 2147483647;
      d[i] = (s / 2147483647) * 2 - 1;
    }
    this.noiseBuf = buf;
    return buf;
  }
}

export const AudioOut = new AudioEngine();

export interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Glide to this frequency over the note. */
  to?: number;
  dur: number;
  vol?: number;
  attack?: number;
  /** Start offset in seconds from now (or from `at`). */
  delay?: number;
  at?: number;
  bus?: GainNode;
  /** Low-pass filter cutoff. */
  lp?: number;
}

/** Plays one enveloped oscillator note. */
export function tone(o: ToneOpts): void {
  const a = AudioOut;
  const ctx = a.ctx;
  if (!ctx) return;
  const t0 = (o.at ?? ctx.currentTime) + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
  const vol = o.vol ?? 0.3;
  const att = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  let node: AudioNode = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lp;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(o.bus ?? a.sfx);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

export interface NoiseOpts {
  dur: number;
  vol?: number;
  /** Band-pass centre frequency (sweeps to `to` if given). */
  freq?: number;
  to?: number;
  q?: number;
  delay?: number;
  at?: number;
  bus?: GainNode;
  attack?: number;
}

/** Plays a burst of filtered noise (hits, whooshes, drums). */
export function noise(o: NoiseOpts): void {
  const a = AudioOut;
  const ctx = a.ctx;
  if (!ctx) return;
  const t0 = (o.at ?? ctx.currentTime) + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = a.noise();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + (o.attack ?? 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(o.bus ?? a.sfx);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.05);
}
