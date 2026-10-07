# Physics in R3F

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1 in headless Chromium 153 and Node 24, on an NVIDIA RTX 5070 Ti Laptop GPU.

Slice 1 measured `@react-three/rapier` and shipped analytic swept-sphere tests instead. The file keeps its name so the rapier measurements stay findable.

## The choice and what it was weighed against

- [tested] Use analytic swept spheres for shots, ore pickups and the ship's bounce. Rapier worked and was fast enough, but it adds an async WASM start, a console warning, a second copy of every position and a sensor-tunnelling trap, for no behaviour the game needs. The dependency was removed again.
- [tested] Analytic swept spheres were exact (400 of 400 at 450 m/s), 25 to 50 times cheaper per trial than rapier (which also pays for setup), and deterministic with no WASM start.
- [tested] Ore is analytic too: plain arrays (`src/game/pickups.ts`) stepped with the world, no physics bodies.

## Setup and stepping

- [tested] `@react-three/rapier` 2.2.0 mounts under R3F 9.8.1 in headless Chromium, and `useRapier()` hands back the raw world.
- [tested] Start-up including page load took 0.65 to 1.07 s (0.81 s in the implementation run).
- [tested] It bundles `@dimforge/rapier3d-compat` 0.19.2 (0.21.0 exists), which logs `using deprecated parameters for the initialization function` on start: a console warning a zero-warning gate must allow.
- [tested] A world step with 40 fixed spheres and 20 CCD bodies cost 0.008 to 0.011 ms (0.0105 ms in the implementation run). A trial including setup cost about 0.07 to 0.14 ms (0.123 ms sensor, 0.090 ms solid with CCD).

## Determinism and the core boundary

- [tested] Rapier repeated exactly: the tunnelling counts below came out identical on a second run and again in the implementation run.
- [tested] Rapier keeps a second copy of every position beside the game's own state; that duplication was one of the four costs that decided against it.
- [tested] Hit tests run once per fixed 60 Hz step, and each sweeps the segment a shot travelled in that step: at 450 m/s a 0.3 m shot covers 7.5 m per step, more than an end-point test can safely skip.

## Fast shots, tunnelling and swept tests

- [tested] A rapier sensor collider without CCD missed 8 of 400 fast shots (2 %) against a 5 m rock because it stepped over it; a solid body with CCD hit 400 of 400. Reproduced as 392 / 400 and 400 / 400 in the implementation run.
- [tested] Sensors are not covered by CCD, so a sensor-based hit test needs a swept test anyway.
- [tested] Analytic swept segment-versus-sphere (`segmentSphereHit`) hit 400 of 400 at about 0.003 ms per trial, with no setup, no WASM and no handles. A whole step of 20 shots against 40 rocks (800 tests) cost about 0.003 ms (0.0039 ms per step in the implementation run, against a 0.05 ms gate).
- [tested] Randomise the start phase when testing tunnelling. A test that checked only each step's end point failed 48 of 2,000 trials once the phase was randomised; with a fixed phase every end point happened to land inside the rock and the shortcut passed. (Planning run. The randomised-phase test is in `tests/combat.test.ts`.)
- [tested] Analytic pickups need their own bounds. A broken rock flings ore at 6 plus up to 10 m/s from `min(0.4 x radius, 4)` m off centre; damped at 1.5/s it drifts at most 10.7 m and rests within 14.7 m of the centre. Within 100 m a magnet pulls it at `90 + 1.2 x ship speed` m/s, and it is collected within 10 m (`src/game/world.ts`, `tests/world.test.ts`, five seeds).
- [tested] The bound needed a fix: with a 6 m collect radius and an uncapped 0.4 x radius offset, ore came to rest up to about 27 m from a 40 m rock (commit `b8b6a36`). After it, the shared verifier collected every targeted rock's ore (12 ore from 3 rocks, `uncollected` 0).
