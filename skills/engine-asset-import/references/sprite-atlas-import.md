# Sprite atlases (agent-sprites)

Documented by agent-sprites, not verified here:

- Export is a sheet PNG plus `<name>.atlas.json` in Aseprite JSON form. Frame tags, per-frame
  durations and a `pivot` slice come from the project.
- agent-sprites says Unity and Godot importers read this directly. **Vendor documentation does not
  support that.** Unity's 2D Aseprite Importer imports `.ase` and `.aseprite` files, and its pages
  never mention a sheet plus JSON. The Godot Aseprite Wizard also takes Aseprite source files: it
  runs the Aseprite program to produce a sheet and JSON, then reads that. Godot has no built-in
  sprite-sheet importer. Nothing has been tested here, and third-party importers were not searched.
  Plan on a small loader per engine that builds clips from the atlas, and check tag names, frame
  counts, durations and where the pivot lands.
- A trimmed atlas (`--trim true`) packs each cell as its opaque box with real `spriteSourceSize`
  offsets. Draw each frame at that offset inside the cell.
- Only importers that honor the tag `direction` play reverse and ping-pong tags correctly.
