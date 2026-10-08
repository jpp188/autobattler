/**
 * Headless full-run bot: plays N complete runs with the simple AI and reports
 * win rate, average floor reached and any crash or softlock.
 *   npm run sim -- [runs] [startSeed] [--prologue]
 * Runs start in Act I like every run after the first; --prologue plays it.
 */
import { botStep } from '../src/core/bot';
import { Rng } from '../src/core/rng';
import { floorReached, newRun, type RunState } from '../src/core/run';
import { HEROES } from '../src/data';
import { validateRunState } from '../src/core/validate';

const runs = Number(process.argv[2] ?? 50);
const startSeed = Number(process.argv[3] ?? 1);
const withPrologue = process.argv.includes('--prologue');
let wins = 0;
let floors = 0;
let reachedAct2 = 0;
const actReached: number[] = [0, 0, 0, 0];
const failures: string[] = [];
const deathActs: Record<string, number> = {};
const byHero: Record<string, [number, number]> = {};
const t0 = Date.now();

for (let i = 0; i < runs; i++) {
  const seed = startSeed + i * 7919;
  const hero = HEROES[i % HEROES.length];
  const rng = new Rng(seed ^ 0x9e3779b9);
  let run: RunState = newRun(hero.id, hero.skins[0].id, seed, { skipPrologue: !withPrologue });
  let steps = 0;
  try {
    while (botStep(run, rng)) {
      // Round-trip through JSON every step: proves the state is always saveable.
      run = JSON.parse(JSON.stringify(run));
      const err = validateRunState(run);
      if (err) throw new Error(`Invalid state on ${run.screen}: ${err}`);
      if (++steps > 5000) throw new Error(`Softlock on screen ${run.screen}`);
    }
  } catch (e) {
    failures.push(`seed ${seed} (${hero.id}): ${(e as Error).stack?.split('\n').slice(0, 3).join(' | ')}`);
    continue;
  }
  byHero[hero.id] ??= [0, 0];
  byHero[hero.id][1]++;
  if (run.result?.won) byHero[hero.id][0]++;
  if (run.result?.won) wins++;
  else deathActs[`act${run.act}`] = (deathActs[`act${run.act}`] ?? 0) + 1;
  floors += floorReached(run);
  actReached[run.act]++;
  if (run.act >= 2) reachedAct2++;
}

const done = runs - failures.length;
console.log(`Runs: ${runs}  completed: ${done}  crashes/softlocks: ${failures.length}`);
console.log(`Win rate: ${((wins / Math.max(1, done)) * 100).toFixed(1)}%  (${wins} wins)`);
console.log(`Average floor reached: ${(floors / Math.max(1, done)).toFixed(1)}`);
console.log(`Reached Act 2 or later: ${((reachedAct2 / Math.max(1, done)) * 100).toFixed(1)}%`);
console.log(`Final act distribution: prologue ${actReached[0]}, act1 ${actReached[1]}, act2 ${actReached[2]}, act3 ${actReached[3]}`);
console.log(`Wins by Hero: ${Object.entries(byHero).map(([h, [w, n]]) => `${h} ${w}/${n}`).join(', ')}`);
console.log(`Losses by act: ${JSON.stringify(deathActs)}`);
console.log(`Time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const f of failures) console.log('FAIL', f);
if (failures.length) process.exit(1);
