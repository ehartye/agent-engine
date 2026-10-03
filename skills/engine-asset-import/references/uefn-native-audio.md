# Native UEFN audio import

Read this when a UEFN project needs rendered WAVs but MCP exposes no audio importer.
Native editor Python is a separate route from the MCP script sandbox. A missing
MCP operation does not require manual dragging or a second Unreal project.

## Evidence and limits

**Tested on 2026-10-03:** UEFN 42.30, engine
`6.0.0-58557680+++Fortnite+Release-42.30`, imported five approved museum masters
into five Sound Waves and five direct looping Sound Cues. Sources were stereo
48 kHz PCM16, each 72 seconds. Those are tested inputs, not universal format limits.
Exact source hashes, editor metadata, Cue graphs, explicit scoped saves, clean
package state and ten disk package hashes were independently checked. Assets
shipped through Git LFS in [museum PR #10](https://github.com/ehartye/art_explorers_fn/pull/10).

**Playback preparation:** [museum PR #11](https://github.com/ehartye/art_explorers_fn/pull/11)
adds compiled personal gallery selection, five Audio Players, two mute controls
and seven preserved typed bindings. Independent settings/reference readback and
eight scoped actor saves passed. The single launch reached server cook completion,
then the server shut down because no game clients connected while Fortnite stayed
in Sleep Mode. The 38 runtime policy checks have not executed. This is not evidence
of a playback failure, audible success or a complete UEFN sample-scene pass.

Still open: disk reload, client launch completion, actual listening, seamless
repeats, gallery levels/transitions, physical mute and multiplayer isolation.
Loop flags and Play/Stop logs prove configuration or requests, not audibility.
Rediscover the installed APIs after upgrades; older Unreal documentation is not
a contract for every UEFN build.

## Guard the native connection and source before editing

Use Epic's shipped `remote_execution.py` with the editor's checked discovery
settings. Select exactly one intended editor, read its actual loaded island via
`UnrealEditorSubsystem.get_editor_world().get_path_name()`, and require the exact
mount/level before edits. The advertised `FortniteGame` project name does not
identify the island. Keep the same guard inside every project-local script and
close the short-lived native connection in `finally`. Both skill bodies link
the authoring reference directly for the tested connection setup.

Preflight `SoundFactory`, `SoundWave`, `SoundCue`, `SoundNodeWavePlayer`,
`AssetImportTask`, `AssetToolsHelpers` and `EditorAssetLibrary` in the installed
editor. Check approved source paths, SHA-256 hashes and WAV metadata before any
mutation. Use the actual island mount, not an assumed `/Game` destination.
Import one explicit track as the pilot; expected Wave and Cue destinations must
both be absent. Refuse completed tracks or any pending import/save receipt.

Write a project-local receipt with expected packages and import/save pending
flags **before** the import call. A timeout, exception or missing task path does
not prove nothing happened. Inspect the same job/editor state and destination
registry; reconcile partial outcomes before another import. Do not automatically
replay a mutation or overwrite an existing Wave/Cue to make a check pass.

## Configure SoundFactory and AssetImportTask

This configuration excerpt uses calls exercised by the museum importer. It is
not a standalone importer: the checked source, exact destination and unique name
are project inputs, and the guards/receipt above must run first.

```python
import unreal

factory = unreal.SoundFactory()
for key, value in {
    'auto_create_cue': True,
    'include_looping_node': False,
    'include_attenuation_node': False,
    'include_modulator_node': False,
    'cue_package_suffix': '_Cue',
    'cue_volume': 1.0,
}.items():
    factory.set_editor_property(key, value)

task = unreal.AssetImportTask()
for key, value in {
    'filename': checked_source,
    'destination_path': checked_destination,
    'destination_name': checked_name,
    'automated': True,
    'replace_existing': False,
    'save': False,
    'factory': factory,
}.items():
    task.set_editor_property(key, value)
```

After the project preflight and pending receipt, the tested mutation is
`unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])`.
[SoundFactory documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/SoundFactory?application_version=5.1)
describes the auto-cue options; the installed 42.30 implementation was inspected
before applying them.

## Inspect the actual graph, then save only the new assets

`task.imported_object_paths` returned **only the Wave**, although SoundFactory
also created the Cue. Convert native Arrays with `list(...)` before JSON
serialization. Compare the destination registry before/after; require exactly
the intended new Wave/Cue objects and their actual classes. A Cue omitted from
the task result is not grounds to import again.

Read `cue.first_node` through `get_editor_property`. The tested graph is a direct
`SoundNodeWavePlayer` with no `child_nodes`, and its `sound_wave_asset_ptr` points
to the new Wave. Set that player's `looping` property to true. Keep Cue volume at
1.0 so the importer does not silently attenuate the approved master.

Do not substitute `SoundNodeLooping` for seamless indefinite score repeats.
Epic documents that node for logical/procedural loops, and recommends the Wave
Player's loop flag for seamless indefinite playback.
[Looping-node guidance](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/USoundNodeLooping).

Before saving, verify Wave `duration`, `num_channels`, `imported_sample_rate`,
imported source identity, Cue `volume_multiplier` and the actual loop/reference
fields against the approved manifest. Clear import-pending only after inspecting
the new objects; retain save-pending until every intended package save succeeds.
Call `EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)` for each explicit
new Wave/Cue. Verify nonempty disk files, hashes and clean package state separately.
Reject empty save targets; do not turn a scoped save into Save All.

The tested source/inspection recipe is in the museum's
[importer](https://github.com/ehartye/art_explorers_fn/blob/f2a06b783053c6ac92e5dd23f145abde6914de61/scripts/import_score_audio.py),
[native inspector](https://github.com/ehartye/art_explorers_fn/blob/f2a06b783053c6ac92e5dd23f145abde6914de61/scripts/inspect_score_audio.py)
and [independent verifier](https://github.com/ehartye/art_explorers_fn/blob/f2a06b783053c6ac92e5dd23f145abde6914de61/scripts/verify_score_audio.py).
Their island UUID, manifests and paths belong to that project; inspect and adapt
them rather than executing against a different island.

## Runtime proof and fallback

UEFN's [Audio Player](https://dev.epicgames.com/documentation/fortnite/using-audio-player-devices-in-unreal-editor-for-fortnite)
uses Sound Waves/Cues. For per-visitor playback, the museum configured Instigator
Only with Instigating Player location, all autoplay phases off, then used
`Play(Agent)`/`Stop(Agent)`. Those overloads require Instigator Only according to
the [device API](https://dev.epicgames.com/documentation/en-us/fortnite/verse-api/fortnitedotcom/devices/audio_player_device).
Read options and preserved typed references back before scoped actor saves.
Launch once with private diagnostic probes disabled; reconcile a timeout from
the same session. An awake connected Fortnite client is required for the runtime
check. Do not claim listening or multiplayer acceptance from editor metadata.

If the installed native APIs or connection are unavailable, use one native editor
import exemplar via [Content Browser Import](https://dev.epicgames.com/documentation/en-us/fortnite/importing-custom-audio-in-unreal-editor-for-fortnite).
Auto Reimport created nothing in the earlier 42.20 WAV test. Repeating that failed
route or building the whole museum in UE is not a prerequisite for audio import.

Time is one capability probe and pilot before batching. Risk is overwriting
content or replaying an uncertain import. Complexity stays in project scripts
and native assets. The target owns audio and gameplay bindings; a second editor
adds dependency/version maintenance without resolving the missing MCP transport.
