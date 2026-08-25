"use client";

import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";

import Painting from "@/components/Painting/Painting";

import type { RoomDimensions } from "@/config/gallery";

type RoomProps = {
  position: [number, number, number];

  dimensions?: RoomDimensions;

  onEnter?: () => void;

  showShell?: boolean;
};

const DEFAULT_DIMENSIONS: RoomDimensions = {
  width: 10,
  depth: 10,
  height: 5,
};

export default function Room({
  position,
  dimensions = DEFAULT_DIMENSIONS,
  onEnter,
  showShell = true,
}: RoomProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { width, depth, height } = dimensions;

  /*
    Positions derived from the actual
    dimensions of the room.
  */
  const backWallZ = -depth / 2;

  const entranceZ = depth / 2 + 0.1;

  const paintingZ = backWallZ + 0.2;

  useCursor(isHovered && Boolean(onEnter));

  const handlePointerEnter = (event: ThreeEvent<PointerEvent>) => {
    if (!onEnter) return;

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
      {showShell && (
        <>
          {/* Floor */}
          <mesh position={[0, -height / 2, 0]}>
            <boxGeometry args={[width, 0.2, depth]} />

            <meshStandardMaterial color="white" />
          </mesh>

          {/* Back Wall */}
          <mesh position={[0, 0, backWallZ]}>
            <boxGeometry args={[width, height, 0.2]} />

            <meshStandardMaterial color="lightgray" />
          </mesh>

          {/* Left Wall */}
          <mesh position={[-width / 2, 0, 0]}>
            <boxGeometry args={[0.2, height, depth]} />

            <meshStandardMaterial color="lightgray" />
          </mesh>

          {/* Right Wall */}
          <mesh position={[width / 2, 0, 0]}>
            <boxGeometry args={[0.2, height, depth]} />

            <meshStandardMaterial color="lightgray" />
          </mesh>

          {/* Ceiling */}
          <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[width, 0.2, depth]} />

            <meshStandardMaterial color="white" />
          </mesh>
        </>
      )}

      {/*
        Painting automatically sits
        near the room's actual back wall.
      */}
      <Painting position={[0, 0, paintingZ]} />

      {/* Entrance interaction area */}
      {onEnter && (
        <mesh
          position={[0, 0, entranceZ]}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <planeGeometry args={[width - 0.4, height - 0.4]} />

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
