# Particles and explosions in Babylon.js

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Bursts, sparks and smoke in a Babylon game come from `ParticleSystem` (CPU) and `GPUParticleSystem`, plus thin-instanced meshes for debris. The example has no particle systems, so almost all of this is read from `@babylonjs/core` source or carried as guidance; the pieces it does reproduce are the lockstep timing, hit-stop, and the thin-instance behaviour that debris relies on.

## CPU and GPU systems

- [documented] A CPU system's `getActiveCount()` is `_particles.length`, the live count. A GPU system's `getActiveCount()` returns `_currentActiveCount`, the number of buffer slots in use (an emitted-so-far counter, bounded by roughly `emitRate * maxLifeTime` in `emitRateControl` mode), never the particles alive now (`Particles/thinParticleSystem.pure.js`, `gpuParticleSystem.pure.js`, 9.29.0). Nothing reads GPU aliveness back.
- [general] An earlier project saw a GPU burst launched with `manualEmitCount` still lit well past its lifetime. Prefer CPU systems for one-shot bursts and keep GPU systems for continuous effects (speed lines, ambient dust) driven by `emitRate`. Check this on your version before relying on it.
- [documented] `new GPUParticleSystem(...)` throws "The WebGL2ParticleSystem class is not available! Make sure you have imported it." unless `@babylonjs/core/Particles/webgl2ParticleSystem` was imported (`gpuParticleSystem.pure.js`, line 880), even when `GPUParticleSystem.IsSupported` is true. See [bundle size and imports](bundle-size-and-imports.md).
- [general] Layers of one explosion (flash, ring, sparks, smoke, hit-sparks) work well as separate pooled CPU systems with different textures and gradients; debris as one thin-instanced mesh.

## Sizes

- [documented] With `addSizeGradient`, a new particle's size comes from the gradient factor and then interpolates between gradient factors: `minSize` and `maxSize` are no longer used (`_CreateSizeGradientsData`, `_ProcessSizeGradients` in `thinParticleSystem.function.js`). The gradient factors are world-unit sizes, not multipliers.
- [general] Write the burst's size into the gradient factors, rewritten per burst. A flash that should be large but has `addSizeGradient(0, 1)` and `addSizeGradient(1, 1)` draws at size 1 whatever `minSize` says.

## Pooling and disposal

- [documented] A CPU system emits `manualEmitCount` particles on its next update and then resets it to 0 (`thinParticleSystem.pure.js`). So arm each pooled system once, then re-fire it by moving `emitter` and setting the count:

```js
ps.emitter = new Vector3(x, y, z);
ps.manualEmitCount = count;
```

- [documented] `dispose(disposeTexture = true)` also disposes `particleTexture` (and the noise texture) for both system types. Pooled systems that share one texture must be disposed with `dispose(false)`, and the shared texture once, or the survivors lose it.
- [tested] (babylon verify: thin instances) A thin-instanced mesh with zero instances still draws its source mesh at the origin, and `setEnabled(false)` hides it. Disable an empty debris mesh, as [`main.mjs`](../../../examples/web3d/babylon/src/main.mjs) does for its shots.

## Hit-stop and simulation time

- [documented] Particles age by `updateSpeed * scene.getAnimationRatio()` each rendered frame (`_scaledUpdateSpeed`), with `updateSpeed` defaulting to 0.01. Under `deterministicLockstep`, `Scene.animate` sets `_animationRatio = timeStep * (1 / timeStep) = 1` inside every step (`scene.pure.js`), so the ratio is always 1 and particles age per rendered frame, not per second. A 1 s lifetime at the default speed lasts 100 frames: 1.7 s at 60 fps, and longer on a slower display.
- [general] Feed particles real time yourself: each frame set `updateSpeed = frameSeconds / scene.getAnimationRatio()` on every live system. An earlier project measured a 1 s lifetime lasting 1.7 s by default and about 1.0 s with this fix.

```js
const speed = dtSeconds / Math.max(scene.getAnimationRatio(), 1e-3);
for (const ps of systems) ps.updateSpeed = speed;
```

- [general] Take the frame time from the loop you actually run. `engine.getDeltaTime()` is measured by `engine.runRenderLoop`; a page that calls `scene.render()` itself gets a stale delta. The example uses `engine.runRenderLoop` ([`main.mjs`](../../../examples/web3d/babylon/src/main.mjs)).
- [tested] (core tests: engine-owned steps honour a hit-stop; a tap during a hit-stop fires once when the simulation resumes) Hit-stop pauses the gameplay step through `session.runStep` without losing a tap.
- [general] Particle time and gameplay time are separate clocks. To keep a hit-stop visible, let particles run on frame time (above) while gameplay stands still, or scale their speed on purpose.

## Cost

- [general] Each CPU system is at least one draw call and each GPU system at least two (update and render); a thin-instanced debris mesh is one. Read `SceneInstrumentation.drawCallsCounter` into the probe ([probe and verification](probe-and-verification.md)) and set a budget for the sum of live layers.
- [general] Count live layers in your own code (a small `Effects.counts()`), not from `getActiveCount()` on GPU systems.
