/**
 * Branching act maps in the style of Slay the Spire, plus the linear Prologue.
 */
import { CONFIG } from './config';
import type { Rng } from './rng';
import type { EncounterDef } from './types';

export type NodeKind = 'battle' | 'elite' | 'shop' | 'event' | 'rest' | 'treasure' | 'boss';

export interface MapNode {
  id: string;
  floor: number;
  col: number;
  kind: NodeKind;
  next: string[];
  encounter?: string;
}

export interface ActMap {
  act: number;
  floors: number;
  nodes: MapNode[];
}

export const NODE_NAMES: Record<NodeKind, string> = {
  battle: 'Battle',
  elite: 'Elite',
  shop: 'Shop',
  event: 'Event',
  rest: 'Rest',
  treasure: 'Treasure',
  boss: 'Boss',
};

export function nodeById(map: ActMap, id: string): MapNode | undefined {
  return map.nodes.find((n) => n.id === id);
}

export function startNodes(map: ActMap): MapNode[] {
  return map.nodes.filter((n) => n.floor === 0);
}

function pickEncounter(rng: Rng, pool: readonly EncounterDef[], act: number, kind: 'battle' | 'elite', floor: number): string | undefined {
  const list = pool.filter(
    (e) => e.act === act && e.kind === kind && (!e.floors || (floor >= e.floors[0] && floor <= e.floors[1])),
  );
  const fallback = pool.filter((e) => e.act === act && e.kind === kind);
  const use = list.length ? list : fallback;
  return use.length ? rng.pick(use).id : undefined;
}

/** The Prologue: 5 fixed nodes that teach the game. */
export function prologueMap(encounters: readonly EncounterDef[]): ActMap {
  const kinds: NodeKind[] = ['battle', 'shop', 'battle', 'rest', 'boss'];
  const battles = encounters.filter((e) => e.act === 0 && e.kind === 'battle');
  const boss = encounters.find((e) => e.act === 0 && e.kind === 'boss');
  let b = 0;
  const nodes: MapNode[] = kinds.map((kind, i) => ({
    id: `p${i}`,
    floor: i,
    col: 3,
    kind,
    next: i < kinds.length - 1 ? [`p${i + 1}`] : [],
    encounter: kind === 'battle' ? battles[b++ % battles.length]?.id : kind === 'boss' ? boss?.id : undefined,
  }));
  return { act: 0, floors: kinds.length, nodes };
}

function crosses(edges: [number, number, number][], floor: number, a: number, b: number): boolean {
  return edges.some(([f, x, y]) => f === floor && ((a < x && b > y) || (a > x && b < y)));
}

/**
 * Generates a branching act map: several paths walk up the floors and merge
 * where they meet; edges never cross. The last floor leads to the boss.
 */
export function generateActMap(act: number, rng: Rng, encounters: readonly EncounterDef[], bossId: string): ActMap {
  const { floors, width } = CONFIG.map;
  const pathCount = rng.int(3, CONFIG.map.paths);
  const cells = new Map<string, Set<string>>(); // "f,c" -> next keys
  const edges: [number, number, number][] = [];
  const key = (f: number, c: number) => `${f},${c}`;

  const startCols = rng.sample([0, 1, 2, 3, 4, 5, 6], pathCount).sort((a, b) => a - b);
  for (let p = 0; p < pathCount; p++) {
    let col = startCols[p];
    for (let f = 0; f < floors; f++) {
      const k = key(f, col);
      if (!cells.has(k)) cells.set(k, new Set());
      if (f === floors - 1) break;
      const options = [col - 1, col, col + 1].filter((c) => c >= 0 && c < width);
      rng.shuffle(options);
      // Prefer moves that don't cross existing edges; fall back to straight up.
      let nextCol = options.find((c) => !crosses(edges, f, col, c)) ?? col;
      if (crosses(edges, f, col, nextCol)) nextCol = col;
      if (!edges.some(([ef, x, y]) => ef === f && x === col && y === nextCol)) edges.push([f, col, nextCol]);
      cells.get(k)!.add(key(f + 1, nextCol));
      col = nextCol;
    }
  }

  // Build nodes.
  const nodes: MapNode[] = [];
  const idOf = (k: string) => `a${act}_${k.replace(',', '_')}`;
  for (const [k, nexts] of cells) {
    const [f, c] = k.split(',').map(Number);
    nodes.push({ id: idOf(k), floor: f, col: c, kind: 'battle', next: [...nexts].map(idOf) });
  }
  nodes.sort((a, b) => a.floor - b.floor || a.col - b.col);
  const bossNode: MapNode = { id: `a${act}_boss`, floor: floors, col: 3, kind: 'boss', next: [], encounter: bossId };
  for (const n of nodes) if (n.floor === floors - 1) n.next = [bossNode.id];
  nodes.push(bossNode);

  // Assign node types.
  const parents = new Map<string, MapNode[]>();
  for (const n of nodes) for (const nx of n.next) parents.set(nx, [...(parents.get(nx) ?? []), n]);
  const restricted: NodeKind[] = ['elite', 'rest', 'shop'];
  for (const n of nodes) {
    if (n.kind === 'boss') continue;
    if (n.floor === 0) n.kind = 'battle';
    else if (n.floor === Math.floor(floors / 2)) n.kind = 'treasure';
    else if (n.floor === floors - 1) n.kind = 'rest';
    else {
      for (let attempt = 0; attempt < 8; attempt++) {
        const weights: [NodeKind, number][] = [
          ['battle', 45],
          ['event', 22],
          ['elite', n.floor >= 4 ? 14 : 0],
          ['shop', n.floor >= 2 ? 12 : 0],
          ['rest', n.floor >= 5 && n.floor < floors - 2 ? 10 : 0],
        ];
        const kind = weights[rng.weightedIndex(weights.map((w) => w[1]))][0];
        const ps = parents.get(n.id) ?? [];
        if (restricted.includes(kind) && ps.some((p) => p.kind === kind)) continue;
        n.kind = kind;
        break;
      }
    }
  }
  // Guarantee at least one shop and two elites if the dice were unkind.
  const mids = nodes.filter((n) => n.kind === 'battle' && n.floor >= 4 && n.floor <= floors - 3);
  if (!nodes.some((n) => n.kind === 'shop') && mids.length) rng.pick(mids).kind = 'shop';
  while (nodes.filter((n) => n.kind === 'elite').length < 2) {
    const c = nodes.filter((n) => n.kind === 'battle' && n.floor >= 5 && n.floor <= floors - 2);
    if (!c.length) break;
    rng.pick(c).kind = 'elite';
  }
  for (const n of nodes) {
    if (n.kind === 'battle' || n.kind === 'elite') n.encounter = pickEncounter(rng, encounters, act, n.kind, n.floor);
  }
  return { act, floors: floors + 1, nodes };
}

/** Every node is reachable from a start node and leads to the boss. */
export function validateMap(map: ActMap): boolean {
  const reach = new Set<string>();
  const stack = startNodes(map).map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (reach.has(id)) continue;
    reach.add(id);
    stack.push(...(nodeById(map, id)?.next ?? []));
  }
  const boss = map.nodes.find((n) => n.kind === 'boss');
  return !!boss && map.nodes.every((n) => reach.has(n.id)) && map.nodes.every((n) => n.kind === 'boss' || n.next.length > 0);
}
