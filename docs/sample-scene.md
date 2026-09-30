# Sample scene

One scene, built from assets made with the other plugins, that every engine has to pass. It is the
integration test for this plugin's skills: an agent following them should be able to rebuild the
scene in Unity, Unreal and Godot and pass the same checks. It is a spec and a checklist, not a file
format. The first pass reuses existing assets, so it tests the glue and not the art.

## Assets

| Role | Asset | Checked |
|---|---|---|
| 3D character | `vulpine/model.glb` from the agent-meshes creature gallery (a fox) | GLB: 48 skins sharing 19 joints, clips `walk` and `trot`, no morphs. UE 5.7.3 import: one SkeletalMesh, one Skeleton, 2 animations, 48 material instances, no errors. |
| 2D character | `character-walk/dist/courier.atlas.json` from the agent-sprites examples | 12 frames, tag `walk` (frames 4 to 7, forward), a `pivot` slice. |
| 2D effect (optional) | `blink/dist/blink.atlas.json` from the agent-sprites examples | 8 frames, tag `blink` (frames 2 to 5, forward), a `pivot` slice. |
| Music bed | a song from agent-beeps `library/songs/` | Songs are definitions, not audio. Render with `beeps song export`. Track not chosen. |
| One-shot sound | an agent-beeps sound exported with variants and a manifest | Not chosen or rendered. |

A flame billboard was considered and dropped: the sprite examples contain no fire asset.

## Scene

A small clearing. The fox plays `walk` and `trot`. The courier billboard plays `walk` beside it.
The music bed loops. The one-shot plays on a trigger and picks among its variants. A fixed camera
frames the fox and the courier together. Layout, lighting and trigger are left open; the checks do
not depend on them.

## Checks, strongest first

1. **Import.** Assets arrive with bone names, clip names, atlas tags, durations, pivot and variant
   count intact. Clip names may gain a prefix (see the skill).
2. **Clean run.** The scene loads and plays for a fixed time with no errors in the engine log.
3. **Screenshot.** A fixed-camera shot shows the fox and the courier present and non-blank.
   Engines will differ in lighting and shading, so compare roughly, not pixel for pixel. The exact
   test is not designed yet.
4. **Audio state.** The source exists, plays, loops where it should, and has the right variant
   count. Loudness is measured upstream by agent-beeps, so only "plays without error" is claimed in
   the engine.

## Status

| Engine | Verified |
|---|---|
| Unreal 5.7.3 | Fox import only (check 1, mesh). Nothing rendered or played. |
| Unity | Nothing. |
| Godot | Nothing. |

## Open

- Choose and render the song and the one-shot.
- Design the screenshot check.
- Survey and choose the MCP server for each engine.
