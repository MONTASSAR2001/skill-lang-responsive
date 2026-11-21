---
name: smart-website-localization
description: Localize a complete website or web app into one or more languages (French, Arabic/RTL, or any other) with real understanding of context, tone, terminology, locale conventions and UI constraints instead of literal translation. Use when asked to translate/localize/internationalize a site, add a language or RTL support, adapt copy for another market, or review/fix a localization. Covers visible copy, forms and validation messages, dynamic strings (variables, plurals, dates, numbers, conditionals), SEO metadata, accessibility text, hreflang/lang switching, RTL layout, and the layout fallout of longer text.
license: MIT
compatibility: Requires Node.js 18+ and Playwright with Chromium to run the bundled scripts (npm i -D playwright && npx playwright install chromium). Works in any agent that can run shell commands and view small images; no Claude-specific features are required.
metadata:
  author: MONTASSAR2001
  version: "1.1.0"
  repository: https://github.com/MONTASSAR2001/skill-lang-responsive
---

# Smart website localization

Deliver a site that reads as if it were written for that audience, behaves exactly like the original, and still fits its layout.
Translation is one part; conventions, direction, metadata, behaviour and layout are the rest.

## Setup
`<skill-dir>` in the commands below is the directory that contains this SKILL.md (it holds `scripts/` and `references/`); resolve it to an absolute path before running a script. Requirements: Node.js 18+ and Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`, or set `PLAYWRIGHT_MODULE` to an existing playwright package directory). Check the setup with `node <skill-dir>/scripts/verify.mjs --help`. Run scripts only against pages you own or are allowed to test; they open the URL in a real browser.

## Hard rules
1. **Translate meaning, tone and function — not words.** If the literal version is unnatural, rewrite it. Keep the persuasive force of marketing and the brevity of UI text.
2. **Translate the source faithfully; never silently "correct" it.** If the source looks wrong or inconsistent (heading says *messages*, list shows *files*), translate as written and flag it in the report.
3. **Never break behaviour.** Variables (`{name}`, `${n}`, `%s`, ICU), tags, ids/classes, links, handlers, code, commands, identifiers and URLs stay intact; no content is dropped because it is hard.
4. **Protect names and technical tokens** (see `references/conventions.md` → Never translate). Put them in the glossary `protect` list.
5. **One term, one translation** per site. Decide in the glossary first; check afterwards.
6. **Direction is layout, not alignment** (`references/rtl.md`). **Dynamic text is grammar** (plurals, gender, word order): never concatenate fragments.
7. **Verify in a browser, then read.** Scripts catch the measurable; only reading pairs catches wrong meaning, tone and terminology.
8. **Cover every source of text, not just the markup.** Text also comes from APIs/databases/CMS, bundled content files, JS string literals and content added later (`references/dynamic-content.md`). Translating only the interface is the most common way to ship a half-localized site: headings, tables and cards stay in the source language. Not finished until a crawl of the *running* site shows no source-language residue (or only listed, protected names).
9. **Stay in your lane.** You own words, formats, direction and metadata. Layout problems caused by length/RTL are fixed by the responsive-design skill or, if absent, by minimal container fixes (never by shortening good copy unless the control has no room).

## Workflow

### 1. Discover
Stack and where text lives. Build a **content-source inventory** (`references/dynamic-content.md` §1): markup and templates, JS string literals, `<title>`/meta/JSON-LD, `alt`/`title`/`aria-*`/placeholders,
validation/toast/dialog text, plural/conditional branches, **API/database/CMS content, bundled content files, content that admins or users add later**, emails/PDFs/server errors, authenticated and admin screens.
For each source decide: localize now / pipeline for new content / out of scope (and say so). Reuse an existing i18n system if there is one. Confirm target locales and the source locale.

### 2. Brief + glossary + conventions
Write `glossary.json` (`protect[]`, `terms[{source, targets:{fr:[[variants of one family]…], ar:[…]}, forbid:{fr:[…]}}]`) and a 10-line brief: audience, register (*vous*/*tu*, MSA), brand voice,
conventions per `references/conventions.md` (numbers, currency, dates, 24 h, units, honorifics, digits, customs). Language notes: `references/french.md`, `references/arabic.md`.

### 3. Extract everything
```
node <skill-dir>/scripts/extract-strings.mjs --url <url> --out strings.json --source-dir <src> [--steps "click:.open-dialog;wait:1200"]
```
Run it for each interactive state (dialogs, menus, drawers, viewers, error states) and with `--crawl N` for every route. It also records the **JSON API responses the page loads** and prints the endpoints whose text is *not* in the markup:
those need a data-layer strategy (`references/dynamic-content.md` §2-3), not a dictionary entry. Review the *source candidates* too: strings the rendered page never showed (validation messages, plural branches, toasts).
Group by type: marketing · UI · long-form · form/error · dynamic · data (API/CMS) · SEO · a11y · code (do not translate). Pages behind a login: `--storage-state` (see *If something fails*).

### 4. Choose the architecture (match the project)
Static site → one folder per locale sharing assets (fix relative paths) or a runtime dictionary; Next/React → dictionary + locale route or the project's i18n library (English-source-as-key is fine
for small sites; use context keys for homographs); keep text out of images. Always: `lang`, `dir`, `<link rel="alternate" hreflang>` for every locale + `x-default`, localized `<title>`/meta/OG/JSON-LD,
canonical per locale, and a visible language switch if the site has navigation. Do not change IDs/routes that scripts or tests depend on.
Content from a backend or added later needs its own design: per-locale data with explicit fallback, a language parameter sent on every data request, language-aware caching, a translation queue for new text with human approval for sensitive text (health, safety, legal, pricing), and a build check that fails when a new source string lacks a translation (`references/dynamic-content.md`).

### 5. Translate by type
Marketing (adapt idioms, keep rhythm, CTA short) · UI (short, conventional verbs, consistent) · long-form (accuracy, tone, sections consistent) · forms/errors (polite, specific, actionable, same field names as labels) ·
dynamic strings (rebuild the sentence around its variables; `Intl.PluralRules/NumberFormat/DateTimeFormat/RelativeTimeFormat` with the target locale; a branch per plural category) · SEO/a11y (translate every
`alt`, `aria-label`, `title`, placeholder, `sr-only`, skip link, JSON-LD description) · code/commands (leave; translate comments only if useful) · data (real addresses, phone numbers, names stay).
Apply conventions (units, dates, 24 h, currency, honorifics) and typography (French nbsp before `: ; ? ! %`, Arabic punctuation). Add an `ar`/RTL pass per `references/rtl.md`.

### 6. Verify
```
node <skill-dir>/scripts/verify.mjs --source <url> --target <url> --lang fr --glossary glossary.json --out <dir> [--steps ...] [--source-files a.js --target-files fr/a.js]
```
Run it on every key route, not only the home page. Fix every CRITICAL; justify every MAJOR. It checks `lang/dir/hreflang`, structure parity, leakage, metadata and a11y attributes, real broken assets, **new/worse clipped text and overflow vs the source at 320/390/768/1280**,
protected terms and term consistency, interpolation tokens, **API responses still in the source language (`api-content-not-localized`)**, French typography, Arabic digits and RTL mirroring/LTR islands/arrows.
Then measure what is left on the whole running site:
```
node <skill-dir>/scripts/extract-strings.mjs --url <localized-root> --crawl 40 --residue fr --protect "Brand,Product" --out residue.json
```
It lists source-language text per page and per API endpoint (exit 1 if any). Brand and product names are expected; anything else is a gap. Quote before/after numbers in the report. Then exercise the behaviour yourself in a browser: submit forms empty/invalid/valid,
open dialogs and menus, trigger dynamic text with different counts (0, 1, 2, 5, 11, 101), switch language.

### 7. Review pass (mandatory, separate from translating)
Read `<dir>/pairs.tsv` top to bottom. For each pair check: meaning and polarity · headings still describe their content · numbers/units · tone/register · terminology vs glossary · naturalness
(no calques) · fits the control. Re-read headings and CTAs aloud. Look at screenshots at 390 and 1280. Record findings as critical (meaning changed, content missing, variable broken, broken function/direction, clipped UI) vs minor (polish).
State plainly that this review is by the author's tooling and is **not** native-speaker verification.

### 8. Layout fallout
List components sensitive to length/direction (fixed `width/height`, `nowrap`, `overflow:hidden`, tight buttons, tabs, tables, nav). Fix or hand to the responsive skill, then re-run `verify.mjs` and the responsive audit on every locale.

### 9. Report
Languages and files; architecture; glossary + brief; coverage **per text source** (markup, JS strings, API/CMS data, bundled content, new-content pipeline, authenticated screens: localized / pipeline only / out of scope) with the residue numbers before and after; what was not localized, incl. interaction states; decisions where the literal translation was rejected; source inconsistencies flagged;
issues found/fixed; remaining issues; verified automatically vs by reading vs untested.

## If something fails
- **Playwright/Chromium missing** → extract strings from source instead (`--source-dir` logic by hand) and mark all visual/functional checks *unverified*.
- **Text only exists after interaction** → use `--steps` for the reachable states; list the unreachable ones in the report instead of guessing.
- **Pages behind a login (admin app, account area)** → the scripts redirect to the login page and warn about it. Ask the user for a session: `npx playwright codegen --save-storage=auth.json <login-url>` (they sign in, close the window), then pass `--storage-state auth.json` to every script. Never type or store passwords; treat the file as a secret and delete it afterwards. If no session is possible, list those screens as *not verified*.
- **Text comes from an API/CMS and the backend cannot be changed or reached** → say so; localize what the client owns (UI, formatting, fallback) and report the data as not localized. Do not hard-code translations of server data into the front end.
- **Source text looks wrong or inconsistent** → translate as written, flag it; never rewrite meaning silently.
- **A term has no good equivalent** → keep the original (with a short gloss on first use if needed) and add it to the glossary with the decision.
- **The translation does not fit the control** → shorten only if the label has no room; otherwise fix the container (fixed width/height, `nowrap`) or hand it to the responsive skill.
- **No native speaker available** → say the linguistic review is by the author's tooling; do not describe it as verified.
- **`verify.mjs` reports a critical finding you believe is a false positive** (cognates, addresses, intentional clipping) → add `--protect`/glossary entries or `--intentional`, and write the justification in the report.
