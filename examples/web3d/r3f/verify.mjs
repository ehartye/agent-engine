// node verify.mjs [--allow-software]
// Drives the app in headless Chromium on a real GPU and checks the renderer-specific lessons through the state probe.
// Needs `npm install` in this folder and Playwright's Chromium (`npx playwright install chromium`). Not part of the
// dependency-free merge check; run it when the renderer, three.js or R3F changes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { gpuArgs, rendererCheck } from '../../web/verify-checks.mjs';
import { consoleGate } from '../core/probe.mjs';

const allowSoftware = process.argv.includes('--allow-software');
// Console text a run may print. Everything else fails the run.
const ALLOWED_CONSOLE = ['THREE.Clock: This module has been deprecated']; // R3F 9.8.1 still creates a THREE.Clock

const checks = [];
const check = (name, pass, detail = '') => { checks.push({ name, pass: Boolean(pass), detail: String(detail) }); };

const server = await createServer({ root: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), logLevel: 'error', server: { port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true, args: gpuArgs() });
const messages = [];

async function open(query = '') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  await page.goto(`${base}${query}`);
  await page.waitForFunction(() => window.__game?.snapshot().ready, null, { timeout: 30000 });
  return page;
}
const snap = (page) => page.evaluate(() => window.__game.snapshot());
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 10000 }).then(() => true, () => false);

try {
  // 1. Flight scene: renderer, readiness, fixed step and real keyboard input.
  let page = await open('?scene=flight');
  let s = await snap(page);
  check('renderer is a hardware GPU', ...(({ pass, detail }) => [pass, detail])(rendererCheck({ webgl2: s.backend === 'webgl2', renderer: s.renderer }, { allowSoftware })));
  check('ready means drawn: two frames drawn, draw calls counted, backend known', s.ready && s.framesDrawn >= 2 && s.drawCalls > 0 && s.backend === 'webgl2', `framesDrawn ${s.framesDrawn}, drawCalls ${s.drawCalls}, backend ${s.backend}`);
  check('the probe reports the versions it was built with', s.versions.three && s.versions.react && s.versions.fiber, JSON.stringify(s.versions));

  const t0 = await snap(page); await page.waitForTimeout(1000); const t1 = await snap(page);
  const rate = t1.steps - t0.steps;
  check('the fixed step runs about 60 times a second', rate >= 45 && rate <= 75, `${rate} steps in 1 s`);

  await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.up('KeyD');
  s = await snap(page);
  check('yaw > 0 turns the rendered nose toward +X', s.ship.yaw > 0.5 && s.nose[0] > 0.4, `yaw ${s.ship.yaw.toFixed(2)}, rendered nose x ${s.nose[0].toFixed(2)}`);
  await page.keyboard.down('KeyS'); await page.waitForTimeout(600); await page.keyboard.up('KeyS');
  s = await snap(page);
  check('pitch > 0 points the rendered nose down', s.ship.pitch > 0.3 && s.nose[1] < -0.2, `pitch ${s.ship.pitch.toFixed(2)}, rendered nose y ${s.nose[1].toFixed(2)}`);
  await page.close();

  // 2. A single key press (down and up in one tick) must still fire exactly once.
  page = await open('?scene=fire');
  await page.keyboard.press('Space');
  const hit = await until(page, () => window.__game.snapshot().hits >= 1);
  s = await snap(page);
  check('one key press fires one shot that sweeps into the target', hit && s.fired === 1 && s.hits === 1, `fired ${s.fired}, hits ${s.hits}, rocks alive ${s.rocksAlive}`);
  await page.close();

  // 3. MeshToonMaterial reads only the red channel of a gradient map; the patch restores colour.
  page = await open('?scene=toon');
  await until(page, () => window.__game.lab);
  const grey = await page.evaluate(() => window.__game.lab.centre(false));
  const coloured = await page.evaluate(() => window.__game.lab.centre(true));
  check('an unpatched toon ramp renders grey', Math.abs(grey[0] - grey[1]) < 12 && Math.abs(grey[1] - grey[2]) < 12 && grey[0] > 100, `rgb ${grey.slice(0, 3)}`);
  check('the patched toon ramp keeps its colour', coloured[0] - coloured[1] > 60, `rgb ${coloured.slice(0, 3)}`);
  await page.close();

  // 4. Outlines: a screen-space line has the same thickness near and far; a world-space one vanishes on a far object.
  page = await open('?scene=outline');
  await until(page, () => window.__game.lab);
  const px = (a) => page.evaluate((args) => window.__game.lab.thickness(args), a);
  const farScreen = await px({ mode: 'screen', radius: 40, distance: 300, amount: 0.008 });
  const nearScreen = await px({ mode: 'screen', radius: 2, distance: 20, amount: 0.008 });
  const farWorld = await px({ mode: 'world', radius: 40, distance: 300, amount: 0.18 });
  const nearWorld = await px({ mode: 'world', radius: 2, distance: 20, amount: 0.18 });
  check('a screen-space outline is the same thickness near and far', farScreen >= 3 && nearScreen >= 3 && Math.abs(farScreen - nearScreen) <= 1.5, `far ${farScreen} px, near ${nearScreen} px`);
  check('a world-space outline vanishes on a far object', farWorld < 1 && nearWorld >= 2, `far ${farWorld} px, near ${nearWorld} px`);
  await page.close();

  // 5. Instancing collapses draw calls.
  page = await open('?scene=instancing');
  await until(page, () => window.__game.lab);
  const meshes = await page.evaluate(() => window.__game.lab.drawCalls('meshes'));
  const inst = await page.evaluate(() => window.__game.lab.drawCalls('instanced'));
  check('1,000 meshes cost about 1,000 draw calls; one InstancedMesh costs 1', meshes >= 900 && inst === 1, `meshes ${meshes}, instanced ${inst}`);
  await page.close();

  const extra = consoleGate(messages, ALLOWED_CONSOLE);
  check('the console is clean (zero-warning gate)', extra.length === 0, extra.join(' | '));
} catch (e) {
  check('verifier ran to the end', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e);
} finally {
  await browser.close();
  await server.close();
}

mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL('./results/report.json', import.meta.url), JSON.stringify({ checks }, null, 2));
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
const failed = checks.filter((c) => !c.pass).length;
console.log(`${checks.length - failed} of ${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
