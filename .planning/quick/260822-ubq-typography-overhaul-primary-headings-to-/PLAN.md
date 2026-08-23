---
gsd_plan_version: 1.0
quick_id: 260822-ubq
slug: typography-overhaul-primary-headings-to-
date: 2026-08-22
status: complete
---

# Quick Task 260822-ubq — Typography overhaul

Task 2 of the 3-task design pivot. Follows 260822-o99 (tokens + layout). Task 3
(interactive controls / selection states) follows after review.

## Brief

> Force primary headings to `font-display text-surf-black uppercase
> tracking-architectural font-bold`. Update all body descriptions, setting labels
> and secondary texts to `font-body text-surf-muted text-sm font-normal`.

## What the scan turned up

**The font foundation is broken.** `@theme inline` declares
`--font-sans: var(--font-sans)` — self-referential, and nothing defines it at
`:root`, so the token resolves to nothing. Two consequences, both live:

- `html { @apply font-sans }` never applied, so the whole app renders in the
  browser default rather than Geist.
- `components/viewer/callout-primitives.tsx` sets `fontFamily: "var(--font-sans)"`
  in five places for the SVG dimension callouts drawn on every board viewer. Those
  labels — LENGTH, WIDEPOINT, TAIL BLOCK and the measurement values — are currently
  rendering in the browser's default serif.
- `--font-heading: var(--font-sans)` inherits the same fault, affecting the shadcn
  `Card` and `AlertDialog` titles.

This is typography on the configurator panels, so it is in scope here.

**Two contexts must keep their own type scale.** Blanket `text-sm` would damage both:

- **The summary print sheet** scales the whole grid with CSS `zoom` to land on one
  landscape page (`use-print-fit.ts`). Enlarging its labels makes the sheet scale
  down further, which shrinks *the numbers* — the product of this app. It already
  has a responsive scale in `app/design/summary/summary.css`
  (`--summary-font-callout|group|row|label|volume`, clamp + cqw). Leave it alone.
- **The `compact` panel variants** feeding that sheet, for the same reason.

**Values are not secondary text.** The brief's three categories are descriptions,
setting labels and secondary text. Calculated numbers — rail band marks, fin
positions, volume, thicknesses — are the payload a shaper cuts foam to. They stay
`text-surf-black` and bold. Muting them to `text-surf-muted font-normal` would
invert the hierarchy the product depends on.

## Decisions

**ALL CAPS becomes a heading-only signal.** Setting labels are currently uppercase
(`BOARD LENGTH — 6'0"`). The brief lists no `uppercase` for body text, and the
source config ties caps to headers ("wide tracking for ALL CAPS headers"). Keeping
caps on labels would blur the hierarchy the pivot is building, so labels go
sentence case and caps + `tracking-architectural` is reserved for headings.

**`font-body` applied by inheritance, not per element.** Setting it once on `html`
covers every descendant, so only headings need an explicit `font-display`. Avoids
sprinkling `font-body` across hundreds of nodes.

## Tasks

- [x] T1 — Repair the font foundation: `--font-sans`, `--font-heading`, `html` base
      font; point the SVG callouts at `--font-body`; drop the now-unused Geist Sans
- [x] T2 — Primary headings: 4 screen titles, 6 panel/viewer titles
- [x] T3 — Section headings: the three `SectionHeading` helpers + disclosure variants
- [x] T4 — Body: slider labels, hints, descriptions, notes, table row labels
- [x] T5 — Convert the leftover warm-grey text hexes (`#8a8272`, `#a49b86`, `#1c1b19`)
- [x] T6 — Confirm calculated values kept their prominence
- [x] T7 — Verify: six screens in-browser, print-fit intact, lint, tests

## Verification

- `npm run lint` and `npm test` pass.
- Headings render in Space Grotesk, caps, 0.25em tracking; body in Inter.
- SVG board callouts render in Inter, not serif.
- Summary still fits one landscape page at its pre-existing type scale.
- No heading wraps badly in the 400px sidebar.
