"""Check exported geometry, preserved artwork transforms, and arch clearance."""
import bpy, json, struct
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
baseline=sorted((ROOT/'backups').glob('before-rich-rooms-*'))[0]
def read(path):
    raw=path.read_bytes();return json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])

before=read(baseline/'room1.glb');after=read(ROOT/'public/models/room1.glb')
old={n['name']:n for n in before['nodes']};new={n['name']:n for n in after['nodes']}
art=[n for n in old if 'Artwork' in n or 'Piktura' in n or '_Frame_' in n]
for name in art:
    assert name in new,name
    for key in ['translation','rotation','scale','matrix']:
        assert old[name].get(key)==new[name].get(key),(name,key)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/hallway.glb'))
bpy.context.view_layer.update()
ceiling=bpy.data.objects['Hall_Ceiling']
ceiling_bottom=min((ceiling.matrix_world@Vector(v)).z for v in ceiling.bound_box)
portal_crown=[]
for obj in bpy.context.scene.objects:
    if not obj.name.startswith('HouseFinish_') or obj.type!='MESH':continue
    for polygon in obj.data.polygons:
        points=[obj.matrix_world@obj.data.vertices[i].co for i in polygon.vertices]
        # Only the portal's central ornament; exclude the side cornices.
        if all(abs(p.x)<3.1 and -10.65<p.y<-9.4 for p in points):
            lo=min(p.z for p in points);hi=max(p.z for p in points)
            assert hi<=2.84 or lo>=3.10,('arch/frieze gap obstructed',obj.name,lo,hi)
            if hi<3.10:portal_crown.append(hi)
crown=max(portal_crown)
assert ceiling_bottom-crown>.55,(ceiling_bottom,crown)
assert 2.81<crown<2.84,crown
window=bpy.data.objects['Hall_Window']
assert window.data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value<.2
result={'preserved_artwork_and_frame_nodes':len(art),'measured_ceiling_underside':ceiling_bottom,
        'measured_arch_crown':crown,'measured_clearance':ceiling_bottom-crown,
        'clear_gap_below_cornice':True,'source_backup':str(baseline)}
(ROOT/'reports/rich-rooms-geometry-check.json').write_text(json.dumps(result,indent=2))
print('GEOMETRY_VERIFIED',json.dumps(result))
