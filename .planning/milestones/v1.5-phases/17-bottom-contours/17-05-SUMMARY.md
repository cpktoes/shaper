---
phase: 17-bottom-contours
plan: 05
subsystem: geometry (bottom contours: all eighteen names, D-42, and DATA's numbers)
status: checkpoint
tags: [bottom, double-concave, spiral-vee, tri-plane, teardrop, data, floor, D-04, D-05, D-06, D-07, D-09, D-16, D-32, D-33, D-34, D-40, D-42]
requires:
  - "17-02: bottom.ts (startingCut, resolveCut, keepStationsInOrder, cutFoamOff, foamOff), designBottomBoard"
  - "17-03: the seam (BoardSection.thinAt / railEdgeAt), designCrossSectionInput(…, bottom)"
  - "17-04: the store's bottom (unchanged here)"
provides:
  - "bottom.ts: all eighteen BOTTOM_CUT_NAMES; BottomCutKind `double`; doubleMarks, cutFoamOffParts, the Teardrop's closing in cutHalfWidth, the Spiral Vee in cutFoamOff"
  - "bottom.ts: keepStationsInOrder(section, spec, changed, board, rule) with the double's flat/trough line"
  - "bottom.ts: TAIL_VEE_NAMES, isTailVee, startingCut(…, tail?) and pickCut (D-42's pure rule)"
  - "bottom.ts: bottomDataStations, deepestCutAt, bottomDataRows, bottomLayoutMarks, bottomFloorFlags and their types"
affects: [17-06, 17-07, 17-08, 17-09, 17-12]
tech-stack:
  added: []
  patterns:
    - "A cut's foam off in two kinds of work — concave (held at the 1/4\" floor) and lift (never held) — so the Spiral Vee's double and vee follow their own rules (D-40)"
    - "A center single's starting numbers read the tail cut; a pick re-seats a single still on its starting numbers, never one set by hand"
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-05-doubles-vees-teardrop.png
    - .planning/phases/17-bottom-contours/pictures/17-05-pictures-source.tar.gz
  modified:
    - lib/geometry/bottom.ts
    - lib/geometry/bottom.test.ts
    - lib/geometry/design.test.ts
    - lib/geometry/board-surface.test.ts
decisions:
  - "The Spiral Vee is kind `double` (as the sketch has it) with spiral true; its double is concave work held at the floor, its vee a lift that never touches the stringer"
  - "D-42 lives in startingCut's optional `tail` and in pickCut; with no tail named every name opens on the sketch's own numbers, so the golden is untouched"
  - "pickCut re-seats a center single both ways: picking a tail vee moves it to the vee numbers, picking a tail that is not a vee puts it back — only while it is still exactly on the starting numbers of the tail it had (for the founder to confirm)"
  - "The floor's stringer form flags a station where the concaves together pass the floor and this cut is one of them (for one cut alone this is exactly 'its own cut would leave under 1/4\"'); it scans only the foam (a swallow's notch is air) and ignores a tie to the last binary digit"
  - "The floor's rail form reads 17-03's BoardSection.thinAt (flooredAt no longer exists): a station is flagged where the cut takes foam off at a point the section leaves under 1/4\""
  - "DATA's Stringer left is null in a swallow's notch or where there is no rail, as the sketch's DATA has it"
metrics:
  duration: "about 35 minutes (01:20 to 01:55 UTC), of which about 10 were two full unit-suite runs (about 5 minutes each)"
  completed: 2026-11-08
actuals:
  tokens: 21000
  tasks: 2
  commits: 3
---

# Phase 17 Plan 05: The doubles, the Spiral Vee, the Tri-Plane, the Teardrop's closing — and DATA's numbers — Summary

All eighteen bottom names now take foam off exactly as the founder's sketch 021 does, and every number the BOTTOM page's
DATA tab will print exists: the depths every 6", the layout marks off the stringer, and where a cut meets the 1/4" floor.
His D-42 ruling is in: with a tail vee, a center single opens so it has run out where the vee is deepest. Nothing on any
screen changes yet; the page arrives in 17-08.

## What changes for the founder

- **The five new names cut.** The Early Double Concave and the Double Concave Exit take nothing inside their flat at the
  stringer. They are deepest at the trough and shallow out to nothing at the edge, so a single stacked on a double
  leaves the stringer as the ridge. The Spiral Vee is the Double Concave Exit's double with a 3/16" vee under it. The
  Tri-Plane is a vee whose lift starts at its flat panel, half the wide width less 4" either side of the stringer. The
  Teardrop closes to a point behind its deepest station, and ticking that box on the Blended Nose Concave or the Slight
  Single Concave Entry closes them the same way.
- **D-40 holds for the new cuts.** The Tri-Plane's planes and the Spiral Vee's vee never touch the stringer and are never
  held. The doubles are concave work, held so 1/4" always stays under the planed thickness.
- **D-42.** With a Panel Vee, a Rolled Vee or a Spiral Vee in the tail, a center single opens deepest halfway from the
  wide point to the front fins and ends at the fins. On the Mid-length the Shallow Single moves from deepest 12" / end 4"
  to deepest 28 3/4" / end 12". The Deep Single was already deepest halfway, so only its End moves (4" → 12" on the
  Mid-length). If a single is still on its starting numbers when the tail is picked, it moves in the same step. A single
  set by hand is never moved.
- **DATA's numbers.**
  - The depths table has a row at the tail, every 6" and at the nose tip. Each row gives the width, the deepest cut under
    a straightedge, the rail lift and the stringer left.
  - The rows within 3" of the front fins and of the wide point are the two reference rows. A row where the floor holds a
    concave is flagged.
  - The layout-marks table gives each section's flat, trough and edge off the stringer, in shop order.
- **The floor warning's numbers** cover two cases:
  - where a concave meets the 1/4" floor at the stringer;
  - where a vee or belly leaves the rail thinner than 1/4" (D-40's rail form).

## The figures (each computed by the app, printed by the picture script; none typed in a test)

| Board | Opening cuts (the sketch's starting numbers) | Before | Now | Foam off | Sketch's slab | Share |
|---|---|---|---|---|---|---|
| Shortboard | Deep Single Concave | 29.61 L | 28.87 L | 0.74 L | 0.75 L | 100.0% |
| Fish | Panel Vee | 34.65 L | 34.34 L | 0.31 L | 0.31 L | 99.9% |
| Mid-length | Blended Nose Concave · Shallow Single · Spiral Vee | 49.40 L | 48.18 L | 1.22 L | 1.23 L | 99.9% |
| **Longboard** | **Teardrop · Continuous Belly / Rolled Mid · Rolled Vee** | **73.61 L** | **71.06 L** | **2.55 L** | **3.33 L** | **76.8%** |
| Fish, winged | Extending Single Concave | 34.58 L | 34.45 L | 0.13 L | 0.13 L | 100.2% |

- **Five new names against the sketch:** all 8,125 probes agree; the largest gap is 1.7e-15 mm. Across all 15 non-flat
  names, the golden `cutOff` is matched on 5 boards at 325 probes each, within 1e-9 mm. All 675 golden `normalize` cases
  match, including 135 for the doubles, with Off Stringer and Trough At kept in order.
- **Start ≥ Deepest ≥ End:** this held on 3,210 starting cuts: 107 boards (the five golden boards and the 102 Phase 16
  boards with fins), 15 names each, with and without a tail vee.
- **The floor on the five openings:** the stringer floor is never met. **Two tail vees leave the rail's edge under
  1/4"** in the last few inches of the tail:
  - the Fish's Panel Vee at 1 3/8", 2 3/4", 4 1/8" and 5 1/2" from the tail;
  - the Mid-length's Spiral Vee at 1 3/4", 3 7/16", 5 3/16" and 6 7/8" from the tail.

  A tail rail stands only about 3/8" at its edge, and a 3/16" vee lifts it there.
- **A single at 1/2" run out to either tip** never meets the stringer floor on any of the five boards. A Rolled Belly
  Entry at 1/2" on the Shortboard leaves the rail under 1/4" near the nose (the rail form, `at` nearest the nose).

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The doubles, the Spiral Vee, the Tri-Plane and the Teardrop in the one number; D-42 | bbfeb751 | bottom.ts, bottom.test.ts, design.test.ts, board-surface.test.ts |
| 2 | DATA's numbers: depths every 6", layout marks, floor flags | 86bc3ed1 | bottom.ts, bottom.test.ts |
| 3 | The founder's look | checkpoint (this summary and the picture committed together) | pictures/17-05-doubles-vees-teardrop.png, pictures/17-05-pictures-source.tar.gz |

## Verification

- `npx tsc --noEmit` exits 0. `npm run lint` shows 0 errors, plus the same unrelated `import-designs-action.test.ts`
  warning.
- Full unit suite after Task 2: 184 files, 11,126 passed, 2 skipped, exit 0 (about 5 min).
  - After Task 1, one test failed: `board-surface.test.ts` counted five lift cuts and there are now six, because the
    Tri-Plane joined. The count was fixed, and the D-40 sweep passed alone with the Tri-Plane walked on all ten boards.
- `bottom.test.ts`: 1,031 tests. `npx vitest run lib/geometry/bottom.test.ts -t DATA` exits 0.
- **Tests that can fail.** Each mutation below was reverted afterwards.

  | Mutation | Tests failed |
  |---|---|
  | The double's trough share 0.85 → 0.8 | 21 |
  | The Teardrop's closing switched off | 18 |

- `git diff --stat d7a90f26 HEAD -- components app drizzle lib/db/schema.ts` prints nothing.
- `grep -c '"double"' lib/geometry/bottom.ts` and `grep -c closesToPoint lib/geometry/bottom.ts` print at least 1 and 2.

## Deviations from Plan

1. **[Rule 3] `lib/geometry/board-surface.test.ts`** (outside `files_modified`). The D-40 sweep's count went from five
   lift cuts to six because the Tri-Plane is a vee. The sweep now walks it too, and it passes.
2. **[D-40, orchestrator ruling 2] `flooredAt` → `thinAt`.**
   - The rail form of `bottomFloorFlags` reads `BoardSection.thinAt` from 17-03 (`flooredAt` no longer exists).
   - `foamOff` now splits each cut into concave work and lift (`cutFoamOffParts`). This is needed because the Spiral Vee
     is one cut that does both.
3. **[Measured, not bent] "`bottomFloorFlags` is empty for every preset's starting cuts" holds only for the stringer
   form.** Under D-40, the Fish's Panel Vee and the Mid-length's Spiral Vee leave the rail edge under 1/4" in the last
   5 1/2" to 7" of the tail (figures above). The test pins what holds: no opening ever meets the stringer floor. Where a
   rail flag appears, it is a tail vee, behind the fins, at a section with `thinAt`. Raised for the founder below.
4. **[Measured] The Longboard's litres** fall by 2.55 L, not the plan's "about 2.81 L". That figure was written before
   D-40 changed how a lift takes the rail. The sketch's slab figure is 3.33 L, so the fall is 76.8% of it. The test pins
   only "less than the sketch's slab".
5. **Interfaces widened:**
   - `BottomDataRow.stringerLeft` is `Mm | null` (null in a swallow's notch or with no rail, as the sketch's DATA has it).
   - `bottomLayoutMarks` takes optional `stations`, so the golden's sample stations can be checked at 1e-9.
   - `keepStationsInOrder` takes `rule` as a fifth, required parameter. Its only callers were tests.
6. **D-42's store step is 17-08's.** The store has no bottom actions yet, so the pure rule is here as `pickCut` (and
   `startingCut`'s `tail`). **17-08's `pickBottomCut` should call `pickCut(bottom, section, name, bottomBoard)` in one
   `setState`**, not `startingCut` alone, so the re-seat is the same undoable step.
7. **`pickCut` re-seats both ways.** Going from a tail vee to a tail that is not a vee puts a single still on the vee
   numbers back on the sketch's. D-42 only spoke of picking a vee, so this is for the founder to confirm.
8. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as the plan and this session's
   attribution rule give it and as waves 1 to 4 recorded. Orchestrator ruling 5 named a different model, which is not
   the one that did this work.
9. **One commit per task** (ruling 5). The tests were written before the floor and data code went in, and the mutation
   checks above show they bite.

## Known Stubs

None. The channels' layout columns and their place in `foamOff`'s concave sum are 17-06's, as the plan says.

## Threat Flags

None. There is no new endpoint, input, file path or schema.

## Founder's look: Approved (2026-11-08)

The founder, on the checkpoint card with the picture: *"Approved — merge it."* On the executor's two questions: the D-42 re-seat works both ways (*"Yes, both ways"*), and the researched opening vees stand even where they leave the tail rail's edge under 1/4" and so warn on a fresh pick (*"Warn, keep the numbers"*). D-34 as drawn: DATA's Foam off reads VOLUME's figure (the Longboard 2.55 L against the sketch's slab 3.33 L). Merged as b00e2366.

Picture: `.planning/phases/17-bottom-contours/pictures/17-05-doubles-vees-teardrop.png` (sources in
`17-05-pictures-source.tar.gz`). Awaiting "approved", or changes, and the D-34 answer.

1. Each new cut's line passes through the sketch's dots (section 1). The five vees read as five different shapes
   (section 2).
2. **D-34:** VOLUME will count 2.55 L off for the Longboard's opening cuts, where the sketch said 3.33 L. The sketch
   counted foam out to the outline that the rolled rail takes anyway. DATA's `Foam off` will read VOLUME's figure.
   Yes, or should the slab figure be shown too?
3. DATA's depth table and layout marks for the Shortboard's Deep Single (section 5) read as a shaper would lay the
   bottom out.
4. D-42 before and after (section 3). Is putting the single back when the tail goes from a vee to something else right?
5. The Fish's Panel Vee and the Mid-length's Spiral Vee leave the very edge of the tail rail under 1/4" in the last
   5 1/2" to 7". Should the BOTTOM page warn there, as D-40 says (the plan expected no warning on the presets' starting
   cuts)?

## Self-Check: PASSED

bottom.ts, bottom.test.ts, both pictures and this summary exist. Commits bbfeb751 and 86bc3ed1 are on the branch.
