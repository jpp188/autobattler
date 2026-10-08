import Phaser from 'phaser';
import { GAME_W, GAME_H } from './scenes/layout';
import { SCENES } from './scenes';

/**
 * Integer scaling with letterboxing. When the window is at least twice the
 * internal resolution the zoom snaps to a whole number so pixels stay square;
 * on small screens (phones) it falls back to a fractional fit so the game
 * still fills the screen.
 */
function computeZoom(): number {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  return s >= 2 ? Math.floor(s) : Math.max(0.5, s);
}

async function start(): Promise<void> {
  try {
    await Promise.all([document.fonts.load('8px PressStart2P'), document.fonts.load('8px Tiny5')]);
  } catch {
    // The game still runs with the fallback font.
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#07050b',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: computeZoom(),
    },
    input: { activePointers: 3 },
    disableContextMenu: true,
    scene: SCENES,
  });
  const resize = () => {
    game.scale.setZoom(computeZoom());
  };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  (window as unknown as { __packbound: Phaser.Game }).__packbound = game;
}

void start();
