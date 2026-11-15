"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Mount after the room models: only the camera moves in this scene. */
export default function StaticShadows({ revision = 0 }: { revision?: number }) {
  const get = useThree((state) => state.get);

  useEffect(() => {
    const { gl, invalidate } = get();
    const refresh = () => {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    };
    const previous = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    refresh();
    gl.domElement.addEventListener("webglcontextrestored", refresh);
    return () => {
      gl.domElement.removeEventListener("webglcontextrestored", refresh);
      gl.shadowMap.autoUpdate = previous;
      gl.shadowMap.needsUpdate = true;
    };
  }, [get, revision]);

  return null;
}
