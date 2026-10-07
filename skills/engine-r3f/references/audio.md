# Audio in R3F

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1 in headless Chromium 153 (Playwright 1.63.0) launched without an autoplay flag, and in Vitest unit tests.

Recorded sound effects through three's `AudioListener` and `Audio` classes behind a small backend port. Nobody listened to the result: it is not verified by ear.

## Loading and decoding

- [tested] Fetch the WAV bytes at startup; decode them on unlock. The five WAVs are decoded before `unlocked` turns true.
- [tested] Create three's `AudioListener` (and so the `AudioContext`) inside the first gesture handler (`ThreeAudioBackend.resume()`). No context exists before a gesture, and Chrome logs no autoplay warning.
- [tested] Play through 8 round-robin `Audio` voices.
- [tested] A failed WAV fetch reaches the probe's `errors` like a failed GLB, with an on-screen banner.

## Unlock on the first gesture

- [tested] Make `unlocked` the app's own flag, never the `AudioContext` state. `AudioDirector.install(window)` (called in `main.tsx`) listens for `pointerdown`, `keydown` and `touchend`; the handler calls `unlock()`, which sets `unlocked = true` only after `resume()` reports the context `running` and the WAVs are decoded, then removes the listeners.
- [tested] `play()` returns without playing or logging while `unlocked` is false.
- [tested] The context state is not a gesture gate under Playwright: the Babylon.js app first reported the context state and failed the check, because `page.evaluate` counts as user activation and Chromium starts new contexts running (see engine-babylon).
- [tested] The handler does not check `event.isTrusted`, so a synthetic `dispatchEvent` would also unlock it. The verifier sends no synthetic events (inputs go through `window.__game.input.set`), so its gate held.
- [tested] Unit-test the policy without an `AudioContext` (`tests/audio.test.ts`): nothing plays or logs before the first gesture; a gesture unlocks, then plays and logs; it stays locked when the context will not run, and can retry; the listener unlocks once and removes itself.

## Variants without immediate repeats

- [tested] Explosion variants never repeated back to back over a full run (19 sounds in the smoke scenario).
- [tested] Pickup pitch climbs a semitone along a chain of pickups within 350 ms.

## State the probe can read

- [tested] Expose `audio.unlocked` and an `audio.played` log in the probe. One `page.mouse.click` flipped `audio.unlocked` true.
- [tested] The shared verifier saw `audio.unlocked` false and nothing played before its one real click, true after, with `explosion` and `pickup` both in `audio.played` (13 and 17 sounds logged in two runs; 17 to 19 per smoke scenario).
