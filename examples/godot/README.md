# Godot sample scene scripts

Verified on Godot 4.7.2, Windows (Vulkan, Forward+). They build the [sample scene](../../docs/sample-scene.md) and run it
with a verify mode. Read the Godot section of the `engine-asset-import` skill first.

Put the assets in the project folder (`project.godot` is here) under `assets/meshes/fox.glb`,
`assets/sprites/{courier,campfire}.png` and their `.atlas.json`, and `assets/audio/` with the WAVs and manifests.

```text
godot --headless --path <project> --import
godot --headless --path <project> --script res://scripts/build_scene.gd        # writes scenes/sample.tscn
godot --path <project> --resolution 960x540 -- --verify --out <dir>             # window, samples state, screenshot, report
```

Use `Godot_..._console.exe` to see output. `build_scene.gd` writes the sprite frames from the atlas (Godot has no sheet
importer) and a randomizer from the audio manifest. `scene.gd` sets the loops, paces the fox and holds the verify mode.
