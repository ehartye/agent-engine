# Unity as a long-lived project, not a sample scene

The sample scene proves import. A real game needs a loop an agent can run for hours. Everything
below was **tested here** on Unity 6000.6.0f1 (Windows, licensed, `-batchmode`) in a Quest 3 chess
project, unless marked otherwise. The driver is [`examples/unity/project-driver/run.sh`](../../../examples/unity/project-driver/run.sh).

## The loop an agent can trust

| Verb | What it proves | Cost seen |
|---|---|---|
| `import` | Packages resolve and the project compiles | 40 to 45 s warm |
| `test-editmode` | Pure-logic assemblies | about 55 s, almost all editor start-up |
| `test-playmode` | Netcode host and client in one process, scene objects | about 1 min |
| `shot` | A camera rendered to a PNG by a PlayMode test | about 45 s |

**A failed compile must not look like a pass.** Unity writes no results file when scripts do not
compile. If the driver then summarises the previous run's XML, you get "2 passed" next to a screen of
`error CS`. Delete the results file before each run and fail on any `error CS` in the log. The
driver does both. This was hit here, not predicted.

Unity allows one editor per project. Never run two verbs at once, and do not let a background agent
launch Unity while you are. Give the background agent the work that needs no editor (authoring GLBs,
writing docs) and do the Unity steps yourself.

## Share pure logic between Unity and plain .NET

Put engine-free code (rules, state machines, validators) in an assembly definition with
`"noEngineReferences": true`, under `Assets`. Compile the **same files** from an SDK-style `.csproj`:

```xml
<PropertyGroup>
  <TargetFramework>netstandard2.1</TargetFramework>
  <EnableDefaultCompileItems>false</EnableDefaultCompileItems>
</PropertyGroup>
<ItemGroup>
  <Compile Include="..\..\unity\Assets\Game\Rules\**\*.cs" />
</ItemGroup>
```

Unity cannot reference a `.csproj`, and a pre-built DLL goes stale and is binary in the diff. With this
layout xUnit runs 126 tests in about 4 s without Unity, and Unity compiles the same source natively.
Use the fast loop for logic and Unity only for what needs it.

Traps, all hit here:

- Unity ignores `.csproj` references. Every asmdef that names a type from another asmdef must list it
  in `references`, test assemblies included, or you get `CS0012: ... defined in an assembly that is not
  referenced`.
- Unity compiles with nullable annotations off, so `object?` warns. A file named `csc.rsp` containing
  `-nullable:enable` beside the asmdef turns it on for that assembly.
- Two `Color` types (`UnityEngine.Color` and your own) make a bare `Color` ambiguous (CS0104). Add
  `using Color = Your.Namespace.Color;` where both namespaces are imported.
- Files moved under `Assets` have no `.meta` until an editor pass writes them. Run one verb after the
  move and commit the metas with the files, or every reference to them breaks on the next checkout.

## Seeing the result

A screenshot is the only check that catches scale, facing and pivots. A test tagged
`[Category("Screenshot")]` builds the scene, creates a camera, renders to a `RenderTexture`, reads the
pixels and writes a PNG. Launch it **without** `-nographics` so it has a GPU; with `-nographics` the
render has nothing to draw on. No window is needed.

- Judge facing from an **orthographic** top-down camera. A perspective camera over the middle of the
  board makes every tall piece lean outward, which looks like a facing error. This cost two wrong fixes
  here before the orthographic shot settled it.
- glTFast kept a model authored facing +Z facing +Z in Unity (checked with a knight's muzzle).
  Do not add a 180 degree turn for the handedness change; it is already handled on import.

## Multiplayer in tests

Netcode for GameObjects' own `NetcodeIntegrationTest` runs a host and a client in one process. Add
`com.unity.netcode.gameobjects` to the manifest's `testables`, and filter by assembly name or it also
runs NGO's own suite (1,352 EditMode tests). RPC authority rules (out-of-turn and illegal-move refusal
with the reply reaching only the sender) were checked this way in about a minute, with no headset.

## Not tested here

- Meta's Interaction SDK grab components, hand-tracking pinch and on-device play: no headset was
  attached. Pure pick, carry and drop logic is tested; the Quest adapter that feeds it is not.
