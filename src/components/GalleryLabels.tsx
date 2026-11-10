"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ARTWORKS } from "@/config/artworks";
import { EMPTY_FRAME_LABELS } from "@/config/galleryLabels";

type LabelText = { title: string; description: string; details?: string[] };
function Plaque({ title, lines, position, rotation = 0, width = 1.35 }: {
  title: string; lines: string[]; position: [number, number, number]; rotation?: number; width?: number;
}) {
  const linesText = lines.filter(Boolean).join("\n");
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    const wood = ctx.createLinearGradient(0, 0, 0, 360);
    wood.addColorStop(0, "#463025"); wood.addColorStop(.5, "#302019"); wood.addColorStop(1, "#3d291e");
    ctx.fillStyle = wood; ctx.fillRect(0, 0, 1024, 360);
    // Fine deterministic grain, with no extra downloaded textures.
    ctx.lineWidth = 1;
    for (let y = 0; y < 360; y += 4) {
      ctx.strokeStyle = `rgba(177,126,77,${.035 + .025 * Math.sin(y)})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + 9, 700, y - 8, 1024, y + 2); ctx.stroke();
    }
    ctx.strokeStyle = "#a88b53"; ctx.lineWidth = 3; ctx.strokeRect(15, 15, 994, 330);
    ctx.strokeStyle = "#6d5134"; ctx.lineWidth = 1; ctx.strokeRect(24, 24, 976, 312);
    ctx.fillStyle = "#e4cc99"; ctx.font = "64px Georgia"; ctx.fillText(title, 54, 104, 916);
    ctx.fillStyle = "#c8b694";
    // Fit short captions and optional metadata into a consistent physical plaque size.
    let rows: string[] = [];
    let fontSize = 35;
    for (; fontSize >= 21; fontSize -= 2) {
      ctx.font = `${fontSize}px Arial`; rows = [];
      for (const line of linesText.split("\n").filter(Boolean)) {
        let row = "";
        for (const word of line.split(/\s+/)) {
          if (row && ctx.measureText(`${row} ${word}`).width > 916) { rows.push(row); row = word; }
          else row = row ? `${row} ${word}` : word;
        }
        if (row) rows.push(row);
      }
      if (rows.length * (fontSize + 10) <= 170) break;
    }
    const step = Math.max(31, fontSize + 10);
    const count = Math.floor(170 / step);
    rows.slice(0, count).forEach((line, i) => ctx.fillText(line + (i === count - 1 && rows.length > count ? "…" : ""), 54, 160 + i * step, 916));
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [title, linesText]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={[0, rotation, 0]}>
    <planeGeometry args={[width, width * 360 / 1024]} />
    <meshStandardMaterial map={texture} roughness={0.82} metalness={0.08} />
  </mesh>;
}

export default function GalleryLabels({ scene }: { scene: THREE.Object3D }) {
  const labels = useMemo(() => {
    const entries: { name: string; text: LabelText }[] = Object.values(ARTWORKS).flatMap(art => art.objectNames.map(name => ({ name, text: art })));
    for (const empty of EMPTY_FRAME_LABELS) {
      if (!entries.some(entry => entry.name === empty.objectName)) entries.push({ name: empty.objectName, text: empty });
    }
    return entries.flatMap(({name, text}) => {
      const object = scene.getObjectByName(name);
      if (!object) return [];
      const bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3());
      const right = name.startsWith("RightWall");
      const left = name.startsWith("LW_");
      const position: [number, number, number] = right
        ? [bounds.min.x - .08, bounds.min.y - .43, center.z]
        : left ? [bounds.max.x + .08, bounds.min.y - .43, center.z]
          : [center.x, bounds.min.y - .43, bounds.max.z + .08];
      return [{ text, name, position, rotation: right ? -Math.PI / 2 : left ? Math.PI / 2 : 0 }];
    });
  }, [scene]);
  return <>
    {labels.map(({text, name, position, rotation}) => <Plaque key={name} title={text.title} lines={[...(text.details ?? []), text.description]} position={position} rotation={rotation} />)}

  </>;
}
