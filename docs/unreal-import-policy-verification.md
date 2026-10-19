# Unreal import policy and read-back acceptance — 2026-10-19

Windows, Node 24.18.0, installed **Unreal 5.8.2 CL56702186**. All native writes were inside newly created disposable Temp fixture projects; no Dead Redline or other live project was touched. This is saved native import and read-back evidence, not gameplay, cook, rendering or visual acceptance. The Dead Redline mesh-pipeline worktree was read as the specification only.

## What was verified natively

| Case | Result |
|---|---|
| Kit GLB (three meshes) with `combineStaticMeshes:false`, `nanite:false`, `vertexColors:replace`, three `meshes` entries (rename, CPU access, full-precision UVs, project material, complex-as-simple collision, bounds / max-vertices / vertex-colour / UV-channel expectations) | Built in 15.7 s; three StaticMeshes named `SM_Tower`, `SM_Rotor`, `SM_Rubble`, no redirectors, no stray material; every read-back matched; `policy.pipeline.combineStaticMeshes` reported `DO_NOT_COMBINE` |
| Same config again | `reused` in 0.30 s, no Editor launch |
| A fresh Editor process reading the saved kit | Agreed with the receipt: trace flag, double-sided, full-precision UVs, CPU access, material slots, vertex colours |
| Config with a wrong Z bound, `maxVertices` 10, a missing node and a missing material | Exit 1, `IMPORT_EXPECTATIONS_FAILED: 7 mismatches` listing each; receipt written first with `policy.failures`; no pending journal; `--inspect` showed `needs-import`; the same failing config ran again (never reused); the corrected config replaced the outputs and was then reused |
| Single GLB, no `node`, `nanite:true`, `vertexColors:ignore`, `expect` for Nanite on, vertex colours absent, half-precision UVs and bounds | Built; `COLOR_0` was dropped under `ignore` (the option has an observable effect; `replace` is also the 5.8.2 default); the mesh was renamed from `single` to `SM_Barrel` |
| Compatibility: same GLB, `options:{}`, 0.12.0 helper against this candidate in separate project copies | Identical files, sizes and imported/saved asset lists; the candidate's native report only gains a `pipeline` key; no `policy` in the receipt. Package bytes differ between any two runs, including two runs of 0.12.0, so byte hashes cannot be compared |

Observed on this build: the static combine enum has `ALL`, `DO_NOT_COMBINE`, `VISIBLE_ONLY` and no `NONE`. The importer default is Nanite on, half-precision UVs, vertex colours `IVCIO_REPLACE`. `unreal.ObjectRedirector` is not exposed to Python, so the redirector guard compares the class name. These are local observations of this build. Details are in [the native evidence JSON](unreal-import-policy-native-proof.json).

## Host tests

`tests/unreal-import-policy.test.mjs` (13 cases): unchanged request and receipt without the new keys; the full config reaching the native request; 19 invalid configs rejected before any launch; each new option and per-mesh key changing the reuse identity; satisfied read-back stored in the receipt and reused; every mismatch listed and written to the receipt first; a failed policy never reused and a corrected one replacing it; missing read-backs, unmatched meshes and native-reported problems; options-only read-back; inspect naming the failures; and two native-script helpers (`resolve_enum`, `bounds_cm`) run in Python against a stub `unreal` module. The existing 209 checks still pass.

## Not verified

- No other engine build, no live game project, no cook, rendering or collision query. Complex-as-simple double-sided behavior (the ray counts) was measured by Dead Redline, not re-measured here.
- Skeletal meshes are not touched by the policy. FBX and external-file GLBs remain out of scope.
- The adoption path for a regenerated project is documented, not implemented or tested (see the reference page).
