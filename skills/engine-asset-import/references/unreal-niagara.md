# Niagara in Unreal 5.8: author, drive and verify from an agent

Evidence: Unreal 5.8.2, Windows, headless/offscreen. `[tested]` is reproduced by the scripts in [`examples/unreal`](../../../examples/unreal/README.md); `node examples/unreal/niagara_validate.mjs --engine <UE_5.8 folder>` runs them all, checking 15 claims below (rerun it after an engine update: a failure means this page is stale). `[documented]` was read in Epic docs or the installed engine's source and Python API. `[general]` is guidance not checked here.

## Pick a route

| Need | Route |
|---|---|
| Make a system from an engine template ([choose one](unreal-niagara-templates.md)), tune properties, place it | Python: AssetTools, `EditorAssetLibrary`, `get_editor_property` |
| Add emitters, renderers, modules, set stack inputs, read compile errors | Python through `unreal.ToolsetRegistry.execute_tool` (Experimental NiagaraToolsets), else C++ |
| Drive a running effect (user parameters, mesh overrides) | Python on `NiagaraComponent` |
| Prove an effect spawned N particles without a screenshot | Python sim cache |
| Simulation stages, event handlers, custom data interfaces, graph edits | C++ only |
| Let an external agent call all of it | Epic's MCP server over the same toolset registry |

- [tested] Start with the cheapest route that covers the need: `niagara_build.py` needs only PythonScriptPlugin, EditorScriptingUtilities and Niagara; the stack-authoring script also needs the NiagaraToolsets plugin.

## What Python does without extras

- [tested] Create an empty system with `AssetTools.create_asset(name, path, unreal.NiagaraSystem, unreal.NiagaraSystemFactoryNew())`, or duplicate an engine template such as `/Niagara/DefaultAssets/Templates/Systems/SimpleExplosion` into `/Game` with `duplicate_asset`.
- [tested] Trap: in a commandlet call `AssetRegistry.search_all_assets(True)` first, pass the source as an object path (`Package.Name`), and `save_asset` each duplicate before saving a map that uses it, or the map loads with a null asset. On a placed `NiagaraActor` set the `asset` editor property; `set_asset` did not persist.
- [documented] `NiagaraSystem` exposes editor properties (warmup, fixed bounds, effect type) but almost no methods in Python. `NiagaraComponent` has typed runtime setters and getters (`set_variable_float`, `_vec3`, `_linear_color`, `_static_mesh`, `_texture`, `_object`, and `get_variable_*`), and `NiagaraFunctionLibrary` has mesh and texture overrides.
- [tested] `spawn_system_at_location` returns None in a commandlet's blank map (`niagara_traps.py`); spawn in a ticking editor world or Play-In-Editor instead.

## Authoring the stack from Python (NiagaraToolsets)

- [documented] `NiagaraToolsets` is an Experimental, editor-only plugin disabled by default (`Plugins/Experimental/Toolsets/NiagaraToolsets`); enabling it loads `ToolsetRegistry`. It registers five toolsets; `NiagaraToolset_System` has 46 tools (create from a template, schema and topology reads, add or remove emitters, renderers and modules, set stack inputs, compile state, stack issues and fixes).
- [tested] The tools are `AICallable`, not Python members: `dir(unreal.NiagaraToolset_System)` is empty. Call them with `unreal.ToolsetRegistry.execute_tool("NiagaraToolsets.NiagaraToolset_System", "AddEmitter", json_input)`. The result's `value` is JSON `{"returnValue": ...}`, objects are `{"refPath": "/Package/Path.Name"}`, and `ToolsetRegistry.get_toolset_json_schema(unreal.NiagaraToolset_System)` returns every tool's input schema.
- [tested] Synchronous tools complete in a commandlet (`CreateNiagaraSystem`, `GetSystemSummary`, `AddEmitter`: a three-emitter system came back). Tools that wait for a compile (`GetSystemCompileState`, `GetStackIssues`) return an incomplete result there; poll `result.is_complete` (a property) from an editor tick, as `niagara_verify.py` does, and expect status `UpToDate`.
- [general] Exit code 3 appeared after a run that ended with an incomplete async result, and when a script deleted a system and recreated it under the same name (an access violation). Create new names.
- [tested] `AddEmitter` with a sprite-burst template gave an emitter that counted 0 particles in the sim cache, while the other two emitters counted 20 and 120. A successful tool call is not an emitting effect; verify.
- [general] A community plugin author reports that writing the `SimulationStages` array through `SetEmitterData` crashes the editor, and that the stock toolsets cannot create simulation stages, event handlers or local modules. Treat edits to those as C++ work and keep a backup of the asset.

## C++ only

- [documented] `UNiagaraExternalEditUtilities` (`NiagaraEditor/Public/NiagaraExternalSystemEditorUtilities.h`) holds the authoring API the toolsets wrap. Its header says "EXPERIMENTAL! DO NOT USE EXCEPT FOR TESTING!". Its functions have no `UFUNCTION`, so the class is absent from `unreal`; only its `NiagaraExt_*` data structs are exposed, without functions.
- [documented] `NiagaraPythonEmitter` and `NiagaraPythonModule` exist for version-upgrade scripts and are `BlueprintInternalUseOnly`. [tested] They read an emitter's modules and read or set its properties; they have no way to add an emitter, renderer or module.
- [documented] Custom data interfaces are C++; Epic ships `ExampleCustomDataInterface` as the model. Niagara Data Channels have a Python library (`NiagaraDataChannelLibrary`: write, read, subscribe), but creating the channel asset is not documented for Python.
- [general] To add a missing operation, write a small editor module with a `BlueprintCallable` wrapper, or register your own toolset (Epic's skills plugin describes `AICallable` in C++ and a `toolset_registry.tool_call` decorator in Python), then call it through `execute_tool`.

## MCP and external tools

- [documented] Epic's MCP server exposes the toolset registry through meta-tools (`list_toolsets`, `describe_toolset`, `call_tool`) and needs the `ModelContextProtocol` and `AllToolsets` plugins. The Niagara tools above are the same ones `execute_tool` ran.
- [general] Community projects add Niagara tools (MCP servers, a plugin adding simulation-stage and module-graph tools) and a Python exporter that turns a system into text for an agent. Their claims are their own; check the engine version and run the sim-cache check on what they author.

## Importing generated assets into Niagara

- [documented] A mesh renderer takes a static mesh from the system or from a user parameter (`override_system_user_variable_static_mesh`; the Static Mesh data interface also binds an actor or component). The Audio Player data interface plays a `SoundBase` from particle data.
- [general] A sprite atlas becomes a flipbook texture: import it, use a Sprite Renderer with the Sub UV Animation module, and set Sub Image Size to the atlas grid. Epic advises a power-of-two texture and a tile count that divides it evenly. The Niagara Baker, which bakes a simulation to a flipbook, is documented as an editor UI workflow only.

## Fluids and first runs

- [general] Epic's 3D fluid systems need `r.GenerateMeshDistanceFields=True` in the project; without it the log says mesh distance field generation is not enabled and the system never activates. Their grid bounds draw through `User.DrawBounds`.
- [general] The first activation of a system compiles it on the game thread, from a fraction of a second to about a minute for a fluid, and the window freezes meanwhile; the result is cached.
- [general] Check a newly authored system with a simulation cache first: removing a template's emitter and adding a Fountain emitter plus modules gave a system that never emitted; adding modules to an emitter that already emitted worked ([showcase](../../../examples/unreal/niagara-showcase/README.md)).

## Verify and profile

- [tested] Count what spawned: `NiagaraSimCacheFunctionLibrary.create_niagara_sim_cache` and `capture_niagara_sim_cache_immediate(cache, params, component, True, dt)` in Play-In-Editor, then `read_position_attribute("Position", emitter, frame)`. A stateful template reported 100, 80 and 10 positions for its three emitters; a stateless (lightweight) template reported one emitter named `None` with none, because stateless emitters keep no per-particle data.
- [tested] A one-shot burst is no longer active seconds after play begins; call `activate(True)` before capturing. Capture returns None for an inactive component.
- [documented] Cost and scalability: Effect Types share scalability rules, and the Niagara Debugger (`fx.Niagara.Debug.Hud`, `fx.Budget.*`) and Unreal Insights with `-StatNamedEvents` are interactive tools; Epic documents no scripted way to read them. See [profiling facts](unreal-native-profiling-facts.md).
- [general] Particle counts prove an effect ran, not that it looks right or fits a budget; pair them with a native screenshot and the review in [engine-visual-polish](../../engine-visual-polish/references/unreal-production-stack.md).
