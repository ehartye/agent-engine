# agent-engine

A Claude Code plugin of skills that helps choose a game engine or web stack for an agent-built project and glues the
asset plugins to it. It covers assets from [agent-sprites](https://github.com/ehartye/agent-sprites) (pixel sprites),
[agent-meshes](https://github.com/ehartye/agent-meshes) (rigged GLB models) and
[agent-beeps](https://github.com/ehartye/agent-beeps) (procedural sounds and music), and the targets Unity, Unreal
Engine 5, Godot 4, UEFN (Fortnite levels) and the web (Custom Canvas/WebGL, Phaser, three.js, React Three Fiber, Babylon.js).

It is deliberately small. It adds no runtime, importer framework or scene format. The skills orchestrate the engines'
existing MCP servers and the engines' own importers, and they collect the import traps that are otherwise scattered
across the asset plugins' docs.

Release 0.13.10 adds a dedicated [Niagara reference](skills/engine-asset-import/references/unreal-niagara.md) under the Unreal references, routed from the engine-asset-import skill and the visual-polish Unreal stack, with three Unreal 5.8 example scripts ([`examples/unreal`](examples/unreal/README.md)) that build a probe level, author a system through Epic's Experimental Niagara toolsets from Python, and count particles per emitter in a running level. Release 0.13.9 adds a merge-lane check that keeps home-directory paths, GPU model names, links into non-plugin repositories and wiki paths out of the repo. Release 0.13.8 removes the last game, project and GPU-model names from engine-asset-import (the UEFN and Unreal native references): what was observed in one consuming project is now labelled `[general]` and says it was not reproduced here, and `[tested]` is kept only where a script or test in this repo backs it. Release 0.13.7 removes game and machine names from the Phaser, Phaser-architecture, engine-selection, visual-polish and custom-shader skills (measurements from one project are now marked as reported, not reproduced) and fixes stale example links in engine-r3f. Release 0.13.6 rewrites the Babylon.js skill the same way, backed by a runnable Babylon.js example (5 Node tests, a 16-check GPU verifier) and an engine-owned-step API in the shared core. Release 0.13.5 rewrites the React Three Fiber skill as general lessons backed by a runnable R3F example with a 13-check GPU verifier; the game-specific systems are now generic references (flight controls, data-driven entities, part kits, procedural instanced fields). Release 0.13.4 adds [engine-neutral web 3D building blocks with node tests](examples/web3d/README.md) (fixed step, tap latches, swept hits, a ready-means-drawn probe, flight axis conventions) that reproduce the lessons the R3F and Babylon.js skills are being rewritten around. Release 0.13.3 moves the repository's internal write-ups (audits, verification notes, the proving-ground spec) into the project wiki so `docs/` keeps only the sample scene and its images. Release 0.13.2 starts making the skills lessons and best practices rather than one team's notes: the example verifiers choose the Chromium GPU backend by platform, committed receipts no longer carry local paths or project names, and internal work plans are gone. Release 0.13.1 adds a frame-budget profiling method ([engine-neutral, with Phaser/browser specifics](skills/engine-phaser/references/profiling-method.md)) and its Unreal counterpart ([native profiling](skills/engine-asset-import/references/unreal-native-profiling.md), [facts and traps](skills/engine-asset-import/references/unreal-native-profiling-facts.md)): decompose the frame, run an ablation matrix, derive a per-item cost table and prove a fix exact. The Unreal figures are one game's interim overnight matrix; no Phaser game has run the full matrix. Release 0.13.0 lets the same helper state a per-mesh Unreal import policy in its config (explicit Nanite, vertex-colour mode, uncombined kits, asset names, CPU access, full-precision UVs, a project material, double-sided complex collision) and reads every setting back from the saved asset into the receipt, failing the import with every mismatch listed; it documents what a game with a regenerated project must change to benefit from reuse. Release 0.12.0 adds [guarded Unreal project import reuse](skills/engine-asset-import/references/unreal-import-reuse.md): an unchanged delivered GLB and matching native outputs skip the Editor launch. Import settings, project/tool identities and all generated package files participate; owner-edited outputs are refused. This is a small orchestration helper using Unreal's importer, with Windows/self-contained GLB scope.

## Status

Early (0.13.10). Eight skills. Four targets are tested with the sample scene (a fox, a pixel campfire, a pixel courier,
a music bed and a one-shot): Unreal Engine 5.7.3 and 5.8.3, Godot 4.7.2, Unity 6000.3.25f1 and the web tier (Phaser
3.90.0 and three.js 0.186.1). The web 3D skills are backed by [`examples/web3d`](examples/web3d/README.md): engine-neutral core modules with node tests and a React Three Fiber app (three 0.186.1, @react-three/fiber 9.8.1) and a Babylon.js app (9.29.0), each with a verifier that checks renderer behaviour on a real GPU. Each imports the assets, runs with no errors, renders on the GPU and produces a screenshot;
the web and Unity passes also record which pickup variants played. The scene loops use scripts, not an MCP server.
Epic's MCP plugin was tried separately on Unreal 5.8.3 and UEFN 42.20: it drives the editor and returns screenshots, but
has no audio import and rejects GLB. One consuming UEFN 42.30 project additionally reported native Python authoring,
scoped actor saves, editor captures, automatic timeline playback and server controller-method
results, and native Python imports of Wave/Cue pairs with per-player playback settings (observed there, not
reproduced in this repo). A launch reached server cook but ended without a connected
game client. Physical button use, rendered reset poses, audible audio, multiplayer and performance remain open;
this does not establish a complete UEFN sample-scene pass.

The UEFN references cover [authoring routes](skills/engine-asset-import/references/uefn-authoring.md)
and [saved controls and capture](skills/engine-asset-import/references/uefn-native-operations.md),
plus [native FBX coordinates and collision](skills/engine-asset-import/references/uefn-native-fbx.md)
and [native audio import](skills/engine-asset-import/references/uefn-native-audio.md).
The saved-controls reference also records the measured Fortnite Button component
reconstruction trap and a verified whole-vector MCP write with complete readback.
It also documents the measured native rotation constructor trap: use named axes
and verify the visible mesh's world front and up directions before scoped saves.
The [moving exhibit cover reference](skills/engine-asset-import/references/uefn-native-cover.md)
records the source-fitted chair pilot, bone-policy ordering, study-owned collision,
independent source-corner checks and failures that self-derived surface rays missed.
Its saved/editor proof remains separate from Fortnite gameplay and performance.
The saved-controls reference also records exact disposable-proof ownership,
hash-bound cleanup reconciliation and the observed Python-before-Unreal GC recovery,
with preserved failed receipts and no force-deletion or automatic replay.

The [Unity project workflow](skills/engine-asset-import/references/unity-project-workflow.md)
covers Unity as a long-running agent project: a test and screenshot loop that
cannot report a failed compile as a pass, sharing engine-free logic with plain
.NET, references that silently break when a model is re-imported, and
passthrough scene checks (a light, a transparent camera clear). The generic
[project driver](examples/unity/project-driver/run.sh) runs that loop. Headset
behaviour is listed as not verified.

The [Python helper reference](skills/engine-asset-import/references/uefn-python-helper-freshness.md)
records stale imports in a running editor, source identity checks and binding
functions after an owned helper reload, backed by a disposable native probe.

The [native Unreal game recipe](skills/engine-asset-import/references/unreal-native-game.md)
records a separate 5.8.2 C++ build and actual offscreen game-camera loop, with fresh automation JSON checks
because failed tests can exit zero. Its [presentation companion](skills/engine-asset-import/references/unreal-native-presentation.md)
covers the measured font/Slate commandlet crash, crisp Canvas glyph sizing, physical camera exposure and HDR palette traps.
The [Windows packaging reference](skills/engine-asset-import/references/unreal-native-packaging.md)
records an actual staged Game EXE separately from Editor-game evidence, including the UAT Application Control failure.
The [content pipeline](skills/engine-asset-import/references/unreal-native-content-pipeline.md)
records the tested content-only bake/native Game split, short-path cook fix and recipe/hash validation.

The [native exterior reference](skills/engine-asset-import/references/uefn-native-exterior.md)
records installed material pin discovery, sky collision readback, automatically
derived LevelBounds and a separately identified folder save. It keeps exact
package ownership, source-font dependencies and editor point queries distinct
from current Fortnite cook, navigation and performance acceptance.

## Skills

| Skill | Job |
|---|---|
| `engine-selection` | Choose an engine or web stack (Custom, Unity, Unreal, UEFN, Godot, Phaser, three.js, Babylon.js, PlayCanvas) by weighing how easily an agent can drive and verify it against quality and reach, with evidence labels and limits per option. |
| `engine-asset-import` | Import sprite atlases, GLB models and WAV exports into an engine project, with the known traps per engine and a strict line between verified and documented. Includes a [Niagara reference](skills/engine-asset-import/references/unreal-niagara.md) for Unreal 5.8: which authoring routes are Python and which are C++ only, Epic's Niagara toolsets, MCP tools, and particle counts from a simulation cache. |
| `engine-phaser` | Build, structure, debug and verify a Phaser 3 or 4 game: a headless sim with Phaser as the view, chunked tilemap streaming, the Phaser 4.2.1 GPU-layer bugs and their workarounds, real-GPU pixel verification, and how agent-sprites and agent-beeps output wires in. Includes a one-page Phaser best-practices reference (scenes, the fixed-step loop, tilemaps, lighting, particles, pixel-perfect UI, input, audio directors, performance) with the 4.2.1 evidence behind each rule. Backed by Phaser 4.2.1 source checks, patch tests and the [Phaser harness and probes](examples/web/README.md). |
| `phaser-architecture` | Coordinate shared contracts, themed dialogs/extensions, playbot evidence and testing/publication costs across Phaser games and owned tools. Portable guidance with explicit existing/planned boundaries; adds no shared UI, playbot runtime or cloud service. |
| `engine-r3f` | Build, structure, debug and verify a React Three Fiber game: the frame loop beside React state, agent-meshes parts assembled by socket, toon shading with outlines and instancing, particles and explosions, hit tests and physics, audio, flight controls, data-driven entities, part kits, controller-navigable menus, procedural instanced fields, a state probe with an asserted backend, WebGPU and headless Chromium, and versions and migrations. Backed by [`examples/web3d`](examples/web3d/README.md): node tests plus an R3F app with a GPU verifier. |
| `engine-babylon` | Build, structure, debug and verify a Babylon.js game: handedness, agent-meshes parts assembled by socket, cell shading and outlines, Havok, particles, observables and deterministic lockstep, the inspector, audio, bundle size, a state probe with an asserted backend, and versions. Backed by [`examples/web3d`](examples/web3d/README.md): node tests plus a Babylon.js app with Node convention tests and a GPU verifier. |
| `engine-custom-shaders` | Add GPU effects to an owned renderer, starting with Canvas/WebGL: pixel sampling, pass order, trails, context lifecycle and screenshot/performance proof. Custom is an engine type; this path is documented, not sample-tested. |
| `engine-visual-polish` | Improve genre-specific visual quality in an existing game through composition/material diagnosis, authored effect families and one matched runtime slice. Includes racer, shooter and platformer craft plus a focused Unreal materials/Niagara/AA/scalability reference. Documentation and craft guidance; runtime integration and quality improvement remain unverified. |

## Sample scene

The [Phaser WebGL reference](skills/engine-phaser/references/webgl-backends.md) distinguishes official WebGL 2 support from
4.2.1's default WebGL 1 context, covers ES3 custom-shader setup and keeps Phaser AE's separate API clear. The referenced
GL1/GL2 probe from one project is bounded pixel/API evidence, not a full sample-scene or performance claim.

[`docs/sample-scene.md`](docs/sample-scene.md) defines one scene built from reused assets (a fox, a pixel courier, a
pixel campfire, a music bed and a one-shot) and a ladder of checks: import, clean run, screenshot, audio state. It is the
acceptance test for the skills. Each engine has to pass it. Scripts are in `examples/` (`unreal`, `godot`, `web`,
`campfire`).

## Checking the skills

Run `node scripts/check.mjs` locally before pushing or merging (Node 20.11 or newer, no dependency install). It runs all Node tests in `scripts/` and `tests/`, the web verification and no-sleeps tests, and strict lint of the four scoped newer skills. It exits on failure and works from any current directory when invoked by its path.

This project is in **dev** mode: local merge checks are the gate. CI (`.github/workflows/lint-skills.yml`) is one non-required Linux observer on ready pull requests, with path filters, cancellation of superseded runs and a five-minute job timeout. It also runs weekly, manually and on `v*` release tags. Merging does not start a duplicate run on `main`; draft pull requests skip the job until ready for review.

`scripts/lint-skills.mjs` checks frontmatter, relative links, the "You are about to / Read" table, size budgets, placeholders and evidence labels. Strict lint covers `engine-r3f`, `engine-babylon`, `phaser-architecture` and `engine-visual-polish`; the older skills still have label-rule backlog. Browser/GPU sample-scene acceptance remains a separate, explicitly set up run. Structural checks do not establish that a skill improves an agent's work or that a visual slice passes runtime review.

## Install

```text
/plugin marketplace add ehartye/hartye-claude-plugins
/plugin install agent-engine@hartye-plugins
```

## Requirements

The skills need nothing installed themselves. Checking an import needs the engine (for Unreal meshes, also the
agent-meshes `verify-unreal` command), or Chromium through Playwright for the web tier.

## License

MIT
