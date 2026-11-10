"use client";
import { useEffect, useRef, useState } from "react";

/** Sparse, soft pentatonic notes with long overlapping decays. */
export default function AmbientSound({ walking }: { walking: boolean }) {
  const [enabled, setEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const enabledRef = useRef(true);
  const start = useRef<() => void>(() => {});
  function toggle() {
    // A blocked context needs enabling, not muting on its first click.
    enabledRef.current = !(enabledRef.current && context.current?.state === 'running');
    setEnabled(enabledRef.current);
    const ctx = context.current;
    if (ctx && master.current) {
      master.current.gain.setTargetAtTime(enabledRef.current ? .6 : 0, ctx.currentTime, .3);
    }
    if (enabledRef.current) start.current();
  }
  useEffect(() => {
    let disposed = false;
    let ctx: AudioContext | null = null;
    const syncState = () => {
      if (!disposed) setRunning(ctx?.state === 'running');
    };
    const resume = () => {
      if (!ctx || !enabledRef.current || document.hidden) return;
      // A blocked resume may remain pending until a user gesture. Keep retries
      // available and never treat autoplay blocking as an unavailable device.
      void ctx.resume().then(syncState).catch(syncState);
    };
    const unlock = (event: Event) => {
      // The sound button owns its click; otherwise pointerdown can start audio
      // before onClick and turn the very same activation into a mute.
      if (event.target instanceof Element && event.target.closest('[data-sound-toggle]')) return;
      resume();
    };
    const visibility = () => {
      if (document.hidden) void ctx?.suspend().catch(syncState);
      else resume();
    };
    try {
      ctx = new AudioContext();
      context.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = enabledRef.current ? .6 : 0;
      gain.connect(ctx.destination);
      master.current = gain;
      ctx.addEventListener('statechange', syncState);
      start.current = resume;
      // Attempt playback on the introduction, including browsers that already
      // grant autoplay. The first permitted gesture is the fallback.
      resume();
    } catch {
      queueMicrotask(() => { if (!disposed) setUnavailable(true); });
    }
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('pointerup', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('pointerup', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      ctx?.removeEventListener('statechange', syncState);
      start.current = () => {};
      context.current = null;
      master.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!enabled || !running || !walking || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  },[enabled,running,walking]);
  useEffect(() => {
    if (!enabled || !running) return;
    const melody = [523.25, 659.25, 783.99, 587.33, 659.25, 880, 783.99, 659.25, 587.33, 523.25];
    let index = 0;
    const play = () => {
      const ctx = context.current; const output = master.current;
      if (!ctx || ctx.state !== 'running' || !output || document.hidden) return;
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
  }, [enabled, running]);
  const audible = enabled && running && !unavailable;
  return <button data-sound-toggle className="sound-button" onClick={toggle} aria-pressed={audible} disabled={unavailable} aria-label={unavailable ? 'Sound unavailable' : audible ? 'Mute sound' : 'Enable sound'}>{unavailable ? 'Sound unavailable' : audible ? 'Sound on' : enabled ? 'Enable sound' : 'Sound off'}</button>;
}
