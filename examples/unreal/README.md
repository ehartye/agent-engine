# Unreal sample scene scripts

Verified on Unreal Engine 5.7.3, Windows. They build the [sample scene](../../docs/sample-scene.md) and
run it with real rendering. Read the traps in the `engine-asset-import` and `engine-selection` skills
before changing them.

Set `AGENT_ENGINE_SCENES` to a workspace folder with this layout:

```text
assets/meshes/fox.glb              agent-meshes creature gallery, vulpine/model.glb
assets/sprites/courier.png + courier.atlas.json   agent-sprites examples/character-walk/dist
assets/sprites/campfire.png + campfire.atlas.json  ../campfire/dist
assets/audio/survey-drone.wav, relic-discovered.0..3.wav   rendered with agent-beeps
unreal/SampleScene/SampleScene.uproject   plugins: PythonScriptPlugin, EditorScriptingUtilities,
                                          Interchange, InterchangeEditor, InterchangeAssets, Paper2D
```

Build (assets and level, no rendering, about 30 seconds):

```text
UnrealEditor-Cmd.exe SampleScene.uproject -run=pythonscript -script=build_scene.py
    -unattended -nullrhi -nosplash -nopause -nosound -notraceserver
```

Run (Play-In-Editor offscreen on the GPU, samples state, writes `unreal/report-run.json`, saves a
screenshot under `Saved/Screenshots/WindowsEditor`, then quits):

```text
UnrealEditor.exe SampleScene.uproject /Game/Maps/SampleScene -RenderOffScreen
    -ExecCmds="py run_scene.py" -log=run.log -notraceserver -nosplash -unattended
```

In Git Bash set `MSYS_NO_PATHCONV=1`, or `/Game/Maps/SampleScene` is rewritten into a Windows path.
Do not use `-ExecutePythonScript` for the run: it quits the editor when the script ends.
