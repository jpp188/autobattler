/**
 * Owned units: board and bench placement, limits, automatic merging and selling.
 */
import { CONFIG } from './config';
import type { Star, StatKey } from './types';

export type UnitLoc = { at: 'board'; col: number; row: number } | { at: 'bench'; slot: number } | { at: 'pending' };

export interface OwnedUnit {
  uid: number;
  defId: string;
  star: Star;
  /** Permanent stat boosts from training this run. */
  trained: Partial<Record<StatKey, number>>;
  loc: UnitLoc;
  hero?: boolean;
}

export interface RosterState {
  units: OwnedUnit[];
  nextUid: number;
  boardLimit: number;
  benchSize: number;
}

export interface MergeEvent {
  uid: number;
  defId: string;
  star: Star;
  /** uid of the copy that was absorbed. */
  absorbed: number;
}

export const boardUnits = (r: RosterState) => r.units.filter((u) => u.loc.at === 'board');
export const benchUnits = (r: RosterState) => r.units.filter((u) => u.loc.at === 'bench');
export const pendingUnits = (r: RosterState) => r.units.filter((u) => u.loc.at === 'pending');

export function unitAtBoard(r: RosterState, col: number, row: number): OwnedUnit | undefined {
  return r.units.find((u) => u.loc.at === 'board' && u.loc.col === col && u.loc.row === row);
}
export function unitAtBench(r: RosterState, slot: number): OwnedUnit | undefined {
  return r.units.find((u) => u.loc.at === 'bench' && u.loc.slot === slot);
}

export function freeBenchSlots(r: RosterState): number[] {
  const out: number[] = [];
  for (let s = 0; s < r.benchSize; s++) if (!unitAtBench(r, s)) out.push(s);
  return out;
}

export function clampLimit(n: number): number {
  return Math.max(1, Math.min(CONFIG.board.maxLimit, n));
}

/**
 * Moves a unit to a board hex or bench slot. If the destination is occupied
 * the two units swap. Returns false if the move is not allowed (board full,
 * moving the Hero to the bench, out of bounds).
 */
export function moveUnit(r: RosterState, uid: number, dest: UnitLoc): boolean {
  const u = r.units.find((x) => x.uid === uid);
  if (!u || dest.at === 'pending' || u.loc.at === 'pending') return false;
  if (dest.at === 'board') {
    if (dest.col < 0 || dest.col >= CONFIG.board.cols || dest.row < 0 || dest.row >= CONFIG.board.rowsPerSide) return false;
  } else if (dest.slot < 0 || dest.slot >= r.benchSize) return false;
  const other = dest.at === 'board' ? unitAtBoard(r, dest.col, dest.row) : unitAtBench(r, dest.slot);
  if (other === u) return true;
  if (u.hero && dest.at === 'bench') return false;
  if (other?.hero && u.loc.at === 'bench') return false;
  if (dest.at === 'board' && u.loc.at !== 'board' && !other && boardUnits(r).length >= r.boardLimit) return false;
  const from = u.loc;
  u.loc = dest;
  if (other) other.loc = from;
  return true;
}

/** Puts every unit that won't fit back on the bench (used when the limit drops). */
export function enforceBoardLimit(r: RosterState): void {
  const board = boardUnits(r).sort((a, b) => (a.hero ? -1 : b.hero ? 1 : 0));
  while (board.length > r.boardLimit) {
    const u = board.pop()!;
    const free = freeBenchSlots(r);
    if (u.hero) break;
    u.loc = free.length ? { at: 'bench', slot: free[0] } : { at: 'pending' };
  }
}

function locRank(l: UnitLoc): number {
  return l.at === 'board' ? 0 : l.at === 'bench' ? 1 : 2;
}

/**
 * Merges pairs of identical units (same id and star) until no pair remains.
 * Two 1-stars make a 2-star, two 2-stars make a 3-star. The merged unit keeps
 * the board position if either copy was on the board.
 */
export function resolveMerges(r: RosterState): MergeEvent[] {
  const events: MergeEvent[] = [];
  for (;;) {
    let merged = false;
    const groups = new Map<string, OwnedUnit[]>();
    for (const u of r.units) {
      if (u.hero || u.star >= 3) continue;
      const k = `${u.defId}|${u.star}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(u);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      list.sort((a, b) => locRank(a.loc) - locRank(b.loc) || a.uid - b.uid);
      const [keep, absorb] = list;
      keep.star = (keep.star + 1) as Star;
      for (const [k, v] of Object.entries(absorb.trained)) {
        const key = k as StatKey;
        keep.trained[key] = (keep.trained[key] ?? 0) + (v ?? 0);
      }
      r.units = r.units.filter((u) => u !== absorb);
      events.push({ uid: keep.uid, defId: keep.defId, star: keep.star, absorbed: absorb.uid });
      merged = true;
      break;
    }
    if (!merged) break;
  }
  // Units that were pending but merged into a pending unit stay pending;
  // try to seat any pending units on free bench slots.
  seatPending(r);
  return events;
}

/** Moves pending units onto free bench slots. */
export function seatPending(r: RosterState): void {
  for (const u of pendingUnits(r)) {
    const free = freeBenchSlots(r);
    if (!free.length) break;
    u.loc = { at: 'bench', slot: free[0] };
  }
}

/** Would adding one more copy of this unit trigger a merge? */
export function wouldMerge(r: RosterState, defId: string): boolean {
  return r.units.some((u) => u.defId === defId && u.star === 1 && !u.hero);
}

/**
 * Adds a new 1-star unit. It first lands in "pending", then merges are
 * resolved, then it takes a free bench slot. If the bench is full and it did
 * not merge, it stays pending and the overflow screen must handle it.
 */
export function addUnit(r: RosterState, defId: string, star: Star = 1): { uid: number; merges: MergeEvent[] } {
  const u: OwnedUnit = { uid: r.nextUid++, defId, star, trained: {}, loc: { at: 'pending' } };
  r.units.push(u);
  const merges = resolveMerges(r);
  return { uid: u.uid, merges };
}

export function removeUnit(r: RosterState, uid: number): OwnedUnit | null {
  const u = r.units.find((x) => x.uid === uid);
  if (!u || u.hero) return null;
  r.units = r.units.filter((x) => x !== u);
  seatPending(r);
  return u;
}

export function hasOverflow(r: RosterState): boolean {
  return pendingUnits(r).length > 0;
}
