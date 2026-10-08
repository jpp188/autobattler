import Phaser from 'phaser';
import { G } from '../game/state';
import { Sfx } from '../audio/sfx';
import { T } from '../ui/theme';
import { label, panel, Tooltip } from '../ui/widgets';
import { GAME_H, GAME_W } from './layout';

/** Common scene setup: background colour, tooltip and a fade-in. */
export class BaseScene extends Phaser.Scene {
  tip!: Tooltip;

  protected setup(bg = 0x120c1c): void {
    this.toastBusy = false;
    this.input.enabled = true;
    this.cameras.main.setBackgroundColor(bg);
    this.cameras.main.fadeIn(160, 7, 5, 11);
    this.tip = new Tooltip(this);
    // Tapping empty space hides a lingering tooltip.
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.tip.hide();
    });
    // Achievement toasts: shown here, or in the next scene if this one ends first.
    const drain = () => this.time.delayedCall(250, () => this.showToasts());
    G.onAchievement = drain;
    drain();
  }

  private toastBusy = false;

  private showToasts(): void {
    if (this.toastBusy || !G.toastQueue.length || !this.sys.isActive()) return;
    const a = G.toastQueue.shift()!;
    this.toastBusy = true;
    Sfx.play('reveal_epic');
    const w = 200;
    const box = panel(this, 0, 0, w, 30, 'panel');
    const icon = this.add.image(10, 8, 'icon_star').setOrigin(0, 0).setScale(1.5);
    const t1 = label(this, 32, 5, 'ACHIEVEMENT UNLOCKED', { font: 'title', color: T.gold });
    const t2 = label(this, 32, 17, a.name, { color: T.text });
    const c = this.add.container(GAME_W - w - 6, -34, [box, icon, t1, t2]).setDepth(6000);
    this.tweens.add({
      targets: c,
      y: 22,
      duration: 260,
      ease: 'Back.Out',
      hold: 2200,
      yoyo: true,
      onComplete: () => {
        c.destroy();
        this.toastBusy = false;
        this.showToasts();
      },
    });
  }

  get W(): number {
    return GAME_W;
  }
  get H(): number {
    return GAME_H;
  }
}
