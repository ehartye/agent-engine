# Profiling a native Unreal game against a frame budget

DEAD REDLINE, Windows, 2026-10-20, Unreal **5.8.2 CL56702186**, packaged Development build, D3D12, RTX 5070 Ti Laptop GPU, 1920x1080 for rendered runs. The steps are the engine-neutral method in [profiling method](../../engine-phaser/references/profiling-method.md) (budget, ablation for diagnosis, cost model, who approves a fix, right-sized verification); this file is the Unreal harness and what it measured. [Profiling facts and traps](unreal-native-profiling-facts.md) holds the shadow-check evidence, engine-source facts and tooling traps. The overnight matrix was still running when this was written, so phase F numbers are interim.

## Build the sampler into the game, and into the baseline

- [tested] A scripted eight-car race (`-DRScenario=rivalrace`, fixed seed per route, `-Deterministic -FPS=60`) writes `rivalrace.json` with a `perf` block: wall frame time, `GGameThreadTime`, `GRenderThreadTime`, `RHIGetGPUFrameCycles()`, `GNumDrawCallsRHI[0]`, each as mean, p50, p95 and max. An 8 s warm-up is discarded. The engine thread timings are those of the previous frame, so compare runs, not machines.
- [tested] The first baseline package had no sampler, so only the experimental side reported. Build the sampler into the unchanged baseline too, and keep that package out of any prune script (`prune-builds.ps1` once deleted it).
- [tested] `-FPS=` is the fixed simulation step, not a frame-rate cap. Frames ran unthrottled: the rendered 120 Hz step cost 13.8 ms per frame on Spill against 13.5 ms at 60 Hz, so per-frame cost does not depend on the step. Report frame cost and race clock; never divide frames by simulated time and call it FPS.

## Decompose first

- [tested] Rendered, 60 Hz step, five repeats (`gpu-base`): GPU 0.78 to 1.02 ms on every route, render thread 1.9 to 2.9 ms, game thread within 0.01 to 0.04 ms of the wall frame (about 99.6%). Mean frame ms (p95): Cinder 5.4 (6.7), Foundry 6.5 (7.9), Red Mesa 7.9 (9.8), route 3 8.2 (10.2), route 2 9.1 (11.3), route 1 9.4 (12.7), Spill 13.5 (16.5). The budget is 8.33 ms: Cinder and Foundry pass on the mean, Spill needs about 5 ms back. The cost is game-thread CPU, so culling, instancing and Nanite choices cannot reach it alone.
- [tested] Headless (`-nullrhi -DRBenchHeadless`, no GPU needed) means, traced: Cinder 4.06, Foundry 4.92, Spill 10.6 ms, spread under 0.5 ms. Rendered less headless is the cost of render state and submission: 1.4, 1.6 and 2.9 ms. An interim estimate of about 4 ms, from partial single runs, was not reproduced by the matrix. Use headless for attribution, rendered for acceptance.

## The diagnosis harness (in the game repository; heavier than shipping a fix needs)

- [tested] `Scripts/profile-race.ps1` runs one packaged race with `-trace=cpu,frame,counters,bookmark,region,log` (plus `gpu` when rendered), then exports per-timer statistics with `UnrealInsights.exe`. `Scripts/profile-matrix.ps1` loops phases and appends one line per race to `Saved/Bench/PROGRESS.md`; `summarize-matrix.py` and `summarize-profile.py` aggregate; `export-matrix-receipt.py` condenses the runs into a committed `runs.csv`.
- [tested] One race at a time, never two rendered races at once. A race whose mean is over 1.25 times the median of its earlier repeats is flagged, and phase R reruns flagged races. A row that writes no receipt is logged as FAILED; a minimum-free-disk guard skips runs rather than failing mid-write.
- [tested] Phases ran overnight: baselines on all seven routes, rendered and headless ablation on Spill, Cinder and Foundry, Red Mesa rivals-only (the scripted human slot is wrecked at about 39 s there), prototypes, and fixes combined with +50% growth. That scale answered "where does the time go"; it is not the bar for shipping a fix.
- [tested] Switches (`-DRExp=noeffects,noscenery,nohazanim,nohazards,nopilothaz,noactors,noaudio,flames=0.5,scenery=1.5,effects=1.5,props=300,yards=1`) live on a branch marked EXPERIMENT ONLY and never merged. State what a scale switch scales: `effects=` scales the spawn rate only, because the pooled meshes are built per slot.

## What the ablation showed (Spill, headless, four repeats each)

| Row | Frame ms | Delta |
|---|---|---|
| base | 10.61 | |
| nopilothaz (pilot hazard layer) | 7.11 | -3.50 |
| noactors | 8.90 | -1.71 |
| nohazards (puddle actor ticks) | 8.92 | -1.69 |
| noscenery | 10.28 | -0.33 |
| noeffects | 10.45 | -0.16 |
| nohazanim, flames=0.5, noaudio | 10.44, 10.50, 10.51 | -0.17, -0.11, -0.10 |
| scenery=1.5 | 10.76 | +0.15 |

- [tested] Spill is 6 ms heavier than Cinder mostly because of puddles: the pilot's hazard layer (78 puddles x 16 stations x 31 lanes, computed twice per car per frame) and the puddle actors' per-tick contact tests. Effects, scenery animation and audio were each under 0.35 ms headless.
- [tested] Rendered rows were too noisy to rank small effects (Spill baseline 12.3 to 14.4 ms over three repeats; "noeffects" read slower than base). Draw calls were the clearer rendered signal (498 to 418 without effects).
- [tested] Scale rows `effects125` and `effects150` wrote no result (no receipt after 8 to 10 s) in phases B and C. A later commit redefined the switch to scale spawn rate only, since the pooled meshes are built per slot and capacity cannot grow. With that, rendered `gpuexp2` showed Spill 13.10 to 13.29 to 12.30 ms for base, 1.25x, 1.5x, the last below base: within noise, so the cost model supplies the number.

## Per-item cost model (headless Insights timers, Development build, 60 Hz, spread under 3%)

| Class | Items | Cost | Scales with | Game thread ms |
|---|---|---|---|---|
| Pooled effect, per tick | about 105 live (13 per car) | about 0.5 us each (Move 0.34, Scale 0.25 us per call) | live effects | 0.07 |
| Pooled effect, spawn | 8 acquires/frame | 1 to 17 us per spawn by kind | spawn events | 0.03 |
| Spill flame | 332 | 0.71 us (2 transform calls) | items, every frame | 0.24 |
| Spill pumpjack | 20 | 5.1 us (15 calls) | items | 0.10 |
| Puddle actor tick | 78 | 20 us, 0.98 us of it animation | puddles x 8 cars | 1.57 |
| Puddle in pilot loop | 78 in view | 3.18 ms total | puddles x stations x lanes x 2 passes x 8 cars | 3.18 |
| Foundry machine | 10 | 43 us per tick | machines | 0.43 |
| Vehicle | 8 | 91 to 150 us per car; suspension trace 13 to 26 us each | cars | 0.73 to 1.20 |
| Track queries | about 40 per frame | 16 to 19 us each | same cars asked 4 to 5 times | 0.65 to 0.78 |

- [tested] Tracing costs 5 to 8%: untraced Spill/Cinder/Foundry 9.7/3.6/4.4 ms against traced 10.2/3.9/4.7. Take the headline number untraced.
- [general] Budget at 1.25x and 1.5x is cost per item times the count. Computed from the table, not measured: flames 0.24 becomes 0.30 and 0.36 ms, pumpjacks 0.10 becomes 0.125 and 0.15, puddle actor ticks 1.57 becomes about 1.96 and 2.36, the pilot layer 3.18 becomes at least 3.98 and 4.77 (pairwise and per-lane terms grow faster than the count).
- [tested] That headless model under-predicts rendered cost. Rendered Spill with scenery 1.5, effects 1.5 and props 300, unfixed, rose from 13.96 to 16.04 ms (p95 21.5), render thread 2.84 to 3.65 ms and draws 498 to 571, two repeats each, interim. Add a rendered scale row before promising a content budget.

## Result of the fixes, interim (phase E and F, Spill rendered, three repeats)

- [tested] Headless Spill, prototypes alone: pilot hoist 7.33, puddle far-reject 9.01, nearest-distance memo 9.88, merged effect transform 10.61 (no gain, do not ship), all 5.03 ms against 10.57 off. Rendered, all exact prototypes cut Spill 13.06 to 7.18 ms, Cinder 5.36 to 4.72, Foundry 6.75 to 5.67.
- [tested] With +50% growth the exact set gave 7.79 ms mean but p95 10.05, still above 8.33. A non-exact scenery-distance skip gave 7.23 against 7.19 without it (no gain, within noise). Foundry, Cinder and routes 1 to 3 growth rows were still running.

## Right-sized verification

- [general] Ship a fix when it is a good idea architecturally and you are reasonably sure it does not make the game worse. Verification scales with blast radius, not with the diagnosis harness above.
- [general] The bar: the project's own automation tests, the in-game shadow check ([facts](unreal-native-profiling-facts.md)) when the fix is claimed exact, and before and after frame time on the three worst routes by frame time (here Spill, route 1, route 2), two runs each. One independent verifier per PR, merge when it passes, and a one-paragraph rollback note in the PR.
- [general] Not required: per-route sweeps, noise-floor studies, multi-verifier panels. Behaviour-changing fixes need the owner's approval whatever the number of runs.
