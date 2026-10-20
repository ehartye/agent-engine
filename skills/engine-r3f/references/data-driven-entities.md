# Data-driven entities, pooled projectiles and derived stats in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

How to make several vehicle classes, parts or weapon types behave differently from data, with the rules testable without a renderer. The example has one ship and one projectile type, so the table, validation and derived-stat advice is `[general]`; the swept projectile test and the instanced drawing are reproduced here. Run `node --test examples/web3d/core/core.test.mjs` and `cd examples/web3d/r3f && npm run verify`.

## Rules live outside the renderer

- [documented] Keep the rules in a plain module that the view only reads: [game.mjs](../../../examples/web3d/core/game.mjs) imports no three.js and no React, steps inside the session's fixed loop and exposes `state`; `App.jsx` draws it at the loop's alpha. The same shape serves a Babylon.js view.
- [general] One entry point per change (`equip(slot, id)`, `fire`) serves the loadout screen, the probe's commands and the tests. A headless test that mutates state through a second, legacy path can pass while the visible vehicle never changed.
- [general] Offer `preview` (run the rules, throw a typed error, change nothing) before `apply`, so a UI can show a stat delta on hover without committing.

## Spec tables validated at load

- [general] A class or part is a row in a table: handling (turn rates, acceleration, top speed, brake, drag, an assist strength), hit radius, mass, resource tank (capacity, drain, regen), weapon mounts. The flight model reads the row; nothing branches on a class name. Validate every row when the table loads (finite numbers, ranges, references to ids that exist) and fail at load with the row and field, not mid-flight.
- [general] Derive rather than store: a drawn scale from the hit radius with a clamp, camera offsets from the scale, an assist strength from one stability number bounded to a range. A derived value cannot drift from its source, and tuning is one edit.
- [general] A finite resource (boost tank) drains while held, refills only after release, and means no boost when empty. Checks that assumed a long boost break when a tank is added: sample at a speed, not after a duration.
- [general] Prove that classes differ with a renderer-free test over the same flight code at the fixed step. Pick a common target every class reaches (time to a shared speed), not time to a fraction of each class's own top speed, which flatters slow classes.

```js
const assist = clamp(spec.stability / 0.9, 0.3, 2);       // derived, bounded
const boosting = wantBoost && tank > 0;                    // finite tank
if (boosting) tank = Math.max(0, tank - spec.boostDrain * dt);
else if (!wantBoost) tank = Math.min(spec.tank, tank + spec.boostRegen * dt);
```

## Pooled projectiles on swept hit tests

- [tested] A shot's per-step move can exceed a target's width, so test the segment from the last position to the new one, not the end point. In "swept segment tests hit 400 of 400 fast shots" the swept test hits all 400 while the end-point test misses some at a random phase, and still hits 400 of 400 at one fixed phase, which hides the bug. [sweep.mjs](../../../examples/web3d/core/sweep.mjs) is `segmentSphereHit`; [game.mjs](../../../examples/web3d/core/game.mjs) calls it for each shot against each target, with the shot radius added to the target's.
- [tested] The verifier's "one key press fires one shot that sweeps into the target" fires once and checks `fired === 1` and `hits === 1`.
- [general] Pool projectiles: struct-of-arrays (`Float32Array` per field, fixed capacity, swap-remove on expiry, a `dropped` counter when full), so firing allocates nothing. The example keeps an array of small objects for clarity; switch when firing is continuous. Assert in a test that the pool does not grow.
- [general] A kind of shot is data too: `projectile` (a pooled body), `hitscan` (a ray through N targets) or `beam` (a ray with a chain). Homing is a turn rate toward a target with speed kept; weave adds a lateral velocity term. Document the unit of each parameter (is an amplitude a fraction of speed or metres?).
- [general] A beam has no discrete shot, so emit a muzzle event on a timer while held and report beam hits on a coarser interval than the step.
- [general] Recoil from a knockback law scaled by projectile and divided by mass, so a light vehicle is pushed more than a heavy one; a hit-stop requested by the shot.
- [general] Sweeping against non-spherical bodies: cull with a bounding sphere first, since swept-ellipsoid tests allocate. See [hit tests and physics](hit-tests-and-physics.md).

## Drawing them

- [tested] One `InstancedMesh` per projectile family: the instancing check shows 1,000 separate meshes cost about 1,000 draw calls and one `InstancedMesh` costs 1 (labs `?scene=instancing`, verifier check "1,000 meshes cost about 1,000 draw calls; one InstancedMesh costs 1"). The example draws shots as one instanced mesh and sets `count` to the live shots each frame ([App.jsx](../../../examples/web3d/r3f/src/App.jsx)).
- [general] Draw a shot backed off along its velocity by `(1 - alpha) * step` so it is smooth between steps. Muzzle flashes and trails as pooled particles add no draw calls ([particles and explosions](particles-and-explosions.md)).
- [general] Look at a frame where a big event and a beam coincide: an explosion flash can hide the beam, and a trace anchored to the step's muzzle trails a moving vehicle.

## Traps

- [general] A legacy probe contract can be kept while the data model changes: keep the old state beside the new, report the old fields as a projection of the resolved entity, and let the old command signature route to the new entry point, so the verifier needs no change.
- [general] Legacy gating (unlock flags by id) copied onto every new id can lock the starter of a new class. Gate only what is meant to be gated, and run a browser stage that equips every class; unit tests did not see it.
- [general] A table-driven lookup that answers a default silently for an unknown id hides missing rows. Assert that every id has its own entry.

## Links

- [Frame loop and state](frame-loop-and-state.md)
- [Flight controls](flight-controls.md)
- [Part kits and paint](part-kits-and-paint.md)
