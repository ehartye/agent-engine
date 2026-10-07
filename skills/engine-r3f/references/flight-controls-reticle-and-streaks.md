# Flight controls, nose reticle and speed streaks in R3F

Evidence: Sector Run, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there (lessons or unit tests re-run 2026-10-07), `[documented]` was read in the code only, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1, @react-three/fiber 9.8.1 and headless Chromium 153 on an NVIDIA GPU, with keys and mouse from Playwright and a faked `navigator.getGamepads`.

A flight scheme where WASD or the left stick fly the ship and IJKL, a canvas drag or the right stick only look, plus a reticle on the nose and speed streaks that converge on it. Use it for a chase-camera game on keyboard, mouse and gamepad where the camera can point away from the nose.

## Fly and look are separate

- [tested] WASD and the left stick FLY (flight stick: forward pitches the nose down). IJKL, a drag on the canvas and the right stick only LOOK: a camera-only gaze that attitude, velocity, the probe and the verifier never read. Boost is B (pad button 1) or Shift, thrust F or RT, brake Q or LT, roll U/O or LB/RB, fire Space or A, loadout Tab/Escape or Start.
- [tested] Map to the flight contract, not the stick: pitch > 0 is nose down, yaw > 0 turns toward the ship's left, so `pitch = 0 - moveY` and `yaw = 0 - moveX` (the `0 -` keeps rest at +0, not -0). WASD diagonals clamp to the unit circle; pad axes use a 0.12 deadzone rescaled so there is no jump at its edge.
- [tested] Mouse look is a rate: `clamp(px * 0.0023 / dt)` per frame, summed with the keys. A drag starts only on a press on the canvas (not on an overlay), ends on release, a buttonless move or blur. No pointer lock.
- [tested] The first mapping had look and steering swapped because the wrong source controller was read (free-space flight instead of the vehicle controller that actually flies). 21 of 30 rewritten input tests failed on the old code. Read the controller that flies the vehicle.
- [documented] Keep the layers pure: `input.ts` maps devices (`mapKeys`, `mapGamepad`, `InputState.read(dt)` merging by largest magnitude), `gaze.ts` integrates the look, `chaseCamera.ts` applies it, and a small binder forwards DOM events and polls the pad once per rendered frame.

## The gaze

- [documented] Constants copied from the owner's Planetforge controller: yaw 1.8 rad/s, pitch 1.2 rad/s, limits 1.35 and 0.45 rad, each released axis eases back by `exp(-dt * 3.5)`. The look is inverted by default (stick or drag up looks down) behind a named setting.
- [tested] The gaze is zero while not ready, while the loadout is open and after a reset. `chaseTarget(pose, gaze, outPos, outQuat)` rotates only the camera arm and view round the ship: yaw about the ship's up axis, then pitch about the turned right axis. A zero gaze skips the rotation, so the camera is bit-for-bit the pre-gaze one.

```ts
pitch: 0 - moveY, // stick forward (W) pitches the nose down
yaw:   0 - moveX, // stick right (D) turns right
```

## Input traps

- [tested] Fast taps are lost to a once-per-frame poll. Latch Space, dash and Tab/Escape, and clear the latches only after a fixed step ran (see [input](frame-loop-and-state.md#input-core-events-and-the-ui-store)).
- [tested] A second Tab/Escape tap that landed before any frame saw the key up had no rising edge and was lost once in six smoke runs. Count each press (`takeTap`) so the toggle fires on a fresh tap or an edge, once per frame.
- [tested] B is boost in flight and back in a menu. Closing a menu with B held made the next frame read `boost = 1`. Keep the set of buttons pressed while a menu was open and zero them in the flight mapping until released; exempt Start, which toggles the menu in both contexts. See [controller navigable menus](controller-navigable-menus.md).
- [tested] An app's own tests and pilot can share a wrong convention with its code. Reuse the verifier's steering in a unit test ([flight axes](probe-and-verification.md#flight-axes-and-the-verifiers-own-code)).

## Reticle on the nose

- [tested] A fixed centre crosshair is wrong once the camera is not along the nose: in a boosting yaw turn it was 63.6 px from where the nose points, and 253 px with the look held 350 ms.
- [tested] Project `ship position + forward * 400 m` through the camera as the camera rig just posed it. Pure `projectReticle(worldPoint, viewProjection, viewport) -> {x, y, visible}` takes a column-major `projection * view`, y down, `visible = clip w > 0`. Behind the camera hide it, do not clamp it to an edge.
- [tested] One `useFrame` at priority -0.5 (after the camera rig at -1, before the automatic render) writes `style.transform` and `dataset.visible` on a registered DOM element every frame: no React state, not the 12 Hz HUD clock. Use the interpolated pose the ship and camera use.
- [tested] `Vector3.project(camera)` reads `camera.matrixWorldInverse`, which three refreshes only during render. Refresh it first in a `useFrame` or a test (a stale matrix was 1.5 px off). Centre a bordered ring on its outer box (13 px for a 26 px ring); a CSS margin guess was 2 px off.

## Speed streaks

- [tested] One scalar drives everything, linearly with no threshold: `intensity = clamp(speed / vMax, 0, 1)` sets how many of 90 streaks are drawn (`setDrawRange`), line alpha (x 0.7) and tail length (x vMax x 0.04 s).
- [tested] Respawn streaks ahead of the ship's forward direction and trail them along it, so they converge on the reticle. Using the velocity direction converged elsewhere whenever the ship drifted or turned (46.1 px off in the same turn).
- [tested] `vMax` must be the equipped ship's own top boosted speed. A global 180 m/s saturated the ramp over the starter ship's top third (140 and 210 m/s read as 70 and 90 streaks against alpha 0.544 and 0.700). The tests and the renderer must read `vMax` from the same place, or a one-for-one check fails while the streaks are right.

## Measured and verified

- [tested] Gaze: `W/S/D/A` gave forward.y -0.642/+0.642, forward.x -0.642/+0.659; IJKL held 0.5 s gave yaw 0.99 and pitch 0.45 with the heading unchanged; a released axis eased from 0.982 to 0.013 in 1.2 s. The shared verifier (inputs through the probe only) still passed 31 of 31.
- [tested] Reticle against `Vector3.project`: 0.00 px in straight flight, mid-turn and with look held. Streak vanishing point against the reticle: 2.1 px straight at boost, 12.3 px in a yaw turn, 8.7 px with look held (a 400 m point, a camera that lags in a turn and a 2.4 m camera height explain the gap).
- [tested] Streak ramp samples (vMax 210): idle 0 of 90, 39 m/s 17 (alpha 0.131), 140 m/s 60 (0.467), 210 m/s 90 (0.700), within 3 % of `speed / vMax`.
- [tested] Smoke checks must not assume a boost that lasts: with a finite boost tank, a sample taken after 7 s read the unboosted cap. Wait for the speed, then sample.

## Not verified

- [general] How the gaze rates, the inverted look, the flight stick and the reticle feel in human hands.
- [documented] A physical gamepad was never used; a turn so hard the aim point passes behind the camera is covered by a unit test only.
