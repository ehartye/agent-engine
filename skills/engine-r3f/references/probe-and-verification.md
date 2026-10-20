# Probing and verifying an R3F game

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

A pixel cannot tell you whether the game is right, so expose a state probe and let a script read it. The probe is [`core/probe.mjs`](../../../examples/web3d/core/probe.mjs); the example installs it as `window.__game` in [`r3f/src/main.jsx`](../../../examples/web3d/r3f/src/main.jsx), and [`r3f/verify.mjs`](../../../examples/web3d/r3f/verify.mjs) drives it in headless Chromium (`cd examples/web3d/r3f && npm run verify`, 13 checks).

## The probe object

- [tested] Make the probe plain data the session already holds, copied on demand, so it survives `page.evaluate` serialisation: versions, step count, frames drawn, draw calls, `ready`, backend, renderer string and the game state a check needs (core test: the probe is plain data).
- [tested] Install `window.__game` before React mounts and let `ready` flip later. A verifier then waits with `page.waitForFunction(() => window.__game?.snapshot().ready)`.
- [tested] Report the versions the build really has: the example takes them from `package.json` through Vite's `define` plus `THREE.REVISION` and `React.version`, so they cannot drift from what is installed (r3f verify: the probe reports the versions it was built with).
- [general] Keep the snapshot cheap enough to call every frame. Copy small arrays and scalars, never live three.js objects.

## Ready means drawn

- [tested] `ready` needs the model assembled, a known backend and at least two frames drawn. Two updates with nothing drawn are not ready (core tests: ready needs three conditions; two updates with nothing drawn).
- [tested] In the real app after load the probe reports `framesDrawn >= 2`, `drawCalls > 0` and `backend` known (r3f verify: ready means drawn).
- [documented] Read the counters from `renderer.info`. In three r186, `WebGLRenderer.render()` increments `info.render.frame` and then, with `autoReset` on, zeroes `calls` at the start of the render. So a `useFrame` that runs before the draw sees the previous frame's `calls`, and `frame` counts `render()` calls so far (`three/src/renderers/WebGLRenderer.js`, `render`; `webgl/WebGLInfo.js`, `reset`).

```jsx
useFrame((state) => {
  game.session.drawCalls = state.gl.info.render.calls;   // previous frame
  game.session.markDrawn(state.gl.info.render.frame);    // render() calls so far
}, -2);
```

## Axes and the verifier's own code

- [tested] Write the axis contract down once: a glTF nose is +Z, an unrotated camera looks down -Z so a chase camera is yawed pi further, pitch > 0 is nose down, yaw > 0 turns the nose toward +X (core tests: pitch and yaw signs; glTF nose and camera).
- [tested] Check it on the rendered object, not the rules: after holding a key, the verifier reads the nose direction from the three.js object (`getWorldDirection`) and requires yaw > 0 to point it toward +X and pitch > 0 to point it down (r3f verify: rendered axes).
- [general] A sign error tends to hide when the app, its tests and the test pilot all encode the same inversion; every app test passes while an independent autopilot that follows the contract steers away from every waypoint. Have the verifier's steering code written against the contract, and reuse it in the app's unit tests. See [flight controls](flight-controls.md).

## Screenshots and what they miss

- [tested] The renderer string decides whether a run is on a GPU: a verifier check fails a software rasteriser even though WebGL 2 works (r3f verify: hardware GPU; `node renderer-flags.mjs` prints the renderer for each flag set). See [WebGPU and headless](webgpu-and-headless.md).
- [general] A software rasteriser draws a plausible picture with no error, so a screenshot check alone passes on it. State a screenshot cannot show (backend, renderer, lost context, an unknown part) belongs in the probe.
- [general] Assert on state and let pixels confirm. The toon, outline and instancing checks read pixels or counters from isolated scenes (`?scene=toon`, `outline`, `instancing`) rather than screenshotting the full game. See [toon, outline and instancing](toon-outline-and-instancing.md).

## Scripted scenarios and frame rate

- [tested] The fixed step runs about 60 times a second through one `useFrame` (r3f verify: fixed step).
- [general] Time a scripted course in simulation time (steps), not wall time. An in-page pilot that sets inputs once per `requestAnimationFrame` does not line up one-to-one with fixed steps, so expect a small spread between runs.
- [general] A "faster part wins the course" check depends on the autopilot. A pursuit bot that boosts into every waypoint orbits it; an arrival law that caps speed by distance until the nose points near the waypoint is stable.
- [general] A frame-rate gate on a 60 Hz display caps at 60, so a pass shows no headroom. Measure the scene unthrottled (milliseconds per frame) when you need headroom.

## Zero errors

- [tested] Fail the run on every console error, page error and warning except an allow list. The example allows exactly `THREE.Clock: This module has been deprecated` (R3F 9.8.1 still creates a `THREE.Clock`), through `consoleGate` (core test: consoleGate; r3f verify: console gate).
- [general] Route failures into an `errors` field and an on-screen banner: `window` errors, unhandled rejections, failed asset fetches, rejected core inputs and `webglcontextlost` (force it with `WEBGL_lose_context`). Check `errors` is empty after load and at the end.
- [general] Refuse to reuse a dev server on the port unless it serves this checkout (for example, request a file by Vite's `/@fs/` route), so a stale server from another checkout cannot pass.

## Tests without a renderer

- [tested] Rules, loop, input, sweep, probe and axis maths run under `node --test` with no browser and no dependencies: 16 tests in well under a second (`node --test examples/web3d/core/core.test.mjs`).
- [general] Loading real GLBs with `GLTFLoader.parseAsync` and running the whole scenario headless are also possible in plain Node, since neither needs a canvas. Keep the browser run for what only a renderer can show.
