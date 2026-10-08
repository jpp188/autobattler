/**
 * Meta screens: the unit Collection, Achievements & Skins per Hero, and
 * Settings (volumes, mute, battle speed, screen shake, save reset).
 */
import { combatStats } from '../core/units';
import { RARITIES, RARITY_NAMES, rarityIndex, type HeroDef } from '../core/types';
import { ACHIEVEMENTS, HEROES, PACK_UNITS } from '../data';
import { G } from '../game/state';
import { goRun, goTo } from '../game/router';
import { Music } from '../audio/music';
import { Sfx } from '../audio/sfx';
import { drawBackdrop } from '../render/backdrops';
import { silhouetteTexture, unitTexture } from '../render/unitSprites';
import { InspectPanel } from '../ui/inspect';
import { RARITY_COLOR, RARITY_TEXT, T } from '../ui/theme';
import { button, label, modal, panel, Slider, title } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { skinUnlocked } from './MenuScenes';
import { GAME_H, GAME_W } from './layout';

// ===================================================================== Collection

export class CollectionScene extends BaseScene {
  constructor() {
    super('Collection');
  }

  create(): void {
    this.setup();
    drawBackdrop(this, 1, 'menu');
    Music.play('map');
    const seen = new Set(G.meta.collection);
    const units = PACK_UNITS.slice().sort((a, b) => rarityIndex(a.rarity) - rarityIndex(b.rarity) || a.name.localeCompare(b.name));
    const found = units.filter((u) => seen.has(u.id)).length;
    title(this, 196, 8, 'COLLECTION', T.title, 10);
    label(this, 196, 24, `${found} of ${units.length} units found. Unseen units are shown as silhouettes.`, { color: T.dim, origin: [0.5, 0] });
    const inspect = new InspectPanel(this, GAME_W - 252, 8, 248);
    const cols = 6;
    const cw = 62;
    const ch = 52;
    units.forEach((u, i) => {
      const x = 8 + (i % cols) * cw;
      const y = 36 + Math.floor(i / cols) * ch;
      const known = seen.has(u.id);
      panel(this, x + 1, y, cw - 2, ch - 2, known ? 'dark' : 'inset');
      this.add.rectangle(x + 6, y + 4, cw - 12, 1, RARITY_COLOR[u.rarity]).setOrigin(0, 0).setAlpha(known ? 1 : 0.4);
      this.add.image(x + cw / 2, y + 36, known ? unitTexture(this, u) : silhouetteTexture(this, u), 0).setOrigin(0.5, 1);
      label(this, x + cw / 2, y + 37, known ? u.name : '???', { color: known ? RARITY_TEXT[u.rarity] : T.dim, origin: [0.5, 0], align: 'center', wrap: cw - 6 });
      const zone = this.add.zone(x + 1, y, cw - 2, ch - 2).setOrigin(0, 0).setInteractive();
      zone.on('pointerup', () => {
        if (!known) {
          inspect.hide();
          return;
        }
        Sfx.play('click');
        inspect.show({ def: u, star: 1, stats: combatStats(u.stats, 1) });
      });
    });
    // Rarity counts.
    RARITIES.forEach((r, i) => {
      const total = units.filter((u) => u.rarity === r).length;
      const got = units.filter((u) => u.rarity === r && seen.has(u.id)).length;
      label(this, 8 + i * 78, GAME_H - 46, `${RARITY_NAMES[r]} ${got}/${total}`, { color: RARITY_TEXT[r] });
    });
    if (!found) label(this, GAME_W - 128, 120, 'Tap a unit you have\nfound to inspect it.\nPull units from packs\nto fill your collection.', { color: T.dim, origin: [0.5, 0], align: 'center' });
    else label(this, GAME_W - 128, 120, 'Tap a unit to inspect it.', { color: T.dim, origin: [0.5, 0] });
    button(this, 8, GAME_H - 30, 90, 22, 'BACK', () => goTo(this, 'Title'));
  }
}

// ===================================================================== Achievements & skins

export class AchievementsScene extends BaseScene {
  private heroIndex = 0;

  constructor() {
    super('Achievements');
  }

  create(): void {
    this.setup();
    this.draw();
  }

  private draw(): void {
    this.clearAll();
    drawBackdrop(this, 2, 'menu');
    Music.play('map');
    const done = new Set(G.meta.achievements);
    title(this, GAME_W / 2, 8, 'ACHIEVEMENTS & SKINS', T.title, 10);
    label(this, GAME_W / 2, 24, `${done.size} of ${ACHIEVEMENTS.length} unlocked. Achievements unlock Hero skins (cosmetic only).`, { color: T.dim, origin: [0.5, 0] });
    HEROES.forEach((h, i) => {
      const b = button(this, GAME_W / 2 - 165 + i * 112, 36, 104, 20, h.name.toUpperCase(), () => {
        this.heroIndex = i;
        this.draw();
      });
      if (i === this.heroIndex) b.setEnabled(false);
    });
    const hero = HEROES[this.heroIndex];
    // Achievements list.
    panel(this, 8, 62, 384, 262, 'dark');
    const list = ACHIEVEMENTS.filter((a) => a.hero === hero.id);
    list.forEach((a, i) => {
      const y = 70 + i * 41;
      const got = done.has(a.id);
      panel(this, 14, y, 372, 37, got ? 'panel' : 'inset');
      this.add.image(24, y + 12, 'icon_star').setScale(2).setAlpha(got ? 1 : 0.25);
      label(this, 40, y + 6, a.name, { font: 'title', color: got ? T.gold : T.dim });
      label(this, 40, y + 20, a.desc, { color: got ? T.text : T.dim });
      label(this, 378, y + 6, got ? 'UNLOCKED' : 'LOCKED', { color: got ? T.good : T.dim, origin: [1, 0] });
    });
    // Skins.
    this.drawSkins(hero, 398, 62);
    button(this, 8, GAME_H - 30, 90, 22, 'BACK', () => goTo(this, 'Title'));
  }

  private drawSkins(hero: HeroDef, x: number, y: number): void {
    panel(this, x, y, 234, 262, 'dark');
    label(this, x + 8, y + 6, `${hero.name.toUpperCase()} SKINS`, { font: 'title', color: T.title });
    hero.skins.forEach((s, i) => {
      const sy = y + 22 + i * 78;
      const ok = skinUnlocked(s);
      const spr = this.add.sprite(x + 36, sy + 62, unitTexture(this, hero, { hero: true, skin: s.look, skinId: s.id }), 0).setOrigin(0.5, 1).setScale(1.25);
      if (!ok) spr.setTintFill(0x07050b);
      else this.time.addEvent({ delay: 460 + i * 40, loop: true, callback: () => spr.setFrame(spr.frame.name === '0' ? 1 : 0) });
      label(this, x + 72, sy + 16, s.name, { font: 'title', color: ok ? T.gold : T.dim });
      const how = s.unlockedBy ? ACHIEVEMENTS.find((a) => a.id === s.unlockedBy)!.desc : 'Available from the start.';
      label(this, x + 72, sy + 30, ok ? (G.meta.selectedSkin[hero.id] === s.id || (!G.meta.selectedSkin[hero.id] && i === 0) ? 'Selected. Change it on Hero select.' : 'Unlocked. Pick it on Hero select.') : `Locked: ${how}`, {
        color: ok ? T.text : T.dim,
        wrap: 150,
      });
    });
  }
}

// ===================================================================== Settings

export class SettingsScene extends BaseScene {
  private back = 'Title';

  constructor() {
    super('Settings');
  }

  init(data: { back?: string }): void {
    this.back = data?.back ?? 'Title';
  }

  create(): void {
    this.setup();
    this.draw();
  }

  private draw(): void {
    this.clearAll();
    drawBackdrop(this, G.run && this.back !== 'Title' ? G.run.act : 1, 'menu');
    const s = G.meta.settings;
    const save = () => G.saveMeta();
    title(this, GAME_W / 2, 10, 'SETTINGS', T.title, 10);
    const px = GAME_W / 2 - 170;
    const bg = panel(this, px, 30, 340, 270, 'dark');
    let y = 42;
    const row = (name: string) => {
      label(this, px + 14, y + 2, name, { color: T.text });
      const yy = y;
      y += 26;
      return yy;
    };
    for (const [name, key] of [
      ['Master volume', 'master'],
      ['Music volume', 'music'],
      ['Effects volume', 'sfx'],
    ] as const) {
      const yy = row(name);
      new Slider(this, px + 130, yy, 150, s[key], (v) => {
        s[key] = v;
        save();
        if (key !== 'music') Sfx.play('gold');
      });
    }
    let yy = row('Sound');
    button(this, px + 130, yy - 3, 100, 18, s.muted ? 'MUTED' : 'ON', () => {
      s.muted = !s.muted;
      save();
      this.draw();
    });
    yy = row('Battle speed');
    ([1, 2, 4] as const).forEach((sp, i) => {
      const b = button(this, px + 130 + i * 52, yy - 3, 46, 18, `${sp}x`, () => {
        s.battleSpeed = sp;
        save();
        this.draw();
      });
      if (s.battleSpeed === sp) b.setEnabled(false);
    });
    yy = row('Screen shake');
    button(this, px + 130, yy - 3, 100, 18, s.screenShake ? 'ON' : 'OFF', () => {
      s.screenShake = !s.screenShake;
      save();
      if (s.screenShake) this.cameras.main.shake(120, 0.006);
      this.draw();
    });
    y += 6;
    this.add.rectangle(px + 10, y, 320, 1, 0x4a3a5a).setOrigin(0, 0);
    y += 10;
    const inRun = this.back !== 'Title' && G.hasRun();
    if (inRun) {
      yy = row('Current run');
      button(this, px + 130, yy - 3, 150, 18, 'ABANDON RUN', () =>
        modal(this, 'Abandon this run? It will end as a defeat.', [
          {
            text: 'ABANDON',
            onClick: () => {
              G.run!.result = { won: false, reason: 'You abandoned the run.' };
              G.run!.screen = 'over';
              goTo(this, 'RunEnd');
            },
          },
          { text: 'KEEP', onClick: () => undefined },
        ]),
      );
    }
    yy = row('Save data');
    button(this, px + 130, yy - 3, 150, 18, 'RESET SAVE', () =>
      modal(this, 'Delete ALL progress? Your current run, collection, achievements and skins will be lost. This cannot be undone.', [
        {
          text: 'DELETE',
          onClick: () =>
            modal(this, 'Are you sure?', [
              {
                text: 'YES, RESET',
                onClick: () => {
                  G.resetAll();
                  goTo(this, 'Title');
                },
              },
              { text: 'CANCEL', onClick: () => undefined },
            ]),
        },
        { text: 'CANCEL', onClick: () => undefined },
      ]),
    );
    bg.setSize(340, y - 22);
    button(this, GAME_W / 2 - 60, GAME_H - 34, 120, 22, inRun ? 'BACK TO RUN' : 'BACK', () => {
      if (inRun) goRun(this);
      else goTo(this, 'Title');
    });
  }
}
