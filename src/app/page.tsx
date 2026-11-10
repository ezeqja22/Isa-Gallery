"use client";

import { Suspense, useCallback, useState } from "react";

import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";

import HallwayModel, { SceneReady } from "@/components/HallwayModel";
import Room from "@/components/Room";
import RoomModel from "@/components/RoomModel";
import CameraController from "@/components/CameraController";
import ExperienceShell from "@/components/ExperienceShell";
import LoadingScreen from "@/components/LoadingScreen";
import WebGLFallback from "@/components/WebGLFallback";
import WebGLContextMonitor from "@/components/WebGLContextMonitor";
import SkyBackground from "@/components/SkyBackground";
import RoomLookControls from "@/components/RoomLookControls";
import ArtworkInspector from "@/components/ArtworkInspector";
import Room2Model from "@/components/Room2Model";
import StudioLighting from "@/components/StudioLighting";
import StaticShadows from "@/components/StaticShadows";
import GalleryLighting from "@/components/GalleryLighting";

import type { Artwork } from "@/config/artworks";

import {
  GalleryView,
  RoomView,
  ROOMS,
  OVERVIEW_CAMERAS,
} from "@/config/gallery";

export default function Home() {
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const [view, setView] = useState<GalleryView>("overview");

  const [isTransitioning, setIsTransitioning] = useState(false);

  const [webGLContextLost, setWebGLContextLost] = useState(false);

  /*
   * The artwork currently being inspected.
   *
   * null = normal gallery mode
   * Artwork = inspection mode
   */
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const enterRoom = (room: RoomView) => {
    if (isTransitioning || view === room) return;

    setSelectedArtwork(null);

    setIsTransitioning(true);
    setView(room);
  };

  const goBack = () => {
    if (isTransitioning || view === "overview") return;

    setSelectedArtwork(null);

    setIsTransitioning(true);
    setView("overview");
  };

  const handleCameraTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const handleWebGLContextLost = useCallback(() => {
    setWebGLContextLost(true);
  }, []);

  const handleWebGLContextRestored = useCallback(() => {
    setWebGLContextLost(false);
  }, []);

  const handleArtworkSelect = (artwork: Artwork) => {
    /*
     * Don't allow paintings to open while
     * the camera is moving.
     */
    if (isTransitioning) return;

    setSelectedArtwork(artwork);
  };

  const closeArtwork = () => {
    setSelectedArtwork(null);
  };

  const canSelectRoom = view === "overview" && !isTransitioning;

  /*
   * Hide room navigation while we're
   * inspecting a painting.
   */
  /*
   * Room-look controls must stop while
   * the painting inspection UI is open.
   */
  const roomLookEnabled =
    view !== "overview" && !isTransitioning && selectedArtwork === null;

  /*
   * Paintings should only be clickable
   * while actually inside Room 1.
   */
  const artworkInteractionEnabled =
    view === "room1" && !isTransitioning && selectedArtwork === null;

  return (
    <main
      style={{
        width: "100vw",
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <LoadingScreen ready={sceneReady} />

      {webGLContextLost && <WebGLFallback />}

      {/* ==================================================
          NORMAL ROOM CONTROLS
          ================================================== */}

      <div inert={!sceneReady}><ExperienceShell view={view} transitioning={isTransitioning} inspecting={selectedArtwork !== null} onEnter={enterRoom} onHome={goBack} onArtwork={handleArtworkSelect} /></div>

      {selectedArtwork && (
        <ArtworkInspector
          key={selectedArtwork.id}
          artwork={selectedArtwork}
          onClose={closeArtwork}
        />
      )}

      {/* ==================================================
          THREE.JS
          ================================================== */}

      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        shadows="soft"
        fallback={<WebGLFallback />}
        style={{
          touchAction: "none",
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
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure = 1;
        }}
      >
        <WebGLContextMonitor
          onLost={handleWebGLContextLost}
          onRestored={handleWebGLContextRestored}
        />

        <GalleryLighting />
        <SkyBackground visible />

        <Suspense fallback={null}>
          <HallwayModel />
          <CameraController
            view={view}
            onTransitionComplete={handleCameraTransitionComplete}
          />

          {/* Camera can rotate only in normal room mode */}
          <RoomLookControls enabled={roomLookEnabled} freeYaw={view === "room2"} />
          <StudioLighting />

          {/* ==================================================
              BLENDER ROOM 1

              Paintings become interactive here.
              ================================================== */}

          <RoomModel
            position={ROOMS.room1.position}
            onArtworkSelect={handleArtworkSelect}
            artworkInteractionEnabled={artworkInteractionEnabled}
          />

          {/* Room 1 interaction shell */}
          <Room
            position={ROOMS.room1.position}
            dimensions={ROOMS.room1.dimensions}
            showShell={false}
            onEnter={canSelectRoom ? () => enterRoom("room1") : undefined}
          />

          {/* Actual Blender architecture for Room 2 */}
          <Room2Model position={ROOMS.room2.position} />

          {/* Invisible Room 2 overview interaction area */}
          <Room
            position={ROOMS.room2.position}
            dimensions={ROOMS.room2.dimensions}
            showShell={false}
            onEnter={canSelectRoom ? () => enterRoom("room2") : undefined}
          />

          <StaticShadows />
          <Preload all />
          <SceneReady onReady={handleSceneReady} />
        </Suspense>
      </Canvas>
    </main>
  );
}





