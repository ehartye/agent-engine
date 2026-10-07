# The Babylon.js inspector and debugging

Evidence: Sector Run Slice 1, `docs/lessons/babylon.md` (private repository). Versions are in [versions and migrations](versions-and-migrations.md). `[tested]` ran there, `[documented]` was read in official docs or source, `[general]` was not checked.

The inspector is `@babylonjs/inspector` 9.29.0, a dev dependency. It is a dev tool for looking at a scene; the probe stays the thing tests read.

## Loading the inspector on demand

- [tested] Open it from a dynamic import, only in dev and only on request (`?inspector=1`), so a production build contains no inspector chunk and the verifier never loads it (`src/main.ts`):

```ts
if (import.meta.env.DEV && params.get('inspector') === '1') {
  const { ShowInspector } = await import('@babylonjs/inspector');
  ShowInspector(game.scene);
}
```

- [tested] The import took 614 ms in dev and 392 ms from a build; `ShowInspector` returns a token with `dispose`.

## What it showed that the probe did not

- [tested] On the one-box spike scene the explorer lists Nodes and Materials, and the properties pane shows rendering, clear colour, environment and fog settings, none of which the probe reports.
- [tested] Textures, Particle Systems and Audio V2 sections appear only when the scene has them, so the spike did not show them; what the inspector adds on the full game scene was not recorded.

## Cost in the bundle

- [tested] It brings React 19.3.0, Fluent UI and the node editors: the package lists 21 peer dependencies, which pnpm installs automatically.
- [tested] The spike build that included it was 30 MB, because the node editors come along, and Rolldown warns about `"use client"` directives in Fluent icon chunks. The app's production build, with the dev guard, has no file whose name contains `inspector`; see [bundle size](bundle-size-and-imports.md#splitting-havok-and-the-inspector).

## Headless use

- [tested] It opens in headless Chromium with a scene explorer and a properties pane: 6 DOM elements before and 1,026 after in dev, 93 and 1,269 from a build.
- [tested] In dev it logs `Keyborg instance k1 is being disposed incorrectly` as a console error plus a Fluent `slider-vertical` warning; from a build only the warning. Either fails a zero-console-errors check, so never load it in a verifier run.
