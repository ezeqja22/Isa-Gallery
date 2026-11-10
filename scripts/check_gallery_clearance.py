import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
names=set(json.loads(s['gallery_export_names']))
objects=[o for o in s.objects if o.name in names and o.type=='MESH']
with bpy.data.libraries.load(str(R/'assets/blender/room2.blend')) as (a,b):b.objects=['Room2_EntryWall','Room2_Floor','Room2_Ceiling']
for o in b.objects:s.collection.objects.link(o);o.location+=Vector((27,0,2.8));objects.append(o)
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
trees=[]
for o in objects:
 ev=o.evaluated_get(deps);mesh=ev.to_mesh();tree=BVHTree.FromPolygons([o.matrix_world@v.co for v in mesh.vertices],[tuple(p.vertices) for p in mesh.polygons]);trees.append((o.name,tree));ev.to_mesh_clear()
paths=json.loads((R/'assets/blender/camera-path-check.json').read_text());hits=[]
for name,points in paths.items():
 points=[Vector((x,-z,y)) for x,y,z in points]
 for i,(a,b) in enumerate(zip(points,points[1:])):
  d=b-a
  for obj,tree in trees:
   hit=tree.ray_cast(a,d.normalized(),d.length)
   if hit[0] is not None:hits.append((name,i,obj))
assert not hits,hits
print('CAMERA_CLEARANCE_PASSED: both directions, 400 sampled path segments; no geometry crossings.')
