import bpy,json,struct
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
def glb_names(room):
 with (R/f'public/models/{room}.glb').open('rb') as f:
  h=f.read(20);j=json.loads(f.read(struct.unpack_from('<I',h,12)[0]))
 return {n.get('name') for n in j['nodes']}
names=glb_names('room1')
print('EXPORTED_ROOM1',json.dumps(sorted(names)))
for o in bpy.context.scene.objects:
 if o.name not in names:continue
 if any(k in o.name for k in ('Panel','Wall','Arch','Stair','Landing','Floor')):
  mats=[]
  for m in o.data.materials if o.type=='MESH' else []:
   if not m:mats.append(None);continue
   p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None) if m.use_nodes else None
   mats.append({'name':m.name,'diffuse':list(m.diffuse_color),'base':list(p.inputs['Base Color'].default_value) if p else None})
  print('OBJECT',json.dumps({'name':o.name,'hide':o.hide_get(),'materials':mats,'faces':len(o.data.polygons) if o.type=='MESH' else 0,'material_indices':sorted(set(p.material_index for p in o.data.polygons)) if o.type=='MESH' else [],'bounds':[[min((o.matrix_world@Vector(v))[a] for v in o.bound_box),max((o.matrix_world@Vector(v))[a] for v in o.bound_box)] for a in range(3)]}))
with bpy.data.libraries.load(str(R/'assets/blender/room2.blend')) as (a,b):b.objects=['Room2_EntryWall','Room2_Floor']
for o in b.objects:
 bpy.context.scene.collection.objects.link(o);o.location+=Vector((27,0,2.8))
 print('JOIN_ROOM2',json.dumps({'name':o.name,'bounds':[[min((o.matrix_world@Vector(v))[a] for v in o.bound_box),max((o.matrix_world@Vector(v))[a] for v in o.bound_box)] for a in range(3)]}))
