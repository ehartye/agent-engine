---
name: engine-r3f
description: Build, structure, debug and verify a React Three Fiber (three.js) 3D game, especially one that loads agent-meshes GLB parts by socket, runs a per-frame flight or action loop beside React, and is checked in headless Chromium through a state probe. Use before writing R3F game code, when per-frame code fights React state, or when a render, outline or particle effect looks wrong. Not for choosing an engine (use engine-selection), authoring the models (use the agent-meshes skills) or Babylon.js (use engine-babylon).
---

# React Three Fiber

Start here for any React Three Fiber game. It collects what building Sector Run taught: a procedurally generated arcade flight game built on this stack and on Babylon.js from one shared rules core.

Read the reference that matches the work. Do not load all of them.

| You are about to | Read |
| --- | --- |
| Write per-frame code (flight, camera, effects) or decide what may live in React state | [R3F frame loop and React state](references/frame-loop-and-state.md) |
| Load agent-meshes part GLBs and assemble a model by socket, with materials | [Loading agent-meshes parts in R3F](references/loading-agent-meshes-parts.md) |
| Give parts toon shading and an outline, or draw many copies of one mesh | [Toon shading, outlines and instancing in R3F](references/toon-outline-and-instancing.md) |
| Add sparks, smoke, debris or a layered explosion | [Particles and explosions in R3F](references/particles-and-explosions.md) |
| Choose or wire physics, colliders and collision events | [Physics in R3F](references/physics-rapier.md) |
| Play recorded sound effects (explosion variants, pickup chime) | [Audio in R3F](references/audio.md) |
| Expose state to tests, script a run, take screenshots or gate on frame rate | [Probing and verifying an R3F game](references/probe-and-verification.md) |
| Choose a renderer backend or debug a blank or flat headless render | [WebGPU, WebGL and headless Chromium for R3F](references/webgpu-and-headless.md) |
| Pin versions, upgrade, or read a breaking-change notice | [R3F versions and migrations](references/versions-and-migrations.md) |

## First five minutes

## Rules that earned their place

## Not covered here

Choosing between engines is [engine-selection](../engine-selection/SKILL.md). The same game on Babylon.js is [engine-babylon](../engine-babylon/SKILL.md). Authoring, rigging and exporting the models belongs to the agent-meshes skills (`mesh-authoring`, `mesh-rigging`, `mesh-build`); importing assets into other engines is [engine-asset-import](../engine-asset-import/SKILL.md).
