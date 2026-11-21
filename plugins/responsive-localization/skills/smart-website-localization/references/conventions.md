# Locale conventions (apply deliberately, per target market)

Decide each row in the brief; do not let them happen by accident.

| Area | What to localize | fr-FR | ar (MSA, neutral) |
|---|---|---|---|
| Numbers | decimal / thousands separators, digits | `1 234,50` (U+202F thin nbsp for thousands, comma decimal) | Western digits `1,234.50` (Gulf/Maghreb web) **or** Arabic-Indic `١٬٢٣٤٫٥٠` (Egypt/Levant print) — pick one per site and keep it |
| Currency | placement, symbol; convert only if the business sells in that currency | `120 $` / `120 €` (nbsp before symbol) | `120 US$` / `120 د.إ`; keep ISO code if ambiguous |
| Percent | spacing | `42 %` (nbsp) | `42%` |
| Dates | order, month names, 24 h | `28 novembre 2026`, `28/11/2026`; weekdays/months lowercase | Gregorian month names (`مارس`); Hijri only if asked |
| Time | 12 h → 24 h | `19 h 30` (or `19:30`) | `7:30 م` / `19:30`; keep consistent |
| Units | imperial → metric | km, kg, °C, g/m² | km, kg, °C |
| Names/honorifics | Mr/Mrs → M./Mme or Monsieur/Madame; surname order | M., Mme | السيد / السيدة |
| Address & phone | keep real-world addresses and numbers **verbatim**; localize labels (ZIP → code postal) | | numbers stay LTR |
| Customs | tipping, holidays (Thanksgiving, Black Friday), sports idioms | tipping not expected: rewrite or drop; keep brand events by name | weekend Fri–Sat in some markets; avoid alcohol/pork imagery assumptions; holidays: do not invent |
| Plurals | CLDR categories via `Intl.PluralRules` | `one` = 0 **and** 1 | six: zero, one, two, few (3–10), many (11–99), other (100+) |
| Lists/quotes | punctuation | « guillemets » with nbsp; `…`; `’` | `،` `؛` `؟`; quotes « » or " " |
| Name of the locale in UI | language switch labels in their own language | Français | العربية |

## Never translate
Brand and product names, code, CLI commands/flags, file paths, URLs, keyboard key names when they are the physical label (`Ctrl`, `⌘`), identifiers in
`<code>`, HTML ids/classes, email addresses, phone numbers, API/JSON keys, license keys, SKU, proper names of people/places in data.

## Dynamic strings
- Never concatenate sentence fragments; translate the whole sentence with named placeholders (`{count}`, `${name}`) and let the target order change.
- Use `Intl.PluralRules`, `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat` with the target locale; remove hard-coded `'en-US'`.
- Keep placeholder names identical; do not translate inside `{…}`; keep HTML tags (`<b>`) around the same words.
- Conditionals (`n === 1 ? … : …`) become a plural-category table, not a two-way switch.
- Gendered languages: avoid assembling `the {item}` from parts; give each item its own article form or rephrase around it.
