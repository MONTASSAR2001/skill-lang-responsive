# Responsive — visual & intent rubric

The harness measures geometry. This rubric covers what geometry cannot: *was it designed or just squeezed?* Review screenshots at
360, 768 and 1280 (`w360.png`…), plus a scroll-through for sticky/scroll-driven pages. Tag findings `VISUAL`.

| # | Question | Critical | Minor |
|---|---|---|---|
| 1 | Hierarchy: is the primary message/CTA still the most prominent thing on phone? | CTA or heading lost/hidden | emphasis weaker |
| 2 | Content order: does stacking order follow importance (image above/below copy, filters vs results)? | essential content pushed far down / unreachable | suboptimal order |
| 3 | Density & whitespace: padding scaled with the viewport, no huge empty bands, no cramped blocks | content cramped to unreadable | spacing a little loose |
| 4 | Proportions: type scale, image sizes, button sizes feel intentional (no desktop shrunk) | unreadable text; giant media | mildly off |
| 5 | Navigation: reachable, understandable, works by touch and keyboard at every width | no way to reach a section | extra tap |
| 6 | Media: subject not cropped away, no distortion, text over image legible | face/product cut off; illegible overlay | crop could be better |
| 7 | Components chose the right pattern (table scroll vs cards; off-canvas vs top bar) | pattern destroys the data/usage | alternative would be nicer |
| 8 | Intent preserved: desktop unchanged, intentional scrollers/sticky/overlaps still work | desktop regression or feature broken | cosmetic desktop drift |
| 9 | Intermediate widths (600–1100): no awkward in-between state | broken layout at some width | slightly odd |
| 10 | Not "fixed by hiding": nothing important removed or `display:none`d | content removed | decorative element dropped |
