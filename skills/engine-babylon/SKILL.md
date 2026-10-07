---
name: engine-babylon
description: Build, structure, debug and verify a Babylon.js 3D game, especially one that loads agent-meshes GLB parts by socket, uses Havok physics, particles and observables, and is checked in headless Chromium through a state probe. Use before writing Babylon.js game code, when handedness, cell shading, outlines, Havok loading or bundle size cause trouble, or when a render looks wrong. Not for choosing an engine (use engine-selection), authoring the models (use the agent-meshes skills) or React Three Fiber (use engine-r3f).
---

# Babylon.js

Start here for any Babylon.js game. It collects what building Sector Run taught: a procedurally generated arcade flight game built on this stack and on React Three Fiber from one shared rules core.

Read the reference that matches the work. Do not load all of them.

| You are about to | Read |
| --- | --- |
| Set up the engine and scene, run the per-frame loop, or wire game events | [Babylon.js scene, render loop and observables](references/scene-loop-and-observables.md) |
| Match Babylon.js positions, rotations and cameras to a right-handed core | [Babylon.js handedness and coordinates](references/handedness-and-coordinates.md) |
| Load agent-meshes part GLBs and assemble a model by socket, with materials and animation groups | [Loading agent-meshes parts in Babylon.js](references/loading-agent-meshes-parts.md) |
| Give parts cell shading and an outline | [Cell shading and outlines in Babylon.js](references/cell-shading-and-outline.md) |
| Load Havok, create bodies and shapes, or read collision events | [Havok physics in Babylon.js](references/physics-havok.md) |
| Add sparks, smoke, debris or a layered explosion | [Particles and explosions in Babylon.js](references/particles-and-explosions.md) |
| Open the inspector, debug a scene or find what a probe cannot see | [The Babylon.js inspector and debugging](references/inspector-and-debugging.md) |
| Play recorded sound effects (explosion variants, pickup chime) | [Audio in Babylon.js](references/audio.md) |
| Measure or cut bundle size, or choose how to import Babylon.js packages | [Babylon.js bundle size and imports](references/bundle-size-and-imports.md) |
| Expose state to tests, script a run, take screenshots or gate on frame rate | [Probing and verifying a Babylon.js game](references/probe-and-verification.md) |
| Choose a renderer backend or debug a blank or flat headless render | [WebGPU, WebGL and headless Chromium for Babylon.js](references/webgpu-and-headless.md) |
| Pin versions, upgrade, or read a breaking-change notice | [Babylon.js versions and migrations](references/versions-and-migrations.md) |

## First five minutes

## Rules that earned their place

## Not covered here

Choosing between engines is [engine-selection](../engine-selection/SKILL.md). The same game on React Three Fiber is [engine-r3f](../engine-r3f/SKILL.md). Authoring, rigging and exporting the models belongs to the agent-meshes skills (`mesh-authoring`, `mesh-rigging`, `mesh-build`); importing assets into other engines is [engine-asset-import](../engine-asset-import/SKILL.md).
