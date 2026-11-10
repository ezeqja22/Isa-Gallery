"""Second atelier pass, applied to the saved review, never the runtime GLB."""
import bpy, math, random, shutil
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];s=bpy.context.scene;random.seed(23)
preview=R/'assets/blender/room2-atelier-preview.blend'
backup=R/'assets/blender/room2-atelier-architecture-backup.blend'
if not backup.exists():shutil.copy2(preview,backup)
old=bpy.data.collections.get('Atelier_Details')
if old:
 for o in list(old.objects):bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(old)
c=bpy.data.collections.new('Atelier_Details');s.collection.children.link(c)
def mat(n,col,rough=.65):
 m=bpy.data.materials.new(n);m.diffuse_color=(*col,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough
 return m
wood=bpy.data.materials['Atelier dark walnut'];gold=bpy.data.materials['Atelier aged brass'];ivory=bpy.data.materials['Atelier painted mouldings']
plaster=mat('Study cast | warm chalk',(.68,.64,.55),.88)
fabric=mat('Chair | faded olive velvet',(.24,.26,.14),.9)
linen=mat('Studio | stained linen cloth',(.53,.47,.36),.95)
charcoal=mat('Study | charcoal',(.075,.065,.05))
paper=bpy.data.materials['Atelier study paper']
def own(o,n,ma):
 for cc in list(o.users_collection):cc.objects.unlink(o)
 c.objects.link(o);o.name=n
 if ma:o.data.materials.append(ma)
 return o
def cube(n,p,d,ma,b=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=own(bpy.context.object,n,ma);o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if b:
  mod=o.modifiers.new('Soft edge','BEVEL');mod.width=b;mod.segments=3
 return o
def ellipsoid(n,p,scale,ma):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=p);o=own(bpy.context.object,n,ma);o.scale=scale
 for f in o.data.polygons:f.use_smooth=True
 return o
def line(n,pts,r,ma):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3
 sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(n,cu);c.objects.link(o);o.data.materials.append(ma);return o
def lathe(n,x,y,z,profile,ma):
 vertices=[];faces=[];steps=32
 for h,r in profile:
  vertices.extend((x+r*math.cos(i*2*math.pi/steps),y+r*math.sin(i*2*math.pi/steps),z+h) for i in range(steps))
 for j in range(len(profile)-1):
  for i in range(steps):a=j*steps+i;b=j*steps+(i+1)%steps;faces.append((a,b,b+steps,a+steps))
 faces.extend([tuple(reversed(range(steps))),tuple((len(profile)-1)*steps+i for i in range(steps))])
 me=bpy.data.meshes.new(n);me.from_pydata(vertices,[],faces);o=bpy.data.objects.new(n,me);c.objects.link(o);o.data.materials.append(ma)
 for f in me.polygons:f.use_smooth=True
 return o
# Traditional chair, visible between the easel and worktable.
cx,cy=4.9,-2.8
for dx in (-.48,.48):
 for dy in (-.43,.43):lathe('Chair turned leg',cx+dx,cy+dy,-4.03,[(0,.055),(.12,.09),(.22,.06),(.62,.065),(.75,.11),(.9,.09)],wood)
cube('Chair carved seat rail',(cx,cy,-3.1),(1.18,1.10,.18),wood,.07)
ellipsoid('Chair olive cushion',(cx,cy,-2.98),(.60,.54,.14),fabric)
for dx in (-.48,.48):line('Chair back upright',[(cx+dx,cy-.43,-3.1),(cx+dx,cy-.53,-2),(cx+dx*.75,cy-.55,-1.55)],.055,wood)
ellipsoid('Chair oval back frame',(cx,cy-.54,-1.95),(.51,.09,.62),wood)
ellipsoid('Chair oval upholstery',(cx,cy-.43,-1.95),(.42,.055,.51),fabric)
for angle in range(0,360,20):
 a=math.radians(angle);ellipsoid('Chair brass tack',(cx+.44*math.cos(a),cy-.365,-1.95+.53*math.sin(a)),(.018,.015,.018),gold)
# Secondary easel and unfinished charcoal study on the far side of the window wall.
ex,ey=5.8,-6.1
for dx in (-.65,.65):line('Drawing easel leg',[(ex+dx,ey,-4.02),(ex+dx*.45,ey-.35,-.5)],.055,wood)
line('Drawing easel rear leg',[(ex,ey-1.0,-4.02),(ex,ey-.35,-.6)],.055,wood)
cube('Drawing board',(ex,ey-.2,-1.82),(1.55,.12,2.05),wood)
cube('Unfinished study paper',(ex,ey-.125,-1.82),(1.36,.015,1.85),paper,.002)
cube('Drawing easel ledge',(ex,ey,-2.91),(1.85,.38,.11),wood)
# Loose gesture study, deliberately unfinished rather than a framed painting.
for offset in (-.018,.018):
 pts=[(ex+offset-.08,ey-.109,-1.11),(ex+offset+.12,ey-.109,-1.35),(ex+offset-.16,ey-.109,-1.70),(ex+offset+.17,ey-.109,-2.08),(ex+offset+.05,ey-.109,-2.58)]
 line('Charcoal gesture study',pts,.009,charcoal)
line('Charcoal head study',[(ex+.04+.17*math.cos(a),ey-.107,-1.15+.22*math.sin(a)) for a in [i*2*math.pi/40 for i in range(41)]],.009,charcoal)
# Classical plaster vessel used as a still-life study, on a panelled pedestal.
px,py=6.8,-3.35
cube('Study pedestal base',(px,py,-3.92),(1.35,1.2,.22),ivory)
cube('Study pedestal shaft',(px,py,-2.92),(.94,.85,1.8),ivory)
cube('Study pedestal capital',(px,py,-1.97),(1.35,1.2,.20),ivory)
lathe('Plaster amphora study',px,py,-1.86,[(0,.27),(.10,.32),(.18,.21),(.34,.25),(.55,.43),(.90,.47),(1.16,.35),(1.30,.20),(1.55,.18),(1.62,.27),(1.7,.28)],plaster)
for side in (-1,1):line('Amphora handle',[(px+side*(.2+.38*math.sin(a)),py,-.45-.65*(a/math.pi)) for a in [i*math.pi/32 for i in range(33)]],.055,plaster)
# Timber canvas rack and rolled papers along the work wall.
rx,ry=-8.5,-8.3
for z in (-3.9,-2.75):cube('Canvas rack rail',(rx,ry,z),(2.1,1.1,.10),wood)
for x in (-9.5,-7.5):
 for y in (-8.8,-7.8):cube('Canvas rack post',(x,y,-3.30),(.10,.10,1.45),wood)
for i in range(5):
 x=rx-.72+i*.35
 cube('Stored blank canvas',(x,ry,-2.8),(.10,.82,2.25-i*.15),paper)
# Draped cloth on preparation table, generated with an overhanging edge.
verts=[];faces=[];nx,ny=26,28
for j in range(ny):
 t=j/(ny-1);y=-8.1+t*1.65
 for i in range(nx):
  u=i/(nx-1);x=.65+u*1.25
  z=-2.075 if y<=-7.05 else -2.075-(y+7.05)*1.9
  z+=.025*math.sin(u*math.pi*10)*(.3+t)
  verts.append((x,y,z))
for j in range(ny-1):
 for i in range(nx-1):a=j*nx+i;faces.append((a,a+1,a+1+nx,a+nx))
me=bpy.data.meshes.new('Draped cloth');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Worktable draped linen',me);c.objects.link(o);o.data.materials.append(linen)
solid=o.modifiers.new('Cloth thickness','SOLIDIFY');solid.thickness=.008
for f in me.polygons:f.use_smooth=True
# Richer wood grain on the new furniture, with subtle surface variation.
nodes=wood.node_tree.nodes;links=wood.node_tree.links;p=nodes.get('Principled BSDF')
tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=4;tex.inputs['Detail'].default_value=2
coord=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(3,3,.25)
links.new(coord.outputs['Generated'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs['Vector'])
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.045,.018,.007,1);ramp.color_ramp.elements[1].color=(.20,.095,.035,1)
links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],p.inputs['Base Color'])
# A ceiling rose anchors the existing chandelier.
for radius,depth in ((.75,.045),(.61,.06),(.43,.05)):
 line('Ceiling rose moulding',[(-1.82+radius*math.cos(a),radius*math.sin(a),3.98) for a in [i*2*math.pi/96 for i in range(97)]],depth,ivory)
# Review daylight: stronger directional shadows, lower ambient wash.
s.world.node_tree.nodes.get('Background').inputs[1].default_value=.20
sun=bpy.data.objects.get('Atelier_Review_Sun_DoNotExport');sun.data.energy=2.8
sun.rotation_euler=Vector((-1,.20,-.48)).to_track_quat('-Z','Y').to_euler()
s.cycles.samples=48;s.render.resolution_x=1400;s.render.resolution_y=934
s.render.filepath=str(R/'assets/blender/room2-atelier-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(preview))
bpy.ops.render.render(write_still=True)
