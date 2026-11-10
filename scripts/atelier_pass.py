import bpy, math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
s=bpy.context.scene
c=bpy.data.collections.new('Atelier_Architecture');s.collection.children.link(c)
def material(name,color,rough=.65):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 return m
ivory=material('Atelier warm ivory plaster',(.61,.55,.44))
trim=material('Atelier painted mouldings',(.73,.66,.53))
gold=material('Atelier aged brass',(.30,.20,.085),.38)
wood=material('Atelier dark walnut',(.105,.052,.025))
paper=material('Atelier study paper',(.75,.70,.58))
def link(o):
 for cc in list(o.users_collection):cc.objects.unlink(o)
 c.objects.link(o);return o
def box(name,loc,dims,mat,bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=link(bpy.context.object);o.name=name;o.dimensions=dims
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if mat:o.data.materials.append(mat)
 if bevel:
  b=o.modifiers.new('Moulded edge','BEVEL');b.width=bevel;b.segments=3
 return o
def line(name,pts,r,mat):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3
 sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,cu);c.objects.link(o);o.data.materials.append(mat);return o
def remove(o):bpy.data.objects.remove(o,do_unlink=True)
for o in list(s.objects):
 if o.name.startswith(('Room2_Window','Studio_Reference','Studio_ColourStudy')):remove(o)
 elif o.name.startswith('Studio_Leaning_Work'):remove(o)
 elif o.name.startswith('Studio_Workbench_Leg'):
  o.data.materials.clear();o.data.materials.append(wood)
# Reduce the original floor's pronounced relief and glossy highlights.
for m in bpy.data.objects['Room2_Floor'].data.materials:
 if m and m.use_nodes:
  for n in m.node_tree.nodes:
   if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.25
   if n.type=='BSDF_PRINCIPLED':
    for l in list(n.inputs['Roughness'].links):m.node_tree.links.remove(l)
    n.inputs['Roughness'].default_value=.65
for name in ('Room2_Ceiling','Room2_SideWall_A','Room2_SideWall_B','Room2_EntryWall'):
 o=bpy.data.objects[name];o.data.materials.clear();o.data.materials.append(ivory)
for o in list(s.objects):
 if o.name.startswith(('Studio_Workbench_Top','Studio_Workbench_LowerShelf','Studio_EaselSideTable','Studio_Stool_Seat')):
  o.data.materials.clear();o.data.materials.append(wood)
# New wall, with three genuine arched openings.
wall=box('Room2_WindowWall',(8.505,0,-.07),(.30,18.7,8),ivory,0)
def subtract(cutter):
 bpy.context.view_layer.objects.active=wall
 mod=wall.modifiers.new('Arched window opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
 bpy.ops.object.modifier_apply(modifier=mod.name);remove(cutter)
for y in (-6,0,6):
 subtract(box('Opening',(8.5,y,-1.2),(1.2,4,4.4),None,0))
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=2,depth=1.2,location=(8.5,y,1),rotation=(0,math.pi/2,0));subtract(bpy.context.object)
 for radius,depth,ma in ((2.15,.105,trim),(2.30,.045,gold)):
  pts=[(8.22,y-radius,-3.5),(8.22,y-radius,1)]
  pts += [(8.22,y+radius*math.cos(a),1+radius*math.sin(a)) for a in [math.pi-i*math.pi/48 for i in range(49)]]
  pts += [(8.22,y+radius,-3.5)]
  line('Atelier_Window_Arch',pts,depth,ma)
 box('Atelier_Window_Sill',(8.14,y,-3.48),(.65,4.65,.16),trim)
 # Window frames and subdivisions, left open to the outside sky.
 box('Atelier_Window_Centre',(8.35,y,-1.15),(.12,.09,4.5),trim)
 for z in (-2.05,-.50,1):box('Atelier_Window_Crossbar',(8.35,y,z),(.12,4,.09),trim)
 for a in (math.pi/4,math.pi/2,3*math.pi/4):line('Atelier_Window_Fan',[(8.35,y,1),(8.35,y+2*math.cos(a),1+2*math.sin(a))],.045,trim)
# Cornices, skirting and panel rails on the long walls.
for y in (-9.27,9.27):
 for z,depth,height in ((-3.88,.17,.28),(-2.2,.10,.09),(3.72,.22,.20),(3.92,.32,.12)):
  box('Atelier_Horizontal_Moulding',(-1.8,y,z),(20.1,depth,height),trim)
 for x in (-10,-6,-2,2,6):
  for dx in (-1.6,1.6):box('Atelier_Panel_Vertical',(x+dx,y,-.1),(.065,.085,3.65),trim)
  for z in (-1.93,1.73):box('Atelier_Panel_Horizontal',(x,y,z),(3.25,.085,.065),trim)
  for dx in (-1.6,1.6):box('Atelier_LowerPanel_Vertical',(x+dx,y,-3.02),(.055,.09,1.15),trim)
  for z in (-3.60,-2.44):box('Atelier_LowerPanel_Horizontal',(x,y,z),(3.25,.09,.055),trim)
for y in (-9,-3,3,9):
 box('Atelier_Window_Pilaster',(8.20,y,-.1),(.15,.25,7.5),trim)
 box('Atelier_Pilaster_Capital',(8.12,y,3.56),(.30,.55,.22),trim)
for z in (3.75,-3.9):box('Atelier_WindowWall_Cornice',(8.18,0,z),(.27,18.6,.22),trim)
# Drawers give the preparation table a more traditional silhouette.
for x in (-2.4,-.5,1.4):
 box('Atelier_Worktable_Drawer',(x,-7.9,-2.49),(1.75,1.4,.42),wood)
 box('Atelier_Drawer_Handle',(x,-7.16,-2.47),(.30,.09,.055),gold)
# Replace leaning finished pictures with raw canvas faces.
for o in s.objects:
 if o.name.startswith('Studio_Canvas_Linen'):
  o.data.materials.clear();o.data.materials.append(paper)
# Loose papers near the worktable; no finished artwork hung on the walls.
for i in range(5):
 o=box('Atelier_LooseStudyPaper',(-2+i*.65,-6.1+(i%2)*.35,-4.015),(.55,.78,.008),paper,.001);o.rotation_euler.z=.25*i
# Keep the existing easel, with a clearly provisional artwork image.
easel=bpy.data.objects['Room2_Easel_WithCanvas']
easel.location.y=1.7
easel['canvas_content']='Temporary placeholder; replace with artist work in progress.'
# Daylight and review lighting; never included in GLB exports.
for o in s.objects:
 if o.type=='LIGHT':o.data.energy*=.40
bpy.ops.object.light_add(type='SUN',location=(7,0,3));sun=link(bpy.context.object);sun.name='Atelier_Review_Sun_DoNotExport'
sun.rotation_euler=Vector((-1,-.45,-.65)).to_track_quat('-Z','Y').to_euler();sun.data.energy=2;sun.data.angle=.08
review=bpy.data.collections.get('Studio_Review_DoNotExport')
c.objects.unlink(sun);review.objects.link(sun)
s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.62,.72,.9,1)
s.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
s.camera=bpy.data.objects['Studio_Review_Entrance'];s.camera.data.lens=22
s.cycles.samples=32;s.render.resolution_x=1200;s.render.resolution_y=800
s.render.filepath=str(R/'assets/blender/room2-atelier-preview.png')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
s['atelier_notes']='Classical atelier architectural review. No finished art display. No GLB export performed.'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room2-atelier-preview.blend'))
bpy.ops.render.render(write_still=True)
