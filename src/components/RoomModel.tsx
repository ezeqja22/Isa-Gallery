/* eslint-disable react-hooks/exhaustive-deps */
"use client";


import { useEffect, useMemo, useRef } from "react";

import { ThreeEvent, useThree } from "@react-three/fiber";

import { useGLTF } from "@react-three/drei";

import GalleryLabels from "@/components/GalleryLabels";
import * as THREE from "three";
import { ceilingMaterial } from "./ceilingMaterial";

import { ARTWORKS, Artwork, findArtworkByObjectName } from "@/config/artworks";

type RoomModelProps = {
  position?: [number, number, number];

  onArtworkSelect?: (artwork: Artwork) => void;

  artworkInteractionEnabled?: boolean;
};

type MaterialBackup = {
  emissive: THREE.Color;
  emissiveIntensity: number;
};

export default function RoomModel({
  position = [0, 0, 0],
  onArtworkSelect,
  artworkInteractionEnabled = true,
}: RoomModelProps) {
  const { scene } = useGLTF("/models/room1.glb");

  /*
   * Gives us imperative access to the actual
   * R3F canvas without mutating a hook-returned
   * object during render.
   */
  const getThree = useThree((state) => state.get);

  /*
   * Which artwork is currently highlighted.
   */
  const hoveredArtworkRef = useRef<Artwork | null>(null);

  /*
   * Save the original material values so that
   * we can restore them exactly after hover.
   */
  const materialBackups = useRef(new WeakMap<THREE.Material, MaterialBackup>());

  /*
   * IMPORTANT:
   *
   * Clone both the scene AND the materials.
   *
   * scene.clone(true) alone still shares the original
   * materials from useGLTF's cached model.
   *
   * Since we're going to change emissive values on hover,
   * we want completely independent materials.
   */
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      if (child.name.startsWith("NewSkylight_Ceiling")) {
        child.material = Array.isArray(child.material)
          ? child.material.map(ceilingMaterial)
          : ceilingMaterial(child.material);
      } else if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => material.clone());
      } else if (child.material) {
        child.material = child.material.clone();
      }
    });

    return clone;
  }, [scene]);

  /*
   * -------------------------------------------------------
   * Find which artwork an object belongs to
   * -------------------------------------------------------
   */
  const resolveArtwork = (object: THREE.Object3D): Artwork | null => {
    let current: THREE.Object3D | null = object;

    while (current) {
      const objectName = current.name.replace(/\.\d{3}$/, "");

      /*
       * Exact artwork object.
       *
       * Example:
       * Backwall_Left_Artwork
       */
      const exactMatch = findArtworkByObjectName(objectName);

      if (exactMatch) {
        return exactMatch;
      }

      /*
       * Look for generated frame objects.
       */
      for (const artwork of Object.values(ARTWORKS)) {
        for (const registeredName of artwork.objectNames) {
          /*
           * Example:
           *
           * Backwall_Left_Artwork_Frame_Top
           */
          if (objectName.startsWith(`${registeredName}_Frame_`)) {
            return artwork;
          }

          /*
           * Our big right-wall painting is named:
           *
           * RightWall_Big_Piktura2_Art
           *
           * while its frame pieces are:
           *
           * RightWall_Big_Piktura2_Frame_Top
           *
           * so remove "_Art" when checking frames.
           */
          if (registeredName.endsWith("_Art")) {
            const baseName = registeredName.slice(0, -4);

            if (objectName.startsWith(`${baseName}_Frame_`)) {
              return artwork;
            }
          }
        }
      }

      current = current.parent;
    }

    return null;
  };

  /*
   * -------------------------------------------------------
   * Does this mesh belong to an artwork?
   * -------------------------------------------------------
   */

  const meshBelongsToArtwork = (object: THREE.Object3D, artwork: Artwork) => {
    const resolved = resolveArtwork(object);

    return resolved?.id === artwork.id;
  };

  /*
   * -------------------------------------------------------
   * Material highlighting
   * -------------------------------------------------------
   */

  const highlightMaterial = (
    material: THREE.Material,
    highlighted: boolean,
  ) => {
    /*
     * Blender Principled materials normally become
     * MeshStandardMaterial / MeshPhysicalMaterial.
     */
    if (!(material instanceof THREE.MeshStandardMaterial)) {
      return;
    }

    if (highlighted) {
      /*
       * Save original values only once.
       */
      if (!materialBackups.current.has(material)) {
        materialBackups.current.set(material, {
          emissive: material.emissive.clone(),

          emissiveIntensity: material.emissiveIntensity,
        });
      }

      /*
       * Very subtle museum/game hover highlight.
       *
       * We don't want a giant glowing videogame outline.
       */
      material.emissive.set(0xffffff);

      material.emissiveIntensity = 0.18;
    } else {
      const original = materialBackups.current.get(material);

      if (!original) {
        return;
      }

      material.emissive.copy(original.emissive);

      material.emissiveIntensity = original.emissiveIntensity;

      materialBackups.current.delete(material);
    }

    material.needsUpdate = true;
  };

  const setArtworkHighlight = (artwork: Artwork, highlighted: boolean) => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      if (!meshBelongsToArtwork(child, artwork)) {
        return;
      }

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        if (material) {
          highlightMaterial(material, highlighted);
        }
      }
    });

    /*
     * Your main Canvas uses frameloop="demand".
     */
    getThree().invalidate();
  };

  /*
   * -------------------------------------------------------
   * Cursor
   * -------------------------------------------------------
   */

  const setCanvasCursor = (cursor: string) => {
    const state = getThree();

    state.gl.domElement.style.cursor = cursor;
  };

  /*
   * -------------------------------------------------------
   * Change hovered artwork
   * -------------------------------------------------------
   */

  const updateHoveredArtwork = (nextArtwork: Artwork | null) => {
    const previous = hoveredArtworkRef.current;

    /*
     * Nothing changed.
     */
    if (previous?.id === nextArtwork?.id) {
      return;
    }

    /*
     * Remove highlight from old painting.
     */
    if (previous) {
      setArtworkHighlight(previous, false);
    }

    /*
     * Highlight new painting.
     */
    if (nextArtwork) {
      setArtworkHighlight(nextArtwork, true);
    }

    hoveredArtworkRef.current = nextArtwork;
  };

  /*
   * -------------------------------------------------------
   * Shadows
   * -------------------------------------------------------
   */

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      const material = Array.isArray(child.material)
        ? child.material[0]
        : child.material;

      const isGlass =
        child.name.startsWith("Glass") ||
        child.name.startsWith("SkylightGlass") ||
        material?.name === "SkylightGlass";

      if (isGlass) {
        child.castShadow = false;

        child.receiveShadow = true;
      } else {
        child.castShadow = true;

        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  /*
   * Reset hover/cursor whenever artwork interaction
   * becomes disabled — for example when the inspector opens.
   */
  useEffect(() => {
    if (artworkInteractionEnabled) {
      return;
    }

    const previous = hoveredArtworkRef.current;

    if (previous) {
      setArtworkHighlight(previous, false);

      hoveredArtworkRef.current = null;
    }

    const state = getThree();

    state.gl.domElement.style.cursor = "default";
  }, [artworkInteractionEnabled, getThree]);

  /*
   * -------------------------------------------------------
   * CLICK
   * -------------------------------------------------------
   */

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!artworkInteractionEnabled) {
      return;
    }

    const artwork = resolveArtwork(event.object);

    if (!artwork) {
      return;
    }

    event.stopPropagation();

    /*
     * Remove highlight before entering inspector.
     */
    updateHoveredArtwork(null);

    setCanvasCursor("default");

    onArtworkSelect?.(artwork);
  };

  /*
   * -------------------------------------------------------
   * POINTER MOVE
   * -------------------------------------------------------
   */

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!artworkInteractionEnabled) {
      updateHoveredArtwork(null);
      setCanvasCursor("default");
      return;
    }

    /*
     * Check all objects currently under the pointer.
     * This is more reliable than only checking event.object,
     * especially with frames / painting meshes close together.
     */
    let hoveredArtwork: Artwork | null = null;

    for (const intersection of event.intersections) {
      const artwork = resolveArtwork(intersection.object);

      if (artwork) {
        hoveredArtwork = artwork;
        break;
      }
    }

    /*
     * IMPORTANT:
     * Highlight logic is completely separate from cursor logic.
     */
    updateHoveredArtwork(hoveredArtwork);

    /*
     * Cursor:
     *
     * painting = pointer
     * everything else = normal
     */
    setCanvasCursor(hoveredArtwork ? "pointer" : "default");
  };

  /*
   * If the pointer completely leaves the GLB/canvas area.
   */
  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    /*
     * Don't immediately clear the highlight if we're simply
     * moving from the artwork mesh onto another part of the
     * same artwork/frame.
     */

    let stillOverArtwork: Artwork | null = null;

    for (const intersection of event.intersections) {
      const artwork = resolveArtwork(intersection.object);

      if (artwork) {
        stillOverArtwork = artwork;
        break;
      }
    }

    updateHoveredArtwork(stillOverArtwork);

    setCanvasCursor(stillOverArtwork ? "pointer" : "default");
  };

  return (
    <group position={position}>
      <GalleryLabels scene={clonedScene} />
      <primitive
      object={clonedScene}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      />
    </group>
  );
}

useGLTF.preload("/models/room1.glb");


