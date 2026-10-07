# Ship classes, spec-driven flight and weapon families in R3F

Evidence: Sector Run, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there (lessons log or a unit test re-run on 2026-10-07), `[documented]` was read in code only, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1 in Vitest (Node) or headless Chromium 153 on an NVIDIA RTX 5070 Ti Laptop GPU.

Three ship classes that fly differently because the flight model reads a `ShipSpec`, and seven weapon families simulated on pooled analytic hit tests. Use it for any game with several vehicles or parts that change handling, or weapons that differ in mechanics (homing, weave, pierce, beam, burst), when both must be testable without a renderer.

## Structure

- [documented] Keep the rules (class envelopes, part stats, weapon data and damage maths) in a headless package; the app moves them into a fixed 60 Hz loop. Fleet state is a mutable holder over a pure state, with `preview` (run the rules, throw a typed error, change nothing) before `apply`.
- [documented] One entry point (`session.equip(slot, partId)`, where slot `class` means the part is a class id) serves the probe's `commands.equip` and the loadout screen. Per step the world runs rocks, `stepSpecFlight`, ship contact, then the armament, then folds earned boost into the ship's tank.
- [tested] The world reads `hitRadius` (collision and drawn scale) and `mass` (recoil); the flight model reads the rest of the spec.

## Spec-driven flight

- [tested] `stepSpecFlight` is the base flight model with its constants replaced by spec fields: `pitchRate`, `yawRate`, `rollRate`; `accel` and `maxSpeed`; `brake` as a deceleration in m/s^2; `stability / 0.9` bounded to 0.3 to 2 as the strength of both assists (velocity toward the nose, auto-level); `drag`.
- [tested] Boost is a finite tank: it drains at `boostDrain` while held, refills at `boostRegen` only once released, and empty means no boost. One class has a lateral dash (`dashImpulse` along local +X or -X, then `dashCooldown`); a class with impulse 0 ignores the request.

```ts
const assist = clamp(spec.stability / 0.9, 0.3, 2);
const boosting = wantBoost && b.boostEnergy > 0;
if (boosting) b.boostEnergy = Math.max(0, b.boostEnergy - spec.boostDrain * dt);
else if (!wantBoost) b.boostEnergy = Math.min(spec.boostEnergy, b.boostEnergy + spec.boostRegen * dt);
v.lerp(forward.multiplyScalar(speed), 1 - Math.exp(-assistRate * assist * dt));
```

- [tested] Measure that classes differ with a renderer-free test over the same flight code (fixed step 1/60): starters took 1.10 s, 2.95 s and 1.92 s to 60 m/s; yaw 2.46, 0.48 and 1.57 rad/s; boost peaks 210, 93 and 130 m/s; drift in a full turn 11.4, 1.5 and 34.4 degrees; only one class dashes (19.9 m sideways in 1.5 s). The browser run through `window.__game` agreed in ordering.
- [tested] A metric can mislead: time to 95 percent of a class's own top speed made the slow-accelerating corvette look as quick as the interceptor (3.33 s against 3.53 s) because its cap is lower. Use a common target every class reaches (60 m/s).

## Traps

- [tested] A finite tank thinned the verifier's "faster engine wins the course" margin to 3.4 and 5.4 percent against a 3 percent gate. Checks that assumed a long boost broke (a streak sample after holding Shift 7 s on a 2.8 s tank): sample at a speed, not a duration.
- [tested] A headless test that equips a part must go through the fleet (`session.equip`). `dispatch({type: 'equip'})` changed only the legacy state, the ship did not change, and the course read 0 percent faster, which looked like a flight regression.
- [tested] Keeping legacy unlock gating on every shipping id made the weapon smoke stage fail with `PART_LOCKED` and would have locked a corvette's starter hull on a class change. Only the one mission-reward part is gated. Unit tests missed it; the browser stage found it.
- [tested] Compat path to keep a legacy probe contract: keep the old state beside the fleet, report `ship.stats` as the resolved ship's legacy projection and let `equip('class', id)` fit the old signature, so the verifier needed no change.
- [tested] Scale the drawn ship from its hit radius (`clamp(hitRadius / 2.4, 0.6, 2)`); a 1.9 times larger ship filled the frame, so the chase camera's offsets scale by `max(1, scale) ** 1.3`.

## Weapon runtime

- [documented] An `Armament` class calls core's pure `stepWeapon` each step and simulates the result. Shots are `projectile` (spawned into a pool), `hitscan` (a ray through `pierce + 1` rocks) or `beam` (a ray plus one chain hop). Collision radii differ per family (0.25 to 1.0 m).
- [documented] `ShotPool` is struct-of-arrays (`Float32Array` per field, capacity 256, swap-remove, a `dropped` counter when full), the same layout as the particle pool. Every step sweeps the segment `p0 -> p1` of each shot, so fast shots cannot tunnel; see [physics](physics-rapier.md).
- [tested] Homing turns the heading toward the target at `turnRate` and keeps speed; unlocked, a missile flies past a rock 7 degrees off the nose, locked it turns onto it. Weave adds lateral speed `amp * speed * cos(2 pi hz t)` along the ship's local X (a pulse bolt moves over 1.5 m sideways, a twin bolt under 0.5 m).
- [tested] Scatter does more than 1.5 times the damage at 14 m than at 60 m (cone falloff by distance travelled); a pulse burst damages a neighbouring rock; the rail loses 15 percent per target (70, 59.5, 50.6 on three 80 hp rocks); the beam reaches 42 m and chains one hop to the nearest neighbour.
- [tested] Recoil is core's `knockbackVelocity` times 0.5 against the shot, so a light ship is pushed back more than a heavy one; hit-stop comes from the shot's `hitStopMs`. A beam has no shot, so report one every 0.25 s while held to give it a muzzle event and a fire sound; report beam hits every 0.1 s, not every step.
- [tested] A class with more hardpoints emits one shot per mount per cycle (3, 2 and 1 for the three classes).

## Weapon rendering

- [documented] One `InstancedMesh` per projectile family (own shape and unlit `MeshBasicMaterial` colour from one table), shots drawn backed off along their velocity by `(1 - alpha) * step`. Rail traces, beams and chains are stretched unit boxes from a 32-slot pool; rail charge and spore stacks are a glow sphere at every muzzle. Muzzle flashes and missile or spore trails are pooled sparks, so they add no draw call.
- [tested] What looks wrong: the explosion flash hides the beam and pellets on the frame a big rock dies, and a trace anchored to its step's muzzle trails the ship by up to about 1 m at 60 m/s in a turn.

## Costs

- [tested] Draw calls while firing, against 40 idle then: 42 twin, 38 pulse, 45 rail, 47 scatter, 45 missile, 49 arc, 54 spore; 60.0 fps mean at 1080p in the combat soak.
- [tested] Core's pure `stepWeapon` allocates a new state, shots and events array each step: 0.2 to 2.0 KB per step while firing (about 100 to 120 KB/s), no frame-time change. The pools and instance buffers allocate nothing after construction; a test asserts the pools do not grow.

## Verification and not verified

- [tested] 27 tests in the classes and weapons files pass (re-run 2026-10-07); the browser stages (`smoke classes`, `smoke weapons`) found the gating, a menu flag that never arrived and stale smoke-pilot stats after every unit test passed.
- [general] The unit of `weave.amp` is undocumented in core; it is read as a fraction of speed.
- [general] Not verified: how any class or family feels in a human's hands, class balance, and enemy weapons.
