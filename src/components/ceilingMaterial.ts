import * as THREE from "three";

/** Match the atelier's soft ceiling bounce without brightening every wall. */
export function ceilingMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  material.onBeforeCompile = (shader) => {
    const marker = "#include <lights_fragment_begin>";
    shader.fragmentShader = shader.fragmentShader.replace(marker, `${marker}
      #if defined( RE_IndirectDiffuse ) && ( NUM_HEMI_LIGHTS > 0 )
        irradiance -= getHemisphereLightIrradiance(hemisphereLights[0], geometryNormal);
        irradiance += hemisphereLights[0].skyColor;
      #endif
    `);
  };
  material.customProgramCacheKey = () => "gallery-ceiling-bounce-v1";
  return material;
}
