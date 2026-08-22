export default function Painting({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={[1.5, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
