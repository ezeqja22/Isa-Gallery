import bpy, math, random
from pathlib import Path
from mathutils import Vector
random.seed(91)
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
c=bpy.data.collections['Atelier_Exterior']
materials=[bpy.data.materials['Garden foliage '+str(i)] for i in range(4)]
verts=[];faces=[];indices=[]
for o in list(c.objects):
 if o.name.startswith('Garden foliage cluster'):
  center=o.location.copy()+Vector((8,0,0));scale=o.scale.copy()
  for j in range(160):
   direction=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-1,1))).normalized()
   pos=center+Vector((direction.x*scale.x,direction.y*scale.y,direction.z*scale.z))*random.uniform(.25,1.2)
   axis=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-.8,.8))).normalized()
   cross=axis.cross(Vector((0,0,1))).normalized()
   length=random.uniform(.10,.23);width=length*.48
   start=len(verts)
   verts.extend([pos-axis*length,pos+cross*width+Vector((0,0,.025)),pos+axis*length,pos-cross*width+Vector((0,0,.025))])
   faces.append((start,start+1,start+2,start+3));indices.append(random.randrange(4))
  bpy.data.objects.remove(o,do_unlink=True)
 elif o.name.startswith('Garden'):o.location.x+=8
mesh=bpy.data.meshes.new('Fine garden foliage');mesh.from_pydata(verts,[],faces)
o=bpy.data.objects.new('Garden leaf canopy',mesh);c.objects.link(o)
for m in materials:mesh.materials.append(m)
for p,index in zip(mesh.polygons,indices):p.material_index=index
s.cycles.samples=64
s.render.filepath=str(R/'assets/blender/room2-atelier-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room2-atelier-preview.blend'))
bpy.ops.render.render(write_still=True)
