"use client";

import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";

import Room from "@/components/Room";
import RoomModel from "@/components/RoomModel";
import CameraController from "@/components/CameraController";
import LoadingScreen from "@/components/LoadingScreen";
import WebGLFallback from "@/components/WebGLFallback";
import WebGLContextMonitor from "@/components/WebGLContextMonitor";
import * as THREE from "three";

import {
  GalleryView,
  RoomView,
  ROOMS,
  OVERVIEW_CAMERAS,
} from "@/config/gallery";

export default function Home() {
  const [view, setView] = useState<GalleryView>("overview");

  const [pendingRoom, setPendingRoom] = useState<RoomView | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const [webGLContextLost, setWebGLContextLost] = useState(false);

  const enterRoom = (room: RoomView) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setView(room);
  };

  const goBack = () => {
    if (isTransitioning) return;

    setPendingRoom(null);
    setIsTransitioning(true);
    setView("overview");
  };

  const changeRoom = () => {
    if (isTransitioning) return;
    if (view === "overview") return;

    const destination: RoomView = view === "room1" ? "room2" : "room1";

    setPendingRoom(destination);
    setIsTransitioning(true);
    setView("overview");
  };

  const handleCameraTransitionComplete = useCallback(() => {
    if (view === "overview" && pendingRoom) {
      const destination = pendingRoom;

      setPendingRoom(null);
      setView(destination);

      return;
    }

    setIsTransitioning(false);
  }, [view, pendingRoom]);

  const handleWebGLContextLost = useCallback(() => {
    setWebGLContextLost(true);
  }, []);

  const handleWebGLContextRestored = useCallback(() => {
    setWebGLContextLost(false);
  }, []);

  const canSelectRoom = view === "overview" && !isTransitioning;

  const showRoomControls = view !== "overview" && !isTransitioning;

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <LoadingScreen />

      {webGLContextLost && <WebGLFallback />}

      {showRoomControls && (
        <div
          style={{
            position: "absolute",
            top: "calc(16px + env(safe-area-inset-top))",
            left: "calc(16px + env(safe-area-inset-left))",
            zIndex: 100,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={changeRoom}
            style={{
              minHeight: 44,
              padding: "10px 18px",
              border: "none",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Change Room
          </button>

          <button
            onClick={goBack}
            style={{
              minHeight: 44,
              padding: "10px 18px",
              border: "none",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Go Back
          </button>
        </div>
      )}

      <Canvas
        frameloop="demand"
        shadows="soft"
        fallback={<WebGLFallback />}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
        camera={{
          position: [
            OVERVIEW_CAMERAS.desktop.position.x,
            OVERVIEW_CAMERAS.desktop.position.y,
            OVERVIEW_CAMERAS.desktop.position.z,
          ],
          fov: 75,
          near: 0.1,
          far: 100,
        }}
      >
        <WebGLContextMonitor
          onLost={handleWebGLContextLost}
          onRestored={handleWebGLContextRestored}
        />

        {/* Warm interior fill */}
        <hemisphereLight
          color="#fff3df"
          groundColor="#6b5742"
          intensity={1.25}
        />

        {/* Warm sunlight through the skylight */}
        <directionalLight
          position={[-9, 12, 7]}
          color="#ffd6a1"
          intensity={2.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-bias={-0.00015}
          shadow-normalBias={0.025}
          shadow-radius={4}
        />

        <Suspense fallback={null}>
          <CameraController
            view={view}
            onTransitionComplete={handleCameraTransitionComplete}
          />

          {/* Blender architecture for Room 1 */}
          <RoomModel position={ROOMS.room1.position} />

          {/* Room 1 interaction layer */}
          <Room
            position={ROOMS.room1.position}
            dimensions={ROOMS.room1.dimensions}
            showShell={false}
            onEnter={canSelectRoom ? () => enterRoom("room1") : undefined}
          />

          {/* Room 2 still uses original R3F geometry */}
          <Room
            position={ROOMS.room2.position}
            dimensions={ROOMS.room2.dimensions}
            onEnter={canSelectRoom ? () => enterRoom("room2") : undefined}
          />

          <Preload all />
        </Suspense>
      </Canvas>
    </main>
  );
}
