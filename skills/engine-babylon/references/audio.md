# Audio in Babylon.js

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

Sector Run plays recorded WAVs (explosion variants and a pickup chime) through Babylon's AudioV2 engine (`src/audio/director.ts`).

## Audio engine and loading

- [tested] Create the engine with `CreateAudioEngineAsync` and decode each file with `CreateSoundAsync`; both work while the context is still suspended. After creation `engine.state` and the `AudioContext` are `suspended`, and five stand-in sounds decoded anyway (0.4, 0.4, 0.4, 0.4 and 0.2 s).

```ts
import { CreateAudioEngineAsync } from '@babylonjs/core/AudioV2/webAudio/webAudioEngine';
import { CreateSoundAsync } from '@babylonjs/core/AudioV2/abstractAudio/audioEngineV2';

const engine = await CreateAudioEngineAsync({ disableDefaultUI: true, resumeOnInteraction: true });
const sound = await CreateSoundAsync('explosion-0', '/audio/explosion-0.wav', { maxInstances: 6 }, engine);
sound.play({ volume: 0.8 });
```

- [tested] All five sounds played with `sound.play({ volume })` after the unlock, with no console warning or error.

## Unlock on the first gesture

- [tested] Spike D, Chromium without an autoplay flag: after a real `page.mouse.click` the page saw `pointerdown`, `stateChangedObservable` reported `running` and `engine.unlockAsync()` resolved with `engine.state` `running`.
- [tested] Symptom: the first verifier run failed `audio is locked before the click`. The app had defined `unlocked` as `engine.state === 'running'`, and the context was already running before any click.
- [tested] Cause: in the verifier's page `navigator.userActivation.hasBeenActive` was true and a fresh `new AudioContext()` reported `running` before any input. Playwright's `page.evaluate`, which the verifier uses to read the probe, counts as user activation, so Chromium starts audio contexts running. The spike missed it because it read the state once, before any evaluate had run.
- [tested] Workaround: keep your own flag, set only from a trusted `pointerdown` or `keydown` (`event.isTrusted`), and gate `play()` on it as well as on the engine state. A smoke `boot` check, `audio is locked before a real gesture`, failed with `{"unlocked":true}` before the fix and passes after it.

```ts
const unlock = (e: Event) => { if (e.isTrusted) void audio.unlock(); }; // sets gestured, then engine.unlockAsync()
window.addEventListener('keydown', unlock);
canvas.addEventListener('pointerdown', unlock);
// get unlocked() { return this.gestured && this.engine?.state === 'running'; }
```

- [tested] Under Playwright the context state is not a gesture gate. The R3F app keeps its own flag too, but sets it without checking `event.isTrusted`.

## Variants without immediate repeats

- [tested] Each explosion picks a variant that differs from the last one played; nothing is played, or logged as played, before the unlock.
- [documented] The picker draws from `count - 1` slots and skips over the last index, so it never repeats and needs no retry loop; the app ships four explosion variants and one pickup chime (`apps/babylon/src/audio/variants.ts`):

```ts
let pick = Math.floor(rng() * (count - 1));
if (pick >= last) pick++;
last = pick;
```

## State the probe can read

- [tested] The probe exposes `audio.unlocked` and `audio.played` (the sounds played since the unlock). The verifier, launched without an autoplay flag (`chromiumArgs` in `packages/probe/src/cli/args.ts`), asserts that `unlocked` is false and `played` is empty before its one real click in the middle of the page, and that `unlocked` is true within 2 s after it. With the trusted-gesture flag this passed in both verifier runs.
