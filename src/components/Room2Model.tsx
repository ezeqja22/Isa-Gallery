"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { batchDecorations } from '@/lib/batchDecorations';

type Room2ModelProps = {
  scene: THREE.Group;
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

export default function Room2Model({ scene, position = [0, 0, 0] }: Room2ModelProps) {

  const clonedScene = useMemo(() => {
    const copy=scene.clone(true);
    copy.userData.disposeBatches=batchDecorations(copy);
    return copy;
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
    return ()=>{clonedScene.userData.disposeBatches?.();clonedScene.traverse(child=>{if(child instanceof THREE.Mesh && child.name.startsWith('Room2_Ceiling')){for(const material of Array.isArray(child.material)?child.material:[child.material])material.dispose();}});};
  }, [clonedScene]);

  return <group position={position}><primitive object={clonedScene} /></group>;
}
