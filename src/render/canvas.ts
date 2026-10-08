/**
 * Helpers for drawing pixel textures into Phaser canvas textures.
 */
import Phaser from 'phaser';

export type Ctx = CanvasRenderingContext2D;

/** Creates (or replaces) a canvas texture and lets `draw` paint it. */
export function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
}

/** Adds a spritesheet-style frame grid to an existing canvas texture. */
export function addFrames(scene: Phaser.Scene, key: string, frameW: number, frameH: number, count: number): void {
  const tex = scene.textures.get(key);
  for (let i = 0; i < count; i++) tex.add(i, 0, i * frameW, 0, frameW, frameH);
}

export function px(ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Draws a filled rectangle with a 1px border. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, border?: string): void {
  if (border) {
    px(ctx, x, y, border, w, h);
    px(ctx, x + 1, y + 1, fill, w - 2, h - 2);
  } else px(ctx, x, y, fill, w, h);
}

/** Pixel-perfect filled circle. */
export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y) + 0.3);
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

/** Pixel-perfect ellipse. */
export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + 0.3);
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

/** Draws a string-art grid: each char maps to a colour via `map` ('.' = clear). */
export function drawGrid(ctx: Ctx, ox: number, oy: number, rows: readonly string[], map: Record<string, string>, flip = false): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = map[ch];
      if (!c) continue;
      px(ctx, ox + (flip ? row.length - 1 - x : x), oy + y, c);
    }
  });
}

/** Adds a 1px outline of `color` around all opaque pixels in a region. */
export function outline(ctx: Ctx, x0: number, y0: number, w: number, h: number, color: string): void {
  const img = ctx.getImageData(x0, y0, w, h);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  const marks: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 0) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) marks.push([x, y]);
    }
  ctx.fillStyle = color;
  for (const [x, y] of marks) ctx.fillRect(x0 + x, y0 + y, 1, 1);
}

/** Recolours every opaque pixel in a region to a single colour (hit flash, silhouettes). */
export function flatten(ctx: Ctx, x0: number, y0: number, w: number, h: number, color: string, alphaMin = 1): void {
  const img = ctx.getImageData(x0, y0, w, h);
  const n = parseInt(color.slice(1), 16);
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] >= alphaMin) {
      img.data[i] = (n >> 16) & 255;
      img.data[i + 1] = (n >> 8) & 255;
      img.data[i + 2] = n & 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}
