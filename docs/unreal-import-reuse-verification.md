# Unreal import reuse acceptance — 2026-10-19

Windows, Node24.18.0, installed **Unreal5.8.2 CL56702186**. All native writes were inside newly created disposable Temp fixtures; no Dead Redline or other live project was modified. This is saved native import/reuse evidence, not gameplay, cook, animation playback or visual acceptance.

| Case | Result | Seconds |
|---|---|---:|
| Cold delivered cube | Saved mesh + owned pipeline, complete disk hashes | 16.402 |
| Same cube | Reused, no Editor launch | 0.274 |
| Changed delivered GLB | Rebuilt | 16.121 |
| Deleted native mesh package | Rebuilt | 15.973 |
| Force | Rebuilt | 15.964 |
| Unchanged after force | Reused, no Editor launch | 0.194 |
| Owner-edited native mesh | Conflict even with force; edited bytes preserved | — |
| Fox skeletal/material fixture | Saved20packages, including mesh, skeleton, physics asset, material, embedded texture,14 animations and owned pipeline | 15.974 |
| Same fox | Reused, no Editor launch | 0.250 |

Complete per-case output hashes and exact operation identities are retained in [the native evidence JSON](unreal-import-reuse-native-proof.json) and the local evidence directory `C:/Users/ehart/AppData/Local/Temp/ae-import-r3-20261019`; each operation retains its native report/log and previous-output backup. The cube's delivered GLB changed from SHA-256 `03b842fae619298c4d3f8f81d264e98c3311d7c257d20560a87361ecf9886cfb` to `5b1744247d01ffdd8f00eab368c3e18feb50f90fb15432e151c4b9c4ef7e5319`. The fox GLB was `1e01b7c224fa135ead67978a0840d115e99a959f9f745384e7b308f173dfebf2`. Timings are a single local sample, not a performance guarantee.

The first fixture's initial startup generated Config/DefaultInput.ini. The source-stability guard refused to publish that changed-input build and kept its pending report in `Temp/ae-import-20261019`. A second fresh fixture included the observed default configuration and passed. That failure was retained; no uncertain operation was replayed or auto-adopted.

The native table and helper hashes describe candidate9e1bd64. The later pending-inspection correction815501f adds a failing-then-passing host regression: recovery remains inspectable after its source GLB is removed. It changes host recovery diagnostics, not the native Python script; final versioned/installed acceptance is recorded separately.

The original ten focused filesystem/process contracts pass, including the RED/GREEN broken-junction and cross-destination pending-operation regressions. The existing CI Node invocation plus this helper passes **208/208** in5.43s, all four scoped strict skill lints pass, native Python AST parsing and `git diff --check` pass. The asset-import skill's broad lint has93 existing legacy findings; filtering for the new reference reports zero. The single new SKILL.md row was structurally checked; a paired agent activation trial is not claimed.

The host and native script deliberately expose a limited identity surface. Declared inputs are not a complete Python/plugin/environment dependency graph; no undeclared-read audit, custom pipeline support, engine migration or universal cache-safety claim follows from these tests.
