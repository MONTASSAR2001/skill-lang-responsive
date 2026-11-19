"use client";
import { useRef } from "react";
import { useI18n } from "@/i18n";
import { PRODUCTS, img, indexOfId } from "@/lib/products";
import { clamp, lerp, reducedMotion, smooth, easeInOutCubic, useStickyProgress } from "@/lib/scroll";

type Tile = { el: HTMLElement; delay: number };

export default function Door({ onView }: { onView: (index: number, origin: HTMLElement | null) => void }) {
  const { t, money, locale } = useI18n();
  const section = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const tag = useRef<HTMLButtonElement>(null);
  const shade = useRef<HTMLElement>(null);
  const tiles = useRef<Tile[]>([]);
  const piece = PRODUCTS[indexOfId("05")];

  const build = () => {
    const g = grid.current!;
    const phone = innerWidth < 760;
    const cols = phone ? 5 : 12;
    const rows = phone ? 9 : 7;
    g.innerHTML = "";
    g.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    g.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    const list: Tile[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const el = document.createElement("i");
        g.appendChild(el);
        const dx = (c + 0.5) / cols - 0.68;
        const dy = (r + 0.5) / rows - 0.5;
        const noise = Math.abs(43758.5453 * Math.sin(12.9898 * r + 78.233 * c)) % 1;
        list.push({ el, delay: 0.72 * clamp(Math.hypot(1.2 * dx, dy) / 0.8) + 0.28 * noise });
      }
    }
    tiles.current = list;
  };

  useStickyProgress(
    section,
    (t) => {
      const e = reducedMotion() ? 1 : clamp((t + 0.22) / 0.66);
      for (const tile of tiles.current) {
        const k = 1 - Math.pow(1 - clamp((e - 0.62 * tile.delay) / 0.38), 3);
        tile.el.style.transform = `scale(${(1 - k) * 1.04})`;
        tile.el.style.borderRadius = `${40 * k}%`;
      }
      image.current!.style.transform = `scale(${lerp(1.16, 1, easeInOutCubic(e))})`;
      shade.current!.style.opacity = String(smooth((e - 0.5) / 0.4));
      const a = smooth((t - 0.55) / 0.2);
      title.current!.style.opacity = String(a);
      title.current!.style.transform = `translateY(${(1 - a) * 40}px)`;
      const b = smooth((t - 0.66) / 0.18);
      tag.current!.style.opacity = String(b);
      tag.current!.style.transform = `translateY(${(1 - b) * 20}px)`;
    },
    build,
  );

  return (
    <section ref={section} className="tl" aria-label={t("Out the door")}>
      <div className="tl-stage">
        <img
          ref={image}
          className="tl-img"
          src={img("street.webp")}
          alt={t("A man walking down an old stone street in the {name}", { name: locale === "en" ? piece.name.toLowerCase() : t("def|" + piece.name) })}
        />
        <div ref={grid} className="tl-grid" aria-hidden />
        <i ref={shade} className="tl-shade" aria-hidden />
        <h2 ref={title} className="tl-title">
          {t("Out the door")}
          <br />
          <em>{t("by eight.")}</em>
        </h2>
        <button ref={tag} type="button" className="tl-tag" onClick={(e) => onView(indexOfId("05"), e.currentTarget)}>
          <span>
            {t(piece.name)} {t("in {colour}", { colour: t(piece.colour) })}
          </span>
          <b>{money(piece.price)}</b>
          <u>{t("View")}</u>
        </button>
      </div>
    </section>
  );
}
