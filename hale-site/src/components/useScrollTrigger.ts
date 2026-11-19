"use client";

import { useLayoutEffect, type RefObject } from "react";
import { gsap, registerGsap } from "@/lib/gsap";

/**
 * Scope a GSAP/ScrollTrigger setup to a ref with automatic cleanup.
 * Pass the exact trigger/start/end/scrub/pin values found in timeline.json (libraries.scrollTriggers).
 *
 * useScrollTrigger(ref, () => {
 *   gsap.to(".hero-title", { y: -120, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
 * });
 */
export function useScrollTrigger(scope: RefObject<HTMLElement | null>, setup: () => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    registerGsap();
    const ctx = gsap.context(setup, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
