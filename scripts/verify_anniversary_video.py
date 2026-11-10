"""Decode the delivered MP4 and extract samples for final visual review."""
from pathlib import Path
import sys, subprocess, json
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'deliverables/isma-anniversary'
sys.path.insert(0,str(OUT/'tools'))
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();video=OUT/'Per-Ismen-5-vjet-bashke.mp4'
check=subprocess.run([ffmpeg,'-v','error','-i',str(video),'-f','null','-'],capture_output=True,text=True)
assert check.returncode==0,check.stderr
sheet=Image.new('RGB',(1440,900),(16,20,17));draw=ImageDraw.Draw(sheet)
for i,second in enumerate([3,8,14,20,24,29,35,39,41]):
    sample=OUT/f'check-{i}.png'
    subprocess.run([ffmpeg,'-y','-v','error','-ss',str(second),'-i',str(video),'-frames:v','1','-vf','scale=480:270',str(sample)],check=True)
    with Image.open(sample) as image:sheet.paste(image,((i%3)*480,(i//3)*300))
    draw.text(((i%3)*480+10,(i//3)*300+277),f'{second}s',fill=(220,208,177))
sheet.save(OUT/'final-review.jpg',quality=95)
print('VERIFIED: complete video and audio decode without errors')
print('FILE_BYTES',video.stat().st_size)
print('DETAILS',(OUT/'film-details.json').read_text(encoding='utf-8'))
