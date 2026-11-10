"use client";
import { useEffect, useRef, useState } from "react";
import AmbientSound from "./AmbientSound";
import { useProgress } from "@react-three/drei";
import type { GalleryView, RoomView } from "@/config/gallery";
import { ARTWORKS, type Artwork } from "@/config/artworks";
import { EXPERIENCE as copy } from "@/config/experience";

export default function ExperienceShell({ view, transitioning, inspecting, onEnter, onHome, onArtwork }: {
  view: GalleryView; transitioning: boolean; inspecting: boolean;
  onEnter: (room: RoomView) => void; onHome: () => void; onArtwork: (art: Artwork) => void;
}) {
  const { active, progress, errors } = useProgress();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const intro = view === "overview";
  useEffect(() => {
    if (menuOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [menuOpen]);
  const navigate = (destination: GalleryView) => {
    setMenuOpen(false);
    if (destination === view) return;
    if (destination === "overview") onHome(); else onEnter(destination);
  };
  return <div className={`experience ${inspecting ? "experience--inspecting" : ""}`}>
    <section className={`invitation ${intro ? "" : "invitation--departed"}`} inert={!intro} aria-hidden={!intro} aria-label="Welcome to the gallery">
      <div className="invitation-copy">
        <p className="eyebrow"><span className="gold-rule" />{copy.eyebrow}</p>
        <h1>{copy.title}<br /><em>{copy.titleAccent}</em></h1>
        <p className="invitation-description">{copy.introduction}</p>
        <button className="enter-button" disabled={active || transitioning || errors.length > 0} onClick={() => onEnter("room1")}>
          <span className="enter-circle" aria-hidden="true">↗</span><span>{errors.length ? "Unable to load the rooms" : active ? `Preparing your visit · ${Math.round(progress)}%` : "View the gallery"}<small>{active ? "The doors will open shortly" : "An exhibition in two chapters"}</small></span>
        </button>
        {errors.length > 0 && <button className="text-button" onClick={() => window.location.reload()}>Try again</button>}
      </div>
      <div className="invitation-bottom"><span>PAINTING · SPACE · PROCESS</span><span>A moment away from the everyday.</span><span>GALLERY & ATELIER</span></div>
    </section>
    <header className={`experience-header ${inspecting ? "experience-header--inspection" : ""}`}>
      <button className="wordmark" onClick={onHome} disabled={transitioning || intro} aria-label="Return to introduction">{copy.name}<span>{copy.subtitle}</span></button>
      <div className="header-actions"><AmbientSound walking={transitioning} /><span className="header-location">{intro ? "A PRIVATE VIEW, AT YOUR PACE" : view === "room1" ? "GROUND FLOOR / 01" : "UPSTAIRS / 02"}</span><button className="menu-button" onClick={() => setMenuOpen(true)} disabled={transitioning} aria-haspopup="dialog">Explore <span aria-hidden="true">☰</span></button></div>
    </header>
    {!intro && !inspecting && <footer className={`room-footer ${transitioning ? "room-footer--travel" : ""}`}>
      <div className="chapter-name"><span className="eyebrow">{view === "room1" ? "01 / THE COLLECTION" : "02 / THE PROCESS"}</span><h2>{view === "room1" ? copy.galleryTitle : copy.studioTitle}</h2></div>
      <p className="look-hint" role="status">{transitioning ? "Following the light…" : view === "room1" ? "Drag to look around · Select a painting to discover it" : "Drag to look around · A glimpse into the working day"}</p>
      <button className="chapter-next" disabled={transitioning} onClick={() => onEnter(view === "room1" ? "room2" : "room1")}><span>{view === "room1" ? "Visit the atelier" : "Return to the gallery"}</span><span aria-hidden="true">↗</span></button>
    </footer>}
    <dialog ref={dialog} className="explore-dialog" onCancel={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} aria-labelledby="explore-title">
      <div className="explore-heading"><span className="eyebrow">{copy.name} / YOUR VISIT</span><button className="menu-button" autoFocus onClick={() => setMenuOpen(false)}>Close <span aria-hidden="true">×</span></button></div>
      <div className="explore-body"><div><h2 id="explore-title">{copy.visitTitle}</h2><p>{copy.visitDescription}</p><p className="visit-help">Drag the view to turn. Select a painting to open its details. Follow the staircase to move between rooms.</p>
        <div className="collection-links"><span className="eyebrow">A closer look</span>
          {Object.values(ARTWORKS).map(art => <button key={art.id} disabled={active} onClick={() => { setMenuOpen(false); onArtwork(art); }}>{art.title}<span aria-hidden="true">↗</span></button>)}
        </div>
      </div>
        <nav aria-label="Explore the house"><button onClick={() => navigate("room1")} disabled={active}><span>01</span><strong>{copy.galleryTitle}</strong><small>Finished works, a closer look.</small><b aria-hidden="true">↗</b></button><button onClick={() => navigate("room2")} disabled={active}><span>02</span><strong>{copy.studioTitle}</strong><small>The space behind the paintings.</small><b aria-hidden="true">↗</b></button><button className="return-intro" onClick={() => navigate("overview")}>Return to the introduction <span aria-hidden="true">↗</span></button></nav>
      </div><div className="explore-foot">Two rooms. One unfolding story.</div>
    </dialog>
  </div>;
}

