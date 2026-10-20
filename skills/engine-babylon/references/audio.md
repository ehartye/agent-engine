# Audio in Babylon.js

Evidence: `examples/web3d` (core tests, the Babylon.js Node tests and verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pin: @babylonjs/core 9.29.0 (see [versions and migrations](versions-and-migrations.md)).

Babylon.js 9 plays recorded WAVs through its AudioV2 engine (`@babylonjs/core/AudioV2`). The example makes no sound, so nothing here is `[tested]`; the claims are read from source or are guidance from an earlier project that played recorded effects (explosion variants, a pickup chime). The sounds themselves come from the agent-beeps skills; this is only the Babylon side.

## Audio engine and loading

- [documented] `CreateAudioEngineAsync(options)` builds the engine and `CreateSoundAsync(name, source, options, engine)` decodes a file into a static sound; `sound.play({ volume })` starts an instance, and `maxInstances` caps overlapping plays of one sound (`AudioV2/webAudio/webAudioEngine.js`, `abstractAudio/audioEngineV2.js`, 9.29.0).

```js
import { CreateAudioEngineAsync } from '@babylonjs/core/AudioV2/webAudio/webAudioEngine';
import { CreateSoundAsync } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';

const engine = await CreateAudioEngineAsync({ disableDefaultUI: true, resumeOnInteraction: true });
const sound = await CreateSoundAsync('explosion-0', '/audio/explosion-0.wav', { maxInstances: 6 }, engine);
sound.play({ volume: 0.8 });
```

- [documented] `disableDefaultUI: false` (the default) adds Babylon's own unmute button; a game with its own start screen turns it off. `resumeOnInteraction` (default true) makes the engine resume its `AudioContext` on the first user gesture.
- [general] In an earlier project the engine and decoding worked while the `AudioContext` was still `suspended`, so load sounds at start and gate only `play()` on the unlock.

## Unlock on the first gesture

- [documented] `engine.unlockAsync()` is `resumeAsync()`, which calls `AudioContext.resume()`; `engine.state` reads the context state and `stateChangedObservable` reports changes.
- [general] Do not use the context state as a gesture gate in an automated browser. Playwright's `page.evaluate` counts as user activation in Chromium, so a fresh `AudioContext` can report `running` before any click, and a check like "audio is locked before a real gesture" fails for the wrong reason.
- [general] Keep your own flag, set only from a trusted `pointerdown` or `keydown` (`event.isTrusted`), and gate `play()` on that flag as well as on the engine state:

```js
const unlock = (e) => { if (e.isTrusted) void audio.unlock(); }; // sets gestured, then engine.unlockAsync()
window.addEventListener('keydown', unlock);
canvas.addEventListener('pointerdown', unlock);
// get unlocked() { return this.gestured && this.engine?.state === 'running'; }
```

- [general] Synthetic `dispatchEvent` input has `isTrusted === false`, so use the browser's real input (`page.mouse.click`, `page.keyboard.press`) in the verifier to unlock.

## Variants without immediate repeats

- [general] To avoid hearing the same explosion twice in a row, draw from `count - 1` slots and skip over the last index; it never repeats and needs no retry loop:

```js
let pick = Math.floor(rng() * (count - 1));
if (pick >= last) pick++;
last = pick;
```

- [general] Use a seeded generator for the pick, not `Math.random`, so a replay or a test hears the same sequence. Play nothing, and log nothing as played, before the unlock.

## State the probe can read

- [general] Expose `audio.unlocked` and `audio.played` (the sounds played since the unlock) in the state probe ([probe and verification](probe-and-verification.md)). A verifier launched without an autoplay flag can then assert `unlocked` is false and `played` is empty before one real click, and that `unlocked` becomes true within a couple of seconds after it. Sound output itself is not verified; the probe checks that the right call was made.

Related: [bundle size and imports](bundle-size-and-imports.md), [webgpu and headless](webgpu-and-headless.md).
