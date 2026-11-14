---
created: 2026-11-14
title: Leftovers from the 2026-11-14 go-live code review
area: general
severity: minor
files:
  - components/setup/open-board-file.tsx
  - lib/export/brd-read.ts
  - components/setup/hover-rack.tsx
  - lib/geometry/outline-drag.ts
  - components/outline/outline-controls.tsx
  - lib/geometry/tip-flow.test.ts
  - e2e/viewer-zoom.spec.ts
source: quick 261114-118 (REVIEW.md in its folder) and the go-live gate, 2026-11-14
resolves_phase:
---

# Leftovers from the 2026-11-14 go-live code review

## Problem

Not fixed before the go-live, on purpose:

- WR-03: a deliberately crafted `.brd` takes about 17–21 s to fit (an ordinary one 0.45 s). It runs in the background and another
  pick cancels it; if the background worker cannot run, those seconds freeze the page. The review's fix (cap sections at 40 and
  knots at 64) was not taken because the app's own 12'0" export may carry more than 40 sections — measure first.
- IN-04: a hand-made board file whose board is too wide for its length draws wider on the Board Rack than on the design pages
  (the width hold happens in the design store only).
- IN-03: the Tail Block slider's range is written in two places.
- `lib/geometry/tip-flow.test.ts` still asserts a stopwatch (`elapsed < 1000`), which can fail on a busy machine.
- `e2e/viewer-zoom.spec.ts` "a trackpad pinch…" failed once in the full suite: for a moment ROCKER had two BLANK buttons, one
  loading and one ready. It passed alone four times of four. Harmless on screen, but a real transient worth a look.

## What is needed

One small task each, or one sweep: a time limit or a section budget for the fit that keeps our own longest exports; the width
hold applied where the rack reads a board; one source for the Tail Block range; the stopwatch assertion removed; the BLANK
button's loading and ready states never in the page together.
