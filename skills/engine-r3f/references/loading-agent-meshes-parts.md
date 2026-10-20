# Loading agent-meshes parts in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

This is the engine side only: how R3F loads and assembles GLBs that were authored as named parts with sockets. Authoring them is the agent-meshes skills (`mesh-authoring`, `mesh-build`). The example app draws a primitive cone with the same nose-along-+Z convention instead of loading a GLB, so the loading claims here are `[documented]` or `[general]`; only the axis conventions are reproduced.

## Loading GLBs

- [general] Expect a wrapper root. An agent-meshes GLB has one root node named after the workspace project, with an identity transform; parts and sockets are its direct children. Check this against your own export before relying on it.
- [general] Find sockets by node name, never by glTF mesh name. Sockets are empty named nodes (for example `socket_engine`, `socket_muzzle`) whose transform is the attachment offset; meshes may be unnamed.
- [documented] GLTFLoader names objects from the node names and makes them unique: `createUniqueName` appends `_1`, `_2` to a repeated name, and `PropertyBinding.sanitizeNodeName` replaces whitespace with `_` and strips reserved characters (three r186 `examples/jsm/loaders/GLTFLoader.js`, `src/animation/PropertyBinding.js`). So a scene and its root node that share a name come back as `name` and `name_1`.
- [documented] The same loader reads a node `matrix` and applies it to the object (decomposed into `position`, `quaternion`, `scale`), so a socket exported with a `matrix` and one exported with `translation` both end up as an object with a position. A tool that reads only `translation` from the glTF JSON will miss the matrix form.
- [general] Look sockets up with `gltf.scene.getObjectByName(...)` and do not assume `gltf.scene` is the wrapper root. Throw a clear error naming the part and the missing socket, so a bad export fails at load.
- [general] `GLTFLoader.parseAsync` needs no DOM for geometry-only files, so loading and assembly can be unit-tested in plain Node. Verify this against your own files; it is not run in this repo.

## Assembling by socket

- [general] When parts are chosen at runtime, build the model imperatively and add it to a `<group ref>` from an effect keyed on the chosen parts. `gltfjsx`-style JSX conversion fits a fixed model, not a kit.
- [general] Per-frame motion mutates that group (see [frame loop and state](frame-loop-and-state.md)), never props.
- [general] Parent each part's root to its parent's socket node; the part's origin then sits on the socket. Test every combination of parts from the catalog in a Node test, because a missing socket is a data error, not a runtime surprise.

```js
const socket = parentNode.getObjectByName(part.attachesTo.socket); // e.g. 'socket_engine'
if (!socket) throw new Error(`part ${parentId} has no ${part.attachesTo.socket}`);
socket.add(partRoot.clone(true)); // a fresh clone per placement
```

## Handedness and orientation

- [tested] (core test: a glTF nose is +Z and an unrotated camera looks down -Z) glTF models point their nose down +Z with +Y up, while a three.js camera looks down its local -Z. A chase camera that follows the nose is therefore yawed pi further than the model.
- [tested] (r3f verify: yaw > 0 turns the rendered nose toward +X; pitch > 0 points the rendered nose down) Read the rendered axes from the three.js object, as the verifier does with `getWorldDirection`, not from the rules code. Conventions live in [`flight.mjs`](../../../examples/web3d/core/flight.mjs).
- [general] The failure looks like a working game with no model in it: when the model is missing, check the camera frame before the loader.
- [general] Have the authoring side promise nose +Z and up +Y for every part, and check that in a review image before wiring a new part in.

## Replacing the neutral material

- [general] Expect neutral, unnamed materials, often one per mesh. Replace every material on load; the exported colours do not matter, and a manifest's material count may be per mesh rather than per colour.
- [general] Use one shared toon material and one shared outline material for every part: set the toon material on each mesh and add an outline child. Palette swaps then rewrite a ramp texture instead of creating materials. Details are in [toon, outline and instancing](toon-outline-and-instancing.md).

## Clones and shared resources

- [documented] `Mesh.copy` assigns `this.geometry = source.geometry` and copies the material reference, so `clone(true)` shares geometry and materials with the source (r186 `src/objects/Mesh.js`). Replace the material per mesh rather than editing the one the loader created.
- [general] Key any per-geometry cache (such as a smoothed-normal outline geometry) by the source geometry, since clones share it. Dispose shared geometry only when the last user is gone.

Related: [part kits and paint](part-kits-and-paint.md), [data-driven entities](data-driven-entities.md).
