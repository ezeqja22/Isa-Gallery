# Gallery performance work

## Baseline (c0145f8)

All changes are isolated on `codex/gallery-performance`. Production and master are unchanged.
The existing Blender sources are retained. No source asset has been deleted.

The read-only Blender audit inspected all three source scenes and their exported materials,
UV ranges, object names, and dimensions. Details: `reports/room-surface-audit.json`.
Reproduce with Blender background mode and `scripts/audit_room_surfaces.py`.

| Runtime model | Bytes | Triangles | Mesh primitives |
|---|---:|---:|---:|
| Hallway | 79,596,656 | 47,246 | 58 |
| Room 1 | 102,482,192 | 69,646 | 110 |
| Room 2 | 119,852,940 | 1,095,274 | 848 |

All three production URLs return HTTP 206, `model/gltf-binary`, correct total byte
lengths, and `glTF` binary signatures, not LFS pointers (verified with range requests).
The same 66,690,557-byte 4096² 16-bit normal PNG and 10,094,919-byte 4096² color
texture are embedded in each model. Plaster, linen and wood are also duplicated.
Two RGBA8 4096² textures with mipmaps alone cost approximately 171 MiB per room;
three independent copies cost 512 MiB. This is an estimate, not device VRAM telemetry.
The EXR sky, painting textures, render buffers and shadows add to that total.

Local existing production-build baseline, installed Edge headless, 1440×900, DPR 1:
13.204 seconds to the ready marker; 349.83 MB transferred through the full room tour;
10 long tasks, longest 3,591 ms. These are localhost measurements, not mobile/network
claims. One earlier run took 12.109 seconds. Renderer at the fixed closeup: 1,028
geometries, 38 textures, 26 programs. View-specific draw counts vary with camera.
Screenshots and raw timings are in `reports/performance/baseline`.

Confirmed startup causes: eager preload of all rooms, a shared Suspense gate,
full-scene shader warmup, and large duplicated embedded textures. Memory pressure
is a plausible Safari crash cause; a real iPhone crash trace has not been obtained.

## Visual verification

`scripts/performance-browser.cjs` captures hallway, room 1, room 2, a fixed staircase
pose, arch and painting closeup. The timing-based stair image is informational only;
use the fixed-pose image for comparison. It reads the existing renderer through a
test-only React DevTools hook and does not change application source or lighting.
All profiles, caches and generated outputs are confined to `reports/performance`.

## Cleanup policy

No deletion is approved by inference. Original `.blend` files and unique source
assets stay in place. Before any cleanup, list each candidate's exact path, size,
runtime/source reference evidence and recovery location here. Uncertain files stay.
The anniversary video and its source material are user deliverables, not junk.
