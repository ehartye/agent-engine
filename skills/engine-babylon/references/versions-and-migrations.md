# Babylon.js versions and migrations

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

## Pinned versions

- [tested] The set every claim in this skill was checked against, pinned exactly (no ranges) for every `@babylonjs/*` package:

| Package or tool | Version |
| --- | --- |
| `@babylonjs/core`, `@babylonjs/loaders` | 9.29.0. [tested] |
| `@babylonjs/materials`, `@babylonjs/inspector` (dev only) | 9.29.0. [tested] |
| `@babylonjs/havok` | 1.3.14. [tested] |
| Vite, TypeScript, Vitest | 8.3.3, 7.0.2, 5.0.3. [tested] |
| Playwright, Chromium | 1.63.0, 153.0.8010.12. [tested] |
| Node, OS | 24.18.0, Windows 11. [tested] |
| agent-meshes (part GLBs) | 0.13.1. [tested] |

- [tested] Babylon 9.29.0 type-checks cleanly under TypeScript 7.0.2 with `skipLibCheck` (`pnpm typecheck` passes).

## Package set and import paths

- [documented] Runtime dependencies are `@babylonjs/core`, `@babylonjs/loaders` and `@babylonjs/havok`; `@babylonjs/inspector` and `@babylonjs/materials` (imported only by the `CellMaterial` spike, `spikes/src/a.ts`) are dev dependencies (`apps/babylon/package.json`).
- [tested] Import by deep path (`@babylonjs/core/Engines/engine`, `@babylonjs/core/Loading/sceneLoader`, ...). The library ships "pure" modules (`*.pure.js`) next to side-effect modules: a deep import of a module registers its feature, a `.pure` import does not. The side-effect list is in [bundle size and imports](bundle-size-and-imports.md#tree-shaking-and-side-effect-imports).
- [tested] `@babylonjs/havok` does not export its `package.json`; read its version by path (`node_modules/@babylonjs/havok/package.json`).
- [tested] The inspector is `@babylonjs/inspector` with `ShowInspector(scene)`; it lists 21 peer dependencies (React 19.3.0, Fluent UI, the node editors), which pnpm installs automatically.

## Breaking changes met

API facts that differ from older documentation or from memory; each was hit while building.

- [tested] `ImportMeshAsync(source, scene, options)` and `LoadAssetContainerAsync(source, scene, options)` are module-level functions; the `SceneLoader` statics are deprecated.
- [tested] `Engine` has no `setTimeStep` (a call to it was found and removed while the plan was written), and the `timeStep` engine option is in seconds while `getTimeStep()` returns milliseconds; `1000 / 60` freezes the loop (re-run 2026-10-07).
- [tested] `GPUParticleSystem` needs `import '@babylonjs/core/Particles/webgl2ParticleSystem'` or its constructor throws (re-run 2026-10-07).
- [tested] AudioV2 is `CreateAudioEngineAsync` and `CreateSoundAsync`, and its engine state is not a gesture gate under Playwright; see [audio](audio.md#unlock-on-the-first-gesture).
- [tested] Two particle behaviours assumed wrongly: that `dispose()` leaves a shared texture alone, and that `minSize` and `maxSize` still apply with size gradients. Neither holds; both re-run on 2026-10-07. See [particles](particles-and-explosions.md#pooling-and-disposal).

## Upgrade checklist

Re-run these on the next minor; each one is a behaviour this build depends on.

- [tested] Lockstep: `timeStep: 1 / 60` gives `getTimeStep()` 16.67 ms and about 60 steps per second ([scene loop](scene-loop-and-observables.md#engine-scene-and-render-loop)).
- [tested] Handedness: `tests/babylon-conventions.test.ts` passes 7 of 7 (quaternion copy, camera projection, `Matrix.Compose`) ([handedness](handedness-and-coordinates.md#checks-that-prove-it)).
- [tested] glTF: meshes are still named after their nodes and the `__root__` wrapper carries no flip ([loading parts](loading-agent-meshes-parts.md#loading-glbs)).
- [tested] Outline renderer: rerun the smoke `outline` stage; on 9.29.0 hard-edged parts reach coverage 0.93 or more only with the welded outline normals and `engine.setState(false)` before each part draw ([hard-edged parts](cell-shading-and-outline.md#outlines-on-hard-edged-parts)).
- [tested] Particles: the WebGL 2 import, `dispose(false)`, size gradients overriding `minSize`, and `updateSpeed` under lockstep ([particles](particles-and-explosions.md)).
- [tested] Thin instances: a mesh with `thinInstanceCount = 0` still needs `setEnabled(false)` ([disposal](scene-loop-and-observables.md#disposal)).
- [tested] Havok: the WASM still loads with no Vite configuration, and its `package.json` is still unexported ([Havok](physics-havok.md#loading-the-wasm-in-vite-and-headless-chromium)).
- [tested] Inspector: the dev guard still leaves no inspector chunk in the build, and the console error in dev is still there ([inspector](inspector-and-debugging.md)).
