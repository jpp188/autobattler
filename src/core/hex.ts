/**
 * Hex grid helpers. The battle grid is 7 columns × 8 rows in "odd-r" offset
 * layout (odd rows are shifted half a hex to the right). Rows 0..3 belong to
 * the enemy (row 0 is their back row) and rows 4..7 to the player (row 7 is the
 * player's back row).
 */
import { CONFIG } from './config';

export interface Hex {
  col: number;
  row: number;
}

export const GRID_COLS = CONFIG.board.cols;
export const GRID_ROWS = CONFIG.board.rowsPerSide * 2;

export function hexKey(h: Hex): number {
  return h.row * GRID_COLS + h.col;
}

export function fromKey(k: number): Hex {
  return { col: k % GRID_COLS, row: Math.floor(k / GRID_COLS) };
}

export function inBounds(h: Hex): boolean {
  return h.col >= 0 && h.col < GRID_COLS && h.row >= 0 && h.row < GRID_ROWS;
}

function toCube(h: Hex): [number, number, number] {
  const q = h.col - (h.row - (h.row & 1)) / 2;
  const r = h.row;
  return [q, r, -q - r];
}

export function hexDistance(a: Hex, b: Hex): number {
  const [aq, ar, as] = toCube(a);
  const [bq, br, bs] = toCube(b);
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
}

const ODD_R_DIRS = [
  // even rows
  [
    [1, 0],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ],
  // odd rows
  [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [0, 1],
    [1, 1],
  ],
] as const;

export function neighbors(h: Hex): Hex[] {
  const dirs = ODD_R_DIRS[h.row & 1];
  const out: Hex[] = [];
  for (const [dc, dr] of dirs) {
    const n = { col: h.col + dc, row: h.row + dr };
    if (inBounds(n)) out.push(n);
  }
  return out;
}

/** All hexes within `radius` of `center` (including the centre). */
export function hexesInRange(center: Hex, radius: number): Hex[] {
  const out: Hex[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const h = { col, row };
      if (hexDistance(center, h) <= radius) out.push(h);
    }
  }
  return out;
}

/**
 * Breadth-first search from `start` to the nearest hex satisfying `goal`,
 * stepping only through hexes where `blocked` is false. Returns the first step
 * of the path, or null if no path exists (or start already satisfies goal).
 * Neighbour order is fixed so results are deterministic.
 */
export function firstStepToward(start: Hex, goal: (h: Hex) => boolean, blocked: (h: Hex) => boolean): Hex | null {
  if (goal(start)) return null;
  const startKey = hexKey(start);
  const prev = new Map<number, number>();
  prev.set(startKey, -1);
  const queue: Hex[] = [start];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const n of neighbors(cur)) {
      const k = hexKey(n);
      if (prev.has(k) || blocked(n)) continue;
      prev.set(k, hexKey(cur));
      if (goal(n)) {
        // Walk back to the first step.
        let step = k;
        while (prev.get(step) !== startKey) step = prev.get(step)!;
        return fromKey(step);
      }
      queue.push(n);
    }
  }
  return null;
}

/** Converts a player-local position (row 0 = front) to a battle grid hex. */
export function playerToGrid(col: number, localRow: number): Hex {
  return { col, row: CONFIG.board.rowsPerSide + localRow };
}

/** Converts an enemy-local position (row 0 = front) to a battle grid hex. */
export function enemyToGrid(col: number, localRow: number): Hex {
  return { col, row: CONFIG.board.rowsPerSide - 1 - localRow };
}

/** Pixel centre of a hex for a pointy-top layout of the given size. */
export function hexToPixel(h: Hex, w: number, rowStep: number): { x: number; y: number } {
  return { x: h.col * w + (h.row & 1 ? w / 2 : 0), y: h.row * rowStep };
}
