---
phase: 15-the-board-rack
plan: 02
subsystem: board-rack
status: complete
tags: [rack, layout, gesture, reduced-motion, pure-geometry]
requires: []
provides:
  - lib/geometry/rack-layout.ts (one-scale rack layout, balanced rows, phone track, height lines, turn angle, room-making offsets, spine-word fit)
  - lib/models/rack-gesture.ts (every rack timing and threshold, press outcomes, swell, easing, tween, edge scroll)
  - useReducedMotion in components/design/use-viewer-media.ts
affects: [15-06, 15-07, 15-09, 15-11]
tech-stack:
  added: []
  patterns:
    - "Pure layout module under lib/geometry/ with every length through units.ts (inchesToMm, centimetresToMm)"
    - "Pure gesture/timing module under lib/models/ that components call from pointer events"
    - "Grapheme-safe text cutting with Intl.Segmenter, Array.from fallback"
key-files:
  created:
    - lib/geometry/rack-layout.ts
    - lib/geometry/rack-layout.test.ts
    - lib/models/rack-gesture.ts
    - lib/models/rack-gesture.test.ts
  modified:
    - components/design/use-viewer-media.ts
decisions:
  - "Once the rack wraps to the 288-dot height it always uses at least two rows, so a quiver that misses one row at 380 by a board is split in two rather than drawn as one shrunken row (UI-SPEC: 380 for one row, 288 for two or more)."
  - "Rows are truly balanced: the fuller rows come first and every row is within one board of every other (100 boards in six rows are 17,17,17,17,16,16, not five of 17 and a last row of 15). 15 and 30 boards come out exactly as the UI-SPEC says (8 + 7, 15 + 15)."
  - "swipePressOutcome reports held once the hold has completed even if the finger later moves, so a move after a completed hold is the carry, never a swipe."
  - "fitSpineWords leaves a one-letter (or empty) name whole, since there is nothing to cut."
metrics:
  duration: "~9 min"
  completed: 2026-10-05
  tasks: 3
  files: 5
actuals:
  tokens: 11800
  tasks: 3
  commits: 6
---

# Phase 15 Plan 02: Rack Layout Numbers and Gesture Timings Summary

This plan works out where every board stands on the home page's rack. Each board is drawn at one true scale on one floor line; the tallest board sets the scale, which never drops below a 7'0" reference. On a computer the boards stand in balanced rows; on a phone they stand on one long sideways track. The plan also covers how far each board turns, how its neighbours step aside, and how a long name shrinks and then gets cut without ever touching the board's numbers. Every timing the sketches settled now lives in one file, and the rack can tell when a shaper wants less motion.

## What a shaper will see (once the rack components use this)

- A lone 5'2" fish draws at 62/84 of the rack's height, so it looks short. A 9'4" log in the same rack sets the scale for every board.
- 15 boards stand in one row on a wide computer screen and in two rows of 8 + 7 at 820 and narrower. 30 boards make two rows of 15. Rows never differ by more than one board.
- Dashed height lines every foot from 4' (`4′ 5′ 6′ 7′`), or every 50 cm from 150 in Metric (bare `150 200`).
- A board turns from edge-on to its full outline as the cursor reaches it. Two boards with the cursor exactly between them are both half-turned. The neighbours slide aside by half the turning board's extra width so nothing overlaps.
- On a phone, each board reaches the middle of the screen at its own scroll position, and a tap finds the board under the finger.
- A long name shrinks its words in half-point steps down to size 10. After that only the name is cut, with "…", by whole letters, so an accented letter or a surfer emoji is never broken. The card line's numbers always stay whole.
- Timings: a mouse drags a board after 6 dots. A finger on a computer's rack only ever taps (D-05). A phone hold takes 420 ms, with the board swelling from 120 ms. Moving 8 dots first makes it a swipe. Within 46 dots of the edge the rack scrolls along, up to 12 dots a frame.
- With the device's reduce-motion setting on, every glide jumps straight to its end.

## Tasks

| # | Task | Commits |
|---|------|---------|
| 1 | Where every board stands: one scale, one floor, balanced rows, height lines (tracer) | fcddf19 (tests), e816081 (code) |
| 2 | Turn by distance, room-making, the phone's track, long-name fit | eac2313 (tests), c4fb7d4 (code) |
| 3 | Every rack timing in one place; `useReducedMotion` | b4fd544 (tests), cea41d3 (code) |

The tracer gate passed: Task 1's tests passed again end-to-end before Task 2 started.

## Verification

- `npx vitest run lib/geometry/rack-layout.test.ts lib/models/rack-gesture.test.ts`: 59 passed.
- Full `npm test`: 107 files, 4021 passed, 2 skipped (no change to the skips).
- `npx next typegen && npx tsc --noEmit`: exit 0. `npm run lint`: exit 0.
- The plan's acceptance greps all pass: 7+ exported functions, `inchesToMm(84)` once, the prime `′` present, no React, browser or database import in either pure module, the 4 named timing constants, `useReducedMotion` plus its query, and D-04 in the hook header.
- No `25.4` or `304.8` in any new file. Every length goes through `units.ts`.
- The SPEC prohibition (no board at its own scale) is checked by the test: a 30-board quiver laid out at 960, 756 and 568 has one `scale` each time, equal to `rackScale(rackHeight, longest)`, with one floor line per row.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Uneven last row with many boards**
- **Found during:** Task 1 (GREEN)
- **Issue:** The plan fills rows in order (`row = floor(k / perRow)`). For 100 boards at 960 that gives 17,17,17,17,17,15, which breaks the must-have "every row's count within 1 of every other's".
- **Fix:** The fuller rows come first and the rest hold one fewer (17,17,17,17,16,16). `hoverSlotPosition` and `hoverSlotAt` both use the same row-start rule. A pointer past the end of a short row now picks that row's last board instead of spilling into the next row. 15 boards (8 + 7) and 30 boards (15 + 15) are unchanged.
- **Files:** lib/geometry/rack-layout.ts
- **Commit:** e816081

**2. [Rule 1 - Bug] A single shrunken row at the 288 height**
- **Found during:** Task 1 (writing the width sweep)
- **Issue:** At some widths the boards just miss one row at 380 but fit one row at 288. The plan's `rows = ceil(count / cap)` would then draw one short row, against UI-SPEC "380 for one row, 288 for two or more".
- **Fix:** At the 288 height, `rows = max(2, ceil(count / cap))`. A sweep over every second width from 1024 down to 320 now checks that one row always means 380, that rows never decrease as the width narrows, and that every row fits inside the width.
- **Files:** lib/geometry/rack-layout.ts, lib/geometry/rack-layout.test.ts
- **Commit:** fcddf19, e816081

**3. [Rule 2 - Doc accuracy] Hook file header**
- The header of `components/design/use-viewer-media.ts` said "Two hooks". It now says "Three hooks", alongside the two header changes the plan asked for ("any hook below", plus the D-04 sentence).

No file outside the plan's `files_modified` was touched.

## Known Stubs

None.

## Threat Flags

None. T-15-03 is mitigated as planned: the shrink loop runs at most (base - floor) / step times, a step of zero or less falls back to 0.5, and the cut loop runs at most once per letter of the name.

## Notes for the plans that use this

- `HoverRackLayout.perRow` is the size of the fullest row. Use `hoverSlotPosition` for each board's row and column; do not work them out from `k / perRow`.
- `hoverPointerZone` counts the floor line itself as part of the drawing (`y <= floorY`).
- `fitSpineWords` returns only the size and the (maybe cut) name. The card line is never changed, so draw it as given.
- `tween` returns `to` at once when the duration is 0 or less, as well as under reduced motion.

## Self-Check: PASSED

- FOUND: lib/geometry/rack-layout.ts, lib/geometry/rack-layout.test.ts, lib/models/rack-gesture.ts, lib/models/rack-gesture.test.ts, components/design/use-viewer-media.ts
- FOUND commits: fcddf19, e816081, eac2313, c4fb7d4, b4fd544, cea41d3
