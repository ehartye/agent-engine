# Kit ship assembly, baking and paint in R3F

Evidence: Sector Run, `docs/lessons/r3f.md` and the `apps/r3f` code and unit tests (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there (a log entry or a unit test), `[documented]` was read in code or docs only, `[general]` was not checked. Measured on three 0.186.1 through the NVIDIA GPU path in headless Chromium.

A ship of 40+ kit parts picked at runtime: sockets place the parts, a bake merges them by (part slot, role), one outline covers the solids, a camera size is fitted from the vertices, and the player recolours it in place. Loading the GLBs is in [loading parts](loading-agent-meshes-parts.md); the toon ramp and the outline shader are in [toon and outline](toon-outline-and-instancing.md).

## Assemble by socket

- [tested] Split a pure plan from three.js. `mountPlan(loadout, has, hasSocket)` lists each drawn part with its hull socket and a unique node name; the assembler follows it. The hull is the root, a plug-in goes on the socket its catalog entry names, and the cannon goes once per class hardpoint (interceptor `socket_cannon`; corvette `socket_cannon`, `_l`, `_r`; xenoform `_l`, `_r` only). Muzzles are read in firing order (centre, left, right), the order the sim's shot `mount` indexes.
- [tested] Fallbacks: a cannon whose hull lacks its mount socket takes the class offset; a plug-in whose hull lacks its socket is not drawn; a part with no geometry draws a stand-in. Today every visual part has geometry, so stand-ins are a kept path for new art.
- [tested] A part id is not a node name. Alias GLBs are byte copies whose root keeps the copied part's name, so find sockets with `getObjectByName('socket_*')` and rename the scene node to the loadout's id. A test asserts the mismatch is exactly the alias set, so a kit fix shows up as a test to delete.
- [tested] Scale the ship from its hit radius (`clamp(hitRadius / 2.4, 0.6, 2)`) after the bake; the bake does not depend on root scale.
- [tested] Report the assembled node ids per slot to the probe (cannon as `id`, `id#1`, `id#2`) only while the assembly key still matches the fleet. Clearing the field on every change and never refilling it for an unchanged key was a bug a browser stage caught.

## Bake by slot and role

- [tested] Unbaked, a mesh and an outline mesh per GLB mesh cost 48 meshes (96 draws) for a starter, 103 (206) for the largest. Merging every mesh of one (slot, role) into one geometry in ship space gave 15 to 19 meshes, 24 to 33 draw calls for the whole frame, 8.5k to 19k triangles per ship with outline, 60.0 fps at 1080p.
- [documented] Key the bake by `${slot}:${role}` and remove the meshes from the part nodes while keeping the nodes and sockets (muzzles, exhausts, the probe). Merge after `updateMatrixWorld(true)`, write each mesh's transform into its geometry.

```ts
const baked = bakeGroups(root, (m) => `${slotOf(m)}:${meshRole(m.name)}`);
```

- [tested] `mergeGeometries` returns null and only logs for real GLBs until every geometry is rebuilt as plain Float32 `position` and `normal` and all are non-indexed (it also refuses a mix of indexed and non-indexed). Throw on null yourself.
- [tested] Role comes from the mesh-name prefix with its underscore: `trim_`, `accent_`, `glow_`, `glass_`, none is body. `accents` and `glowworm` stay body.
- [tested] One outline over all solid geometry (body, trim, accent), built once per ship from `toCreasedNormals(merged, Math.PI)`. Crease splits of 30 to 48 degrees rejoin for the offset: no cracks on 12 hulls in four views. Glow and glass get no outline.
- [tested] Glass is one mesh per slot, drawn after every opaque mesh (`renderOrder` 2, `depthWrite: false`, `DoubleSide`, opacity 0.42). It sorts against fin, wing and outline from behind and three-quarter; two overlapping glass shells in one part would blend in index order.
- [tested] Cache by class + parts + hit radius + geometries known, never the paint: an LRU of 16 ships disposing evicted buffers. Assembly (clone, place, merge, creased outline, camera fit) is about 7 ms warm in Node.

## Fit the chase camera

- [tested] A size from the hit radius framed stand-ins but cut the tail and engine off the largest corvette (vertex NDC y 1.009 at 16:9). Compute a closed-form lower bound from every vertex once at assembly (top, bottom and side at 4:3, 92 percent of the half view): the hauler's size rose 2.34 to 2.44, others unchanged.
- [tested] Test it on real vertices (box corners are a third larger than the ship) of every class x hull x wing x fin at 16:9 and 4:3, inside 97 percent and in front of the near plane. One `expect` per vertex took 24 s; one per ship took 2 s.

## Colours and the paint picker

- [documented] Keep colour data pure: `{ base: {primary, trim, accent}, slots: per-slot overrides of single channels, glow? }` over six slots (hull, engine, cannon, wing, canopy, fin). Edits return new states; a hand-set base clears the preset id. Resolution (part override over ship scheme over palette over class default; glow derived from the nearest accent) is one call into the game core, so the app has no colour rules of its own.
- [tested] Keep the edited state in the app, not in the validated loadout: the core checks trim, accent and primary contrast and would refuse many free swatch picks. Nothing in the picker warns about low contrast.
- [tested] Recolour in place. Each slot owns three toon materials with their own 3 x 1 ramp textures (one shader program through `customProgramCacheKey`), an unlit glow material and a tinted glass material. A repaint is `setRamp` on each texture plus colour sets, with no rebuild, no new texture and no recompile, and cached ships change with the one on screen.
- [tested] Build the ramp around the colour: it is the middle band, shadow is the colour 58 percent toward a deep blue, lit is 40 percent toward white. A ramp that darkened toward black turned a yellow accent olive in shadow. Glass is the primary lifted to white 50 percent then 45 percent toward the accent; glow is the accent lifted a quarter toward white.
- [documented] The picker is one tab of the loadout: a preset row (28 curated schemes) and a randomise button, a scope row (whole ship or one slot, `*` on overridden slots), three rows of 16 fixed swatches, a per-channel button that hands a channel back to the ship, and a reset. Every control is a `data-nav` button, so pad, keys and mouse share one path (the controller-menu reference covers that path).
- [documented] A random scheme: any-hue primary, a darker and less saturated trim of the same family, an accent roughly opposite on the wheel; the same rng gives the same colours.

## Not built or not verified

- [documented] Procedural patterns, finishes, layered paint and decals (a `look:v2` design with pure reference code in the core package) are not wired into the R3F app; only the three-colour model is built. Paint is not saved and not in the probe.
- [documented] Not verified: the Paint tab on a physical gamepad, the loadout layout under 1000 px, and any human judgement of the swatches or presets. The kit now has `trim_` meshes (an earlier log said none); trim on screen was not looked at for this note.
- [tested] Looking caught what node-tree assertions did not: every xenoform hull looked the same because a stage carried the corvette's wing, canopy and fin over; and a rear three-quarter orbit hides the cannons, so add a front and a top view.
