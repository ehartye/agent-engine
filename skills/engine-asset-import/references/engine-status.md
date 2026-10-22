# Engine status

| Engine | Verified | Not verified |
|---|---|---|
| Unreal 5.7.3 | Import of fox, courier, campfire and audio; a clean Play-In-Editor run; a screenshot read by eye; music bed reports playing | Audio by ear, pickup variant picking, any automated pixel check |
| Unreal 5.8.3 | The same scene after three fixes: import, a clean rendered run, fox animating, music bed reporting playing, a screenshot read by eye; Epic's MCP server started headless, imported textures and an FBX, spawned an actor and returned a screenshot | Audio by ear, pickup variant picking, an automated pixel check, MCP audio or GLB import (none exists) |
| Godot 4.7.2 | Import, headless build, a windowed GPU run, animations and music reporting playing, a loop set from the stream length, a screenshot read by eye | Audio by ear, the chosen pickup variant, the bed looping end to end |
| Unity 6000.3.25f1 | Licensed headless build and run, a D3D12 batchmode player on the GPU, animations and loop, 12 pickups with no repeat, zero log errors, a screenshot read by eye | Audio by ear, the bed looping end to end, the Unity CLI and MCP route |
| Unity 6000.6.0f1 (Quest 3 project) | Headless EditMode and PlayMode tests, a Netcode host and client in one process, a GPU screenshot test, glTFast import of a 12-model set, an APK build; scene-file guards for light and passthrough clear | Anything on a headset: pinch input, two-headset play, how the fixed light looks in a room, shadow cost |
| UEFN 42.20 / 42.30 | MCP imports and saved clips; gallery captures; native Python/Sequence authoring; scoped actor saves; Fortnite startup on 12 timelines and 156 controller-method results, including reset and held-frame resume | Physical button use, rendered reset poses, completed-clip reset, audio playback, multiplayer and memory/performance budget |
| Web: three.js, Phaser | Import, animation advance, audio start and variant picking, a clean console, a screenshot read by eye, on the GPU in headless Chromium | Audio by ear; the bed looping end to end |

To choose between these, use the `engine-selection` skill.
