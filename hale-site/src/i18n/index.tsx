"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { fr } from "./fr";

export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];

const DICTIONARIES: Record<Locale, Record<string, string>> = { en: {}, fr };
const NUMBER_LOCALE: Record<Locale, string> = { en: "en-US", fr: "fr-FR" };

type Vars = Record<string, string | number>;
export type T = (key: string, vars?: Vars) => string;

const Ctx = createContext<{ locale: Locale; t: T; money: (n: number) => string }>({
  locale: "en",
  t: (k) => k,
  money: (n) => `$${n}`,
});

/** English source text is the key. A missing entry falls back to English (and warns in development). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => {
    const dict = DICTIONARIES[locale];
    const t: T = (key, vars) => {
      // "ctx|English" keys disambiguate homographs and article forms; English shows the part after "|"
      const raw = locale === "en" ? key.split("|").pop() : dict[key];
      if (raw === undefined && process.env.NODE_ENV !== "production") console.warn(`[i18n] missing ${locale}: "${key}"`);
      const text = raw ?? key;
      return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;
    };
    const fmt = new Intl.NumberFormat(NUMBER_LOCALE[locale], { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 });
    return { locale, t, money: (n: number) => fmt.format(n) };
  }, [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
