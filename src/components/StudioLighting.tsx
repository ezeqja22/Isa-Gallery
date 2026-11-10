"use client";

import { ROOMS } from "@/config/gallery";

/** Local coordinates follow the GLB conversion: Blender (x, y, z) -> (x, z, -y). */
export default function StudioLighting() {
  return (
    <group position={ROOMS.room2.position}>
      {/* Finite-range bounce approximations keep the studio's fill local. */}
      <pointLight position={[6, 1, -5]} color="#e4edff" intensity={16} distance={14} decay={2} />
      <pointLight position={[6, 1, 5]} color="#e4edff" intensity={16} distance={14} decay={2} />
      <pointLight position={[-1, 0.5, 5.5]} color="#fff0dc" intensity={22} distance={14} decay={2} />
      <pointLight position={[-1.82, 1.7, 0]} color="#ffe3bd" intensity={12} distance={12} decay={2} />
    </group>
  );
}
