---
phase: 260829-tmj
plan: 01
subsystem: rocker-viewer
tags: [rocker, geometry, callout-primitives, viewer-frame]
dependency-graph:
  requires: [260829-t47, 260825-vot, 260825-w8d, 260823-h6l]
  provides: [rocker-view-frame-module, rocker-fit-to-board]
  affects: [components/rocker/rocker-viewer.tsx, components/rocker/rocker-editor.tsx, components/summary/order-form.tsx]
tech-stack:
  added: []
  patterns:
    - "rocker-view-frame.ts: a pure layout module (no React import) that is the ONE place a viewer's scale/frame/viewBox is decided, mirroring outlineViewMetrics's own separation in outline-viewer.tsx — the component reads the layout object and derives no arithmetic of its own."
    - "fitToBoard defaults to false and is opted into only by the editor call site, so a consumer that never passes it (the Summary order form) keeps its existing fixed frame by construction, the same posture orientation/hideCallouts already use in this codebase."
key-files:
  created:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
  modified:
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-editor.tsx
decisions:
  - "The vertical (nose-up) frame's long-axis start (minY) is mirrored off the SAME PAD_X/cardHeight/pad terms as the tail end's own far-edge formula the plan specified, rather than a separate 'label font size' formula — the nose station card, not the label, is the tighter binding constraint on that end, so deriving both ends symmetrically from the card geometry is what actually contains every card (Rule 1 fix, confirmed by the containment test)."
  - "STATION_CARD_WIDTH stays derived from the FIXED (range-derived) scale, not the live fit-to-board scale, matching planner finding 6: under fit-to-board the narrowest 12in column pitch is always widest at the shortest board and narrowest at the longest, and the longest board's fit scale equals the fixed scale exactly."
actuals:
  tokens: 10600
  tasks: 2
  commits: 2
status: complete
---

# Phase 260829-tmj Plan 01: Rocker viewer maximize board drawing Summary

Every board length on the ROCKER screen now draws as large as the drawing panel allows, in both
the nose-left and the nose-up view — a 5'0" board fills the same share of the panel a 10'0" board
does, instead of every board sharing one scale sized for the longest board the app supports.

## What changed, in plain English

**A short board no longer looks small.** Before this change, the rocker drawing was always scaled
for a ten-foot board, so a 6'6" shortboard only used about 59% of the drawing's width and the rest
sat blank. Now every board — 5'0" up to 10'0" — fills about 91% of the panel's width nose-left, and
about 95% of its height nose-up. Only the board's own shape and the spacing of the five station
cards change with length; the drawing itself always looks "full."

**Turning the board nose-up no longer clips anything.** Rotating used to just spin the same
nose-left frame 90 degrees instead of building a frame that actually fits what's drawn upright.
That let the station cards creep into the board's own outline, cut the tail card off the bottom
edge on a long board, and ran the board-length label off the side of the drawing. All three are
fixed: the cards sit clear of the board on their own rail, every card (including the tail one)
stays fully on screen at every length, and the board-length label is fully readable.

**Dragging the curve still works exactly as before, at every length and in both views** — the
drag math was rewired to read the same scale the drawing is drawn with, so the curve always
follows the pointer to the exact spot you grab.

**The printed order form is completely untouched.** The Summary screen's rocker box is a separate
consumer that never asked for the new "fill the panel" behavior, so it keeps drawing at its old
fixed size, in its old position, with the same box shape it has always printed — pinned by a unit
test, not just left alone by convention.

## What was built

### Task 1 — `components/rocker/rocker-view-frame.ts` (new) / `rocker-viewer.tsx` / `rocker-editor.tsx`

Created the one module that decides the rocker drawing's scale and frame, mirroring the pattern
`outlineViewMetrics` already uses on the Template screen:

- `rockerViewLayout({ lengthIn, maxDeckIn, orientation, fitToBoard })` returns a `RockerViewLayout`
  object: `scale`, `viewH`, `baselineY`, `tickEndY`, `railY`, `cardDy`, `cardWidth`, `cardHeight`,
  the frame rect (`minX`/`minY`/`width`/`height`) and a ready-to-use `viewBox` string.
- `fitToBoard: true` gives every board's own length the full `820`-unit drawing area (`(VIEW_W -
  2*PAD_X) / lengthIn`); `false` keeps the old range-derived scale (`820 / 120`) every length used
  to share — this is what `order-form.tsx` still gets, since it never passes the new prop.
- A corrupt saved board (zero, negative or `NaN` length) falls back to the range-derived scale
  instead of producing a broken `NaN` viewBox (threat T-TMJ-02).
- Moved the frame constants (`VIEW_W`, `PAD_X`, `PAD_TOP`, `RAIL_GAP`, `STATION_CARD_HEIGHT`,
  `STATION_CARD_WIDTH`, `RAIL_LABEL_HEIGHT`) out of `rocker-viewer.tsx` into this module.
- Exported `stationCardRect(layout, stationX, orientation)`, the card's rect in the frame's own
  coordinate space, applying the rotated-content ("Upright") identity in vertical.
- `rocker-viewer.tsx` now calls `rockerViewLayout` once per render and draws entirely from it —
  `pxX`, `pxY`, the frame's `viewBox`, the card positions and, critically, the drag inverse
  (`toBoardPoint`) all read the same `layout.scale`, so a drag can never solve against a different
  scale than the drawing was made with.
- `rocker-editor.tsx`'s `RockerViewer` call passes the new `fitToBoard` prop; no other call site
  does.
- In this task, the vertical (rotated) frame was still a straight transposition of the horizontal
  one — the rotate button kept working exactly as before, just at the new bigger scale.

### Task 2 — `rocker-view-frame.ts` / `rocker-viewer.tsx`

Replaced the placeholder vertical frame with one built from its own rotated content, instead of a
transposition of the horizontal frame (the same fix quick task 260825-w8d made for the Template
viewer):

- The card rail now clears the baseline by the card's own half-*width* (not half-height), since a
  rotated card presents its width across the rail — this closes the 17-unit overlap where cards
  used to cross into the board's own outline.
- Each card is centred on the station it names (`cardDy = -cardHeight / 2`), which also halves how
  far the tail card overhangs past its own station — the main reason it used to run off the frame.
- The frame's long axis is now built directly from the nose card's near edge to the tail card's
  far edge (not the fixed board-length constant `VIEW_W` any more), so the tail card is always
  fully inside regardless of board length.
- The board-length label gets `textAnchor="end"` only in the vertical view, so it reads back INTO
  the frame from its own anchor point instead of running off the edge — the horizontal label is
  untouched.
- `rocker-viewer.tsx`'s card rendering wraps each card's contents in a `translate(0, cardDy)` group
  inside its existing counter-rotation, so the centring lands on the correct (rotated) axis.

**One deviation from the plan's own wording (Rule 1, auto-fixed):** the plan described the
vertical frame's near (nose) end as derived from "the length label's own rotated baseline less its
type size and a small pad." Working the numbers, that formula (~24 units of margin) does not
actually contain the nose station card, which needs ~15 units of margin due to its own centred
height — the card, not the label, is the tighter constraint at that end. Fixed by mirroring the
SAME formula the plan gave for the tail end (`PAD_X + boardSpan + cardHeight/2 + 4`) onto the nose
end (`PAD_X - cardHeight/2 - 4`), which contains both the nose card and the label with margin to
spare, confirmed by this task's own containment test.

## Verification run

- `npm test` — 1217 tests passed (24 suites), including the new
  `components/rocker/rocker-view-frame.test.ts` (21 tests: legacy pin, fit, maximisation,
  proportion, card pitch, end-card containment, degenerate input, vertical containment, clearance,
  board-box + label run-room, non-overlap, and horizontal-frame-unchanged).
- `npm run lint` — 0 errors, 9 warnings (all pre-existing, in files this plan never touched).
- `npx tsc --noEmit` — 0 errors outside the two known phantom `LayoutProps` errors
  (`app/layout.tsx` / `app/design/layout.tsx`, caused by a gitignored `next-env.d.ts` absent from a
  fresh worktree).
- Plan's exact grep checks: `fitToBoard` appears exactly once in `rocker-editor.tsx`; zero
  occurrences in `order-form.tsx`'s code lines.
- `npm run build` / `npm run dev` deliberately not run (Turbopack cannot resolve `next` inside a
  git worktree) — the orchestrator builds after merge.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vertical frame's nose-end margin under-contained the nose station card**
- **Found during:** Task 2 (building the vertical frame's long axis)
- **Issue:** The plan's own formula for the frame's near (nose) end — derived from the
  board-length label's font size and a small pad — produced a margin (~24 units) smaller than the
  nose card's own centred overhang (~25 units), which would have let the nose card poke slightly
  outside the computed frame.
- **Fix:** Mirrored the plan's own tail-end formula onto the nose end
  (`PAD_X - cardHeight / 2 - 4`), using the same constants and pad convention, which comfortably
  contains both the nose card and the label.
- **Files modified:** `components/rocker/rocker-view-frame.ts`
- **Verification:** The containment test (`rockerViewLayout — vertical: containment`) checks all
  five station cards against the computed frame at 60in, 78in and 120in, and passes.
- **Committed in:** b002f0e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for correctness — without the fix, the nose station card would sit
partly outside the drawing's own frame at every board length. No scope creep.

## Issues Encountered

None beyond the deviation above.

## Post-merge browser verification (for the founder)

The executor cannot run `npm run dev` inside a git worktree (Turbopack symlink limitation), so
these steps from the plan's own `<human-check>` blocks are carried forward for a post-merge pass.

**From Task 1 — nose-left maximisation:**
1. Open `/design/rocker`. Load a 6'6" board — it now runs nearly the full width of the drawing
   panel; the large blank area to the right of the tail is gone.
2. Change the length to 5'0" and to 10'0" — the board fills the width the same way at both; only
   its shape and the spacing of the station cards change.
3. The five station cards still sit evenly under the board and none overlaps a neighbour at any
   length.
4. Turn on construction lines and drag each of the four control points — the curve follows the
   pointer exactly where you grab it, and the sidebar sliders move with it.
5. Open `/design/summary` and check the order form's rocker box: same board size, same position,
   same box shape as before.

**From Task 2 — nose-up fit:**
1. On `/design/rocker`, press the rotate button. The board runs nose-up down nearly the full
   height of the panel, at 5'0", at 6'6" and at 10'0" alike.
2. The five station cards sit in a column clear of the board, each centred on the station its tick
   points at, and the tail-tip card is fully visible (it used to be cut off on a long board).
3. The board-length label (e.g. 6'6") is fully readable — it used to run off the edge.
4. Turn on construction lines and drag each of the four control points nose-up: the curve follows
   the pointer, and the sliders follow the curve.
5. Rotate back — the nose-left view is exactly as Task 1 left it.
6. `/design/summary` order form's rocker box: still unchanged.

## Self-Check: PASSED

Verified both new files exist (`components/rocker/rocker-view-frame.ts`,
`components/rocker/rocker-view-frame.test.ts`) and both task commits (6d846ea, b002f0e) exist in
git log.
