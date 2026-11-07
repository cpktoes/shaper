---
created: 2026-11-05
title: board-lock-screens' look-rails case fails on the iPhone project, the Unlock Board button not found
area: e2e (board lock)
severity: medium
files:
  - e2e/board-lock-screens.spec.ts
found_by: the 16-16 executor, 2026-11-05; fails the same way on de1d5e2f, before 16-16
---

## Problem

`e2e/board-lock-screens.spec.ts`, "look-rails", on the iphone project: the Unlock Board button is not found. Phase 16's
quiet A/B runs on pre-phase code saw this spec fail identically, so it may predate the phase.

## Needed

A look before go-live 2's full gate: a real failure on an upright iPhone or a test that lost its target.

## Added 2026-11-05 by 16-18

`board-lock-screens` x-3d failed about 3 of 23 runs on the iphone project, each captured failure hanging in `openFromRack`
(line 86): Open This Board is pressed on the home page's Board Rack and the page never reaches TEMPLATE, before the 3D
screen opens. All 14 captured runs that reached the 3D screen passed, and no rack code changed in 16-18. The other iPhone
lock failures may share this cause, not confirmed. Do not add a retry: a tap on Open that does nothing could be a real iPhone
bug, and a retry would hide it. Look before go-live 2.

## Resolved 2026-11-05

Three causes, each proven. (1) The test server's corner badge stretched across Open This Board between press and lift, so the
tap fell on the page; a test fault, the badge is not on the live site (per Next's docs and code, not run on a production build).
(2) A real bug, fixed in `components/setup/board-rack.tsx`: a board locked or unlocked a moment before Open opened with the old
lock state; no board data was at risk. (3) `s-fins` pressed Forward before the redraw; a test fault. `x-3d` on the iPhone went
from about 3 of 23 failing to 0 of 23. Still unexplained: one failure on a freshly started server, and `openLockedBoard`'s retry,
which hid the lock bug, is worth reconsidering. Real-iPhone checks went into 16-13.
