"""Complete the atelier visual pass before optimization. Run against room2.blend."""
import bpy, ast, math, random, shutil, numpy as np
from pathlib import Path
from datetime import datetime
from mathutils import Vector
R=Path(__file__).resolve().parents[1];s=bpy.context.scene;random.seed(149)
backup=R/'assets/backups'/('atelier-visual-'+datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True)
shutil.copy2(R/'assets/blender/room2.blend',backup/'room2.blend')
c=bpy.data.collections.new('Atelier_Visual_Finish');s.collection.children.link(c)
for n in ast.parse((R/'scripts/atelier_details.py').read_text()).body:
 if isinstance(n,ast.FunctionDef):exec(compile(ast.Module(body=[n],type_ignores=[]),'helpers','exec'))
wood=bpy.data.materials['Atelier dark walnut'];trim=bpy.data.materials['Atelier painted mouldings'];gold=bpy.data.materials['Atelier aged brass'];paper=bpy.data.materials['Atelier study paper']
texture_dir=R/'assets/textures/atelier';texture_dir.mkdir(exist_ok=True)
def texture_material(name,base,kind):
 m=mat(name,base,.83 if kind!='wood' else .56)
 n=512;yy,xx=np.mgrid[0:n,0:n];rng=np.random.default_rng(17)
 noise=rng.normal(0,1,(n,n));broad=np.sin(xx*.018)*np.sin(yy*.027)+np.cos(xx*.035+yy*.013)*.4
 if kind=='linen':detail=.035*np.sin(xx*math.pi)+.028*np.sin(yy*math.pi)+noise*.012+broad*.008
 elif kind=='wood':detail=.055*np.sin(xx*.12+np.sin(yy*.014)*1.8)+noise*.009+broad*.012
 else:detail=broad*.012+noise*.008
 pixels=np.ones((n,n,4),dtype=np.float32)
 pixels[:,:,:3]=np.clip(np.array(base)[None,None,:]+detail[:,:,None],0,1)
 im=bpy.data.images.new(name+' color',width=n,height=n);im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(texture_dir/(name.replace(' ','-')+'.png'));im.file_format='PNG';im.save();im.pack()
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 return m
plaster=texture_material('Ivory plaster patina',(.66,.61,.51),'plaster')
oak=texture_material('Warm aged oak',(.28,.17,.085),'wood')
canvas=texture_material('Unprimed woven linen',(.77,.72,.61),'linen')
velvet=texture_material('Faded olive upholstery',(.25,.28,.16),'linen')
cloth=texture_material('Washed studio linen',(.62,.57,.47),'linen')
for name in ('Room2_Ceiling','Room2_SideWall_A','Room2_SideWall_B','Room2_EntryWall','Room2_WindowWall'):
 o=bpy.data.objects.get(name)
 if o:o.data.materials.clear();o.data.materials.append(plaster)
for o in list(s.objects):
 if o.type!='MESH':continue
 for i,m in enumerate(o.data.materials):
  if not m:continue
  if m==wood:o.data.materials[i]=oak
  elif m.name=='Chair | faded olive velvet':o.data.materials[i]=velvet
  elif m.name=='Studio | stained linen cloth':o.data.materials[i]=cloth
 if o.name.startswith('Studio_Canvas_Linen'):o.data.materials.clear();o.data.materials.append(canvas)
# Layered cornices, dentils and a recessed-looking ceiling border.
for y in (-9.18,9.18):
 for z,depth,height in ((3.43,.15,.07),(3.55,.23,.10),(3.72,.38,.10)):
  cube('Cornice stepped profile',(-1.8,y,z),(20.1,depth,height),trim,.035)
 for i in range(58):cube('Cornice dentil',(-11.55+i*.34,y,3.60),(.11,.22,.13),trim,.012)
for x in (-11.86,8.15):
 for z,depth,height in ((3.43,.15,.07),(3.55,.23,.10),(3.72,.38,.10)):
  cube('Cornice end profile',(x,0,z),(depth,18.4,height),trim,.035)
for y in (-8.35,8.35):cube('Ceiling inset border',(-1.8,y,3.955),(18.8,.11,.06),trim,.025)
for x in (-11.15,7.55):cube('Ceiling inset border',(x,0,3.955),(.11,16.7,.06),trim,.025)
for y in (-9,-3,3,9):
 for offset in (-.075,0,.075):line('Pilaster fluting',[(8.10,y+offset,-1.7),(8.10,y+offset,2.9)],.013,gold)
 for side in (-1,1):
  line('Capital volute',[(8.02,y+side*(.12+.12*math.cos(a)),3.34+.12*math.sin(a)) for a in np.linspace(0,math.pi*2,40)],.025,trim)
# Rebuild the focal easel with joinery, shelf, adjustment rail and metal fittings.
old=bpy.data.objects['Room2_Easel_WithCanvas'];old.name='Original_Easel_DoNotExport'
archive=bpy.data.collections.new('Original_Easel_DoNotExport');s.collection.children.link(archive)
for cc in list(old.users_collection):cc.objects.unlink(old)
archive.objects.link(old);old.hide_render=True;old.hide_set(True)
root=bpy.data.objects.new('Room2_Easel_WithCanvas',None);c.objects.link(root)
root.location=(3.9,1.5,-4.03);root.rotation_euler.z=math.radians(42)
def part(o):o.parent=root;return o
for x in (-.72,.72):
 part(cube('Easel foot',(x,0,.08),(.19,1.45,.16),oak,.045))
 part(cube('Easel side rail',(x,-.23,1.9),(.13,.16,3.5),oak,.025))
for z in (.50,1.0,3.05):part(cube('Easel mortised crossbar',(0,-.23,z),(1.58,.16,.12),oak,.02))
part(cube('Easel central mast',(0,-.25,2.3),(.18,.18,4.45),oak,.025))
part(cube('Easel canvas shelf',(0,.02,1.12),(2.30,.47,.15),oak,.035))
part(cube('Easel top clamp',(0,-.02,3.88),(.53,.29,.12),oak,.02))
part(cube('Easel canvas backing',(0,-.04,2.48),(2.04,.11,2.58),oak,.015))
part(cube('Easel unfinished canvas',(0,.025,2.48),(1.98,.03,2.52),canvas,.012))
for z in (1.3,1.5,1.7,1.9,2.1,2.3,2.5,2.7,2.9,3.1,3.3):part(cube('Easel rack tooth',(0,-.12,z),(.12,.06,.025),gold,.006))
for x,z in ((-.72,.5),(.72,.5),(-.72,3.05),(.72,3.05),(0,3.87)):
 part(ellipsoid('Easel brass bolt',(x,-.12,z),(.03,.017,.03),gold))
part(line('Easel crank',[(.14,.02,1.04),(.32,.02,1.04),(.32,.18,1.04)],.025,gold))
# Turned table legs and low stretchers replace rectangular steel-like legs.
for o in list(s.objects):
 if o.name.startswith('Studio_Workbench_Leg'):bpy.data.objects.remove(o,do_unlink=True)
for x in (-3.15,2.15):
 for y in (-8.5,-7.3):lathe('Workbench turned leg',x,y,-4.03,[(0,.085),(.12,.12),(.22,.085),(.55,.075),(.65,.12),(.85,.09),(1.35,.10),(1.5,.15),(1.74,.13)],oak)
line('Workbench front stretcher',[(-3.15,-7.3,-3.6),(2.15,-7.3,-3.6)],.055,oak)
for x in (-2.4,-.5,1.4):
 for dx in (-.78,.78):cube('Drawer inset edge',(x+dx,-7.185,-2.49),(.035,.018,.28),gold,.006)
# Chair: brass piping follows the upholstery and carved feet anchor it.
for i in range(100):
 a=i*2*math.pi/100;b=(i+1)*2*math.pi/100
 line('Chair cushion piping',[(4.9+.56*math.cos(a),-2.8+.50*math.sin(a),-2.96),(4.9+.56*math.cos(b),-2.8+.50*math.sin(b),-2.96)],.012,gold)
# Rework the hanging apron as fabric with irregular folds and stitched edge.
for o in list(s.objects):
 if o.name=='Workbench drawer apron cloth':bpy.data.objects.remove(o,do_unlink=True)
vs=[];fs=[]
for j in range(25):
 v=j/24
 for i in range(20):
  u=i/19;vs.append((-2.2+(u-.5)*(.46+.16*v),-7.10+.045*math.sin(u*math.pi*8)*v,-2.51-v*.8+.025*math.sin(u*8)))
for j in range(24):
 for i in range(19):a=j*20+i;fs.append((a,a+1,a+21,a+20))
me=bpy.data.meshes.new('Apron folds');me.from_pydata(vs,[],fs);o=bpy.data.objects.new('Workbench folded apron',me);c.objects.link(o);me.materials.append(cloth)
mod=o.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.008
for f in me.polygons:f.use_smooth=True
# Purposeful mixing station beside the easel: tray, jars, palette knife and tubes.
for x in (5.18,6.22):cube('Mixing tray rim',(x,.45,-2.48),(.035,.76,.07),oak)
for y in (.07,.83):cube('Mixing tray rim',(5.7,y,-2.48),(1.08,.035,.07),oak)
cube('Mixing tray base',(5.7,.45,-2.51),(1.08,.76,.035),oak)
ceramic=mat('Glazed ochre rinse pot',(.32,.24,.13),.32)
lathe('Rinse pot',5.98,.55,-2.48,[(0,.12),(.04,.16),(.27,.16),(.29,.17),(.30,.14),(.06,.13)],ceramic)
for i in range(3):
 line('Palette knife handle',[(5.28+i*.1,.22,-2.46),(5.28+i*.1,.53,-2.46)],.018,oak)
 cube('Palette knife blade',(5.28+i*.1,.61,-2.46),(.035,.15,.012),gold,.009)
# A folio and loose papers give the chair corner a function.
cube('Study folio cover',(4.65,-2.65,-2.80),(.55,.65,.035),oak,.012).rotation_euler.z=.23
cube('Study folio paper',(4.65,-2.65,-2.775),(.51,.61,.015),paper,.006).rotation_euler.z=.23
# Review lighting now matches the direction of the runtime studio sun.
sun=bpy.data.objects.get('Atelier_Review_Sun_DoNotExport');sun.rotation_euler=Vector((-1,.25,-.55)).to_track_quat('-Z','Y').to_euler();sun.data.energy=2.5;sun.data.angle=.065
for o in s.objects:
 if o.type=='LIGHT' and o!=sun and o.name.startswith('Review_'):o.data.energy*=.75
s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.20
# Review from the website's exact local eye position, aimed at the working area.
camera=bpy.data.objects['Studio_Review_Entrance'];camera.location=(-8.7,4,-1.9)
camera.rotation_euler=(Vector((1,-1.5,-1.9))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=23.5
s.camera=camera;s.cycles.samples=48;s.render.resolution_x=1400;s.render.resolution_y=900
s.render.filepath=str(R/'assets/blender/room2-atelier-preview.png')
s['atelier_notes']='Complete visual pass: construction detail, surface textures, working arrangement and website arrival composition. No optimization performed.'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room2-atelier-preview.blend'))
bpy.ops.render.render(write_still=True)
