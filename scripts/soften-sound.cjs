const fs=require('fs');
let p='src/components/AmbientSound.tsx',s=fs.readFileSync(p,'utf8');
s=s.replace('export default function AmbientSound({ walking }: { walking: boolean })','export default function AmbientSound()');
s=s.replace('/** Quiet synthesized air and harmonic tones: no downloads or repeating audio seam. */','/** Sparse, soft pentatonic notes with long overlapping decays. */');
const start=s.indexOf('        [130.81');const end=s.indexOf('\n      }',start);
s=s.slice(0,start)+s.slice(end);
const a=s.indexOf('  useEffect(() => {');const b=s.indexOf('  useEffect(() => {',a+10);
s=s.slice(0,a)+`  useEffect(() => {
    if (!enabled) return;
    const melody = [523.25, 659.25, 783.99, 587.33, 659.25, 880, 783.99, 659.25, 587.33, 523.25];
    let index = 0;
    const play = () => {
      const ctx = context.current; const output = master.current;
      if (!ctx || !output || document.hidden) return;
      const frequency = melody[index++ % melody.length];
      const now = ctx.currentTime;
      // Rounded attack and a long decay avoid chimes, drones, and percussive thuds.
      [1, 2].forEach((harmonic) => {
        const tone = ctx.createOscillator(); const envelope = ctx.createGain();
        tone.frequency.value = frequency * harmonic;
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(harmonic === 1 ? .055 : .004, now + .3);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + 7);
        tone.connect(envelope); envelope.connect(output); tone.start(now); tone.stop(now + 7.1);
        tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
      });
    };
    play();
    const timer = window.setInterval(play, 3200);
    return () => window.clearInterval(timer);
  }, [enabled]);
`+s.slice(b);fs.writeFileSync(p,s);
p='src/components/ExperienceShell.tsx';s=fs.readFileSync(p,'utf8').replace('<AmbientSound walking={transitioning} />','<AmbientSound />');fs.writeFileSync(p,s);
