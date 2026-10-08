# Integrating agent-beeps audio into an engine app

How an app consumes agent-beeps output. The mechanism (hashing, lock, store, verify) and the codec
traps live in agent-beeps and are **linked, not copied**, here:

- `docs/build-lock-and-store.md` in agent-beeps: the algorithm, `beeps.build.json`, the lock schema, the store,
  `beeps verify`, failure modes.
- The `beeps-ship` skill in agent-beeps: the recipe an agent follows (build, lock, push, fetch, toolchain
  changes) and the web codec traps (MP3 `+bitexact` delay, WebKit-on-Linux MP3 padding, Opus determinism).
- For running that build in CI, see [ci-for-generated-assets](ci-for-generated-assets.md) and the template
  `examples/web/ci/pages-audio.yml`.
- Phaser specifics (cue tables, music state machine, decode failures) stay in
  [audio directors](../../engine-phaser/references/audio-directors.md).

If a fact here disagrees with those, they win; fix this page.

## The five pieces

| Piece | Owner | What the app does |
|---|---|---|
| Recipes | the app | patch and song JSON, `beeps.build.json`; ids equal the patch or song `name` |
| Lock (`audio.lock.json`) | the app, committed | records per recipe the input hash and every output file's sha256; its diff is the changed assets only |
| Store | one shared repo or directory | immutable tar per asset, named by input hash; CI fetches, never renders |
| Catalog (`index.json`) | generated | regenerated deterministically from the sidecars; the app loads it to learn every cue, bed, loop length and layer |
| Player | vendored (`beeps player export`) | decodes with Web Audio, unlocks on a gesture, plays cues, loops and adaptive layers |

Never hand-edit a built file: `beeps build` sees `output modified` and redoes it. Never render in CI on the normal
path; see the CI reference for why renders cannot be repeated.

## Format decision: Opus only for the web

Host **one** format. For a browser game the default is Ogg Opus (`web-universal`: 44 kbps music, 48 ambience,
72 sfx, 24 for the adaptive mix preview), one catalog, no twin folder, no format probe in the loader, no
URL rewrite. Fallow Valley tried a second MP3 build and removed it: two encodes to keep in sync, a catalog per
format, and a probe that can misreport. Reasons Opus wins for loops:

- Opus carries its length in the container (pre-skip and end granule position), so every browser trims alike.
  MP3 delay and padding handling differs by browser (Firefox ignores the delay when the encoder id is
  `Lavf lame`; WebKit on Linux does not trim MP3 padding at all), and a Chromium-only test hides both.
- Opus is byte-deterministic for one WAV and one ffmpeg build, so the lock can pin encoded bytes.
- It is smaller at equal quality.

The cost is reach: current Chromium and Firefox decode it, Safari and iOS only from 18.4 (macOS 15.4; Fallow Valley's
floor, accepted by the owner and checked by ear on a device, not by frame count), and WebKit on Linux and Windows
(GStreamer builds such as Playwright's WebKit) has no Opus at all. `canPlayType('audio/ogg; codecs=opus')` is `""` on
those. Do not paper over this with a fallback format. Probe, state the floor in the notice, and tell the player.

Choose the format by measuring frames, not by listening. [tested] `decodeAudioData` of one 68 s loop, frame delta against
the source (Fallow Valley, Chromium 153 and Firefox 155):

| Container | Chromium | Firefox |
|---|---|---|
| Ogg Opus, WebM Opus, MP3 with the LAME/Xing header kept | 0 | 0 |
| AAC in m4a | -21 | 0 |
| Opus in MP4 | -234 | -213 |
| Opus in CAF | decode fails | decode fails |

Two MP3 traps: WebKit on Linux decoded the MP3 twin 2139 frames long (encoder padding untrimmed), and ffmpeg `+bitexact`
dropped the LAME header so Firefox decoded loops 1610 frames long. All 57 shipped loops decoded with delta 0 in both
browsers; also report the worst loop-wrap seam in dB (11.7 dB), judged on the shipped encode, because a loop that starts
on a loud pulse by design reads higher in the source (21.3 dB) than after Opus. Re-vendor the player after a beeps
upgrade (player 3 ends a loop at the catalog's `frames` and reports `W_LOOP_LENGTH`).

Other engines: Unity, Godot and UEFN import WAV (`wav-master` target) and let the engine compress. UEFN keeps WAV
masters, often on Git LFS, and still benefits from the lock.

## Support probe and the unsupported-browser notice

At boot, before loading any audio:

1. Test Opus support with `canPlayType('audio/ogg; codecs="opus"')`. Treat `""` as no. Treat `"maybe"` and
   `"probably"` as unconfirmed: the probe is a hint, and it can misreport on some browsers.
2. For a confirmed answer, decode a tiny Opus clip with `decodeAudioData` and catch the rejection. That is the real
   test, and it is what the player's `E_DECODE` reports. Embed the clip in the bundle (Fallow Valley: 170 bytes) and
   decode it on a throwaway `OfflineAudioContext`: no gesture and no network are needed, and the callback-only and
   `webkit`-prefixed forms are handled. Playwright's WebKit may have no `AudioContext` at all, so the decision has three
   outcomes: ok, cannot-decode and no-web-audio.
3. If unsupported, **show a notice and run silent**; do not crash and do not substitute a second format. In a
   pixel-only game the notice is drawn from the game's own bitmap font like every other message. The game must
   stay playable without sound. Log one console warning and silence the player's per-file errors afterwards. Make the
   notice sticky, dismissed by a click, tap or key after a short wall-clock grace (about 1.5 s; frame-time timers
   stall on a slow software-GL machine and leave it undismissable), and mirror it in the live region.
4. Test it: a browser spec that runs WebKit on Linux and asserts the notice, and Chromium and Firefox specs that
   decode every music loop and compare the decoded frame count to the catalog's `frames` (delta 0).

A suspended `AudioContext` until a user gesture is normal, not a failure. Unlock on the first `pointerdown`, `keydown`,
`touchend` or `click`: Safari counts a finished touch or a click as the gesture, and a touch-only phone may never send
a `pointerdown` that qualifies. Give the player a context factory that falls back to `webkitAudioContext`. Let the
decode spec run without booting the game (it needs only `fetch` and `AudioContext`), so a browser that cannot run the
game still proves its decode.

## Verifying the gesture gate

- [tested] Do not read the gate from the `AudioContext` state under Playwright. `page.evaluate` counts as user
  activation in Chromium, so a fresh context reports `running` before any click and a "locked until the first
  gesture" check passes vacuously (Sector Run, React Three Fiber and Babylon.js apps, Chromium 153; repeated on the
  `examples/web` sample pages). Launch without `--autoplay-policy=no-user-gesture-required`, keep the app's own
  `unlocked` flag set only from a trusted (`event.isTrusted`) pointer or key event, assert it is false and nothing
  played before one real `page.mouse.click`, and true after it. `examples/web/verify.mjs` checks this; a page that
  unlocked from an evaluate failed it.

## Memory: decoded buffers are large

Web Audio decodes whole files to uncompressed 32-bit float PCM, so memory is set by duration, not by file size.
Measured on Fallow Valley (48 kHz stereo):

- **26.3 MB per decoded layer** of a song.
- **131.6 MB for one 5-layer adaptive song**, because each layer is the whole song as its own buffer so the layers
  stay sample-aligned.
- Compressed files are about 1 MB each; the 34 MB audio folder (214 MB as WAV) is not the budget. The decoded set is.
  Gate the folder size in CI (Fallow Valley: 60 MB) and plan the decoded budget separately.

Consequences:

- Decode a song when it is about to be needed and release it when it is not. Budget by decoded seconds times
  8 bytes per frame-channel pair (48,000 x 4 bytes x 2 channels = 384 KB per second).
- The vendored player **never evicts**: once a buffer is decoded it stays until the page closes. An app with many
  songs must manage its own set: load a region's songs on entry, and on a phone budget one adaptive song at a time.
  Plan this before adding the fifth or tenth song, not after a mobile tab is killed.
- Sfx are short and cheap; preload them.
- Fewer layers is the cheapest memory fix; split a long song into sections before adding layers.

## Wiring checklist

1. `beeps.build.json`, recipes, a committed lock, a store. Build once on the author's machine and push.
2. Vendor the player (`beeps player export`) and commit it; the catalog check in CI fails if it drifts.
3. Load `index.json`; every cue the game fires must exist in it (test this against the recipes, and against the
   catalog when built).
4. Gesture unlock, the Opus probe and notice, and decode-failure reporting.
   A hosted smoke test closes the loop: build with the Pages base, serve it with `vite preview --base=...`, expose a
   production handle behind a query flag (`?audiodebug`), and assert that every audio response is 200 from under the
   base, 0 audio bytes arrive before the gesture, after one gesture the context, beds, music and a cue's
   `AudioBufferSourceNode` start, the console is clean and first-load bytes stay in budget (Fallow Valley: 14 files,
   4.1 MB). Skip it when the audio folder is absent, and run the catalog tests with `REQUIRE_AUDIO=1` in CI so a
   missing render fails instead of skipping.
5. Decoded-memory budget and a release policy (the player does not evict).
6. CI from the template, fetching by lock, plus an advisory browser job.
