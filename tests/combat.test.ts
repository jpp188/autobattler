import { describe, expect, it } from 'vitest';
import { Battle } from '../src/core/combat';
import { buildTeam, type TeamMember } from '../src/core/battleSetup';
import { enemyToGrid, playerToGrid } from '../src/core/hex';
import { findUnit, getHero, getUnit, PACK_UNITS, TRAITS } from '../src/data';
import type { Star } from '../src/core/types';

function fight(player: TeamMember[], enemy: TeamMember[], seed: number, traits = TRAITS) {
  const p = buildTeam(player, 0, traits);
  const e = buildTeam(enemy, 1, traits);
  return new Battle({ seed, units: [...p.inputs, ...e.inputs], lookup: findUnit });
}

function squad(seed: number) {
  return fight(
    [
      { def: getHero('kaede'), star: 1, hex: playerToGrid(3, 1), isHero: true },
      { def: getUnit('ashigaru'), star: 2, hex: playerToGrid(2, 0) },
      { def: getUnit('star_archer'), star: 1, hex: playerToGrid(1, 3) },
      { def: getUnit('chochin'), star: 1, hex: playerToGrid(5, 3) },
    ],
    [
      { def: getUnit('oni_grunt'), star: 2, hex: enemyToGrid(3, 0) },
      { def: getUnit('karasu'), star: 1, hex: enemyToGrid(1, 0) },
      { def: getUnit('raijin'), star: 1, hex: enemyToGrid(4, 2) },
    ],
    seed,
  );
}

describe('combat simulation', () => {
  it('is deterministic for a given seed', () => {
    for (const seed of [1, 2, 3, 99]) {
      const a = squad(seed);
      const b = squad(seed);
      const logA: string[] = [];
      const logB: string[] = [];
      while (!a.done) {
        a.step();
        logA.push(JSON.stringify(a.events));
      }
      while (!b.done) {
        b.step();
        logB.push(JSON.stringify(b.events));
      }
      expect(logA).toEqual(logB);
      expect(a.result).toEqual(b.result);
    }
  });

  it('runToEnd gives the same result as stepping', () => {
    const a = squad(5);
    const b = squad(5);
    while (!a.done) a.step();
    expect(b.runToEnd()).toEqual(a.result);
  });

  it('every pack unit can fight at every star level without errors', () => {
    for (const u of PACK_UNITS) {
      for (const star of [1, 2, 3] as Star[]) {
        const b = fight(
          [{ def: u, star, hex: playerToGrid(3, 0), startCharge: 99 }],
          [{ def: getUnit('tanuki'), star: 3, hex: enemyToGrid(3, 0) }, { def: getUnit('star_archer'), star: 1, hex: enemyToGrid(1, 3) }],
          7,
        );
        const r = b.runToEnd();
        expect(['win', 'loss', 'timeout']).toContain(r.outcome);
        expect(b.units[0].casts, u.id).toBeGreaterThan(0);
      }
    }
  });

  it('a 3-star Common beats a 1-star Epic of the same role in at least 60% of 200 fights', () => {
    const pairs: [string, string][] = [
      ['ashigaru', 'kirin'],
      ['ronin', 'shuten'],
      ['kitsune_cub', 'byakko'],
      ['talisman_scribe', 'jade_phoenix'],
    ];
    for (const [common, epic] of pairs) {
      let wins = 0;
      for (let i = 0; i < 200; i++) {
        const b = fight(
          [{ def: getUnit(common), star: 3, hex: playerToGrid(3, 0) }],
          [{ def: getUnit(epic), star: 1, hex: enemyToGrid(3, 0) }],
          1000 + i,
          [],
        );
        if (b.runToEnd().outcome === 'win') wins++;
      }
      expect(wins / 200, `${common} vs ${epic}`).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('the Hero dying ends the fight as a loss even if allies live', () => {
    const b = fight(
      [
        { def: getHero('hoshi'), star: 1, hex: playerToGrid(3, 0), isHero: true, hp: 1 },
        { def: getUnit('jade_colossus'), star: 3, hex: playerToGrid(0, 3) },
      ],
      [{ def: getUnit('star_archer'), star: 3, hex: enemyToGrid(3, 0) }],
      3,
    );
    const r = b.runToEnd();
    expect(r.outcome).toBe('loss');
    expect(r.heroDied).toBe(true);
    expect(b.units.find((u) => u.def.id === 'jade_colossus')!.alive).toBe(true);
  });

  it('the fight continues while the Hero lives after every other ally dies', () => {
    // Weak allies die quickly; a strong hero should still finish the fight.
    const b = fight(
      [
        { def: getHero('gorou'), star: 1, hex: playerToGrid(3, 3), isHero: true, stat: { powerMult: 4 } },
        { def: getUnit('kitsune_cub'), star: 1, hex: playerToGrid(3, 0), hp: 1 },
        { def: getUnit('saru_archer'), star: 1, hex: playerToGrid(4, 0), hp: 1 },
      ],
      [
        { def: getUnit('ronin'), star: 2, hex: enemyToGrid(3, 0) },
        { def: getUnit('star_archer'), star: 1, hex: enemyToGrid(4, 0) },
      ],
      11,
    );
    let alliesDeadWhileRunning = false;
    while (!b.done) {
      b.step();
      const allies = b.units.filter((u) => u.team === 0 && !u.isHero && !u.isSummon);
      if (!b.done && allies.every((u) => !u.alive)) alliesDeadWhileRunning = true;
    }
    expect(alliesDeadWhileRunning).toBe(true);
    expect(b.result!.outcome).toBe('win');
    expect(b.result!.onlyHeroSurvived).toBe(true);
  });

  it('a boss guarded by guards cannot be damaged until the guards die', () => {
    const boss = { ...getUnit('jade_colossus'), id: 'test_boss', passives: [{ name: 'Guarded', trigger: 'battleStart' as const, steps: [{ sel: { pick: 'self' as const }, effects: [{ k: 'guarded' as const, tag: 'guard' }] }] }] };
    const b = fight(
      [{ def: getUnit('star_archer'), star: 3, hex: playerToGrid(3, 3) }],
      [
        { def: boss, star: 1, hex: enemyToGrid(3, 3) },
        { def: getUnit('bone_guard'), star: 1, hex: enemyToGrid(3, 0) },
      ],
      4,
      [],
    );
    let bossHitWhileGuarded = false;
    const bossUnit = b.units.find((u) => u.def.id === 'test_boss')!;
    while (!b.done) {
      const guardAlive = b.units.some((u) => u.def.id === 'bone_guard' && u.alive);
      const before = bossUnit.hp;
      b.step();
      if (guardAlive && b.units.some((u) => u.def.id === 'bone_guard' && u.alive) && bossUnit.hp < before) bossHitWhileGuarded = true;
    }
    expect(bossHitWhileGuarded).toBe(false);
  });
});
