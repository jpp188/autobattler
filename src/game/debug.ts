/**
 * Development-only console helpers (window.__pb), used by the Playwright
 * screenshot scripts to jump the run to a given screen with the sim bot.
 * Not included in production builds.
 */
import type Phaser from 'phaser';
import { botStep } from '../core/bot';
import { Rng } from '../core/rng';
import type { Screen } from '../core/run';
import { goRun } from './router';
import { G } from './state';

export function installDebug(game: Phaser.Game): void {
  const rng = new Rng(1234);
  const api = {
    game,
    G,
    /** Advances the run with the bot until it reaches `screen` (or `max` steps). */
    until(screen: Screen, max = 400): boolean {
      for (let i = 0; i < max && G.run; i++) {
        if (G.run.screen === screen) break;
        botStep(G.run, rng);
      }
      G.saveRun();
      return G.run?.screen === screen;
    },
    /** Re-enters whichever scene the run's state calls for. */
    show(): void {
      const active = game.scene.getScenes(true)[0];
      if (active) goRun(active);
    },
  };
  (window as unknown as { __pb: typeof api }).__pb = api;
}
