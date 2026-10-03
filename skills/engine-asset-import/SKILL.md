---
name: engine-asset-import
description: Import agent-sprites atlases, agent-meshes GLB models and agent-beeps WAV exports into a Unity, Unreal, UEFN or Godot project, using the known per-engine traps and stating exactly what has been verified.
when_to_use: Use when bringing a sprite atlas, GLB, WAV or song export into a Unity, Unreal, UEFN or Godot project, by script or through an engine's MCP server; when an imported model is missing bones, morphs, meshes or animation clips, or its clips have different names; when an Unreal import splits one model into many meshes or leaves nothing on disk; when a sprite sheet imports with wrong frames, tags or pivot; or when asked whether an asset "works in" an engine.
---

# Importing plugin assets into a game engine

The three asset plugins export plain files. The engines import them with their own importers, and
that is where things go wrong quietly. This skill lists the traps that are known, and keeps a
strict line between what was verified and what was only read in documentation.

## Before you claim anything

- Say what you checked: "imports into UE 5.7 via Interchange with names intact", not "works in
  Unreal". Sections marked "tested" were run in the sample scene; the rest is documentation.
- Unity: sections marked "tested" were run in the sample scene; the rest of what is said about it is vendor
  documentation. Say which is which.
- Check what the engine reports, not only the cause the tool states. A failure message can blame
  the wrong thing (a wrong expected bone name was reported as a skin problem).

## Meshes (agent-meshes GLB)

Verified on Unreal 5.7.3 through Interchange, import only:

- A GLB whose 48 mesh parts each had their own skin, all listing the same 19 joint nodes, imported
  as one SkeletalMesh with one Skeleton, 19 bones, 2 animation sequences, 48 material instances and
  no errors.
- Clips `walk` and `trot` from `fox.glb` arrived named `foxwalk` and `foxtrot`. Look clips up by
  suffix, or list them after import.
- Check an Unreal import with agent-meshes `verify-unreal` (see its `mesh-build` skill). It needs
  an installed engine (`AGENT_MESHES_UNREAL`, or a launcher install) and fails with
  `UNREAL_NOT_FOUND` otherwise. Say so instead of claiming Unreal support.

Documented by agent-meshes, not re-verified here:

- In a GLB that has a skin, Interchange silently drops mesh nodes with no skin, no morphs and no
  skin joint above them. Bind every mesh to the skin.
- Unreal keeps morph target names only if every name is unique across all meshes in the file.
  Otherwise all are renamed `<file>_mesh_<m>_<i>_MorphTarget`. Put all morph-bearing parts in one
  mesh, one primitive per material.
- Unreal drops a morph that moves no vertex used by a triangle.
- Interchange builds one SkeletalMesh and Skeleton per skin, unless the skins share joint nodes. (On 5.8.3 the
  default stack split a GLB whose skins share joints into one mesh per skin anyway; see "Unreal 5.8.3" below.)

From vendor documentation, not tested here:

- Unity has no native glTF import. The `com.unity.cloud.gltfast` package registers as the default
  importer for `.gltf` and `.glb`. Copy the companion `.bin` and image files too, with their names
  unchanged. Install the package first; do not assume a new project has it.
- Godot imports glTF 2.0 natively (`.glb` and `.gltf`) and recommends it. Copy the scene and its
  textures into the project and the editor imports on focus. `godot --headless --import` imports
  without a window.

## Sprites (agent-sprites atlas)

Documented by agent-sprites, not verified here:

- Export is a sheet PNG plus `<name>.atlas.json` in Aseprite JSON form. Frame tags, per-frame
  durations and a `pivot` slice come from the project.
- agent-sprites says Unity and Godot importers read this directly. **Vendor documentation does not
  support that.** Unity's 2D Aseprite Importer imports `.ase` and `.aseprite` files, and its pages
  never mention a sheet plus JSON. The Godot Aseprite Wizard also takes Aseprite source files: it
  runs the Aseprite program to produce a sheet and JSON, then reads that. Godot has no built-in
  sprite-sheet importer. Nothing has been tested here, and third-party importers were not searched.
  Plan on a small loader per engine that builds clips from the atlas, and check tag names, frame
  counts, durations and where the pivot lands.
- A trimmed atlas (`--trim true`) packs each cell as its opaque box with real `spriteSourceSize`
  offsets. Draw each frame at that offset inside the cell.
- Only importers that honor the tag `direction` play reverse and ping-pong tags correctly.

## Audio (agent-beeps WAV)

Documented by agent-beeps, not verified here:

- Engines receive rendered WAVs. The synth and the game player runtime are browser-only, so seeded
  live variation is not available in an engine.
- The library holds patch and song definitions, not audio. Render first: `beeps export <patch>
  --variants <n> --manifest` writes `<name>.<i>.wav` and one sidecar. `beeps song export <name>
  --layers <dir> --manifest` writes one WAV per layer.
- Variant weights and `noRepeat` live in the sidecar. The engine must reimplement the picking to
  repeat as the audition page does.
- Priority follows the FMOD convention: 1 is most important, 5 least. Songs are trimmed to a
  project loudness, -20 LUFS integrated by default.
- Godot follows loop metadata inside a WAV by default; Unity loops through `AudioSource.loop` and ignores it. Set the loop mode
  explicitly and confirm it after import.
- You cannot hear the result. In an engine, claim only that the source exists, plays, loops where
  it should, and logs no errors.

## Unreal 5.7: sprites, audio and running it (tested)

Built and run in the [sample scene](../../docs/sample-scene.md); scripts in `examples/unreal`.

- Import GLB and PNG with `InterchangeManager.import_asset` and `is_automated = True`. glTF through
  `AssetTools.import_asset_tasks` in a commandlet crashes on a missing Slate application. WAV is not an
  Interchange format: use `AssetTools` for it.
- Names change on import: `relic-discovered.0.wav` becomes `relic-discovered_0`.
- Sprites need the Paper2D plugin. Its pivots are in **sheet pixels**: set the pivot to the frame's x and y
  plus the atlas pivot, or every frame but the first is drawn displaced.
- Paper2D sprites lie in the XZ plane. Yaw them to face the camera, or they render edge-on and look missing.
- The atlas `frames` array holds raw cells, each tag's frames and named cells together. Follow the tag's
  `from` and `to` into it; frame index is not cell index, and durations differ between the copies.
- The music manifest says `loop: true` but the WAV has no loop metadata. Set looping on the imported asset.
- Run with `UnrealEditor -RenderOffScreen -ExecCmds="py script.py"`. `-ExecutePythonScript` quits the editor
  when the script ends and is refused in `-game`. In Git Bash set `MSYS_NO_PATHCONV=1`.
- Take a screenshot. Wrong rotation order, scale, facing and pivots only showed up there.

## Unreal 5.8.3 (tested)

The same scripts from `examples/unreal` pass on 5.8.3 (fox animating, music bed playing, both flipbooks advancing,
screenshot read by eye) after three changes. Each failed quietly on the first try.

- **The fox split into 48 meshes.** The same `InterchangeManager.import_asset` call that gave one `fox` mesh on
  5.7.3 gave 48 skeletal meshes, 48 physics assets and one shared skeleton, so "the first SkeletalMesh" was
  `back_mantle`. Pass a saved pipeline asset with `combine_skeletal_meshes_behavior = BY_SKELETON` through
  `ImportAssetParameters.override_pipelines`, and pick the mesh by name. Python cannot pass a pipeline object there:
  it takes soft asset paths, so create the pipeline with `AssetTools.create_asset`, save it, and pass its path.
  The enum has `BY_SKELETON`, `BY_SKELETON_VISIBLE_ONLY` and `DO_NOT_COMBINE`.
- **An automated import no longer saves its assets.** On 5.7.3 the files were on disk afterwards; on 5.8.3 they stayed
  in memory, so the saved map referenced nothing. The build step still reported the fox placed, and only the rendered
  run showed an empty scene. Call `EditorAssetLibrary.save_directory(dest, only_if_is_dirty=False, recursive=True)`
  after each import, and check what the render shows, not what the build claims.
- **FBX clips need whole-frame lengths.** See the next section.

## FBX into Unreal and UEFN: clips need frame-aligned lengths (tested)

Tested on Unreal 5.8.3 and UEFN 42.20. A mesh import tool that only takes FBX (see the next section) means a GLB
has to be converted first, and the clips can vanish in the conversion.

- Symptom: the mesh, skeleton and materials import, no AnimSequence appears with `import_animations` true, and the
  tool reports success. The only trace is an error in the editor log: "Animation length 0.8 is not compatible with
  import frame-rate 24 fps ... frame-border aligned if the 'Snap to Closest Frame Boundary' pipeline option is
  disabled". The FBX does contain the clips; check its animation stacks before blaming the file.
- Fix at the source (works through the MCP tool): export at a rate where each clip is a whole number of frames.
  The fox's 0.8 s and 1.2 s clips are exact at 30 fps and not at 24. In Blender set `scene.render.fps = 30`
  **before** the glTF import: the importer turns seconds into frames at the current rate, and changing it afterwards
  keeps the old frame numbers and shrinks every clip (0.8 s became 0.64 s). `examples/uefn/glb_to_fbx.py` does this.
  After it, the default import and Epic's MCP `import_file` both produced the mesh, skeleton and two clips.
- Fix in the engine (needs a pipeline asset, so not available through the MCP tool): set the animation pipeline's
  `frame_alignment` to `SNAP_TO_FLOOR`, `SNAP_TO_CLOSEST` or `SNAP_TO_CEILING`; all three imported both clips.
- Clip names differ by route: Interchange from the GLB gave `foxwalk`; the MCP tool from the FBX gave
  `Fox_Anim_Ember_fox_walk`. List the clips after import and look them up by suffix.
- Blender from the Microsoft Store cannot be run from its folder under `WindowsApps` (access denied). Run
  `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe` as an interactive task in the owner's session; it
  swallows Blender's console output, so check that the output file was rewritten. A leftover Blender process stalls
  the next launch.

## Epic's MCP server on Unreal 5.8.3 and UEFN (tested)

Epic's `ModelContextProtocol` plugin (Experimental, off by default) ships with 5.8 and is the same plugin family UEFN
uses. Tested 2026-10-01; details and sources are in the project wiki.

- Enable `ModelContextProtocol`, `ToolsetRegistry`, `EditorToolset` and `AllToolsets` in the `.uproject`. Launch with
  `-RenderOffScreen -unattended -ModelContextProtocolStartServer -ModelContextProtocolPort=<port>`; the server
  answered about 30 seconds later with no click. The default port is 8000, which may be taken. In UEFN the port is
  the `ServerPortNumber` setting, command-line arguments are discarded, and the server must be started by hand after
  each launch.
- Only `list_toolsets`, `describe_toolset` and `call_tool` are listed; the toolsets are reached through `call_tool`
  with a toolset name and a tool name.
- It did: import textures; import FBX and OBJ meshes; spawn an actor from an asset; capture the viewport as a PNG
  (inspect the response: UEFN returned a separate image content block and a JSON URN, not JSON image bytes;
  pass an explicit camera pose, because `FocusOnActors` can park the camera
  kilometres away). It did not: import audio (no tool in either toolset list), accept a GLB ("FbxFactory does not
  support .glb. Allowed: fbx, obj."), or run Python with the `unreal` module (the script tool allows only `json`,
  `re`, `math`, `copy`, `time`, `datetime`).
- Argument shapes differ from UEFN's on 5.8.3: `find_assets` needs `name` (empty string for all),
  `add_to_scene_from_asset` needs an `xform`, and `CaptureViewport` needs both `captureTransform` and `annotations`.
- Pair it with the headless Python route above for GLB and audio. Epic's 20 built-in agent skills are domain guidance
  (PCG, Niagara, editor, Dataflow); none covers import.

## UEFN 42.20 (partly tested)

For missing MCP tools, native Python/Sequencer, exact Reset, audio or UE-to-UEFN
migration, read [UEFN authoring beyond MCP](references/uefn-authoring.md). It includes
tested 42.30 project startup, native remote Python and Sequence authoring, plus runtime limits.

For rendered WAVs, read [native UEFN audio import](references/uefn-native-audio.md)
before recommending manual import. The tested 42.30 route uses SoundFactory,
guarded source/destination checks, direct looping Wave Players and scoped saves;
editor import does not establish audible Fortnite playback.

For scoped native actor saves, typed Verse references, compact buttons or editor/client
screenshots, read [UEFN saved controls and capture](references/uefn-native-operations.md).
It separates saved assets, server controller tests and physical interaction evidence.

For fitted exhibit cover following bones, hidden comparison blockers or misplaced
proxies after animation-property edits, read [moving exhibit cover](references/uefn-native-cover.md).
Verify against original source geometry as well as the colliders' own faces;
editor queries alone do not establish Fortnite player or weapon cover.

For mirrored native FBX architecture, reversed glyphs or missing UCX/deck collision,
read [UEFN FBX coordinates and collision](references/uefn-native-fbx.md) before
reimporting or transforming the whole scene.

- Tested through the MCP server in a real project: textures import; the fox imports as a skeletal mesh with a
  skeleton and 48 materials from the converted FBX. The 30 fps fix was re-run: both clips were saved and verified
  through registry duration/frame counts. An Animated Mesh device renders it in the editor; runtime is unverified.
- Audio: no MCP import tool in the tested configuration. Auto Reimport created nothing from dropped WAVs across
  two 42.20 restarts. Native Python imported and saved five Wave/Cue pairs in 42.30; use the audio reference above.
  Content Browser Import remains a fallback. Audible playback and a full UEFN sample-scene pass remain unverified.
- Documented versus tested: Epic's pages say GLB and glTF import in the editor; the MCP mesh tool accepts only FBX
  and OBJ. Say which one you mean.

## Web: Phaser and three.js (tested)

Built in the sample scene; pages and verifier in `examples/web`.

- Phaser loads the agent-sprites atlas unchanged: `load.aseprite(key, png, json)` then `anims.createFromAseprite(key)`.
  It followed the tag into the mixed frames array (the campfire's texture frames were "8" to "15") and kept the
  100 ms and 125 ms durations. Phaser ignores the pivot slice: set the origin by hand (pivot over cell size).
- three.js has no flipbook. Cut frames from the atlas with texture `offset` and `repeat`, follow the tag range, and
  use `Sprite.center` for the pivot. `GLTFLoader` kept the clip names (`walk`, `trot`), where Unreal prefixed them.
- Pin three.js: 0.186 deprecated `THREE.Clock` for `THREE.Timer`.
- Audio: the vendored agent-beeps player (`beeps player export`, `beeps bundle`). `unlock()` needs a real
  gesture. `play()` returns a handle whose `file` is the chosen variant, so variants are checkable; it honours
  `noRepeat`. It has an 8-voice budget and returns null when a burst exceeds it, which is correct behaviour,
  not a failure.
- Headless Chromium with `--use-angle=d3d11 --ignore-gpu-blocklist` rendered on the RTX 5090 (the WebGL renderer
  string says so); check that string, since software rendering is the silent fallback.

## Godot 4.7 (tested)

Built and run in the sample scene; scripts in `examples/godot`.

- `godot --headless --path <project> --import` imports the GLB, PNGs and WAVs; a `--script` builder then
  writes the scene. Use the `_console` executable to see output; pass your own arguments after `--`.
- The fox's 48 skins became one `Skeleton3D` (19 bones) with 48 meshes and one `AnimationPlayer`; `walk` and
  `trot` kept their names but import with **no loop**. Set `LOOP_LINEAR` on the animation.
- There is no sprite-sheet importer. Build `SpriteFrames` from the atlas: follow the tag into the frames array,
  make one `AtlasTexture` per frame, set the animation speed from the first duration and each frame's duration
  as a multiplier. For an `AnimatedSprite3D`, put the pivot at the origin with
  `offset = (cell_w / 2 - pivot_x, pivot_y - cell_h / 2)`.
- The music WAV has no loop chunk, so set `LOOP_FORWARD` yourself. Godot imports WAV compressed by default, so
  compute `loop_end` as `get_length() * mix_rate`; `data.size()` gave about a fifth of the right figure.
- `AudioStreamRandomizer` can consume the manifest's variants, weights and `noRepeat`. A script cannot read
  which variant it chose, so the variant sequence is not checkable the way it is on the web.
- `Camera3D.look_at()` does nothing before the node is in the tree. Set the rotation.
- A scripted quit prints "ObjectDB instances leaked" and "resources still in use" lines. They are exit
  notices, not run errors; a naive error grep trips on them.

## Unity 6.3 (tested)

Built and run in the sample scene; scripts in `examples/unity`.

- Unity needs an owner sign-in and licence before any headless launch works: unlicensed it exits 198 with "No valid
  Unity Editor license found". After that, `-batchmode -executeMethod` builds the scene and a player.
- GLB needs the `com.unity.cloud.gltfast` package (6.20.0 resolved from the registry; pin it). The 48-skin fox became
  48 skinned renderers on 19 bones with `walk` and `trot` named intact, as an `Animator` with no controller and
  non-legacy clips. Play the clip through a `PlayableGraph` and loop it by wrapping the time.
- Unity's Aseprite importer takes `.aseprite` files, so cut the atlas yourself: follow the tag into the frames array,
  flip the rect's y (Unity textures start at the bottom left), normalise the pivot from the bottom left, and use
  `Sprite.Create`. Set the texture's NPOT Scale to None, or the default rescales a 256x40 sheet to a power of two
  and squashes and blurs it.
- Unity is left-handed: a camera on +Z looking at the origin mirrors +X to the left.
- The audio manifest needs a small picker; Unity has no randomizer component. Loop the bed with `AudioSource.loop`
  (verified set and playing; the wrap itself was not observed).
- The default Windows graphics API list is D3D12 only. In the tested session no window could be presented (D3D12
  and D3D11 failed, Vulkan crashed in the player), so run the player with `-batchmode` (not `-nographics`) and
  render the camera to a `RenderTexture` for the screenshot. Hook `Application.logMessageReceived` to count real
  errors instead of grepping the log.

## Engine status

| Engine | Verified | Not verified |
|---|---|---|
| Unreal 5.7.3 | Import of fox, courier, campfire and audio; a clean Play-In-Editor run; a screenshot read by eye; music bed reports playing | Audio by ear, pickup variant picking, any automated pixel check |
| Unreal 5.8.3 | The same scene after three fixes: import, a clean rendered run, fox animating, music bed reporting playing, a screenshot read by eye; Epic's MCP server started headless, imported textures and an FBX, spawned an actor and returned a screenshot | Audio by ear, pickup variant picking, an automated pixel check, MCP audio or GLB import (none exists) |
| Godot 4.7.2 | Import, headless build, a windowed GPU run, animations and music reporting playing, a loop set from the stream length, a screenshot read by eye | Audio by ear, the chosen pickup variant, the bed looping end to end |
| Unity 6000.3.25f1 | Licensed headless build and run, a D3D12 batchmode player on the GPU, animations and loop, 12 pickups with no repeat, zero log errors, a screenshot read by eye | Audio by ear, the bed looping end to end, the Unity CLI and MCP route |
| UEFN 42.20 / 42.30 | MCP imports and saved clips; gallery captures; native Python/Sequence authoring; scoped actor saves; Fortnite startup on 12 timelines and 156 controller-method results, including reset and held-frame resume | Physical button use, rendered reset poses, completed-clip reset, audio playback, multiplayer and memory/performance budget |
| Web: three.js, Phaser | Import, animation advance, audio start and variant picking, a clean console, a screenshot read by eye, on the GPU in headless Chromium | Audio by ear; the bed looping end to end |

To choose between these, use the `engine-selection` skill.

## After importing

Import, then check, then report. If the engine's own MCP server is connected, use it to list the
imported assets and read the engine log; if it is not, say which checks you could not run. The
[sample scene](../../docs/sample-scene.md) defines the checks this plugin is aiming for.
