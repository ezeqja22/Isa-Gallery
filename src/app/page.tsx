"use client";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
// import { OrbitControls } from "@react-three/drei";
import Room from "@/components/Room";
import CameraController from "@/components/CameraController";

export default function Home() {
  const [room, setRoom] = useState(1);

  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <button
        onClick={() => setRoom(room === 1 ? 2 : 1)}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 100,
          padding: "10px 20px",
        }}
      >
        Change Room
      </button>
      <Canvas camera={{ position: [0, 0, 2], fov: 75 }}>
        <ambientLight intensity={2} />
        <CameraController room={room} />

        <Room position={[0, 0, 0]} />
        <Room position={[15, 0, 0]} />
      </Canvas>
    </main>
  );
}
