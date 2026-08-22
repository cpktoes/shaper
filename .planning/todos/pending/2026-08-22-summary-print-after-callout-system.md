---
created: 2026-08-22
title: Verify and refit the Summary print sheet after the callout-system rebuild
area: ui
severity: minor
files:
  - components/summary/board-summary.tsx
  - components/summary/use-print-fit.ts
  - app/design/summary/summary.css
  - components/outline/outline-viewer.tsx
  - components/viewer/callout-primitives.tsx
source: viewer callout system quick task 260822-vcs; deferred by the user to the print phase
resolves_phase: 3
---

# Verify and refit the Summary print sheet after the callout-system rebuild

The viewer callout system (quick task `260822-vcs`, sketches 001-004) was verified **on screen
only**. The Summary screen's print path was never exercised. The user deferred it to Phase 3, where
printing is already the subject.

## Why it is at risk

The rebuild changed things the print sheet depends on:

- **The outline viewBox widened** from `0 0 340 620` to `-50 -16 410 638` to make room for the
  input chips and the output rail. Its aspect ratio therefore changed, and
  `board-summary.tsx`'s Template card had a hardcoded `aspect-[340/620]` that had to be updated for
  screen. Print has its own sizing path and was not checked.
- **`useSummaryPrintFit`** (`components/summary/use-print-fit.ts`) measures and scales the sheet to
  fit a page. It was written against the old, narrower drawing.
- **`app/design/summary/summary.css`** carries print-only rules, including the `body`
  viewport-clamp exemption added in phase 01 so printing was not constrained to one screen height.
- **Input chips now render on the Summary template** (commit `4db8fad`), which was a deliberate
  change — the printed sheet is read at the blank where there is no sidebar. That adds content to
  the printed drawing that was not there when the print path was last verified.

## New since this was written: the Template card's aspect is now dynamic

Quick task `260822-lg3` stopped the viewer shrinking wide boards by letting the viewBox widen
instead of scaling the drawing down. Two consequences for print:

- `board-summary.tsx`'s Template card no longer carries a fixed `aspect-[410/638]`. It computes the
  ratio from `outlineViewMetrics(outlineGeometry).frame`, so **the card's aspect now depends on the
  board being printed** — a 25in board is a wider card than a 19in one.
- `useSummaryPrintFit` measures and scales the sheet. It has now been written against two different
  frame widths and verified against neither.

Print a wide board (widepoint at or near 25in) as well as a default one — the fit logic has never
seen a non-baseline aspect.

## Pagination is fixed (260822-nbz, 2026-08-22)

The sheet no longer runs to multiple pages. The `@page` margin is pinned at 8mm, the page box is
derived from the smaller of Letter and A4 landscape instead of a hardcoded 1030x750 that was taller
than either, and the summary grid moved from a viewport media query to container queries so the
layout measured at `beforeprint` is the layout that actually prints. Measured: 996x613 from a 1600px
window and 972x728 from a narrow one, both inside Letter and A4.

**So what is left here is legibility at print scale, not pagination** — items 3, 4 and 5 below. The
sheet prints at roughly 0.69 zoom, so the faint reference lines and the low-alpha widepoint dash are
the real risk, and that needs a printer rather than a measurement.

## What to check

1. Print preview `/design/summary` — the whole sheet fits one page, nothing clipped at the gutters.
2. The board is not distorted: the widened viewBox must not be squeezed back into the old ratio.
3. Chips and the output rail are legible at print scale, not shrunk to illegibility.
4. Reference lines still read at print density — they are deliberately faint (`#c9c0ab`) on screen
   and may need a stronger value for paper.
5. The widepoint station line (`2 3` dash at 45% alpha, added in `1585e23`) survives printing;
   low-alpha dotted lines are the first thing to disappear on a printer.

## Related

This is the on-screen sheet, not TMPL-01. TMPL-01 is the full-size 1:1 outline template tiled
across pages — a different artifact with different scaling rules (see
`.planning/quick/260818-u1n-*/PLAN.md`, which is explicit that the two must not be conflated).
Both live in Phase 3, so do them together, but do not merge them.
