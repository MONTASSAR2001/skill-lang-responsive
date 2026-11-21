---
name: universal-responsive-design
description: Analyze, redesign, fix and verify the responsiveness of an existing website or web app (plain HTML/CSS, React/Next, Vue, Tailwind — anything that renders in a browser). Use when asked to make a site responsive or mobile-friendly, fix overflow, clipped text, overlapping or tiny controls on phones/tablets, adapt a desktop-only design, audit responsive quality, or re-check layouts after content changes such as localization (text expansion, RTL). Works from real browser measurements across a viewport matrix plus a fine width sweep, and from screenshots, never from reading CSS alone.
license: MIT
compatibility: Requires Node.js 18+ and Playwright with Chromium to run the bundled scripts (npm i -D playwright && npx playwright install chromium). Works in any agent that can run shell commands and view small images; no Claude-specific features are required.
metadata:
  author: MONTASSAR2001
  version: "1.0.0"
  repository: https://github.com/MONTASSAR2001/skill-lang-responsive
---

# Universal responsive design

Make an existing site adapt *by design*, per component, and prove it in a real browser. A layout that "looks right in the CSS"
is not verified. Report only what you measured or looked at.

## Setup
`<skill-dir>` in the commands below is the directory that contains this SKILL.md (it holds `scripts/` and `references/`); resolve it to an absolute path before running a script. Requirements: Node.js 18+ and Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`, or set `PLAYWRIGHT_MODULE` to an existing playwright package directory). Check the setup with `node <skill-dir>/scripts/audit.mjs --help`.

## Hard rules
1. **Measure → fix → re-measure.** Every claim cites an audit run or a screenshot you opened.
2. **Never fix by hiding or cutting.** No `display:none`, deleting content, or `overflow:hidden` to silence a metric. Content that
   exists on desktop stays reachable on mobile (behind a toggle is fine, gone is not). `overflow-x:hidden` on `html/body` hides
   overflow instead of fixing it — remove it, then fix the cause.
3. **No blanket scaling** (`zoom`, `transform:scale`, everything in `vw`). No habitual breakpoints: put them where the sweep shows the layout breaking.
4. **Keep what is intentional**: carousels, sticky headers, wide tables in a scroll container, overlays, off-canvas drawers, decorative bleed.
   Tell the audit about them (`--intentional`), do not "fix" them.
5. **Protect the desktop result.** After every batch re-check 1280/1440/1920 and compare runs; a fix that breaks a width is not a fix.
6. **Don't introduce new defects** (e.g. turning an inline paragraph into flex splits its links into 20px targets). Always re-audit with `--compare`.

## Workflow

### 1. Orient (5 min)
Find how it runs, start it, note the stack and where layout CSS lives (global, modules, Tailwind utilities, inline). Create a restore
point (git, or a copy). Note the audit's Playwright requirement: `PLAYWRIGHT_MODULE=/path/to/playwright` if it is not installed.
Pages that reveal content on scroll, render client-side or use JS-driven geometry need `--wait 1200` (and a scroll-through, see §6).

### 2. Read the architecture, then classify
For each page section record: layout mechanism (flex/grid/float/absolute), units, **fixed widths/heights**, `white-space:nowrap`, `overflow`
rules, existing breakpoints, fixed/sticky layers, media and backgrounds, JS that computes layout. Classify every component with
`references/strategies.md` and write the intended behaviour at phone / tablet / desktop *before* touching code.
List the things that are meant to overflow or scroll → `--intentional`.

### 3. Baseline audit
```
node <skill-dir>/scripts/audit.mjs --url <url> --out <run>/before [--intentional "<sel>,<sel>"] [--scroll-shots 6]
```
It measures 17 viewports (320…2560 + landscape phone, short laptop, 200 % zoom) and sweeps 320→1600 px in 16 px steps, then lists grouped
issues: overflow, content hidden by `overflow-x:hidden`, offscreen content, **clipped text**, **overlaps**, **distorted images**, **touch targets**
(<24 px critical, <44 px major), tiny text, fixed layers covering the viewport, content that exists on desktop but is **unreachable**
on this width (reachable-through-a-toggle counts as reachable). **Open the screenshots** (`w390.jpg`, `w768.jpg`, `w1280.jpg`,
`scroll-w*.jpg`) — if image reads are restricted use the half-size JPEGs the script writes. Triage every group: *defect* or *intentional*
(see `references/defects.md` → "False positives").

### 4. Prioritise
1 content unreachable / cut off / horizontal scroll · 2 overlaps and unusable controls · 3 navigation · 4 distorted or badly cropped media ·
5 touch size and readability · 6 polish. Use the sweep ranges to find the width where each component actually breaks and set the
breakpoint there (or better: make it intrinsic so no breakpoint is needed).

### 5. Fix with intent
Apply the strategy per component (`references/strategies.md`). Order of preference: intrinsic/fluid CSS (`flex-wrap`, `grid` with
`repeat(auto-fit,minmax(min(100%,Npx),1fr))`, `clamp()`, `min()`, `max-width:100%`, `aspect-ratio`, `object-fit`, `overflow-wrap:anywhere`,
`min-height` instead of `height`) → measured breakpoints → restructure (stack, reorder, collapse behind an accessible toggle) → alternative pattern.
Tables: scroll container + sticky key column by default; cards only for short record-like rows. Hit areas ≥44 px on touch. Inputs 16 px.
Use `svh/dvh` rather than `vh` for full-height stages. Convert physical to logical properties when you touch spacing (RTL-ready).

### 6. Re-test and compare
```
node <skill-dir>/scripts/audit.mjs --url <url> --out <run>/after --compare <run>/before/audit.json [--intentional …]
```
Gate before you stop: **0 critical groups** (or each remaining one justified as intentional), **0 NEW groups in `--compare`**, sweep clean in
every range you touched, 1280/1440/1920 unchanged, landscape-phone and short-laptop checked, touch targets ≥44 px unless justified.
Also: (a) exercise what you built — open/close the menu, dropdown by tap and keyboard, drawer, form submit with errors; (b) for sticky or
scroll-driven pages open the `scroll-w*.jpg` series; (c) visually review the screenshots: hierarchy kept, order sensible, no
cramped or empty bands, media subject not cropped away, text over images legible.
Iterate until the gate holds. If a defect cannot be fixed without changing design intent, stop and say so.

### 7. Report
Stack and files changed · matrix and sweep tested · defects found → fixed (with before/after numbers) · intentional behaviour left alone ·
remaining issues and why · evidence paths · **what was not tested** (e.g. real devices, browsers other than Chromium, orientation changes mid-session).
If text length or direction changed (localization), say which components are expansion/RTL-sensitive.

## Working with localization
Longer copy (French ≈ +20 %, German more) and RTL change layout: re-run this audit on every locale, with `--must` listing key labels. Fixed widths/heights, `nowrap`
and `overflow:hidden` around text are the usual casualties; fix the container, do not shorten the translation unless it is a label with no room.
Do not alter wording yourself — report text problems to the localization owner.

## Tool notes
Audit exit output is a table + grouped issues; the full data is `audit.json`. Screenshots are half-resolution JPEGs. Chromium only.

## If something fails
- **Playwright/Chromium missing or the audit cannot start** → say so, install (`npm i -D playwright && npx playwright install chromium`) or set `PLAYWRIGHT_MODULE`; if neither is possible, do not claim visual validation — limit yourself to code-level fixes and list the whole result as *unverified*.
- **Page needs login, a build, or a backend you cannot start** → audit a static export/fixture or the closest reachable state and state which states were not covered.
- **Audit output is huge/noisy** (scroll-driven or canvas pages) → declare intentional stages with `--intentional`, lower noise first, and keep a one-line reason per dismissed finding.
- **A fix cannot be made without changing the design** (e.g. a table that is only usable at full width) → stop, describe the options (scroll container, prioritised columns, cards) and which you chose; never hide the content.
- **`--compare` shows a NEW group** → revert or adjust the last change before continuing.
- **Image reading is blocked** → use the half-size JPEGs the audit writes (small files) or describe geometry from `audit.json`; say which one you used.
