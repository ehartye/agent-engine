# Particles and explosions in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

Particles are a draw-call and allocation problem before they are an art problem. A small pooled emitter written into `InstancedMesh`es is often enough for debris, sparks and smoke, and it keeps the same toon look and outline as the rest of the scene. No particle system is part of the example app; the instancing check is the nearest thing reproduced here.

## Options

- [documented] three.js core has no built-in particle system, and R3F inherits that. Libraries exist (for example `three.quarks`, `three-nebula`, `wawa-vfx`); check each one's three and R3F peer ranges and its renderer support (some target only the WebGPU renderer) before adopting it.
- [general] A library brings its own materials, so a toon ramp, an outline or a custom tone mapping must be re-done for it, and an idle batch renderer may still cost a draw call. Reach for one when you need trails, soft sprites or authoring tools; start custom when you need a few bursts in the house style.
- [general] Pin whichever library you pick and add it to the versions table in [versions and migrations](versions-and-migrations.md); a peer range that excludes your three version is a build break waiting for an upgrade.

## A pooled emitter

- [general] Simulate in plain arrays: one typed array per field (position, velocity, age, life, size, colour) in a structure-of-arrays pool, removing a dead particle by swapping the last one into its slot. The simulation has no three.js import, so it is unit-testable in Node like [`core`](../../../examples/web3d/core).
- [general] A thin view writes the live particles into an `InstancedMesh` each frame: set the matrix per live instance, set `mesh.count` to the live total, then flag `instanceMatrix.needsUpdate`. Create the mesh with its capacity once.
- [tested] (r3f verify: 1,000 meshes cost about 1,000 draw calls; one InstancedMesh costs 1) An `InstancedMesh` is one draw call however many instances it holds, which is why the view is instanced rather than a mesh per particle.
- [documented] Per-particle colour works through `InstancedMesh.instanceColor`: the shared `color_vertex` chunk multiplies `vColor.rgb` by it, and `MeshToonMaterial` and `MeshBasicMaterial` both include that chunk (r186 `src/renderers/shaders/ShaderChunk/color_vertex.glsl.js`, `ShaderLib/meshtoon.glsl.js`, `meshbasic.glsl.js`). It carries rgb only, so there is no per-instance alpha.
- [general] Fade by shrinking the instance scale to zero over its life instead of by alpha. If you need real transparency, use a separate transparent material and mind sort order.
- [general] It uses only `InstancedMesh` and stock materials, so it should also run on three's WebGPU renderer; check that before relying on it.

## Layers of an explosion

- [general] Use a few pooled layers, each with its own mesh, geometry and lifetime: chunky debris (low-poly, spinning), sparks (small, fast, short-lived) and smoke (large, slow, fading). One `InstancedMesh` per layer means a handful of draw calls for the whole effect.
- [general] Review the result in a screenshot, since smoke drawn as a flat silhouette with no ramp bands or outline can look out of style next to toon-shaded debris. Give smoke a different material (for example unlit and softened) on purpose rather than by accident.

## Pooling and cost

- [general] Cap the pools; do not grow them. When a pool is full, drop the new spawn (and count the drops in the probe) instead of allocating mid-game.
- [general] Preallocate every typed array and reuse one scratch `Object3D` or `Matrix4` for the matrix writes, so a burst makes no garbage.
- [general] Measure CPU time for simulate plus matrix write, and draw calls, with your pools full, on an integrated GPU as well as a discrete one, and set a budget in the verifier. This repo does not ship timings.

## Hit stop and simulation time

- [general] Drive particles from simulation time, not wall time, so a hit-stop or pause freezes them with the rest of the world and resumes cleanly.
- [tested] (core test: a tap during a hit-stop fires once when the simulation resumes) A hit-stop runs no fixed step for several frames. Input latches that are cleared only after a step has run mean a tap during the freeze fires exactly once afterwards; see [frame loop and state](frame-loop-and-state.md).

Related: [toon, outline and instancing](toon-outline-and-instancing.md), [audio](audio.md), [procedural instanced fields](procedural-instanced-fields.md).
