# Loading agent-meshes parts in R3F

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` and `docs/lessons/agent-meshes.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1, with part GLBs built by agent-meshes 0.13.1 (`manifest.json` `builtWith.agentMeshes`).

This is the engine side only: how R3F loads and assembles the GLBs. Authoring them is the agent-meshes skills (`mesh-authoring`, `mesh-build`).

## Loading GLBs

- [tested] Expect a wrapper root. An agent-meshes GLB has exactly one root node, named after the workspace project (`mesh new <id>`), with identity transform; parts and sockets are its direct children. The Sector Run kit builds each part with `mesh new <partId>`, so that name is the part id; authoring belongs to the agent-meshes skills.
- [tested] Find sockets by node name, never by glTF mesh name. Every `group` part (`socket_engine` and the rest) exports as an empty named node with its offset intact (written as a node `matrix`); the glTF meshes carry no names, only the nodes do.
- [tested] The sockets in the kit: `socket_engine` and `socket_cannon` on each hull, `socket_exhaust` on each engine, `socket_muzzle` on each cannon. The part library checks every GLB for the sockets its catalog entry promises and reports a missing one in `errors` (read from the 12 GLBs and `src/render/partLibrary.ts`, 2026-10-07).
- [tested] GLTFExporter then GLTFLoader keeps node names, so `socket_*` nodes survive a GLB round trip.
- [tested] In three, `gltf.scene` is not the wrapper root: `GLTFLoader.parseAsync` on `hull-dart.glb` returned a `Group` named after the part (`"hull-dart"`) whose one child is the agent-meshes wrapper root renamed `hull-dart_1` (an `Object3D`). Why the loader renames it was not read in source. Look sockets up from `gltf.scene` with `getObjectByName` and nothing changes: `getObjectByName('socket_engine')` found an `Object3D` whose parent is `hull-dart_1`, at (0, 0, -2.55) (three 0.186.1, 2026-10-07).
- [tested] Each `Mesh` takes its node's name (`body`, `nose`, `wing_l`, `wing_r`, `fin`, `accent_canopy`, `mount_cannon`, `mount_engine` on `hull-dart`); geometry and material names are empty, and `gltf.animations` is empty.
- [tested] Socket nodes store their offset as a node `matrix`, not `translation`, `rotation` and `scale`, in all 12 part GLBs. A tool that reads only `translation` from the glTF JSON sees no offset; three decomposes the matrix into `position`, so the app is unaffected.
- [tested] The real part GLBs parse in plain Node with `GLTFLoader` (`parseAsync`), no browser or DOM, so loading and assembly can be unit-tested (`tests/realParts.test.ts`).

## Assembling by socket

- [tested] When parts are chosen at runtime, build the model imperatively and add it to a `<group ref>` from an effect keyed on the equipped parts. `gltfjsx`-style JSX conversion does not apply.
- [tested] Per-frame motion mutates that group, never props.
- [tested] Parent each part's root to its parent's socket node; the part's origin then sits on the socket. All 64 hull x engine x cannon combinations of the real kit assembled (`tests/realParts.test.ts`).
- [tested] The four socket names and their positions in the kit (the matrix's translation, metres): `socket_engine` and `socket_cannon` on every hull (dart (0, 0, -2.55) and (0, -0.6, 1); brick (0, 0, -2.7) and (0, -0.9, 1.6); hauler (0, 0, -3.8) and (0, -0.75, 2.2); wing (0, 0, -1.95) and (0, -0.5, 1)), `socket_exhaust` on every engine (z -1.6 pulse, -1.8 burner, -1.9 vector, -2 ion) and `socket_muzzle` on every cannon (z 1.4 pulse, 1.6 scatter, 2.15 twin, 2.6 rail). No part has animations or skins.

```ts
const socket = parentNode.getObjectByName(part.attachesTo.socket); // e.g. 'socket_engine'
if (!socket) throw new AssemblyError(`part ${parentId} has no ${part.attachesTo.socket}`);
socket.add(node); // node = a fresh clone of the part's scene root
```

## Handedness and orientation

- [tested] The kit holds the contract: nose +Z and up +Y for every one of the 12 parts (contact-sheet review, agent-meshes 0.13.1).
- [tested] three.js cameras look down their local -Z, while glTF and the ship nose are +Z. The chase camera works in the ship's frame and `CameraRig` multiplies by a 180 degree yaw.
- [tested] The failure looks like a working game with no ship in it: check the camera frame first when the ship is missing.

## Replacing the neutral material

- [tested] Expect one unnamed, unshared material per mesh: a hull with 7 solid parts in two greys exported 7 materials and empty mesh names. The manifest's material count is the number of meshes, not of colours.
- [tested] Replace every material on load; the exported colours do not matter. The kit validator requires exactly one material per mesh and tolerates sharing, so the count may drop later without a code change.
- [documented] agent-meshes `origin/main` commit `a508e3c` names materials and shares identical ones on export; not released at 0.13.1, not run (commit message).
- [tested] One shared toon material and one shared outline material serve every part: assembly sets the toon material on each mesh and adds an outline child to it.
- [tested] Repaint a palette without a new material: rewrite the ramp texture's 12 bytes and set `needsUpdate`. The ship changed colour and the scene still compiled 4 programs. Ramp and outline details are in [toon, outline and instancing](toon-outline-and-instancing.md).

## Clones and shared resources

- [tested] `scene.clone(true)` shares geometry and materials with the source. That is why assembly replaces the material per mesh rather than editing the material it loaded.
- [tested] Key any per-geometry cache (here the outline's smoothed geometry) by the source geometry, since clones share it.
