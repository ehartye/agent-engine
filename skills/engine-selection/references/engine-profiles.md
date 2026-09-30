# Engine profiles

Dated 2026-09-30. Tags: **[tested]** ran on the dev machine (Windows 11, RTX-class GPU), **[documented]**
read in vendor or project docs, **[general]** general knowledge not checked here. Re-check anything
not tagged [tested] before relying on it.

Contents: [Unreal](#unreal-engine-57) | [UEFN](#uefn-unreal-editor-for-fortnite) | [Godot](#godot-47) |
[Unity](#unity) | [Web stacks](#web-stacks) | [What to check first](#what-to-check-first)

## Unreal Engine 5.7

**Agent loop**
- [tested] Fully unattended: a commandlet (`UnrealEditor-Cmd -run=pythonscript -script=...`, with
  `-nullrhi`) imports assets and builds a level in about 30 seconds after the first run.
- [tested] Rendering works with no window: `UnrealEditor -RenderOffScreen -ExecCmds="py script.py"`
  started Play-In-Editor, sampled state and wrote a screenshot on the GPU. A windowed `-game` run failed
  in that session with `DXGI_ERROR_NOT_CURRENTLY_AVAILABLE` (no desktop to present to).
- [tested] A run costs 60 to 75 seconds, mostly editor start. Expect several runs to fix layout.
- [documented] MCP servers exist (Epic's own in 5.8; community servers). Several need a C++ plugin built
  into the project. None was used in the tested loop.

**Import** ([tested] unless noted)
- GLB and PNG: `InterchangeManager.import_asset` with `is_automated = True`. Do not use
  `AssetTools.import_asset_tasks` for glTF in a commandlet: it asserts on a missing Slate application.
- WAV is not an Interchange format in 5.7. `AssetTools.import_asset_tasks` works for it headless.
- Names change: `relic-discovered.0.wav` became `relic-discovered_0`; GLB clips `walk` and `trot` became
  `foxwalk` and `foxtrot`.
- A GLB with 48 skins sharing the same 19 joint nodes merged into one SkeletalMesh.
- Sprites need the Paper2D plugin. Pivots are in **sheet pixels**, not relative to the frame, so add the
  frame origin or frames jump sideways. Paper2D sprites lie in the XZ plane: rotate to face the camera.
- The atlas `frames` array holds raw cells, tag frames and named cells together; the tag's `from`/`to`
  index into that array, so frame index is not cell index.

**Traps**
- `-ExecutePythonScript` quits the editor when the script ends and is refused in `-game`. Use
  `-ExecCmds="py <file>"` and register a tick callback.
- Git Bash rewrites an argument like `/Game/Maps/X` into a Windows path. Set `MSYS_NO_PATHCONV=1`.
- Python arguments differ from C++: `Rotator(roll, pitch, yaw)`, `Color(r=, g=, b=)` (positional order
  gave a blue light), some properties are not exposed (`initial_texture`).
- [documented] The Unreal build tool needs Perforce even with `-noP4`; matters for CI, not for this loop.

**Quality and limits**: [general] highest visual and simulation ceiling of the options; heaviest install;
binary assets, so scenes cannot be reviewed as text diffs.

## UEFN (Unreal Editor for Fortnite)

Nothing here is tested. From research on 2026-09-30.
- [documented] Windows only; install Fortnite then UEFN through the Epic Games Launcher; an Epic account
  is required. Minimums: Win10 1909, 16 GB RAM, GTX 960-class GPU.
- [documented] Import: meshes (FBX, OBJ, glTF, GLB), textures (PNG, TGA, JPG and more), audio (WAV, AIF,
  FLAC, OGG). Skeletal meshes need a checkbox on import, and animations import as separate FBX files.
  Audio limits (rate, channels, length) were not found on an official page. No 2D sprite or atlas support
  was found: a sprite would be a texture on a mesh or a UI image.
- [documented] Automation: "Python Editor Scripting" is an early-preview project setting. An official
  UEFN MCP shipped in release 42.00 with Verse, Verse Scene Graph, Creative Devices and Sessions toolsets.
  It has no asset-import toolset. No command line was found.
- [documented] Budget: an area over 100,000 memory units cannot be published.
- [documented] Testing needs a running Fortnite client and an Epic sign-in; a cycle is about 3 to 6
  minutes. Publishing needs a rating questionnaire and moderation, and an adult account.
- Unknown: rules for AI-generated assets and for coding agents (the terms pages would not load).
- [general] Gameplay is Verse and Creative devices, not engine code. The owner's own design notes say true
  spherical gravity and custom vehicles are not expressible, which is an unverified reading of docs.

**Verdict**: a separate target, not standard Unreal with another path. It adds Fortnite distribution and
an official agent path. It costs platform lock-in and an unattended loop capped by sign-in and the client.
First milestone: one sign-in by the owner, then a Python script that imports one GLB and one WAV and a
check that the assets exist and the memory figure still passes.

## Godot 4.7

- [tested] One command installs it on Windows (`winget install GodotEngine.GodotEngine`, 4.7.2). Nothing
  was imported or run yet.
- [documented] Headless flags: `--headless`, `--import` (import then quit), `--script`, `--check-only`,
  `--export-release`, `--write-movie`. No screenshot flag on that page.
- [documented] glTF 2.0 is imported natively and recommended; `.blend` needs Blender installed.
- [documented] No built-in sprite-sheet importer. The community Aseprite Wizard takes `.aseprite` files and
  runs the Aseprite program, so a sheet plus JSON needs a small loader.
- [documented] WAV loop metadata is followed by default. [tested] The agent-beeps WAVs carry none (no
  `smpl` chunk), so set the loop mode explicitly.
- [documented] MCP: godot-ai (editor add-on, 46 tools, needs Godot 4.7+, telemetry on by default) and
  Coding-Solo godot-mcp (runs the binary, no add-on, no screenshot tool listed).
- [general] Scenes are text files (`.tscn`), which diff and review well. Strong 2D, good 3D, smaller
  high-end ceiling than Unreal.

## Unity

Nothing here is tested; it is not installed on the dev machine.
- [documented] Unity deprecated the MCP server inside its in-editor assistant package. The Unity CLI
  (`unity mcp`, `unity command`, `unity eval`) replaces it; third-party MCP packages are unaffected.
  The CLI page lists no tools.
- [documented] Headless activation needs a licence; per a vault source, Personal needs an interactive
  Hub login, which caps unattended runs.
- [documented] GLB needs the glTFast package (`com.unity.cloud.gltfast`), with its `.bin` and images copied
  unchanged. The 2D Aseprite Importer takes `.ase`/`.aseprite` files, not a sheet plus JSON.
- [documented] Assets are identified by a GUID in a paired `.meta` file. Moving or deleting files from the
  shell orphans them, which is exactly what an agent tends to do.
- [general] Widest platform reach; large MCP ecosystem (several community servers with screenshots, play
  mode and tests, per vault sources).

## Web stacks

- [documented] Phaser is a 2D HTML5 framework. agent-sprites documents its atlas loading and agent-beeps
  ships a browser player. [tested] Chromium renders audio for agent-beeps on the dev machine; no web scene
  was built yet.
- [documented] three.js is a rendering library ("it gives you a scene graph, cameras, lights, materials,
  geometry, loaders, and a renderer, and then it stops"). agent-meshes ships a three.js viewer for its GLBs.
- [documented] Babylon.js (full engine, built-in Havok physics, free web editor) and PlayCanvas (engine
  with entity-component model and a hosted editor; engine MIT, editor proprietary). The comparing source
  is written by a web-engine vendor.
- [general] Headless Chromium gives an unattended run and screenshot with no sign-in. Limits are browser
  performance and memory, and no native or console target.

## What to check first

Before committing to an engine for real work, run the [sample scene](../../../docs/sample-scene.md) in it.
It answers, in an hour, whether the GLB imports with its skin and clips, whether the atlas needs a
loader, whether the audio loops, and whether a screenshot can be taken with nobody present.
