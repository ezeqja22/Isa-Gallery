"use client";

import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

import Painting from "@/components/Painting/Painting";

type RoomProps = {
  position: [number, number, number];
  onEnter?: () => void;

  /*
    Whether this component should render its
    temporary boxGeometry architecture.

    Room 1 will set this to false because its
    architecture now comes from Blender.
  */
  showShell?: boolean;
};

export default function Room({
  position,
  onEnter,
  showShell = true,
}: RoomProps) {
  const [isHovered, setIsHovered] = useState(false);

  useCursor(isHovered && Boolean(onEnter));

  const handlePointerEnter = (event: ThreeEvent<PointerEvent>) => {
    if (!onEnter) return;

    /*
      Desktop mouse gets hover feedback.

      Touch devices should not enter a fake
      hover state.
    */
    if (event.pointerType !== "mouse") {
      return;
    }

    setIsHovered(true);
  };

  const handlePointerLeave = (event: ThreeEvent<PointerEvent>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    setIsHovered(false);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onEnter) return;

    event.stopPropagation();

    setIsHovered(false);

    onEnter();
  };

  return (
    <group position={position}>
      {/*
        Temporary R3F architecture.

        Room 1 will hide this because its shell
        now comes from Blender.

        Room 2 continues using it normally.
      */}
      {showShell && (
        <>
          {/* Floor */}
          <mesh position={[0, -2.5, 0]}>
            <boxGeometry args={[10, 0.2, 10]} />

            <meshStandardMaterial color="white" />
          </mesh>

          {/* Back Wall */}
          <mesh position={[0, 0, -5]}>
            <boxGeometry args={[10, 5, 0.2]} />

            <meshStandardMaterial color="lightgray" />
          </mesh>

          {/* Left Wall */}
          <mesh position={[-5, 0, 0]}>
            <boxGeometry args={[0.2, 5, 10]} />

            <meshStandardMaterial color="lightgray" />
          </mesh>

          {/* Right Wall */}
          <mesh position={[5, 0, 0]}>
            <boxGeometry args={[0.2, 5, 10]} />

            <meshStandardMaterial color="lightgray" />
          </mesh>

          {/* Ceiling */}
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[10, 0.2, 10]} />

            <meshStandardMaterial color="white" />
          </mesh>
        </>
      )}

      {/*
        The painting remains separate from
        the Blender room for now.
      */}
      <Painting position={[0, 0, -4.8]} />

      {/* Room entrance interaction area */}
      {onEnter && (
        <mesh
          position={[0, 0, 5.1]}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <planeGeometry args={[9.8, 4.8]} />

          <meshBasicMaterial
            color="white"
            transparent
            opacity={isHovered ? 0.08 : 0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
