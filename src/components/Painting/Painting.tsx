import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

export default function Painting({
  position,
}: {
  position: [number, number, number];
}) {
  const texture = useLoader(THREE.TextureLoader, "/paintings/painting1.jpeg");

  return (
    <mesh position={position}>
      <planeGeometry args={[1.5, 1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
