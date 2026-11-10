import bpy,bmesh,json,math,shutil,struct
from pathlib import Path
from datetime import datetime
from mathutils import Matrix
R=Path(__file__).resolve().parents[1]
backup=R/'assets/backups'/('portal-repair-'+datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True)
for room in ('room1','room2'):
 for folder,ext in [('assets/blender','blend'),('public/models','glb')]:shutil.copy2(R/folder/f'{room}.{ext}',backup/f'{room}.{ext}')
def mesh(name,v,f,mat):
 o=bpy.data.objects.get(name)
 if not o:
  o=bpy.data.objects.new(name,bpy.data.meshes.new(name));bpy.context.scene.collection.objects.link(o)
 m=bpy.data.meshes.new(name+'_Joined');m.from_pydata(v,[],f)
 bm=bmesh.new();bm.from_mesh(m);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
 o.data=m;o.matrix_world=Matrix.Identity(4);o.modifiers.clear();m.materials.append(mat)
 uv=m.uv_layers.new()
 for p in m.polygons:
  axis=max(range(3),key=lambda a:abs(p.normal[a]));axes=[a for a in range(3) if a!=axis]
  for li in p.loop_indices:
   co=m.vertices[m.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/4,co[axes[1]]/4)
 return o
# Extrude a cross section along x. Adjacent sections share welded edges.
def extrude(name,quads,x0,x1,mat):
 v=[];f=[]
 for poly in quads:
  n=len(poly);a=len(v);v.extend((x,y,z) for x in (x0,x1) for y,z in poly)
  f.extend([tuple(a+i for i in range(n-1,-1,-1)),tuple(a+n+i for i in range(n))])
  for i in range(n):j=(i+1)%n;f.append((a+i,a+j,a+n+j,a+n+i))
 return mesh(name,v,f,mat)
def wall(name,x0,x1,y0,y1,bottom,top,spring,mat):
 q=[[(y0,bottom),(1.4,bottom),(1.4,top),(y0,top)],[(6.6,bottom),(y1,bottom),(y1,top),(6.6,top)]]
 for i in range(64):
  a=math.pi*i/64;b=math.pi*(i+1)/64
  y,z=4+2.6*math.cos(a),spring+2.6*math.sin(a);yy,zz=4+2.6*math.cos(b),spring+2.6*math.sin(b)
  q.append([(y,z),(yy,zz),(yy,top),(y,top)])
 extrude(name,q,x0,x1,mat)
def surround(name,x0,x1,bottom,spring,mat):
 inner=[(1.4,bottom),(1.4,spring)]+[(4+2.6*math.cos(math.pi-i*math.pi/64),spring+2.6*math.sin(math.pi-i*math.pi/64)) for i in range(1,65)]+[(6.6,bottom)]
 outer=[(1.10,bottom),(1.10,spring)]+[(4+2.9*math.cos(math.pi-i*math.pi/64),spring+2.9*math.sin(math.pi-i*math.pi/64)) for i in range(1,65)]+[(6.90,bottom)]
 o=extrude(name,[[inner[i],inner[i+1],outer[i+1],outer[i]] for i in range(len(inner)-1)],x0,x1,mat)
 bevel=o.modifiers.new('Soft plaster edges','BEVEL');bevel.width=.012;bevel.segments=2
for room in ('room1','room2'):
 bpy.ops.wm.open_mainfile(filepath=str(R/f'assets/blender/{room}.blend'));s=bpy.context.scene
 plaster=bpy.data.materials['Ivory plaster patina'];trim=bpy.data.materials['Atelier painted mouldings']
 if room=='room1':
  names=set(json.loads(s['gallery_export_names']))
  for name in list(names):
   if name.startswith(('ArchPillar','ArchDetail')):
    names.remove(name);bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
  wall('RightWall',9.8,10.2,-10,10,-4,4,.7,plaster)
  surround('RightArchCurveTrim',9.62,9.84,-3.84,.7,trim)
  # The sidewalls stop at the spring line instead of sticking through the vault.
  for name,y0,y1 in [('ArchPassage_FrontWall',1.2,1.4),('ArchPassage_BackWall',6.6,6.8)]:
   mesh(name,[(x,y,z) for y in (y0,y1) for x,z in [(9.8,-3.94),(15,-3.94),(15,1.9),(9.8,.7)]],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],plaster)
  v=[];f=[]
  for x,spring in [(9.8,.7),(15,1.9)]:
   for i in range(65):
    a=i*math.pi/64;v.append((x,4+2.6*math.cos(a),spring+2.6*math.sin(a)))
  for i in range(64):f.append((i,i+1,i+66,i+65))
  o=mesh('ArchPassage_Ceiling',v,f,plaster)
  for p in o.data.polygons:p.use_smooth=True
  solid=o.modifiers.new('Vault thickness outward','SOLIDIFY');solid.thickness=.16;solid.offset=1
  # Orient vault normals up/out so thickness does not narrow the opening.
  if o.data.polygons[32].normal.z<0:
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  s['gallery_export_names']=json.dumps(sorted(names))
 else:
  wall('Room2_EntryWall',-12.3,-12,-9.35,9.35,-4.07,3.93,-.9,plaster)
  surround('Studio_EntrySurround',-12.04,-11.82,-4.03,-.9,trim)
  names={o.name for o in s.objects if o.type in {'MESH','CURVE','EMPTY'} and not any('DoNotExport' in c.name for c in o.users_collection)}
 bpy.ops.wm.save_as_mainfile(filepath=str(R/f'assets/blender/{room}.blend'))
 for name in names:
  o=bpy.data.objects[name]
  if o.type=='CURVE':
   bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 bpy.ops.object.select_all(action='DESELECT')
 for name in names:
  o=bpy.data.objects[name];o.hide_set(False);o.select_set(True)
 out=R/f'public/models/{room}-portal.glb'
 bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_animations=False,export_cameras=False,export_lights=False)
 with out.open('rb') as h:
  header=h.read(20);d=json.loads(h.read(struct.unpack_from('<I',header,12)[0]))
 assert all('bufferView' in im for im in d.get('images',[]))
 out.replace(R/f'public/models/{room}.glb')
 print('PORTAL_EXPORTED',room,len(d['nodes']),flush=True)
print('BACKUP',backup)

