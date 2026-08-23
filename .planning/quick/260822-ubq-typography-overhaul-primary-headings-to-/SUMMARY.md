---
gsd_summary_version: 1.0
quick_id: 260822-ubq
slug: typography-overhaul-primary-headings-to-
date: 2026-08-22
status: complete
commits:
  - 889b3a9 feat(design): typography overhaul onto the surf faces
---

# Summary — Typography overhaul

Task 2 of the 3-task design pivot. Task 3 (interactive controls / selection states)
is next.

## What shipped

**Headings** — `font-display text-surf-black uppercase tracking-architectural
font-bold` on: four screen titles, five panel/viewer titles, the three
`SectionHeading` helpers plus their nested disclosure variants, the data-panel group
headings, the three summary card titles, and the setup screen's page title.

**Body** — Inter at `text-sm font-normal text-surf-muted` on setting labels, slider
hints, screen subtitles, checkbox labels, table row labels and footnotes. `font-body`
is set once on `<html>` so everything inherits it; only headings opt out.

**Font foundation repaired.** `@theme inline` declared `--font-sans: var(--font-sans)`
— self-referential, nothing defining it at `:root`, so it resolved to nothing. Two
live consequences, both fixed:

- `html { @apply font-sans }` never applied.
- `components/viewer/callout-primitives.tsx` asks for `var(--font-sans)` directly in
  five places, so every LENGTH / WIDEPOINT / TAIL BLOCK dimension callout on the
  board viewers was drawing in the browser's default serif. Now `--font-body`.

`--font-heading` inherited the same fault and now routes to the display face. Geist
Sans is dropped from the font loads — nothing references it any more.

## Judgement calls

1. **Calculated values keep their prominence.** The brief's categories are
   descriptions, setting labels and secondary text. Rail band marks, fin positions,
   volume and thicknesses are none of those — they are the product. They stay
   `text-surf-black` and bold against muted labels. Muting them would have inverted
   the hierarchy the app exists for.
2. **ALL CAPS is now a heading-only signal.** Setting labels were uppercase; the
   brief lists no `uppercase` for body text and the source config ties caps to
   headers. Labels moved to sentence case so caps + architectural tracking mean
   "heading" and nothing else.
3. **The summary print sheet keeps its own type scale.** `--summary-font-*` (clamp +
   cqw) feeds the zoom-to-fit in `use-print-fit.ts`; enlarging labels there would
   scale the whole sheet down and shrink the numbers. Only face, colour and tracking
   changed. Measured A/B: required scale identical at 0.39 before and after.

## Verification

Lint clean (9 pre-existing warnings in `scripts/`). 633 tests pass. All six screens
checked in-browser; no console or server errors. Computed styles confirm headings
resolve to Space Grotesk at 0.25em tracking and body to Inter 14px/400 at `#6b6b6b`.

## Deferred to Task 3

Everything still carrying the amber accent is a control or a state, which is Task 3's
scope: active nav link and hover, selected tail-shape and fin-setup chips, the
Print Summary button, "Start Shaping" on the preset cards, Reset links, the rails and
fins tab strips, the "· Modified" status flag, and the headline volume figure.

The slider constraint note (`Clamped to 2" less than Tail Block`) was also left amber
deliberately — it is a functional warning rather than decoration, so its colour is
part of the accent decision.

## Pre-existing issue found, not fixed

The rail Ratio slider's scale ticks (`30/70 50/50 60/40 70/30`) abut with zero gap in
a 400px sidebar — 60/40 ends at x=334 and 70/30 begins at x=334, so they read as one
run of digits. Confirmed pre-existing at the original 9px, not introduced here.
Task 3 touches these controls and can absorb the fix.
