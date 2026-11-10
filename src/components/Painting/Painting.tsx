"use client";

import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

type PaintingProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  src?: string;
};

export default function Painting({
  position,
  rotation = [0, 0, 0],
  size = [1.5, 1],
  src = "/paintings/painting1.jpeg",
}: PaintingProps) {
  const texture = useLoader(THREE.TextureLoader, src);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />

      <meshStandardMaterial
        map={texture}
        roughness={0.72}
        metalness={0}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
