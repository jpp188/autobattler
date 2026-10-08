/**
 * Headless battle: runs one fight and prints the log.
 *   npm run battle -- [seed]
 */
import { Battle } from '../src/core/combat';
import { buildTeam } from '../src/core/battleSetup';
import { enemyToGrid, playerToGrid } from '../src/core/hex';
import { findUnit, getHero, getUnit, TRAITS } from '../src/data';

const seed = Number(process.argv[2] ?? 42);
const player = buildTeam(
  [
    { def: getHero('kaede'), star: 1, hex: playerToGrid(3, 1), isHero: true, ownerUid: 1 },
    { def: getUnit('ashigaru'), star: 2, hex: playerToGrid(2, 0), ownerUid: 2 },
    { def: getUnit('ronin'), star: 1, hex: playerToGrid(4, 0), ownerUid: 3 },
    { def: getUnit('star_archer'), star: 1, hex: playerToGrid(1, 3), ownerUid: 4 },
    { def: getUnit('talisman_scribe'), star: 1, hex: playerToGrid(5, 3), ownerUid: 5 },
  ],
  0,
  TRAITS,
);
const enemy = buildTeam(
  [
    { def: getUnit('oni_grunt'), star: 2, hex: enemyToGrid(3, 0) },
    { def: getUnit('karasu'), star: 1, hex: enemyToGrid(1, 0) },
    { def: getUnit('chochin'), star: 1, hex: enemyToGrid(4, 2) },
    { def: getUnit('saru_archer'), star: 1, hex: enemyToGrid(2, 3) },
  ],
  1,
  TRAITS,
);
const battle = new Battle({ seed, units: [...player.inputs, ...enemy.inputs], lookup: findUnit });
console.log(`Seed ${seed}`);
console.log('Player traits:', player.statuses.filter((s) => s.active).map((s) => `${s.trait.name} ${s.count}`).join(', ') || 'none');
console.log('Enemy traits:', enemy.statuses.filter((s) => s.active).map((s) => `${s.trait.name} ${s.count}`).join(', ') || 'none');
while (!battle.done) {
  battle.step();
  for (const e of battle.events) {
    const line = battle.describeEvent(e);
    if (line) console.log(`[${(battle.tick / 20).toFixed(2)}s] ${line}`);
  }
}
console.log('Result:', JSON.stringify(battle.result));
