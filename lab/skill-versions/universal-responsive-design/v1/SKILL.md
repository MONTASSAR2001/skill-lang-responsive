---
name: universal-responsive-design
description: Analyze, redesign, fix and verify the responsiveness of an existing website or web app (HTML/CSS, React/Next, Vue, Tailwind, anything that renders in a browser). Use when asked to make a site responsive or mobile-friendly, fix overflow/layout breakage on phones or tablets, adapt a desktop-only design, audit responsive quality, or re-check layouts after content changes (e.g. after localization). Works from real browser measurements and screenshots, not from reading CSS alone.
---

# Universal responsive design

You make an existing site adapt well to every viewport. You decide *per component* how it should adapt, change the
source, and prove the result in a real browser. You never claim a layout works because the CSS "looks right".

## Hard rules
- **Measure in a browser before and after.** Code reading finds suspects; only a render proves anything. Look at screenshots.
- **Never fix by hiding.** Do not `display:none`, delete, or `overflow:hidden` content to make a metric pass. Content that exists
  on desktop must stay reachable on mobile (collapsed behind a control is fine; gone is not).
- **No blanket shrinking.** Scaling the desktop layout down (`zoom`, `transform: scale`, `vw` for everything) is not a fix.
- **No random breakpoints.** Put a breakpoint where the *content* breaks, found by measurement, not at "768" by habit.
- **Keep intentional behaviour.** Horizontal carousels, sticky headers and wide data tables may be correct as they are.
  Decide, don't reflex.
- Preserve design intent and the desktop result; check larger sizes for regressions after every change.

## Workflow

### 1. Orient
Find how the site runs (static files, dev server, build). Start it. Identify the stack and where layout CSS lives (global CSS,
modules, Tailwind classes, inline styles). Make a restore point (git or a copy) before editing.

### 2. Understand the architecture (read before measuring)
List the page's sections/components and for each: layout mechanism (flex/grid/float/absolute), units (px/%/rem/vw), fixed widths
and heights, existing breakpoints, fixed/sticky elements, images and backgrounds. Classify each component with
`references/strategies.md` and write down the intended responsive behaviour for it.

### 3. Baseline audit
Run the audit script on every page/state that matters:

```
node <skill>/scripts/audit.mjs --url <url> --out <dir>/before
```
It renders a viewport matrix (320…2560), reports horizontal overflow, elements outside the viewport, small touch targets and
tiny text, and saves reduced-size screenshots. **Open the screenshots** (they are small JPEGs; if image reading is
restricted, view the downscaled files) and note what the numbers cannot say: hierarchy, spacing, ordering, awkward reflow.

### 4. Prioritise
Rank defects: (1) content unreachable/cut off or horizontal scroll, (2) overlapping or unusable controls, (3) broken
navigation, (4) distortion/cropping of media, (5) touch/readability, (6) polish. Fix in that order.

### 5. Fix with intent
Per component use the strategy table. Prefer, in order: fluid/intrinsic layout (`flex-wrap`, `grid auto-fit/minmax`,
`min()/clamp()`, `max-width:100%`, `aspect-ratio`, `object-fit`) → container/media queries at measured break points →
restructuring (stack, reorder, collapse behind a toggle) → alternative presentation (e.g. table → cards only when
the data makes sense that way). Use `min-width` queries (mobile-first) when you restructure a file; do not rewrite what works.

### 6. Re-test
Re-run the audit into `<dir>/after`. Then:
- test **intermediate widths** near any problem width (e.g. 700, 900, 1000, 1100), not just the matrix;
- test landscape phone and a short laptop height;
- confirm desktop (1280/1440/1920) did not regress and visually compare screenshots;
- exercise interactions you added or touched (menu toggle, dropdown, form submit).
Repeat 4–6 until nothing critical remains.

### 7. Report
State: stack and files changed; the matrix tested; defects found → fixed; remaining issues and why; evidence (audit
JSON + screenshot paths); what was *not* tested. Be explicit about anything verified only by code inspection.

## Tool notes
- The audit needs Playwright (`npm i -D playwright` or an existing install; set `PLAYWRIGHT_MODULE=/path/to/playwright` if needed).
- Screenshots are written at half resolution as JPEG so they can be inspected cheaply.
