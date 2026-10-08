import { describe, expect, it } from 'vitest';
import { momentumDecay, momentumGain, momentumTier, updateMomentum } from '../src/core/momentum';

describe('trait momentum', () => {
  it('gain follows 25 × (1 − m/125) (+5 on a win), capped at 100', () => {
    expect(momentumGain(0, false)).toBe(25);
    expect(momentumGain(0, true)).toBe(30);
    expect(momentumGain(50, false)).toBeCloseTo(50 + 25 * (1 - 50 / 125));
    expect(momentumGain(50, true)).toBeCloseTo(50 + 25 * (1 - 50 / 125) + 5);
    expect(momentumGain(98, true)).toBe(100);
  });

  it('decay is max(0, floor(m × 0.45) − 5): 100 → 40 → 13 → 0', () => {
    expect(momentumDecay(100)).toBe(40);
    expect(momentumDecay(40)).toBe(13);
    expect(momentumDecay(13)).toBe(0);
    expect(momentumDecay(0)).toBe(0);
  });

  it('tiers at 25/50/75/100', () => {
    expect(momentumTier(24)).toBe(-1);
    expect(momentumTier(25)).toBe(0);
    expect(momentumTier(74.9)).toBe(1);
    expect(momentumTier(100)).toBe(3);
  });

  it('updates active and inactive traits after a fight', () => {
    const m: Record<string, number> = { oni: 100, jade: 0 };
    const changes = updateMomentum(m, ['oni', 'jade'], ['jade'], true);
    expect(m).toEqual({ oni: 40, jade: 30 });
    expect(changes.find((c) => c.trait === 'jade')!.crossed).toEqual([25]);
  });
});
