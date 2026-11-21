# universal-responsive-design — results and evolution

Evidence labels: **AUTO** frozen judge (`lab/harness/check-responsive.FROZEN.mjs`) · **BROWSER** measured in Chromium · **VISUAL** screenshot opened · **UNTESTED**.
Reading guide: *critVP* = viewports (of 17) with ≥1 critical defect; *sweep* = widths (of 81, 320→1600 px step 16) with overflow/offscreen/clipped/overlap; *tapMajor* = touch targets <44 px summed over viewports.

## 1. Versions

| | v1 (initial) | v2 | v3 (frozen before held-out) |
|---|---|---|---|
| workflow | 7 steps, 5 hard rules, one reference table | + "read architecture first", sweep-driven breakpoints, `--compare` regression gate, interaction checks, scroll-driven pages, localization section, intentional-behaviour rule, "don't introduce new defects" | same |
| `audit.mjs` | 14 widths; overflow, "outside" elements, tap-target and tiny-text **counts**, full-page JPEGs | 17 viewports (+landscape phone, short laptop, 200 % zoom) **+ 16 px width sweep**; grouped issues with measured sizes: overflow, **overflow hidden by `overflow-x:hidden`**, offscreen, **clipped text (text-box geometry)**, **overlaps**, **distorted images**, touch targets (24/44 px), tiny text, fixed-cover, **unreachable content** (tries toggles/dropdowns), `--compare` (fixed / NEW / remaining), `--scroll-shots`, `--intentional` | `--intentional` also exempts clipped/overlap/fixed-cover inside declared stages; aria-hidden decorative text skipped; overlap measured per line box (wrapped inline links are not one rectangle); content inside scrollers counts as reachable |
| references | `strategies.md` (12 rows) | `strategies.md` (decision per component + breakpoint selection) + `defects.md` (symptom → cause → fix, **false-positive guide**, scroll-driven sites) | same |

## 2. Test design
* **Real world:** the Pixel-Clone replica of studio.smartduke.com/demo/hale (Next.js, scroll-driven, 8 sticky scenes).
* **Controlled dev set:** r01–r10, each desktop-first with planted defects (manifest). **Held-out:** r11 pricing, r12 article, r13 listing — opened only after the skill was frozen (`lab/skill-versions/FREEZE-before-heldout.md5`).
* **Viewport matrix** 320 360 375 390 430 480 600 768 820 1024 1280 1440 1920 2560, landscape phone 844×390, short laptop 1280×600, 200 % zoom (640×450@2×), touch emulation ≤1024 — plus the 81-width sweep.
* **Independent judge** (not shipped with the skill; separate code): overflow, hidden overflow, offscreen, clipped text, overlaps, distortion, tap targets, tiny text, fixed-cover, unreachable content with interaction probes, console errors.
* **Judge calibration** (false positives found and fixed *before* freezing): hover dropdowns counted as unreachable; off-canvas drawers counted as offscreen; decorative overflow and `sr-only` counted as clipped; text-over-image captions counted as overlap; fixed-cover measured on the whole box not the visible area; scroll-reveal content; `aria-hidden` decorative lettering; Hale layered stages. The frozen judge still has two known false-positive classes that are **adjudicated, not hidden** (§6).
* **Executor ≠ judge:** the skill's workflow produced the fixes; the judge only measured; screenshots were opened separately (VISUAL).

## 3. Dev results (frozen judge)

| case | baseline critVP / sweep / tapMajor | v1 | v2/v3 |
|---|---|---|---|
| r01 hero | 17 / 62 / 20 | 0 / 0 / 0 | 0 / 0 / 0 |
| r02 nav | 17 / 80 / 36 | 0 / 0 / 0 | 0 / 0 / 0 |
| r03 grids | 17 / 81 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| r04 dashboard | 17 / 70 / 168 | 0 / 0 / 0 | 0 / 0 / 0 |
| r05 tables | 17 / 81 / 144 | 0 / 0 / 0 | 0 / 0 / 0 |
| r06 forms | 17 / 38 / 156 | **12** / 0 / **24** | 2* / 2* / 0 |
| r07 media | 17 / 59 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| r08 complex | 17 / 81 / 12 | 0 / 0 / **12** | 0 / 0 / 0 |
| r09 typography | 15 / 81 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| r10 footer | 12 / 60 / 72 | 0 / 0 / **60** | 0 / 0 / 0 |
| **total** | **163 / 693 / 608** | **12 / 0 / 96** | **2\* / 2\* / 0** |

\* adjudicated judge false positive (§6): two inline links that wrap across lines have overlapping *bounding boxes* although their text lines do not overlap. The skill's own audit (per-line boxes) reports 0.

**What v1 missed that v2 found** (all re-verified in the browser):
* r06: my v1 fix made the terms label `display:flex`, splitting its inline links into 20 px flex items (12 viewports with tap targets <24 px) — v1's audit reported only a *count*; v2 names the element and size, and `--compare` shows the fix introduced no new group.
* r08: promo "Details" link 34 px high; r10: footer links 36–43 px wide: v1's counts, v2's list.
* v1 audit false positives that cost attention: items inside intentional scrollers (r05, r08) and an off-canvas drawer (r04) were reported as "outside"; v2 handles scrollers, drawers, decorative bleed.
* v1 could not see: clipped text, overlaps, distortion, `overflow-x:hidden` masking, unreachable content, width ranges between matrix points (baseline sweep: 693/810 widths bad — a 14-point matrix reports 100 % of those cases as broken, but cannot say *where*).

**Decisions the skill had to make (VISUAL):** r05 wide table → scroll container with sticky first column, compact 4-column table left alone (control passed); r04 sidebar → off-canvas drawer with toggle; r02 nav → collapse at the measured width (≈1240 px) with working dropdown by tap/keyboard; r07 caption over image → static caption below on phones. Screenshot evidence: `lab/results/evidence/r04-dashboard-360.jpg`, `r05-tables-360.jpg`, `r13-listing-360.jpg` (left baseline, right fixed). Visual critique: r04 stacks five full-height KPI cards on phones — correct but airy (minor, a 2-up KPI grid ≥360 px would be denser).

## 4. Held-out results (never used for iteration)

| case | baseline | v1-style first pass | frozen v3 workflow |
|---|---|---|---|
| r11 pricing | 11 / 43 / 44 | 5 / 0 / 72 | **0 / 0 / 12** |
| r12 article | 17 / 56 / 64 | 0 / 0 / 72 | **0 / 0 / 0** |
| r13 listing | 17 / 71 / 336 | 17 / 0 / 228 | **0 / 0 / 0** |

The improvements generalize: the v3 audit exposed header-link, form-control, pagination and sticky-bar touch targets that the first pass (guided by the v1 audit) left behind, and `--compare` reported 0 new groups on all three. Caveats: the same model authored the first pass and the iteration, the first pass is "v1-style" rather than a from-scratch v1 run, and 3 cases is a small sample.

## 5. Real-world: Hale (frozen judge, per category)

See `docs/evaluation/05-combined-test.md` for the full Hale table (English and French builds) and the defects found: lookbook hotspot label cut off at ≤480 px, primary nav unreachable below 760 px (no replacement), 16 px hotspot and 20 px footer/strip targets, **footer rail cut off at 760–930 px (last two garments unreachable) — found only by the width sweep**, 10–11 px labels.

## 6. Adjudicated judge false positives (kept visible)
| Judge finding | Where | Why it is not a skill defect |
|---|---|---|
| `overlap` of two wrapped inline links (bounding boxes) | r06 v2/v3 (2 viewports) | Per-line boxes do not overlap (the skill's audit, which measures per line, reports none). |
| `overlap` 17 viewports on Hale | Hale all versions | Layered sticky scenes and 8 hanging garments overlap by design; hit-area boxes of `fr-item` overlap neighbouring text where the box is empty. Category counts for the other classes are the informative ones. |
| `fixed-cover` 17 on Hale | Hale | `position:sticky` 100svh stages are the page structure. |
| `tap<24` at ≥1280 px on Hale | Hale v3/final | Desktop pointer widths were left at the reference design on purpose (44 px targets are applied ≤1024 px); a documented trade-off, not an oversight. |

## 7. Limitations (honest)
* Chromium only; no real devices, no Safari/Firefox, no iOS dynamic toolbars.
* Touch is emulated (`hasTouch`), hover/pointer media features are approximated.
* The audit judges geometry; "design quality" (hierarchy, rhythm) is only partially measurable — covered by a rubric and by looking at screenshots, which was done for a sample of cases, not all 17 viewports × 13 cases.
* Intentional-behaviour detection relies on the executor declaring `--intentional`; a wrong declaration hides a real defect.
* The judge and the skill's audit share metric definitions (both are mine), so the judge verifies the *fixes*, not the metric design; visual review is the independent part.
* In the building session the skill could not be invoked through the Skill tool (registry loaded at start); it was executed by following `SKILL.md` literally.

## 8. Regression results
* v1 → v2/v3 on the 10 dev cases (`compare.mjs F-v1 F-v2`): 9 unchanged (all 0 critical), r06 improved (12 → 2 critical viewports, tapMajor 24 → 0); the compare tool prints "REGRESSION" for r06 only because the 2 remaining viewports are the adjudicated false positive (§6) and the sweep count rose 0 → 2.
* r08, r10: tapMajor 12 → 0 and 60 → 0, no new groups (`--compare` per case in `lab/results/v2-run/*/after`).
* Larger sizes: every re-audit included 1280/1440/1920/2560 and `--compare` printed 0 NEW groups for all dev fixes after the audit's own false-positive fix (wrapped inline links).
* Hale: English desktop parity checked by pixel diff (see `docs/evaluation/05` §2); the French build re-audited after every English change.
