---
name: smart-website-localization
description: Localize a complete website or web app into one or more languages (French, Arabic/RTL, any other) with real understanding of context, tone, terminology and UI constraints rather than literal translation. Use when asked to translate/localize/internationalize a site, add a language or RTL support, adapt copy for another market, or review a localization. Covers visible copy, forms and validation messages, dynamic strings (variables, plurals, dates, numbers), SEO metadata, accessibility text, and RTL layout.
---

# Smart website localization

You localize so the result reads as if it were written for that audience, works exactly like the original, and still fits
the layout. Translation is one part; formats, direction, metadata and behaviour are the others.

## Hard rules
- **Never translate literally when the literal version is unnatural.** Translate intent, tone and function; keep the persuasive
  force of marketing copy and the brevity of UI text.
- **Never break behaviour.** Variables (`{name}`, `${n}`, `%s`, ICU), HTML structure, links, ids/classes, code, identifiers, URLs and
  event handlers stay intact. Do not delete content you find hard to translate.
- **Protect names and technical tokens**: brand/product names, code, CLI flags, file paths, keyboard keys, identifiers.
- **One term, one translation** across the whole site. Build a glossary first and obey it.
- **Direction is layout, not just alignment.** For RTL, see `references/rtl.md`.
- **Verify in a browser.** Look at the localized pages; don't assume.

## Workflow

### 1. Discover
Identify the stack and where user-facing text lives: markup, JSX/templates, JSON/message files, JS string literals, `<title>`/meta/
JSON-LD, `alt`, `title`, `aria-*`, `placeholder`, validation/toast messages, server/CMS content. Note any existing i18n system and reuse it.
Confirm target locales; default to the site's source locale as reference.

### 2. Brief
Write a short brief: audience, register (e.g. French *vous*, formal Arabic MSA vs. neutral), brand voice, what must never be
translated, regional conventions (units, dates, currency, address). Build a **glossary** of repeated product/technical terms with the chosen
target term for each language.

### 3. Extract
Inventory every string with `node <skill>/scripts/extract-strings.mjs --url <url> --out strings.json`. It lists text nodes,
attributes and head metadata from the rendered page; then grep the source for strings the render cannot show (messages in JS,
error states, other routes). Group strings by type (marketing, UI, form, error, dynamic, SEO, a11y).

### 4. Choose the architecture
Match the project; don't impose a framework. Static site → one folder per locale sharing assets (fix relative paths), or runtime
dictionary. Next.js/React → dictionary files + locale route segment or the project's i18n library. Always set `lang`, `dir`,
`hreflang` alternates and canonical.

### 5. Translate
Translate by type: marketing (adapt idioms, keep rhythm), UI (short, conventional, consistent verbs), long text (accuracy and tone),
forms/errors (polite, specific, actionable), dynamic strings (restructure the sentence around its variables; use `Intl.*`
for dates/numbers/plurals instead of hand-made rules), SEO/a11y (translate and keep within length), code/commands (leave).
Check expansion: French is ~15–30 % longer. Fix layout issues that translation causes (fixed widths/heights) or shorten the copy.

### 6. RTL (Arabic, Hebrew, …)
Follow `references/rtl.md`: `dir="rtl"`, logical CSS properties, mirror directional icons but not media/checkmarks, isolate LTR runs
(phone, email, Latin names), digits policy.

### 7. Verify
```
node <skill>/scripts/verify.mjs --source <url> --target <localized url> --lang fr
```
It compares structure with the source, flags leftover source-language text, checks `lang`/`dir`, broken assets and overflow at a few
widths. Then open screenshots of the localized pages, click through the interactive parts (forms, menus, dynamic content)
and read the text again for naturalness.

### 8. Report
Languages and files changed; architecture; glossary; coverage (what was and wasn't localized); decisions where the literal translation
was rejected; issues found/fixed; remaining issues; what was verified automatically vs. by reading. Hand layout problems (text expansion, RTL
fallout) to the responsive-design skill if available.
