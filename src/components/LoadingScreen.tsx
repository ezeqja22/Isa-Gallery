"use client";

import { useProgress } from "@react-three/drei";

export default function LoadingScreen() {
  const { active, progress } = useProgress();

  if (!active) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        background: "#111",
        color: "white",

        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 220,
        }}
      >
        <div
          style={{
            marginBottom: 12,
            fontSize: 14,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Loading gallery
        </div>

        <div
          style={{
            width: "100%",
            height: 2,
            background: "rgba(255,255,255,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "white",
              transition: "width 0.15s ease",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.6,
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
