# Linguistic review — smart-website-localization v2 run (dev set, evaluator pass)

Method: v2 workflow step 7 — `pairs.tsv` read top to bottom, then the page opened at 390/1280. Same-model reviewer: **not native-speaker verification**.

## Findings from the v1 output and what v2 did
| Finding (v1 output) | Severity | v2 action | Evidence |
|---|---|---|---|
| l05 heading "Message counts" → "Nombre de fichiers" / "عدد الملفات" (source heading says messages; list says files; v1 silently "corrected" the source) | **critical** (meaning changed) | translated faithfully: "Nombre de messages" / "أعداد الرسائل"; the source inconsistency belongs in the report | `pairs.tsv` read-through (no script can see it) |
| l03 `.fact` fixed-height cards clipped French (11 px at 1280, 264 px at 390) | **critical** | cards `min-height` + fluid 3→1 column grid in the French page; judge 4→0 | frozen judge `text-clipped-after-translation` |
| l07 fr nav "Service" (reads as customer service; the intent is bike servicing) | major | "Entretien" | review (the cognate allow-list hid it from the script) |
| l01 fr "Shop the drop" → "Découvrir la collection" (limited-release urgency lost) | major | "Découvrir le drop" | review |
| no hreflang / language alternates on 12 pages | major | `hreflang` en / fr / ar / x-default on source and every localized page | verify.mjs `hreflang` |
| French spacing: no no-break space before `: ; ? ! »`, `%`, `$`, units | minor | U+00A0 inserted in French text nodes and in `app.js` template strings | verify.mjs `fr-typography` |
| l09 fr "Un pourboire de 15 à 20 % est apprécié au café" (US tipping custom kept) | minor | "Au café, un pourboire est apprécié mais jamais obligatoire (le service est compris)" | review + `references/conventions.md` |

## Still open (minor / judgement calls)
- l02 fr: "Supprimer" / "Enregistrer" on the 104 px buttons are shortened from "Delete project" / "Save changes" (accepted trade-off, documented).
- l04 ar: counter "N/140 حرف" uses one noun form for all counts.
- l06 fr keeps "backlog", "sprint", "merge request", "webhook" as anglicisms (normal in French agile teams; recorded in the glossary decision, not a defect).
- No visible language switch on the lab pages (they are single static pages); Hale has one.
- Everything here was reviewed by the same model family that translated it.
