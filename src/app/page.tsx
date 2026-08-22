"use client";

import { useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";

import Room from "@/components/Room";
import CameraController from "@/components/CameraController";

import {
  GalleryView,
  RoomView,
  ROOMS,
  OVERVIEW_CAMERA,
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

    // First fly back outside.
    setView("overview");
  };

  const handleCameraTransitionComplete = useCallback(() => {
    /*
      If we have returned to the overview because
      the user pressed "Change Room", immediately
      start flying into the other room.
    */
    if (view === "overview" && pendingRoom) {
      const destination = pendingRoom;

      setPendingRoom(null);
      setView(destination);

      return;
    }

    /*
      Otherwise the complete transition is finished.
    */
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
        camera={{
          position: [
            OVERVIEW_CAMERA.position.x,
            OVERVIEW_CAMERA.position.y,
            OVERVIEW_CAMERA.position.z,
          ],
          fov: 75,
        }}
      >
        <ambientLight intensity={2} />

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
      </Canvas>
    </main>
  );
}
