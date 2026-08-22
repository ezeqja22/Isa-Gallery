"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";

import { GalleryView, OVERVIEW_CAMERAS, ROOMS } from "@/config/gallery";

import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

type CameraControllerProps = {
  view: GalleryView;
  onTransitionComplete?: () => void;
};

export default function CameraController({
  view,
  onTransitionComplete,
}: CameraControllerProps) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);

  const prefersReducedMotion = usePrefersReducedMotion();

  /*
    Work out whether we're on a narrow viewport.
  */
  const aspect = size.width / size.height;

  const isNarrowScreen = aspect < 1.2;

  const overviewCamera = isNarrowScreen
    ? OVERVIEW_CAMERAS.mobile
    : OVERVIEW_CAMERAS.desktop;

  /*
    The point the camera is currently looking at.
  */
  const lookAtTarget = useRef(
    new THREE.Vector3(
      overviewCamera.target.x,
      overviewCamera.target.y,
      overviewCamera.target.z,
    ),
  );

  useEffect(() => {
    const nextView = view === "overview" ? overviewCamera : ROOMS[view].camera;

    /*
      If the visitor has requested reduced motion,
      don't run the cinematic GSAP camera flight.

      Move directly to the destination instead.
    */
    if (prefersReducedMotion) {
      camera.position.set(
        nextView.position.x,
        nextView.position.y,
        nextView.position.z,
      );

      lookAtTarget.current.set(
        nextView.target.x,
        nextView.target.y,
        nextView.target.z,
      );

      camera.lookAt(lookAtTarget.current);

      invalidate();

      onTransitionComplete?.();

      return;
    }

    /*
      Normal cinematic camera transition.
    */
    const timeline = gsap.timeline({
      defaults: {
        duration: nextView.duration,
        ease: "power2.inOut",
      },

      onUpdate: () => {
        camera.lookAt(lookAtTarget.current);

        /*
          Canvas uses frameloop="demand",
          so GSAP must explicitly request a frame.
        */
        invalidate();
      },

      onComplete: () => {
        camera.lookAt(lookAtTarget.current);

        invalidate();

        onTransitionComplete?.();
      },
    });

    /*
      Animate the camera position.
    */
    timeline.to(
      camera.position,
      {
        x: nextView.position.x,
        y: nextView.position.y,
        z: nextView.position.z,
      },
      0,
    );

    /*
      Animate what the camera looks toward.
    */
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
  }, [
    view,
    overviewCamera,
    camera,
    invalidate,
    onTransitionComplete,
    prefersReducedMotion,
  ]);

  return null;
}
