// node --test examples/web3d/core/core.test.mjs  (no browser, no dependencies)
// Each test reproduces a lesson from the engine-r3f and engine-babylon skills in plain Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFixedLoop } from './fixed-loop.mjs';
import { createSession } from './session.mjs';
import { createInput } from './input.mjs';
import { segmentSphereHit, endpointHit } from './sweep.mjs';
import { NOSE, noseDirection, cameraLookDirection, chaseCamera, steer, smoothDamp } from './flight.mjs';
import { isReady, createProbe, consoleGate } from './probe.mjs';
import { mulberry32 } from './rng.mjs';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// --- fixed step -----------------------------------------------------------------------------------------------

test('a 144 Hz display over a 60 Hz step runs no step on most frames', () => {
  const loop = createFixedLoop();
  let steps = 0, empty = 0;
  for (let i = 0; i < 144; i++) {
    const n = loop.advance(1 / 144, () => {});
    steps += n;
    if (n === 0) empty++;
    assert.ok(loop.alpha >= 0 && loop.alpha <= 1);
  }
  assert.ok(Math.abs(steps - 60) <= 1);
  assert.ok(empty >= 80, `${empty} of 144 frames ran no step`);
});

test('a long stall is capped instead of spiralling', () => {
  const loop = createFixedLoop({ maxSteps: 5 });
  assert.equal(loop.advance(10, () => {}), 5);
  assert.ok(loop.alpha < 1);
});

// --- latched taps ---------------------------------------------------------------------------------------------

const shotCounter = () => {
  const shots = { n: 0 };
  const session = createSession({ onStep: (_dt, { taps }) => { if (taps.has('fire')) shots.n++; } });
  return { shots, session };
};

test('a tap made between frames is invisible to a poll but survives in the latch', () => {
  const input = createInput();
  input.down('fire'); input.up('fire');
  assert.equal(input.isHeld('fire'), false);
  assert.ok(input.takeSnapshot().has('fire'));
});

test('at 144 Hz a tap fires exactly once from every accumulator phase', () => {
  for (let lead = 0; lead < 6; lead++) {
    const { shots, session } = shotCounter();
    for (let i = 0; i < lead; i++) session.frameUpdate(1 / 144);
    session.input.down('fire'); session.input.up('fire');
    for (let i = 0; i < 30; i++) session.frameUpdate(1 / 144);
    assert.equal(shots.n, 1, `phase ${lead}`);
  }
});

test('clearing latches every frame loses taps at 144 Hz (the bug the rule prevents)', () => {
  let lost = 0;
  for (let lead = 0; lead < 6; lead++) {
    const loop = createFixedLoop(), input = createInput();
    let shots = 0;
    for (let i = 0; i < lead; i++) loop.advance(1 / 144, () => {});
    input.down('fire'); input.up('fire');
    for (let i = 0; i < 30; i++) {
      const taps = input.takeSnapshot();
      loop.advance(1 / 144, () => { if (taps.has('fire')) shots++; });
      input.clearLatches(); // the mistake: clear before any step is known to have run
    }
    if (shots === 0) lost++;
  }
  assert.ok(lost >= 1, 'at least one phase loses the tap');
});

test('a tap during a hit-stop fires once when the simulation resumes', () => {
  const { shots, session } = shotCounter();
  session.hitStop = 0.06;
  session.input.down('fire'); session.input.up('fire');
  for (let i = 0; i < 3; i++) session.frameUpdate(1 / 60);
  assert.equal(shots.n, 0, 'still frozen');
  for (let i = 0; i < 10; i++) session.frameUpdate(1 / 60);
  assert.equal(shots.n, 1);
});

test('a tap made while paused does not fire after the pause closes', () => {
  const { shots, session } = shotCounter();
  session.paused = true;
  session.input.down('fire'); session.input.up('fire');
  session.frameUpdate(1 / 60);
  session.paused = false;
  for (let i = 0; i < 10; i++) session.frameUpdate(1 / 60);
  assert.equal(shots.n, 0);
});

test('two steps in one frame hand the tap to the first step only', () => {
  const { shots, session } = shotCounter();
  session.input.down('fire'); session.input.up('fire');
  session.frameUpdate(0.04); // two 1/60 steps
  assert.equal(session.steps, 2);
  assert.equal(shots.n, 1);
});

// --- swept hit tests ------------------------------------------------------------------------------------------

test('segmentSphereHit: entry time, already inside, moving away, grazing, miss', () => {
  close(segmentSphereHit([-10, 0, 0], [10, 0, 0], [0, 0, 0], 5), 0.25);
  assert.equal(segmentSphereHit([1, 0, 0], [20, 0, 0], [0, 0, 0], 5), 0);
  assert.equal(segmentSphereHit([10, 0, 0], [20, 0, 0], [0, 0, 0], 5), null);
  assert.equal(segmentSphereHit([-10, 5.5, 0], [10, 5.5, 0], [0, 0, 0], 5), null);
  assert.notEqual(segmentSphereHit([-10, 4.99, 0], [10, 4.99, 0], [0, 0, 0], 5), null);
  assert.equal(segmentSphereHit([-10, 0, 0], [-6, 0, 0], [0, 0, 0], 5), null, 'segment ends before the sphere');
});

// A 0.3 m shot at 450 m/s covers 7.5 m per 1/60 s step, more than an end-point test can safely skip.
function fire(rng, test, { phase }) {
  const rock = [0, 0, 0], reach = 5 + 0.3;
  const lateral = rng() * 5;                  // always inside the 5.3 m hit radius, so every shot should hit
  const stepLen = 450 / 60;
  let x = -60 - phase * stepLen;
  for (let i = 0; i < 20; i++) {
    const p0 = [x, lateral, 0], p1 = [x + stepLen, lateral, 0];
    if (test(p0, p1, rock, reach)) return true;
    x += stepLen;
  }
  return false;
}

test('swept segment tests hit 400 of 400 fast shots; an end-point test with a random phase does not', () => {
  const swept = (a, b, c, r) => segmentSphereHit(a, b, c, r) !== null;
  const end = (a, b, c, r) => endpointHit(a, b, c, r);
  const run = (test, phaseOf) => {
    const rng = mulberry32(7), phases = mulberry32(11);
    let hits = 0;
    for (let i = 0; i < 400; i++) if (fire(rng, test, { phase: phaseOf(phases) })) hits++;
    return hits;
  };
  assert.equal(run(swept, (p) => p()), 400);
  const randomPhase = run(end, (p) => p());
  assert.ok(randomPhase < 400, `end-point test with random phase hit ${randomPhase} of 400`);
  // A fixed phase that happens to land an end point on the rock hides the bug: the shortcut passes.
  assert.equal(run(end, () => 0), 400, 'fixed phase 0 lands an end point at x = 0');
});

// --- ready means drawn ----------------------------------------------------------------------------------------

test('ready needs the model assembled, a known backend and two drawn frames', () => {
  const ok = { assembled: true, backend: 'webgl2', framesDrawn: 2 };
  assert.equal(isReady(ok), true);
  assert.equal(isReady({ ...ok, assembled: false }), false);
  assert.equal(isReady({ ...ok, backend: 'unknown' }), false);
  assert.equal(isReady({ ...ok, backend: undefined }), false);
  assert.equal(isReady({ ...ok, framesDrawn: 1 }), false);
});

test('two updates with nothing drawn are not ready; the probe is plain data', () => {
  const session = createSession({ onStep: () => {} });
  const probe = createProbe({ session, versions: { engine: 'x' }, read: () => ({ assembled: true, backend: 'webgl2' }) });
  session.frameUpdate(1 / 60); session.frameUpdate(1 / 60);
  assert.equal(probe.snapshot().ready, false);
  session.markDrawn(2);
  const snap = probe.snapshot();
  assert.equal(snap.ready, true);
  assert.deepEqual(JSON.parse(JSON.stringify(snap)), snap);
});

test('consoleGate returns only messages that are not allowed', () => {
  const messages = ['THREE.Clock: deprecated', 'GL error', 'Download the React DevTools'];
  assert.deepEqual(consoleGate(messages, ['THREE.Clock', /DevTools/]), ['GL error']);
});

// --- axis conventions -----------------------------------------------------------------------------------------

test('pitch > 0 is nose down and yaw > 0 turns the nose toward +X', () => {
  assert.ok(noseDirection({ yaw: 0, pitch: 0.5 })[1] < 0);
  const f = noseDirection({ yaw: Math.PI / 2, pitch: 0 });
  close(f[0], 1); close(f[2], 0, 1e-12);
  const s = steer({ pitch: 0, yaw: 0, position: [0, 0, 0] }, { pitch: 1, yaw: 1 }, 0.1);
  assert.ok(s.pitch > 0 && s.yaw > 0);
});

test('a glTF nose is +Z and an unrotated camera looks down -Z, so a chase camera is yawed pi further', () => {
  assert.deepEqual(NOSE, [0, 0, 1]);
  assert.equal(dot(noseDirection({ yaw: 0, pitch: 0 }), cameraLookDirection(0)), -1);
  const ship = { position: [3, 2, 1], yaw: 0.7, pitch: 0 };
  const cam = chaseCamera(ship, 10, 2);
  close(dot(noseDirection(ship), cameraLookDirection(cam.cameraYaw)), 1, 1e-12);
  assert.ok(dot([cam.position[0] - 3, 0, cam.position[2] - 1], noseDirection(ship)) < 0, 'camera is behind the ship');
});

test('smoothDamp reaches the target without overshoot at any frame time', () => {
  for (const dt of [1 / 240, 1 / 60, 1 / 30, 0.1, 0.25, 1]) {
    let value = 0, velocity = 0;
    for (let t = 0; t < 12; t += dt) {
      ({ value, velocity } = smoothDamp(value, 1, velocity, 0.3, dt));
      assert.ok(Number.isFinite(value) && value <= 1 + 1e-9, `dt ${dt}: ${value}`);
    }
    close(value, 1, 1e-3);
  }
});
