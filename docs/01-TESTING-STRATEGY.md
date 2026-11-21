# Testing strategy

Goal: find out whether two skills (`universal-responsive-design`, `smart-website-localization`) actually work, not whether
their instructions read well. Everything below is built to *expose* weaknesses, and every claim in the final report
must trace to a file under `lab/results/` or `docs/`.

## Principles

1. **Seeded ground truth.** Every lab case ships with a manifest listing the defects (responsive) or traps (localization)
   deliberately planted in it. A skill is scored on what it detects *and fixes* against that list, not on how
   confident its report sounds. Un-seeded findings are tracked separately (true extra finds vs false alarms).
2. **Separate the actors.** Four roles, kept apart in files and in time:
   - *Executor*: runs the skill on a pristine copy of a case (`lab/tools/reset.mjs` restores baselines).
   - *Harness*: deterministic scripts in `lab/harness/` that the skill never sees or ships. They are written
     independently of the skills' own audit scripts so they do not share blind spots.
   - *Evaluator*: a rubric pass over harness output + screenshots + the produced text (`lab/rubrics/`).
   - *Improver*: edits the skill only from diagnosed, generalizable causes (see `docs/skill-evolution-*.md`).
3. **Different methodology per skill.** Responsive quality is mostly *measurable geometry* (overflow, overlap, tap
   targets, clipping) plus a visual judgement. Localization quality is mostly *linguistic* with a measurable shell
   (variables, coverage, direction, overflow). They therefore get different harnesses, different rubrics, and
   different notions of "critical failure".
4. **Dev set vs held-out set.** Cases are split up front (`lab/manifest.json`, field `split`). The held-out cases are never
   opened while a skill is being improved. They are run once on the frozen candidate version.
5. **Regression gate.** Every iteration re-runs *all* dev cases (not just the ones that failed) and also compares against
   the previous version's per-case metrics. A fix that lowers any previously-green case is a regression and blocks release.
6. **Honest evidence labels.** Each result is tagged: `AUTO` (script), `BROWSER` (measured in Chromium), `VISUAL`
   (screenshot inspected), `LINGUISTIC` (language review), `UNTESTED`. Linguistic review is done by the same model family
   that wrote the skill, so it is *not* native-speaker verification; the report says so.

## Test assets

| Asset | What it is | Used for |
|---|---|---|
| **Hale clone** (`hale-site/`, Next.js; since removed from the tree, see README) | Real-world, JS-heavy, scroll-driven shop, replicated with Pixel Clone (22/23 slices ≥99.9% at 1440, rest = lazy-load noise) | Real-world responsive + localization; framework-based |
| **Responsive lab** (`lab/responsive/*`) | 13 static HTML/CSS/JS cases, desktop-first with planted defects | Controlled component-level tests, edge cases |
| **Localization lab** (`lab/l10n/*`) | 11 static HTML/JS cases with planted linguistic/technical traps | Controlled content-type tests |
| **Harness** (`lab/harness/`) | `check-responsive.mjs`, `check-l10n.mjs`, `compare.mjs` | Objective checks, version comparison |
| **Rubrics** (`lab/rubrics/`) | Structured scorecards with separate *critical* and *minor* columns | Evaluator pass |

The lab is plain static files served by `lab/serve.mjs` (port 4173). It is deliberately **outside** the application code (`hale-site/`), so it
cannot affect the replicated website, and it does not assume any framework (the skills must also work on Next.js, which
Hale covers).

## Responsive methodology

*Viewport matrix.* 320, 360, 375, 390, 430, 480, 600, 768, 820, 1024, 1280, 1440, 1920, 2560 (width) with representative
heights, plus: landscape phone (844×390), short laptop (1280×600), tall portrait (820×1180), 200% zoom emulation
(640×450 at DPR 2 ≈ 1280 CSS px zoomed), touch (hasTouch) vs pointer. The harness additionally *sweeps* every case
from 320→1600 in 16px steps looking for overflow transitions ("breakpoint gap" detection), since fixed matrices miss
widths like 1013 px.

*Objective checks (BROWSER/AUTO).* horizontal page overflow; elements whose box exceeds the viewport (excluding
intentional scrollers, which the manifest names); text clipped by `overflow:hidden`; sibling overlaps that are not
intentional (manifest allowlist); touch targets < 44×44 CSS px on touch profiles; body text < 12 px; line length
extremes; image distortion (rendered vs natural aspect ratio with `object-fit` taken into account); console errors;
failed requests; interaction probes (open mobile menu, dropdown, form submit) via per-case scripts.

*Visual checks (VISUAL).* Full-page screenshots at a fixed subset of widths. Evaluated for what code cannot see:
intentional composition, hierarchy, excessive whitespace, awkward reflow, cropped faces/subjects.

*Scoring.* Per case: seeded defects detected / fixed, new defects introduced (regressions), widths with any hard
failure, and the visual rubric (hierarchy, ordering, density, usability). Hard failures (overflow, clipped content,
unusable control, hidden-by-`display:none` content that was not hidden before) are critical; spacing taste is minor.

## Localization methodology

*Languages.* French (expansion ≈ +15–30%, formal register, gender/number agreement, elision, non-breaking spaces before
`: ; ? !` and inside `« »`), Arabic (RTL, plural forms, Arabic-Indic vs Western digits policy, mixed LTR tokens,
bidirectional punctuation, mirrored icons, logical CSS), English as source/reference.

*Objective checks (AUTO/BROWSER).* source-language leakage per text node; coverage of attributes (`alt`, `title`,
`aria-label`, `placeholder`, `<title>`, meta, JSON-LD); placeholder/variable multiset equality (`{name}`, `${n}`, `%s`,
ICU); protected-term preservation; terminology consistency groups; `lang`/`dir`/`hreflang`; logical-property audit
(physical `left/right/margin-left/…` remaining in RTL CSS); text overflow/clipping at 320/390/768/1280; console errors;
functional probes (forms validate and show localized messages, dynamic strings render with the right values, language
links navigate).

*Linguistic review (LINGUISTIC).* Rubric per case with *critical* (meaning changed, content missing, variable
corrupted, broken nav/function, wrong direction handling) and *minor* (stiff phrasing, could be shorter, small
terminology drift) columns, each finding quoted with source → target and evidence.

*Not a single score.* Reports give counts of criticals and minors per dimension; there is no composite number.

## Iteration protocol (both skills)

execute → measure (harness) → evaluate (rubric) → diagnose (instruction / missing step / wrong decision /
implementation / tool limit / test limit) → improve (general fix only) → retest dev set → compare to previous
version → regression check → repeat until diminishing returns. Then: freeze, run held-out once, record.

## Combined test

Hale → French via the localization skill → responsive skill re-audits the *localized* build (text expansion, nav,
forms, buttons at the full matrix) → fixes → localization skill re-verifies nothing linguistic was damaged → Arabic
RTL lab cases checked separately. Ownership stays split: localization owns words, responsive owns layout; each
skill's report lists the cross-effects it must hand to the other.
