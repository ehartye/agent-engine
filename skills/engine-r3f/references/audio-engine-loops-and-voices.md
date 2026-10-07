# Audio engine loops, voices and routing in R3F

Evidence: Sector Run, `docs/lessons/r3f.md` and the `apps/r3f` code and unit tests (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there (a log entry or a unit test), `[documented]` was read in code only, `[general]` was not checked. Measured on three 0.186.1 in headless Chromium 153; nobody has listened to any of it.

This builds on [Audio in R3F](audio.md) (recorded one-shots, the gesture unlock and why the app's own `unlocked` flag is the gate). It adds a voice allocator with priorities, looping engine beds, ducking and event routing, for a game that fires many sounds a second.

## Layers

- [tested] Keep the policy free of the audio engine. A director holds the unlock, variants, voices, ducking and probe log; a voice allocator and an engine-loop class are pure; a thin backend implements a port (`resume`, `decode`, `play(slot, buffer, volume, rate)`, `startLoop`) with three's `AudioListener` and `Audio`. All of it is unit-tested with fake ports and a fake clock.
- [documented] The game sees a small port: `unlocked`, a `played` log, `play(group, opts)` and `updateEngine(frame)`. Sounds are asked for by group name; a manifest lists ids and group priorities, with the package's list as fallback. Superseded files are not fetched.

## Voice allocation

- [tested] One-shots share a pool of 16 `Audio` voices addressed by slot. The old pool, 8 voices round robin cutting the oldest, let a gun at nine shots a second cut an explosion. The allocator applies in order: (1) a group never holds more than its cap, and over it cuts its own oldest voice; (2) a finished voice is free; (3) otherwise the victim is the lowest priority and, among equals, the oldest, only if it matters no more than the newcomer; a sound that matters less than everything playing is dropped.
- [tested] Caps used: cannon groups 6 (rail 4), rock hit 3, bump and hull hit 2, small, medium and large explosions 4, 3 and 2, pickup 4, others 4. Priority 1 hull damage and the ship's explosion; 2 rock explosions, bump, rail; 3 cannons, rock hits, pickups; looping beds sit outside the pool. A priority from the manifest wins over the code default.
- [tested] Rate-limit starts of sounds a beam or a shot-per-step would machine-gun: rock hit 40 ms, bump 120 ms, hull hit 150 ms.
- [tested] Measured through the allocator over a simulated minute (9 shots a second of 0.18 s, a rock hit every 40 ms, a 2 s explosion every 0.7 s, bumps, hull hits, pickups): no explosion or hull sound dropped, peak at most 16 voices. In Chromium, full-rate fire into six rocks (235 sounds) peaked at 10 of 16 voices with none dropped or stolen.
- [documented] Expose allocator stats (started, stolen and dropped by group, peak, suppressed starts) for tuning, and cap the probe's played log for the noisy groups only so a repeated sound cannot grow it without bound.

## Ducking

- [tested] A medium explosion ducks priority 3 starts and the engine loops by 35 percent (hold 250 ms, release 600 ms); a large one by 55 percent (500 ms, 900 ms), as a volume multiplier. The explosion is never ducked. Whether the amounts are right is a listening question.

## Engine loops

- [tested] The engine class asks a loop port for a loop by id and sets gain and playback rate every frame from pure mix functions in the audio package: effort from thrust and speed over the ship's maximum, a boost layer fed by an amount ramped at 4 per second so it never steps, and exponential smoothing (gain up 0.12 s, down 0.35 s, rate 0.25 s).
- [tested] A loop is its own `Audio` with `setLoop(true)`, started at volume 0 and driven by `setVolume` and `setPlaybackRate` each frame. three's `setVolume` smooths over 10 ms, so no zipper noise needed handling. The files are folded to a seamless 1.000 s loop, so set no loop points.
- [tested] Lifecycle: start when the ship is ready, the menu is closed and audio is unlocked; fade in 0.1 s; crossfade 0.3 s when the engine part changes (a part with no bed gets the starter's); fade out 0.12 s and stop when flight ends. Start the boost layer only when audible and stop it once silent. A missing loop stays silent, never an error. Log each bed start once in the probe.
- [tested] Chromium (23 checks): after one real click, idle bed gain 0.22 and rate 0.85; held thrust 2.2 s gave 0.88 and 1.18; boost added gave a boost gain of 1.00; letting go gave 0.33 and stopped the boost layer; equipping another engine crossfaded and left one bed.

## Route events to groups

- [tested] Shots go to the family's fire group, hits to rock hit, a rock kill to a size class (small under 20 m, medium from 20 m, debris at volume 0.6), the ship's destruction to the large explosion, pickups to pickup, a bump to the thud only above 12 m/s (volume 0.5 at the gate to 1 at 60 m/s) and hull damage of 0.5 or more to hull hit. One test per family and event.
- [tested] A library mapping from weapon to sound can answer a default silently (here `fire-twin` for any unknown cannon), so keep its answer only when the cannon has a dedicated group. Missile reuses the scatter blast, spore and arc the pulse bolt: judgement calls, not a measured fit.
- [tested] A beam has no shot, so emit a shot event on a timer (0.25 s) while it is held to give it a muzzle event and a sound.
- [tested] Keep a legacy probe id alive when sounds are split: the verifier looks for `explosion`, so the app logs the real group and also `explosion` with its own four-variant sequence that never repeats across both size classes. Copying the group's variant repeated.
- [documented] A pickup chain within 350 ms climbs a semitone per pickup, capped at 7.

## Not verified

- [documented] Nobody listened: the figures show the right file loops at the gain and rate the mix asks for, not that it sounds like an engine, that the loop is inaudible or the crossfade smooth. Caps, duck depths and the family-to-sound choices are untuned by ear. All voices are non-positional.
- [documented] The older note says five WAVs are decoded before `unlocked`; the director now decodes every sound the manifest lists (41).
