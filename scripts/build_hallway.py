import bpy,math,json,random
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(str(R/'assets/blender/room2.blend')) as (a,b):b.materials=['Ivory plaster patina','Atelier painted mouldings','Atelier aged brass','FloorMaterial']
plaster,trim,brass,oak=b.materials
def mat(n,c,metal=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.45;p.inputs['Metallic'].default_value=metal;return m
stone=mat('Vestibule honed dark limestone',(.065,.075,.063));white=mat('Sculpture ivory stone',(.68,.64,.54));glass=mat('Sidelight daylight',(.48,.60,.65));p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.48,.60,.65,1);p.inputs['Emission Strength'].default_value=.65
fabric=mat('Olive runner',(.12,.14,.095))
# Image-based materials survive glTF export; procedural nodes alone do not.
def surface(material, base, variation, weave=False):
 material=material.copy(); material.name='Hall textured '+material.name
 image=bpy.data.images.new(material.name+' surface',width=256,height=256)
 rng=random.Random(42); pixels=[]
 for y in range(256):
  for x in range(256):
   grain=rng.uniform(-1,1)*.35 + math.sin(x*.09)*math.sin(y*.065)*.35
   if weave: grain += (.3 if x%4<2 else -.3)+(.2 if y%4<2 else -.2)
   pixels.extend([max(0,min(1,c+grain*variation)) for c in base]+[1])
 image.pixels.foreach_set(pixels);image.pack()
 nodes=material.node_tree.nodes; shader=nodes.get('Principled BSDF')
 tex=nodes.new('ShaderNodeTexImage');tex.image=image
 material.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
 shader.inputs['Roughness'].default_value=.83
 return material
plaster=surface(plaster,(.64,.60,.51),.055)
stone=surface(stone,(.065,.075,.063),.025)
fabric=surface(fabric,(.12,.14,.095),.035,True)
# Diffuse daylight glass, avoiding the luminous white panel effect.
p=glass.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.42,.51,.49,1)
p.inputs['Emission Color'].default_value=(.55,.64,.66,1)
p.inputs['Emission Strength'].default_value=.12
p.inputs['Roughness'].default_value=.38

def box(n,pos,dims,m,b=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=n;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:mod=o.modifiers.new('Soft edges','BEVEL');mod.width=b;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
box('Hall_Floor',(0,-17,-3.94),(10.4,14.4,.2),oak)
box('Hall_Ceiling',(0,-17,3.5),(10.4,14.4,.2),plaster)
box('Hall_LeftWall',(-5,-17,-.2),(.25,14.4,7.3),plaster)
box('Hall_BackWall',(0,-24,-.2),(10.4,.25,7.3),plaster)
for y,l in [(-22,4),(-12.5,5)]:box('Hall_WindowWall',(5,y,-.2),(.25,l,7.3),plaster)
box('Hall_WindowSillWall',(5,-17.5,-2.37),(.25,5,2.94),plaster)
box('Hall_WindowHeader',(5,-17.5,3.0),(.25,5,1.0),plaster)
box('Hall_Window',(5.08,-17.5,.8),(.04,5,3.4),glass)
# Recessed painted timber frame, substantial sill and matching architrave.
for y in [-20,-15]:
 box('Hall_WindowJamb',(4.91,y,.8),(.34,.18,3.58),trim)
 box('Hall_WindowCasing',(4.73,y,.8),(.12,.24,3.8),trim)
for z in [-.9,2.5]:box('Hall_WindowFrame',(4.91,-17.5,z),(.34,5.18,.18),trim)
box('Hall_WindowSill',(4.64,-17.5,-1.02),(.76,5.48,.18),trim,.035)
box('Hall_WindowApron',(4.77,-17.5,-1.20),(.12,5.25,.2),trim)
box('Hall_WindowLintel',(4.73,-17.5,2.63),(.14,5.48,.18),trim)
for y in [-18.75,-17.5,-16.25]:box('Hall_WindowMullion',(4.91,y,.8),(.16,.065,3.3),trim)
box('Hall_WindowRail',(4.91,-17.5,.8),(.16,5,.065),trim)
# Gallery front wall closes the old cutaway; the central aperture is genuinely open.
for x in [-6.35,6.35]:box('Hall_GalleryPortalWing',(x,-10,0),(7.3,.32,8),plaster)
verts=[];faces=[]
for depth in [-10.16,-9.84]:
 for i in range(65):
  a=i*math.pi/64;x=2.7*math.cos(a);z=.65+2.7*math.sin(a);verts.extend([(x,depth,z),(x,depth,4)])
for i in range(64):
 a=i*2;faces.extend([(a,a+2,a+3,a+1),(a+130,a+131,a+133,a+132),(a,a+130,a+132,a+2)])
mesh=bpy.data.meshes.new('Portal arch mesh');mesh.from_pydata(verts,[],faces);mesh.materials.append(plaster);o=bpy.data.objects.new('Hall_PortalArch',mesh);bpy.context.collection.objects.link(o)
# Continuous paired moulding, with straight jambs meeting the arch spring.
for depth in [-10.22,-9.78]:
 curve=bpy.data.curves.new('Portal moulding','CURVE');curve.dimensions='3D';curve.bevel_depth=.10;curve.bevel_resolution=3
 pts=[(-2.8,depth,-3.84),(-2.8,depth,.65)]+[(2.8*math.cos(math.pi-i*math.pi/64),depth,.65+2.8*math.sin(math.pi-i*math.pi/64)) for i in range(1,65)]+[(2.8,depth,-3.84)]
 sp=curve.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new('Hall_ArchMoulding',curve);bpy.context.collection.objects.link(o);o.data.materials.append(trim)
for x in [-4.83,4.83]:
 for z,h in [(-3.57,.5),(3.17,.22),(2.93,.08)]:box('Hall_ContinuousTrim',(x,-17,z),(.13,13.65,h),trim)
for y in [-21.7,-17.5,-13.3]:
 for yy in [y-1.6,y+1.6]:box('Hall_PanelVertical',(-4.76,yy,-.3),(.09,.06,5.5),trim)
 for z in [-3.05,2.45]:box('Hall_PanelHorizontal',(-4.76,y,z),(.09,3.25,.06),trim)
for x in [-3.6,3.6]:
 box('Hall_SculpturePlinth',(x,-12.9,-2.95),(1.15,1.15,1.78),stone,.045)
 box('Hall_PlinthGoldReveal',(x,-12.9,-2.05),(1.19,1.19,.055),brass)
 bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=12,location=(x,-12.9,-1.02),major_radius=.7,minor_radius=.16,rotation=(math.pi/2,.35 if x<0 else -.35,0));o=bpy.context.object;o.name='Hall_AbstractSculpture';o.scale=(.8,1.15,1);o.data.materials.append(white if x<0 else brass)
 for p in o.data.polygons:p.use_smooth=True
for y in [-21.7,-17.5]:
 box('Hall_SconceBackplate',(-4.72,y,.3),(.12,.4,.95),brass)
 box('Hall_SconceDiffuser',(-4.48,y,.3),(.28,.25,.65),white,.07)
box('Hall_Runner',(0,-18,-3.825),(3.2,9,.015),fabric,.01)
for x in [-1.51,1.51]:box('Hall_RunnerBorder',(x,-18,-3.812),(.035,8.8,.005),brass,0)
# Project UVs consistently on architectural surfaces.
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  uv=o.data.uv_layers.active or o.data.uv_layers.new()
  for p in o.data.polygons:
   ax=max(range(3),key=lambda a:abs(p.normal[a]));axes=[a for a in range(3) if a!=ax]
   for li in p.loop_indices:
    v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]]/4,v[axes[1]]/4)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/hallway.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.convert(target='MESH')
bpy.ops.export_scene.gltf(filepath=str(R/'public/models/hallway.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
print('HALLWAY_EXPORTED')
