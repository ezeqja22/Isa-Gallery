"use client";

import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";

import Room from "@/components/Room";
import CameraController from "@/components/CameraController";
import LoadingScreen from "@/components/LoadingScreen";

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

      {showRoomControls && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 100,
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={changeRoom}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Change Room
          </button>

          <button
            onClick={goBack}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Go Back
          </button>
        </div>
      )}

      <Canvas
        frameloop="demand"
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
        <ambientLight intensity={2} />

        <Suspense fallback={null}>
          <CameraController
            view={view}
            onTransitionComplete={handleCameraTransitionComplete}
          />

          <Room
            position={ROOMS.room1.position}
            onEnter={canSelectRoom ? () => enterRoom("room1") : undefined}
          />

          <Room
            position={ROOMS.room2.position}
            onEnter={canSelectRoom ? () => enterRoom("room2") : undefined}
          />

          <Preload all />
        </Suspense>
      </Canvas>
    </main>
  );
}
