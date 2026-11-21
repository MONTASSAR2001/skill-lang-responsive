# Final assessment

## 1. What was built
| Deliverable | Where |
|---|---|
| Responsive skill (v3, frozen before held-out) | `skills/universal-responsive-design/` — `SKILL.md`, `references/{strategies,defects}.md`, `scripts/audit.mjs` |
| Localization skill (v2.1 frozen; v2.2 = one post-held-out bug fix) | `skills/smart-website-localization/` — `SKILL.md`, `references/{conventions,french,arabic,rtl}.md`, `scripts/{extract-strings,verify}.mjs` |
| Hale replica (Pixel Clone, skill untouched) | **removed from the current tree**; preserved in git history at commit `2cfc203` (`hale-site/`, with `CLONE_NOTES.md`). 1440/1920/390 diff ≥99.98 % on all slices, viewer and bag states |
| Benchmark | `lab/` (13 responsive + 11 localization cases, judges, rubrics, baselines, every version's outputs and results) — `docs/evaluation/02-benchmark-environment.md` |
| Reports | `docs/evaluation/01` strategy · `03` responsive · `04` localization · `05` combined · this file |
| Invocation | `README.md` |

Skill history: responsive v1 → v2 → v3; localization v1 → v2 → v2.1 → v2.2 (`lab/skill-versions/`). Freeze evidence: `lab/skill-versions/FREEZE-before-heldout.md5`.

## 2. Headline numbers (frozen judge, `*.FROZEN.mjs`)

**Responsive — dev set (10 cases × 17 viewports + 81-width sweep)**

| | baseline | v1 | v2/v3 |
|---|---|---|---|
| viewports with a critical defect (of 170) | **163** | 12 | 2 (adjudicated false positive) |
| sweep widths bad (of 810) | **693** | 0 | 2 (same false positive) |
| touch targets <44 px (sum) | **608** | 96 | 0 |

**Responsive — held-out (r11 r12 r13)**: critical viewports 11/17/17 → v1-style first pass 5/0/17 → **frozen v3 workflow 0/0/0**; tapMajor 444 → 372 → 12.
**Hale (real)**: hidden-overflow 4→0, offscreen 4→0, unreachable content 1→0, tap<24 17→9 viewports (the rest are desktop widths left at the reference design), tapMajor 158→8; the width sweep exposed a defect hidden at 768/820 (footer rail cut off at 760–930 px) that the matrix could not localise — fixed. Desktop parity after all changes (official diff): 1440 and 1920 px both pass, every slice ≥99.78 %, mean 99.99 % (footer slice lowest: the new language switch).

**Localization — dev (14 case/language pairs)**: v1 1 pair with critical failures (l03: French text clipped by fixed-height cards, 4 widths) → v2 0; judge-invisible issues found by the review pass: 1 critical meaning change (l05 heading), 2 major wording, 12 pages without hreflang, French spacing.
**Localization — held-out (l10, l11 ×2)**: first pass had 1 real critical (layout overflow after translation) + missing hreflang; after the frozen workflow 0 real criticals; remaining judge findings adjudicated as false positives.
**Hale → French**: frozen judge 0 critical (v1 and v2 builds); viewer/size picker/bag strings French; language switch and hreflang present; final judge: 1 major = "Menu / English / Français" (cognate and language autonyms — correct).

## 3. Evidence classification
| Claim | Evidence |
|---|---|
| Layout metrics (overflow, clipping, overlaps, targets, sweep) before/after for 13 cases + Hale | **AUTO + BROWSER** (Chromium, 17 viewports, 81 widths) |
| Responsive visual quality (hierarchy, order, pattern choice) | **VISUAL** — inspected for r04, r05, r13 at 360 px and Hale mobile menu (EN/FR); *not* all 17 viewports × all cases |
| Interactions (menu toggle, dropdowns by tap, drawer, forms, viewer, bag, language switch) | **BROWSER** probes in the judges + manual click-through |
| French/Arabic text quality | **LINGUISTIC** by the same model family — *not* native-speaker verification |
| RTL layout (mirror test, icons, LTR islands, forms) | **AUTO + BROWSER**; Arabic wording **LINGUISTIC** (lower confidence than French) |
| Variables, plurals, dates, numbers (l04, l05, Hale bag) | **AUTO** probes with real counts/values |
| Real devices, Safari/Firefox, screen readers, real users, CMS/i18n-library workflows, languages other than fr/ar, Arabic Hale | **UNTESTED** |

## 4. Honest assessment

### universal-responsive-design — *strong on measurable layout, moderate on design judgement*
* **Works well:** finds and fixes the common classes (fixed widths, nowrap, overflow-hidden clipping, hidden overflow, unreachable nav, tiny targets, distorted media, intermediate-width breakage) and proves it with a regression diff. Held-out generalization was good (0 critical on 3 unseen pages, 0 new defects per `--compare`).
* **The real value of v2/v3 over v1** was the *tool*: named, measured defects, the sweep, `--compare`, unreachable-content detection. v1's instructions were already reasonable, and the same model could fix what it could see; it could not see clipped text, overlaps, the sweep ranges or content that had been lost.
* **Weak spots:** (a) design quality (density, rhythm, what *should* be prioritised on a phone) is judged by a short rubric and screenshots, not measured; (b) it depends on the executor declaring intentional behaviour correctly; (c) touch/hover and browsers are emulated/Chromium-only; (d) scroll-driven JS stages are only sampled with `--scroll-shots`; (e) desktop pointer targets are deliberately not enlarged by default.
* **Where it will likely fail:** pages whose layout is computed in JS without a resize handler, canvas/WebGL layouts, apps behind auth the audit cannot reach, very long pages (audit time grows; the Hale audit takes minutes).

### smart-website-localization — *good process, measured improvement modest*
* **Works well:** context-aware translation of marketing/UI/long-form/forms/dynamic text, plural and format handling via `Intl`, gender-agreement with variables, protected terms, hreflang/lang/dir, RTL mirroring with a measurable test, and a verifier that finds layout fallout from longer text — the one dev failure class v1 had that scripts could see.
* **The judge found little to fix in v1's translations** (the model is strong at this task); the main measurable gains were layout fallout, hreflang, spacing and a review step that caught a *meaning change* (heading "Message counts" silently rewritten). That last class is invisible to automation, so the skill's quality still depends on the executor reading `pairs.tsv` carefully.
* **Weak spots:** no native-speaker validation; Arabic review is the weakest part; terminology is only as good as the glossary the executor writes; `references/french.md` and `conventions.md` contain examples taken from the dev traps (possible overfit — the held-out cases (docs, restaurant) behaved well but are only 3 pairs); the verifier cannot detect wrong tone/register; `verify.mjs` needed a bug fix after held-out (v2.2).
* **Where it will likely fail:** CMS-driven or server-rendered content that never appears in the DOM probe; heavy ICU/message-catalog systems; languages with scripts or grammar unlike French/Arabic (not tested).

## 5. Process caveats (read before trusting the numbers)
1. **Same model everywhere**: author of the skills, executor, judge-writer and linguistic reviewer. Independence is procedural (separate scripts, frozen judge, held-out cases, separate review pass), not epistemic.
2. **Skill invocation**: the Skill tool could not see skills created in the session, so the skills were executed by following `SKILL.md` and their scripts literally; later sessions (after restart) should discover `.claude/skills/*`.
3. **The judge was calibrated during development** (≈10 false-positive classes fixed, listed in `docs/evaluation/03` §2 and `docs/evaluation/04` §2) and then frozen; two known false-positive classes remain and are adjudicated in the text, not hidden. The judge and the skill's audit share metric definitions.
4. **v1 vs final comparisons on held-out cases use a "first pass with the v1 process" and the frozen workflow on the same output**, not two independent from-scratch runs.
5. **Executor knowledge ≈ constant across versions**: improvements measured are mostly tooling/process effects, which is also what the skills are meant to provide.
6. A 5-line `hale-site/CLONE_NOTES.md` deviation list covers the clone itself (no fly-to-bag ghost; two unused scaffold helper files left because their removal was blocked by a safety check).

## 6. Remaining issues (minor or documented)
Short-word header nav links 20–35 px wide at 768–1024 px; desktop targets <24 px kept at the reference design; 10–11 px labels ≥1280 px; r04 KPI density; `r06` judge false positive; French/Arabic wording not natively reviewed; no Safari/Firefox/devices; Hale Arabic not built.

## 7. Further iterations were judged to have diminishing returns because
the dev set is clean under the frozen judge (0 real critical), the held-out set is clean, and the remaining items need *different* evidence (native review, real devices, other languages) rather than more passes of the same tests.

## 8. Changes made after the freeze (all listed; none re-measured on held-out)
| Change | Type | Why |
|---|---|---|
| `verify.mjs`: `isProtected` now strips *all* protected tokens (was: one) → localization **v2.2** | bug fix | l11 address was reported as untranslated (found on held-out) |
| Both `SKILL.md`: "If something fails" section | documentation only | Part 8 asks for failure handling |
| `hale-site`: footer-rail `--gh` clamp, `:first-of-type` selector fix, French typography in wrapped `fr.ts` entries | test-subject changes, not skill changes | found during the combined test |
Final checksums: `lab/skill-versions/FINAL-skills.md5` (frozen set: `FREEZE-before-heldout.md5`).

## 9. Overfitting controls
* Skills contain no Hale-, lab-case- or language-pair-specific rules; breakpoints are derived per site from the sweep; translation rules are general (conventions tables, plural categories) with a few idiom *examples*.
* Dev/held-out split fixed in the manifests before iterating; held-out cases (r11–r13, l10, l11) were first opened after `FREEZE-before-heldout.md5` was written.
* Known leakage: `references/french.md` and `conventions.md` use examples that resemble dev traps (idioms, units, nbsp); `defects.md` lists defect classes that the dev cases seeded. The held-out cases use different content (pricing/article/listing, CLI docs, restaurant) and the results held, which is evidence — not proof — of generalization.
