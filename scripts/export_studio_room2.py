"""Promote the saved studio review and export the runtime room, with backups."""
import bpy, json, shutil, struct
from pathlib import Path
from datetime import datetime

root = Path(__file__).resolve().parents[1]
backup = root / 'assets' / 'backups' / ('room2-before-studio-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True, exist_ok=False)
source = root / 'assets/blender/room2.blend'
target = root / 'public/models/room2.glb'
shutil.copy2(source, backup / 'room2.blend')
shutil.copy2(target, backup / 'room2.glb')

bpy.ops.object.select_all(action='DESELECT')
selected = []
for obj in bpy.context.scene.objects:
    if any('DoNotExport' in c.name for c in obj.users_collection):
        continue
    if obj.type not in {'MESH', 'CURVE', 'EMPTY'}:
        continue
    obj.hide_set(False)
    obj.select_set(True)
    selected.append(obj)
assert any(o.name == 'Room2_Ceiling' for o in selected)
assert any(o.name == 'Studio_Workbench_Top' for o in selected)
# glTF exports evaluated meshes; convert curves in the export session only.
bpy.context.scene['studio_review_notes'] = 'Approved studio. Review cameras, lights and helper collections are excluded from GLB export.'
bpy.ops.wm.save_as_mainfile(filepath=str(source))
for obj in list(selected):
    if obj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type in {'MESH', 'EMPTY'} and not any('DoNotExport' in c.name for c in obj.users_collection):
        obj.select_set(True)
temporary = target.with_name('room2-studio-export.glb')
bpy.ops.export_scene.gltf(filepath=str(temporary), export_format='GLB', use_selection=True,
    export_yup=True, export_apply=True, export_materials='EXPORT', export_animations=False,
    export_cameras=False, export_lights=False)
with temporary.open('rb') as f:
    header = f.read(20)
    data = json.loads(f.read(struct.unpack_from('<I', header, 12)[0]))
names = [n.get('name','') for n in data['nodes']]
assert 'Room2_Ceiling' in names and 'Studio_Workbench_Top' in names
assert 'Room2_WindowFrame_Arch' in names or any(n.startswith('Atelier_Window_Arch') for n in names)
assert not any('DoNotExport' in n or n.startswith('Review_') or n.startswith('Studio_Review') for n in names)
assert not data.get('cameras')
assert all('bufferView' in i for i in data.get('images', []))
temporary.replace(target)
print('EXPORT_VERIFIED', json.dumps({'nodes':len(names),'images':len(data.get('images',[])), 'bytes':target.stat().st_size, 'backup':str(backup)}), flush=True)
