# Babylon.js handedness and coordinates

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

Every other Babylon.js reference assumes this one. The contract it holds: right-handed, +Y up, ship nose along local +Z, yaw > 0 turns the nose toward +X.

## The decision

- [tested] Set `scene.useRightHandedSystem = true` right after creating the scene, before loading anything. It held in every check below, and nothing in the app needed a flip, a mirror or an axis swap.

```ts
const scene = new Scene(engine);
scene.useRightHandedSystem = true; // match the core: right-handed, +Y up, glTF +Z front
```

## What changes when handedness flips

- [tested] The glTF loader still wraps each GLB in a `__root__` node, but in a right-handed scene that node carries no flip: a stand-in hull's bounds came out min (-0.8, -0.3, -1.2) max (0.8, 0.3, 1.6) and `socket_engine`'s world position (0, 0, -1.2), exactly as authored.
- [tested] `Vector3.Forward(true)` is -Z in a right-handed scene. Never use it for a +Z nose; write `new Vector3(0, 0, 1)`.
- [tested] Cameras follow the right-handed rule: a `FreeCamera` at z +10 looking at the origin (down -Z) projects world +X right of centre, -X left and +Y above; a camera at z -10 looking down +Z sees a point at z 100 in front of it (projected depth between 0 and 1), within 2 px of the horizontal centre.

## Checks that prove it

- [tested] Pixel check (spike A): a red sphere at +X, camera at (4, 3, 6) looking at the origin, drew 8,717 red pixels in the right half of the screen and none in the left.
- [tested] Babylon's own maths under `NullEngine` in Node: `tests/babylon-conventions.test.ts` (`npx vitest run tests/babylon-conventions.test.ts` in `apps/babylon`) passes 7 of 7, re-run on 2026-10-07; it covers the quaternion copy, the flight model's orientation, the camera projections and `Matrix.Compose` below. No browser is needed for any of it.
- [tested] The flight model end to end: after 90 steps of yaw 1, pitch 0.5, roll 0.3 and thrust, the node's `getDirection(+Z)` still equals the core's nose to 6 decimals, and the nose has x > 0 (yaw > 0 turns toward +X).
- [tested] The real parts: nose +Z, up +Y and the socket positions arrive as authored. The verifier's course reached all five waypoints in both runs, which it cannot do with a mirrored nose, and the smoke check `yaw > 0 swings the nose toward +X (left)` passed.
- [tested] The agent-meshes contact-sheet review of the 12-part kit (agent-meshes 0.13.1): nose +Z and up +Y hold for every part.

## glTF, quaternion and camera traps

- [tested] Copy a core orientation `[x, y, z, w]` straight into `node.rotationQuaternion`, with no conjugate and no axis swap: `getDirection(+Z)` equals the core's `qRotate(q, [0, 0, 1])` to 6 decimals for 90 degrees about +Y, a normalised `[0.3, -0.5, 0.2, 0.8]` and 2.1 rad about (1, 1, 0).

```ts
ship.node.rotationQuaternion?.copyFromFloats(q[0], q[1], q[2], q[3]); // core [x, y, z, w], as is
```

- [tested] A hand-written row-major matrix for thin instances (`composeMatrix` in `src/render/instances.ts`) equals `Matrix.Compose(scale, quaternion, translation).toArray()` to 5 decimals in all 16 entries, so instance matrices built in the core need no transpose.
