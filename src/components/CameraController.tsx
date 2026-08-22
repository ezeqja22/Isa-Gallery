"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";

import { CAMERA_VIEWS, GalleryView } from "@/config/gallery";

type CameraControllerProps = {
  view: GalleryView;
  onTransitionComplete?: () => void;
};

export default function CameraController({
  view,
  onTransitionComplete,
}: CameraControllerProps) {
  const { camera } = useThree();

  const lookAtTarget = useRef(
    new THREE.Vector3(
      CAMERA_VIEWS.overview.target.x,
      CAMERA_VIEWS.overview.target.y,
      CAMERA_VIEWS.overview.target.z,
    ),
  );

  useEffect(() => {
    const nextView = CAMERA_VIEWS[view];

    const timeline = gsap.timeline({
      defaults: {
        duration: nextView.duration,
        ease: "power2.inOut",
      },

      onUpdate: () => {
        camera.lookAt(lookAtTarget.current);
      },

      onComplete: () => {
        camera.lookAt(lookAtTarget.current);
        onTransitionComplete?.();
      },
    });

    timeline.to(
      camera.position,
      {
        x: nextView.position.x,
        y: nextView.position.y,
        z: nextView.position.z,
      },
      0,
    );

    timeline.to(
      lookAtTarget.current,
      {
        x: nextView.target.x,
        y: nextView.target.y,
        z: nextView.target.z,
      },
      0,
    );

    return () => {
      timeline.kill();
    };
  }, [view, camera, onTransitionComplete]);

  return null;
}
