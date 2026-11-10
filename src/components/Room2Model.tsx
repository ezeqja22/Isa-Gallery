"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Room2ModelProps = {
  position?: [number, number, number];
};

function patchCeilingMaterial(sourceMaterial: THREE.Material): THREE.Material {
  const material = sourceMaterial.clone();

  if (
    !(
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial
    )
  ) {
    return material;
  }

  material.onBeforeCompile = (shader) => {
    const marker = "#include <lights_fragment_begin>";

    if (!shader.fragmentShader.includes(marker)) {
      console.error("[Room2] Could not find lights_fragment_begin.");
      return;
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      marker,
      `
${marker}

/*
 * ROOM 2 CEILING FIX
 *
 * The normal Three.js hemisphere calculation has already
 * been added to "irradiance" by lights_fragment_begin.
 *
 * For this ceiling only:
 *
 * 1. subtract the hemisphere contribution Three.js gave it
 * 2. add the hemisphere SKY colour instead
 *
 * This is mathematically equivalent to making
 * groundColor = skyColor ONLY for this material.
 */

#if defined( RE_IndirectDiffuse ) && ( NUM_HEMI_LIGHTS > 0 )

    irradiance -= getHemisphereLightIrradiance(
        hemisphereLights[ 0 ],
        geometryNormal
    );

    irradiance += hemisphereLights[ 0 ].skyColor;

#endif
`,
    );
  };

  material.customProgramCacheKey = () => "room2-ceiling-hemi-fix-v3";

  material.needsUpdate = true;

  return material;
}

export default function Room2Model({ position = [0, 0, 0] }: Room2ModelProps) {
  const { scene } = useGLTF("/models/room2.glb");

  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const isCeiling =
        child.name === "Room2_Ceiling" ||
        child.name.startsWith("Room2_Ceiling.");

      if (isCeiling) {
        console.log("[Room2] Applying ceiling lighting fix:", child.name);

        if (Array.isArray(child.material)) {
          child.material = child.material.map((material) =>
            patchCeilingMaterial(material),
          );
        } else {
          child.material = patchCeilingMaterial(child.material);
        }

        child.castShadow = false;
        child.receiveShadow = true;

        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [clonedScene]);

  return <primitive object={clonedScene} position={position} />;
}

useGLTF.preload("/models/room2.glb");
