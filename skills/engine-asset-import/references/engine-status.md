# Engine status

| Engine | Verified | Not verified |
|---|---|---|
| Godot 4.7.2 | Import, headless build, a windowed GPU run, animations and music reporting playing, a loop set from the stream length, a screenshot read by eye | Audio by ear, the chosen pickup variant, the bed looping end to end |
| Unity 6000.3.25f1 | Licensed headless build and run, a D3D12 batchmode player on the GPU, animations and loop, 12 pickups with no repeat, zero log errors, a screenshot read by eye | Audio by ear, the bed looping end to end, the Unity CLI and MCP route |
| Unity 6000.6.0f1 (Quest 3 project) | Headless EditMode and PlayMode tests, a Netcode host and client in one process, a GPU screenshot test, glTFast import of a 12-model set, an APK build; scene-file guards for light and passthrough clear | Anything on a headset: pinch input, two-headset play, how the fixed light looks in a room, shadow cost |
| Web: three.js, Phaser | Import, animation advance, audio start and variant picking, a clean console, a screenshot read by eye, on the GPU in headless Chromium | Audio by ear; the bed looping end to end |

Unreal and UEFN status is in the `unreal-import` skill in agent-unreal.

To choose between these, use the `engine-selection` skill.
