"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import gsap from "gsap";

type CameraControllerProps = {
  room: number;
};

export default function CameraController({ room }: CameraControllerProps) {
  const { camera } = useThree();

  useEffect(() => {
    const targetX = room === 1 ? 0 : 15;

    gsap.to(camera.position, {
      x: targetX,
      duration: 2,
      ease: "power2.inOut",
    });
  }, [room, camera]);

  return null;
}
