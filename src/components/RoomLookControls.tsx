"use client";
// @refresh reset

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

type RoomLookControlsProps = {
  enabled: boolean;
  freeYaw?: boolean;
};

const DEG = THREE.MathUtils.degToRad;

// Horizontal look limits
const MAX_YAW = DEG(78);

// Vertical look limits
const MAX_LOOK_UP = DEG(28);
const MAX_LOOK_DOWN = DEG(22);

// Drag sensitivity
const MOUSE_SENSITIVITY = 0.0032;
const TOUCH_SENSITIVITY = 0.005;

export default function RoomLookControls({ enabled, freeYaw = false }: RoomLookControlsProps) {
  /*
   * Instead of taking camera/gl directly from the hook,
   * we take R3F's getter.
   *
   * This avoids React's hook immutability warning when
   * doing the imperative Three.js camera operations.
   */
  const getThree = useThree((state) => state.get);

  const dragging = useRef(false);
  const pointerId = useRef<number | null>(null);

  const previousX = useRef(0);
  const previousY = useRef(0);

  const baseYaw = useRef(0);
  const basePitch = useRef(0);

  const yaw = useRef(0);
  const pitch = useRef(0);
  useEffect(() => {
    if (!enabled) {
      dragging.current = false;
      pointerId.current = null;
      return;
    }

    const state = getThree();

    const camera = state.camera;
    const canvas = state.gl.domElement;

    /*
     * CameraController has already placed and aimed the
     * camera when this component becomes enabled.
     *
     * We use that direction as the CENTER of the user's
     * allowed look range.
     */
    const initialDirection = new THREE.Vector3();

    camera.getWorldDirection(initialDirection);
    initialDirection.normalize();

    const initialPitch = Math.asin(
      THREE.MathUtils.clamp(initialDirection.y, -1, 1),
    );

    const initialYaw = Math.atan2(initialDirection.x, -initialDirection.z);

    baseYaw.current = initialYaw;
    basePitch.current = initialPitch;

    yaw.current = initialYaw;
    pitch.current = initialPitch;

    const updateCameraDirection = () => {
      const currentState = getThree();
      const currentCamera = currentState.camera;

      const cosPitch = Math.cos(pitch.current);

      const direction = new THREE.Vector3(
        Math.sin(yaw.current) * cosPitch,
        Math.sin(pitch.current),
        -Math.cos(yaw.current) * cosPitch,
      );

      const target = currentCamera.position.clone().add(direction);

      /*
       * Camera POSITION never changes.
       *
       * Only its viewing direction changes.
       */
      currentCamera.lookAt(target);

      /*
       * Your Canvas uses frameloop="demand",
       * so request another frame manually.
       */
      currentState.invalidate();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (pointerId.current !== null) return;
      event.preventDefault();

      dragging.current = true;
      pointerId.current = event.pointerId;

      previousX.current = event.clientX;
      previousY.current = event.clientY;

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture isn't available everywhere.
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;

      if (pointerId.current !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - previousX.current;

      const deltaY = event.clientY - previousY.current;

      previousX.current = event.clientX;
      previousY.current = event.clientY;

      const sensitivity =
        event.pointerType === "touch" ? TOUCH_SENSITIVITY : MOUSE_SENSITIVITY;

      // ---------------------------------------------
      // LEFT / RIGHT
      // ---------------------------------------------

      yaw.current -= deltaX * sensitivity;

      if (!freeYaw) yaw.current = THREE.MathUtils.clamp(
        yaw.current,
        baseYaw.current - MAX_YAW,
        baseYaw.current + MAX_YAW,
      );

      // ---------------------------------------------
      // UP / DOWN
      // ---------------------------------------------

      pitch.current -= deltaY * sensitivity;

      pitch.current = THREE.MathUtils.clamp(
        pitch.current,
        basePitch.current - MAX_LOOK_DOWN,
        basePitch.current + MAX_LOOK_UP,
      );

      updateCameraDirection();
    };

    const stopDragging = (event: PointerEvent) => {
      if (pointerId.current !== null && pointerId.current !== event.pointerId) {
        return;
      }

      dragging.current = false;

      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore unsupported pointer capture.
      }

      pointerId.current = null;
    };

    canvas.addEventListener("pointerdown", handlePointerDown);

    canvas.addEventListener("pointermove", handlePointerMove);

    canvas.addEventListener("pointerup", stopDragging);

    canvas.addEventListener("pointercancel", stopDragging);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);

      canvas.removeEventListener("pointermove", handlePointerMove);

      canvas.removeEventListener("pointerup", stopDragging);

      canvas.removeEventListener("pointercancel", stopDragging);

      dragging.current = false;
      pointerId.current = null;
    };
  }, [enabled, freeYaw, getThree]);

  return null;
}
