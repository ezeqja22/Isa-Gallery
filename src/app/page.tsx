"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import ExperienceShell from "@/components/ExperienceShell";
import LoadingScreen from "@/components/LoadingScreen";
import LightweightGallery from "@/components/LightweightGallery";
import ArtworkInspector from "@/components/ArtworkInspector";
import type { Artwork } from "@/config/artworks";
import type { GalleryView, RoomView } from "@/config/gallery";

// Do not download/evaluate Three.js, GLTF loaders or create WebGL on the introduction.
const GalleryCanvas = dynamic(() => import("@/components/GalleryCanvas"), { ssr: false });

function isConstrainedDevice(): boolean {
  const device = navigator as Navigator & { deviceMemory?: number };
  return window.matchMedia("(pointer: coarse)").matches ||
    (typeof device.deviceMemory === "number" && device.deviceMemory <= 4);
}

export default function Home() {
  const [view, setView] = useState<GalleryView>("overview");
  const [sceneRequested, setSceneRequested] = useState(false);
  const [coreReady, setCoreReady] = useState(false);
  const [room2Ready, setRoom2Ready] = useState(false);
  const [room2Requested, setRoom2Requested] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<RoomView | null>(null);
  const [lowPower, setLowPower] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [progress, setProgress] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [room2Error, setRoom2Error] = useState<string | null>(null);
  const [staticMode, setStaticMode] = useState(false);

  const onCoreReady = useCallback(() => setCoreReady(true), []);
  const onRoom2Ready = useCallback(() => setRoom2Ready(true), []);
  const onProgress = useCallback((value: number) => setProgress(value), []);
  const onFatalError = useCallback((error: Error) => {
    console.error("[Gallery] 3D scene failed:", error);
    setFatalError(error.message || "The 3D gallery could not be initialized.");
  }, []);
  const onRoom2Error = useCallback((error: Error) => {
    console.error("[Gallery] Atelier failed:", error);
    setRoom2Error("The atelier could not be loaded. The collection remains available.");
    setPendingRoom(null);
    setIsTransitioning(false);
  }, []);

  const enterRoom = (room: RoomView) => {
    if (isTransitioning || view === room) return;
    // A failed atelier boundary cannot be retried without remounting the scene.
    // Offer the lightweight collection instead of leaving a permanent spinner.
    if (room === "room2" && room2Error) {
      setStaticMode(true);
      return;
    }
    setSelectedArtwork(null);
    setRoom2Error(null);

    if (!sceneRequested) {
      setLowPower(isConstrainedDevice());
      setPendingRoom(room);
      setRoom2Requested(room === "room2");
      setIsTransitioning(true);
      setSceneRequested(true);
      return;
    }
    if (room === "room2" && !room2Ready) {
      setRoom2Requested(true);
      setPendingRoom(room);
      setIsTransitioning(true);
      return;
    }
    setIsTransitioning(true);
    setView(room);
  };

  useEffect(() => {
    if (!sceneRequested || !coreReady || !pendingRoom) return;
    if (pendingRoom === "room2" && !room2Ready) return;
    setView(pendingRoom);
    setPendingRoom(null);
  }, [sceneRequested, coreReady, pendingRoom, room2Ready]);

  // High-capability devices download the atelier after the first room is usable.
  // On constrained devices it stays unloaded until the visitor requests it.
  useEffect(() => {
    if (!sceneRequested || !coreReady || lowPower || room2Requested) return;
    const timer = window.setTimeout(() => setRoom2Requested(true), 1800);
    return () => window.clearTimeout(timer);
  }, [sceneRequested, coreReady, lowPower, room2Requested]);

  const goHome = () => {
    if (isTransitioning || view === "overview") return;
    setSelectedArtwork(null);
    setIsTransitioning(true);
    setView("overview");
  };

  const finishTransition = useCallback(() => setIsTransitioning(false), []);
  const selectArtwork = useCallback((artwork: Artwork) => {
    setSelectedArtwork(artwork);
  }, []);

  const resetToIntroduction = () => {
    setStaticMode(false);
    setFatalError(null);
    setRoom2Error(null);
    setSceneRequested(false);
    setCoreReady(false);
    setRoom2Ready(false);
    setRoom2Requested(false);
    setPendingRoom(null);
    setSelectedArtwork(null);
    setIsTransitioning(false);
    setProgress(0);
    setView("overview");
  };

  if (staticMode) {
    return <LightweightGallery onHome={resetToIntroduction} />;
  }

  if (fatalError) {
    return (
      <main className="gallery-app gallery-error-view" role="alert">
        <div className="gallery-error-message">
          <p className="eyebrow">STILL / GALLERY</p>
          <h1>We couldn’t open the 3D gallery.</h1>
          <p className="gallery-error-detail">{fatalError}</p>
          <div className="gallery-error-actions">
            <button className="menu-button" onClick={resetToIntroduction}>Return and retry 3D</button>
            <button className="menu-button" onClick={() => setStaticMode(true)}>View paintings without 3D</button>
          </div>
        </div>
      </main>
    );
  }

  const initialLoading = sceneRequested && view === "overview" &&
    (!coreReady || pendingRoom !== null);
  const waitingForAtelier = view !== "overview" && pendingRoom === "room2";

  return (
    <main className="gallery-app">
      {!sceneRequested && <div className="gallery-intro-poster" aria-hidden="true" />}

      {sceneRequested && (
        <GalleryCanvas
          view={view}
          lowPower={lowPower}
          transitioning={isTransitioning}
          inspecting={selectedArtwork !== null}
          loadRoom2={room2Requested}
          room2Ready={room2Ready}
          onCoreReady={onCoreReady}
          onRoom2Ready={onRoom2Ready}
          onRoom2Error={onRoom2Error}
          onFatalError={onFatalError}
          onTransitionComplete={finishTransition}
          onArtworkSelect={selectArtwork}
          onEnterRoom={enterRoom}
          onProgress={onProgress}
        />
      )}

      <ExperienceShell
        view={view}
        transitioning={isTransitioning}
        inspecting={selectedArtwork !== null}
        busy={sceneRequested && !coreReady}
        onEnter={enterRoom}
        onHome={goHome}
        onArtwork={selectArtwork}
        onStaticMode={() => setStaticMode(true)}
      />

      {initialLoading && (
        <LoadingScreen
          progress={progress}
          message={coreReady ? "Preparing the atelier…" : "Preparing the gallery…"}
          onFallback={() => setStaticMode(true)}
        />
      )}

      {waitingForAtelier && !room2Error && (
        <div className="gallery-room-notice" role="status">
          Preparing the atelier… <button onClick={() => {
            setPendingRoom(null);
            setIsTransitioning(false);
          }}>Cancel</button>
        </div>
      )}
      {room2Error && (
        <div className="gallery-room-notice" role="alert">
          {room2Error} <button onClick={() => setStaticMode(true)}>View the paintings</button>
        </div>
      )}

      {selectedArtwork && (
        <ArtworkInspector
          key={selectedArtwork.id}
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
        />
      )}
    </main>
  );
}
