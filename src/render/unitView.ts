/**
 * Visual for one unit on the board or bench: sprite with idle/attack/hit
 * frames, HP bar with shield overlay, ult charge bar and star pips.
 */
import Phaser from 'phaser';
import type { SpriteLook, Star, UnitDef } from '../core/types';
import { C, RARITY_COLOR } from '../ui/theme';
import { Bar } from '../ui/widgets';
import { FRAMES, unitTexture } from './unitSprites';

export interface UnitViewOpts {
  hero?: boolean;
  enemy?: boolean;
  skin?: Partial<SpriteLook>;
  skinId?: string;
  bars?: boolean;
}

export class UnitView extends Phaser.GameObjects.Container {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  hpBar: Bar | null = null;
  chargeBar: Bar | null = null;
  stars: Phaser.GameObjects.Image[] = [];
  stunIcon: Phaser.GameObjects.Image;
  def: UnitDef;
  star: Star;
  size: number;
  private idleTimer: Phaser.Time.TimerEvent;
  private busyUntil = 0;
  private idleFrame = 0;
  offset = { x: 0, y: 0 };
  dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: UnitDef, star: Star, o: UnitViewOpts = {}) {
    super(scene, x, y);
    this.def = def;
    this.star = star;
    this.size = o.hero ? 48 : 32;
    this.shadow = scene.add.image(0, -1, 'shadow').setScale(o.hero ? 1.4 : 1);
    const key = unitTexture(scene, def, { hero: o.hero, skin: o.skin, skinId: o.skinId });
    this.sprite = scene.add.sprite(0, 2, key, FRAMES.idle1).setOrigin(0.5, 1);
    if (o.enemy) this.sprite.setFlipX(true);
    this.add([this.shadow, this.sprite]);
    const top = -this.size + 3;
    if (o.bars !== false) {
      const bw = o.hero ? 26 : 18;
      this.hpBar = new Bar(scene, -bw / 2, top, bw, 3, o.enemy ? C.enemyHp : o.hero ? C.gold : C.hp, 0x07050b);
      this.chargeBar = new Bar(scene, -bw / 2, top + 3, bw, 1, C.charge, 0x07050b);
      this.hpBar.set(1);
      this.chargeBar.set(0);
      this.add([this.hpBar, this.chargeBar]);
    }
    for (let i = 0; i < star; i++) {
      const img = scene.add.image(-((star - 1) * 4) + i * 8, top - 1, 'icon_star').setScale(0.85);
      this.stars.push(img);
      this.add(img);
    }
    // Rarity pip under feet so rarity reads at a glance.
    const pip = scene.add.rectangle(0, 3, o.hero ? 14 : 8, 1, o.hero ? C.gold : RARITY_COLOR[def.rarity]);
    this.add(pip);
    this.stunIcon = scene.add.image(0, top - 10, 'stun').setVisible(false);
    this.add(this.stunIcon);
    this.idleFrame = Math.floor(Math.random() * 2);
    this.idleTimer = scene.time.addEvent({
      delay: 420 + Math.floor(Math.random() * 80),
      loop: true,
      callback: () => {
        if (this.dead || scene.time.now < this.busyUntil) return;
        this.idleFrame ^= 1;
        this.sprite.setFrame(this.idleFrame ? FRAMES.idle2 : FRAMES.idle1);
      },
    });
    this.setSize(this.size, this.size);
    scene.add.existing(this);
  }

  setHp(frac: number, shieldFrac = 0): void {
    this.hpBar?.set(frac, shieldFrac);
  }

  setCharge(frac: number): void {
    this.chargeBar?.set(frac);
    this.chargeBar?.setColor(frac >= 0.999 ? 0xffffff : C.charge);
  }

  setStunned(on: boolean): void {
    this.stunIcon.setVisible(on);
  }

  attack(towardX: number, speed = 1): void {
    if (this.dead) return;
    const now = this.scene.time.now;
    this.busyUntil = now + 240 / speed;
    this.sprite.setFrame(FRAMES.attack1);
    this.scene.time.delayedCall(90 / speed, () => !this.dead && this.sprite.setFrame(FRAMES.attack2));
    this.scene.time.delayedCall(220 / speed, () => !this.dead && this.sprite.setFrame(FRAMES.idle1));
    const dir = Math.sign(towardX - this.x) || 1;
    if (!this.def.look.weapon || this.def.look.weapon !== 'bow') {
      this.scene.tweens.add({ targets: this.sprite, x: dir * 3, duration: 70 / speed, yoyo: true });
    }
    this.sprite.setFlipX(dir < 0);
  }

  hitFlash(): void {
    if (this.dead) return;
    const now = this.scene.time.now;
    if (now < this.busyUntil - 120) return;
    this.sprite.setFrame(FRAMES.hit);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.setFrame(this.idleFrame ? FRAMES.idle2 : FRAMES.idle1));
  }

  die(): void {
    this.dead = true;
    this.idleTimer.remove();
    this.sprite.setFrame(FRAMES.hit);
    this.hpBar?.setVisible(false);
    this.chargeBar?.setVisible(false);
    this.stunIcon.setVisible(false);
    this.scene.tweens.add({ targets: this, alpha: 0, y: this.y + 4, duration: 450, ease: 'Quad.easeIn' });
  }

  setSelected(on: boolean): void {
    this.sprite.setTint(on ? 0xfff2a8 : 0xffffff);
  }

  destroy(fromScene?: boolean): void {
    this.idleTimer?.remove();
    super.destroy(fromScene);
  }
}
