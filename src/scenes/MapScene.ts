/**
 * The branching act map. Shows Hero HP, gold, artifacts, momentum bars and a
 * deck view, and lets the player pick their next stop.
 */
import Phaser from 'phaser';
import { NODE_NAMES, type MapNode, type NodeKind } from '../core/map';
import { boardUnits } from '../core/roster';
import { availableNodes, boardTraitStatuses, enterNode, markTutorial } from '../core/run';
import { getEncounter } from '../data';
import { G } from '../game/state';
import { goRun } from '../game/router';
import { Music } from '../audio/music';
import { Sfx } from '../audio/sfx';
import { drawBackdrop } from '../render/backdrops';
import { openDeck } from '../ui/deck';
import { RunHud } from '../ui/hud';
import { T } from '../ui/theme';
import { TraitPanel } from '../ui/traitPanel';
import { button, label, modal, panel, withTooltip } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { GAME_H } from './layout';

const COL_W = 44;
const ROW_H = 34;
const VIEW_X = 124;
const VIEW_W = 388;
const VIEW_Y = 20;
const VIEW_H = GAME_H - VIEW_Y;

const NODE_HELP: Record<NodeKind, string> = {
  battle: 'A normal fight. Win gold and a free pack.',
  elite: 'A hard fight. Always drops an artifact and better packs.',
  shop: 'Buy packs, artifacts and services.',
  event: 'A strange encounter with choices and trade-offs.',
  rest: 'Heal your Hero or train a unit.',
  treasure: 'An artifact and gold.',
  boss: 'The act boss. Drops a Boss Pack and a boss artifact.',
};

export class MapScene extends BaseScene {
  private mapLayer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private minScroll = 0;
  private maxScroll = 0;
  private dragStart: { y: number; scroll: number } | null = null;
  private dragged = false;
  private hud!: RunHud;
  private traits!: TraitPanel;

  constructor() {
    super('Map');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    drawBackdrop(this, run.act, 'map');
    Music.play('map');
    this.hud = new RunHud(this, run, this.tip, 'Map');
    this.traits = new TraitPanel(this, 4, 22, 116, this.tip);
    this.traits.render(boardTraitStatuses(run), run.momentum, 'MOMENTUM');
    this.drawSidebar();
    this.drawMap();
    this.showNotices();
  }

  private drawSidebar(): void {
    const run = G.run!;
    const x = 518;
    panel(this, x, 22, 118, 334, 'dark');
    label(this, x + 8, 28, 'YOUR ARMY', { font: 'title', color: T.title });
    const n = boardUnits(run.roster).length;
    label(this, x + 8, 42, `Board ${n}/${run.roster.boardLimit}\nBench ${run.roster.units.filter((u) => u.loc.at === 'bench').length}/${run.roster.benchSize}\nUnits ${run.roster.units.length}`, { color: T.text });
    button(this, x + 8, 74, 102, 20, 'DECK', () =>
      openDeck(this, run, {
        title: 'YOUR UNITS',
        subtitle: 'Tap a unit to inspect it. You can sell units here. B = on the board.',
        allowSell: true,
        onChange: () => {
          G.saveRun();
          this.hud.refresh();
          this.traits.render(boardTraitStatuses(run), run.momentum, 'MOMENTUM');
        },
      }),
    );
    label(this, x + 8, 102, 'LEGEND', { font: 'title', color: T.title });
    const kinds: NodeKind[] = ['battle', 'elite', 'shop', 'event', 'rest', 'treasure', 'boss'];
    kinds.forEach((k, i) => {
      const y = 116 + i * 20;
      const img = this.add.image(x + 16, y + 8, `node_${k}`);
      label(this, x + 30, y + 4, NODE_NAMES[k], { color: T.text });
      withTooltip(img, this.tip, () => NODE_HELP[k]);
    });
    const tips = run.act === 0 ? 'Tap a glowing node to travel there. The Prologue teaches the basics.' : 'Tap a glowing node to travel. Drag to scroll the map.';
    label(this, x + 8, 262, tips, { color: T.dim, wrap: 102 });
  }

  private nodePos(n: MapNode, floors: number): { x: number; y: number } {
    const run = G.run!;
    if (run.act === 0) {
      return { x: VIEW_X + VIEW_W / 2, y: 64 + (floors - 1 - n.floor) * 64 };
    }
    return { x: VIEW_X + VIEW_W / 2 + (n.col - 3) * COL_W, y: 30 + (floors - 1 - n.floor) * ROW_H + 10 };
  }

  private drawMap(): void {
    const run = G.run!;
    const map = run.map;
    const floors = map.floors;
    this.mapLayer = this.add.container(0, 0);
    const maskShape = this.make.graphics({}).fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
    this.mapLayer.setMask(maskShape.createGeometryMask());
    // Parchment strip behind the map.
    const totalH = run.act === 0 ? floors * 64 + 40 : floors * ROW_H + 40;
    const bg = this.add.rectangle(VIEW_X + 14, 0, VIEW_W - 28, Math.max(totalH, VIEW_H) + 40, 0x2a1f3d, 0.55).setOrigin(0, 0);
    this.mapLayer.add(bg);
    const available = new Set(availableNodes(run).map((n) => n.id));
    const visited = new Set(run.path);
    // Edges as dotted pixel lines.
    for (const n of map.nodes) {
      const a = this.nodePos(n, floors);
      for (const id of n.next) {
        const m = map.nodes.find((x) => x.id === id);
        if (!m) continue;
        const b = this.nodePos(m, floors);
        const travelled = visited.has(n.id) && visited.has(m.id);
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.floor(dist / 5);
        for (let i = 2; i < steps - 1; i++) {
          const t = i / steps;
          const dot = this.add.rectangle(Math.round(a.x + (b.x - a.x) * t), Math.round(a.y + (b.y - a.y) * t), 2, 2, travelled ? 0xffd24a : 0x9a8fae, travelled ? 1 : 0.6);
          this.mapLayer.add(dot);
        }
      }
    }
    // Nodes.
    for (const n of map.nodes) {
      const p = this.nodePos(n, floors);
      const isAvail = available.has(n.id);
      const isVisited = visited.has(n.id);
      const isCurrent = run.nodeId === n.id;
      const ring = this.add.circle(p.x, p.y, 11, isCurrent ? 0xffd24a : 0x07050b, isCurrent ? 0.9 : 0.6);
      const icon = this.add.image(p.x, p.y, `node_${n.kind}`).setScale(n.kind === 'boss' ? 1.6 : 1);
      if (isVisited && !isCurrent) icon.setAlpha(0.45);
      if (!isAvail && !isVisited) icon.setAlpha(0.75);
      this.mapLayer.add([ring, icon]);
      if (isAvail) {
        const glow = this.add.circle(p.x, p.y, 13, 0xfff2a8, 0.25);
        this.mapLayer.addAt(glow, this.mapLayer.getIndex(ring));
        this.tweens.add({ targets: [icon], scale: { from: n.kind === 'boss' ? 1.6 : 1, to: n.kind === 'boss' ? 1.8 : 1.2 }, duration: 520, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.5 }, duration: 520, yoyo: true, repeat: -1 });
      }
      icon.setInteractive(new Phaser.Geom.Circle(9, 9, 12), Phaser.Geom.Circle.Contains);
      withTooltip(icon, this.tip, () => {
        let t = `${NODE_NAMES[n.kind]}\n${NODE_HELP[n.kind]}`;
        if (n.kind === 'boss' && n.encounter) {
          const e = getEncounter(n.encounter);
          t += `\n\n${e.name}: ${e.mechanic ?? ''}`;
        }
        if (isAvail) t += '\n\nTap to travel here.';
        return t;
      });
      icon.on('pointerup', () => {
        if (this.dragged || !isAvail) return;
        this.travel(n);
      });
      if (n.kind === 'boss') {
        const name = n.encounter ? getEncounter(n.encounter).name : 'Boss';
        this.mapLayer.add(label(this, p.x, p.y - 26, name, { color: '#ff9a7a', origin: [0.5, 0], stroke: true }));
      }
      if (isCurrent) this.mapLayer.add(label(this, p.x + 14, p.y - 4, 'YOU', { color: T.gold, stroke: true }));
    }
    // Scrolling.
    const contentH = totalH;
    this.minScroll = Math.min(0, VIEW_H - contentH - 10);
    this.maxScroll = 0;
    const focus = run.nodeId ? map.nodes.find((x) => x.id === run.nodeId) : availableNodes(run)[0];
    if (focus) {
      const p = this.nodePos(focus, floors);
      this.scrollY = Phaser.Math.Clamp(VIEW_Y + VIEW_H * 0.7 - p.y, this.minScroll, this.maxScroll);
    } else this.scrollY = this.minScroll;
    this.mapLayer.y = this.scrollY;
    const zone = this.add.zone(VIEW_X, VIEW_Y, VIEW_W, VIEW_H).setOrigin(0, 0).setInteractive();
    this.children.sendToBack(zone);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x >= VIEW_X && p.x <= VIEW_X + VIEW_W && p.y > VIEW_Y) {
        this.dragStart = { y: p.y, scroll: this.scrollY };
        this.dragged = false;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragStart || !p.isDown) return;
      const dy = p.y - this.dragStart.y;
      if (Math.abs(dy) > 4) this.dragged = true;
      this.setScroll(this.dragStart.scroll + dy);
    });
    this.input.on('pointerup', () => {
      this.dragStart = null;
      this.time.delayedCall(0, () => (this.dragged = false));
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.setScroll(this.scrollY - dy * 0.5));
  }

  private setScroll(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, this.minScroll, this.maxScroll);
    this.mapLayer.y = Math.round(this.scrollY);
  }

  private travel(n: MapNode): void {
    const run = G.run!;
    Sfx.play('travel');
    enterNode(run, n.id);
    G.saveRun();
    goRun(this);
  }

  private showNotices(): void {
    const run = G.run!;
    if (run.notices.length) {
      const text = run.notices.join('\n');
      run.notices = [];
      G.saveRun();
      modal(this, text, [{ text: 'OK', onClick: () => this.showTutorial() }], 320);
      Sfx.play('merge');
      return;
    }
    this.showTutorial();
  }

  private showTutorial(): void {
    const run = G.run!;
    if (run.act === 0 && !run.flags.tutorialSeen.includes('map')) {
      modal(
        this,
        'THE MAP: each stop is a node. Battles earn gold and a free pack, shops sell packs and artifacts, rest spots heal your Hero. Your Hero’s HP (top bar) carries over between fights: it is the run’s life.',
        [{ text: 'GOT IT', onClick: () => (markTutorial(run, 'map'), G.saveRun()) }],
        340,
      );
    } else if (run.act === 0 && !run.flags.tutorialSeen.includes('merge') && run.roster.units.some((u) => !u.hero && u.star >= 2)) {
      modal(
        this,
        'MERGING: two copies of a unit combine into a 2★ (about 1.8× stats and a stronger ultimate). Two 2★ make a 3★ (about 3.2×). A 3★ Common can beat a 1★ Epic, so collecting copies is a real strategy!',
        [{ text: 'NICE', onClick: () => (markTutorial(run, 'merge'), G.saveRun()) }],
        340,
      );
    } else if (run.act === 1 && !run.path.length && !run.flags.tutorialSeen.includes('act1')) {
      modal(
        this,
        'ACT I begins! Paths branch and cross: plan your route. Elites are dangerous but always drop artifacts. Momentum (left) grows when you keep a trait active fight after fight.',
        [{ text: 'ONWARD', onClick: () => (markTutorial(run, 'act1'), G.saveRun()) }],
        340,
      );
    }
  }
}
