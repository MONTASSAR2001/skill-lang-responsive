"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { Bag, Header, type BagLine } from "./Chrome";
import Door from "./Door";
import Footer from "./Footer";
import Rail, { type RailApi } from "./Rail";
import { Lookbook, Promises, Strip } from "./Sections";
import TryOn from "./TryOn";
import Viewer, { type FlyFrom } from "./Viewer";
import Zoom from "./Zoom";

type Open = { index: number; from: FlyFrom; origin: HTMLElement | null };

export default function HaleApp() {
  const rail = useRef<RailApi | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [lines, setLines] = useState<BagLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);

  // View a piece: from the rail it flies off the hanger; from anywhere else it fades up from the clicked element.
  const view = (index: number, origin: HTMLElement | null) =>
    setOpen({ index, origin, from: origin ? { rect: origin.getBoundingClientRect(), angle: 0 } : null });
  const viewFromRail = (index: number) => setOpen({ index, origin: null, from: rail.current?.measure(index) ?? null });

  // Scroll-triggered reveals + keep ScrollTrigger honest as sticky sections change the page height.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(".lb-word", { xPercent: 6 }, { xPercent: -22, ease: "none", scrollTrigger: { trigger: ".lb", start: "top bottom", end: "bottom top", scrub: true } });
      gsap.fromTo(".lb-model", { y: 90, scale: 0.94 }, { y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".lb", start: "top bottom", end: "top 15%", scrub: true } });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) =>
        gsap.fromTo(el.children, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: el, start: "top 82%" } }),
      );
    });
    let t = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    });
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    if (!bagOpen) return;
    document.documentElement.classList.add("is-locked");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBagOpen(false);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      if (!open) document.documentElement.classList.remove("is-locked");
    };
  }, [bagOpen, open]);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const add = (index: number, size: string) =>
    setLines((ls) => {
      const found = ls.find((l) => l.index === index && l.size === size);
      return found ? ls.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { index, size, qty: 1 }];
    });
  const changeQty = (line: BagLine, delta: number) =>
    setLines((ls) => ls.flatMap((l) => (l === line ? (l.qty + delta > 0 ? [{ ...l, qty: l.qty + delta }] : []) : [l])));

  return (
    <>
      <Header count={count} onBag={() => setBagOpen(true)} />
      <main>
        <Rail onOpen={viewFromRail} hiddenIndex={open && !open.origin ? open.index : null} apiRef={rail} />
        <TryOn onView={view} />
        <Door onView={view} />
        <Lookbook onView={view} />
        <Zoom onView={view} />
        <Strip onView={view} />
        <Promises />
      </main>
      <Footer onView={view} />
      {open && (
        <Viewer
          key="viewer"
          index={open.index}
          from={open.from}
          back={(i) => (open.origin && document.contains(open.origin) ? { rect: open.origin.getBoundingClientRect(), angle: 0 } : rail.current?.measure(i) ?? null)}
          onNav={(i) => setOpen((o) => (o ? { ...o, index: i, origin: null, from: null } : o))}
          onClosed={() => setOpen(null)}
          onAdd={add}
        />
      )}
      <Bag open={bagOpen} lines={lines} onClose={() => setBagOpen(false)} onQty={changeQty} />
    </>
  );
}
