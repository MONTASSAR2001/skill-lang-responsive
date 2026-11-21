# Arabic (ar) notes

**Variety.** Modern Standard Arabic, neutral vocabulary understood across markets; avoid dialect in UI. Ask (or state) if a market-specific variant is needed (Gulf, Egypt, Maghreb).
**Register.** Address the user directly and politely (second person, masculine-neutral imperatives are the convention in UI: *أدخل*, *اضغط*); keep consistent.
**Plurals (CLDR).** zero · one · two · few (3–10) · many (11–99) · other (100+). Use `Intl.PluralRules('ar')`; write all six noun phrasings where a count is shown (e.g. `ملف واحد`, `ملفان`, `5 ملفات`, `11 ملفًا`, `100 ملف`; zero: `لا ملفات`). Number–noun agreement reverses for 3–10 (plural noun) and 11+ (singular accusative).
**Digits.** Pick Western (`0123`) or Arabic-Indic (`٠١٢٣`) per site; do not mix on one page. `Intl.NumberFormat('ar-u-nu-latn')` for Western digits. Phone numbers, codes and prices copied from data stay as given.
**Punctuation.** `،` (comma), `؛`, `؟`; full stop `.`; parentheses mirror automatically. Ellipsis `…`.
**Mixed content (bidi).** Latin names, product names, emails, URLs, phone numbers are LTR islands: wrap in `<bdi>` or `dir="ltr"` (inputs of type tel/email/url get `dir="ltr"`). Check order of `Wi-Fi 6`, `iPhone 15 Pro`, `$29.99`, `12.4 GB`; units (GB, km) may be localized (غيغابايت، كم).
**Brand/loanwords.** Keep brand names Latin; common technical terms may stay Latin (API, OAuth, SSO, webhook) — pick one form and keep it; transliterate (سبرنت) only when the audience does.
**Terminology.** Build the glossary: `workspace` مساحة عمل/مساحة العمل, `dashboard` لوحة التحكم, `settings` الإعدادات, `billing` الفوترة, `seat` مقعد/ترخيص, `backlog` قائمة المهام المتراكمة. Definite article `ال` and clitics (و، ف، ب، ل) attach to words — consistency checks must tolerate them.
**Marketing/idioms.** Adapt, don’t calque; avoid idioms that rely on sports/Western customs. Keep CTAs short (Arabic is often 10–20 % shorter than English but needs taller line-height: 1.6–1.8; avoid letter-spacing and italics).
**Typography.** Never apply `letter-spacing` to Arabic (breaks joining); no `text-transform`; choose a font with Arabic glyph coverage (Noto Sans Arabic, IBM Plex Arabic) — fall back deliberately; do not use italics (use weight).
**Fonts + layout hand-off.** Line-height, font size (Arabic looks smaller: +1–2 px), and RTL layout changes are layout work — verify with the responsive skill.
