"use client";

import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

import Painting from "@/components/Painting/Painting";

type RoomProps = {
  position: [number, number, number];
  onEnter?: () => void;
};

export default function Room({ position, onEnter }: RoomProps) {
  const [isHovered, setIsHovered] = useState(false);

  /*
    The cursor becomes a pointer only when:

    1. The entrance is currently hovered.
    2. The room is actually interactive.

    When onEnter becomes undefined after entering a room,
    useCursor automatically restores the normal cursor.
  */
  useCursor(isHovered && Boolean(onEnter));

  const handlePointerEnter = () => {
    if (!onEnter) return;

    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onEnter) return;

    event.stopPropagation();

    /*
      Reset hover immediately before navigation.

      This prevents the entrance from remaining in a
      "hovered" state while the camera starts moving.
    */
    setIsHovered(false);

    onEnter();
  };

  return (
    <group position={position}>
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

      {/* Painting */}
      <Painting position={[0, 0, -4.8]} />

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

      {/* Clickable room entrance */}
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
