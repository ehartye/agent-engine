# Havok physics in Babylon.js

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Babylon.js v2 physics runs on Havok (`@babylonjs/havok`, a WASM build). The example does not use Havok: its projectiles are swept tests in the engine-neutral core, and it installs only `@babylonjs/core`. So what follows about Havok itself is `[general]` or read from `@babylonjs/core` source; the stepping contract it relies on is reproduced.

## Do you need an engine

- [tested] (core tests: swept segment tests hit 400 of 400 fast shots; an end-point test with a random phase does not) A fast projectile moves several metres per fixed step, and a swept segment-versus-sphere test finds all 400 of 400 hits at random phases where an end-point test misses some. The test is plain maths, so it needs no physics engine and stays identical in every renderer.
- [general] Use analytic tests in the core for projectiles and pickups, and a physics engine only for contact response you do not want to write (body against body, resting contact). Keeping gameplay events out of the engine's callbacks also keeps the rules testable in Node ([`core`](../../../examples/web3d/core)).
- [general] Measure the step cost for your own body count before committing: one earlier spike (about 120 static spheres and one dynamic body) cost a fraction of a millisecond per step with no tunnelling, but that is one scene, not a budget.

## Loading the WASM in Vite and headless Chromium

- [general] `@babylonjs/havok` loaded in dev and from `vite build` plus `vite preview` in headless Chromium with no Vite configuration in an earlier project, in tens of milliseconds. Pass the WASM URL explicitly so the bundler emits it as its own asset:

```js
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';

const hk = await HavokPhysics({ locateFile: () => wasmUrl });
scene.enablePhysics(new Vector3(0, 0, 0), new HavokPlugin(true, hk));
```

- [documented] `joinedPhysicsEngineComponent` is the side-effect module that defines `Scene.prototype.enablePhysics` and replaces `_advancePhysicsEngineStep`, an empty stub in `scene.pure.js` ("Code will be replaced if physics engine component is referenced"). Import it by deep path, or physics is not wired to the scene.
- [general] The WASM is about 2 MB and is not part of the JavaScript budget; see [bundle size and imports](bundle-size-and-imports.md).
- [general] Read the Havok version from `node_modules/@babylonjs/havok/package.json` by path; the package did not export its `package.json` to a Vite config in the earlier project.
- [general] The first dev run after adding a dependency can log `Outdated Optimize Dep` errors while Vite re-bundles. Warm the optimizer before a headless check so the zero-warning gate stays honest ([probe and verification](probe-and-verification.md)).

## Bodies and shapes

- [general] A `PhysicsBody` works on a plain `TransformNode` with a `PhysicsShapeSphere`; no mesh is needed. Static obstacles can be just that.
- [general] A zero-inertia dynamic body does not rotate, so the game can own orientation and give Havok only a velocity to resolve:

```js
const body = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, scene);
body.shape = new PhysicsShapeSphere(Vector3.Zero(), radius, scene);
body.setMassProperties({ mass: 1, inertia: Vector3.Zero() });
```

- [general] Dispose every body on a game reset (`body.dispose()`) and rebuild; it is clean mid-run.

## Stepping and determinism

- [tested] (babylon Node tests: timeStep is in seconds) With `deterministicLockstep: true`, `timeStep` is in seconds: `1 / 60` steps about 60 times a second and `1000 / 60` freezes the simulation at zero steps (babylon verify: `timeStep` 1000/60 freezes steps). `engine.getTimeStep()` reports milliseconds. Physics is stepped from the same ticks, so the same mistake freezes physics too.
- [documented] Under lockstep each tick runs `onBeforeStepObservable`, then the animation update, then `_advancePhysicsEngineStep(timeStep in ms)`, then `onAfterStepObservable` (`Scene.animate`, `scene.pure.js`). With no sub-step set, the engine steps by that tick (`_step(step / 1000)`), and `HavokPlugin(true, hk)` uses the delta it is given.
- [general] Set the body's velocity in `onBeforeStepObservable` and read position and velocity back in `onAfterStepObservable`. Hit-stop is then "skip the gameplay step and zero the body's velocity for N ticks" ([scene loop and observables](scene-loop-and-observables.md)).
- [documented] `scene.onBeforePhysicsObservable` and `onAfterPhysicsObservable` also fire around each physics step (`joinedPhysicsEngineComponent.pure.js`); use the before/after step observables for gameplay so the order does not depend on the physics sub-step setting.

## Collision events

- [documented] `body.setCollisionCallbackEnabled(true)` plus `body.getCollisionObservable().add(...)` is the per-body event API (`Physics/v2/physicsBody.js`).
- [general] Callbacks fire every step while bodies touch (about 150 in one earlier contact run), so treat them as state, not as one-shot events. The simpler pattern is no observer: the contact response already shows up in the velocity read back after the step, and gameplay events come from the analytic tests.
