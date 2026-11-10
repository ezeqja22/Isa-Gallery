"""Render the existing gallery for Isma's anniversary film; never save scene files."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'deliverables/isma-anniversary/assets';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
for room in ['room1','hallway','room2']:
    existing=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models'/f'{room}.glb'))
    if room=='room2':
        for o in set(bpy.context.scene.objects)-existing:
            if o.parent is None:o.location+=Vector((27,0,2.8))
s=bpy.context.scene
for o in s.objects:
    if o.type=='MESH' and (o.name.startswith('SkylightGlass') or o.name=='Hall_Window'):o.visible_shadow=False
bpy.ops.object.light_add(type='SUN',location=(47,8,17.6))
sun=bpy.context.object;sun.rotation_euler=Vector((-32,-8,-17.6)).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.4;sun.data.angle=.045
world=bpy.data.worlds.new('Anniversary daylight');s.world=world;world.use_nodes=True
nodes=world.node_tree.nodes;env=nodes.new('ShaderNodeTexEnvironment')
env.image=bpy.data.images.load(str(ROOT/'public/environment/drackenstein_quarry_puresky_4k.exr'))
world.node_tree.links.new(env.outputs['Color'],nodes['Background'].inputs['Color']);nodes['Background'].inputs['Strength'].default_value=.4
for pos,power,size in [((0,0,3),850,8),((0,-17,2.8),450,6),((26,0,5.8),950,7)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=size
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam
cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24
s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True
s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'
for label,pos,target,fov in [
    ('hallway',(0,-21,-.5),(0,7,-.3),70),
    ('gallery',(0,-2.2,-.5),(0,9.5,-.5),68),
    ('atelier',(18.3,4,.9),(28,-1.5,.9),70),
]:
    cam.data.lens=24/(2*math.tan(math.radians(fov)/2))
    cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=str(OUT/f'{label}.png');bpy.ops.render.render(write_still=True)
    print('FILM_STILL_READY',label,flush=True)
