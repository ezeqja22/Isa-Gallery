"use client";

import { EXPERIENCE } from "@/config/experience";

export default function LoadingScreen({ progress, message, onFallback }: {
  progress: number;
  message: string;
  onFallback: () => void;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="arrival-card" role="status" aria-live="polite">
      <span className="eyebrow">A HOUSE FOR ART</span>
      <h1>{EXPERIENCE.name}</h1>
      <span className="arrival-rule" />
      <p>{message}</p>
      <div className="arrival-progress" role="progressbar"
        aria-label="Loading the gallery" aria-valuenow={percent}
        aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <button className="text-button" onClick={onFallback}>
        View the paintings without 3D
      </button>
    </div>
  );
}
