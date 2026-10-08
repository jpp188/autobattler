import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT } from './layout';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create(): void {
    this.add
      .text(GAME_W / 2, GAME_H / 2, 'PACKBOUND', { fontFamily: FONT, fontSize: '16px', color: '#ffd27a' })
      .setOrigin(0.5);
  }
}
