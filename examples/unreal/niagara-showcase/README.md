# Niagara showcase

A dark arena with eight stations and a camera that tours them, built only from Unreal 5.8 engine content and driven by Python. It shows what Niagara can do with nothing but what Epic ships, and it doubles as a worked example of authoring a system through the Niagara toolsets.

| Station | System | What it shows |
| --- | --- | --- |
| 3D gas fire | `Grid3D_Gas_Fire` | A GPU grid fluid: fire and embers advected through a 3D volume |
| Explosion | `Grid3D_Gas_Explosion` | A 3D gas explosion that restarts every 10 s |
| Dust explosion | `Grid3D_Gas_DustExplosion` | The same grid solver with a dust look, restarting |
| Liquid hose | `Grid3D_Flip_Hose` | A 3D FLIP liquid (particles plus a grid) |
| Sand | `SandSystem` | A granular simulation: thousands of spheres that pile and flow |
| Ribbon trails | `AttributeReaderTrails` | Ribbons that read attributes from another emitter's particles |
| Radial burst | `RadialBurst` | CPU sprites, restarting every 5 s |
| Authored here | `NS_ShowcaseVortex` | The radial-burst system with vortex, curl-noise and point-attraction modules added through Epic's Niagara toolsets |

## Run it

The project needs PythonScriptPlugin, EditorScriptingUtilities, Niagara, NiagaraFluids and NiagaraToolsets (Experimental), and one project setting, or the 3D fluids fail to compile and stay inactive:

```ini
; Config/DefaultEngine.ini
[/Script/Engine.RendererSettings]
r.GenerateMeshDistanceFields=True
```

Build the level once (headless, about 30 s), then watch the tour:

```text
UnrealEditor-Cmd.exe Project.uproject -run=pythonscript -script=showcase_build.py -unattended -nullrhi -nosplash -nopause -nosound -notraceserver
UnrealEditor.exe Project.uproject /Game/Maps/NiagaraShowcase -game -windowed -ResX=1600 -ResY=900 -ExecCmds="py <absolute-path>/showcase_run.py"
```

For the game window set `NIAGARA_SHOWCASE_GAME=1` first (a game process has no editor, so the script finds the world with `ObjectIterator`; any `EditorLevelLibrary` call there crashes). Leave it unset to run in the editor, which starts Play-In-Editor itself. In Git Bash set `MSYS_NO_PATHCONV=1`. Close the window to stop. Optional environment variables are listed in `showcase_run.py` (hold and transit seconds, start station, camera distance, per-station screenshots in the editor).

The first time a system is activated the editor compiles it, which takes from a fraction of a second up to about a minute for the fluids and freezes the window meanwhile. The result is cached, so later runs start fast; run the tour once to warm the cache.

## What it is and is not

- It is a demonstration scene built from shipped assets. It claims nothing about performance: only about two stations run at once, switched on before the camera arrives and off after it leaves.
- Checked offscreen in the editor by screenshot per station on Unreal 5.8.2: the fire, explosions, hose, sand, ribbon trails and burst render, and the authored system emits particles. The fire is wispy and the hose reads as scattered droplets; the fluid looks are Epic's defaults and were not art-directed. The game-mode window was started and ran through its stations without a crash; its picture was not compared with the editor's.
- Not run: other platforms, other engine versions, a packaged build.

## Findings while building it

- Epic's 3D fluid systems need `r.GenerateMeshDistanceFields=True`. Without it the editor log says "The mesh distance field generation is currently not enabled" and the systems never activate.
- The fluids draw their grid bounds through the `User.DrawBounds` variable; `set_variable_bool("User.DrawBounds", False)` removes the red box.
- The first activation of each system compiles it on the game thread (the sand system took 54 s the first time).
- The toolsets' compile-wait tools (`GetSystemCompileState`, `GetStackIssues`) block the game thread until they time out (120 s) when a compile is queued behind other work, so a diagnostic that calls them can hang for two minutes.
- Authoring recipe matters: removing a template's emitter and adding a Fountain emitter plus three modules produced a system that compiled but completed at once without emitting; adding the same modules to the emitter of a system that already emits worked (three emitters, up to 230 particles, about 2.5 s). Check a new system with a simulation cache before building on it.
