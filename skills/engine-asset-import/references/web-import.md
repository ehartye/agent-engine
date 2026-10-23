# Web: Phaser and three.js

Built in the sample scene; pages and verifier in `examples/web`. For a real Phaser game (tilemaps, terrain overlays,
creatures, audio direction, GPU verification) use the [engine-phaser skill](../../engine-phaser/SKILL.md).

- [general] Phaser loads the agent-sprites atlas unchanged: `load.aseprite(key, png, json)` then `anims.createFromAseprite(key)`.
  It followed the tag into the mixed frames array (the campfire's texture frames were "8" to "15") and kept the
  100 ms and 125 ms durations. Phaser ignores the pivot slice: set the origin by hand (pivot over cell size).
- [general] three.js has no flipbook. Cut frames from the atlas with texture `offset` and `repeat`, follow the tag range, and
  use `Sprite.center` for the pivot. `GLTFLoader` kept the clip names (`walk`, `trot`), where Unreal prefixed them.
- [general] Pin three.js: 0.186 deprecated `THREE.Clock` for `THREE.Timer`.
- [general] The historical web sample uses the vendored agent-beeps player (`beeps player export`, `beeps bundle`). For exported recordings in a new Phaser integration, start with its native Loader/cache/SoundManager; see [native Phaser audio](../../engine-phaser/references/native-audio.md). The sample is evidence for its chosen player, not a requirement to bypass Phaser. In the beeps route, `unlock()` needs a real
  gesture. `play()` returns a handle whose `file` is the chosen variant, so variants are checkable; it honours
  `noRepeat`. That sample has an 8-voice budget; a full budget may steal a less-important voice or return null when none is eligible.
  Let the released player make that decision; null is not by itself a load failure.
- Launch headless Chromium with the platform's ANGLE backend plus `--ignore-gpu-blocklist --force_high_performance_gpu`
  (`--use-angle=d3d11` on Windows, `metal` on macOS, `gl` elsewhere; `gpuArgs` in `examples/web/verify-checks.mjs`),
  print the WebGL renderer string and fail when it matches `/swiftshader|llvmpipe|software|basic render/i`
  (`webgl-fallback`); `examples/web/verify.mjs` does this, `--allow-software` relaxes it. [tested] With no flags
  Chromium chose SwiftShader on the test machine (`node examples/web3d/r3f/renderer-flags.mjs` prints the choice for each
  flag set). Which GPU the ANGLE flags pick on a hybrid-GPU laptop varies with the machine, so read the string. Software
  WebGL raises no error and the picture looks plausible, so only the string tells.
- Verify the audio gesture gate without `--autoplay-policy=no-user-gesture-required`: assert audio is locked and
  nothing played before one real click (`page.mouse.click`), and running after it. [tested] Playwright's
  `page.evaluate` counts as user activation, so a fresh `AudioContext` reports `running` before any click and a
  context-state check passes vacuously. See [audio integration](audio-integration.md#verifying-the-gesture-gate).
