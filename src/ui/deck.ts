/**
 * Full-screen overlays listing owned units: the deck view (inspect / sell)
 * and a unit picker used by events, rest training and shop services.
 */
import Phaser from 'phaser';
import { ownedUnitStats, sellUnit, sellValue, type RunState } from '../core/run';
import type { OwnedUnit } from '../core/roster';
import { getHero, getUnit } from '../data';
import { GAME_H, GAME_W } from '../scenes/layout';
import { unitTexture } from '../render/unitSprites';
import { RARITY_COLOR, RARITY_TEXT, T } from './theme';
import { InspectPanel } from './inspect';
import { button, label, modal, panel } from './widgets';

interface DeckOpts {
  title: string;
  subtitle?: string;
  filter?: (u: OwnedUnit) => boolean;
  /** Pick mode: called with the chosen unit. */
  onPick?: (u: OwnedUnit) => void;
  pickLabel?: string;
  allowSell?: boolean;
  onClose?: () => void;
  onChange?: () => void;
}

/** Opens the deck overlay. Returns the container (destroyed on close). */
export function openDeck(scene: Phaser.Scene, run: RunState, o: DeckOpts): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(4500);
  const inspect = new InspectPanel(scene, GAME_W - 252, 22, 248);
  inspect.container.setDepth(4600);
  let selected: OwnedUnit | null = null;
  const close = () => {
    inspect.container.destroy();
    root.destroy();
    o.onClose?.();
  };
  const render = () => {
    root.removeAll(true);
    const shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x07050b, 0.88).setOrigin(0, 0).setInteractive();
    root.add(shade);
    root.add(panel(scene, 8, 22, GAME_W - 16, GAME_H - 30, 'panel'));
    root.add(label(scene, 20, 30, o.title, { font: 'title', color: T.title }));
    if (o.subtitle) root.add(label(scene, 20, 42, o.subtitle, { color: T.dim, wrap: 360 }));
    const units = run.roster.units
      .filter((u) => u.loc.at !== 'pending')
      .filter((u) => (o.filter ? o.filter(u) : true))
      .sort((a, b) => Number(!!b.hero) - Number(!!a.hero) || (a.loc.at === 'board' ? 0 : 1) - (b.loc.at === 'board' ? 0 : 1) || b.star - a.star);
    const cols = 6;
    const cw = 62;
    const ch = 64;
    const x0 = 16;
    const hero = getHero(run.heroId);
    units.forEach((u, i) => {
      const x = x0 + (i % cols) * cw;
      const y = 54 + Math.floor(i / cols) * ch;
      const def = u.hero ? hero : getUnit(u.defId);
      const isSel = selected?.uid === u.uid;
      const bg = panel(scene, x + 2, y, cw - 4, ch - 4, isSel ? 'panel' : 'dark');
      const skin = u.hero ? hero.skins.find((s) => s.id === run.skinId) : undefined;
      const img = scene.add.image(x + cw / 2, y + 36, unitTexture(scene, def, { hero: u.hero, skin: skin?.look, skinId: u.hero ? run.skinId : undefined }), 0).setOrigin(0.5, 1);
      if (u.hero) img.setScale(0.75);
      const name = label(scene, x + cw / 2, y + 38, def.name, { color: u.hero ? T.gold : RARITY_TEXT[def.rarity], origin: [0.5, 0], wrap: cw - 8, align: 'center' });
      const stars = label(scene, x + 6, y + 3, '★'.repeat(u.star), { color: T.gold });
      const where = label(scene, x + cw - 6, y + 3, u.loc.at === 'board' ? 'B' : '', { color: T.blue, origin: [1, 0] });
      const pip = scene.add.rectangle(x + cw / 2, y + ch - 7, 20, 1, u.hero ? 0xffd24a : RARITY_COLOR[def.rarity]);
      const zone = scene.add.zone(x + 2, y, cw - 4, ch - 4).setOrigin(0, 0).setInteractive();
      zone.on('pointerup', () => {
        selected = u;
        inspect.show({ def, star: u.star, stats: ownedUnitStats(run, u), hp: u.hero ? run.heroHp : undefined, hero: u.hero, skinLook: skin?.look, skinId: u.hero ? run.skinId : undefined });
        render();
      });
      root.add([bg, img, name, stars, where, pip, zone]);
    });
    if (!units.length) root.add(label(scene, GAME_W / 2, 120, 'No units to choose from.', { color: T.dim, origin: [0.5, 0] }));
    const by = GAME_H - 34;
    root.add(
      button(scene, 20, by, 90, 20, o.onPick ? 'CANCEL' : 'CLOSE', () => close()),
    );
    if (o.onPick) {
      const b = button(scene, GAME_W / 2 - 70, by, 140, 20, o.pickLabel ?? 'CHOOSE', () => {
        if (!selected) return;
        const u = selected;
        close();
        o.onPick!(u);
      }).setEnabled(!!selected);
      root.add(b);
    }
    if (o.allowSell && selected && !selected.hero) {
      const u = selected;
      const val = sellValue(run, u);
      root.add(
        button(scene, GAME_W - 150, by, 130, 20, `SELL +${val}G`, () => {
          modal(scene, `Sell ${getUnit(u.defId).name} ${'★'.repeat(u.star)} for ${val} gold?`, [
            {
              text: 'SELL',
              onClick: () => {
                sellUnit(run, u.uid);
                selected = null;
                inspect.hide();
                o.onChange?.();
                render();
              },
            },
            { text: 'KEEP', onClick: () => undefined },
          ]).setDepth(4700);
        }),
      );
    }
  };
  render();
  return root;
}
