import { describe, expect, it } from 'vitest';
import { emptyContext, openPack, packOdds, resolvePackInstance, slotOdds, traitSlotChance } from '../src/core/packs';
import { Rng } from '../src/core/rng';
import { RARITIES, type PackDef } from '../src/core/types';
import { CLASS_IDS, ORIGIN_IDS, PACK_UNITS, PACKS, getPack } from '../src/data';

const N = 10000;

describe('pack odds', () => {
  it('has at least 15 pack types', () => {
    expect(PACKS.length).toBeGreaterThanOrEqual(15);
  });

  for (const def of PACKS.filter((p: PackDef) => p.cards > 0 && p.special !== 'duplicate' && p.special !== 'mirror')) {
    it(`${def.id}: 10,000 openings match the calculated rarity odds`, () => {
      const rng = new Rng(1234);
      const ctx = { ...emptyContext(1), heroTraits: ['jade', 'blade'] };
      const inst = resolvePackInstance(def, rng, { origins: ORIGIN_IDS, classes: CLASS_IDS });
      const counts = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<string, number>;
      let total = 0;
      for (let i = 0; i < N; i++) {
        for (const c of openPack(def, inst, ctx, PACK_UNITS, rng)) {
          counts[c.rarity]++;
          total++;
        }
      }
      const expected = packOdds(def, inst, ctx, PACK_UNITS);
      for (const r of RARITIES) {
        const got = counts[r] / total;
        expect(Math.abs(got - expected[r]), `${def.id} ${r}: got ${got} expected ${expected[r]}`).toBeLessThan(0.015);
      }
      // Guaranteed slots never roll below their minimum.
      for (const g of def.guaranteed ?? []) {
        const so = slotOdds(def, inst, g.slot, ctx, PACK_UNITS);
        const min = RARITIES.indexOf(g.minRarity);
        for (let i = 0; i < min; i++) expect(so[RARITIES[i]]).toBe(0);
      }
    });
  }

  it('the definition weights drive the distribution (Basic Pack)', () => {
    const def = getPack('basic');
    const odds = packOdds(def, { defId: 'basic' }, emptyContext(1), PACK_UNITS);
    const total = Object.values(def.weights).reduce((a, b) => a + b, 0);
    for (const r of RARITIES) expect(odds[r]).toBeCloseTo(def.weights[r] / total, 5);
  });

  it('momentum bonuses raise the chance of pulling that trait', () => {
    const def = getPack('basic');
    const base = emptyContext(1);
    const boosted = { ...emptyContext(1), momentum: { oni: 100 } };
    const p0 = traitSlotChance(def, { defId: 'basic' }, 0, base, PACK_UNITS, 'oni');
    const p1 = traitSlotChance(def, { defId: 'basic' }, 0, boosted, PACK_UNITS, 'oni');
    expect(p1).toBeGreaterThan(p0 * 1.15);
    // And the simulation agrees.
    const count = (ctx: typeof base) => {
      const rng = new Rng(9);
      let n = 0;
      let all = 0;
      for (let i = 0; i < N; i++)
        for (const c of openPack(def, { defId: 'basic' }, ctx, PACK_UNITS, rng)) {
          all++;
          const u = PACK_UNITS.find((x) => x.id === c.unitId)!;
          if (u.origin === 'oni' || u.cls === 'oni') n++;
        }
      return n / all;
    };
    const s0 = count(base);
    const s1 = count(boosted);
    expect(Math.abs(s0 - p0)).toBeLessThan(0.015);
    expect(Math.abs(s1 - p1)).toBeLessThan(0.015);
    expect(s1).toBeGreaterThan(s0);
  });

  it('later acts lean slightly rarer', () => {
    const def = getPack('basic');
    const a1 = packOdds(def, { defId: 'basic' }, emptyContext(1), PACK_UNITS);
    const a3 = packOdds(def, { defId: 'basic' }, emptyContext(3), PACK_UNITS);
    expect(a3.legendary).toBeGreaterThan(a1.legendary);
    expect(a3.common).toBeLessThan(a1.common);
  });

  it('trait packs only contain units of that trait', () => {
    const def = getPack('trait_jade');
    const rng = new Rng(5);
    for (let i = 0; i < 200; i++)
      for (const c of openPack(def, { defId: def.id, traits: ['jade'] }, emptyContext(1), PACK_UNITS, rng)) {
        const u = PACK_UNITS.find((x) => x.id === c.unitId)!;
        expect(u.origin === 'jade' || u.cls === 'jade').toBe(true);
      }
  });

  it('duplicate packs include a unit you own', () => {
    const def = getPack('duplicate');
    const ctx = { ...emptyContext(1), owned: ['kirin'] };
    const cards = openPack(def, { defId: 'duplicate' }, ctx, PACK_UNITS, new Rng(3));
    expect(cards[0].unitId).toBe('kirin');
    expect(cards).toHaveLength(3);
  });
});
