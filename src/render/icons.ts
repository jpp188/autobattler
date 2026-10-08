/**
 * Generated icons for artifacts and packs.
 */
import Phaser from 'phaser';
import type { ArtifactDef, PackDef } from '../core/types';
import { box, disc, drawGrid, makeTexture, outline, px } from './canvas';
import { shadeHex } from './color';

const ARTIFACT_SHAPES: Record<string, string[]> = {
  pouch: ['....bb....', '...bccb...', '....bb....', '..bAAAAb..', '.bAAAAAAb.', 'bAAaAAAAAb', 'bAAAAAAAAb', 'bAAAAAAAab', '.bAAAAAab.', '..bbbbbb..'],
  mat: ['bbbbbbbbbb', 'bAAAAAAAAb', 'baaaaaaaab', 'bAAAAAAAAb', 'baaaaaaaab', 'bAAAAAAAAb', 'baaaaaaaab', 'bAAAAAAAAb', 'bbbbbbbbbb', '..........'],
  herb: ['....A.....', '...AAA..A.', '..AAaA.AA.', '...AAAAAa.', '.A..bAAA..', 'AAA.b.....', '.AAAb.....', '...Ab.....', '....b.....', '....b.....'],
  stone: ['..........', '...bbbbb..', '..bAAAAAb.', '.bAccAAAAb', '.bAAAAAAab', '.bAAAAAaab', '..baaaaab.', '...bbbbb..', '..........', '..........'],
  seal: ['...bbbb...', '..bAAAAb..', '.bAcAAcAb.', '.bAAAAAAb.', '.bAcAAcAb.', '..bAAAAb..', '...bAAb...', '...bAAb...', '..bbbbbb..', '..baaaab..'],
  banner: ['b.........', 'bAAAAAAA..', 'bAAcAAAAA.', 'bAAAAAAA..', 'bAAcAAAAA.', 'bAAAAAAA..', 'b.........', 'b.........', 'b.........', 'bb........'],
  abacus: ['bbbbbbbbbb', 'b.c.A.c.Ab', 'bbbbbbbbbb', 'bA.c.A.c.b', 'b.A.c.A..b', 'bbbbbbbbbb', 'bc.A..A.cb', 'b..c.A.A.b', 'bbbbbbbbbb', '..........'],
  drum: ['.bbbbbbbb.', 'bccccccccb', 'bAAAAAAAAb', 'bAaAaAaAab', 'bAAAAAAAAb', 'bAaAaAaAab', 'bAAAAAAAAb', 'bccccccccb', '.bbbbbbbb.', '..........'],
  cat: ['.b.....b..', 'bAb...bAb.', 'bAAbbbAAb.', 'bAcAAAcAb.', 'bAAAaAAAb.', '.bAAAAAb..', 'bAAAAAAAbb', 'bAAAAAAAbA', 'bAAAAAAAbb', '.bbbbbbb..'],
  tea: ['..........', '....bb....', '..bbAAbb..', '.bAAAAAAbb', '.bAcAAAAbA', '.bAAAAAAbA', '.bAAAAAAbb', '..bAAAAb..', '...bbbb...', '..........'],
  scale: ['....bb....', '...bAAb...', '..bAAAAb..', '.bAAcAAAb.', 'bAAAAAAAAb', 'bAAAAcAAAb', '.bAAAAAAb.', '..bAAAab..', '...bAab...', '....bb....'],
  scroll: ['.bbbbbbbb.', 'bcAAAAAAcb', '.bAAAAAAb.', '.bAaaaaAb.', '.bAAAAAAb.', '.bAaaaAAb.', '.bAAAAAAb.', 'bcAAAAAAcb', '.bbbbbbbb.', '..........'],
  gong: ['bbbbbbbbbb', 'b........b', 'b..bbbb..b', 'b.bAAAAb.b', 'b.bAcAAb.b', 'b.bAAAAb.b', 'b..bbbb..b', 'b........b', 'b........b', 'bb......bb'],
  standard: ['bcccccc...', 'bAAAAAAA..', 'bAcAAcAAA.', 'bAAAAAAA..', 'bAcAAcAAA.', 'bAAAAAAA..', 'b.........', 'b.........', 'b.........', 'bbb.......'],
  mirror: ['...bbbb...', '..bccccb..', '.bcAAAAcb.', '.bcAcAAcb.', '.bcAAAAcb.', '.bcAAAAcb.', '..bccccb..', '...bbbb...', '....bb....', '...bbbb...'],
  crown: ['..........', 'b...b...b.', 'bb.bAb.bb.', 'bAbAAAbAb.', 'bAAAcAAAb.', 'bAAAAAAAb.', 'bAcAAAcAb.', 'bbbbbbbbb.', '..........', '..........'],
  feather: ['.......bb.', '......bAb.', '.....bAAb.', '....bAAcb.', '...bAAAb..', '..bAAcb...', '..bAAb....', '.bAb......', '.bb.......', 'b.........'],
  gem: ['..........', '..bbbbbb..', '.bAcAAAAb.', 'bAAAAAAAAb', '.bAAAAAAb.', '..bAAAAb..', '...bAAb...', '....bb....', '..........', '..........'],
};

/** 12×12 artifact icon. */
export function artifactTexture(scene: Phaser.Scene, def: ArtifactDef): string {
  const key = `art_${def.id}`;
  if (scene.textures.exists(key)) return key;
  const rows = ARTIFACT_SHAPES[def.icon] ?? ARTIFACT_SHAPES.gem;
  makeTexture(scene, key, 12, 12, (c) => {
    drawGrid(c, 1, 1, rows, { b: '#120c1c', A: def.color, a: shadeHex(def.color, -0.35), c: shadeHex(def.color, 0.5) });
    if (def.tier === 'boss') outline(c, 0, 0, 12, 12, '#ff4a6a');
  });
  return key;
}

/** 40×56 pack art: foil wrapper in the pack colour with its icon. */
export function packTexture(scene: Phaser.Scene, def: PackDef, iconKey?: string, color?: string): string {
  const col = color ?? def.color;
  const key = `pack_${def.id}_${col}_${iconKey ?? def.icon}`;
  if (scene.textures.exists(key)) return key;
  makeTexture(scene, key, 40, 56, (c) => {
    const dark = shadeHex(col, -0.45);
    const mid = shadeHex(col, -0.15);
    const light = shadeHex(col, 0.35);
    box(c, 0, 0, 40, 56, col, '#120c1c');
    // Crimped top and bottom.
    for (let x = 1; x < 39; x += 2) {
      px(c, x, 1, dark, 1, 4);
      px(c, x, 51, dark, 1, 4);
    }
    px(c, 1, 5, '#120c1c', 38, 1);
    px(c, 1, 50, '#120c1c', 38, 1);
    // Foil shine diagonal.
    for (let i = 0; i < 40; i++) {
      px(c, 2 + i, 6 + i, light);
      px(c, 3 + i, 6 + i, light);
    }
    c.clearRect(0, 0, 0, 0);
    // Shade the right side.
    px(c, 34, 6, mid, 5, 44);
    // Emblem disc.
    disc(c, 20, 27, 10, '#120c1c');
    disc(c, 20, 27, 9, '#f3e9d2');
    disc(c, 20, 27, 7, dark);
    // Restore crop of shine outside box.
    px(c, 0, 0, '#120c1c', 40, 1);
    px(c, 0, 55, '#120c1c', 40, 1);
    px(c, 0, 0, '#120c1c', 1, 56);
    px(c, 39, 0, '#120c1c', 1, 56);
    // Gold band.
    px(c, 1, 42, '#c4922a', 38, 3);
    px(c, 1, 43, '#f2c94a', 38, 1);
  });
  return key;
}

export const PACK_ICON_KEY: Record<string, string> = {
  sun: 'ticon_sun',
  horns: 'ticon_horns',
  jade: 'ticon_jade',
  paw: 'ticon_paw',
  sword: 'ticon_sword',
  orb: 'ticon_orb',
  shield: 'ticon_shield',
  moon: 'ticon_moon',
};
