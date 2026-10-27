# Integrating agent-beeps audio: memory and the wiring checklist

Index: [audio-integration.md](audio-integration.md).

## Memory: decoded buffers are large

Web Audio decodes whole files to uncompressed 32-bit float PCM, so memory is set by duration, not by file size.
Reported from one project (48 kHz stereo; the arithmetic is reproducible: 4 bytes x 2 channels x 48,000 x seconds):

- [general] **26.3 MB per decoded layer** of a song.
- [general] **131.6 MB for one 5-layer adaptive song**, because each layer is the whole song as its own buffer so the layers
  stay sample-aligned.
- [general] Compressed files are about 1 MB each; the 34 MB audio folder (214 MB as WAV) is not the budget. The decoded set is.
  Gate the folder size in CI (for example a 60 MB ceiling) and plan the decoded budget separately.

Consequences:

- [general] Decode a song when it is about to be needed and release it when it is not. Budget by decoded seconds times
  8 bytes per frame-channel pair (48,000 x 4 bytes x 2 channels = 384 KB per second).
- [documented] Players before version 4 never evict: a decoded buffer stays until the page closes. Player 4 (agent-beeps 0.9.0
  and later) evicts least-recently-used buffers that nothing holds, but only when the game passes `memoryBudgetBytes`; with no
  budget it behaves as before. A buffer that is playing, scheduled, part of the current music or ambience, or still fading out is
  never evicted, so the real peak can exceed the budget (`W_MEMORY_BUDGET`), and a buffer needed again soon after its eviction
  reports `W_MEMORY_THRASH` (raise the budget or prefetch less). `prefetch(ids)`, `unload(id)`, `memory()` and
  `layerLoading: 'state'` bound memory further (agent-beeps `runtime/player/loader.js` and its game-player reference). Read which
  player a game vendored from the `PLAYER_VERSION` export of the exported player (`'3'` in 0.8.0, `'4'` from 0.9.0).
- [general] An app with many songs still plans its set: load a region's songs on entry, and on a phone budget one adaptive
  song at a time. Plan this before adding the fifth or tenth song, not after a mobile tab is killed.
- [general] Sfx are short and cheap; preload them.
- [general] Fewer layers is the cheapest memory fix; split a long song into sections before adding layers.

## Wiring checklist

1. [general] `beeps.build.json`, recipes, a committed lock, a store. Build once on the author's machine and push.
2. [general] Vendor the player (`beeps player export`) and commit it; the catalog check in CI fails if it drifts.
3. [general] Load `index.json`; every cue the game fires must exist in it (test this against the recipes, and against the
   catalog when built).
4. [general] Gesture unlock, the Opus probe and notice, and decode-failure reporting.
   A hosted smoke test closes the loop: build with the Pages base, serve it with `vite preview --base=...`, expose a
   production handle behind a query flag (`?audiodebug`), and assert that every audio response is 200 from under the
   base, 0 audio bytes arrive before the gesture, after one gesture the context, beds, music and a cue's
   `AudioBufferSourceNode` start, the console is clean and first-load bytes stay in budget (for example 14 files,
   4 MB). Skip it when the audio folder is absent, and run the catalog tests with `REQUIRE_AUDIO=1` in CI so a
   missing render fails instead of skipping.
5. [general] Decoded-memory budget and a release policy: set `memoryBudgetBytes` on player 4, or release songs yourself on an older player.
6. [general] CI from the template, fetching by lock, plus an advisory browser job.
