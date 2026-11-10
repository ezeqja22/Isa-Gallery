const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/components/ExperienceShell.tsx',s=>s.replace('{!inspecting && <header className="experience-header">','<header className={`experience-header ${inspecting ? "experience-header--inspection" : ""}`}>').replace('</header>}','</header>'));
edit('src/components/AmbientSound.tsx',s=>{
 s=s.replace('useState(false);','useState(true);'); // restore unavailable separately
 s=s.replace('const [unavailable, setUnavailable] = useState(true);','const [unavailable, setUnavailable] = useState(false);');
 const a=s.indexOf('  async function toggle()');const b=s.indexOf('  useEffect(() => {',a);
 s=s.slice(0,a)+`  const enabledRef = useRef(true);
  async function start() {
    try {
      if (!context.current) {
        const ctx = new AudioContext(); context.current = ctx;
        const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); master.current = gain;
      }
      await context.current.resume();
      master.current!.gain.setTargetAtTime(enabledRef.current ? .6 : 0, context.current.currentTime, .3);
    } catch { setUnavailable(true); }
  }
  function toggle() {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    void start();
  }
  useEffect(() => {
    const unlock = () => { void start(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);
`+s.slice(b);
 s=s.replace('    if (!enabled) return;\n    const melody','    const melody').replace('  }, [enabled]);\n  useEffect(() => {','  }, []);\n  useEffect(() => {').replace('else if (enabled) void context.current?.resume();','else void context.current?.resume();').replace('  }, [enabled]);','  }, []);');
 return s.replace("'Turn ambient sound off' : 'Turn ambient sound on'","'Mute sound' : 'Unmute sound'");
});
