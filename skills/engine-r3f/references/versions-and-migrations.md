# R3F versions and migrations

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0.

The versions the example runs on, the library changes that bite a game, and a short upgrade checklist. Check the pins in [`examples/web3d/r3f/package.json`](../../../examples/web3d/r3f/package.json) (the lockfile sits beside it) before copying code from here onto a different set.

## Pinned versions

| Package | Version | Label |
| --- | --- | --- |
| three | 0.186.1 (`THREE.REVISION` 186) | [tested] |
| @react-three/fiber | 9.8.1 | [tested] |
| react, react-dom | 19.3.0 | [tested] |
| vite | 8.3.3 | [tested] |
| @vitejs/plugin-react | 6.1.2 | [tested] |
| playwright (Chromium) | 1.63.0 | [tested] |

- [tested] This set runs together and passes `npm run verify` (13 checks) in `examples/web3d/r3f`, on Node 24.18.0.
- [tested] The probe reports the versions it was built with (r3f verify: the probe reports the versions it was built with), so a run's log says which set it was.
- [documented] R3F 9.8.1 declares peers `react` and `react-dom` `>=19 <19.4` and `three` `>=0.156` (`@react-three/fiber/package.json`). R3F 9.8.0 added React 19.3 support (CHANGELOG).
- [general] Pin exact versions for a game. A caret range on three can move a shader chunk or a deprecation under you between two installs.

## Breaking changes that matter

- [tested] R3F 9.8.1 on three 0.186.1 logs `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` once per page load and no other console warning in the verifier's scenes, so the zero-warning gate allows exactly that text (r3f verify: console gate; core test: consoleGate).
- [documented] The cause: three deprecated `THREE.Clock` in r183 (`three/src/core/Clock.js` warns on construction), and R3F 9.8.1 still creates one for its store (`clock: new THREE.Clock()` in the package's `dist`). The warning goes away when R3F stops constructing one. Do not use `THREE.Clock` in your own code; use `THREE.Timer` or the delta `useFrame` passes.
- [documented] R3F v9 requires React 19 (peer range above). R3F 9.8.1 still converts colour-map texture props of built-in materials to sRGB when the canvas is not `linear` and the texture is RGBA8 (`applyProps` in the package's `dist`), so load data textures (normal, roughness) through props that are not colour maps.
- [documented] `<Canvas>` and `root.configure()` apply only the props that changed, and runtime changes through setters such as `setFrameloop` last across re-renders (R3F 9.8.1 CHANGELOG). Do not re-pass an inline `gl` object expecting it to rebuild the renderer.
- [documented] R3F 9.8.1 disposes a renderer it created when the root unmounts, and the `THREE.WebGLRenderer: Context Lost.` log on every unmount is gone (CHANGELOG, 9.8.1). On older 9.x expect that log when a canvas unmounts.
- [general] Read the next major version's migration notes before moving: a new R3F major can move the three floor and the scheduler API. Treat the move as its own task with its own verifier run.

## Upgrade checklist

- [tested] After a three upgrade, run the checks that exercise shaders. The toon ramp patch finds and replaces the `gradientmap_pars_fragment` text on r186, and the verifier confirms the patched ramp keeps its colour (r3f verify: toon ramp).
- [documented] Why: three r186 `gradientmap_pars_fragment.glsl.js` samples only `.r` of the gradient map, so an unpatched coloured ramp renders grey. See [toon, outline and instancing](toon-outline-and-instancing.md).
- [general] Make a patch fail loudly: the example's `patchToonRamp` throws when the text it replaces is gone, so an upgrade that changes the chunk fails in tests instead of silently rendering grey again.
- [tested] After any upgrade, re-run `npm run verify` and read the console gate output: any new deprecation text fails it until you decide to allow it.
- [tested] Re-check the probe's `versions` after the install; it comes from `package.json` and `THREE.REVISION`, so it shows what is really installed.

## Related

- [Probe and verification](probe-and-verification.md), [WebGPU and headless](webgpu-and-headless.md), [frame loop and state](frame-loop-and-state.md).
