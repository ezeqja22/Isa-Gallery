"""Match gallery and passage to the approved studio; preserve artwork and layout."""
import bpy,bmesh,json,struct,shutil,math
from pathlib import Path
from datetime import datetime
from mathutils import Vector
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
backup=R/'assets/backups'/('gallery-unification-'+datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True)
for name in ('room1.blend','room2.blend'):shutil.copy2(R/'assets/blender'/name,backup/name)
shutil.copy2(R/'public/models/room1.glb',backup/'room1.glb')
with (R/'public/models/room1.glb').open('rb') as f:
 h=f.read(20);glb=json.loads(f.read(struct.unpack_from('<I',h,12)[0]))
export_names={n.get('name') for n in glb['nodes']}
with bpy.data.libraries.load(str(R/'assets/blender/room2.blend'),link=False) as (a,b):
 b.materials=['Ivory plaster patina','Atelier painted mouldings','Atelier aged brass','FloorMaterial','Warm aged oak']
plaster,trim,brass,floor,oak=b.materials
assert all(b.materials)
def assign(o,m):
 o.data.materials.clear();o.data.materials.append(m)
 for p in o.data.polygons:p.material_index=0
def projected_uv(o,scale=4):
 uv=o.data.uv_layers.active or o.data.uv_layers.new()
 normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
 for p in o.data.polygons:
  normal=normal_matrix@p.normal;axis=max(range(3),key=lambda a:abs(normal[a]))
  axes=[a for a in range(3) if a!=axis]
  for li in p.loop_indices:
   v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
   uv.data[li].uv=(v[axes[0]]/scale,v[axes[1]]/scale)
for o in s.objects:
 if o.name not in export_names:
  o.hide_render=True
  continue
 if o.type!='MESH':continue
 name=o.name
 if name in ('Floor','ArchPassage_Floor','UpperLanding'):
  assign(o,floor);projected_uv(o)
 elif name=='StairsVisible':
  assign(o,oak);projected_uv(o,2)
 elif name in ('BackWall','LeftWall','RightWall') or name.startswith('ArchPassage_') or name.startswith('NewSkylight_Ceiling'):
  assign(o,plaster);projected_uv(o)
 elif any(k in name for k in ('WallPanels','Baseboard','Cornice','ArchPillar','RightArchCurveTrim','ArchDetail')):
  assign(o,trim)
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  # Small highlights on existing trim, not extra decorative objects.
  if not any(m.type=='BEVEL' for m in o.modifiers):
   m=o.modifiers.new('Consistent trim edge','BEVEL');m.width=.015;m.segments=3
 elif '_Frame_' in name or name.startswith('Skylight5x5_') or name.startswith('NewSkylight_Frame'):
  assign(o,brass)
 # Old normal-map seams at panel ends no longer share the wall shader.
 if name.startswith(('SkylightGlass','Glass')):
  for m in o.data.materials:
   if m and m.use_nodes:
    p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if p:p.inputs['Roughness'].default_value=.12
# Align landing to Room 2 floor top: -4.03 + 2.8 = -1.23.
landing=bpy.data.objects['UpperLanding'];landing.location.z=-1.38
passage_floor=bpy.data.objects['ArchPassage_Floor'];passage_floor.location.z=-3.94
# Slightly extend the side-wall join into Room 2's entry wall to remove light leaks.
for name in ('ArchPassage_BackWall','ArchPassage_FrontWall'):
 o=bpy.data.objects[name];o.location.x=12.55;o.dimensions.x=5.1
bpy.context.view_layer.update()
for o in s.objects:
 if o.name in export_names and o.type=='MESH' and o.name in ('UpperLanding','ArchPassage_Floor'):projected_uv(o)
s['harmonization_notes']='Studio plaster, trim, brass and floor palette; panel material seams corrected; landing flush with studio floor. Artwork placements and names preserved.'
# Store an explicit export allowlist so hidden construction versions cannot leak into the export.
s['gallery_export_names']=json.dumps(sorted(export_names))
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room1.blend'))
for o in s.objects:o.select_set(False)
for name in export_names:
 o=bpy.data.objects.get(name)
 if o:o.hide_set(False);o.select_set(True)
out=R/'public/models/room1-harmonized.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_animations=False,export_cameras=False,export_lights=False)
with out.open('rb') as f:
 h=f.read(20);data=json.loads(f.read(struct.unpack_from('<I',h,12)[0]))
names={n.get('name') for n in data['nodes']}
assert export_names==names,(export_names-names,names-export_names)
assert all('bufferView' in im for im in data.get('images',[]))
out.replace(R/'public/models/room1.glb')
print('GALLERY_VERIFIED',json.dumps({'objects':len(names),'backup':str(backup)}),flush=True)
# Assemble Room 2 for review only. The saved Room 1 and its GLB remain separate.
with bpy.data.libraries.load(str(R/'assets/blender/room2.blend'),link=False) as (a,b):
 b.objects=[n for n in a.objects if not any(k in n for k in ('DoNotExport','Review_','Studio_Review','Original_Easel'))]
for o in b.objects:
 if o:
  s.collection.objects.link(o)
for o in b.objects:
 if o and o.parent is None:o.location+=Vector((27,0,2.8))
# Use matched daylight for read-only room and threshold renders.
bpy.ops.object.light_add(type='SUN',location=(47,8,17.6));sun=bpy.context.object
sun.rotation_euler=Vector((-32,-8,-17.6)).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.4;sun.data.angle=.065
for pos,power,size in [((0,0,3),1500,8),((12.5,4,2.5),220,3),((26,0,4.5),1000,7)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size
if not s.world:s.world=bpy.data.worlds.new('Shared gallery world')
s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.7,.8,1,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.3
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.lens=19
s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=800;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG'
for label,pos,target in [('room1-harmonized',(0,-2.2,-.5),(1,9,-.3)),('archway-harmonized',(5.8,1,-.8),(16,4,.2)),('threshold-harmonized',(13.3,4,.1),(27,0,.9))]:
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(R/'assets/blender'/f'{label}.png')
 bpy.ops.render.render(write_still=True)
