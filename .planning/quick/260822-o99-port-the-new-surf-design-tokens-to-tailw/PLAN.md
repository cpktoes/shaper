---
gsd_plan_version: 1.0
quick_id: 260822-o99
slug: port-the-new-surf-design-tokens-to-tailw
date: 2026-08-22
status: complete
---

# Quick Task 260822-o99 — Surf design tokens + core layout setup

Task 1 of a 3-task design-system pivot. Tasks 2 (typography) and 3 (interactive
controls / selection states) follow as separate quick tasks after user review.

## Problem

The founder supplied a new design language as a **Tailwind v3 `tailwind.config.js`**
(crisp white, matte black, cyan/orange accents, Space Grotesk + Inter, wide
architectural tracking). This project runs **Tailwind v4**, which has no JS config —
theme tokens are declared in CSS via `@theme`. The config as written would be inert.

The app currently wears a warm modernist palette (amber `#c98d3a`, cream `#f7f4ee`
page, dark `#2b2924` sidebars). The new tokens are a hard pivot to white/black.

## Scope (Task 1 only)

**In scope — surfaces and space:**
1. Port every token from the supplied config to Tailwind v4 `@theme`, preserving the
   exact utility names the founder wrote (`bg-surf-base`, `text-surf-muted`,
   `bg-surf-accent-cyan`, `font-display`, `tracking-architectural`, …).
2. Load Space Grotesk + Inter via `next/font/google` so `font-display` / `font-body`
   resolve to real webfonts (applied in Task 2).
3. `bg-surf-base` universally — nav, sidebars, canvases, cards.
4. Massive negative space around the 2D surfboard preview; strip the card chrome
   (rounded border box) so grouping is spatial, not drawn.
5. Borders reduced to `border-surf-muted/20` and kept only where structural
   separation is mandatory: nav underline, sidebar↔canvas divide.

**Deliberately deferred:**
- Task 2 — typography (font families, uppercase, tracking, text sizes/colors).
- Task 3 — accent usage. Cyan vs orange is an open founder decision; both tokens are
  defined here but neither is applied. `--outline-accent` (amber) stays live so the
  app remains reviewable between tasks.

## Approach

Two complementary moves, chosen so Task 1's diff stays legible:

- **Explicit `surf-*` classes** on the things Task 1 actually names — layout wrappers,
  page/panel shells, preview containers, card surfaces. These read as the new system.
- **Token-value remap** of the leaf-level `--outline-sidebar-*` / `--outline-page-bg`
  vars to the surf palette. The control panels are 200–700-line files whose deep
  internals (sliders, selects, section rules) reference these tokens. Remapping the
  values keeps them legible on the new white ground without a sprawling class rewrite
  that belongs to Tasks 2 and 3. Those files get converted class-by-class then.

Without the remap the sidebars would render near-white text (`#f7f4ee`) on white and
be unreadable at the review point.

## Tasks

- [x] T1 — Declare surf tokens in `@theme` (app/globals.css)
- [x] T2 — Load Space Grotesk + Inter (app/layout.tsx), body → `bg-surf-base`
- [x] T3 — Remap `--outline-*` surface tokens to the surf palette (app/globals.css)
- [x] T4 — Site nav → white ground, hairline underline
- [x] T5 — Four editor shells + summary → white ground, hairline sidebar divide
- [x] T6 — 2D preview containers → massive negative space, chrome removed
- [x] T7 — Card + table surfaces → `bg-surf-base` / `border-surf-muted/20`
- [x] T8 — Browser verification (all six screens), lint + tests

## Verification

- `npm run lint` and `npm test` pass.
- Every screen (`/`, outline, rails, volume, fins, summary) renders white-on-white
  with legible text and no orphaned warm-cream or dark-brown surfaces.
- The outline Template Viewer sits in visibly generous empty space with no drawn box.

## Known concern to raise at review

`text-surf-muted` (`#9E9E9E`) on `#FFFFFF` is ~2.6:1 contrast — below WCAG AA (4.5:1)
for body text. Task 2 applies it to all body copy and labels. Flagging before that
lands, since the audience is shapers reading numbers in a bright workshop.
