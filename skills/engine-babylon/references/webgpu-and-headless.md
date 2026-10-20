# WebGPU, WebGL and headless Chromium for Babylon.js

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Which backend runs, how headless Chromium picks a GPU, and how to assert it. The example app creates only a WebGL `Engine`; nothing here ran on WebGPU. The flag set is in [`examples/web/verify-checks.mjs`](../../../examples/web/verify-checks.mjs), and `node examples/web3d/r3f/renderer-flags.mjs` prints what each flag set selects on your machine.

## Engines and backends

- [documented] `Engine` is the WebGL engine (`webGLVersion` 2 on a WebGL 2 context). `WebGPUEngine` is a separate class: create it with `await WebGPUEngine.CreateAsync(canvas)` (or `new WebGPUEngine(canvas)` then `await engine.initAsync()`), and test support first with `await WebGPUEngine.IsSupportedAsync` (`@babylonjs/core/Engines/webgpuEngine`, 9.29.0).
- [documented] Shaders are per language: GLSL lives in `ShaderStore.ShadersStore` and WGSL in `ShaderStore.ShadersStoreWGSL` (`Engines/shaderStore.js`). A custom shader written only in GLSL needs a WGSL version before it can run on `WebGPUEngine`.
- [general] You choose the engine class; check support and create `Engine` yourself if `WebGPUEngine` is unavailable. If your app offers a `?backend=webgpu` switch and falls back to WebGL, report what actually rendered (`webgpu`, `webgl2`, `webgl-fallback`) so a verifier sees the truth.
- [general] The example app reads the backend from the engine, not from the request:

```js
holder.backend = engine.webGLVersion >= 2 ? 'webgl2' : 'webgl1';
const dbg = engine._gl.getExtension('WEBGL_debug_renderer_info');
holder.renderer = dbg ? engine._gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
```

## Headless Chromium picks a GPU

- [tested] (babylon verify: renderer is a hardware GPU; `node examples/web3d/r3f/renderer-flags.mjs`) The shared flag set is the platform ANGLE backend, `--ignore-gpu-blocklist` and `--force_high_performance_gpu` (`gpuArgs()`: `d3d11` on Windows, `metal` on macOS, `gl` elsewhere). The verifier launches with it and requires a hardware renderer string.
- [general] With no GPU flags headless Chromium may render with the SwiftShader software rasteriser. WebGL 2 works and nothing errors; only the renderer string gives it away.
- [general] Which GPU the ANGLE backend alone picks on a hybrid-GPU laptop (integrated plus discrete) varies with drivers and power state; that is why `--force_high_performance_gpu` is in the set (harmless on one-GPU machines) and why the verifier reports the renderer string instead of assuming one.

```js
chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--force_high_performance_gpu'] });
```

## Asserting the backend

- [tested] (`node --test examples/web/verify-checks.test.mjs`: classifyRenderer, rendererCheck) Classify the unmasked renderer string against `/swiftshader|llvmpipe|software|basic render/i`: hardware GPU passes, software is `webgl-fallback`, no WebGL 2 context or no string is `none`.
- [tested] (babylon verify: renderer is a hardware GPU; verify-checks test: rendererCheck) The first verifier check reads the renderer string the app reports and fails on a software rasteriser unless `--allow-software` is passed. `--allow-software` relaxes only that check; with no WebGL 2 context the check still fails.
- [general] Do not trust the request: a page that asked for one backend can run another, and a screenshot check passes on a software rasteriser.

## Software rendering

- [general] On a machine with no GPU run the verifier with `--allow-software`: the scenario still runs, only slower, and frame-rate numbers are meaningless.
- [general] Software rasterisers can log GPU-stall performance warnings (for example about `ReadPixels`) that a GPU run does not, which a zero-warning console rule then fails. Decide whether that is the signal you want or allow the text for software runs only.
- [general] A scenario driven by `requestAnimationFrame` takes about the same wall time on software and on a GPU when the scene is light, because the page is capped at the display rate either way. Wall time does not separate them; the renderer string does.

Related: [probe and verification](probe-and-verification.md), [scene loop and observables](scene-loop-and-observables.md).
