# Localization — linguistic review rubric

Used by the *evaluator* pass, after the harness has run. Input: `<result>/pairs.tsv` (source ⇥ target per aligned string), the
case `traps`, and screenshots `t390.png` / `t1280.png`. Every finding is quoted `source → target` and tagged with an evidence label
(`LINGUISTIC`, `BROWSER`, `AUTO`). **No composite score**; report counts per dimension and per severity.

| # | Dimension | What to check | Critical when | Minor when |
|---|---|---|---|---|
| 1 | Semantic accuracy | meaning, polarity, quantities, who-does-what | meaning changed or inverted; heading no longer describes its content | nuance lost |
| 2 | Completeness | every string, attribute, metadata, validation/error/toast message | content missing or left in the source language (sentence level) | single cognate/label left |
| 3 | Naturalness & grammar | idiom, agreement (gender/number), word order, calques | ungrammatical or unintelligible | stiff but understandable |
| 4 | Register & brand voice | tu/vous, formality, tone consistent with source | wrong register for the audience (e.g. rude/over-casual) | slight drift |
| 5 | Terminology | glossary obeyed; one term = one translation; protected names untouched | protected name/identifier altered; same term translated two ways in one view | acceptable synonym |
| 6 | UI suitability | brevity, conventional verbs, fits the control | label truncated/overflowing or ambiguous action | could be shorter |
| 7 | Variables & dynamic text | placeholders intact, plural rules, order of words around variables | variable lost/corrupted; wrong plural category | awkward but correct |
| 8 | Locale conventions | decimal/thousand separators, currency, dates, 24 h, units, honorifics, phone/address | wrong data shown (e.g. US date order read as another date) | typographic (nbsp, quotes) |
| 9 | Cultural adaptation | idioms, customs (tipping, holidays), imagery | offensive or confusing | missed opportunity |
| 10 | SEO & accessibility | title, meta, OG, JSON-LD, alt, aria, sr-only, `lang`, hreflang | metadata/aria left in source language | length/keywords tweak |
| 11 | RTL (Arabic) | `dir`, mirrored layout, mirrored icons only where directional, LTR islands, digits policy, bidi punctuation | layout not mirrored; text order scrambled | one icon/spacing detail |
| 12 | Visual & functional integrity | no clipped/overflowing text, nav and forms still work | clipped text, broken function | tiny spacing |

Severity rule of thumb: *critical* = a user would be misinformed, blocked, or see broken UI; *minor* = a native editor would polish it.

Review method: read pairs in order (not skimming), mark each defect; then re-open the page at 390 and 1280 and look at it.
State clearly that review by the same model family is **not** native-speaker verification.
