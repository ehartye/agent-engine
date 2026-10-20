# Web 3D core

Engine-neutral building blocks for a real-time 3D web game, with the tests that reproduce the lessons in the `engine-r3f` and `engine-babylon` skills. No dependencies and no browser: `node --test examples/web3d/core/core.test.mjs` (also part of `node scripts/check.mjs`).

The renderer apps (React Three Fiber, Babylon.js) call these modules; they do not reimplement them. Copy the shape, not the names.

| Module | What it holds | Test that shows the lesson |
| --- | --- | --- |
| `fixed-loop.mjs` | Fixed-step accumulator with an interpolation alpha | A 144 Hz display over a 60 Hz step runs no step on most frames (84 of 144); a long stall is capped |
| `input.mjs` | Held keys plus one-read latches | A tap between two frames is invisible to a poll and kept by the latch |
| `session.mjs` | The game as a plain object: loop, input, pause, hit-stop, counters | A tap fires exactly once from each of six accumulator phases at 144 Hz, once after a hit-stop, never after a pause; clearing latches every frame loses taps |
| `sweep.mjs` | Segment-versus-sphere hit test and the end-point shortcut | 400 of 400 fast shots hit when swept; an end-point test hit 376 of 400 at a random phase (1,883 of 2,000 in a longer run) and 400 of 400 at one fixed phase, which hides the bug |
| `probe.mjs` | Plain-data probe, "ready means drawn", console gate | Ready needs the model assembled, a known backend and two drawn frames |
| `flight.mjs` | Axis conventions, chase camera, critically damped spring | Pitch > 0 is nose down; a glTF nose is +Z and an unrotated camera looks down -Z; the spring never overshoots from 1/240 s to 1 s frames |
| `rng.mjs` | Seeded PRNG | Repeatable phases and fields |

Figures are from Node 24.18.0 with the seeds in the tests. They are the shape of the failure, not a benchmark: the sizes (a 0.3 m shot at 450 m/s against a 5 m target) are chosen to make a 7.5 m step longer than the target's width at its edges.
