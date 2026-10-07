# Toon shading, outlines and instancing in R3F

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1 in plain WebGL 2, with no post-processing; timings on an NVIDIA RTX 5070 Ti Laptop GPU and an Intel integrated GPU.

The look is a three-band `MeshToonMaterial` with a coloured ramp plus an inverted-hull outline whose width is set in screen space.

## Toon ramp

- [tested] `MeshToonMaterial` samples only the `.r` channel of `gradientMap` (`gradientmap_pars_fragment` in three 0.186.1), so a coloured 3x1 ramp renders as grey bands tinted by `material.color`.
- [tested] Patch the chunk in `onBeforeCompile` to read `.rgb`; the three bands then come out as real palette colours. Make the patch throw if the chunk text ever changes, so an upgrade fails loudly.

```ts
const CHUNK = ShaderChunk.gradientmap_pars_fragment.replace(
  'return vec3( texture2D( gradientMap, coord ).r );',
  'return texture2D( gradientMap, coord ).rgb;');
if (CHUNK === ShaderChunk.gradientmap_pars_fragment) throw new Error('three changed gradientmap_pars_fragment');
m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <gradientmap_pars_fragment>', CHUNK); };
m.customProgramCacheKey = () => 'toon-rgb-ramp';
```

- [tested] Repaint by rewriting the ramp texture's 12 bytes and setting `needsUpdate`; no new material, still 4 programs.
- [tested] `MeshToonMaterial` has no `flatShading`. Get flat facets from non-indexed geometry plus `computeVertexNormals()`. `PolyhedronGeometry` is already non-indexed; `toNonIndexed()` on it only logs a warning.
- [tested] A direct light of intensity PI makes a lit band come out at exactly its ramp colour (lit colour is ramp x light colour / PI in three r155+).
- [tested] With R3F's default ACES tone mapping the bands looked washed out; the `flat` prop on `<Canvas>` (no tone mapping) fixed it. The ambient light level changed in the same run, so treat the tone-mapping effect as probable, not isolated.

## Inverted-hull outline

- [tested] Do not extrude along the normal by a fixed world distance. 0.18 m was fine on a 3 m ship and invisible on a 40 m rock at 300 m.
- [tested] Offset in clip space instead: push each back-face vertex along its projected, smoothed normal by a constant fraction of the viewport height (0.008, about 4 px at 1080p), capped at 12 % of the object's own on-screen size so far rocks stay readable.
- [tested] Take the smoothed normals from `toCreasedNormals(geometry, Math.PI)` (BufferGeometryUtils). A box's corner normals become diagonals and shared corners agree, so the offset opens no cracks at hard edges. Cache the result per source geometry.

The app's version (`apps/r3f/src/render/outline.ts`) is a `MeshBasicMaterial({ side: BackSide })` whose vertex shader is patched after `#include <project_vertex>`:

```glsl
vec2 dir = (projectionMatrix * vec4(normalize(normalMatrix * n), 0.0)).xy;
float t = min(uThickness, 0.12 * objNdc); // objNdc: object size on screen
gl_Position.xy += normalize(dir) * vec2(t / aspect, t) * gl_Position.w;
```

## Instancing asteroids and debris

- [tested] Draw the rock field as one `InstancedMesh` set with an instanced outline twin: 6 draw calls however many rocks.

```ts
const o = new InstancedMesh(outlineGeometry(body.geometry), outlineMaterial, body.count);
o.instanceMatrix = body.instanceMatrix; // the twin follows the body with no extra writes
```

- [tested] Instanced meshes read their own scale from `instanceMatrix` in the outline shader, so one shader serves plain and instanced meshes (`#ifdef USE_INSTANCING`).

## Outlines on instanced meshes

Milliseconds per frame, read with a synchronous `readPixels` so vsync cannot hide it.

| Rocks | NVIDIA with / without outline | Intel with / without | Label |
| --- | --- | --- | --- |
| 40 | 0.04 to 0.06 / 0.04 | 0.19 / 0.16 | [tested] |
| 2,000 | 0.10 to 0.21 / 0.06 to 0.12 | 0.99 / 0.64 | [tested] |
| 10,040 | 0.43 to 0.90 / 0.25 to 0.49 | 3.85 / 2.2 | [tested] |

- [tested] Outlines roughly double the triangle count and cost about 1.5x to 1.8x GPU time at thousands of rocks. At Slice 1's 40 to 60 rocks they are negligible.
- [tested] The implementation run (1280x720, NVIDIA): 40 rocks 0.045 / 0.038 ms, 2,000 rocks 0.207 / 0.123 ms, 10,040 rocks 0.906 / 0.485 ms with / without outlines.

## Draw-call and triangle cost

- [tested] Share one toon material and one outline material across every part, each with a `customProgramCacheKey`: the whole scene (ship, rocks) compiled 4 programs.
- [tested] Ship plus rocks drew 18 calls with outlines, 15 without. The spike's gate held: three palette bands, outlines on ship and rocks, 18 calls against a limit of 30, 0.045 ms against 1 ms.
- [tested] Every assembled part mesh is drawn twice (body and outline). With the real agent-meshes parts the game drew 40 calls at boot and peaked at 48 in combat, against 28 in planning with stand-in parts.
