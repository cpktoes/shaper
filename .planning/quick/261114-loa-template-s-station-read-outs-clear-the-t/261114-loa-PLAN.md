---
quick_id: 261114-loa
title: TEMPLATE's station read-outs clear the toolbar on a phone held sideways
date: 2026-11-14
source: to-do 2026-10-18-clear-the-template-toolbar-off-the-sideways-phone-readings.md; the founder, 2026-11-14: "Move the readings clear"
planned_by: the orchestrator inline (no planner or executor spawned)
---

# TEMPLATE's station read-outs clear the toolbar on a phone held sideways

## Goal

On a sideways Pixel 7 (863 × 360) and iPhone (844 × 390) the TEMPLATE toolbar covered the Tail @ 12" reading on the
turned board. The founder's pick of the three measured options: move the readings' top row clear of the toolbar's corner;
the board keeps its size.

## Tasks

1. A pure rule (`components/outline/readout-clear.ts`): the last read-out of the row slides left until a gap clear of the
   toolbar's left edge; each read-out before it is pushed along only as far as the one after it needs.
2. The editor measures the toolbar's box on a short screen (`useShortScreen`, a ResizeObserver on `ViewerToolbar`) and
   hands it to the viewer; the viewer works out each read-out's screen box from its own frame and fit, turned and at 1x,
   and sets `OutputRail`'s `readoutY` (the bent leader) where the rule says. Nothing is handed over anywhere else.
3. Prove it: unit tests on the rule; `e2e/template-sideways-readings.spec.ts` on both phones and the computer; the
   desktop TEMPLATE baseline and the toolbar spec re-run.
