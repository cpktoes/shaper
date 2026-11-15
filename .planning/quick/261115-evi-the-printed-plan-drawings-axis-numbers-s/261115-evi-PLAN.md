---
quick_id: 261115-evi
title: The printed plan drawings' axis numbers settle on one size
date: 2026-11-15
source: to-do 2026-11-14-printed-plan-drawings-axis-numbers-two-sizes.md (quick 261113-vya's PDF comparison: nine unchanged boards printed their axis numbers at 9 pt one time and 11 pt the next)
planned_by: the orchestrator inline (no planner or executor spawned)
---

# The printed plan drawings' axis numbers settle on one size

## Goal

Printing the same board twice gives the same page twice. The axis numbers on the plan drawings (page 1, a fish's page 2
or 3, the Rail Band page) no longer come out at 9 pt one time and 11 pt the next.

## What was found

The drawings pin their text to screen dots through `useSvgFitScale`, which measures the svg's box once at mount and
again whenever its ResizeObserver delivers. The print fit (`use-print-fit.ts`) pins the root and every sheet to the
paper's width inside `beforeprint` — 733 px against the 880 px screen sheet, a ratio of 1.2, exactly 11 pt over 9 pt. A
print snapshot is taken as soon as `beforeprint` returns; an observer delivers at the next rendering opportunity. Which
came first was a coin toss: observer first, 9 pt; snapshot first, 11 pt. Nothing in the bottom-tables change touched it,
which is why boards with no bottom cut showed it too.

## Tasks

1. The fit speaks last, the drawings answer at once: after sizing every sheet, `beforePrint` dispatches one event
   (`PRINT_FIT_EVENT`, `callout-primitives.tsx`); both fit hooks listen for it and measure again inside `flushSync`, so
   the render is on the page before the handler returns. (A `beforeprint` listener of the hooks' own would not do — a
   child's effect runs before its parent's, so the drawings would hear it before the form had pinned anything.)
2. Pin the handshake in `order-form-print.test.ts`: the event is sent after the last sheet is sized, inside
   `beforePrint`, and both hooks listen, answer with `flushSync` and let go on unmount.
3. Prove it in the browser (`e2e/summary-print-axis-size.spec.ts`, a computer): the instant `beforeprint` returns, every
   drawing's text on the sheets is already the size it settles to two frames later; and the same board printed to PDF
   five times gives five identical files once each file's clock and id are blanked.
