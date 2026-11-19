"use client";
import gsap from "gsap";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { PRODUCTS, img, pad2 } from "@/lib/products";
import { useI18n } from "@/i18n";
import { clamp, easeInOutQuad, reducedMotion, smooth } from "@/lib/scroll";

const N = PRODUCTS.length;

export type RailApi = {
  /** Rect of the front-and-centre garment, or null if `index` is not the one on display. */
  measure: (index: number) => { rect: DOMRect; angle: number } | null;
  focus: (index: number) => void;
};

function geometry(vw: number, vh: number) {
  const phone = vw < 760;
  const gh = phone ? Math.min(0.5 * vh, 1.02 * vw) : Math.min(0.68 * vh, 760);
  const gw = (760 * gh) / 917;
  return {
    phone,
    gh,
    gw,
    ax: phone ? 0.4 * vw : 0.27 * vw,
    ay: phone ? 0.15 * vh : 0.16 * vh,
    step: { x: gw * (phone ? 0.15 : 0.16), y: -(0.016 * gh), z: -(0.34 * gw) },
    vw,
    vh,
    persp: phone ? 900 : 1500,
  };
}

export default function Rail({
  onOpen,
  hiddenIndex,
  apiRef,
}: {
  onOpen: (index: number) => void;
  hiddenIndex: number | null;
  apiRef: MutableRefObject<RailApi | null>;
}) {
  const { t, money } = useI18n();
  const section = useRef<HTMLElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const info = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const sideBar = useRef<HTMLSpanElement>(null);
  const pos = useRef(0);
  const [geo, setGeo] = useState<ReturnType<typeof geometry> | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduced = reducedMotion();
    let g = geometry(innerWidth, innerHeight);
    let sectionTop = 0;
    const measureTop = () => {
      sectionTop = section.current!.getBoundingClientRect().top + scrollY;
    };
    const onResize = () => {
      const next = geometry(innerWidth, innerHeight);
      if (next.vw === g.vw && Math.abs(next.vh - g.vh) < 120) return;
      g = next;
      setGeo(next);
      requestAnimationFrame(measureTop);
    };
    setGeo(g);
    requestAnimationFrame(measureTop);
    addEventListener("resize", onResize);

    let raf = 0;
    let smoothPos = 0;
    let last = performance.now();
    let delta = 0;
    let swayVel = 0;
    let sway = 0;
    let lastIdx = -1;
    const intro = { t: reduced ? 1 : 0 };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = clamp((now - last) / 16.67, 0, 3);
      last = now;
      const target =
        clamp((scrollY - sectionTop) / Math.max(1, section.current!.offsetHeight - innerHeight)) * (N - 1);
      const before = smoothPos;
      smoothPos = reduced ? target : smoothPos + (target - smoothPos) * (1 - Math.pow(0.9, dt));
      delta = smoothPos - before;
      const base = Math.min(N - 2, Math.floor(smoothPos));
      const T = base + smooth((smoothPos - base - 0.18) / 0.64);
      pos.current = T;
      swayVel += -0.02 * sway - 6 * delta - 0.08 * swayVel;
      sway = clamp(sway + swayVel, -6, 6);
      const k = easeInOutQuad(intro.t);

      items.current.forEach((el, i) => {
        if (!el) return;
        const d = i - T + (1 - k) * (N + 2);
        let s: number;
        let ry: number;
        let opacity = 1;
        let dx = 0;
        let dy = 0;
        let dz = 0;
        if (d >= 1) {
          s = 2.4 + (d - 1);
          ry = -64;
        } else if (d >= 0) {
          const e = easeInOutQuad(d);
          s = 2.4 * e;
          ry = -64 * e;
        } else {
          const e = clamp(-d, 0, 1.4);
          s = 0;
          ry = 38 * smooth(e);
          dx = -(1.25 * g.gw) * easeInOutQuad(e);
          dz = 260 * e;
          dy = 20 * e;
          opacity = clamp(1 - 1.1 * e);
        }
        const x = g.step.x * s;
        const y = g.step.y * s;
        const z = g.step.z * s;
        if (d > N - 2) opacity *= clamp(N - d);
        const rz = Math.abs(d) < 0.5 ? sway * (1 - 2 * Math.abs(d)) : 0;
        el.style.transform = `translate3d(${x + dx}px, ${y + dy}px, ${z + dz}px) rotateY(${ry}deg) rotateZ(${rz}deg)`;
        el.style.opacity = String(opacity);
        el.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
        el.tabIndex = Math.round(T) === i ? 0 : -1;
      });

      const idx = Math.round(T);
      if (idx !== lastIdx) {
        lastIdx = idx;
        setActive(idx);
        if (counter.current) counter.current.textContent = pad2(idx + 1);
      }
      if (sideBar.current) sideBar.current.style.transform = `translateY(${(T / (N - 1)) * 100}%)`;
    };
    raf = requestAnimationFrame(frame);
    const introTween = reduced ? null : gsap.to(intro, { t: 1, duration: 2.2, ease: "power3.out", delay: 0.2 });

    apiRef.current = {
      measure: (index) => {
        const el = items.current[index];
        if (!el || Math.abs(pos.current - index) > 0.05) return null;
        const prev = el.style.transform;
        el.style.transform = prev.replace(/rotateZ\([^)]*\)/, "rotateZ(0deg)");
        const rect = el.getBoundingClientRect();
        el.style.transform = prev;
        return { rect, angle: 0 };
      },
      focus: (index) =>
        scrollTo({
          top: sectionTop + (index / (N - 1)) * (section.current!.offsetHeight - innerHeight),
          behavior: "instant",
        }),
    };
    return () => {
      cancelAnimationFrame(raf);
      introTween?.kill();
      removeEventListener("resize", onResize);
    };
  }, [apiRef]);

  // Text block rises in whenever the displayed piece changes.
  useEffect(() => {
    const root = info.current;
    if (!root) return;
    gsap.fromTo(
      root.querySelectorAll("[data-rise]"),
      { y: 14, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.035, overwrite: true },
    );
  }, [active]);

  const step = (dir: number) => {
    const next = clamp(Math.round(pos.current) + dir, 0, N - 1);
    const el = section.current!;
    scrollTo({
      top: el.getBoundingClientRect().top + scrollY + (next / (N - 1)) * (el.offsetHeight - innerHeight),
      behavior: "smooth",
    });
  };

  const p = PRODUCTS[active];
  const railStyle =
    geo &&
    (() => {
      const s = geo.step;
      const len = Math.hypot(s.x, s.y, s.z);
      return {
        width: len * (2.4 + N - 0.6 + 1.2),
        transform: `translate3d(${-1.2 * s.x}px, ${-1.2 * s.y}px, ${-1.2 * s.z}px) rotateY(${(180 * Math.atan2(-s.z, s.x)) / Math.PI}deg) rotateZ(${(180 * Math.atan2(s.y, Math.hypot(s.x, s.z))) / Math.PI}deg)`,
      };
    })();

  return (
    <section
      ref={section}
      id="rail"
      className="rk"
      aria-label={t("The rack")}
      style={
        {
          height: `${100 + (N - 1) * 55}svh`,
          ...(geo ? { "--gh": `${geo.gh}px`, "--gw": `${geo.gw}px` } : {}),
        } as React.CSSProperties
      }
    >
      <div
        className="rk-stage"
        style={geo ? { perspective: `${geo.persp}px`, perspectiveOrigin: `${geo.ax}px ${geo.ay + 0.3 * geo.gh}px` } : undefined}
      >
        <div className="rk-world" style={geo ? { left: geo.ax, top: geo.ay } : undefined}>
          {railStyle && <div className="rk-rail" style={railStyle} aria-hidden />}
          {PRODUCTS.map((it, i) => (
            <button
              key={it.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              className={`rk-item${hiddenIndex === i ? " is-gone" : ""}`}
              aria-label={t("{name} in {colour}, {price}", { name: t(it.name), colour: t(it.colour), price: money(it.price) })}
              onClick={() => (Math.abs(pos.current - i) < 0.3 ? onOpen(i) : step(i - Math.round(pos.current)))}
            >
              <img src={img(`${it.id}-front.webp`)} alt="" draggable={false} />
            </button>
          ))}
        </div>
        <div className="rk-side" aria-hidden>
          <span>01</span>
          <i>
            <span ref={sideBar} />
          </i>
          <span>{pad2(N)}</span>
        </div>
        <div ref={info} className="rk-info">
          <p data-rise className="rk-n">
            {pad2(active + 1)} / {pad2(N)}
          </p>
          <h1 data-rise className="rk-name">
            {t(p.name)} <em>{t("in {colour}", { colour: t(p.colour) })}</em>
          </h1>
          <p data-rise className="rk-blurb">
            {t(p.blurb)}
          </p>
          <dl data-rise className="rk-specs">
            <div>
              <dt>{t("Material")}</dt>
              <dd>{t(p.fabric)}</dd>
            </div>
            <div>
              <dt>{t("Fit")}</dt>
              <dd>{t(p.fit)}</dd>
            </div>
            <div>
              <dt>{t("Size")}</dt>
              <dd>{p.sizes.filter((s) => !p.soldOut?.includes(s)).join(" / ")}</dd>
            </div>
          </dl>
          <div data-rise className="rk-buy">
            <span>{money(p.price)}</span>
            <button type="button" onClick={() => onOpen(active)}>
              {t("View details")} <i aria-hidden>↗</i>
            </button>
          </div>
        </div>
        <div className="rk-nav">
          <button type="button" onClick={() => step(-1)} aria-label={t("Previous piece")}>
            ←
          </button>
          <span>
            <span ref={counter}>01</span> / {pad2(N)}
          </span>
          <button type="button" onClick={() => step(1)} aria-label={t("Next piece")}>
            →
          </button>
        </div>
        <div className="rk-foot">
          <span>{t("Autumn 26")}</span>
          <span>{t("The Autumn Rail")}</span>
          <span className="rk-hint">{t("Scroll · select · explore")}</span>
        </div>
      </div>
    </section>
  );
}
