# Babylon.js handedness and coordinates

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Babylon.js is left-handed by default and glTF is right-handed. Pick one convention for the whole game and make the engine match the rules. The contract used here is right-handed, +Y up, nose along local +Z, yaw > 0 turns the nose toward +X, pitch > 0 points it down (core test: pitch and yaw signs). The code is [`main.mjs`](../../../examples/web3d/babylon/src/main.mjs) and [`conventions.test.mjs`](../../../examples/web3d/babylon/conventions.test.mjs); `cd examples/web3d/babylon && npm test` runs the Node checks with no browser.

## The decision

- [general] Set `scene.useRightHandedSystem = true` right after creating the scene, before loading anything. Then a right-handed core, glTF parts and cameras need no flip, mirror or axis swap.

```js
const scene = new Scene(engine);
scene.useRightHandedSystem = true; // match the core: right-handed, +Y up, glTF +Z front
```

- [tested] (babylon verify: yaw > 0 turns the rendered nose toward +X; pitch > 0 points the rendered nose down) With that setting the example needs no conversion anywhere: after holding yaw, the node's `getDirection(+Z)` pointed toward +X (rendered nose x 0.92 at yaw 1.20), and holding pitch pointed it down.

## Quaternions and direction vectors

- [tested] (babylon test: a core quaternion copies straight into rotationQuaternion) Copy a core orientation `[x, y, z, w]` straight into `node.rotationQuaternion`, with no conjugate and no axis swap: `getDirection(+Z)` equals the core's nose direction to 6 decimals for four yaw and pitch poses, including negative angles. The core's `orientation({ yaw, pitch })` rotates the +Z nose onto `noseDirection` (core test: the orientation quaternion rotates the glTF nose onto the nose direction).

```js
ship.rotationQuaternion = Quaternion.Identity();   // set once; Euler rotation is then ignored
ship.rotationQuaternion.set(...orientation(state)); // core [x, y, z, w], as is
const nose = ship.getDirection(new Vector3(0, 0, 1)); // read the rendered nose back for the probe
```

- [tested] (babylon test: Vector3.Forward(true) is -Z) `Vector3.Forward(true)` is -Z, and `Vector3.Forward(false)` is +Z. The argument is "right-handed", so never use it for a +Z nose in this scene; write `new Vector3(0, 0, 1)`.
- [documented] A node with `rotationQuaternion` set ignores its `rotation` Euler angles (`Meshes/transformNode.pure.js` doc comment, 9.29.0); set one or the other.

## Cameras

- [tested] (babylon test: a right-handed camera at +Z looking at the origin projects +X to the right and +Y up) A `FreeCamera` at z +10 looking at the origin projects world +X right of centre and +Y above it. Read the projection through `Vector3.Project` and `scene.getTransformMatrix()` under `NullEngine`, so no browser is needed.
- [tested] (core test: a glTF nose is +Z and an unrotated camera looks down -Z) An unrotated camera looks down -Z, so aim a chase camera with `camera.setTarget(ship.position)` instead of copying a yaw; `chaseCamera` in `core/flight.mjs` computes the position behind the nose.
- [general] Check the contract on the rendered node, not the rules: have a verifier hold a key and read `getDirection(+Z)` from the node. A sign error hides when the app, its tests and the test pilot all encode the same inversion.

## glTF

- [general] The glTF loader wraps each file in a `__root__` node. In a left-handed scene that node carries a flip to convert glTF's right-handed data; with `useRightHandedSystem = true` it should carry none. The example loads no GLB, so this was not reproduced here; see [loading parts](loading-agent-meshes-parts.md).
- [general] After loading a model, read a socket node's world position and the mesh bounds and compare them with the authored numbers. If a part is mirrored, the scene flag was set after loading or not at all.
- [general] Instance matrices built in the core as 16-float column-major arrays go straight into `thinInstanceSetBuffer('matrix', ...)`; the example composes them with `Matrix.Compose(scale, quaternion, translation).copyToArray(buffer, i * 16)`.

## Checks that prove it

- [tested] Run `npm test` in `examples/web3d/babylon` for the five Node tests (timeStep units, no `setTimeStep`, quaternion copy, `Forward(true)`, camera projection) and `npm run verify` for the rendered axes.
- [tested] Run `node --test examples/web3d/core/core.test.mjs examples/web3d/core/game.test.mjs` for the engine-neutral half of the contract (axis signs, nose and camera directions, the quaternion).

Related: [scene loop and observables](scene-loop-and-observables.md), [probe and verification](probe-and-verification.md).
