# Varied, moving asteroids with craters in R3F

Evidence: Sector Run, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there (lessons log or a unit test re-run on 2026-10-07), `[documented]` was read in code only, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1 in Vitest (Node) or headless Chromium 153 on an NVIDIA RTX 5070 Ti Laptop GPU. The toon ramp, the base outline and plain instancing are in [toon, outlines and instancing](toon-outline-and-instancing.md); this adds what a varied, moving, oblong, damageable field needed.

A field of up to 17 rock variants (ten kinds) that drift and tumble, are oblong up to 3:1, take craters and chips from shots and shed ore chips. Use it when an obstacle or resource field must look varied, stay cheap and keep hit tests honest.

## Drawing the field

- [tested] One `InstancedMesh` per (variant, mesh part) with an outline twin, built per sector from the variants it uses. Capacity is that variant's rocks plus the debris cap (96), so a bucket cannot overflow.
- [tested] No slot bookkeeping: each frame walk the simulation's bodies, append each live rock to its variant's bucket and rewrite the matrices (`compose(position, orientation, scale)`). A destroyed rock or expired chip is simply not written.
- [tested] A variant's body, accent, glow and outline meshes share one `instanceMatrix` (`mesh.instanceMatrix = primary.instanceMatrix`), and bodies and accents share one `instanceColor` (a plus or minus 8 percent brightness jitter from the rock's seed): one write and one upload per bucket.
- [tested] Set an empty bucket's meshes `visible = false`; an `InstancedMesh` with `count` 0 still costs a draw call.
- [tested] Interpolate between the poses before and after the last fixed step (`slerp` for orientation), so a rock drifting 0.5 m per step is smooth at 144 Hz.
- [documented] Roles come from the mesh name prefix (`accent`, `glow`, else body), body sorted first. The outline geometry is `toCreasedNormals(geometry, Math.PI)`, cached per source geometry. A variant GLB that fails to load is replaced by a lumpy icosahedron stand-in and the failure is reported in `errors`.
- [documented] Each kind has a body ramp and an accent ramp (20 ramp textures and 20 toon materials for 10 kinds), a glow colour and the colour an opened crater shines; all share one shader program through `customProgramCacheKey`.

```ts
mesh.instanceMatrix = primary.instanceMatrix;
if (part.role !== 'glow') mesh.instanceColor = primary.instanceColor;
for (const { mesh, outline } of b.meshes) { mesh.count = outline.count = b.count; mesh.visible = outline.visible = b.count > 0; }
```

## The outline on non-uniform scale

- [tested] `mat3(instanceMatrix) * normal` is the right normal only for a uniform scale; for a scale of (20, 8, 5) it bends toward the long axis. Read the three column lengths as the scale and use `mat3(instanceMatrix) * (normal / (scale * scale))`, and take the pixel-cap size from the first column (the long semi-axis). Bump the program cache key when the shader changes. Uniformly scaled meshes are unchanged because the formula reduces to the old one.
- [tested] Checked by looking at screenshots (continuous outlines on 3:1 lumps, slabs, rings, crystals and spires), not by a unit test of the shader.

## Craters on a rock that lives in a bucket

- [tested] A rock that takes its first crater leaves its bucket and is drawn as its own `Group` of `Mesh`es, with a cloned `MeshToonMaterial` per body or accent mesh patched in `onBeforeCompile`: `uniform vec4 uCraters[16]`, a count, an exposed colour, `varying vec3 vUnit = position` and a loop injected after `color_fragment`. The bowl darkens by half (one toon band), the rim mixes 50 percent ink, an `exposed` crater adds an emissive colour.
- [tested] Write the uniform values only when the rock's crater list changes. Three uploads a shared material's uniforms only when the material changes between draws, so a per-rock value needs a per-rock material, not `onBeforeRender`. All clones share one compiled program: 40 damaged rocks added exactly one program (12 to 13).
- [tested] Measure crater distance by direction, not position: `distance(normalize(vUnit), centre)`. The meshes fill only 60 to 100 percent of the unit ball they are scaled from, so a crater placed on the ellipsoid surface fell in the air in front of the mesh and most did not show. The same function in JavaScript is unit-tested.
- [tested] The hit ellipsoid is therefore larger than the drawn rock; a test checks every real GLB's largest vertex radius against 1.
- [tested] Cap rocks drawn on their own at 40: the oldest goes back to its bucket without craters, applied after the frame is built so no rock is ever missing from a frame.

## Chips, debris and ore

- [tested] Hits go through the rules package (chip, crater, kill). A chip is a rock in its own right with a time to live; debris is capped at 96, oldest first; a destroyed chip does not break again or count toward a mission.
- [tested] An ore-bearing chip is collectible: pulled in inside 100 m with the pickup magnet law, collected inside 10 m for all its ore. Three decisions the rules left open: a chip whose time runs out releases its ore as pickups so none is lost; ore chips are stepped by a copy of the integrator without the 200 to 1200 m shell, which bounced a chip drawn toward a ship inside 200 m; a chip settles onto its parent's velocity at 1.5 per second so ore stays in a small cloud.
- [tested] Ore is conserved: over six seeds a 12-ore rock gave chip shares plus the final drop equal to 12, and flying in collected exactly 12.
- [tested] Test rigging traps: the rules' integrator bounces a rock at 100 m back to 300 m after one step (rig at 400 m or with no drift), and `hitRock` takes `hp` from the rock it is given, so pass `{...rock, hp: body.hp}` and write the result back.

## Ellipsoid sweeps and ship contact

- [tested] Per fixed step: pose before, one integrator step, pose after; then the ship moves; then every shot and ray is swept against the poses; then the hit. A body with no rock state keeps the sphere test, which let the old suite pass unchanged.
- [tested] The swept-ellipsoid call allocates about ten small arrays, so a bounding-sphere cull (`radius + projectileRadius + 6 m`; 6 m covers the largest per-step motion, an attracted chip at 3.5 m) sits in front. See [physics](physics-rapier.md) for the sphere version.
- [tested] Ship contact: detect with the sweep, then project the ship's end position radially onto the ellipsoid inflated by the ship's hit radius and push it out along the gradient `p / s^2`. It works when a rock drifts onto a parked ship; bounce and bump are measured against the rock's velocity. A ship passing a 40 x 10 x 6 m slab on its thin side is not stopped where a sphere of radius 40 would have.

## Costs

- [tested] 40 rocks, 17 variants available: 30 draw calls for the field, 55 for the whole frame (40 with the old three-variant sphere field), 38,480 triangles, 12 programs, 0.016 ms CPU per frame for the field update, 60.0 fps at 1280 x 720 (the 60 Hz cap hides the GPU cost, so the draw-call and triangle figures are the useful ones).
- [tested] With K damaged rocks of six craters each (K = 0, 10, 20, 40): 55, 65, 61, 49 draw calls; 12, 13, 13, 13 programs; 0.016, 0.028, 0.042, 0.036 ms. Calls fall again at 40 because standalone meshes are frustum culled and the buckets (`frustumCulled = false`) are not. Peak 64 calls in a stress stage with ten rail shots and eight chips, against a budget of 150.

## Verification and not verified

- [tested] 73 unit tests across the field, sweep, world, fleet and ship-assembly files pass (2026-10-07). A `rocks` smoke stage holds six assertions (nine kinds in the sector, scale ratio at most 2.99, motion and tumble, the shell, the autopilot killing a drifter with ore rising by its value, ten rail shots leaving 8 craters and 8 chips) in 35 s.
- [tested] The probe reports each sector rock's kind, velocity, spin, ore, hp, current semi-axes and craters at its moving position, never chips. A verifier that waits for the ore held at the kill plus the rock's ore over-waits when chips were collected during the fight (41.6 to 48.2 s against 6.8 to 7.1 s); a later commit in the project fixed the verifier, not re-run here.
- [tested] Looking caught that a rock seen from the chase camera sits behind the ship's tail, and real 2 to 3 m craters on a 36 m rock are a few pixels across at 100 m.
- [general] Not done or not verified: a vertex dent for craters, a per-instance data texture, a unit test of the outline shader, and field cost beyond 40 rocks of this variety.
