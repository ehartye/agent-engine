# GLB to FBX for UEFN and the Unreal MCP tools

UEFN's MCP mesh tool, and Epic's on Unreal 5.8.3, import only FBX and OBJ. `glb_to_fbx.py` converts an agent-meshes
GLB (a rigged, animated model) with Blender:

```text
blender --background --python glb_to_fbx.py -- fox.glb fox.fbx
```

It sets the scene to 30 fps **before** importing the glTF, so clips whose length is a whole number of frames at 30 fps
(the fox's 0.8 s and 1.2 s) survive Unreal's importer, which drops any clip that is not frame-aligned. Setting the rate
after the import shrinks every clip. See "FBX into Unreal and UEFN" in the `engine-asset-import` skill.

Verified with Blender 5.2.2 on the sample fox: Epic's MCP `import_file` on Unreal 5.8.3 then returned the mesh, the
skeleton and both clips. Not yet re-run in UEFN. The Microsoft Store build of Blender must be started through its
execution alias, `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`, from the owner's session.
