---
name: engine-asset-import
description: Import agent-sprites atlases, agent-meshes GLB models and agent-beeps WAV exports into a Unity, Godot or web project, and state exactly what was verified for each engine. Not for Unreal or UEFN (use unreal-import, uefn, unreal-native or the unreal-* domain skills from agent-unreal).
when_to_use: Use when bringing a sprite atlas, GLB, WAV or song export into a Unity, Godot or web project, by script or through an engine's MCP server; when an imported model is missing bones, morphs, meshes or animation clips, or its clips have different names; when a sprite sheet imports with wrong frames, tags or pivot; or when asked whether an asset "works in" an engine. Importing into Unreal is the unreal-import skill in agent-unreal.
---

# Importing plugin assets into a game engine

The three asset plugins export plain files. The engines import them with their own importers, and a
failed import is often quiet. This skill records what is known about each importer and keeps a strict
line between what was verified and what was only read in documentation.

## Before you claim anything

- [general] Say what you checked: "imports into Unity 6 via glTFast with names intact", not "works in
  Unity". Sections marked "tested" were run in the sample scene; the rest is documentation.
- [general] Unity: sections marked "tested" were run in the sample scene; the rest of what is said about it is vendor
  documentation. Say which is which.
- [general] Check what the engine reports, not only the cause the tool states. A failure message can blame
  the wrong thing (a wrong expected bone name was reported as a skin problem).

## What to read

| You are about to | Read |
|---|---|
| Check a GLB's bones, morphs, meshes and clip names after import | [GLB meshes](references/glb-mesh-import.md) |
| Import a sprite atlas and its tags, durations and pivot | [Sprite atlases](references/sprite-atlas-import.md) |
| Import rendered WAVs, loops and variants | [Rendered audio](references/wav-audio-import.md); wiring an app: [audio integration](references/audio-integration.md), [memory and wiring checklist](references/audio-memory-and-wiring.md); building and fetching in CI: [CI for generated assets](references/ci-for-generated-assets.md) |
| Import into Godot | [Godot 4.7](references/godot-import.md) |
| Import into Unity | [Unity 6.3](references/unity-import.md); a long-lived project: [Unity project workflow](references/unity-project-workflow.md) |
| Load the assets in Phaser or three.js | [Web import](references/web-import.md); a real Phaser game: [engine-phaser](../engine-phaser/SKILL.md) |
| See what is verified and not verified per engine | [Engine status](references/engine-status.md) |

- [general] Other skills: choosing an engine is `engine-selection`. Importing into Unreal, UEFN, native C++ Unreal games with their
  packaging and profiling, and choosing an Unreal system (with Niagara and editor Python) are the `unreal-import`, `uefn`,
  `unreal-native` and domain skills (`unreal-rendering`, `unreal-effects`, `unreal-animation`, `unreal-gameplay`,
  `unreal-procedural`, `unreal-editor-scripting`) in the agent-unreal plugin.

## After importing

- [general] Import, then check, then report. If the engine's own MCP server is connected, use it to list the
  imported assets and read the engine log; if it is not, say which checks you could not run. The
  [sample scene](../../docs/sample-scene.md) defines the checks this plugin is aiming for.
