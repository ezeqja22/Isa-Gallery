import bpy, ast, math
from pathlib import Path
R=Path(__file__).resolve().parents[1];s=bpy.context.scene
c=bpy.data.collections.new('Atelier_Final_Details');s.collection.children.link(c)
for n in ast.parse((R/'scripts/atelier_details.py').read_text()).body:
 if isinstance(n,ast.FunctionDef):exec(compile(ast.Module(body=[n],type_ignores=[]),'helpers','exec'))
wood=bpy.data.materials['Atelier dark walnut'];paper=bpy.data.materials['Atelier study paper'];ink=bpy.data.materials['Study | charcoal'];gold=bpy.data.materials['Atelier aged brass']
# Replace the coarse gesture placeholder with an unfinished still-life vessel study.
for o in list(s.objects):
 if o.name.startswith(('Charcoal gesture','Charcoal head')):bpy.data.objects.remove(o,do_unlink=True)
x,y,z=5.8,-6.209,-1.82
for side in (-1,1):
 line('Vessel study contour',[(x+side*w,y,z+h) for w,h in [(.16,.60),(.14,.4),(.29,.20),(.35,-.05),(.28,-.32),(.13,-.48),(.16,-.57)]],.006,ink)
for zz,ww in ((.60,.16),(-.57,.16)):
 line('Vessel study ellipse',[(x+ww*math.cos(a),y,z+zz+.035*math.sin(a)) for a in [i*2*math.pi/40 for i in range(41)]],.005,ink)
for i in range(9):
 h=-.35+i*.055
 line('Study light crosshatching',[(x+.14,y,z+h),(x+.25,y,z+h+.08)],.003,ink)
# Empty stretcher on the preparation wall, and a folded apron beside the bench.
for xx in (-4.9,-3.7):cube('Spare timber stretcher side',(xx,-9.05,-2.88),(.06,.08,2.1),wood)
for zz in (-3.90,-1.86):cube('Spare timber stretcher rail',(-4.3,-9.05,zz),(1.25,.08,.06),wood)
cube('Workbench drawer apron cloth',(-2.2,-7.12,-2.85),(.56,.025,.67),bpy.data.materials['Studio | stained linen cloth'],.015)
line('Apron hanging loop',[(-2.42,-7.10,-2.56),(-2.2,-7.10,-2.40),(-1.98,-7.10,-2.56)],.012,paper)
# Web-compatible image wood replaces the preview-only procedural shader.
m=wood;nodes=m.node_tree.nodes;p=nodes.get('Principled BSDF')
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/'assets/textures/oak wood planks/oak_wood_planks_diff_4k.jpg'),check_existing=True)
m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
tex.image.pack()
s['atelier_notes']='Final atelier pass approved for export. Review lights and cameras excluded; architectural details and exterior included.'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/blender/room2-atelier-preview.blend'))
s.render.filepath=str(R/'assets/blender/room2-atelier-preview.png');s.cycles.samples=32
bpy.ops.render.render(write_still=True)
