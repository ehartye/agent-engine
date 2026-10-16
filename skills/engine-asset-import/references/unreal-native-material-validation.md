# Native material cook and UV validation

Scope: DEAD REDLINE, Windows Unreal5.8.2 CL56702186,2026-10-16. Preserve failed native logs alongside successful receipts; saved graph assets and process exit codes alone do not establish usable runtime shaders.

## A zero-exit cook can substitute DefaultMaterial

- [tested] `art-bake-20261016T190610842-5efcb8/cook.log` reported `Failed to compile Material /Game/Art/M_MuzzleFlash.M_MuzzleFlash` and default-material substitution, although the Cook process exited0. Its HLSL Custom expression declared `float triangle`, a reserved HLSL keyword. The staged package was rejected for visual acceptance. Renaming the variable requires a fresh cook and native visual check.
- [general] Keep a source-owned complete required-material list. Reject compilation failure or invalid ShaderMap warnings for those exact owned paths/hierarchies. Bind validation to the actual cook process's project and `-abslog`, retain the log hash, and verify list completeness on reuse. An unrelated clean log or a receipt list omitting the failed material cannot certify the cook. Check the final game render separately.

## Imported UV channels need an explicit contract

- [tested] Blender Reaper Body/Wheel/Gun GLBs exported both `TEXCOORD_0` and `TEXCOORD_1`. Channel0 was primitive UVMap; channel1 was authored PhysicalRepeat. Reading channel0 made vehicle distress differ from the intended physical scale. The190610 full Editor import reported two native UV channels for all three controls through `StaticMeshEditorSubsystem.get_num_uv_channels(mesh,0)`.
- [documented] Installed `GLTFMeshFactory.cpp:642–650` preserves UV index. `StaticMeshEditorSubsystem.h:500` exposes the UV-channel count as BlueprintCallable. Inspect actual exported accessors and imported counts; do not infer their meaning merely from a nonempty UV array. The Reaper's authored convention uses two UV units/metre, so its material uses coordinate index1 and multiplies by0.5. Those numbers are asset-specific.

See [content-only construction](unreal-native-content-pipeline.md) and [native presentation](unreal-native-presentation.md). These observations are consuming-project evidence; they do not establish published plugin capability or final art fidelity.
