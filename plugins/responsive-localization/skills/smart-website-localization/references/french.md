# French (fr-FR) notes

**Register.** Default *vous* for commerce, SaaS, finance, institutions; *tu* only if the brand voice is explicitly informal/youth. State the choice in the brief and keep it everywhere (labels, errors, emails).
**Length.** +15–30 % vs English. Buttons: prefer a short conventional verb (*Enregistrer*, *Annuler*, *Supprimer*, *Commander*), not a literal phrase. Check fixed-width/height containers.
**Typography** (the browser will not do this for you):
- no-break space (U+00A0, or U+202F narrow nbsp) **before** `: ; ? ! %` and units, inside `« … »`; none before `, .`
- `’` (typographic apostrophe), `…` single character, `—` with spaces; capitalisation: only first word and proper nouns (titles are not Title Case); weekdays/months/languages lowercase; colours lowercase.
- 24-hour time `19 h 30`; dates `le 28 novembre 2026`; `1er` for the first of the month; decimal comma; `€` after the amount.
**Grammar traps.**
- Gender/number agreement with variables: `Voir {name}` fails when the article is needed (*le manteau* / *la veste*). Rephrase (`Voir : {name}`) or carry the article in the data.
- Plural: 0 and 1 are singular (`0 fichier`, `1 fichier`, `2 fichiers`). `Intl.PluralRules('fr')` gives `one` for 0 and 1.
- Elision: `de + le = du`, `à + le = au`, `de + voyelle = d’`. Don't build these by concatenation.
- Past participles agree: `Vous êtes inscrit·e` → avoid; use a neutral form (`Inscription confirmée`).
- Anglicisms that are normal in context (*email → e-mail*, *backlog*, *sprint*, *lookbook*, *fast fashion*) are fine when the audience uses them; choose once and keep the glossary consistent.
**Marketing.** Do not calque. `No-brainer` → *sans prise de tête*; `we’ve got you covered` → *on s’occupe de tout*; `don’t sleep on it` → *ne tardez pas*; `a home run` → *une excellente affaire*; `hit the ground running` → *partir du bon pied*. Keep rhythm and parallelism of taglines; prefer verbs natural for the object (*taillé* for a garment, not *coupé*).
**UI patterns.** Errors: `Veuillez saisir…` / `Votre mot de passe doit contenir…` — polite, specific. Empty states: say what to do. Confirmations: name the action (`Oui, supprimer`).
**SEO.** Titles ≤ ~60 characters, descriptions ≤ ~155 after expansion; keep the brand name; translate alt text as a description.
