# UEFN authoring beyond MCP

Use this when UEFN MCP lacks an operation, animation controls need exact Reset,
audio needs importing, or the owner proposes authoring in regular Unreal and porting.
Evidence checked 2026-10-01, UEFN 42.30 and UE 5.8.3. Re-discover capabilities after upgrades.

## Choose the smallest working route

Keep a Fortnite project's playable scene, devices and Verse behavior authoritative in
UEFN. Use available MCP tools; for missing operations, try native editor Python or
ordinary editor actions. Regular UE is an optional asset workshop. This ordering is
a recommendation from the museum exercise, not a requirement to reject other workflows.

| Route | Time | Risk | Complexity | Architectural fit | Maintenance |
|---|---|---|---|---|---|
| UEFN MCP plus a small native Python script | One probe, then repeatable batch work | Preview API/validation uncertainty | Low–moderate | Target owns bindings and behavior | One project script |
| Native UEFN editor exemplar | Fast for a few operations | Repeated manual edits | Low initially | Direct target authoring | Document recipe; automate repetition |
| Selective UE asset authoring and migration | Setup and compatibility proof | Versions, dependencies, actor bindings | Moderate | Separate asset workshop | Second project and upgrade checks |
| Whole museum in UE, then port | Most adaptation work | Unsupported assets/gameplay | High | Two scene representations | Ongoing conversion work |

## Capability discovery: do not confuse transport with editor support

**Tested locally:** UEFN exposes MCP wrappers `list_toolsets`, `describe_toolset`
and `call_tool`. Discover the live schemas; regular UE tool names and argument
shapes are not a UEFN contract. With AllToolsets mounted in the tested 42.30 build,
Sequencer and Sequencer Keyframing toolsets were absent. Audio import was also
absent. Do not send the owner searching for an unverified toggle after this check.

The MCP script sandbox allowed `json`, `re`, `math`, `copy`, `time`, `datetime`
and registered tools; it could not import `unreal`. Do not treat native Python
documentation as permission to bypass that sandbox. Native editor Python is a
separate, Epic-documented entrypoint.

**Documented, not yet executed locally:** [UEFN Python](https://dev.epicgames.com/documentation/en-us/fortnite/python-tools-in-uefn)
supports imports, scene automation and remote execution in early preview. It links
[Unreal Python execution](https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python),
which describes File > Execute Python Script and Output Log Cmd mode:

```text
py "C:/path/to/project_script.py"
```

Preflight required APIs and the active project before edits. UEFN validation can
reject Python-created content; restrict changes to project assets and properties
available in its UI. A successful Python call is not validation or runtime proof.
Epic's `PythonScriptPlugin/Content/Python/remote_execution.py` was found in the
installed UEFN, but a shipped client is not evidence remote execution is enabled.
Use one normal editor execution before investing in transport setup. If a manual
step is needed, first prepare the exact script and expected result for the owner.

## Animation: preserve the actual control requirement

**Tested locally:** Animated Mesh devices expose Play, Pause and Reverse; the
read-only playback properties do not provide a writable seek/reset. Reverse is
not exact Reset. Three imported skeletal clips read back as eight seconds,
240 frames and 241 sampled keys at 30 fps. This establishes import, not playback.

**Documented route, local proof pending:** author a native Level Sequence with
a skeletal animation track and use a Cinematic Sequence device. Generic
[Sequencer Python examples](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-scripting-in-sequencer-in-unreal-engine)
show `LevelSequenceFactoryNew`, actor bindings and animation sections. Preflight
these APIs in the installed UEFN; do not advertise an unexecuted snippet as a recipe.
The [device API](https://dev.epicgames.com/documentation/en-us/fortnite/verse-api/fortnitedotcom/devices/cinematic_sequence_device)
includes `SetPlaybackFrame` and `SetPlaybackTime`.

Pause plus SetPlaybackFrame(0) is a reset **candidate**. Verify immediate visible
frame-zero pose, paused state and forward resumption from mid-clip, paused and
completed states. Keep camera tracks out of exhibit-only sequences. Verify shared
visibility and late joining in Fortnite; inspect completion state and device
cost before multiplying devices. [Cinematic device guidance](https://dev.epicgames.com/documentation/en-us/fortnite/using-cinematic-sequence-device-in-unreal-editor-for-fortnite).

For naturally rigid prop motion, Verse
[animation_controller.Stop](https://dev.epicgames.com/documentation/en-us/fortnite/verse-api/fortnitedotcom/devices/creativeanimation/animation_controller)
documents resetting animation and prop transform. It does not replace skeletal
bone animation; rebuilding an existing skeleton as props adds work.

## Audio: import rendered files directly

Agent Beeps supplies rendered WAVs; its browser synth is not the Fortnite audio
runtime. [Native UEFN import](https://dev.epicgames.com/documentation/en-us/fortnite/importing-custom-audio-in-unreal-editor-for-fortnite)
supports WAV through Import or Content Browser drag/drop. Use Sound Wave/Sound Cue
and Audio Player as appropriate; verify looping and volume in the target session.
Native Python `AssetImportTask` is a candidate batch route, untested here in UEFN.
Auto Reimport did not create WAV assets in the earlier local test; repeating it
or introducing a second UE project is not a necessary prerequisite for audio.
For an initial score, one auditioned loop is enough to prove delivery. Stems and
adaptive scheduling should follow a musical or gameplay need.

## Selective UE migration

[Epic supports UE-to-UEFN asset migration](https://dev.epicgames.com/documentation/fortnite/migrating-assets-from-unreal-engine-to-unreal-editor-for-fortnite?lang=en-US),
with supported same/newer destination versions. Migration copies dependencies;
it does **not** validate compatibility. Unsupported assets may block playtesting.
This is not a guarantee that a UE map or Blueprint gameplay ports wholesale.

Use one isolated asset/sequence as the proof, inspect its dependencies, and choose
the actual destination project's Content folder. Discover the live mount rather
than assuming `/Game` or the project's display name. Sequence possessables may
need actor/component rebinding in the destination; verify their references and
scrub after migration. Do not assume custom bindings or director events transfer.
Keep original FBX/WAV sources as recovery paths. A successful copy or forward-looking
version number alone does not prove compatible serialization or Fortnite support.

## Tested operational traps

- Verify the active level and project mount before each connection's first edit.
  The museum used a UUID mount; a previous island's paths were not reusable.
- Import responses may list only the mesh. Query the destination registry for
  skeleton, materials and clips, read duration/frame counts, then save explicitly.
  The tested asset save tool treats an empty asset list as **save all dirty assets**;
  reject an empty list when intending a scoped save.
- Property updates may partly succeed before reporting an error. Read back before
  retrying. Use stable labels/IDs; repeated placement should update, not duplicate.
- Set Blender's frame rate before importing GLB, and choose a rate that aligns
  clip lengths to whole frames. Thirty fps solved the tested clips; it is not a
  universal magic rate. Verify transforms, scale and text-facing in a capture.
- `CaptureViewport` returned an MCP image content block; its JSON image URN was
  not the PNG. Inspect the response rather than decoding the URN as base64.
- A session launch exceeded the HTTP timeout and continued cooking. Poll session
  status before retrying. Validation/upload then a transport disconnect does not
  establish runtime success and is separate from the authoring transport.

## Bounded proof and reporting

Reuse one imported clip and actor. Create, save and reopen one sequence; inspect
start/middle/end poses. Configure controls and optionally import an existing short
WAV independently. If Python fails, record the exact failure and use one native
editor exemplar. Try UE staging when native authoring fails or repeated work
justifies its cost. Stop broad workflow research after a reproducible validated
authoring path exists; keep runtime acceptance open until observed in Fortnite.

Report separately: files exported, assets imported/saved, editor appearance,
validation, runtime behavior and owner audio audition. The museum exercise had
verified the first three, passed upload validation, and then lost its session;
reset, audio and multiplayer behavior were still unverified at this reference's date.
