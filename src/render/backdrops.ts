/**
 * Per-act layered pixel backgrounds.
 */
import Phaser from 'phaser';

export function drawBackdrop(scene: Phaser.Scene, act: number, _mode: 'battle' | 'map' | 'menu'): void {
  const colors = [0x1e2a1e, 0x1a2a1c, 0x2a2030, 0x1a1a3a];
  scene.add.rectangle(0, 0, 640, 360, colors[act] ?? 0x120c1c).setOrigin(0, 0).setDepth(-10);
}
