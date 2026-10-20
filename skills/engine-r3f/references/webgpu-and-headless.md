# WebGPU, WebGL and headless Chromium for R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

Which backend runs, how headless Chromium picks a GPU, and how to assert it. The example app creates only a `WebGLRenderer`; nothing here ran on WebGPU. The flag set is in [`examples/web/verify-checks.mjs`](../../../examples/web/verify-checks.mjs) and `node examples/web3d/r3f/renderer-flags.mjs` prints what each flag set selects on your machine.

## Backends and fallback

- [documented] three r186 `WebGPURenderer` falls back to its WebGL 2 backend when WebGPU is unavailable: it logs `WebGPURenderer: WebGPU is not available, running under WebGL2 backend.` and carries on. The `forceWebGL` option forces the WebGL 2 backend (`three/src/renderers/webgpu/WebGPURenderer.js`).
- [documented] R3F 9.8.x accepts an async `gl` factory for WebGPU: `<Canvas>` suspends internally until the root is `ready`, then mounts (`@react-three/fiber` CHANGELOG, 9.8.0).
- [general] A page that only checks "something drew" can pass on the fallback or on a software rasteriser. Report the backend in the probe (`webgpu`, `webgl2`, `webgl-fallback`) and assert it, so a run on the wrong backend fails instead of looking fine.
- [general] An app that creates only a `WebGLRenderer` cannot hit the WebGPU fallback; the silent downgrade it can hit is a software rasteriser (below).

## Headless Chromium picks a GPU

- [tested] With no GPU flags, headless Chromium rendered with the SwiftShader software rasteriser on the test machine (`ANGLE (Google, Vulkan ... SwiftShader ...)`). WebGL 2 works and nothing errors; only the renderer string gives it away (`node renderer-flags.mjs`: "no flags" prints `software`).
- [tested] The shared flag set is the platform ANGLE backend, `--ignore-gpu-blocklist` and `--force_high_performance_gpu` (`gpuArgs()`: `d3d11` on Windows, `metal` on macOS, `gl` elsewhere). On the test machine it selected the discrete GPU (`renderer-flags.mjs`).
- [general] Which GPU the ANGLE backend alone picks on a hybrid-GPU laptop (integrated plus discrete) varies with drivers and power state; earlier runs picked the integrated GPU. That is why `--force_high_performance_gpu` is in the set (harmless on one-GPU machines), and why the verifier reports the renderer string instead of assuming one.
- [general] `powerPreference: 'high-performance'` on the WebGL context made no difference to the choice in headless runs. Select the GPU with launch flags.

```js
chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--force_high_performance_gpu'] });
```

## Asserting the backend

- [tested] Read `WEBGL_debug_renderer_info`'s unmasked renderer and match it against `/swiftshader|llvmpipe|software|basic render/i`; fail the run (or report `webgl-fallback`) on a match. The classifier's tests: `node --test examples/web/verify-checks.test.mjs` (hardware GPU, software, no WebGL 2 context).
- [tested] In the R3F verifier the first check is exactly this: it reads the renderer string the app reports and fails on a software rasteriser unless `--allow-software` is passed (r3f verify: hardware GPU).
- [tested] `--allow-software` relaxes only the renderer check; with no WebGL 2 context at all the check still fails (`verify-checks.test.mjs`: rendererCheck).

```js
const ext = ctx.getExtension('WEBGL_debug_renderer_info');
const renderer = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(ctx.getParameter(ctx.RENDERER));
const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
```

## Software rendering

- [general] On a machine with no GPU, run the verifier with `--allow-software`: the scenario still runs, only slower, and the renderer check is waived. Treat its frame-rate numbers as meaningless.
- [general] Under SwiftShader some Chromium builds log GPU-stall performance warnings from the driver (for example about `ReadPixels`) that a GPU run does not. A zero-warning console rule then fails on software; decide whether that is the signal you want or allow the text for software runs only.
- [general] A scenario driven by `requestAnimationFrame` takes about the same wall time on software and on a GPU when the scene is light, because the page is capped at the display rate either way. Wall time does not separate them; the renderer string does.

## Related

- [Probe and verification](probe-and-verification.md), [frame loop and state](frame-loop-and-state.md).
