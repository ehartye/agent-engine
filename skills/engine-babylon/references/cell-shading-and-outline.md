# Cell shading and outlines in Babylon.js

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

The look: three toon bands from a palette ramp, plus an ink outline, on every ship part and on thin-instanced asteroids.

## Options considered

- [tested] `CellMaterial` (`@babylonjs/materials/cell/cellMaterial`) renders on a GLB and on thin instances (2 draw calls each), but exposes only `diffuseColor`, `diffuseTexture` and `computeHighLevel`. Rejected: it cannot take a palette ramp.
- [documented] Its brightness steps are a fixed table in `cell.fragment.js`: two levels split at N.L 0.5, or five levels at 0.95, 0.5, 0.2 and 0.03 with `computeHighLevel` (`@babylonjs/materials` 9.29.0 source).
- [documented] The node-material block list has `gradientBlock` but no cell, toon, ramp or outline block (`@babylonjs/core` 9.29.0).
- [tested] The outline renderer (`mesh.renderOutline`, from `@babylonjs/core/Rendering/outlineRenderer`) exists and works on GLB meshes and on thin instances. Kept.

## What worked

- [tested] A custom `ShaderMaterial` with three bands chosen by N.L and three ramp uniforms, plus the outline renderer. To run on thin instances it uses the `instancesDeclaration` and `instancesVertex` includes, whose modules must be imported explicitly or the shader fails to compile (`src/render/toon.ts`):

```ts
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration';
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';
import '@babylonjs/core/Rendering/outlineRenderer';
// vertex:   #include<instancesDeclaration> ... main() { #include<instancesVertex> ... finalWorld * vec4(position, 1.0) }
// fragment: vec3 c = ndl > uBands.y ? uRamp2 : (ndl > uBands.x ? uRamp1 : uRamp0);
mesh.renderOutline = true;
mesh.outlineWidth = 0.04; // metres, the same on every part
mesh.outlineColor = Color3.FromHexString(palette.outline);
```

## Outlines on hard-edged parts

- [tested] Symptom: with `outlineWidth` 0.04 the smooth-normal meshes (fuselage, canopies) got thick closed outlines, but wings, fins, vanes, boxes and the caps of every lathed cylinder got at most a 1 px hairline. At the chase camera the starter ship's wings and fin read as unoutlined. The spike had already shown the outline offset and open at the corners of a flat-shaded mesh.
- [documented] Cause: the outline pass (`outline.vertex`) draws `position + normal * offset` in object space, normal not normalised. A split-normal mesh stores one copy of each corner per face, so the copies move apart and the shell opens along every hard edge.
- [tested] Second cause: the same open-ended engine bell measured 0.69 or 0.99 outline coverage depending on which smoke stages had run before it.
- [documented] Why: the renderer draws the shell in `_beforeRenderingMeshStage`, before the mesh's own material binds its state, so the shell inherits the previous draw call's face culling.
- [tested] Workaround, at load time on the container (`src/render/outlineNormals.ts`, `withOutlineNormals` in `src/render/toon.ts`): copy the shading normals to a `shadeNormal` attribute, which the toon shader reads under a `SHADE_NORMAL` define, and replace `normal` with outline normals. Weld corners by position (1e-4 m), take one normal per corner from the distinct normals of the triangles meeting there, normalise it and lengthen it by 1 / min(n . face), capped at 1.5 widths, so the shell moves the full width out along every face (sqrt 2 on a right-angled edge). Clones share the geometry, so this runs once per GLB.
- [tested] Workaround for the culling: per part mesh, `mesh.onBeforeRenderObservable.add(() => engine.setState(false))`, so the shell draws with no culling every frame. A welded clone, a second inverted hull or a new outline method were not needed.
- [tested] Check (smoke `outline` stage, each mesh alone on grey from two sides; coverage is the share of silhouette pixels with ink within about 2 px): before, the flat or hard-edged meshes scored 0.37 to 0.89 and the smooth ones 0.975 to 0.983; after, all 71 meshes score 0.93 to 0.996 (dart wings 0.43 to 0.95, fin 0.51 to 0.98). Whole ship from close, side and front: 0.57 to 0.84 before, 0.98 to 0.995 after; at the chase distance 0.13 to 0.42 before, 0.80 to 0.91 after (gates 0.9, and 0.7 at the chase distance). Draw calls 54 before and after, 60 fps; no pixel changed toon band.
- [tested] Still seen: a small black wedge where one part pokes into another (the shell's depth is written after the mesh), and no visible outline at the silhouette against the near-black space background; it reads where parts overlap parts or rocks. A mitre cap of 2 instead of 1.5 added spikes at tips and corners and closed nothing more.
- [tested] Keep the width at 0.04 m on every part: scaled down on small parts it would drop under 2 px at the chase distance.

## Palette ramps

- [tested] Two shared `ShaderMaterial`s (toon and accent) serve every part. A palette change sets the ramp uniforms and the outline colour on the existing materials and meshes, with no rebuild; the ember ramp, and after a repaint the azure ramp and outline, were found on screen by pixel count (smoke `boot`, `flight`, `outline`, `loop`).

```ts
ramp.forEach((hex, i) => material.setColor3(`uRamp${i}`, Color3.FromHexString(hex)));
```

## Outlines on instances

- [tested] The outline renderer outlines thin instances with one extra draw call per outlined mesh, not per instance: 2,678 black outline pixels around 60 instances and 1,251 around a GLB wedge, identical on the NVIDIA and Intel GPUs.
- [tested] The asteroids (thin instances of closed icospheres) need no outline-normal fix and were left unchanged.

## Cost

- [tested] 60 outlined thin instances: 0.071 ms per frame against 0.056 ms without the outline (NVIDIA).
- [tested] Each outlined mesh adds one draw call, so every part mesh is drawn twice; the ship scene measured 54 draw calls (smoke `perf`) and 69 under the verifier with `engine-ion` fitted. The outline-normal fix added none.
