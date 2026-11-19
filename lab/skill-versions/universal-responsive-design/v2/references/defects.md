# Defect catalog: symptom → usual cause → fix

| Audit finding | Usual cause in source | Fix (keeps intent) |
|---|---|---|
| `overflow` / `offscreen` | `width:1280px`, `repeat(4,280px)`, `flex:0 0 380px`, absolute `left/width` in px, `min-width` on tables/images | `width:100%; max-width:…`; `minmax(min(100%,Npx),1fr)`; `flex:1 1 Npx; flex-wrap:wrap`; `min-width:0` on flex/grid children |
| `hidden-overflow` | `overflow-x:hidden` on `html/body` masking a too-wide child | remove it, then fix the widest element named in the report |
| `clipped-text` | fixed `height` + `overflow:hidden` on cards/buttons/table cells; `nowrap` | `min-height`; `white-space:normal`; remove `overflow:hidden` or give the container room; for tables use a scroll container |
| `overlap` | absolute positioning with px offsets; image + copy both absolute; negative margins | put in normal flow (grid/flex), stack on narrow screens; keep intentional overlaps and say so |
| `distorted-img` | `object-fit:fill` (default) with both width and height set | `aspect-ratio` + `object-fit:cover/contain`; `height:auto` |
| `tap<24` / `tap<44` | 20–32 px buttons, inline links turned into flex items, 14 px radios, icon-only buttons | `min-height/min-width:44px`; `padding` on links in lists/footers; label as hit area; keep inline prose links inline |
| `tiny-text` | 10–11 px labels | ≥12 px (≥16 px for inputs) |
| `fixed-cover` | permanent chat/cookie/promo bars | smaller on phone, dismissible, `sticky` instead of `fixed` |
| `unreachable` | nav `display:none` below a breakpoint without a replacement; hidden columns; features removed | provide the toggle / alternative; never drop the content |
| sweep range but matrix clean | fixed matrix missed a width (e.g. 1013 px) | fix the component, not the width; set breakpoint at the range's upper edge |
| new group in `--compare` | the fix broke something else | revert or adjust; re-run |

## False positives (decide, don't reflex)
- Items inside an **intentional scroller** (carousel, data table in `overflow-x:auto`) — pass `--intentional` or confirm the scroller really scrolls.
- **Off-canvas drawers** and fixed panels positioned outside the viewport — not page content; verify the open state works.
- **Decorative bleed** (giant background lettering, rotated shapes, `aria-hidden`) clipped on purpose.
- **Text over images / overlays** reported as overlap — acceptable if legible and the subject is not covered (look at the screenshot).
- **Content revealed on scroll** (opacity 0 until scrolled): wait/scroll before judging.
- Sticky scenes: stacked layers overlap by design.
Whenever you dismiss a finding, write one line saying why.

## Scroll-driven / JS-geometry sites
Full-page screenshots only show the initial state of sticky stages. Use `--scroll-shots` and open several. Check that geometry computed in JS
(`innerWidth`, `getBoundingClientRect`) is recomputed on `resize` and orientation change, that `100vh` stages use `svh/dvh`, and test a short
landscape height (844×390).
