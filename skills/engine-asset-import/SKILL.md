---
name: engine-asset-import
description: Import agent-sprites atlases, agent-meshes GLB models and agent-beeps WAV exports into a Unity, Unreal, Godot or web project, and state exactly what was verified for each engine. Not for UEFN (use uefn from agent-unreal), native Unreal games (use unreal-native from agent-unreal) or choosing an Unreal system (use unreal-features from agent-unreal).
when_to_use: Use when bringing a sprite atlas, GLB, WAV or song export into a Unity, Unreal, Godot or web project, by script or through an engine's MCP server; when an imported model is missing bones, morphs, meshes or animation clips, or its clips have different names; when an Unreal import splits one model into many meshes, leaves nothing on disk or needs a per-mesh import policy; when a sprite sheet imports with wrong frames, tags or pivot; or when asked whether an asset "works in" an engine.
---

# Importing plugin assets into a game engine

The three asset plugins export plain files. The engines import them with their own importers, and a
failed import is often quiet. This skill records what is known about each importer and keeps a strict
line between what was verified and what was only read in documentation.

## Before you claim anything

- Say what you checked: "imports into UE 5.7 via Interchange with names intact", not "works in
  Unreal". Sections marked "tested" were run in the sample scene; the rest is documentation.
- Unity: sections marked "tested" were run in the sample scene; the rest of what is said about it is vendor
  documentation. Say which is which.
- Check what the engine reports, not only the cause the tool states. A failure message can blame
  the wrong thing (a wrong expected bone name was reported as a skin problem).

## What to read

| You are about to | Read |
|---|---|
| Check a GLB's bones, morphs, meshes and clip names after import | [GLB meshes](references/glb-mesh-import.md) |
| Import a sprite atlas and its tags, durations and pivot | [Sprite atlases](references/sprite-atlas-import.md) |
| Import rendered WAVs, loops and variants | [Rendered audio](references/wav-audio-import.md); wiring an app: [audio integration](references/audio-integration.md); building and fetching in CI: [CI for generated assets](references/ci-for-generated-assets.md) |
| Import into Unreal 5.7 or 5.8 by script (Interchange, Paper2D, saving, run modes), or fix a GLB that splits into one mesh per skin or leaves nothing on disk | [Unreal import notes](references/unreal-import-notes.md) |
| Convert a GLB to FBX for a tool that takes only FBX, or drive Epic's MCP server | [FBX clips and MCP](references/unreal-fbx-and-mcp.md) |
| Write down a repeatable per-mesh import policy (Nanite, vertex colour, UV, material, rename, collision) and read it back from the saved asset | [Unreal import policy and read-back](references/unreal-import-policy.md) |
| Reuse a saved-project GLB import while protecting generated assets and owner edits | [Guarded import reuse](references/unreal-import-reuse.md) |
| Adopt the import helper in a game whose Unreal project is regenerated each run or that also writes its own folders | [Regenerated projects](references/unreal-import-regenerated-projects.md) |
| Import into Godot | [Godot 4.7](references/godot-import.md) |
| Import into Unity | [Unity 6.3](references/unity-import.md); a long-lived project: [Unity project workflow](references/unity-project-workflow.md) |
| Load the assets in Phaser or three.js | [Web import](references/web-import.md); a real Phaser game: [engine-phaser](../engine-phaser/SKILL.md) |
| See what is verified and not verified per engine | [Engine status](references/engine-status.md) |

Other skills: choosing an engine is `engine-selection`. UEFN, native C++ Unreal games with their packaging and
profiling, and choosing an Unreal system (with Niagara and editor Python) are the `uefn`, `unreal-native` and
`unreal-features` skills in the agent-unreal plugin.

The importer scripts for Unreal are in `scripts/` beside this file (`unreal-import.mjs`,
`unreal_import_native.py`); the guarded-reuse and policy references document their options.

## After importing

Import, then check, then report. If the engine's own MCP server is connected, use it to list the
imported assets and read the engine log; if it is not, say which checks you could not run. The
[sample scene](../../docs/sample-scene.md) defines the checks this plugin is aiming for.
