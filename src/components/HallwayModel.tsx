"use client";
import GalleryIntroduction from "./GalleryIntroduction";
import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ceilingMaterial } from './ceilingMaterial';
export default function HallwayModel() {
  const get = useThree(state => state.get);
  const size = useThree(state => state.size);
  useEffect(() => {
    const { camera, invalidate } = get();
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = size.width / size.height < .8 ? 90 : 75;
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [get, size.width, size.height]);
  const { scene } = useGLTF('/models/hallway.glb');
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Only the glazing transmits sunlight; the sash and wall cast shadows.
        object.castShadow = object.name !== 'Hall_Window';
        object.receiveShadow = true;
        if (object.name === 'Hall_Ceiling') {
          object.material = Array.isArray(object.material)
            ? object.material.map(ceilingMaterial)
            : ceilingMaterial(object.material);
        }
      }
    });
    return copy;
  }, [scene]);

  return <>
    <primitive object={model} />
    <GalleryIntroduction />
    <pointLight position={[0, 1, 18]} color="#fff0dc" intensity={38} distance={17} />
    <pointLight position={[3.5, 1, 17.5]} color="#e4eeff" intensity={40} distance={12} />
    {[16, 21].map((z) => <pointLight key={z} position={[-4.15, .3, z]} color="#ffdfaa" intensity={14} distance={6} />)}
  </>;
}

// Mount inside the shared Suspense boundary, after every room has resolved.
export function SceneReady({ onReady }: { onReady: () => void }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const { invalidate } = get();
    // The core room has mounted. Do not block navigation on compileAsync for
    // every shader in the entire house; Three.js compiles as frames are rendered.
    invalidate();
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!cancelled) onReady();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [get, onReady]);
  return null;
}
useGLTF.preload('/models/hallway.glb');
