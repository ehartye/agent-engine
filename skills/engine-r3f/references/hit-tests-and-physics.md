# Hit tests and physics in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

For a game with fast projectiles, pickups and simple bounds, analytic swept tests are often enough and cheaper to reason about than a physics engine. This repo ships the swept test and shows how the shortcut fails; it does not include `@react-three/rapier`, so every rapier statement below is `[documented]` or `[general]`. Code: [`sweep.mjs`](../../../examples/web3d/core/sweep.mjs); run `node --test examples/web3d/core/core.test.mjs`.

## Choosing swept tests or a physics engine

- [general] Use analytic tests when the shapes are spheres, capsules or boxes, nothing needs stacking, friction or joints, and the game already owns each object's position. You get no async start, no second copy of every position to keep in sync, and deterministic results.
- [general] Use a physics engine (for example `@react-three/rapier`, which wraps Rapier compiled to WASM) when you need rigid-body response, stacking, joints, character controllers or arbitrary collider meshes. Budget for an async WASM load before the first step, a second source of truth for positions, and a console warning gate that may need one allowed line if the bundled WASM package logs on start.
- [general] Whatever you pick, run the check once per fixed step (see [frame loop and state](frame-loop-and-state.md)), not once per rendered frame, so results do not depend on the display rate.

## Fast shots and tunnelling

- [tested] (core test: swept vs end-point) A segment-versus-sphere test (`segmentSphereHit`) hit 400 of 400 fast shots: a 0.3 m shot at 450 m/s covers 7.5 m per 1/60 s step, wider than a 5 m target. Testing only the end point (`endpointHit`) hit fewer (376 of 400 in the seeded run listed in the example README).
- [tested] (core test: segmentSphereHit unit cases) The swept test returns the entry time in 0..1 along the step, 0 when the start is already inside, and null for a miss, a grazing pass outside the radius, a segment that ends short, and motion away from the sphere.
- [general] Use the entry time to place the impact point and to pick the first of several targets along one step. Inflate the target radius by the projectile radius rather than sweeping a capsule.
- [general] A physics engine has the same problem. Discrete steps let a small fast body skip a thin collider, so use continuous collision detection (CCD) for fast solid bodies. Check the engine's docs on whether CCD covers sensor (trigger) colliders before assuming it does. If you rely on sensors for hits, test fast ones with a swept query as well.

## Testing tunnelling honestly

- [tested] (core test: swept vs end-point, fixed phase) Randomise the start phase of each shot. The same end-point shortcut that missed shots at a random phase hit 400 of 400 when every shot started at one fixed phase, because every step's end point happened to land inside the target. A tunnelling test with a fixed phase hides the bug.
- [general] Seed the random generator ([`rng.mjs`](../../../examples/web3d/core/rng.mjs)) so a failure reproduces, and make the speed and size ratios in the test come from the real game values.

## Pickups and bounds

- [general] Analytic pickups (plain arrays stepped with the world, no physics bodies) need explicit bounds. Compute from the spawn rules the farthest a pickup can drift or come to rest, then keep the collect radius and any magnet range above that, and test it across several seeds. A scatter distance that grows with the parent's size can strand pickups outside the collect radius.
- [general] Step pickups and projectiles in the same fixed step as the rest of the rules, so a hit-stop or pause freezes them together.

Related: [frame loop and state](frame-loop-and-state.md), [data-driven entities](data-driven-entities.md).
