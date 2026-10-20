# React Three Fiber example

A small R3F scene that is driven by the engine-neutral [core](../core) and checked in headless Chromium through a state probe. It exists so the `engine-r3f` skill can say `[tested]` about renderer behaviour and mean "this folder reproduces it".

```bash
cd examples/web3d/r3f
npm install
npx playwright install chromium   # once, unless Playwright's browsers are already installed
npm run dev                       # fly it: W/S pitch, A/D yaw, Space fires
npm run verify                    # 13 checks on a real GPU; --allow-software for a machine without one
node renderer-flags.mjs           # which renderer each Chromium flag set selects on this machine
```

Pinned: three 0.186.1, @react-three/fiber 9.8.1, react 19.3.0, vite 8.3.3, Playwright 1.63.0.

| File | Role |
| --- | --- |
| `src/game.mjs` | The rules: a ship flying along its nose, shots swept through targets. No three.js, no React |
| `src/App.jsx` | One `useFrame` at priority -2 drives the session; views mutate three.js objects at the interpolation alpha |
| `src/toon.mjs`, `src/outline.mjs` | The `MeshToonMaterial` ramp patch (throws if three changes) and the clip-space or world-space inverted hull |
| `src/labs.jsx` | Isolated scenes (`?scene=toon`, `outline`, `instancing`) that render once and read pixels or counters |
| `src/main.jsx` | Installs `window.__game` before React mounts, and maps the keyboard to the session's input |
| `verify.mjs` | The checks below |

| Check | What it shows |
| --- | --- |
| Hardware GPU | The renderer string, not the request, decides: a software rasteriser draws a plausible picture with no error |
| Ready means drawn | `<Canvas>` mounts after assets load; ready needs two frames drawn, draw calls counted and a known backend |
| Fixed step | About 60 steps a second through one `useFrame` |
| Rendered axes | Yaw > 0 turns the rendered nose toward +X; pitch > 0 points it down (read from the three.js object, not the rules) |
| One key press, one shot | `keyboard.press` is down and up in one tick; the latch keeps it and the swept test hits |
| Toon ramp | A coloured ramp renders grey until patched, because the shader samples only `.r` |
| Outlines | Clip-space thickness is the same near and far; a world-space hull vanishes on a far object |
| Instancing | 1,000 meshes cost 1,000 draw calls; one `InstancedMesh` costs 1 |
| Console gate | Only the known `THREE.Clock` deprecation text is allowed |

The renderer string depends on the machine. Run `node renderer-flags.mjs` to see it: with no flags Chromium chose SwiftShader (a software rasteriser) on the machine used for the figures here. Whether the platform ANGLE backend alone picks the discrete or the integrated GPU on a hybrid-GPU laptop varies with the drivers and power state, which is why `--force_high_performance_gpu` is in the shared flag set and why the verifier reports the renderer string instead of assuming one.
