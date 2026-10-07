# R3F versions and migrations

Evidence: Sector Run Slice 1, `docs/lessons/r3f.md` (private repository). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked. All `[tested]` claims were observed on the pinned set below, Playwright 1.63.0 (Chromium 153.0.8010.12) and Node 24.18.0, on Windows 11.

## Pinned versions

| Package | Version | Label |
| --- | --- | --- |
| three | 0.186.1 (`THREE.REVISION` 186) | [tested] |
| @react-three/fiber | 9.8.1 | [tested] |
| react, react-dom | 19.3.0 | [tested] |
| zustand | 5.0.15 | [tested] |
| vite | 8.3.3 | [tested] |
| @vitejs/plugin-react | 6.1.2 | [tested] |
| vitest | 5.0.3 | [tested] |
| TypeScript | 7.0.2 | [tested] |

- [tested] This set worked together with no peer warnings.
- [tested] `vite build` warns that the single 1,234 kB chunk is over 500 kB; nothing was split.
- [tested] Neither rapier nor `three.quarks` ships in the app: rapier was removed again after it was measured, and the custom particle emitter won over `three.quarks` (see [physics](physics-rapier.md) and [particles](particles-and-explosions.md)).

## Peer dependencies that moved

- [tested] `three.quarks` 0.17.1 declares peer three >= 0.182 and ran on three 0.186.1. Its colour generators need `Vector4` from `three.quarks`, not three's.
- [tested] `@react-three/rapier` 2.2.0 mounts under R3F 9.8.1 and bundles `@dimforge/rapier3d-compat` 0.19.2 while 0.21.0 exists. Rapier 0.19.2 logs `using deprecated parameters for the initialization function` on start.
- [documented] `wawa-vfx` 1.2.10 peers R3F ^9, leva ^0.10, zustand ^5 (npm page, re-checked 2026-10-07; not run).

## Breaking changes met

- [tested] R3F 9.8.1 on three 0.186.1 logs `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` once per page load. It is a console warning and does not touch the probe's `errors`; it was the only console warning seen on the GPU, so a zero-warning gate must allow exactly that text.
- [documented] R3F v9 changed typing, removed automatic sRGB conversion of texture props and tightened StrictMode (vault: R3F Docs, v9 Migration Guide). Sector Run does not use StrictMode.
- [documented] R3F v10 is alpha: three >= 0.185, `usePostProcessing` replaced, scheduler split out (vault: R3F v10.0.0-alpha.4).

## Upgrade checklist

- [documented] Stay on R3F 9.x for now: v10 is alpha and raises the three floor to 0.185 (vault: R3F v10.0.0-alpha.4). Moving is a separate decision.
- [tested] After a three upgrade, run the tests that build the toon material: `makeToonMaterial` throws if three changes the `gradientmap_pars_fragment` chunk text, so a changed chunk fails loudly instead of rendering grey bands.
- [tested] After an upgrade, re-read the console: the smoke gate allows only the exact `THREE.Clock` warning text, so any new deprecation fails it.
- [tested] Re-check `versions` in the probe after the install: it comes from `package.json` through Vite's `define` plus `THREE.REVISION`, so it shows what is really installed.
