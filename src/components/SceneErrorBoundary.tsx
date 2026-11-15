"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onError: (error: Error) => void;
  fallback: ReactNode;
};

export default class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
