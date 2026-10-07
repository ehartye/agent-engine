# WebGPU, WebGL and headless Chromium for Babylon.js

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

All runs: Playwright 1.63.0 with Chromium 153.0.8010.12 on Windows 11, a laptop with an NVIDIA GeForce RTX 5070 Ti and Intel Graphics.

## Engines and backends

- [tested] Slice 1 renders with WebGL 2 only (`Engine`), because its toon shader is GLSL only. `?backend=webgpu` is accepted and reported honestly as `webgl-fallback`, so the verifier sees what really rendered. A WebGPU run was not tried.
- [general] For WebGPU, add WGSL versions of the custom shaders to `ShaderStore.ShadersStoreWGSL` and create the engine with `WebGPUEngine`. Believed, not checked here.

## Headless Chromium on Windows

- [tested] These flags put headless Chromium on the discrete GPU through ANGLE/D3D11: `--use-angle=d3d11 --ignore-gpu-blocklist --force_high_performance_gpu`. The renderer string was `ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 Ti Laptop GPU (0x00002F58) Direct3D11 vs_5_0 ps_5_0, D3D11)`. Some earlier spike numbers come from the same machine's Intel Graphics (0x7D67).
- [tested] For a software run use SwiftShader: `SMOKE_SOFTWARE=1` for the smoke script, `PROBE_ANGLE=swiftshader pnpm verify:babylon --allow-software` for the verifier. The renderer string is `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.

## Asserting the backend

- [tested] Classify the renderer string, do not trust the request: the probe's `backend` was `webgl2` on the GPU and `webgl-fallback` on SwiftShader, from the shared `classifyRenderer`.
- [documented] The app also reports a WebGL 1 context or a WebGPU request it answered with WebGL as `webgl-fallback` (`apps/babylon/src/probe/state.ts`):

```ts
export function backendOf(requested: 'webgl2' | 'webgpu', webglVersion: number | null, renderer: string): Backend {
  if (webglVersion === null) return 'unknown';
  if (requested === 'webgpu') return 'webgl-fallback';
  if (webglVersion < 2) return 'webgl-fallback';
  return classifyRenderer('webgl2', renderer); // engine.getGlInfo().renderer
}
```

- [tested] The smoke script's backend check first expected `webgl2` under `SMOKE_SOFTWARE` too and had to be corrected to expect `webgl-fallback` there.
- [tested] The verifier's `--allow-software` relaxes the software-renderer check but not the backend check: on SwiftShader the whole scenario ran and the run still reported FAIL on `backend is webgl2 or webgpu (webgl-fallback)` alone (a probe quirk, reported, not changed).

## Software rendering

- [tested] WebGL 2 runs on SwiftShader. The smoke stages `boot flight combat perf` passed all 25 checks at a mean 43.6 fps (min 35.1) in 28 s of wall time, against 60.0 fps and 24 s on the GPU.
- [tested] The verifier on SwiftShader (no `--enforce-fps`) ran the whole scenario in 54 s of command wall time (51.3 s inside the verifier) at 29.7 fps, against 49 to 50 s on the GPU; course 13.12 s -> 12.30 s (6.2 % faster).
- [tested] CPU and GPU particle systems both render on SwiftShader; a GPU burst lit about 15,000 pixels on both renderers.
