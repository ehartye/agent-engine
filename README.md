# agent-engine

A Claude Code plugin of skills that helps choose a game engine or web stack for an agent-built project and glues the
asset plugins to it. It covers assets from [agent-sprites](https://github.com/ehartye/agent-sprites) (pixel sprites),
[agent-meshes](https://github.com/ehartye/agent-meshes) (rigged GLB models) and
[agent-beeps](https://github.com/ehartye/agent-beeps) (procedural sounds and music), and the targets Unity, Unreal
Engine 5, Godot 4, UEFN (Fortnite levels) and the web (Phaser, three.js).

It is deliberately small. It adds no runtime, importer framework or scene format. The skills orchestrate the engines'
existing MCP servers and the engines' own importers, and they collect the import traps that are otherwise scattered
across the asset plugins' docs.

## Status

Early (0.4.0). Two skills. Three targets are tested with the sample scene (a fox, a pixel campfire, a pixel courier,
a music bed and a one-shot): Unreal Engine 5.7.3, Godot 4.7.2 and the web tier (Phaser 3.90.0 and three.js 0.186.1).
Each imports the assets, runs with no errors, renders on the GPU and produces a screenshot; the web pass also checks the
pickup variants. No engine MCP server was used in any loop. Unity and UEFN are untested. The skills say this plainly and
do not claim more.

## Skills

| Skill | Job |
|---|---|
| `engine-selection` | Choose an engine or web stack (Unity, Unreal, UEFN, Godot, Phaser, three.js, Babylon.js, PlayCanvas) by weighing how easily an agent can drive and verify it against quality and reach, with evidence labels and limits per option. |
| `engine-asset-import` | Import sprite atlases, GLB models and WAV exports into an engine project, with the known traps per engine and a strict line between verified and documented. |

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
