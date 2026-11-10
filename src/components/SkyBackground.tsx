"use client";

import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

type SkyBackgroundProps = {
  visible: boolean;
};

export default function SkyBackground({ visible }: SkyBackgroundProps) {
  const sky = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    // A distant sky has no parallax: never jump its centre when changing rooms.
    sky.current?.position.copy(camera.position);
  });
  const loadedTexture = useLoader(
    EXRLoader,
    "/environment/drackenstein_quarry_puresky_4k.exr",
  );

  const texture = useMemo(() => {
    return loadedTexture.clone();
  }, [loadedTexture]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: true,

      uniforms: {
        skyTexture: {
          value: texture,
        },

        /*
         * Subtle cool-blue tint.
         *
         * 1.0 = unchanged channel.
         * Slightly reducing red/green relative to blue
         * makes the sky cooler.
         */
        tint: {
          value: new THREE.Vector3(0.92, 0.97, 1.08),
        },

        brightness: {
          value: 0.88,
        },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform sampler2D skyTexture;
        uniform vec3 tint;
        uniform float brightness;

        varying vec2 vUv;

        void main() {
          vec4 sky = texture2D(
            skyTexture,
            vUv
          );

          sky.rgb *= tint;
          sky.rgb *= brightness;

          gl_FragColor = sky;
        }
      `,
    });
  }, [texture]);

  if (!visible) {
    return null;
  }

  return (
    <mesh
      ref={sky}
      scale={40}
      material={material}
      renderOrder={-1000}
      rotation={[
        THREE.MathUtils.degToRad(0),
        THREE.MathUtils.degToRad(270),
        THREE.MathUtils.degToRad(0),
      ]}
    >
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  );
}
