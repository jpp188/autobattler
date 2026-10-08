import { describe, expect, it } from 'vitest';
import type { Outcome } from '../src/core/types';
import { ACHIEVEMENTS, ARTIFACTS, ENCOUNTERS, EVENTS, findUnit, getAchievement, getArtifact, getPack, getTrait, HEROES, PACKS, TRAITS, UNITS } from '../src/data';

describe('content', () => {
  it('has at least 15 pack types with valid trait filters', () => {
    // Trait packs come in one per trait.
    const traitPacks = PACKS.filter((p) => p.id.startsWith('trait_'));
    expect(traitPacks.length).toBe(TRAITS.length);
    expect(PACKS.length).toBeGreaterThanOrEqual(15 + TRAITS.length - 1);
    for (const p of PACKS) {
      for (const t of p.filter?.traits ?? []) expect(getTrait(t), p.id).toBeDefined();
      if (p.special === 'artifact') continue;
      expect(p.cards, p.id).toBeGreaterThan(0);
      expect(Object.values(p.weights).some((w) => w > 0), p.id).toBe(true);
    }
    for (const id of ['basic', 'origin', 'class', 'duo', 'duplicate', 'gamble', 'elite', 'boss', 'momentum', 'mirror', 'hero', 'mystery', 'artifact_pack', 'prologue', 'themed_starter', 'uncommon_starter']) {
      expect(getPack(id)).toBeDefined();
    }
  });

  it('has varied artifacts across all tiers, and only a few raise the board limit', () => {
    expect(ARTIFACTS.length).toBeGreaterThanOrEqual(24);
    for (const tier of ['common', 'uncommon', 'rare', 'boss']) expect(ARTIFACTS.some((a) => a.tier === tier), tier).toBe(true);
    const limit = ARTIFACTS.filter((a) => a.effects.some((e) => e.k === 'boardLimit'));
    expect(limit.length).toBeGreaterThanOrEqual(1);
    expect(limit.length).toBeLessThanOrEqual(3);
    // Bosses (+1 slot each) are the main route to bigger boards, not artifacts.
    expect(ARTIFACTS.filter((a) => a.tier === 'boss').some((a) => !a.effects.some((e) => e.k === 'boardLimit'))).toBe(true);
    const kinds = new Set(ARTIFACTS.flatMap((a) => a.effects.map((e) => e.k)));
    expect(kinds.size).toBeGreaterThanOrEqual(15);
    for (const a of ARTIFACTS) for (const e of a.effects) if (e.k === 'traitOdds') expect(getTrait(e.trait)).toBeDefined();
  });

  it('has about 10 events whose outcomes reference real packs', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(10);
    const flat = (os: readonly Outcome[]): Outcome[] => os.flatMap((o) => (o.k === 'gamble' ? [...flat(o.win), ...flat(o.lose)] : [o]));
    for (const ev of EVENTS) {
      expect(ev.choices.length, ev.id).toBeGreaterThanOrEqual(2);
      // Every event has a choice anyone can take.
      expect(ev.choices.some((c) => !c.requires), ev.id).toBe(true);
      for (const c of ev.choices) for (const o of flat(c.outcomes)) if (o.k === 'pack') expect(getPack(o.pack)).toBeDefined();
    }
  });

  it('every act has its own roster, elites and two bosses with a mechanic', () => {
    for (const act of [0, 1, 2, 3]) {
      const list = ENCOUNTERS.filter((e) => e.act === act);
      expect(list.some((e) => e.kind === 'battle'), `act ${act}`).toBe(true);
      const bosses = list.filter((e) => e.kind === 'boss');
      expect(bosses.length).toBe(act === 0 ? 1 : 2);
      if (act > 0) expect(list.some((e) => e.kind === 'elite')).toBe(true);
      for (const b of bosses) expect(b.mechanic, b.id).toBeTruthy();
    }
    for (const e of ENCOUNTERS) {
      for (const u of e.units) {
        expect(findUnit(u.unit), `${e.id}: ${u.unit}`).toBeDefined();
        expect(u.col).toBeGreaterThanOrEqual(0);
        expect(u.col).toBeLessThan(7);
        expect(u.row).toBeGreaterThanOrEqual(0);
        expect(u.row).toBeLessThan(4);
      }
      const spots = new Set(e.units.map((u) => `${u.col},${u.row}`));
      expect(spots.size, `${e.id} has stacked units`).toBe(e.units.length);
    }
  });

  it('each Hero has at least 5 achievements and 2 unlockable skins', () => {
    for (const h of HEROES) {
      expect(ACHIEVEMENTS.filter((a) => a.hero === h.id).length, h.id).toBeGreaterThanOrEqual(5);
      const unlockable = h.skins.filter((s) => s.unlockedBy);
      expect(unlockable.length).toBeGreaterThanOrEqual(2);
      for (const s of unlockable) expect(getAchievement(s.unlockedBy!).hero).toBe(h.id);
    }
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('every unit has flavour text and a unique sprite key', () => {
    const sprites = new Set<string>();
    for (const u of [...UNITS, ...HEROES]) {
      expect(u.flavor, u.id).toBeTruthy();
      expect(sprites.has(u.sprite), u.sprite).toBe(false);
      sprites.add(u.sprite);
    }
    expect(getArtifact('war_banner')).toBeDefined();
  });
});
