# Native Windows packaging without a UAT project-discovery assembly

Observed in DEAD REDLINE, Windows, 2026-10-16, Unreal 5.8.2 CL56702186. This complements the [native game loop](unreal-native-game.md). The archived baseline was commit `7f4ebcb232137aac0574e56713c9f70244609423`; its visual acceptance remained **GAP**. A real packaged executable was tested; no final-game or visual-parity claim follows.

## The exact UAT failure

- [tested] Installed `RunUAT.bat BuildCookRun -noP4` parsed the project, compiler and staging arguments, then failed **before build/cook** with `System.IO.FileLoadException`, **0x800711C7**: Windows Application Control blocked its dynamically generated `Temp/UAT/.../Rules/UATRules-*.dll`. A subsequent rebuilt Editor module was also denied loading under the same policy family (GetLastError 4551). This is a host trust boundary, not a C++ syntax failure.
- [documented] Installed `AutomationUtils/ProjectUtils.cs` chooses Temp/UAT for installed-engine target discovery and dynamically compiles/loads target scripts. Supplying a client target does not skip the initial project-detection call. Repeatedly changing the blocked file's name/location is not a packaging solution.
- [tested] No security policy was changed or disabled; the blocked DLL was not moved/reloaded to evade the decision. The successful alternative used separate supported native engine tools and never loaded that UAT-generated assembly.

Preserve the first failure log, HRESULT, source identity and failed receipt even when another route succeeds. Do not report UAT as tested-successful because a manual native stage later runs.

For the later Editor-module rejection, the [content-only pipeline](unreal-native-content-pipeline.md) records the independently tested asset-bake/Game-EXE split, unchanged retry failure, short-path cook fix and second-generation packaged captures.

## Freeze the source before independent packaging

- [tested] `git archive` of the exact commit went into a new directory while another worktree evolved. No uncommitted source was copied into that proof. A `.source-snapshot.json` stored the commit, archive SHA-256 and initial source fingerprint; subsequent build/capture receipts labeled provenance `git-archive`, dirty=false. Native outputs did not change that source fingerprint.
- [tested] Native `Build.bat MyGame Win64 Development` compiled/linked the real Game EXE in 51.37 s; the snapshot Editor target compiled in 61.32 s. These were ordinary supported UBT builds and independently passed the host's policy. Do not assume another newly built executable or DLL will also be allowed without actually running it.

Record HEAD, dirty state and source fingerprint for active worktrees. An archive that is later edited must become dirty in its receipt. Generated material packages and source-font licenses must belong to that same snapshot or have separately recorded provenance.

## Direct native cook

- [tested] Direct `UnrealEditor-Cmd -run=Cook -TargetPlatform=Windows -CookAll -SkipZenStore -unversioned -unattended -nullrhi` completed with exit 0 and no cook errors in 12.592 s wall time after a warm cache. `SkipZenStore` selected ordinary cooked files suitable for explicit staging. No cook server or custom background service was needed.
- [tested] Adding the optional `-SkipEditorContent` optimization caused cook errors: enabled Landmass startup materials referenced Engine EditorMaterials that this flag excluded. `-DisablePlugins=Landmass` was parsed but did not override an already configured target plugin. Removing the optimization let the actual dependency graph cook cleanly. No `IgnoreCookErrors` or error suppression was used.
- [documented] Source `CookCommandlet.cpp` supports CookAll and SkipZenStore. `PluginManager.cpp` processes extra DisablePlugins only when a name has not already been configured. Prefer a deliberately scoped project/plugin configuration for production; do not guess that an override worked because its flag appeared in the command line.

```powershell
$ueRoot = 'C:/Program Files/Epic Games/UE_5.8'
$projectRoot = 'C:/path/to/frozen-project'
$uproject = "$projectRoot/MyGame.uproject"
& "$ueRoot/Engine/Build/BatchFiles/Build.bat" MyGame Win64 Development "-Project=$uproject" -2022 -CompilerVersion=14.44.35228 -WindowsSDKVersion=10.0.26100.0
& "$ueRoot/Engine/Build/BatchFiles/Build.bat" MyGameEditor Win64 Development "-Project=$uproject" -2022 -CompilerVersion=14.44.35228 -WindowsSDKVersion=10.0.26100.0
& "$ueRoot/Engine/Binaries/Win64/UnrealEditor-Cmd.exe" $uproject -run=Cook -TargetPlatform=Windows -CookAll -SkipZenStore -unversioned -unattended -nullrhi -nosound -notraceserver
```

Check each process exit and fresh cook logs before continuing; the shell snippet is not a failure-aware wrapper. Cook success does not prove stage completeness or runtime startup.

## Receipt staging and native UnrealPak

- [tested] A finite PowerShell stager read `Binaries/Win64/DeadRedline.target`. It copied executable/dynamic-library/required-resource build products and NonUFS runtime dependencies, skipped debug-only products, and built UFS entries from runtime receipt dependencies plus the actual cooked files. It rejected missing files and unsupported roots instead of guessing paths.
- [tested] Receipt roots `$(ProjectDir)` and `$(EngineDir)` mapped to the package's project-name and Engine directories. Cooked Metadata was excluded. Config and plugin config were staged deliberately. Native UnrealPak consumed a UTF-8 response list mapping sources to `../../../Project/...` and `../../../Engine/...`; the resulting 143484690-byte pak mounted at `../../../` in the actual game log.
- [tested] Staging also included Windows DDPI's **icudt64l** English ICU data at `Engine/Content/Internationalization/icudt64l`, Engine en localization, app-local VC/DirectX DLLs beside the executable, and an empty **Engine/Config/StagedBuild_DeadRedline.ini outside the pak**. The marker lets native startup find the staged project directory before mounting paks. Installed UAT staging source supplied these contracts; receipt DLLs alone were insufficient as a complete recipe.
- [tested] Source font OFL files and source metadata were copied from the exact archived tree into ThirdPartyNotices. Font binaries were already in cooked FontFace assets. The tested delivery totaled about 540 MB, including its 332 MB Development Game executable; this was not a size-optimized Shipping build.

```text
UnrealPak.exe DeadRedline-Windows.pak -Create=pak-response.txt -compress -UTF8Output
```

Every response entry quotes both paths, for example `"source-file" "../../../DeadRedline/Content/Maps/DeadRedline.umap"`. Keep non-UFS DLLs and the staged marker physically accessible. A direct native executable may live at `DeadRedline/Binaries/Win64/DeadRedline.exe`; do not assume a UAT-created root bootstrap exists. A small relative-path launch script can expose it to the player without requiring the Editor.

## Actual packaged runtime proof

- [tested] The **Game executable**, not UnrealEditor, ran title, race and functional scenarios offscreen on D3D12/RTX 5070 Ti. All three delivered fresh 1920×1080 PNGs and matching native JSON; the images were opened. The log mounted the staged pak. App-local runtime DLLs and both archived OFL notices were present.
- [tested] Race sampled eight cars, 14722 cm player displacement, 133.5 km/h and three grounded wheels. Functional sampled 12224 cm displacement, 60 shots, ammo zero and four grounded wheels. These establish sampled native motion/control-command/weapon execution. They do not establish a completed lap/race or physical keyboard/controller interaction.
- [general] Preserve visual GAP status, known HUD/world issues and open complete-race/input/audio/performance acceptance. A locally running native package does not establish cross-machine portability; another clean Windows machine remains a separate test.

## Pace audio captures

- [tested] UE5.8.2's fixed-step/benchmark branch bypasses frame waiting (`UnrealEngine.cpp`), so MaxFPS alone cannot pace it. For an isolated60Hz master recording, save FApp's fixed-step/benchmark flags and engine fixed-rate/FPS; during recording disable the former and enable engine fixed60FPS. Restore on normal stop and teardown. DEAD REDLINE observed19.65simulation seconds during20.0095wall seconds (ratio0.9820), with settings restored. Validate both clocks, intended tick rate and restoration beside WAV/EXE hashes. Use the project's intended rate rather than copying60 universally; restrict this to explicit captures. A normal-cadence excerpt is not a sustained-performance test or owner approval.
