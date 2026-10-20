---
name: engine-babylon
description: Build, structure, debug and verify a Babylon.js 3D game, especially one that loads agent-meshes GLB parts by socket, runs a deterministic fixed-step loop, and is checked in headless Chromium through a state probe. Use before writing Babylon.js game code, when the simulation freezes or runs at the wrong speed, when taps or frames go missing, when positions or rotations come out mirrored, when a thin-instanced mesh draws at the origin, when a feature throws until a side-effect import is added, or when a render or particle effect looks wrong. Not for choosing an engine (use engine-selection), authoring the models (use the agent-meshes skills) or React Three Fiber (use engine-r3f).
---

# Babylon.js

Start here for any Babylon.js game. The lessons are backed by a small runnable example, [`examples/web3d`](../../examples/web3d/README.md): engine-neutral core modules with node tests, plus a Babylon.js app with Node-only convention tests (`npm test`) and a headless Chromium verifier (`npm run verify`). `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or library source, `[general]` is guidance not checked here.

Read the reference that matches the work. Do not load all of them.

| You are about to | Read |
| --- | --- |
| Set up the engine and scene, run the fixed-step loop, wire game events or dispose things | [Babylon.js scene, render loop and observables](references/scene-loop-and-observables.md) |
| Match Babylon.js positions, rotations and cameras to a right-handed core | [Babylon.js handedness and coordinates](references/handedness-and-coordinates.md) |
| Load agent-meshes part GLBs and assemble a model by socket, with materials and animation groups | [Loading agent-meshes parts in Babylon.js](references/loading-agent-meshes-parts.md) |
| Give parts cell shading and an outline | [Cell shading and outlines in Babylon.js](references/cell-shading-and-outline.md) |
| Load Havok, create bodies and shapes, or read collision events | [Havok physics in Babylon.js](references/physics-havok.md) |
| Add sparks, smoke, debris or a layered explosion | [Particles and explosions in Babylon.js](references/particles-and-explosions.md) |
| Open the inspector, debug a scene or find what a probe cannot see | [The Babylon.js inspector and debugging](references/inspector-and-debugging.md) |
| Play sound effects and unlock audio on a gesture | [Audio in Babylon.js](references/audio.md) |
| Measure or cut bundle size, or find the side-effect import a feature needs | [Babylon.js bundle size and imports](references/bundle-size-and-imports.md) |
| Expose state to tests, script a run, check flight axes, take screenshots or gate on frame rate | [Probing and verifying a Babylon.js game](references/probe-and-verification.md) |
| Choose a renderer backend, reach the GPU in headless Chromium, or debug a blank or flat headless render | [WebGPU, WebGL and headless Chromium for Babylon.js](references/webgpu-and-headless.md) |
| Pin versions, upgrade, or read a breaking-change notice | [Babylon.js versions and migrations](references/versions-and-migrations.md) |

## First five minutes

1. [tested] **Pin the version and say which.** The example pins `@babylonjs/core` 9.29.0, imports by deep `@babylonjs/core/...` path (a production build is about 1.6 MB of JavaScript, checked against a 2 MB ceiling) and reports `Engine.Version` in the probe (Babylon verify: versions, bundle). See [versions](references/versions-and-migrations.md).
2. [tested] **Set `scene.useRightHandedSystem = true` before loading anything.** Then the core, glTF parts and cameras need no flip, and a core quaternion `[x, y, z, w]` copies straight into `rotationQuaternion` (Babylon test: quaternion copy; verify: rendered axes). See [handedness](references/handedness-and-coordinates.md).
3. [tested] **Check what the renderer really is.** Classify the renderer string, not the request; a software rasteriser draws a plausible picture with no error (Babylon verify: hardware GPU; the R3F example's `renderer-flags.mjs` prints the choice per flag set). Use the shared [`gpuArgs`](../../examples/web/verify-checks.mjs). See [WebGPU and headless](references/webgpu-and-headless.md).
4. [tested] **Put rules in a headless core, stepped in lockstep.** Create the engine with `deterministicLockstep: true, lockstepMaxSteps: 4, timeStep: 1 / 60`, call the core's step from `scene.onBeforeStepObservable` and its frame end once per render (Babylon verify: about 60 steps a second). See [scene loop](references/scene-loop-and-observables.md).
5. [tested] **Decide the verification up front.** Publish plain data as `window.__game` before the first frame and drive the game with real keyboard events (Babylon verify: rendered axes, one key press). See [probe and verification](references/probe-and-verification.md).

## Rules that earned their place

- [tested] **`timeStep` is in seconds.** `1000 / 60` froze the simulation: no steps in a second while frames kept rendering. `getTimeStep()` reports milliseconds and `Engine` has no `setTimeStep` (Babylon test: timeStep units; verify: timeStep in milliseconds).
- [tested] **`ready` means drawn, and a rendered frame can be empty.** Materials compile in parallel, so early renders can draw nothing: count a frame as drawn only when it issued draw calls (Babylon verify: ready means drawn; core test: ready).
- [tested] **Latch taps, and clear a latch only after a fixed step ran.** The engine owns the step in lockstep, so the core exposes `runStep` and `endFrame` with the same tap rules (core tests: engine-owned steps; Babylon verify: one key press).
- [tested] **`Vector3.Forward(true)` is -Z in a right-handed scene.** Never use it for a +Z nose; write `new Vector3(0, 0, 1)` (Babylon test: Forward).
- [tested] **Hide an empty thin-instance mesh.** With `thinInstanceCount = 0` Babylon still draws the source mesh at the origin; add `setEnabled(false)` (Babylon verify: thin instances).
- [tested] **Count draw calls with `SceneInstrumentation`.** The engine counter only resets when it runs; 1,000 meshes cost 1,000 draw calls and one thin-instanced mesh costs 1 (Babylon verify: draw calls).
- [tested] **Wait for materials before measuring.** Call `await scene.whenReadyAsync()` before a pixel or draw-call read, or the first render is empty (Babylon verify: thin instances, draw calls).
- [general] **Write every side-effect import a feature needs.** With deep imports a missing module shows up as a run-time throw or a shader that never compiles; add the import the error names. See [imports](references/bundle-size-and-imports.md).
- [general] **Measure outlines before working around them.** An earlier project saw hairline outlines on thin hard-edged parts; the example's box and plate outlined as thickly as its sphere (Babylon verify: built-in outline). See [outlines](references/cell-shading-and-outline.md).

## Not covered here

Choosing between engines is [engine-selection](../engine-selection/SKILL.md). The same kind of game on React Three Fiber is [engine-r3f](../engine-r3f/SKILL.md). Authoring the models belongs to the agent-meshes skills (`mesh-authoring`, `mesh-rigging`, `mesh-build`). The example does not exercise Havok, GLB loading, particles, audio, the inspector, animation groups or WebGPU.

## Babylon.js or R3F

- [general] Babylon.js ships physics, particles, outlines and an inspector in one package, at a larger download; R3F is a thin binding over three.js where you assemble those yourself.
- [general] Pick on the team's React fit and the built-in systems the game needs, then build the same small slice in the candidate and compare bundle size, frame cost and probe readability.
