# Babylon.js bundle size and imports

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Babylon.js is large if you import the package root, and small enough if you import deep modules. The catch is that many features register themselves as a side effect of importing one module, so a missing import fails quietly or at run time. The example imports only deep `@babylonjs/core/...` paths ([`main.mjs`](../../../examples/web3d/babylon/src/main.mjs), [`labs.mjs`](../../../examples/web3d/babylon/src/labs.mjs)).

## Size

- [tested] (babylon verify: a deep-import production build stays under 2 MB of JavaScript) The example (engine, scene, free camera, hemispheric light, `StandardMaterial`, mesh builders, thin instances, the outline renderer and instrumentation) builds with Vite 8.3.3 to about 1.6 MB of JavaScript (1597 kB in the run recorded here, the sum of the chunks' code). The check is a loose ceiling so a barrel import is noticed, not a budget; run `npm run verify` for the current figure.
- [general] Importing from the package root (`@babylonjs/core`) pulls in far more and defeats tree shaking; keep every import a deep path, and re-run the size check after each new feature.
- [general] Gzip and the split between chunks depend on your app; measure your own build. The verifier does not report them.
- [general] Heavy assets are separate downloads, not JavaScript: the Havok WASM is about 2 MB ([Havok](physics-havok.md)), plus your models and audio.

## Side-effect imports

- [documented] 9.29.0 ships each module twice: `foo.pure.js` is side-effect free, and `foo.js` re-exports it and then registers the feature (for example `particleSystem.js` calls `RegisterParticleSystem()`; `package.json` lists `Shaders/**` as side-effectful). A deep import of the non-pure path registers the feature; a `.pure` import does not.
- [documented] Features that augment a class are left as stubs until their module is imported (`Misc/devTools.js`). `Mesh.prototype.thinInstanceSetBuffer` is a stub (`mesh.pure.js`, line 4946) and `renderOutline` is a property that reads `undefined`, and whose setter just stores a value (`abstractMesh.pure.js`, line 2495), so assigning `mesh.renderOutline = true` without `Rendering/outlineRenderer` draws no outline and raises no error.
- [documented] Turn the stubs loud while developing: `SetMissingSideEffectWarningsEnabled(true)` from `@babylonjs/core/Misc/devTools` makes a stub log a one-time "requires a side-effect import" warning. Warnings are off by default because the engine probes optional features itself.
- [tested] (babylon verify: built-in outline; thin instances) The example imports `@babylonjs/core/Rendering/outlineRenderer` and `@babylonjs/core/Meshes/thinInstanceMesh` explicitly, and both features work in the real GPU checks.
- [documented] A shader chunk you `#include` must have been registered by importing its module (`@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration`, `.../instancesVertex`). An unregistered include is not an error at once: the shader processor falls back to fetching `ShadersInclude/<name>.fx` from the shaders repository (`Engines/Processors/shaderProcessor.js`), which does not exist in a bundled app.
- [documented] The side-effect imports a feature set needs, read from 9.29.0 source (verify each at run time on your version):

```js
import '@babylonjs/core/Meshes/thinInstanceMesh';                   // thinInstanceSetBuffer and friends
import '@babylonjs/core/Rendering/outlineRenderer';                 // mesh.renderOutline
import '@babylonjs/core/Shaders/ShadersInclude/instancesDeclaration'; // custom shaders that #include them
import '@babylonjs/core/Shaders/ShadersInclude/instancesVertex';
import '@babylonjs/core/Particles/webgl2ParticleSystem';            // GPUParticleSystem on WebGL2; imports the update shaders and transform feedback
import '@babylonjs/core/Particles/gpuParticleSystem';               // render shaders for GPU particles
import '@babylonjs/core/Particles/particleSystem';                  // CPU ParticleSystem registration
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';      // scene.enablePhysics and physics stepping
import '@babylonjs/loaders/glTF/2.0';                               // GLB loading (separate package)
```

- [documented] The CPU particle shaders (`particles.vertex`, `particles.fragment`) are loaded by a dynamic `import()` inside `ThinParticleSystem`, so a bundler emits them as their own small chunks instead of needing a hand-written import ([particles and explosions](particles-and-explosions.md)).

## Splitting off the heavy parts

- [general] Import the Havok WASM with `?url` (`@babylonjs/havok/lib/esm/HavokPhysics.wasm?url`) so it is emitted as its own asset and stays out of the JavaScript chunks.
- [general] Guard the inspector behind `import.meta.env.DEV` and load it with a dynamic `import('@babylonjs/inspector')`. A production build then has no inspector chunk; a build that bundles it is many times larger ([inspector and debugging](inspector-and-debugging.md)).
- [general] The glTF loader brings in the PBR material code even when every mesh is re-materialed with a toon `ShaderMaterial`. Expect that cost once you load GLBs and measure it.
