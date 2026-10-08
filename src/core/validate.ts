/**
 * Invariant checks for a run state. Used by the bot simulation and tests to
 * catch invalid states early.
 */
import { CONFIG } from './config';
import { heroMaxHp, type RunState } from './run';
import { boardUnits } from './roster';

export function validateRunState(run: RunState): string | null {
  const r = run.roster;
  const heroes = r.units.filter((u) => u.hero);
  if (heroes.length !== 1) return 'expected exactly one hero';
  if (run.screen !== 'over' && heroes[0].loc.at !== 'board') return 'hero not on board';
  if (boardUnits(r).length > r.boardLimit) return `board over limit (${boardUnits(r).length}/${r.boardLimit})`;
  if (r.boardLimit > CONFIG.board.maxLimit) return 'board limit above cap';
  const seen = new Set<string>();
  for (const u of r.units) {
    if (u.star < 1 || u.star > 3) return `bad star ${u.star}`;
    if (u.loc.at === 'pending') continue;
    const k = u.loc.at === 'board' ? `b${u.loc.col},${u.loc.row}` : `s${u.loc.slot}`;
    if (seen.has(k)) return `two units at ${k}`;
    seen.add(k);
    if (u.loc.at === 'bench' && u.loc.slot >= r.benchSize) return 'bench slot out of range';
  }
  if (run.screen !== 'overflow' && run.screen !== 'packOpen' && r.units.some((u) => u.loc.at === 'pending')) return `pending units outside overflow (${run.screen})`;
  // No two identical units at the same star below 3 (they should have merged).
  const groups = new Map<string, number>();
  for (const u of r.units) if (!u.hero && u.star < 3) groups.set(`${u.defId}|${u.star}`, (groups.get(`${u.defId}|${u.star}`) ?? 0) + 1);
  for (const [k, n] of groups) if (n > 1) return `unmerged duplicates ${k}`;
  if (run.gold < 0) return 'negative gold';
  if (run.heroHp < 0 || run.heroHp > heroMaxHp(run)) return `hero hp out of range ${run.heroHp}/${heroMaxHp(run)}`;
  if (run.screen === 'over' && run.result?.won) return 'over but won';
  if (run.screen !== 'over' && run.screen !== 'victory' && run.heroHp <= 0) return 'hero dead but run continues';
  for (const m of Object.values(run.momentum)) if (m < 0 || m > 100) return 'momentum out of range';
  return null;
}
