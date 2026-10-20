# Part kits, baking and paint in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

How to build one object from many GLB parts chosen at runtime (a vehicle, a character kit, a building set): sockets place the parts, a bake merges meshes to cut draw calls, one outline covers the solids, the camera is fitted from the vertices, and the player recolours it in place. The example app loads no GLB and has no kit or colour picker, so everything here is `[documented]` from library source or `[general]`; only the draw-call arithmetic is reproduced (`cd examples/web3d/r3f && npm run verify`). Loading the files is in [loading parts](loading-agent-meshes-parts.md); the ramp and outline shaders are in [toon and outline](toon-outline-and-instancing.md).

## Assemble by socket

- [general] Split a pure plan from three.js: `mountPlan(loadout, hasPart, hasSocket)` lists each drawn part with its parent socket and a unique node name, and the assembler follows it. The base part is the root; a plug-in goes on the socket its catalog entry names; a part that repeats (a mount per hardpoint) goes once per socket the base declares. Keep a fixed order for repeated mounts, because other code (firing, effects) indexes them.
- [general] Decide the fallbacks in the plan and test them: a part whose base lacks its socket takes a class offset or is not drawn, and a part with no geometry draws a stand-in. A stand-in path is cheap insurance for new art.
- [general] A part id is not a node name. Copies of a file keep the original root name, so find sockets with `getObjectByName('socket_*')` and rename the scene node to the loadout id. Assert the mismatch set in a test so a content fix shows up as a test to delete.
- [general] Scale the whole object from one stat (a hit radius, clamped) after the bake; the bake must not depend on root scale. Scale the camera offsets with it.
- [general] Report assembled node ids per slot to the probe only while the assembly key still matches the current loadout. Clearing the field on every change and never refilling it for an unchanged key is an easy bug.

## Bake by slot and role

- [general] A mesh plus an outline mesh per GLB mesh costs two draws per mesh, so a kit of tens of parts costs hundreds. Merging every mesh of one (slot, role) into one geometry in object space brought a typical object to a few dozen draws for the whole frame. Count with `gl.info.render.calls`, as the verifier does for its labs ([probe and verification](probe-and-verification.md)).
- [documented] Instancing is the other lever for repeated identical parts: 1,000 separate meshes cost 1,000 draw calls and one `InstancedMesh` costs 1 (verifier check "1,000 meshes cost about 1,000 draw calls; one InstancedMesh costs 1"). Merge when parts differ, instance when they repeat.
- [general] Key the bake by `${slot}:${role}`, merge after `updateMatrixWorld(true)` and write each mesh's world-to-object transform into its geometry. Remove the merged meshes from the part nodes but keep the nodes and sockets (muzzles, exhausts, probe anchors).
- [documented] `mergeGeometries` (`three/examples/jsm/utils/BufferGeometryUtils.js`) logs an error and returns `null` when indexed-ness or the attribute sets differ between geometries, and `mergeAttributes` when `itemSize` or `normalized` differ. Normalise every geometry first (same attribute names, non-indexed or all indexed, plain `Float32` where interleaved or normalised) and throw yourself on `null`.
- [general] Role from the mesh-name prefix with its underscore (`trim_`, `accent_`, `glow_`, `glass_`; none is body), so `accents` and `glowworm` stay body.
- [documented] One outline over all solid geometry, built once per object from `toCreasedNormals(merged, Math.PI)` (same file): crease splits rejoin for the offset, so a hard-edged mesh has no cracks. Glow and glass get no outline.
- [general] Glass: one mesh per slot drawn after every opaque mesh (`renderOrder`, `depthWrite: false`, `DoubleSide`). Two overlapping glass shells in a part blend in index order; check from behind and three-quarter views.
- [general] Cache assemblies by class, parts and scale source, never the paint, in a small LRU that disposes evicted buffers.

## Fit the camera from the vertices

- [general] A camera distance from a radius frames boxes and stand-ins but cuts the tail off a long real model. Compute a closed-form lower bound from every vertex once at assembly (top, bottom and side extents at a narrow aspect such as 4:3, within about 90 percent of the half view).
- [general] Test it on real vertices, not box corners (corners are a third larger than the model), for every combination of the kit at 16:9 and 4:3: inside the frustum with margin and in front of the near plane. Make one assertion per object, not per vertex: thousands of assertion calls make the suite slow.

## Colours and the paint picker

- [general] Keep colour data pure: `{ base: { primary, trim, accent }, slots: overrides of single channels }`. Edits return new states; a hand-set base clears the preset id. Resolve (slot override over scheme over palette over class default; glow derived from the nearest accent) in one function in the rules module so the app has no colour rules of its own.
- [general] Keep the edited colours in the app, not in the validated loadout, if the rules enforce contrast that free swatch picks would break. Say so in the UI, since a picker will not warn about low contrast on its own.
- [general] Recolour in place. Give each slot its own toon materials with their own small ramp textures (shared shader program via `customProgramCacheKey`, [documented] in `three/src/materials/Material.js`), so a repaint is a texture rewrite plus colour sets: no rebuild, no new texture, no recompile, and cached assemblies change with the one on screen.
- [general] Build the ramp around the colour: it is the middle band, shadow is the colour moved toward a deep blue, lit is moved toward white. A ramp that darkens toward black turns a saturated yellow olive in shadow.
- [general] A picker is one tab of the loadout: preset row, randomise, scope row (whole object or one slot), fixed swatch rows, per-channel reset. Make every control a navigable button so pad, keys and mouse share one path ([controller navigable menus](controller-navigable-menus.md)). A random scheme: any hue for primary, a darker less saturated trim of the same family, an accent roughly opposite on the wheel, from a seeded generator ([rng.mjs](../../../examples/web3d/core/rng.mjs)).

## Looking still matters

- [general] Node-tree assertions pass while the picture is wrong. Render each class from front, top and rear three-quarter views (a rear orbit hides forward-mounted parts) and look: a stage that carried one class's wing over to another made every hull look alike, and no assertion noticed.
- [general] Not covered: patterns, finishes and decals, persistence of paint, and any human judgement of the swatches.

## Links

- [Loading agent-meshes parts](loading-agent-meshes-parts.md)
- [Toon, outline and instancing](toon-outline-and-instancing.md)
- [Procedural instanced fields](procedural-instanced-fields.md)
