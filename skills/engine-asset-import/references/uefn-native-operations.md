# UEFN saved controls and capture

Read this when native UEFN edits need scoped saves, Verse references, compact
buttons or screenshots. First-hand evidence checked 2026-10-02 in UEFN 42.30.
Inspect the installed schemas after upgrades; these observations are not an API
contract for every project. Use the authoring reference for connection setup.

## Choose the operation and its proof

| Operation | Time | Risk | Complexity | Architectural fit | Maintenance |
|---|---|---|---|---|---|
| Save named external actor packages | One preflight and batch call | Wrong package ownership | Small native script | Project owns its actors | Exact targets and save receipt |
| Reuse existing Verse adapters | Preflight, write, read back | Wrong reference type or stale field | Small MCP script | Preserve device identities | Stable editable fields |
| Shrink a Button's visible component | One component edit | Confusing appearance with reach | Low | Preserve the logical device | Read back both scales and radius |
| Offscreen SceneCapture2D | Short bounded callback job | Leaked actor or misleading exposure | Moderate | Temporary editor inspection | Cleanup receipt; keep runtime checks |

Source, saved packages, editor images, validation and runtime behavior establish
different things. State the layer checked. Method-invoking QA does not establish
physical interaction, third-person camera behavior, late joining or performance.

## Save only owned external actor packages

**Tested:** `actor.get_package()` returned the external actor package in the
loaded island. Verify `actor.is_package_external()` and the actual package path;
do not assume the returned object is the map or assume every actor is external.
`EditorLoadingAndSavingUtils.save_packages(packages, False)` saved scoped sets
of 19 and 122 named museum actors. Check its boolean result. Related external
object packages may also change for an owned folder; inspect ownership before
staging. A source commit does not back up native assets unless those files ship.

The following function uses those tested native calls. Its arguments come from
a project-specific preflight: the exact island level, unique owned actor paths,
and the verified external package prefix. It has not been run as a reusable
function; the museum scripts separately exercised the calls and guards.

```python
import unreal

def save_owned_actor_packages(expected_level, actor_paths, external_package_prefix):
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    if world.get_path_name().split('.')[0] != expected_level:
        raise RuntimeError("Wrong island")
    if not actor_paths or len(set(actor_paths)) != len(actor_paths):
        raise RuntimeError("Expected unique, explicitly owned save targets")
    if not external_package_prefix or not external_package_prefix.endswith('/'):
        raise RuntimeError("Expected a preflighted external package prefix")
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
    packages = {}
    for path in actor_paths:
        found = [actor for actor in actors if actor.get_path_name() == path]
        if len(found) != 1:
            raise RuntimeError("Missing or ambiguous target: " + path)
        actor = found[0]
        package = actor.get_package()
        if not actor.is_package_external():
            raise RuntimeError("Refusing a nonexternal actor package")
        if not package.get_path_name().startswith(external_package_prefix):
            raise RuntimeError("Refusing an out-of-scope package")
        packages[package.get_path_name()] = package
    if not unreal.EditorLoadingAndSavingUtils.save_packages(list(packages.values()), False):
        raise RuntimeError("Save failed; inspect before repeating")
    return list(packages)
```

Do not replace this preflight with Save All. Empty target lists must fail closed.
Retain the saved package names and pending-save state in a receipt. Reconcile a
timeout against native package state before another mutation. Serialize native
scripts and callback jobs: the tested remote entrypoint shared Python globals.
Do not call MCP from inside an editor Python script.

## Distinguish built-in adapters from custom Verse instances

**Tested:** built-in device editables such as `button_device` and
`cinematic_sequence_device` returned typed adapter objects through
`DeviceTools.GetDeviceProperties`. Preflight each adapter with ObjectTools:
its `savedActor` schema must identify `/Script/Engine.Actor`. Set `savedActor`
to the desired actor reference using `ObjectTools.set_properties`, then read it
back exactly. Replacing the entire editable with a Blueprint actor reference
was rejected. Do not discard a working adapter to work around this.

An obsolete built-in binding can be cleared by setting `savedActor` to JSON
`null`, with readback. Preserve field names during a controller migration so
existing saved devices retain their compatible schema. The reduced museum
controls cleared 59 obsolete/default slots while preserving active references.

Custom Verse-controller editables need their contained Verse instance, not the
actor and not a built-in `savedActor` adapter. In the tested island, removing
the final property component from an existing controller adapter path located
that containing instance. `DeviceTools.SetDeviceProperty` accepted and read back
the resulting reference; 35 actual references subsequently passed server QA.
Validate the containing object and expected class in a new project. Do not
hardcode a generated instance suffix or apply this path rule to arbitrary objects.

Ordinary Verse editable values use DeviceTools. Native Button blueprints used
ObjectTools; DeviceTools rejected them as invalid ScriptDevices. Discover the
schema rather than treating every Fortnite device as the same object type.

## Compact switches without shrinking interaction targets

**Tested:** the native Button exposed `buttonMesh`, a StaticMeshComponent.
Changing its `relativeScale3D` to 0.10 reduced its visible mesh while retaining
actor scale 1 and `interactionRadius` 1. All 24 surviving pixel controls had
independent native readbacks. A visible mesh about 45.94 cm tall became about
4.59 cm. Other components expanded actor bounds to 128 cm; those bounds did not
measure the visible switch.

Logical radius readback is not a physical reach test. Confirm the real focus
prompt, activation and camera view in Fortnite before claiming usability.
Evaluate framing at interaction approaches, with actual painting dimensions;
lowering art alone can still leave most of a large painting outside the frame.

The friendly native properties included `visibleDuringGame`,
`enabledAtGameStart`, `interactionRadius` and `buttonMesh`. `bIsEnabled` was
readable but **read-only on the tested instances**. A multi-property write
partly succeeded before failing on that field. Read back before retrying.
Retire a button by clearing its controller binding, setting supported startup
enablement and visibility false, and placing the obsolete prop out of view.
Verify its runtime inactivity; an underfloor transform alone is insufficient.

## Bounded editor screenshots when viewport capture stalls

**Tested:** viewport screenshot tasks stalled after two images. Smaller batches
and uncovering the editor did not establish a cause. A temporary native
`SceneCapture2D` with `SceneCaptureComponent2D` and a transient RGBA8 render
target successfully exported 16 views at 1920 x 1080.

The working configuration used `capture_every_frame=False`,
`capture_on_movement=False`, `always_persist_rendering_state=True`, FOV 80,
`SCS_FINAL_COLOR_LDR` and `RenderingLibrary.create_render_target2d`. A bounded
Slate post-tick callback positioned the camera, allowed editor frames to settle,
called `capture_scene()` and `RenderingLibrary.export_render_target`.
Use named `unreal.Rotator(pitch=..., yaw=..., roll=...)` arguments.

Preflight for an existing temporary actor before starting. On completion or any
failure, independently attempt all cleanup: detach the texture target, release
the render target, destroy the capture actor and unregister the callback.
Collect cleanup failures rather than allowing the first failure to skip the
remaining actions. Inspect the image files and require a receipt confirming
actor removal. Do not save or push while temporary capture actors exist.

These images established geometry and editor framing. Exposure differed from
the main viewport. They did not prove color fidelity, game camera framing or
interaction. Do not label an editor SceneCapture image as a Fortnite screenshot.

## Actual client capture across Windows sessions

**Tested:** the agent shell ran in Windows session 0 while UEFN and Fortnite
ran in session 1. Shell-side `EnumWindows` found no game windows. Running a
read-only ctypes inspection through native editor Python found the sole window
belonging to `FortniteClient-Win64-Shipping.exe` in the editor's session.

Record the actual client rectangle, foreground status and method. Foreground
screen `BitBlt` produced a readable game image. Background `PrintWindow` may
return success with blank DirectX content; inspect the PNG. Do not assume an
earlier 1920 x 1080 sign-in screen implies that a later 853 x 640 gameplay window
meets a full-resolution readability requirement. Capture does not require
focusing another window or sending input.

## Runtime QA without leaking diagnostics into visits

**Tested:** automatic startup advanced all eight kinetic and four animated
pixel timelines. A second private probe invoked production controller methods
and passed 156 expected server results: wrapping study cycles, held-frame
pause/resume, reset and quiet behavior. It did not press physical devices or
verify rendered poses, completed-clip reset, multiplayer or performance.

Use one authoritative controller and timeline. Pause legacy Animated Mesh
players and companions before starting the shared cinematic timeline. Match
loop, everyone/always-relevant and completion settings to the intended exhibit.
For timed picture animation, reset its next-frame clock on held-frame resume;
do not catch up all elapsed pause time or restart the picture at frame zero.
Shared quiet handlers must preserve a static station's chosen study and avoid
advertising motion controls that station does not have.

A private QA device defaults disabled. Before a normal push, verify **every
installed** QA device disabled and explicitly saved, no pending migration/save
receipt, and no temporary capture actor. Checking only the original probe missed
a newer probe during review. Record fresh log offsets so old results cannot pass
a new run. Keep one pending push receipt and reconcile uncertain operations;
a completed content push and Connected/Running state are separate from a
passing physical interaction or capacity test.

First-hand implementations and limits are in the owner's wiki at
`wiki/authored/agent-engine/reference/uefn-native-python.md` and
`wiki/authored/agent-engine/reference/uefn-interaction-capture.md`.
The museum control source/native changes shipped in private
[PR #7](https://github.com/ehartye/art_explorers_fn/pull/7).
