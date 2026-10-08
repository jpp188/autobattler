/**
 * Code-drawn unit sprites. (Placeholder shapes; the full pixel-art composer
 * replaces the body drawing in the art pass.)
 */
import type { SpriteLook } from '../core/types';
import { shade } from './palette';

type Ctx = CanvasRenderingContext2D;

function fill(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, c: string) {
  ctx.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y) + 0.3);
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

function outlineRegion(ctx: Ctx, x0: number, y0: number, w: number, h: number, color: string) {
  const img = ctx.getImageData(x0, y0, w, h);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ctx.fillRect(x0 + x, y0 + y, 1, 1);
}

function flattenRegion(ctx: Ctx, x0: number, y0: number, w: number, h: number, color: string) {
  const img = ctx.getImageData(x0, y0, w, h);
  const n = parseInt(color.slice(1), 16);
  for (let i = 0; i < img.data.length; i += 4)
    if (img.data[i + 3] > 0) {
      img.data[i] = (n >> 16) & 255;
      img.data[i + 1] = (n >> 8) & 255;
      img.data[i + 2] = n & 255;
    }
  ctx.putImageData(img, x0, y0);
}

/**
 * Draws one animation frame into a size×size cell at (ox, oy).
 * Frames: 0/1 idle, 2/3 attack, 4 hit flash.
 */
export function drawUnitFrame(ctx: Ctx, ox: number, oy: number, size: number, look: SpriteLook, frame: number, glow: string, boss: boolean, flat?: string): void {
  const s = size / 32;
  const bob = frame === 1 ? 1 : 0;
  const lean = frame === 2 ? -1 : frame === 3 ? 2 : 0;
  const cx = ox + Math.round(16 * s) + lean;
  const baseY = oy + size - 3;
  const bodyW = Math.round((look.big ? 16 : 13) * s);
  const bodyH = Math.round((look.body === 'beast' || look.body === 'serpent' ? 11 : 13) * s);
  // Body.
  fill(ctx, cx - (bodyW >> 1), baseY - bodyH + bob, bodyW, bodyH, shade(look.main, 1));
  fill(ctx, cx - (bodyW >> 1) + 1, baseY - bodyH + bob, bodyW - 3, Math.max(2, bodyH - 3), shade(look.main, 2));
  fill(ctx, cx - 2, baseY - bodyH + 2 + bob, 4, 2, shade(look.accent, 2));
  // Head.
  const headR = Math.round(5 * s);
  const headY = baseY - bodyH - headR + 1 + bob;
  disc(ctx, cx, headY, headR, shade(look.skin, 2));
  if (look.hairStyle !== 'none' && look.hair !== 'none') fill(ctx, cx - headR, headY - headR, headR * 2 + 1, Math.max(2, headR - 1), shade(look.hair, 1));
  fill(ctx, cx + 1, headY, 1, 2, shade('ink', 0));
  fill(ctx, cx + 3, headY, 1, 2, shade('ink', 0));
  // Weapon.
  if (look.weapon && look.weapon !== 'none') {
    const wx = cx + (bodyW >> 1) + (frame >= 2 ? 2 : 0);
    fill(ctx, wx, baseY - bodyH - (frame === 3 ? 6 : 2) + bob, 2, Math.round(12 * s), shade('steel', 2));
  }
  outlineRegion(ctx, ox, oy, size, size, '#120c1c');
  if (frame === 4) flattenRegion(ctx, ox, oy, size, size, '#ffffff');
  if (flat) flattenRegion(ctx, ox, oy, size, size, flat);
  else if (frame !== 4) {
    // Rarity glow pixel line under the feet.
    fill(ctx, cx - 6, oy + size - 2, 12, 1, glow);
    if (boss) fill(ctx, cx - 9, oy + size - 1, 18, 1, '#ff4a4a');
  }
}
