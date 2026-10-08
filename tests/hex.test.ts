import { describe, expect, it } from 'vitest';
import { firstStepToward, hexDistance, neighbors, enemyToGrid, playerToGrid } from '../src/core/hex';

describe('hex grid', () => {
  it('neighbours are all at distance 1', () => {
    const c = { col: 3, row: 3 };
    const ns = neighbors(c);
    expect(ns.length).toBe(6);
    for (const n of ns) expect(hexDistance(c, n)).toBe(1);
  });

  it('maps player and enemy front rows next to each other', () => {
    expect(playerToGrid(3, 0)).toEqual({ col: 3, row: 4 });
    expect(enemyToGrid(3, 0)).toEqual({ col: 3, row: 3 });
    expect(hexDistance(playerToGrid(3, 0), enemyToGrid(3, 0))).toBe(1);
    expect(hexDistance(playerToGrid(3, 3), enemyToGrid(3, 3))).toBe(7);
  });

  it('finds a path step around blockers', () => {
    const start = { col: 0, row: 7 };
    const target = { col: 0, row: 0 };
    const step = firstStepToward(start, (h) => hexDistance(h, target) <= 1, () => false);
    expect(step).not.toBeNull();
    expect(hexDistance(start, step!)).toBe(1);
    expect(hexDistance(step!, target)).toBeLessThan(hexDistance(start, target));
  });
});
