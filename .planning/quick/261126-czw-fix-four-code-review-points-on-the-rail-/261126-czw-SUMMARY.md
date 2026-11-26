---
phase: quick-261126-czw
plan: 01
subsystem: bottom
status: complete
tags: [bottom, rail-roll, brd-import, board-reader, order-form]
requires: [quick-261125-mf8, quick-261125-v2j, quick-261125-v2f]
provides:
  - railRollInUse (the roll a nose concave actually carries: none at Depth 0)
  - the Rail Roll row greyed while Depth is 0, the shaper's roll kept
  - the .brd concave tie for a belly only
  - a stored Rail Roll read 0 to 1/2"
  - bottomTopViewRoomThatFits and BOTTOM_TOP_VIEW_MIN_ROOM_SHARE
affects: [BOTTOM side panel, BOTTOM DATA note, printed BOTTOM CONTOURS page, Board file preview, Open a board file]
tech-stack:
  added: []
  patterns: [stored value kept while a derived "in use" value reads 0; bounded halving search over a monotone page fit]
key-files:
  created: []
  modified:
    - lib/geometry/bottom.ts
    - lib/geometry/bottom-rail-roll.test.ts
    - components/bottom/bottom-controls.tsx
    - e2e/bottom-rail-roll.spec.ts
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-look.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - components/summary/bottom-sheet-fit.ts
    - components/summary/bottom-sheet-fit.test.ts
decisions:
  - "A nose concave at Depth 0 carries no Rail Roll for anything a shaper reads (notes, printed cut, preview), while the saved board keeps the roll and Depth above 0 brings it back untouched (D-01)"
  - "The Rail Roll row greys at Depth 0 with no words added: the page's own disabled look, as TEMPLATE's Tail Block rows (D-01)"
  - "Opening a .brd, the founder's 0.05 mm concave tie applies only to a belly replaced, never to the centre Tri-Plane Hull Center vee (D-02)"
  - "A stored Rail Roll is read 0 to 1/2\", the slider's own top; past it the key is dropped and the cut kept (D-03)"
  - "The printed bottom page's picture room is found by halving, never under half its natural room (D-04)"
metrics:
  duration: "about 60 minutes"
  completed: 2026-11-26
actuals:
  tokens: 10800
  tasks: 3
  commits: 3
---

# Quick 261126-czw: four code-review points on the Rail Roll Summary

A nose concave at Depth 0 now greys its Rail Roll row and keeps the roll for when Depth comes back. Opening a board file
no longer lets a rolled nose concave replace a centre vee on the founder's tie. A saved roll is read only up to BOTTOM's
1/2". The fit and the printed page each do less work for the same answers. Point 5 (the Teardrop's roll starting at Off
Rail) is left as it is, as the founder asked.

## What changes for a shaper, point by point

**1. Rail Roll at Depth 0 (D-01).** A Teardrop, Blended or Slight Single Concave Entry nose pulled down to Depth 0 cuts
nothing, so it can't roll anything either. On BOTTOM its Rail Roll row now greys out and the slider stops moving. It is
the same look TEMPLATE gives its Tail Block, Depth and Tail Angle rows, and no words are added under it. The greyed row
still shows the roll the shaper set. Push Depth back above 0 and the row comes back live with that same roll: the saved
board keeps it the whole time, through a reload too. While Depth is 0, the floor notes on BOTTOM and on DATA, the printed
cut and its GUIDE line, and the Board file preview's Across cell all treat the nose as having no roll. The foam, the
litres, the rails, the 3D board and the exported file are unchanged, because a concave at Depth 0 already cut nothing.
No hint words were needed, so there are none to draft.

**2. The concave tie on opening a .brd (D-02).** When a board file is opened, a nose concave with a Rail Roll may still
win a near tie (up to 0.05 mm further off) where it replaces a belly: a Rolled Belly Entry nose, or a Continuous Belly
centre. The founder ruled that tie for a belly. It no longer applies where the roll would replace a Tri-Plane Hull
Center, the one vee in the centre. That vee now has to be beaten outright, like any other cut.
Measured after the change, against v2f's archived after-runs. Those are a fair "before": `lib/` is byte-for-byte the
same between v2f's 7707ee85 and this task's base f6349c90 (checked, exit 0).
- The founder's twelve sample files: 12 compared, **0 differ** (every digest the same; no "!!" line).
- The 296-board round trip: 296 compared, **0 differ**. analyze.mjs gives the same scores as before: 158/192 concaves
  and rolls back, 145 within 1/16", widest/typical 0.67 / 0.09 mm, invented rolls 4/48, false concaves 0/48. Only the
  timings move. Eight grid boards carry a Tri-Plane Hull Center and none of them changed, so the tie never decided one
  of them. No board needed listing.

**3. A saved roll past 1/2" (D-03).** A saved board, the browser's open board or a board file whose nose concave carries
a Rail Roll over 1/2" (more than BOTTOM's slider can set) now opens with no roll on that nose. The cut and the rest of
the board are kept. A roll at the slider's very top is kept exactly, in Imperial and in Metric (both store 12.7 mm).
Depth's own 1" limit is unchanged; a 3/4" nose Depth still reads back as saved.

**4. Two efficiency points, same answers (D-04).**
- Opening a .brd: the fit used to measure how close the chosen bottom came to the file twice. It now keeps the first
  measurement and reuses it. Every file and grid board opens exactly as before (point 2's runs above prove it).
- Printed BOTTOM CONTOURS page: when the picture of the bottom has to shrink to make the page fit (the tables gone to
  their own sheet), its size used to come down one dot at a time, re-laying the page each step. It is now found by
  halving: about 9 tries instead of up to 189, and exactly the same size on every board the tests sweep. That covers
  every swept layout whose tables take their own sheet, in the split's-reach sweep and in the rolled sweep at the
  slider's top roll. **At the floor:** the picture never comes down past half its own room. If a page were still too
  tall at that size, the rule stops shrinking the picture and the browser's own give-way on it (already in place as a
  guard) squeezes the rest, so nothing runs off the sheet. No board the tests or the two printed-page specs cover comes
  near it (v2j measured the deepest give at 166 of 190 dots), and the sweep asserts every answer stays above the floor.

## Commits

| Task | What | Commit |
|---|---|---|
| 1 | BOTTOM: the Rail Roll greys at Depth 0 and comes back as it was (`railRollInUse`, MarkRow `disabled`) | 6a0c4cfe |
| 2 | .brd: the tie for a belly only; one measurement fewer; the preview's Across cell at Depth 0 | 4d8def29 |
| 3 | The reader holds a roll to 1/2"; the printed page's room searched with a floor | 92df280f |

## Tests added

- `bottom-rail-roll.test.ts`: Depth 0 carries no roll yet keeps the stored one (every preset, the three nose concaves,
  tidy keeps the key, no printed nose, back at 1/8" the roll returns); `railRollInUse` equals `railRollOf` above 0 and
  is 0 on every cut that takes no roll.
- `e2e/bottom-rail-roll.spec.ts`: roll to 1/8", Depth Home: slider disabled, same figure; reload: still disabled and
  same; Depth End: enabled, same figure (desktop and Android; iPhone skipped by the describe's own rule).
- `brd-bottom.test.ts`: a centre Tri-Plane Hull Center takes no tie (kept at T + 0.8 x tie, beaten at T - 1.04 x 0.25 mm);
  a centre Continuous Belly still takes it.
- `brd-look.test.ts`: the opened Mid-length look with its nose at Depth 0 names Off Rail alone in the Across cell, both
  systems; the unchanged look still names the roll.
- `design-snapshot.test.ts`: the slider's top kept (and each system's slider top); just past it, 3/4" and 1" dropped
  with the cut kept; a 3/4" Depth with no roll kept.
- `bottom-sheet-fit.test.ts`: `bottomTopViewRoomThatFits` against the dot-by-dot loop for natural rooms 1 to 190 over
  many page heights; the floor and no-search cases; at most ceil(log2(natural)) + 2 tries; and the oracle plus "above the
  floor" in the split's-reach and rolled sweeps, with non-vacuity counts.

Each new unit case was seen failing on the old code before it passed. The D-01 maths, the D-02 vee case, the D-01
preview case, the D-03 bad-roll list and the `bottomTopViewRoomThatFits` cases all failed first.

### Test lines removed (D-03 requires them)

From `git diff -U0 f6349c90 -- '*.test.ts' '*.spec.ts' | grep -E '^-[^-]'`:

```
-import { bottomPrintLines } from "./bottom-print";
-import { formatMark } from "@/lib/geometry/measure-display";
-      ["just past the outer bound", inchesToMm(1) + 1],
-  it("a roll at the outer bound is still a board the app can work out", () => {
-    const { stored } = noseWith({ railRoll: inchesToMm(1) });
-    expect(opened.bottom!.nose.railRoll).toBe(inchesToMm(1));
```

The two imports only widened (`bottomPrintCuts`, `measureSlider` added). The 1" "outer bound" case became the 1/2"
slider-top case, and the 1" + 1 mm bad entry moved to the new bound, with 3/4" and 1" added as bad.

## Gates

Each gate was run in its own call and read to its exit line, in the worktree on port 3158:

- `npm test`: 241 of 242 files and 14153 of 14158 tests passed (2 skipped). The 3 failures were all 5-second time
  limits in `lib/geometry/blank-fit.test.ts`, a file this task does not touch, hit while the browser spec ran beside the
  suite. Run alone, `blank-fit.test.ts` passed 86/86.
- `npx tsc --noEmit`: exit 0.
- Lint: `npx eslint` on all twelve touched files, exit 0. I linted the touched files rather than the whole repo, for
  speed.
- `e2e/bottom-rail-roll.spec.ts`, every project: 4 passed, 2 skipped (iPhone, by the spec's own rule).
- `e2e/bottom-panel.spec.ts --project=desktop`: 14 passed.
- `e2e/summary-bottom-page.spec.ts`, every project: 14 passed, 16 skipped (the spec's own "one computer pass" skips).
- `e2e/summary-planing.spec.ts --project=desktop -g "fits its sheet"`: 14 passed.
- Protected paths (fixtures, desktop baselines, db, drizzle, lib/db, presets, the GUIDE words, the design store,
  CLAUDE.md): unchanged (`git diff --quiet` exit 0). `git diff --name-only f6349c90` lists exactly the twelve code
  files in the plan.
- Not run here: `npm run build` and `npm run test:e2e:prod`. Both are the orchestrator's, on main after the merge.
  Nothing was pushed.

## Deviations from Plan

**1. Task 1 is a tracer task and auto mode is off, so the plan's tracer gate would stop for a look after Task 1.** The
plan is marked autonomous and the orchestrator asked for every task. I re-ran Task 1's verify end to end instead (unit
81/81, browser 4/4 on desktop and Android), then went on. The founder's look at the greyed row is still to come, at the
orchestrator's review.

**2. Order of writing.** For Task 1 and Task 3's room search I wrote the code beside the tests. Then I showed each new
test failing by putting the old file back for one run (2 failed / 79 passed; 4 failed / 366 passed; 1 failed / 128
passed for the reader), and restored the new code. The RED evidence is the same; only the order differs.

Otherwise the plan ran as written.

## Known Stubs

None.

## Threat Flags

None. The changes only narrow what is read (T-czw-01), bound a search (T-czw-02) and narrow a tie (T-czw-03). The
founder's sample files were read in place and are not in the archive (T-czw-04: the listing has 31 entries, 0 `.brd`).

## Archive

`.planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-scripts.tar.gz` holds v2f's scripts
unchanged, the czw after-runs (twelve files and the six grid shards with logs), the same/analyze comparisons and a
README. No .brd. Left uncommitted for the orchestrator, with this SUMMARY.

## Self-Check

PASSED. The six product files and the archive exist; commits 6a0c4cfe, 4d8def29 and 92df280f are on the branch;
the only uncommitted files are this SUMMARY and the archive, left for the orchestrator.
