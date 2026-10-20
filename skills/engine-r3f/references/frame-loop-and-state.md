# R3F frame loop and React state

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

How to split work between the frame loop, plain game code and React. The pattern is in [`core/session.mjs`](../../../examples/web3d/core/session.mjs) (the game as a plain object) and [`r3f/src/App.jsx`](../../../examples/web3d/r3f/src/App.jsx) (one `useFrame` that drives it). Run `node --test examples/web3d/core/core.test.mjs` for the loop and input tests.

## Where per-frame code goes

- [general] Put the game in a plain object or class, not in components. It owns the rules, the fixed-step loop and the counters. One `useFrame` calls `session.frameUpdate(delta)`; views are thin components that read the session and mutate three.js objects.
- [documented] `useFrame` callbacks run in ascending priority, so negative priorities order a frame: the simulation at -2, the camera at -1, views at 0 (R3F 9.8.1 `subscribe`: subscribers are sorted by priority, the highest renders last). The example's `Sim` and `Counters` share priority -2.
- [documented] Never give a `useFrame` a priority above 0 unless you mean to render by hand. A positive priority turns off R3F's automatic render for the whole canvas (R3F 9.8.1 source: `internal.priority` counts positive-priority subscribers, and the automatic `gl.render` runs only when it is 0).
- [tested] The example drives the whole session from one `useFrame` at priority -2 and measures about 60 fixed steps a second (r3f verify: fixed step).

```jsx
useFrame((state, delta) => {
  holder.alpha = game.session.frameUpdate(Math.min(delta, 0.25)); // fixed steps, returns the draw alpha
}, -2);
```

## What must not be React state

- [documented] R3F's hot-path rules: no `setState` in `useFrame` or in fast events; mutate refs and objects; read fast store state with `getState()`, not a reactive selector; avoid mounting and unmounting at runtime; share materials and geometries and use instancing (R3F docs, Performance Pitfalls).
- [general] Write fast HUD values (speed, fps) straight to DOM nodes you registered once, a few times a second. React never sees them.
- [general] A one-off HUD effect can still be a React element mounted by a store event, if it animates itself with its own `requestAnimationFrame` writing `style`.
- [general] Where things belong: game logic in plain code on a fixed-rate loop that `useFrame` feeds; three.js objects mutated in frames; a store only for UI that changes a few times a minute; DOM refs for fast readouts. The bugs that cost time were not React re-renders but the camera frame and a `ready` flag that fired too early (below).
- [general] "No wasted renders" was not profiled here. It holds by construction, not by measurement.

## Fixed step and interpolation

- [tested] A display faster than the step runs no step on most frames: at 144 Hz over a 60 Hz step at least 80 of 144 frames run none, and a long stall is capped instead of spiralling (core tests: 144 Hz display; long stall). Anything consumed "per step" must survive frames that run no step.
- [general] Draw the ship and camera at a pose interpolated between the last two fixed steps with the loop's alpha. Draw fast projectiles backed off along their velocity by `(1 - alpha) x step`.
- [tested] A critically damped spring (`smoothDamp`) is stable at any frame time and never overshoots from 1/240 s to 1 s frames, so use it for the camera (core test: smoothDamp).
- [general] Clamp the delta you pass in (the example uses 0.25 s) so a backgrounded tab does not hand the loop a huge frame.

## Input latches

- [tested] A key that goes down and up between two frames is invisible to a once-per-frame poll; a latch keeps it until read (core test: tap between frames).
- [tested] Clear latches only after a step ran, or while paused. Clearing every frame loses taps at 144 Hz (core test: clearing latches every frame loses taps).
- [tested] A tap fires exactly once from every accumulator phase at 144 Hz, once after a hit-stop, never after a pause closes, and goes to the first of two steps in one frame only (core tests: every accumulator phase; hit-stop; paused; two steps in one frame).
- [tested] A real `keyboard.press('Space')` (down and up in one tick) fires one shot that sweeps into the target (r3f verify: one key press, one shot).
- [general] A key that is read per frame rather than per step (a menu toggle) needs its own latch cleared every frame (`clearLatches(['menu'])`).

## Mounting, StrictMode and readiness

- [tested] "Ready" must mean drawn: the model assembled, the backend identified and two frames drawn, with the frame count set after a draw (core tests: ready needs three conditions; two updates with nothing drawn; r3f verify: ready means drawn). See [probe and verification](probe-and-verification.md).
- [general] `<Canvas>` children that suspend (asset loading) mount late, so a flag set when assets finish can precede the renderer and report an unknown backend and zero draw calls.
- [general] Create the session outside React (the example does it at module scope in `main.jsx`). Then StrictMode's double-run effects cannot create it twice.
- [documented] R3F 9.8.1 bridges React context and StrictMode into the canvas tree. The example does not use StrictMode, so nothing here was checked under it.

## Related

- [Hit tests and physics](hit-tests-and-physics.md), [flight controls](flight-controls.md), [audio](audio.md).
