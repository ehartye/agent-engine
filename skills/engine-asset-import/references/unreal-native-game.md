# Native Unreal game build and capture loop

This recipe comes from DEAD REDLINE on Windows, 2026-10-16. **Tested here:** Unreal **5.8.2**, changelist **56702186**, VS2022 Build Tools **17.14.37516.0**, actual MSVC **14.44.35228**, SDK **10.0.26100.0**, bundled **.NET 10**, D3D12 on an **RTX 5070 Ti Laptop GPU**. This is separate from the older 5.8.3 sample-scene evidence. Header inspection is marked separately from executed behavior. A delivered screenshot can reveal a rendering failure; it does not establish reference fidelity.

## Native module and source geometry

- [tested] A C++ Runtime game module compiled, loaded in native `UnrealEditor.exe -game`, built eight source-authored cars and a 192788 cm track, ran physical Chaos chassis motion and delivered game-camera PNGs. Geometry came from `ProceduralMeshComponent`; no FBX, Blender, skeletal importer or external MCP server was necessary for this construction.
- [tested] Explicit project plugins were `ProceduralMeshComponent`, `PythonScriptPlugin` and `EditorScriptingUtilities`. Runtime used Core, CoreUObject, Engine, InputCore, ProceduralMeshComponent and PhysicsCore, plus JSON/UI modules used by the actual game. Editor-only material graph creation stayed in Python.
- [documented] Installed-source inspection, not runtime proof: ProceduralMeshComponent is a Runtime module in 5.8.2. It does not automatically provide a skeletal rig, Nanite or authored LODs. Use a few simple collision bodies, not collision on decorative trim. Bake accepted repeated geometry into static meshes when instancing/LODs are needed.
- [tested] The first native compile caught an ambiguous conditional between `Parent->Mobility` (`TEnumAsByte`) and `EComponentMobility::Movable`. `Parent->GetMobility()` supplies the exact enum. A test source in a nested module folder could not include the parent's header through a legacy implicit include path; its explicit relative include fixed compilation. Do not widen global include paths to hide a local ownership mistake.

## Exact compiler and engine versions

- [tested] Read `Engine/Build/Build.version`, `Engine/Config/Windows/Windows_SDK.json` and the compiler's actual ProductVersion. The VS2022 folder was named **14.44.35207**, which looks banned, but `cl.exe` ProductVersion was **14.44.35228.0**, above the banned ceiling. UBT selected and logged the correct actual version.
- [documented] Installed-source inspection, not runtime proof: UBT's `MicrosoftPlatformSDK.cs::IsValidToolChainDirMSVC` reads compiler ProductVersion first and retains folder-family separately. This installation also had VS2026 14.51, outside the 5.8.2 preferred families. Pin the tested compiler instead of trusting the newest installed IDE.
- [documented] Installed-source inspection, not runtime proof: Pin `DefaultBuildSettings = BuildSettingsVersion.V7` and `IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8` in both Target.cs files. Using `Latest` changes defaults on upgrade; V7 adds error-level dangling/return/unreachable diagnostics.

```powershell
$ueRoot = 'C:/Program Files/Epic Games/UE_5.8'
$projectRoot = 'C:/path/to/project'
$uproject = "$projectRoot/MyGame.uproject"
& "$ueRoot/Engine/Build/BatchFiles/Build.bat" MyGameEditor Win64 Development "-Project=$uproject" -WaitMutex -NoHotReloadFromIDE -2022 -CompilerVersion=14.44.35228 -WindowsSDKVersion=10.0.26100.0
if ($LASTEXITCODE -ne 0) { throw 'Native compile failed' }
```

Use Epic's installed wrappers and bundled dotnet. Preserve failed logs and success receipts. Record HEAD, dirty status, a source fingerprint and whether source changed while compiling; HEAD alone does not identify a working build.

## Editor assets and presentation

- [tested] [Native presentation](unreal-native-presentation.md) records the Slate/font commandlet crash, empty VertexColor pin, exact-size Canvas glyphs and camera/palette failures caught by actual screenshots.

The tested [content-only pipeline](unreal-native-content-pipeline.md) separates asset authoring from native gameplay when the host refuses an Editor module.

## Capture the actual game

- [tested] `UnrealEditor.exe project.uproject /Game/Maps/DeadRedline -game -RenderOffScreen -ResX=1920 -ResY=1080 -ForceRes` ran native gameplay and delivered fresh 1920×1080 race/title PNGs plus JSON state. The log selected the RTX GPU; no screen scraping or desktop input service was used.
- [tested] The race receipt sampled eight racers, 16390 cm player displacement, three grounded wheels and 144.8 km/h. Those numbers establish sampled native state, not a completed race, good handling or physical keyboard/gamepad coverage.
- [documented] Installed-source inspection, not runtime proof: `FScreenshotRequest::RequestScreenshot(absolutePng, false, false)` lets the engine save the game render target. Wait for screenshot processing **and** file existence before writing success/quitting. Binding `UGameViewportClient::OnScreenshotCaptured()` replaces automatic disk saving; explicitly save delegate pixels if using that path.
- [tested] Canvas HUD rendered in the world-target capture with showUI=false. This does not establish offscreen Slate/UMG capture; that separate path needs showUI=true and a valid Slate window.
- [documented] Installed-source inspection, not runtime proof: `FInputKeyEventArgs::CreateSimulated` and `APlayerController::InputKey(FInputKeyEventArgs)` are the current 5.8.2 input route. The old `FInputKeyParams` overload is deprecated and final. Native control-command replay proves gameplay interfaces separately from physical input mapping/focus behavior.

Custom `DRScenario`/`DRCaptureDir` flags below belong to the game harness; they are not built-in engine flags. Implement a finite in-game scenario that drives the same command interface as normal player/AI input, records actual state, captures and exits only after completion.

```powershell
$capture = "$projectRoot/Saved/Verification/fresh-run/race"
& "$ueRoot/Engine/Binaries/Win64/UnrealEditor.exe" $uproject /Game/Maps/DeadRedline -game -RenderOffScreen -unattended -ResX=1920 -ResY=1080 -ForceRes -Deterministic -FPS=60 -DRScenario=race "-DRCaptureDir=$capture" "-abslog=$capture/native.log"
```

Use a fresh output directory. Reject stale/missing PNG or JSON, invalid PNG dimensions, wrong scenario identity, wrong screenshot path, timeout and failure exit codes. Record exact command, source/build identity, engine version, launch mode, camera/exposure/seed and native state. `-Deterministic -FPS=60` selects a fixed simulation step/seed; do not report frames divided by simulated time as measured rendering FPS. It does not promise deterministic Chaos physics.

## Automation exit codes are insufficient

- [tested] A failing `DeadRedline.Vehicle.FrozenPresentation` test returned **process exit code 0** under `-TestExit="Automation Test Queue Empty"`. Fresh `index.json` correctly reported failed=1: paused/static presentation consumed nitro, fired three rounds and reduced its magazine. The engine's queue-empty exit is not a passing test result.
- [tested] The project wrapper therefore parses fresh automation JSON and rejects failed, incomplete, zero-test or unexpected-filter reports, in addition to checking process exit/timeout. Dependency-free tooling checks exercise those rejection paths using deliberate invalid artifacts.
- [tested] After the frozen-physics guard fix and a new native compile, the same FrozenPresentation test passed together with CombatOwnership: fresh report **2 succeeded, 0 failed**. This establishes those two native behaviors; it does not replace complete race, handling, jump or physical-input checks.

```powershell
& "$ueRoot/Engine/Binaries/Win64/UnrealEditor-Cmd.exe" $uproject "-ExecCmds=Automation RunTests MyGame" "-TestExit=Automation Test Queue Empty" "-ReportExportPath=$projectRoot/Saved/Verification/fresh-tests" -unattended -nullrhi -nosound -notraceserver
# Parse fresh index.json: require executed successes and failed/notRun/inProcess == 0.
```

Use nullrhi for nonvisual automation, never for a rendered acceptance frame. Engine process ownership must be serialized between builders, content generation, tests and captures.

## Native packaging and remaining acceptance

Read [native Windows packaging](unreal-native-packaging.md) for the exact Application Control UAT failure and the separately tested Build.bat/direct-Cook/UnrealPak route. The actual Game executable delivered three native capture scenarios from an immutable commit; this is distinct from Editor-game evidence.

- [general] Still unproven by this exercise: a complete three-lap eight-car race, physical keyboard/gamepad input, audible audio, handling across frame-rate extremes, cross-machine portability and screenshot-reference parity. The packaged build was explicitly labeled a visual GAP baseline.
