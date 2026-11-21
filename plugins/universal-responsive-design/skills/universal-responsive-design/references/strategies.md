# Component → responsive strategy

Decide per component; write the decision down (phone / tablet / desktop) before editing. "Default" is a starting point, not a rule.

| Component | Default strategy | Details / traps |
|---|---|---|
| **Hero: text + image** | 2 columns ≥ ~820 px (grid, `minmax(0,1fr)`), stack below. Heading `clamp(2.25rem, 7vw, 6rem)` + `overflow-wrap:anywhere`. Image `width:100%; height:auto; aspect-ratio; object-fit:cover; object-position` on the subject | Never `object-fit:fill`. Decide which comes first on phone by importance. Replace fixed `height` with `min-height`. |
| **Hero: background image** | `min-height: clamp(...)`, content in flow (flex end), `background-position` on the subject, gradient scrim for contrast | Fixed px text boxes overflow phones; use `max-width` + padding. |
| **Hero: long heading** | `clamp()` + `hyphens:auto`/`overflow-wrap`; padding `clamp()` instead of 160 px | 80 px side padding on a 320 px screen leaves a 0 px content box. |
| **Top navigation** | Collapse behind a real `<button aria-expanded aria-controls>` when links stop fitting (sweep tells where). Keep brand + primary action visible. Panel is reachable by keyboard; dropdowns open on click/focus too, not only `:hover` | 44 px targets. Test 700–1300 px: many sites break *between* phone and desktop. |
| **Sticky/fixed bars** | Keep slim on phones; `position:sticky` over `fixed` when possible; `scroll-padding-top` for anchors; avoid permanent covers of content (chat, cookie bars → dismissible, `env(safe-area-inset-*)`) | Check `fixed-cover` in the audit. |
| **Card grids** | `grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))`, `gap:clamp()`. Remove fixed card heights and `nowrap` titles; images `aspect-ratio` + `object-fit:cover` | Uneven content: let rows size to content; use `align-items:start` if equal heights look wrong. |
| **Dashboard** | Sidebar ≥ ~960 px, off-canvas drawer (toggle button, `aria-expanded`, closes on link tap) below; KPI grid auto-fit; charts `width:100%;height:auto` with a `viewBox`; filter bar `flex-wrap`; secondary widgets stack, primary stays first | Do not hide widgets; reorder or collapse. `min-width:0` on grid/flex children that contain charts/tables. |
| **Data table (wide)** | Container `overflow-x:auto` + sticky first column, header kept; keep numeric columns right-aligned | Prioritise columns (hide *secondary* ones behind a "columns" control) only when users need few; cards only for short, record-like rows. A 4-column table that fits needs no change. |
| **Forms** | Single column below ~600 px; rows `flex-wrap` with `flex:1 1 14rem`; controls `min-height:44px`, `font-size:16px`; actions full-width stacked on phone; labels above fields; errors adjacent and `role=alert` | Radios/checkboxes: label is the hit area (≥44 px). Do not turn a paragraph with links into `display:flex`. |
| **Images / gallery** | `max-width:100%; height:auto`; gallery auto-fit grid with `aspect-ratio` + `object-fit:cover` + `object-position` | Portrait vs landscape: choose crops per slot; never stretch. |
| **Media overlay (text over image)** | Phone: caption below the image (static) or full-width scrim at the bottom; keep text ≥ 4.5:1 | Fixed-px overlay boxes cover the subject on small screens. |
| **Video / embeds** | `width:100%; height:auto; aspect-ratio:16/9` | |
| **Typography** | Headings `clamp()`, body ≥16 px, nothing below 12 px; `overflow-wrap:anywhere` for URLs; `hyphens:auto` with `lang` set | Buttons with long labels: `white-space:normal`, `min-height`, never fixed `height`. |
| **Footer** | `grid auto-fit minmax(min(100%,10rem),1fr)`; newsletter spans 2 columns / full width on phone; link rows ≥44 px; legal row wraps | Social icons ≥44 px. |
| **Horizontal scroller** | Keep as a scroller (`overflow-x:auto`, `scroll-snap`), tiles `flex:none; width:min(…)` | Mark with `--intentional`. |
| **Overlap/pull-up compositions** | Keep the overlap but contain it (`overflow:clip` on the wrapper, `max-width` on the card, margins in `clamp()`); remove negative offsets that create page overflow | |
| **Sticky/scroll-driven stages** | `100svh` stages, JS geometry recomputed on `resize`, short-height variant (`@media (max-height:…)`), `prefers-reduced-motion` | Verify with `--scroll-shots`; check landscape phone. |

## Breakpoint selection
1. Run the sweep. Each reported range is a width where *something* breaks.
2. Pick the **upper end** of the range as the `min-width`/`max-width` boundary for the restructure (or make the component intrinsic).
3. Re-run; ranges must disappear; also test ±64 px around the boundary.
