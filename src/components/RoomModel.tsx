"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type RoomModelProps = {
  position?: [number, number, number];
};

export default function RoomModel({ position = [0, 0, 0] }: RoomModelProps) {
  const { scene } = useGLTF("/models/room1.glb");

  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const isGlass =
        child.name.startsWith("Glass") ||
        child.material?.name === "SkylightGlass";

      if (isGlass) {
        child.castShadow = false;
        child.receiveShadow = true;
      } else {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return <primitive object={clonedScene} position={position} />;
}

useGLTF.preload("/models/room1.glb");
