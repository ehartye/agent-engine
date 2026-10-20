# Babylon.js scene, render loop and observables

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Keep the game rules in a plain headless core and let Babylon.js draw them. In Babylon.js the engine can own the fixed step (deterministic lockstep), so the core exposes `session.runStep(dt)` and `session.endFrame(delta)` instead of running its own accumulator. The code is [`main.mjs`](../../../examples/web3d/babylon/src/main.mjs); `cd examples/web3d/babylon && npm test && npm run verify` runs the checks named below.

## Engine, scene and render loop

- [tested] (babylon verify: deterministic lockstep runs about 60 steps a second) Create the engine in deterministic lockstep and drive it with `engine.runRenderLoop`. The example measured 61 steps in one second.

```js
const engine = new Engine(canvas, true, {
  deterministicLockstep: true,
  lockstepMaxSteps: 4,
  timeStep: 1 / 60, // seconds, although getTimeStep() reports milliseconds
});
const scene = new Scene(engine);
scene.useRightHandedSystem = true; // see handedness-and-coordinates.md
engine.runRenderLoop(() => scene.render());
```

- [tested] (babylon test: timeStep units; babylon verify: timeStep in milliseconds freezes the simulation) `timeStep` is in seconds. `1 / 60` gives about 60 steps a second and `getTimeStep()` reports 16.67 (milliseconds). `1000 / 60` freezes the simulation, at most 2 steps in 1.5 s, while frames keep rendering, so the picture looks alive and nothing moves. The type says nothing; this is the trap in the loop.
- [documented] Why it freezes: `Scene.animate` takes `floor((delta + accumulator) / getTimeStep())` steps per frame, at most `lockstepMaxSteps`, where `getTimeStep()` is `timeStep * 1000`; a 16,667 s step never comes due (`@babylonjs/core` 9.29.0, `scene.pure.js` `animate`, `abstractEngine.pure.js`).
- [tested] (babylon test: Engine has no setTimeStep) `Engine` has no `setTimeStep`; set the step only through the constructor option.
- [documented] The frame delta is clamped to `Scene.MaxDeltaTime` before it is added to the accumulator, so a long stall costs a few steps, not a spiral (`scene.pure.js` `animate`).
- [general] A DOM overlay is a good HUD: tests find and click it by test id, it adds no draw calls and keeps `@babylonjs/gui` out of the bundle. Canvas pixel readbacks do not see it.

## Fixed step and interpolation

- [tested] (babylon verify: deterministic lockstep; one key press) Call the core from the observables instead of keeping a second accumulator: `scene.onBeforeStepObservable` calls `session.runStep(1 / 60)`, and one `onBeforeRenderObservable` calls `session.endFrame(engine.getDeltaTime() / 1000)`.
- [tested] (core tests: engine-owned steps; engine-owned steps honour a hit-stop) With the engine owning the step, a tap fires exactly once, survives a frame in which the engine ran no step, is dropped while paused, and a hit-stop is honoured. Clear the tap latches in `endFrame` only after a step has run.
- [documented] Under lockstep `scene.getAnimationRatio()` is `timeStep x (1 / timeStep)`, which is 1 on every step (`scene.pure.js` `animate`). Anything Babylon ages by animation ratio, such as particles, therefore does not follow your simulation speed unless you correct it; see [particles](particles-and-explosions.md#hit-stop-and-simulation-time).
- [general] The example draws the pose from the last step with no interpolation and still looked smooth at 60 Hz. On a 120 or 144 Hz display, interpolate with the pose before the last step (the core keeps it, see `game.test.mjs`: the pose before the last step is kept).

## Observables for game events

- [documented] Each lockstep step notifies `onBeforeStepObservable`, then animations, then physics if enabled, then `onAfterStepObservable`; `onBeforeRenderObservable` runs once per rendered frame (`scene.pure.js` `animate`, `render`). Frames with no step still render.
- [general] Wire each job to its phase:

| Observable | Runs | Put here |
| --- | --- | --- |
| `scene.onBeforeStepObservable` | before each fixed step | game rules, input consumption |
| `scene.onAfterStepObservable` | after each physics step | physics read-back, anything that needs the settled body |
| `scene.onBeforeRenderObservable` | once per rendered frame | copying state to nodes, camera, HUD, `endFrame` |
| `scene.onAfterRenderObservable` | after each render | counters for the probe |

## Draw counters

- [tested] (babylon verify: ready means drawn) A frame can render with nothing in it while materials compile in parallel, so count a frame as drawn only when it issued draw calls. The example got 2 drawn of 6 rendered at readiness. Read the count in `onAfterRenderObservable` from `SceneInstrumentation.drawCallsCounter.current`.
- [documented] `engine._drawCalls` is reset only when a `SceneInstrumentation` is attached (it calls `_drawCalls.fetchNewFrame()` before each render), so create one even if you never read its timings (`Instrumentation/sceneInstrumentation.js`).
- [tested] (babylon verify: draw calls) 1,000 separate meshes cost 1,000 draw calls and one thin-instanced mesh costs 1. Use thin instances for fields of repeated things.

## Disposal

- [tested] (babylon verify: thin instances) A thin-instanced mesh with zero instances still draws its source mesh at the origin: `thinInstanceCount = 0` drew it, `setEnabled(false)` hid it, and one instance drew only at its own position. Disable a pool when it is empty.

```js
mesh.thinInstanceCount = n;
mesh.setEnabled(n > 0); // with zero instances Babylon would draw the source mesh
```

- [general] Dispose in the order scene, then engine, and stop the render loop first (`engine.stopRenderLoop()`), as the Node tests do. Disposing a particle system that shares a texture takes `dispose(false)`; see [particles](particles-and-explosions.md#pooling-and-disposal).
- [general] Reset a game by rebuilding its field and bodies and keeping the engine, scene and audio engine, rather than recreating the engine.

Related: [handedness and coordinates](handedness-and-coordinates.md), [probe and verification](probe-and-verification.md).
