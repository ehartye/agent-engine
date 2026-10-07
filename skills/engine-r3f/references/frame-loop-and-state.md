# R3F frame loop and React state

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0, zustand 5.0.15, vite 8.3.3 and Playwright 1.63.0 (Chromium 153), Windows 11, unless a bullet says otherwise.

How the Sector Run R3F app split work between the frame loop, plain game code and React.

## Where per-frame code goes

- [tested] Put the game in a plain class, not in components. `GameSession` owns the core state, the world, effects, the fixed-step loop and the errors. `Sim` is the one `useFrame` that drives it: `session.frameUpdate(delta)` at priority -2. Views are thin components that read the session and mutate three.js objects (`ShipView`, `AsteroidsView`, `ProjectilesView`, `PickupsView`, `FxView`, `CameraRig`, `Backdrop`).
- [tested] Order the frame with negative priorities: `Sim` at -2, `CameraRig` at -1, views at 0. The order held: ship, camera and effects stayed in step in every screenshot.
- [documented] Do not give a `useFrame` a priority above 0 unless you mean to render by hand: it turns off R3F's automatic render (vault TSL guide, `renderPriority: 1`).

```tsx
useFrame((state, delta) => {
  session.drawCalls = state.gl.info.render.calls;   // previous frame's count
  session.framesDrawn = state.gl.info.render.frame; // render() calls so far
  frame.alpha = session.frameUpdate(delta);          // fixed steps, returns interpolation alpha
}, -2);
```

## What must not be React state

- [documented] R3F's hot-path rules: no `setState` in `useFrame` or in fast events; mutate refs and objects; read fast state with Zustand's `getState()`, not a reactive selector; avoid mounting and unmounting at runtime; share materials and geometries and use instancing (vault: R3F Docs, Performance Pitfalls).
- [tested] Write fast HUD values (speed, boost, fps) straight to the DOM: register the elements once and write `textContent` about 12 times a second. React never sees them.
- [tested] A one-off HUD effect can still be a React element: the comic word is mounted by a store event and animates itself with its own `requestAnimationFrame` writing `style` from the tested `popAt` timeline.
- [tested] What belonged where, in the end: game logic in plain TypeScript on a fixed 60 Hz loop that `useFrame` feeds; three.js objects mutated in frames; Zustand only for UI that changes a few times a minute; DOM refs for fast readouts. What went wrong was not React re-rendering but the camera frame and the probe's `ready` flag.
- [tested] Not measured: React render counts. "No wasted renders" holds by construction, not by profile.

## Fixed step and interpolation

- [tested] Draw ship and camera at a pose interpolated between the last two fixed steps (alpha from the loop). Draw shots backed off along their velocity by `(1 - alpha) x step`.
- [tested] Use a critically damped SmoothDamp for the camera spring: it stayed stable at any frame time.
- [tested] A display faster than the step runs no step on most frames: at 144 Hz most rendered frames run no 60 Hz step, and a hit-stop runs none for several frames. Anything consumed "per step" must survive frames that run no step (see the latch rule below).

## Input, core events and the UI store

- [tested] Feed React from rare notices only: the session updates a Zustand store on mission, ore, errors and unlocks; the HUD and loadout screen render from it.
- [tested] Latch taps. Key and click events that start and end between two frames are invisible to a once-per-frame poll. `Tab` and `Space`/click are latched for one read (`InputState.latch`); without that, Playwright's `keyboard.press('Tab')` never opened the loadout.
- [tested] Clear a latch only after a fixed step has run. The first `frameUpdate` read input and cleared latches before the loop advanced, so at 144 Hz and during hit-stop a latched fire was cleared before any step saw it (found by code review, fixed in commit `ae2cda5`). The commit gives no shot count for the old code, and it was not re-run here.
- [tested] The fix: `frameUpdate` calls `input.clearLatches()` only when `loop.advance(frameDt) > 0` or the loop is paused, so a tap on the loadout screen does not fire when it closes. The loadout key is read per frame, so its latch is cleared every frame with `clearLatches(['loadout'])`.
- [tested] Test the latch against the step phase: in `tests/session.test.ts` a latched fire at `frameUpdate(1 / 144)` for 30 frames gives exactly 1 shot from each of six accumulator phases (0 to 5 frames before the tap); a fire during a 0.06 s hit-stop at 1/60 s gives 1 shot once the simulation resumes; a fire latched with the loadout open gives 0 shots after it closes.
- [tested] Real devices reach the game through the real path: keyboard `W` plus Shift flew the ship (z = 62 m after 1.5 s); a cursor at the right edge did not steer before a click (forward.x 0.000) and did after one (forward.x -0.974); a faked `navigator.getGamepads` pad thrust and steered left (42 m/s, forward.x 0.999). An actual gamepad was not available.

## Mounting, StrictMode and asset loading

- [tested] `<Canvas>` mounts its renderer after the assets have loaded, so a `ready` flag set when assets finished reported `backend: 'unknown'` and `drawCalls: 0`. Make `ready` need the ship assembled, the backend identified and two frames drawn.
- [tested] Count drawn frames separately from updates: `frameUpdate` runs in `useFrame` before that frame is drawn, so `ready` requires `framesDrawn >= 2`, set from `gl.info.render.frame` (commit `ae2cda5`). `tests/session.test.ts` withholds each of the four conditions in turn and checks that two updates with nothing drawn are not ready.
- [documented] R3F v9 tightened StrictMode (vault: R3F Docs, v9 Migration Guide). This app does not use StrictMode, so nothing here was checked under it.
