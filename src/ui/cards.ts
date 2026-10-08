/**
 * Card faces for units and artifacts, card backs, and pack widgets with the
 * odds-preview tooltip.
 */
import Phaser from 'phaser';
import { packCandidates, packOdds, slotOdds } from '../core/packs';
import { pullContext, type RunState } from '../core/run';
import { RARITIES, RARITY_NAMES, type ArtifactDef, type PackInstance, type UnitDef } from '../core/types';
import { getPack, getTrait, PACK_UNITS } from '../data';
import { packDisplayName } from '../core/packs';
import { artifactTexture, PACK_ICON_KEY, packTexture } from '../render/icons';
import { makeTexture, px, box } from '../render/canvas';
import { unitTexture } from '../render/unitSprites';
import { RARITY_COLOR, RARITY_TEXT, T } from './theme';
import { label, panel, withTooltip, type Tooltip } from './widgets';

export const CARD_W = 60;
export const CARD_H = 84;

function ensureCardTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('card_back')) return;
  makeTexture(scene, 'card_back', CARD_W, CARD_H, (c) => {
    box(c, 0, 0, CARD_W, CARD_H, '#6e1a2a', '#120c1c');
    box(c, 3, 3, CARD_W - 6, CARD_H - 6, '#8a2a3a', '#c9a36a');
    // Seigaiha wave pattern.
    for (let y = 6; y < CARD_H - 6; y += 6)
      for (let x = 6 + ((y / 6) % 2) * 3; x < CARD_W - 6; x += 6) {
        px(c, x, y, '#b8404e', 3, 1);
        px(c, x - 1, y + 1, '#5a1a26', 1, 1);
        px(c, x + 3, y + 1, '#5a1a26', 1, 1);
      }
    // Central crest.
    for (let r = 0; r < 9; r++) {
      const half = 9 - Math.abs(r - 4) * 2;
      px(c, CARD_W / 2 - half / 2, CARD_H / 2 - 4 + r, '#c9a36a', half, 1);
    }
    px(c, CARD_W / 2 - 1, CARD_H / 2 - 1, '#fff2a8', 2, 2);
  });
  makeTexture(scene, 'card_glow', CARD_W + 16, CARD_H + 16, (c) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = `rgba(255,255,255,${0.06 + i * 0.03})`;
      c.fillRect(i, i, CARD_W + 16 - i * 2, CARD_H + 16 - i * 2);
    }
  });
}

/** Builds a face-up unit card (origin top-left). */
export function unitCard(scene: Phaser.Scene, x: number, y: number, def: UnitDef, tip?: Tooltip): Phaser.GameObjects.Container {
  ensureCardTextures(scene);
  const c = scene.add.container(x, y);
  const frame = panel(scene, 0, 0, CARD_W, CARD_H, 'card');
  const rarityBar = scene.add.rectangle(3, 3, CARD_W - 6, 3, RARITY_COLOR[def.rarity]).setOrigin(0, 0);
  const art = scene.add.rectangle(4, 8, CARD_W - 8, 38, 0x1a1226).setOrigin(0, 0);
  const sprite = scene.add.image(CARD_W / 2, 45, unitTexture(scene, def), 0).setOrigin(0.5, 1);
  const name = label(scene, CARD_W / 2, 48, def.name, { color: RARITY_TEXT[def.rarity], origin: [0.5, 0], align: 'center', wrap: CARD_W - 6 });
  const o = getTrait(def.origin);
  const k = getTrait(def.cls);
  const i1 = scene.add.image(CARD_W / 2 - 10, 76, `ticon_${o.icon}`).setOrigin(0.5, 0.5);
  const i2 = scene.add.image(CARD_W / 2 + 10, 76, `ticon_${k.icon}`).setOrigin(0.5, 0.5);
  c.add([frame, rarityBar, art, sprite, name, i1, i2]);
  if (name.height <= 10) c.add(label(scene, CARD_W / 2, 59, RARITY_NAMES[def.rarity], { color: T.dim, origin: [0.5, 0] }));
  c.setSize(CARD_W, CARD_H);
  if (tip) {
    const zone = scene.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0);
    withTooltip(zone, tip, () => `${def.name}\n${o.name} / ${k.name}\n${def.flavor}`);
    c.add(zone);
  }
  return c;
}

export function artifactCard(scene: Phaser.Scene, x: number, y: number, def: ArtifactDef): Phaser.GameObjects.Container {
  ensureCardTextures(scene);
  const c = scene.add.container(x, y);
  const frame = panel(scene, 0, 0, CARD_W, CARD_H, 'card');
  const icon = scene.add.image(CARD_W / 2, 22, artifactTexture(scene, def)).setScale(2);
  const name = label(scene, CARD_W / 2, 38, def.name, { color: T.gold, origin: [0.5, 0], align: 'center', wrap: CARD_W - 6 });
  const desc = label(scene, CARD_W / 2, 50 + (name.height > 10 ? 6 : 0), def.desc, { color: T.text, origin: [0.5, 0], align: 'center', wrap: CARD_W - 6 });
  c.add([frame, icon, name, desc]);
  c.setSize(CARD_W, CARD_H);
  return c;
}

export function cardBack(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image {
  ensureCardTextures(scene);
  return scene.add.image(x, y, 'card_back').setOrigin(0, 0);
}

export function cardGlow(scene: Phaser.Scene, x: number, y: number, color: number): Phaser.GameObjects.Image {
  ensureCardTextures(scene);
  return scene.add.image(x - 8, y - 8, 'card_glow').setOrigin(0, 0).setTint(color);
}

/** Text for the odds-preview tooltip: the real calculated rarity percentages. */
export function packOddsText(run: RunState, inst: PackInstance): string {
  const def = getPack(inst.defId);
  const name = packDisplayName(def, inst, (id) => getTrait(id).name);
  const lines = [name, def.desc];
  if (def.hidden) {
    lines.push('', 'Contents and odds are a mystery!');
    return lines.join('\n');
  }
  if (def.special === 'artifact') {
    lines.push('', 'Choose 1 of 3 artifacts.');
    return lines.join('\n');
  }
  const ctx = pullContext(run);
  const odds = packOdds(def, inst, ctx, PACK_UNITS);
  lines.push('', 'Odds per card:');
  for (const r of RARITIES) if (odds[r] > 0) lines.push(`  ${RARITY_NAMES[r].padEnd(10)} ${(odds[r] * 100).toFixed(odds[r] < 0.1 ? 1 : 0)}%`);
  for (const g of def.guaranteed ?? []) {
    const so = slotOdds(def, inst, g.slot, ctx, PACK_UNITS);
    const best = RARITIES.filter((r) => so[r] > 0);
    lines.push(`Card ${g.slot + 1}: ${RARITY_NAMES[best[0]]} or better`);
  }
  if (def.special === 'duplicate') lines.push('Card 1: a copy of a unit you own.');
  if (def.special === 'mirror') lines.push('Card 1: a copy of a unit on your board.');
  const pool = packCandidates(def, inst, ctx, PACK_UNITS);
  if (pool.length < PACK_UNITS.length) lines.push(`Pool: ${pool.length} units.`);
  const boosted = Object.entries(run.momentum).filter(([, m]) => m >= 25);
  if (boosted.length) lines.push(`Momentum boosts: ${boosted.map(([t]) => getTrait(t).name).join(', ')}`);
  return lines.join('\n');
}

/** A pack widget: art, name, optional price, with the odds tooltip. */
export function packWidget(scene: Phaser.Scene, x: number, y: number, run: RunState, inst: PackInstance, tip: Tooltip, priceText?: string): Phaser.GameObjects.Container {
  const def = getPack(inst.defId);
  const traitColor = inst.traits?.length === 1 ? getTrait(inst.traits[0]).color : undefined;
  const iconKey = inst.traits?.length === 1 ? PACK_ICON_KEY[getTrait(inst.traits[0]).icon] : undefined;
  const c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, packTexture(scene, def, iconKey, traitColor)).setOrigin(0.5, 0);
  const iconKeys: string[] = [];
  if (inst.traits?.length) for (const t of inst.traits) iconKeys.push(`ticon_${getTrait(t).icon}`);
  else iconKeys.push(def.special === 'artifact' ? 'icon_star' : def.hidden ? 'icon_star' : 'icon_sword');
  iconKeys.forEach((k, i) => c.add(scene.add.image((i - (iconKeys.length - 1) / 2) * 11, 27, k).setScale(1)));
  c.addAt(img, 0);
  const name = label(scene, 0, 59, packDisplayName(def, inst, (id) => getTrait(id).name), { origin: [0.5, 0], align: 'center', wrap: 74 });
  c.add(name);
  if (priceText) c.add(label(scene, 0, 60 + name.height + 1, priceText, { font: 'title', color: T.gold, origin: [0.5, 0] }));
  const zone = scene.add.zone(-22, 0, 44, 58).setOrigin(0, 0);
  withTooltip(zone, tip, () => packOddsText(run, inst), 190);
  c.add(zone);
  c.setSize(80, 80);
  return c;
}
