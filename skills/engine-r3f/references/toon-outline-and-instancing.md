# Toon shading, outlines and instancing in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

A common stylised look is a three-band `MeshToonMaterial` with a coloured ramp plus an inverted-hull outline whose width is set in screen space. The code is in [`toon.mjs`](../../../examples/web3d/r3f/src/toon.mjs), [`outline.mjs`](../../../examples/web3d/r3f/src/outline.mjs) and [`labs.jsx`](../../../examples/web3d/r3f/src/labs.jsx); `cd examples/web3d/r3f && npm run verify` runs the checks named below.

## Toon ramp

- [tested] (r3f verify: unpatched toon ramp renders grey; patched toon ramp keeps its colour) A coloured 3x1 `gradientMap` on a stock `MeshToonMaterial` renders as grey bands tinted only by `material.color`. After the patch the same ramp lights the sphere in its real colour.
- [documented] Cause: `gradientmap_pars_fragment` in three r186 (`src/renderers/shaders/ShaderChunk/`) returns `vec3( texture2D( gradientMap, coord ).r )`, so only the red channel is read.
- [general] Patch the chunk in `onBeforeCompile` to read `.rgb`, and make the patch throw when the replaced text is not found, so a three upgrade fails loudly instead of going grey again. Give the material a `customProgramCacheKey` so patched and stock toon materials do not share a program.

```js
const patched = THREE.ShaderChunk.gradientmap_pars_fragment.replace('texture2D( gradientMap, coord ).r', 'texture2D( gradientMap, coord ).rgb');
if (patched === THREE.ShaderChunk.gradientmap_pars_fragment) throw new Error('three changed the toon chunk');
material.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <gradientmap_pars_fragment>', patched); };
material.customProgramCacheKey = () => 'toon-ramp-rgb';
```

- [general] Use `NearestFilter` on the ramp so bands stay hard. Repaint a palette by rewriting the ramp texture's bytes and setting `needsUpdate`; that needs no new material and no new program.
- [documented] `MeshToonMaterial` has no `flatShading` option (r186 `MeshToonMaterial.js`; `MeshPhongMaterial` has one). For flat facets use non-indexed geometry plus `computeVertexNormals()`.
- [general] If bands look washed out, check tone mapping (R3F applies ACES by default; the `flat` prop on `<Canvas>` turns it off) and the light intensity before touching the ramp. Change one at a time; this repo did not isolate the effect.

## Inverted-hull outline

- [tested] (r3f verify: screen-space outline is the same thickness near and far; world-space outline vanishes on a far object) A back-face hull offset in clip space keeps the same pixel width at any distance, while a hull extruded along the normal by a fixed world distance gets thinner as the object shrinks on screen and is gone on a far object.
- [general] So do not pick one world-space thickness for a scene with objects of very different size or distance. Offset each back-face vertex along its projected normal by a constant fraction of viewport height, scaled by `clip.w` so the divide cancels, and divide the x offset by the aspect ratio. [`outline.mjs`](../../../examples/web3d/r3f/src/outline.mjs) does this in a `ShaderMaterial` with `side: BackSide`.
- [general] Consider capping the offset to a fraction of the object's own on-screen size so tiny far objects do not turn into a solid outline colour.
- [documented] For hard-edged meshes use smoothed normals for the offset: `toCreasedNormals(geometry, Math.PI)` exists in three r186 `examples/jsm/utils/BufferGeometryUtils.js`. A box's corner normals then agree across faces and the hull opens no cracks. Cache the result per source geometry, since clones share geometry.

## Instancing

- [tested] (r3f verify: 1,000 meshes cost about 1,000 draw calls; one InstancedMesh costs 1) The same 1,000 spheres as separate meshes versus one `InstancedMesh` of that geometry. Put repeated things (fields of rocks, projectiles, debris) in one `InstancedMesh`.
- [general] An outline pass is a second draw per mesh. For an instanced body, make an instanced twin that points at the same `instanceMatrix` so it follows with no extra writes.
- [general] Write one outline shader for plain and instanced meshes by reading the instance transform under `#ifdef USE_INSTANCING` (the same define three uses in its own chunks).
- [general] Outlines roughly double the triangle count. The cost matters at thousands of instances on integrated GPUs and is negligible at dozens; measure with a synchronous `readPixels` or a GPU timer, because vsync hides it otherwise. This repo does not ship timings.

## Programs and draw calls

- [general] Share one toon material and one outline material across every part of a model, each with a `customProgramCacheKey`, so the scene compiles a handful of programs however many meshes it has.
- [general] A model built from many parts is drawn twice per part with an outline. Read `gl.info.render.calls` into the probe (see [probe and verification](probe-and-verification.md)) and set a budget, so a part-count change that doubles calls is visible.
- [documented] `Material.customProgramCacheKey()` is the hook three uses to tell programs apart (r186 `src/materials/Material.js`).

Related: [loading agent-meshes parts](loading-agent-meshes-parts.md), [particles and explosions](particles-and-explosions.md), [procedural instanced fields](procedural-instanced-fields.md).
