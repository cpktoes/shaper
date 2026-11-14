---
phase: 17-bottom-contours
plan: 10
subsystem: BOTTOM's viewer and DATA — the cutting line's drag and tap, Section at, Height, the ruler, the finished rail, the layout-marks table and notes, the locked board
status: checkpoint
tags: [bottom, viewer, data, lock, D-12, D-13, D-14, D-16, D-30, D-33, D-40, D-41, C4]
requires:
  - "17-07: stationAtPointer, sectionRuler, ghostRail, ghostRailPath, bottomSection (fitted factor, break line), formatBottomStation, bottomStationSlider"
  - "17-05/17-06: bottomLayoutMarks, bottomDataRows (atFloor), bottomFloorFlags"
  - "17-04: the store's memoised bottomSections"
  - "17-08/17-09: BottomEditor, BottomControls, BottomData, floorWarning, the lock-guarded store actions"
provides:
  - "section-station.ts: the section's station as a small store of BottomEditor's own (createSectionStationStore, useSectionStation, useSetSectionStation)"
  - "bottom-top-view.tsx: press, drag or tap anywhere moves the section (setPointerCapture, stationAtPointer, TAP_MAX_TRAVEL_PX); the cutting line on a layer of its own with a 44-dot ew-resize grab zone"
  - "bottom-section.tsx: Height (×1 ×2 ×4 ×8), the fitted factor, the ruler (sectionRuler, the section's own box), the finished-rail ghost (ghostRail over the store's bottomSections, clipped to the slab)"
  - "bottom-editor.tsx: Section at; the one floor scan, shared by the panel and DATA"
  - "bottom-controls.tsx: Show the finished rail from RAILS in INPUTS (view-only); memoised so a drag never redraws the panel"
  - "bottom-data.tsx: Layout marks · off the stringer, the three notes, the Stringer left cells at the floor in warning ink, the floor note"
  - "bottom-copy.ts: the Height, Section at and finished-rail words; layoutMarkColumnName, layoutMarksNote, referenceRowsNote, dataFloorNote"
  - "DOM hooks: data-bottom-cut-at, data-bottom-cut-layer, data-bottom-top-view-press, data-bottom-grab(-zone), data-bottom-height, data-bottom-height-label, data-height, data-bottom-ruler (bare|captioned), data-bottom-ruler-tick, data-bottom-ruler-caption, data-bottom-ghost, data-bottom-break, data-bottom-section-at, data-bottom-marks, data-bottom-mark-column, data-bottom-mark-row, data-bottom-notes, data-bottom-floor-cell, data-bottom-floor-note"
affects: [17-11, 17-12, 17-14]
tech-stack:
  added: []
  patterns:
    - "A view value that changes on every pointer move lives in a tiny external store read with useSyncExternalStore by the three things that show it, so a drag never re-renders the screen shell or the panel"
    - "A moving overlay (the cutting line) on its own SVG layer over a heavy drawing (the shade), same box and viewBox, pointer-events only on its grab zone"
key-files:
  created:
    - components/bottom/section-station.ts
    - e2e/bottom-viewer.spec.ts
    - .planning/phases/17-bottom-contours/pictures/17-10-the-viewer-and-data.png
    - .planning/phases/17-bottom-contours/pictures/17-10-pictures-source.tar.gz
  modified:
    - components/bottom/bottom-editor.tsx
    - components/bottom/bottom-top-view.tsx
    - components/bottom/bottom-section.tsx
    - components/bottom/bottom-controls.tsx
    - components/bottom/bottom-data.tsx
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-copy.test.ts
    - components/design/board-lock-scope.test.ts
    - e2e/board-lock-screens.spec.ts
decisions:
  - "DATA's floor note is the panel's own sentence (floorWarning) named for its cut — `Deep Single Concave: This cut meets …` — not the UI-SPEC's third wording (orchestrator ruling 2); the channels' sentence already names them"
  - "Only the stringer form colours a cell: each Stringer left cell where a concave holds the stringer at 1/4" (bottomDataRows' atFloor); a lift that thins the rail is said in the note alone"
  - "The Height fitted-factor test runs on the Shortboard's Deep Single at 1/2\", not the Longboard's belly (the plan's figure does not hold — see Measured)"
  - "Section at stops 72 dots short of the card's right edge on a computer, so the floating Undo/Redo pair never covers the track's tail end"
metrics:
  duration: "about 3 h 50 min (07:58 to 11:48 local) on a machine at load average 28 to 48 — three full unit suites of 6.5 to 16 min, the browser batches below"
  completed: 2026-11-09
actuals:
  tokens: 26000
  tasks: 2
  commits: 3
---

# Phase 17 Plan 10: The viewer follows the shaper, and DATA lays the bottom out — Summary

Drag or tap the bottom seen from below and the cross-section follows. Section at does the same from the keyboard. Height
goes from ×1 to ×8, and the drawing says the factor it used when a deep cut has to be fitted. The ruler of the live cut's
marks shows on a computer. The finished rail from RAILS shows when ticked. DATA now has its second table and its notes,
and a locked board can be looked over but not changed.

## What changes for the founder

- **The cutting line.** Press anywhere on the board from below and the section jumps there. Drag and it follows your
  finger or mouse. A wobble under 8 dots counts as a tap, so a tap lands where you touched. The line's grab dot has a
  44-dot zone that shows the left-right cursor.
- **Section at**, under the section, is the same station from the keyboard, 1/2" a press (10 mm in Metric). It speaks
  `36" from the tail`. The line, the caption and the slider always name one station.
- **Height** `×1 ×2 ×4 ×8` sits beside the section's caption. It opens on ×4. At ×1 the drawing reads `TRUE HEIGHT`, and when
  a cut would leave the box it reads the factor drawn, e.g. `HEIGHT ×5.3`. It is kept while you stay on BOTTOM and is never
  saved.
- **The ruler** of the live cut's layout marks, under the straightedge: from a 1024 window, values only; from about 1100,
  with `OFF THE STRINGER` and the gauge words; at 820 none (DATA carries the marks). It reads the section's own box, never
  the window.
- **Show the finished rail from RAILS** in INPUTS: off when the page opens. Ticked, the rail RAILS bands is drawn faintly on
  the section, sitting on what the bottom left, clipped to the foam.
- **DATA**: after the depths, `Layout marks · off the stringer` (Metric `… (mm)`). It has one column per mark in shop
  order: `Center edge`, `Tail flat` …, then `Flat edge`, `Wall 1` … `Wall 4`. A wall reads `—` until its own channel
  starts. Under the tables come the three notes. Where a concave holds the stringer at 1/4", that `Stringer left` cell is in
  warning ink, and the note under the tables is the panel's own floor sentence for that cut. A flat board shows one table,
  `Foam off 0.00 L` and two notes.
- **A locked board**: every Cut menu, slider and tick box that changes the board is greyed and does nothing. The tabs,
  Height, Section at, the drag and the finished-rail tick keep working.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The section follows the shaper: drag and tap, Section at, Height, the ruler, the finished rail | a893c289 | bottom-editor, bottom-top-view, bottom-section, bottom-controls, bottom-copy (+test), section-station.ts (new), board-lock-scope.test.ts, e2e/bottom-viewer.spec.ts |
| 2 | DATA station by station, and the locked board | 97ca4381 | bottom-data, bottom-editor, bottom-copy.test, e2e/bottom-viewer.spec.ts, e2e/board-lock-screens.spec.ts |
| 3 | The founder's look | checkpoint (this summary and the picture) | pictures/17-10-the-viewer-and-data.png, pictures/17-10-pictures-source.tar.gz |

## Verification

- `npx tsc --noEmit` exit 0. `npx eslint` on every changed file: 0 problems.
- `npx vitest run components/bottom components/design/board-lock-scope.test.ts`: 55 passed.
- **Full unit suite.**
  - After Task 1: 11,361 passed, 7 failed in 4 files untouched by this plan (`blank-fit`, `finished-rail`,
    `shaping-bay`, `rack-stand-in`), all timeouts or a timing limit at load average about 40.
  - Those 4 files alone: 299 passed, 1 failed — `blank-fit`'s "judges the catalogue in under 250 ms" (511 ms under load).
  - After Task 2: **11,372 passed, 2 skipped, exit 0 (394 s)**.
- **`e2e/bottom-viewer.spec.ts`, three projects: 11 passed, 19 skipped, exit 0 (3.4 min).**
  - Desktop: the drag, the tap and the arrow keys; Height and the fitted factor; the ruler at 1280, 1024 and 820; the
    ghost; the view reset away-and-back and on a reload.
  - Desktop DATA: a flat board, the Deep Single with six channels, the rail-form note, and the practice rack signed out.
  - Phones: a tap on iPhone and Android, and a trusted thumb drag on Android.
- `e2e/bottom-viewer.spec.ts` + `e2e/bottom-screen.spec.ts` (Task 1's code), three projects: 9 passed, 15 skipped, exit 0
  (7.1 min).
- **`board-lock-screens.spec.ts` (s-bottom, p-screens, look-bottom) + `board-lock.spec.ts`, three projects: 33 passed, 17
  skipped, 1 failed, exit 1 (4.6 min).**
  - Every BOTTOM walk passed: s-bottom on the desktop, p-screens on both phones, and look-bottom on all three.
  - The one failure was `board-lock.spec.ts:361` (o5) on the iPhone, a padlock on the rack that never showed. Alone with
    `--repeat-each=2`: 2 passed (21 s), so it was load.
  - `x-3d` was not run (ruling 5).

### Measured, for the founder

- **The section box** (`data-bottom-section`, 1280 × 800 window unless said):
  - 804 dots at 1280, 548 at 1024, 624 at 1100, 404 at 820.
  - So the ruler is bare from a 1024 window and its caption joins at 1101.
- **The Longboard, its three cuts (Blended Nose Concave, Early Double Concave, Spiral Vee) and 8 channels, on the Pixel 7
  profile:**
  - The top view has 70 SVG nodes and 111 KB (110,983 bytes), of which 16 are shade paths.
  - The section has 23 nodes and 6.4 KB.
  - The section's maths costs about 1.9 ms a step (Node, unthrottled): `bottomSection` + gauges + ruler.
- **A thumb drag at 4× CPU throttle** (CDP), on the dev server (no production build is allowed in a worktree), with the
  machine at load average 28 to 44:
  - 12 to 18 section updates a second; the screen paints 18 to 30 frames a second.
  - Unthrottled: 57 updates a second at 60 frames, so the section keeps up with the finger.
  - **That is under the plan's 30 fps line at 4×.**
- **The plan's fallback would not help.** The fallback samples the shade at 60 × 32 while a pointer is down. But the shade is
  never recomputed during a drag: it is worked out once per bottom, and since this plan the cutting line moves on a layer of
  its own over it.
- **What was done instead.** The station lives in a small store that only the line, the section and Section at read, so a
  drag no longer redraws the screen around them or the panel. The remaining cost is the dev build's React overhead and the
  browser's own work, about 15 ms a step unthrottled. I could not measure a production build here. Raised below.
- **Height fitted on the Longboard's belly does not hold.** At 1280 × 800 the Longboard's 22 1/2" wide point leaves room for
  about 14 mm of cut at ×8, and no cut is deeper than its 1/2" Depth, so the Longboard is never fitted at this window. Its
  opening belly reads `HEIGHT ×8`. The Shortboard's Deep Single at 1/2" is fitted: `HEIGHT ×5.3`, as computed beforehand.
  The test uses that.
- **The floor cells.** 17-09's recipe (the Shortboard planed to 1 3/8") meets the floor at 65 1/2", which is between DATA's
  rows, so no cell is coloured there. Planed to 1 1/8" with a Blended Nose Concave at 1/2", the 60" and 66" rows hold at
  1/4" and both cells are in warning ink. The sentence names the one nearest the nose (`8" from the nose`), as the panel's
  sentence always has.

## Deviations from Plan

1. **[Rule 1 — performance, measured] The station in a small store of its own** (`components/bottom/section-station.ts`, a
   new file outside `files_modified`). The plan kept it in `BottomEditor`'s state. As state, every drag step re-rendered the
   shell, the tab strip and Back/Next. `BottomControls` is also memoised now. Both are view state only, never saved; a
   source test pins that none of it is in the store or the saved board.
2. **[Rule 1] The cutting line on its own SVG layer**, and the pointer handlers on the top view's box rather than the SVG.
   The line is one layer over the drawing, and its grab zone takes the pointer. `board-lock-scope.test.ts` checks that the
   box with the handlers is `data-lock-exempt`.
3. **[Ruling 2] DATA's floor note is `floorWarning`'s sentence named for its cut**, not the UI-SPEC's `The cut meets the
   1/4" floor at 0" and 6" from the tail …`. Only the stringer form colours a `Stringer left` cell.
4. **[Ruling 2] The floor scan moved from `BottomControls` to `BottomEditor`**, so the panel and DATA share one deferred scan.
5. **[Ruling 10] The fitted-Height test is on the Shortboard** (see Measured).
6. **[Rule 1] `Section at` stops 72 dots short on a computer.** Once there is something to undo, the floating Undo/Redo pair
   sits over the card's bottom-right corner, and it covered the track's tail end.
7. **[Rule 3] `board-lock-screens.spec.ts`'s `rangeInputsDisabled` skips `data-lock-exempt` sliders.** Otherwise `Section
   at`, which is meant to stay live, failed the phone walk. Added `s-bottom` (the s-fins recipe: cut the board unlocked, lock
   it on the rack, come forward) and `look-bottom`.
8. **The reload test does not expect the cut to survive a reload.** The kept open board does not carry the bottom yet;
   saving it is 17-12's. The test proves the view resets both on a reload and away-and-back, where the cut does stay.
9. **`bottom-copy.test.ts`** (outside the list) carries the new words' tests and the two source rules: nothing under
   `components/bottom` reads the window or the device, and the view state is never in the store or a saved board.
10. **Task 1's commit carries DATA's words** (`layoutMarkColumnName` …) in `bottom-copy.ts`; Task 2 uses them.
11. **The WINGS Select does not exist yet** (17-12 adds it). When it lands it takes `disabled={locked}` like the Cut menus,
    and `board-lock-scope.test.ts` already lists `bottom-controls.tsx`.
12. Channels note shown only when channels are cut (the founder at the look, 2026-11-09).

## Known Stubs

None.

## Threat Flags

None. T-17-16: every store action already returns on `lockedRef.current`. The only new controls are view-only and marked
`data-lock-exempt`, and the inventory and `s-bottom` prove it. T-17-11: measured above. The shade is memoised per board and
bottom and never redrawn during a drag.

## Founder's look: Approved (2026-11-09)

The founder, on the checkpoint card with the picture: *"Approved — merge it"* The founder asked for one change at the look: DATA's channels note shows only when channels are cut (commit e9805e62). Drag speed is his to check on his own phone before go-live. Merged as 97184477.

Picture: `.planning/phases/17-bottom-contours/pictures/17-10-the-viewer-and-data.png` (2123 × 7846, two columns). Its
sources, the raw shots and the probe scripts are in `17-10-pictures-source.tar.gz`. All taken from this worktree's dev
server on 3310 at deviceScaleFactor 2.

1. Drag the cutting line, or tap the board, and the section follows; the `Section at` slider does the same with the
   keyboard.
2. The ruler shows the live cut's marks off the stringer on a computer from a 1024-wide window (bare) and with its caption
   from about 1100 (D-30); on a narrow window it is gone and DATA's layout table carries the marks.
3. The finished rail is off until ticked (D-13).
4. DATA lays the bottom out every 6" — the depths, then the marks, a wall only from where its own channel starts.

Awaiting "approved", or changes.

## Self-Check: PASSED

- FOUND: components/bottom/section-station.ts, e2e/bottom-viewer.spec.ts, both picture files.
- FOUND: a893c289, 97ca4381.
