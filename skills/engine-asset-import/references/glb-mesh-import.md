# GLB meshes (agent-meshes) in Unity and Godot

Unreal's behaviour (Interchange, clip names, morph and skin rules) is in the `unreal-import` skill in agent-unreal.

Unity and Godot are not yet verified for GLB meshes in the sample scene beyond what each engine's page says.

From vendor documentation, not tested here:

- Unity has no native glTF import. The `com.unity.cloud.gltfast` package registers as the default
  importer for `.gltf` and `.glb`. Copy the companion `.bin` and image files too, with their names
  unchanged. Install the package first; do not assume a new project has it.
- Godot imports glTF 2.0 natively (`.glb` and `.gltf`) and recommends it. Copy the scene and its
  textures into the project and the editor imports on focus. `godot --headless --import` imports
  without a window.
