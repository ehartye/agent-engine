# Unity 6.3

Building a game rather than the sample scene? Read [Unity as a long-lived project](unity-project-workflow.md) first: the test and screenshot loop, sharing pure logic with .NET, and the traps hit on a real project.

Built and run in the sample scene; scripts in `examples/unity`.

- Unity needs an owner sign-in and licence before any headless launch works: unlicensed it exits 198 with "No valid
  Unity Editor license found". After that, `-batchmode -executeMethod` builds the scene and a player.
- GLB needs the `com.unity.cloud.gltfast` package (6.20.0 resolved from the registry; pin it). The 48-skin fox became
  48 skinned renderers on 19 bones with `walk` and `trot` named intact, as an `Animator` with no controller and
  non-legacy clips. Play the clip through a `PlayableGraph` and loop it by wrapping the time.
- Unity's Aseprite importer takes `.aseprite` files, so cut the atlas yourself: follow the tag into the frames array,
  flip the rect's y (Unity textures start at the bottom left), normalise the pivot from the bottom left, and use
  `Sprite.Create`. Set the texture's NPOT Scale to None, or the default rescales a 256x40 sheet to a power of two
  and squashes and blurs it.
- Unity is left-handed: a camera on +Z looking at the origin mirrors +X to the left.
- The audio manifest needs a small picker; Unity has no randomizer component. Loop the bed with `AudioSource.loop`
  (verified set and playing; the wrap itself was not observed).
- The default Windows graphics API list is D3D12 only. In the tested session no window could be presented (D3D12
  and D3D11 failed, Vulkan crashed in the player), so run the player with `-batchmode` (not `-nographics`) and
  render the camera to a `RenderTexture` for the screenshot. Hook `Application.logMessageReceived` to count real
  errors instead of grepping the log.
