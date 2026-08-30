---
phase: 260829-uue
plan: 01
subsystem: rocker-viewer
tags: [rocker, geometry, callout-primitives, viewer-frame, order-form]
dependency-graph:
  requires: [260829-tmj, 260829-t47, 260825-w8d]
  provides: [rocker-two-rail-layout, rocker-card-or-plain-grammar, order-form-full-width-rocker-box]
  affects: [components/rocker/rocker-viewer.tsx, components/summary/order-form.tsx]
tech-stack:
  added: []
  patterns:
    - "rocker-view-frame.ts now decides BOTH card rails (deck above the board, bottom below it) and the length label's anchor for both orientations, following the same pure-module/no-React-import separation 260829-tmj established — the viewer still derives no frame arithmetic of its own."
    - "Card-or-plain grammar borrowed from the TEMPLATE screen's callout-primitives.tsx: a filled CalloutChipFrame card for a value the shaper sets with a slider, a plain reading (leader + 45-degree DimensionTick, no card) for a value measured off the drawn curve — the two kinds share one rail anchor and one card-sized band, so a card's own containment proof carries the plain reading with it."
    - "showStationCards (renamed internally from hideCallouts's inverse) decides whether the frame reserves a band on either side AT ALL — a compact consumer (the order form) is not paying for a rail it never draws, so its frame collapses to the board plus a hairline of pad instead of an empty band."
key-files:
  modified:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
    - components/rocker/rocker-viewer.tsx
    - components/summary/order-form.tsx
decisions:
  - "One band per side, sized for a card, even though only two of the five bottom-rail figures are on cards — a card is the deepest thing either rail carries, so a shallower band saves nothing, and one shared anchor is what keeps a card and a plain reading line up on the same rail (this was the coordinator's own open choice, resolved as specified in the plan)."
  - "Both kinds keep the rocker viewer's own Upright/rotate(90) convention rather than adopting CalloutChip/OutputRail wholesale — those two components counter-rotate on the OUTLINE viewer's opposite convention and assume a single shared value gutter this viewer doesn't have. Only the treatment (surface, tick, stacking) was copied, not the components themselves."
  - "Dropped the old 'R'/'T' letter prefixes on the station values now that each figure has its own labelled card or reading on its own rail — the station name plus which side it's on already says which dimension it is, matching the TEMPLATE screen's own unprefixed chips."
actuals:
  tokens: 19137
  tasks: 3
  commits: 3
status: complete
---

# Phase 260829-uue Plan 01: Rocker cards split to their own side of the board, order form rocker box widened Summary

Each station on the ROCKER screen now reads its rocker figure below the board and its thickness
figure above it, in the same filled-card-vs-plain-number grammar the TEMPLATE screen already uses;
the Summary order form's rocker box lost its two flanking tick columns and now draws the side
profile alone, spanning the whole box at whatever length the board actually is.

## What changed, in plain English

**Rocker numbers moved below the board, thickness numbers moved above it.** Before this change,
every station showed one card stacked with both its rocker figure and its thickness figure, sitting
in a single rail below the drawing. Now the rocker number sits on the same side as the bottom curve
it measures, and the thickness number sits on the same side as the deck curve it measures — a
shaper reading the drawing no longer has to map a number back to which curve it came from.

**Only the numbers you set with a slider get a card now.** On the rocker side, only the nose-tip
and tail-tip lifts have their own sliders, so only those two sit inside a bordered card. The other
three rocker figures — Tail @ 12", Center, Nose @ 12" — are measured off the drawn curve, so they
now read as plain numbers with a small 45-degree tick marking the exact point on the curve, exactly
the way a derived value reads on the TEMPLATE screen. Every thickness figure has its own slider, so
all five sit in cards on the deck side. The center rocker reading keeps its em-dash, still in the
muted label color, standing in for a value that's zero by definition rather than measured.

**Every read-out is leadered to the exact point it measures**, on both sides — the old fixed tick
that just ran from the baseline to the rail is gone. Rotating the board nose-up still works the
same way: rocker readings on the left, thickness cards on the right, and the board-length label
moved to a spot that no longer collides with the new thickness rail.

**The order form's ROCKER box lost its two flanking tick columns.** Those used to hold the printed
nose-lift and tail-lift numbers beside the drawing. They're gone now — the drawn curve is the only
thing in the box — and the drawing itself is scaled to the loaded board's own length (instead of a
fixed ten-foot scale) with no card band reserved, since this box never draws one. Printed profiles
come out noticeably larger at every board length. Nothing else about the printed sheet moved: same
two pages, same box position and size, same print path.

## What was built

### Task 1 — `components/rocker/rocker-view-frame.ts` / `rocker-view-frame.test.ts`

Extended the pure layout module to decide two card rails instead of one:

- `RockerViewLayoutInput` gains a required `showStationCards: boolean` — no default, so every call
  site has to say whether it draws a rail at all. When `false`, neither band is reserved and the
  frame collapses to the board plus a small `BARE_PAD` hairline.
- New exported `cardBandDepth(orientation)` replaces the old `RAIL_LABEL_HEIGHT` constant — a band
  is always as deep as a card actually presents across it (its height nose-left, its width
  nose-up), which is now used identically on both the deck and the bottom side.
- `RockerViewLayout` gains `deckRailY` / `deckTickEndY` (the new deck rail's anchor and tick-stop,
  mirroring `railY` / `tickEndY` on the bottom) and `labelX` / `labelY` (the board-length label's
  own anchor, computed here instead of hard-coded in the viewer).
- `STATION_CARD_HEIGHT` dropped from 50 to 35 (a card now holds one value row instead of two), and
  new exported type-scale constants (`STATION_NAME_SIZE`, `STATION_VALUE_SIZE`, `CARD_NAME_DY`,
  `CARD_VALUE_DY`, `READOUT_VALUE_DY`, `READOUT_NAME_DY`) move the rail's row offsets into this
  module too, so the viewer derives no typography arithmetic of its own.
- `stationCardRect` takes a fourth required `side: "deck" | "bottom"` argument to select which
  rail's anchor a card is drawn against.
- The test suite was rewritten: the old "legacy pin" (fixed-scale, single-rail) test became an
  "order-form path pin" locking the new card-less, fit-to-board path's exact numbers, and new
  suites cover both-rail containment, both-rail clearance against the worst-case board box,
  rail-vs-rail non-overlap at the same station, and that a plain reading's two text rows fit inside
  the same box a card would occupy at the same rail anchor.

### Task 2 — `components/rocker/rocker-viewer.tsx`

Drew the two-rail, card-or-plain grammar:

- Each station now samples `rockerHeightIn` (the bottom curve's own height) and `deckHeightIn`
  (bottom + foil thickness) at the same `stationIn` the drawing loop already uses, plus a
  `rockerKind: "input" | "derived"` field naming which of the five rocker figures has its own
  slider (the two tips) versus which is measured off the curve (the other three).
- Two new local components mirror the TEMPLATE screen's own two kinds: `StationCard` (a bordered
  `CalloutChipFrame` box, name over value, no tick on its leader) and `StationReadout` (no card
  surface, a `DimensionTick` at the measured point, value over name — the reversed stacking a
  derived value uses).
- Every station draws a `StationCard` on the deck rail (all five are inputs) and, on the bottom
  rail, a `StationCard` at the two tips or a `StationReadout` everywhere else — the center's
  em-dash renders through `StationReadout`'s own `valueColor` override.
- The board-length label now reads its anchor from `layout.labelX` / `layout.labelY` instead of a
  hard-coded `PAD_X` / `PAD_TOP - 8`, so it tracks the frame's own new home for it nose-up.
- Dropped the unused `PAD_TOP` import; `PAD_X` stays (still what `pxX` and the drag inverse read).

### Task 3 — `components/summary/order-form.tsx`

Gave the order form's ROCKER box the whole body:

- Deleted the `RockerLiftTick` helper and both of its call sites (the nose-lift and tail-lift
  columns flanking the drawing). The box's inner row now holds one child — the drawing's own
  `relative min-h-0 min-w-0 flex-1` container.
- `RockerViewer` now gets `fitToBoard` (new here) alongside the existing `hideCallouts` — together
  with Task 1's card-less frame path, the drawing scales to the loaded board's own length and
  reserves no card band, instead of the old fixed ten-foot-scale frame with an unused band eating
  height.
- Confirmed rather than assumed that `hideCallouts` fully suppresses the new two-rail grammar (both
  kinds of read-out, their leaders, and their ticks) — nothing needed a second guard.
- Removed the now-unused `Mm` type import (only consumer was `RockerLiftTick`).
- Updated three doc comments to describe the current arrangement: the module header's ROCKER
  bullet, the `fitToBoard` prop doc in `rocker-viewer.tsx` (no longer "editor-only" — a
  per-consumer scale choice), and `rocker-view-frame.ts`'s own note on which path the order form
  takes.

## Verification run

- `npm test` — 1225 tests passed (24 suites), including the extended
  `components/rocker/rocker-view-frame.test.ts` (29 tests: order-form path pin, fit, maximisation,
  proportion, card pitch, both-rail end-card containment, degenerate input, both-rail vertical
  containment and clearance, horizontal clearance, rail-vs-rail non-overlap, neighbour non-overlap
  on both rails, stacks-fit-inside-a-card's-box, board-box + label run-room, and
  horizontal-frame-unchanged).
- `npm run lint` — 0 errors, 9 warnings (all pre-existing, in files this plan never touched).
- `npx tsc --noEmit` — 0 errors outside the two known phantom `LayoutProps` errors
  (`app/layout.tsx` / `app/design/layout.tsx`, caused by a gitignored `next-env.d.ts` absent from a
  fresh worktree).
- Plan's exact grep checks: `deckRailY` appears >= 2 times outside comments in both
  `rocker-view-frame.ts` (6) and `rocker-viewer.tsx` (2); `OrderFormTick label=` appears exactly 4
  times in `order-form.tsx` (the four untouched boxes — Leash x2, Finish x2); `fitToBoard` appears
  in `order-form.tsx`'s code lines.
- `npm run build` / `npm run dev` deliberately not run (Turbopack cannot resolve `next` inside a
  git worktree) — the orchestrator builds after merge.

## Deviations from Plan

None beyond one test-direction correction caught and fixed during Task 1's own verification loop
(not a deviation from the plan's intent — a self-authored test assertion had its inequality
direction backwards on first write, caught by the test itself failing and corrected before commit):

**1. [Rule 1 - Bug, self-contained in test authoring] Rail-vs-rail non-overlap assertion had its
inequality direction backwards for the vertical orientation**
- **Found during:** Task 1, running the newly-written test suite before commit
- **Issue:** The "deck card vs bottom card never overlap on the cross axis" test asserted
  `deckCard.x + deckCard.width <= bottomCard.x` for vertical, but the deck rail sits nearer
  canonical zero (less negative final x) than the bottom rail, so the correct direction is the
  reverse.
- **Fix:** Swapped the assertion to `bottomCard.x + bottomCard.width <= deckCard.x`.
- **Files modified:** `components/rocker/rocker-view-frame.test.ts` (pre-commit, not a separate
  commit)
- **Verification:** Full suite passed (29/29) after the fix.

---

**Total deviations:** 0 shipped deviations from the plan's own design. One test-authoring error
caught and fixed before the Task 1 commit landed.
**Impact on plan:** None — plan executed as specified.

## Issues Encountered

None.

## Post-merge browser verification (for the founder)

The executor cannot run `npm run dev` inside a git worktree (Turbopack symlink limitation), so
these steps from the plan's own `<human-check>` blocks are carried forward for a post-merge pass.

**From Task 2 — the two-rail grammar:**
1. Open `/design/rocker`. Each station's rocker figure reads below the board, its thickness figure
   above it. Below the board, only the nose-tip and tail-tip figures sit on cards; Nose @ 12",
   Center and Tail @ 12" are plain numbers with a 45-degree tick on the curve. Above the board, all
   five thickness figures sit on cards.
2. Put this screen beside `/design/outline` — a card and a plain reading should look the same on
   both screens.
3. Move a rocker slider — the carded figure it drives moves; the plain readings follow the curve.
4. Check both rails at 5'0", 6'6" and 10'0", and with rocker/thickness dialled to their maximums —
   nothing should touch the board.
5. Press the rotate button — rocker read-outs left of the upright board, thickness cards right,
   everything fully on screen, the board-length label readable above the nose.
6. Turn on construction lines and drag each of the four control points in both views — the curve
   follows the pointer and the sliders follow the curve.

**From Task 3 — the order form's rocker box:**
1. Open `/design/summary`. The ROCKER box shows the side profile alone, spanning the box, with no
   tick squares beside it — noticeably larger than before at 5'0", 6'6" and 10'0" alike, never
   clipped or overflowing its box.
2. The rest of page 1 is unchanged: same header, dims row, rail plots, template window, glassing
   band.
3. Print preview both pages in light and dark theme — still two pages, sheet layout unchanged,
   nothing scrolling or cut off.

## Self-Check: PASSED

Verified all four modified files exist (`components/rocker/rocker-view-frame.ts`,
`components/rocker/rocker-view-frame.test.ts`, `components/rocker/rocker-viewer.tsx`,
`components/summary/order-form.tsx`) and all three task commits (8bb94da, 7007c72, 3926fc8) exist
in git log.
