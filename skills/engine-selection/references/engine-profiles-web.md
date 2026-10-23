# Engine profiles: web stacks

Index: [engine-profiles.md](engine-profiles.md).

## Web stacks

- [tested] Phaser 3.90.0 and three.js 0.186.1 builds of the sample scene ran in headless Chromium on the GPU
  (WebGL renderer: a discrete GPU through ANGLE D3D11) with no console errors; a page loads in about a second and a
  full verification pass takes about 12 seconds, with no install of an engine and no sign-in. Phaser loaded the
  agent-sprites atlas unchanged through its Aseprite loader. three.js kept the GLB's clip names. The
  agent-beeps player picked all 4 pickup variants with no immediate repeat.
- [tested] Phaser 4.2.1 (the `latest` release, 2026-07-09) carried a large procedural 2D game: chunked GPU
  tilemaps, particles, parallel scenes, an Aseprite creature and terrain pipeline, on the GPU in headless Chromium. It also
  exposed two Phaser 4 rendering bugs (GPU tilemap layers draw at twice their position; empty tiles in a GPU layer draw as
  tile 0) and a tile-animation trap; see the [engine-phaser skill](../../engine-phaser/SKILL.md) for workarounds.
- [documented] Phaser is a 2D HTML5 framework; agent-beeps ships a browser player.
- [documented] Open-source Phaser 4 officially supports WebGL 2 canvases. Inspected 4.2.1 defaults to WebGL 1 and accepts a supplied
  WebGL 2 context. Phaser AE is a separate proprietary engine/API; its WebGPU-first policy is not npm Phaser 4. See
  [WebGL backends](../../engine-phaser/references/webgl-backends.md) for primary sources, ES3 integration and bounded probe evidence.
- [documented] three.js describes itself as a 3D library. A vendor comparison says "it gives you a scene graph,
  cameras, lights, materials, geometry, loaders, and a renderer, and then it stops"; the wiki records "not a game
  engine" as an unsourced claim, likely true. three.js does ship basic Web Audio classes. agent-meshes ships a
  three.js viewer for its GLBs.
- [documented] Built on three.js: Needle Engine (its docs say all rendering goes through three.js and its
  components revolve around three's scene graph; Unity and Blender authoring, cloud hosting). A-Frame is also
  three.js-based [general]. Not tested here.
- [tested] react-three-fiber 9.8.1 (three 0.186.1, react 19.3.0) runs the [R3F example](../../../examples/web3d/r3f/README.md): its verifier passes 13 of 13 checks in headless Chromium on the GPU (backend `webgl2`, ANGLE D3D11): renderer string, ready means drawn, rendered axes, one key press fires once, toon ramp patch, outlines, instancing and a clean console. The toon ramp patch and the outline are hand-written, and fast shots use analytic swept tests. See [engine-r3f](../../engine-r3f/SKILL.md).
- [tested] Babylon.js 9.29.0 runs the [Babylon.js example](../../../examples/web3d/babylon/README.md) from the same rules core: 5 Node convention tests and 16 of 16 verifier checks on the same machine, and a deep-import production build of about 1.6 MB of JavaScript. Havok, particles, GLB loading and WebGPU were not exercised there. See [engine-babylon](../../engine-babylon/SKILL.md).
- [documented] PlayCanvas (engine with entity-component model and a hosted editor; engine MIT, editor
  proprietary). The comparing source is written by a web-engine vendor. Not tested here.
- [tested] three.js has no flipbook, entities or physics: the sprite animation, the walk-around and the trigger
  were written by hand. Its API moves (0.186 deprecated `THREE.Clock`), so pin the version.
- [general] Limits are browser performance and memory, and no native or console target.
