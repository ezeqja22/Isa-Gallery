import bpy,json,shutil
from pathlib import Path
from datetime import datetime
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
backup=R/'assets/backups'/('gallery-furnishing-'+datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True)
for folder,ext in [('assets/blender','blend'),('public/models','glb')]:shutil.copy2(R/folder/f'room1.{ext}',backup/f'room1.{ext}')
names=set(json.loads(s['gallery_export_names']))
with bpy.data.libraries.load(str(R/'assets/blender/room2.blend')) as (a,b):b.materials=['Warm aged oak']
oak=b.materials[0]
linen=bpy.data.materials.get('Gallery bench linen') or bpy.data.materials.new('Gallery bench linen');linen.diffuse_color=(.34,.29,.22,1);linen.use_nodes=True
p=linen.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.34,.29,.22,1);p.inputs['Roughness'].default_value=.92
for o in list(s.objects):
 if o.name.startswith('Gallery_Bench_'):names.discard(o.name);bpy.data.objects.remove(o,do_unlink=True)
def box(name,pos,size,mat,bevel):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 mod=o.modifiers.new('Crafted edges','BEVEL');mod.width=bevel;mod.segments=3
 o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');names.add(name)
box('Gallery_Bench_OakRail',(-3,3.5,-3.02),(4.2,1.12,.2),oak,.045)
box('Gallery_Bench_LinenSeat',(-3,3.5,-2.86),(4.12,1.08,.20),linen,.075)
for x in (-4.65,-1.35):
 for y in (3.14,3.86):box('Gallery_Bench_Leg_'+str(x)+'_'+str(y),(x,y,-3.47),(.16,.16,.74),oak,.025)
s['gallery_export_names']=json.dumps(sorted(names));bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room1.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in names:o=bpy.data.objects[name];o.hide_set(False);o.select_set(True)
out=R/'public/models/room1-furnished.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_animations=False,export_cameras=False,export_lights=False)
out.replace(R/'public/models/room1.glb');print('FURNISHED_ROOM_EXPORTED',len(names),backup)


