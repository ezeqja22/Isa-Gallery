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
| Room 2 | 119,852,940 | 1,095,274 | 851 |

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

### Reviewed cleanup candidates (before action)

| Exact path | Bytes | Evidence / recovery |
|---|---:|---|
| `public/file.svg` | 391 | Unused Next starter icon; no source/config/script references. Recover from baseline Git commit. |
| `public/globe.svg` | 1,035 | Same evidence. |
| `public/next.svg` | 1,375 | Same evidence. |
| `public/vercel.svg` | 128 | Same evidence. |
| `public/window.svg` | 385 | Same evidence. |
| `public/optimized/texture-9d8cab867678b6499925.webp` | 15,809,828 | Generated in this task; replaced by the smaller original JPEG. No generated glTF references it. Move to `reports/performance/intermediate/` rather than delete. |

All paths are within the Gallery project. The Blender audit confirms the source
materials use their named texture images, not these starter SVGs. Original GLBs
and the EXR are retained as reproducible pipeline inputs. Ignored `.blend` backups,
textures and earlier deliverables remain untouched because their unique source
value cannot be disproved by runtime references alone.

## Implementation

- Separate geometry from content-addressed shared textures. Meshopt compresses
  geometry without quantizing or simplifying it. Duplicate accessor/mesh data is
  shared while named nodes and transforms remain intact.
- High retains original painting JPEG bytes and dimensions. Other High textures
  retain their dimensions; lossless WebP is used only when smaller than the source.
  The 16-bit normal PNG is converted to the 8-bit range used by browser image uploads.
  Balanced/Low cap non-art textures at 2048/1024 pixels; shell textures use 256 pixels.
- The original 73.92 MB EXR becomes an 18.94 MB linear HDR at the same dimensions.
  Balanced/Low skies are 5.07/1.33 MB. No changes to exposure, sky orientation, tint,
  sun position, light intensities, room dimensions or artwork geometry.
- Entrance loads the detailed hallway/gallery and an architectural atelier shell.
  Before walking upstairs, full destination detail is loaded and shaders prepared.
  Both sides stay detailed during the trip. On arrival, distant room textures are
  reduced; on returning downstairs, atelier props are released and its real shell
  stays present. Stairs and portal geometry never disappear.
- Opaque, non-interactive atelier details are batched by material/attribute layout.
  This keeps all triangles; mirrored, transparent and named room surfaces are left
  separate. Full-detail node anchors remain available. Larger batches trade some
  frustum-culling precision for substantially fewer draw calls.
- Shared texture promises avoid repeat decoding/uploads. Disposal covers geometries,
  materials, bitmap data and unused caches. Pending loader requests are aborted on
  teardown, stale results cannot replace a newer visit, and timed-out loads expose retry.
- Removed eager `useGLTF.preload` and `Preload all`. The UI reports required-file
  progress and a separate light-preparation stage; it no longer waits for full upstairs
  detail before allowing entry. A 90-second watchdog and error boundary provide retry
  and Low-quality recovery. WebGL context restoration refreshes the static shadow.
- High/Balanced/Low use DPR ceilings 1.5/1.25/1 and shadow maps 4096/2048/1024.
  Initial choice uses reported memory/CPU capability, not user-agent sniffing. Explicit
  selection is available in Explore and restarts the visit. High is the reference mode.
- Replaced deprecated soft-shadow selection with the actual PCF mode this Three.js
  version uses. This fixes a confirmed GPU sampler mismatch on subsequent shader
  warmups. Lighting remains visually equivalent. Rendering stays demand-driven.
- TypeScript excludes archived backups and generated reports; they are not deleted.
  Build output can be isolated with `GALLERY_AUDIT_BUILD=1`.

## Measurements and checks

Installed Edge headless, 1440×900, DPR 1, localhost production builds; timings vary
with CPU/GPU contention and are not network/mobile benchmarks:

| Measurement | Original | Optimized High |
|---|---:|---:|
| Initial transferred resources | 349.81 MB | 77.14 MB |
| Full-tour transferred resources | 349.81 MB | 98.16 MB |
| Ready marker, representative runs | 10.4–13.2 s | 5.1–6.4 s |
| Gallery steady-view draw calls | 192 | 168 |
| Atelier steady-view draw calls | 747 | 55 |
| Atelier renderer geometries | 1,028 | 180 |
| Atelier renderer textures | 38 | 26 |

High initial transfer is approximately 78% smaller; full-tour transfer is 72% smaller.
Do not interpret fewer draw calls as fewer triangles: atelier batching can draw
some triangles previously rejected by per-object frustum culling.
The longest High startup main-thread task remained about 3.5 seconds in the
measured configuration; this is not claimed fixed by the transfer reduction.
Moving HDR decoding to a worker did not reduce that task, so the simpler loader
was retained. Shader preparation and texture upload still need a capable device.

Three round trips each on desktop High and a 390×844 touch-capable Low context:
no page/GPU errors; resource counts stabilized after warmup. Desktop upstairs stayed
at 180 geometries / 26 textures and downstairs at 141 / 26 on all three cycles.
Painting inspection, mouse dragging, simulated context loss/restoration, and a forced
503 model failure with retry UI passed. The mobile test is emulation, not physical hardware.

Windows WebKit 27.2 completed the Low-quality tour with no rendering errors. It is
not iOS Safari. Its audio backend reported unavailable; real-device audio remains
outside this rendering test. The existing sound implementation was preserved.

Chromium mobile-sized Low, 8 Mbps download / 80 ms latency: 31.82 seconds to ready,
28.92 MB initial transfer, 49.91 MB full tour. Full-resolution paintings account for
much of that remaining download. This is measured network emulation, not an estimate.

After the entrance fade settles, central architectural pixels at matching cameras
have mean channel differences (0–255 scale) of 0.0058 hallway, 0.0024 gallery and
0.0019 atelier. Fixed arch/stair/closeup teleports after upstairs arrival differ more
(0.43–0.57) because distant rooms intentionally use shell textures then; actual
transitions retain detailed endpoints. Geometry checks independently confirm every
full-detail node transform, vertex attribute, triangle winding and material factor.

Estimated memory, not measured VRAM: the shared 4096² floor color/normal pair costs
about 171 MiB with mipmaps, versus roughly 512 MiB for three independent copies.
Balanced/Low reduce that pair to about 43/11 MiB. PCF shadow color+depth targets are
approximately 128/32/8 MiB at the three sizes. Framebuffer cost varies with viewport,
DPR, antialiasing samples and driver; no browser-independent VRAM claim is made.

## Reproduction and limits

1. Install dependencies with the lockfile and fetch Git LFS assets.
2. `npm run assets:optimize` generates all model/texture tiers from retained GLBs.
3. Run Blender in background mode with `scripts/optimize-sky.py` for sky variants.
4. `npm run assets:verify` validates full-detail geometry and material preservation.
5. Build with `next build --webpack`, then start a production server.
6. Set `AUDIT_URL` and `AUDIT_LABEL` and run `npm run audit:browser`; set
   `PLAYWRIGHT_MODULE` to an installed Playwright module if the default path differs.
   `scripts/verify-gallery-browser.cjs` exercises repeated navigation and recovery.
   `scripts/compare-gallery-views.cjs` compares the captured images numerically.

Raw reports/screenshots live under ignored `reports/performance`; original source
files and the gift video are preserved. Generated binary runtime assets use Git LFS.
Content-hashed textures/geometry receive immutable caching; glTF manifests and sky
filenames do not receive immutable caching.

KTX2/Basis was evaluated against the installed Three.js pipeline. Neither `toktx`
nor `basisu` was installed. This change uses browser-compatible WebP/JPEG with explicit
resolution tiers; it does **not** claim GPU block compression. A future Basis encoder
pass should be separately compared for normal-map and painting artifacts before use.
No physical iPhone, low-memory device crash trace, or sustained GPU timing capture
was available. The repeat-navigation checks are bounded tests, not proof that every
device can run High. No original Blender source, unique source texture, master branch,
database, credential or production deployment was modified.
