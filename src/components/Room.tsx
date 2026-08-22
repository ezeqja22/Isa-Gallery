import Painting from "@/components/Painting/Painting";

export default function Room({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, -2.5, 0]}>
        <boxGeometry args={[10, 0.2, 10]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 0, -5]}>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-5, 0, 0]}>
        <boxGeometry args={[0.2, 5, 10]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      <Painting position={[0, 0, -4.8]} />

      {/* Right Wall */}
      <mesh position={[5, 0, 0]}>
        <boxGeometry args={[0.2, 5, 10]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[10, 0.2, 10]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}
