"""Render a read-only review of the current Room 1; never saves the blend."""
import bpy
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
for o in s.objects:
 if o.hide_get() or any(word in o.name for word in ('DoNotExport','Cutter','_OLD','Before')):o.hide_render=True
bpy.ops.object.camera_add(location=(0,-2.2,-.5));cam=bpy.context.object
cam.rotation_euler=(Vector((1,9,-.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=19;s.camera=cam
for p,target,power,size in [((-6,-2,3.4),(0,5,-2),2100,8),((6,1,2.5),(0,7,-1),1200,7),((0,-5,1),(0,9,0),1000,6)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
if not s.world:s.world=bpy.data.worlds.new('Review world')
s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.7,.8,1,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.35
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=800;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.filepath=str(R/'assets/blender/room1-review.png')
bpy.ops.render.render(write_still=True)
