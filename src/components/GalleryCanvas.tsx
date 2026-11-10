"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import HallwayModel, { SceneReady } from "./HallwayModel";
import RoomModel from "./RoomModel";
import Room2Model from "./Room2Model";
import Room from "./Room";
import CameraController from "./CameraController";
import RoomLookControls from "./RoomLookControls";
import GalleryLighting from "./GalleryLighting";
import StudioLighting from "./StudioLighting";
import SkyBackground from "./SkyBackground";
import StaticShadows from "./StaticShadows";
import WebGLContextMonitor from "./WebGLContextMonitor";
import SceneErrorBoundary from "./SceneErrorBoundary";
import type { Artwork } from "@/config/artworks";
import { GalleryView, type RoomView, ROOMS, OVERVIEW_CAMERAS } from "@/config/gallery";

type Props = {
  view: GalleryView;
  lowPower: boolean;
  transitioning: boolean;
  inspecting: boolean;
  loadRoom2: boolean;
  room2Ready: boolean;
  onCoreReady: () => void;
  onRoom2Ready: () => void;
  onRoom2Error: (error: Error) => void;
  onFatalError: (error: Error) => void;
  onTransitionComplete: () => void;
  onArtworkSelect: (artwork: Artwork) => void;
  onEnterRoom: (room: RoomView) => void;
  onProgress: (progress: number) => void;
};

function AssetProgress({ onProgress }: { onProgress: (progress: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

/** Only marks the optional atelier ready after it has mounted and rendered. */
function WebGLUnavailable({ onError }: { onError: (error: Error) => void }) {
  useEffect(() => {
    onError(new Error("WebGL2 renderer could not start"));
  }, [onError]);
  return null;
}

function Room2Ready({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let second = 0;
    invalidate();
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [invalidate, onReady]);
  return null;
}

export default function GalleryCanvas({
  view, lowPower, transitioning, inspecting, loadRoom2, room2Ready,
  onCoreReady, onRoom2Ready, onRoom2Error, onFatalError,
  onTransitionComplete, onArtworkSelect, onEnterRoom, onProgress,
}: Props) {
  const canSelectRoom = view === "overview" && !transitioning;
  const canLook = view !== "overview" && !transitioning && !inspecting;
  const canSelectArtwork = view === "room1" && !transitioning && !inspecting;

  return (
    <div className="gallery-canvas-host">
      <SceneErrorBoundary onError={onFatalError} fallback={null}>
        <Canvas
          frameloop="demand"
          dpr={lowPower ? 1 : [1, 1.5]}
          shadows={!lowPower}
          gl={{
            antialias: !lowPower,
            powerPreference: lowPower ? "low-power" : "high-performance",
            preserveDrawingBuffer: false,
          }}
          fallback={<WebGLUnavailable onError={onFatalError} />}
          style={{ touchAction: "none" }}
          camera={{
            position: [
              OVERVIEW_CAMERAS.desktop.position.x,
              OVERVIEW_CAMERAS.desktop.position.y,
              OVERVIEW_CAMERAS.desktop.position.z,
            ],
            fov: 75, near: 0.1, far: 100,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
          }}
        >
          <WebGLContextMonitor
            onLost={() => onFatalError(new Error("WebGL context lost"))}
            onRestored={() => { /* A fresh visit can be started from the fallback. */ }}
          />
          <AssetProgress onProgress={onProgress} />
          <GalleryLighting lowPower={lowPower} />
          <StudioLighting />

          {/* The hall and first gallery are the minimum required for entry. */}
          <Suspense fallback={null}>
            <SkyBackground visible lowPower={lowPower} />
            <HallwayModel />
            <RoomModel
              position={ROOMS.room1.position}
              onArtworkSelect={onArtworkSelect}
              artworkInteractionEnabled={canSelectArtwork}
              lowPower={lowPower}
            />
            <Room
              position={ROOMS.room1.position}
              dimensions={ROOMS.room1.dimensions}
              showShell={false}
              onEnter={canSelectRoom ? () => onEnterRoom("room1") : undefined}
            />
            <CameraController view={view} onTransitionComplete={onTransitionComplete} />
            <RoomLookControls enabled={canLook} freeYaw={view === "room2"} />
            <StaticShadows revision={room2Ready ? 1 : 0} />
            <SceneReady onReady={onCoreReady} />
          </Suspense>

          {/* The atelier has its own boundary so it cannot block the first room. */}
          {loadRoom2 && (
            <SceneErrorBoundary onError={onRoom2Error} fallback={null}>
              <Suspense fallback={null}>
                <Room2Model position={ROOMS.room2.position} lowPower={lowPower} />
                <Room
                  position={ROOMS.room2.position}
                  dimensions={ROOMS.room2.dimensions}
                  showShell={false}
                  onEnter={canSelectRoom ? () => onEnterRoom("room2") : undefined}
                />
                <Room2Ready onReady={onRoom2Ready} />
              </Suspense>
            </SceneErrorBoundary>
          )}
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
