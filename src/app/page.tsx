"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { Canvas } from "@react-three/fiber";
import {
  loadVisit,
  releaseExcept,
  cancelPendingAssets,
  type AssetSet,
  type Quality,
} from "@/lib/galleryAssets";
import SceneErrorBoundary from "@/components/SceneErrorBoundary";
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
  const [view, setView] = useState<GalleryView>("overview");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [assets, setAssets] = useState<AssetSet | null>(null);
  const [quality, setQuality] = useState<Quality>("high");
  const [initialized, setInitialized] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const requestId = useRef(0);
  const destination = useRef<GalleryView | null>(null);
  const mounted = useRef(true);
  const loadTimer = useRef<number | undefined>(undefined);
  const updateProgress = useCallback(
    (loaded: number, total: number) => setProgress({ loaded, total }),
    [],
  );

  const prepare = useCallback(
    async (
      level: Quality,
      mode: "downstairs" | "upstairs" | "transition",
      next?: GalleryView,
    ) => {
      const id = ++requestId.current;
      setPreparing(true);
      setLoadError("");
      window.clearTimeout(loadTimer.current);
      loadTimer.current = window.setTimeout(() => {
        if (id === requestId.current) {
          cancelPendingAssets();
          setLoadError(
            "The rooms are taking longer than expected. Check your connection, or retry in Low quality.",
          );
        }
      }, 90000);
      try {
        const loaded = await loadVisit(level, mode, updateProgress);
        if (!mounted.current) {
          releaseExcept([]);
          return;
        }
        if (id !== requestId.current) return;
        destination.current = next ?? null;
        setAssets({ ...loaded });
      } catch {
        if (mounted.current && id === requestId.current)
          setLoadError("A room could not be loaded. Please retry your visit.");
      }
    },
    [updateProgress],
  );

  useEffect(() => {
    mounted.current = true;
    const requested = new URLSearchParams(window.location.search).get(
      "quality",
    );
    const memory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    const level: Quality =
      requested === "low" || requested === "balanced" || requested === "high"
        ? requested
        : (memory && memory <= 4) || navigator.hardwareConcurrency <= 4
          ? "balanced"
          : "high";
    const start = window.setTimeout(() => {
      setQuality(level);
      setInitialized(true);
      void prepare(level, "downstairs");
    }, 0);
    return () => {
      mounted.current = false;
      window.clearTimeout(start);
      window.clearTimeout(loadTimer.current);
      cancelPendingAssets();
      releaseExcept([]);
    };
  }, [prepare]);

  useEffect(() => {
    if (assets) releaseExcept(Object.values(assets));
  }, [assets]);
  const handleSceneReady = useCallback(() => {
    window.clearTimeout(loadTimer.current);
    setSceneReady(true);
    setPreparing(false);
    setLoadError("");
    if (destination.current) {
      setView(destination.current);
      destination.current = null;
      setIsTransitioning(true);
    }
  }, []);

  const wasTransitioning = useRef(false);
  useEffect(() => {
    if (wasTransitioning.current && !isTransitioning)
      void prepare(quality, view === "room2" ? "upstairs" : "downstairs");
    wasTransitioning.current = isTransitioning;
  }, [isTransitioning, prepare, quality, view]);

  const [webGLContextLost, setWebGLContextLost] = useState(false);

  /*
   * The artwork currently being inspected.
   *
   * null = normal gallery mode
   * Artwork = inspection mode
   */
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const enterRoom = (room: RoomView) => {
    if (isTransitioning || preparing || view === room) return;

    setSelectedArtwork(null);

    void prepare(
      quality,
      room === "room2" || view === "room2" ? "transition" : "downstairs",
      room,
    );
  };

  const goBack = () => {
    if (isTransitioning || preparing || view === "overview") return;

    setSelectedArtwork(null);

    void prepare(
      quality,
      view === "room2" ? "transition" : "downstairs",
      "overview",
    );
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
      <LoadingScreen ready={sceneReady} progress={progress} error={loadError} />
      {sceneReady && preparing && !loadError && (
        <div className="visit-progress" role="status" aria-label="Preparing the next room">
          <span className="visit-spinner" aria-hidden="true" />
        </div>
      )}
      {sceneReady && loadError && (
        <div className="visit-error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {webGLContextLost && <WebGLFallback />}

      {/* ==================================================
          NORMAL ROOM CONTROLS
          ================================================== */}

      <div inert={!sceneReady}>
        <ExperienceShell
          view={view}
          transitioning={isTransitioning || preparing}
          inspecting={selectedArtwork !== null}
          onEnter={enterRoom}
          onHome={goBack}
          onArtwork={handleArtworkSelect}
          quality={quality}
          onQuality={(level) => {
            const url = new URL(window.location.href);
            url.searchParams.set("quality", level);
            window.location.assign(url);
          }}
        />
      </div>

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

      <SceneErrorBoundary>
        {initialized && (
          <Canvas
            frameloop="demand"
            dpr={
              quality === "high"
                ? [1, 1.5]
                : quality === "balanced"
                  ? [1, 1.25]
                  : 1
            }
            shadows="percentage"
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

            <GalleryLighting
              shadowSize={
                quality === "high" ? 4096 : quality === "balanced" ? 2048 : 1024
              }
            />
            <SkyBackground visible quality={quality} />

            {assets && (
              <Suspense fallback={null}>
                <HallwayModel scene={assets.hallway.scene} />
                <CameraController
                  view={view}
                  onTransitionComplete={handleCameraTransitionComplete}
                />

                {/* Camera can rotate only in normal room mode */}
                <RoomLookControls
                  enabled={roomLookEnabled}
                  freeYaw={view === "room2"}
                />
                <StudioLighting />

                {/* ==================================================
              BLENDER ROOM 1

              Paintings become interactive here.
              ================================================== */}

                <RoomModel
                  scene={assets.room1.scene}
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
                <Room2Model
                  scene={assets.room2.scene}
                  position={ROOMS.room2.position}
                />

                {/* Invisible Room 2 overview interaction area */}
                <Room
                  position={ROOMS.room2.position}
                  dimensions={ROOMS.room2.dimensions}
                  showShell={false}
                  onEnter={canSelectRoom ? () => enterRoom("room2") : undefined}
                />

                <StaticShadows revision={assets} quality={quality} />
                <SceneReady revision={assets} onReady={handleSceneReady} />
              </Suspense>
            )}
          </Canvas>
        )}
      </SceneErrorBoundary>
    </main>
  );
}
