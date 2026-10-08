/**
 * Battle setup (drag units between bench and board) and the auto-battle
 * playback. The simulation runs in src/core/combat.ts; this scene only draws
 * it, interpolating between fixed ticks.
 */
import Phaser from 'phaser';
import { autoArrange } from '../core/bot';
import { Battle, TICK_RATE, type BattleEvent, type CombatUnit } from '../core/combat';
import { enemyToGrid, type Hex } from '../core/hex';
import { nodeById } from '../core/map';
import { boardUnits, moveUnit, type OwnedUnit, type UnitLoc } from '../core/roster';
import {
  boardTraitStatuses,
  buildBattle,
  enemyPower,
  heroMaxHp,
  markTutorial,
  ownedUnitStats,
  resolveBattle,
  sellUnit,
  sellValue,
} from '../core/run';
import { combatStats } from '../core/units';
import type { FxKind } from '../core/types';
import { getEncounter, getHero, getUnit } from '../data';
import { G } from '../game/state';
import { goRun } from '../game/router';
import { Sfx } from '../audio/sfx';
import { Music } from '../audio/music';
import { UnitView } from '../render/unitView';
import { drawBackdrop } from '../render/backdrops';
import { RunHud } from '../ui/hud';
import { InspectPanel } from '../ui/inspect';
import { T } from '../ui/theme';
import { TraitPanel } from '../ui/traitPanel';
import { button, label, modal, panel, type Button } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { GAME_W } from './layout';

const BX = 230;
const BY = 44;
const COL_W = 32;
const ROW_H = 20;
const BENCH_Y = 228;

export function hexPos(h: Hex): { x: number; y: number } {
  return { x: BX + h.col * COL_W + (h.row & 1 ? COL_W / 2 : 0), y: BY + h.row * ROW_H + (h.row >= 4 ? 6 : 0) };
}

const FX_COLOR: Record<FxKind, number> = {
  slash: 0xffffff,
  burst: 0xffb35a,
  beam: 0xfff2a8,
  heal: 0x7fe08a,
  shield: 0xd8e8ff,
  fire: 0xff7a3a,
  frost: 0x9ae8ff,
  lightning: 0xfff26a,
  petal: 0xffa8d4,
  shadow: 0xa070ff,
  jade: 0x5fe3a1,
  star: 0xffe08a,
  roar: 0xffd0a0,
  arrow: 0xe8d7a8,
  orb: 0xc38bff,
  poison: 0x9ad84a,
};

type Phase = 'setup' | 'fight' | 'done';

export class BattleScene extends BaseScene {
  private phase: Phase = 'setup';
  private hud!: RunHud;
  private traits!: TraitPanel;
  private inspect!: InspectPanel;
  private views = new Map<number, UnitView>();
  private hexImgs: { img: Phaser.GameObjects.Image; hex: Hex }[] = [];
  private slotImgs: Phaser.GameObjects.Image[] = [];
  private selected: number | null = null;
  private dragging: number | null = null;
  private countText!: Phaser.GameObjects.Text;
  private sellBtn!: Button;
  private fightBtn!: Button;
  private autoBtn!: Button;
  private setupUi: Phaser.GameObjects.GameObject[] = [];
  private fightUi: Phaser.GameObjects.GameObject[] = [];
  private speedBtns: Button[] = [];
  private battle: Battle | null = null;
  private acc = 0;
  private speed: 1 | 2 | 4 = 1;
  private enemyPreview: UnitView[] = [];
  private hint: Phaser.GameObjects.Container | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private projectiles = new Map<number, Phaser.GameObjects.Image>();

  constructor() {
    super('Battle');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    this.phase = 'setup';
    this.views = new Map();
    this.hexImgs = [];
    this.slotImgs = [];
    this.selected = null;
    this.dragging = null;
    this.setupUi = [];
    this.fightUi = [];
    this.speedBtns = [];
    this.enemyPreview = [];
    this.projectiles = new Map();
    this.battle = null;
    this.speed = G.meta.settings.battleSpeed;
    const b = run.battle!;
    const enc = getEncounter(b.encounter);
    drawBackdrop(this, run.act, 'battle');
    Music.play('battle');
    this.hud = new RunHud(this, run, this.tip, `${b.kind === 'boss' ? 'BOSS' : b.kind === 'elite' ? 'Elite' : 'Battle'}: ${enc.name}`);
    this.traits = new TraitPanel(this, 4, 22, 112, this.tip);
    this.inspect = new InspectPanel(this);
    this.particles = this.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 110 },
      lifespan: { min: 180, max: 420 },
      scale: { start: 1, end: 0 },
      gravityY: 160,
      emitting: false,
    });
    this.particles.setDepth(800);

    this.drawBoard();
    this.drawBench();
    this.buildSetupUi(enc.mechanic);
    this.refreshUnits();
    this.showEnemyPreview();
    this.showTutorialHint();

    this.input.dragDistanceThreshold = 6;
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => this.onDragStart(obj));
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, x: number, y: number) => {
      const v = obj as UnitView;
      v.setPosition(x, y + 12);
      this.highlightDrop(x, y);
    });
    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => this.onDrop(obj as UnitView, p.x, p.y));
  }

  // ------------------------------------------------------------------ board & bench

  private drawBoard(): void {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 7; col++) {
        const hex = { col, row };
        const p = hexPos(hex);
        const img = this.add.image(p.x, p.y, row < 4 ? 'hex_enemy' : 'hex_player').setOrigin(0.5, 11 / 26).setDepth(1);
        if (row >= 4) {
          img.setInteractive(new Phaser.Geom.Rectangle(4, 2, 24, 18), Phaser.Geom.Rectangle.Contains);
          img.on('pointerup', () => this.onTapTarget({ at: 'board', col, row: row - 4 }));
          this.hexImgs.push({ img, hex });
        }
      }
    }
  }

  private drawBench(): void {
    const run = G.run!;
    const n = run.roster.benchSize;
    const x0 = Math.round(GAME_W / 2 - (n * 32) / 2) + 16;
    this.add.rectangle(GAME_W / 2, BENCH_Y + 15, n * 32 + 10, 36, 0x07050b, 0.6).setDepth(1);
    for (let i = 0; i < n; i++) {
      const img = this.add.image(x0 + i * 32, BENCH_Y + 15, 'slot').setDepth(1);
      img.setInteractive();
      img.on('pointerup', () => this.onTapTarget({ at: 'bench', slot: i }));
      this.slotImgs.push(img);
    }
    const lbl = label(this, x0 - 22, BENCH_Y + 10, 'BENCH', { color: T.dim, origin: [1, 0] });
    this.setupUi.push(lbl);
  }

  private benchPos(slot: number): { x: number; y: number } {
    const n = G.run!.roster.benchSize;
    const x0 = Math.round(GAME_W / 2 - (n * 32) / 2) + 16;
    return { x: x0 + slot * 32, y: BENCH_Y + 28 };
  }

  private locPos(loc: UnitLoc): { x: number; y: number } {
    if (loc.at === 'board') {
      const p = hexPos({ col: loc.col, row: loc.row + 4 });
      return { x: p.x, y: p.y + 6 };
    }
    if (loc.at === 'bench') return this.benchPos(loc.slot);
    return { x: -100, y: -100 };
  }

  private buildSetupUi(mechanic?: string): void {
    const run = G.run!;
    const y = 266;
    this.countText = label(this, GAME_W / 2, BENCH_Y - 12, '', { font: 'title', origin: [0.5, 0], color: T.gold });
    this.autoBtn = button(this, 150, y + 10, 70, 22, 'AUTO', () => {
      autoArrange(run);
      G.saveRun();
      this.refreshUnits();
    });
    this.sellBtn = button(this, 228, y + 10, 92, 22, 'SELL', () => this.trySell());
    this.fightBtn = button(this, 330, y + 6, 150, 30, 'FIGHT!', () => this.startFight(), { size: 16 });
    const helpBg = panel(this, 484, y, 152, 36, 'dark').setAlpha(0.85);
    const help = label(this, 490, y + 4, 'Drag units to the blue hexes,\nor tap a unit then tap a hex.\nTap a unit to inspect it.', { color: T.dim });
    this.setupUi.push(this.countText, this.autoBtn, this.sellBtn, this.fightBtn, helpBg, help);
    if (mechanic) {
      const mp = panel(this, 120, 304, 400, 26, 'dark');
      const mt = label(this, 128, 309, `Boss: ${mechanic}`, { color: '#ff9a7a', wrap: 384 });
      this.setupUi.push(mp, mt);
    }
    this.updateSetupButtons();
  }

  private updateSetupButtons(): void {
    const run = G.run!;
    const n = boardUnits(run.roster).length;
    this.countText.setText(`UNITS ${n}/${run.roster.boardLimit}`);
    this.countText.setColor(n >= run.roster.boardLimit ? T.gold : T.good);
    const sel = this.selected !== null ? run.roster.units.find((u) => u.uid === this.selected) : undefined;
    if (sel && !sel.hero) {
      this.sellBtn.setEnabled(true).setLabel(`SELL +${sellValue(run, sel)}G`);
    } else this.sellBtn.setEnabled(false).setLabel('SELL');
  }

  private refreshUnits(): void {
    const run = G.run!;
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    const hero = getHero(run.heroId);
    const skin = hero.skins.find((s) => s.id === run.skinId);
    for (const u of run.roster.units) {
      if (u.loc.at === 'pending') continue;
      const def = u.hero ? hero : getUnit(u.defId);
      const p = this.locPos(u.loc);
      const v = new UnitView(this, p.x, p.y, def, u.star, { hero: u.hero, skin: u.hero ? skin?.look : undefined, skinId: u.hero ? run.skinId : undefined, bars: false });
      v.setDepth(10 + p.y);
      v.setInteractive(new Phaser.Geom.Rectangle(v.size / 2 - 11, v.size / 2 - v.size + 2, 22, v.size - 2), Phaser.Geom.Rectangle.Contains);
      this.input.setDraggable(v);
      v.on('pointerup', () => {
        if (this.dragging !== null) return;
        this.onTapUnit(u);
      });
      if (u.uid === this.selected) v.setSelected(true);
      this.views.set(u.uid, v);
    }
    this.traits.render(boardTraitStatuses(run), run.momentum);
    this.updateSetupButtons();
    this.hud.refresh();
  }

  private showEnemyPreview(): void {
    const run = G.run!;
    const b = run.battle!;
    const enc = getEncounter(b.encounter);
    for (const eu of enc.units) {
      const def = getUnit(eu.unit);
      const hex = enemyToGrid(eu.col, eu.row);
      const p = hexPos(hex);
      const v = new UnitView(this, p.x, p.y + 6, def, eu.star, { enemy: true, bars: false });
      v.setDepth(10 + p.y);
      v.setInteractive(new Phaser.Geom.Rectangle(v.size / 2 - 11, v.size / 2 - v.size + 2, 22, v.size - 2), Phaser.Geom.Rectangle.Contains);
      v.on('pointerup', () => {
        const node = nodeById(run.map, b.nodeId);
        const mult = enemyPower(run.act, node?.floor ?? 0, b.kind);
        this.inspect.show({ def, star: eu.star, stats: combatStats(def.stats, eu.star, { powerMult: mult }), extra: 'Enemy' });
      });
      this.enemyPreview.push(v);
    }
  }

  private showTutorialHint(): void {
    const run = G.run!;
    if (run.act !== 0) return;
    const node = nodeById(run.map, run.battle!.nodeId);
    const key = `battle${node?.floor ?? 0}`;
    if (run.flags.tutorialSeen.includes(key)) return;
    const texts: Record<string, string> = {
      battle0:
        'PLACING UNITS: drag units from the bench onto the blue hexes (or tap a unit, then tap a hex). Your Hero is already on the board. If your Hero dies, the run ends, so keep it safe behind your front line!',
      battle2:
        'TRAITS: every unit has an Origin and a Class. Field 2 or more unique units of a trait to unlock its bonus. Check the panel on the left: hover or hold a trait to read it.',
      battle4: 'MINI-BOSS: bosses have special mechanics, shown below the board. Beat Goemon to finish the Prologue!',
    };
    const text = texts[key];
    if (!text) return;
    const bg = panel(this, 140, 120, 360, 10, 'panel');
    const t = label(this, 150, 128, text, { wrap: 340 });
    bg.setSize(360, t.height + 40);
    const ok = button(this, 270, 128 + t.height + 6, 100, 18, 'GOT IT', () => {
      markTutorial(run, key);
      G.saveRun();
      this.hint?.destroy();
      this.hint = null;
    });
    this.hint = this.add.container(0, 0, [bg, t, ok]).setDepth(3000);
  }

  // ------------------------------------------------------------------ input

  private onTapUnit(u: OwnedUnit): void {
    if (this.phase !== 'setup') return;
    const run = G.run!;
    if (this.selected !== null && this.selected !== u.uid) {
      // Tap another unit while one is selected: swap them.
      const sel = run.roster.units.find((x) => x.uid === this.selected);
      if (sel && moveUnit(run.roster, sel.uid, u.loc)) {
        Sfx.play('place');
        this.selected = null;
        this.inspect.hide();
        G.saveRun();
        this.refreshUnits();
        return;
      }
    }
    if (this.selected === u.uid) {
      this.selected = null;
      this.inspect.hide();
    } else {
      this.selected = u.uid;
      const hero = getHero(run.heroId);
      const skin = hero.skins.find((s) => s.id === run.skinId);
      this.inspect.show(
        {
          def: u.hero ? hero : getUnit(u.defId),
          star: u.star,
          stats: ownedUnitStats(run, u),
          hp: u.hero ? run.heroHp : undefined,
          hero: u.hero,
          skinLook: u.hero ? skin?.look : undefined,
          skinId: u.hero ? run.skinId : undefined,
          extra: u.hero ? `${hero.perk.name}: ${hero.perk.desc}` : `Sells for ${sellValue(run, u)} gold.`,
        },
        () => {
          this.selected = null;
          this.refreshUnits();
        },
      );
    }
    this.refreshUnits();
  }

  private onTapTarget(loc: UnitLoc): void {
    if (this.phase !== 'setup' || this.selected === null) return;
    const run = G.run!;
    const ok = moveUnit(run.roster, this.selected, loc);
    if (ok) {
      Sfx.play('place');
      this.selected = null;
      this.inspect.hide();
      G.saveRun();
    } else this.flashLimit();
    this.refreshUnits();
  }

  private onDragStart(obj: Phaser.GameObjects.GameObject): void {
    if (this.phase !== 'setup') return;
    const entry = [...this.views.entries()].find(([, v]) => v === obj);
    if (!entry) return;
    this.dragging = entry[0];
    (obj as UnitView).setDepth(1000);
    this.inspect.hide();
  }

  private dropTarget(x: number, y: number): UnitLoc | null {
    let best: UnitLoc | null = null;
    let bestD = 18;
    for (const { hex } of this.hexImgs) {
      const p = hexPos(hex);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = { at: 'board', col: hex.col, row: hex.row - 4 };
      }
    }
    for (let s = 0; s < this.slotImgs.length; s++) {
      const img = this.slotImgs[s];
      const d = Math.hypot(img.x - x, img.y - y);
      if (d < bestD) {
        bestD = d;
        best = { at: 'bench', slot: s };
      }
    }
    return best;
  }

  private highlightDrop(x: number, y: number): void {
    const t = this.dropTarget(x, y);
    for (const { img, hex } of this.hexImgs) img.setTexture(t?.at === 'board' && t.col === hex.col && t.row === hex.row - 4 ? 'hex_hover' : 'hex_player');
    this.slotImgs.forEach((img, i) => img.setTexture(t?.at === 'bench' && t.slot === i ? 'slot_hover' : 'slot'));
  }

  private onDrop(_v: UnitView, x: number, y: number): void {
    const uid = this.dragging;
    this.time.delayedCall(0, () => (this.dragging = null));
    if (uid === null) return;
    const run = G.run!;
    const t = this.dropTarget(x, y - 8);
    this.highlightDrop(-999, -999);
    if (t) {
      if (moveUnit(run.roster, uid, t)) {
        Sfx.play('place');
        G.saveRun();
      } else this.flashLimit();
    }
    this.selected = null;
    this.refreshUnits();
  }

  private flashLimit(): void {
    Sfx.play('error');
    this.tweens.add({ targets: this.countText, scale: { from: 1.4, to: 1 }, duration: 250 });
    this.countText.setColor(T.bad);
  }

  private trySell(): void {
    const run = G.run!;
    const u = run.roster.units.find((x) => x.uid === this.selected);
    if (!u || u.hero) return;
    const value = sellValue(run, u);
    const def = getUnit(u.defId);
    modal(this, `Sell ${def.name} ${'★'.repeat(u.star)} for ${value} gold?`, [
      {
        text: 'SELL',
        onClick: () => {
          sellUnit(run, u.uid);
          Sfx.play('gold');
          this.selected = null;
          this.inspect.hide();
          G.saveRun();
          this.refreshUnits();
        },
      },
      { text: 'KEEP', onClick: () => undefined },
    ]);
  }

  // ------------------------------------------------------------------ fight

  private startFight(): void {
    if (this.phase !== 'setup') return;
    const run = G.run!;
    this.phase = 'fight';
    this.inspect.hide();
    this.hint?.destroy();
    this.selected = null;
    for (const o of this.setupUi) (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setActive(false);
    this.setupUi.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    for (const v of this.views.values()) {
      // Bench units stay visible but dimmed; board units are replaced by combat views.
      const u = run.roster.units.find((x) => this.views.get(x.uid) === v);
      if (u && u.loc.at === 'bench') {
        v.setAlpha(0.5);
        v.disableInteractive();
      } else v.destroy();
    }
    for (const v of this.enemyPreview) v.destroy();
    this.views.clear();
    this.battle = new Battle(buildBattle(run));
    const hero = getHero(run.heroId);
    const skin = hero.skins.find((s) => s.id === run.skinId);
    for (const cu of this.battle.units) this.createCombatView(cu, cu.isHero ? skin?.look : undefined);
    Sfx.play('fightStart');
    this.cameras.main.flash(120, 255, 240, 200);
    // Speed and skip buttons.
    const y = 270;
    const mk = (i: number, s: 1 | 2 | 4) => {
      const b = button(this, 196 + i * 50, y, 44, 22, `${s}x`, () => this.setSpeed(s));
      this.speedBtns.push(b);
      this.fightUi.push(b);
    };
    mk(0, 1);
    mk(1, 2);
    mk(2, 4);
    const skip = button(this, 352, y, 90, 22, 'SKIP', () => this.skip());
    this.fightUi.push(skip);
    this.setSpeed(this.speed);
  }

  private createCombatView(cu: CombatUnit, skinLook?: object): UnitView {
    const run = G.run!;
    const p = hexPos(cu.hex);
    const v = new UnitView(this, p.x, p.y + 6, cu.def, cu.star, {
      hero: cu.isHero,
      enemy: cu.team === 1,
      skin: cu.isHero ? (skinLook as never) : undefined,
      skinId: cu.isHero ? run.skinId : undefined,
    });
    v.setHp(cu.hp / cu.maxHp);
    v.setCharge(cu.charge / 100);
    v.setDepth(10 + p.y);
    v.setInteractive(new Phaser.Geom.Rectangle(v.size / 2 - 11, v.size / 2 - v.size + 2, 22, v.size - 2), Phaser.Geom.Rectangle.Contains);
    v.on('pointerup', () => {
      if (!this.battle) return;
      this.inspect.show({ def: cu.def, star: cu.star, stats: { ...cu.base, hp: cu.maxHp }, hp: cu.hp, hero: cu.isHero, skinId: cu.isHero ? run.skinId : undefined, extra: cu.team === 1 ? 'Enemy' : undefined });
    });
    this.views.set(cu.uid, v);
    return v;
  }

  private setSpeed(s: 1 | 2 | 4): void {
    this.speed = s;
    this.speedBtns.forEach((b, i) => b.bg.setTexture([1, 2, 4][i] === s ? 'ui_btn_hover' : 'ui_btn'));
    G.meta.settings.battleSpeed = s;
    G.saveMeta();
  }

  private skip(): void {
    if (!this.battle || this.phase !== 'fight') return;
    this.battle.runToEnd();
    // Snap every view to the final state.
    for (const cu of this.battle.units) {
      let v = this.views.get(cu.uid);
      if (!v) v = this.createCombatView(cu);
      const p = hexPos(cu.hex);
      v.setPosition(p.x, p.y + 6);
      v.setHp(cu.hp / cu.maxHp);
      if (!cu.alive && !v.dead) v.die();
    }
    for (const img of this.projectiles.values()) img.destroy();
    this.projectiles.clear();
    this.finishFight();
  }

  update(_t: number, dtMs: number): void {
    if (this.phase !== 'fight' || !this.battle) return;
    const tickMs = 1000 / TICK_RATE;
    this.acc += Math.min(dtMs, 100) * this.speed;
    let steps = 0;
    while (this.acc >= tickMs && !this.battle.done && steps < 12) {
      this.battle.step();
      this.handleEvents(this.battle.events);
      this.acc -= tickMs;
      steps++;
    }
    const frac = this.acc / tickMs;
    for (const cu of this.battle.units) {
      const v = this.views.get(cu.uid);
      if (!v || v.dead) continue;
      let x: number;
      let y: number;
      const to = hexPos(cu.hex);
      if (cu.moveLeft > 0 && cu.moveTotal > 0) {
        const from = hexPos(cu.prevHex);
        const t = Phaser.Math.Clamp((cu.moveTotal - cu.moveLeft + frac) / cu.moveTotal, 0, 1);
        x = from.x + (to.x - from.x) * t;
        y = from.y + (to.y - from.y) * t;
      } else {
        x = to.x;
        y = to.y;
      }
      v.setPosition(Math.round(x + v.offset.x), Math.round(y + 6 + v.offset.y));
      v.setDepth(10 + y);
      v.setHp(cu.hp / cu.maxHp, cu.shieldTotal(this.battle.tick) / cu.maxHp);
      v.setCharge(cu.charge / 100);
      v.setStunned(cu.stunUntil > this.battle.tick);
      v.sprite.setAlpha(cu.invulnUntil > this.battle.tick || cu.guardedTag ? 0.6 : 1);
    }
    if (this.battle.done) this.finishFight();
  }

  private posOf(uid: number): { x: number; y: number } {
    const v = this.views.get(uid);
    return v ? { x: v.x, y: v.y - v.size / 2 } : { x: GAME_W / 2, y: 120 };
  }

  private handleEvents(events: BattleEvent[]): void {
    const b = this.battle!;
    for (const e of events) {
      switch (e.t) {
        case 'attack': {
          const v = this.views.get(e.uid);
          const t = this.posOf(e.target);
          v?.attack(t.x, this.speed);
          if (!e.ranged) Sfx.play('swing', 0.5);
          break;
        }
        case 'projectile': {
          const from = this.posOf(e.from);
          const img = this.add.image(from.x, from.y, e.ability ? 'px' : 'px').setDepth(900);
          img.setTint(e.ability ? FX_COLOR[e.fx] : 0xfff2c8).setScale(e.ability ? 2 : 1.2);
          const target = this.views.get(e.to);
          const dur = ((e.ticks * 1000) / TICK_RATE) / this.speed;
          this.tweens.add({
            targets: img,
            x: { getEnd: () => target?.x ?? img.x },
            y: { getEnd: () => (target ? target.y - target.size / 2 : img.y) },
            duration: dur,
            onComplete: () => img.destroy(),
          });
          this.projectiles.set(e.id, img);
          break;
        }
        case 'projectileEnd':
          this.projectiles.get(e.id)?.destroy();
          this.projectiles.delete(e.id);
          break;
        case 'damage': {
          const v = this.views.get(e.uid);
          if (!v) break;
          v.hitFlash();
          const p = this.posOf(e.uid);
          const color = e.dtype === 'magic' ? '#c8a0ff' : e.dtype === 'true' ? '#ffffff' : '#ffd0a0';
          this.floatText(p.x, p.y - 6, `${e.amount}${e.crit ? '!' : ''}`, e.crit ? '#ffe04a' : color, e.crit);
          this.particles.setParticleTint(e.dtype === 'magic' ? 0xc38bff : 0xfff2a8);
          this.particles.explode(e.crit ? 8 : 3, p.x, p.y);
          if (e.crit) Sfx.play('crit', 0.6);
          else Sfx.play('hit', 0.35);
          break;
        }
        case 'heal': {
          const p = this.posOf(e.uid);
          if (e.amount >= 10) this.floatText(p.x, p.y - 6, `+${e.amount}`, '#7fe08a', false);
          break;
        }
        case 'shield': {
          const p = this.posOf(e.uid);
          this.ringFx(p.x, p.y, 0xd8e8ff);
          break;
        }
        case 'cast': {
          const v = this.views.get(e.uid);
          const p = this.posOf(e.uid);
          const cu = b.unit(e.uid);
          this.floatText(p.x, p.y - 26, e.name, cu?.team === 0 ? '#8fd0ff' : '#ff9a7a', false, true);
          this.ringFx(p.x, p.y, FX_COLOR[e.fx]);
          if (v) this.tweens.add({ targets: v.sprite, scale: { from: 1.25, to: 1 }, duration: 220 });
          if (e.big) {
            this.cameras.main.flash(90, 255, 250, 230, false);
            if (G.meta.settings.screenShake) this.cameras.main.shake(160, 0.006);
            Sfx.play('ult');
          } else Sfx.play('cast', 0.6);
          break;
        }
        case 'fx': {
          const p = this.posOf(e.uid);
          this.particles.setParticleTint(FX_COLOR[e.fx]);
          this.particles.explode(5, p.x, p.y);
          break;
        }
        case 'death': {
          const v = this.views.get(e.uid);
          v?.die();
          const p = this.posOf(e.uid);
          this.particles.setParticleTint(0xffffff);
          this.particles.explode(12, p.x, p.y);
          Sfx.play('death', 0.7);
          break;
        }
        case 'summon': {
          const cu = b.unit(e.uid);
          if (cu) {
            const v = this.createCombatView(cu);
            v.setScale(0);
            this.tweens.add({ targets: v, scale: 1, duration: 250, ease: 'Back.easeOut' });
            this.ringFx(v.x, v.y - 10, 0xc38bff);
          }
          break;
        }
        case 'dash': {
          const v = this.views.get(e.uid);
          if (v) {
            const f = hexPos(e.from);
            const t = hexPos(e.to);
            v.offset.x = f.x - t.x;
            v.offset.y = f.y - t.y;
            this.tweens.add({ targets: v.offset, x: 0, y: 0, duration: 160, ease: 'Quad.easeOut' });
          }
          break;
        }
        case 'dodge': {
          const p = this.posOf(e.uid);
          this.floatText(p.x, p.y - 6, 'dodge', '#9a8fae', false);
          break;
        }
        case 'invuln':
          break;
        case 'swap':
          Sfx.play('cast', 0.6);
          break;
        case 'overtime': {
          const t = label(this, GAME_W / 2, 120, 'OVERTIME!', { font: 'title', size: 16, color: '#ff6a5a', origin: [0.5, 0.5], stroke: true }).setDepth(2000);
          this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
          break;
        }
        default:
          break;
      }
    }
  }

  private floatText(x: number, y: number, text: string, color: string, big: boolean, title = false): void {
    const t = label(this, x, y, text, { font: big || title ? 'title' : 'body', size: 8, color, origin: [0.5, 1], stroke: true }).setDepth(1500);
    this.tweens.add({ targets: t, y: y - (title ? 10 : 16), alpha: { from: 1, to: 0 }, duration: (title ? 900 : 650) / Math.sqrt(this.speed), ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private ringFx(x: number, y: number, color: number): void {
    const r = this.add.image(x, y, 'ring').setTint(color).setDepth(850).setScale(0.5);
    this.tweens.add({ targets: r, scale: 2.2, alpha: 0, duration: 320, onComplete: () => r.destroy() });
  }

  private finishFight(): void {
    if (this.phase !== 'fight' || !this.battle?.result) return;
    this.phase = 'done';
    const run = G.run!;
    const result = this.battle.result;
    const won = result.outcome === 'win';
    for (const b of this.fightUi) (b as Button).setVisible(false);
    Music.stop();
    this.time.delayedCall(450, () => {
      Sfx.play(won ? 'victory' : 'defeat');
      const title = result.heroDied ? 'YOUR HERO FELL' : won ? 'VICTORY!' : result.outcome === 'timeout' ? 'TIME UP' : 'DEFEAT';
      const bg = panel(this, 170, 100, 300, 104, 'panel').setDepth(3000);
      const t = label(this, GAME_W / 2, 112, title, { font: 'title', size: 16, color: won ? T.gold : T.bad, origin: [0.5, 0], stroke: true }).setDepth(3001);
      const max = heroMaxHp(run);
      const sub = result.heroDied
        ? 'The run is over.'
        : `Hero HP ${result.heroHp}/${result.heroMaxHp ?? max}${result.onlyHeroSurvived ? '\nOnly your Hero survived!' : ''}${result.outcome === 'timeout' ? '\nThe Hero is exhausted (-25% HP).' : ''}`;
      const s = label(this, GAME_W / 2, 136, sub, { origin: [0.5, 0], align: 'center' }).setDepth(3001);
      resolveBattle(run, result);
      G.saveRun();
      this.hud.refresh();
      const cont = button(this, GAME_W / 2 - 60, 176, 120, 20, 'CONTINUE', () => goRun(this)).setDepth(3002);
      t.setScale(0.2);
      this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' });
      void bg;
      void s;
      void cont;
    });
  }
}
