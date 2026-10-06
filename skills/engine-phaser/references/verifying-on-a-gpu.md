# Verifying a Phaser game on a real GPU

Software WebGL hides performance problems and some correctness problems, and "no console errors" passes on a blank
screen. Verify on the GPU and assert on pixels.

## Playwright configuration

```ts
// playwright.config.ts
export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] },   // Windows; use the platform equivalent elsewhere
  },
  webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199', reuseExistingServer: true },
});
```

Expose the game for tests with `globalThis.__game = game`. Assert that the renderer string is not software:

```ts
const gl = game.renderer.gl; const ext = gl.getExtension('WEBGL_debug_renderer_info');
expect(String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))).not.toMatch(/swiftshader|llvmpipe|software/i);
```

## What to assert

1. **A clean console** (errors and warnings) and **no page errors**.
2. **Pixel colours, not "not black".** Teleport the player to a place whose terrain you know (a ruins district with dark
   asphalt, a lake) and assert the share of pixels in a colour range. A "not black" test passed while dust covered the
   whole terrain.
3. **Every visible chunk renders**, with a camera parked on a chunk corner so four chunks are visible.
4. **Pooling and streaming**: walk for several seconds and assert the number of containers or views stays bounded.
5. **Entity views appear and are released** when a creature leaves the camera.
6. **Frame rate and renderer** are recorded, not asserted tightly.

## Prove the test by mutation

For each regression test, re-introduce the bug (for example make an overlay layer a GPU layer again), run the test,
confirm it fails with a clear number (the dark-pixel ratio went from over 0.08 to 0), and restore the fix.

## Debugging harness (small scripts worth keeping)

- A script that starts the game, optionally runs an expression, screenshots, and prints the renderer string, fps and
  console errors.
- A script that teleports the player to a named place (seep, vault, a biome) and screenshots it. Chunks are generated on
  demand, so this reaches far terrain in seconds.
- A **pixel check** that finds a tile whose data is known, reads the screenshot pixel there, then toggles layers one at a
  time and reads it again. That is what found the overlay bug: baseline dust, ground plus overlay dust, ground plus
  floor clay.
- Pass JavaScript through `page.evaluate` as one line without `//` comments (joining lines turns the rest into a comment).

See `examples/web/phaser-probes` for generic versions.

## Gotchas in the harness itself

- Teleporting a long way and screenshotting after a fixed wait can be flaky on the first frame; wait for chunks to bind.
- At zoom 3, tile (8, 8) is 384 px from the origin; an edit you cannot see may simply be off screen.
- Day and night multiply tints change pixel colours; set the clock to noon before sampling colours.

## A debug API, a manual frame loop and a page object (what replaces the sleeps)

The probes above each repeated "start, wait 600 ms, press Enter, wait 1200 ms". Under parallel workers the title was not up yet, Enter went nowhere, and the next
line failed with "no game in progress". Build the harness once instead (Fallow Valley: `docs/HARNESS.md`, `src/game/debug`, `tests/harness`):

- **One typed debug object on the page** (`__game.debug`), loaded only in dev or when the URL asks (`?debug=1`, `?demo=name`) through a dynamic `import()` so a production
  build carries it as a separate chunk. It starts a world (`start({ seed, hour, weather, at, give, god })` once the title scene is active, never by key press), teleports to
  named places (biome interiors found on the climate field, points of interest, camps, bosses, a vault's rooms), sets the clock and pins weather, gives items, spawns, pauses,
  steps and scales time, toggles render layers, inspects the tile under the cursor, hashes the sim, snapshots, records and replays.
- **A manual frame loop.** `game.loop.sleep()` then `game.step(virtualTime, dt)`: tests and capture advance by ticks and frames, not wall time. Yield to the event loop between
  frames while waiting for scenes (asset loads finish there; a synchronous loop never lets `preload` complete). Keys are consumed at the next frame.
- **A page object and fixture** that fails every test on a console error or warning, exposes `start`, `step(ticks)`, `frames`, `screenshotWorld()` (interface hidden),
  pixel probes (`at`, `fraction`, `meanLum`), and `evalSim/evalDebug/evalWorld` wrappers (functions are serialised: pass data as an argument).
- **Visual regression with `toHaveScreenshot`**: about twenty canonical scenes (biomes by time of day and weather), a perceptual tolerance, one baseline set, an update
  command. Tag GPU-only tests (`@gpu`) so a SwiftShader CI can run the rest as a smoke.
- **Determinism**: hash the whole sim state (snapshot plus RNG words) and record inputs with periodic hashes. If generation spawns creatures and the camera drives
  generation, record the chunks the view generated or the replay diverges.
- **Workers**: eight Chromium workers each with a WebGL context can exhaust memory; default to two, retry once, and report flaky tests rather than hiding them.
