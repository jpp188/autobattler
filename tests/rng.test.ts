import { describe, expect, it } from 'vitest';
import { Rng, hashSeed } from '../src/core/rng';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('can be resumed from its saved state', () => {
    const a = new Rng(99);
    for (let i = 0; i < 10; i++) a.next();
    const b = new Rng(a.state);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });

  it('produces values in range and roughly uniform', () => {
    const r = new Rng(7);
    const buckets = [0, 0, 0, 0];
    for (let i = 0; i < 40000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 4)]++;
    }
    for (const b of buckets) expect(Math.abs(b - 10000)).toBeLessThan(500);
  });

  it('weightedIndex respects weights', () => {
    const r = new Rng(11);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[r.weightedIndex([1, 2, 0])]++;
    expect(counts[2]).toBe(0);
    expect(counts[1] / counts[0]).toBeGreaterThan(1.8);
    expect(counts[1] / counts[0]).toBeLessThan(2.2);
  });

  it('hashSeed is stable', () => {
    expect(hashSeed('packbound')).toBe(hashSeed('packbound'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});
