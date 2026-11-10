import bpy,bmesh,json,math,struct
from pathlib import Path
from mathutils import Matrix, Vector
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
trim=bpy.data.materials['Atelier painted mouldings'];plaster=bpy.data.materials['Ivory plaster patina']
def replace_mesh(name,verts,faces,material):
 o=bpy.data.objects[name];mesh=bpy.data.meshes.new(name+'_Watertight');mesh.from_pydata(verts,[],faces)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o.data=mesh;o.matrix_world=Matrix.Identity(4);mesh.materials.append(material)
 o.modifiers.clear();bevel=o.modifiers.new('Matched rounded trim','BEVEL');bevel.width=.015;bevel.segments=3
 return o
def panels(name,rects,map_point):
 verts=[];faces=[]
 for x0,x1,z0,z1 in rects:
  w=.12;start=len(verts)
  for depth in (9.60,9.77):
   for x,z in [(x0,z0),(x1,z0),(x1,z1),(x0,z1),(x0+w,z0+w),(x1-w,z0+w),(x1-w,z1-w),(x0+w,z1-w)]:verts.append(map_point(x,depth,z))
  for i in range(4):
   j=(i+1)%4
   faces.extend([tuple(start+k for k in face) for face in [(i,j,j+4,i+4),(i+8,i+12,j+12,j+8),(i,i+8,j+8,j),(i+4,j+4,j+12,i+12)]])
 replace_mesh(name,verts,faces,trim)
rects=[(a,b,z0,z1) for a,b in [(-9.2,-3.5),(-2.85,2.85),(3.5,9.2)] for z0,z1 in [(-2.68,2.68),(2.91,3.59)]]
panels('BackWallPanels',rects,lambda x,d,z:(x,d,z))
panels('LeftWallPanels',rects,lambda x,d,z:(-d,x,z))
# Preserve the large right-wall painting and leave the stair aperture unobstructed.
panels('RightWallPanels',[(a,b,z0,z1) for a,b in [(-9.2,-1.35),(7.2,9.2)] for z0,z1 in [(-2.68,2.68),(2.91,3.59)]],lambda x,d,z:(d,x,z))
# Continuous barrel vault rises to the upstairs opening without a low polygonal lip.
verts=[];faces=[];segments=64;stations=12
for outer in (False,True):
 for station in range(stations+1):
  t=station/stations;x=9.98+5.12*t;spring=.70+1.20*t
  radius=2.6+(.20 if outer else 0)
  for i in range(segments+1):
   a=i*math.pi/segments;verts.append((x,4+radius*math.cos(a),spring+radius*math.sin(a)))
stride=segments+1;layer=(stations+1)*stride
for offset in (0,layer):
 for j in range(stations):
  for i in range(segments):
   a=offset+j*stride+i;faces.append((a,a+1,a+1+stride,a+stride))
for j in (0,stations):
 for i in range(segments):a=j*stride+i;faces.append((a,a+1,a+1+layer,a+layer))
for i in (0,segments):
 for j in range(stations):a=j*stride+i;faces.append((a,a+stride,a+stride+layer,a+layer))
vault=replace_mesh('ArchPassage_Ceiling',verts,faces,plaster);vault.modifiers.clear()
for p in vault.data.polygons:p.use_smooth=True
# Use the same oak surface as the floors, avoiding stripy procedural stair grain.
stairs=bpy.data.objects['StairsVisible'];stairs.data.materials.clear();stairs.data.materials.append(bpy.data.materials['FloorMaterial'])
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room1.blend'))
export_names=set(json.loads(s['gallery_export_names']))
bpy.ops.object.select_all(action='DESELECT')
for name in export_names:
 o=bpy.data.objects[name];o.hide_set(False);o.select_set(True)
out=R/'public/models/room1-harmonized.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_animations=False,export_cameras=False,export_lights=False)
with out.open('rb') as f:
 h=f.read(20);data=json.loads(f.read(struct.unpack_from('<I',h,12)[0]))
assert {n.get('name') for n in data['nodes']}==export_names
out.replace(R/'public/models/room1.glb')
print('REPAIRED_EXPORT_VERIFIED',flush=True)
source=(R/'scripts/harmonize_gallery.py').read_text()
exec(source[source.index('# Assemble Room 2 for review only.'):])
