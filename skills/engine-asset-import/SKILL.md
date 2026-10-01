---
name: engine-asset-import
description: Import agent-sprites atlases, agent-meshes GLB models and agent-beeps WAV exports into a Unity, Unreal or Godot project, using the known per-engine traps and stating exactly what has been verified.
when_to_use: Use when bringing a sprite atlas, GLB, WAV or song export into a Unity, Unreal or Godot project; when an imported model is missing bones, morphs or meshes, or its clips have different names; when a sprite sheet imports with wrong frames, tags or pivot; or when asked whether an asset "works in" an engine.
---

# Importing plugin assets into a game engine

The three asset plugins export plain files. The engines import them with their own importers, and
that is where things go wrong quietly. This skill lists the traps that are known, and keeps a
strict line between what was verified and what was only read in documentation.

## Before you claim anything

- Say what you checked: "imports into UE 5.7 via Interchange with names intact", not "works in
  Unreal". Nothing below has been rendered, animated or played in an engine yet.
- Unity and Godot: **nothing is verified**. Everything said about them is from the exporting
  plugins' documentation. Say so, and run the import to find out.
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
- Interchange builds one SkeletalMesh and Skeleton per skin, unless the skins share joint nodes.

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
- Godot follows loop metadata inside a WAV by default; Unity was not checked. Set the loop mode
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

## Engine status

| Engine | Verified | Not verified |
|---|---|---|
| Unreal 5.7.3 | Import of fox, courier, campfire and audio; a clean Play-In-Editor run; a screenshot read by eye; music bed reports playing | Audio by ear, pickup variant picking, any automated pixel check |
| Godot 4.7.2 | Nothing (installed, nothing imported) | Everything |
| Unity | Nothing | Everything |
| UEFN | Nothing | Everything; needs an owner sign-in |
| Web: three.js, Phaser | Import, animation advance, audio start and variant picking, a clean console, a screenshot read by eye, on the GPU in headless Chromium | Audio by ear; the bed looping end to end |

To choose between these, use the `engine-selection` skill.

## After importing

Import, then check, then report. If the engine's own MCP server is connected, use it to list the
imported assets and read the engine log; if it is not, say which checks you could not run. The
[sample scene](../../docs/sample-scene.md) defines the checks this plugin is aiming for.
