"use client";

import Image from "next/image";
import { ARTWORKS } from "@/config/artworks";

export default function LightweightGallery({ onHome, reason }: {
  onHome: () => void;
  reason?: string;
}) {
  return <main className="lightweight-gallery">
    <header className="lightweight-gallery-header">
      <div><span className="eyebrow">A HOUSE FOR ART</span><h1>STILL</h1></div>
      <button onClick={onHome} className="menu-button">Return to introduction</button>
    </header>
    <div className="lightweight-gallery-intro">
      <span className="eyebrow">THE COLLECTION</span>
      <h2>Art, without the 3D view.</h2>
      <p>{reason || "A lighter way to explore the paintings, available on every device."}</p>
    </div>
    <div className="lightweight-gallery-grid">
      {Object.values(ARTWORKS).map((artwork) =>
        <article key={artwork.id} className="lightweight-gallery-artwork">
          <Image
            src={artwork.image} width={1000} height={850}
            alt={artwork.title} sizes="(max-width: 700px) 90vw, 33vw"
            style={{ width: "100%", height: "auto" }}
          />
          <h3>{artwork.title}</h3>
          <p>{artwork.description}</p>
          <small>{artwork.dimensions.widthCm} × {artwork.dimensions.heightCm} cm</small>
        </article>
      )}
    </div>
  </main>;
}
