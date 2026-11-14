---
phase: 16-3d-board-and-cnc-export
fixed_at: 2026-11-06T18:44:54Z
review_path: .planning/phases/16-3d-board-and-cnc-export/16-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-11-06T18:44:54Z
**Source review:** .planning/phases/16-3d-board-and-cnc-export/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (WR-01 to WR-04, IN-01, IN-03, IN-04)
- Fixed: 7
- Skipped: 0
- Deferred by the orchestrator's scope: IN-02, IN-05, IN-06

Where the checks ran: everything ran in the agent's isolated git worktree
(`.claude/worktrees/agent-a9e37e30842b018e2`, with `node_modules` symlinked from the main checkout). The browser checks
used the webpack dev server (`IS_WEBPACK_TEST=1`) on port 3218. No report ran against any database. The figures from the
reports below come from the 102 test boards, in memory.

No shape, litre or preset figure moved. The 40, 74 and 102-board pins and `phase14-preset-figures.json` are untouched.
All 102 test boards read the same litres before and after these fixes, to the last digit.

## Fixed Issues

### WR-01: A quick second press leaves the board part-way through the first move

**Files modified:** `components/3d/three-d-screen.tsx`, `e2e/three-d-bay.spec.ts`
**Commit:** cd8e1c9a
**Status:** fixed: requires human verification (a logic fix: a person should try a quick second press)
**Applied fix:** Anything pressed during a move now lands that move first, then does its own job.
- `onView` calls `finishMotion()` first, so Deck, Bottom, Nose, Tail and Side read the landed lie, face and heading.
- `moveTo` calls `finishMotion()` in place of `stopMotion()`, which covers Reset View and the mode switch.
- The second finger, the slide (right-drag, middle-drag, Shift-drag) and the Room switch use `finishMotion()` too.
- Going further than the review: the zoom buttons and keys (`onZoomStep`, `backToOne`, Shift with an arrow) land the move
  first as well. Otherwise a move carrying a crop threw the press away when it landed.

A glide after a drag has no landing, so it still stops where it is. `stopMotion()` is now only `finishMotion`'s own first
step and the screen's goodbye, where nothing should land.

**What a shaper sees now:** press Bottom and then Nose quickly and the board ends bottom up with the nose toward you, not
rolled part-way onto its rail. Nose then Deck keeps the nose toward you.
**Proof:** new browser checks 8c, 8d and 8e. All three failed on the desktop before the fix and pass on all three devices
after it.
**Left as it is:** a mouse wheel or a trackpad pinch during a move is still overruled when the move lands. Neither strands
anything, and the review did not name them.

### WR-02: Pressing anything while the board settles back on the racks leaves it hovering

**Files modified:** `components/3d/three-d-screen.tsx`, `e2e/three-d-bay.spec.ts`
**Commit:** 135018a1
**Status:** fixed: requires human verification (a logic fix)
**Applied fix:** The Room's settle now has a landing, like every other move: `setFree(0)` and the turn it was going to. The
reduced-motion path uses the same landing. The landing reads `sceneRef.current`, so it always reaches the scene now drawing.
**What a shaper sees now:** press Room, then at once press a key, start a drag or move a slider. The board is on its racks
first, and it stays on the pads however it is then rolled or raised.
**Proof:** new browser check 15b, one case each for an arrow key, a slider and a press to drag. Before the fix all three
failed on the desktop, with the board standing 79.2 mm from its place on the racks. After it all three pass on all three
devices. Each case compares the place against the same lie settled with nothing pressed. That comparison waits for the
place itself, because a settle that only moves the place leaves `data-turn` still.

### WR-03: Open This Board during a lock change that then fails leaves the open board disagreeing with the server

**Files modified:** `components/setup/board-rack.tsx`, `e2e/board-lock.spec.ts`
**Commit:** d7fe5ed3
**Status:** fixed: requires human verification (a logic fix)
**Applied fix:** `openId`, a ref kept current by an effect, says which board is open now. A failed lock or unlock puts that
board back with `setOpenBoardLocked(!next)`. A lock that succeeds reads the same ref, so an answer arriving late can no longer
land on a different board opened in the meantime, which the old line could do.
**What a shaper sees now:** unlock on a bad connection, press Open This Board, and if the unlock fails the top bar goes back
to Unlock Board, because the server still holds the board locked. A failed lock goes back to Saved.
**Proof:** new browser checks o5 (unlock fails) and o6 (lock fails). They hold the save on the wire with `page.route`, so no
change to the stand-in was needed, then fail it as a lost connection. Both failed before the fix and pass after it on every
rack. o1, o2, o3 and o4 still pass.
**Not fixed, on purpose:** the failure words are still drawn on a rack that has gone. The top bar's button is what tells the
shaper.

### WR-04: The rail-character report's move is not the D-32 move, and its "these boards don't move" is no longer true

**Files modified:** `lib/models/rail-character-report.ts`, `lib/models/rail-character-report.test.ts`, `lib/models/surface-report.ts`, `lib/models/surface-report.test.ts`, `lib/geometry/design.ts`, `lib/geometry/volume.ts`, `scripts/check-saved-boards.ts`
**Commit:** 09d498f7
**Status:** fixed
**Applied fix:** Like with like. `railCharacterLitresMove` now compares `HARD_EDGE_FADE` against `RAIL_CHARACTER_FADE`, D-32
alone, both by name. The report closes with one printed line saying what its figures are and pointing to the surface report.
The comments in the two reports, the script's header, `design.ts` and `volume.ts` now say the same.

| Board | Report before | Report now (D-32 alone) | Surface report's whole move | Its "this plan" share |
| --- | --- | --- | --- | --- |
| Shortboard, tail Sharp Bottom Tuck | +0.0030 L | +0.0012 L | +0.0030 L | +0.0018 L |
| Shortboard, nose Sharp Bottom Tuck | +0.0016 L | 0.0000 L | +0.0016 L | +0.0016 L |
| Longboard, nose Single Tuck | +0.0490 L | +0.0570 L | +0.0490 L | −0.0080 L |

These match the review's table. The report's figures are 16-15-SUMMARY's table again (+0.2119, −0.1537, +0.0570 at the top),
so 16-13's "the 74-board table to compare against" holds.

**The two reports together now tell the truth about every board's move.** A new test holds them together on all 102 boards:
- a board the rail-character report lists: its before and after are the surface report's `before` and `faded`, to the last
  digit, so the whole move is that report's move plus the surface report's "this plan" share;
- a board it leaves out: `faded` equals `before`, so it has no share of the fade and "this plan" is its whole move.

A second new test proves the note about unlisted boards, on the boards as they stand and with their own Tail Rail Blends From
and Ends At. A third proves no "after" holds the live rule.

**What the founder sees now:** one more line at the end of the rail-character report:
`each line is the whole rail's fade alone: what the site reads today → with that fade and nothing else; --surface-report gives what every board will read at go-live 2`.
The header line, the board lines and the largest-move line keep their form. Only what these two read-only reports print
changes. On the 102 test boards: 92 listed, largest `tucked|longboard|tail-single` +0.2119 L, 69 under 0.01 L.

**16-16-SUMMARY.md is now out of date in one sentence**, "its 'after' is the live rule, so it includes this plan's moves too",
and it was not edited.

**How 16-13's read-back should change (not edited, as instructed):**

Task 1 step 5, the rail-character report. Replace "read it back in plain English: how many saved boards move, the largest
move and on which kind of board, and how many move less than 0.01 L." with:

> read it back in plain English as the whole rail's fade alone (D-32), what the site reads today against that fade and nothing
> else: how many saved boards the fade reaches, the largest of those moves and on which kind of board, and how many of them
> move less than 0.01 L. Say plainly that these are not the figures the boards will read at go-live 2, and that a board it
> leaves out has no share of this move; the surface report has each board's whole move.

Task 1 step 5, the surface report. Replace "read it back in plain English: how many saved boards move because of a wing or a
narrow tip, the largest move and on which kind of board, and how many move less than 0.01 L." with:

> read it back in plain English as each board's whole move at go-live 2, from what the site reads today to what it will read:
> how many saved boards move (the tail's roll reaches them all, so expect every one, and say why if not), how many of those
> have a wing, the largest whole move and on which kind of board, and how many move less than 0.01 L. In each line's bracket
> the first figure is the whole move and `this plan` is plan 16-16's share (the wings, the tips, the tail's roll, the sharp
> tuck and the exact rail thickness). The difference between the two is the rail-character report's move for that board, and
> nothing on a board that report leaves out; the printed figures can be 0.0001 apart from rounding.

The must-have at line 25. Replace "read back to him in plain English: how many boards move, the largest move, and how many
move less than 0.01 L." with "read back to him in plain English as the whole rail's fade alone: how many boards it reaches,
the largest of those moves, how many move less than 0.01 L, and that these are not go-live 2's figures." And replace "quoted
whole in the SUMMARY with the same read-back." with "quoted whole in the SUMMARY and read back as each board's whole move at
go-live 2, as Task 1 step 5 says."

### IN-01: A zero-thick tip reaches the "can't be drawn" message by accident

**Files modified:** `lib/geometry/board-surface.ts`, `lib/geometry/board-surface.test.ts`, `lib/geometry/volume.ts`, `lib/geometry/volume.test.ts`
**Commit:** d397433b
**Status:** fixed
**Applied fix:** The review's `edge[0]` starting value could have moved a real board's outline, because `edge[0]` can be nearer
the target height than any vertex strictly between. The starting value is `inside[0] ?? widest[i]` instead: the same answer as
before whenever `inside` has a vertex, and the tip's one point when it has none. `tailRollScale` returns 1 when `thickness <= 0`.
**What a shaper sees now:** nothing on any real board. A hand-made file with a nose or a pointed tail at zero thickness now draws.
**Proof:** new unit tests on a swallow and a pin, with the nose, the tail and both at 0, which threw before, and on
`tailRollScale`, which gave NaN.
**Found on the way, not fixed:** a third case. A diamond tail at zero thickness still throws `Cannot read properties of
undefined` in `resampleRun`, through `sampledFinishedRail`. A squash, a pin and a swallow at zero all build. It still reaches
the screen's quiet "can't be drawn" message and hurts nothing. The review named two cases, and how a zero-height diamond should
draw is a design question, so the tests leave it out.

### IN-03: The outline file jumps 10 mm straight up at each swallow point

**Files modified:** `lib/geometry/board-surface.ts`, `lib/geometry/board-surface.test.ts`, `lib/export/cnc-files.ts`, `lib/export/cnc-files.test.ts`
**Commit:** f02fc0e6
**Status:** fixed
**Applied fix:** The notch's run now stays at one height share up the wall, tips to crotch: the wall slot the right rail's point
stands on (a swallow's point already shares its heights with its wall, `tipEdge`). It starts and ends at the rail's own point.
- **Why not the review's first option alone.** Starting at the rail's point but keeping the deck corners moves the step one
  ring along: 10.9 mm of rise in 0.33 mm of travel on the Fish, which still climbs the edge.
- **Why two outline functions.** The wire view draws this loop too, and its pin in `board-surface.test.ts` says "Never
  re-record this to make it pass." The brief says only the outline file moves. So `boardOutlineLoop` stays exactly as it was, for
  the wire view, and the files read a new `boardFileOutlineLoop`. `SurfaceRing` gains `walls`, which only names vertices the
  mesh already has.

**Which file bytes moved, on the 102 test boards (compared file by file, by SHA-256, before and after):**
- `{stem}-outline.txt` and `{stem}.dxf` changed on the 25 swallows, and on no other board. In the DXF only the OUTLINE
  polyline changes. The dependants: `{stem}-3d.zip` changes on those boards because it holds those two files.
- `{stem}.stl`, `{stem}-profile.txt` and every `{stem}-slice-NN.txt` are byte for byte the same on all 102 boards. The slice
  count is unchanged.
- On a swallow the loop loses 2 points (436 → 434 on the Fish, 460 → 458 on a Shortboard re-cut as a swallow), the doubled
  points at the two swallow points. The notch's other 39 lines keep x and y to the last printed digit and change z only. Every
  other line of the file is unchanged.

**What a shaper sees now:** nothing on screen. On the Fish the steps of 10.16 and 7.62 mm are gone. Going into each swallow point
the loop now changes height by at most about one wall height (2.8 mm on the Fish, 3.3 mm on the Longboard swallow), and no point
stands straight above its neighbour.
**Proof:** new unit test on the 25 swallows of the 102: no point straight above its neighbour; each swallow point one point of
the loop; the notch leaving it within 1.25 wall heights; the rails identical to the wire view's; every notch point on its
ring's wall, strictly between the bottom and deck corners. It failed on all 25 before the fix. The wire pin
(`4e6b2907b4606d20604bb92d`) still passes.
**Found on the way, not fixed:** see "Noticed, left alone" below.

### IN-04: Wire View after a lost context draws at the lit picture's density

**Files modified:** `components/3d/board-scene.ts`, `e2e/three-d-wire.spec.ts`
**Commit:** c14af366
**Status:** fixed
**Applied fix:** `onRestored` calls `renderer.setPixelRatio(drawingDensity(wire))` before `build()`.
**What a shaper sees now:** Wire View switched on or off while a phone has taken the drawing away comes back at the right
density: one real pixel per line on any phone.
**Proof:** new browser check 0b presses the switch while the context is gone, both ways round. Before the fix it failed on the
iPhone (2 against 3) and the Pixel 7 (2 against 2.625); after it, it passes on all three devices.

## Deferred (outside this round's scope, by the orchestrator's instruction)

### IN-02: A crafted file's absurd figures pass the builder

**File:** `lib/geometry/board-surface.ts:260-278`
**Reason:** deferred. Optional in the review, and only the person who opened such a file is affected.

### IN-05: Fin-placement arithmetic lives in the scene, outside Rule 1's reach

**File:** `components/3d/board-scene.ts:474-512`, `:366-398`
**Reason:** deferred. The reviewer traced `finSolid` by hand and found it correct.

### IN-06: Dead code and a stale comment

**File:** `lib/geometry/shaping-bay.ts:695`, `lib/geometry/view-3d.ts:157`, `:163`, `components/3d/three-d-copy.ts:15`, `:68`, `scripts/check-saved-boards.ts:202`
**Reason:** deferred. No effect on a board or a file.

## Noticed, left alone

1. **The left rail's height jumps on a hard-edged tail, in the outline file, on every tail shape.** On 56 of the 102 test boards,
   every one with a hard edge, the left rail's point drops 12 to 20 mm in height from one ring to the next just behind Tail
   Rail Blends From (15.9 mm in 12.8 mm of travel on the Fish, 19.8 mm in 2.5 mm on the Longboard swallow). The right rail doesn't.
   A hard edge's rail has several points equally wide, and `extremeVertex` takes the first it meets, which differs by side.
   From above the file is exact, so a program that flattens the outline never sees it. It is the same kind of thing as IN-03, but
   it moves the outline on every hard-edged board, so it is outside this round. **The founder is about to import this file into
   Shape3D, so this is worth a look if the import complains.**
2. **A square wing's outline file repeats a line.** The two rings a hair either side of a square step round to the same three
   decimals, so `{stem}-outline.txt` carries one line twice on those boards. It was so before this round, and it is unchanged.

## Deviations from the review's designs

1. **WR-01:** the zoom buttons and keys land a move too (reason above).
2. **WR-02:** the landing reads `sceneRef.current`, not the effect's own `scene`.
3. **WR-03:** the test holds the save with `page.route` rather than adding a slow-failing stand-in.
4. **WR-04:** took the review's first option, plus a printed closing line and a test tying the two reports together.
5. **IN-01:** `inside[0] ?? widest[i]`, not `edge[0]` (reason above).
6. **IN-03:** a second function rather than one loop, because of the wire pin (reason above).

## Final verification (in the worktree)

All on the final tree, in the worktree, not the main checkout, so these figures are not yet reproduced on `board-3d`:

- `npx tsc --noEmit`: clean, after `npx next typegen`.
- `npm run lint`: 0 errors, and the one warning in `lib/db/import-designs-action.test.ts` that was there before this round.
- `npx vitest run`: 180 files, 9,664 passed, 2 skipped (9,528 passed before this round; 136 new tests).
- `PW_PORT=3218 IS_WEBPACK_TEST=1 npx playwright test`, all three devices:
  - `e2e/three-d-bay.spec.ts`: 76 passed, 8 skipped.
  - `e2e/board-lock.spec.ts`, `e2e/board-lock-screens.spec.ts` and `e2e/three-d-wire.spec.ts`: 88 passed, 38 skipped.
  - `e2e/three-d-screen.spec.ts`, `e2e/three-d-show.spec.ts` and `e2e/three-d-view.spec.ts`: 76 passed, 23 skipped.
  - `e2e/three-d-export.spec.ts` with `e2e/three-d-wire.spec.ts`: 32 passed, 10 skipped.
  - `e2e/three-d-zoom.spec.ts`: 17 passed with `e2e/three-d-view.spec.ts` on the desktop, and 45 passed, 23 skipped with the bay
    on both phones.
- `e2e/desktop-baseline.spec.ts`, `e2e/three-d-export.spec.ts` and `e2e/three-d-hard-edge.spec.ts` on the desktop: 14 passed.
  No desktop picture was re-recorded, and these ran under webpack, not Turbopack.
- The CNC files of all 102 test boards, compared by SHA-256 before and after: see IN-03.

Not run: the full browser suite, `npm run build`, `npm run test:e2e:prod` and any report against a database. Those belong to the
go-live gate.

---

_Fixed: 2026-11-06T18:44:54Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## Found during this round, fixed after it (D-46)

The fixer reported, and left alone, a height jump on the outline's left side on all 56 hard-edged test boards. The founder chose to fix it before go-live 2: `extremeVertex` now takes the highest of equally wide points, so both sides run along the top of a hard edge's wall. On all 102 boards the two sides are exact mirrors. The right side, the wire view's other lines, the litres, the STL, the slices and the profile did not move. The outline file and the DXF's outline changed on those 56 boards, and six of them lost one repeated point at the tail tip, which moves nothing.
