---
phase: quick-260822-nbz
plan: 01
subsystem: ui
status: complete
tags: [summary, print, volume, container-queries, page-fit]

requires:
  - phase: quick-260822-n02
    provides: the content-height Volume card, without which adding rows would have squeezed the fin diagram
provides:
  - Summary Volume card at row parity with the Volume screen, including the three cross-section rows shown when importing
  - useSummaryPrintFit measuring the print layout at the printable width and deriving its target from real paper sizes
  - Summary grid driven by container queries, so screen and print agree on which layout applies
affects: [.planning/todos/pending/2026-08-22-summary-print-after-callout-system.md -- the multi-page symptom is fixed; the remaining checks in that todo are about legibility at print scale, not pagination]

actuals:
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "The summary grid uses container queries (@container + @min-[900px]:) rather than viewport media queries, because print media has a different viewport than the screen -- a viewport breakpoint means the layout measured before printing is not the layout that prints"
    - "Print page box derived from paper dimensions and a pinned @page margin, measured through a 1in probe element rather than assuming 96dpi"

key-files:
  modified:
    - components/volume/volume-calculation-card.tsx
    - components/summary/use-print-fit.ts
    - components/summary/board-summary.tsx
    - app/design/summary/summary.css
---

# Summary: Volume row parity, and a print that is genuinely one landscape page

## 1. The Volume card was a subset

The `compact` branch of `volume-calculation-card.tsx` dropped `Center Thickness` and the three
`geomReady` cross-section rows — which is exactly the set that appears when importing from the
template and rails, so the Summary showed less than the Volume screen precisely when a shaper had
real geometry to read. Those rows are in now. What compact still drops is chrome, not data: the
"Volume Calculation" heading (the card carries its own title) and the closing estimate disclaimer.

Confirmed on screen: Template Area, Tail / Center / Nose Cross-Section Thickness,
Length-Weighted Effective Thickness, Estimated Volume — the Volume screen's own set.

## 2. The print sheet ran to multiple pages

Three separate causes, all measured rather than guessed.

**The page box was a magic number.** `PAGE_W 1030 x PAGE_H 750`. A US Letter landscape page at 0.4in
margins is 979x739 and A4 landscape is 1045x717, so at a 1600px window the sheet scaled to 919x750 —
11px too tall for Letter, 33px too tall for A4. It is now derived from the smaller of Letter and A4
on each axis, converted with a 1in probe element rather than assuming 96dpi.

**The margins were not pinned.** `@page` set `size: landscape` and no margin, so the printable area
moved with whatever was in the print dialog and no fixed target could be right. Now `margin: 8mm`,
mirrored in the hook as `PAGE_MARGIN_MM` with a comment on each side saying they move together.

**It measured the wrong layout — the big one.** `beforeprint` fires before the browser relays out for
print, so the hook measured the grid at the *window's* width. Worse, the summary's breakpoint was
`min-[900px]`, a viewport media query: printing from a window under 900px measured a tall
single-column layout and then printed a three-column grid, so the scale bore no relation to what came
out. The grid now uses **container queries** (`@container` on the root, `@min-[900px]:` variants),
and the hook pins the root to the printable width before measuring — so the layout it measures is the
layout that prints, at any window size.

The hook also lays out a second pass at `PAGE_W / firstScale`, because `zoom` shrinks the width it
was given along with everything else and the sheet would otherwise print letterboxed. The re-measured
scale is floored by the first, so both axes stay inside the page whichever one binds.

## Verification

Measured with the print rules applied, reading the root's real post-zoom `getBoundingClientRect`:

| Window | Screen layout | Layout while printing | Rendered sheet | Fits Letter | Fits A4 |
|---|---|---|---|---|---|
| 1600px | 3-column | 3-column | 996 x 613 | yes | yes |
| ~970px | 1-column | **3-column** | 972 x 728 | yes | yes |

Before the fix, the 1600px case rendered 919x750 — over both papers — and the narrow case measured a
2233x3728 column that had nothing to do with the printed page.

`npm test` 633 pass, `tsc` and `eslint` clean, no console errors.

## Not done

The sheet fits one page; whether every line on it is *legible* at 0.69 zoom is the remaining open
question, and it is what the rest of the print todo covers — the faint reference lines
(`#c9c0ab`) and the low-alpha widepoint dash were called out there as the first things to disappear
on paper. That needs a real printer, not a measurement.
