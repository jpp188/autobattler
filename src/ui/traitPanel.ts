/**
 * Left-hand trait panel: icon, count against the next breakpoint, and a
 * momentum bar per trait. Hover / long-press for the full bonus text.
 */
import Phaser from 'phaser';
import { CONFIG } from '../core/config';
import { momentumBonusText } from '../core/momentum';
import type { TraitStatus } from '../core/traits';
import { C, T, hexToNum } from './theme';
import { Bar, label, panel, withTooltip, type Tooltip } from './widgets';

export function traitTooltip(s: TraitStatus, momentum: number): string {
  const t = s.trait;
  const lines = [`${t.name} (${t.kind === 'origin' ? 'Origin' : 'Class'})  ${s.count} unique`, t.desc, ''];
  t.breakpoints.forEach((bp, i) => lines.push(`${i === s.level ? '>' : ' '} (${bp.count}) ${bp.desc}`));
  lines.push('', `Momentum ${Math.floor(momentum)}/100`);
  const bonus = momentumBonusText(momentum);
  lines.push(bonus.length ? bonus.join(', ') : 'Keep this trait active to build momentum.');
  return lines.join('\n');
}

export class TraitPanel {
  container: Phaser.GameObjects.Container;
  private rows = new Map<string, { bar: Bar; flash: Phaser.GameObjects.Rectangle }>();

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    private tip: Tooltip,
  ) {
    this.container = scene.add.container(0, 0);
  }

  render(statuses: TraitStatus[], momentum: Record<string, number>, title = 'TRAITS'): void {
    this.container.removeAll(true);
    this.rows.clear();
    const sorted = statuses.slice().sort((a, b) => Number(b.active) - Number(a.active) || b.count - a.count || a.trait.name.localeCompare(b.trait.name));
    const rowH = 19;
    const h = 14 + sorted.length * rowH + 4;
    this.container.add(panel(this.scene, this.x, this.y, this.w, h, 'dark'));
    this.container.add(label(this.scene, this.x + 6, this.y + 5, title, { font: 'title', color: T.title }));
    sorted.forEach((s, i) => {
      const ry = this.y + 16 + i * rowH;
      const m = momentum[s.trait.id] ?? 0;
      const color = hexToNum(s.trait.color);
      const zone = this.scene.add.zone(this.x + 3, ry - 1, this.w - 6, rowH).setOrigin(0, 0);
      const bgRow = this.scene.add.rectangle(this.x + 3, ry - 1, this.w - 6, rowH - 1, s.active ? 0x2a1f3d : 0x1a1226).setOrigin(0, 0);
      const icon = this.scene.add.image(this.x + 6, ry + 1, `ticon_${s.trait.icon}`).setOrigin(0, 0).setAlpha(s.count > 0 ? 1 : 0.4);
      const name = label(this.scene, this.x + 18, ry + 1, s.trait.name, { color: s.active ? s.trait.color : s.count > 0 ? T.text : T.dim });
      const nextTxt = s.next ? `${s.count}/${s.next}` : `${s.count}`;
      const count = label(this.scene, this.x + this.w - 7, ry + 1, nextTxt, { color: s.active ? T.gold : T.dim, origin: [1, 0] });
      const bar = new Bar(this.scene, this.x + 18, ry + 11, this.w - 26, 2, color, 0x07050b).set(m / 100);
      // Threshold ticks on the bar.
      const ticks = CONFIG.momentum.thresholds.slice(0, 3).map((th) => this.scene.add.rectangle(this.x + 18 + Math.round(((this.w - 26) * th) / 100), ry + 11, 1, 2, 0x07050b).setOrigin(0, 0));
      const flash = this.scene.add.rectangle(this.x + 3, ry - 1, this.w - 6, rowH - 1, 0xffffff, 0).setOrigin(0, 0);
      withTooltip(zone, this.tip, () => traitTooltip(s, m), 200);
      this.container.add([bgRow, icon, name, count, bar, ...ticks, flash, zone]);
      this.rows.set(s.trait.id, { bar, flash });
    });
    void C;
  }

  /** Animates a momentum bar from one value to another and flashes on threshold crossings. */
  animateMomentum(traitId: string, from: number, to: number, crossed: boolean): void {
    const row = this.rows.get(traitId);
    if (!row) return;
    const obj = { v: from };
    this.scene.tweens.add({
      targets: obj,
      v: to,
      duration: 700,
      onUpdate: () => row.bar.set(obj.v / 100),
    });
    if (crossed) {
      this.scene.tweens.add({ targets: row.flash, alpha: { from: 0.8, to: 0 }, duration: 260, repeat: 3, delay: 500 });
    }
  }
}
