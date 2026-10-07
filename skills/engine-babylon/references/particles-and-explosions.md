# Particles and explosions in Babylon.js

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

Four of the findings below were made while the plan was written and re-run on 2026-10-07 on the NVIDIA GPU (a scratch page on the app's Vite and `@babylonjs/core`, no console errors or warnings).

## CPU and GPU systems

- [tested] `ParticleSystem` and `GPUParticleSystem` both render in headless Chromium, on the NVIDIA GPU and on SwiftShader.
- [tested] A CPU system's `getActiveCount()` is the live count: 300 at 250 ms, 0 at 1,750 ms, 300 again after a re-armed burst. One draw call.
- [tested] A GPU system's `getActiveCount()` is an emitted-so-far counter: 300 stayed 300 after the 0.9 s lifetime and became 600 after a second burst; with `emitRate` it climbed to the capacity of 2,000 while the lit pixel count went to 0. Two draw calls. Nothing can read GPU aliveness.
- [tested] A GPU burst by `manualEmitCount` was still lit at 1,750 ms (about 15,000 lit pixels on both renderers), long past its lifetime. Use CPU systems for bursts.
- [tested] Without `import '@babylonjs/core/Particles/webgl2ParticleSystem'`, `new GPUParticleSystem(...)` throws "The WebGL2ParticleSystem class is not available! Make sure you have imported it." although `GPUParticleSystem.IsSupported` is true (re-run 2026-10-07). The full import list is in [bundle size and imports](bundle-size-and-imports.md#tree-shaking-and-side-effect-imports).

## Layers of the explosion

- [tested] What shipped: the flash, ring, sparks, smoke and hit-spark layers are pools of CPU systems; debris is one thin-instanced mesh; the boost speed lines are the one GPU system, running continuously by `emitRate`.
- [tested] With size gradients Babylon ignores `minSize` and `maxSize`, and the gradient values are world-unit sizes: `minSize = maxSize = 29` drew size 29, and adding `addSizeGradient(0, 1)` and `addSizeGradient(1, 1)` drew size 1 (a flash disc at 1 m instead of 29 m; re-run 2026-10-07). Write the sizes into the gradient, rewritten per burst.

## Pooling and disposal

- [tested] Arm each pooled system once and re-fire it by moving `emitter` and setting `manualEmitCount`; a re-armed CPU burst gave the full 300 again.

```ts
ps.emitter = new Vector3(x, y, z);
ps.manualEmitCount = count;
```

- [tested] `ps.dispose()` also disposes the particle texture. With two systems sharing one `DynamicTexture`, after `a.dispose()` a second system on that texture was not ready after 60 frames; after `a.dispose(false)` it was. Same for `ParticleSystem` and `GPUParticleSystem` (re-run 2026-10-07). Dispose pooled systems with `dispose(false)` and the shared texture once.
- [tested] Disable the debris mesh with `setEnabled(false)` when it has no instances, or Babylon draws its source mesh at the origin; see [disposal](scene-loop-and-observables.md#disposal).

## Hit stop and simulation time

- [tested] `updateSpeed` ages particles per frame, and under `deterministicLockstep` `scene.getAnimationRatio()` is 1.000 every frame: 10 particles with a 1 s lifetime and the default `updateSpeed` 0.01 lived 1.68 s of wall time (twice). Setting `ps.updateSpeed = frame dt in seconds / scene.getAnimationRatio()` each frame gave 1.03 and 1.02 s (re-run 2026-10-07).

```ts
const speed = dtSeconds / Math.max(scene.getAnimationRatio(), 1e-3);
for (const ps of systems) ps.updateSpeed = speed;
```

- [tested] Take that frame time from the loop you actually run: on a page that called `scene.render()` itself, `engine.getDeltaTime()` never aged the particles, because that delta is measured by `engine.runRenderLoop`, which the page did not use. The app runs `engine.runRenderLoop`.
- [tested] Hit-stop skips the gameplay step for 4 steps without advancing `simTime` (smoke `combat`: `hitStopSteps` >= 4), so hit-stop freezes gameplay while the verifier's simulation-time arithmetic stays exact.

## Cost

- [tested] One draw call per CPU system and two per GPU system; the debris is a single thin-instanced mesh.
- [tested] Count the live layers in the app (`Effects.counts()`), not from the GPU system, which reports emitted totals; see [the probe object](probe-and-verification.md#the-probe-object).
