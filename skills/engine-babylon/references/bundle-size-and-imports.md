# Babylon.js bundle size and imports

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

All sizes are from `pnpm --filter @sector-run/babylon build` (Vite 8.3.3 with Rolldown) on the finished Slice 1 app.

## Measured sizes

| What | Size |
| --- | --- |
| Build time | 560 ms. [tested] |
| Main chunk `index-<hash>.js` | 1,578.43 kB, 380.45 kB gzip (Vite's figures). [tested] |
| Havok WASM | 2,094,563 bytes. [tested] |
| Next largest chunks | `scene.pure` 160 kB, `pbrMaterial.pure` 152 kB, `openpbrMaterial.pure` 128 kB, `pbr.fragment` 118 kB. [tested] |
| All JavaScript | 255 files, 3,832 KiB raw, 964 KiB gzip (level 9, Node's zlib). [tested] |
| `dist` | 7.3 MB: `assets` 6.4 MB, `audio` 504 KB, `parts` 412 KB. [tested] |

- [tested] No file in the production build has `inspector` in its name; the spike build that included the inspector was about 30 MB.

## Tree shaking and side-effect imports

- [tested] Import exactly the modules used, by deep `@babylonjs/core/...` paths, not the package root. A module that registers a feature then needs its own side-effect import, or the feature is missing at run time.
- [tested] Babylon ships "pure" modules (`*.pure.js`) next to side-effect modules: a deep import of a module registers its feature, a `.pure` import does not.
- [tested] The side-effect imports Sector Run had to write by hand, each because the feature was missing at run time without it:

```ts
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Rendering/outlineRenderer';
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration'; // a custom shader that includes
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';      // these fails to compile without them
import '@babylonjs/core/Particles/webgl2ParticleSystem';              // new GPUParticleSystem throws without it
import '@babylonjs/core/Particles/particleSystemComponent';
import '@babylonjs/core/Engines/Extensions/engine.transformFeedback';
import '@babylonjs/core/Shaders/particles.vertex'; // and the other five particle shaders:
// particles.fragment, gpuUpdateParticles.vertex/.fragment, gpuRenderParticles.vertex/.fragment
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import '@babylonjs/loaders/glTF/2.0';
```

## Splitting Havok and the inspector

- [tested] Havok's WASM stays out of the JavaScript: imported with `?url` (`@babylonjs/havok/lib/esm/HavokPhysics.wasm?url`) it is emitted as its own asset, `/assets/HavokPhysics-<hash>.wasm`. See [Havok](physics-havok.md#loading-the-wasm-in-vite-and-headless-chromium).
- [tested] Guard the inspector behind `import.meta.env.DEV` and load it with a dynamic `import('@babylonjs/inspector')`: the production build then has no inspector chunk (count 0), against about 30 MB for the spike build that bundled it. See [the inspector](inspector-and-debugging.md#loading-the-inspector-on-demand).

## What the build still carries

- [tested] The glTF loader pulls in the PBR materials (`pbrMaterial.pure` 152 kB, `openpbrMaterial.pure` 128 kB, `pbr.fragment` 118 kB) although every mesh gets the toon material.
