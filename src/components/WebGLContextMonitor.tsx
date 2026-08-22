"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

type WebGLContextMonitorProps = {
  onLost: () => void;
  onRestored: () => void;
};

export default function WebGLContextMonitor({
  onLost,
  onRestored,
}: WebGLContextMonitorProps) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      /*
        Preventing the default behavior allows the
        browser to attempt WebGL context restoration.
      */
      event.preventDefault();

      onLost();
    };

    const handleContextRestored = () => {
      onRestored();

      /*
        We're using frameloop="demand", so request
        a fresh frame after WebGL has recovered.
      */
      invalidate();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);

    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);

      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [gl, invalidate, onLost, onRestored]);

  return null;
}
