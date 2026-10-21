# Niagara showcase

A dark arena with eight stations, built only from Unreal 5.8 engine content and driven by Python. You fly a free camera around it with a keyboard and mouse or a gamepad, and each station switches on as you come close. It shows what Niagara can do with nothing but what Epic ships, and it doubles as a worked example of authoring a system through the Niagara toolsets. An automatic camera tour is the hands-off alternative.

| Station | System | What it shows |
| --- | --- | --- |
| 2D fire | `Grid2D_Gas_MovingFire` | A GPU grid fluid drawn as a sprite: the fire Epic ships for placing in a map |
| 3D fire | `Grid3D_Gas_Fire` | A GPU grid fluid: fire and embers advected through a 3D volume (no smoke) |
| Explosion | `Grid3D_Gas_Explosion` | A 3D gas explosion that restarts every 10 s |
| Liquid hose | `Grid3D_Flip_Hose` | A 3D FLIP liquid (particles plus a grid) |
| Sand | `SandSystem` | A granular simulation: thousands of spheres that pile and flow |
| Ribbon trails | `AttributeReaderTrails` | Ribbons that read attributes from another emitter's particles |
| Radial burst | `RadialBurst` | CPU sprites, restarting every 5 s |
| Authored here | `NS_ShowcaseVortex` | The radial-burst system with vortex, curl-noise and point-attraction modules added through Epic's Niagara toolsets |

## Build and run

The project needs PythonScriptPlugin, EditorScriptingUtilities, Niagara, NiagaraFluids and NiagaraToolsets (Experimental), and one project setting, or the 3D fluids fail to compile and stay inactive:

```ini
; Config/DefaultEngine.ini
[/Script/Engine.RendererSettings]
r.GenerateMeshDistanceFields=True
```

Build the level once (headless, about 30 s), then fly it:

```text
UnrealEditor-Cmd.exe Project.uproject -run=pythonscript -script=showcase_build.py -unattended -nullrhi -nosplash -nopause -nosound -notraceserver
UnrealEditor.exe Project.uproject /Game/Maps/NiagaraShowcase -game -windowed -ResX=1600 -ResY=900 -ExecCmds="py <absolute-path>/showcase_explore.py"
```

Set `NIAGARA_SHOWCASE_GAME=1` first for the game window (a game process has no editor, so the script finds the world with `ObjectIterator`; any `EditorLevelLibrary` call there crashes). Leave it unset to run in the editor, which starts Play-In-Editor itself; click the viewport so it has focus. In Git Bash set `MSYS_NO_PATHCONV=1`. Quote the whole `py <path>` command: unquoted, the space splits it and the script silently never runs.

## Night scene

`night_build.py` builds `/Game/Maps/NiagaraNight`, an outdoor scene with no sky light and a very dim moon, so the fires are the main light. It has four stations: the 2D fire and the 3D fire side by side on the west side, and Epic's 2D and 3D smoke on the east side. Build it the same way as the arena (one command), then fly it with `showcase_explore.py` and the map path above; the explorer finds the centre from the stations. Light levels are `NIAGARA_NIGHT_MOON`, `NIAGARA_NIGHT_FIRE_LIGHT` and `NIAGARA_NIGHT_SMOKE_LIGHT`. Its point of interest is the comparison: at default settings the 2D fire reads taller and fuller than the 3D one. That is a look by eye, not a measurement.

## Controls

| | Keyboard and mouse | Gamepad |
| --- | --- | --- |
| Move | W A S D | left stick |
| Look | mouse, arrow keys | right stick |
| Up, down | Space, C | right trigger, left trigger |
| Boost | hold Shift | hold B, or press the left stick in |
| Previous, next station | Q, E (or 1 to 8) | left bumper, right bumper |
| Restart the nearest station | F | A |
| Hide or show the help line | H | Y |
| Quit | Esc | close the window |

The previous and next station controls glide the camera to a pose in front of the station; any movement or look input cancels the glide. A station switches on within 1000 cm of the camera and off beyond 1300 cm, with at most three running at once, because the fluids are heavy. Explosions and bursts replay on a timer while you are near. A line on screen shows the nearest station and what is running.

The first time a system switches on, the editor compiles it, which takes from a fraction of a second up to about a minute for the fluids, and the window freezes meanwhile. The result is cached, so later runs start fast.

## Tour instead

`showcase_run.py` is a hands-off camera tour: it glides to each station, drifts around it and moves on, switching systems on shortly before the camera arrives. Launch it the same way with that script. Hold and transit seconds, start station and per-station screenshots are environment variables listed at the top of the file.

## Checking it without a device

`NIAGARA_SHOWCASE_SELFTEST=1` replaces the device with scripted input, checks the motion maths (full-stick speed, strafing, turn rate, the pitch limit, boost), glides to every station and checks the switching rules (the station is the nearest, it is running, at most three run). It logs `[showcase_explore] selftest PASS` or `FAIL ...`, and in a game process it then quits:

```text
UnrealEditor.exe Project.uproject /Game/Maps/NiagaraShowcase -game -RenderOffScreen -windowed -ResX=1280 -ResY=720 -unattended -nosplash -notraceserver -ExecCmds="py <absolute-path>/showcase_explore.py" -abslog=<file>
```

`NIAGARA_SHOWCASE_SHOTS=1` (editor only) also writes one screenshot per station under `Saved/Screenshots`, after `NIAGARA_SHOWCASE_SETTLE` seconds at the station (default 4; an offscreen editor runs a few frames per second, so the fluids need about 12).

## What it is and is not

- It is a demonstration scene built from shipped assets. It claims nothing about performance: only the stations near the camera run, at most three at once.
- Passed on Unreal 5.8.2 on Windows, in a game process: the self-test on the arena (motion maths and the eight station switches) and on the night scene (the four station switches). Seen in the editor by screenshot per station on an earlier version of the arena: sand and the others render, the authored system emits particles, and the 3D fire is thin wisps. The hose reads as scattered droplets; the fluid looks are Epic's defaults and were not art-directed. The current 2D fire station and the night scene were looked at live by a person, not by screenshot, and no screenshot of them is checked in.
- Not tested: reading a real gamepad, the mouse (the self-test only confirms the device calls run and every key name is valid, with nothing plugged in), the on-screen help line (debug text does not appear in screenshots), other platforms, other engine versions, a packaged build. The bindings above were written from Epic's key names; the first person to plug a pad in is the test.

## Findings while building it

- Epic's 3D fluid systems need `r.GenerateMeshDistanceFields=True`. Without it the editor log says "The mesh distance field generation is currently not enabled" and the systems never activate.
- The fluids draw their grid bounds through the `User.DrawBounds` variable; `set_variable_bool("User.DrawBounds", False)` removes the red box.
- The first activation of each system compiles it on the game thread (the sand system took 54 s the first time), and while it blocks, Slate keeps ticking, so a Python tick callback re-enters itself. Both scripts guard against that.
- The toolsets' compile-wait tools (`GetSystemCompileState`, `GetStackIssues`) block the game thread until they time out (120 s) when a compile is queued behind other work, so a diagnostic that calls them can hang for two minutes.
- Authoring recipe matters: removing a template's emitter and adding a Fountain emitter plus three modules produced a system that compiled but completed at once without emitting; adding the same modules to the emitter of a system that already emits worked (three emitters, up to 230 particles, about 2.5 s). Check a new system with a simulation cache before building on it.
- Choose templates from their shipped descriptions, not their names. The first version of this arena used `Grid3D_Gas_Fire` as its fire because "3D gas fire" sounded like the headline fluid; its description says it is fire from a static mesh without smoke, and it looks thin next to `Grid2D_Gas_MovingFire`. The catalog is in the [templates reference](../../../skills/engine-asset-import/references/unreal-niagara-templates.md).
- A Stationary light in a level with no baked lighting makes the game window print "lighting needs to be rebuilt"; set built lights to Movable.
- Reading input from Python needs an `unreal.Key`; in a game process `key.import_text("W")` makes one, while `set_editor_property("key_name", ...)` only works in the editor and commandlets.
- `unreal.Color(255, 130, 40, 255)` is blue, not orange: the positional order is (b, g, r, a). Use keywords.
