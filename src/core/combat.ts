/**
 * Deterministic auto-battle simulation. Runs at a fixed tick rate and emits
 * events that the renderer turns into animation. No Phaser imports.
 */
import { CONFIG } from './config';
import { firstStepToward, GRID_COLS, GRID_ROWS, type Hex, hexDistance, hexKey, neighbors } from './hex';
import { Rng } from './rng';
import type {
  AbilityStep,
  CombatStatKey,
  CombatStats,
  DamageType,
  Effect,
  FxKind,
  PassiveDef,
  Star,
  TargetSel,
  UnitDef,
} from './types';
import { combatStats, starValue } from './units';

export const TICK_RATE = CONFIG.tickRate;
const sec = (s: number) => Math.max(1, Math.round(s * TICK_RATE));

export type Team = 0 | 1;

export interface BattleUnitInput {
  def: UnitDef;
  star: Star;
  team: Team;
  hex: Hex;
  stats: CombatStats;
  passives: readonly PassiveDef[];
  isHero?: boolean;
  /** Starting HP (defaults to max). Used for the Hero's carried-over HP. */
  hp?: number;
  startCharge?: number;
  /** Key linking this combatant back to an owned unit (run state uid). */
  ownerUid?: number;
}

export interface BattleSetup {
  seed: number;
  units: BattleUnitInput[];
  /** Resolves a unit id for summons. */
  lookup: (id: string) => UnitDef | undefined;
  /** Stat multiplier for units summoned by each team. */
  summonPower?: [number, number];
}

interface Mod {
  stat: CombatStatKey;
  amount: number;
  pct: boolean;
  until: number;
}

interface Dot {
  dps: number;
  dtype: DamageType;
  until: number;
  source: number;
}

interface Shield {
  amount: number;
  until: number;
}

export class CombatUnit {
  uid: number;
  def: UnitDef;
  star: Star;
  team: Team;
  isHero: boolean;
  isSummon = false;
  ownerUid?: number;
  hex: Hex;
  prevHex: Hex;
  moveTotal = 0;
  moveLeft = 0;
  base: CombatStats;
  mods: Mod[] = [];
  dots: Dot[] = [];
  shields: Shield[] = [];
  passives: PassiveDef[];
  hp: number;
  maxHp: number;
  charge: number;
  alive = true;
  targetUid = -1;
  attackCd = 0;
  castUntil = 0;
  stunUntil = 0;
  invulnUntil = 0;
  guardedTag: string | null = null;
  tauntUid = -1;
  tauntUntil = 0;
  attackCount = 0;
  passiveNext: number[] = [];
  passiveUsed: boolean[] = [];
  /** Stats tracking for results. */
  dmgDealt = 0;
  dmgTaken = 0;
  healed = 0;
  kills = 0;
  casts = 0;

  constructor(uid: number, input: BattleUnitInput) {
    this.uid = uid;
    this.def = input.def;
    this.star = input.star;
    this.team = input.team;
    this.isHero = !!input.isHero;
    this.ownerUid = input.ownerUid;
    this.hex = { ...input.hex };
    this.prevHex = { ...input.hex };
    this.base = { ...input.stats };
    this.passives = input.passives.slice();
    this.maxHp = Math.max(1, Math.round(this.base.hp));
    this.hp = Math.min(this.maxHp, Math.max(1, Math.round(input.hp ?? this.maxHp)));
    this.charge = Math.min(CONFIG.combat.chargeMax - 1, input.startCharge ?? 0);
  }

  stat(k: CombatStatKey, tick: number): number {
    let flat = 0;
    let pct = 0;
    for (const m of this.mods) {
      if (m.until <= tick || m.stat !== k) continue;
      if (m.pct) pct += m.amount;
      else flat += m.amount;
    }
    const v = (this.base[k] + flat) * (1 + pct / 100);
    switch (k) {
      case 'as':
        return Math.max(0.2, Math.min(5, v));
      case 'ms':
        return Math.max(0.5, v);
      case 'crit':
      case 'dodge':
        return Math.max(0, Math.min(k === 'dodge' ? 0.6 : 1, v));
      case 'range':
        return Math.max(1, Math.round(v));
      case 'dmgReduce':
        return Math.min(75, v);
      default:
        return v;
    }
  }

  shieldTotal(tick: number): number {
    let s = 0;
    for (const sh of this.shields) if (sh.until > tick) s += sh.amount;
    return s;
  }

  get moving(): boolean {
    return this.moveLeft > 0;
  }
}

export type BattleEvent =
  | { t: 'move'; uid: number; from: Hex; to: Hex; ticks: number }
  | { t: 'attack'; uid: number; target: number; ranged: boolean }
  | { t: 'projectile'; id: number; from: number; to: number; ticks: number; fx: FxKind; ability: boolean }
  | { t: 'projectileEnd'; id: number }
  | { t: 'damage'; uid: number; amount: number; crit: boolean; dtype: DamageType; source: number; shielded: number }
  | { t: 'heal'; uid: number; amount: number }
  | { t: 'shield'; uid: number; amount: number }
  | { t: 'cast'; uid: number; name: string; fx: FxKind; big: boolean }
  | { t: 'fx'; fx: FxKind; uid: number }
  | { t: 'death'; uid: number }
  | { t: 'stun'; uid: number; ticks: number }
  | { t: 'summon'; uid: number; by: number }
  | { t: 'dash'; uid: number; from: Hex; to: Hex }
  | { t: 'dodge'; uid: number }
  | { t: 'buff'; uid: number; good: boolean }
  | { t: 'invuln'; uid: number; on: boolean }
  | { t: 'swap'; uids: number[] }
  | { t: 'overtime' };

interface Projectile {
  id: number;
  source: number;
  target: number;
  left: number;
  /** Basic attack damage (if a basic attack). */
  attack?: { amount: number; crit: boolean };
  step?: AbilityStep;
  star: Star;
}

interface Ctx {
  caster: CombatUnit;
  target?: CombatUnit;
  attacker?: CombatUnit;
  ability: boolean;
}

export type Outcome = 'win' | 'loss' | 'timeout';

export interface BattleResult {
  outcome: Outcome;
  heroDied: boolean;
  heroHp: number | null;
  heroMaxHp: number | null;
  ticks: number;
  /** Player units (not summons) that survived, by ownerUid. */
  survivors: number[];
  /** Damage dealt per player ownerUid. */
  damageByOwner: Record<number, number>;
  onlyHeroSurvived: boolean;
  heroDamageTaken: number;
}

export class Battle {
  units: CombatUnit[] = [];
  tick = 0;
  rng: Rng;
  events: BattleEvent[] = [];
  result: BattleResult | null = null;
  private projectiles: Projectile[] = [];
  private nextUid = 1;
  private nextProj = 1;
  private occ = new Map<number, number>();
  private lookup: BattleSetup['lookup'];
  private summonPower: [number, number];
  private overtimeAnnounced = false;

  constructor(setup: BattleSetup) {
    this.rng = new Rng(setup.seed);
    this.lookup = setup.lookup;
    this.summonPower = setup.summonPower ?? [1, 1];
    for (const input of setup.units) this.addUnit(input);
    for (const u of this.units) this.initPassives(u);
    // Battle-start passives run in deterministic order on tick 0.
    for (const u of this.units.slice()) this.firePassives(u, 'battleStart', { caster: u, ability: true });
  }

  private addUnit(input: BattleUnitInput): CombatUnit {
    let hex = input.hex;
    if (this.occ.has(hexKey(hex))) {
      const free = this.freeHexNear(hex);
      if (!free) throw new Error('No space for unit');
      hex = free;
    }
    const u = new CombatUnit(this.nextUid++, { ...input, hex });
    this.units.push(u);
    this.occ.set(hexKey(hex), u.uid);
    return u;
  }

  private initPassives(u: CombatUnit): void {
    u.passiveNext = u.passives.map((p) => (p.trigger === 'interval' ? sec(p.interval ?? 3) : 0));
    u.passiveUsed = u.passives.map(() => false);
    for (const p of u.passives) {
      if (p.trigger !== 'static') continue;
      if (p.stats) for (const [k, v] of Object.entries(p.stats)) u.base[k as CombatStatKey] += starValue(v, u.star);
      if (p.pctStats)
        for (const [k, v] of Object.entries(p.pctStats)) u.base[k as CombatStatKey] *= 1 + starValue(v, u.star) / 100;
    }
    const newMax = Math.max(1, Math.round(u.base.hp));
    if (newMax !== u.maxHp) {
      const ratio = u.hp / u.maxHp;
      // Heroes keep their carried HP deficit; others start full.
      u.hp = u.isHero ? Math.max(1, Math.round(newMax - (u.maxHp - u.hp))) : Math.round(newMax * ratio);
      u.maxHp = newMax;
    }
  }

  get done(): boolean {
    return this.result !== null;
  }

  unit(uid: number): CombatUnit | undefined {
    return this.units.find((u) => u.uid === uid);
  }

  alive(team?: Team): CombatUnit[] {
    return this.units.filter((u) => u.alive && (team === undefined || u.team === team));
  }

  // ---------------------------------------------------------------- stepping

  /** Advances the simulation one tick. Events for the tick are in `events`. */
  step(): void {
    if (this.result) return;
    this.events = [];
    this.tick++;
    const t = this.tick;
    const secs = t / TICK_RATE;
    if (secs >= CONFIG.overtimeStart && !this.overtimeAnnounced) {
      this.overtimeAnnounced = true;
      this.events.push({ t: 'overtime' });
    }

    for (const u of this.units.slice()) {
      if (!u.alive) continue;
      this.updateUnitTimers(u);
      if (!u.alive) continue;
      this.act(u);
      if (this.checkEnd()) return;
    }
    this.updateProjectiles();
    if (this.checkEnd()) return;
    if (secs >= CONFIG.maxBattleSeconds) this.finish('timeout');
  }

  /** Runs to completion (the skip button). */
  runToEnd(): BattleResult {
    let guard = 0;
    while (!this.result && guard++ < CONFIG.maxBattleSeconds * TICK_RATE + 10) this.step();
    if (!this.result) this.finish('timeout');
    return this.result!;
  }

  private updateUnitTimers(u: CombatUnit): void {
    const t = this.tick;
    if (u.moveLeft > 0) u.moveLeft--;
    if (u.attackCd > 0) u.attackCd--;
    if (u.mods.length && u.mods.some((m) => m.until <= t)) u.mods = u.mods.filter((m) => m.until > t);
    if (u.shields.length && u.shields.some((s) => s.until <= t || s.amount <= 0))
      u.shields = u.shields.filter((s) => s.until > t && s.amount > 0);
    if (u.invulnUntil === t) this.events.push({ t: 'invuln', uid: u.uid, on: false });
    // Damage over time ticks once per second.
    if (u.dots.length) {
      u.dots = u.dots.filter((d) => d.until > t);
      if (t % TICK_RATE === 0) {
        for (const d of u.dots) {
          const src = this.unit(d.source);
          this.dealDamage(src ?? u, u, d.dps, d.dtype, false, true);
          if (!u.alive) return;
        }
      }
    }
    // Interval passives.
    u.passives.forEach((p, i) => {
      if (p.trigger === 'interval' && u.alive && t >= u.passiveNext[i]) {
        u.passiveNext[i] = t + sec(p.interval ?? 3);
        this.runPassive(u, p, i, { caster: u, ability: true });
      }
    });
  }

  private act(u: CombatUnit): void {
    const t = this.tick;
    if (u.stunUntil > t || u.castUntil > t || u.moveLeft > 0) return;

    // Cast the ultimate as soon as charge is full.
    if (u.charge >= CONFIG.combat.chargeMax && this.alive(this.enemyTeam(u)).length > 0) {
      this.castUlt(u);
      return;
    }

    const target = this.chooseTarget(u);
    if (!target) return;
    u.targetUid = target.uid;
    const range = u.stat('range', t);
    if (hexDistance(u.hex, target.hex) <= range) {
      if (u.attackCd <= 0) this.basicAttack(u, target);
    } else {
      this.moveToward(u, target, range);
    }
  }

  private enemyTeam(u: CombatUnit): Team {
    return u.team === 0 ? 1 : 0;
  }

  private chooseTarget(u: CombatUnit): CombatUnit | null {
    const t = this.tick;
    if (u.tauntUntil > t) {
      const tt = this.unit(u.tauntUid);
      if (tt && tt.alive) return tt;
    }
    const enemies = this.alive(this.enemyTeam(u));
    if (enemies.length === 0) return null;
    const cur = this.unit(u.targetUid);
    const range = u.stat('range', t);
    if (cur && cur.alive && cur.team !== u.team && hexDistance(u.hex, cur.hex) <= range) return cur;
    let best: CombatUnit | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      const d = hexDistance(u.hex, e.hex);
      if (d < bestD || (d === bestD && best && e.uid < best.uid)) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  private moveToward(u: CombatUnit, target: CombatUnit, range: number): void {
    const blocked = (h: Hex) => this.occ.has(hexKey(h));
    let step = firstStepToward(u.hex, (h) => hexDistance(h, target.hex) <= range, blocked);
    if (!step) {
      // Path to the chosen target is blocked: head for any reachable enemy.
      for (const e of this.alive(this.enemyTeam(u)).sort((a, b) => hexDistance(u.hex, a.hex) - hexDistance(u.hex, b.hex))) {
        step = firstStepToward(u.hex, (h) => hexDistance(h, e.hex) <= range, blocked);
        if (step) {
          u.targetUid = e.uid;
          break;
        }
      }
    }
    if (!step) return;
    const ticks = sec(1 / u.stat('ms', this.tick));
    this.occ.delete(hexKey(u.hex));
    this.occ.set(hexKey(step), u.uid);
    u.prevHex = u.hex;
    u.hex = step;
    u.moveTotal = ticks;
    u.moveLeft = ticks;
    this.events.push({ t: 'move', uid: u.uid, from: u.prevHex, to: step, ticks });
  }

  private basicAttack(u: CombatUnit, target: CombatUnit): void {
    const t = this.tick;
    u.attackCd = sec(1 / u.stat('as', t));
    u.attackCount++;
    const crit = this.rng.chance(u.stat('crit', t));
    const amount = u.stat('ad', t) * (crit ? u.stat('critDmg', t) : 1);
    const ranged = u.stat('range', t) > 1;
    this.events.push({ t: 'attack', uid: u.uid, target: target.uid, ranged });
    this.gainCharge(u, u.def.chargePerAttack ?? CONFIG.combat.chargePerAttack);
    if (ranged) {
      const ticks = Math.max(1, Math.round((hexDistance(u.hex, target.hex) / CONFIG.combat.projectileSpeed) * TICK_RATE));
      const p: Projectile = { id: this.nextProj++, source: u.uid, target: target.uid, left: ticks, attack: { amount, crit }, star: u.star };
      this.projectiles.push(p);
      this.events.push({ t: 'projectile', id: p.id, from: u.uid, to: target.uid, ticks, fx: 'arrow', ability: false });
    } else {
      this.landAttack(u, target, amount, crit);
    }
    this.firePassives(u, 'onAttack', { caster: u, target, ability: false });
    u.passives.forEach((p, i) => {
      if (p.trigger === 'everyNthAttack' && p.n && u.attackCount % p.n === 0) this.runPassive(u, p, i, { caster: u, target, ability: true });
    });
  }

  private landAttack(u: CombatUnit, target: CombatUnit, amount: number, crit: boolean): void {
    if (!target.alive) return;
    if (this.rng.chance(target.stat('dodge', this.tick))) {
      this.events.push({ t: 'dodge', uid: target.uid });
      return;
    }
    this.dealDamage(u, target, amount, 'physical', crit, false);
    if (target.alive) this.firePassives(target, 'onHitTaken', { caster: target, attacker: u, target: u, ability: true });
  }

  private gainCharge(u: CombatUnit, amount: number): void {
    if (!u.def.ult) return;
    u.charge = Math.min(CONFIG.combat.chargeMax, u.charge + amount * (u.stat('chargeGain', this.tick) / 100));
  }

  private castUlt(u: CombatUnit): void {
    const ult = u.def.ult;
    u.charge = 0;
    u.casts++;
    u.castUntil = this.tick + sec(ult.castTime ?? CONFIG.combat.defaultCastTime);
    this.events.push({ t: 'cast', uid: u.uid, name: ult.name, fx: ult.fx ?? 'burst', big: !!ult.big || u.star === 3 });
    const target = this.chooseTarget(u) ?? undefined;
    const ctx: Ctx = { caster: u, target, ability: true };
    for (const s of ult.steps) this.runStep(s, ctx);
    if (u.star === 3 && ult.star3Steps) for (const s of ult.star3Steps) this.runStep(s, ctx);
    this.firePassives(u, 'onCast', { caster: u, target, ability: true });
  }

  // ---------------------------------------------------------------- passives

  private firePassives(u: CombatUnit, trigger: PassiveDef['trigger'], ctx: Ctx): void {
    if (!u.alive && trigger !== 'onKill') return;
    u.passives.forEach((p, i) => {
      if (p.trigger === trigger) this.runPassive(u, p, i, ctx);
    });
  }

  private runPassive(u: CombatUnit, p: PassiveDef, i: number, ctx: Ctx): void {
    if (p.once && u.passiveUsed[i]) return;
    if (p.chance !== undefined && !this.rng.chance(p.chance)) return;
    u.passiveUsed[i] = true;
    if (p.steps) for (const s of p.steps) this.runStep(s, ctx);
    // Timed stat passives (non-static triggers with stats) apply for the fight.
    if (p.trigger !== 'static') {
      if (p.stats)
        for (const [k, v] of Object.entries(p.stats))
          u.mods.push({ stat: k as CombatStatKey, amount: starValue(v, u.star), pct: false, until: Infinity });
      if (p.pctStats)
        for (const [k, v] of Object.entries(p.pctStats))
          u.mods.push({ stat: k as CombatStatKey, amount: starValue(v, u.star), pct: true, until: Infinity });
    }
  }

  private checkHpThresholds(u: CombatUnit): void {
    u.passives.forEach((p, i) => {
      if (p.trigger === 'hpBelow' && !u.passiveUsed[i] && u.alive && u.hp / u.maxHp < (p.threshold ?? 0.5)) {
        this.runPassive(u, { ...p, once: true }, i, { caster: u, ability: true });
        u.passiveUsed[i] = true;
      }
    });
  }

  // ---------------------------------------------------------------- abilities

  private runStep(step: AbilityStep, ctx: Ctx): void {
    const primaries = this.pickPrimaries(step.sel, ctx);
    if (step.projectile) {
      for (const p of primaries) {
        const ticks = Math.max(1, Math.round((hexDistance(ctx.caster.hex, p.hex) / step.projectile) * TICK_RATE));
        const proj: Projectile = { id: this.nextProj++, source: ctx.caster.uid, target: p.uid, left: ticks, step, star: ctx.caster.star };
        this.projectiles.push(proj);
        this.events.push({ t: 'projectile', id: proj.id, from: ctx.caster.uid, to: p.uid, ticks, fx: step.fx ?? 'orb', ability: true });
      }
      return;
    }
    this.applyStepTo(step, ctx, primaries);
  }

  private applyStepTo(step: AbilityStep, ctx: Ctx, primaries: CombatUnit[]): void {
    const targets = this.expandArea(step.sel, ctx, primaries);
    if (step.fx) for (const t of targets) this.events.push({ t: 'fx', fx: step.fx, uid: t.uid });
    // Swap acts on the whole group at once.
    if (step.effects.some((e) => e.k === 'swap')) this.swapUnits(targets);
    for (const target of targets) {
      for (const e of step.effects) {
        if (e.k === 'swap') continue;
        if (!target.alive && e.k !== 'summon' && e.k !== 'dash') continue;
        this.applyEffect(e, ctx, target);
      }
    }
  }

  private sideUnits(sel: TargetSel, caster: CombatUnit): CombatUnit[] {
    const side = sel.side ?? 'enemy';
    const team = side === 'enemy' ? this.enemyTeam(caster) : caster.team;
    return this.alive(team);
  }

  private pickPrimaries(sel: TargetSel, ctx: Ctx): CombatUnit[] {
    const c = ctx.caster;
    const star = c.star;
    const count = Math.max(1, Math.round(starValue(sel.count, star) || 1));
    const t = this.tick;
    switch (sel.pick) {
      case 'self':
        return [c];
      case 'attacker':
        return ctx.attacker && ctx.attacker.alive ? [ctx.attacker] : [];
      case 'target': {
        const tg = ctx.target && ctx.target.alive ? ctx.target : this.chooseTarget(c);
        return tg ? [tg] : [];
      }
    }
    let pool = this.sideUnits(sel, c);
    if (sel.side === 'ally' && !sel.includeSelf) pool = pool.filter((u) => u.uid !== c.uid);
    if (pool.length === 0) return [];
    const byUid = (a: CombatUnit, b: CombatUnit) => a.uid - b.uid;
    let sorted: CombatUnit[];
    switch (sel.pick) {
      case 'nearest':
        sorted = pool.sort((a, b) => hexDistance(c.hex, a.hex) - hexDistance(c.hex, b.hex) || byUid(a, b));
        break;
      case 'farthest':
        sorted = pool.sort((a, b) => hexDistance(c.hex, b.hex) - hexDistance(c.hex, a.hex) || byUid(a, b));
        break;
      case 'lowestHp':
        sorted = pool.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || byUid(a, b));
        break;
      case 'highestHp':
        sorted = pool.sort((a, b) => b.hp - a.hp || byUid(a, b));
        break;
      case 'highestAd':
        sorted = pool.sort((a, b) => b.stat('ad', t) - a.stat('ad', t) || byUid(a, b));
        break;
      case 'random':
        sorted = this.rng.shuffle(pool.sort(byUid));
        break;
      case 'all':
        return pool.sort(byUid);
      default:
        sorted = pool;
    }
    return sorted.slice(0, count);
  }

  private expandArea(sel: TargetSel, ctx: Ctx, primaries: CombatUnit[]): CombatUnit[] {
    const radius = starValue(sel.radius, ctx.caster.star);
    if (!radius) return primaries.filter((u) => u.alive || u === ctx.caster);
    const pool = this.sideUnits(sel, ctx.caster);
    const out = new Map<number, CombatUnit>();
    for (const p of primaries) {
      if (p.alive && (sel.pick !== 'self' || sel.side === 'ally')) out.set(p.uid, p);
      for (const u of pool) if (hexDistance(p.hex, u.hex) <= radius) out.set(u.uid, u);
    }
    if (sel.pick === 'self' && !sel.includeSelf) out.delete(ctx.caster.uid);
    return [...out.values()].sort((a, b) => a.uid - b.uid);
  }

  private applyEffect(e: Effect, ctx: Ctx, target: CombatUnit): void {
    const c = ctx.caster;
    const star = c.star;
    const t = this.tick;
    const pw = ctx.ability ? c.stat('power', t) / 100 : 1;
    switch (e.k) {
      case 'damage': {
        const amt =
          starValue(e.amount, star) * pw +
          starValue(e.adRatio, star) * c.stat('ad', t) +
          starValue(e.maxHpPct, star) * target.maxHp;
        this.dealDamage(c, target, amt, e.dtype, false, true);
        break;
      }
      case 'heal': {
        const amt = starValue(e.amount, star) * pw + starValue(e.adRatio, star) * c.stat('ad', t) + starValue(e.maxHpPct, star) * target.maxHp;
        this.heal(c, target, amt);
        break;
      }
      case 'shield': {
        const amt = starValue(e.amount, star) * pw + starValue(e.maxHpPct, star) * target.maxHp;
        target.shields.push({ amount: amt, until: t + sec(e.duration) });
        this.events.push({ t: 'shield', uid: target.uid, amount: Math.round(amt) });
        break;
      }
      case 'stun': {
        if (target.invulnUntil > t || target.guardedTag) break;
        const ticks = sec(starValue(e.duration, star));
        target.stunUntil = Math.max(target.stunUntil, t + ticks);
        this.events.push({ t: 'stun', uid: target.uid, ticks });
        break;
      }
      case 'buff':
      case 'debuff': {
        const sign = e.k === 'debuff' ? -1 : 1;
        target.mods.push({
          stat: e.stat,
          amount: sign * starValue(e.amount, star),
          pct: !!e.pct,
          until: e.duration ? t + sec(e.duration) : Infinity,
        });
        this.events.push({ t: 'buff', uid: target.uid, good: sign > 0 });
        break;
      }
      case 'dot': {
        const dps = starValue(e.dps, star) * pw + starValue(e.adRatio, star) * c.stat('ad', t);
        target.dots.push({ dps, dtype: e.dtype, until: t + sec(e.duration), source: c.uid });
        break;
      }
      case 'summon': {
        const def = this.lookup(e.unit);
        if (!def) break;
        const n = Math.round(starValue(e.count, star));
        const sStar = (Math.round(starValue(e.star, star)) || 1) as Star;
        for (let i = 0; i < n; i++) {
          const hex = this.freeHexNear(c.hex);
          if (!hex) break;
          const stats = combatStats(def.stats, sStar, { powerMult: this.summonPower[c.team] });
          const s = this.addUnit({ def, star: sStar, team: c.team, hex, stats, passives: def.passives });
          s.isSummon = true;
          s.passiveNext = s.passives.map((p) => (p.trigger === 'interval' ? t + sec(p.interval ?? 3) : 0));
          s.passiveUsed = s.passives.map(() => false);
          this.events.push({ t: 'summon', uid: s.uid, by: c.uid });
        }
        break;
      }
      case 'dash':
        this.dash(c, e.to, target);
        break;
      case 'charge':
        this.gainCharge(target, starValue(e.amount, star));
        break;
      case 'taunt': {
        target.tauntUid = c.uid;
        target.tauntUntil = t + sec(starValue(e.duration, star));
        target.targetUid = c.uid;
        break;
      }
      case 'cleanse':
        target.stunUntil = 0;
        target.dots = [];
        target.mods = target.mods.filter((m) => m.amount >= 0);
        this.events.push({ t: 'buff', uid: target.uid, good: true });
        break;
      case 'invulnerable':
        target.invulnUntil = Math.max(target.invulnUntil, t + sec(starValue(e.duration, star)));
        this.events.push({ t: 'invuln', uid: target.uid, on: true });
        break;
      case 'guarded':
        if (this.alive(target.team).some((u) => u.def.tags?.includes(e.tag))) {
          target.guardedTag = e.tag;
          this.events.push({ t: 'invuln', uid: target.uid, on: true });
        }
        break;
      case 'execute':
        if (target.hp / target.maxHp <= starValue(e.threshold, star) && !target.isHero && !target.def.tags?.includes('boss'))
          this.dealDamage(c, target, target.hp + target.shieldTotal(t), 'true', false, true, true);
        break;
      case 'knockback':
        this.knockback(c, target, e.distance);
        break;
      case 'swap':
        break;
    }
  }

  private dash(c: CombatUnit, to: 'target' | 'backline' | 'away', target: CombatUnit): void {
    let anchor: CombatUnit | undefined;
    const enemies = this.alive(this.enemyTeam(c));
    if (to === 'target') anchor = target.team !== c.team ? target : enemies[0];
    else if (to === 'backline')
      anchor = enemies.sort((a, b) => hexDistance(c.hex, b.hex) - hexDistance(c.hex, a.hex) || a.uid - b.uid)[0];
    let dest: Hex | null = null;
    if (to === 'away') {
      const near = enemies.sort((a, b) => hexDistance(c.hex, a.hex) - hexDistance(c.hex, b.hex))[0];
      if (!near) return;
      let best = -1;
      for (let row = 0; row < GRID_ROWS; row++)
        for (let col = 0; col < GRID_COLS; col++) {
          const h = { col, row };
          if (this.occ.has(hexKey(h)) || hexDistance(h, c.hex) > 2) continue;
          const d = hexDistance(h, near.hex);
          if (d > best) {
            best = d;
            dest = h;
          }
        }
    } else if (anchor) {
      dest = this.freeAdjacent(anchor.hex, c.hex);
      if (dest) {
        c.targetUid = anchor.uid;
      }
    }
    if (!dest) return;
    const from = c.hex;
    this.occ.delete(hexKey(c.hex));
    this.occ.set(hexKey(dest), c.uid);
    c.hex = dest;
    c.prevHex = dest;
    c.moveLeft = 0;
    this.events.push({ t: 'dash', uid: c.uid, from, to: dest });
  }

  private knockback(c: CombatUnit, target: CombatUnit, distance: number): void {
    if (target.def.tags?.includes('boss') || target.guardedTag) return;
    let cur = target.hex;
    for (let i = 0; i < distance; i++) {
      const options = neighbors(cur).filter((h) => !this.occ.has(hexKey(h)) && hexDistance(h, c.hex) > hexDistance(cur, c.hex));
      if (options.length === 0) break;
      cur = options.sort((a, b) => hexKey(a) - hexKey(b))[0];
    }
    if (cur === target.hex) return;
    const from = target.hex;
    this.occ.delete(hexKey(target.hex));
    this.occ.set(hexKey(cur), target.uid);
    target.hex = cur;
    target.prevHex = cur;
    target.moveLeft = 0;
    this.events.push({ t: 'dash', uid: target.uid, from, to: cur });
  }

  private swapUnits(targets: CombatUnit[]): void {
    const list = targets.filter((u) => u.alive);
    if (list.length < 2) return;
    const hexes = list.map((u) => u.hex);
    const rotated = hexes.slice(1).concat(hexes[0]);
    list.forEach((u) => this.occ.delete(hexKey(u.hex)));
    list.forEach((u, i) => {
      const from = u.hex;
      u.hex = rotated[i];
      u.prevHex = rotated[i];
      u.moveLeft = 0;
      this.occ.set(hexKey(u.hex), u.uid);
      this.events.push({ t: 'dash', uid: u.uid, from, to: u.hex });
    });
    this.events.push({ t: 'swap', uids: list.map((u) => u.uid) });
  }

  private freeAdjacent(h: Hex, from: Hex): Hex | null {
    const options = neighbors(h).filter((n) => !this.occ.has(hexKey(n)));
    if (options.length === 0) return null;
    return options.sort((a, b) => hexDistance(a, from) - hexDistance(b, from) || hexKey(a) - hexKey(b))[0];
  }

  private freeHexNear(h: Hex): Hex | null {
    let best: Hex | null = null;
    let bestD = Infinity;
    for (let row = 0; row < GRID_ROWS; row++)
      for (let col = 0; col < GRID_COLS; col++) {
        const n = { col, row };
        if (this.occ.has(hexKey(n))) continue;
        const d = hexDistance(h, n);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
    return best;
  }

  // ---------------------------------------------------------------- damage

  private overtimeAmp(): number {
    const secs = this.tick / TICK_RATE;
    if (secs < CONFIG.overtimeStart) return 1;
    return 1 + ((secs - CONFIG.overtimeStart) * CONFIG.overtimeAmpPerSec) / 100;
  }

  private dealDamage(src: CombatUnit, target: CombatUnit, raw: number, dtype: DamageType, crit: boolean, ability: boolean, pure = false): void {
    if (!target.alive) return;
    const t = this.tick;
    if (target.invulnUntil > t) return;
    if (target.guardedTag) {
      if (this.alive(target.team).some((u) => u.def.tags?.includes(target.guardedTag!))) return;
      target.guardedTag = null;
      this.events.push({ t: 'invuln', uid: target.uid, on: false });
    }
    let dmg = raw;
    if (!pure) {
      if (dtype === 'physical') dmg *= 100 / (100 + Math.max(0, target.stat('armor', t)));
      else if (dtype === 'magic') dmg *= 100 / (100 + Math.max(0, target.stat('mr', t)));
      dmg *= 1 + src.stat('dmgAmp', t) / 100;
      dmg *= 1 - target.stat('dmgReduce', t) / 100;
      dmg *= this.overtimeAmp();
    }
    dmg = Math.max(1, Math.round(dmg));
    // Shields absorb first.
    let shielded = 0;
    for (const s of target.shields) {
      if (s.until <= t || s.amount <= 0) continue;
      const a = Math.min(s.amount, dmg - shielded);
      s.amount -= a;
      shielded += a;
      if (shielded >= dmg) break;
    }
    const hpDmg = dmg - shielded;
    target.hp -= hpDmg;
    target.dmgTaken += hpDmg;
    src.dmgDealt += dmg;
    this.events.push({ t: 'damage', uid: target.uid, amount: dmg, crit, dtype, source: src.uid, shielded: Math.round(shielded) });
    if (!ability || dtype === 'physical') {
      const ls = src.stat('lifesteal', t);
      if (ls > 0 && src.alive) this.heal(src, src, dmg * ls, true);
    }
    if (src !== target) this.gainCharge(target, CONFIG.combat.chargePerHitTaken);
    if (target.hp <= 0) this.kill(target, src);
    else this.checkHpThresholds(target);
  }

  private heal(src: CombatUnit, target: CombatUnit, amount: number, quiet = false): void {
    if (!target.alive) return;
    const a = Math.round(Math.min(amount, target.maxHp - target.hp));
    if (a <= 0) return;
    target.hp += a;
    src.healed += a;
    if (!quiet || a >= 5) this.events.push({ t: 'heal', uid: target.uid, amount: a });
  }

  private kill(u: CombatUnit, killer: CombatUnit): void {
    u.hp = 0;
    u.alive = false;
    this.occ.delete(hexKey(u.hex));
    this.events.push({ t: 'death', uid: u.uid });
    if (killer !== u) {
      killer.kills++;
      this.firePassives(killer, 'onKill', { caster: killer, target: u, ability: true });
    }
    for (const a of this.alive(u.team)) this.firePassives(a, 'allyDeath', { caster: a, ability: true });
    // A guard dying may release a guarded boss.
    for (const g of this.alive(u.team)) {
      if (g.guardedTag && !this.alive(u.team).some((x) => x.def.tags?.includes(g.guardedTag!))) {
        g.guardedTag = null;
        this.events.push({ t: 'invuln', uid: g.uid, on: false });
      }
    }
  }

  private updateProjectiles(): void {
    if (!this.projectiles.length) return;
    const snapshot = this.projectiles;
    this.projectiles = [];
    const still: Projectile[] = [];
    for (const p of snapshot) {
      p.left--;
      if (p.left > 0) {
        still.push(p);
        continue;
      }
      this.events.push({ t: 'projectileEnd', id: p.id });
      const src = this.unit(p.source);
      const tgt = this.unit(p.target);
      if (!src || !tgt || !tgt.alive) continue;
      if (p.attack) this.landAttack(src, tgt, p.attack.amount, p.attack.crit);
      else if (p.step) this.applyStepTo(p.step, { caster: src, target: tgt, ability: true }, [tgt]);
      if (this.result) break;
    }
    this.projectiles = still.concat(this.projectiles);
  }

  // ---------------------------------------------------------------- results

  private checkEnd(): boolean {
    if (this.result) return true;
    const hero = this.units.find((u) => u.team === 0 && u.isHero);
    if (hero && !hero.alive) {
      this.finish('loss');
      return true;
    }
    if (this.alive(1).length === 0) {
      this.finish('win');
      return true;
    }
    if (this.alive(0).length === 0) {
      this.finish('loss');
      return true;
    }
    return false;
  }

  private finish(outcome: Outcome): void {
    const hero = this.units.find((u) => u.team === 0 && u.isHero);
    const players = this.units.filter((u) => u.team === 0 && !u.isSummon);
    const survivors = players.filter((u) => u.alive && u.ownerUid !== undefined).map((u) => u.ownerUid!);
    const damageByOwner: Record<number, number> = {};
    for (const u of players) if (u.ownerUid !== undefined) damageByOwner[u.ownerUid] = Math.round(u.dmgDealt);
    // Summons credit their damage to nobody; simple and deterministic.
    const aliveNonHero = players.filter((u) => u.alive && !u.isHero).length;
    this.result = {
      outcome,
      heroDied: !!hero && !hero.alive,
      heroHp: hero ? Math.max(0, hero.hp) : null,
      heroMaxHp: hero ? hero.maxHp : null,
      ticks: this.tick,
      survivors,
      damageByOwner,
      onlyHeroSurvived: outcome === 'win' && !!hero && hero.alive && aliveNonHero === 0 && players.length > 1,
      heroDamageTaken: hero ? Math.round(hero.dmgTaken) : 0,
    };
  }

  /** Compact log line for the headless debug printer. */
  describeEvent(e: BattleEvent): string | null {
    const name = (uid: number) => {
      const u = this.unit(uid);
      return u ? `${u.team === 0 ? 'P' : 'E'}:${u.def.name}${u.star > 1 ? '★' + u.star : ''}#${u.uid}` : `#${uid}`;
    };
    switch (e.t) {
      case 'damage':
        return `${name(e.source)} hits ${name(e.uid)} for ${e.amount}${e.crit ? ' (crit)' : ''}`;
      case 'cast':
        return `${name(e.uid)} casts ${e.name}`;
      case 'death':
        return `${name(e.uid)} dies`;
      case 'heal':
        return `${name(e.uid)} heals ${e.amount}`;
      case 'summon':
        return `${name(e.by)} summons ${name(e.uid)}`;
      case 'stun':
        return `${name(e.uid)} is stunned`;
      case 'overtime':
        return 'OVERTIME! Damage is ramping up.';
      default:
        return null;
    }
  }
}
