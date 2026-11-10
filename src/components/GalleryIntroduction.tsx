"use client";
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GALLERY_INTRO } from '@/config/galleryIntro';
export default function GalleryIntroduction() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0,0,1024,512);
    ctx.fillStyle = '#655133'; ctx.fillRect(70,168,150,3);
    ctx.fillStyle = '#302a20'; ctx.font = '54px Georgia'; ctx.fillText(GALLERY_INTRO.title,70,135);
    ctx.fillStyle = '#3c3529'; ctx.font = '27px Georgia';
    GALLERY_INTRO.lines.forEach((line,i) => ctx.fillText(line,70,230+i*54));
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    setTexture(map); return () => map.dispose();
  }, []);
  if (!texture) return null;
  return <mesh position={[3.85,1.45,10.18]}><planeGeometry args={[1.9,.95]} /><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} /></mesh>;
}
