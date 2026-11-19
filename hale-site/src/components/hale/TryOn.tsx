"use client";
import { useRef } from "react";
import { useI18n } from "@/i18n";
import { PRODUCTS, img, pad2 } from "@/lib/products";
import { clamp, lerp, reducedMotion, smooth, useStickyProgress } from "@/lib/scroll";

const N = PRODUCTS.length;

type Layout = { w: number; h: number; H: number; top: number; cx: number; R: number; Hg: number; gTop: number; body: { y: number; s: number } };

export default function TryOn({ onView }: { onView: (index: number, origin: HTMLElement | null) => void }) {
  const { t, money } = useI18n();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLDivElement>(null);
  const wears = useRef<(HTMLImageElement | null)[]>([]);
  const hangs = useRef<(HTMLImageElement | null)[]>([]);
  const info = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const shown = useRef(0);
  const eased = useRef(0);
  const layout = useRef<Layout>({ w: 0, h: 0, H: 0, top: 0, cx: 0, R: 0, Hg: 0, gTop: 0, body: { y: 0, s: 0.46 } });

  const measure = () => {
    const w = stage.current!.clientWidth;
    const h = stage.current!.clientHeight;
    const phone = w < 760;
    const H = phone ? Math.min(0.6 * h, 560) : Math.min(0.84 * h, 920);
    const top = phone ? 0.27 * h : h - 0.05 * h - H;
    const Hg = H * (phone ? 0.42 : 0.5);
    const gTop = top + 0.08 * H;
    layout.current = {
      w,
      h,
      H,
      top,
      cx: w / 2,
      R: phone ? 0.4 * w : Math.min(0.27 * w, 0.78 * H),
      Hg,
      gTop,
      body: { y: top + 0.054 * H - (gTop + 0.04 * Hg), s: (0.23 * H) / Hg },
    };
    Object.assign(fig.current!.style, { height: `${H}px`, width: `${(500 * H) / 1402}px`, top: `${top}px` });
    const gw = (760 / 917) * Hg;
    hangs.current.forEach((el) => el && Object.assign(el.style, { width: `${gw}px`, height: `${Hg}px`, left: `${w / 2 - 0.493 * gw}px`, top: `${gTop}px` }));
  };

  useStickyProgress(
    section,
    (progress) => {
      const L = layout.current;
      const target = progress * (N - 1);
      eased.current = reducedMotion() ? target : eased.current + (target - eased.current) * 0.12;
      const pos = eased.current;
      const base = Math.min(N - 2, Math.floor(pos));
      const a = smooth((pos - base - 0.25) / 0.6);
      const p = base + a;

      wears.current.forEach((el, i) => {
        if (!el) return;
        if (i === base) {
          el.style.opacity = "1";
          el.style.zIndex = "1";
          el.style.maskImage = el.style.webkitMaskImage = "none";
        } else if (i === base + 1) {
          const e = smooth((a - 0.4) / 0.6);
          const mask = `linear-gradient(180deg, #000 ${125 * e - 25}%, transparent ${125 * e}%)`;
          el.style.opacity = e > 0 ? "1" : "0";
          el.style.zIndex = "2";
          el.style.maskImage = el.style.webkitMaskImage = mask;
        } else el.style.opacity = "0";
      });

      hangs.current.forEach((el, i) => {
        if (!el) return;
        const d = i - p;
        const ad = Math.abs(d);
        const sign = Math.sign(d) || 1;
        const near = Math.min(1, ad);
        let o: number;
        if (ad >= 1) o = 0.2 * clamp(2 - ad);
        else if (d > 0) o = d > 0.5 ? lerp(0.2, 1, (1 - d) / 0.5) : clamp((d - 0.02) / 0.3);
        else o = 0.2 * clamp((ad - 0.25) / 0.75);
        const x = sign * (ad <= 1 ? L.R * ad : L.R + (ad - 1) * L.R * 0.5);
        const y = lerp(L.body.y, 0, near);
        const s = lerp(L.body.s, 1, near);
        const rot = d > 0 && d < 1 ? -7 * Math.sin(d * Math.PI) : 0;
        el.style.opacity = String(o);
        el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s}) rotate(${rot}deg)`;
      });

      const idx = a > 0.6 ? base + 1 : base;
      if (idx !== shown.current) {
        shown.current = idx;
        const root = info.current!;
        const piece = PRODUCTS[idx];
        root.classList.remove("is-in");
        void root.offsetWidth;
        root.querySelector("[data-n]")!.textContent = `${pad2(idx + 1)} / ${pad2(N)}`;
        root.querySelector("[data-name]")!.textContent = t(piece.name);
        root.querySelector("[data-colour]")!.textContent = t("in {colour}", { colour: t(piece.colour) });
        root.querySelector("[data-price]")!.textContent = money(piece.price);
        root.classList.add("is-in");
        rows.current.forEach((li, r) => li?.classList.toggle("is-on", r === idx));
      }
    },
    measure,
  );

  return (
    <section ref={section} className="to" style={{ height: `${100 + (N - 1) * 75}svh` }} aria-label={t("Try it on")}>
      <div ref={stage} className="to-stage">
        <div className="to-copy">
          <p className="eyebrow">{t("Try it on")}</p>
          <h2>
            {t("One man,")} <em>{t("eight pieces.")}</em>
          </h2>
          <p>{t("Scroll, and the next piece comes off the rail and onto him. Same trousers, same trainers; only the top layer changes.")}</p>
        </div>
        {PRODUCTS.map((p, i) => (
          <img
            key={p.id}
            ref={(el) => {
              hangs.current[i] = el;
            }}
            className="to-hang"
            src={img(`${p.id}-flat.webp`)}
            alt=""
            aria-hidden
          />
        ))}
        <div ref={fig} className="to-fig">
          {PRODUCTS.map((p, i) => (
            <img
              key={p.id}
              ref={(el) => {
                wears.current[i] = el;
              }}
              className="to-wear"
              src={img(`wear-${p.id}.webp`)}
              alt={t("The model wearing the {name} in {colour}", { name: t("def|" + p.name), colour: t(p.colour) })}
              loading={i < 2 ? "eager" : "lazy"}
              style={{ opacity: i === 0 ? 1 : 0 }}
            />
          ))}
          <i className="to-floor" aria-hidden />
        </div>
        <div ref={info} className="to-info is-in">
          <span data-n>01 / {pad2(N)}</span>
          <b data-name>{t(PRODUCTS[0].name)}</b>
          <em data-colour>{t("in {colour}", { colour: t(PRODUCTS[0].colour) })}</em>
          <span className="to-buy">
            <span data-price>{money(PRODUCTS[0].price)}</span>
            <button type="button" onClick={(e) => onView(PRODUCTS.findIndex((_, k) => k === shown.current), e.currentTarget)}>
              {t("View piece")}
            </button>
          </span>
        </div>
        <ol className="to-index" aria-hidden>
          {PRODUCTS.map((p, i) => (
            <li
              key={p.id}
              ref={(el) => {
                rows.current[i] = el;
              }}
              className={i === 0 ? "is-on" : ""}
            >
              <span>{pad2(i + 1)}</span>
              {t(p.name)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
