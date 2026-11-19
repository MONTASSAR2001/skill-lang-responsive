"use client";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { FOOTER_COLUMNS, PRODUCTS, VISIT, img, indexOfId, pad2 } from "@/lib/products";
import { useI18n } from "@/i18n";
import { clamp, reducedMotion } from "@/lib/scroll";

type OnView = (index: number, origin: HTMLElement | null) => void;

/** The footer rail: eight garments hanging from a bar that swing when the pointer brushes past. */
function FooterRail({ onView }: { onView: OnView }) {
  const { t, money } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const swings = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = root.current!;
    const reduced = reducedMotion();
    const state = PRODUCTS.map((_, i) => ({ a: 0, w: 0, k: 0.02 + (i % 3) * 0.003, ph: 1.7 * i }));
    let raf = 0;
    let running = false;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = clamp((now - last) / 16.67, 0.5, 3);
      last = now;
      state.forEach((s, i) => {
        if (!reduced)
          for (let n = 0; n < Math.round(dt); n++) {
            s.w += -s.k * s.a - 0.03 * s.w;
            s.a = clamp(s.a + s.w, -24, 24);
          }
        const sw = swings.current[i];
        if (sw) sw.style.transform = `rotate(${reduced ? 0 : s.a + 0.4 * Math.sin(0.0012 * now + s.ph)}deg)`;
      });
    };
    let lastX = -1;
    const move = (e: PointerEvent) => {
      const dx = lastX < 0 ? 0 : e.clientX - lastX;
      lastX = e.clientX;
      if (!dx) return;
      items.current.forEach((it, i) => {
        if (!it) return;
        const r = it.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom) return;
        const lo = Math.min(e.clientX, e.clientX - dx);
        const hi = Math.max(e.clientX, e.clientX - dx);
        const cx = r.left + r.width / 2;
        if (cx >= lo - 0.3 * r.width && cx <= hi + 0.3 * r.width) state[i].w += 0.035 * clamp(dx, -40, 40);
      });
    };
    const leave = () => (lastX = -1);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    let dropped = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
        if (entry.isIntersecting && !dropped && !reduced) {
          dropped = true;
          items.current.forEach((it, i) => {
            if (!it) return;
            gsap.fromTo(
              it,
              { yPercent: -130, autoAlpha: 0 },
              { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.in", delay: 0.1 + 0.07 * i, onComplete: () => (state[i].w += (i % 2 ? 1 : -1) * 1.6) },
            );
          });
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={root} className="fr" style={{ touchAction: "pan-y" }}>
      <div className="fr-head">
        <span>{t("That's the whole rail — {count} pieces", { count: pad2(PRODUCTS.length) })}</span>
        <span className="fr-hint">{t("Brush past them · tap one to open it")}</span>
      </div>
      <div className="fr-rail" style={{ "--n": PRODUCTS.length } as React.CSSProperties}>
        <i className="fr-bar" aria-hidden />
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="fr-item"
            aria-label={t("{name} in {colour}, {price}", { name: t(p.name), colour: t(p.colour), price: money(p.price) })}
            ref={(el) => {
              items.current[i] = el;
            }}
            onClick={(e) => onView(i, e.currentTarget)}
          >
            <span
              className="fr-swing"
              ref={(el) => {
                swings.current[i] = el;
              }}
            >
              <img src={img(`${p.id}-front.webp`)} alt="" draggable={false} loading="lazy" />
            </span>
            <span className="fr-tag">
              <b>{t(p.name)}</b> {money(p.price)}
            </span>
          </button>
        ))}
      </div>
      <Newsletter />
    </div>
  );
}

function Newsletter() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <form
      className="fr-news"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <h2>
        {t("Hear when the")} <em>{t("rail changes.")}</em>
      </h2>
      <p>{t("One letter a season. New pieces, the workshops behind them, nothing else.")}</p>
      <label>
        <span className="sr">{t("Email address")}</span>
        <input type="email" required placeholder={t("Your email")} disabled={done} />
        <button type="submit" disabled={done}>
          {done ? t("You're on the list ✓") : t("Sign up →")}
        </button>
      </label>
    </form>
  );
}

export default function Footer({ onView }: { onView: OnView }) {
  const { t, locale } = useI18n();
  return (
    <footer className="ft">
      <FooterRail onView={onView} />
      <div className="fd">
        <div className="fd-grid">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p>{t(col.title)}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#rail">{t(l)}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p>{t(VISIT.title)}</p>
            <ul>
              {VISIT.lines.map((l) => (
                <li key={l}>{t(l)}</li>
              ))}
            </ul>
            <ul className="fd-social">
              {VISIT.social.map((l) => (
                <li key={l}>
                  <a href="#rail">{t(l)} ↗</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="fd-mark" style={{ backgroundImage: `url(${img("strip-5.webp")})` }} aria-hidden>
          HALE
        </div>
        <div className="fd-base">
          <span>{t("© 2026 HALE Studio")}</span>
          <span>{t("HALE is a demo brand. Clothing, names and prices are placeholders.")}</span>
          <nav className="fd-lang" aria-label={t("Language")}>
            <a href="/" lang="en" hrefLang="en" aria-current={locale === "en" ? "true" : undefined}>
              English
            </a>
            <a href="/fr" lang="fr" hrefLang="fr" aria-current={locale === "fr" ? "true" : undefined}>
              Français
            </a>
          </nav>
          <button type="button" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}>
            {t("Back to the rail ↑")}
          </button>
        </div>
      </div>
    </footer>
  );
}

export { indexOfId };
