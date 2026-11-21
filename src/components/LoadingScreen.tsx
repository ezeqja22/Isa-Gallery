"use client";
import { EXPERIENCE } from "@/config/experience";
export default function LoadingScreen({
  ready = false,
  progress: counts,
  error,
}: {
  ready?: boolean;
  progress: { loaded: number; total: number };
  error: string;
}) {
  const progress = counts.total ? (counts.loaded / counts.total) * 100 : 0;
  const done = ready;
  return (
    <div
      className={`arrival-card ${done ? "arrival-card--ready" : ""}`}
      aria-hidden={done}
      inert={done}
    >
      <span className="eyebrow">A HOUSE FOR ART</span>
      <h1>{EXPERIENCE.name}</h1>
      <span className="arrival-rule" />
      <p role="status">
        {error ||
          (progress === 100
            ? "Preparing the light…"
            : "Preparing the entrance and gallery…")}
      </p>
      <div
        className="arrival-progress"
        role="progressbar"
        aria-label="Loading entrance assets"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      {error && (
        <>
          <button onClick={() => window.location.reload()}>Try again</button>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("quality", "low");
              window.location.assign(url);
            }}
          >
            Retry in Low quality
          </button>
        </>
      )}
    </div>
  );
}
