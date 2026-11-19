# Hale clone — notes

Reference: https://studio.smartduke.com/demo/hale (SmartDuke Studio demo template, "HALE — The Autumn Rail"). Cloned with the
Pixel Clone skill (unmodified) as a local test subject for the two new skills. Assets stay local; the product photography and
fonts belong to the template author and are not licensed for redistribution.

## Profile
- Next.js/React, scroll-driven (22 viewports tall), no WebGL, no canvas, GSAP in the bundle (profile said `false`; the bundle uses it).
- `profile_site` mis-detected a product card as a "gate" and opened the viewer. Gate handling was disabled (`dismissOverlays:false`).
- Scaffold: `scaffold.mjs --gsap on --three off --framer off --lenis off`. Hand-authored React + the site's measured CSS (`replay:false`).
- Server: the clone runs on **port 3217** (`PORT=3217 npm start`); port 3000 is used by another project on this machine.

## Section inventory (all ticked)
| # | Scroll range @1440x900 | Section | Component |
|---|---|---|---|
| 1 | 0 – 4365 | The rack (3D rail, 8 pieces, intro) | `Rail.tsx` |
| 2 | 4365 – 9990 | Try it on (sticky, wipe between 8 outfits) | `TryOn.tsx` |
| 3 | 9990 – 12330 | Out the door (tile reveal) | `Door.tsx` |
| 4 | 12330 – 13302 | Lookbook (hotspot, shop the look) | `Sections.tsx` → `Lookbook` |
| 5 | 13302 – 15822 | The workshop (SVG mask zoom into "HALE") | `Zoom.tsx` |
| 6 | 15822 – 18202 | Out in it (horizontal strip on vertical scroll) | `Sections.tsx` → `Strip` |
| 7 | 18202 – 18546 | Promises | `Sections.tsx` → `Promises` |
| 8 | 18546 – 20090 | Footer rail (swinging garments), newsletter, footer | `Footer.tsx` |
| – | overlay | Product viewer (fly-in, 3D turn, sizes, add to bag) | `Viewer.tsx` |
| – | overlay | Bag drawer | `Chrome.tsx` |

Section tops/heights are identical to the reference at 1440x900 (doc 20090px both).

## Diff results (compare_visual_diff, fullpage, freezeTime, pixelmatch 0.05)
| Viewport | Slices | Hover / viewer / bag | Height |
|---|---|---|---|
| 1440x900 | 23/23 = 100% (settleMs 3500) | 100 / 100 / 100 | 20090 = 20090 |
| 1920x1080 | 23/23 = 100% | 100 / 100 / 100 | 23794 = 23794 |
| 390x844 mobile | 24/24 ≥ 99.98% | 99.99 / 100 / 100 | 20094 = 20094 |

Iteration log: (1) first diff hit the wrong server (port 3000 belongs to another app) → 9.4%; (2) correct port, no time freeze → 97.07% mean,
slices 0-3 and 20 low because the rack is wall-clock eased (phase jitter); (3) `freezeTime:true` → 22/23 = 100%, strip slice 91.7% because the
reference had not yet decoded a lazy image; (4) longer settle → 23/23 = 100%.

## Deviations
- Floating "fly-to-bag" ghost image on add-to-bag not reproduced (bag count/lines/subtotal are). Not covered by the diff states.
- Two unused scaffold helpers (`src/lib/gsap.ts`, `src/components/useScrollTrigger.ts`, `ClientOnly.tsx`) remain; a removal was blocked by the safety check, so they were left.
- All copy is hard-coded in components/data (as in the original) on purpose: it is the realistic input for the localization skill.

## Changes made *after* the clone was verified (for the skill tests — the English desktop design is unchanged)
The pixel-diff numbers above are for the clone as first built. Afterwards the two new skills were run on it:
- **Localization** (`src/i18n/`, `src/app/fr/`, `src/app/(en)/`): English-as-key dictionary, `/` (en) and `/fr` with separate root layouts, `Intl` money, hreflang/canonical, footer language switch (English · Français). All copy was already hard-coded in components/data, so the English strings are unchanged.
- **Responsive** (appended blocks `responsive:v1/v2/v3` at the end of `src/app/globals.css`, plus the header in `src/components/hale/Chrome.tsx`): mobile nav toggle + panel (the original hid the 3 links below 760 px with no replacement), 44 px touch targets ≤1024 px, ≥12 px labels ≤1024 px, lookbook hotspot label kept inside the viewport, footer-rail garment size reduced at 760–1100 px so the last two garments are not cut off.
- Deliberate deviations from the reference: at ≤1024 px (targets, label sizes, mobile menu) and at 760–1100 px (footer rail). Desktop ≥1280 px is meant to be unchanged — see `docs/05-combined-test.md` §2 for the re-run pixel diff.
- Servers used during testing: `.next` on 3217 (final), `.next-v2` on 3218 and `.next-v3` on 3219 (intermediate states, can be deleted).
