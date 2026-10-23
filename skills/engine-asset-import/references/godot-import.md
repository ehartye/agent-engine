# Godot 4.7

Built and run in the sample scene; scripts in `examples/godot`.

- [general] `godot --headless --path <project> --import` imports the GLB, PNGs and WAVs; a `--script` builder then
  writes the scene. Use the `_console` executable to see output; pass your own arguments after `--`.
- [general] The fox's 48 skins became one `Skeleton3D` (19 bones) with 48 meshes and one `AnimationPlayer`; `walk` and
  `trot` kept their names but import with **no loop**. Set `LOOP_LINEAR` on the animation.
- [general] There is no sprite-sheet importer. Build `SpriteFrames` from the atlas: follow the tag into the frames array,
  make one `AtlasTexture` per frame, set the animation speed from the first duration and each frame's duration
  as a multiplier. For an `AnimatedSprite3D`, put the pivot at the origin with
  `offset = (cell_w / 2 - pivot_x, pivot_y - cell_h / 2)`.
- [general] The music WAV has no loop chunk, so set `LOOP_FORWARD` yourself. Godot imports WAV compressed by default, so
  compute `loop_end` as `get_length() * mix_rate`; `data.size()` gave about a fifth of the right figure.
- [general] `AudioStreamRandomizer` can consume the manifest's variants, weights and `noRepeat`. A script cannot read
  which variant it chose, so the variant sequence is not checkable the way it is on the web.
- [general] `Camera3D.look_at()` does nothing before the node is in the tree. Set the rotation.
- [general] A scripted quit prints "ObjectDB instances leaked" and "resources still in use" lines. They are exit
  notices, not run errors; a naive error grep trips on them.
