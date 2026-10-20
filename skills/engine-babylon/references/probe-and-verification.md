# Probing and verifying a Babylon.js game

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

A pixel cannot tell you whether the game is right, so expose a state probe and let a script read it. The probe is [`core/probe.mjs`](../../../examples/web3d/core/probe.mjs); the example installs it as `window.__game` in [`main.mjs`](../../../examples/web3d/babylon/src/main.mjs), and [`verify.mjs`](../../../examples/web3d/babylon/verify.mjs) drives it in headless Chromium (`cd examples/web3d/babylon && npm run verify`, 16 checks). `npm test` covers the engine conventions with no browser.

## The probe object

- [tested] (core test: two updates with nothing drawn are not ready; the probe is plain data) Make the probe plain data, copied on demand, so it survives `page.evaluate`: versions, step count, frames drawn, draw calls, `ready`, backend, renderer string and the game state a check needs.
- [tested] (babylon verify: the probe reports the versions it was built with) Report the versions the build really has: the example reads the Vite version from `package.json` through `define` and the Babylon.js version from `Engine.Version`, so they cannot drift from what is installed.
- [general] Install `window.__game` before the first frame and let `ready` flip later. A verifier waits with `page.waitForFunction(() => window.__game?.snapshot().ready)`.
- [general] Read live counters from the engine in an observable, not in the snapshot, and keep the snapshot cheap: copy scalars and small arrays, never live Babylon.js objects.
- [general] Counts that look like live state may not be. Keep live effect counts (for example particles alive) in your own code instead of trusting an engine counter; see [particles](particles-and-explosions.md#cpu-and-gpu-systems).

## Ready means drawn

- [tested] (core test: ready needs the model assembled, a known backend and two drawn frames; babylon verify: ready means drawn) `ready` needs the model assembled, a known backend and at least two drawn frames. In Babylon.js a frame is drawn only if it issued draw calls: materials compile in parallel, so early renders can be empty (the verifier saw 2 drawn of 6 rendered).
- [documented] `SceneInstrumentation.drawCallsCounter.current` holds the draw calls of the last completed render; the engine counter is only reset by an attached `SceneInstrumentation` (`Instrumentation/sceneInstrumentation.js`).

```js
const instr = new SceneInstrumentation(scene);
scene.onAfterRenderObservable.add(() => {
  session.drawCalls = instr.drawCallsCounter.current;
  if (session.drawCalls > 0) session.markDrawn(session.framesDrawn + 1);
});
```

- [general] An isolated lab scene that renders once should `await scene.whenReadyAsync()` before the measured render, or the first render draws nothing and every pixel or draw-call reading is zero (`src/labs.mjs`).
- [general] Compare draw calls like with like: a count read once after a scenario and a maximum over a window are different numbers.

## Axes and the verifier's own code

- [tested] (babylon verify: yaw > 0 turns the rendered nose toward +X; pitch > 0 points the rendered nose down) Check the axis contract on the rendered object: after holding a key, read the nose from the node's `getDirection(+Z)` and require yaw > 0 to point it toward +X and pitch > 0 to point it down.
- [general] A sign error hides when the app, its tests and the test pilot all encode the same inversion. Write the verifier's steering from the contract and reuse it in the app's unit tests at every control rate the verifier can run at.
- [general] A turn law that changes heading about world up never changes elevation, so a steering bot can climb forever from a raised nose. If a scripted course gets stuck, check that the bot can correct pitch as well as yaw, and give it a time limit that fails loudly.

## Input

- [tested] (babylon verify: one key press fires one shot that sweeps into the target) Drive the game with real keyboard events: `page.keyboard.press('Space')` sends down and up in one tick, and the latch plus a swept hit test make it fire exactly once and hit (fired 1, hits 1). See the core's tap rules in [scene loop](scene-loop-and-observables.md#fixed-step-and-interpolation).

## Screenshots and what they miss

- [general] Assert on state and let pixels confirm. The outline, thin-instance and draw-call checks read pixels or counters from isolated scenes (`?scene=outline`, `thin`, `draws`) rather than screenshotting the full game.
- [general] A software rasteriser draws a plausible picture with no error, so a screenshot check alone passes on it. Put backend, renderer, lost context and rejected inputs in the probe; see [WebGPU and headless](webgpu-and-headless.md).
- [general] A DOM HUD is found by Playwright test id but is invisible to canvas readbacks.

## Frame rate

- [general] A frame-rate gate on a 60 Hz display caps at 60, so a pass shows no headroom. Gate on a loose floor (for example 55 fps over 10 s) on a real GPU only, and measure milliseconds per frame unthrottled when you need headroom. This repo does not ship a frame-rate check.

## Zero errors

- [tested] (babylon verify: the console is clean; core test: consoleGate) Fail the run on every console error, page error and warning except an allow list. The example's allow list is empty.
- [general] A cold Vite dependency optimizer can log `Outdated Optimize Dep` errors on the first dev run after dependencies change. Warm the cache first, and never silently ignore a cold run's errors.
- [general] Dev tools such as the inspector log their own console errors; keep them out of verifier runs ([inspector](inspector-and-debugging.md#headless-use)).
- [general] Route failures into an `errors` field the probe reports: window errors, unhandled rejections, failed asset fetches and `webglcontextlost`, and check it is empty after load and at the end.
