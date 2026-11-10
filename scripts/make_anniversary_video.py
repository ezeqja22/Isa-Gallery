"""Compose a private Albanian anniversary film from the gallery and original art."""
import sys, math, wave, subprocess, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'deliverables/isma-anniversary';ASSETS=OUT/'assets'
sys.path.insert(0,str(OUT/'tools'))
import imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
W,H,FPS=1920,1080,24
IVORY=(246,237,218);GOLD=(203,178,124)
SERIF='C:/Windows/Fonts/GARA.TTF';ITALIC='C:/Windows/Fonts/GARAIT.TTF';SANS='C:/Windows/Fonts/segoeui.ttf'

def font(size,italic=False,sans=False):return ImageFont.truetype(SANS if sans else ITALIC if italic else SERIF,size)
def fit(path):
    image=Image.open(path).convert('RGB')
    return ImageOps.fit(image,(W,H),method=Image.Resampling.LANCZOS)

def art_card(path):
    im=Image.open(path).convert('RGB')
    background=ImageOps.fit(im,(W,H),method=Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(70))
    background=Image.blend(background,Image.new('RGB',(W,H),(17,20,18)),.82)
    im.thumbnail((1460,880),Image.Resampling.LANCZOS)
    x=(W-im.width)//2;y=(H-im.height)//2
    draw=ImageDraw.Draw(background)
    draw.rectangle((x-12,y-12,x+im.width+12,y+im.height+12),fill=(45,39,28))
    draw.rectangle((x-4,y-4,x+im.width+3,y+im.height+3),outline=GOLD,width=2)
    background.paste(im,(x,y))
    return background

def text_line(draw,text,y,size=76,italic=False,fill=IVORY):
    f=font(size,italic);bounds=draw.textbbox((0,0),text,font=f)
    assert bounds[2]-bounds[0]<W-220, text
    draw.text(((W-(bounds[2]-bounds[0]))/2,y-bounds[1]),text,font=f,fill=fill)

def overlay(kind,lines):
    layer=Image.new('RGBA',(W,H));draw=ImageDraw.Draw(layer)
    if kind in ['intro','outro']:
        draw.rectangle((0,0,W,H),fill=(12,18,16,185 if kind=='intro' else 200))
        if kind=='intro':
            f=font(23,sans=True);small='P E S Ë   V J E T   B A S H K Ë'
            draw.text((W/2,366),small,font=f,fill=GOLD,anchor='mm')
            text_line(draw,'Për Ismën',445,148,True)
            draw.line((W/2-68,648,W/2+68,648),fill=GOLD,width=2)
            text_line(draw,'Një dhuratë, me gjithë dashurinë time.',700,38)
        else:
            text_line(draw,'Gëzuar 5-vjetorin,',348,94)
            text_line(draw,'Isma.',465,142,True)
            draw.line((W/2-65,653,W/2+65,653),fill=GOLD,width=2)
            text_line(draw,'Të dua.',715,65,True)
    elif lines:
        # A broad, soft lower gradient keeps captions readable over daylight.
        alpha=np.zeros((H,W),dtype=np.uint8)
        for y in range(H):alpha[y,:]=int(175*max(0,(y/H-.40)/.60)**1.1)
        shade=Image.new('RGBA',(W,H),(9,15,12,0));shade.putalpha(Image.fromarray(alpha));layer=Image.alpha_composite(layer,shade)
        draw=ImageDraw.Draw(layer)
        for i,line in enumerate(lines):text_line(draw,line,830+i*83,73,True)
    return layer

scenes=[
    dict(image=fit(ASSETS/'hallway.png'),kind='intro',duration=6,lines=[]),
    dict(image=fit(ASSETS/'hallway.png'),kind='room',duration=7,lines=['Ti i jep ngjyrë','botës sime.']),
    dict(image=fit(ASSETS/'gallery.png'),kind='room',duration=7,lines=['Prandaj krijova një vend','për botën tënde.']),
    dict(image=art_card(ROOT/'public/paintings/piktura2.jpeg'),kind='art',duration=5.5,lines=[]),
    dict(image=art_card(ROOT/'public/paintings/piktura1.jpeg'),kind='art',duration=5.5,lines=[]),
    dict(image=art_card(ROOT/'public/paintings/piktura4.jpeg'),kind='art',duration=5.5,lines=[]),
    dict(image=fit(ASSETS/'atelier.png'),kind='room',duration=7,lines=['Për artin tënd.','Për ëndrrat që do të vijnë.']),
    dict(image=fit(ASSETS/'gallery.png'),kind='outro',duration=7,lines=[]),
]
FADE=1.1;cursor=0
for s in scenes:
    s['start']=cursor;s['overlay']=overlay(s['kind'],s['lines']);cursor+=s['duration']-FADE
DURATION=cursor+FADE

def scene_frame(s,t):
    u=min(1,max(0,t/s['duration']));u=u*u*(3-2*u)
    zoom=1+.045*u if s['kind']!='art' else 1+.025*u
    cw,ch=W/zoom,H/zoom
    x=(W-cw)/2;y=(H-ch)*(.42 if s['kind']=='room' else .5)
    im=s['image'].transform((W,H),Image.Transform.EXTENT,(x,y,x+cw,y+ch),Image.Resampling.BICUBIC)
    return Image.alpha_composite(im.convert('RGBA'),s['overlay']).convert('RGB')

# A storyboard doubles as a typography and artwork-preservation check.
sheet=Image.new('RGB',(1280,720),(10,14,12))
for i,s in enumerate(scenes):
    frame=scene_frame(s,s['duration']/2);frame.thumbnail((320,180),Image.Resampling.LANCZOS)
    sheet.paste(frame,((i%4)*320,(i//4)*360+90))
sheet.save(OUT/'storyboard.jpg',quality=94)
scene_frame(scenes[0],3).save(OUT/'cover.jpg',quality=95)

def soundtrack():
    rate=44100;length=int((DURATION+.1)*rate);audio=np.zeros((length,2),np.float64)
    def note(midi,start,volume=.12,duration=4.5,pan=.5):
        count=min(int(duration*rate),length-int(start*rate))
        if count<=0:return
        t=np.arange(count)/rate;freq=440*2**((midi-69)/12)
        signal=np.zeros(count)
        for h,amp,decay in [(1,1,2.0),(2,.27,1.3),(3,.095,.8),(4,.035,.5)]:
            signal+=amp*np.sin(2*np.pi*freq*h*t)*np.exp(-t/decay)
        signal*=np.minimum(t/.022,1)*volume
        signal[-min(1500,count):]*=np.linspace(1,0,min(1500,count))
        offset=int(start*rate)
        audio[offset:offset+count,0]+=signal*math.sqrt(1-pan)
        audio[offset:offset+count,1]+=signal*math.sqrt(pan)
    # Original, sparse C / G / Am / F figures and an unhurried melody.
    chords=[(48,55,60,64),(43,55,59,62),(45,57,60,64),(41,53,57,60)]
    beat=60/72
    for bar in range(12):
        start=.7+bar*4*beat
        chord=chords[bar%4]
        for j,pitch in enumerate(chord):note(pitch,start+j*.5*beat,.09 if j==0 else .052,5,.35+j*.1)
    melody=[64,67,69,67,62,64,67,64,60,64,69,67,65,64,62,60]
    for j,pitch in enumerate(melody):note(pitch,2+j*2.25,.085,4.8,.56 if j%2 else .44)
    note(48,DURATION-5,.10,5,.4);note(60,DURATION-4.5,.08,4.5,.6);note(64,DURATION-4,.06,4,.5)
    dry=audio.copy()
    for delay,gain in [(.14,.13),(.31,.10),(.53,.07),(.79,.045)]:
        n=int(delay*rate);audio[n:]+=dry[:-n,::-1]*gain
    time=np.arange(length)/rate
    envelope=np.minimum(time/1.6,1)*np.minimum(np.maximum((DURATION-time)/3.0,0),1)
    audio*=envelope[:,None]
    audio*=.50/max(np.max(np.abs(audio)),.001)
    path=OUT/'original-score.wav'
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes((audio*32767).astype('<i2').tobytes())
    return path

audio=soundtrack()
if '--preview' in sys.argv:
    print('STORYBOARD_READY',OUT/'storyboard.jpg');sys.exit(0)
output=OUT/'Per-Ismen-5-vjet-bashke.mp4'
command=[FFMPEG,'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24',
         '-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audio),'-c:v','libx264','-preset','fast','-crf','20',
         '-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','loudnorm=I=-21:TP=-2:LRA=7',
         '-movflags','+faststart','-t',str(DURATION),'-metadata','title=Për Ismën — Pesë vjet bashkë',str(output)]
with (OUT/'encode.log').open('w') as log:
    process=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=log)
    for n in range(round(DURATION*FPS)):
        t=n/FPS;active=[s for s in scenes if s['start']<=t<s['start']+s['duration']]
        frame=scene_frame(active[0],t-active[0]['start'])
        if len(active)==2:
            weight=min(1,(t-active[1]['start'])/FADE);weight=weight*weight*(3-2*weight)
            frame=Image.blend(frame,scene_frame(active[1],t-active[1]['start']),weight)
        brightness=min(1,t/1.1,max(0,(DURATION-t)/1.5))
        if brightness<1:frame=Image.blend(Image.new('RGB',(W,H)),frame,brightness)
        process.stdin.write(frame.tobytes())
        if n%(FPS*5)==0:print('ENCODE_SECONDS',int(t),flush=True)
    process.stdin.close();code=process.wait()
    assert code==0,(code,(OUT/'encode.log').read_text())
(OUT/'film-details.json').write_text(json.dumps({'language':'Albanian','recipient':'Isma','duration':DURATION,
    'resolution':[W,H],'fps':FPS,'original_music':True,'file':str(output)},ensure_ascii=False,indent=2),encoding='utf-8')
print('VIDEO_READY',output,output.stat().st_size,flush=True)
