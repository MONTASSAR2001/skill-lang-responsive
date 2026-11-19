"use client";
import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/i18n";
import { PRODUCTS, img, indexOfId } from "@/lib/products";
import { clamp, lerp, reducedMotion, smooth, easeInOutCubic, useStickyProgress } from "@/lib/scroll";

const ORIGIN = { x: 0.42, y: 0.3 };

/** Finds a point inside a glyph of the mask word so the zoom dives *into* a letter, not the gap between two. */
function findInsidePoint(textEl: SVGTextElement, w: number, h: number) {
  const fallback = { x: w / 2, y: h / 2 };
  try {
    const cw = Math.round(w * 0.5);
    const ch = Math.round(h * 0.5);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    const cs = getComputedStyle(textEl);
    const size = 0.5 * parseFloat(textEl.getAttribute("font-size") || "100");
    ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    ctx.letterSpacing = `${-0.04 * size}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(textEl.textContent || "", cw / 2, ch / 2);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    const solid = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < cw && y < ch && data[(Math.round(y) * cw + Math.round(x)) * 4 + 3] > 200;
    const r = Math.max(4, 0.05 * size);
    const deep = (x: number, y: number) =>
      solid(x, y) && [0, 1, 2, 3, 4, 5, 6, 7].every((k) => solid(x + Math.cos(0.785 * k) * r, y + Math.sin(0.785 * k) * r));
    for (let rad = 0; rad < Math.max(cw, ch) / 2; rad += 2) {
      const steps = Math.max(8, Math.round(0.8 * rad));
      for (let k = 0; k < steps; k++) {
        const x = cw / 2 + Math.cos((k / steps) * Math.PI * 2) * rad;
        const y = ch / 2 + Math.sin((k / steps) * Math.PI * 2) * rad;
        if (deep(x, y)) return { x: x / 0.5, y: y / 0.5 };
      }
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

export default function Zoom({ onView }: { onView: (index: number, origin: HTMLElement | null) => void }) {
  const { t, money } = useI18n();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const word = useRef<SVGTextElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const lineA = useRef<HTMLHeadingElement>(null);
  const lineB = useRef<HTMLHeadingElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const focus = useRef({ w: 1, h: 1, x: 0.5, y: 0.5 });
  const maskId = `zm-${useId().replace(/:/g, "")}`;
  const piece = PRODUCTS[indexOfId("07")];

  const measure = () => {
    const s = stage.current;
    const v = svg.current;
    const t = word.current;
    if (!s || !v || !t) return;
    const w = s.clientWidth;
    const h = s.clientHeight;
    v.setAttribute("viewBox", `0 0 ${w} ${h}`);
    v.querySelectorAll("rect").forEach((r) => {
      r.setAttribute("width", String(w));
      r.setAttribute("height", String(h));
    });
    const m = v.querySelector("mask")!;
    m.setAttribute("x", "0");
    m.setAttribute("y", "0");
    m.setAttribute("width", String(w));
    m.setAttribute("height", String(h));
    t.setAttribute("x", String(w / 2));
    t.setAttribute("y", String(h / 2));
    t.setAttribute("font-size", String(w < 760 ? 0.34 * w : Math.min(0.3 * w, 0.6 * h)));
    focus.current = { w, h, ...findInsidePoint(t, w, h) };
  };

  useEffect(() => {
    document.fonts?.ready.then(measure);
  });

  useStickyProgress(
    section,
    (t) => {
      const e = reducedMotion() ? 1 : easeInOutCubic(t / 0.7);
      const v = svg.current!;
      const f = focus.current;
      const k = Math.pow(120, e);
      v.setAttribute("viewBox", `${f.x - f.x / k} ${f.y - f.y / k} ${f.w / k} ${f.h / k}`);
      const fade = clamp((e - 0.82) / 0.14);
      v.style.opacity = String(1 - smooth(fade));
      v.style.visibility = smooth(fade) > 0.995 ? "hidden" : "visible";
      photo.current!.style.transform = `scale(${lerp(1.3, 1, e)})`;
      const h = smooth(e / 0.22);
      lineA.current!.style.opacity = lineB.current!.style.opacity = String(1 - h);
      lineA.current!.style.transform = `translateY(${-(40 * h)}px)`;
      lineB.current!.style.transform = `translateY(${40 * h}px)`;
      const d = smooth((t - 0.72) / 0.16);
      end.current!.style.opacity = String(d);
      end.current!.style.transform = `translateY(${(1 - d) * 30}px)`;
      end.current!.style.pointerEvents = d > 0.5 ? "auto" : "none";
    },
    measure,
  );

  return (
    <section ref={section} className="zm" aria-label={t("The workshop")}>
      <div ref={stage} className="zm-stage">
        <div className="zm-win">
          <img
            ref={photo}
            src={img("studio.webp")}
            alt={t("The workshop: a long cutting table with folded cloth, and a man in the rust corduroy jacket")}
            style={{ transformOrigin: `${100 * ORIGIN.x}% ${100 * ORIGIN.y}%` }}
          />
          <i className="zm-shade" aria-hidden />
        </div>
        <svg ref={svg} className="zm-veil" aria-hidden>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect fill="#fff" />
              <text ref={word} fill="#000" textAnchor="middle" dominantBaseline="central" className="zm-word">
                HALE
              </text>
            </mask>
          </defs>
          <rect style={{ fill: "var(--bg)" }} mask={`url(#${maskId})`} />
        </svg>
        <h2 ref={lineA} className="zm-a">
          {t("Cut once.")}
        </h2>
        <h2 ref={lineB} className="zm-b">
          <em>{t("Worn for years.")}</em>
        </h2>
        <div ref={end} className="zm-end">
          <h3>
            {t("Cut once.")} <em>{t("Worn for years.")}</em>
          </h3>
          <p>
            {t("Every piece starts on this table: a paper pattern, a bolt of cloth and a pair of shears. We make a few hundred at a time and mend them for as long as you wear them.")}
          </p>
          <button type="button" onClick={(e) => onView(indexOfId("07"), e.currentTarget)}>
            {t(piece.name)} {t("in {colour}", { colour: t(piece.colour) })} · {money(piece.price)} <u>{t("View")}</u>
          </button>
        </div>
      </div>
    </section>
  );
}
