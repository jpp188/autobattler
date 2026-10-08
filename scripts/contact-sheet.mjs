/**
 * Renders a contact sheet of every code-drawn sprite (pack units, enemies,
 * summons, Heroes and every Hero skin), frames 0-4, at 4x zoom, into
 * screenshots/contact-sheet.png. Also writes screenshots/contact-sheet-1x.png
 * (frame 0 only, at 1x and 2x on a board-coloured background) to judge
 * readability at game scale.
 *
 *   node scripts/contact-sheet.mjs [out.png]
 *
 * Bundles src/art + src/data with esbuild and draws in headless Chromium, so
 * it uses exactly the same code as the game (no Phaser needed).
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] ?? 'screenshots/contact-sheet.png');
const out1x = out.replace(/\.png$/, '-1x.png');
mkdirSync(dirname(out), { recursive: true });

const entry = `
import { drawUnitFrame } from './src/art/drawUnit';
import { RARITY_GLOW } from './src/art/palette';
import { UNITS } from './src/data/units';
import { ENEMIES } from './src/data/enemies';
import { HEROES } from './src/data/heroes';
import { SUMMONS } from './src/data/summons';

const rows = [];
for (const u of UNITS) rows.push({ label: u.name, def: u, size: 32, look: u.look });
for (const u of ENEMIES) rows.push({ label: u.name, def: u, size: 32, look: u.look });
for (const u of SUMMONS) rows.push({ label: u.name, def: u, size: 32, look: u.look });
for (const h of HEROES) for (const s of h.skins) rows.push({ label: h.name + ' / ' + s.name, def: h, size: 48, look: { ...h.look, ...s.look } });

function sheet() {
  const Z = 4, COLS = 3, LABEL = 150, cellW = LABEL + 5 * 48 * Z + 12, cellH = 48 * Z + 8;
  const nRows = Math.ceil(rows.length / COLS);
  const out = document.createElement('canvas');
  out.width = cellW * COLS; out.height = cellH * nRows;
  const o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  o.fillStyle = '#1b1626'; o.fillRect(0, 0, out.width, out.height);
  const t0 = performance.now();
  rows.forEach((row, i) => {
    const c = document.createElement('canvas');
    c.width = row.size * 5; c.height = row.size;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    for (let f = 0; f < 5; f++) drawUnitFrame(ctx, f * row.size, 0, row.size, row.look, f, RARITY_GLOW[row.def.rarity], !!row.def.tags?.includes('boss'));
    const x = (i % COLS) * cellW, y = Math.floor(i / COLS) * cellH;
    o.fillStyle = (Math.floor(i / COLS) + (i % COLS)) % 2 ? '#2b2440' : '#332b4a';
    o.fillRect(x, y, cellW - 4, cellH - 4);
    o.fillStyle = '#e8e0ff'; o.font = '13px monospace';
    const words = row.label.split(' ');
    let line = '', ly = y + 18;
    for (const w of words) { if ((line + w).length > 18) { o.fillText(line, x + 6, ly); ly += 15; line = ''; } line += w + ' '; }
    o.fillText(line, x + 6, ly);
    o.fillStyle = '#9a90b8'; o.fillText(row.def.rarity, x + 6, ly + 16);
    for (let f = 0; f < 5; f++) {
      const fx = x + LABEL + f * 48 * Z + ((48 - row.size) / 2) * Z;
      o.drawImage(c, f * row.size, 0, row.size, row.size, fx, y + 4 + (48 - row.size) * Z, row.size * Z, row.size * Z);
    }
  });
  const ms = performance.now() - t0;

  // 1x / 2x board-scale preview, frame 0 only.
  const per = 20;
  const small = document.createElement('canvas');
  const n = rows.length;
  small.width = per * 52 * 3; small.height = Math.ceil(n / per) * 52 * 3 + 8;
  const s = small.getContext('2d');
  s.imageSmoothingEnabled = false;
  s.fillStyle = '#3a4a3a'; s.fillRect(0, 0, small.width, small.height);
  rows.forEach((row, i) => {
    const c = document.createElement('canvas');
    c.width = row.size; c.height = row.size;
    drawUnitFrame(c.getContext('2d', { willReadFrequently: true }), 0, 0, row.size, row.look, 0, RARITY_GLOW[row.def.rarity], !!row.def.tags?.includes('boss'));
    const x = (i % per) * 52, y = Math.floor(i / per) * 52;
    s.drawImage(c, x + (48 - row.size) / 2, y + (48 - row.size));
    s.drawImage(c, 0, 0, row.size, row.size, x * 2, Math.ceil(n / per) * 52 + y * 2 + 8, row.size * 2, row.size * 2);
  });
  return { big: out.toDataURL('image/png'), small: small.toDataURL('image/png'), ms, n: rows.length };
}
window.__sheet = sheet;
`;

const res = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true,
  format: 'iife',
  write: false,
  platform: 'browser',
  logLevel: 'error',
});
const code = res.outputFiles[0].text;

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: code });
const result = await page.evaluate(() => window.__sheet());
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(out, Buffer.from(result.big.split(',')[1], 'base64'));
writeFileSync(out1x, Buffer.from(result.small.split(',')[1], 'base64'));
console.log(`${result.n} sprites drawn in ${result.ms.toFixed(0)} ms -> ${out}, ${out1x}`);
