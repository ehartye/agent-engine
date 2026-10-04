---
name: engine-custom-shaders
description: Add or debug runtime GPU shaders in a custom game renderer, including Canvas/WebGL post effects, pixel lighting and trails. Use when keeping an owned engine instead of porting, or when CPU pixel passes are slow; not for painting sprite shading into exported art.
---

# Custom engine GPU shaders

**Custom is an engine type:** the project owns its game loop and rendering contract.
Add the requested GPU stage without treating it as permission to adopt a framework,
replace gameplay, or build a general-purpose engine. Agent-engine owns this runtime
work; agent-sprites owns the source art, atlas and playback metadata.

For Canvas/WebGL work, read [the pass integration guide](references/canvas-webgl.md).
For an existing native renderer, use its shader/material API and current vendor
documentation instead of introducing WebGL. A standalone shader is not an engine
port and does not supply scenes, physics, asset import or native export tooling.

## Establish the rendering contract

Inspect the actual passes before editing: native buffer and output sizes, world
and screen coordinates, camera/pixel rounding, lighting and emissive order, alpha,
UI composition, and pointer mapping. Keep the project's chosen pixel/palette rules;
blur and smooth lighting are artistic choices, not automatic improvements.

Choose one measurable target. For a CPU chem/post pass, begin with an identity
GPU pass, then replace that effect. Keep CPU lighting initially if it is outside
the task, and say that its cost remains. Converting lighting separately must
preserve quantization/dither and which objects are emissive.

## Integrate and prove the pass

- Prefer GPU presentation with UI outside the world effect. Avoid per-frame GPU
  readback; copying WebGL output into Canvas 2D is also a boundary to measure.
- Preserve native-resolution sampling before integer upscale for strict pixel
  games. Verify texture orientation, pixel centers, alpha and atlas edges rather
  than assuming the default sampler or coordinate system is right.
- For temporal effects, use separate previous/output targets and reset history
  on the relevant scene/size transitions. Never read from the texture currently
  attached as the render destination.
- Make shader compile/link and framebuffer failures observable. Own and dispose
  the stage's resources; verify context recovery or the project's chosen failure
  path. A silently disabled shader is not successful GPU verification.

Require a screenshot at native size and the intended display scale: it catches
flipped output, wrong pivots/scale, sampling blur, dither drift and UI contamination.
Check an effect-off identity frame, the requested effect and representative stacked
effects. Verify input/HUD alignment after changing canvases or presentation.

Compare complete frame times on the same scene, browser, device and effect state,
including texture uploads and composition. Record whether rendering uses hardware
or software. Use CPU/GPU measurements that are available without introducing a
synchronous readback just to time the pass. Do not claim faster frames merely
because shader work executes on the GPU.

## Report the evidence and the cost

Tag capability claims **tested here**, **documented**, or **general knowledge**.
Separate shader compilation, visible fidelity, runtime behavior and measured
performance; prose/metadata validation does not establish any of these runtime
proofs. Name the time, regression risk and ongoing resource/context maintenance
added by the bridge. If a full renderer replacement becomes necessary, surface
that larger scope before expanding the change.

There is no agent-sprites shader CLI implied by this skill. Use its exported PNG,
atlas and playback contract unchanged unless the task calls for an asset change.
