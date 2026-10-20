# Controller-navigable menus in R3F

Evidence: `examples/web3d` (core tests and the R3F verifier) plus library source. `[tested]` is reproduced by a command in this repo, `[documented]` was read in official docs or source, `[general]` is guidance not checked here. Pins: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 (see [versions and migrations](versions-and-migrations.md)).

A DOM overlay (a loadout, settings or pause screen) over the R3F canvas that works from a gamepad, keyboard and mouse: directional focus, accept, back, bumpers to switch tabs, while the same buttons mean something else in flight. The example has no menu and no gamepad code, so the menu rules are `[general]` or `[documented]`; what is reproduced is how taps and pause interact with the fixed-step input (`node --test examples/web3d/core/core.test.mjs`).

## Structure

- [general] Put the navigation rules in a pure module with tests: a focus model (focusable rectangles, directional pick, tab groups) and an input router (raw pad and key state to actions: move, activate, back, tab). One thin DOM adapter connects them. The game has no navigation rules of its own.
- [general] Mark focusable elements with an attribute (`data-nav="<id>"`, optional `data-nav-group`). The adapter reads `getBoundingClientRect()` for each into the model, skips zero-size and disabled ones, and refreshes before each action batch, since a card scrolls and a tab change re-lays it out.
- [general] Model events become DOM calls: focus focuses the element and draws a ring, activate clicks it, back closes the screen, tab switches. Feed the pad every animation frame, forward keys from a window listener and tick the router for held repeats.
- [general] Router defaults that feel right: a stick counts as pressed at 0.5 and released at 0.3 (hysteresis), repeat after about 400 ms then every 100 ms or so. In a menu: accept, back, bumpers for tabs, d-pad or left stick to move, Enter and Space to activate. In flight context map only the buttons that flight uses, and drop holds.
- [documented] The W3C Gamepad specification defines a "standard" mapping (`gamepad.mapping === 'standard'`) with fixed button indices for face buttons, bumpers, start and the d-pad. Check `mapping` and fall back to a remap screen otherwise. Poll `navigator.getGamepads()` each frame rather than caching the objects.
- [general] Show the focus ring only when the last input was not the mouse; hover focuses and highlights instead. Give "selected/equipped" a different colour from the ring, or both read as one thing.

## Pause and taps

- [tested] A tap made while the simulation is paused must not fire when it unpauses, and a tap made between frames must not be lost: test "a tap made while paused does not fire after the pause closes", "a tap made between frames is invisible to a poll but survives in the latch" and "a tap during a hit-stop fires once when the simulation resumes". The mechanism is in [session.mjs](../../../examples/web3d/core/session.mjs) and [input.mjs](../../../examples/web3d/core/input.mjs): latches are cleared only after a step ran or while paused. Opening a menu by pausing the loop therefore needs no extra bookkeeping for keyboard taps.
- [general] The pad is a different path. If the pad is polled once per frame into held state, a button held when the menu closes is still held in the first flight frame.

## Double handling and context traps

- [general] Keys the game's input layer already owns (a pause or menu toggle) must not also go to the router: a router `back` on the same key closes the screen and the toggle reopens it.
- [general] Space and Enter are `activate` in the router and also a native click on the focused button. Call `preventDefault` on them, or one press triggers twice.
- [general] A button that is back in a menu and an action in flight (boost, fire): closing the menu with it held makes the next flight frame read it as pressed. Remember the buttons held while the menu was open and zero them in the flight mapping until released. Exempt a button that toggles the menu in both contexts. Look the set up without allocating each frame. See [flight controls](flight-controls.md).
- [general] A fix applied by a shell edit that failed to parse never ran. After any edit, re-run the smoke check that exercises it ("B held after closing does not boost").

## Layout and environment traps

- [general] A mouse resting over a button focuses it whenever the screen reopens under it (browsers fire `pointerenter` on layout), so a keyboard test starts from the wrong element. Move the mouse away first.
- [general] A focus model has no notion of a DOM scroll container; the browser scrolls the card under the focused element. Make a stat panel `position: sticky` so a hovered item's stat delta does not scroll away.
- [general] If the navigation package imports its own files with `.ts` extensions, the app's `tsconfig.json` needs `allowImportingTsExtensions`.
- [general] Set `role="dialog"` and `aria-modal`, and test with a screen reader if you ship one; focus handling here is for sighted controller use.

## Verification

- [general] A browser stage with a fake gamepad (override `navigator.getGamepads` in an init script and set button and axis values from the test) can drive: open, move focus with the d-pad, accept, switch tabs, hold the stick for repeats, hover for a preview, back, then the same by keyboard and mouse. Take screenshots.
- [general] Unit tests passed before the first browser run and the browser then found a flag that never arrived and the parked-mouse refocus. A rule that is never called, or a decision only a real action exercises, is invisible to isolated tests.
- [general] A physical controller, narrow screens and assistive technology are not covered by a fake pad.

## Links

- [Flight controls](flight-controls.md)
- [Frame loop and state](frame-loop-and-state.md)
- [Part kits and paint](part-kits-and-paint.md)
