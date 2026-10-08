/**
 * Unit inspect panel: stats, traits, passives and ultimate.
 */
import Phaser from 'phaser';
import { describePassive, describeUlt } from '../core/describe';
import type { CombatStats, SpriteLook, Star, UnitDef } from '../core/types';
import { RARITY_NAMES } from '../core/types';
import { findUnit, getTrait } from '../data';
import { unitTexture } from '../render/unitSprites';
import { GAME_H, GAME_W } from '../scenes/layout';
import { RARITY_TEXT, T } from './theme';
import { button, label, panel } from './widgets';

const nameOf = (id: string) => findUnit(id)?.name ?? id;

export interface InspectInfo {
  def: UnitDef;
  star: Star;
  stats?: CombatStats;
  hp?: number;
  hero?: boolean;
  skinLook?: Partial<SpriteLook>;
  skinId?: string;
  extra?: string;
}

export class InspectPanel {
  container: Phaser.GameObjects.Container;
  visible = false;
  constructor(
    private scene: Phaser.Scene,
    private x = GAME_W - 252,
    private y = 22,
    private w = 248,
  ) {
    this.container = scene.add.container(0, 0).setDepth(2000).setVisible(false);
  }

  show(info: InspectInfo, onClose?: () => void): void {
    const s = this.scene;
    this.container.removeAll(true);
    const { def, star } = info;
    const pad = 8;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const cx = this.x + pad;
    let y = this.y + pad;
    const tex = unitTexture(s, def, { hero: info.hero, skin: info.skinLook, skinId: info.skinId });
    const size = info.hero ? 48 : 32;
    const img = s.add.image(cx, y, tex, 0).setOrigin(0, 0);
    parts.push(img);
    const tx = cx + size + 6;
    parts.push(label(s, tx, y, def.name, { font: 'title', color: RARITY_TEXT[def.rarity] }));
    parts.push(label(s, tx, y + 12, `${info.hero ? 'Hero' : RARITY_NAMES[def.rarity]}  ${'★'.repeat(star)}`, { color: info.hero ? T.gold : RARITY_TEXT[def.rarity] }));
    const o = getTrait(def.origin);
    const c = getTrait(def.cls);
    parts.push(s.add.image(tx, y + 23, `ticon_${o.icon}`).setOrigin(0, 0));
    parts.push(label(s, tx + 11, y + 24, o.name, { color: o.color }));
    const cxName = tx + 16 + o.name.length * 4 + 6;
    parts.push(s.add.image(cxName, y + 23, `ticon_${c.icon}`).setOrigin(0, 0));
    parts.push(label(s, cxName + 11, y + 24, c.name, { color: c.color }));
    y += Math.max(size, 36) + 4;
    parts.push(label(s, cx, y, def.flavor, { color: T.dim, wrap: this.w - pad * 2 }));
    y += (parts[parts.length - 1] as Phaser.GameObjects.Text).height + 5;
    if (info.stats) {
      const st = info.stats;
      const hp = info.hp !== undefined ? `${Math.round(info.hp)}/${Math.round(st.hp)}` : `${Math.round(st.hp)}`;
      const rows: [string, string][] = [
        ['HP', hp],
        ['Attack', `${Math.round(st.ad)}`],
        ['Atk Speed', st.as.toFixed(2)],
        ['Range', `${st.range}`],
        ['Armour', `${Math.round(st.armor)}`],
        ['Magic Res', `${Math.round(st.mr)}`],
        ['Crit', `${Math.round(st.crit * 100)}%`],
        ['Move', `${st.ms.toFixed(1)}`],
      ];
      rows.forEach(([k, v], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const sx = cx + col * 118;
        const sy = y + row * 10;
        parts.push(label(s, sx, sy, k, { color: T.dim }));
        parts.push(label(s, sx + 110, sy, v, { origin: [1, 0] }));
      });
      y += 42;
    }
    const passHead = label(s, cx, y, 'PASSIVES', { font: 'title', color: T.title });
    parts.push(passHead);
    y += 11;
    for (const p of def.passives) {
      const t = label(s, cx, y, `${p.name}: ${describePassive(p, star, nameOf)}`, { wrap: this.w - pad * 2 });
      parts.push(t);
      y += t.height + 3;
    }
    parts.push(label(s, cx, y + 1, `ULT: ${def.ult.name}`, { font: 'title', color: '#8fd0ff' }));
    y += 12;
    const ultText = label(s, cx, y, describeUlt(def.ult, star, nameOf), { wrap: this.w - pad * 2 });
    parts.push(ultText);
    y += ultText.height + 3;
    if (info.extra) {
      const ex = label(s, cx, y, info.extra, { wrap: this.w - pad * 2, color: T.gold });
      parts.push(ex);
      y += ex.height + 3;
    }
    const h = Math.min(GAME_H - this.y - 4, y - this.y + pad + 2);
    const bg = panel(s, this.x, this.y, this.w, h, 'panel').setInteractive();
    this.container.add(bg);
    this.container.add(parts);
    const close = button(s, this.x + this.w - 20, this.y + 4, 16, 14, 'x', () => {
      this.hide();
      onClose?.();
    });
    this.container.add(close);
    this.container.setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
  }
}
