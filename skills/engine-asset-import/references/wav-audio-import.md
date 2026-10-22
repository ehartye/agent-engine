# Rendered audio (agent-beeps WAV)

Documented by agent-beeps, not verified here:

- Engines receive rendered WAVs. The synth and the game player runtime are browser-only, so seeded
  live variation is not available in an engine.
- The library holds patch and song definitions, not audio. Render first: `beeps export <patch>
  --variants <n> --manifest` writes `<name>.<i>.wav` and one sidecar. `beeps song export <name>
  --layers <dir> --manifest` writes one WAV per layer.
- Variant weights and `noRepeat` live in the sidecar. The engine must reimplement the picking to
  repeat as the audition page does.
- Priority follows the FMOD convention: 1 is most important, 5 least. Songs are trimmed to a
  project loudness, -20 LUFS integrated by default.
- Godot follows loop metadata inside a WAV by default; Unity loops through `AudioSource.loop` and ignores it. Set the loop mode
  explicitly and confirm it after import.
- You cannot hear the result. In an engine, claim only that the source exists, plays, loops where
  it should, and logs no errors.
- Wiring an app (the lock, the store, the catalog, the Opus-only web format, the unsupported-browser notice, decoded-buffer
  memory) is [audio integration](audio-integration.md). Building and fetching it in CI, for audio or any
  generated asset, is [CI for generated assets](ci-for-generated-assets.md) with the workflow template
  `examples/web/ci/pages-audio.yml`. The mechanism itself lives in agent-beeps (`docs/build-lock-and-store.md`, the `beeps-ship` skill).
