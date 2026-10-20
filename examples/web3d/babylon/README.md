# Babylon.js example

A small Babylon.js scene driven by the engine-neutral [core](../core) and checked two ways: Node-only tests of engine conventions, and a headless Chromium verifier on a real GPU. It exists so the `engine-babylon` skill can say `[tested]` about Babylon.js behaviour and mean "this folder reproduces it".

```bash
cd examples/web3d/babylon
npm install
npx playwright install chromium   # once, unless Playwright's browsers are already installed
npm test                          # 5 Node tests under NullEngine: timeStep units, handedness; no browser
npm run dev                       # fly it: W/S pitch, A/D yaw, Space fires
npm run verify                    # 16 checks on a real GPU; --allow-software for a machine without one
```

Pinned: @babylonjs/core 9.29.0, vite 8.3.3, Playwright 1.63.0. Deep `@babylonjs/core/...` imports only.

| File | Role |
| --- | --- |
| `../core/game.mjs` | The rules, shared with the R3F example. In Babylon the engine owns the fixed step: `scene.onBeforeStepObservable` calls `session.runStep`, and one `onBeforeRenderObservable` calls `session.endFrame` |
| `src/main.mjs` | Engine in deterministic lockstep (`timeStep: 1 / 60`, seconds), `scene.useRightHandedSystem = true`, thin-instanced targets and shots, a chase camera, the probe and the keyboard map |
| `src/labs.mjs` | Isolated scenes (`?scene=outline`, `thin`, `draws`) that render once and read pixels or draw calls |
| `conventions.test.mjs` | Node tests: `timeStep` units, no `setTimeStep`, quaternion copy, `Vector3.Forward(true)`, camera projection |
| `verify.mjs` | The checks below |

| Check | What it shows |
| --- | --- |
| Hardware GPU, versions in the probe | The renderer string decides, as in the R3F example |
| Ready means drawn | A frame counts as drawn only if it issued draw calls: materials compile in parallel, so the first renders can be empty (2 drawn of 6 rendered in the run recorded here) |
| `getTimeStep()` | Reports milliseconds for a `timeStep` given in seconds |
| Lockstep | About 60 steps a second |
| Rendered axes | Yaw > 0 turns the rendered nose toward +X; pitch > 0 points it down |
| One key press, one shot | Latch plus swept test, through `runStep` and `endFrame` |
| `timeStep: 1000 / 60` | 0 steps in a second while frames keep rendering |
| Built-in outline | Closes on a sphere, a hard-edged box and a thin plate with similar thickness at `outlineWidth` 0.04 and 8 m |
| Thin instances | One instance draws only at its own position; zero instances still draw the source mesh at the origin; `setEnabled(false)` hides it |
| Draw calls | 1,000 meshes cost 1,000 draw calls; one thin-instanced mesh costs 1 |
| Console, bundle | Zero-warning console; a deep-import build stays under 2 MB of JavaScript |

Not reproduced here: an earlier project saw hairline outlines on thin, hard-edged parts that needed welded outline normals. A box and a thin plate outlined as thickly as a sphere in this example, so that remains guidance, not a tested claim. Havok, GLB loading, particles, audio and the inspector are not exercised.
