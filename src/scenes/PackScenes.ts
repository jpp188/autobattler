/**
 * Starter choice, pack opening (with card flips and rarity reveals), the
 * merge animation, and the bench overflow screen.
 */
import Phaser from 'phaser';
import { collectOpened, chooseStarter, finishOverflow, sellUnit, sellValue, type MergeEvent } from '../core/run';
import { benchUnits, freeBenchSlots, pendingUnits, type OwnedUnit } from '../core/roster';
import { RARITY_NAMES, rarityIndex, type Rarity } from '../core/types';
import { getArtifact, getHero, getPack, getTrait, getUnit } from '../data';
import { packDisplayName } from '../core/packs';
import { G } from '../game/state';
import { goRun } from '../game/router';
import { Sfx } from '../audio/sfx';
import { Music } from '../audio/music';
import { drawBackdrop } from '../render/backdrops';
import { unitTexture } from '../render/unitSprites';
import { artifactCard, cardBack, cardGlow, CARD_H, CARD_W, packWidget, unitCard } from '../ui/cards';
import { RunHud } from '../ui/hud';
import { RARITY_COLOR, RARITY_TEXT, T } from '../ui/theme';
import { button, label, panel, title, type Button } from '../ui/widgets';
import { BaseScene } from './BaseScene';
import { GAME_H, GAME_W } from './layout';

// ===================================================================== Starter

export class StarterScene extends BaseScene {
  constructor() {
    super('Starter');
  }
  create(): void {
    this.setup();
    const run = G.run!;
    drawBackdrop(this, 0, 'menu');
    Music.play('map');
    new RunHud(this, run, this.tip, 'Choose your starter');
    title(this, GAME_W / 2, 32, 'CHOOSE A STARTER PACK');
    label(this, GAME_W / 2, 48, 'Every unit you will ever field comes from packs. Pick one to begin.', { color: T.dim, origin: [0.5, 0] });
    const hero = getHero(run.heroId);
    run.starterOptions.forEach((inst, i) => {
      const def = getPack(inst.defId);
      const cx = GAME_W / 2 + (i === 0 ? -120 : 120);
      panel(this, cx - 100, 66, 200, 236, 'dark');
      const w = packWidget(this, cx, 78, run, inst, this.tip);
      w.setScale(1);
      let desc = def.desc;
      if (inst.traits?.length) {
        const t = getTrait(inst.traits[0]);
        desc += `\n\nTrait: ${t.name}\n${t.desc}\n(2): ${t.breakpoints[0].desc}`;
        if (inst.traits.includes(hero.origin) || inst.traits.includes(hero.cls)) desc += `\n\nShares a trait with ${hero.name}!`;
      }
      label(this, cx, 162, desc, { origin: [0.5, 0], align: 'center', wrap: 184, color: T.text });
      button(this, cx - 60, 274, 120, 22, 'CHOOSE', () => {
        chooseStarter(run, i, G.isNewUnit);
        Sfx.play('packOpen');
        goRun(this);
      });
    });
  }
}

// ===================================================================== Pack opening

export class PackOpenScene extends BaseScene {
  private flipped: boolean[] = [];
  private faces: (Phaser.GameObjects.Container | null)[] = [];
  private backs: Phaser.GameObjects.Image[] = [];
  private spots: { x: number; y: number }[] = [];
  private tags: Phaser.GameObjects.GameObject[] = [];
  private flipAllBtn!: Button;
  private contBtn!: Button;
  private chosenArtifact = -1;
  private artifactSel: Phaser.GameObjects.Rectangle[] = [];
  private chosenCards: number[] = [];
  private cardSel = new Map<number, Phaser.GameObjects.GameObject[]>();
  private benchWarn: Phaser.GameObjects.GameObject | null = null;
  private busy = false;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('PackOpen');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    const o = run.opened;
    if (!o) {
      goRun(this);
      return;
    }
    this.flipped = [];
    this.faces = [];
    this.backs = [];
    this.spots = [];
    this.tags = [];
    this.chosenArtifact = -1;
    this.artifactSel = [];
    this.chosenCards = [];
    this.cardSel = new Map();
    this.benchWarn = null;
    this.busy = false;
    drawBackdrop(this, run.act, 'menu');
    new RunHud(this, run, this.tip, 'Opening a pack');
    this.emitter = this.add.particles(0, 0, 'px', {
      speed: { min: 40, max: 180 },
      lifespan: { min: 300, max: 900 },
      scale: { start: 1.5, end: 0 },
      gravityY: 90,
      emitting: false,
    });
    this.emitter.setDepth(500);
    const def = getPack(o.defId);
    const name = packDisplayName(def, o.inst, (id) => getTrait(id).name);
    title(this, GAME_W / 2, 28, name.toUpperCase());

    const isArtifact = !!o.artifactChoices;
    const n = isArtifact ? o.artifactChoices!.length : o.cards.length;
    const keepText = o.keep === 1 ? 'keep 1 unit' : `keep ${o.keep} units`;
    label(this, GAME_W / 2, 42, isArtifact ? 'Flip the cards, then choose one artifact.' : `Flip the cards, then ${keepText}. The rest are lost.`, { color: T.dim, origin: [0.5, 0] });
    const gap = 74;
    const x0 = GAME_W / 2 - ((n - 1) * gap) / 2 - CARD_W / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * gap;
      const y = 76 + Math.abs(i - (n - 1) / 2) * 6;
      const back = cardBack(this, GAME_W / 2 - CARD_W / 2, 300).setDepth(10).setAlpha(0);
      back.setInteractive();
      back.on('pointerup', () => this.flip(i));
      this.tweens.add({ targets: back, x, y, alpha: 1, duration: 260, delay: 80 * i, ease: 'Back.easeOut' });
      this.backs.push(back);
      this.spots.push({ x, y });
      this.flipped.push(false);
      this.faces.push(null);
    }
    if (n === 0) {
      label(this, GAME_W / 2, 140, 'The pack was empty... not even dust.', { origin: [0.5, 0] });
    }
    this.flipAllBtn = button(this, GAME_W / 2 - 130, 300, 120, 24, 'FLIP ALL', () => this.flipAll());
    this.contBtn = button(this, GAME_W / 2 + 10, 300, 120, 24, 'CONTINUE', () => this.finish()).setEnabled(n === 0);
    Sfx.play('packOpen');
  }

  private flipAll(): void {
    this.flipped.forEach((f, i) => {
      if (!f) this.time.delayedCall(i * 160, () => this.flip(i));
    });
  }

  private flip(i: number): void {
    if (this.flipped[i]) {
      if (G.run!.opened?.artifactChoices) this.selectArtifact(i);
      else this.selectCard(i);
      return;
    }
    this.flipped[i] = true;
    const run = G.run!;
    const o = run.opened!;
    const back = this.backs[i];
    const { x, y } = this.spots[i];
    this.tweens.killTweensOf(back);
    back.setPosition(x, y).setAlpha(1);
    let rarity: Rarity = 'common';
    let face: Phaser.GameObjects.Container;
    if (o.artifactChoices) {
      const a = getArtifact(o.artifactChoices[i]);
      rarity = a.tier === 'boss' ? 'legendary' : a.tier === 'rare' ? 'rare' : a.tier === 'uncommon' ? 'uncommon' : 'common';
      face = artifactCard(this, x, y, a);
      const zone = this.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0).setInteractive();
      zone.on('pointerup', () => this.selectArtifact(i));
      face.add(zone);
    } else {
      const card = o.cards[i];
      rarity = card.rarity;
      face = unitCard(this, x, y, getUnit(card.unitId), this.tip);
      const zone = this.add.zone(0, 0, CARD_W, CARD_H).setOrigin(0, 0).setInteractive().setName(`card-${i}`);
      zone.on('pointerup', () => this.selectCard(i));
      face.add(zone);
    }
    face.setDepth(20).setVisible(false);
    this.faces[i] = face;
    this.tweens.add({
      targets: back,
      scaleX: 0,
      x: x + CARD_W / 2,
      duration: 90,
      onComplete: () => {
        back.setVisible(false);
        face.setVisible(true);
        face.setScale(0, 1);
        face.x = x + CARD_W / 2;
        this.tweens.add({ targets: face, scaleX: 1, x, duration: 90 });
        this.reveal(i, rarity, x, y);
      },
    });
    if (this.flipped.every(Boolean)) this.time.delayedCall(400, () => this.allFlipped());
  }

  private reveal(i: number, rarity: Rarity, x: number, y: number): void {
    const ri = rarityIndex(rarity);
    const color = RARITY_COLOR[rarity];
    Sfx.play(`reveal_${rarity}`);
    if (ri >= 1) {
      const glow = cardGlow(this, x, y, color).setDepth(15).setAlpha(0);
      this.tweens.add({ targets: glow, alpha: { from: 0.9, to: 0.45 }, duration: 600, yoyo: true, repeat: -1 });
    }
    if (ri >= 2) {
      this.emitter.setParticleTint(color);
      this.emitter.explode(10 + ri * 10, x + CARD_W / 2, y + CARD_H / 2);
    }
    if (ri >= 3) this.cameras.main.flash(120, (color >> 16) & 255, (color >> 8) & 255, color & 255);
    if (ri === 4) {
      if (G.meta.settings.screenShake) this.cameras.main.shake(300, 0.008);
      this.emitter.setParticleTint(0xfff2a8);
      this.emitter.explode(60, x + CARD_W / 2, y + CARD_H / 2);
      // Light rays.
      for (let r = 0; r < 8; r++) {
        const ray = this.add.rectangle(x + CARD_W / 2, y + CARD_H / 2, 3, 120, 0xfff2a8, 0.5).setOrigin(0.5, 1).setDepth(12).setAngle(r * 45);
        this.tweens.add({ targets: ray, alpha: 0, scaleY: 1.6, duration: 900, onComplete: () => ray.destroy() });
      }
      const t = label(this, x + CARD_W / 2, y - 12, 'LEGENDARY!', { font: 'title', color: RARITY_TEXT.legendary, origin: [0.5, 0.5], stroke: true }).setDepth(40);
      this.tweens.add({ targets: t, scale: { from: 2, to: 1 }, duration: 400, ease: 'Back.easeOut' });
    }
    const face = this.faces[i];
    if (face) this.tweens.add({ targets: face, y: y - 4, duration: 120, yoyo: true });
  }

  private allFlipped(): void {
    const run = G.run!;
    const o = run.opened;
    if (!o) return;
    this.flipAllBtn.setEnabled(false);
    if (o.artifactChoices) {
      this.contBtn.setLabel('TAKE');
      this.contBtn.setEnabled(this.chosenArtifact >= 0);
      if (!this.tags.length) {
        const t = label(this, GAME_W / 2, 186, 'Tap an artifact to choose it.', { color: T.gold, origin: [0.5, 0] });
        this.tags.push(t);
      }
      return;
    }
    // Summary tags: NEW, Will merge!, rarity.
    o.cards.forEach((c, i) => {
      const x = this.spots[i].x + CARD_W / 2;
      let y = this.spots[i].y + CARD_H + 4;
      const items: [string, string][] = [];
      if (c.isNew) items.push(['NEW', T.gold]);
      if (c.willMerge) items.push(['Will merge!', T.good]);
      items.push([RARITY_NAMES[c.rarity], RARITY_TEXT[c.rarity]]);
      for (const [txt, col] of items) {
        const t = label(this, x, y, txt, { color: col, origin: [0.5, 0], font: txt === 'NEW' ? 'title' : 'body' });
        if (txt === 'NEW') this.tweens.add({ targets: t, scale: { from: 1.3, to: 1 }, duration: 300, yoyo: true, repeat: 2 });
        this.tags.push(t);
        y += 10;
      }
    });
    if (o.cards.length) {
      this.tags.push(label(this, GAME_W / 2, 276, o.keep === 1 ? 'Tap the unit you want to keep.' : `Tap ${o.keep} units to keep.`, { color: T.gold, origin: [0.5, 0] }));
    }
    this.contBtn.setLabel('KEEP');
    this.updateKeep();
  }

  private selectCard(i: number): void {
    const o = G.run!.opened;
    if (!o || o.artifactChoices || !this.flipped.every(Boolean)) return;
    const at = this.chosenCards.indexOf(i);
    if (at >= 0) {
      this.chosenCards.splice(at, 1);
      this.cardSel.get(i)?.forEach((g) => g.destroy());
      this.cardSel.delete(i);
    } else {
      // Picking past the limit swaps out the oldest choice.
      if (this.chosenCards.length >= o.keep) this.selectCard(this.chosenCards[0]);
      this.chosenCards.push(i);
      const b = this.spots[i];
      const r = this.add.rectangle(b.x - 3, b.y - 3, CARD_W + 6, CARD_H + 6).setOrigin(0, 0).setStrokeStyle(2, 0xffd24a).setDepth(30);
      const t = label(this, b.x + CARD_W / 2, b.y - 12, 'KEEP', { font: 'title', color: T.gold, origin: [0.5, 0], stroke: true }).setDepth(31);
      this.cardSel.set(i, [r, t]);
      Sfx.play('click');
    }
    this.faces.forEach((f, j) => f?.setAlpha(this.chosenCards.length >= o.keep && !this.chosenCards.includes(j) ? 0.55 : 1));
    this.updateKeep();
  }

  private updateKeep(): void {
    const run = G.run!;
    const o = run.opened;
    if (!o || o.artifactChoices) return;
    this.contBtn.setEnabled(this.chosenCards.length === Math.min(o.keep, o.cards.length));
    this.benchWarn?.destroy();
    this.benchWarn = null;
    const incoming = this.chosenCards.filter((i) => !o.cards[i].willMerge).length;
    if (incoming > freeBenchSlots(run.roster).length) {
      this.benchWarn = label(this, GAME_W / 2, 288, 'Your bench is full: you will choose what to sell next.', { color: T.bad, origin: [0.5, 0] });
    }
  }

  private selectArtifact(i: number): void {
    this.chosenArtifact = i;
    this.artifactSel.forEach((r) => r.destroy());
    this.artifactSel = [];
    const b = this.spots[i];
    const r = this.add.rectangle(b.x - 3, b.y - 3, CARD_W + 6, CARD_H + 6).setOrigin(0, 0).setStrokeStyle(2, 0xffd24a).setDepth(30);
    this.artifactSel.push(r);
    if (this.flipped.every(Boolean)) this.contBtn.setEnabled(true);
  }

  private finish(): void {
    if (this.busy) return;
    const run = G.run!;
    const o = run.opened;
    if (!o) return;
    if (!this.flipped.every(Boolean)) {
      this.flipAll();
      return;
    }
    if (o.artifactChoices && this.chosenArtifact < 0) return;
    if (!o.artifactChoices && this.chosenCards.length < Math.min(o.keep, o.cards.length)) return;
    this.busy = true;
    const merges = collectOpened(run, o.artifactChoices ? Math.max(0, this.chosenArtifact) : this.chosenCards);
    G.saveRun();
    if (merges.length) this.playMerges(merges, () => goRun(this));
    else goRun(this);
  }

  /** The merge animation: copies slide together, flash, and pop out a star higher. */
  private playMerges(merges: MergeEvent[], done: () => void): void {
    const show = merges.slice(0, 4);
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07050b, 0.85).setOrigin(0, 0).setDepth(3000).setInteractive();
    const objs: Phaser.GameObjects.GameObject[] = [shade];
    let idx = 0;
    const next = () => {
      objs.slice(1).forEach((o) => o.destroy());
      objs.length = 1;
      if (idx >= show.length) {
        shade.destroy();
        done();
        return;
      }
      const m = show[idx++];
      const def = getUnit(m.defId);
      const tex = unitTexture(this, def);
      const cy = 170;
      const a = this.add.image(GAME_W / 2 - 90, cy, tex, 0).setScale(2).setDepth(3001);
      const b = this.add.image(GAME_W / 2 + 90, cy, tex, 0).setScale(2).setDepth(3001).setFlipX(true);
      const t = label(this, GAME_W / 2, 90, 'MERGE!', { font: 'title', size: 16, color: T.gold, origin: [0.5, 0.5], stroke: true }).setDepth(3002);
      objs.push(a, b, t);
      Sfx.play('mergeCharge');
      this.tweens.add({
        targets: [a, b],
        x: GAME_W / 2,
        duration: 420,
        ease: 'Quad.easeIn',
        onComplete: () => {
          a.destroy();
          b.destroy();
          this.cameras.main.flash(150, 255, 255, 255);
          Sfx.play('merge');
          this.emitter.setParticleTint(0xffd24a);
          this.emitter.explode(50, GAME_W / 2, cy);
          const big = this.add.image(GAME_W / 2, cy, tex, 0).setScale(0).setDepth(3001);
          objs.push(big);
          this.tweens.add({ targets: big, scale: 3, duration: 380, ease: 'Back.easeOut' });
          const stars = label(this, GAME_W / 2, cy + 56, `${def.name}  ${'★'.repeat(m.star)}`, { font: 'title', color: T.gold, origin: [0.5, 0], stroke: true }).setDepth(3002);
          const sub = label(this, GAME_W / 2, cy + 72, m.star === 3 ? 'Maximum power! Its ultimate gets a big upgrade.' : 'Stronger stats and a stronger ultimate.', { color: T.text, origin: [0.5, 0] }).setDepth(3002);
          objs.push(stars, sub);
          this.time.delayedCall(1100, next);
        },
      });
    };
    shade.on('pointerup', () => {
      // Tap to skip the remaining merges.
      idx = show.length;
    });
    next();
  }
}

// ===================================================================== Overflow

export class OverflowScene extends BaseScene {
  constructor() {
    super('Overflow');
  }

  create(): void {
    this.setup();
    const run = G.run!;
    drawBackdrop(this, run.act, 'menu');
    new RunHud(this, run, this.tip, 'Bench full');
    this.draw();
  }

  private draw(): void {
    const run = G.run!;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const redraw = () => {
      objs.forEach((o) => o.destroy());
      this.draw();
    };
    objs.push(title(this, GAME_W / 2, 28, 'BENCH FULL'));
    const pending = pendingUnits(run.roster);
    const free = freeBenchSlots(run.roster).length;
    objs.push(
      label(this, GAME_W / 2, 42, `${pending.length} new unit${pending.length === 1 ? '' : 's'} need${pending.length === 1 ? 's' : ''} a bench slot (${free} free). Sell new or benched units until everything fits. Units on the board are safe.`, {
        color: T.dim,
        origin: [0.5, 0],
        align: 'center',
        wrap: 520,
      }),
    );
    const row = (units: OwnedUnit[], y: number, heading: string) => {
      objs.push(label(this, 24, y, heading, { font: 'title', color: T.title }));
      units.forEach((u, i) => {
        const x = 12 + i * 62;
        const def = getUnit(u.defId);
        const c = unitCard(this, x, y + 12, def, this.tip);
        const stars = label(this, x + CARD_W - 4, y + 15, '★'.repeat(u.star), { color: T.gold, origin: [1, 0] });
        objs.push(c, stars);
        const val = sellValue(run, u);
        const b = button(this, x, y + 12 + CARD_H + 2, CARD_W, 18, `SELL +${val}`, () => {
          sellUnit(run, u.uid);
          Sfx.play('gold');
          G.saveRun();
          redraw();
        }, { font: 'body' });
        objs.push(b);
      });
      if (!units.length) objs.push(label(this, 24, y + 14, 'Nothing here.', { color: T.dim }));
    };
    row(pending, 66, 'NEW (NO SLOT)');
    row(benchUnits(run.roster), 192, 'BENCH');
    const cont = button(this, GAME_W - 150, 324, 130, 24, pending.length ? `${pending.length} TO PLACE` : 'CONTINUE', () => {
      if (finishOverflow(run)) {
        G.saveRun();
        goRun(this);
      }
    }).setEnabled(pending.length === 0);
    objs.push(cont);
    if (pending.length === 0) this.tweens.add({ targets: cont, scale: { from: 1.08, to: 1 }, duration: 300 });
  }
}
