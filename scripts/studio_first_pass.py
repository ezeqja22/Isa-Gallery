"""Create a review-only studio variant. Does not export or overwrite the original."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
random.seed(12)
scene = bpy.context.scene
floor = -4.03
collection = bpy.data.collections.new('Studio_FirstPass')
scene.collection.children.link(collection)

def move_collection(obj):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def mat(name, color, roughness=.65, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    return m

wood = mat('Studio | honey oak', (.30,.16,.075))
dark = mat('Studio | charcoal metal', (.045,.055,.052), .4, .65)
linen = mat('Studio | raw linen', (.65,.58,.44))
paper = mat('Studio | warm paper', (.88,.84,.72))
sage = mat('Studio | sage ceramic', (.23,.32,.26), .3)
cork = mat('Studio | cork', (.30,.21,.13))
paints = [mat('Studio | pigment '+str(i), c) for i,c in enumerate([(.13,.25,.34),(.47,.19,.095),(.63,.48,.16),(.18,.30,.22),(.74,.68,.53)])]

def box(name, loc, dims, material, bevel=.025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = move_collection(bpy.context.object); o.name = name
    o.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('Soft worn edges', 'BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    if parent: o.parent=parent
    return o

def cylinder(name, loc, radius, depth, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=loc)
    o=move_collection(bpy.context.object); o.name=name; o.data.materials.append(material)
    mod=o.modifiers.new('Rounded edge','BEVEL'); mod.width=.015; mod.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def rod(name, a, b, radius, material):
    a,b=Vector(a),Vector(b)
    o=cylinder(name,(a+b)/2,radius,(b-a).length,material)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o

def image_material(name, filename):
    m=mat(name,(1,1,1))
    tex=m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=bpy.data.images.load(str(ROOT/'public'/'paintings'/filename),check_existing=True)
    tex.image.pack()
    m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return m

studies=[image_material('Studio | existing artwork reference '+str(i), f'piktura{i}.jpeg') for i in (1,2,4)]

def picture(name, x, y, z, w, h, material, parent=None):
    # Front faces into room (+Y); UVs keep supplied artwork upright.
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([(-w/2,0,-h/2),(w/2,0,-h/2),(w/2,0,h/2),(-w/2,0,h/2)],[],[(0,3,2,1)])
    uv=mesh.uv_layers.new()
    coords=[(0,0),(1,0),(1,1),(0,1)]
    for loop in mesh.loops: uv.data[loop.index].uv=coords[loop.vertex_index]
    o=bpy.data.objects.new(name,mesh);collection.objects.link(o);o.location=(x,y,z);o.data.materials.append(material)
    if parent:o.parent=parent
    return o

# Move the existing easel into the window's daylight zone, keeping its grounded height.
easel=bpy.data.objects['Room2_Easel_WithCanvas']
easel.location.x=4.4; easel.location.y=2.8

# A preparation bench along the south wall, with clear circulation from the entrance.
tx,ty=-.5,-7.9
top=floor+1.85
box('Studio_Workbench_Top',(tx,ty,top),(6.0,1.65,.18),wood,.055)
for x in (-2.65,2.65):
    for y in (-.60,.60):box('Studio_Workbench_Leg',(tx+x,ty+y,floor+.87),(.14,.14,1.74),dark)
box('Studio_Workbench_LowerShelf',(tx,ty,floor+.45),(5.6,1.35,.10),wood)
for x in (-2.0,.2,1.9):
    box('Studio_Supply_Box',(tx+x,ty,floor+.72),(1.15,.95,.43),linen)
    box('Studio_Supply_Box_Label',(tx+x,ty+.481,floor+.73),(.45,.012,.13),paper,.005)

# Small studio objects with deliberate work zones.
for i in range(2):
    x=tx-2.1+i*.55
    cylinder('Studio_BrushPot',(x,ty+.15,top+.27),.18,.36,sage)
    cylinder('Studio_BrushPot_Opening',(x,ty+.15,top+.455),.145,.008,dark)
    for j in range(5):
        a=(x+random.uniform(-.10,.10),ty+.15+random.uniform(-.09,.09),top+.30)
        b=(a[0]+random.uniform(-.14,.14),a[1]+random.uniform(-.14,.14),top+.90+random.uniform(-.1,.12))
        rod('Studio_Brush_Handle',a,b,.018,wood)
        rod('Studio_Brush_Bristles',b,(b[0],b[1],b[2]+.12),.028,paints[j])
palette=cylinder('Studio_MixingPalette',(tx+.6,ty+.1,top+.12),.50,.045,wood);palette.scale.y=.7
for i in range(5):
    ang=i*1.05
    o=cylinder('Studio_Palette_Paint',(tx+.6+math.cos(ang)*.34,ty+.1+math.sin(ang)*.22,top+.151),.065,.012,paints[i]);o.scale.y=.65
for i in range(4):
    o=box('Studio_PaintTube',(tx+1.5+i*.23,ty+.22-random.random()*.4,top+.14),(.15,.36,.08),paper,.025)
    o.rotation_euler.z=random.uniform(-.35,.35)
    box('Studio_PaintTube_ColorBand',(o.location.x,o.location.y,top+.185),(.153,.13,.012),paints[i],.005)
for i in range(2):
    box('Studio_Sketchbook',(tx-.7,ty-.15,top+.13+i*.07),(.9,.65,.06),dark if i==0 else paper,.015)
box('Studio_FoldedLinenRag',(tx+2.2,ty-.4,top+.14),(.65,.45,.08),linen,.05).rotation_euler.z=.15

# Cork reference board above the workbench, using existing artwork as reference prints.
bx,by,bz=-.5,-9.15,-.25
box('Studio_ReferenceBoard_Frame',(bx,by,bz),(5.8,.16,2.65),wood)
box('Studio_ReferenceBoard_Cork',(bx,by+.10,bz),(5.60,.06,2.45),cork,.01)
for i in range(3):
    x=bx-1.82+i*1.82; z=bz+.28+(.10 if i==1 else 0)
    box('Studio_Reference_Paper',(x,by+.15,z),(1.53,.015,1.25),paper,.005)
    picture('Studio_Reference_Print',x,by+.163,z+.03,1.35,.98,studies[i])
    box('Studio_Reference_Tape',(x,by+.18,z+.64),(.28,.012,.10),linen,.003)
    for j in range(4):box('Studio_ColourStudy',(x-.49+j*.32,by+.16,bz-.83),(.24,.018,.20),paints[(i+j)%5],.002)

# Three leaning canvases beside the bench; one presents its timber stretcher back.
for i,(x,w,h) in enumerate([(-7.0,2.0,2.7),(-5.1,1.5,2.1),(-3.95,1.15,1.65)]):
    root=bpy.data.objects.new('Studio_LeaningCanvas_'+str(i+1),None);collection.objects.link(root)
    root.location=(x,-8.7,floor+.12);root.rotation_euler.x=math.radians(9+i*2)
    box('Studio_Canvas_Linen',(0,0,h/2),(w,.10,h),linen,.018,root)
    for xx in (-w/2,w/2):box('Studio_Canvas_Stretcher',(xx,.075,h/2),(.075,.08,h),wood,.01,root)
    for zz in (.04,h-.04):box('Studio_Canvas_Stretcher',(0,.075,zz),(w,.08,.075),wood,.01,root)
    if i!=1:picture('Studio_Leaning_Work',0,.057,h/2,w-.10,h-.10,studies[i],root)
    else:box('Studio_Canvas_CrossBrace',(0,.075,h/2),(.07,.08,h),wood,.01,root)

# Stool and compact palette table accompany the easel without blocking the window.
sx,sy=2.0,2.3
cylinder('Studio_Stool_Seat',(sx,sy,floor+1.05),.46,.13,wood)
for a in (0,2.094,4.188):
    rod('Studio_Stool_Leg',(sx+math.cos(a)*.37,sy+math.sin(a)*.37,floor+.05),(sx+math.cos(a)*.27,sy+math.sin(a)*.27,floor+1),.055,dark)
box('Studio_EaselSideTable',(5.7,.45,floor+1.4),(1.2,.85,.12),wood)
for x in (5.22,6.18):
    for y in (.14,.76):box('Studio_EaselSideTable_Leg',(x,y,floor+.67),(.07,.07,1.34),dark)

# Review cameras/lights are kept separate from exportable studio geometry.
review=bpy.data.collections.new('Studio_Review_DoNotExport');scene.collection.children.link(review)
def review_object(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    review.objects.link(o)
def aim(o, target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def camera(name,loc,target,lens):
    bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name=name;review_object(o);o.data.lens=lens;aim(o,target);return o
cam=camera('Studio_Review_Entrance',(-10.8,5.7,-.5),(1.0,-3.2,-1.3),22)
camera('Studio_Review_Workbench',(-6.5,-2.1,-.2),(-.6,-8,-1.6),28)
scene.camera=cam
for name,loc,target,power,size in [('Window daylight',(7.8,3.4,.5),(-1,0,-2),2300,5),('Soft interior fill',(-3,1,2.5),(-1,-4,-3),1700,7),('Workbench fill',(0,-5,1),(0,-8,-2),900,5)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name='Review_'+name;review_object(o);o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,target)
if not scene.world:scene.world=bpy.data.worlds.new('Studio Review World')
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.55,.65,.8,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.35
for o in bpy.data.collections['Helpers_DoNotExport'].objects:o.hide_render=True
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ROOT/'assets'/'blender'/'room2-studio-preview.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
scene['studio_review_notes']='First pass: window easel, preparation bench, reference board, leaning canvases. Existing artwork prints are provisional references. Review cameras and lights must be excluded from future GLB export. No GLB exported.'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets'/'blender'/'room2-studio-preview.blend'))
print('STUDIO_PREVIEW_SAVED',flush=True)
bpy.ops.render.render(write_still=True)
