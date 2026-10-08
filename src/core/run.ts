/**
 * The run: all state for one attempt, and every action the player can take.
 * Scenes call these functions and then save; nothing here touches Phaser.
 * The state is plain JSON so it can be saved and resumed exactly.
 */
import { artifactTotals, matchesFilter, type ArtifactTotals } from './artifacts';
import { buildTeam, type TeamMember } from './battleSetup';
import type { BattleResult, BattleSetup } from './combat';
import { CONFIG } from './config';
import { enemyToGrid, playerToGrid } from './hex';
import { generateActMap, nodeById, prologueMap, startNodes, type ActMap, type MapNode, type NodeKind } from './map';
import { momentumStatBonus, updateMomentum, type MomentumChange } from './momentum';
import { openPack, resolvePackInstance, topMomentumTrait, type OpenedCard, type PullContext } from './packs';
import { Rng } from './rng';
import {
  addUnit,
  boardUnits,
  clampLimit,
  enforceBoardLimit,
  hasOverflow,
  removeUnit,
  resolveMerges,
  seatPending,
  type MergeEvent,
  type OwnedUnit,
  type RosterState,
} from './roster';
import { activeTraitIds, countTraits, traitGoldPerWin } from './traits';
import { combatStats } from './units';
import { rarityIndex, type ArtifactTier, type EncounterUnit, type CombatStatKey, type Outcome, type PackInstance, type Rarity, type Star, type StatKey } from './types';
import {
  ARTIFACTS,
  bossesForAct,
  CLASS_IDS,
  ENCOUNTERS,
  EVENTS,
  findUnit,
  getArtifact,
  getEncounter,
  getEvent,
  getHero,
  getPack,
  getTrait,
  getUnit,
  ORIGIN_IDS,
  PACK_UNITS,
  PACKS,
  REINFORCEMENTS,
  TRAITS,
} from '../data';

export const FINAL_ACT = 3;

export type Screen =
  | 'starter'
  | 'map'
  | 'battle'
  | 'reward'
  | 'packOpen'
  | 'overflow'
  | 'shop'
  | 'event'
  | 'rest'
  | 'treasure'
  | 'artifactPick'
  | 'over'
  | 'victory';

export interface CardResult extends OpenedCard {
  isNew: boolean;
  willMerge: boolean;
}

export interface OpenedState {
  packName: string;
  defId: string;
  inst: PackInstance;
  cards: CardResult[];
  /** Artifact pack: choose one of these instead of units. */
  artifactChoices: string[] | null;
  /** How many of the cards the player keeps. */
  keep: number;
  then: Screen;
}

export interface ShopState {
  packs: { inst: PackInstance; price: number; sold: boolean }[];
  artifacts: { id: string; price: number; sold: boolean }[];
  rerolls: number;
  healUsed: boolean;
  removeUsed: boolean;
}

export interface RewardState {
  kind: 'battle' | 'elite' | 'boss';
  outcome: BattleResult['outcome'];
  gold: number;
  goldLines: [string, number][];
  heroHealed: number;
  momentum: MomentumChange[];
  packs: PackInstance[];
  /** Packs given for free before the choice (the Boss Pack). */
  bonusPacks: PackInstance[];
  gainedArtifact: string | null;
  bossArtifactChoices: string[] | null;
  picked: boolean;
}

export interface EventState {
  id: string;
  result: string | null;
}

export interface RunStats {
  floorsCleared: number;
  battlesWon: number;
  unitsCollected: number;
  packsOpened: number;
  goldEarned: number;
  bestPull: { unitId: string; rarity: Rarity } | null;
  damageByUnit: Record<string, number>;
  soloHeroWins: number;
  /** Boss fights won without the Hero taking damage. */
  flawlessBossWins?: number;
  maxMomentumPairs: number;
}

export interface RunState {
  v: 1;
  seed: number;
  rng: number;
  heroId: string;
  skinId: string;
  act: number;
  map: ActMap;
  nodeId: string | null;
  /** Node ids visited in the current act, in order. */
  path: string[];
  /** Boss encounter per act index (1..3), chosen at run start. */
  bosses: string[];
  gold: number;
  heroHp: number;
  heroMaxHpBonus: number;
  roster: RosterState;
  artifacts: string[];
  momentum: Record<string, number>;
  winStreak: number;
  screen: Screen;
  starterOptions: PackInstance[];
  battle: { nodeId: string; encounter: string; kind: 'battle' | 'elite' | 'boss'; seed: number } | null;
  reward: RewardState | null;
  opened: OpenedState | null;
  shop: ShopState | null;
  event: EventState | null;
  rest: { done: boolean; text: string | null } | null;
  treasure: { gold: number; artifact: string | null; taken: boolean } | null;
  artifactPick: { options: string[]; then: Screen; title: string } | null;
  flags: {
    firstPackThisAct: boolean;
    tutorialSeen: string[];
    usedEvents: string[];
  };
  /** Messages to show on the next map visit (momentum star-ups and so on). */
  notices: string[];
  stats: RunStats;
  result: { won: boolean; reason: string } | null;
  /** Unit ids pulled this run (for the collection). */
  pulled: string[];
  /** Where to go after the overflow screen. */
  overflowThen: Screen | null;
  /** Pack waiting to be opened when an event finishes. */
  pendingEventPack: PackInstance | null;
  /** Board slots earned by beating bosses (+1 per boss). */
  bossSlots?: number;
  /** Free shop rerolls left in the current shop. */
  freeRerollsLeft?: number;
}

// ------------------------------------------------------------------ helpers

export function withRng<T>(run: RunState, fn: (rng: Rng) => T): T {
  const rng = new Rng(run.rng);
  const out = fn(rng);
  run.rng = rng.state;
  return out;
}

export function totals(run: RunState): ArtifactTotals {
  return artifactTotals(run.artifacts.map(getArtifact));
}

export function heroUnit(run: RunState): OwnedUnit {
  return run.roster.units.find((u) => u.hero)!;
}

function heroGrowth(act: number): number {
  return 1 + CONFIG.hero.statGrowthPerAct * Math.max(0, act - 1);
}
function heroHpGrowth(act: number): number {
  return 1 + CONFIG.hero.hpGrowthPerAct * Math.max(0, act - 1);
}

export function heroMaxHp(run: RunState, act = run.act): number {
  const hero = getHero(run.heroId);
  const t = totals(run);
  const trained = heroUnit(run).trained.hp ?? 0;
  return Math.round(hero.stats.hp * heroHpGrowth(act) * (1 + t.heroMaxHpPct / 100) + run.heroMaxHpBonus + trained);
}

function changeMaxHp(run: RunState, fn: () => void): void {
  const before = heroMaxHp(run);
  fn();
  const after = heroMaxHp(run);
  if (after > before) run.heroHp += after - before;
  run.heroHp = Math.min(run.heroHp, after);
}

export function refreshLimits(run: RunState): void {
  const t = totals(run);
  const hero = getHero(run.heroId);
  const perkBench = hero.perk.effect.k === 'benchSlots' ? hero.perk.effect.n : 0;
  run.roster.boardLimit = clampLimit(CONFIG.board.startLimit + t.boardLimit + (run.bossSlots ?? 0));
  run.roster.benchSize = Math.min(CONFIG.board.maxBenchSlots, CONFIG.board.benchSlots + perkBench + t.benchSlots);
  enforceBoardLimit(run.roster);
}

export function sellValue(run: RunState, u: OwnedUnit): number {
  if (u.hero) return 0;
  const def = getUnit(u.defId);
  return CONFIG.economy.sellBase[def.rarity] * CONFIG.economy.sellStarMult[u.star - 1] + totals(run).sellBonus;
}

export function shopPrice(run: RunState, base: number): number {
  const hero = getHero(run.heroId);
  const perk = hero.perk.effect.k === 'shopDiscount' ? hero.perk.effect.pct : 0;
  return Math.max(1, Math.round(base * (1 - (totals(run).shopDiscount + perk) / 100)));
}

export function boardTraitStatuses(run: RunState) {
  return countTraits(
    boardUnits(run.roster).map((u) => getUnit(u.defId)),
    TRAITS,
  );
}

export function pullContext(run: RunState, forceRare = false): PullContext {
  const t = totals(run);
  const hero = getHero(run.heroId);
  return {
    act: run.act,
    momentum: run.momentum,
    traitOdds: t.traitOdds,
    rarityLuck: t.rarityLuck,
    owned: run.roster.units.filter((u) => !u.hero).map((u) => u.defId),
    board: boardUnits(run.roster)
      .filter((u) => !u.hero)
      .map((u) => u.defId),
    heroTraits: [hero.origin, hero.cls],
    forceRare,
  };
}

function traitIdLists() {
  return { origins: ORIGIN_IDS, classes: CLASS_IDS };
}

export function makePack(run: RunState, defId: string): PackInstance {
  return withRng(run, (rng) => resolvePackInstance(getPack(defId), rng, traitIdLists()));
}

export function currentNode(run: RunState): MapNode | null {
  return run.nodeId ? nodeById(run.map, run.nodeId) ?? null : null;
}

export function availableNodes(run: RunState): MapNode[] {
  const cur = currentNode(run);
  if (!cur) return startNodes(run.map);
  return cur.next.map((id) => nodeById(run.map, id)!).filter(Boolean);
}

// ------------------------------------------------------------------ new run

export interface NewRunOptions {
  /** Start straight in Act I (the Prologue is played once per save). */
  skipPrologue?: boolean;
}

export function newRun(heroId: string, skinId: string, seed: number, opts: NewRunOptions = {}): RunState {
  const hero = getHero(heroId);
  const rng = new Rng(seed);
  const bosses = ['', ...[1, 2, 3].map((a) => rng.pick(bossesForAct(a)).id)];
  const run: RunState = {
    v: 1,
    seed,
    rng: rng.state,
    heroId,
    skinId,
    act: 0,
    map: prologueMap(ENCOUNTERS),
    nodeId: null,
    path: [],
    bosses,
    gold: CONFIG.economy.startGold + (hero.perk.effect.k === 'startGold' ? hero.perk.effect.n : 0),
    heroHp: 0,
    heroMaxHpBonus: 0,
    roster: { units: [], nextUid: 1, boardLimit: CONFIG.board.startLimit, benchSize: CONFIG.board.benchSlots },
    artifacts: [],
    momentum: Object.fromEntries(TRAITS.map((t) => [t.id, 0])),
    winStreak: 0,
    screen: 'starter',
    starterOptions: [],
    battle: null,
    reward: null,
    opened: null,
    shop: null,
    event: null,
    rest: null,
    treasure: null,
    artifactPick: null,
    flags: { firstPackThisAct: true, tutorialSeen: [], usedEvents: [] },
    notices: [],
    stats: {
      floorsCleared: 0,
      battlesWon: 0,
      unitsCollected: 0,
      packsOpened: 0,
      goldEarned: 0,
      bestPull: null,
      damageByUnit: {},
      soloHeroWins: 0,
      flawlessBossWins: 0,
      maxMomentumPairs: 0,
    },
    result: null,
    pulled: [],
    overflowThen: null,
    pendingEventPack: null,
  };
  run.roster.units.push({ uid: run.roster.nextUid++, defId: heroId, star: 1, trained: {}, loc: { at: 'board', col: 3, row: 2 }, hero: true });
  if (opts.skipPrologue) {
    // Same footing as a run that cleared the Prologue: its boss slot is already earned.
    run.bossSlots = 1;
    startAct(run, 1);
    run.screen = 'starter';
  }
  refreshLimits(run);
  run.heroHp = heroMaxHp(run);
  run.starterOptions = [makePack(run, 'themed_starter'), makePack(run, 'uncommon_starter')];
  return run;
}

// ------------------------------------------------------------------ packs

/** Opens a pack: rolls the cards and moves to the pack-opening screen. */
export function beginOpenPack(run: RunState, inst: PackInstance, then: Screen, isNew: (unitId: string) => boolean = () => false): OpenedState {
  const def = getPack(inst.defId);
  const forceRare = run.flags.firstPackThisAct && getHero(run.heroId).perk.effect.k === 'firstPackRare' && def.cards > 0;
  const ctx = pullContext(run, forceRare);
  let artifactChoices: string[] | null = null;
  let cards: OpenedCard[] = [];
  if (def.special === 'artifact') {
    artifactChoices = withRng(run, (rng) => rollArtifacts(run, rng, 3, ['common', 'uncommon', 'rare']));
  } else {
    cards = withRng(run, (rng) => openPack(def, inst, ctx, PACK_UNITS, rng));
    if (def.cards > 0) run.flags.firstPackThisAct = false;
  }
  // Tag cards: NEW (never pulled before) and Will merge (a matching 1-star is already owned).
  const owned1 = new Set(run.roster.units.filter((u) => u.star === 1 && !u.hero).map((u) => u.defId));
  const seen = new Set<string>();
  const results: CardResult[] = cards.map((c) => {
    const first = !seen.has(c.unitId);
    seen.add(c.unitId);
    return { ...c, isNew: isNew(c.unitId) && first && !run.pulled.includes(c.unitId), willMerge: owned1.has(c.unitId) };
  });
  const keep = Math.min(def.keep ?? 1, results.length);
  const opened: OpenedState = { packName: def.name, defId: def.id, inst, cards: results, artifactChoices, keep, then };
  run.opened = opened;
  run.screen = 'packOpen';
  run.stats.packsOpened++;
  // Every revealed card counts as seen for the collection.
  for (const c of results) if (!run.pulled.includes(c.unitId)) run.pulled.push(c.unitId);
  return opened;
}

/**
 * Keeps the chosen cards (or the chosen artifact) and adds them to the roster.
 * `choice` is the artifact index, or the card indices to keep (up to
 * `opened.keep`; defaults to the first ones). Returns merges for the animation.
 */
export function collectOpened(run: RunState, choice?: number | readonly number[]): MergeEvent[] {
  const o = run.opened;
  if (!o) return [];
  const merges: MergeEvent[] = [];
  const picks = choice === undefined ? [] : typeof choice === 'number' ? [choice] : [...choice];
  if (o.artifactChoices) {
    const id = o.artifactChoices[picks[0] ?? 0];
    if (id) gainArtifact(run, id);
  }
  const keep = o.keep ?? o.cards.length;
  let chosen = [...new Set(picks)].filter((i) => i >= 0 && i < o.cards.length).slice(0, keep);
  if (!o.artifactChoices && chosen.length < keep) {
    for (let i = 0; i < o.cards.length && chosen.length < keep; i++) if (!chosen.includes(i)) chosen.push(i);
  }
  if (o.artifactChoices) chosen = [];
  for (const i of chosen) {
    const c = o.cards[i];
    run.stats.unitsCollected++;
    if (!run.stats.bestPull || rarityIndex(c.rarity) > rarityIndex(run.stats.bestPull.rarity)) run.stats.bestPull = { unitId: c.unitId, rarity: c.rarity };
    merges.push(...addUnit(run.roster, c.unitId).merges);
  }
  run.opened = null;
  run.overflowThen = o.then;
  run.screen = hasOverflow(run.roster) ? 'overflow' : o.then;
  if (run.screen === 'map') afterNodeCleared(run);
  return merges;
}

/** Finishes the overflow screen once every pending unit has a bench slot. */
export function finishOverflow(run: RunState): boolean {
  seatPending(run.roster);
  if (hasOverflow(run.roster)) return false;
  run.screen = run.overflowThen ?? 'map';
  if (run.screen === 'map') afterNodeCleared(run);
  return true;
}

export function sellUnit(run: RunState, uid: number): number {
  const u = run.roster.units.find((x) => x.uid === uid);
  if (!u || u.hero) return 0;
  const value = sellValue(run, u);
  removeUnit(run.roster, uid);
  run.gold += value;
  return value;
}

// ------------------------------------------------------------------ artifacts

export function rollArtifacts(run: RunState, rng: Rng, n: number, tiers: ArtifactTier[]): string[] {
  const pool = ARTIFACTS.filter((a) => tiers.includes(a.tier) && !run.artifacts.includes(a.id));
  return rng.sample(pool, n).map((a) => a.id);
}

export function gainArtifact(run: RunState, id: string): void {
  if (run.artifacts.includes(id)) return;
  changeMaxHp(run, () => {
    run.artifacts.push(id);
  });
  refreshLimits(run);
  seatPending(run.roster);
}

export function chooseArtifactPick(run: RunState, index: number): void {
  const p = run.artifactPick;
  if (!p) return;
  const id = p.options[index];
  if (id) gainArtifact(run, id);
  run.artifactPick = null;
  run.screen = p.then;
}

// ------------------------------------------------------------------ starter

export function chooseStarter(run: RunState, index: number, isNew?: (id: string) => boolean): void {
  const inst = run.starterOptions[index];
  run.starterOptions = [];
  beginOpenPack(run, inst, 'map', isNew);
}

// ------------------------------------------------------------------ map

export function enterNode(run: RunState, nodeId: string): void {
  if (!availableNodes(run).some((n) => n.id === nodeId)) throw new Error('Node not reachable');
  const node = nodeById(run.map, nodeId)!;
  run.nodeId = nodeId;
  run.path.push(nodeId);
  switch (node.kind) {
    case 'battle':
    case 'elite':
    case 'boss':
      run.battle = {
        nodeId,
        encounter: node.encounter ?? fallbackEncounter(run, node.kind),
        kind: node.kind,
        seed: withRng(run, (r) => r.fork()),
      };
      run.screen = 'battle';
      break;
    case 'shop':
      run.shop = generateShop(run);
      run.freeRerollsLeft = totals(run).freeRerolls;
      run.screen = 'shop';
      break;
    case 'event':
      run.event = { id: pickEvent(run), result: null };
      run.screen = 'event';
      break;
    case 'rest':
      run.rest = { done: false, text: null };
      run.screen = 'rest';
      break;
    case 'treasure':
      run.treasure = withRng(run, (rng) => ({
        gold: rng.int(CONFIG.economy.treasureGold[0], CONFIG.economy.treasureGold[1]),
        artifact: rollArtifacts(run, rng, 1, run.act >= 2 ? ['uncommon', 'rare'] : ['common', 'uncommon'])[0] ?? null,
        taken: false,
      }));
      run.screen = 'treasure';
      break;
  }
}

function fallbackEncounter(run: RunState, kind: NodeKind): string {
  const list = ENCOUNTERS.filter((e) => e.act === run.act && e.kind === kind);
  return withRng(run, (r) => r.pick(list.length ? list : ENCOUNTERS.filter((e) => e.kind === 'battle')).id);
}

/** Called whenever the player returns to the map after finishing a node. */
export function afterNodeCleared(run: RunState): void {
  const node = currentNode(run);
  if (!node) return;
  if (node.kind === 'boss' && run.result === null) {
    if (run.act >= FINAL_ACT) {
      run.result = { won: true, reason: 'The Fallen Heavens are at peace.' };
      run.screen = 'victory';
      return;
    }
    startAct(run, run.act + 1);
  }
}

export function startAct(run: RunState, act: number): void {
  changeMaxHp(run, () => {
    run.act = act;
  });
  run.map = withRng(run, (rng) => generateActMap(act, rng, ENCOUNTERS, run.bosses[act]));
  run.nodeId = null;
  run.path = [];
  run.flags.firstPackThisAct = true;
  run.screen = 'map';
  // Momentum 100: one random unit of that trait gains a star (once per act per trait).
  for (const t of TRAITS) {
    if ((run.momentum[t.id] ?? 0) >= CONFIG.momentum.starUpAt) {
      const u = starUpRandom(run, (def) => def.origin === t.id || def.cls === t.id);
      if (u) run.notices.push(`${t.name} momentum! ${getUnit(u.defId).name} rose to ${u.star}★.`);
    }
  }
  const t = totals(run);
  for (let i = 0; i < t.actStarUp; i++) {
    const u = starUpRandom(run, () => true);
    if (u) run.notices.push(`Celestial Mirror: ${getUnit(u.defId).name} rose to ${u.star}★.`);
  }
  resolveMerges(run.roster);
}

function starUpRandom(run: RunState, filter: (def: ReturnType<typeof getUnit>) => boolean): OwnedUnit | null {
  const cands = run.roster.units.filter((u) => !u.hero && u.star < 3 && u.loc.at !== 'pending' && filter(getUnit(u.defId)));
  if (!cands.length) return null;
  const u = withRng(run, (r) => r.pick(cands.sort((a, b) => a.uid - b.uid)));
  u.star = (u.star + 1) as Star;
  return u;
}

// ------------------------------------------------------------------ battle

function pctForUnit(run: RunState, defId: string, t: ArtifactTotals): Partial<Record<CombatStatKey, number>> {
  const def = getUnit(defId);
  const momentumPct = Math.max(momentumStatBonus(run.momentum[def.origin] ?? 0), momentumStatBonus(run.momentum[def.cls] ?? 0)) * 100;
  const pct: Partial<Record<CombatStatKey, number>> = { ...t.teamPct };
  if (momentumPct > 0) {
    pct.hp = (pct.hp ?? 0) + momentumPct;
    pct.ad = (pct.ad ?? 0) + momentumPct;
  }
  return pct;
}

/** Builds the battle for the current node: the player's board vs the encounter. */
export function buildBattle(run: RunState): BattleSetup {
  const b = run.battle;
  if (!b) throw new Error('No battle');
  const t = totals(run);
  const hero = getHero(run.heroId);
  const members: TeamMember[] = boardUnits(run.roster)
    .sort((a, b2) => a.uid - b2.uid)
    .map((u) => {
      const def = u.hero ? hero : getUnit(u.defId);
      const flat: Partial<Record<CombatStatKey, number>> = { ...t.teamFlat };
      for (const [k, v] of Object.entries(u.trained)) flat[k as StatKey] = (flat[k as StatKey] ?? 0) + (v ?? 0);
      const pct = pctForUnit(run, u.defId, t);
      if (u.hero) {
        for (const [k, v] of Object.entries(t.heroFlat)) flat[k as CombatStatKey] = (flat[k as CombatStatKey] ?? 0) + (v ?? 0);
        for (const [k, v] of Object.entries(t.heroPct)) pct[k as CombatStatKey] = (pct[k as CombatStatKey] ?? 0) + (v ?? 0);
        // Hero HP is set from the run's max HP (which already includes training and artifacts).
        delete flat.hp;
        delete pct.hp;
      }
      const row = (u.loc as { row: number }).row;
      const who = { role: def.role, row, star: u.star, isHero: !!u.hero };
      for (const us of t.unitStats) {
        if (!matchesFilter(us.who, who)) continue;
        const target = us.pct ? pct : flat;
        for (const [k, v] of Object.entries(us.stats)) target[k as CombatStatKey] = (target[k as CombatStatKey] ?? 0) + (v ?? 0);
      }
      const m: TeamMember = {
        def,
        star: u.star,
        hex: playerToGrid((u.loc as { col: number }).col, row),
        isHero: !!u.hero,
        ownerUid: u.uid,
        stat: u.hero ? { powerMult: heroGrowth(run.act), hpMult: 1, flat, pct } : { flat, pct },
        startCharge: t.startCharge,
        extraPassives: t.unitPassives.filter((p) => matchesFilter(p.who, who)).map((p) => p.passive),
      };
      if (u.hero) {
        m.stat!.flat = { ...flat, hp: heroMaxHp(run) - hero.stats.hp };
        m.hp = run.heroHp;
      }
      return m;
    });
  const enc = getEncounter(b.encounter);
  const node = nodeById(run.map, b.nodeId);
  const mult = enemyPower(run.act, node?.floor ?? 0, b.kind);
  const enemies: TeamMember[] = encounterUnits(run.act, node?.floor ?? 0, b.kind, enc.units, b.seed).map((eu) => ({
    def: getUnit(eu.unit),
    star: eu.star,
    hex: enemyToGrid(eu.col, eu.row),
    stat: { powerMult: mult, flat: { ...t.enemyFlat }, pct: { ...t.enemyPct } },
  }));
  const p = buildTeam(members, 0, TRAITS);
  const e = buildTeam(enemies, 1, TRAITS);
  return { seed: b.seed, units: [...p.inputs, ...e.inputs], lookup: findUnit, summonPower: [1, mult] };
}

/** Extra enemies that join a fight: more the deeper you go. */
export function reinforcementCount(act: number, floor: number, kind: 'battle' | 'elite' | 'boss'): number {
  const E = CONFIG.enemy;
  if (act <= 0) return 0;
  let n = E.reinforceBase[Math.min(act, E.reinforceBase.length - 1)] + Math.floor(floor / E.reinforceEveryFloors);
  if (kind === 'boss') n = act - 1;
  return Math.min(E.reinforceMax, n);
}

/** The encounter's units plus reinforcements, placed on free hexes. Deterministic from the battle seed. */
export function encounterUnits(act: number, floor: number, kind: 'battle' | 'elite' | 'boss', base: readonly EncounterUnit[], seed: number): EncounterUnit[] {
  const out = [...base];
  const n = reinforcementCount(act, floor, kind);
  const pool = REINFORCEMENTS[Math.min(act, REINFORCEMENTS.length - 1)];
  if (!n || !pool?.length) return out;
  const rng = new Rng(seed ^ 0x5eed);
  const taken = new Set(out.map((u) => `${u.col},${u.row}`));
  const twoStarFrom = CONFIG.enemy.reinforceTwoStarFloor[Math.min(act, CONFIG.enemy.reinforceTwoStarFloor.length - 1)];
  for (let i = 0; i < n; i++) {
    const unit = rng.pick(pool);
    const role = getUnit(unit).role;
    // Melee units fill the front rows, ranged ones the back.
    const rows = role === 'tank' || role === 'fighter' || role === 'assassin' ? [0, 1, 2, 3] : [3, 2, 1, 0];
    let placed = false;
    for (const row of rows) {
      const free = [0, 1, 2, 3, 4, 5, 6].filter((c) => !taken.has(`${c},${row}`));
      if (!free.length) continue;
      const col = rng.pick(free);
      taken.add(`${col},${row}`);
      out.push({ unit, star: floor >= twoStarFrom || kind === 'boss' ? 2 : 1, col, row });
      placed = true;
      break;
    }
    if (!placed) break;
  }
  return out;
}

export function enemyPower(act: number, floor: number, kind: 'battle' | 'elite' | 'boss'): number {
  const E = CONFIG.enemy;
  let m = E.actMult[Math.min(act, E.actMult.length - 1)] * (1 + E.floorMult * floor);
  if (kind === 'elite') m *= E.eliteMult;
  if (kind === 'boss') m *= E.bossMult;
  return m;
}

/** Applies a finished battle to the run and moves to the reward or game-over screen. */
export function resolveBattle(run: RunState, result: BattleResult): void {
  const b = run.battle;
  if (!b) return;
  const t = totals(run);
  const maxHp = heroMaxHp(run);
  for (const [uid, dmg] of Object.entries(result.damageByOwner)) {
    const u = run.roster.units.find((x) => x.uid === Number(uid));
    if (u) run.stats.damageByUnit[u.defId] = (run.stats.damageByUnit[u.defId] ?? 0) + dmg;
  }
  if (result.heroDied || result.heroHp === null) {
    run.heroHp = 0;
    endRun(run, 'Your Hero has fallen.');
    return;
  }
  run.heroHp = Math.min(maxHp, result.heroHp);
  const won = result.outcome === 'win';
  if (result.outcome === 'timeout') {
    run.heroHp = Math.max(0, run.heroHp - Math.round(maxHp * CONFIG.timeoutHeroDamagePct));
    if (run.heroHp <= 0) {
      endRun(run, 'Your Hero collapsed from exhaustion.');
      return;
    }
  }
  // Momentum uses the traits that were active in this fight.
  const statuses = boardTraitStatuses(run);
  const momentum = updateMomentum(
    run.momentum,
    TRAITS.map((x) => x.id),
    activeTraitIds(statuses),
    won,
  );
  const at100 = TRAITS.filter((x) => run.momentum[x.id] >= 100).length;
  run.stats.maxMomentumPairs = Math.max(run.stats.maxMomentumPairs, at100);

  // Gold and healing.
  const E = CONFIG.economy;
  const goldLines: [string, number][] = [];
  let heroHealed = 0;
  if (won) {
    run.winStreak++;
    run.stats.battlesWon++;
    if (result.onlyHeroSurvived) run.stats.soloHeroWins++;
    if (b.kind === 'boss' && result.heroDamageTaken === 0) run.stats.flawlessBossWins = (run.stats.flawlessBossWins ?? 0) + 1;
    goldLines.push([b.kind === 'boss' ? 'Boss defeated' : b.kind === 'elite' ? 'Elite defeated' : 'Victory', b.kind === 'boss' ? E.goldBoss : b.kind === 'elite' ? E.goldElite : E.goldBattle]);
    const streak = E.streakBonus[Math.min(run.winStreak, E.streakBonus.length - 1)];
    if (streak) goldLines.push([`Win streak x${run.winStreak}`, streak]);
    const traitGold = traitGoldPerWin(statuses);
    if (traitGold) goldLines.push(['Jade Court tribute', traitGold]);
    if (t.goldPerWin) goldLines.push(['Artifacts', t.goldPerWin]);
    if (t.interest) {
      const interest = Math.min(t.interest.max, Math.floor(run.gold / t.interest.per));
      if (interest) goldLines.push(['Interest', interest]);
    }
    const healPct = CONFIG.hero.healAfterWinPct + t.heroHealAfterFight / 100;
    const before = run.heroHp;
    run.heroHp = Math.min(maxHp, run.heroHp + Math.round(maxHp * healPct));
    heroHealed = run.heroHp - before;
  } else {
    run.winStreak = 0;
    goldLines.push(['Retreat', E.goldLoss]);
    if (t.heroHealAfterFight) {
      const before = run.heroHp;
      run.heroHp = Math.min(maxHp, run.heroHp + Math.round((maxHp * t.heroHealAfterFight) / 100));
      heroHealed = run.heroHp - before;
    }
  }
  const gold = goldLines.reduce((a, [, n]) => a + n, 0);
  run.gold += gold;
  run.stats.goldEarned += gold;
  run.stats.floorsCleared++;

  // Rewards.
  const reward: RewardState = {
    kind: b.kind,
    outcome: result.outcome,
    gold,
    goldLines,
    heroHealed,
    momentum,
    packs: rewardPacks(run, b.kind),
    bonusPacks: b.kind === 'boss' && won ? [makePack(run, 'boss')] : [],
    gainedArtifact: null,
    bossArtifactChoices: null,
    picked: false,
  };
  if (won && b.kind === 'elite') {
    const id = withRng(run, (rng) => rollArtifacts(run, rng, 1, run.act >= 2 ? ['uncommon', 'rare'] : ['common', 'uncommon', 'rare'])[0]);
    if (id) {
      gainArtifact(run, id);
      reward.gainedArtifact = id;
    }
  }
  if (won && b.kind === 'boss') {
    run.bossSlots = (run.bossSlots ?? 0) + 1;
    refreshLimits(run);
    if (run.act < FINAL_ACT) run.notices.push(`Boss defeated: +1 board slot (now ${run.roster.boardLimit}).`);
    reward.bossArtifactChoices = withRng(run, (rng) => rollArtifacts(run, rng, 3, ['boss']));
    if (!reward.bossArtifactChoices.length) reward.bossArtifactChoices = withRng(run, (rng) => rollArtifacts(run, rng, 3, ['rare', 'uncommon']));
  }
  run.reward = reward;
  run.battle = null;
  run.screen = 'reward';
}

function rewardPacks(run: RunState, kind: 'battle' | 'elite' | 'boss'): PackInstance[] {
  if (run.act === 0 && kind === 'battle') {
    return ['prologue', 'basic', 'hero'].map((id) => makePack(run, id));
  }
  const place = kind === 'battle' ? 'reward' : 'elite';
  const pool = PACKS.filter((p) => p.appears.includes(place) && (p.minAct ?? 0) <= run.act && p.special !== 'artifact');
  const n = CONFIG.packs.rewardChoices + totals(run).extraPackChoice + (getHero(run.heroId).perk.effect.k === 'extraPackChoice' ? 1 : 0);
  const picks = withRng(run, (rng) => rng.sample(pool, n));
  const out = picks.map((p) => makePack(run, p.id));
  // Momentum 75+: a trait pack of that trait joins the choice.
  for (const tr of TRAITS) {
    if ((run.momentum[tr.id] ?? 0) >= CONFIG.momentum.traitPackAt && out.length < n + 2) out.push(makePack(run, `trait_${tr.id}`));
  }
  return out;
}

/** Boss artifact choice on the reward screen. */
export function chooseBossArtifact(run: RunState, index: number): void {
  const r = run.reward;
  if (!r?.bossArtifactChoices) return;
  const id = r.bossArtifactChoices[index];
  if (id) gainArtifact(run, id);
  r.bossArtifactChoices = null;
}

/** Opens the next bonus pack (Boss Pack) from the reward screen. */
export function openBonusPack(run: RunState, isNew?: (id: string) => boolean): void {
  const r = run.reward;
  if (!r || !r.bonusPacks.length) return;
  const inst = r.bonusPacks.shift()!;
  beginOpenPack(run, inst, 'reward', isNew);
}

/** Picks the free reward pack and opens it. */
export function chooseRewardPack(run: RunState, index: number, isNew?: (id: string) => boolean): void {
  const r = run.reward;
  if (!r || r.picked) return;
  const inst = r.packs[index];
  r.picked = true;
  run.reward = null;
  beginOpenPack(run, inst, 'map', isNew);
}

/** Skips the reward pack (still returns to the map). */
export function skipReward(run: RunState): void {
  run.reward = null;
  run.screen = 'map';
  afterNodeCleared(run);
}

export function endRun(run: RunState, reason: string): void {
  run.result = { won: false, reason };
  run.screen = 'over';
  run.battle = null;
}

// ------------------------------------------------------------------ shop

function generateShop(run: RunState): ShopState {
  return withRng(run, (rng) => {
    const prologue = run.act === 0;
    const pool = PACKS.filter((p) => p.appears.includes('shop') && (p.minAct ?? 0) <= run.act);
    const count = prologue ? 3 : rng.int(CONFIG.economy.shopPackCount[0], CONFIG.economy.shopPackCount[1]);
    const chosen = prologue ? [getPack('prologue'), getPack('basic'), getPack('gamble')] : rng.sample(pool, count);
    const packs = chosen.map((def) => {
      const inst = resolvePackInstance(def, rng, traitIdLists());
      return { inst, price: shopPrice(run, def.price), sold: false };
    });
    const tiers: ArtifactTier[] = run.act >= 2 ? ['uncommon', 'rare'] : ['common', 'uncommon', 'rare'];
    const arts = prologue ? [] : rollArtifacts(run, rng, CONFIG.economy.shopArtifactCount, tiers);
    return {
      packs,
      artifacts: arts.map((id) => ({ id, price: shopPrice(run, CONFIG.economy.artifactPrice[getArtifact(id).tier]), sold: false })),
      rerolls: 0,
      healUsed: false,
      removeUsed: false,
    };
  });
}

export function rerollCost(run: RunState): number {
  if ((run.freeRerollsLeft ?? 0) > 0) return 0;
  const n = run.shop?.rerolls ?? 0;
  const costs = CONFIG.economy.rerollCosts;
  return costs[Math.min(n, costs.length - 1)];
}

export function rerollShop(run: RunState): boolean {
  if (!run.shop) return false;
  const cost = rerollCost(run);
  if (run.gold < cost) return false;
  run.gold -= cost;
  const free = (run.freeRerollsLeft ?? 0) > 0;
  if (free) run.freeRerollsLeft = (run.freeRerollsLeft ?? 0) - 1;
  const rerolls = run.shop.rerolls + (free ? 0 : 1);
  const fresh = generateShop(run);
  run.shop = { ...fresh, artifacts: run.shop.artifacts, rerolls, healUsed: run.shop.healUsed, removeUsed: run.shop.removeUsed };
  return true;
}

export function buyShopPack(run: RunState, index: number, isNew?: (id: string) => boolean): boolean {
  const s = run.shop;
  const item = s?.packs[index];
  if (!s || !item || item.sold || run.gold < item.price) return false;
  run.gold -= item.price;
  item.sold = true;
  beginOpenPack(run, item.inst, 'shop', isNew);
  return true;
}

export function buyShopArtifact(run: RunState, index: number): boolean {
  const s = run.shop;
  const item = s?.artifacts[index];
  if (!s || !item || item.sold || run.gold < item.price) return false;
  run.gold -= item.price;
  item.sold = true;
  gainArtifact(run, item.id);
  return true;
}

export function healServicePrice(run: RunState): number {
  return shopPrice(run, CONFIG.economy.healServicePrice);
}
export function removeServicePrice(run: RunState): number {
  return shopPrice(run, CONFIG.economy.removeServicePrice);
}

export function buyHeal(run: RunState): boolean {
  const s = run.shop;
  const price = healServicePrice(run);
  if (!s || s.healUsed || run.gold < price || run.heroHp >= heroMaxHp(run)) return false;
  run.gold -= price;
  s.healUsed = true;
  const max = heroMaxHp(run);
  run.heroHp = Math.min(max, run.heroHp + Math.round(max * CONFIG.economy.healServicePct));
  return true;
}

/** Removes a unit for a small fee (no gold back) — thins the roster. */
export function buyRemove(run: RunState, uid: number): boolean {
  const s = run.shop;
  const price = removeServicePrice(run);
  if (!s || s.removeUsed || run.gold < price) return false;
  if (!removeUnit(run.roster, uid)) return false;
  run.gold -= price;
  s.removeUsed = true;
  return true;
}

export function leaveShop(run: RunState): void {
  run.shop = null;
  run.screen = 'map';
  run.stats.floorsCleared++;
}

// ------------------------------------------------------------------ events

function pickEvent(run: RunState): string {
  return withRng(run, (rng) => {
    const pool = EVENTS.filter((e) => (e.minAct ?? 0) <= run.act && !run.flags.usedEvents.includes(e.id));
    const list = pool.length ? pool : EVENTS.filter((e) => (e.minAct ?? 0) <= run.act);
    const id = rng.pick(list).id;
    run.flags.usedEvents.push(id);
    return id;
  });
}

export function choiceAvailable(run: RunState, eventId: string, index: number): boolean {
  const c = getEvent(eventId).choices[index];
  if (!c) return false;
  const r = c.requires;
  if (!r) return true;
  if (r.gold !== undefined && run.gold < r.gold) return false;
  if (r.units !== undefined && run.roster.units.filter((u) => !u.hero && u.loc.at !== 'pending').length < r.units) return false;
  if (r.heroHpPct !== undefined && (run.heroHp / heroMaxHp(run)) * 100 < r.heroHpPct) return false;
  return true;
}

/** What (if anything) the player must pick a unit for in this choice. */
export function choiceUnitPurpose(eventId: string, index: number): 'sacrifice' | 'train' | 'starUp' | null {
  const flat = (os: readonly Outcome[]): Outcome[] => os.flatMap((o) => (o.k === 'gamble' ? [...flat(o.win), ...flat(o.lose)] : [o]));
  const c = getEvent(eventId).choices[index];
  if (!c) return null;
  const o = flat(c.outcomes).find((x) => x.k === 'sacrifice' || x.k === 'train' || x.k === 'starUp');
  return o ? (o.k as 'sacrifice' | 'train' | 'starUp') : null;
}

export function choiceNeedsUnit(eventId: string, index: number): boolean {
  return choiceUnitPurpose(eventId, index) !== null;
}

export function chooseEvent(run: RunState, index: number, unitUid?: number, isNew?: (id: string) => boolean): void {
  const ev = run.event;
  if (!ev || ev.result) return;
  if (!choiceAvailable(run, ev.id, index)) return;
  const choice = getEvent(ev.id).choices[index];
  const lines: string[] = [];
  const packs: PackInstance[] = [];
  applyOutcomes(run, choice.outcomes, unitUid, lines, packs);
  ev.result = lines.filter(Boolean).join(' ') || 'You move on.';
  if (packs.length) run.pendingEventPack = packs[0];
  if (run.heroHp <= 0) endRun(run, 'Your Hero did not survive the encounter.');
  void isNew;
}

function applyOutcomes(run: RunState, outcomes: readonly Outcome[], unitUid: number | undefined, lines: string[], packs: PackInstance[]): void {
  const unit = unitUid !== undefined ? run.roster.units.find((u) => u.uid === unitUid && !u.hero) : undefined;
  for (const o of outcomes) {
    switch (o.k) {
      case 'gold':
        run.gold = Math.max(0, run.gold + o.n);
        if (o.n > 0) run.stats.goldEarned += o.n;
        lines.push(o.n >= 0 ? `+${o.n} gold.` : `${o.n} gold.`);
        break;
      case 'heroHp': {
        const max = heroMaxHp(run);
        const delta = Math.round((max * o.pct) / 100);
        run.heroHp = Math.max(0, Math.min(max, run.heroHp + delta));
        lines.push(delta >= 0 ? `Your Hero heals ${delta} HP.` : `Your Hero loses ${-delta} HP.`);
        break;
      }
      case 'heroMaxHp':
        changeMaxHp(run, () => {
          run.heroMaxHpBonus += o.n;
        });
        lines.push(`Your Hero gains +${o.n} max HP.`);
        break;
      case 'pack':
        packs.push(makePack(run, o.pack));
        lines.push(`You receive a ${getPack(o.pack).name}.`);
        break;
      case 'artifact': {
        const tiers: ArtifactTier[] = o.tier === 'random' ? ['common', 'uncommon', 'rare'] : [o.tier];
        const id = withRng(run, (rng) => rollArtifacts(run, rng, 1, tiers)[0]);
        if (id) {
          gainArtifact(run, id);
          lines.push(`You gain the ${getArtifact(id).name}.`);
        } else {
          run.gold += 10;
          lines.push('You find 10 gold instead.');
        }
        break;
      }
      case 'sacrifice':
        if (unit) {
          removeUnit(run.roster, unit.uid);
          lines.push(`${getUnit(unit.defId).name} is gone.`);
        }
        break;
      case 'unit': {
        const pool = PACK_UNITS.filter((u) => u.rarity === o.rarity);
        const pick = withRng(run, (rng) => rng.pick(pool));
        addUnit(run.roster, pick.id);
        if (!run.pulled.includes(pick.id)) run.pulled.push(pick.id);
        lines.push(`${pick.name} joins you!`);
        break;
      }
      case 'momentum': {
        const targets =
          o.target === 'all'
            ? TRAITS.map((t) => t.id)
            : o.target === 'highest'
              ? [topMomentumTrait(run.momentum) ?? withRng(run, (r) => r.pick(TRAITS).id)]
              : [withRng(run, (r) => r.pick(TRAITS).id)];
        for (const t of targets) run.momentum[t] = Math.max(0, Math.min(100, (run.momentum[t] ?? 0) + o.n));
        lines.push(o.target === 'all' ? `All momentum ${o.n >= 0 ? '+' : ''}${o.n}.` : `${getTrait(targets[0]).name} momentum ${o.n >= 0 ? '+' : ''}${o.n}.`);
        break;
      }
      case 'train':
        if (unit) {
          unit.trained[o.stat] = (unit.trained[o.stat] ?? 0) + o.amount;
          lines.push(`${getUnit(unit.defId).name} gains +${o.amount} ${o.stat === 'ad' ? 'Attack' : o.stat === 'hp' ? 'HP' : o.stat === 'armor' ? 'Armour' : o.stat === 'mr' ? 'Magic Res' : o.stat}.`);
        }
        break;
      case 'starUp':
        if (unit && unit.star < 3) {
          unit.star = (unit.star + 1) as Star;
          resolveMerges(run.roster);
          lines.push(`${getUnit(unit.defId).name} rises to ${unit.star}★!`);
        }
        break;
      case 'gamble': {
        const win = withRng(run, (r) => r.chance(o.chance));
        lines.push(win ? 'Fortune smiles!' : 'Luck is not with you.');
        applyOutcomes(run, win ? o.win : o.lose, unitUid, lines, packs);
        break;
      }
      case 'nothing':
        break;
    }
  }
}

/** Leaves the event (opening any pack it gave first). */
export function finishEvent(run: RunState, isNew?: (id: string) => boolean): void {
  if (run.screen === 'over') return;
  run.event = null;
  run.stats.floorsCleared++;
  const pack = run.pendingEventPack;
  run.pendingEventPack = null;
  if (pack) beginOpenPack(run, pack, 'map', isNew);
  else run.screen = 'map';
}

// ------------------------------------------------------------------ rest

export function restHeal(run: RunState): number {
  if (!run.rest || run.rest.done) return 0;
  const max = heroMaxHp(run);
  const before = run.heroHp;
  run.heroHp = Math.min(max, run.heroHp + Math.round(max * (CONFIG.hero.restHealPct + totals(run).restHeal / 100)));
  run.rest.done = true;
  run.rest.text = `Your Hero rests and recovers ${run.heroHp - before} HP.`;
  return run.heroHp - before;
}

export function restTrain(run: RunState, uid: number): boolean {
  if (!run.rest || run.rest.done) return false;
  const u = run.roster.units.find((x) => x.uid === uid && x.loc.at !== 'pending');
  if (!u) return false;
  if (u.hero) {
    changeMaxHp(run, () => {
      u.trained.hp = (u.trained.hp ?? 0) + CONFIG.hero.trainHpBonus;
    });
    u.trained.ad = (u.trained.ad ?? 0) + Math.round(CONFIG.hero.trainAdBonus / 2);
  } else {
    u.trained.hp = (u.trained.hp ?? 0) + CONFIG.hero.trainHpBonus;
    u.trained.ad = (u.trained.ad ?? 0) + CONFIG.hero.trainAdBonus;
  }
  run.rest.done = true;
  run.rest.text = `${u.hero ? getHero(run.heroId).name : getUnit(u.defId).name} trains hard: +${CONFIG.hero.trainHpBonus} HP and +${u.hero ? Math.round(CONFIG.hero.trainAdBonus / 2) : CONFIG.hero.trainAdBonus} Attack for the rest of the run.`;
  return true;
}

export function leaveRest(run: RunState): void {
  run.rest = null;
  run.stats.floorsCleared++;
  run.screen = 'map';
  afterNodeCleared(run);
}

// ------------------------------------------------------------------ treasure

export function takeTreasure(run: RunState): void {
  const t = run.treasure;
  if (!t || t.taken) return;
  t.taken = true;
  run.gold += t.gold;
  run.stats.goldEarned += t.gold;
  if (t.artifact) gainArtifact(run, t.artifact);
}

export function leaveTreasure(run: RunState): void {
  if (run.treasure && !run.treasure.taken) takeTreasure(run);
  run.treasure = null;
  run.stats.floorsCleared++;
  run.screen = 'map';
}

// ------------------------------------------------------------------ misc

/** Total nodes visited across the whole run (the "floor reached" stat). */
export function floorReached(run: RunState): number {
  const prologue = CONFIG.map.prologueNodes;
  const perAct = CONFIG.map.floors + 1;
  const node = currentNode(run);
  const floorInAct = node ? node.floor + 1 : 0;
  if (run.act === 0) return floorInAct;
  return prologue + (run.act - 1) * perAct + floorInAct;
}

export function actName(act: number): string {
  return ['Prologue: The Bamboo Road', 'Act I: Bamboo Forest', 'Act II: Mountain Shrine', 'Act III: Celestial Palace'][act] ?? `Act ${act}`;
}

export function mostDamage(run: RunState): { unitId: string; damage: number } | null {
  let best: { unitId: string; damage: number } | null = null;
  for (const [unitId, damage] of Object.entries(run.stats.damageByUnit)) if (!best || damage > best.damage) best = { unitId, damage };
  return best;
}

export function markTutorial(run: RunState, key: string): void {
  if (!run.flags.tutorialSeen.includes(key)) run.flags.tutorialSeen.push(key);
}

export { type MergeEvent };

/** Display stats for an owned unit (training, artifacts, momentum; not trait passives). */
export function ownedUnitStats(run: RunState, u: OwnedUnit) {
  const t = totals(run);
  const hero = getHero(run.heroId);
  const def = u.hero ? hero : getUnit(u.defId);
  const flat: Partial<Record<CombatStatKey, number>> = { ...t.teamFlat };
  for (const [k, v] of Object.entries(u.trained)) flat[k as StatKey] = (flat[k as StatKey] ?? 0) + (v ?? 0);
  const pct = pctForUnit(run, u.defId, t);
  if (u.hero) {
    for (const [k, v] of Object.entries(t.heroFlat)) flat[k as CombatStatKey] = (flat[k as CombatStatKey] ?? 0) + (v ?? 0);
    for (const [k, v] of Object.entries(t.heroPct)) pct[k as CombatStatKey] = (pct[k as CombatStatKey] ?? 0) + (v ?? 0);
    delete pct.hp;
    flat.hp = heroMaxHp(run) - hero.stats.hp;
    return combatStats(def.stats, u.star, { powerMult: heroGrowth(run.act), hpMult: 1, flat, pct });
  }
  return combatStats(def.stats, u.star, { flat, pct });
}
