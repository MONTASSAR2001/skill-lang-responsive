# Combined test — localization + responsive on the same site

Order followed (Part 13): analyze → localize to French → responsive-optimize the *localized* build → test at all widths → text expansion, navigation, forms, buttons → RTL separately → functional checks → screenshots → regressions → fix → re-verify.
Ownership stayed split: the localization skill edited words (`src/i18n/fr.ts`, locale routes, language switch, hreflang); the responsive skill edited layout (`globals.css`, `Chrome.tsx` header). Each re-verified after the other changed anything.

## 1. Hale (real site)

| Step | Skill / tool | Result |
|---|---|---|
| Analyze | responsive v2 audit on EN + scroll-through shots; localization `extract-strings` (255 rendered strings; viewer/bag only via source grep + `--steps`) | 37 critical groups on the original, all classes of Hale defects listed below |
| Localize → French | localization v1 → v2 (see `docs/04`) | `/fr` builds, **frozen l10n judge: 0 critical** (v1 and v2) |
| Responsive on EN **and** FR | responsive v1 (counts) → v2 (grouped, measured) → v3 | per-category table below |
| Text expansion | audit of `/fr` (`--compare` against the English audit) | French introduced **0 new** layout defect groups beyond those already present in English; the hotspot label (longer "Veste de travail — 185 $"), the new "Menu" button and the footer rail tags were re-measured on `/fr` |
| Navigation | v2 inventory probe: Rail / Lookbook / Studio **unreachable below 760 px** in the original (no replacement for `display:none`) | menu toggle + panel added; works in EN and FR (VISUAL: `lab/results/evidence/hale-mobile-menu.jpg`, links 48 px high) |
| Forms | newsletter form + viewer size picker + add-to-bag, EN and FR (BROWSER probe in the l10n judge: size warning "Choisissez d’abord une taille", "Ajouté au panier", bag shipping text) | all localized and functional; no clipping |
| Buttons | tap targets ≥44 px ≤1024 px; French labels ≤ the English width class (judge `maxLabelExpansion`) | see table |
| Functional | viewer open/turn/close, bag add/remove, language switch (English · Français), hreflang | pass (AUTO probes + manual click-through in Chromium) |
| RTL separately | Arabic lab pages l02, l04, l05, l06, l07, l08, l11 (`lab/l10n/*/ar`) | l08: mirror test passes, arrows flipped, ▶ not flipped, phone/email LTR; responsive audit then found the source's nav hidden ≤720 px and 32–38 px controls — fixed in the shared logical-property stylesheet; **re-audit 0 critical, RTL judge still 0 critical** (`lab/results/combined/rtl/`) |
| Regressions | pixel diff of the final English build vs the reference (see §2) + `--compare` audits | listed in §2 |

### Defects found on Hale (original clone) and their fate
| Defect | Found by | Fixed? |
|---|---|---|
| Primary nav (3 links) unreachable < 760 px | v2 inventory (`unreachable`) — v1 could not see it | **yes** (toggle + panel) |
| Lookbook hotspot label ran past the right edge (≤480 px), cut by `overflow-x:clip` | v2 `hidden-overflow` + `offscreen` | **yes** |
| 16 px hotspot, 20 px strip/footer buttons and links (touch) | tap targets (v1 count → v2 list) | **yes** ≤1024 px (hit area is the element itself, not a `::before`) |
| **Footer rail: 8 garments at a 140 px minimum were wider than the rail at 760–930 px → last two garments cut off and unreachable** | **width sweep only** (matrix widths 768/820 showed "clipped"; the sweep gave the range 768–912) | **yes** (`--gh: clamp(96px, 13.5vw, 240px)` for 760–1100 px); sweep 0/81 after |
| Rail tag text cut at the container edge | v2 clipped-text | partly; subsumed by the previous fix |
| 10–11 px mono labels | tiny-text | **yes** ≤1024 px; **left at design size ≥1280 px** (desktop parity rule) |
| Short-word nav links 20–35 px wide at 768–1024 px (44 px high) | final audit | **no** — documented (spacing between links ≥20 px; WCAG 2.5.8 spacing exception) |
| Desktop pointer targets <24 px (footer links 20 px, `hd-mark` 23 px, hotspot 16 px) | judge | **no** — desktop kept at reference design by choice |

## 2. Hale numbers (frozen judge, English build; categories = number of viewports of 17 affected)

| version | hidden-overflow | offscreen | unreachable | tap<24 | tapMajor total | tiny (viewports) | sweep bad / 81 |
|---|---|---|---|---|---|---|---|
| original clone | 4 | 4 | 1 | 17 | 158 | 17 | 28 |
| responsive v1 | 4 | 4 | 0 | 17 | 68 | 17 | 28 |
| responsive v2 | 0 | 0 | 0 | 17 | 76 | 17 | 28 |
| responsive v3 | 0 | 0 | 0 | 9 | 8 | 17 | 28 |
| **final (v3 + footer-rail fix)** | 0 | 0 | 0 | 9 | 8 | 17 | 28 (judge overlap noise) |

`overlap` (17 of 17) and `fixed-cover` (17 of 17) are identical in every row: layered sticky scenes and hanging garments (adjudicated, `docs/03` §6). The skill's own audit sweep on the final build: **0/81** (it was 81/81 before `--intentional`; the judge's 28/81 is its overlap noise at 320–752 px and is identical in every row).

**Important limit of the frozen judge on Hale:** its manifest lists `.fr` (the footer rail container) in `ignoreClip`, so it **cannot see** the footer-rail defect. The evidence for that fix is the skill's audit plus a direct geometry measurement (`items cut off by the viewport`, widths 700–1200 px in 20 px steps): **before the fix 10/26 widths, 760–940 px, up to 2 garments, worst overflow 184 px; after the fix 0/26** (BROWSER).
French (`/fr`) final: v3 audit **0 critical**, sweep **0/81**, `--compare` vs the first French audit: 6 fixed, 0 new.
English (`/`) final: v3 audit sweep **0/81**, `--compare` vs the first English audit: 20 fixed, **1 critical group remains** — the 20 px-wide "Rail" link (44 px high) in the header nav at 768–1024 px (the French word "Portant" is wide enough, which is why `/fr` shows 0). Documented below, not fixed.

**Desktop parity (rule 5)** — official Pixel Clone `compare_visual_diff` of the *final* English build vs the reference (frozen time, settled capture): **pass = true, mean 99.99 %**. 1440×900: 23/23 slices ≥ 99.78 % (22 of them ≥ 99.98 %; the footer slice 99.78 % is the new language switch), hover 100 %, height 20090 = 20090. 1920×1080: 23/23 slices ≥ 99.85 % (footer 99.85 %), hover 100 %, height 23794 = 23794. So the localization + responsive changes left the desktop design intact. Mobile/tablet (≤1024 px) intentionally differs from the reference (menu, touch targets, label sizes, footer-rail size at 760–1100 px); the viewer and bag states were not re-diffed in this run.

## 3. What the combination taught (skill-level lessons)
* Localization changed layout in only one place that mattered (longer hotspot label) — but *every* locale needs the responsive audit, and the audit needs `--must`/inventory so a French label that moved into a hidden container is noticed.
* The localization verifier and the responsive audit both needed an **intentional-container** escape hatch for scroll-driven pages (found on Hale: horizontal strip, sticky stages). Both skills now have `--intentional`.
* The width sweep is the only thing that found the footer-rail defect; a fixed matrix with 768 and 820 only reported "clipped" without the range.
* A fix can introduce a defect (r06: flex label; Hale: a 41 px Menu button; an unmeasurable `::before` hit area): `--compare` caught each within one iteration.
