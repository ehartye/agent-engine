# Loading agent-meshes parts in Babylon.js

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

This is the engine side only: how Babylon.js loads and assembles GLBs authored as named parts with sockets. Authoring them is the agent-meshes skills (`mesh-authoring`, `mesh-build`). The example app draws a primitive cone with the nose along +Z instead of loading a GLB, and has no `@babylonjs/loaders`, so the loading claims here are `[documented]` or `[general]`; only the axis conventions are reproduced. Handedness is in [handedness and coordinates](handedness-and-coordinates.md).

## Loading GLBs

- [documented] Load each part once into an `AssetContainer` with the module-level `LoadAssetContainerAsync(source, scene)`; the `SceneLoader` statics are marked `@deprecated` in favour of it (`Loading/sceneLoader.js`, 9.29.0). The glTF plugin registers itself through the side-effect import `@babylonjs/loaders/glTF/2.0` (a separate package from `@babylonjs/core`).

```js
import '@babylonjs/loaders/glTF/2.0';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
const container = await LoadAssetContainerAsync(`/parts/${partId}.glb`, scene);
```

- [general] Expect Babylon's `__root__` wrapper above the file's own nodes. The loader adds it so a left-handed engine can flip a right-handed file; in a scene with `useRightHandedSystem = true` the wrapper carries no flip. Below it an agent-meshes GLB has one node named after the workspace project (identity transform) with the parts and sockets as children. Check this against your own export.
- [general] Look parts, sockets and accents up by node name, never by glTF mesh name. agent-meshes names every node but may leave meshes unnamed; Babylon's loader names each `Mesh` after its node, so the node name is also the mesh name.
- [general] Socket `group` parts arrive as empty named nodes whose translation survives (a GLB may store it as a node `matrix`; Babylon decomposes it). Log the socket names you found, so a missing one is a load error.
- [general] Input GLBs with no `animations` or `skins` leave `container.animationGroups` empty. Clip playback is not exercised here.

## Assembling by socket

- [documented] `container.instantiateModelsToScene(nameFunction, cloneMaterials = false, options)` clones the container's hierarchy; the name function renames every clone, and `doNotInstantiate` defaults to true so meshes are cloned (`assetContainer.js`). Prefix every node with the part id so names stay unique with many parts in the scene.
- [general] Find sockets by the bare name after the prefix, and parent a child part's root to its parent's socket with an identity local transform:

```js
const entries = container.instantiateModelsToScene((name) => `${partId}:${name}`, false);
const root = entries.rootNodes[0]; // the prefixed __root__
for (const node of root.getChildTransformNodes(false)) {
  const bare = node.name.slice(partId.length + 1);
  if (bare.startsWith('socket_')) sockets.set(bare, node);
}
childRoot.parent = parentSockets.get('socket_engine');
childRoot.position.set(0, 0, 0);
childRoot.rotationQuaternion = Quaternion.Identity();
```

- [general] Test every combination in the part catalog in a Node test that builds the assembly plan from the part metadata, so a missing socket is a data error found in CI.
- [general] Throw an error naming the part and the missing socket instead of parenting to `undefined`, which would quietly leave the child unattached.

## Replacing the neutral material

- [general] Expect one unnamed, unshared material per mesh. Replace them all: every mesh with vertices under a part root (`getTotalVertices() > 0`, which skips the empty `__root__` mesh) gets one shared toon `ShaderMaterial`, or a shared accent one when its name matches an `accent_` convention, plus `renderOutline = true`. Two materials then serve every part however many parts there are. The material and outline are in [cell shading and outline](cell-shading-and-outline.md).
- [general] Palette changes rewrite the shared materials' uniforms and the outline colours; no rebuild is needed.

## Clones share geometry

- [documented] `Mesh` cloning applies the source's geometry to the clone (`source._geometry.applyToMesh(this)`, `Meshes/mesh.pure.js`), so clones share vertex buffers. Rewrite geometry on the container's meshes once, before the first clone is made, for example to replace normals for a custom outline.
- [documented] `cloneMaterials` is false by default, so clones share the container's materials too; assign the shared toon material per mesh instead of editing the one the loader created.
- [documented] A glTF primitive without indices loads as an un-indexed mesh (`isUnIndexed`, with no index buffer). Code that walks faces must treat it as consecutive triangles.

## Draw calls

- [general] Count draw calls from `SceneInstrumentation.drawCallsCounter` (as [`main.mjs`](../../../examples/web3d/babylon/src/main.mjs) does for its probe) and set a budget. An outlined part mesh is drawn twice, so a model with N meshes costs about 2N calls; many identical parts belong in thin instances ([cell shading and outline](cell-shading-and-outline.md)).

Related: [scene loop and observables](scene-loop-and-observables.md), [bundle size and imports](bundle-size-and-imports.md).
