# Audio in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

Recorded one-shots, looping beds and a capped voice pool on three's `AudioListener` and `Audio`, behind a small port so the policy can be tested without an `AudioContext`. The example app has no audio, so the audio rules here are read from the Web Audio and three sources or are plain guidance; none of it was checked by ear. The gesture-to-probe pattern follows the "ready means drawn" probe ([probe and verification](probe-and-verification.md)).

## Unlock on a real gesture

- [documented] Browsers start an `AudioContext` suspended until the page has had a user gesture (MDN, "Autoplay guide for media and Web Audio APIs"). three creates the context when the first `AudioListener` is constructed (`AudioContext.getContext()` in `three/src/audio/AudioContext.js`), so construct the listener, or call `resume()`, inside the first `pointerdown`, `keydown` or `touchend` handler.
- [general] Make `unlocked` the app's own flag, set only after `resume()` resolved to `running` and the buffers are decoded, then remove the listeners. Before that, `play()` returns without playing or logging. Do not use the context state as the gate: a test driver can count as user activation and a context may start `running` there, so a state check passes without a real gesture.
- [general] Fetch the sound bytes at startup and decode them on unlock; report a failed fetch the way a failed model load is reported (the probe's `errors`, plus a visible banner).
- [general] Unit-test the policy against a fake port: nothing plays or logs before the first gesture; a gesture unlocks, then plays; it stays locked and can retry if the context will not run; the handler unlocks once and removes itself.
- [general] Expose `audio.unlocked` and a capped `audio.played` log in the probe, and have the verifier click once: false and empty before, true and non-empty after. Cap the log for noisy groups only, so a repeated sound cannot grow it without bound.

## Variants without immediate repeats

- [general] Give each event a group of 3 to 5 variants and never pick the one just played (draw from the others, or shuffle a bag). Seed the picker (a seeded PRNG: [rng.mjs](../../../examples/web3d/core/rng.mjs)) so a test replays the same sequence.
- [general] Vary pitch a little per play (a few percent of `playbackRate`) and climb a semitone per event along a chain (pickups within a short window), capped, so rapid repeats read as a phrase rather than a machine gun.
- [general] A legacy probe id that a verifier already looks for can stay alive when a sound is split into finer groups: log the real group and the old id, and give the old id its own non-repeating sequence. Copying the group's variant repeats it.

## Looping beds with parameter ramps

- [documented] A bed is its own `Audio` with `setLoop(true)`, started once and driven by `setVolume` and `setPlaybackRate`. In `three/src/audio/Audio.js` both go through `setTargetAtTime` with a 10 ms constant, so per-frame updates do not zipper. Calling `play()` on an `Audio` that is already playing only warns and returns, so a pool must `stop()` a voice before reuse.
- [general] Compute the targets as pure functions of game state (effort from throttle and speed over the vehicle's maximum; a boost layer fed by an amount you ramp at a fixed rate so it never steps) and smooth them exponentially (gain rises faster than it falls; rate slower than both). Drive them from the view's frame, not the fixed step.
- [general] Author the loop file seamless (fold the tail into the head) rather than setting loop points; start at volume 0, fade in over about 0.1 s, crossfade about 0.3 s when the source part changes, fade out and stop when play ends. Start a layer only when audible and stop it once silent. A missing bed stays silent, never an error; log each start once in the probe.
- [general] Reading back the gain and rate the mix asked for proves the right file loops with the right numbers, not that it sounds right. Listen.

## A capped, prioritised voice pool

- [general] A round-robin pool that cuts the oldest voice lets a rapid-fire sound cut a rare important one. Use a pool addressed by slot and allocate in order: (1) a group never holds more than its cap, and over it cuts its own oldest voice; (2) a finished voice is free; (3) otherwise the victim is the lowest priority and, among equals, the oldest, only if it matters no more than the newcomer; a sound that matters less than everything playing is dropped.
- [general] Priorities and caps are data: a table of `{ priority, cap, minGapMs }` per group, so tuning is an edit, not a code change. Rate-limit starts of sounds that a beam or a per-step hit would machine-gun (tens of milliseconds for hits, more for thuds).
- [general] Expose allocator stats for tuning (started, stolen and dropped by group, peak voices, suppressed starts). A simulated minute of the heaviest realistic mix through the allocator, with a fake clock, shows whether a critical sound is ever dropped.
- [general] Duck by volume multiplier rather than by stopping: a big event lowers low-priority starts and the beds for a short hold plus a release; the event itself is never ducked. The depths are a listening decision.

## Route events to groups

- [general] Map game events to groups in one table, with a test per event. Gate by magnitude (a bump sounds only above a speed, volume scaled between the gate and a maximum). A held beam has no discrete shot, so emit an event on a timer while held. If a lookup answers a default silently for an unknown id, assert that every id has its own group.
- [general] Sounds are non-positional here. For positional audio use three's `PositionalAudio` and budget its extra panner nodes in the voice cap.

## Links

- [Probe and verification](probe-and-verification.md)
- [Frame loop and state](frame-loop-and-state.md)
- [Particles and explosions](particles-and-explosions.md)
