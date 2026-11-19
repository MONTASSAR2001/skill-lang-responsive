# RTL checklist

Text direction ≠ layout direction. Setting `text-align:right` is not RTL support.

1. `<html lang="ar" dir="rtl">`. Let the browser mirror flex/grid/inline flow.
2. Convert physical CSS to logical: `margin-left`→`margin-inline-start`, `padding-right`→`padding-inline-end`, `left/right`→`inset-inline-start/end`,
   `border-left`→`border-inline-start`, `text-align:left`→`start`, `float:left`→`inline-start`.
3. Mirror directional visuals: back/forward arrows, chevrons, progress fill direction, sliders, breadcrumbs separators. Do **not** mirror
   media play icons, checkmarks, clocks, logos, photos, numerals.
4. Keep LTR islands LTR: phone numbers, emails, URLs, code, Latin product names (`<bdi>` or `dir="ltr"`).
5. Digits: choose Western or Arabic-Indic per target market and apply consistently.
6. Shadows/gradients/transforms with a horizontal direction must be flipped.
7. Check the result visually: logo, nav, forms, tables, tabs, toasts, carousels.
