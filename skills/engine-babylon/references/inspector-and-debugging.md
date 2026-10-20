# The Babylon.js inspector and debugging

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

The inspector is a dev tool for looking at a scene; the probe stays the thing tests read. The example does not install or open the inspector, so everything about it below is guidance, not something this repo reproduces. What the repo does show is how to debug without it: a plain-data probe, isolated lab scenes and pixel or counter readbacks ([`labs.mjs`](../../../examples/web3d/babylon/src/labs.mjs)).

## Loading the inspector on demand

- [general] Open it from a dynamic import, only in dev and only on request (`?inspector=1`), so a production build contains no inspector chunk and the verifier never loads it. Check the build output for a file with `inspector` in its name.

```js
if (import.meta.env.DEV && params.get('inspector') === '1') {
  const { ShowInspector } = await import('@babylonjs/inspector');
  ShowInspector(scene);
}
```

- [general] The inspector is the separate `@babylonjs/inspector` package, versioned with core; pin it to the same version. Check its `ShowInspector` signature against the package you install, since the API has moved between majors.

## What it shows that the probe does not

- [general] Scene explorer (nodes, materials, textures, particle systems), per-object transforms and material properties, and scene settings such as clear colour, fog and environment. None of these are in a typical probe.
- [general] Use it to find out what is wrong (a mirrored node, a missing texture, an unexpected material); then write the probe field or lab check that would have caught it, so the finding is not lost when the inspector is closed.

## Debugging without it

- [tested] (babylon verify: thin instances; draw calls) Isolate one behaviour in a lab scene that renders once and reads pixels or `SceneInstrumentation` counters. That is how the example found that an empty thin-instanced mesh still draws at the origin and that 1,000 meshes cost 1,000 draw calls.
- [tested] (babylon verify: ready means drawn) Count drawn frames by draw calls, not by renders: materials compile in parallel, so early renders can be empty.
- [documented] `scene.whenReadyAsync()` resolves when the scene's materials and meshes are ready (`scene.pure.js`); await it before a measured render in a lab.
- [general] A blank or flat headless render usually means a software rasteriser or an unready scene, not a broken scene: read the renderer string first ([WebGPU and headless](webgpu-and-headless.md)).

## Cost in the bundle

- [general] It brings a large dependency tree (a UI framework and the node editors), so a build that includes it is far bigger than the game; keep it behind the dev guard and a dynamic import.
- [general] Bundlers may warn about `"use client"` directives in its chunks; these are noise from the package, not your code.

## Headless use

- [general] Never load the inspector in a verifier run: its own console output (framework warnings and errors) fails a zero-console-errors gate, and it adds a large DOM that slows screenshots.
- [tested] (babylon verify: the console is clean) The example's console gate has an empty allow list, so any such output would fail the run; see [probe and verification](probe-and-verification.md#zero-errors).
