# Web sample scene scripts

The three.js 0.186.1 build of the [sample scene](../../docs/sample-scene.md), plus a headless Chromium
verifier. The Phaser page, the Phaser test harness and the Phaser probes moved to the
[agent-phaser](https://github.com/ehartye/agent-phaser) plugin. three.js churns its API often (0.186 deprecated `THREE.Clock`), so the versions are pinned in `package.json`.

- `three/` the 3D fox GLB with its `walk` clip, the campfire and courier as billboard flipbooks, the same audio.
- `serve.mjs` a no-dependency static server for the workspace root. `verify.mjs` drives a page and writes a report.

The pages expect the scenes workspace layout used by the Unreal scripts: `assets/meshes/fox.glb`,
`assets/sprites/*.png|atlas.json`, `assets/audio/*.wav` with `index.json`, and `web/` holding these files. In that workspace:

```text
cd web && npm install
# from assets/beeps (an agent-beeps project):
beeps bundle ../audio                     # writes assets/audio/index.json from the sidecars
beeps player export ../../web/vendor      # vendors the browser player
node web/serve.mjs                        # then open /web/three/index.html
node web/verify.mjs three                 # writes web/results/*-report.json and screenshots
```

`verify.mjs` takes Playwright from `npm i -D playwright` (or `PLAYWRIGHT_DIR`, an installed playwright folder) and launches Chromium with
`--use-angle=<d3d11|metal|gl by platform> --ignore-gpu-blocklist --force_high_performance_gpu` (the third flag picks the discrete GPU
on a laptop with two and is harmless elsewhere). It prints the WebGL renderer string and fails when it is a software renderer (SwiftShader,
llvmpipe) unless you pass `--allow-software`. The renderer string comes from the WebGL context the page renders with, which a page exposes as `window.__gl` (the three.js page returns its renderer's context); a fresh canvas is the fallback only for a page that exposes none, and the report says which context was classified. It loads the page, records console errors and failed requests, samples
animation state twice, screenshots, checks that audio is locked and nothing played, makes one real click (the gesture
that unlocks audio), checks that audio runs, then triggers the pickup 12 times and checks the variants. It launches
without `--autoplay-policy=no-user-gesture-required`, because that flag lets audio run without the gesture and hides
the gate; `--autoplay` adds it back for debugging. It exits 1 when a check fails. `verify-checks.mjs` holds the flags
and checks; `node --test web/verify-checks.test.mjs` tests them without a browser.
