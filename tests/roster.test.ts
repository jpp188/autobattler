import { describe, expect, it } from 'vitest';
import { addUnit, boardUnits, moveUnit, resolveMerges, type RosterState } from '../src/core/roster';
import { gainArtifact, newRun } from '../src/core/run';
import { CONFIG } from '../src/core/config';

function roster(): RosterState {
  return { units: [], nextUid: 1, boardLimit: 5, benchSize: 8 };
}

describe('merging', () => {
  it('two 1-stars on the bench make a 2-star', () => {
    const r = roster();
    addUnit(r, 'ronin');
    const { merges } = addUnit(r, 'ronin');
    expect(merges).toHaveLength(1);
    expect(r.units).toHaveLength(1);
    expect(r.units[0].star).toBe(2);
    expect(r.units[0].loc.at).toBe('bench');
  });

  it('two 2-stars make a 3-star (cascading from new copies)', () => {
    const r = roster();
    for (let i = 0; i < 4; i++) addUnit(r, 'ashigaru');
    expect(r.units).toHaveLength(1);
    expect(r.units[0].star).toBe(3);
  });

  it('a merge triggered from the board keeps the board position', () => {
    const r = roster();
    const a = addUnit(r, 'kappa').uid;
    expect(moveUnit(r, a, { at: 'board', col: 2, row: 1 })).toBe(true);
    addUnit(r, 'kappa');
    expect(r.units).toHaveLength(1);
    expect(r.units[0].star).toBe(2);
    expect(r.units[0].loc).toEqual({ at: 'board', col: 2, row: 1 });
  });

  it('a 2-star on the board absorbs a 2-star made on the bench', () => {
    const r = roster();
    addUnit(r, 'tengu');
    addUnit(r, 'tengu');
    const two = r.units[0];
    moveUnit(r, two.uid, { at: 'board', col: 0, row: 0 });
    addUnit(r, 'tengu');
    addUnit(r, 'tengu');
    expect(r.units).toHaveLength(1);
    expect(r.units[0].star).toBe(3);
    expect(r.units[0].loc).toEqual({ at: 'board', col: 0, row: 0 });
  });

  it('merging combines training bonuses', () => {
    const r = roster();
    addUnit(r, 'ronin');
    r.units[0].trained.hp = 100;
    addUnit(r, 'ronin');
    r.units[0].trained.ad = 5;
    expect(r.units[0].trained).toEqual({ hp: 100, ad: 5 });
    resolveMerges(r);
    expect(r.units).toHaveLength(1);
  });

  it('3-stars never merge further', () => {
    const r = roster();
    for (let i = 0; i < 8; i++) addUnit(r, 'ronin');
    expect(r.units.map((u) => u.star)).toEqual([3, 3]);
  });

  it('units beyond the bench go pending instead of being discarded', () => {
    const r = roster();
    r.benchSize = 2;
    addUnit(r, 'ronin');
    addUnit(r, 'kappa');
    addUnit(r, 'tengu');
    expect(r.units).toHaveLength(3);
    expect(r.units.filter((u) => u.loc.at === 'pending')).toHaveLength(1);
  });
});

describe('board limit', () => {
  it('is enforced when moving units from the bench', () => {
    const r = roster();
    r.boardLimit = 2;
    const ids = ['ronin', 'kappa', 'tengu'].map((id) => addUnit(r, id).uid);
    expect(moveUnit(r, ids[0], { at: 'board', col: 0, row: 0 })).toBe(true);
    expect(moveUnit(r, ids[1], { at: 'board', col: 1, row: 0 })).toBe(true);
    expect(moveUnit(r, ids[2], { at: 'board', col: 2, row: 0 })).toBe(false);
    expect(boardUnits(r)).toHaveLength(2);
    // Swapping with a board unit is always allowed.
    expect(moveUnit(r, ids[2], { at: 'board', col: 0, row: 0 })).toBe(true);
    expect(boardUnits(r)).toHaveLength(2);
  });

  it('starts at 5 including the Hero and artifacts raise it up to the cap', () => {
    const run = newRun('kaede', 'kaede_default', 1);
    expect(run.roster.boardLimit).toBe(5);
    expect(boardUnits(run.roster).filter((u) => u.hero)).toHaveLength(1);
    gainArtifact(run, 'war_banner');
    expect(run.roster.boardLimit).toBe(6);
    gainArtifact(run, 'imperial_standard');
    expect(run.roster.boardLimit).toBe(8);
    gainArtifact(run, 'temple_gong');
    gainArtifact(run, 'oni_crown');
    gainArtifact(run, 'phoenix_feather');
    expect(run.roster.boardLimit).toBe(CONFIG.board.maxLimit);
  });

  it('the Hero cannot be benched', () => {
    const run = newRun('gorou', 'gorou_default', 2);
    const hero = run.roster.units.find((u) => u.hero)!;
    expect(moveUnit(run.roster, hero.uid, { at: 'bench', slot: 0 })).toBe(false);
  });
});
