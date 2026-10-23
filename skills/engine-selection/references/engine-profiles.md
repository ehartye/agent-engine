# Engine profiles

Dated 2026-09-30. Tags: **[tested]** ran on the dev machine (Windows 11, a discrete GPU), **[documented]**
read in vendor or project docs, **[general]** general knowledge not checked here. Re-check anything
not tagged [tested] before relying on it.

Contents: [Sessions](#before-any-of-these-is-the-shell-interactive) | [Custom](#custom-engine-owned-canvaswebgl-runtime) | [Godot](#godot-47) | [Unity](#unity) | [What to check first](#what-to-check-first). Unreal and UEFN: [engine-profiles-unreal.md](engine-profiles-unreal.md). Web stacks: [engine-profiles-web.md](engine-profiles-web.md).

More profiles:

| Section | File |
|---|---|
| Unreal Engine 5.7 | [engine-profiles-unreal.md](engine-profiles-unreal.md) |
| UEFN (Unreal Editor for Fortnite) | [engine-profiles-unreal.md](engine-profiles-unreal.md) |
| Web stacks | [engine-profiles-web.md](engine-profiles-web.md) |

## Before any of these: is the shell interactive?

- [tested] The agent's shell on the dev machine ran in Windows session 0, a non-interactive service session
  (`(Get-Process -Id $PID).SessionId` is 0 and `[Environment]::UserInteractive` is false), while Explorer and
  the Epic Launcher ran in session 1, the user's desktop. There, windowed rendering fails (Unreal D3D12 and
  Unity D3D12 and D3D11 with 0x887A0022 or "Switching to resolution failed", Unity Vulkan crashed) and screen
  capture fails ("The handle is invalid"). Offscreen modes work: Unreal `-RenderOffScreen`, Unity `-batchmode`
  without `-nographics`, headless Chromium, Godot's Vulkan window. Check this first and pick the mode to match.
- [tested] A GUI app can be started on the user's desktop from session 0 with a one-shot scheduled task that
  runs interactively as the user (`schtasks /create /tn <name> /tr <cmd> /sc once /st 23:59 /it /ru <user>`, then
  `/run`, then `/delete`). It cannot click for you: sign-ins and "new project" dialogs still need the user.

## Custom engine (owned Canvas/WebGL runtime)

Added 2026-10-04. This is an engine type for a project's own game loop, gameplay
systems and renderer, not a new packaged engine.

- [documented] WebGL accepts Canvas/OffscreenCanvas texture sources through
  [`texImage2D`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D).
  An existing Canvas world can feed a GPU shader stage without adopting Phaser.
- [general] Text code, static hosting and browser inspection make this suitable for
  agent-driven iteration, subject to verifying the actual run/log/screenshot loop.
- [documented] GPU upload/composition and blocking readbacks have costs; see
  [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
  Shader execution alone is not evidence of improved complete frame times.
- [general] The project retains exact pixel/palette control but owns input, scenes,
  audio, physics, asset loading and GPU lifecycle to the extent it uses them.
  Native distribution requires additional tooling; no native exporter is supplied.

**Proof status:** custom GPU guidance is documented, not sample-tested. Existing
Phaser/three.js sample results do not verify this route. For runtime effects, read
[custom engine shaders](../../engine-custom-shaders/SKILL.md) and prove identity,
effect appearance, temporal reset and complete-frame performance in the target game.

## Godot 4.7

- [tested] One command installs it on Windows (`winget install GodotEngine.GodotEngine`, 4.7.2). The sample
  scene built headless in seconds (`--import`, then a `--script` builder) and ran in a window on Vulkan,
  Forward+, on a discrete GPU (a window worked here, where Unreal's windowed D3D12 swap chain did not). A run
  to a screenshot and report takes about 12 seconds. No MCP server was used.
- [tested] The 48-skin fox imported as one `Skeleton3D` (19 bones), 48 `MeshInstance3D` and one
  `AnimationPlayer` with `walk` and `trot` under their original names. The clips import with no loop.
- [tested] WAVs import compressed (QOA) by default, so `data.size()` is not the PCM size: derive a loop end
  from `get_length() * mix_rate`. `AudioStreamRandomizer` took the manifest's variants, weights and
  `noRepeat` directly, but a script cannot see which variant it picked.
- [documented] Headless flags: `--headless`, `--import` (import then quit), `--script`, `--check-only`,
  `--export-release`, `--write-movie`. No screenshot flag on that page.
- [documented] glTF 2.0 is imported natively and recommended; `.blend` needs Blender installed.
- [documented] No built-in sprite-sheet importer. The community Aseprite Wizard takes `.aseprite` files and
  runs the Aseprite program, so a sheet plus JSON needs a small loader.
- [documented] WAV loop metadata is followed by default. [tested] The agent-beeps WAVs carry none (no
  `smpl` chunk), so set the loop mode explicitly.
- [documented] MCP: godot-ai (editor add-on, 46 tools, needs Godot 4.7+, telemetry on by default) and
  Coding-Solo godot-mcp (runs the binary, no add-on, no screenshot tool listed).
- [general] Scenes are text files (`.tscn`), which diff and review well. Strong 2D, good 3D, smaller
  high-end ceiling than Unreal.

## Unity

- [tested] Install: Unity Hub 3.22.0 through winget (an MSIX app under WindowsApps) and Editor 6000.3.25f1
  (7.8 GB) through the Hub's headless CLI (`Unity Hub.exe -- --headless editors -r`, `install-path -s`,
  `install --version`), to a user folder with no admin rights. The bundled `unity.exe` CLI is access-denied from
  the MSIX folder, so the `unity mcp` route is untested.
- [tested] Licence: before sign-in a headless launch exits 198 with "No valid Unity Editor license found" (no
  access token, 0 entitlements). After the owner signed in and activated Personal in the Hub, headless project
  creation, scene build, player build and a run all worked. The sign-in is the one step an agent cannot do.
- [tested] The sample scene builds from an Editor script (`-batchmode -executeMethod`) and a Windows player
  builds in about 15 seconds. glTFast 6.20.0 imports the 48-skin fox as 48 skinned renderers on 19 bones (merged)
  with `walk` and `trot` keeping their names, as a Mecanim Animator with **no controller**: play the clip through
  a `PlayableGraph` and loop it by wrapping the time.
- [tested] The default texture type rescales non-power-of-two sheets (256x40, 96x32) to a power of two, which
  squashes and blurs pixel art: set NPOT Scale to None. Unity is left-handed, so a camera on +Z looking at the
  origin shows +X on the left.
- [tested] No window could be presented in this session: a D3D12 player failed with 0x887A0022, D3D11 with
  "Switching to resolution failed", and Vulkan crashed in the player. The default Windows API list is D3D12 only,
  so `-force-vulkan` first needs Vulkan added. `-batchmode` without `-nographics` renders on the GPU with no
  window; capture by rendering the camera to a RenderTexture, not with `ScreenCapture`.
- [tested] The bed is looped with `AudioSource.loop` (set, and reported true while playing; the wrap itself was
  not observed), so the WAV's missing loop chunk does not matter. Unity has no randomizer component; a small
  picker built from the manifest made the chosen variant observable.
- [documented] Unity deprecated the MCP server inside its in-editor assistant package. The Unity CLI
  (`unity mcp`, `unity command`, `unity eval`) replaces it; third-party MCP packages are unaffected.
  The CLI page lists no tools.
- [documented] Headless activation needs a licence; per a vault source, Personal needs an interactive
  Hub login, which caps unattended runs.
- [documented] GLB needs the glTFast package (`com.unity.cloud.gltfast`), with its `.bin` and images copied
  unchanged. The 2D Aseprite Importer takes `.ase`/`.aseprite` files, not a sheet plus JSON.
- [documented] Assets are identified by a GUID in a paired `.meta` file. Moving or deleting files from the
  shell orphans them, which is exactly what an agent tends to do.
- [general] Widest platform reach; large MCP ecosystem (several community servers with screenshots, play
  mode and tests, per vault sources).

## What to check first

- [general] Before committing to an engine for real work, run the [sample scene](../../../docs/sample-scene.md) in it.
  It answers, in an hour, whether the GLB imports with its skin and clips, whether the atlas needs a
  loader, whether the audio loops, and whether a screenshot can be taken with nobody present.
