import Phaser from 'phaser';
import { G } from '../game/state';
import { makeUiTextures } from '../render/uiTextures';
import { externalSprites } from '../render/unitSprites';
import { GAME_W, GAME_H } from './layout';
import { label } from '../ui/widgets';

/**
 * Generates all code-drawn textures, loads any real sprite sheets listed in
 * public/sprites/manifest.json, loads the saves and goes to the title.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    makeUiTextures(this);
    label(this, GAME_W / 2, GAME_H / 2, 'Loading...', { origin: [0.5, 0.5] });
    this.load.json('spriteManifest', 'sprites/manifest.json');
  }

  create(): void {
    const manifest = this.cache.json.get('spriteManifest') as { sprites?: string[] } | undefined;
    const keys = manifest?.sprites ?? [];
    G.load();
    if (!keys.length) {
      this.scene.start('Title');
      return;
    }
    for (const k of keys) this.load.image(`ext_raw_${k}`, `sprites/${k}.png`);
    this.load.once('complete', () => {
      for (const k of keys) {
        const raw = `ext_raw_${k}`;
        if (!this.textures.exists(raw)) continue;
        const src = this.textures.get(raw).getSourceImage() as HTMLImageElement;
        const h = src.height;
        const frames = Math.max(1, Math.floor(src.width / h));
        this.textures.addSpriteSheet(`ext_${k}`, src, { frameWidth: h, frameHeight: h, endFrame: frames - 1 });
        externalSprites.add(k);
      }
      this.scene.start('Title');
    });
    this.load.start();
  }
}
