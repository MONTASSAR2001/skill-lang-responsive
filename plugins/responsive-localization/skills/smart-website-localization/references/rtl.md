# RTL (Arabic, Hebrew, Persian, Urdu)

Text direction is not layout direction. `text-align:right` alone is not RTL support. Do all of this and verify by *mirror test*: landmarks anchored left in the LTR page must hug the right in RTL.

1. **Document**: `<html lang="ar" dir="rtl">` (per page/locale). Flex rows, grids, inline flow and tables mirror automatically — do not "fix" them with `row-reverse`.
2. **CSS**: convert physical → logical (safe for LTR too, so convert the shared stylesheet in place rather than forking it):
   `margin-left/right`→`margin-inline-start/end` · `padding-left/right`→`padding-inline-start/end` · `left/right`→`inset-inline-start/end` ·
   `border-left/right`→`border-inline-start/end` · `border-radius` corners→`border-start-start-radius` etc. · `text-align:left/right`→`start/end` ·
   `float:left/right`→`inline-start/end` · `clear`. Search for: `-left`, `-right`, `left:`, `right:`, `float`, `text-align`, `translateX`, `rotate`, `background-position`, `linear-gradient(to right`, `box-shadow` offsets, `transform-origin`.
3. **Directional visuals** that carry meaning and need flipping (`[dir=rtl] .x{transform:scaleX(-1)}` or swap the glyph): back/forward/next/prev arrows and chevrons, breadcrumb separators, progress/slider fills and gradients, carousels, tab slide animations, drawers, reading-order stepper shapes, shadows with x-offset. **Do not flip**: play ▶ and media transport, checkmarks, clocks, search lens, logos, photos, numerals, phone/email text, code.
4. **LTR islands** stay LTR: tel/email/url inputs (`dir="ltr"`), phone numbers, codes, Latin names, URLs (`<bdi>`/`dir="ltr"`). For mixed sentences put `<bdi>` around the Latin run so neutral punctuation attaches to the right side.
5. **Numbers/digits** consistent per site (see `references/arabic.md`); tables: numeric columns `text-align:end`.
6. **Typography**: no letter-spacing, no italics, `line-height` ≥1.6, Arabic-capable font stack declared (not left to fallback).
7. **Scripts**: scroll/drag/keyboard handlers that assume left→right (ArrowRight = next) swap; `scrollLeft` is negative in RTL; `getBoundingClientRect().left` math must use the direction; canvas/chart axes.
8. **Verify**: `verify.mjs --lang ar` mirror check + look at 390 and 1280 screenshots; click through nav, forms, tabs, carousels; check toast/drawer side; test long Arabic strings and mixed LTR content.
