# Scripting the Unreal editor from Python: run modes and traps

Evidence: Unreal 5.8.2 on Windows, from the scripts in [`examples/unreal`](../../../examples/unreal/README.md), mainly [`niagara-showcase`](../../../examples/unreal/niagara-showcase/README.md). `[tested]` is reproduced by running those scripts, `[documented]` was read in Epic documentation or the engine, `[general]` is an observation from those runs that no script asserts.

## Pick the run mode

| Mode | Command shape | Use it for |
|---|---|---|
| Commandlet | `UnrealEditor-Cmd.exe Project.uproject -run=pythonscript -script=x.py -unattended -nullrhi ...` | Assets and levels: create, duplicate, save, place actors |
| Editor, offscreen or windowed | `UnrealEditor.exe Project.uproject /Game/Maps/M -ExecCmds="py x.py"` | Anything that needs a ticking world: Play-In-Editor, screenshots, camera tours |
| Standalone game | the same with `-game -windowed -ResX=1600 -ResY=900` | Watching a result without the editor UI |

- [tested] A commandlet has no ticking world: build the level there, then run the editor to look at it ([`niagara_build.py`](../../../examples/unreal/niagara_build.py), then [`niagara_verify.py`](../../../examples/unreal/niagara_verify.py)).
- [tested] In the editor, register `unreal.register_slate_post_tick_callback`, start play with `get_editor_subsystem(unreal.LevelEditorSubsystem).editor_request_begin_play()` after the map loads, and keep the callback alive. `-ExecutePythonScript` quits when the script ends, so do not use it for a run that must keep going.
- [tested] In a game process there is no editor: any `unreal.EditorLevelLibrary` call, including `get_game_world`, crashes with an access violation. Find the world with `unreal.ObjectIterator(unreal.World)` instead ([`showcase_run.py`](../../../examples/unreal/niagara-showcase/showcase_run.py), `NIAGARA_SHOWCASE_GAME=1`). The engine's own Python init prints harmless `AttributeError` lines for toolset modules in game mode.

## Traps

- [tested] Actors cannot be spawned from Python during play ("The Editor is currently in a play mode"). Place what play needs, such as a camera, in the level at build time and find it with `GameplayStatics.get_all_actors_of_class`; then `set_view_target_with_blend` on the player controller.
- [tested] `unreal.Rotator(...)` takes roll, pitch, yaw, in that order. Passing yaw first pitches the actor. Use `MathLibrary.find_look_at_rotation` for cameras.
- [tested] Read devices from a tick callback through the player controller: `is_input_key_down(key)`, `get_input_analog_key_state(key)` (sticks, triggers) and `get_input_mouse_delta()`. A `unreal.Key` takes engine key names such as `W`, `Gamepad_LeftX`, `Gamepad_RightTriggerAxis`; build it with `k = unreal.Key(); k.import_text(name)` and check `unreal.InputLibrary.key_is_valid(k)`. In a game process `set_editor_property("key_name", ...)` fails; in the editor and commandlets it works. Map devices to one plain input snapshot and test the motion code from scripted snapshots ([`showcase_explore.py`](../../../examples/unreal/niagara-showcase/showcase_explore.py), `NIAGARA_SHOWCASE_SELFTEST=1`); the device calls themselves were only run with nothing plugged in.
- [tested] `unreal.Color` takes positional arguments as (b, g, r, a): `unreal.Color(255, 130, 40, 255)` is blue. Pass `r=`, `g=`, `b=`, `a=`. Read a light back from the saved map when a colour looks wrong.
- [tested] Activating a Niagara system blocks the game thread while it compiles, and Slate keeps ticking inside that wait, so a `register_slate_post_tick_callback` callback re-enters itself. Guard it with a busy flag, or one frame runs its logic several times.
- [tested] An offscreen editor with 3D fluids runs about 3 frames per second, so check time-based logic against the time actually applied (a check can run before the current frame's input is), and do not move the camera for a couple of seconds after `take_high_res_screenshot`: the image is written a few frames later and shows the new pose.
- [general] A tick callback that raises repeats the error every frame; wrap its body in `try`/`except` and log once.
- [general] `SystemLibrary.draw_debug_string` text does not appear in a high-resolution screenshot; use a `TextRenderActor` for labels, and remember its front faces +X.
- [general] `AutomationLibrary.take_high_res_screenshot` worked from an offscreen editor in play; it was not used in game mode.
- [general] A Python syntax error in a commandlet script ends the run with a non-zero code and little explanation (127 was seen). Parse the script first: `python -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" x.py`.
- [general] The asset-registry scan, saving duplicates before the map, and the `asset` property are in [Niagara in Unreal](unreal-niagara.md).

## Process hygiene when an agent drives the editor

- [general] On Git Bash `timeout` kills its own wrapper but not the Windows child, so a timed-out `UnrealEditor.exe` keeps running, holds its log file ("Device or resource busy") and several gigabytes of memory. After every timed run, stop editors whose command line names your project (for example `Get-CimInstance Win32_Process` filtered on the `.uproject`), and never kill others: a person's own editor looks the same.
- [tested] Quote the whole `-ExecCmds="py C:/path/x.py"`. Passed unquoted through PowerShell `Start-Process`, the command splits at the space, `py` runs with no script, and the game window just sits there; the log never shows the script's first line.
- [general] `UnrealEditor-Cmd.exe` with no project or command waits forever; it hangs a foreground tool call.
- [general] Never take a full-screen capture to check a window; it can include unrelated windows. Use the engine's own screenshot, or ask the person.
