// node verify.mjs [--allow-software]
// Drives the app in headless Chromium on a real GPU and checks the Babylon.js-specific lessons through the state probe.
// Needs `npm install` in this folder and Playwright's Chromium (`npx playwright install chromium`). Not part of the
// dependency-free merge check; run it when Babylon.js or the renderer code changes. `npm test` covers the Node-only
// conventions (handedness, timeStep) without a browser.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer, build } from 'vite';
import { chromium } from 'playwright';
import { gpuArgs, rendererCheck } from '../../web/verify-checks.mjs';
import { consoleGate } from '../core/probe.mjs';

const allowSoftware = process.argv.includes('--allow-software');
const ALLOWED_CONSOLE = []; // text a run may print; everything else fails the run
const root = fileURLToPath(new URL('.', import.meta.url));

const checks = [];
const check = (name, pass, detail = '') => { checks.push({ name, pass: Boolean(pass), detail: String(detail) }); };

const server = await createServer({ root, logLevel: 'error', server: { port: 0 } });
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
  // 1. Flight scene: renderer, readiness, lockstep and real keyboard input.
  let page = await open('?scene=flight');
  let s = await snap(page);
  const r = rendererCheck({ webgl2: s.backend === 'webgl2', renderer: s.renderer }, { allowSoftware });
  check(r.name, r.pass, r.detail);
  check('ready means drawn: two frames that issued draw calls, a known backend', s.ready && s.framesDrawn >= 2 && s.drawCalls > 0 && s.backend === 'webgl2', `framesDrawn ${s.framesDrawn} of ${s.framesRendered} rendered, drawCalls ${s.drawCalls}, backend ${s.backend}`);
  check('the probe reports the versions it was built with', s.versions.babylon && s.versions.vite, JSON.stringify(s.versions));
  check('getTimeStep() reports milliseconds for a timeStep of 1/60 s', Math.abs(s.timeStepMs - 1000 / 60) < 0.01, `${s.timeStepMs} ms`);

  const t0 = await snap(page); await page.waitForTimeout(1000); const t1 = await snap(page);
  const rate = t1.steps - t0.steps;
  check('deterministic lockstep runs about 60 steps a second', rate >= 45 && rate <= 75, `${rate} steps in 1 s`);

  await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.up('KeyD');
  s = await snap(page);
  check('yaw > 0 turns the rendered nose toward +X', s.ship.yaw > 0.5 && s.nose[0] > 0.4, `yaw ${s.ship.yaw.toFixed(2)}, rendered nose x ${s.nose[0].toFixed(2)}`);
  await page.keyboard.down('KeyS'); await page.waitForTimeout(600); await page.keyboard.up('KeyS');
  s = await snap(page);
  check('pitch > 0 points the rendered nose down', s.ship.pitch > 0.3 && s.nose[1] < -0.2, `pitch ${s.ship.pitch.toFixed(2)}, rendered nose y ${s.nose[1].toFixed(2)}`);
  await page.close();

  // 2. One key press (down and up in one tick) must fire exactly once.
  page = await open('?scene=fire');
  await page.keyboard.press('Space');
  const hit = await until(page, () => window.__game.snapshot().hits >= 1);
  s = await snap(page);
  check('one key press fires one shot that sweeps into the target', hit && s.fired === 1 && s.hits === 1, `fired ${s.fired}, hits ${s.hits}, rocks alive ${s.rocksAlive}`);
  await page.close();

  // 3. timeStep in milliseconds freezes the simulation while frames keep rendering.
  page = await open('?scene=flight&timestep=ms');
  const f0 = await snap(page); await page.waitForTimeout(1000); const f1 = await snap(page);
  check('timeStep given in milliseconds freezes the simulation', f1.steps - f0.steps <= 2 && f1.framesDrawn - f0.framesDrawn > 10, `${f1.steps - f0.steps} steps, ${f1.framesDrawn - f0.framesDrawn} frames drawn in 1 s`);
  await page.close();

  // 4. The built-in outline renderer on smooth and hard-edged meshes (outlineWidth 0.04 at 8 m).
  page = await open('?scene=outline');
  const outline = (a) => page.evaluate((args) => window.__game.lab.outline(args), a);
  const sphere = await outline({ shape: 'sphere' }), box = await outline({ shape: 'box' }), plate = await outline({ shape: 'plate' });
  const similar = [box, plate].every((o) => o.coverage >= 0.95 && o.thickness >= 0.6 * sphere.thickness && o.thickness <= 1.4 * sphere.thickness);
  check('the built-in outline closes on a sphere, a hard-edged box and a thin plate with similar thickness', sphere.coverage >= 0.95 && similar,
    `ink per edge pixel: sphere ${sphere.thickness.toFixed(2)}, box ${box.thickness.toFixed(2)}, plate ${plate.thickness.toFixed(2)}`);
  await page.close();

  // 5. Thin instances: an empty one still draws its source mesh until disabled.
  page = await open('?scene=thin');
  const thin = (k) => page.evaluate((kind) => window.__game.lab.thin(kind), k);
  const one = await thin('one'), zero = await thin('zero'), off = await thin('zero-disabled');
  check('one thin instance draws only at its own position', one.right > 500 && one.centre === 0, `right ${one.right}, centre ${one.centre}`);
  check('zero thin instances still draw the source mesh at the origin', zero.centre > 500, `centre ${zero.centre}`);
  check('setEnabled(false) hides an empty thin-instance mesh', off.centre === 0 && off.right === 0, `centre ${off.centre}, right ${off.right}`);
  await page.close();

  // 6. Instancing collapses draw calls.
  page = await open('?scene=draws');
  const draws = (k) => page.evaluate((kind) => window.__game.lab.draws(kind), k);
  const meshes = await draws('meshes'), inst = await draws('thin');
  check('1,000 meshes cost about 1,000 draw calls; one thin-instanced mesh costs 1', meshes >= 900 && inst === 1, `meshes ${meshes}, thin instances ${inst}`);
  await page.close();

  const extra = consoleGate(messages, ALLOWED_CONSOLE);
  check('the console is clean (zero-warning gate)', extra.length === 0, extra.join(' | '));

  // 7. Bundle size: a deep-import build, reported, with a loose ceiling so a barrel import is noticed.
  const out = await build({ root, logLevel: 'silent', build: { write: false } });
  const chunks = (Array.isArray(out) ? out : [out]).flatMap((o) => o.output).filter((f) => f.type === 'chunk');
  const kb = Math.round(chunks.reduce((n, c) => n + c.code.length, 0) / 1024);
  check('a deep-import production build stays under 2 MB of JavaScript', kb < 2048, `${kb} kB`);
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
