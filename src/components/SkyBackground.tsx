"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

type Props = { visible: boolean; lowPower?: boolean };

function LightSky({ visible }: { visible: boolean }) {
  const sky = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => { sky.current?.position.copy(camera.position); });
  if (!visible) return null;
  return (
    <mesh ref={sky} scale={40} renderOrder={-1000} rotation={[0, Math.PI * 1.5, 0]}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color="#a2b1c3" side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function DetailedSky({ visible }: { visible: boolean }) {
  const sky = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => { sky.current?.position.copy(camera.position); });
  const texture = useLoader(EXRLoader, "/environment/drackenstein_quarry_puresky_4k.exr");
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: true,
    uniforms: {
      skyTexture: { value: texture },
      tint: { value: new THREE.Vector3(0.92, 0.97, 1.08) },
      brightness: { value: 0.88 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D skyTexture;
      uniform vec3 tint;
      uniform float brightness;
      varying vec2 vUv;
      void main() {
        vec4 sky = texture2D(skyTexture, vUv);
        sky.rgb *= tint;
        sky.rgb *= brightness;
        gl_FragColor = sky;
      }
    `,
  }), [texture]);

  // Do not dispose cached texture: other loaders may still be using it.
  useEffect(() => () => material.dispose(), [material]);
  if (!visible) return null;
  return (
    <mesh ref={sky} scale={40} material={material} renderOrder={-1000}
      rotation={[0, Math.PI * 1.5, 0]}>
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  );
}

export default function SkyBackground({ visible, lowPower = false }: Props) {
  return lowPower ? <LightSky visible={visible} /> : <DetailedSky visible={visible} />;
}
