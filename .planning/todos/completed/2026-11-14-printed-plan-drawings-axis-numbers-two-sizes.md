---
created: 2026-11-14
title: Printed plan drawings — the axis numbers come out at two sizes
area: print
severity: minor
files:
  - components/summary/order-form.tsx
  - components/summary/use-print-fit.ts
source: quick 261113-vya, its SUMMARY, 2026-11-14
resolves_phase:
---

# Printed plan drawings — the axis numbers come out at two sizes

## Problem

Printing the same unchanged board twice can give the plan drawings' axis numbers at 9 pt one time and 11 pt the next (seen on
A4 mostly: page 1, a fish's page 2 or 3, and the Rail Band page). It showed up when 160 order-form PDFs were compared before and
after the bottom-tables fix: 9 unchanged boards differed in nothing but that. It is on pages that fix did not touch and on boards
with no bottom cut at all, so it is older — something in how the drawings measure themselves when the print sheet is laid out.

## What is needed

Find what the plots measure at print time and why it can settle on two answers, make it settle on one, and prove it by printing
the same board several times and comparing the PDFs page by page (the scratch tools from 261113-vya did exactly that; note its
first comparison script compared nothing — check a comparison can fail before trusting "identical").

## Done

2026-11-15 — quick 261115-evi (commit 7a83ae2c). The cause: the drawings pin their text from a ResizeObserver's measurement and the print fit pins the sheets to the paper inside `beforeprint`; whether the observer answered before the snapshot was a coin toss (880 over 733 is 1.2, exactly 11 pt over 9 pt). The fit now tells the drawings to re-measure at once, inside `flushSync`, after it has sized every sheet. Proved by running the race in screen media (`e2e/summary-print-axis-size.spec.ts`, fails on 28 texts without the fix) and by five identical PDFs of the same board.
