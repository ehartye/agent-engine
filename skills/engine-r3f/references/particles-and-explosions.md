# Particles and explosions in R3F

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1 in headless Chromium 153, timings on an NVIDIA RTX 5070 Ti Laptop GPU unless a bullet says otherwise.

Slice 1 measured `three.quarks` and a custom pooled emitter, and shipped the custom emitter.

## Options considered

- [general] three.js has no built-in particle system, and R3F inherits that. Believed, not checked here.
- [tested] `three.quarks` 0.17.1 (peer: three >= 0.182) runs under three 0.186.1 in headless Chromium: an 88-particle burst, one draw call, 0.03 ms CPU per fire-and-step (0.030 ms in the implementation run).
- [tested] `three.quarks` colour generators need `Vector4` imported from `three.quarks`; three's own `Vector4` fails type checking.
- [tested] `three.quarks` draws with its own materials, so the toon ramp and outline would still need hand-rolled work. A paused batch renderer still costs one draw call.
- [documented] The vault's R3F page names Three-VFX, which is WebGPU-only and does not fit a WebGL verification path (wiki "React Three Fiber", "Three-VFX, WebGPU Particle System for R3F").
- [documented] Considered and not run, from their npm pages (re-checked 2026-10-07): `wawa-vfx` 1.2.10 (last published 2025-09-23; peers R3F ^9, leva ^0.10, zustand ^5), `three-nebula` 13.3.0 (2026-09-19), `three-vfx` 0.2.1 (2022-07-27, abandoned).
- [general] `three.quarks` is the first thing to reach for if particle needs outgrow a custom emitter (trails, soft sprites). Believed, not checked here.

## What was built

- [tested] A custom emitter: a pooled structure-of-arrays simulation (`ParticleSim`, 18 `Float32Array` fields, swap-remove) written into three `InstancedMesh`es (`ParticleView`). 160 lines, unit-testable without a renderer.
- [tested] It takes the toon ramp and outline for free, and won the gate (below).
- [tested] Per-particle colour: `InstancedMesh.instanceColor` works on `MeshToonMaterial` (it multiplies the ramp) and on `MeshBasicMaterial`.
- [tested] Per-particle fade: shrink the instance scale. Neither material has a per-instance alpha.
- [general] It uses only `InstancedMesh` and stock materials, so it should run on three's WebGPU renderer; not tested here.

## Layers of the explosion

- [tested] Three pooled layers: debris (256), sparks (512) and smoke (128), 896 live particles at the measured load.
- [tested] In the smoke-test script's screenshots the debris chunks, sparks and ore read clearly; the smoke puffs read as one flat grey silhouette with no toon bands or outline.

## Pooling and cost

- [tested] With 256 debris, 512 sparks and 128 smoke alive, simulate plus matrix write costs 0.03 to 0.07 ms CPU per frame, render 0.07 to 0.09 ms on the NVIDIA GPU (0.33 ms on Intel), 4 draw calls.
- [tested] Implementation run (2026-10-07, NVIDIA): 0.048 ms CPU, 0.076 ms render, 4 custom calls plus 1 from the idle `three.quarks` batch, against a 0.2 ms CPU gate.
- [tested] Cap the pools; do not grow them. Over-filled, the pools dropped 160 spawns instead of allocating.

## Hit stop and simulation time

- [tested] Hit-stop freezes `simTime` rather than skipping ahead, so course timing stays simulation time, not wall time.
- [tested] A hit-stop runs no fixed step for several frames: a fire tapped during a 0.06 s hit-stop at 1/60 s gave exactly 1 shot once the simulation resumed, after the latch fix in [frame loop and state](frame-loop-and-state.md).
