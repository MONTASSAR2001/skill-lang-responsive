"use client";
import { useRef } from "react";
import { useI18n } from "@/i18n";
import { PRODUCTS, PROMISES, STRIP, img, indexOfId, pad2 } from "@/lib/products";
import { easeInOutCubic, reducedMotion, useStickyProgress } from "@/lib/scroll";

type OnView = (index: number, origin: HTMLElement | null) => void;

/** Lookbook: a worn look, one hotspot, and a "shop the look" card. */
export function Lookbook({ onView }: { onView: OnView }) {
  const { t, money } = useI18n();
  const hot = PRODUCTS[indexOfId("04")];
  return (
    <section id="lookbook" className="lb" aria-label={t("Lookbook")}>
      <div className="lb-word" aria-hidden>
        {t("Worn,")} {t("not styled.")}
      </div>
      <div className="lb-grid">
        <div className="lb-copy" data-reveal>
          <p className="eyebrow">{t("Lookbook — 01")}</p>
          <h2>
            {t("Worn,")}
            <br />
            <em>{t("not styled.")}</em>
          </h2>
          <p>{t("The chore jacket over a plain tee and pleated wool trousers. It is the outfit we keep reaching for, so it is the one we photographed.")}</p>
        </div>
        <figure className="lb-figure">
          <img className="lb-model" src={img("model.webp")} alt={t("A model wearing the olive chore jacket over a white tee and charcoal pleated trousers")} />
          <i className="lb-floor" aria-hidden />
          <button
            type="button"
            className="lb-dot"
            style={{ left: "72%", top: "28%" }}
            aria-label={t("View the {name}", { name: t("def|" + hot.name) })}
            onClick={(e) => onView(indexOfId(hot.id), e.currentTarget)}
          >
            <i />
            <span>
              {t(hot.name)} — {money(hot.price)}
            </span>
          </button>
        </figure>
        <div className="lb-shop" data-reveal>
          <p className="eyebrow">{t("Shop the look")}</p>
          <button type="button" className="lb-card" onClick={(e) => onView(indexOfId(hot.id), e.currentTarget)}>
            <span className="lb-thumb" style={{ background: hot.tint }}>
              <img src={img(`${hot.id}-front.webp`)} alt="" />
            </span>
            <span className="lb-meta">
              <b>{t(hot.name)}</b>
              <em>
                {t(hot.colour)} · {t(hot.fabric)}
              </em>
              <span>
                {money(hot.price)} <u>{t("View")}</u>
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

/** "Out in it": a horizontal strip pinned to vertical scroll. */
export function Strip({ onView }: { onView: OnView }) {
  const { t, money } = useI18n();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pics = useRef<(HTMLDivElement | null)[]>([]);
  const range = useRef(0);
  const eased = useRef(0);

  useStickyProgress(
    section,
    (t) => {
      eased.current = reducedMotion() ? t : eased.current + (t - eased.current) * 0.14;
      const x = -easeInOutCubicLinear((eased.current - 0.06) / 0.88) * range.current;
      track.current!.style.transform = `translate3d(${x}px,0,0)`;
      const mid = innerWidth / 2;
      pics.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const off = (r.left + r.width / 2 - mid) / innerWidth;
        (el.firstElementChild as HTMLElement).style.transform = `translateX(${-(12 * off)}%) scale(1.18)`;
      });
    },
    () => {
      range.current = Math.max(0, track.current!.scrollWidth - innerWidth);
      section.current!.style.height = `${innerHeight + range.current}px`;
    },
  );

  return (
    <section ref={section} className="st" aria-label={t("Out in it")}>
      <div className="st-stage">
        <div ref={track} className="st-track">
          <div className="st-intro">
            <p className="eyebrow">{t("Out in it")}</p>
            <h2>
              {t("Clothes for")}
              <br />
              <em>{t("ordinary days.")}</em>
            </h2>
          </div>
          {STRIP.map((card, n) => {
            const p = card.piece ? PRODUCTS[indexOfId(card.piece)] : null;
            return (
              <figure className="st-card" key={card.image}>
                <div
                  className="st-pic"
                  ref={(el) => {
                    pics.current[n] = el;
                  }}
                >
                  <img src={img(card.image)} alt={t(card.caption)} loading="lazy" draggable={false} />
                </div>
                <figcaption>
                  <span>{pad2(n + 1)}</span>
                  <em>{t(card.caption)}</em>
                  {p && (
                    <button type="button" onClick={(e) => onView(indexOfId(p.id), e.currentTarget.closest("figure")!.querySelector<HTMLElement>(".st-pic"))}>
                      {t("{name}, {colour} · {price}", { name: t(p.name), colour: t(p.colour), price: money(p.price) })}
                    </button>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
// the original eases the strip with a smoothstep over the middle 88% of the range
function easeInOutCubicLinear(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function Promises() {
  const { t } = useI18n();
  return (
    <section id="studio" className="pr" aria-label={t("Our promises")}>
      <div className="pr-grid" data-reveal>
        {PROMISES.map((p) => (
          <div className="pr-item" key={p.n}>
            <span>{p.n}</span>
            <h3>{t(p.title)}</h3>
            <p>{t(p.body)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// kept for API symmetry with the other sticky sections
void easeInOutCubic;
