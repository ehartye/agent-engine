# Engine profiles

Dated 2026-09-30. Tags: **[tested]** ran on the dev machine (Windows 11, RTX-class GPU), **[documented]**
read in vendor or project docs, **[general]** general knowledge not checked here. Re-check anything
not tagged [tested] before relying on it.

Contents: [Sessions](#before-any-of-these-is-the-shell-interactive) | [Unreal](#unreal-engine-57) | [UEFN](#uefn-unreal-editor-for-fortnite) | [Godot](#godot-47) |
[Unity](#unity) | [Web stacks](#web-stacks) | [What to check first](#what-to-check-first)

## Before any of these: is the shell interactive?

- [tested] The agent's shell on the dev machine ran in Windows session 0, a non-interactive service session
  (`(Get-Process -Id $PID).SessionId` is 0 and `[Environment]::UserInteractive` is false), while Explorer and
  the Epic Launcher ran in session 1, the user's desktop. There, windowed rendering fails (Unreal D3D12 and
  Unity D3D12 and D3D11 with 0x887A0022 or "Switching to resolution failed", Unity Vulkan crashed) and screen
  capture fails ("The handle is invalid"). Offscreen modes work: Unreal `-RenderOffScreen`, Unity `-batchmode`
  without `-nographics`, headless Chromium, Godot's Vulkan window. Check this first and pick the mode to match.
- [tested] A GUI app can be started on the user's desktop from session 0 with a one-shot scheduled task that
  runs interactively as the user (`schtasks /create /tn <name> /tr <cmd> /sc once /st 23:59 /it /ru <user>`, then
  `/run`, then `/delete`). It cannot click for you: sign-ins and "new project" dialogs still need the user.

## Unreal Engine 5.7

**Agent loop**
- [tested] Fully unattended: a commandlet (`UnrealEditor-Cmd -run=pythonscript -script=...`, with
  `-nullrhi`) imports assets and builds a level in about 30 seconds after the first run.
- [tested] Rendering works with no window: `UnrealEditor -RenderOffScreen -ExecCmds="py script.py"`
  started Play-In-Editor, sampled state and wrote a screenshot on the GPU. A windowed `-game` run failed
  in that session with `DXGI_ERROR_NOT_CURRENTLY_AVAILABLE` (no desktop to present to).
- [tested] A run costs 60 to 75 seconds, mostly editor start. Expect several runs to fix layout.
- [tested] Epic's own MCP plugin (5.8.3, Experimental) starts headless with `-ModelContextProtocolStartServer`, imports
  textures and FBX, spawns actors and returns screenshots; it has no audio import and rejects GLB, so the tested
  loops still use scripts. [documented] Community MCP servers exist; several need a C++ plugin built into the project.
- [tested] Unreal 5.8.3 passes the same scene after three fixes (the fox splits into 48 meshes by default, automated
  imports are not saved, FBX clips need frame-aligned lengths); see the `engine-asset-import` skill.

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

Mostly research from 2026-09-30; the [tested] items below are what was run on the dev machine.
- [tested] The first install of UEFN 42.20 (21.4 GB, into its own `Fortnite_Studio` folder) was broken even though
  the launcher marked it complete: the editor died at startup with 0xC0000135 (`tbb12.dll` missing from the exe's
  folder; Windows searches the exe's own folder, found by reading the import table), and after a copy of that file
  it showed an error dialog and exited (`UnrealBuildTool.exe`, `FortniteGame.uproject` and ICU data missing,
  `Engine\Config` absent). The crash log is
  `%LOCALAPPDATA%\UnrealEditorFortnite\Saved\Crashes\_0000\UnrealEditorFortnite.log`. A process that looks alive
  and "responding" can be sitting on a modal error, so read the log, not the process list.
- [tested] A reinstall from the launcher fixed it. The launcher queued it behind the Unreal Engine 5.8 update, and
  installed UEFN into the **Fortnite** folder (`Fortnite\FortniteGame\Binaries\Win64\UnrealEditorFortnite-Win64-Shipping.exe`;
  the manifest's InstallLocation is `...\Epic Games\Fortnite`, and that folder grew by exactly UEFN's size). The old
  `Fortnite_Studio` folder is a leftover. The editor then ran: about 10 GB resident, 3,321 game features loaded, the
  project templates registered (Basic, Verse, Samples), no fatal errors, listening on local ports 1962, 1963 and 23430.
  It was started in the user's session through the Epic Launcher URI
  `com.epicgames.launcher://apps/<namespace>:<item>:Fortnite_Studio?action=launch` from an interactive scheduled task.
- [tested] Port 8000, the UEFN MCP default, was already taken by an unrelated Python service on this machine, so
  expect to change the MCP port. The owner created the project and enabled settings in the GUI. Later MCP tests
  imported and saved FBX clips, placed devices and captured the editor; native Python authoring remains untested.
- [documented] Windows only; install Fortnite then UEFN through the Epic Games Launcher; an Epic account
  is required. Minimums: Win10 1909, 16 GB RAM, GTX 960-class GPU.
- [documented] Import: meshes (FBX, OBJ, glTF, GLB), textures (PNG, TGA, JPG and more), audio (WAV, AIF,
  FLAC, OGG). Skeletal meshes need a checkbox on import, and animations import as separate FBX files.
  Audio limits (rate, channels, length) were not found on an official page. No 2D sprite or atlas support
  was found: a sprite would be a texture on a mesh or a UI image.
- [documented] Automation: "Python Editor Scripting" is an early-preview project setting. An official
  UEFN MCP shipped in release 42.00 with Verse, Verse Scene Graph, Creative Devices and Sessions toolsets.
  [tested] The later discovered toolsets imported textures and FBX/OBJ meshes, but exposed no audio import or
  Sequencer authoring in the tested UEFN 42.30 configuration. A missing MCP operation is not an editor limitation.
- [documented] Budget: an area over 100,000 memory units cannot be published.
- [documented] Testing needs a running Fortnite client and an Epic sign-in; a cycle is about 3 to 6
  minutes. Publishing needs a rating questionnaire and moderation, and an adult account.
- Unknown: rules for AI-generated assets and for coding agents (the terms pages would not load).
- [general] Gameplay is Verse and Creative devices, not engine code. The owner's own design notes say true
  spherical gravity and custom vehicles are not expressible, which is an unverified reading of docs.

**Verdict**: a separate target, not standard Unreal with another path. It adds Fortnite distribution and
an official agent path. It costs platform lock-in and an unattended loop capped by sign-in and the client.
Next proof: one native Sequence around an already imported clip, exact reset controls, then Fortnite runtime
verification. Use native Python or an editor exemplar before introducing a second UE project solely for a missing
MCP tool. See the UEFN authoring reference linked directly from the engine-selection skill for evidence and limits.

## Godot 4.7

- [tested] One command installs it on Windows (`winget install GodotEngine.GodotEngine`, 4.7.2). The sample
  scene built headless in seconds (`--import`, then a `--script` builder) and ran in a window on Vulkan,
  Forward+, on the RTX 5090 (a window worked here, where Unreal's windowed D3D12 swap chain did not). A run
  to a screenshot and report takes about 12 seconds. No MCP server was used.
- [tested] The 48-skin fox imported as one `Skeleton3D` (19 bones), 48 `MeshInstance3D` and one
  `AnimationPlayer` with `walk` and `trot` under their original names. The clips import with no loop.
- [tested] WAVs import compressed (QOA) by default, so `data.size()` is not the PCM size: derive a loop end
  from `get_length() * mix_rate`. `AudioStreamRandomizer` took the manifest's variants, weights and
  `noRepeat` directly, but a script cannot see which variant it picked.
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

- [tested] Install: Unity Hub 3.22.0 through winget (an MSIX app under WindowsApps) and Editor 6000.3.25f1
  (7.8 GB) through the Hub's headless CLI (`Unity Hub.exe -- --headless editors -r`, `install-path -s`,
  `install --version`), to a user folder with no admin rights. The bundled `unity.exe` CLI is access-denied from
  the MSIX folder, so the `unity mcp` route is untested.
- [tested] Licence: before sign-in a headless launch exits 198 with "No valid Unity Editor license found" (no
  access token, 0 entitlements). After the owner signed in and activated Personal in the Hub, headless project
  creation, scene build, player build and a run all worked. The sign-in is the one step an agent cannot do.
- [tested] The sample scene builds from an Editor script (`-batchmode -executeMethod`) and a Windows player
  builds in about 15 seconds. glTFast 6.20.0 imports the 48-skin fox as 48 skinned renderers on 19 bones (merged)
  with `walk` and `trot` keeping their names, as a Mecanim Animator with **no controller**: play the clip through
  a `PlayableGraph` and loop it by wrapping the time.
- [tested] The default texture type rescales non-power-of-two sheets (256x40, 96x32) to a power of two, which
  squashes and blurs pixel art: set NPOT Scale to None. Unity is left-handed, so a camera on +Z looking at the
  origin shows +X on the left.
- [tested] No window could be presented in this session: a D3D12 player failed with 0x887A0022, D3D11 with
  "Switching to resolution failed", and Vulkan crashed in the player. The default Windows API list is D3D12 only,
  so `-force-vulkan` first needs Vulkan added. `-batchmode` without `-nographics` renders on the GPU with no
  window; capture by rendering the camera to a RenderTexture, not with `ScreenCapture`.
- [tested] The bed is looped with `AudioSource.loop` (set, and reported true while playing; the wrap itself was
  not observed), so the WAV's missing loop chunk does not matter. Unity has no randomizer component; a small
  picker built from the manifest made the chosen variant observable.
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

- [tested] Phaser 3.90.0 and three.js 0.186.1 builds of the sample scene ran in headless Chromium on the GPU
  (WebGL renderer: RTX 5090 through ANGLE D3D11) with no console errors; a page loads in about a second and a
  full verification pass takes about 12 seconds, with no install of an engine and no sign-in. Phaser loaded the
  agent-sprites atlas unchanged through its Aseprite loader. three.js kept the GLB's clip names. The
  agent-beeps player picked all 4 pickup variants with no immediate repeat.
- [documented] Phaser is a 2D HTML5 framework; agent-beeps ships a browser player.
- [documented] three.js describes itself as a 3D library. A vendor comparison says "it gives you a scene graph,
  cameras, lights, materials, geometry, loaders, and a renderer, and then it stops"; the wiki records "not a game
  engine" as an unsourced claim, likely true. three.js does ship basic Web Audio classes. agent-meshes ships a
  three.js viewer for its GLBs.
- [documented] Built on three.js: Needle Engine (its docs say all rendering goes through three.js and its
  components revolve around three's scene graph; Unity and Blender authoring, cloud hosting), and
  react-three-fiber (a React renderer producing the same three.js objects). A-Frame is also three.js-based
  [general]. Not tested here.
- [documented] Babylon.js (full engine, built-in Havok physics, free web editor) and PlayCanvas (engine
  with entity-component model and a hosted editor; engine MIT, editor proprietary). The comparing source
  is written by a web-engine vendor.
- [tested] three.js has no flipbook, entities or physics: the sprite animation, the walk-around and the trigger
  were written by hand. Its API moves (0.186 deprecated `THREE.Clock`), so pin the version.
- [general] Limits are browser performance and memory, and no native or console target.

## What to check first

Before committing to an engine for real work, run the [sample scene](../../../docs/sample-scene.md) in it.
It answers, in an hour, whether the GLB imports with its skin and clips, whether the atlas needs a
loader, whether the audio loops, and whether a screenshot can be taken with nobody present.
