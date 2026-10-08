import { describe, expect, it } from 'vitest';
import { botStep } from '../src/core/bot';
import { Battle, type BattleResult } from '../src/core/combat';
import { CONFIG } from '../src/core/config';
import { Rng } from '../src/core/rng';
import { MemoryStore, SaveSystem } from '../src/core/save';
import { buildBattle, enterNode, heroMaxHp, newRun, resolveBattle, skipReward, startAct, type RunState } from '../src/core/run';
import { validateRunState } from '../src/core/validate';

function playUntil(run: RunState, rng: Rng, done: (r: RunState) => boolean, max = 5000): RunState {
  for (let i = 0; i < max && !done(run); i++) {
    if (!botStep(run, rng)) break;
    const err = validateRunState(run);
    if (err) throw new Error(err);
  }
  return run;
}

function result(partial: Partial<BattleResult>): BattleResult {
  return {
    outcome: 'win',
    heroDied: false,
    heroHp: 100,
    heroMaxHp: 100,
    ticks: 100,
    survivors: [],
    damageByOwner: {},
    onlyHeroSurvived: false,
    heroDamageTaken: 0,
    ...partial,
  };
}

/** Moves a fresh run to its first battle. */
function toFirstBattle(seed: number): RunState {
  const run = newRun('kaede', 'kaede_default', seed);
  return playUntil(run, new Rng(seed), (r) => r.screen === 'battle');
}

describe('run flow', () => {
  it('save, reload and resume gives the identical run', () => {
    const seed = 4242;
    const run = newRun('hoshi', 'hoshi_default', seed);
    const botRng = new Rng(99);
    playUntil(run, botRng, () => false, 60);
    // Save mid-run, reload into a separate object, and give the copy the same bot.
    const saves = new SaveSystem(new MemoryStore());
    saves.saveRun(run);
    const loaded = saves.loadRun<RunState>()!;
    expect(loaded).toEqual(run);
    const rngCopy = new Rng(0);
    rngCopy.state = botRng.state;
    playUntil(run, botRng, (r) => r.screen === 'over' || r.screen === 'victory');
    playUntil(loaded, rngCopy, (r) => r.screen === 'over' || r.screen === 'victory');
    expect(JSON.stringify(loaded)).toEqual(JSON.stringify(run));
  });

  it('a full bot run always reaches an ending', () => {
    for (const seed of [1, 2, 3]) {
      const run = newRun(['kaede', 'hoshi', 'gorou'][seed - 1], `${['kaede', 'hoshi', 'gorou'][seed - 1]}_default`, seed);
      playUntil(run, new Rng(seed), (r) => r.screen === 'over' || r.screen === 'victory', 8000);
      expect(['over', 'victory']).toContain(run.screen);
      expect(run.result).not.toBeNull();
    }
  });

  it('the Hero dying ends the run', () => {
    const run = toFirstBattle(7);
    resolveBattle(run, result({ outcome: 'loss', heroDied: true, heroHp: 0 }));
    expect(run.screen).toBe('over');
    expect(run.result?.won).toBe(false);
    expect(run.heroHp).toBe(0);
  });

  it('a real fight where the Hero is killed ends the run', () => {
    const run = toFirstBattle(8);
    const setup = buildBattle(run);
    // Make the enemies overwhelming.
    for (const u of setup.units) if (u.team === 1) u.stats = { ...u.stats, ad: 5000, hp: 50000 };
    const res = new Battle(setup).runToEnd();
    expect(res.heroDied).toBe(true);
    resolveBattle(run, res);
    expect(run.screen).toBe('over');
  });

  it('Hero HP carries over and heals 10% after a win', () => {
    const run = toFirstBattle(9);
    const max = heroMaxHp(run);
    const hpAfterFight = Math.round(max * 0.5);
    resolveBattle(run, result({ heroHp: hpAfterFight, heroMaxHp: max }));
    expect(run.heroHp).toBe(hpAfterFight + Math.round(max * CONFIG.hero.healAfterWinPct));
    expect(run.screen).toBe('reward');
  });

  it('a timeout costs the Hero 25% of max HP', () => {
    const run = toFirstBattle(10);
    const max = heroMaxHp(run);
    resolveBattle(run, result({ outcome: 'timeout', heroHp: max, heroMaxHp: max }));
    expect(run.heroHp).toBe(max - Math.round(max * 0.25));
  });

  it('beating a boss moves on to the next act, and the Act III boss wins the run', () => {
    const run = newRun('gorou', 'gorou_default', 11);
    for (const act of [1, 2, 3]) {
      startAct(run, act);
      const boss = run.map.nodes.find((n) => n.kind === 'boss')!;
      // Teleport next to the boss.
      const before = run.map.nodes.find((n) => n.next.includes(boss.id))!;
      run.nodeId = before.id;
      run.screen = 'map';
      enterNode(run, boss.id);
      expect(run.screen).toBe('battle');
      resolveBattle(run, result({ heroHp: heroMaxHp(run), heroMaxHp: heroMaxHp(run) }));
      if (run.reward?.bossArtifactChoices) run.reward.bossArtifactChoices = null;
      run.reward!.bonusPacks = [];
      skipReward(run);
      if (act < 3) {
        expect(run.act).toBe(act + 1);
        expect(run.screen).toBe('map');
      } else {
        expect(run.screen).toBe('victory');
        expect(run.result?.won).toBe(true);
      }
    }
  });

  it('every act map has two possible bosses across seeds', () => {
    for (const act of [1, 2, 3]) {
      const bosses = new Set<string>();
      for (let s = 1; s < 40; s++) bosses.add(newRun('kaede', 'kaede_default', s).bosses[act]);
      expect(bosses.size).toBe(2);
    }
  });
});
