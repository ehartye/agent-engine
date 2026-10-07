# WebGPU, WebGL and headless Chromium for R3F

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 and @react-three/fiber 9.8.1 with Playwright 1.63.0 (Chromium 153.0.8010.12) on Windows 11, on a hybrid laptop: NVIDIA RTX 5070 Ti Laptop (discrete) plus Intel integrated.

Which backend runs, how headless Chromium picks a GPU, and how to assert it. The Sector Run app creates only a `WebGLRenderer`; nothing here ran on WebGPU.

## Backends and silent fallback

- [documented] three's `WebGPURenderer` falls back to WebGL 2 silently (vault: agent-browser, WebGPU in Headless Chrome).
- [documented] An app that creates only a `WebGLRenderer` cannot hit that fallback; the silent fallback that can happen is a software rasteriser (below).

## Headless Chromium on Windows

- [tested] With no GPU flags, Playwright's headless Chromium renders with the SwiftShader software rasteriser (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device ...`). WebGL 2 works, the picture looks plausible, nothing errors; only the renderer string gives it away.
- [tested] `--use-angle=d3d11 --ignore-gpu-blocklist` selects adapter 0, the integrated Intel GPU. `powerPreference: 'high-performance'` on the WebGL context made no difference headless.
- [tested] Add `--force_high_performance_gpu` (the hyphenated spelling works too) to reach the discrete GPU. Use all three flags:

```js
chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--force_high_performance_gpu'] });
```

- [tested] With those flags the renderer string was `ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 Ti Laptop GPU (0x00002F58) Direct3D11 vs_5_0 ps_5_0, D3D11)`, backend `webgl2`.

## Asserting the backend

- [tested] Read `WEBGL_debug_renderer_info`'s unmasked renderer and match `/swiftshader|llvmpipe|software|basic render/i`. Report a match as `backend: 'webgl-fallback'` and fail the smoke run on it.

```ts
const ext = ctx.getExtension('WEBGL_debug_renderer_info');
const renderer = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(ctx.getParameter(ctx.RENDERER));
const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
```

- [tested] Assert on state, not pixels: the backend and renderer-string checks caught SwiftShader while both screenshot checks passed (see [probe and verification](probe-and-verification.md)).

## Software rendering

- [tested] Under SwiftShader Chromium logs the console warning `GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`, though the app calls no `readPixels`; the GPU run logs none. A zero-warning console rule fails on it.
- [tested] `PROBE_ANGLE=swiftshader pnpm verify:r3f --allow-software` (the verifier passes `--use-angle=swiftshader --ignore-gpu-blocklist --force_high_performance_gpu`) ran the whole scenario in 41.3 s of wall time against 40.0 s on the NVIDIA GPU: 30 of 31 assertions passed, course 10.77 s then 10.08 s (6.3 %), 54.3 fps measured (gate 55 not enforced).
- [tested] It still reported `FAIL`: `--allow-software` relaxes only `renderer is not a software renderer`, not `backend is webgl2 or webgpu`. That is the shared probe's behaviour, recorded, not changed.
- [tested] The smoke scenario took 28.7 s of wall time on SwiftShader (`CHROMIUM_ARGS=" "`) and on the GPU alike, because its pilot runs on `requestAnimationFrame` at 60 fps either way.
