# Probing and verifying a Babylon.js game

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

Two checkers ran against the app: the shared verifier (`pnpm verify:babylon`, 31 checks) and the app's own `scripts/smoke.mjs` (49 checks).

## The probe object

- [documented] The app builds a plain snapshot each frame and the shared probe runtime publishes it as `window.__game`, adding `events` and `errors`; `drawCalls` comes from `SceneInstrumentation.drawCallsCounter.current` (`apps/babylon/src/probe/state.ts`, `src/game/game.ts`).
- [tested] What the verifier read from it: backend, simulation time, the ore mined, the attachments (`engine-ion` at `socket_engine` of `hull-dart`), thrust 40 -> 52, fps, draw calls, `audio.unlocked` and `audio.played`.
- [tested] Report the unbanked flight orientation (`orientationOf()`), not the drawn one; see [flight axes](#flight-axes-and-the-verifiers-own-code).
- [tested] A GPU particle system's `getActiveCount()` counts emitted particles, not live ones, so keep live effect counts in the app (`Effects.counts()`); see [particles](particles-and-explosions.md#cpu-and-gpu-systems).
- [tested] The verifier reports `drawCalls` once, from the state after its final step (`packages/probe/src/scenario.ts`, `results.ts`): 69 with `engine-ion` fitted. The smoke `perf` stage reports the maximum of ten 1 s samples after a reset to the starter ship: 54. Compare like with like.

## A scripted scenario

- [tested] Run `pnpm verify:babylon --enforce-fps` against `pnpm --filter @sector-run/babylon dev`. Both passing runs: backend `webgl2` on the NVIDIA GPU, zero errors at start and end, three asteroids (a10, a35, a37) mined in 10.8 and 10.7 s of simulation time, course 12.98 s -> 12.12 s (6.7 % faster) and 13.05 s -> 11.97 s (8.3 %), 47.8 and 47.1 s of verifier wall time (50 and 49 s for the whole command).
- [tested] Across every passing GPU run recorded on 2026-10-07 (1920x1080) the course gap was 6.7 to 8.3 % against a 3 % gate.
- [tested] The first run failed 2 of 31 checks, `audio is locked before the click` ([audio](audio.md#unlock-on-the-first-gesture)) and `course 2 is at least 3% faster`. Both were app bugs, not verifier bugs.
- [tested] Ore stays reachable: Babylon spawns ore up to `min(radius / 2, 10)` m from the rock centre and lets it drift at most 5 m (1.5 to 4 m/s, drag 0.8/s), within the contract's 15 m; it is collected at 10 m and pulled in from 60 m at 25 to 170 m/s. Every kill delivered its full ore.

## Flight axes and the verifier's own code

- [tested] Symptom: the course check failed, 17.53 s -> 22.05 s (25.8 % slower with the faster engine).
- [tested] History: (1) the plan's model yawed about body +Y but rolled a bank assist (up to 0.9 rad) into the flight orientation, so held full yaw dived: nose -35 degrees at 1 s, -66 at 2 s. The flight tests passed only because they sampled at 1.5 s. (2) Yaw about world up fixed the dive (held full yaw within 0.6 degrees of level) but broke the contract, whose axes are rates about the ship's own axes, as the probe's course law (`courseSteer`) assumes: offline course times went erratic (starter 15.8 to 25.3 s) and `engine-ion` was 7 % slower at one command per 2 steps.
- [tested] World-up yaw also trapped the smoke `loop` stage: its steering sent yaw only for a target behind, a heading turn never changes elevation, and from a nose raised 60 degrees the ship climbed a helix (5.8 km up after 40 s, mining stuck at 9 of 10 ore for 300 s). The smoke steering now pitches toward a target behind too, and fails if a rock takes over 45 s or a kill yields less than `max(1, round(radius / 4))` ore.
- [tested] Workaround: turn by the smoothed rates about local X, Y and Z, and keep bank-to-turn on the drawn model only. `FlightState.bank` follows the yaw rate (target `-yawRate / turnRate x 0.9` rad, gain 4/s) and only `visualOrientation()` adds it, for the ship node; the probe, the chase camera and the muzzle use `orientationOf()`, and Havok gets only the velocity.
- [tested] Check, re-run on 2026-10-07: `pnpm --filter @sector-run/babylon test` passes 136 of 136. Flying the probe's own `courseSteer` and `CourseTracker` on `stepFlight` gave starter -> `engine-ion` 12.83 -> 11.75 s (8.4 %) at 1 step per command, 12.90 -> 11.80 (8.5 %) at 2, 13.00 -> 11.95 (8.1 %) at 3, 13.13 -> 11.93 (9.1 %) at 4. Held full yaw for 4 s kept the nose at 0.0 degrees elevation every second, with the visual bank at -0.90 rad and the flight orientation's bank at 0. These times are about 0.3 s slower than the final commit's own offline figures (12.6 -> 11.4 s, harness not recorded) and closer to the real verifier runs.
- [tested] Rule: unit-test the flight model with the verifier's own steering code (`tests/flight.test.ts`), at every control rate the verifier can run at.

## Screenshots and what they miss

- [tested] The verifier's 31 checks are 26 on probe state and 5 on screenshots. The smoke script adds checks the verifier does not make: toon bands and outline colour by pixel count, outline coverage per part mesh, the loadout pausing the simulation, the ore of every kill, and that a bad part id and a lost WebGL context reach `errors`.
- [tested] Screenshots showed the engine at the rear and the cannon on the nose. The outline gap on hard-edged parts was put into numbers by the smoke `outline` stage (each mesh alone on grey, coverage per mesh: as low as 0.37 before the fix, 0.93 or more after); see [hard-edged parts](cell-shading-and-outline.md#outlines-on-hard-edged-parts).
- [documented] The HUD is DOM over the canvas: Playwright clicks it by test id, but canvas readbacks do not see it (`apps/babylon/src/ui/hud.ts`).

## Frame-rate gate

- [tested] With `--enforce-fps` the gate is 55 fps over 10 s; both runs measured 59.9 and 60.0 fps at 1920x1080 on the NVIDIA GPU. On SwiftShader the verifier ran at 29.7 fps without the gate; see [software rendering](webgpu-and-headless.md#software-rendering).

## Zero errors

- [tested] Both passing runs had zero errors at the start and at the end; the smoke script checks that a bad part id and a lost WebGL context do reach `errors`.
- [tested] A cold Vite dependency optimizer logs 504 `Outdated Optimize Dep` console errors on the first dev run after new dependencies (Havok, physics modules); the page still worked and the second run was clean. Start verifier runs from a warmed or pre-optimized cache, and never silently ignore a cold run's 504s.
- [tested] The inspector logs a console error in dev (`Keyborg instance k1 is being disposed incorrectly`); keep it out of verifier runs ([inspector](inspector-and-debugging.md#headless-use)).
