# Web 3D proving ground

One game, built twice from one shared rules core, that the web 3D skills ([engine-r3f](../skills/engine-r3f/SKILL.md) and [engine-babylon](../skills/engine-babylon/SKILL.md)) have to be able to reproduce. It is the acceptance test for the web 3D tier, the way the [sample scene](sample-scene.md) is for the asset path. The sample scene proves that assets arrive and a scene runs; this proves that an agent can build, drive and verify a playable 3D loop.

The game is Sector Run Slice 1 in the private `sector-run` repository: a procedurally generated arcade flight game with a seeded asteroid field, a mining mission, an equippable reward part, assembled ship parts (agent-meshes GLBs placed by socket), toon shading with outlines, layered explosions and native audio. Rules (sector generation, ship stats, missions) live in a pure TypeScript core; each stack owns everything real-time.

## Scenario

An agent following a skill is asked to reach this state on its stack, with the scripted verifier driving the game only through its `window.__game` probe:

1. Load the app with seed `alpha`; wait for `ready`; `errors` is empty and `backend` is `webgl2` or `webgpu`.
2. Course test: with the starter loadout, fly the five-waypoint course (all inside the 190 m clear zone around the spawn, arrival radius 15 m, boost held) and record `simTime`.
3. Mine: pick the nearest living asteroid, fly to it, fire until it is destroyed, collect its ore, until the mission is `complete` and `part-unlocked` for `engine-ion` is in `events`.
4. Equip `engine-ion` through `commands.equip`; `ship.parts.engine` is `engine-ion`, an attachment with `partId: engine-ion` and `socket: socket_engine` exists, and `ship.stats.thrust` rose.
5. Re-run the course; the second `simTime` is at least 3 % lower than the first.
6. Fixed-camera screenshots are non-blank; `fps` is averaged over 10 s at 1080p (a proposed gate of 55 fps).
7. `errors` is still empty.

It asserts state, not pixels, and it asserts the renderer backend, because screenshots miss hidden runtime state and headless WebGPU capture is unreliable on Windows and Linux.

## Pass criteria

- The scenario passes on both stacks with zero errors.
- The backend is asserted, and the renderer string is not a software renderer.
- Frame rate is recorded and compared with the gate.
- A skill-following agent can name, for each topic the logs record (frame loop, parts by socket, outline, particles, physics, audio, probe, WebGPU and headless, versions, and the later R3F systems: flight controls, reticle and streaks, ship classes and weapons, kit-ship assembly and paint, controller menus, varied asteroids, engine-loop and voice audio), the reference that answers it. The skill lint passes: `node scripts/lint-skills.mjs skills/engine-r3f skills/engine-babylon --require-claims --skill-md-labels`.

## Status

Evidence labels as elsewhere: `[tested]` ran in the proving ground, `[documented]` is from vendor docs, `[general]` is unchecked.

Figures are from `pnpm verify:r3f --enforce-fps` and `pnpm verify:babylon --enforce-fps` run on 2026-10-07 against the dev servers of the merged `sector-run` `main`, in Playwright 1.63.0's Chromium 153.0.8010.12 at 1920x1080 with `--use-angle=d3d11 --ignore-gpu-blocklist --force_high_performance_gpu`, on an NVIDIA GeForce RTX 5070 Ti Laptop GPU under Windows 11. Ranges over earlier runs come from the comparison tables in `docs/lessons/r3f.md` and `docs/lessons/babylon.md`.

| Stack | Versions | Backend and renderer | Scenario | Average fps (1080p, 10 s) | Errors | Not verified |
|---|---|---|---|---|---|---|
| React Three Fiber | three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0, zustand 5.0.15, Vite 8.3.3 | [tested] `webgl2`; `ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 Ti Laptop GPU (0x00002F58) Direct3D11 vs_5_0 ps_5_0, D3D11)` | [tested] PASS, 31 of 31 checks in 40.0 s of wall time; course 10.78 s then 10.02 s (7.1 % faster; 5.9 to 8.7 % over the six earlier recorded GPU runs); 3 asteroids mined in 7.6 s of simulation time; `engine-ion` at `socket_engine`, thrust 40 to 52 | [tested] 60.0 measured and reported, gate 55 met; the display caps at 60, so no headroom is shown; 48 draw calls | [tested] none in the probe or the browser; one console warning, the allowed `THREE.Clock` deprecation from @react-three/fiber 9.8.1 on three 0.186.1 | Audio by ear; the toon look and feel by eye (smoke puffs read as one flat grey silhouette in the smoke screenshots); a real gamepad (only a faked `navigator.getGamepads` pad); WebGPU (the app creates only a `WebGLRenderer`); React render counts |
| Babylon.js | @babylonjs/core 9.29.0, @babylonjs/loaders 9.29.0, @babylonjs/havok 1.3.14, Vite 8.3.3 | [tested] `webgl2`; same renderer string | [tested] PASS, 31 of 31 checks in 47.3 s of wall time; course 12.98 s then 12.08 s (6.9 % faster; 6.7 to 8.3 % over the earlier recorded GPU runs); 3 asteroids mined in 10.8 s of simulation time; `engine-ion` at `socket_engine`, thrust 40 to 52 | [tested] 60.0 measured and reported, gate 55 met; the display caps at 60; 69 draw calls | [tested] none in the probe or the browser; no console warnings | Audio by ear; the cel-shaded look and feel by eye (the smoke script counts toon-band and outline pixels; a small black wedge shows where one part pokes into another); a real gamepad; WebGPU (`?backend=webgpu` falls back to WebGL because the toon shader is GLSL only) |

Neither stack was built in paired runs with and without the skills, so the table shows that the stacks carry the game, not how much the skills speed an agent up.

Reproduce: in `sector-run`, `pnpm verify:r3f` and `pnpm verify:babylon` (dev servers on ports 5173 and 5174); the verifier writes its results under `packages/probe/results/`.

## Limits

- [general] Desktop only (keyboard, mouse, gamepad); touch and mobile are not part of Slice 1.
- [general] Combat, scanning, transport and smuggling missions, sector transitions, music and halftone effects are later slices, and each adds scenario steps here when it ships.
- [tested] Both stacks were measured against the proposed 55 fps gate and met it at 60.0 fps; the display caps at 60, so the runs show no headroom, and the gate stays a proposal until heavier scenes calibrate it.
- [tested] Under software WebGL (SwiftShader) both stacks completed the scenario but the verifier reports FAIL on the backend check alone (`webgl-fallback`), because `--allow-software` relaxes only the software-renderer check: 54.3 fps for React Three Fiber, 29.7 fps for Babylon.js.
