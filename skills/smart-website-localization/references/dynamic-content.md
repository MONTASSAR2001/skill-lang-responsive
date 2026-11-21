# Content that is not in the markup (API, database, CMS, bundled files, content added later)

A site is not localized until **every place its text comes from** is covered. Translating the interface strings and stopping there leaves headings, tables, cards and articles in the source language, because they were never in the templates. Do this inventory in step 1 and keep it in the report.

## 1. Inventory every text source

| Source | How to find it | Typical failure | Strategy |
|---|---|---|---|
| Markup / templates / components | read the code; `extract-strings` rendered inventory | usually done first | dictionary or locale folders |
| String literals in JS/TS (toasts, validation, `confirm()`, plural branches) | `extract-strings --source-dir` candidates | forgotten because they never render on load | move into the dictionary, interpolate with `Intl` |
| **API / database / CMS content** | `extract-strings` prints "strings come from the API/network" with endpoint and JSON path; read the backend models | UI is French, the data (titles, descriptions, table rows) is English | server-side localization (§2) |
| Bundled content (markdown, MDX, JSON, "journal"/blog files, seed data) | list content directories; grep for content loaders | each file is one language only | one file per locale, or locale keys in the data |
| Content authored later (admin app, user input, imports) | find the create/edit endpoints and admin screens | new text silently stays in the source language forever | translation pipeline (§3) |
| Emails, PDFs, push, SMS, server-rendered errors | grep the backend for templates and exception messages | only the web UI was translated | same dictionary, picked by the user's locale |
| Admin / authenticated screens | `--storage-state` (see SKILL.md) | never opened, so never translated | decide explicitly: localize or out of scope; say which in the report |
| Images with text, video captions, `og:image` | crawl and look | text baked into pixels | replace per locale or flag |

Never rely on one crawl of the home page: use `--crawl N` so every route is inventoried.

## 2. Localizing data served by an API

- Pick **one** way to ask for a language and use it everywhere: `Accept-Language`, a `?lang=` parameter, or a locale path prefix. The client sends it on *every* data request, not only the first.
- Store translations next to the original, keyed by *entity + field + locale* (a translations table or a JSON column), not as a copy of the whole record. Keep the original text; it is the source of truth for re-translation.
- **Fallback is explicit:** requested locale → source locale, and the response says which one it used (`Content-Language`), so a gap is visible instead of silently English.
- **Caching:** the cache key and `Vary` must include the language, or one user's French is served to the next user's English.
- Slugs, IDs and routes stay stable across locales; translate display fields, not identifiers. Search indexes and sort order need the locale too (collation, Arabic normalization).
- Dates, numbers and units in data fields are formatted on the client with `Intl` for the locale; do not store formatted strings.

## 3. Content added later

Text typed in an admin app after launch must not stay in one language by accident.
1. On save, **enqueue** the new/changed fields for each target locale (do not translate inside the request).
2. A worker translates through the configured provider (machine translation or an LLM) using the **glossary and brief**, then stores the result with `status` (`machine`, `reviewed`, `approved`) and the source text hash, so edits invalidate stale translations.
3. **Sensitive text waits for a person:** anything about health, safety, medicine, legal terms, pricing, consent or emergency steps is never published from machine output alone. Mark those fields `needs_review` and show the original until approved.
4. Give editors a **Translations screen**: coverage per locale, what is missing or stale, edit/approve, and re-queue.
5. If no provider is configured, the queue just fills; say so in the report instead of pretending it works.

## 4. Keep it from regressing

Add a **coverage check** to the build so a new English string without a translation fails CI. The shape is project-specific, but it always does the same thing: enumerate the source-language strings the app can emit (dictionary keys, content files, seed data, model fields) and fail if any target locale lacks an entry. Pair it with the crawl-based residue check below. Without a gate, the next feature reintroduces the problem.

## 5. Prove it on the running site

```
node <skill-dir>/scripts/extract-strings.mjs --url <localized-root> --crawl 40 --residue fr --protect "Brand,ProductName" --out residue.json
```
It follows same-origin links, records the text of every page **and** of every JSON response the page loads, and lists what is still in the source language, per page and per endpoint (exit code 1 if anything is found). Read the list: brand names, product names and shared words are expected residue (add them to `--protect`); everything else is a gap. The heuristic only catches clearly source-language text, so a clean result is a lower bound: still run `verify.mjs` on the key routes and read the pairs.

Report the number before and after (for example "740 → 26 English strings left, all plant and product names"), not "done".
