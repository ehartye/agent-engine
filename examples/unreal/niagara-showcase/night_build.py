"""Build an outdoor night scene with 2D and 3D fluid fire and smoke side by side (Unreal 5.8, engine content only).

Run headless (assets and level only, no rendering), in the same project as showcase_build.py:
  UnrealEditor-Cmd.exe Project.uproject -run=pythonscript -script=<this file> -unattended -nullrhi -nosplash -nopause -nosound -notraceserver
Then fly it with showcase_explore.py on /Game/Maps/NiagaraNight.

Open ground with a few tree trunks and rocks, no sky light, and a very dim blue directional "moon", so the fire is the main light.
Four stations: the 2D grid fire (Grid2D_Gas_MovingFire, a sprite) and the 3D grid fire (Grid3D_Gas_Fire) on the west side, the 2D and 3D
smoke (Grid2D_Gas_Smoke, Grid3D_Gas_Smoke) on the east side. The 3D ones need r.GenerateMeshDistanceFields=True (see README.md). Light levels are environment variables so they can be tuned without editing the script.
"""
import json
import math
import os
import traceback

import unreal

MAP_PATH = "/Game/Maps/NiagaraNight"
FLUIDS = "/NiagaraFluids/Templates/Gas/3D/Systems/"
MOON = float(os.environ.get("NIAGARA_NIGHT_MOON", "0.4"))        # lux
FIRE_LIGHT = float(os.environ.get("NIAGARA_NIGHT_FIRE_LIGHT", "400"))   # candela
SMOKE_LIGHT = float(os.environ.get("NIAGARA_NIGHT_SMOKE_LIGHT", "120"))
# id, system, x, y, light colour, light intensity, light height
FLUIDS_2D = "/NiagaraFluids/Templates/Gas/2D/Systems/"
STATIONS = [
    ("fire2d", FLUIDS_2D + "Grid2D_Gas_MovingFire", -600.0, -350.0, (255, 120, 40), FIRE_LIGHT, 280.0),
    ("fire3d", FLUIDS + "Grid3D_Gas_Fire", -600.0, 350.0, (255, 120, 40), FIRE_LIGHT, 280.0),
    ("smoke2d", FLUIDS_2D + "Grid2D_Gas_Smoke", 600.0, -350.0, (150, 190, 255), SMOKE_LIGHT, 450.0),
    ("smoke3d", FLUIDS + "Grid3D_Gas_Smoke", 600.0, 350.0, (150, 190, 255), SMOKE_LIGHT, 450.0),
]

report = {"engine": unreal.SystemLibrary.get_engine_version(), "steps": []}


def step(name, **info):
    report["steps"].append(dict(step=name, **info))


def rgb(color):
    """unreal.Color takes its positional arguments as (b, g, r, a), so name them."""
    return unreal.Color(r=color[0], g=color[1], b=color[2], a=255)


def spawn(cls, location, rotation=None):
    return unreal.EditorLevelLibrary.spawn_actor_from_class(cls, location, rotation or unreal.Rotator(0, 0, 0))


def block(label, mesh, material, centre, scale):
    actor = spawn(unreal.StaticMeshActor, unreal.Vector(*centre))
    actor.set_actor_label(label)
    actor.static_mesh_component.set_static_mesh(mesh)
    actor.static_mesh_component.set_material(0, material)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    return actor


try:
    unreal.AssetRegistryHelpers.get_asset_registry().search_all_assets(True)
    unreal.EditorAssetLibrary.make_directory("/Game/Maps")
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    cube = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
    cylinder = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder")
    sphere = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere")
    grid = unreal.EditorAssetLibrary.load_asset("/Engine/EngineMaterials/WorldGridMaterial")

    block("Ground", cube, grid, (0, 0, -10), (400, 400, 0.2))   # 400 m square
    # Trunks in a loose ring 18 to 30 m out, a few rocks near the fire.
    for i in range(14):
        a = i * 2 * math.pi / 14 + (0.3 if i % 2 else 0.0)
        r = 1800 + 300 * (i % 3) * 2
        block(f"Trunk_{i + 1:02d}", cylinder, grid, (r * math.cos(a), r * math.sin(a), 350), (0.8, 0.8, 7.0))
    for i, (dx, dy, s) in enumerate(((-320, 140, 0.9), (-300, -160, 0.7), (-880, 60, 1.1), (-860, -120, 0.8))):
        block(f"Rock_{i + 1}", sphere, grid, (dx, dy, 25), (s, s * 1.2, s * 0.5))
    step("ground")

    moon = spawn(unreal.DirectionalLight, unreal.Vector(0, 0, 1000), unreal.Rotator(0, -35, 40))
    moon.set_actor_label("Moon")
    mc = moon.get_component_by_class(unreal.DirectionalLightComponent)
    mc.set_mobility(unreal.ComponentMobility.MOVABLE)   # a Stationary light shows "lighting needs to be rebuilt" in a level with no baked lighting
    mc.set_editor_property("intensity", MOON)
    mc.set_editor_property("light_color", rgb((120, 150, 255)))

    for index, (sid, path, x, y, color, intensity, height) in enumerate(STATIONS):
        system = unreal.EditorAssetLibrary.load_asset(path)
        actor = spawn(unreal.NiagaraActor, unreal.Vector(x, y, 20))
        actor.set_actor_label(f"Station_{index + 1:02d}_{sid}")
        comp = actor.get_editor_property("niagara_component")
        comp.set_editor_property("asset", system)
        comp.set_editor_property("auto_activate", False)
        actor.set_editor_property("tags", [unreal.Name("niagara_showcase"), unreal.Name("replay_0")])
        light = spawn(unreal.PointLight, unreal.Vector(x, y, height))
        light.set_actor_label(f"Light_{index + 1:02d}")
        lc = light.get_component_by_class(unreal.PointLightComponent)
        lc.set_mobility(unreal.ComponentMobility.MOVABLE)
        lc.set_editor_property("intensity", intensity)
        lc.set_editor_property("attenuation_radius", 1800.0)
        lc.set_editor_property("light_color", rgb(color))
        step("station", id=sid, system=path, loaded=bool(system))

    ppv = spawn(unreal.PostProcessVolume, unreal.Vector(0, 0, 0))
    ppv.set_actor_label("Look")
    ppv.set_editor_property("unbound", True)
    settings = ppv.get_editor_property("settings")
    for name, value in (("bloom_intensity", 1.0), ("auto_exposure_min_brightness", 1.0), ("auto_exposure_max_brightness", 1.0),
                        ("vignette_intensity", 0.4)):
        try:
            settings.set_editor_property("override_" + name, True)
            settings.set_editor_property(name, value)
        except Exception as exc:
            step("post_process_skip", setting=name, error=str(exc)[:100])
    ppv.set_editor_property("settings", settings)

    camera = spawn(unreal.CameraActor, unreal.Vector(-240, 0, 220))
    camera.set_actor_label("ShowcaseCamera")
    camera.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(camera.get_actor_location(), unreal.Vector(-600, 0, 280)), False)
    step("save_map", ok=bool(unreal.EditorLoadingAndSavingUtils.save_map(unreal.EditorLevelLibrary.get_editor_world(), MAP_PATH)))
except Exception:
    step("error", traceback=traceback.format_exc()[-900:])

path = os.environ.get("NIAGARA_NIGHT_REPORT") or os.path.join(unreal.SystemLibrary.get_project_directory(), "Saved", "niagara-night-build.json")
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as fh:
    json.dump(report, fh, indent=2, default=str)
unreal.log("[night_build] wrote " + path)
