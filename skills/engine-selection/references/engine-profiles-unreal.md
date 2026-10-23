# Engine profiles: Unreal Engine and UEFN

Index: [engine-profiles.md](engine-profiles.md).

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
  imports are not saved, FBX clips need frame-aligned lengths); see the `unreal-import` skill (agent-unreal).
- [tested] A separate Unreal 5.8.2 native C++ game compiled with VS2022, generated materials/fonts through full Editor Python,
  ran source-built procedural cars/track with Chaos primitive bodies in `-game -RenderOffScreen`, and delivered real
  1920×1080 game-camera PNGs. A failed automation test still exited zero, so the loop parses fresh JSON. See
  the native game recipe (`unreal-native` skill, agent-unreal) for exact versions and limits.
- [tested] The same 5.8.2 project built a native Game EXE, cooked/staged with native engine tools and actually ran packaged
  title/race/jump frames. A separate content-only asset bake also succeeded when host policy refused its Editor module.
  See packaging (`unreal-native` skill, agent-unreal) and
  content construction (`unreal-native` skill, agent-unreal); visual acceptance remained GAP.

**Import** ([tested] unless noted)
- [general] GLB and PNG: `InterchangeManager.import_asset` with `is_automated = True`. Do not use
  `AssetTools.import_asset_tasks` for glTF in a commandlet: it asserts on a missing Slate application.
- [general] WAV is not an Interchange format in 5.7. `AssetTools.import_asset_tasks` works for it headless.
- [general] Names change: `relic-discovered.0.wav` became `relic-discovered_0`; GLB clips `walk` and `trot` became
  `foxwalk` and `foxtrot`.
- [general] A GLB with 48 skins sharing the same 19 joint nodes merged into one SkeletalMesh.
- [general] Sprites need the Paper2D plugin. Pivots are in **sheet pixels**, not relative to the frame, so add the
  frame origin or frames jump sideways. Paper2D sprites lie in the XZ plane: rotate to face the camera.
- [general] The atlas `frames` array holds raw cells, tag frames and named cells together; the tag's `from`/`to`
  index into that array, so frame index is not cell index.

**Traps**
- [general] `-ExecutePythonScript` quits the editor when the script ends and is refused in `-game`. Use
  `-ExecCmds="py <file>"` and register a tick callback.
- [general] Git Bash rewrites an argument like `/Game/Maps/X` into a Windows path. Set `MSYS_NO_PATHCONV=1`.
- [general] Python arguments differ from C++: `Rotator(roll, pitch, yaw)`, `Color(r=, g=, b=)` (positional order
  gave a blue light), some properties are not exposed (`initial_texture`).
- [documented] A community RebuildLightmaps recipe reports a Perforce dependency. Do not generalize that to UnrealBuildTool:
  the native C++ `Build.bat` module compile above completed without a Perforce workflow. Native cook/package evidence is tracked
  separately in the linked recipe.

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
  imported and saved FBX clips, placed devices and captured the editor. UEFN 42.30 also executed project-local
  startup and Epic's native remote Python client: a saved Level Sequence resolved its bindings and evaluated
  moving bone poses in the editor. Fortnite runtime remains unverified.
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
- [tested] Native Python SoundFactory/AssetImportTask imported five approved 72-second stereo 48 kHz PCM16
  WAVs and saved five Waves plus five direct looping Cues in 42.30. These formats are tested inputs, not universal
  limits. Personal Audio Player settings/bindings were read back, but the client stayed in Sleep Mode and the
  launch ended without a connected game client. Audible playback, loops and multiplayer remain unverified.
- [documented] Budget: an area over 100,000 memory units cannot be published.
- [documented] Testing needs a running Fortnite client and an Epic sign-in; a cycle is about 3 to 6
  minutes. Publishing needs a rating questionnaire and moderation, and an adult account.
- [general] Unknown: rules for AI-generated assets and for coding agents (the terms pages would not load).
- [general] Gameplay is Verse and Creative devices, not engine code. The owner's own design notes say true
  spherical gravity and custom vehicles are not expressible, which is an unverified reading of docs.

**Verdict**: a separate target, not standard Unreal with another path. It adds Fortnite distribution and
an official agent path. It costs platform lock-in and an unattended loop capped by sign-in and the client.
Next proof: wire exact reset controls around the saved native Sequence, then verify Fortnite runtime.
Use native Python or an editor exemplar before introducing a second UE project solely for a missing
MCP tool. See the UEFN authoring reference linked directly from the engine-selection skill for evidence and limits.
