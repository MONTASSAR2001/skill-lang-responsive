"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Render children only after hydration: required for WebGL canvases and window-dependent code. */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
