/**
 * Generates every UI texture in code at boot: 9-slice frames, icons, hexes,
 * particles. Lacquer-and-gold frames to match the Eastern fantasy setting.
 */
import Phaser from 'phaser';
import { box, disc, drawGrid, makeTexture, px, type Ctx } from './canvas';

function frame(ctx: Ctx, w: number, h: number, outer: string, rim: string, fill: string, hi: string, lo: string): void {
  // Outer dark edge with clipped corners.
  px(ctx, 1, 0, outer, w - 2, h);
  px(ctx, 0, 1, outer, w, h - 2);
  // Gold rim.
  px(ctx, 2, 1, rim, w - 4, h - 2);
  px(ctx, 1, 2, rim, w - 2, h - 4);
  // Fill.
  px(ctx, 2, 2, fill, w - 4, h - 4);
  // Inner highlight / shadow lines.
  px(ctx, 3, 2, hi, w - 6, 1);
  px(ctx, 3, h - 3, lo, w - 6, 1);
  // Corner studs.
  for (const [x, y] of [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ])
    px(ctx, x, y, rim);
}

const ICONS: Record<string, string[]> = {
  sun: ['..y.y.y..', '...yyy...', '.yyYYYyy.', '..yYYYy..', 'yyYYYYYyy', '..yYYYy..', '.yyYYYyy.', '...yyy...', '..y.y.y..'],
  horns: ['r.......r', 'rr.....rr', '.rr...rr.', '..rRRRr..', '..RRRRR..', '.RRwRwRR.', '.RRRRRRR.', '..RrrrR..', '...RRR...'],
  jade: ['...ggg...', '..gGGGg..', '.gGG.GGg.', 'gGG...GGg', 'gG..o..Gg', 'gGG...GGg', '.gGG.GGg.', '..gGGGg..', '...ggg...'],
  paw: ['.c.....c.', 'ccc...ccc', '.c..c..c.', '...ccc...', '.c..c..c.', '..CCCCC..', '.CCCCCCC.', '.CCCCCCC.', '..CC.CC..'],
  sword: ['........w', '.......ww', '......ww.', '.....ww..', 'y...ww...', '.y.ww....', '..yw.....', '.oyy.....', 'o..y.....'],
  orb: ['...ppp...', '..pPPPp..', '.pPwPPPp.', '.pPPPPPp.', '.pPPPPPp.', '..pPPPp..', '...ppp...', '..yyyyy..', '.yyyyyyy.'],
  shield: ['.bbbbbbb.', 'bBBBBBBBb', 'bBByyyBBb', 'bBByBByBb', 'bBByyyBBb', '.bBBBBBb.', '.bBBBBBb.', '..bBBBb..', '...bbb...'],
  moon: ['...vvv...', '..vVV....', '.vVV.....', 'vVV......', 'vVV......', 'vVV......', '.vVV.....', '..vVV....', '...vvv...'],
};
const ICON_COLORS: Record<string, string> = {
  y: '#f2c94a',
  Y: '#fff2a8',
  r: '#6e1a2a',
  R: '#e8504a',
  w: '#f4f6ff',
  g: '#1f8a5e',
  G: '#3fd08a',
  o: '#c4621e',
  c: '#1e8a9a',
  C: '#3ccfd8',
  p: '#6e2a8a',
  P: '#a650c8',
  b: '#2a5ab8',
  B: '#4a92f2',
  v: '#5a56b8',
  V: '#9a9ae8',
};

export function makeUiTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'ui_panel', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#c9a36a', '#2a1f3d', '#3d2f57', '#1a1226'));
  makeTexture(scene, 'ui_dark', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#6b4f2e', '#1a1226', '#2a1f3d', '#120c1c'));
  makeTexture(scene, 'ui_inset', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#3d2f57', '#120c1c', '#07050b', '#2a1f3d'));
  makeTexture(scene, 'ui_card', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#e8d7a8', '#3a2a1a', '#5a4430', '#2a1a10'));
  makeTexture(scene, 'ui_btn', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#c9a36a', '#8a2a3a', '#b8404e', '#5a1a26'));
  makeTexture(scene, 'ui_btn_hover', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#fff2a8', '#a83448', '#d85a64', '#6e1e2e'));
  makeTexture(scene, 'ui_btn_down', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#c9a36a', '#5a1a26', '#5a1a26', '#8a2a3a'));
  makeTexture(scene, 'ui_btn_off', 16, 16, (c) => frame(c, 16, 16, '#07050b', '#6b5a4a', '#3a3040', '#463a52', '#2a2236'));

  // Gold coin.
  makeTexture(scene, 'icon_gold', 8, 8, (c) => {
    disc(c, 4, 4, 3, '#7a5418');
    disc(c, 4, 4, 2, '#f2c94a');
    px(c, 3, 2, '#fff2a8', 1, 2);
  });
  // Heart.
  makeTexture(scene, 'icon_heart', 8, 8, (c) =>
    drawGrid(c, 0, 0, ['.rr.rr..', 'rRRrRRr.', 'rRwRRRr.', 'rRRRRRr.', '.rRRRr..', '..rRr...', '...r....'], { r: '#6e1a2a', R: '#e8504a', w: '#ff9a7a' }),
  );
  makeTexture(scene, 'icon_star', 7, 7, (c) =>
    drawGrid(c, 0, 0, ['...y...', '..yYy..', 'yyYYYyy', '.yYYYy.', '.yYyYy.', 'yy...yy', '.......'], { y: '#c4922a', Y: '#fff2a8' }),
  );
  makeTexture(scene, 'icon_sword', 9, 9, (c) => drawGrid(c, 0, 0, ICONS.sword, ICON_COLORS));
  for (const [k, rows] of Object.entries(ICONS)) makeTexture(scene, `ticon_${k}`, 9, 9, (c) => drawGrid(c, 0, 0, rows, ICON_COLORS));

  // Hex tiles (pointy-top, 32 wide, 26 tall incl. a 2px side).
  const hex = (key: string, top: string, edge: string, side: string) =>
    makeTexture(scene, key, 32, 26, (c) => {
      const rows = 22;
      for (let y = 0; y < rows; y++) {
        const t = y < 6 ? y / 6 : y > rows - 7 ? (rows - 1 - y) / 6 : 1;
        const half = Math.round(8 + 8 * t);
        const color = y === 0 || y === rows - 1 ? edge : top;
        px(c, 16 - half, y, color, half * 2, 1);
        px(c, 16 - half, y, edge);
        px(c, 15 + half, y, edge);
      }
      for (let y = rows; y < rows + 3; y++) {
        const half = Math.round(8 + 8 * ((rows + 2 - y) / 6)) - 2;
        px(c, 16 - half, y, side, half * 2, 1);
      }
    });
  hex('hex_player', '#2c3a5a', '#4a5e8a', '#141a2a');
  hex('hex_enemy', '#4a2a3a', '#7a4256', '#22121a');
  hex('hex_hover', '#4a6a9a', '#a8d4ff', '#1a2a4a');
  hex('hex_target', '#3a6a4a', '#7fe08a', '#143a1e');

  // Bench slot.
  makeTexture(scene, 'slot', 30, 30, (c) => {
    box(c, 0, 0, 30, 30, '#1a1226', '#463a52');
    px(c, 1, 1, '#2a2236', 28, 1);
  });
  makeTexture(scene, 'slot_hover', 30, 30, (c) => box(c, 0, 0, 30, 30, '#2a3a5a', '#a8d4ff'));

  // Particles.
  makeTexture(scene, 'px', 2, 2, (c) => px(c, 0, 0, '#ffffff', 2, 2));
  makeTexture(scene, 'px1', 1, 1, (c) => px(c, 0, 0, '#ffffff'));
  makeTexture(scene, 'spark', 5, 5, (c) => drawGrid(c, 0, 0, ['..w..', '..w..', 'wwWww', '..w..', '..w..'], { w: '#ffffff', W: '#ffffff' }));
  makeTexture(scene, 'ring', 16, 16, (c) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d > 5.6 && d <= 7.6) px(c, x, y, '#ffffff');
      }
  });
  makeTexture(scene, 'shadow', 20, 6, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.45)';
    for (let y = 0; y < 6; y++) {
      const half = Math.round(10 * Math.sqrt(1 - ((y - 2.5) / 3) ** 2));
      c.fillRect(10 - half, y, half * 2, 1);
    }
  });
  makeTexture(scene, 'stun', 12, 5, (c) => drawGrid(c, 0, 0, ['.y...y...y..', 'yYy.yYy.yYy.', '.y...y...y..'], { y: '#c4922a', Y: '#fff2a8' }));
  makeTexture(scene, 'white', 4, 4, (c) => px(c, 0, 0, '#ffffff', 4, 4));
}
