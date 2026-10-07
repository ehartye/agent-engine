# Havok physics in Babylon.js

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

The spec's risk was whether Havok's WASM loads in headless Chromium at all. It does, with no configuration.

## The choice and what it was weighed against

- [tested] Spike B (121 static spheres and a dynamic ship sphere): Havok cost 0.18 to 0.22 ms per step (0.2 to 0.25 ms on the Intel GPU run), resolved a 260 m/s contact at the surface with no tunnelling, and was stepped in the same fixed ticks as the flight model.
- [tested] A 420 m/s bolt moves 7 m per 60 Hz step, so a swept segment-versus-sphere test is exact and needs no physics engine.
- [tested] Decision: Havok for ship-versus-rock contact only; bolts and ore pickups are analytic tests in the core (`src/sim/combat.ts`, `src/sim/pickups.ts`). Every kill under the verifier and the smoke run delivered its full ore.

## Loading the WASM in Vite and headless Chromium

- [tested] `@babylonjs/havok` 1.3.14 loads with no Vite configuration, in dev with or without `locateFile` and from `vite build` plus `vite preview`, in 25 to 30 ms (26 to 42 ms on the Intel run). The app passes the URL explicitly (`src/game/physics.ts`):

```ts
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';

const hk = await HavokPhysics({ locateFile: () => wasmUrl });
scene.enablePhysics(new Vector3(0, 0, 0), new HavokPlugin(true, hk));
```

- [tested] The WASM is 2,094,563 bytes (2.09 MB), served from the build as `/assets/HavokPhysics-<hash>.wasm`.
- [tested] `@babylonjs/havok/package.json` is not exported, so a Vite config cannot `require.resolve` it; read the version by path (`node_modules/@babylonjs/havok/package.json`).
- [tested] The first dev run after adding Havok logged 504 `Outdated Optimize Dep` console errors: Vite's optimizer re-bundled for the new dependencies and in-flight requests for the old bundle failed. The page still worked and the second run was clean. Warm the optimizer before a headless check; see [zero errors](probe-and-verification.md#zero-errors).

## Bodies and shapes

- [tested] A `PhysicsBody` on a plain `TransformNode` with a `PhysicsShapeSphere` works without a mesh; the app's rocks are exactly that.
- [tested] Zero inertia keeps a dynamic body from rotating, so the flight model can own orientation and give Havok only the velocity: in spike B the ship's rotation stayed identity through 153 contacts.

```ts
const body = new PhysicsBody(shipNode, PhysicsMotionType.DYNAMIC, false, scene);
body.shape = new PhysicsShapeSphere(Vector3.Zero(), radius, scene);
body.setMassProperties({ mass: 1, inertia: Vector3.Zero() });
```

- [tested] `body.dispose()` mid-run is clean; a game reset disposes every rock body and rebuilds the field.

## Stepping and determinism

- [tested] Create the engine with `deterministicLockstep: true, lockstepMaxSteps: 4, timeStep: 1 / 60` and call `scene.enablePhysics`: Babylon steps Havok in the fixed ticks, 59 to 60 steps per wall second, calling `scene.onBeforeStepObservable` before each Havok step. See [the scene loop](scene-loop-and-observables.md).
- [tested] `timeStep` is in seconds: `1000 / 60` froze the simulation at zero steps (re-run on 2026-10-07 under `NullEngine`: 0 steps in 113 frames, against 178 steps with `1 / 60`).
- [tested] Set the velocity before the step (`scene.onBeforeStepObservable`) and read Havok's position and velocity back after it (`scene.onAfterStepObservable`). Hit-stop zeroes the Havok velocity for 4 steps.

## Collision events

- [tested] Spike B: the ship flown into a rock stopped at z 88.8, the rock's near face (90) minus the ship radius (1.2), with 153 to 154 collision callbacks from `body.setCollisionCallbackEnabled(true)` and `body.getCollisionObservable().add(...)` (`spikes/src/b.ts`).
- [documented] The game itself registers no collision observer: the contact response shows up in the velocity it reads back after each step (`apps/babylon/src/game/physics.ts`, `src/game/game.ts`). Bolt hits and pickups are core events from the analytic tests.
