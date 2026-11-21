import { LoadingManager, Mesh, Texture, type Object3D } from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export type Quality = "high" | "balanced" | "low";
export type AssetName = "hallway" | "room1" | "room2";
export type Tier = Quality | "shell";
export type AssetSet = Record<AssetName, GLTF>;
const assets = new Map<string, Promise<GLTF>>();
const resolved = new Map<string, GLTF>();
const textures = new Map<string, Promise<Texture>>();
const textureKeys = new WeakMap<Texture["source"], string>();
const pendingManagers = new Set<LoadingManager>();
export function cancelPendingAssets() {
  for (const manager of pendingManagers) manager.abort();
  pendingManagers.clear();
}

function sceneResources(scene: Object3D) {
  const geometries = new Set<Mesh["geometry"]>(),
    maps = new Set<Texture>();
  const mats = new Set<import("three").Material>();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        mats.add(m);
        for (const value of Object.values(m))
          if (value instanceof Texture) maps.add(value);
      }
    }
  });
  return { geometries, materials: mats, maps };
}

export function releaseExcept(keep: GLTF[]) {
  const keptMaps = new Set<Texture>();
  keep.forEach((a) =>
    sceneResources(a.scene).maps.forEach((t) => keptMaps.add(t)),
  );
  const keptImages = new Set([...keptMaps].map((t) => t.image));
  const keptSources = new Set([...keptMaps].map((t) => t.source));
  const closedImages = new Set();
  for (const [key, asset] of resolved) {
    if (keep.includes(asset)) continue;
    const r = sceneResources(asset.scene);
    r.geometries.forEach((g) => g.dispose());
    r.materials.forEach((m) => m.dispose());
    r.maps.forEach((t) => {
      if (!keptMaps.has(t)) {
        if (!keptSources.has(t.source))
          textures.delete(textureKeys.get(t.source) || "");
        t.dispose();
        if (!keptImages.has(t.image) && !closedImages.has(t.image)) {
          if (
            typeof ImageBitmap !== "undefined" &&
            t.image instanceof ImageBitmap
          )
            t.image.close();
          closedImages.add(t.image);
        }
      }
    });
    resolved.delete(key);
    assets.delete(key);
  }
}

export function loadAsset(
  name: AssetName,
  tier: Tier,
  onProgress: (loaded: number, total: number) => void,
): Promise<GLTF> {
  const key = `${name}-${tier}`;
  const cached = assets.get(key);
  if (cached) return cached;
  const manager = new LoadingManager();
  pendingManagers.add(manager);
  manager.onProgress = (_url, loaded, total) => onProgress(loaded, total);
  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  // Shared URI + sampler means identical GPU texture state across independently loaded rooms.
  loader.register((parser) => ({
    name: "EXT_texture_webp",
    loadTexture(index: number) {
      const def = parser.json.textures[index];
      const imageIndex = def.extensions?.EXT_texture_webp?.source ?? def.source;
      const image = parser.json.images[imageIndex];
      const textureKey =
        new URL(image.uri, new URL("/optimized/", window.location.href)).href +
        JSON.stringify(parser.json.samplers?.[def.sampler] || {});
      let pending = textures.get(textureKey);
      if (!pending) {
        pending = parser
          .loadTextureImage(index, imageIndex, parser.textureLoader)
          .then((texture: Texture) => {
            textureKeys.set(texture.source, textureKey);
            return texture;
          });
        textures.set(textureKey, pending);
        pending.catch(() => textures.delete(textureKey));
      }
      return pending;
    },
  }));
  const promise = loader
    .loadAsync(`/optimized/${key}.gltf`)
    .then((asset) => {
      resolved.set(key, asset);
      return asset;
    })
    .catch((error) => {
      assets.delete(key);
      throw error;
    })
    .finally(() => pendingManagers.delete(manager));
  assets.set(key, promise);
  return promise;
}

export async function loadVisit(
  quality: Quality,
  mode: "downstairs" | "upstairs" | "transition",
  onProgress: (loaded: number, total: number) => void,
): Promise<AssetSet> {
  const progress = new Map<string, [number, number]>();
  const update = (name: string, loaded: number, total: number) => {
    progress.set(name, [loaded, total]);
    const sums = [...progress.values()].reduce(
      (a, b) => [a[0] + b[0], a[1] + b[1]],
      [0, 0],
    );
    onProgress(sums[0], sums[1]);
  };
  for (const name of ["hallway", "room1", "room2"]) progress.set(name, [0, 1]);
  const entries = await Promise.all(
    (["hallway", "room1", "room2"] as const).map(async (name) => {
      const tier =
        name === "room2"
          ? mode === "downstairs"
            ? "shell"
            : quality
          : mode === "upstairs"
            ? "shell"
            : quality;
      const asset = await loadAsset(name, tier, (loaded, total) =>
        update(name, loaded, total),
      );
      const total = progress.get(name)![1];
      update(name, total, total);
      return [name, asset] as const;
    }),
  );
  return Object.fromEntries(entries) as AssetSet;
}
