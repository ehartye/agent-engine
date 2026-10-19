"""Invoked only by unreal-import.mjs in a closed project; uses Unreal's Interchange importer."""
import json
import os
import traceback
from pathlib import Path

import unreal


def main(request):
    destination = request['destination']
    project = Path(unreal.Paths.get_project_file_path()).resolve()
    if project != Path(request['project']).resolve():
        raise RuntimeError('project identity mismatch')
    if Path(request['outputDirectory']).exists():
        raise RuntimeError('destination is not empty; refusing import')
    existing = unreal.EditorAssetLibrary.list_assets(destination, recursive=True, include_folder=False)
    if existing:
        raise RuntimeError('destination already contains registered assets')
    pipeline_folder = destination + '/_Import'
    pipeline = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        'Pipeline', pipeline_folder, unreal.InterchangeGenericAssetsPipeline, None)
    if pipeline is None:
        raise RuntimeError('could not create owned Interchange pipeline')
    mesh = pipeline.get_editor_property('mesh_pipeline')
    options = request['options']
    mesh.set_editor_property('combine_static_meshes_behavior',
        unreal.InterchangeCombineStaticMeshesBehavior.ALL if options['combineStaticMeshes']
        else unreal.InterchangeCombineStaticMeshesBehavior.DO_NOT_COMBINE)
    mesh.set_editor_property('combine_skeletal_meshes_behavior',
        unreal.InterchangeCombineSkeletalMeshesBehavior.BY_SKELETON if options['combineSkeletalMeshes']
        else unreal.InterchangeCombineSkeletalMeshesBehavior.DO_NOT_COMBINE)
    material = pipeline.get_editor_property('material_pipeline')
    material.set_editor_property('import_materials', options['importMaterials'])
    material.set_editor_property('reuse_existing_materials', False)
    if not unreal.EditorAssetLibrary.save_loaded_asset(pipeline, only_if_is_dirty=False):
        raise RuntimeError('pipeline save failed')
    params = unreal.ImportAssetParameters()
    params.is_automated = True
    params.replace_existing = False
    params.override_pipelines = [unreal.SoftObjectPath(pipeline.get_path_name())]
    source = unreal.InterchangeManager.create_source_data(request['source'])
    result = unreal.InterchangeManager.get_interchange_manager_scripted().import_asset(destination, source, params)
    if not result:
        raise RuntimeError('Interchange import failed')
    assets = [str(path) for path in unreal.EditorAssetLibrary.list_assets(destination, recursive=True, include_folder=False)]
    imported = [path for path in assets if not path.startswith(pipeline_folder + '/')]
    if not imported:
        raise RuntimeError('Interchange created no imported assets')
    for path in assets:
        if not unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False):
            raise RuntimeError('asset save failed: ' + path)
    return {'assets': assets, 'imported': imported, 'engine': unreal.SystemLibrary.get_engine_version()}


request_path = os.environ['AGENT_ENGINE_IMPORT_REQUEST']
with open(request_path, encoding='utf-8') as source_file:
    request = json.load(source_file)
report = {'ok': False, 'operation': request['operation'], 'destination': request['destination']}
try:
    report.update(main(request))
    report['ok'] = True
except Exception as error:
    report.update(error=str(error), trace=traceback.format_exc())
    unreal.log_error(report['trace'])
finally:
    with open(request['report'], 'x', encoding='utf-8') as output_file:
        json.dump(report, output_file, indent=2)
