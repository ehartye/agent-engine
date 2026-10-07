# Babylon.js scene, render loop and observables

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

In Sector Run the game rules live in a headless core (flight, bolts, ore, events); Babylon.js draws them and steps Havok.

## Engine, scene and render loop

- [tested] Create the engine in deterministic lockstep and drive it with `engine.runRenderLoop`. This gives a fixed 1/60 s loop with Havok stepped inside it (`src/render/engine.ts`):

```ts
const engine = new Engine(canvas, true, {
  deterministicLockstep: true,
  lockstepMaxSteps: 4,
  timeStep: 1 / 60, // seconds, although getTimeStep() reports milliseconds
});
const scene = new Scene(engine);
scene.useRightHandedSystem = true;
engine.runRenderLoop(() => scene.render());
```

- [tested] `timeStep` is in seconds. Passing `1000 / 60` froze the simulation; re-run on 2026-10-07 (`NullEngine`, 3 s of real time): `1 / 60` gave `getTimeStep()` 16.67 ms and 178 steps in 112 frames, `1000 / 60` gave 16,666.67 ms and 0 steps in 113 frames. The type says nothing; this was the one trap in the loop that cost time.
- [documented] Why it freezes: `Scene.animate` takes `floor(accumulated ms / getTimeStep())` steps per frame, at most `lockstepMaxSteps`, so a 16.7 s step never comes due (`@babylonjs/core` 9.29.0 source).
- [tested] `Engine` has no `setTimeStep`; set the step only through the constructor option.
- [documented] The HUD and loadout screen are a DOM overlay over the canvas, not Babylon GUI: Playwright finds and clicks them by test id, they add no draw calls, and `@babylonjs/gui` stays out of the bundle; canvas readbacks do not see them (`apps/babylon/src/ui/hud.ts`).

## Fixed step and interpolation

- [tested] Lockstep ran 59 to 60 steps per wall second (179 or 180 in a 3 s window) and called `scene.onBeforeStepObservable` before each Havok step.
- [tested] Simulation time is `steps / 60`. The smoke check that `simTime` advances at about real time passed on the GPU and on SwiftShader; the verifier's course and mining times are simulation seconds.
- [tested] The app draws no interpolation between steps, and the verifier still measured 59.9 to 60.0 fps with every check passing.
- [tested] Under lockstep `scene.getAnimationRatio()` stays 1.000 on every frame, so anything Babylon ages by animation ratio (particles) runs at the wrong speed unless corrected per frame; see [particles](particles-and-explosions.md#hit-stop-and-simulation-time).

## Observables for game events

- [tested] Wire each job to the phase it belongs to (`src/game/game.ts`):

| Observable | Runs | Sector Run puts here |
| --- | --- | --- |
| `scene.onBeforeStepObservable` | before each fixed step | flight model, bolts, ore, core events. [tested] |
| `scene.onAfterStepObservable` | after each Havok step | Havok position and velocity read-back, chase camera. [tested] |
| `scene.onBeforeRenderObservable` | once per rendered frame | devices, effects, HUD. [tested] |

## Core commands and events across the boundary

- [tested] Hit-stop is a core command honoured in the step: it skips the gameplay step and zeroes the Havok velocity for 4 steps without advancing `simTime` (smoke `combat`: `hitStopSteps` >= 4), so the verifier's arithmetic is untouched.
- [tested] `commands.reset` disposes the asteroid field and the rock bodies and rebuilds them, and keeps the ship, the engine and the audio engine. After a reset the smoke stages find the full field again: `combat` destroys one rock and sees 39 remaining, `loop` mines the same three rocks as the verifier.

## Disposal

- [tested] Disable a thin-instanced mesh that has zero instances with `setEnabled(false)` (bolts, ore, debris): with `thinInstanceCount = 0` Babylon draws the source mesh itself at the origin. Re-run on 2026-10-07: a red 4 m box with one thin instance at x +8 drew 4,280 red pixels right of centre and none at the centre; with `thinInstanceCount = 0`, 3,600 red pixels at the centre; with `setEnabled(false)` as well, none.

```ts
mesh.thinInstanceCount = n;
mesh.setEnabled(n > 0); // with zero instances Babylon would draw the source mesh
```

- [tested] `PhysicsBody.dispose()` mid-run is clean, which is what lets `reset` drop and rebuild the rock bodies.
- [tested] Particle systems that share a texture must be disposed with `dispose(false)`; see [particles](particles-and-explosions.md#pooling-and-disposal).
