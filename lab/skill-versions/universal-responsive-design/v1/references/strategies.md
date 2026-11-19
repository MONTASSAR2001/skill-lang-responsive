# Component → responsive strategy

| Component | Default strategy | Notes |
|---|---|---|
| Hero (text + image) | Stack on narrow screens (image above or below by importance), fluid heading with `clamp()`, `max-width:100%` image with `object-fit` | Don't scale a 96px heading with `vw` only: set min/max |
| Hero (background image) | Fluid height (`min-height`, not `height`), `background-position` set to the subject, text container `max-width:100%` + padding | Ensure contrast over the image |
| Top navigation | Collapse to a toggle (button + `aria-expanded`) below the width where links stop fitting | Keep logo + primary CTA visible; test intermediate widths; dropdowns must work with touch/keyboard |
| Card grid | `grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` | Remove fixed card heights; let content decide |
| Dashboard | Sidebar → off-canvas or top bar; KPI grid reflows; charts get `max-width:100%` and a fluid `viewBox`; filters wrap | Prioritise what stays above the fold |
| Data table | Wrap in a scroll container (`overflow-x:auto`) with sticky first column for wide tables; prioritise columns when only a few matter; cards only for short, record-like rows | Don't force every table into cards |
| Form | Single column on narrow screens, 44px controls, 16px inputs, full-width actions | Keep labels visible; errors next to fields |
| Images / gallery | `max-width:100%; height:auto`, `aspect-ratio` + `object-fit:cover`, gallery as auto-fit grid | Never distort with `object-fit:fill` |
| Video / embeds | `width:100%; aspect-ratio:16/9` | |
| Typography | `clamp()` for headings, `overflow-wrap:anywhere` for long strings, body ≥16px | Min 12px for any text |
| Footer | Columns → 2-up → stacked, links wrap, newsletter form fluid | |
| Fixed/sticky | Keep small on phones; avoid covering content; account for safe areas | |
| Horizontal scroller | Keep intentionally scrollable; add scroll-snap | |
