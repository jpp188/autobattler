/**
 * Maps the run's current screen to a Phaser scene and switches to it.
 */
import type Phaser from 'phaser';
import type { Screen } from '../core/run';
import { G } from './state';

const SCREEN_SCENES: Record<Screen, string> = {
  starter: 'Starter',
  map: 'Map',
  battle: 'Battle',
  reward: 'Reward',
  packOpen: 'PackOpen',
  overflow: 'Overflow',
  shop: 'Shop',
  event: 'Event',
  rest: 'Rest',
  treasure: 'Treasure',
  artifactPick: 'Reward',
  over: 'RunEnd',
  victory: 'RunEnd',
};

/** Saves and goes to whatever scene the run's state calls for. */
export function goRun(scene: Phaser.Scene): void {
  if (!G.run) {
    goTo(scene, 'Title');
    return;
  }
  G.saveRun();
  goTo(scene, SCREEN_SCENES[G.run.screen]);
}

export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning) return;
  scene.input.enabled = false;
  cam.fadeOut(140, 7, 5, 11);
  cam.once('camerafadeoutcomplete', () => {
    scene.scene.start(key, data);
  });
}
