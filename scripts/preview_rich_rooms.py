"""Render the actual exported GLBs for architecture/UV verification; no source edits."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
for room in ['room1','hallway']:
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models'/f'{room}.glb'))
s=bpy.context.scene
# Blender glTF imports restore Z-up. Use the website's exact arrival cameras.
for o in s.objects:
    if o.type=='MESH' and (o.name.startswith('SkylightGlass') or o.name=='Hall_Window'):
        o.visible_shadow=False
bpy.ops.object.light_add(type='SUN',location=(47,8,17.6))
sun=bpy.context.object;sun.rotation_euler=Vector((-32,-8,-17.6)).to_track_quat('-Z','Y').to_euler()
sun.data.energy=2.4;sun.data.angle=.045
world=bpy.data.worlds.new('Daylight review');s.world=world;world.use_nodes=True
nodes=world.node_tree.nodes
environment=nodes.new('ShaderNodeTexEnvironment')
environment.image=bpy.data.images.load(str(ROOT/'public/environment/drackenstein_quarry_puresky_4k.exr'))
world.node_tree.links.new(environment.outputs['Color'],nodes['Background'].inputs['Color'])
nodes['Background'].inputs['Strength'].default_value=.35
for position,power,size in [((0,0,3),700,8),((0,-17,2.8),350,6)]:
    bpy.ops.object.light_add(type='AREA',location=position);o=bpy.context.object;o.data.energy=power;o.data.size=size
bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera
camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=24
camera.data.lens=24/(2*math.tan(math.radians(75)/2))
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True
s.render.resolution_x=1280;s.render.resolution_y=720;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'
for label,position,target in [
    ('hallway-rich',(0,-21,-.5),(0,7,-.3)),
    ('gallery-rich',(0,-2.2,-.5),(0,9.5,-.5)),
    ('portal-clearance',(0,-15.8,-.5),(0,-10,1.1)),
]:
    camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=str(ROOT/'reports'/f'{label}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED',label,flush=True)
