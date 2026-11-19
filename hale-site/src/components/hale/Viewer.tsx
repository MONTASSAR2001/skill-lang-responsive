"use client";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FREE_SHIPPING_OVER, PRODUCTS, img, pad2 } from "@/lib/products";
import { useI18n } from "@/i18n";
import { reducedMotion } from "@/lib/scroll";

export type FlyFrom = { rect: DOMRect; angle: number } | null;

type Props = {
  index: number;
  from: FlyFrom;
  /** Where the garment should fly back to when closing (null → fade out). */
  back: (index: number) => FlyFrom;
  onNav: (index: number) => void;
  onClosed: () => void;
  onAdd: (index: number, size: string) => void;
};

export default function Viewer({ index, from, back, onNav, onClosed, onAdd }: Props) {
  const { t, money } = useI18n();
  const p = PRODUCTS[index];
  const root = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const turn = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const sizes = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const busy = useRef(true);
  const first = useRef(true);
  const dir = useRef(1);
  const [side, setSide] = useState<"front" | "back">("front");
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [warn, setWarn] = useState(false);

  // Opening animation (runs once).
  useLayoutEffect(() => {
    const reduced = reducedMotion();
    const tl = gsap.timeline({ onComplete: () => (busy.current = false) });
    tl.fromTo(".pv-bg", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, 0);
    if (from && !reduced) {
      const r = fly.current!.getBoundingClientRect();
      tl.fromTo(
        fly.current,
        { x: from.rect.left - r.left, y: from.rect.top - r.top, scale: from.rect.width / r.width },
        { x: 0, y: 0, scale: 1, duration: 1.05, ease: "power4.inOut" },
        0,
      );
      tl.fromTo(tilt.current, { rotation: from.angle, y: 0 }, { rotation: 0, duration: 0.5, ease: "power2.out" }, 0);
    } else {
      tl.fromTo(fly.current, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0);
    }
    tl.fromTo(".pv-line", { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut" }, 0.35);
    tl.fromTo(".pv-shadow", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.7);
    tl.fromTo(
      info.current!.querySelectorAll(".pv-in"),
      { y: 26, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.05 },
      0.45,
    );
    tl.fromTo(".pv-chrome", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.6);
    document.documentElement.classList.add("is-locked");
    return () => {
      tl.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => document.documentElement.classList.remove("is-locked"), []);

  // Switching piece while open: slide the new one in.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    angle.current = 0;
    gsap.set(turn.current, { rotationY: 0 });
    const tl = gsap.timeline({ onComplete: () => (busy.current = false) });
    tl.fromTo(fly.current, { xPercent: 60 * dir.current, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.75, ease: "power3.out" }, 0);
    tl.fromTo(tilt.current, { rotation: -9 * dir.current }, { rotation: 0, duration: 1.6, ease: "elastic.out(1, 0.35)" }, 0);
    tl.fromTo(
      info.current!.querySelectorAll(".pv-in"),
      { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.04 },
      0.1,
    );
    return () => {
      tl.kill();
    };
  }, [index]);

  const go = (d: number) => {
    if (busy.current) return;
    busy.current = true;
    dir.current = d;
    const next = (index + d + PRODUCTS.length) % PRODUCTS.length;
    gsap
      .timeline({
        onComplete: () => {
          setSide("front");
          setSize(null);
          setWarn(false);
          onNav(next);
        },
      })
      .to(fly.current, { xPercent: -(60 * d), autoAlpha: 0, duration: 0.4, ease: "power2.in" }, 0)
      .to(info.current!.querySelectorAll(".pv-in"), { y: -12, autoAlpha: 0, duration: 0.3, ease: "power2.in", stagger: 0.02 }, 0);
  };

  const close = () => {
    if (busy.current) return;
    busy.current = true;
    const target = back(index);
    const tl = gsap.timeline({ onComplete: onClosed });
    tl.to(info.current!.querySelectorAll(".pv-in"), { y: 16, autoAlpha: 0, duration: 0.35, ease: "power2.in", stagger: 0.02 }, 0);
    tl.to(".pv-chrome, .pv-shadow", { autoAlpha: 0, duration: 0.3 }, 0);
    tl.to(".pv-line", { scaleX: 0, duration: 0.5, ease: "power3.in" }, 0);
    tl.to(turn.current, { rotationY: 360 * Math.round(angle.current / 360), duration: 0.5, ease: "power2.inOut" }, 0);
    if (target) {
      const cur = fly.current!.getBoundingClientRect();
      gsap.set(fly.current, { x: 0, y: 0, scale: 1 });
      const base = fly.current!.getBoundingClientRect();
      gsap.set(fly.current, { x: cur.left - base.left, y: cur.top - base.top, scale: cur.width / base.width });
      tl.to(
        fly.current,
        { x: target.rect.left - base.left, y: target.rect.top - base.top, scale: target.rect.width / base.width, duration: 0.95, ease: "power4.inOut" },
        0.1,
      );
    } else {
      tl.to(fly.current, { autoAlpha: 0, y: 40, duration: 0.5, ease: "power2.in" }, 0.1);
    }
    tl.to(".pv-bg", { autoAlpha: 0, duration: 0.55, ease: "power2.inOut" }, 0.45);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const turnTo = (deg: number) => {
    angle.current = deg;
    gsap.to(turn.current, { rotationY: deg, duration: 1, ease: "power3.inOut" });
    gsap.fromTo(tilt.current, { rotation: 0 }, { keyframes: { rotation: [0, -2.4, 1.6, -0.6, 0] }, duration: 1.4, ease: "none" });
    setSide(Math.round(deg / 180) % 2 === 0 ? "front" : "back");
  };

  // Drag to turn.
  useEffect(() => {
    const el = turn.current!;
    let drag: { x: number; start: number } | null = null;
    let moved = false;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, start: angle.current };
      moved = false;
      el.setPointerCapture(e.pointerId);
      gsap.killTweensOf(el);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) moved = true;
      angle.current = drag.start + 0.5 * dx;
      gsap.set(el, { rotationY: angle.current });
      setSide(Math.round(angle.current / 180) % 2 === 0 ? "front" : "back");
    };
    const up = () => {
      if (!drag) return;
      drag = null;
      const snap = 180 * Math.round(angle.current / 180);
      if (moved) {
        angle.current = snap;
        gsap.to(el, { rotationY: snap, duration: 0.8, ease: "elastic.out(1, 0.6)" });
        setSide(Math.round(snap / 180) % 2 === 0 ? "front" : "back");
      } else {
        turnTo(angle.current + 180);
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  const addToBag = () => {
    if (!size) {
      setWarn(true);
      gsap.fromTo(sizes.current, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: "none" });
      return;
    }
    onAdd(index, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div ref={root} className="pv" role="dialog" aria-modal="true" aria-label={t("{name} in {colour}", { name: t(p.name), colour: t(p.colour) })}>
      <div className="pv-bg" style={{ background: p.tint }} onClick={close} />
      <div className="pv-stage">
        <div className="pv-line" aria-hidden />
        <div ref={fly} className="pv-fly">
          <div ref={tilt} className="pv-tilt" style={{ transformOrigin: "49.3% 3.5%" }}>
            <div ref={turn} className="pv-turn" title={t("Drag to turn it around")}>
              <img className="pv-face" src={img(`${p.id}-front.webp`)} alt={t("{name}, front", { name: t(p.name) })} draggable={false} />
              <img className="pv-face pv-back" src={img(`${p.id}-back.webp`)} alt={t("{name}, back", { name: t(p.name) })} draggable={false} />
            </div>
          </div>
          <div className="pv-shadow" aria-hidden />
        </div>
        <div className="pv-chrome pv-turnbar">
          <div className="pv-seg" role="group" aria-label={t("angle|View")}>
            <button type="button" aria-pressed={side === "front"} onClick={() => side !== "front" && turnTo(angle.current + 180)}>
              {t("Front")}
            </button>
            <button type="button" aria-pressed={side === "back"} onClick={() => side !== "back" && turnTo(angle.current + 180)}>
              {t("Back")}
            </button>
            <i style={{ transform: `translateX(${side === "front" ? 0 : 100}%)` }} aria-hidden />
          </div>
          <span className="pv-tip">{t("or drag to turn")}</span>
        </div>
      </div>

      <div ref={info} className="pv-info">
        <div className="pv-scroll">
          <p className="pv-in pv-eyebrow">
            {pad2(index + 1)} / {pad2(PRODUCTS.length)} — {t(p.kind)}
          </p>
          <h2 className="pv-in pv-name">
            {t(p.name)} <em>{t("in {colour}", { colour: t(p.colour) })}</em>
          </h2>
          <p className="pv-in pv-price">{money(p.price)}</p>
          <p className="pv-in pv-blurb">{t(p.blurb)}</p>
          <div className="pv-in pv-sizehead">
            <span>{t("Size")}</span>
            <span className={warn && !size ? "is-warn" : ""}>
              {size ? t("{size} selected", { size }) : warn ? t("Pick a size first") : t("Fits true to size")}
            </span>
          </div>
          <div ref={sizes} className="pv-in pv-sizes">
            {p.sizes.map((s) => {
              const out = p.soldOut?.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out}
                  aria-pressed={size === s}
                  className={out ? "is-out" : ""}
                  onClick={() => {
                    setSize(s);
                    setWarn(false);
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <button type="button" className={`pv-in pv-add${added ? " is-added" : ""}`} onClick={addToBag}>
            <span>{added ? t("Added to bag") : t("Add to bag")}</span>
            <span>{money(p.price)}</span>
          </button>
          <p className="pv-in pv-small">{t("Free shipping over {amount} · Returns in 30 days", { amount: money(FREE_SHIPPING_OVER) })}</p>
          <dl className="pv-in pv-specs">
            <div>
              <dt>{t("Fabric")}</dt>
              <dd>{t(p.fabric)}</dd>
            </div>
            <div>
              <dt>{t("Fit")}</dt>
              <dd>{t(p.fit)}</dd>
            </div>
            <div>
              <dt>{t("Made in")}</dt>
              <dd>{t(p.made)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="pv-chrome pv-top">
        <button type="button" className="pv-close" onClick={close}>
          {t("Back to the rail")} <i aria-hidden>✕</i>
        </button>
      </div>
      <div className="pv-chrome pv-nav">
        <button type="button" onClick={() => go(-1)} aria-label={t("Previous piece")}>
          ←
        </button>
        <button type="button" onClick={() => go(1)} aria-label={t("Next piece")}>
          →
        </button>
      </div>
    </div>
  );
}
