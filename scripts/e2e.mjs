/**
 * End-to-end check: builds nothing itself; run `npm run build` first (or use
 * `npm run e2e`, which does). Serves dist/ with `vite preview`, then plays
 * Title → Hero select → starter pack → pack opening → map → first battle →
 * results → rewards at three viewports (the phone one with touch only),
 * saving screenshots to screenshots/ and failing on any console error.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720, touch: false },
  { name: '1920x1080', width: 1920, height: 1080, touch: false },
  { name: '844x390-touch', width: 844, height: 390, touch: true },
];

mkdirSync('screenshots', { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error('Preview server did not start');
}

/** Finds a visible, enabled button (or a named object) in the active scenes and returns its page position. */
async function locate(page, what) {
  return page.evaluate((what) => {
    const game = window.__packbound;
    const canvas = game.canvas.getBoundingClientRect();
    const zoom = canvas.width / game.scale.width;
    const walk = (list, out) => {
      for (const o of list) {
        out.push(o);
        if (o.list) walk(o.list, out);
      }
      return out;
    };
    const visible = (o) => {
      for (let p = o; p; p = p.parentContainer) if (!p.visible || p.alpha === 0) return false;
      return true;
    };
    for (const scene of game.scene.getScenes(true)) {
      const all = walk(scene.children.list, []);
      // Topmost first.
      for (const o of all.reverse()) {
        const isButton = o.text && typeof o.bw === 'number' && o.enabled && o.text.text === what;
        if ((isButton || o.name === what) && visible(o)) {
          const b = o.getBounds();
          return { x: canvas.left + (b.x + b.width / 2) * zoom, y: canvas.top + (b.y + b.height / 2) * zoom, scene: scene.scene.key };
        }
      }
    }
    return null;
  }, what);
}

async function press(page, touch, what, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const at = await locate(page, what);
    const ready = at && (await page.evaluate(() => window.__packbound.scene.getScenes(true).every((s) => s.input.enabled && !s.cameras.main.fadeEffect.isRunning)));
    if (at && ready) {
      if (touch) await page.touchscreen.tap(at.x, at.y);
      else await page.mouse.click(at.x, at.y);
      await sleep(450);
      return true;
    }
    await sleep(150);
  }
  throw new Error(`Could not find "${what}"`);
}

async function maybe(page, touch, what) {
  const at = await locate(page, what);
  if (at) await press(page, touch, what);
  return !!at;
}

async function scene(page) {
  return page.evaluate(() => window.__packbound.scene.getScenes(true).map((s) => s.scene.key).join(','));
}

async function run(vp) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__packbound?.scene.isActive('Title'));
  await sleep(600);
  const shot = async (name) => page.screenshot({ path: `screenshots/${vp.name}-${name}.png` });
  await shot('1-title');
  await press(page, vp.touch, 'NEW RUN');
  await shot('2-hero-select');
  await press(page, vp.touch, 'START AS KAEDE');
  await sleep(300);
  await shot('3-starter');
  await press(page, vp.touch, 'CHOOSE');
  await sleep(300);
  await press(page, vp.touch, 'FLIP ALL');
  await sleep(1800);
  // The starter keeps 2 of its 4 units.
  await press(page, vp.touch, 'card-0');
  await press(page, vp.touch, 'card-2');
  await shot('4-pack-opening');
  await press(page, vp.touch, 'KEEP');
  await sleep(1500);
  // Merges or overflow may come before the map.
  for (let i = 0; i < 3 && !(await scene(page)).includes('Map'); i++) {
    await maybe(page, vp.touch, 'CONTINUE');
    await sleep(800);
  }
  await maybe(page, vp.touch, 'GOT IT');
  await shot('5-map');
  await press(page, vp.touch, 'node-available');
  await sleep(600);
  await maybe(page, vp.touch, 'GOT IT');
  await shot('6-battle-setup');
  await press(page, vp.touch, 'FIGHT!');
  await sleep(2500);
  await shot('7-battle');
  await press(page, vp.touch, 'SKIP');
  await sleep(1200);
  await shot('8-results');
  await press(page, vp.touch, 'CONTINUE');
  await sleep(1500);
  await shot('9-rewards');
  const where = await scene(page);
  await browser.close();
  if (!where.includes('Reward')) errors.push(`Expected the reward screen, ended on ${where}`);
  return errors;
}

let failed = false;
try {
  await waitForServer();
  for (const vp of VIEWPORTS) {
    const errors = await run(vp);
    console.log(`${vp.name}: ${errors.length ? 'FAILED' : 'ok'}`);
    for (const e of errors) console.log('  ', e);
    if (errors.length) failed = true;
  }
} catch (e) {
  console.error(e);
  failed = true;
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
