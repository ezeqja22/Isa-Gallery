"use client";
import { Component, type ReactNode } from "react";
import WebGLFallback from "./WebGLFallback";
export default class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <WebGLFallback /> : this.props.children;
  }
}
