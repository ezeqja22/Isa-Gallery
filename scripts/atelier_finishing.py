"""Window, ornament and working-surface detail pass; review asset only."""
import bpy, math, random, ast, shutil
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];s=bpy.context.scene;random.seed(72)
preview=R/'assets/blender/room2-atelier-preview.blend'
backup=R/'assets/blender/room2-atelier-furnished-backup.blend'
if not backup.exists():shutil.copy2(preview,backup)
c=bpy.data.collections.new('Atelier_Finishing');s.collection.children.link(c)
# Reuse only geometry helpers, without replaying prior scene changes.
tree=ast.parse((R/'scripts/atelier_details.py').read_text())
for node in tree.body:
 if isinstance(node,ast.FunctionDef):exec(compile(ast.Module(body=[node],type_ignores=[]),'helpers','exec'))
wood=bpy.data.materials['Atelier dark walnut'];gold=bpy.data.materials['Atelier aged brass'];ivory=bpy.data.materials['Atelier painted mouldings']
paper=bpy.data.materials['Atelier study paper']
stone=mat('Exterior limestone',(.45,.43,.36),.9)
bark=mat('Garden bark',(.12,.10,.065),1)
greens=[mat('Garden foliage '+str(i),col,.95) for i,col in enumerate([(.13,.18,.07),(.21,.27,.11),(.29,.32,.14),(.11,.15,.08)])]
metal=mat('Balcony aged iron',(.075,.085,.068),.42)
# More substantial window joinery, with brass handles and fanlight inner arches.
for y in (-6,0,6):
 for yy in (y-1.92,y+1.92):cube('Window inset jamb',(8.31,yy,-1.15),(.14,.11,4.45),ivory)
 for z in (-3.36,1.02):cube('Window sash rail',(8.27,y,z),(.15,3.95,.12),ivory)
 for yy in (y-.12,y+.12):
  cube('Window brass latch plate',(8.20,yy,-1.4),(.035,.055,.24),gold,.012)
  line('Window brass handle',[(8.17,yy,-1.48),(8.04,yy,-1.44),(8.04,yy,-1.28)],.022,gold)
 line('Fanlight inner arch',[(8.28,y+.64*math.cos(a),1+.64*math.sin(a)) for a in [i*math.pi/48 for i in range(49)]],.04,ivory)
 # Small plaster keystone and leaf ornament above each arch.
 cube('Window arch keystone',(8.08,y,3.12),(.18,.31,.40),ivory,.06)
 for side in (-1,1):
  for i in range(5):
   yy=y+side*(.25+i*.14);zz=3.22-.04*i
   leaf=ellipsoid('Arch acanthus leaf',(8.06,yy,zz),(.05,.16,.055),gold)
   leaf.rotation_euler.x=side*(.25+i*.12)
# Delicate upper-wall ornament; keep panels empty of finished artworks.
for x in (-6,-2,2,6):
 y=-9.20
 for sign in (-1,1):
  pts=[]
  for i in range(50):
   t=i/49;angle=t*math.pi*2;radius=.22*(1-t)
   pts.append((x+sign*(.14+.5*t+radius*math.cos(angle)),y,2.04+radius*math.sin(angle)))
  line('Panel scroll ornament',pts,.016,gold)
 ellipsoid('Panel central rosette',(x,y,2.06),(.09,.025,.11),ivory)
# A terrace and distant garden make the windows read as real openings.
cube('Exterior terrace',(10.1,0,-3.76),(3.1,20,.22),stone)
for z in (-3.35,-2.1):line('Balcony horizontal rail',[(11.55,-10,z),(11.55,10,z)],.045,metal)
for i in range(42):
 y=-9.8+i*.48
 line('Balcony upright',[(11.55,y,-3.65),(11.55,y,-2.1)],.023,metal)
 if i%2==0:
  line('Balcony curved ironwork',[(11.55,y+.14*math.sin(t*math.pi*2),-3.3+t*.95) for t in [j/30 for j in range(31)]],.014,metal)
garden=bpy.data.collections.new('Atelier_Exterior');s.collection.children.link(garden)
for k in range(7):
 x=17+random.uniform(-1,5);y=-14+k*4.6;z=-6
 line('Garden tree trunk',[(x,y,z),(x-.25,y+.15,z+4),(x+.15,y,z+7)],.14,bark)
 for branch in range(5):
  a=branch*2.4;end=(x+math.cos(a)*2,y+math.sin(a)*2,z+5+branch*.48)
  line('Garden branch',[(x,y,z+3.7),end],.065,bark)
  for j in range(12):
   p=(end[0]+random.uniform(-1.3,1.3),end[1]+random.uniform(-1.3,1.3),end[2]+random.uniform(-.8,1.2))
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=p)
   o=own(bpy.context.object,'Garden foliage cluster',random.choice(greens));o.scale=(random.uniform(.55,1.1),random.uniform(.5,1),random.uniform(.45,.9))
   for f in o.data.polygons:f.use_smooth=True
for o in list(c.objects):
 if o.name.startswith('Garden') or o.name.startswith('Exterior') or o.name.startswith('Balcony'):
  c.objects.unlink(o);garden.objects.link(o)
# Replace the empty grey world with the project's existing sky environment.
world=s.world.node_tree;bg=world.nodes.get('Background')
env=world.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(R/'public/environment/drackenstein_quarry_puresky_4k.exr'),check_existing=True)
env.image.pack();world.links.new(env.outputs['Color'],bg.inputs['Color']);bg.inputs['Strength'].default_value=.30
# Local evidence of painting, kept close to the actual working area.
pigments=[mat('Working paint '+str(i),col,.55) for i,col in enumerate([(.20,.25,.30),(.35,.20,.10),(.39,.36,.19),(.64,.59,.46)])]
for i in range(28):
 x=4.3+random.uniform(-1.3,1.3);y=1.6+random.uniform(-1.4,1.4)
 ellipsoid('Old paint fleck',(x,y,-4.024),(random.uniform(.015,.055),random.uniform(.02,.07),.002),random.choice(pigments))
for i in range(8):
 ellipsoid('Workbench pigment mark',(-2.3+random.random()*2,-7.9+random.uniform(-.5,.5),-2.083),(.035,.022,.002),random.choice(pigments))
# A few useful supplies: rolled paper in a timber holder and stacked study books.
cube('Paper roll holder',(-3.8,-8.1,-3.65),(.7,.65,.65),wood)
for i in range(5):
 lathe('Rolled drawing paper',-4+random.random()*.4,-8.3+random.random()*.4,-3.65,[(0,.065),(1.1+i*.08,.065)],paper)
for i in range(3):
 cube('Study book pages',(-2.65,-7.9,-2.02+i*.11),(.7,.51,.09),paper,.008)
 cube('Study book cover',(-2.65,-7.9,-1.97+i*.11),(.73,.54,.018),random.choice(pigments),.007)
s.cycles.samples=64;s.render.resolution_x=1400;s.render.resolution_y=934
s.render.filepath=str(R/'assets/blender/room2-atelier-preview.png')
s['atelier_notes']='Detailed classical atelier review. Exterior garden included as separate collection. No runtime export performed.'
bpy.ops.wm.save_as_mainfile(filepath=str(preview))
bpy.ops.render.render(write_still=True)
