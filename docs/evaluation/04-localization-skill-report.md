# smart-website-localization — results and evolution

Evidence labels: **AUTO** = frozen judge/script, **BROWSER** = measured in Chromium, **VISUAL** = screenshot opened, **LINGUISTIC** = read by the reviewer pass (same model family — *not* native-speaker verification), **UNTESTED**.

## 1. Versions

| | v1 (initial) | v2 (after dev-set iteration) |
|---|---|---|
| `SKILL.md` | 8-step workflow, 5 hard rules | 9 steps, 8 hard rules: *translate the source faithfully (never silently correct it)*, *separate review pass*, *layout fallout step*, *conventions/glossary step*, hreflang + switch in the architecture step |
| references | `rtl.md` (7 lines) | `rtl.md` (mirror test, CSS conversion list, scripts), `conventions.md` (numbers, currency, dates, units, honorifics, customs, plurals, never-translate, dynamic strings), `french.md`, `arabic.md` |
| `extract-strings.mjs` | rendered text only | + `--steps` (dialogs, menus, viewers) and `--source-dir` (candidate strings the render never showed: validation messages, plural branches) |
| `verify.mjs` | leakage, structure, title, overflow, "broken images" (**false positive** on lazy images) | + `pairs.tsv` for the mandatory read-through, **new/worse clipped text vs source at 4 widths**, real broken-asset check (HEAD), glossary + protected terms + term families, interpolation-token diff, code-block integrity, hreflang/canonical/metadata/a11y attributes, French typography, locale-convention leftovers, Arabic digit mixing, RTL mirror test, LTR fields, directional-glyph list |

## 2. Test design (what was run, on what)

* **Real world:** Hale (Next.js) → French. Strings are hard-coded in components and data; composed strings (`{name} in {colour}`), gendered garment names, strings that only exist after interaction (viewer, size picker, bag), 255 rendered strings + viewer/bag strings.
* **Controlled:** 9 dev cases × fr (+ar where RTL matters): l01–l09, 14 case/language pairs. **Held-out:** l10-docs (fr), l11-restaurant (fr, ar) — never opened while iterating.
* **Controls:** negative control (an untranslated copy tagged `lang="fr"`) is flagged by the judge: 3 critical + 3 major (`lab/results/control/`).
* **Independent evaluation:** executor (the skill's workflow) → frozen judge (`lab/harness/check-l10n.FROZEN.mjs`) → separate linguistic review pass (`lab/rubrics/l10n-linguistic.md`, findings in `lab/results/v1-run/linguistic-review.md` and `v2-run/linguistic-review.md`).
* **Calibration of the judge itself** (each found by a real false positive, not by looking for leniency): cognates/brand words flagged "untranslated" → per-case `allowIdentical`; substring term matching ("board" inside "Fluxboard") → whole-word + protected-name scrubbing; Arabic singular/plural counted as inconsistency → term *families*; Arabic clitics (و/ف) defeating word boundaries; US-number-format rule wrongly applied to Arabic with Western digits; RTL mirror test failed on width changes from translation → compare anchored edge; lazy images reported as broken → HEAD request; `sr-only` and intentionally clipped stages (Hale strip) counted as clipping → size and `ignoreClip`.

## 3. Results — dev set (frozen judge)

| Case/lang | v1 critical / major / minor | v2 critical / major / minor |
|---|---|---|
| l01 fr · l02 fr · l04 fr/ar · l05 fr/ar · l06 fr · l07 fr/ar · l09 fr | 0 / 0 / 0 | 0 / 0 / 0 |
| l02 ar · l06 ar · l08 ar | 0 / 0 / 1 (text-node split noise) | 0 / 0 / 1 |
| **l03 fr** | **4** / 0 / 0 — `text-clipped-after-translation`: 11 px of French text cut at 1280, 36 px at 768, 264 px at 390 | **0** / 0 / 0 |

`compare.mjs F-v1 F-v2`: **1 improved, 13 unchanged, 0 regressed.** The automated judge therefore found only **one** v1 failure class on the dev set; most other v1 outputs were already good, *including* the traps I expected to break it (French 0/1 singular, Arabic 6 plural forms, `Intl` formats, gendered article agreement, ⌘K, identifiers, mirrored layout and arrows).

What the judge **cannot** see, and the review pass found (`v1-run/linguistic-review.md`):

| v1 defect | severity | v2 result |
|---|---|---|
| l05 heading "Message counts" translated as "Nombre de fichiers" / "عدد الملفات" — the model silently "fixed" an inconsistent source | critical (meaning) | fixed via the new "translate faithfully, flag the inconsistency" rule + mandatory `pairs.tsv` read-through |
| l07 "Service" kept for a bike-service nav item | major | "Entretien" |
| l01 "Shop the drop" lost the limited-release urgency | major | "Découvrir le drop" |
| no `hreflang` anywhere (12 pages) | major | added (verify flags it) |
| French spacing before `: ; ? ! % $` and units (≈15 places) | minor | non-breaking spaces |
| US tipping custom kept in French copy | minor | adapted |

## 4. Results — Hale → French

| Step | Evidence |
|---|---|
| Architecture: English-as-key dictionary (`src/i18n/fr.ts`), `LocaleProvider`, `/` (en) and `/fr` with separate root layouts (`<html lang>`), `Intl.NumberFormat` money (`$120` → `120 $`), context keys (`def|Hoodie` → *le sweat à capuche*; `angle|View` → *Vue*), hreflang alternates + canonical in `metadata` | build passes, both routes static |
| Coverage | 255 rendered strings → 225 French strings; 0 left identical except brand/cognates (AUTO); viewer, size warning, "added" state, bag drawer, empty state, shipping progress all French (BROWSER probe) |
| Judge (frozen) | **0 critical / 0 major / 0 minor** for v1 and v2 builds |
| Visual | 1440×900 captures at six scroll positions read correctly (VISUAL); French headings and "en avoine" italics render with the original serif |
| Linguistic review | glossary decisions recorded in `fr.ts` (portant, pièce, panier, maison/atelier); *Taillé une fois. Porté des années.* (garment collocation instead of the literal *Coupé une fois*), *Dehors à huit heures.* for "Out the door by eight"; gender agreement solved without fragment concatenation |
| v2 additions | no-break spaces in French values, visible language switch (English · Français) with `aria-current`, `hreflang` alternates (already present via Next metadata) |

## 5. Held-out results (l10-docs fr, l11-restaurant fr + ar; opened only after the skill was frozen)

"First pass" = translation produced with the v1-level workflow (no hreflang, plain spaces, no review/verify v2). "v2.1" = the frozen v2.1 verifier + review applied to that same output. Judge = frozen `check-l10n`.

| case/lang | first pass: crit / major / minor (judge) | after v2.1: crit / major / minor (judge) | **after adjudication** |
|---|---|---|---|
| l10-docs fr | 3 / 1 / 0 | 2 / 1 / 0 | first pass: **1 real critical** (5 px page overflow at 320 px, the translated table headers) + no hreflang + 4 spacing spots; after v2.1: **0** |
| l11-restaurant fr | 1 / 1 / 0 | 1 / 1 / 0 | **0 real** (first pass: no hreflang, 1 spacing spot) |
| l11-restaurant ar | 1 / 0 / 0 | 1 / 0 / 0 | **0 real** (first pass: no hreflang) |

Adjudication of the remaining judge findings (all judge false positives, judged *after* seeing them, so listed openly):
* `inline-code-altered` ×2 (l10): the judge collapses whitespace in `<pre><code>` text nodes and then looks for the collapsed string in the raw `<pre>` text; the `<pre>` integrity check itself (`code-block-altered`) **passed** — only `#` comment lines changed, which is allowed.
* `untranslated-words` (l10 "Options/Description", l11 "Menu/Contact/Date"): valid French words (cognates) — no per-case `allowIdentical` list existed for held-out cases.
* `untranslated-sentences` (l11 fr/ar): the postal address and phone number *must* stay verbatim; the manifest's protected list did not cover the street part.
The frozen judge was **not** edited after these runs. The skill's own verifier showed the same address false positive — a real bug in `verify.mjs` (it only handled a string that is exactly one protected token) — fixed afterwards as **v2.2** (not re-measured on held-out; re-tested on l11: no critical).

Linguistic review of the held-out output (LINGUISTIC, same-model): l10 `Remarque :` / `Attention :` callouts, `Valeur par défaut`, commands and flags untouched, `Ctrl` kept; l11 *tomates anciennes*, *caramel au beurre salé*, `19 h 30`, `1 personne / 2 personnes`, Arabic `ضيف واحد / ضيفان / 4 ضيوف`, 24-hour times, LTR address island. Minor/unsure: *plat de côtes braisé 12 heures* (restaurant usage varies), Arabic *تراثية* for "heirloom" (plausible, not verified with a chef or native editor).

## 6. Limitations (honest)
* Linguistic quality is judged by the same model family that wrote the skill; no native review.
* The dev set is small and the model was already strong at it, so the measurable v1→v2 gain is mostly **process guardrails** (layout fallout, review pass, typography, hreflang) rather than better translations.
* `references/french.md` and `conventions.md` contain examples drawn from dev traps (idioms, units); the held-out cases test whether that generalizes.
* Arabic review is weaker than French review (reviewer confidence lower; digits policy and register choices unverified with native users).
* Not tested: translation memory/CMS workflows, pluralization libraries other than `Intl`, right-to-left *Hale* (Arabic was tested on lab cases only), languages other than fr/ar.
