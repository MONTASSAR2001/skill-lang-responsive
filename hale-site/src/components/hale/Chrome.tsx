"use client";
import { useEffect, useState } from "react";
import { FREE_SHIPPING_OVER, PRODUCTS, img } from "@/lib/products";
import { useI18n } from "@/i18n";

export type BagLine = { index: number; size: string; qty: number };

export function Header({ count, onBag }: { count: number; onBag: () => void }) {
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [menu]);
  const links = [
    ["#rail", "Rail"],
    ["#lookbook", "Lookbook"],
    ["#studio", "Studio"],
  ] as const;
  return (
    <>
      <header className="hd">
        <a className="hd-mark" href="#rail">
          HALE
        </a>
        <nav className="hd-nav" aria-label={t("Main")}>
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {t(label)}
            </a>
          ))}
        </nav>
        {/* below 760px the three links used to disappear with no replacement: a toggle + panel keeps them reachable */}
        <button type="button" className="hd-menu" aria-expanded={menu} aria-controls="hd-panel" onClick={() => setMenu((m) => !m)}>
          {t("Menu")}
        </button>
        <button type="button" className="hd-bag" onClick={onBag}>
          {t("Bag")} <span className={count > 0 ? "is-full" : ""}>{count}</span>
        </button>
      </header>
      <nav id="hd-panel" className={`hd-panel${menu ? " is-open" : ""}`} aria-label={t("Main menu")}>
        {links.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setMenu(false)}>
            {t(label)}
          </a>
        ))}
      </nav>
    </>
  );
}

export function Bag({
  open,
  lines,
  onClose,
  onQty,
}: {
  open: boolean;
  lines: BagLine[];
  onClose: () => void;
  onQty: (line: BagLine, delta: number) => void;
}) {
  const { t, money } = useI18n();
  const subtotal = lines.reduce((sum, l) => sum + PRODUCTS[l.index].price * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const away = Math.max(0, FREE_SHIPPING_OVER - subtotal);
  return (
    <div className={`bag${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="bag-dim" onClick={onClose} />
      <aside className="bag-panel" role="dialog" aria-label={t("Your bag")}>
        <div className="bag-head">
          <h2>
            {t("Your bag")} <span>{count}</span>
          </h2>
          <button type="button" aria-label={t("Close bag")} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="bag-ship">
          <p>{away > 0 ? t("You are {amount} away from free shipping", { amount: money(away) }) : t("Shipping is on us")}</p>
          <i>
            <span style={{ transform: `scaleX(${Math.min(1, subtotal / FREE_SHIPPING_OVER)})` }} />
          </i>
        </div>
        <ul className="bag-list">
          {lines.length === 0 && <li className="bag-empty">{t("Nothing here yet. Take something off the rail.")}</li>}
          {lines.map((l) => {
            const p = PRODUCTS[l.index];
            return (
              <li key={p.id + l.size}>
                <span className="bag-thumb" style={{ background: p.tint }}>
                  <img src={img(`${p.id}-front.webp`)} alt="" />
                </span>
                <span className="bag-meta">
                  <b>{t(p.name)}</b>
                  <em>
                    {t(p.colour)} · {l.size}
                  </em>
                  <span className="bag-qty">
                    <button type="button" aria-label={t("One less")} onClick={() => onQty(l, -1)}>
                      −
                    </button>
                    {l.qty}
                    <button type="button" aria-label={t("One more")} onClick={() => onQty(l, 1)}>
                      +
                    </button>
                  </span>
                </span>
                <span className="bag-price">{money(p.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
        <div className="bag-foot">
          <p>
            <span>{t("Subtotal")}</span>
            <b>{money(subtotal)}</b>
          </p>
          <button type="button" disabled={!lines.length}>
            {t("Checkout")}
          </button>
          <small>{t("Taxes and shipping worked out at checkout")}</small>
        </div>
      </aside>
    </div>
  );
}
