# Flight controls, nose reticle and speed streaks in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

A flight scheme for a chase-camera game on keyboard, stick and pointer: separate keys or stick for flying and for looking, a reticle that marks where the nose points, and speed streaks that converge on it. The example flies with keys only, so the gaze, reticle and streaks are `[general]` or `[documented]`; the axis conventions and the input latching are reproduced by `node --test examples/web3d/core/core.test.mjs` and `npm run verify` in `examples/web3d/r3f`.

## Axis conventions

- [tested] A glTF model's nose points down +Z; a camera with no rotation looks down -Z; so a chase camera is yawed pi further than the ship. Pitch > 0 is nose down, yaw > 0 turns the nose toward +X. Test "a glTF nose is +Z and an unrotated camera looks down -Z" and test "pitch > 0 is nose down" in [core.test.mjs](../../../examples/web3d/core/core.test.mjs); the code is [flight.mjs](../../../examples/web3d/core/flight.mjs).
- [tested] The verifier reads the rendered object, not the rules: after yaw input the three.js ship's world direction has x > 0 (check "yaw > 0 turns the rendered nose toward +X"), and after pitch input y < 0 ("pitch > 0 points the rendered nose down"). A convention shared wrongly by the app, its tests and its pilot passes every check that reads the rules.
- [general] Write the conventions once, in one module the app, its unit tests and the verifier's own steering all import. Map devices to that contract, not to the physical stick: `pitch = 0 - moveY`, `yaw = 0 - moveX` (the `0 -` keeps rest at +0, not -0), for whichever sign your contract needs.

## Fly and look are separate

- [general] Let WASD or the left stick fly (flight-stick feel: forward pitches the nose down) and a second set (IJKL, a canvas drag, the right stick) only look: a camera-only gaze that attitude, velocity, the probe and the verifier never read. Then the camera can point away from the nose without changing the simulation.
- [general] Keep layers pure: a device mapper (keys, pad), a merge by largest magnitude per axis, a gaze integrator, and the camera that applies the gaze. Clamp diagonals to the unit circle; give pad axes a deadzone around 0.1 to 0.15, rescaled so there is no jump at its edge.
- [general] Gaze: a rate on each axis with limits, each released axis easing back to zero by `exp(-dt * k)`; zero while not ready, while a menu is open and after a reset. Rotate only the camera arm about the ship's up axis, then the turned right axis; a zero gaze should skip the rotation so the camera equals the no-gaze camera exactly.
- [general] Mouse look as a rate (`clamp(px * k / dt)`), summed with the keys; start a drag only from a press on the canvas, end it on release, a buttonless move or blur.

## Input traps

- [tested] A once-per-frame poll loses fast taps, and so does clearing latches every frame on a display faster than the step. Latch fire and menu keys, and clear the latches only after a fixed step ran or while paused: tests "a tap made between frames is invisible to a poll but survives in the latch", "at 144 Hz a tap fires exactly once from every accumulator phase" and "clearing latches every frame loses taps at 144 Hz". The verifier's `keyboard.press('Space')` (down and up in one tick) fires exactly one shot. See [frame loop and state](frame-loop-and-state.md).
- [general] Count presses rather than relying on a rising edge when a toggle key can be tapped twice before any frame saw it up.
- [general] A button with two meanings (back in a menu, boost in flight) leaks across contexts: closing a menu with it held makes the next flight frame read it as pressed. Keep the set of buttons held while the menu was open and zero them in the flight mapping until released; exempt a button that toggles the menu in both contexts. See [controller navigable menus](controller-navigable-menus.md).
- [general] Read the controller that actually flies the vehicle. A mapping copied from a different control scheme can swap look and steer and still look plausible.

## Reticle on the nose

- [general] A fixed centre crosshair is wrong once the camera is not along the nose (a yaw turn, a held gaze). Project a point ahead of the nose instead: `ship position + forward * D` through the camera as the camera rig just posed it, `visible = clip w > 0`. Behind the camera, hide it; do not clamp it to an edge.
- [general] Update it from one `useFrame` after the camera rig and before the automatic render (priorities such as -0.5 after a rig at -1), writing `style.transform` and a `data-visible` attribute on a registered DOM element: no React state. Use the interpolated pose the ship and camera use.
- [documented] `Vector3.project(camera)` applies `camera.matrixWorldInverse` then `camera.projectionMatrix` (`three/src/math/Vector3.js`); `matrixWorldInverse` is refreshed in `Camera.updateMatrixWorld`, which the renderer calls during render. Call `camera.updateMatrixWorld()` first in the frame callback or in a test, or the reticle lags the camera by a frame.
- [general] Centre a bordered ring on its outer box; a CSS margin guess is off by a few pixels. Compare the reticle with `Vector3.project` in a test at straight flight, mid-turn and with the gaze held.

## Speed streaks

- [general] Drive everything from one scalar, `intensity = clamp(speed / vMax, 0, 1)`: how many of N line segments are drawn (`BufferGeometry.setDrawRange`, [documented] in `three/src/core/BufferGeometry.js`), their alpha and tail length. Linear, with no threshold.
- [general] Respawn streaks ahead along the nose and trail them along it so they converge on the reticle; using the velocity direction converges elsewhere whenever the vehicle drifts or turns.
- [general] `vMax` must be the equipped vehicle's own top speed, not a global. A global maximum saturates the ramp over the top third of a slow vehicle. Tests and renderer must read it from the same place.
- [general] Do not assume a boost lasts when a smoke check samples speed: with a finite tank, wait for the speed, then sample.

## Links

- [Hit tests and physics](hit-tests-and-physics.md)
- [Probe and verification](probe-and-verification.md)
- [Data-driven entities](data-driven-entities.md)
