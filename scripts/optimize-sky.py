"""Export the existing linear HDR sky without changing its orientation or exposure."""
import bpy, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'public/environment/drackenstein_quarry_puresky_4k.exr'
image=bpy.data.images.load(str(source),check_existing=False)
print('Loaded pixel',image.pixels[0],list(image.size))
image.file_format='HDR'
image.filepath_raw=str(root/'public/optimized/sky.hdr')
image.save()
print(json.dumps({'source_bytes':source.stat().st_size,'hdr_bytes':Path(image.filepath_raw).stat().st_size,'dimensions':list(image.size)}))
for name,width in [('balanced',2048),('low',1024)]:
    variant=bpy.data.images.load(str(source),check_existing=False)
    print('Loaded variant',variant.pixels[0])
    variant.scale(width,width//2)
    variant.file_format='HDR'
    variant.filepath_raw=str(root/f'public/optimized/sky-{name}.hdr')
    variant.save()
    print(name,Path(variant.filepath_raw).stat().st_size)
