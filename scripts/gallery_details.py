import bpy,json,math
from pathlib import Path
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
names=set(json.loads(s['gallery_export_names']))
for o in list(s.objects):
 if o.name.startswith('Gallery_Addition_'):names.discard(o.name);bpy.data.objects.remove(o,do_unlink=True)
def material(n,c,metal=0):
 m=bpy.data.materials.get(n) or bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.5;return m
stone=material('Gallery sculpture travertine',(.53,.48,.38));bronze=material('Gallery sculpture bronze',(.23,.15,.07),.65);wood=material('Gallery reading table walnut',(.08,.045,.025));paper=material('Gallery catalogue paper',(.65,.60,.48));cover=material('Gallery catalogue olive',(.08,.11,.07))
def box(n,p,d,m,b=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name='Gallery_Addition_'+n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);mod=o.modifiers.new('Soft edges','BEVEL');mod.width=b;mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');names.add(o.name)
# Right wall, between the single painting and the stair approach.
box('SculpturePlinth',(7.7,.5,-3.1),(1.4,1.4,1.5),stone)
box('SculptureReveal',(7.7,.5,-2.33),(1.42,1.42,.05),bronze)
# An open, tapering ribbon sculpture.
verts=[];faces=[]
for i in range(97):
 t=i/96;angle=t*math.pi*2.1
 for side in [-1,1]:
  r=.43+side*.12
  verts.append((7.7+r*math.cos(angle),.5+r*math.sin(angle),-2.28+t*2.2))
for i in range(96):faces.append((i*2,i*2+1,i*2+3,i*2+2))
mesh=bpy.data.meshes.new('Bronze ribbon');mesh.from_pydata(verts,[],faces);mesh.materials.append(bronze);o=bpy.data.objects.new('Gallery_Addition_RibbonSculpture',mesh);s.collection.objects.link(o);names.add(o.name)
mod=o.modifiers.new('Cast thickness','SOLIDIFY');mod.thickness=.045
mod=o.modifiers.new('Rounded edges','BEVEL');mod.width=.025;mod.segments=3
for poly in mesh.polygons:poly.use_smooth=True
box('ReadingTable',(-5.65,3.5,-2.9),(.85,.85,.12),wood)
box('ReadingTableBase',(-5.65,3.5,-3.4),(.5,.5,.9),wood)
box('CatalogueCover',(-5.65,3.5,-2.82),(.58,.65,.025),cover,.008)
box('CataloguePages',(-5.65,3.5,-2.78),(.55,.62,.055),paper,.005)
box('CatalogueTop',(-5.65,3.5,-2.74),(.58,.65,.025),cover,.008)
s['gallery_export_names']=json.dumps(sorted(names));bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room1.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in names:
 o=bpy.data.objects.get(name)
 if o:o.hide_set(False);o.select_set(True)
out=R/'public/models/room1-details.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
out.replace(R/'public/models/room1.glb');print('GALLERY_DETAILS_EXPORTED')
