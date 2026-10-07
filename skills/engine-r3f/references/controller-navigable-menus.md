# Controller-navigable menus in R3F

Evidence: Sector Run, `docs/lessons/r3f.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there (lessons, or unit tests re-run 2026-10-07), `[documented]` was read in the code only, `[general]` was not checked. All `[tested]` claims were observed on three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0 and headless Chromium 153 with a faked `navigator.getGamepads`.

A DOM overlay (the loadout screen) over the R3F canvas that works from a gamepad, keyboard and mouse: directional focus, A accept, B back, bumpers switch tabs, and B is boost in flight. Use it for any React menu that a controller player must reach. The navigation rules live in a pure, tested package (ui-kit's `NavModel` and `InputRouter`); the game adds only a thin DOM adapter.

## Structure

- [tested] One adapter module is the whole integration. `MenuNavigator` owns a `NavModel` (focus, directional pick, tabs) and an `InputRouter` (turns raw pad and key state into actions with a stick deadzone, hysteresis and hold-to-repeat). The game has no navigation rules of its own.
- [documented] Mark focusable elements `data-nav="<id>"` (optional `data-nav-group`). `refresh()` reads every element's `getBoundingClientRect()` into the model, skipping zero-size ones and passing `disabled`, and runs again before each action batch because the card scrolls and a tab or class change re-lays it out.
- [tested] Model events become DOM calls: `focus` focuses the element and draws the ring, `activate` clicks it, `back` closes the screen, `tab` switches the tab. The component feeds the pad every animation frame (the raw `pressed` and `axes` the pad poll stored), forwards keys from a window listener, and calls the router's `tick(now)` for held-key repeats.
- [tested] The focus ring (`data-nav-focus`, a gold outline plus glow) is hidden while the mouse was the last device; hover focuses the element and highlights instead. Equipped state is green so it does not read as the ring.
- [documented] Router defaults: a stick press at 0.5 and release at 0.3, repeat after 400 ms then every 110 ms. In a menu: A activate, B back, LB/RB tabs, d-pad or left stick move, Enter/Space activate. In flight context only B (boost) and Start are mapped, and holds are dropped.

```ts
// the component's key listener: Esc and Tab belong to the game's input layer
if (e.code === 'Escape' || e.code === 'Tab') return;
nav.key(e.code, down, performance.now());
if (/^(Arrow|Enter|Space|NumpadEnter|Backspace|PageUp|PageDown)/.test(e.code)) e.preventDefault();
```

## Double handling and context traps

- [tested] Esc and Tab already toggle the screen in the input layer. A router `back` on Esc closed it and the toggle reopened it. Do not pass Esc and Tab to the router.
- [tested] Space and Enter are `activate` in the router and also a native click on the focused button. `preventDefault` them, or one press cycled an affix twice.
- [tested] B is back in a menu and boost in flight, and the pad is polled once per frame for both. Closing with B held made the next frame read `boost = 1` (A would have fired). Keep the set of buttons pressed while a menu was open and zero them in the flight mapping until released. Exempt Start: it toggles the menu in both contexts. A fresh B press afterwards boosts. The set lookup allocates nothing and leaves the keyboard alone (the loop is paused and latched taps are cleared while paused). See [flight controls](flight-controls-reticle-and-streaks.md#input-traps).
- [tested] The first version of that fix never ran: the edit that passed the menu flag to the pad poll sat in a shell command that failed to parse. The smoke check `B held after closing does not boost` showed the flag never arrived. Verify that an edit landed.

## Layout and environment traps

- [tested] A mouse resting over a button focuses it again whenever the screen reopens under it (Chromium fires `pointerenter` on layout), so a keyboard check moved focus from the wrong place. Move the mouse away first in the test.
- [tested] The package imports its own files with `.ts` extensions, so the app's `tsconfig.json` needs `allowImportingTsExtensions` and the package must be a workspace dependency (`pnpm install` in a worktree works offline).
- [tested] The model has no notion of a DOM scroll container; the browser's focus scroll moves the card under the focused element. Make the stat panel `position: sticky`, or a hovered part's delta scrolls away with the card.
- [tested] Ring and "equipped" mark were both gold and read as one thing in the screenshots. Give them different colours.

## Verification

- [tested] The browser stage `smoke menu` with a fake gamepad (21 checks, 5 screenshots): Start opens the screen with the ring on the equipped class; d-pad right moves to the next class; A equips it; RB then LB switch tab and back; the left stick held 900 ms repeats down the rows; hovering previews a stat delta without equipping; B closes; keyboard arrows and Enter equip; Esc closes; a mouse click equips.
- [tested] Of 285 unit tests every one passed before the first browser run; the browser stages then found the menu flag that never arrived and the parked-mouse refocus. A rule that is never called, or a decision only a real equip exercises, is invisible to isolated unit tests.
- [documented] The model and router are unit-tested in the ui-kit package (65 tests passed 2026-10-07).
- [tested] Cost: no timings were recorded for the menu; the pad-suppression lookup allocates nothing.

## Not verified

- [documented] A real controller was never used. The colour picker with a physical gamepad and the layout on a screen narrower than 1000 px were not checked.
- [general] Screen-reader behaviour: the dialog sets `role` and `aria-modal`, but no assistive-technology test was run.
