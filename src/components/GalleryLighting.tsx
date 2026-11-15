"use client";

import { useMemo } from "react";
import * as THREE from "three";

function ArtworkWash({ x, sideZ }: { x: number; sideZ?: number }) {
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(sideZ === undefined ? x : -9.7, -0.2, sideZ ?? -9.7);
    return object;
  }, [x, sideZ]);
  return <>
    <primitive object={target} />
    <spotLight position={sideZ === undefined ? [x, 2.6, -6] : [-6, 2.6, sideZ]} target={target} color="#fff3df"
      intensity={45} distance={9} angle={0.7} penumbra={1} decay={2} />
  </>;
}

/** One sun and one ambient palette for the whole connected building. */
export default function GalleryLighting({ lowPower = false }: { lowPower?: boolean }) {
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(15, 0, 0);
    return target;
  }, []);

  return (
    <>
      <primitive object={sunTarget} />
      <hemisphereLight color="#fff3df" groundColor="#6b5742" intensity={0.85} />
      <directionalLight
        position={[47, 17.6, -8]}
        target={sunTarget}
        color="#fff2dc"
        intensity={2.4}
        castShadow={!lowPower}
        shadow-mapSize-width={lowPower ? 512 : 2048}
        shadow-mapSize-height={lowPower ? 512 : 2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0001}
        shadow-normalBias={0.018}
        shadow-radius={3}
      />
      {/* Local bounce approximations remain fixed while the visitor travels. */}
      <pointLight position={[0, 2.6, -3]} color="#fff0dc" intensity={48} distance={16} decay={2} />
      <pointLight position={[-6, 1, -6]} color="#e4edff" intensity={16} distance={12} decay={2} />
      {[-6.38, 0, 6.38].map((x) => (
        <ArtworkWash key={x} x={x} />
      ))}
      <pointLight position={[12.5, 1.4, -4]} color="#fff0dc" intensity={9} distance={7} decay={2} />
      {[-6, 0, 5].map(z => <ArtworkWash key={z} x={-9.7} sideZ={z} />)}
      <pointLight position={[7.7, 1.5, -.5]} color="#fff3df" intensity={12} distance={6} />
      {/* Soft fill for the large painting beside the stair entrance. */}
      <pointLight position={[6.5, 1, 4.5]} color="#fff3e5" intensity={42} distance={8} decay={2} />
    </>
  );
}
