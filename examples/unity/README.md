# Unity sample scene scripts

Verified on Unity 6000.3.25f1, Windows, with a licence activated in Unity Hub (headless launches fail with "No valid
Unity Editor license found" until the owner signs in once). They build the [sample scene](../../docs/sample-scene.md)
and a Windows player, and the player has a verify mode. Read the Unity section of the `engine-asset-import` skill first.

Create a project (`Unity.exe -batchmode -nographics -createProject <dir> -quit`), add `"com.unity.cloud.gltfast": "6.20.0"`
to `Packages/manifest.json`, copy `Assets/Scripts` and `Assets/Editor` from here, and put the assets under
`Assets/Meshes/fox.glb`, `Assets/Sprites/{courier,campfire}.png` with their `.atlas.json`, and `Assets/Audio/` with the
WAVs and manifests.

```text
Unity.exe -batchmode -nographics -projectPath <dir> -executeMethod BuildScene.Build -buildPlayer -quit
<dir>/Build/SampleScene.exe -batchmode -verify -out <results dir>
```

`BuildScene.Probe` (same flags, without `-buildPlayer`) writes `probe.json` describing what glTFast made of the GLB.
The player runs with `-batchmode` and no `-nographics` so it keeps the GPU without needing a window; the screenshot is a
camera rendered to a RenderTexture. `Flipbook.cs` cuts the atlas, `PickupPlayer.cs` picks variants from the manifest, and
`SceneController.cs` paces the fox, loops the clip and the bed, and writes the report, including every error the log hook
saw.
