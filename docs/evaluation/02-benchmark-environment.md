# Benchmark environment

Everything lives under `lab/`, isolated from any application code (the Hale test site that was used for the real-world case has been removed from the tree; see README). Re-running a future skill version against the same tests takes four commands.

```
lab/
  serve.mjs                 static server, port 4173  (node lab/serve.mjs)
  manifest.json             responsive cases: split (dev|heldout|real), seeded defects, intentional scrollers/overlaps, must-remain-accessible texts
  manifest-l10n.json        localization cases: traps, protected terms, term families, bad literals, RTL expectations, held-out split
  assets/                   images + video used by the cases
  responsive/r01…r13/       static HTML/CSS/JS, desktop-first with planted defects (WORKING copies — skills edit these)
  l10n/l01…l11/             static HTML/JS pages in English; skills create <case>/fr/ and <case>/ar/
  baseline/                 pristine copies (responsive/, l10n/, assets/) — never edited
  outputs/<version>/        frozen snapshots of what each skill version produced (re-judgeable at any time)
  harness/                  the judges (NOT part of any skill) + runners; *.FROZEN.mjs = the exact judge used for all reported numbers
  rubrics/                  structured visual + linguistic scorecards (critical vs minor columns)
  skill-versions/<skill>/vN snapshots of each skill version
  results/                  every run: JSON reports, screenshots, logs
  tools/reset.mjs           restore a case from baseline/
```

## Cases

**Responsive** (planted defects are listed per case in `manifest.json → seeded`)

| id | split | what it stresses |
|---|---|---|
| r01-hero | dev | 4 hero compositions: split text+image, background-image overlay, very long heading with huge padding, 3 columns + stats |
| r02-nav | dev | 9 nowrap links, dropdown (hover only), unwired burger, sticky header, intermediate widths 700–1300 |
| r03-grids | dev | 4×280 px, 3-col image cards, 2-col flex, fixed card heights, nowrap titles, uneven content |
| r04-dashboard | dev | fixed 1440 px app, sidebar, KPI cards, SVG charts, filters, widgets, `overflow-x:hidden` masking overflow |
| r05-tables | dev | 12-column 1500 px table in an `overflow:hidden` card (columns unreachable), numeric cols, tiny actions, **control**: a compact 4-col table that must *not* be turned into cards |
| r06-forms | dev | fixed 880 px form, non-wrapping rows, 32 px controls, nowrap long submit label, 14 px radios |
| r07-media | dev | portrait squashed by `object-fit:fill`, fixed gallery, 1100 px overlay with caption covering subject, 960 px video, banner |
| r08-complex | dev | fixed nowrap promo bar, sticky TOC, overlapping card, **intentional** horizontal scroller, nested columns, fixed chat button |
| r09-typography | dev | 112 px heading with an unbreakable word, 10 px fine print, nowrap long buttons, unbreakable URL |
| r10-footer | dev | five fixed columns, nowrap address/bottom row, 24 px social icons, newsletter form |
| r11-pricing | **held-out** | 3×340 px plans, fixed plan height, nowrap comparison table, FAQ |
| r12-article | **held-out** | 1160 px wrapper, sticky aside, fixed 760×430 figure, `pre` overflow, nowrap table |
| r13-listing | **held-out** | 240 px filter sidebar, 3×300 px grid, 520 px search, sticky bar over the pager, 9-link pager |
| hale | real | the Pixel-Clone replica of studio.smartduke.com/demo/hale (Next.js, scroll-driven) |

**Localization** (traps per case in `manifest-l10n.json → traps`)

| id | split | langs | what it stresses |
|---|---|---|---|
| l01-marketing | dev | fr | idioms and wordplay, CTAs, urgency, parallel taglines |
| l02-ui | dev | fr, ar | tooltips, dialogs, empty state, toast, ⌘K, **fixed 104×36 px buttons** |
| l03-long | dev | fr | long technical article, decimals/units, identifiers in `<code>`, **fixed-height cards** |
| l04-forms | dev | fr, ar | JS validation messages, counter built in JS, success text, placeholders |
| l05-dynamic | dev | fr, ar | interpolation, French 0/1 singular, Arabic six plural forms, hard-coded `en-US`, `$`+`toFixed`, percent, relative time |
| l06-terminology | dev | fr, ar | repeated terms must stay consistent; protected product/feature names; Kanban/OAuth/SSO |
| l07-seo-a11y | dev | fr, ar | title/meta/OG/JSON-LD, alt, aria-label, sr-only, skip link, hreflang/canonical |
| l08-rtl | dev | ar | physical CSS everywhere, arrows vs ▶, breadcrumb separator, stepper, progress fill, LTR islands, mixed text |
| l09-cultural | dev | fr | idioms, miles/lbs/°F, US dates 11/28 and 12/01, 12-hour clock, honorifics, tipping, address must stay |
| l10-docs | **held-out** | fr | CLI docs, `<pre>` blocks, flags, `<kbd>`, callouts |
| l11-restaurant | **held-out** | fr, ar | menu, 12 h hours, plural select options, dates in dynamic text |
| hale | real | fr | real site: composed strings, gendered articles, viewer + bag strings only visible after interaction |

## The judges (independent of the skills)

`harness/check-responsive.mjs` — 17 viewports (320…2560, landscape phone, short laptop, 200 % zoom) + a 16 px-step sweep 320→1600. Detects: overflow,
overflow masked by `overflow-x:hidden`, offscreen content, text clipped by overflow (measured on text boxes), overlaps, distorted images, touch targets
(<24 critical, <44 major), tiny text, fixed layers covering the viewport, content that exists but is unreachable (also tries menu toggles / dropdowns), console and request errors.
`harness/check-l10n.mjs` — language/direction/hreflang, structure parity, string pairing + English leakage, protected terms, bad literals, term families (whole-word), code blocks,
locale formats (number/date/plural probes for l05), form/dialog/viewer interaction probes, metadata + a11y attribute coverage, **new/worse clipped text vs the English source at 4 widths**, RTL mirror test,
LTR islands, directional icons.

The judges were calibrated against *negative controls* (an untranslated copy; the unfixed baseline) and against false positives found during the first runs (hover dropdowns,
off-canvas drawers, decorative overflow, lazy images, cognates, Arabic clitics, scroll-reveal content, text-over-image captions). Each calibration is listed in
`docs/evaluation/03-responsive-skill-report.md` / `04-localization-skill-report.md`; after the last one the harness files were copied to `*.FROZEN.mjs` and all reported comparisons use that exact judge.

## Run it

```
node lab/serve.mjs &                                           # http://localhost:4173
# (optional) the Hale real-world case needs the removed site: git checkout 2cfc203 -- hale-site, build and serve it on :3217
export PLAYWRIGHT_MODULE=<path to playwright>                  # the skills' scripts need it

# 1. start from the pristine baseline
node lab/tools/reset.mjs responsive && node lab/tools/reset.mjs l10n
# 2. run the skill under test on a case (in a Claude Code session: invoke the skill, point it at http://localhost:4173/responsive/r04-dashboard/ and its folder)
# 3. judge
node lab/harness/run-responsive.mjs --label myversion --split dev           # add --split heldout once, on a frozen version
node lab/harness/run-l10n.mjs       --label myversion --split dev
# 4. compare with a previous run
node lab/harness/compare.mjs F-v1 myversion
```
To judge a *snapshot* instead of the working folders: copy `lab/responsive` or `lab/l10n` (and `lab/assets`) to `lab/outputs/<v>/`, then add `--base http://localhost:4173/outputs/<v>/responsive`.
Held-out cases: run them **once** on a frozen version; never use their findings to edit the skill under test.
