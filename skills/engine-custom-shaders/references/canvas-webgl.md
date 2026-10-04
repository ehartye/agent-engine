# Canvas to WebGL passes

Status: **documented architecture**, with a tested Cyberpunkt implementation
recorded below. This is not the engine sample-scene acceptance pass. Check APIs
against the project's WebGL version. WebGL 1 and 2 differ in
GLSL syntax and texture/framebuffer capabilities; don't mix shader versions.

## Keep the renderer boundary small

A Canvas that has a 2D context cannot also provide a WebGL context. Keep existing
world drawing in an offscreen Canvas and use a separate WebGL presentation surface.
Canvas/OffscreenCanvas is a supported texture source for `texImage2D`; it does not
need an intermediate `getImageData` extraction. Allocate textures to the required
dimensions, then update them with compatible upload calls rather than reallocating
every frame. Texture upload remains a cost even at low resolution.

For a game whose current order is world, lighting, emissives, post effects, HUD:

```text
world Canvas -> existing CPU lighting -> emissive drawing
             -> source texture -> GPU post effect -> WebGL presentation
bitmap HUD Canvas ---------------------------------> browser composition
```

This example replaces only post effects. It does not remove the lighting pixel
loop. Keep HUD outside the distorted texture; a transparent overlay can preserve
existing bitmap drawing. Match overlay/output bounds and input coordinate mapping,
including device-pixel ratio, letterboxing and resize. Handle title/menu/transition
frames too, so stale world output cannot show through.

Prefer displaying the WebGL surface directly. A bridge that draws its result back
into the visible 2D Canvas may be acceptable when measured, but introduces another
composition boundary and can reduce the gain. Avoid `readPixels` or returning
`ImageData` to JavaScript every frame. An existing `willReadFrequently` hint should
be reevaluated if its CPU readbacks are removed, not deleted blindly while lighting
still reads pixels.

If lighting is part of the requested change, separate base world, lighting data
and emissives so the GPU can reproduce the same order. A smooth built-in light
does not reproduce palette-limited Bayer quantization. Do not add occlusion or
normal-map requirements unless the intended lighting needs them.

## Pixel and color fidelity

For strict pixel art, run the effects at native resolution with `NEAREST` sampling,
no mipmaps and clamp-to-edge wrapping, then integer upscale. Explicitly handle
out-of-range warp coordinates. Verify pixel-center alignment and Y orientation
using asymmetric corner markers; distinguish upload flipping from shader UV flips.
Avoid applying both. Match the existing transparent-pixel and premultiplied-alpha
behavior, and check color/tint treatment against an identity frame. Trail feedback
must not accidentally accumulate HUD or force transparent edges to become opaque.

Sampling the full-screen world texture avoids per-frame atlas UV handling. If
shading individual sprites instead, honor trimmed-frame offsets, pivots and ground
anchors; clamp sampling inside the frame or provide gutters to avoid neighboring
frames bleeding into outlines. Do not discard the sprite playback contract.

## Temporal effects and lifecycle

Use two distinct history textures/framebuffers. Sample the previous result while
writing the next, then swap their roles. Keep source input separate from an active
render target; sampling a target attached to the current framebuffer is a feedback
loop error. Define whether history contains lit, warped or final world pixels:
changing this order changes the effect.

Preserve the game's intended time basis. If changing frame-dependent trail decay
to elapsed-time decay, treat that as a behavior change and compare it. Clear history
on the relevant scene switches, resize, disabled/re-enabled effects and context
restoration. Recreate owned programs/textures/framebuffers after context restoration
or use an explicit, verified fallback; stopping with a useful error is valid when
the project requires WebGL and has no fallback. Log compile/link diagnostics and
check framebuffer completeness at creation/recreation.

## CPU profiling and bounded caches

Warm asset uploads, shader compilation and caches before sampling steady play;
report startup separately. Time world drawing, lighting, emissives, post effects
and HUD, then the complete frame callback including simulation and input. Within
a CPU pixel pass, separate light-map readback, world readback, pixel math and write.
Canvas drawing can defer work until a later readback: cheap drawing submission and
an expensive `getImageData` do not by themselves locate the underlying cost. Keep
the combined stages and complete callback as the comparison that matters.

Record browser/version, device, actual hardware/software renderer, native/output
sizes and CPU/GPU effect path. Use reproducible opening and crowded combat scenes;
record visible enemies, projectiles, particles, hazards and active effect counts,
not only total entities on the map. Keep scene, camera, seed, effect state and
sample duration matched; repeat alternating baseline/candidate runs. Report median
and p95 stage/callback times alongside animation-frame intervals and missed-frame
counts. A 60 FPS target allows about 16.67 ms per frame, including work outside the
callback. Faster CPU submission does not establish presentation latency or a
mobile result; when both versions sustain 60 FPS, report added frame headroom.

Try one measured hotspot at a time and reject flat or worse comparisons. Treat
`willReadFrequently` as a context-creation choice to benchmark across the real
drawing/readback/upload path, not a blanket speed fix. Compare fresh contexts;
calling `getContext` again does not recreate the existing context. Making a ground
cache CPU-backed need not improve a subsequent world readback. Keep a successful
pixel-parity result separate from evidence of a performance gain.

For a cache, declare every input in its key, its lifetime, invalidation on source
or parameter changes, and maximum entries/bytes. Prefer finite tables over
unbounded caches keyed by continuously changing colors, radii or effect values.
A finite lookup indexed by light-map channel byte and Bayer phase can remove
repeated rounding and division while preserving the original multiplier; retain its precision and
the final byte clamping behavior. Verify all channel/phase/source-byte combinations
against the uncached formula when exhaustive checking is practical, preserve alpha,
and compare complete rendered pixel buffers across representative scenes. Verify
cache reset/rebuild where needed; do not quantize moving inputs just to improve a
cache hit rate without treating that as a visible behavior change.

## Useful proof

Capture an identity frame with corner markers, a representative warp/color frame
and a trail reset. Inspect native-resolution and display-scale screenshots for
pixel grid, palette/dither, alpha, emissive ordering, HUD clarity and pointer targets.
Exercise resize and context loss/restoration, and record which rendering path ran.
Benchmark the whole frame under the same browser/device/scene, with effects on and
off; a software renderer or timing only shader submission is weaker performance
evidence.

**Tested here:** Cyberpunkt's custom Canvas renderer now uses a native 384x216
WebGL 2 chem pass with direct presentation and separate bitmap HUD/messages.
Hardware Chromium on an NVIDIA RTX 5070 Ti Laptop verified byte-exact identity,
all twelve chems and stacked effects against CPU output (small warp-boundary
differences), trail resets, resize, CPU fallback and context recovery. The game's
[GPU regression test](https://ehartye.github.io/cyberpunkt/tests/gpu-postfx.test.mjs)
records the checks; test-only readback is not part of
gameplay. Repeated same-scene frame-callback measurements showed roughly 7–19%
lower median time for GPU effects, with CPU world/lighting still dominant. This
does not establish complete presentation latency, mobile speed or a general
engine performance claim. Other custom renderers still require their own proof.

## Documentation

- [Canvas texture sources and upload overloads](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D)
- [WebGL best practices: uploads, blocking calls and resource costs](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL context attributes and creation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)
- [WebGL context restoration](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event)
- [Canvas reuse, layering and drawing optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Animation-frame scheduling and refresh rates](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
