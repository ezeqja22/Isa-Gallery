import bpy,json,struct,shutil,math,random
from pathlib import Path
from datetime import datetime
R=Path(__file__).resolve().parents[1]
backup=R/'backups'/('before-material-finish-'+datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True)
for room in ['room1','room2','hallway']:
 for folder,ext in [('assets/blender','blend'),('public/models','glb')]:shutil.copy2(R/folder/(room+'.'+ext),backup/(room+'.'+ext))
def texture_material(m,base,amount):
 m=m.copy();m.name='Unified finish '+m.name
 image=bpy.data.images.new(m.name,width=256,height=256);rng=random.Random(7);pixels=[]
 for y in range(256):
  for x in range(256):
   value=.4*math.sin(x*.14)*math.sin(y*.09)+rng.uniform(-.6,.6)
   pixels.extend([max(0,min(1,c+value*amount)) for c in base]+[1])
 image.pixels.foreach_set(pixels);image.pack();nodes=m.node_tree.nodes;p=nodes.get('Principled BSDF');t=nodes.new('ShaderNodeTexImage');t.image=image;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);p.inputs['Roughness'].default_value=.78
 return m
for room in ['room1','room2','hallway']:
 target=R/'public/models'/(room+'.glb');raw=target.read_bytes();g=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]);allowed={n.get('name') for n in g['nodes']}
 bpy.ops.wm.open_mainfile(filepath=str(R/'assets/blender'/(room+'.blend')))
 brass=next((m for m in bpy.data.materials if m.name.startswith('Atelier aged brass')),None)
 assert brass
 cache={}
 for o in list(bpy.context.scene.objects):
  if o.name not in allowed or o.type not in {'MESH','CURVE'}:continue
  trim=False;changed=False
  for slot in o.material_slots:
   m=slot.material
   if not m:continue
   is_trim='painted mouldings' in m.name
   is_plaster='plaster patina' in m.name
   if not (is_trim or is_plaster):continue
   key='trim' if is_trim else 'plaster'
   if key not in cache:cache[key]=texture_material(m,(.65,.60,.49) if is_trim else (.64,.60,.52),.045 if is_trim else .055)
   slot.material=cache[key];trim=trim or is_trim;changed=True
  if changed and o.type=='MESH':
   uv=o.data.uv_layers.active or o.data.uv_layers.new()
   for poly in o.data.polygons:
    axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
    for li in poly.loop_indices:
     v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]]/2,v[axes[1]]/2)
  if trim:
   # Bronze edge highlights use the exact material of the atelier window accents.
   o.data.materials.append(brass);idx=len(o.data.materials)-1
   if o.type=='MESH':
    bevel=next((mod for mod in o.modifiers if mod.type=='BEVEL'),None)
    if not bevel:bevel=o.modifiers.new('Aged brass edge detail','BEVEL');bevel.width=.018;bevel.segments=3
    bevel.material=idx
   elif o.data.bevel_depth>0:
    # Fine raised bronze bead follows the painted arch without replacing it.
    bead=o.copy();bead.data=o.data.copy();bead.name=o.name+'_BronzeBead';bpy.context.collection.objects.link(bead)
    bead.data.materials.clear();bead.data.materials.append(brass)
    bead.location.y-=o.data.bevel_depth*.9;bead.data.bevel_depth=.018;allowed.add(bead.name)
 bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender'/(room+'.blend')))
 bpy.ops.object.select_all(action='DESELECT')
 for o in bpy.context.scene.objects:
  if o.name in allowed:o.hide_set(False);o.select_set(True)
 out=target.with_name(room+'-finish.glb')
 bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
 out.replace(target);print('FINISH_EXPORTED',room,flush=True)
print('BACKUP',backup)
