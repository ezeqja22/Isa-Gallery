"""Bring the gallery/vestibule into the atelier's architectural family.

Run with Blender --background --factory-startup --python. Backs up both source
and runtime assets; exports only the existing allowlist and this pass's details.
Room2 is a read-only material reference. Re-running replaces only this pass.
"""
import bpy, math, json, struct, shutil, hashlib
from pathlib import Path
from datetime import datetime
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / 'backups' / ('before-rich-rooms-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
BACKUP.mkdir(parents=True)
PREFIX = 'HouseFinish_'
room2_hash = hashlib.sha256((ROOT/'public/models/room2.glb').read_bytes()).hexdigest()
results = {}

def gltf(path):
    raw = path.read_bytes()
    return json.loads(raw[20:20+struct.unpack_from('<I', raw, 12)[0]])

def assign(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)
    if obj.type == 'MESH':
        for p in obj.data.polygons: p.material_index = 0

def project(obj, scale):
    if obj.type != 'MESH': return
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new()
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    for face in obj.data.polygons:
        normal = normal_matrix @ face.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        axes = [i for i in range(3) if i != axis]
        for li in face.loop_indices:
            v = obj.matrix_world @ obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv = (v[axes[0]]/scale, v[axes[1]]/scale)

def own(obj, name, material):
    obj.name = PREFIX + name
    for c in list(obj.users_collection): c.objects.unlink(obj)
    details.objects.link(obj)
    if material: obj.data.materials.append(material)
    return obj

def box(name, pos, dims, material, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = own(bpy.context.object, name, material)
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Crafted edge', 'BEVEL'); mod.width=bevel; mod.segments=3
        obj.modifiers.new('Corner normals', 'WEIGHTED_NORMAL')
    return obj

def line(name, points, radius, material):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions='3D'; cu.bevel_depth=radius; cu.bevel_resolution=3
    sp=cu.splines.new('POLY'); sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points): p.co=(*co,1)
    obj=bpy.data.objects.new(PREFIX+name,cu); details.objects.link(obj); cu.materials.append(material)
    return obj

def turned_leg(x,y):
    vs=[];fs=[];profile=[(0,.065),(.08,.10),(.16,.07),(.39,.06),(.48,.105),(.57,.075),(.71,.09)]
    for z,r in profile:
        vs.extend([(x+r*math.cos(i*math.tau/24),y+r*math.sin(i*math.tau/24),-3.84+z) for i in range(24)])
    for j in range(len(profile)-1):
        for i in range(24): a=j*24+i;b=j*24+(i+1)%24;fs.append((a,b,b+24,a+24))
    fs.extend([tuple(reversed(range(24))),tuple((len(profile)-1)*24+i for i in range(24))])
    me=bpy.data.meshes.new('Turned walnut');me.from_pydata(vs,[],fs)
    obj=bpy.data.objects.new(PREFIX+'Bench turned leg',me);details.objects.link(obj);me.materials.append(oak)
    for p in me.polygons:p.use_smooth=True
    project(obj,2)

def cornice(axis, fixed, start, end, ceiling, label):
    # Three overlapping profiles, fine shadow gaps and a continuous dentil bed.
    for z,depth,height in [(ceiling-.48,.16,.07),(ceiling-.34,.25,.10),(ceiling-.14,.40,.12)]:
        pos=((start+end)/2,fixed,z) if axis=='x' else (fixed,(start+end)/2,z)
        dims=(end-start,depth,height) if axis=='x' else (depth,end-start,height)
        box(label+' cornice',pos,dims,trim,.025)
    count=int((end-start)/.34)
    for i in range(count):
        t=start+(i+.5)*(end-start)/count
        pos=(t,fixed,ceiling-.27) if axis=='x' else (fixed,t,ceiling-.27)
        dims=(.105,.25,.11) if axis=='x' else (.25,.105,.11)
        box(label+' dentil',pos,dims,trim,.01)

def pilaster(x,y,top,side=False):
    def p(u,depth,z):return (x+depth,y+u,z) if side else (x+u,y-depth,z)
    def d(w,depth,h):return (depth,w,h) if side else (w,depth,h)
    box('Pilaster shaft',p(0,0,(top-3.65)/2),d(.28,.12,top+3.65),trim,.015)
    for z,w,depth,h in [(-3.65,.48,.25,.22),(-3.45,.36,.18,.10),(top,.48,.26,.12),(top-.14,.38,.20,.10)]:
        box('Pilaster capital and base',p(0,.04,z),d(w,depth,h),trim,.02)
    for u in [-.07,0,.07]:
        line('Pilaster fine fluting',[p(u,.075,-3.25),p(u,.075,top-.35)],.012,brass)

for room in ['room1','hallway']:
    source=ROOT/'assets/blender'/f'{room}.blend'; target=ROOT/'public/models'/f'{room}.glb'
    for f in [source,target]:shutil.copy2(f,BACKUP/f.name)
    original=gltf(target); names={n['name'] for n in original['nodes']}
    bpy.ops.wm.open_mainfile(filepath=str(source))
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(PREFIX): names.discard(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
    details=bpy.data.collections.new('House architectural finish');bpy.context.scene.collection.children.link(details)
    with bpy.data.libraries.load(str(ROOT/'assets/blender/room2.blend'),link=False) as (_,data):
        data.materials=['Ivory plaster patina','Atelier painted mouldings','Atelier aged brass','Warm aged oak','Unprimed woven linen']
    plaster,trim,brass,oak,linen=data.materials
    assert all(data.materials)
    for obj in bpy.context.scene.objects:
        if obj.name not in names or obj.type!='MESH':continue
        if any(s.material and 'plaster patina' in s.material.name for s in obj.material_slots):
            assign(obj,plaster);project(obj,14)
        if obj.name in ['Floor','Hall_Floor','ArchPassage_Floor','UpperLanding']:project(obj,12)

    if room=='room1':
        cornice('x',9.57,-9.55,9.55,3.98,'Gallery back')
        cornice('y',-9.57,-9.55,9.55,3.98,'Gallery left')
        cornice('y',9.57,-9.55,9.55,3.98,'Gallery right')
        # Pilasters sit between the existing painting bays, leaving the artworks clear.
        for x in [-9.43,-3.19,3.19,9.43]:pilaster(x,9.63,3.48)
        for y in [-9.43,-3.19,3.19,9.43]:pilaster(-9.63,y,3.48,True)
        # Fine stepped reveal around the skylight, not another heavy grid.
        for fixed in [-7.98,7.98]:
            box('Skylight plaster reveal',(0,fixed,3.80),(16.12,.14,.09),trim)
            box('Skylight plaster reveal',(fixed,0,3.80),(.14,16.12,.09),trim)
        for x in [-6.38,0,6.38]:
            # Small paired scrolls above the panel; retain a quiet centre for art.
            for sign in [-1,1]:
                pts=[]
                for i in range(49):
                    t=i/48*math.tau;r=.015+.10*i/48
                    pts.append((x+sign*(.18+r*math.cos(t)),9.55,3.22+r*math.sin(t)))
                line('Gallery overdoor scroll',pts,.016,brass)
        seat=bpy.data.objects.get('Gallery_Bench_LinenSeat')
        if seat:assign(seat,linen);project(seat,1.5)
        for obj in list(bpy.context.scene.objects):
            if obj.name.startswith('Gallery_Bench_Leg_'):
                bpy.data.objects.remove(obj,do_unlink=True)
        names={name for name in names if not name.startswith('Gallery_Bench_Leg_')}
        for x in [-4.65,-1.35]:
            for y in [3.14,3.86]:turned_leg(x,y)
        line('Bench lower stretcher',[(-4.65,3.5,-3.55),(-1.35,3.5,-3.55)],.045,oak)
        for y in [2.97,4.03]:line('Bench upholstery piping',[(-5.0,y,-2.84),(-1.0,y,-2.84)],.018,linen)
    else:
        # Original arch: crown 3.55, ceiling underside 3.40. Lower the spring
        # to 0.05 and rebuild BOTH the opening and its mouldings coherently.
        for obj in list(bpy.context.scene.objects):
            if obj.name=='Hall_PortalArch' or obj.name.startswith('Hall_ArchMoulding'):
                names.discard(obj.name);bpy.data.objects.remove(obj,do_unlink=True)
        spring=-.15;radius=2.7;vs=[];fs=[]
        for depth in [-10.16,-9.84]:
            for i in range(65):
                a=i*math.pi/64;x=radius*math.cos(a);z=spring+radius*math.sin(a)
                vs.extend([(x,depth,z),(x,depth,4)])
        for i in range(64):
            a=i*2;fs.extend([(a,a+2,a+3,a+1),(a+130,a+131,a+133,a+132),(a,a+130,a+132,a+2)])
        fs.extend([(1,129,259,131),(0,1,131,130),(128,258,259,129)])
        me=bpy.data.meshes.new('Clear portal opening');me.from_pydata(vs,[],fs)
        obj=bpy.data.objects.new('Hall_PortalArch',me);bpy.context.collection.objects.link(obj);assign(obj,plaster);project(obj,14);names.add(obj.name)
        for depth in [-10.23,-9.77]:
            for r,bead,mat in [(2.77,.055,trim),(2.89,.055,trim),(2.96,.018,brass)]:
                pts=[(-r,depth,-3.84),(-r,depth,spring)]
                pts += [(r*math.cos(math.pi-i*math.pi/96),depth,spring+r*math.sin(math.pi-i*math.pi/96)) for i in range(1,97)]
                pts += [(r,depth,-3.84)]
                line('Portal layered archivolt',pts,bead,mat)
            for x in [-2.85,2.85]:
                box('Portal plinth',(x,depth,-3.58),(.43,.30,.50),trim)
                box('Portal impost',(x,depth,spring),(.42,.30,.16),trim)
            box('Portal keystone',(0,depth,spring+2.82),(.28,.26,.32),trim,.025)
        for x in [-4.76,4.76]:cornice('y',x,-23.8,-10.3,3.4,'Vestibule side')
        # The portal frieze is deliberately shallower than the side cornices:
        # no low horizontal profile may cross the crown of the archivolt.
        for z,depth,height in [(3.22,.25,.10),(3.34,.40,.10)]:
            box('Vestibule portal cornice',(0,-10.30,z),(9.4,depth,height),trim,.02)
        for i in range(28):
            box('Vestibule portal dentil',(-4.59+i*.34,-10.30,3.15),(.105,.25,.08),trim,.01)
        # Inset ceiling frame emphasizes the long room and keeps the arch clear.
        for x in [-4.15,4.15]:box('Vestibule ceiling border',(x,-17,3.36),(.09,12.5,.06),trim,.015)
        for y in [-23.25,-10.75]:box('Vestibule ceiling border',(0,y,3.36),(8.3,.09,.06),trim,.015)
        # Recessed lower wall panels and a chair rail, as in the atelier.
        box('Vestibule chair rail',(-4.74,-17,-2.15),(.13,13.65,.10),trim)
        for obj in bpy.context.scene.objects:
            if obj.name.startswith('Hall_PanelVertical'):
                obj.location.z=.275;obj.dimensions.z=4.35
            elif obj.name.startswith('Hall_PanelHorizontal') and obj.location.z<0:
                obj.location.z=-1.90
        for y in [-21.7,-17.5,-13.3]:
            for z in [-3.20,-2.43]:box('Vestibule lower panel',(-4.73,y,z),(.09,3.20,.055),trim,.012)
            for yy in [y-1.6,y+1.6]:box('Vestibule lower panel',(-4.73,yy,-2.815),(.09,.055,.77),trim,.012)
        # Extra recessed window profile: narrow bronze bead catches daylight.
        for y in [-20.12,-14.88]:box('Window outer bead',(4.64,y,.8),(.055,.035,3.9),brass,.01)
        for z in [-1.15,2.75]:box('Window outer bead',(4.64,-17.5,z),(.055,5.28,.035),brass,.01)
        # Let the actual sky show through the side window rather than a white slab.
        window=bpy.data.objects['Hall_Window'];glass=window.data.materials[0].copy();assign(window,glass)
        shader=glass.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value=(.70,.80,.82,1)
        shader.inputs['Alpha'].default_value=.13
        shader.inputs['Emission Strength'].default_value=0
        glass.surface_render_method='DITHERED';glass.diffuse_color=(.70,.80,.82,.13)

    # Collapse repeated ornamental parts by material, keeping draw calls modest.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in details.objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=next(iter(details.objects))
    bpy.ops.object.convert(target='MESH')
    groups={}
    for obj in list(details.objects):groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for i,objects in enumerate(groups.values()):
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join();obj=bpy.context.object;obj.name=PREFIX+room+'_'+str(i);names.add(obj.name)
    bpy.context.view_layer.update()
    if room=='hallway':
        # All arch layers (including the keystone) must sit beneath the cornice.
        assert spring+2.96+.018 < 3.11
        results['arch']={'old_crown':3.55,'ceiling_underside':3.4,'new_crown':2.83,'clearance':.57,'opening_width':5.4,'cornice_clearance':.28}
    bpy.context.scene['gallery_export_names']=json.dumps(sorted(names))
    bpy.context.scene['house_finish_notes']='Atelier plaster, scaled surfaces, layered cornices and crafted furniture; vestibule arch crown below ceiling.'
    # Pack textures so the saved Blender files remain portable.
    # Old, unused construction materials reference missing parquet files. Pack
    # loaded images only; do not let those archive references abort this export.
    for image in bpy.data.images:
        if image.has_data and not image.packed_file:
            image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.name in names:obj.hide_set(False);obj.select_set(True)
    temp=target.with_name(room+'-rich.glb')
    bpy.ops.export_scene.gltf(filepath=str(temp),export_format='GLB',use_selection=True,export_apply=True,
        export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    exported=gltf(temp);exported_names={n['name'] for n in exported['nodes']}
    assert names==exported_names,(names-exported_names,exported_names-names)
    assert all('bufferView' in im for im in exported.get('images',[]))
    assert not exported.get('cameras')
    temp.replace(target)
    results[room]={'nodes':len(exported_names),'bytes':target.stat().st_size,'backup':str(BACKUP)}
    print('VERIFIED',room,results[room],flush=True)

assert hashlib.sha256((ROOT/'public/models/room2.glb').read_bytes()).hexdigest()==room2_hash
(ROOT/'reports').mkdir(exist_ok=True)
(ROOT/'reports/rich-rooms-validation.json').write_text(json.dumps(results,indent=2))
