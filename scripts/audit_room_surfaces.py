"""Read-only audit of source scenes and the actual exported runtime materials."""
import bpy, json, struct
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
report = {}
for room in ('room1', 'room2', 'hallway'):
    raw = (ROOT / 'public/models' / (room + '.glb')).read_bytes()
    gltf = json.loads(raw[20:20 + struct.unpack_from('<I', raw, 12)[0]])
    names = {n.get('name') for n in gltf['nodes']}
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'assets/blender' / (room + '.blend')))
    objects = []
    used = set()
    for o in bpy.context.scene.objects:
        if o.name not in names:
            continue
        mats = [s.material.name for s in o.material_slots if s.material]
        used.update(mats)
        uv = o.data.uv_layers.active if o.type == 'MESH' else None
        bounds = None
        if uv and len(uv.data):
            coords = [p.uv for p in uv.data]
            bounds = [[min(p[a] for p in coords), max(p[a] for p in coords)] for a in (0, 1)]
        objects.append(dict(name=o.name, type=o.type, dimensions=list(o.dimensions), materials=mats,
                            uv_bounds=bounds, modifiers=[m.type for m in o.modifiers]))
    materials = []
    for name in sorted(used):
        m = bpy.data.materials[name]
        p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.use_nodes else None
        materials.append(dict(name=name, roughness=p.inputs['Roughness'].default_value if p else None,
            textures=[dict(name=n.image.name, size=list(n.image.size), path=n.image.filepath)
                      for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image] if m.use_nodes else [],
            links=[(l.from_node.type, l.to_socket.name) for l in m.node_tree.links] if m.use_nodes else []))
    report[room] = dict(source_objects=len(bpy.context.scene.objects), runtime_nodes=len(names),
        runtime_meshes=len(gltf.get('meshes', [])), runtime_images=len(gltf.get('images', [])),
        runtime_materials=gltf.get('materials', []), source_materials=materials, objects=objects,
        runtime_names=sorted(names))
out = ROOT / 'reports/room-surface-audit.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(report, indent=2))
for room, data in report.items():
    print('AUDIT', room, {k:v for k,v in data.items() if k.startswith('runtime_') and isinstance(v,int)})
print('REPORT', out)
