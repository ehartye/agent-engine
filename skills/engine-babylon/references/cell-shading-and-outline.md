# Cell shading and outlines in Babylon.js

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

A common stylised look is a few toon bands from a palette ramp plus an ink outline. The example uses Babylon's built-in outline renderer on a plain `StandardMaterial` mesh and on thin instances ([`main.mjs`](../../../examples/web3d/babylon/src/main.mjs), [`labs.mjs`](../../../examples/web3d/babylon/src/labs.mjs)); `cd examples/web3d/babylon && npm run verify` runs the checks named below. It has no toon shader, so the toon material is `[general]` or `[documented]`.

## Options for the bands

- [general] `CellMaterial` (`@babylonjs/materials/cell/cellMaterial`) is the stock option. It exposes `diffuseColor`, `diffuseTexture` and `computeHighLevel`, and its brightness steps are a fixed table in the fragment shader (two levels, or five with `computeHighLevel`), so it cannot take a palette ramp. Read the shader in your installed version before relying on this; `@babylonjs/materials` is not installed in this repo.
- [documented] The node-material block list has `gradientBlock` but no cell, toon, ramp or outline block (`Materials/Node/Blocks`, 9.29.0).
- [general] When the ramp must come from a palette, write a small `ShaderMaterial`: pick one of three ramp colours by N.L against two thresholds, and keep the ramp in uniforms so a palette change is a `setColor3` call, not a rebuild.

```js
ramp.forEach((hex, i) => material.setColor3(`uRamp${i}`, Color3.FromHexString(hex)));
// fragment: vec3 c = ndl > uBands.y ? uRamp2 : (ndl > uBands.x ? uRamp1 : uRamp0);
```

## Toon shader on thin instances

- [documented] `ShaderMaterial` adds `#define INSTANCES` and, for thin-instanced meshes, `#define THIN_INSTANCES` itself and pushes the instance attributes (`Materials/shaderMaterial.pure.js`, 9.29.0). Your vertex shader only has to include the Babylon chunks and use `finalWorld`:

```glsl
#include<instancesDeclaration>
void main() {
  #include<instancesVertex>
  gl_Position = viewProjection * finalWorld * vec4(position, 1.0);
}
```

- [documented] The chunks are modules in `@babylonjs/core/Shaders/ShadersInclude/` that register themselves into the shader store when imported. An unregistered `#include` is not rejected at once: the shader processor tries to fetch `ShadersInclude/<name>.fx` from the shaders repository (`Engines/Processors/shaderProcessor.js`), which a bundled app does not serve. The built-in outline vertex shader imports the two chunks for itself.
- [general] Import `instancesDeclaration` and `instancesVertex` explicitly in your own material module rather than relying on the outline module having loaded. More in [bundle size and imports](bundle-size-and-imports.md).

## Built-in outline renderer

- [tested] (babylon verify: built-in outline closes on a sphere, a hard-edged box and a thin plate with similar thickness) With `mesh.renderOutline = true` (side-effect import `@babylonjs/core/Rendering/outlineRenderer`), `outlineWidth` 0.04 and the camera 8 m away, the outline closes (at least 95 % of the silhouette edge has ink within 3 px) on a smooth sphere, a box with hard edges and a 0.1 m thick plate, and the ink thickness per edge pixel is within 0.6x to 1.4x of the sphere's.

```js
import '@babylonjs/core/Rendering/outlineRenderer';
mesh.renderOutline = true;
mesh.outlineWidth = 0.04; // object-space units, see below
mesh.outlineColor = Color3.FromHexString(palette.outline);
```

- [documented] `outline.vertex` draws `position + normal * offset` in object space (`Shaders/outline.vertex.js`), before the world matrix. So the width is in the mesh's own units: a scaled mesh gets a proportionally scaled outline, and the on-screen width shrinks with distance. Pick `outlineWidth` per scale and distance, not as a pixel width.
- [documented] The outline is a second draw of the mesh, issued in a before-mesh scene stage with depth writes off; it also handles thin-instanced meshes (`Rendering/outlineRenderer.pure.js`). So an outlined mesh costs one extra draw call, per mesh and not per instance.
- [general] Keep `outlineWidth` the same across the parts of one model; a smaller width on small parts can fall under 2 px at the chase-camera distance.
- [general] A dark outline is invisible against a near-black background and only reads where parts overlap other parts or terrain. Choose the outline colour for the background, not only the model.

## Hard-edged meshes

- [general] An earlier project reported hairline outlines on thin, hard-edged parts (wings, fins, cylinder caps) at the same width that closed on smooth meshes. This example did not reproduce it: the box and plate above closed like the sphere. Check your own parts with a lab like [`labs.mjs`](../../../examples/web3d/babylon/src/labs.mjs) before adding a fix.
- [documented] Possible mechanism, from the shader above: a mesh with split (per-face) normals stores one vertex copy per face corner, and each copy moves along its own normal, so the shell can open along hard edges. Normals that are welded by position and averaged for the outline only would close it.
- [general] If you do replace normals for the outline, keep the shading normals in a separate attribute for the toon shader, and do it once per GLB on the container's meshes, because clones share geometry ([loading agent-meshes parts](loading-agent-meshes-parts.md)).
- [general] The earlier project also saw outline coverage on one open-ended mesh vary with what had rendered before it, and cured it with `mesh.onBeforeRenderObservable.add(() => engine.setState(false))`. The outline is drawn before the mesh binds its own state (`_beforeRenderingMesh` above), so it can inherit the previous draw's culling.

## Instances and cost

- [tested] (babylon verify: 1,000 meshes cost about 1,000 draw calls; one thin-instanced mesh costs 1) Thin instances keep many copies of a target or projectile at one draw call.
- [general] An outlined mesh draws its outline as an extra pass, so plan for about two draw calls per outlined mesh; the example does not count it.
- [tested] (babylon verify: thin instances) One thin instance draws only at its own position. `thinInstanceCount = 0` still draws the source mesh at the origin; `setEnabled(false)` hides it. Disable an empty pool, as `main.mjs` does for its shots.
- [general] Measure the outline's frame cost with a GPU timer or a synchronous read; this repo does not ship timings, and an earlier project saw it as a small fraction of a millisecond at dozens of instances.

Related: [bundle size and imports](bundle-size-and-imports.md), [particles and explosions](particles-and-explosions.md).
