---
name: engine-r3f
description: Build, structure, debug and verify a React Three Fiber (three.js) 3D game, especially one that loads agent-meshes GLB parts by socket, runs a per-frame flight or action loop beside React, and is checked in headless Chromium through a state probe. Use before writing R3F or @react-three/fiber game code, when `useFrame` code fights React state, when taps or frames go missing, when `MeshToonMaterial` bands come out grey, or when a render, outline or particle effect looks wrong. Not for choosing an engine (use engine-selection), authoring the models (use the agent-meshes skills) or Babylon.js (use engine-babylon).
---

# React Three Fiber

Start here for any React Three Fiber game. It collects what building Sector Run taught: a procedurally generated arcade flight game built on this stack and on Babylon.js from one shared rules core. `[tested]` ran in Sector Run Slice 1, `[documented]` was read in docs or source, `[general]` was not checked.

Read the reference that matches the work. Do not load all of them.

| You are about to | Read |
| --- | --- |
| Write per-frame code (flight, camera, effects), latch input taps, or decide what may live in React state | [R3F frame loop and React state](references/frame-loop-and-state.md) |
| Load agent-meshes part GLBs and assemble a model by socket, with materials | [Loading agent-meshes parts in R3F](references/loading-agent-meshes-parts.md) |
| Give parts toon shading and an outline, or draw many copies of one mesh | [Toon shading, outlines and instancing in R3F](references/toon-outline-and-instancing.md) |
| Add sparks, smoke, debris or a layered explosion | [Particles and explosions in R3F](references/particles-and-explosions.md) |
| Choose physics or analytic hit tests, or stop fast shots tunnelling | [Physics in R3F](references/physics-rapier.md) |
| Play recorded sound effects (explosion variants, pickup chime) and unlock audio on a gesture | [Audio in R3F](references/audio.md) |
| Expose state to tests, script a run, check flight axes against the verifier, take screenshots or gate on frame rate | [Probing and verifying an R3F game](references/probe-and-verification.md) |
| Choose a renderer backend, reach the GPU in headless Chromium, or debug a blank or flat headless render | [WebGPU, WebGL and headless Chromium for R3F](references/webgpu-and-headless.md) |
| Pin versions, upgrade, or read a breaking-change notice or console warning | [R3F versions and migrations](references/versions-and-migrations.md) |

## First five minutes

1. [tested] **Pin the version and say which.** Slice 1 ran three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 and zustand 5.0.15 with no peer warnings. Fill the probe's `versions` from `package.json` (Vite `define`) plus `THREE.REVISION` so it cannot drift. See [versions](references/versions-and-migrations.md).
2. [tested] **Check what the renderer really is.** With no GPU flags Playwright's headless Chromium renders on SwiftShader, the picture looks plausible and nothing errors. Match the unmasked renderer string, report software as `webgl-fallback` and fail on it; a hybrid laptop needs `--use-angle=d3d11 --ignore-gpu-blocklist --force_high_performance_gpu`. See [WebGPU and headless](references/webgpu-and-headless.md).
3. [tested] **Put rules in a headless core, outside React.** A plain `GameSession` owns the state and the fixed 60 Hz loop; one `useFrame` at priority -2 feeds it; views mutate three.js objects; Zustand holds only rare UI notices. It all ran under Vitest in Node with no DOM. See [frame loop and state](references/frame-loop-and-state.md).
4. [tested] **Decide the verification up front.** Install `window.__game` before React mounts, as plain data copied on demand (0.002 ms a call), and let the shared verifier drive it through `input.set`. See [probe and verification](references/probe-and-verification.md).
5. [tested] **Treat the console as a gate.** The only GPU warning was `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`, once per load. Allow that exact text and fail on anything else.

## Rules that earned their place

- [tested] **Assert state, not pixels.** On SwiftShader both screenshot checks passed (453 and 393 distinct colours) while `backend is webgl2` and the software-renderer check failed.
- [tested] **Test the flight axes with the verifier's own steering code.** The app's tests and pilot shared the app's inverted pitch and yaw, so all passed while the verifier's autopilot reached 1 of 5 waypoints and flew off about 18 km. Pitch > 0 is nose down; yaw > 0 turns the nose toward local +X. See [flight axes](references/probe-and-verification.md#flight-axes-and-the-verifiers-own-code).
- [tested] **Latch taps, and clear a latch only after a fixed step ran.** Unlatched, Playwright's `keyboard.press('Tab')` never opened the loadout; clearing before the loop advanced lost a fire at 144 Hz and in hit-stop. See [input](references/frame-loop-and-state.md#input-core-events-and-the-ui-store).
- [tested] **`ready` means drawn, not loaded.** `<Canvas>` mounts its renderer after the assets load, so a `ready` set on load reported `backend: 'unknown'` and `drawCalls: 0`. Also require `framesDrawn >= 2`.
- [tested] **Patch `MeshToonMaterial` to read the ramp's colour, and make the patch throw.** It samples only `.r` of `gradientMap`, so a coloured ramp renders as grey bands. See [toon ramp](references/toon-outline-and-instancing.md#toon-ramp).
- [tested] **Size outlines in screen space.** A 0.18 m world-space inverted hull was fine on a 3 m ship and invisible on a 40 m rock at 300 m; offset in clip space by 0.008 of the viewport height ([outline](references/toon-outline-and-instancing.md#inverted-hull-outline)).
- [tested] **Sweep fast shots analytically, and randomise the test phase.** A rapier sensor missed 8 of 400 shots at 450 m/s; a swept segment-versus-sphere test hit 400 of 400. An end-point test passed with a fixed phase and failed 48 of 2,000 randomised. See [physics](references/physics-rapier.md).
- [tested] **When the ship is missing, check the camera frame first.** three.js cameras look down local -Z, the glTF nose is +Z; the failure looks like a working game with no ship.

## Not covered here

Choosing between engines is [engine-selection](../engine-selection/SKILL.md). The same game on Babylon.js is [engine-babylon](../engine-babylon/SKILL.md). Authoring and exporting the models belongs to the agent-meshes skills (`mesh-authoring`, `mesh-rigging`, `mesh-build`). Not covered yet (no Slice 1 log entry): animation clips (the part GLBs have none, so no clip played in R3F), disposing loaded parts, camera shake and FOV punch, colliders for parts (the game uses analytic tests, not colliders), WebGPU (the app creates only a `WebGLRenderer`), StrictMode, React render counts, a real gamepad and listening to the audio.

Choosing this or engine-babylon: the honest comparison is the "Comparison metrics" tables in `docs/lessons/` of the `sector-run` repository. For the same game:

- [tested] Both passed the verifier's 31 of 31 checks on the GPU; the faster engine won the course by 5.9 to 8.7 % here and 6.7 to 8.3 % in Babylon.js.
- [tested] JavaScript: one 1,234 kB chunk (343 kB gzip) here; a 1,578 kB main chunk (380 kB gzip) plus Havok's 2.09 MB WASM in Babylon.js.
- [tested] Here rapier was measured and dropped for analytic hit tests, and the emitter and outline were hand-built; Babylon.js kept Havok for ship-versus-rock contact and supplied particles, outlines and an inspector.
