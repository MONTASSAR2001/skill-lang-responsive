# Linguistic review — smart-website-localization v1 output (evaluator pass)

Reviewer: separate pass from execution, same model family → **not native-speaker verification**. Evidence labels: LINGUISTIC (read pairs), AUTO (harness), BROWSER.
Inputs: `pairs.tsv` per case, harness reports, traps in `lab/manifest-l10n.json`.

## Critical
| Case | Finding (source → target) | Dim. | Evidence |
|---|---|---|---|
| l05-dynamic fr/ar | Heading "Message counts" → "Nombre de fichiers" / "عدد الملفات". The list items are files, but the *source heading says messages*; the translator silently "fixed" the source. Meaning changed. | 1 | LINGUISTIC (pairs.tsv) — the harness cannot see this |
| l03-long fr | `.fact` cards fixed at 150px / `overflow:hidden`: French text cut by 11 px at 1280, 36 px at 768, 264 px at 390 (English: 0 / 11 / 190). | 12 | AUTO+BROWSER (`text-clipped-after-translation`) |

## Major
| Case | Finding | Dim. |
|---|---|---|
| l07 fr | Nav "Service" kept: in French it reads as "customer service", the intent is bike *servicing* → "Entretien". Harness allowlist (cognate) hid this; only human reading finds it. | 1/3 |
| l01 fr | "Shop the drop" → "Découvrir la collection": the *limited drop* urgency is lost. | 4 |

## Minor
- fr: no no-break space before `: ; ! ?` and inside `« »` (l01, l03, l04, l05, l09, Hale `Temps de lecture : 6 minutes`, `42 %`). Pages render a regular space → possible line break between word and punctuation.
- l09 fr: "Un pourboire de 15 à 20 % est apprécié au café." keeps a US custom unadapted (tipping is not expected in France).
- l02 fr: "Supprimer" (for "Delete project") and "Enregistrer" (for "Save changes") shortened to fit the 104 px button; acceptable but less specific.
- l04 ar: counter "0/140 حرف" uses one plural form for all counts (grammatical but not perfect for 3–10).
- Hale fr: "Studio" → "Maison" (nav/footer) chosen deliberately, glossary documented in `fr.ts`; colour names lowercase per French convention.

## What was good (evidence)
- l05: French 0/1 singular and Arabic six plural categories via `Intl.PluralRules`; dates, currency and percent via `Intl`; variable `${name}` intact (AUTO probes).
- l06: one term per concept in fr and ar after whole-word matching (AUTO).
- l08: layout mirrored (`.logo`, `.lang`, steps, note, toast), arrows flipped, ▶ not flipped, phone/email LTR, progress fill from the right (AUTO+BROWSER).
- l04: all four validation messages and the success message localized; counter works (AUTO probe).
- Hale: gendered article agreement solved with `def|` forms ("Voir la veste de travail", "Voir le manteau"); no English in viewer/bag (AUTO probe).
