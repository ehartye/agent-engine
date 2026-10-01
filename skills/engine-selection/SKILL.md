---
name: engine-selection
description: Choose a game engine or web stack (Unity, Unreal, UEFN for Fortnite, Godot, Phaser, three.js, Babylon.js, PlayCanvas) for a project built with AI agents, weighing how easily an agent can drive and verify it against output quality and reach, with each option's limits.
when_to_use: Use when asked which engine to use, to compare engines, to start a new game or level project, about making Fortnite levels or UEFN, or whether three.js is an engine; also before promising that an agent can build or verify something in a given engine.
---

# Choosing an engine for agent-built projects

The choice trades two things that pull against each other: how far an agent can get without a
person, and how good and far-reaching the result can be. Settle the hard constraints first, then
trade the rest. Tag every claim you pass on as **tested here**, **documented** (vendor or project
docs) or **general knowledge**. Never present the last two as the first.

## Step 1: hard constraints decide before any trade-off

| Constraint | Consequence |
|---|---|
| The result must run inside Fortnite | UEFN is the only path. Go to its profile before promising anything. |
| It must run in a browser, or anywhere with no install | Web stack (Phaser for 2D, three.js or an engine for 3D). |
| Console or high-end 3D visuals | Unreal is the usual candidate (general knowledge). |
| Must ship to many native platforms from one project | Unity or Godot. |
| The owner must sign in or hold a licence for unattended runs to work | Note it now. It caps what an agent can do alone. |

## Step 2: score "easy for an agent" on five signals

1. **Unattended loop.** Can the agent build, run, screenshot and read logs with no person present?
2. **Diffable project.** Are scenes and settings text, or binary assets an agent cannot review?
3. **Import path.** Do the plugins' GLB, atlas and WAV files have a working route in?
4. **Proof.** What can be checked by a machine, and what only by looking?
5. **Friction outside the agent.** Installs, sign-in, licences, API churn, iteration time.

## Step 3: weigh quality and reach

Visual and performance ceiling, 2D or 3D fit, animation and audio tooling, platforms, and who can
play it. The profiles give what is known per option.

## Quick picks (judgment, from the evidence in the profiles)

| Stack | Agent autonomy | Quality and reach | Main limit |
|---|---|---|---|
| Web: Phaser, three.js | Highest, and tested: headless Chromium on the GPU, text project, no sign-in, about 12 s per pass | Any browser. 2D strong, 3D moderate | Browser performance ceiling; no native or console |
| Godot | High, and tested: one-command install, headless build, windowed run in about 12 s | Strong 2D, good 3D | Smaller high-end 3D ceiling; best MCP needs Godot 4.7+ |
| Unreal | Medium: works unattended, but heavy and slow to iterate | Highest visual ceiling | Install weight, minute-long loops, binary assets |
| Unity | Medium, and tested: headless build and run work once licensed, but the sign-in is a hard gate | Widest platform reach | Interactive licence sign-in; glTF needs a package; windows may not present in some sessions |
| UEFN | Lowest unattended; official MCP exists | Fortnite only, inside Verse and a memory budget | Sign-in and a running Fortnite client |

## Rules

- **Three.js is a 3D library, and "not an engine" is a fair description, not a verdict.** It gives a scene graph,
  cameras, lights, materials, loaders, animation playback and thin Web Audio wrappers, and leaves physics,
  entities, input, flipbooks and game loop structure to you (tested: the web sample scene needed hand-written
  sprite animation, movement and triggers). Engines built on it exist: Needle Engine (Unity or Blender authoring)
  is the closest; react-three-fiber is a React renderer over it. Babylon.js and PlayCanvas are separate engines,
  not built on three.js.
- Recommend one option and say what it gives up. Do not list five and stop.
- When a question is open (for example whether a GLB imports with its skin intact), propose a
  one-hour spike with the [sample scene](../../docs/sample-scene.md) and say what it will settle.
- A screenshot is the only check that catches wrong scale, facing and pivots. Require one.

Per-engine evidence, traps and blockers: [engine profiles](references/engine-profiles.md).
