---
name: engine-unreal-features
description: Choose which Unreal Engine 5.8 feature to use for a goal (Niagara, Chaos destruction, Chaos vehicles, Mover, cloth and soft bodies, Hair Strands, Control Rig and IK, PCG, Landmass, Water, Geometry Scripting, Procedural Mesh Component, MetaSounds, legacy Cascade), with one reference per system covering when to use it and how an agent drives it from Python, Blueprint or C++. Not for choosing a game engine (use engine-selection) or importing sprite, mesh or audio assets (use engine-asset-import).
when_to_use: Use when asked which Unreal system or plugin to use for an effect, destruction, vehicle, character movement, cloth, hair, rig, procedural world or mesh, water, terrain or procedural audio; when asked whether Unreal can do something "like Niagara"; before enabling an Unreal plugin; or when deciding whether an Unreal task can be scripted from Python.
---

# Choosing an Unreal feature

Unreal 5.8 on Windows. Pick the feature from the goal, enable only its plugin, then read that system's reference. Each reference states when to use the system, what to use instead, how an agent drives it (Python, Blueprint, C++ or editor UI) and the Epic documentation behind it. The plugin state in brackets is the shipped descriptor: `node examples/unreal/engine_plugins.mjs --engine <UE folder>` lists them.

| You are about to | Read |
|---|---|
| Make fire, smoke, sparks, trails, liquid, sand or any particle effect (Niagara; fluid templates in NiagaraFluids; on) | [Niagara](../engine-asset-import/references/unreal-niagara.md), [Niagara templates](../engine-asset-import/references/unreal-niagara-templates.md) |
| Keep or convert existing Cascade particle content (Cascade on in the editor; converter off, beta) | [Cascade](references/unreal-cascade.md) |
| Drive effects from destruction or physics events (ChaosNiagara; on, beta) | [Chaos Niagara](references/unreal-chaos-niagara.md) |
| Break walls or props apart: fracture, debris, fields (Geometry Collections and Fracture; off, beta) | [Chaos destruction](references/unreal-chaos-destruction.md) |
| Drive wheeled or modular vehicles (Chaos Vehicles, Chaos Modular Vehicle; off, experimental) | [Chaos vehicles](references/unreal-chaos-vehicles.md) |
| Move a character or pawn beyond the Character Movement Component (Mover, ChaosMover; off, experimental) | [Mover](references/unreal-mover.md) |
| Simulate cloth, outfits or soft bodies (ChaosCloth on; Cloth Asset, Outfit Asset, ChaosFlesh off) | [Cloth and flesh](references/unreal-chaos-cloth-and-flesh.md) |
| Add hair or fur (Hair Strands; off) | [Hair Strands](references/unreal-hair-strands.md) |
| Rig, animate procedurally or retarget with IK (Control Rig and IK Rig on; Full Body IK off) | [Control Rig](references/unreal-control-rig.md) |
| Scatter or place world content by rules: foliage, props, biomes (PCG; on) | [PCG](references/unreal-pcg.md) |
| Author terrain with helpers (Landmass; off, beta) | [Landmass](references/unreal-landmass.md) |
| Add oceans, lakes or rivers (Water; off, experimental) | [Water](references/unreal-water.md) |
| Build or edit meshes from code, in the editor or at runtime (Geometry Scripting; off) | [Geometry Scripting](references/unreal-geometry-scripting.md) |
| Create a runtime mesh from vertex arrays (Procedural Mesh Component; on) | [Procedural Mesh Component](references/unreal-procedural-mesh-component.md) |
| Make parameter-driven, sample-accurate game audio (MetaSounds; on) | [MetaSounds](references/unreal-metasounds.md) |

## Rules of thumb

- When two features fit equally, choose the one whose plugin is on by default. A beta or experimental plugin is a deliberate opt-in, and its reference says what it is for.
- Use Niagara for new particle work and keep Cascade for content that already exists.
- Import a fixed asset (a GLB from agent-meshes, a WAV from agent-beeps, a sprite atlas from agent-sprites); build in Unreal (Geometry Scripting, MetaSounds, Niagara) when the asset must respond to gameplay. The import steps are in `engine-asset-import`.
- Choose the route by reach: asset creation, level building and property edits are editor Python (`EditorAssetLibrary`, asset tools, editor subsystems; see [Editor Python](../engine-asset-import/references/unreal-editor-python.md)); per-frame behaviour, custom solvers and new data types are C++ or Blueprint. Each reference's route table says which tasks are which.

## Enable a feature

1. List the plugin's descriptor: `node examples/unreal/engine_plugins.mjs --engine "<UE folder>" --name <Plugin>`.
2. Enable it in Edit > Plugins, or add `{ "Name": "<Plugin>", "Enabled": true }` to the `.uproject` `Plugins` array, and restart the editor.
3. See what Python reaches: run [`unreal_surface.py`](../../examples/unreal/unreal_surface.py) headless with `UNREAL_SURFACE_MATCH=<name fragment>`.
4. Script the editor with [Editor Python](../engine-asset-import/references/unreal-editor-python.md).
