/**
 * Title screen, Hero select (with skins) and the run-end summary.
 */
import { describePassive, describeUlt } from '../core/describe';
import { actName, floorReached, mostDamage } from '../core/run';
import { RARITY_NAMES, type HeroDef } from '../core/types';
import { findUnit, getAchievement, getHero, getTrait, getUnit, HEROES } from '../data';
import { G } from '../game/state';
import { goRun, goTo } from '../game/router';
import { Music } from '../audio/music';
import { Sfx } from '../audio/sfx';
import { drawBackdrop } from '../render/backdrops';
import { unitTexture } from '../render/unitSprites';
import { RARITY_TEXT, T } from '../ui/theme';
import { button, label, modal, panel, title, withTooltip } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { GAME_H, GAME_W } from './layout';

const nameOf = (id: string) => findUnit(id)?.name ?? id;

/** Whether a skin is unlocked in meta progress. */
export function skinUnlocked(skin: HeroDef['skins'][number]): boolean {
  return !skin.unlockedBy || G.meta.achievements.includes(skin.unlockedBy);
}

// ===================================================================== Title

export class TitleScene extends BaseScene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.setup();
    drawBackdrop(this, 1, 'menu');
    Music.play('map');
    // Logo with a drop shadow and a slow bob.
    const shadow = title(this, GAME_W / 2 + 2, 30, 'PACKBOUND', '#3a1020', 24);
    const logo = title(this, GAME_W / 2, 28, 'PACKBOUND', '#ffd27a', 24);
    this.tweens.add({ targets: [logo, shadow], y: '-=3', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    label(this, GAME_W / 2, 60, 'Open packs. Build an army. Protect your Hero.', { color: T.text, origin: [0.5, 0] });

    // The three Heroes standing together.
    HEROES.forEach((h, i) => {
      const skinId = G.meta.selectedSkin[h.id] ?? h.skins[0].id;
      const skin = h.skins.find((s) => s.id === skinId) ?? h.skins[0];
      const img = this.add.sprite(GAME_W / 2 + (i - 1) * 56, 176, unitTexture(this, h, { hero: true, skin: skin.look, skinId: skin.id }), 0).setOrigin(0.5, 1).setScale(2);
      if (i !== 1) img.setFlipX(i === 2);
      this.time.addEvent({ delay: 450 + i * 70, loop: true, callback: () => img.setFrame(img.frame.name === '0' ? 1 : 0) });
    });

    let y = 192;
    if (G.hasRun()) {
      const run = G.run!;
      const hero = getHero(run.heroId);
      button(this, GAME_W / 2 - 70, y, 140, 24, 'CONTINUE', () => goRun(this));
      label(this, GAME_W / 2, y + 27, `${hero.name} · ${actName(run.act)}`, { color: T.dim, origin: [0.5, 0] });
      y += 44;
    }
    button(this, GAME_W / 2 - 70, y, 140, 24, 'NEW RUN', () => {
      if (G.hasRun()) {
        modal(this, 'Start a new run? Your current run will be abandoned.', [
          { text: 'ABANDON', onClick: () => (G.clearRun(), goTo(this, 'HeroSelect')) },
          { text: 'BACK', onClick: () => undefined },
        ]);
      } else goTo(this, 'HeroSelect');
    });
    const s = G.meta.stats;
    if (s.runs) label(this, GAME_W / 2, GAME_H - 14, `Runs ${s.runs}  ·  Wins ${s.wins}  ·  Best floor ${s.bestFloor}  ·  Units found ${G.meta.collection.length}`, { color: T.dim, origin: [0.5, 0] });
  }
}

// ===================================================================== Hero select

export class HeroSelectScene extends BaseScene {
  private selected = 0;
  private skinIndex: Record<string, number> = {};

  constructor() {
    super('HeroSelect');
  }

  create(): void {
    this.setup();
    drawBackdrop(this, 0, 'menu');
    Music.play('map');
    for (const h of HEROES) {
      const sel = G.meta.selectedSkin[h.id];
      const i = h.skins.findIndex((s) => s.id === sel);
      this.skinIndex[h.id] ??= i >= 0 && skinUnlocked(h.skins[i]) ? i : 0;
    }
    this.draw();
  }

  private draw(): void {
    this.children.removeAll(true);
    drawBackdrop(this, 0, 'menu');
    title(this, GAME_W / 2, 10, 'CHOOSE YOUR HERO', T.title, 10);
    label(this, GAME_W / 2, 26, 'Your Hero fights on the board. Their HP is the run: if they fall, the run ends.', { color: T.dim, origin: [0.5, 0] });
    HEROES.forEach((h, i) => this.drawHero(h, 8 + i * 210, 38, i));
    button(this, 12, GAME_H - 30, 90, 22, 'BACK', () => goTo(this, 'Title'));
    const hero = HEROES[this.selected];
    const skin = hero.skins[this.skinIndex[hero.id]];
    const ok = skinUnlocked(skin);
    button(this, GAME_W - 172, GAME_H - 30, 160, 22, ok ? `START AS ${hero.name.toUpperCase()}` : 'SKIN LOCKED', () => {
      Sfx.play('fightStart');
      G.startRun(hero.id, skin.id);
      goRun(this);
    }).setEnabled(ok);
  }

  private drawHero(h: HeroDef, x: number, y: number, index: number): void {
    const w = 204;
    const isSel = this.selected === index;
    const bg = panel(this, x, y, w, 284, isSel ? 'panel' : 'dark');
    bg.setInteractive().on('pointerup', () => {
      if (this.selected === index) return;
      this.selected = index;
      Sfx.play('click');
      this.draw();
    });
    if (isSel) this.add.rectangle(x + 2, y + 2, w - 4, 2, 0xffd24a).setOrigin(0, 0);
    const cx = x + w / 2;
    const skins = h.skins;
    const si = this.skinIndex[h.id];
    const skin = skins[si];
    const unlocked = skinUnlocked(skin);
    const spr = this.add.sprite(cx, y + 88, unitTexture(this, h, { hero: true, skin: skin.look, skinId: skin.id }), 0).setOrigin(0.5, 1).setScale(1.5);
    if (!unlocked) spr.setTintFill(0x07050b);
    else this.time.addEvent({ delay: 450, loop: true, callback: () => spr.setFrame(spr.frame.name === '0' ? 1 : 0) });
    title(this, cx, y + 6, h.name.toUpperCase(), T.gold, 8);
    label(this, cx, y + 18, h.title, { color: T.dim, origin: [0.5, 0] });
    // Skin picker.
    const prev = button(this, x + 8, y + 92, 18, 16, '<', () => this.cycleSkin(h, index, -1));
    const next = button(this, x + w - 26, y + 92, 18, 16, '>', () => this.cycleSkin(h, index, 1));
    prev.setEnabled(skins.length > 1);
    next.setEnabled(skins.length > 1);
    label(this, cx, y + 92, skin.name, { color: unlocked ? T.text : T.dim, origin: [0.5, 0] });
    const lockText = unlocked ? `Skin ${si + 1}/${skins.length}` : `Locked: ${getAchievement(skin.unlockedBy!).desc}`;
    label(this, cx, y + 102, lockText, { color: unlocked ? T.dim : T.bad, origin: [0.5, 0], wrap: w - 60, align: 'center' });
    // Traits.
    let ty = y + 122;
    for (const tid of [h.origin, h.cls]) {
      const t = getTrait(tid);
      const icon = this.add.image(x + 10, ty, `ticon_${t.icon}`).setOrigin(0, 0);
      const name = label(this, x + 22, ty + 1, t.name, { color: t.color });
      withTooltip(icon, this.tip, () => `${t.name}\n${t.desc}`, 200);
      withTooltip(name, this.tip, () => `${t.name}\n${t.desc}`, 200);
      ty += 12;
    }
    label(this, x + w - 10, y + 123, `HP ${h.stats.hp}\nATK ${h.stats.ad}`, { color: T.text, origin: [1, 0], align: 'right' });
    // Perk, passives and ultimate.
    ty += 4;
    const perk = label(this, x + 10, ty, `Perk: ${h.perk.name}`, { color: T.title });
    ty += perk.height + 1;
    const perkDesc = label(this, x + 10, ty, h.perk.desc, { color: T.text, wrap: w - 20 });
    ty += perkDesc.height + 5;
    for (const p of h.passives) {
      const t = label(this, x + 10, ty, `${p.name}: ${describePassive(p, 1, nameOf)}`, { color: T.text, wrap: w - 20 });
      ty += t.height + 3;
    }
    const ult = label(this, x + 10, ty + 1, `Ultimate: ${h.ult.name}`, { color: T.blue });
    label(this, x + 10, ty + 2 + ult.height, describeUlt(h.ult, 1, nameOf), { color: T.text, wrap: w - 20 });
    label(this, cx, y + 284 - 26, h.flavor, { color: T.dim, wrap: w - 16, align: 'center', origin: [0.5, 0] });
  }

  /** Cycles through skins, including locked ones so players can preview them. */
  private cycleSkin(h: HeroDef, index: number, dir: number): void {
    const n = h.skins.length;
    this.skinIndex[h.id] = (this.skinIndex[h.id] + dir + n) % n;
    this.selected = index;
    Sfx.play('click');
    this.draw();
  }
}

// ===================================================================== Run end

export class RunEndScene extends BaseScene {
  constructor() {
    super('RunEnd');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    G.finishRun();
    const won = !!run.result?.won;
    drawBackdrop(this, Math.max(1, run.act), 'menu');
    Music.stop();
    Sfx.play(won ? 'victory' : 'defeat');
    const hero = getHero(run.heroId);
    title(this, GAME_W / 2, 14, won ? 'VICTORY!' : 'RUN OVER', won ? T.gold : T.bad, 16);
    label(this, GAME_W / 2, 38, run.result?.reason ?? '', { color: T.text, origin: [0.5, 0] });
    const skin = hero.skins.find((s) => s.id === run.skinId);
    const spr = this.add.sprite(GAME_W / 2, 112, unitTexture(this, hero, { hero: true, skin: skin?.look, skinId: run.skinId }), won ? 2 : 0).setOrigin(0.5, 1).setScale(1.5);
    if (!won) spr.setAngle(-80).setY(110);

    // Stats.
    panel(this, 20, 122, 196, 178, 'dark');
    label(this, 30, 128, 'THE RUN', { font: 'title', color: T.title });
    const s = run.stats;
    const rows: [string, string][] = [
      ['Hero', hero.name],
      ['Reached', actName(run.act).split(':')[0]],
      ['Floor reached', String(floorReached(run))],
      ['Battles won', String(s.battlesWon)],
      ['Units collected', String(s.unitsCollected)],
      ['Packs opened', String(s.packsOpened)],
      ['Gold earned', String(s.goldEarned)],
      ['Artifacts', String(run.artifacts.length)],
    ];
    rows.forEach(([k, v], i) => {
      label(this, 30, 144 + i * 18, k, { color: T.dim });
      label(this, 206, 144 + i * 18, v, { color: T.text, origin: [1, 0] });
    });

    // Highlights.
    panel(this, 222, 122, 196, 178, 'dark');
    label(this, 232, 128, 'HIGHLIGHTS', { font: 'title', color: T.title });
    const best = mostDamage(run);
    if (best) {
      const def = findUnit(best.unitId);
      if (def) {
        const isHero = def.id === hero.id;
        this.add.sprite(252, 186, unitTexture(this, def, isHero ? { hero: true, skin: skin?.look, skinId: run.skinId } : {}), 0).setOrigin(0.5, 1).setScale(isHero ? 0.8 : 1);
        label(this, 274, 150, 'Most damage', { color: T.dim });
        label(this, 274, 162, def.name, { color: isHero ? T.gold : RARITY_TEXT[def.rarity] });
        label(this, 274, 174, `${Math.round(best.damage).toLocaleString('en-US')} damage`, { color: T.text });
      }
    }
    if (s.bestPull) {
      const def = getUnit(s.bestPull.unitId);
      this.add.sprite(252, 252, unitTexture(this, def), 0).setOrigin(0.5, 1);
      label(this, 274, 216, 'Best pull', { color: T.dim });
      label(this, 274, 228, def.name, { color: RARITY_TEXT[def.rarity] });
      label(this, 274, 240, RARITY_NAMES[def.rarity], { color: T.text });
    }
    if (!best && !s.bestPull) label(this, 232, 150, 'The run ended before\nanything memorable happened.', { color: T.dim });

    // Achievements.
    panel(this, 424, 122, 196, 178, 'dark');
    label(this, 434, 128, 'ACHIEVEMENTS', { font: 'title', color: T.title });
    const got = G.runAchievements.map(getAchievement);
    if (!got.length) label(this, 434, 146, 'None this run.', { color: T.dim });
    let ay = 145;
    for (const a of got) {
      if (ay > 262) break;
      this.add.image(434, ay + 1, 'icon_star').setOrigin(0, 0);
      label(this, 446, ay, a.name, { color: T.gold });
      ay += 10 + label(this, 446, ay + 10, a.desc, { color: T.dim, wrap: 166 }).height + 4;
    }
    const skinsNew = hero.skins.filter((sk) => sk.unlockedBy && G.runAchievements.includes(sk.unlockedBy));
    if (skinsNew.length) label(this, 434, 286, `New skin: ${skinsNew.map((sk) => sk.name).join(', ')}!`, { color: T.good });

    button(this, GAME_W / 2 - 150, GAME_H - 34, 140, 24, 'NEW RUN', () => {
      G.run = null;
      goTo(this, 'HeroSelect');
    });
    button(this, GAME_W / 2 + 10, GAME_H - 34, 140, 24, 'MAIN MENU', () => {
      G.run = null;
      goTo(this, 'Title');
    });
  }
}
