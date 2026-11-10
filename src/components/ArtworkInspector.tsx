"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { Artwork } from "@/config/artworks";

type ArtworkInspectorProps = {
  artwork: Artwork;
  onClose: () => void;
};

type Rotation = {
  x: number;
  y: number;
};

const MAX_ROTATION_X = THREE.MathUtils.degToRad(22);

const MAX_ROTATION_Y = THREE.MathUtils.degToRad(38);

const ROTATION_SENSITIVITY = 0.006;

/**
 * The actual 3D painting shown in inspection mode.
 */
function InspectableArtwork({
  artwork,
  rotation,
}: {
  artwork: Artwork;
  rotation: Rotation;
}) {
  const texture = useTexture(artwork.image);
  const viewport = useThree((state) => state.viewport);

  /**
   * Preserve the painting's real aspect ratio.
   *
   * Example:
   * 100 × 80 => 1.25
   * 90 × 80  => 1.125
   */
  const aspect = artwork.dimensions.widthCm / artwork.dimensions.heightCm;

  const artworkHeight = 2.45;
  const artworkWidth = artworkHeight * aspect;

  /**
   * Inspection frame.
   *
   * Intentionally thin and understated.
   */
  const frameBorder = 0.055;
  const frameDepth = 0.12;

  const outerWidth = artworkWidth + frameBorder * 2;

  const outerHeight = artworkHeight + frameBorder * 2;

  return (
    <group rotation={[rotation.x, rotation.y, 0]} scale={Math.min(1, viewport.width / (outerWidth * 1.15), viewport.height / (outerHeight * 1.25))}>
      {/* Backing gives the object actual depth when rotated */}
      <mesh position={[0, 0, -frameDepth / 2]}>
        <boxGeometry args={[outerWidth, outerHeight, frameDepth]} />

        <meshStandardMaterial color="#2d241c" roughness={0.65} />
      </mesh>

      {/* Painting */}
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[artworkWidth, artworkHeight]} />

        <meshStandardMaterial map={texture} roughness={0.5} metalness={0} />
      </mesh>

      {/* TOP FRAME */}
      <mesh position={[0, artworkHeight / 2 + frameBorder / 2, 0.04]}>
        <boxGeometry args={[outerWidth, frameBorder, frameDepth]} />

        <meshStandardMaterial
          color="#8a6b3f"
          roughness={0.42}
          metalness={0.18}
        />
      </mesh>

      {/* BOTTOM FRAME */}
      <mesh position={[0, -artworkHeight / 2 - frameBorder / 2, 0.04]}>
        <boxGeometry args={[outerWidth, frameBorder, frameDepth]} />

        <meshStandardMaterial
          color="#8a6b3f"
          roughness={0.42}
          metalness={0.18}
        />
      </mesh>

      {/* LEFT FRAME */}
      <mesh position={[-artworkWidth / 2 - frameBorder / 2, 0, 0.04]}>
        <boxGeometry args={[frameBorder, artworkHeight, frameDepth]} />

        <meshStandardMaterial
          color="#8a6b3f"
          roughness={0.42}
          metalness={0.18}
        />
      </mesh>

      {/* RIGHT FRAME */}
      <mesh position={[artworkWidth / 2 + frameBorder / 2, 0, 0.04]}>
        <boxGeometry args={[frameBorder, artworkHeight, frameDepth]} />

        <meshStandardMaterial
          color="#8a6b3f"
          roughness={0.42}
          metalness={0.18}
        />
      </mesh>
    </group>
  );
}

export default function ArtworkInspector({
  artwork,
  onClose,
}: ArtworkInspectorProps) {
  const [rotation, setRotation] = useState<Rotation>({
    x: 0,
    y: 0,
  });

  const [isDragging, setIsDragging] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const draggingRef = useRef(false);

  const pointerIdRef = useRef<number | null>(null);

  const previousPoint = useRef({
    x: 0,
    y: 0,
  });

  /**
   * ESC closes inspection mode.
   */
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") { event.preventDefault(); closeButtonRef.current?.focus(); }
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    draggingRef.current = true;
    pointerIdRef.current = event.pointerId;

    previousPoint.current = {
      x: event.clientX,
      y: event.clientY,
    };

    setIsDragging(true);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Safe fallback for browsers
      // without pointer capture.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }

    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - previousPoint.current.x;

    const deltaY = event.clientY - previousPoint.current.y;

    previousPoint.current = {
      x: event.clientX,
      y: event.clientY,
    };

    setRotation((current) => {
      const nextY = THREE.MathUtils.clamp(
        current.y + deltaX * ROTATION_SENSITIVITY,

        -MAX_ROTATION_Y,
        MAX_ROTATION_Y,
      );

      const nextX = THREE.MathUtils.clamp(
        current.x + deltaY * ROTATION_SENSITIVITY,

        -MAX_ROTATION_X,
        MAX_ROTATION_X,
      );

      return {
        x: nextX,
        y: nextY,
      };
    });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      pointerIdRef.current !== null &&
      pointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    draggingRef.current = false;
    pointerIdRef.current = null;

    setIsDragging(false);

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore unsupported pointer capture.
    }
  };

  const resetRotation = () => {
    setRotation({
      x: 0,
      y: 0,
    });
  };

  return (
    <div className="artwork-inspector" role="dialog" aria-modal="true" aria-label={artwork.title}
      style={{
        position: "absolute",
        inset: 0,

        zIndex: 500,

        display: "flex",
        flexDirection: "column",

        background: "radial-gradient(ellipse at 50% 35%, #343a2c, #171c16 75%)",

        backdropFilter: "blur(12px)",

        WebkitBackdropFilter: "blur(12px)",

        color: "#e8e0cf",
      }}
    >
      <div className="inspection-eyebrow">THE COLLECTION / A CLOSER LOOK</div>
      {/* ==================================================
          CLOSE
          ================================================== */}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close artwork inspection"
        ref={closeButtonRef}
        style={{
          position: "absolute",

          top: "calc(18px + env(safe-area-inset-top))",

          right: "calc(18px + env(safe-area-inset-right))",

          zIndex: 20,

          width: 46,
          height: 46,

          borderRadius: "50%",

          border: "1px solid rgba(255,255,255,0.3)",

          background: "rgba(0,0,0,0.3)",

          color: "#e8e0cf",

          fontSize: 24,

          cursor: "pointer",
        }}
      >
        ×
      </button>

      {/* ==================================================
          3D INSPECTION AREA
          ================================================== */}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onDoubleClick={resetRotation}
        style={{
          position: "relative",

          flex: "1 1 auto",

          minHeight: 0,

          cursor: isDragging ? "grabbing" : "grab",

          touchAction: "none",
        }}
      >
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{
            position: [0, 0, 6.2],

            fov: 34,
            near: 0.1,
            far: 30,
          }}
          gl={{
            alpha: true,
            antialias: true,
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <ambientLight intensity={1.5} />

          <directionalLight
            position={[4, 5, 6]}
            intensity={2.3}
            color="#fff4e8"
          />

          <directionalLight
            position={[-4, 1, 3]}
            intensity={0.7}
            color="#d9e3ff"
          />

          <Suspense fallback={<Html center><span className="artwork-loading">Preparing the painting…</span></Html>}>
            <InspectableArtwork artwork={artwork} rotation={rotation} />
          </Suspense>
        </Canvas>

        {/* Instruction */}
        <div
          style={{
            position: "absolute",

            bottom: 12,
            left: "50%",

            transform: "translateX(-50%)",

            pointerEvents: "none",

            whiteSpace: "nowrap",

            fontSize: 12,

            letterSpacing: "0.12em",

            textTransform: "uppercase",

            color: "rgba(255,255,255,0.55)",
          }}
        >
          Drag to inspect · Double click to reset
        </div>
      </div>

      {/* ==================================================
          ARTWORK INFO
          ================================================== */}

      <div
        style={{
          flex: "0 0 auto",

          width: "100%",

          boxSizing: "border-box",

          padding: "20px max(24px, env(safe-area-inset-left)) 28px",

          borderTop: "1px solid rgba(255,255,255,0.12)",

          background: "#171c16",
        }}
      >
        <div
          style={{
            width: "min(680px, 100%)",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              margin: 0,

              fontSize: "clamp(22px, 3vw, 32px)",

              fontWeight: 500,

              letterSpacing: "-0.02em",
            }}
          >
            {artwork.title}
          </h2>

          <div
            style={{
              marginTop: 7,

              fontSize: 13,

              color: "rgba(255,255,255,0.55)",

              letterSpacing: "0.07em",
            }}
          >
            {artwork.dimensions.widthCm}
            {" × "}
            {artwork.dimensions.heightCm}
            {" cm"}
          </div>

          <p
            style={{
              margin: "14px 0 0",

              maxWidth: 620,

              fontSize: 15,

              lineHeight: 1.65,

              color: "rgba(255,255,255,0.75)",
            }}
          >
            {artwork.description}
            {artwork.details?.map((detail) => <span className="inspection-detail" key={detail}>{detail}</span>)}
          </p>
        </div>
      </div>
    </div>
  );
}

