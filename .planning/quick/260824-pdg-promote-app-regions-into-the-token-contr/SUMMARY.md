---
id: 260824-pdg
slug: promote-app-regions-into-the-token-contr
date: 2026-08-24
type: quick
status: complete
---

# App regions as first-class surfaces

The founder's read was right and the earlier "roles, not elements" framing was too narrow.
The sidebar, the drawing canvas, the active tab, the nav and the body were **one value** —
`--surf-ground` — so no palette could tell apart five places that are visibly separate on
screen. The app had even had `--outline-sidebar-bg` and `--outline-page-bg` as distinct
concepts before they were aliased together during the theming work.

These are roles, not elements. "Sidebar" is as legitimate a semantic surface as "panel".

## Added

`--surf-sidebar`, `--surf-canvas`, `--surf-tab-active`, carried in **both ramps** so they
are per-theme tunable, and **seeded to the ground value** so the commit changes nothing on
screen until one is deliberately moved.

## Re-pointed — including everything nested inside a region

The dangerous half. A child still saying `bg-surf-base` inside a canvas region would show a
ground-coloured patch the instant canvas diverged — the same latent-until-themed failure as
the on-fill foregrounds. So all of these moved together:

| surface | sites |
|---|---|
| sidebar | 4 asides, the 3 inactive fin/tail pills that sit in them |
| canvas | 4 mains, the panes inside each (viewer, data, model info, rail table, volume card), the setup screen, the rails explanatory note |
| tab-active | both tab strips' selected state |
| panel | the toe/aim dialog, the order-form sheet and its select |

Deliberately left as ground: the **nav** and **`<body>`** — they are the chrome the regions
sit on. Left alone: `components/ui/slider.tsx`, shadcn-generated, and its thumb is
overridden to the accent by `.slider-accent` on every design screen.

## Widepoint dropped as its own colour

`--outline-widepoint-knot` now derives from `--surf-accent-ink`. It marks a draggable
*input* — the same role the construction overlay plays and already signals with the accent
— and the `2 3` dash keeps it distinct from the stringer's `16 4 4 4` centreline. One less
colour to keep in step per theme, one less thing a new theme must define.

## A bug caught mid-edit, worth recording

The first pass used `str.replace(needle, …, 1)` where the 2-space needle
`"  --surf-well: var(--ramp-dark-well);"` is a **substring** of the 4-space line inside the
`@media (prefers-color-scheme: dark)` block. So the media block received the three
assignments *twice* and `:root.dark` received *none* — meaning an explicit `.dark` (exactly
what the theme chooser sets) would have fallen back to the light sidebar on a dark app.
Caught by counting assignments per block rather than trusting the edit. **Indentation-
sensitive anchors are not unique; count the result.**

## Verified

build ✓ · tsc ✓ · 659/659 ✓ · eslint 0 errors. All four theme blocks confirmed to hold
exactly three assignments each. Proved the regions are independently addressable by
diverging them at runtime — aside, main, active tab, nav and body each resolved to a
different colour — then reverting.

## Bench

Rebuilt around the change: a **Regions** group (Window, Sidebar, Canvas, Active tab) above
a **Surfaces** group (Panel, Well); the widepoint picker removed; the specimen restructured
into the real app shell so the four regions render as separate places; and the audit grown
to 29 rows covering ink and muted against every region, plus a `line-faint on canvas` row
because that is what the active tab's edge depends on.
