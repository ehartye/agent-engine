# Unreal import policy and read-back

Extends the [guarded Unreal import helper](unreal-import-reuse.md): same config file, closed-project and owned-destination rules, and the same `--inspect`, `--if-changed` and `--force`. A game with a regenerated project reads [regenerated projects](unreal-import-regenerated-projects.md) first. Evidence is Windows, UE 5.8.2 CL56702186, disposable fixtures only.

- [general] All of this is optional. It lets a game state its import policy in the config instead of writing its own Editor script, and it proves each setting by reading it back from the saved asset. Without `meshes`, `options.nanite` and `options.vertexColors` nothing below runs and the request, native behavior and receipt are those of 0.12.0.

```json
{
  "source": "Art/Meshes/generated/turbine/model.glb",
  "project": "Game.uproject",
  "engine": "C:/Program Files/Epic Games/UE_5.8",
  "destination": "/Game/Generated/Turbine",
  "options": { "combineStaticMeshes": false, "importMaterials": false, "nanite": false, "vertexColors": "replace" },
  "meshes": [
    { "node": "Turbine_Tower", "asset": "SM_Turbine_Tower",
      "allowCpuAccess": true, "fullPrecisionUVs": true, "material": "/Game/Art/M_Ink",
      "collision": "complex-as-simple",
      "expect": { "boundsCm": { "min": [-175, -182.35, 0], "max": [325.87, 182.35, 9630], "toleranceCm": 0.6 },
                  "maxVertices": 338, "vertexColors": true, "minUvChannels": 1 } },
    { "node": "Turbine_Rotor", "asset": "SM_Turbine_Rotor", "fullPrecisionUVs": true, "material": "/Game/Art/M_Ink" }
  ]
}
```

| Key | Effect | Engine property set |
|---|---|---|
| `options.vertexColors` `replace`, `ignore` or `override` | Vertex-colour import mode; `replace` makes the GLB's `COLOR_0` the mesh's vertex colours | `common_meshes_properties.vertex_color_import_option` = `IVCIO_*` |
| `options.nanite` boolean | Explicit Nanite on or off. The 5.8.2 importer default is on, even for a 290-triangle mesh | `mesh_pipeline.build_nanite` |
| `options.combineStaticMeshes: false` | Keep several meshes in one GLB uncombined (a kit). The native script resolves the enum member defensively (`DO_NOT_COMBINE`, then `NONE`) and reports the name that worked in `policy.pipeline.combineStaticMeshes` | `combine_static_meshes_behavior` |
| `meshes[].asset` (required) | Requested asset name (`[A-Za-z][A-Za-z0-9_]*`). The mesh is renamed to `<destination>/<asset>`; no redirector was left in the native runs | `EditorAssetLibrary.rename_asset` |
| `meshes[].node` | Imported mesh to rename: exact name, else `node_` prefix; must match exactly one. Required when several meshes are listed; with one entry it may be omitted and the single imported StaticMesh is used | |
| `meshes[].allowCpuAccess` | CPU access, so game code can read vertex data back | `allow_cpu_access` |
| `meshes[].fullPrecisionUVs` | Full-precision UVs on every LOD (half precision lost up to 0.0078 on UVs that reach about 20) | `StaticMeshEditorSubsystem` LOD build settings `use_full_precision_u_vs` |
| `meshes[].material` | Existing `/Game/...` or `/Engine/...` material assigned to every slot (not inside the owned destination) | `StaticMesh.set_material` |
| `meshes[].collision` `complex-as-simple` | Use the render triangles as collision. Also sets double-sided geometry unless `doubleSidedCollision` says otherwise | body setup `collision_trace_flag` = `CTF_USE_COMPLEX_AS_SIMPLE`, `double_sided_geometry` |
| `meshes[].doubleSidedCollision` | Explicit double-sided collision. Single-sided complex collision let downward rays through faces that a double-sided procedural mesh stops (Dead Redline measured 6/5/5 of 25 rays versus 9/7/7) | `double_sided_geometry` |
| `meshes[].expect` | Assertions that change nothing: `boundsCm` (`min`, `max` in centimetres, `toleranceCm` default 0.5), `maxVertices`, `nanite`, `fullPrecisionUVs`, `vertexColors`, `minUvChannels`, `collision`, `doubleSidedCollision` | |

- [tested] Read-back. After the packages are saved the native script reloads them and reads each mesh: Nanite enabled, full-precision UVs, CPU access, collision trace flag and double-sidedness, material slots, vertex colours present, UV channels, vertex count and bounds in centimetres (asset-local min/max corners). Each record says in `readFrom` whether the values came from the `reloaded-package` or, if a build cannot reload, the `loaded-asset`. The read-back is stored in the receipt under `policy.meshes` and the resolved pipeline enum names under `policy.pipeline`. A fresh Editor process reading the saved assets afterwards agreed with the receipt on the collision flag, double-sidedness, full-precision UVs, CPU access, material slots and vertex colours.
- [general] Every setting the config requests is checked against its read-back automatically (`options.nanite` against every imported mesh; per mesh `fullPrecisionUVs`, `allowCpuAccess`, `material`, `collision`, `doubleSidedCollision`); `expect` adds checks for facts the config does not set. Every mesh must also have a positive vertex count. If `meshes` is present, an imported StaticMesh that no entry claims is a mismatch. If only `options.nanite` or `options.vertexColors` is set, every imported StaticMesh is read back and checked against `options.nanite`.
- [tested] A mismatch fails the import with `IMPORT_EXPECTATIONS_FAILED` and a message listing every mismatch (native structural problems such as an unmatched node or a missing material are included), after the receipt with `policy.failures` has been written. This is a known outcome, not an uncertain one: the pending journal is cleared and the project is not blocked. The receipt owns the files, so correcting the config and re-running replaces them. A receipt with failures is never reusable, even for `--if-changed` with an identical config; `--inspect` reports `needs-import` and the recorded `failures`.
- [general] Identity. `options` (including `vertexColors`, `nanite`) and the whole `meshes` list, expectations included, are part of the reuse key, so changing any of them rebuilds under `--if-changed`. A `material` is only a reference by path: changing the material asset does not invalidate reuse, and a missing material is reported at import time. List its source file in `inputs` if it should force a rebuild.
- [general] Scope limits. Only StaticMeshes are renamed, configured and read back; skeletal meshes and animations are untouched. `importMaterials: true` still creates an imported material in the owned destination even when `material` replaces every slot, so turn it off when every mesh gets a project material. `StaticMesh` has no `post_edit_change` in Python: the collision flag is set in place on the body setup, `mesh.modify()` marks it and the explicit save persists it. Read-back checks settings and measured bounds, not rendering, cook or gameplay.
