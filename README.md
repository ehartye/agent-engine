# agent-engine

A Claude Code plugin of skills that helps choose a game engine or web stack for an agent-built project and glues the
asset plugins to it. It covers assets from [agent-sprites](https://github.com/ehartye/agent-sprites) (pixel sprites),
[agent-meshes](https://github.com/ehartye/agent-meshes) (rigged GLB models) and
[agent-beeps](https://github.com/ehartye/agent-beeps) (procedural sounds and music), and the targets Unity, Unreal
Engine 5, Godot 4, UEFN (Fortnite levels) and the web (Custom Canvas/WebGL, Phaser, three.js).

It is deliberately small. It adds no runtime, importer framework or scene format. The skills orchestrate the engines'
existing MCP servers and the engines' own importers, and they collect the import traps that are otherwise scattered
across the asset plugins' docs.

## Status

Early (0.6.0). Four skills. Four targets are tested with the sample scene (a fox, a pixel campfire, a pixel courier,
a music bed and a one-shot): Unreal Engine 5.7.3 and 5.8.3, Godot 4.7.2, Unity 6000.3.25f1 and the web tier (Phaser
3.90.0 and three.js 0.186.1). Each imports the assets, runs with no errors, renders on the GPU and produces a screenshot;
the web and Unity passes also record which pickup variants played. The scene loops use scripts, not an MCP server.
Epic's MCP plugin was tried separately on Unreal 5.8.3 and UEFN 42.20: it drives the editor and returns screenshots, but
has no audio import and rejects GLB. UEFN 42.30 museum work additionally verified native Python authoring,
scoped actor saves, editor captures, automatic playback on 12 timelines and 156 server controller-method
results. Native Python also imported and saved five museum Wave/Cue pairs, and personal gallery
playback settings/bindings are verified. A launch reached server cook but ended without a connected
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

The [native exterior reference](skills/engine-asset-import/references/uefn-native-exterior.md)
records installed material pin discovery, sky collision readback, automatically
derived LevelBounds and a separately identified folder save. It keeps exact
package ownership, source-font dependencies and editor point queries distinct
from current Fortnite cook, navigation and performance acceptance.

## Skills

| Skill | Job |
|---|---|
| `engine-selection` | Choose an engine or web stack (Custom, Unity, Unreal, UEFN, Godot, Phaser, three.js, Babylon.js, PlayCanvas) by weighing how easily an agent can drive and verify it against quality and reach, with evidence labels and limits per option. |
| `engine-asset-import` | Import sprite atlases, GLB models and WAV exports into an engine project, with the known traps per engine and a strict line between verified and documented. |
| `engine-phaser` | Build, structure, debug and verify a Phaser 3 or 4 game: a headless sim with Phaser as the view, chunked tilemap streaming, the Phaser 4.2.1 GPU-layer bugs and their workarounds, real-GPU pixel verification, and how agent-sprites and agent-beeps output wires in. Backed by a large Phaser 4 game (Fallow Valley). |
| `engine-custom-shaders` | Add GPU effects to an owned renderer, starting with Canvas/WebGL: pixel sampling, pass order, trails, context lifecycle and screenshot/performance proof. Custom is an engine type; this path is documented, not sample-tested. |

## Sample scene

[`docs/sample-scene.md`](docs/sample-scene.md) defines one scene built from reused assets (a fox, a pixel courier, a
pixel campfire, a music bed and a one-shot) and a ladder of checks: import, clean run, screenshot, audio state. It is the
acceptance test for the skills. Each engine has to pass it. Scripts are in `examples/` (`unreal`, `godot`, `web`,
`campfire`).

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
