"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

let registered = false;

/** Register GSAP plugins once (client only). Call before creating tweens. */
export function registerGsap() {
  if (registered || typeof window === "undefined") return gsap;
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  registered = true;
  return gsap;
}

/**
 * Register an extracted cubic-bezier as a named GSAP ease.
 * registerEase("hero", [0.16, 1, 0.3, 1]) -> use `ease: "hero"`
 */
export function registerEase(name: string, [a, b, c, d]: [number, number, number, number]) {
  registerGsap();
  CustomEase.create(name, `${a},${b},${c},${d}`);
  return name;
}

export { gsap, ScrollTrigger };
