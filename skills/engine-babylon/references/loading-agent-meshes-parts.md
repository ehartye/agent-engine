# Loading agent-meshes parts in Babylon.js

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

This is the engine side only: how Babylon.js loads and assembles part GLBs. Authoring them is the agent-meshes skills (`mesh-authoring`, `mesh-build`). The evidence is 12 part GLBs from agent-meshes 0.13.1 (4 hulls, 4 engines, 4 cannons). Handedness is in [handedness and coordinates](handedness-and-coordinates.md).

## Loading GLBs

- [tested] Load each part once into an `AssetContainer` with the module-level `LoadAssetContainerAsync` (the `SceneLoader` statics are deprecated) and the side-effect import `@babylonjs/loaders/glTF/2.0`. All 12 parts load with no error.

```ts
import '@babylonjs/loaders/glTF/2.0';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
const container = await LoadAssetContainerAsync(`/parts/${partId}.glb`, scene);
```

- [tested] agent-meshes exports every glTF mesh without a `name` (71 meshes, 3 to 8 per part) but names every node. Babylon 9.29.0's glTF loader names each `Mesh` after its node, so the empty mesh names do not matter: `hull-dart` loads as `__root__`, `body`, `nose`, `wing_l`, `wing_r`, `fin`, `accent_canopy`, `mount_cannon`, `mount_engine`.
- [tested] The hierarchy after loading: the loader's `__root__` wrapper (no flip in a right-handed scene), one child named after the agent-meshes workspace project (the part id when built with `mesh new <partId>`) with identity transform, and the parts and sockets below it. Socket `group` parts arrive as empty named nodes with their translation intact.
- [tested] Look parts, sockets and accents up by node name (or the mesh name, which equals it), never by the glTF mesh name.

## Assembling by socket

- [tested] Instantiate per assembly with a name function that prefixes every node with the part id, so names stay unique with many parts in the scene. Find sockets by the bare name after the prefix, and parent a child part's root to its parent's socket with an identity transform (`src/render/ship.ts`):

```ts
const entries = container.instantiateModelsToScene((name) => `${partId}:${name}`, false);
const root = entries.rootNodes[0] as TransformNode; // the part root
for (const child of root.getChildTransformNodes(false)) {
  const bare = child.name.slice(partId.length + 1);
  if (bare.startsWith('socket_')) sockets.set(bare, child);
}
childRoot.parent = parentSockets.get('socket_engine');
childRoot.position.set(0, 0, 0);
childRoot.rotationQuaternion = Quaternion.Identity();
```

- [tested] The socket names Babylon saw: `socket_engine` and `socket_cannon` on each hull, `socket_exhaust` on each engine, `socket_muzzle` on each cannon.
- [tested] It works: all 384 builds produce a valid plan (`tests/assemblyPlan.test.ts`); the verifier found `engine-ion` at `socket_engine` of `hull-dart`; in the screenshots the engine sits at the rear and the cannon on the nose.

## Replacing the neutral material

- [tested] Each part ships one unnamed, unshared material per mesh (3 to 8 per part). Replace them all: every mesh with vertices under a part root (`getTotalVertices() > 0`, which skips the empty `__root__` mesh) gets one shared toon `ShaderMaterial`, or a shared accent one when its name matches `/(^|:)accent_/`, and `renderOutline = true`. Two materials serve every part, so the material count does not grow with the part count.
- [tested] The accent rule matched 1 to 4 meshes per part (none on `engine-vector`, 4 on `cannon-rail`), and works on the prefixed names.
- [tested] A palette change rewrites the ramp uniforms and the outline colours without rebuilding; the ember ramp, and after a repaint the azure ramp, were found on screen by pixel count. The toon material and outline are in [cell shading and outline](cell-shading-and-outline.md).
- [documented] agent-meshes `origin/main` commit `a508e3c` names materials and shares identical ones on export (commit message, not run; unreleased at 0.13.1). The app replaces every material, so a smaller count needs no code change.

## Animation groups

- [tested] The 12 part GLBs contain no `animations` and no `skins` (read from their JSON chunks), so `AssetContainer.animationGroups` stays empty and nothing in Slice 1 plays a clip. Clip playback through animation groups was not exercised.

## Instantiating models from a container

- [tested] Load one container per part and call `instantiateModelsToScene` once per assembly. The first root node of the returned entries is the part root (the prefixed `__root__`); its child meshes with vertices are the ones to shade.
- [tested] Draw calls follow the mesh count: each part mesh is drawn twice (once for the outline). The starter ship (`engine-pulse`, 3 meshes) measured 54 draw calls in the smoke `perf` stage; with `engine-ion` (7 meshes) fitted the verifier reported 69. Its four extra meshes, drawn twice, account for 8 of the extra calls; the rest is not isolated.

## Shared geometry across clones

- [tested] Clones from one container share its geometry, so rewrite geometry on the container's meshes once, before any clone is made. The outline-normal fix ([hard-edged parts](cell-shading-and-outline.md#outlines-on-hard-edged-parts)) runs once per GLB this way:

```ts
for (const mesh of container.meshes) if (mesh.getTotalVertices() > 0) withOutlineNormals(mesh as Mesh);
```

- [tested] A glTF primitive without indices loads with `isUnIndexed` and an empty `getIndices()`. Treat it as consecutive triangles, or code that walks the faces loses them.
