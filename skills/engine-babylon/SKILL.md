---
name: engine-babylon
description: Build, structure, debug and verify a Babylon.js 3D game, especially one that loads agent-meshes GLB parts by socket, uses Havok physics, particles and observables, and is checked in headless Chromium through a state probe. Use before writing Babylon.js or @babylonjs game code, when handedness, the lockstep `timeStep`, cell shading, outlines, Havok loading, audio unlock, a missing side-effect import or bundle size cause trouble, or when a render looks wrong. Not for choosing an engine (use engine-selection), authoring the models (use the agent-meshes skills) or React Three Fiber (use engine-r3f).
---

# Babylon.js

Start here for any Babylon.js game. It collects what Sector Run taught: one arcade flight game built on this stack and on React Three Fiber from one rules core. `[tested]` ran in Sector Run Slice 1, `[documented]` was read in docs or source, `[general]` was not checked.

Read the reference that matches the work. Do not load all of them.

| You are about to | Read |
| --- | --- |
| Set up the engine and scene, run the fixed-step loop, wire game events or dispose things | [Babylon.js scene, render loop and observables](references/scene-loop-and-observables.md) |
| Match Babylon.js positions, rotations and cameras to a right-handed core | [Babylon.js handedness and coordinates](references/handedness-and-coordinates.md) |
| Load agent-meshes part GLBs and assemble a model by socket, with materials and animation groups | [Loading agent-meshes parts in Babylon.js](references/loading-agent-meshes-parts.md) |
| Give parts cell shading and an outline, or fix outlines on hard-edged parts | [Cell shading and outlines in Babylon.js](references/cell-shading-and-outline.md) |
| Load Havok, create bodies and shapes, or read collision events | [Havok physics in Babylon.js](references/physics-havok.md) |
| Add sparks, smoke, debris or a layered explosion | [Particles and explosions in Babylon.js](references/particles-and-explosions.md) |
| Open the inspector, debug a scene or find what a probe cannot see | [The Babylon.js inspector and debugging](references/inspector-and-debugging.md) |
| Play recorded sound effects (explosion variants, pickup chime) and unlock audio on a gesture | [Audio in Babylon.js](references/audio.md) |
| Measure or cut bundle size, or find the side-effect import a feature needs | [Babylon.js bundle size and imports](references/bundle-size-and-imports.md) |
| Expose state to tests, script a run, check flight axes, take screenshots or gate on frame rate | [Probing and verifying a Babylon.js game](references/probe-and-verification.md) |
| Choose a renderer backend, reach the GPU in headless Chromium, or debug a blank or flat headless render | [WebGPU, WebGL and headless Chromium for Babylon.js](references/webgpu-and-headless.md) |
| Pin versions, upgrade, or read a breaking-change notice | [Babylon.js versions and migrations](references/versions-and-migrations.md) |

## First five minutes

1. [tested] **Pin the version and say which.** Slice 1 pinned every `@babylonjs/*` package at exactly 9.29.0 and `@babylonjs/havok` at 1.3.14. Import by deep `@babylonjs/core/...` path; see [versions](references/versions-and-migrations.md).
2. [tested] **Set `scene.useRightHandedSystem = true` before loading anything.** Then the core, the parts and the cameras needed no flip; a core quaternion `[x, y, z, w]` copies straight into `rotationQuaternion`. See [handedness](references/handedness-and-coordinates.md).
3. [tested] **Check what the renderer really is.** Classify the renderer string, not the request: with `--use-angle=d3d11 --ignore-gpu-blocklist --force_high_performance_gpu` headless Chromium reached the NVIDIA GPU (`webgl2`); SwiftShader and `?backend=webgpu` report `webgl-fallback`. See [WebGPU and headless](references/webgpu-and-headless.md).
4. [tested] **Put rules in a headless core, stepped in lockstep.** Create the engine with `deterministicLockstep: true, lockstepMaxSteps: 4, timeStep: 1 / 60` and run flight, bolts and ore in `scene.onBeforeStepObservable`; Havok steps in the same ticks. See [scene loop](references/scene-loop-and-observables.md).
5. [tested] **Decide the verification up front.** Publish a snapshot as `window.__game` for the shared verifier (31 checks), plus a smoke script for the rest (49 checks: toon bands, outline coverage, ore per kill). See [probe and verification](references/probe-and-verification.md).

## Rules that earned their place

- [tested] **`timeStep` is in seconds.** `1000 / 60` froze the simulation: 0 steps in 113 frames, against 178 steps in 112 frames with `1 / 60`. `getTimeStep()` reports milliseconds and `Engine` has no `setTimeStep`.
- [tested] **The audio context state is not a gesture gate under Playwright.** The first verifier run failed `audio is locked before the click`: `page.evaluate` counts as user activation, so the context ran before any input. Keep your own flag, set from a trusted gesture. See [audio](references/audio.md#unlock-on-the-first-gesture).
- [tested] **Turn about the ship's own axes; bank only the drawn model.** Yaw about world up broke the course check (17.53 -> 22.05 s with the faster engine) and sent the smoke ship up a 5.8 km helix. Unit-test flight with the verifier's own `courseSteer`. See [flight axes](references/probe-and-verification.md#flight-axes-and-the-verifiers-own-code).
- [tested] **Outline hard-edged parts with welded outline normals.** At `outlineWidth` 0.04 wings and fins got at most a 1 px hairline (coverage as low as 0.37). Welded outline normals plus `engine.setState(false)` before each part draw raised all 71 meshes to 0.93 or more. See [hard-edged parts](references/cell-shading-and-outline.md#outlines-on-hard-edged-parts).
- [tested] **Write every side-effect import a feature needs.** `new GPUParticleSystem(...)` throws without `@babylonjs/core/Particles/webgl2ParticleSystem` although `IsSupported` is true. See [imports](references/bundle-size-and-imports.md#tree-shaking-and-side-effect-imports).
- [tested] **Hide an empty thin-instance mesh.** With `thinInstanceCount = 0` Babylon draws the source mesh at the origin; add `setEnabled(false)`.
- [tested] **Re-check the particle defaults you assume.** `dispose()` also disposes a shared texture; size gradients override `minSize` (a 29 m flash drew at 1 m); under lockstep a 1 s particle lived 1.68 s. See [particles](references/particles-and-explosions.md).
- [tested] **Keep cold caches and the inspector out of verifier runs.** The first dev run after adding Havok logged 504 `Outdated Optimize Dep` errors; the inspector logs a console error in dev and, bundled, made a 30 MB build.

## Not covered here

Choosing between engines is [engine-selection](../engine-selection/SKILL.md). The same game on React Three Fiber is [engine-r3f](../engine-r3f/SKILL.md). Authoring the models belongs to the agent-meshes skills (`mesh-authoring`, `mesh-rigging`, `mesh-build`). Not covered yet (no Slice 1 entry): a bundle-size budget (none was set; the log records what the build carries, not a budget), clips through animation groups (the GLBs have none), camera shake and FOV punch, thin-instancing loaded parts, a game-side collision observer, interpolation between steps, WebGPU (the toon shader is GLSL), the inspector on the full scene, Babylon GUI (HUD is DOM) and the audio by ear.

Choosing this or engine-r3f: the honest comparison is the "Comparison metrics" tables in the `sector-run` repository's `docs/lessons/`. For the same game:

- [tested] Both passed the verifier's 31 of 31 checks on the GPU; the faster engine won the course by 6.7 to 8.3 % here, 5.9 to 8.7 % in R3F.
- [tested] JavaScript: a 1,578 kB main chunk (380 kB gzip) plus Havok's 2.09 MB WASM here; one 1,234 kB chunk (343 kB gzip) in R3F.
- [tested] Here Havok handled ship-versus-rock contact and Babylon.js supplied particles, outlines and an inspector; R3F shipped analytic hit tests and hand-built its emitter and outline.
