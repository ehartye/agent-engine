---
name: engine-r3f
description: Build, structure, debug and verify a React Three Fiber (three.js) 3D game, especially one that loads agent-meshes GLB parts by socket, runs a per-frame action loop beside React, and is checked in headless Chromium through a state probe. Use before writing R3F or @react-three/fiber game code, when `useFrame` code fights React state, when taps or frames go missing, when `MeshToonMaterial` bands come out grey, or when a render, outline or particle effect looks wrong. Not for choosing an engine (use engine-selection), authoring the models (use the agent-meshes skills) or Babylon.js (use engine-babylon).
---

# React Three Fiber

Start here for any React Three Fiber game. The lessons are backed by a small runnable example, [`examples/web3d`](../../examples/web3d/README.md): engine-neutral core modules with node tests, and an R3F app whose `npm run verify` checks the renderer-specific claims in headless Chromium. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or library source, `[general]` is guidance not checked here.

Read the matching reference only.

| You are about to | Read |
| --- | --- |
| Write per-frame code (flight, camera, effects), latch input taps, or decide what may live in React state | [R3F frame loop and React state](references/frame-loop-and-state.md) |
| Load agent-meshes part GLBs and assemble a model by socket, with materials | [Loading agent-meshes parts in R3F](references/loading-agent-meshes-parts.md) |
| Give parts toon shading and an outline, or draw many copies of one mesh | [Toon shading, outlines and instancing in R3F](references/toon-outline-and-instancing.md) |
| Add sparks, smoke, debris or a layered explosion | [Particles and explosions in R3F](references/particles-and-explosions.md) |
| Choose physics or analytic hit tests, or stop fast shots tunnelling | [Hit tests and physics in R3F](references/hit-tests-and-physics.md) |
| Play sound effects and loops, unlock audio on a gesture, or cap the voices | [Audio in R3F](references/audio.md) |
| Bind keys, sticks and gaze, project a reticle, or ramp speed streaks | [Flight controls](references/flight-controls.md) |
| Build entity classes from a spec table with pooled projectiles | [Data-driven entities](references/data-driven-entities.md) |
| Assemble many kit parts by socket, bake draws, or add a colour picker | [Part kits and paint](references/part-kits-and-paint.md) |
| Make menus controller navigable beside flight input | [Controller-navigable menus](references/controller-navigable-menus.md) |
| Draw a varied, moving, detailed field of objects | [Procedural instanced fields](references/procedural-instanced-fields.md) |
| Expose state to tests, script a run, check flight axes against the verifier, take screenshots or gate on frame rate | [Probing and verifying an R3F game](references/probe-and-verification.md) |
| Choose a renderer backend, reach the GPU in headless Chromium, or debug a blank or flat headless render | [WebGPU, WebGL and headless Chromium for R3F](references/webgpu-and-headless.md) |
| Pin versions, upgrade, or read a breaking-change notice or console warning | [R3F versions and migrations](references/versions-and-migrations.md) |

## First five minutes

1. [tested] **Pin the version and say which.** The example pins three 0.186.1, @react-three/fiber 9.8.1 and react 19.3.0 and fills the probe's `versions` from `package.json` (Vite `define`) plus `THREE.REVISION`, so it cannot drift (R3F verify: probe versions). See [versions](references/versions-and-migrations.md).
2. [tested] **Check what the renderer really is.** With no GPU flags Chromium chose SwiftShader on the test machine and a software renderer draws a plausible picture with no error. Classify the unmasked renderer string, report software as `webgl-fallback` and fail on it (R3F verify: hardware GPU; `node renderer-flags.mjs` prints the choice per flag set). Use the platform's ANGLE backend plus `--ignore-gpu-blocklist --force_high_performance_gpu` ([`gpuArgs`](../../examples/web/verify-checks.mjs)). See [WebGPU and headless](references/webgpu-and-headless.md).
3. [tested] **Put rules in a headless core, outside React.** A plain session owns the state and the fixed-step loop; one `useFrame` at priority -2 feeds it; views mutate three.js objects at the interpolation alpha ([core](../../examples/web3d/core/session.mjs), [App.jsx](../../examples/web3d/r3f/src/App.jsx)). See [frame loop and state](references/frame-loop-and-state.md).
4. [tested] **Decide the verification up front.** Install `window.__game` before React mounts, as plain data copied on demand, and drive the game through real keyboard events (R3F verify: rendered axes, one key press). See [probe and verification](references/probe-and-verification.md).
5. [tested] **Treat the console as a gate.** The example allows only `THREE.Clock: This module has been deprecated` (R3F 9.8.1 still creates one); anything else fails (R3F verify: console gate).

## Rules that earned their place

- [tested] **Assert state, not pixels.** Software rendering passes a screenshot check; the renderer-string check is what fails it ([`verify-checks.test.mjs`](../../examples/web/verify-checks.test.mjs) classifies SwiftShader, llvmpipe and Basic Render Driver strings as software).
- [tested] **Read the rendered object when testing the axes.** The example reports the nose as the three.js object's world +Z, so a rules-only test cannot agree with an inverted view. Pitch > 0 is nose down; yaw > 0 turns the nose toward +X (R3F verify: rendered axes; core test: flight conventions).
- [tested] **Latch taps, and clear a latch only after a fixed step ran.** `keyboard.press` is down and up in one tick; at 144 Hz most frames run no step, and a hit-stop runs none for several (core tests: tap fires once from every accumulator phase, hit-stop, pause; R3F verify: one key press, one shot).
- [tested] **`ready` means drawn, not loaded.** `<Canvas>` mounts its renderer after the assets load, so require the model assembled, a known backend and `framesDrawn >= 2` (core test: ready; R3F verify: ready means drawn).
- [tested] **Patch `MeshToonMaterial` to read the ramp's colour, and make the patch throw.** three r186 samples only `.r` of `gradientMap`, so a coloured ramp renders grey (R3F verify: toon ramp). See [toon ramp](references/toon-outline-and-instancing.md).
- [tested] **Size outlines in screen space.** A clip-space hull is the same pixel thickness near and far; a world-space hull vanishes on a large far object (R3F verify: outlines).
- [tested] **Sweep fast shots analytically, and randomise the test phase.** An end-point test passes at one lucky fixed phase and misses shots at random phases (core test: swept vs end-point). See [hit tests](references/hit-tests-and-physics.md).
- [tested] **When the model is missing, check the camera frame first.** A three.js camera looks down local -Z and a glTF nose is +Z, so a chase camera is yawed pi further than the ship (core test: flight conventions).

## Not covered here

Choosing between engines is [engine-selection](../engine-selection/SKILL.md). The same kind of game on Babylon.js is [engine-babylon](../engine-babylon/SKILL.md). Authoring and exporting the models belongs to the agent-meshes skills (`mesh-authoring`, `mesh-rigging`, `mesh-build`). The example does not check GLB loading, clips, audio, a real gamepad, particles, WebGPU, StrictMode or React render counts.

## R3F or Babylon.js

- [general] R3F is a thin renderer binding over three.js: you assemble physics, particles, outlines and an inspector yourself, and the bundle stays small. Babylon.js ships those systems, at a larger download.
- [general] Pick on the team's React fit and the built-in systems the game needs, then build the same small slice in the candidate and compare bundle size, frame cost and probe readability.
