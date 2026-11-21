import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Batch opaque, non-interactive atelier details; keep named source nodes as anchors.
 * No decimation: every vertex and triangle is retained. Mirrored/transparent meshes
 * are left alone so winding, transmission and sorting retain their original behavior.
 */
export function batchDecorations(scene: THREE.Group) {
  const buckets = new Map<string, THREE.Mesh[]>();
  const generated: THREE.BufferGeometry[] = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (
      !(o instanceof THREE.Mesh) ||
      Array.isArray(o.material) ||
      o.material.transparent ||
      o.name.startsWith("Room2_") ||
      o.matrixWorld.determinant() < 0 ||
      o.geometry.morphAttributes.position
    )
      return;
    const signature = Object.entries(
      o.geometry.attributes as Record<string, THREE.BufferAttribute>,
    )
      .map(
        ([name, a]) =>
          `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`,
      )
      .sort()
      .join("|");
    const key = o.material.uuid + signature + !!o.geometry.index;
    const bucket = buckets.get(key) || [];
    bucket.push(o);
    buckets.set(key, bucket);
  });
  for (const meshes of buckets.values()) {
    if (meshes.length < 3) continue;
    const geometries = meshes.map((m) =>
      m.geometry.clone().applyMatrix4(m.matrixWorld),
    );
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!merged) continue;
    const batch = new THREE.Mesh(merged, meshes[0].material);
    batch.name = "Atelier_detail_batch";
    batch.castShadow = true;
    batch.receiveShadow = true;
    meshes.forEach((m) => {
      m.visible = false;
    });
    scene.add(batch);
    generated.push(merged);
  }
  return () => generated.forEach((g) => g.dispose());
}
