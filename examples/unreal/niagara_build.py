"""Build a Niagara probe level in Unreal 5.8 through the editor Python API.

Run headless (assets and level only, no rendering):
  UnrealEditor-Cmd.exe Project.uproject -run=pythonscript -script=<this file> -unattended -nullrhi -nosplash -nopause -nosound
The project needs the PythonScriptPlugin, EditorScriptingUtilities and Niagara plugins. Set NIAGARA_PROBE_REPORT to the
path of the JSON report to write (default: Saved/niagara-build.json under the project directory).

It duplicates engine template systems into /Game/FX, saves them, places one NiagaraActor per system in a new map and saves
the map as /Game/Maps/NiagaraProbe. Claims nothing about rendering: niagara_verify.py checks the running systems.

Traps this script encodes (each cost a failed run):
  - The asset registry has not scanned engine content in a commandlet; call search_all_assets(True) first or
    duplicate_asset says the source "could not be found in the Asset Registry".
  - duplicate_asset takes an object path (Package.Name) for the source.
  - A duplicate lives only in memory until saved; a map saved before the duplicate is saved loads with a null asset.
  - On a placed actor set the `asset` editor property. NiagaraComponent.set_asset does not persist in the saved map.
"""
import json
import os
import traceback

import unreal

TEMPLATES = {
    "Stateful": "/Niagara/DefaultAssets/Templates/Systems/SimpleExplosion",
    "Lightweight": "/Niagara/DefaultAssets/Templates/Systems/FountainLightweight",
}
FX_DIR = "/Game/FX"
MAP_PATH = "/Game/Maps/NiagaraProbe"

report = {"engine": unreal.SystemLibrary.get_engine_version(), "steps": []}


def default_report_path():
    project = unreal.SystemLibrary.get_project_directory()
    return os.environ.get("NIAGARA_PROBE_REPORT") or os.path.join(project, "Saved", "niagara-build.json")


def step(name, **info):
    report["steps"].append(dict(step=name, **info))


try:
    unreal.AssetRegistryHelpers.get_asset_registry().search_all_assets(True)
    unreal.EditorAssetLibrary.make_directory(FX_DIR)
    unreal.EditorAssetLibrary.make_directory("/Game/Maps")
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    x = 0
    for label, source in TEMPLATES.items():
        target = f"{FX_DIR}/NS_{label}"
        if unreal.EditorAssetLibrary.does_asset_exist(target):
            unreal.EditorAssetLibrary.delete_asset(target)
        duplicate = unreal.EditorAssetLibrary.duplicate_asset(f"{source}.{source.rsplit('/', 1)[-1]}", target)
        saved = bool(duplicate) and unreal.EditorAssetLibrary.save_asset(target)
        step("duplicate", template=source, target=target, ok=bool(duplicate), saved=saved)
        if not duplicate:
            continue
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.NiagaraActor, unreal.Vector(x, 0, 120))
        actor.set_actor_label("Fx" + label)
        actor.get_editor_property("niagara_component").set_editor_property("asset", duplicate)
        actor.get_editor_property("niagara_component").set_editor_property("auto_activate", True)
        x += 500
    step("save_map", ok=bool(unreal.EditorLoadingAndSavingUtils.save_map(unreal.EditorLevelLibrary.get_editor_world(), MAP_PATH)))
except Exception:
    step("error", traceback=traceback.format_exc()[-900:])

path = default_report_path()
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as fh:
    json.dump(report, fh, indent=2, default=str)
unreal.log("[niagara_build] wrote " + path)
