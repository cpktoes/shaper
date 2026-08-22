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
