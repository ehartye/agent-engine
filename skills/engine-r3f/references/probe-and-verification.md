# Probing and verifying an R3F game

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1, @react-three/fiber 9.8.1, Vitest 5.0.3 and Playwright 1.63.0 (Chromium 153), on an NVIDIA RTX 5070 Ti Laptop GPU, 2026-10-07.

The probe is `window.__game`; the shared verifier (`packages/probe`, `pnpm verify:r3f`) drives it in headless Chromium.

## The probe object

- [tested] Make the probe plain data the session already holds, copied on demand (`buildProbeState`): `ready`, `backend`, `renderer`, `versions`, `frame`, `fps`, `drawCalls`, `simTime`, the ship, rocks, mission, inventory, events, errors and the audio log.
- [tested] It is cheap enough to call every frame: 0.020 ms per call in Node (40 rocks, 13 events) and 0.002 ms in headless Chromium (40 rocks, 5,000 calls after boot).
- [tested] Install `window.__game` before React mounts; `ready` flips later (see [frame loop and state](frame-loop-and-state.md) for what `ready` must wait for).
- [tested] Fill `versions` from `package.json` through Vite's `define` plus `THREE.REVISION`, so it cannot drift from what is installed.
- [tested] `renderer.info.render.calls` is reset when a render starts, so reading it in a `useFrame` before drawing gives the previous frame's count. That is what the probe reports as `drawCalls`.

## A scripted scenario

- [tested] Time the course in simulation time, not wall time: the same scenario gave 10.67 s then 9.88 s under Vitest (0.05 s of wall time) and 10.67 to 10.70 s then 9.88 to 9.92 s in four browser runs at 60 fps, on the GPU and on SwiftShader alike.
- [tested] An in-page pilot that sets inputs once per `requestAnimationFrame` does not line up one-to-one with fixed steps; that is the small browser spread.
- [tested] A "faster engine wins the course" check depends on the autopilot. A pursuit bot that boosts into every waypoint orbits it and made `engine-ion` slower. An arrival law (speed capped at `0.4 x turnRate x distance` until the nose is within about 26 degrees) made it 4.6 % or more faster in all 60 tuning variants and 6.4 % to 8.8 % in the 18 the test suite runs.
- [tested] `pnpm verify:r3f --enforce-fps`, twice: both `PASS`, backend `webgl2`, course 10.80 s then 10.05 s and 10.90 s then 10.15 s (6.9 % both), mining 3 asteroids and 10 ore, 40.1 s of wall time each. Across six passing GPU runs the gap was 5.9 to 8.7 %.
- [tested] The verifier's driver sets inputs and reads `state()` every 30 ms of wall time (`controlMs`), not once per fixed step, so its course times differ slightly from the app's pilot and vary by about 0.1 s between runs.

## Flight axes and the verifier's own code

- [tested] The contract: pitch, yaw and roll are rates about the ship's local axes by the right-hand rule; pitch > 0 is nose down, yaw > 0 turns the nose toward local +X (the ship's left). The flight model first rotated by (-pitch, -yaw, +roll), so pitch +1 raised the nose and yaw +1 turned right.
- [tested] Nothing in the app caught it: the flight sign test, the bank test, the input mapping tests and the test pilot's `aimAt` all encoded the same inversion, so every app test passed. The verifier's autopilot (`courseSteer`) follows the contract, so it steered away from every waypoint, reached 1 of 5 and flew off about 18 km.
- [tested] Fix (commit `2c9e22c`): `flight.ts` rotates by the action signs directly; `input.ts` negates yaw on keys, mouse and pad so right still turns right; pitch is flight-stick style (up gives pitch +1, nose down); the visual bank's target flips sign.
- [tested] Reuse the verifier's steering code in the app's unit tests. `tests/verifierCourse.test.ts` deep-imports `courseSteer`, `toActions`, `viewOf`, `CourseTracker`, `WAYPOINTS` and `runScenario` from `packages/probe/src`, flies the five waypoints on a headless `GameSession` at 3 frames per command (the fake driver's 20 Hz), and requires all five plus `engine-ion` at least 3 % faster.
- [tested] Re-run 2026-10-07 with a scratch copy of the test's course loop: the fixed signs reached all five waypoints at 1, 2, 3 and 4 frames per command (`engine-ion` 7.3, 7.7, 5.6 and 6.6 % faster). With pitch and yaw negated before `input.set` (the old signs), 3 frames per command reached 1 of 5 within the 90 s limit and ended 18.1 km (starter) and 20.1 km (`engine-ion`) from the origin.

```ts
// the probe's index exports only the browser-safe schema, so import the Node-side pilot by path
import { courseSteer, toActions, viewOf } from '@sector-run/probe/src/autopilot';
import { CourseTracker, WAYPOINTS } from '@sector-run/probe/src/course';
```

## Screenshots and what they miss

- [tested] Screenshots do not catch a software render: with no Chromium flags both screenshot checks passed on SwiftShader (453 and 393 distinct colours) while `backend is webgl2` and `renderer is not a software rasteriser` failed.
- [tested] The probe catches what pixels cannot: a software rasteriser, an unknown part, a lost context.

## Frame-rate gate

- [tested] Boosted flight with the cannon firing and rocks breaking, 10 s at 1920x1080: mean 60.0 fps, minimum 59.9, at most 48 draw calls. Boot at 1280x720 drew 40.
- [tested] The verifier's gate is a 55 fps mean over 10 s; it measured 60.0 and the probe reported 60.0.
- [tested] A 60 Hz display caps the result, so a pass shows no headroom. Measure the scene unthrottled for that: 0.04 to 0.06 ms per frame on the NVIDIA GPU.

## Zero errors

- [tested] Route into `errors`: `window` errors, unhandled rejections, failed GLB and WAV fetches (`asset load failed: /parts/engine-ion.glb: Failed to fetch`), `CoreError`s from rejected core inputs (`UNKNOWN_PART`, `PART_LOCKED`) and `webglcontextlost` (forced with `WEBGL_lose_context`). Each shows an on-screen banner and leaves the game state unchanged.
- [tested] Fail the smoke script on every console error, page error and warning except the exact text `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` (once per page load).
- [tested] Refuse to reuse a dev server on the port unless it serves this checkout's `apps/r3f/package.json` through Vite's `/@fs/` route, so a stale server from another checkout cannot pass.
- [tested] The verifier checked `errors` empty after load, after the equip and at the end.

## Tests without a renderer

- [tested] Logic that needs no renderer ran under Vitest in plain Node with no DOM: three.js maths and `Quaternion`s, `GLTFLoader.parseAsync` on the real part GLBs, Zustand, the whole probe scenario. 21 test files, 168 tests, under 2 s, at the point in the build where it was recorded.
- [tested] The verifier's own scenario runs headless too: `tests/verifierCourse.test.ts` runs the whole `runScenario` with a headless `Driver` over `makeProbe` and `input.set`.
- [documented] Both verifier-course tests fail on the old flight signs (commit `2c9e22c` message; that claim itself was not re-run).
