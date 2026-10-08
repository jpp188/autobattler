/**
 * Unit textures. Each unit gets a 5-frame strip: idle 1, idle 2, attack 1,
 * attack 2, hit flash. A real sprite sheet in public/sprites/<key>.png (listed
 * in public/sprites/manifest.json) always wins over the code-drawn sprite.
 */
import Phaser from 'phaser';
import type { SpriteLook, UnitDef } from '../core/types';
import { addFrames, makeTexture } from './canvas';
import { drawUnitFrame } from '../art/drawUnit';
import { RARITY_GLOW } from '../art/palette';

export const FRAMES = { idle1: 0, idle2: 1, attack1: 2, attack2: 3, hit: 4 } as const;
export const FRAME_COUNT = 5;

/** Keys loaded from public/sprites (filled in by the Boot scene). */
export const externalSprites = new Set<string>();

export function spriteSize(_def: UnitDef, isHero: boolean): number {
  return isHero ? 48 : 32;
}

/** Returns the texture key for a unit (generating it on first use). */
export function unitTexture(scene: Phaser.Scene, def: UnitDef, opts: { hero?: boolean; skin?: Partial<SpriteLook>; skinId?: string; enemy?: boolean } = {}): string {
  const skinKey = opts.skinId ?? 'base';
  if (externalSprites.has(def.sprite) && skinKey === 'base') return `ext_${def.sprite}`;
  const key = `unit_${def.id}_${skinKey}`;
  if (scene.textures.exists(key)) return key;
  const size = spriteSize(def, !!opts.hero);
  const look: SpriteLook = { ...def.look, ...(opts.skin ?? {}) };
  const glow = RARITY_GLOW[def.rarity];
  makeTexture(scene, key, size * FRAME_COUNT, size, (ctx) => {
    for (let f = 0; f < FRAME_COUNT; f++) drawUnitFrame(ctx, f * size, 0, size, look, f, glow, !!def.tags?.includes('boss'));
  });
  addFrames(scene, key, size, size, FRAME_COUNT);
  return key;
}

/** A dark silhouette of the unit (collection screen, unseen units). */
export function silhouetteTexture(scene: Phaser.Scene, def: UnitDef): string {
  const key = `sil_${def.id}`;
  if (scene.textures.exists(key)) return key;
  const size = 32;
  makeTexture(scene, key, size, size, (ctx) => {
    drawUnitFrame(ctx, 0, 0, size, def.look, 0, '#2a2236', false, '#2a2236');
  });
  return key;
}
