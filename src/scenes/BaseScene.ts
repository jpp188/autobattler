import Phaser from 'phaser';
import { Tooltip } from '../ui/widgets';
import { GAME_H, GAME_W } from './layout';

/** Common scene setup: background colour, tooltip and a fade-in. */
export class BaseScene extends Phaser.Scene {
  tip!: Tooltip;

  protected setup(bg = 0x120c1c): void {
    this.input.enabled = true;
    this.cameras.main.setBackgroundColor(bg);
    this.cameras.main.fadeIn(160, 7, 5, 11);
    this.tip = new Tooltip(this);
    // Tapping empty space hides a lingering tooltip.
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.tip.hide();
    });
  }

  get W(): number {
    return GAME_W;
  }
  get H(): number {
    return GAME_H;
  }
}
