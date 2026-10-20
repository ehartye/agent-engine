# Procedural, varied, moving fields with instancing in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

How to draw a field of many obstacles or props (rocks, trees, crates) that look varied, drift and tumble, can be squashed into oblong shapes and take visible damage, while staying a handful of draw calls and keeping hit tests honest. The example draws 40 seeded targets as one `InstancedMesh` and shots as another; variants, non-uniform scale, damage decals and chips are `[general]` or `[documented]` guidance. The plain toon and outline setup is in [toon, outline and instancing](toon-outline-and-instancing.md).

## Generate the field from a seed

- [documented] Build positions, sizes and variant picks from a seeded generator ([rng.mjs](../../../examples/web3d/core/rng.mjs), a 32-bit PRNG), as [game.mjs](../../../examples/web3d/r3f/src/game.mjs) does with `createGame({ seed })`. The same seed gives the same field, so a test, a screenshot and a bug report all see one world.
- [general] Vary a few things at once or the field reads as copies: a small set of base meshes (variants), a per-instance scale, a non-uniform stretch up to a chosen ratio, a brightness jitter from the instance seed, and a random spin axis and rate. Draw the seed for each property in a fixed order so adding a property later does not reshuffle the others.
- [general] Give the field its own small rules module: spawn, drift, spin and shell/respawn bounds. Tests then assert ratios (maximum stretch), motion and determinism without a renderer.

## Draw it: one bucket per variant

- [tested] Instancing is the budget: 1,000 separate meshes cost about 1,000 draw calls and one `InstancedMesh` costs 1 (verifier check "1,000 meshes cost about 1,000 draw calls; one InstancedMesh costs 1"; lab `?scene=instancing`). With V variants and P mesh parts each, a field costs about V x P calls, not one per object.
- [documented] Per frame, walk the simulation's bodies, append each live body to its variant's bucket and rewrite the matrix with `setMatrixAt(i, matrix)` from an `Object3D` dummy, then set `instanceMatrix.needsUpdate = true`, as `Instances` does in [App.jsx](../../../examples/web3d/r3f/src/App.jsx). A destroyed body is simply not written (the example scales a dead instance to zero; with a rebuilt bucket you set `count`). No slot bookkeeping.
- [general] Size each bucket for its variant's bodies plus the debris cap, so it cannot overflow. Set an empty bucket's meshes `visible = false` rather than relying on `count` 0.
- [documented] `InstancedMesh` computes its bounding sphere lazily and frustum culls on it (`three/src/objects/InstancedMesh.js`); when instances move or are rewritten every frame, set `frustumCulled = false` on the mesh (the example does) or call `computeBoundingSphere()`.
- [general] A variant's body, accent, glow and outline meshes can share one `instanceMatrix` (`mesh.instanceMatrix = primary.instanceMatrix`), and body and accent can share one `instanceColor`: one write and one upload per bucket.

```js
mesh.instanceMatrix = primary.instanceMatrix;
if (part.role !== 'glow') mesh.instanceColor = primary.instanceColor;
for (const { mesh, outline } of bucket.meshes) {
  mesh.count = outline.count = bucket.count;
  mesh.visible = outline.visible = bucket.count > 0;
}
```

- [tested] Draw at a pose interpolated between the last two fixed steps: a 144 Hz display over a 60 Hz step runs no step on most frames (test "a 144 Hz display over a 60 Hz step runs no step on most frames"), so an uninterpolated field stutters. Use `slerp` for orientation.
- [general] Role from the mesh-name prefix; a variant file that fails to load is replaced by a lumpy `IcosahedronGeometry` stand-in, with the failure reported in the probe's `errors`.

## Outlines on non-uniform scale

- [documented] three's own lit shaders are correct for non-uniform instance scale: `defaultnormal_vertex` divides the normal by the squared column lengths of `mat3(instanceMatrix)` before applying it (`three/src/renderers/shaders/ShaderChunk/defaultnormal_vertex.glsl.js`). A custom outline `ShaderMaterial` such as [outline.mjs](../../../examples/web3d/r3f/src/outline.mjs) does not get that for free, and `mat3(instanceMatrix) * normal` bends toward the long axis of a stretched instance.
- [general] In an instanced outline shader, read the three column lengths as the scale and use `mat3(instanceMatrix) * (normal / (scale * scale))`; take any pixel-cap size from the longest column. Uniformly scaled meshes are unchanged. Check by screenshot on stretched lumps, slabs and spires; a shader has no unit test here.

## Damage on an instance that lives in a bucket

- [general] A body that needs per-body shader state (craters, scorch marks) leaves its bucket and is drawn as its own `Mesh` with a cloned material patched in `onBeforeCompile`: a `uniform vec4 uMarks[N]` array, a count, a `varying vec3 vUnit = position`, and a loop injected after `color_fragment`. Write the uniform values only when that body's list changes.
- [general] three uploads a shared material's uniforms only when the material changes between draws, so per-body values need a per-body material. Clones with the same `customProgramCacheKey` share one compiled program: check `renderer.info.programs.length` before and after.
- [general] Measure mark distance by direction, not position: `distance(normalize(vUnit), centre)`. A mesh rarely fills its unit ball, so a mark placed on the ellipsoid surface can land in the air in front of the mesh. The hit ellipsoid is therefore larger than the drawn body; a test can check every real GLB's largest vertex radius against 1.
- [general] Cap the standalone bodies; the oldest goes back to its bucket without marks, applied after the frame is built so no body is ever missing from a frame. Standalone meshes are frustum culled and buckets with `frustumCulled = false` are not, so draw calls can fall as damage rises.

## Chips, debris and conserved totals

- [general] A hit may chip, mark or destroy through the rules module. A chip is a body in its own right with a time to live; debris is capped, oldest first; a destroyed chip does not break again or count toward goals.
- [general] When fragments carry a value (resources), conserve it: the shares of the chips plus the final drop equal the original, whatever the seed. Assert that over several seeds. A chip whose time runs out should release its value as pickups so none is lost.
- [general] Do not share an integrator that bounces bodies off a boundary shell with chips drawn toward the player inside it; give chips a copy without the shell. When a test rigs a body near a boundary, place it away from the shell or give it no drift, or one step moves it somewhere else.

## Hit tests and contact

- [tested] Sweep shots against the body's pose, not only where they ended up: the swept segment test hits 400 of 400 fast shots where an end-point test misses some ("swept segment tests hit 400 of 400 fast shots"), see [sweep.mjs](../../../examples/web3d/core/sweep.mjs) and [hit tests and physics](hit-tests-and-physics.md).
- [general] Per fixed step: store poses, integrate, then move the player, then sweep every shot and ray against the new poses, then resolve hits. A body with no ellipsoid state keeps the sphere test.
- [general] Swept-ellipsoid tests allocate, so cull with a bounding sphere (radius plus projectile radius plus the largest per-step motion) in front. For contact, detect with the sweep, then project the player radially onto the ellipsoid inflated by the player's hit radius and push out along the gradient `p / s^2`, so a thin side of a slab does not act like its longest radius.

## Costs

- [general] Report draw calls, triangles, programs and per-frame field CPU time from the probe (`gl.info.render.calls`, `gl.info.render.triangles`, `gl.info.programs.length`), and a 60 Hz display cap hides GPU cost, so the call and triangle counts are the useful figures. Sample at several damage levels. Features that look right at 100 m may be a few pixels: take a screenshot at gameplay distance.
