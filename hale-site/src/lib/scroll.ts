"use client";
import { useEffect, useRef, type RefObject } from "react";

export const clamp = (t: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => ((t = clamp(t)), t * t * (3 - 2 * t));
export const easeInOutQuad = (t: number) => ((t = clamp(t)), t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInOutCubic = (t: number) => ((t = clamp(t)), t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Drives `onFrame(progress)` every animation frame while `ref`'s section is near the viewport.
 * progress = 0..1 through the section's sticky range. `onResize` runs on mount and on window resize.
 */
export function useStickyProgress(
  ref: RefObject<HTMLElement | null>,
  onFrame: (progress: number, now: number) => void,
  onResize?: () => void,
) {
  const frame = useRef(onFrame);
  const resize = useRef(onResize);
  useEffect(() => {
    frame.current = onFrame;
    resize.current = onResize;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let running = false;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const r = el.getBoundingClientRect();
      const range = r.height - innerHeight;
      frame.current(range > 0 ? clamp(-r.top / range) : clamp(1 - r.bottom / (innerHeight + r.height)), now);
    };
    const onWin = () => resize.current?.();
    resize.current?.();
    addEventListener("resize", onWin);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener("resize", onWin);
    };
  }, [ref]);
}
