# Babylon.js versions and migrations

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0.

The versions the example runs on, the library facts that differ from older documentation or from memory, and a short upgrade checklist. Check the pins in [`examples/web3d/babylon/package.json`](../../../examples/web3d/babylon/package.json) (the lockfile sits beside it) before copying code from here onto a different set.

## Pinned versions

| Package or tool | Version | Label |
| --- | --- | --- |
| @babylonjs/core | 9.29.0 (`Engine.Version`) | [tested] |
| vite | 8.3.3 | [tested] |
| playwright (Chromium) | 1.63.0 | [tested] |
| Node | 24.18.0 | [tested] |

- [tested] (babylon test and verify) This set runs together: `npm test` passes 5 Node tests and `npm run verify` passes 16 checks in `examples/web3d/babylon`.
- [tested] (babylon verify: the probe reports the versions it was built with) The probe reports `Engine.Version` and the Vite version from `package.json`, so a run's log says which set it was.
- [general] Pin exact versions for every `@babylonjs/*` package and keep them equal; mixed minor versions of core, loaders and materials can break at runtime in ways the types do not show.

## Package set and import paths

- [tested] (babylon verify: a deep-import production build stays under 2 MB of JavaScript) Import by deep path (`@babylonjs/core/Engines/engine`, `@babylonjs/core/Meshes/meshBuilder`). The example's production build is about 1.6 MB of JavaScript; the verifier's ceiling exists so a barrel import is noticed. See [bundle size and imports](bundle-size-and-imports.md).
- [documented] The package ships pure modules (`*.pure.js`) next to side-effect modules: a deep import of `webgl2ParticleSystem` registers the WebGL 2 particle system, while `webgl2ParticleSystem.pure` does not and says so in its header comment ("Import webgl2ParticleSystem.pure for tree-shakeable, side-effect-free usage"). A feature that throws until you add an import usually needs the side-effect module (`@babylonjs/core` 9.29.0, `Particles/webgl2ParticleSystem.js`).
- [general] Mesh features such as thin instances come from side-effect modules: the example imports `@babylonjs/core/Meshes/thinInstanceMesh` for effect before calling `thinInstanceSetBuffer`, and the outline lab imports `@babylonjs/core/Rendering/outlineRenderer`.
- [general] Loaders, Havok and the inspector are separate packages (`@babylonjs/loaders`, `@babylonjs/havok`, `@babylonjs/inspector`); the example uses none of them. See [loading parts](loading-agent-meshes-parts.md), [Havok](physics-havok.md) and [the inspector](inspector-and-debugging.md).

## API facts that differ from older documentation

- [documented] `ImportMeshAsync(source, scene, options)` and `LoadAssetContainerAsync(source, scene, options)` are module-level functions in `Loading/sceneLoader`; the matching `SceneLoader` static methods are marked `@deprecated` in 9.29.0 (`Loading/sceneLoader.js`).
- [tested] (babylon test: Engine has no setTimeStep) `Engine` has no `setTimeStep`; set the step through the constructor option only.
- [tested] (babylon test: timeStep units) The `timeStep` option is in seconds and `getTimeStep()` returns milliseconds; `1000 / 60` freezes the loop.
- [documented] Audio V2 is `CreateAudioEngineAsync` and `CreateSoundAsync` (`AudioV2/webAudio/webAudioEngine.js`). See [audio](audio.md).
- [general] The Babylon.js team publishes release notes and breaking-change lists with each minor; read them before moving and treat the move as its own task with its own verifier run.

## Upgrade checklist

- [tested] (babylon test: timeStep units; babylon verify: lockstep) Lockstep: `timeStep: 1 / 60` still gives `getTimeStep()` of 16.67 ms and about 60 steps a second ([scene loop](scene-loop-and-observables.md#engine-scene-and-render-loop)).
- [tested] (babylon test: quaternion copy, Forward(true), camera projection) Handedness conventions still hold under `NullEngine` ([handedness](handedness-and-coordinates.md)).
- [tested] (babylon verify: built-in outline closes on a sphere, a box and a plate) The built-in outline still closes on smooth and hard-edged meshes ([cell shading and outline](cell-shading-and-outline.md)).
- [tested] (babylon verify: thin instances) A mesh with `thinInstanceCount = 0` still draws its source mesh until disabled ([disposal](scene-loop-and-observables.md#disposal)).
- [tested] (babylon verify: ready means drawn; draw calls) Draw-call counters through `SceneInstrumentation` still read 1,000 for 1,000 meshes and 1 for one thin-instanced mesh.
- [general] Also re-run, if you use them, the particle, physics, audio and inspector checks your own project has; the example does not exercise them.
- [tested] (babylon verify: the console is clean) After any upgrade read the console gate output: any new deprecation text fails it until you decide to allow it.
