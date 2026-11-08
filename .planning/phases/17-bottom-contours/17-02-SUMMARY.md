---
phase: 17-bottom-contours
plan: 02
subsystem: geometry (bottom contours: the one number, first four kinds)
status: checkpoint
tags: [bottom, foam-off, golden, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-19, D-24, D-36, D-38, D-39]
requires:
  - "17-01: frontFinStation / frontFinToeDegrees, narrowestOutlineAt, designFinPlacement, bottom-golden.json"
provides:
  - "lib/geometry/bottom.ts: BOTTOM_CUT_NAMES (13), BottomCutSpec / BottomChannelsSpec / BoardBottom (D-24), DEFAULT_BOTTOM, startingCut, resolveCut, resolveBottom, keepStationsInOrder, refAt, sec, rise, smoothstep, fadeAt, cutHalfWidth, cutFoamOff, foamOff, bottomHasCut, isDefaultBottom, PINCH and the sketch's named constants"
  - "lib/geometry/design.ts: designBottomBoard(outline, geometry, profile, placement): BottomBoard"
affects: [17-03, 17-04, 17-05, 17-06]
tech-stack:
  added: []
  patterns:
    - "Stored stations measured from the nearest tip (nose cuts from the nose) or the front fins (the tail cut's Deepest At), resolved to stations from the tail on read"
    - "A flat stores and reads all zeros, whatever the board's length"
key-files:
  created:
    - lib/geometry/bottom.ts
    - lib/geometry/bottom.test.ts
    - .planning/phases/17-bottom-contours/pictures/17-02-four-cuts-against-the-sketch.png
    - .planning/phases/17-bottom-contours/pictures/17-02-pictures-source.tar.gz
  modified:
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
decisions:
  - "A flat resolves to the sketch's flat (every number 0) in every section, so DEFAULT_BOTTOM does not depend on a board's length"
  - "keepStationsInOrder reads the stations without the D-36 fin push, so the station being dragged always wins; the push applies only to what is shown (resolveCut)"
  - "BottomBoard.curveAt is the Natural outline (curveHalfWidthAt); notchInner reads the drawn rail (sampleOutline) less the foam, as the sketch's innerAt does"
  - "foamOff returns 0 where railAt(s) <= 0 before summing, the sketch's own guard in foamOff"
metrics:
  duration: "about 20 minutes of work (13:33 to 13:53 by the clock), plus two full unit-suite runs of about 4 minutes each"
  completed: 2026-11-08
actuals:
  tokens: 14900
  tasks: 2
  commits: 3
---

# Phase 17 Plan 02: The bottom's one number for a flat, a belly, a vee and a single concave — Summary

The app can now work out how much foam a flat, a belly, a vee or a single concave takes off the bottom at any point,
using the arithmetic of the sketch the founder approved, and it agrees with the sketch's own figures to less than a
ten-billionth of a millimetre. Nothing reads it yet, so nothing on any screen and no litres figure moves.

## What changes for the founder

Nothing you can see yet. Underneath:

- **A board's bottom has a saved shape.** It holds a cut for the nose, the center and the tail, the channels' numbers
  for later, and which outline Off Rail is measured from on a winged board. Every board opens with three flats and no
  channels.
- **Thirteen of the eighteen names work** (the other five, the doubles, the Spiral Vee, the Tri-Plane and the
  Teardrop, come in 17-04). Each opens with the sketch's starting numbers. All 50 starting cuts on the five boards
  read Start, then Deepest At, then End, in order along the board.
- **Where each station is kept.** A nose cut is kept as a distance from the nose, so lengthening the board on
  TEMPLATE keeps it at the tip. A tail cut's deepest point is kept from the front fins, so moving the fins on FINS
  carries it. If the fins carry it past the cut's own start or end, the screen shows the other pushed to it, and the
  saved board is not changed until you next move a slider.
- **The 1/4" floor.** However deep a cut is set, the bottom never leaves less than 1/4" of foam under the planed
  thickness. On the opening cuts of the Shortboard, the Fish and the winged Fish, the floor never comes into play.
  Set every cut to 1/2", run tip to tip, and it does come into play where the board thins under 3/4" (the Shortboard,
  Fish, Mid-length and winged Fish); the Longboard never thins that far.
- **The picture** (`pictures/17-02-four-cuts-against-the-sketch.png`) shows four cross-sections drawn from the app's
  maths, with the sketch's own figures as dots on the line, and a table of every starting cut on the five boards.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The stored shape, the thirteen names, the board facts, Start/Deepest/End kept in order | 27d10c6a | bottom.ts, bottom.test.ts, design.ts, design.test.ts |
| 2 | The one number for a flat, a belly, a vee and a single concave, with the 1/4" floor | cb8ba266 | bottom.ts, bottom.test.ts |
| 3 | The founder's look | checkpoint (pictures committed with this summary) | pictures/17-02-four-cuts-against-the-sketch.png, pictures/17-02-pictures-source.tar.gz |

## Verification

- **Starting numbers:** for all 13 names on all 5 golden boards, `resolveCut(startingCut(...))` equals the golden's
  `makeCut` numbers within 1e-9 mm (65 cases).
- **Order:** all 450 golden `normalize` cases of this wave's ten non-flat names (10 names × 3 drags × 3 targets × 5
  boards) match within 1e-9 mm, and the dragged station always lands exactly where it was dragged.
- **Board facts:** `designBottomBoard`'s facts and samplers equal the golden's probes on all five boards (rail, Natural,
  Narrowest, both `refAt` rules, foam, thickness, notch wall) within 1e-9 mm. On the winged Fish, every golden `refAt`
  case matches under both wing rules. On all 8 diamond-tailed surface boards, `railAt` equals `foamHalfWidth` inside
  the V where `sampleOutline` is 0.
- **The one number:** `cutFoamOff` equals the golden's `cutOff` at all 325 probes of each of the 10 non-flat names on
  5 boards. `foamOff` equals the golden's `foamOff` on the Shortboard's, Fish's and winged Fish's openings, and on every
  name alone (capped at the floor where the floor bites). Over 21,125 probes the largest gap is 4.8e-14 mm.
- **Tests that can fail:** with the tests in place, moving one starting number (the Reverse Vee Nose's End by 1"), or
  dropping one line of the order rule, failed 85 tests. Setting PINCH to 3 1/2" failed 15. Both changes were reverted.
- **Rule 1 / Rule 2:** `bottom.ts` imports only `./units`, `./foil` and a type from `./board-profile`. `grep -c 25.4`
  prints 0. A test in `bottom.test.ts` reads its own source to prove none of the sketch's litres figures is typed, and
  the plan's `git grep` for them prints nothing.
- `npx tsc --noEmit` exits 0. `npm run lint` shows 0 errors, plus the same unrelated warning as before in
  `lib/db/import-designs-action.test.ts`. `npm test` passed after Task 1 (10,348 tests) and after Task 2 (10,465
  passed, 2 skipped).
- `git diff --stat a3c3d23f -- lib/geometry/volume.ts drizzle lib/db/schema.ts components app` prints nothing.

## Deviations from Plan

1. **[Rule 1 - Bug, test] The floor test only runs on boards that thin under 3/4".** As planned, it asserted that every
   golden board has a station under 3/4". The Longboard does not: its tips stay thicker. So the test now runs on the
   four boards that do, and a separate test asserts that at least three of the five boards thin that far. Commit
   cb8ba266.
2. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as the plan and this session's
   attribution rule give it. The orchestrator's ruling 4 named a different model, which is not the one that did this
   work (wave 1 recorded the same).
3. **One commit per task, not test-then-feat.** This follows orchestrator ruling 4. For Task 2 the tests were written
   and run first, and 114 failed before the port went in. For Task 1 the code and the tests were written together; a
   mutation check (above) shows the tests catch a wrong number.
4. **A flat reads all zeros on every section,** including the nose. A nose flat stored as 0 would otherwise read as a
   station at the nose tip. The plan's "a flat's numbers are all 0" holds both stored and read.

## TDD Gate Compliance

There are no separate `test(...)` commits, because ruling 4 asks for one commit per task. The RED step was run for
Task 2, where 114 tests failed on the missing functions before the port.

## Known Stubs

None. `ResolvedBottom.channels` passes the stored channels through unchanged, by design, until 17-05 resolves them.
`spiral` is always false and `closesToPoint` is never set by this wave's names; both belong to 17-04.

## Founder's look: Pending

Picture: `.planning/phases/17-bottom-contours/pictures/17-02-four-cuts-against-the-sketch.png` (sources in
`17-02-pictures-source.tar.gz`). Awaiting "approved", or changes, and his yes or no on D-39 (nose stations kept from
the nose), D-03 (the tail cut's deepest point kept from the front fins) and D-36 (a fin move pushes Start or End on the
screen only).

One thing to point out about the picture: each cross-section is drawn at the sketch's station nearest the cut's Deepest
At, because the golden records the sketch every 1/24 of the board. The Mid-length's Shallow Single is deepest at 12" and
is drawn at 10 3/4".

## Self-Check: PASSED

bottom.ts, bottom.test.ts, both pictures and this summary exist. Commits 27d10c6a and cb8ba266 are on the branch.
