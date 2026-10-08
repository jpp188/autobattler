import { describe, expect, it } from 'vitest';
import { HEROES, PACK_UNITS, TRAITS, getTrait } from '../src/data';
import type { Rarity } from '../src/core/types';

const PASSIVES_BY_RARITY: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 3 };

describe('content data', () => {
  it('every pack unit has one origin, one class, the right passive count and an ult', () => {
    for (const u of PACK_UNITS) {
      expect(getTrait(u.origin).kind, u.id).toBe('origin');
      expect(getTrait(u.cls).kind, u.id).toBe('class');
      expect(u.passives.length, u.id).toBe(PASSIVES_BY_RARITY[u.rarity]);
      expect(u.ult.steps.length, u.id).toBeGreaterThan(0);
      expect(u.flavor.length, u.id).toBeGreaterThan(0);
    }
  });

  it('has about 30 units spread across rarities', () => {
    const counts: Record<string, number> = {};
    for (const u of PACK_UNITS) counts[u.rarity] = (counts[u.rarity] ?? 0) + 1;
    expect(PACK_UNITS.length).toBeGreaterThanOrEqual(30);
    expect(counts).toMatchObject({ common: 10, uncommon: 8, rare: 6, epic: 4, legendary: 2 });
  });

  it('every trait has at least two Common units (for themed starters)', () => {
    for (const t of TRAITS) {
      const commons = PACK_UNITS.filter((u) => u.rarity === 'common' && (u.origin === t.id || u.cls === t.id));
      expect(commons.length, t.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('heroes have 2 traits, 2 passives, an ult, a perk and 3 skins', () => {
    expect(HEROES.length).toBe(3);
    for (const h of HEROES) {
      expect(getTrait(h.origin)).toBeDefined();
      expect(getTrait(h.cls)).toBeDefined();
      expect(h.passives.length).toBe(2);
      expect(h.skins.length).toBeGreaterThanOrEqual(3);
      expect(h.perk.desc.length).toBeGreaterThan(0);
    }
  });
});
