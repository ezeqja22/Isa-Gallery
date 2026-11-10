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

type CameraPoint = {
  x: number;
  y: number;
  z: number;
};

type CameraWaypoint = {
  position: CameraPoint;
  target: CameraPoint;
  duration: number;
};

/*
 * ==========================================================
 * STAIR / ARCH POSITION
 * ==========================================================
 *
 * Based on the current Room 1 geometry.
 *
 * Three.js:
 *
 * X = left/right
 * Y = vertical
 * Z = forward/backward
 *
 * Your arch is on the +X wall and toward the back half
 * of Room 1.
 *
 * If we later need to shift the path sideways along the
 * right wall, THIS is the main value we'll tune.
 */
const ARCH_Z = -4.0;

/*
 * ==========================================================
 * ROOM 1 -> ROOM 2
 * ==========================================================
 */

const ROOM1_TO_ROOM2_PATH: CameraWaypoint[] = [
  /*
   * 1 — Turn and line up with the arch/stairs.
   */
  {
    position: {
      x: 5.8,
      y: -0.9,
      z: ARCH_Z,
    },

    target: {
      x: 10.3,
      y: -0.9,
      z: ARCH_Z,
    },

    duration: 1.5,
  },

  /*
   * 2 — Go through the arch and begin climbing.
   */
  {
    position: {
      x: 11.2,
      y: -0.7,
      z: ARCH_Z,
    },

    target: {
      x: 14.5,
      y: 0.3,
      z: ARCH_Z,
    },

    duration: 1.0,
  },

  /*
   * 3 — Finish the climb and land EXACTLY
   * at the official Room 2 camera position.
   */
  {
    position: {
      x: 18.3,
      y: 0.9,
      z: ARCH_Z,
    },

    target: {
      x: ROOMS.room2.camera.target.x,
      y: ROOMS.room2.camera.target.y,
      z: ROOMS.room2.camera.target.z,
    },

    duration: 1.5,
  },
];

/*
 * ==========================================================
 * ROOM 2 -> ROOM 1
 *
 * Separate path rather than simply reversing the array.
 *
 * This lets the camera look naturally DOWN the staircase.
 * ==========================================================
 */

const ROOM2_TO_ROOM1_PATH: CameraWaypoint[] = [
  /*
   * 1 — Leave Room 2 and descend toward the arch.
   *
   * Stay directly aligned with the staircase.
   */
  {
    position: {
      x: 14.8,
      y: 0.35,
      z: ARCH_Z,
    },

    target: {
      x: 11.5,
      y: -0.55,
      z: ARCH_Z,
    },

    duration: 1.3,
  },

  /*
   * 2 — Continue down and pass straight
   * through the Room 1 arch.
   */
  {
    position: {
      x: 9.0,
      y: -1.0,
      z: ARCH_Z,
    },

    target: {
      x: 5.5,
      y: -0.75,
      z: -2.5,
    },

    duration: 1.1,
  },

  /*
   * 3 — Move back into Room 1 and finish
   * EXACTLY at Room 1's official camera position.
   *
   * This removes the extra correction/glitch
   * after the cinematic path.
   */
  {
    position: {
      x: ROOMS.room1.camera.position.x,
      y: ROOMS.room1.camera.position.y,
      z: ROOMS.room1.camera.position.z,
    },

    target: {
      x: ROOMS.room1.camera.target.x,
      y: ROOMS.room1.camera.target.y,
      z: ROOMS.room1.camera.target.z,
    },

    duration: 1.5,
  },
];

export default function CameraController({
  view,
  onTransitionComplete,
}: CameraControllerProps) {
  const camera = useThree((state) => state.camera);

  const invalidate = useThree((state) => state.invalidate);

  const size = useThree((state) => state.size);

  const prefersReducedMotion = usePrefersReducedMotion();

  /*
   * Remember where we came from.
   *
   * This lets us distinguish:
   *
   * overview -> room1
   *
   * from:
   *
   * room1 -> room2
   */
  const previousView = useRef<GalleryView>("overview");

  /*
   * Current look-at target used by GSAP.
   */
  const lookAtTarget = useRef(new THREE.Vector3());

  const aspect = size.width / size.height;

  const isNarrowScreen = aspect < 1.2;

  const overviewCamera = isNarrowScreen
    ? OVERVIEW_CAMERAS.mobile
    : OVERVIEW_CAMERAS.desktop;

  useEffect(() => {
    const fromView = previousView.current;

    /*
     * Store this immediately so that the NEXT transition
     * knows where it came from.
     */
    previousView.current = view;

    const nextView = view === "overview" ? overviewCamera : ROOMS[view].camera;

    /*
     * ------------------------------------------------------
     * Synchronize lookAtTarget with wherever the user is
     * ACTUALLY looking right now.
     *
     * This matters because RoomLookControls can rotate the
     * camera before the transition starts.
     *
     * Without this, clicking Change Room could cause an
     * immediate snap in viewing direction.
     * ------------------------------------------------------
     */

    const currentDirection = new THREE.Vector3();

    camera.getWorldDirection(currentDirection);

    lookAtTarget.current
      .copy(camera.position)
      .add(currentDirection.multiplyScalar(10));

    /*
     * Reduced motion:
     *
     * Skip the cinematic route entirely and move directly
     * to the destination.
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
     * Is this a staircase transition?
     */
    const goingUpstairs = (fromView === "room1" || fromView === "overview") && view === "room2";

    const goingDownstairs = fromView === "room2" && (view === "room1" || view === "overview");

    /*
     * ======================================================
     * STAIRCASE TRANSITION
     * ======================================================
     */

    if (goingUpstairs || goingDownstairs) {
      const path = goingUpstairs
 ? [...(fromView === "overview" ? [{...ROOMS.room1.camera, duration:5.2}] : []), ...ROOM1_TO_ROOM2_PATH]
 : [...ROOM2_TO_ROOM1_PATH, ...(view === "overview" ? [{...overviewCamera, duration:3.2}] : [])];

      // One arc-length path avoids stopping and restarting at every stair waypoint.
      const points = [camera.position.clone(), ...path.map(({ position }) =>
        new THREE.Vector3(position.x, position.y, position.z))];
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      const orientations = [camera.quaternion.clone()];
      const aimCamera = camera.clone();
      for (const waypoint of path) {
        aimCamera.position.set(waypoint.position.x, waypoint.position.y, waypoint.position.z);
        aimCamera.lookAt(waypoint.target.x, waypoint.target.y, waypoint.target.z);
        orientations.push(aimCamera.quaternion.clone());
      }
      const progress = { value: 0 };
      const tween = gsap.to(progress, {
        value: 1,
        duration: path.reduce((total, waypoint) => total + waypoint.duration, 0) + 0.6,
        ease: "sine.inOut",
        onUpdate: () => {
          camera.position.copy(curve.getPointAt(progress.value));
          camera.position.y += Math.sin(progress.value * Math.PI) * Math.sin(progress.value * (path.reduce((sum, p) => sum + p.duration, 0) + .6) / .64 * Math.PI * 2) * .018;
          // Interpolate rotations rather than a target that might pass through the camera.
          const parameter = curve.getUtoTmapping(progress.value, 0) * (orientations.length - 1);
          const index = Math.min(Math.floor(parameter), orientations.length - 2);
          const local = THREE.MathUtils.smoothstep(parameter - index, 0, 1);
          camera.quaternion.slerpQuaternions(orientations[index], orientations[index + 1], local);
          invalidate();
        },
        onComplete: () => {
          camera.position.set(nextView.position.x, nextView.position.y, nextView.position.z);
          lookAtTarget.current.set(nextView.target.x, nextView.target.y, nextView.target.z);
          camera.lookAt(lookAtTarget.current);
          invalidate();
          onTransitionComplete?.();
        },
      });
      return () => { tween.kill(); };
    }

    /*
     * ======================================================
     * NORMAL TRANSITIONS
     *
     * overview -> room
     * room -> overview
     * ======================================================
     */

    const timeline = gsap.timeline({
      defaults: {
        duration: fromView === "overview" || view === "overview" ? 5.2 : nextView.duration,

        ease: "power2.inOut",
      },

      onUpdate: () => {
        const travel = timeline.progress();
        camera.position.y += Math.sin(travel * Math.PI) * Math.sin(travel * 5.2 / .64 * Math.PI * 2) * .018;
        camera.lookAt(lookAtTarget.current);

        invalidate();
      },

      onComplete: () => {
        camera.lookAt(lookAtTarget.current);

        invalidate();

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
