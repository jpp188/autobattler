/**
 * A simple AI player. Used by the headless full-run simulation and by the
 * "Auto" placement button in the battle setup screen.
 */
import { CONFIG } from './config';
import { rarityIndex, type PackInstance } from './types';
import { boardUnits, freeBenchSlots, pendingUnits, type OwnedUnit } from './roster';
import { Battle } from './combat';
import { topMomentumTrait } from './packs';
import {
  availableNodes,
  buildBattle,
  buyHeal,
  buyShopPack,
  choiceAvailable,
  choiceUnitPurpose,
  chooseArtifactPick,
  chooseBossArtifact,
  chooseEvent,
  chooseRewardPack,
  chooseStarter,
  collectOpened,
  enterNode,
  finishEvent,
  finishOverflow,
  heroMaxHp,
  leaveRest,
  leaveShop,
  leaveTreasure,
  openBonusPack,
  restHeal,
  restTrain,
  resolveBattle,
  sellUnit,
  sellValue,
  takeTreasure,
  type RunState,
} from './run';
import type { Rng } from './rng';
import { getPack, getUnit, getHero } from '../data';

/** Rough strength score used to pick which units to field. */
export function unitScore(u: OwnedUnit, heroId?: string): number {
  if (u.hero) return 1e9;
  const def = getUnit(u.defId);
  const starMult = CONFIG.starStatMult[u.star - 1];
  return starMult * CONFIG.rarityStatMult[def.rarity] * 100 + (u.trained.hp ?? 0) / 20 + (u.trained.ad ?? 0) / 4 + (heroId ? 0 : 0);
}

const FRONT_ROLES = new Set(['tank', 'fighter']);

/**
 * Puts the strongest units on the board up to the limit and arranges them:
 * tanks and fighters in front, assassins on the flanks, ranged units and the
 * Hero in the back.
 */
export function autoArrange(run: RunState): void {
  const r = run.roster;
  const placeable = r.units.filter((u) => u.loc.at !== 'pending');
  const traitCount = new Map<string, number>();
  const sorted = placeable.slice().sort((a, b) => unitScore(b) - unitScore(a) || a.uid - b.uid);
  // Pick distinct units first so traits spread, then fill with the rest.
  const chosen: OwnedUnit[] = [];
  const seen = new Set<string>();
  for (const u of sorted) {
    if (chosen.length >= r.boardLimit) break;
    if (u.hero || !seen.has(u.defId)) {
      chosen.push(u);
      seen.add(u.defId);
    }
  }
  for (const u of sorted) {
    if (chosen.length >= r.boardLimit) break;
    if (!chosen.includes(u)) chosen.push(u);
  }
  for (const u of chosen) {
    const d = u.hero ? getHero(u.defId) : getUnit(u.defId);
    for (const t of [d.origin, d.cls]) traitCount.set(t, (traitCount.get(t) ?? 0) + 1);
  }
  // Clear the board: everything not chosen goes to the bench.
  const benchOrder = placeable.filter((u) => !chosen.includes(u));
  const slots: { col: number; row: number }[] = [];
  const front = [3, 2, 4, 1, 5, 0, 6].map((col) => ({ col, row: 0 }));
  const second = [3, 2, 4, 1, 5, 0, 6].map((col) => ({ col, row: 1 }));
  const back = [3, 2, 4, 1, 5, 0, 6].map((col) => ({ col, row: 3 }));
  const third = [3, 2, 4, 1, 5, 0, 6].map((col) => ({ col, row: 2 }));
  const take = (list: { col: number; row: number }[]) => {
    const s = list.find((x) => !slots.some((y) => y.col === x.col && y.row === x.row));
    if (s) slots.push(s);
    return s ?? null;
  };
  const placement = new Map<number, { col: number; row: number }>();
  const order = chosen.slice().sort((a, b) => (a.hero ? 1 : 0) - (b.hero ? 1 : 0));
  for (const u of order) {
    const d = u.hero ? getHero(u.defId) : getUnit(u.defId);
    let spot: { col: number; row: number } | null;
    if (u.hero) spot = d.role === 'tank' ? take(second) ?? take(third) : take(third) ?? take(back);
    else if (FRONT_ROLES.has(d.role)) spot = take(front) ?? take(second);
    else if (d.role === 'assassin') spot = take([...front].reverse()) ?? take(second);
    else spot = take(back) ?? take(third);
    spot = spot ?? take([...front, ...second, ...third, ...back]);
    if (spot) placement.set(u.uid, spot);
  }
  for (const u of placeable) u.loc = { at: 'pending' };
  for (const u of chosen) {
    const p = placement.get(u.uid);
    if (p) u.loc = { at: 'board', col: p.col, row: p.row };
  }
  let slot = 0;
  for (const u of [...benchOrder, ...chosen.filter((c) => !placement.has(c.uid))]) {
    u.loc = slot < r.benchSize ? { at: 'bench', slot: slot++ } : { at: 'pending' };
  }
  void traitCount;
}

function packScore(run: RunState, inst: PackInstance): number {
  const def = getPack(inst.defId);
  const avg = def.cards * (def.weights.rare * 2 + def.weights.epic * 4 + def.weights.legendary * 8 + def.weights.uncommon) / 100;
  let s = def.cards + avg;
  const top = topMomentumTrait(run.momentum);
  if (top && inst.traits?.includes(top)) s += 3;
  if (def.special === 'duplicate' || def.special === 'mirror') s += 2;
  if (def.special === 'artifact') s += 2;
  return s;
}

/** Sells the weakest units until nothing is pending. */
function resolveOverflow(run: RunState): void {
  let guard = 0;
  while (pendingUnits(run.roster).length && guard++ < 50) {
    const cands = run.roster.units.filter((u) => !u.hero && u.loc.at !== 'board').sort((a, b) => unitScore(a) - unitScore(b));
    if (!cands.length) break;
    sellUnit(run, cands[0].uid);
  }
  finishOverflow(run);
}

/** Keeps the bench tidy by selling the weakest bench units if it is nearly full. */
function tidyBench(run: RunState): void {
  const bench = run.roster.units.filter((u) => u.loc.at === 'bench').sort((a, b) => unitScore(a) - unitScore(b));
  while (freeBenchSlots(run.roster).length < 2 && bench.length) {
    const u = bench.shift()!;
    // Keep 1-stars that have a twin waiting to merge.
    sellUnit(run, u.uid);
  }
}

export interface BotStep {
  screen: string;
  note?: string;
}

/** Performs one decision. Returns false when the run is over. */
export function botStep(run: RunState, rng: Rng): boolean {
  switch (run.screen) {
    case 'starter':
      chooseStarter(run, rng.int(0, 1));
      return true;
    case 'packOpen':
      collectOpened(run, 0);
      return true;
    case 'overflow':
      resolveOverflow(run);
      return true;
    case 'map': {
      autoArrange(run);
      tidyBench(run);
      const nodes = availableNodes(run);
      if (!nodes.length) throw new Error('Softlock: no available nodes on map');
      const hpPct = run.heroHp / heroMaxHp(run);
      const pref = (k: string) => {
        if (k === 'rest') return hpPct < 0.6 ? 10 : 1;
        if (k === 'elite') return hpPct > 0.75 ? 4 : 0.5;
        if (k === 'shop') return run.gold > 20 ? 4 : 1;
        if (k === 'treasure') return 6;
        if (k === 'event') return 2;
        return 3;
      };
      const node = rng.weighted(nodes, (n) => pref(n.kind));
      enterNode(run, node.id);
      return true;
    }
    case 'battle': {
      autoArrange(run);
      const b = new Battle(buildBattle(run));
      resolveBattle(run, b.runToEnd());
      return true;
    }
    case 'reward': {
      const r = run.reward!;
      if (r.bossArtifactChoices) {
        chooseBossArtifact(run, 0);
        return true;
      }
      if (r.bonusPacks.length) {
        openBonusPack(run);
        return true;
      }
      const best = r.packs.map((p, i) => ({ i, s: packScore(run, p) + rng.next() })).sort((a, b) => b.s - a.s)[0];
      chooseRewardPack(run, best.i);
      return true;
    }
    case 'shop': {
      const s = run.shop!;
      if (run.heroHp / heroMaxHp(run) < 0.6) buyHeal(run);
      const affordable = s.packs.map((p, i) => ({ p, i })).filter((x) => !x.p.sold && x.p.price <= run.gold - 4);
      if (affordable.length && freeBenchSlots(run.roster).length >= 3) {
        const pick = affordable.sort((a, b) => packScore(run, b.p.inst) / b.p.price - packScore(run, a.p.inst) / a.p.price)[0];
        buyShopPack(run, pick.i);
        return true;
      }
      leaveShop(run);
      return true;
    }
    case 'event': {
      const ev = run.event!;
      if (ev.result) {
        finishEvent(run);
        return true;
      }
      const choices = [0, 1, 2].filter((i) => choiceAvailable(run, ev.id, i));
      const i = rng.pick(choices.length ? choices : [0]);
      let uid: number | undefined;
      const purpose = choiceUnitPurpose(ev.id, i);
      if (purpose) {
        // Sacrifice the weakest, train or star up the strongest.
        const sorted = run.roster.units.filter((u) => !u.hero && u.loc.at !== 'pending').sort((a, b) => unitScore(a) - unitScore(b));
        uid = (purpose === 'sacrifice' ? sorted[0] : sorted.filter((u) => u.star < 3).pop() ?? sorted[sorted.length - 1])?.uid;
      }
      chooseEvent(run, i, uid);
      if (!run.event?.result && run.screen === 'event') chooseEvent(run, 0);
      return true;
    }
    case 'rest':
      if (run.rest!.done) leaveRest(run);
      else if (run.heroHp / heroMaxHp(run) < 0.8) restHeal(run);
      else {
        const best = boardUnits(run.roster).filter((u) => !u.hero).sort((a, b) => unitScore(b) - unitScore(a))[0];
        if (best) restTrain(run, best.uid);
        else restHeal(run);
      }
      return true;
    case 'treasure':
      takeTreasure(run);
      leaveTreasure(run);
      return true;
    case 'artifactPick':
      chooseArtifactPick(run, 0);
      return true;
    case 'over':
    case 'victory':
      return false;
  }
  return false;
}

export { sellValue, rarityIndex };
