# agent-engine

A Claude Code plugin of skills that glues the asset plugins to game engines. It covers assets from
[agent-sprites](https://github.com/ehartye/agent-sprites) (pixel sprites),
[agent-meshes](https://github.com/ehartye/agent-meshes) (rigged GLB models) and
[agent-beeps](https://github.com/ehartye/agent-beeps) (procedural sounds and music), and the
engines Unity, Unreal Engine 5 and Godot 4.

It is deliberately small. It adds no runtime, importer framework or scene format. The skills
orchestrate the engines' existing MCP servers and the engines' own importers, and they collect the
import traps that are otherwise scattered across the asset plugins' docs.

## Status

Early (0.2.0). Two skills. Unreal Engine 5.7.3 is the only engine tested: the sample scene (a fox, a pixel
campfire, a pixel courier, a music bed and a one-shot) imports, runs with no errors, renders offscreen on
the GPU and produces a screenshot. No engine MCP server was used in that loop. Godot is installed but
untested; Unity, UEFN and the web stacks are untested. The skills say this plainly and do not claim more.

## Skills

| Skill | Job |
|---|---|
| `engine-selection` | Choose an engine or web stack (Unity, Unreal, UEFN, Godot, Phaser, three.js, Babylon.js, PlayCanvas) by weighing how easily an agent can drive and verify it against quality and reach, with evidence labels and limits per option. |
| `engine-asset-import` | Import sprite atlases, GLB models and WAV exports into an engine project, with the known traps per engine and a strict line between verified and documented. |

## Sample scene

[`docs/sample-scene.md`](docs/sample-scene.md) defines one scene built from reused assets (a fox, a
pixel courier, a pixel campfire, a music bed and a one-shot) and a ladder of checks: import, clean run, screenshot,
audio state. It is the acceptance test for the skills. Each engine has to pass it.

## Install

```text
/plugin marketplace add ehartye/hartye-claude-plugins
/plugin install agent-engine@hartye-plugins
```

## Requirements

The skills need nothing installed themselves. Checking an import needs the engine, and for Unreal
meshes the agent-meshes `verify-unreal` command.

## License

MIT
