const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/components/RoomModel.tsx',s=>s.replace('"use client";','"use client";\nimport GalleryIntroduction from "./GalleryIntroduction";').replace('<GalleryLabels scene={clonedScene} />','<GalleryLabels scene={clonedScene} /><GalleryIntroduction />'));
edit('src/components/AmbientSound.tsx',s=>s.replace('function AmbientSound()','function AmbientSound({ walking }: { walking: boolean })').replace('  useEffect(() => {\n    if (!enabled) return;',`  useEffect(() => {
    if (!enabled || !walking || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const step = () => {
      const ctx = context.current; const output = master.current;
      if (!ctx || !output || document.hidden) return;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .13), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length/5));
      const source=ctx.createBufferSource(); source.buffer=buffer;
      const filter=ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=320;
      const gain=ctx.createGain(); gain.gain.value=.1;
      source.connect(filter);filter.connect(gain);gain.connect(output);source.start();
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    };
    const timer=window.setInterval(step,640);return()=>window.clearInterval(timer);
  },[enabled,walking]);
  useEffect(() => {
    if (!enabled) return;`));
edit('src/components/ExperienceShell.tsx',s=>s.replace('<AmbientSound />','<AmbientSound walking={transitioning} />'));
edit('src/components/GalleryLighting.tsx',s=>s.replace('function ArtworkWash({ x }: { x: number })','function ArtworkWash({ x, sideZ }: { x: number; sideZ?: number })').replace('object.position.set(x, -0.2, -9.7);','object.position.set(sideZ === undefined ? x : -9.7, -0.2, sideZ ?? -9.7);').replace('}, [x]);','}, [x, sideZ]);').replace('position={[x, 2.6, -6]}','position={sideZ === undefined ? [x, 2.6, -6] : [-6, 2.6, sideZ]}').replace('{/* Soft fill for the large painting beside the stair entrance. */}','{[-6, 0, 5].map(z => <ArtworkWash key={z} x={-9.7} sideZ={z} />)}\n      <pointLight position={[-6.5, 1.5, 1]} color="#fff3df" intensity={12} distance={6} />\n      {/* Soft fill for the large painting beside the stair entrance. */}'));
