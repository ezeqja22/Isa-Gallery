"use client";

import { Suspense, useCallback, useState } from "react";

import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";

import Room from "@/components/Room";
import CameraController from "@/components/CameraController";
import LoadingScreen from "@/components/LoadingScreen";
import WebGLFallback from "@/components/WebGLFallback";
import WebGLContextMonitor from "@/components/WebGLContextMonitor";

import {
  GalleryView,
  RoomView,
  ROOMS,
  OVERVIEW_CAMERAS,
} from "@/config/gallery";

export default function Home() {
  /*
    Current camera/gallery view.

    Possible values:
    "overview"
    "room1"
    "room2"
  */
  const [view, setView] = useState<GalleryView>("overview");

  /*
    Used when changing directly from one room
    to another.

    Example:

    room1
      ↓
    overview
      ↓
    pendingRoom = room2
      ↓
    room2
  */
  const [pendingRoom, setPendingRoom] = useState<RoomView | null>(null);

  /*
    Prevents the user from triggering another
    navigation while the camera is already moving.
  */
  const [isTransitioning, setIsTransitioning] = useState(false);

  /*
    Tracks whether the WebGL context has been lost.

    If that happens, we show a fallback screen
    instead of leaving the visitor with a broken
    or black Canvas.
  */
  const [webGLContextLost, setWebGLContextLost] = useState(false);

  /*
    Enter a room from the overview.
  */
  const enterRoom = (room: RoomView) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setView(room);
  };

  /*
    Return from a room to the overview.
  */
  const goBack = () => {
    if (isTransitioning) return;

    setPendingRoom(null);
    setIsTransitioning(true);
    setView("overview");
  };

  /*
    Move from one room to the other.

    We intentionally do:

    current room
        ↓
    overview
        ↓
    other room

    instead of sending the camera directly
    through the walls.
  */
  const changeRoom = () => {
    if (isTransitioning) return;

    if (view === "overview") return;

    const destination: RoomView = view === "room1" ? "room2" : "room1";

    setPendingRoom(destination);
    setIsTransitioning(true);

    /*
      First fly back outside.
    */
    setView("overview");
  };

  /*
    Called every time CameraController finishes
    one camera movement.
  */
  const handleCameraTransitionComplete = useCallback(() => {
    /*
        If we have just reached the overview
        while changing rooms, start the second
        part of the journey.
      */
    if (view === "overview" && pendingRoom) {
      const destination = pendingRoom;

      setPendingRoom(null);
      setView(destination);

      return;
    }

    /*
        Otherwise the entire navigation sequence
        has finished.
      */
    setIsTransitioning(false);
  }, [view, pendingRoom]);

  /*
    WebGL context was lost.
  */
  const handleWebGLContextLost = useCallback(() => {
    setWebGLContextLost(true);
  }, []);

  /*
    WebGL recovered successfully.
  */
  const handleWebGLContextRestored = useCallback(() => {
    setWebGLContextLost(false);
  }, []);

  /*
    Rooms should only be clickable while
    the visitor is sitting in the overview.
  */
  const canSelectRoom = view === "overview" && !isTransitioning;

  /*
    Change Room / Go Back only appear once
    the visitor is fully inside a room.
  */
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
      {/* Asset loading overlay */}
      <LoadingScreen />

      {/* WebGL failure overlay */}
      {webGLContextLost && <WebGLFallback />}

      {/* Controls shown while inside a room */}
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
        /*
          Only render when something changes.

          CameraController calls invalidate()
          during GSAP animations.
        */
        frameloop="demand"
        /*
          Display this if WebGL cannot even
          initialize when Canvas is created.
        */
        fallback={<WebGLFallback />}
        camera={{
          /*
            Start from the desktop overview.

            CameraController will automatically
            move farther back when it detects a
            narrow/mobile viewport.
          */
          position: [
            OVERVIEW_CAMERAS.desktop.position.x,
            OVERVIEW_CAMERAS.desktop.position.y,
            OVERVIEW_CAMERAS.desktop.position.z,
          ],

          fov: 75,

          /*
            Appropriate clipping range for the
            current gallery dimensions.
          */
          near: 0.1,
          far: 100,
        }}
      >
        {/*
          Watches for WebGL context loss after
          the renderer has already started.
        */}
        <WebGLContextMonitor
          onLost={handleWebGLContextLost}
          onRestored={handleWebGLContextRestored}
        />

        <ambientLight intensity={2} />

        {/*
          Assets such as textures and future
          GLTF models may suspend while loading.
        */}
        <Suspense fallback={null}>
          <CameraController
            view={view}
            onTransitionComplete={handleCameraTransitionComplete}
          />

          {/* Room 1 */}
          <Room
            position={ROOMS.room1.position}
            onEnter={canSelectRoom ? () => enterRoom("room1") : undefined}
          />

          {/* Room 2 */}
          <Room
            position={ROOMS.room2.position}
            onEnter={canSelectRoom ? () => enterRoom("room2") : undefined}
          />

          {/*
            Prepare scene assets/materials before
            they become visible for the first time.
          */}
          <Preload all />
        </Suspense>
      </Canvas>
    </main>
  );
}
