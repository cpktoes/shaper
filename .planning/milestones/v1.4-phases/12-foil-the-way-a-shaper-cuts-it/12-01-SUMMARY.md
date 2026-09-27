---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 01
subsystem: geometry
status: complete
tags: [foil, blank, rocker, snapshot, golden-fixture, carry-over]
requires:
  - "tag v1.3 (Phase 11's boardOnBlank, for the golden)"
  - lib/geometry/blank-fit.ts (Phase 11 machinery reused)
provides:
  - "DEFAULT_BLANK_CUT, TipStyle, FineTuneSurface, BlankCut (lib/geometry/blank.ts)"
  - "boardOnBlank's planer cut: cut, centerGap, tipThinningAt, deckOffAt, bottomOffAt; cutOf (transitional)"
  - "fitAt's two-surface thin rule (D-09)"
  - "BlankSideView.cut / centerGap / foamOffDeck / foamOffBottom; bottomAt = board bottom - foam off the bottom"
  - "phase11TwelveInch, carryPhase11Blank, Phase11Board (lib/geometry/phase11-foil.ts)"
  - "DESIGN_SNAPSHOT_VERSION = 5, BLANK_DECK_SKIN_MAX_MM, hasPhase11Blank, ParseSnapshotOptions, parseSnapshot(value, options?)"
  - "lib/geometry/__fixtures__/phase11-foil-golden.json (39 Phase 11 boards) and its producer script"
affects:
  - "every screen that reads a board in a blank (ROCKER, RAILS, VOLUME, SUMMARY) now shows the new cut at the out-of-the-box settings"
  - "12-03, 12-05 (pass each board's own cut), 12-07 (moves foamOff readers), 12-09 (makes the cut required, deletes cutOf)"
tech-stack:
  added: []
  patterns:
    - "Expand-and-contract applied to types: the cut fields are optional, filled in ONE place (cutOf) until 12-09"
    - "Old maths kept only to read an old save (phase11-foil.ts), pinned by a golden generated from the old tag"
    - "Carry-over triggered by the saved value's shape, not its version number"
key-files:
  created:
    - scripts/extract-phase11-foil-golden.ts
    - lib/geometry/__fixtures__/phase11-foil-golden.json
    - lib/geometry/phase11-foil.ts
    - lib/geometry/phase11-foil.test.ts
  modified:
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-fit.test.ts
    - lib/geometry/board-profile.ts
    - lib/geometry/board-profile.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - lib/models/rack-models.test.ts
key-decisions:
  - "The Phase 11 never-below-the-tip guard is gone from blank-fit.ts; in its place a test pins that a tip window never digs under BOTH its tip setting and the parallel cut"
  - "A Bottom fine-tune re-levels the rocker on its own low point, found over every 1/16\" plus the five stations and every blank rocker knot under the board (within 1e-3 mm); both tweaks zero gives the identical board on either surface"
  - "parseSnapshot carries a cut-less blank over with the Tip Style passed in, falling back to DEFAULT_BLANK_CUT.tipStyle (Pin deck) when none is passed"
metrics:
  duration: "about 30 minutes"
  completed: 2026-09-27
  tasks: 3
  files: 12
actuals:
  tokens: 27600
  tasks: 3
  commits: 4
---

# Phase 12 Plan 01: Foil the way a shaper cuts it — geometry core Summary

The app now cuts a board from its blank the way a planer does — a constant 1/8" deck skin off the
top, the bottom planed parallel to the blank's until the centre reads the target, and the tips
thinned last over the final 12" (off the bottom under Pin deck, off the deck under Bottom) — proven
on every seeded blank by five named tests, and every board saved under Phase 11 reopens with its
five station thicknesses exactly as it showed them (the sixth named test), all before any screen
file changed.

## What a shaper gets from this plan

- **The deck is the blank's deck, one skin lower, everywhere.** The bottom follows the blank's
  bottom at one constant centre gap, so the rocker is the blank's own wherever the tips are not
  thinned.
- **Each 12" station reads the blank's thickness there less the skin and the gap**, and changing
  the Tip Style or a tip thickness moves nothing at or inside either 12" station.
- **The tip thinning eases in with no kink** at the 12" station and each tip reads exactly its
  setting. When a tip needs more foam than the cut leaves there (the Shortboard preset's tail), the
  thinning is negative: under Pin deck the tip rocker falls; under Bottom the deck would rise above
  the blank's deck, and the fit check says it doesn't fit.
- **A 12" fine-tune moves only the surface the board chose.** On the Deck the rocker never moves;
  on the Bottom the bottom drops by the tweak and the rocker re-levels on its own low point.
- **The fit check fails a board wherever its deck rises above the blank's deck or its bottom drops
  below the blank's bottom** (D-09), which also covers a board thicker than the blank.
- **Saved boards are now version 5** and carry their cut on the blank. A Phase 11 board — or one
  re-saved by a browser tab left open across the update — opens with the 1/8" skin, the shaper's Tip
  Style and fine-tunes on the Deck, and its two 12" fine-tunes set so tail tip, tail 12", centre,
  nose 12" and nose tip all read what Phase 11 showed.

Until plans 12-03/12-05 add the controls, every board in a blank shows the out-of-the-box cut
(1/8" skin, Pin deck, fine-tunes on the Deck). That changes numbers the screens already show for a
board in a blank (12" thicknesses, litres, the Foam Off total) — that is the new model, and it is
what later plans put controls on.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Pin Phase 11's foil in a golden file from tag v1.3; Phase 11's 12" formula proven against it | `710d915` | scripts/extract-phase11-foil-golden.ts, lib/geometry/__fixtures__/phase11-foil-golden.json, lib/geometry/phase11-foil.ts, lib/geometry/phase11-foil.test.ts |
| 2 | The new cut replaces the scaled foil; five named tests on every seeded blank | `03c0181` | lib/geometry/blank.ts, blank-fit.ts, blank-fit.test.ts, board-profile.ts, board-profile.test.ts |
| 3 | Snapshot version 5 with the cut on the blank; Phase 11 boards carried over by shape | `c610ac9` | lib/geometry/phase11-foil.ts (+test), lib/models/design-snapshot.ts (+test), lib/models/rack-models.test.ts |

Task 1 is the first commit on the branch touching the fixture or `blank-fit.ts`
(`git log --reverse --format=%h main..HEAD -- lib/geometry/__fixtures__/phase11-foil-golden.json lib/geometry/blank-fit.ts | head -1` prints `710d915`).

## The six named tests (SPEC R7)

In `lib/geometry/blank-fit.test.ts`, `describe("the phase's named geometry tests (R7)")`:
(a) `the board's deck sits exactly the deck skin below the blank's deck at every station, on every seeded blank`;
(b) `the board's bottom sits exactly the centre gap above the blank's bottom at every station, so the rocker is the blank's own` (also every golden case's five rockers, from the v1.3 fixture);
(c) `each 12" station's thickness is the blank's thickness there less the skin and the gap`;
(d) `changing Tip Style or a tip thickness moves no number at or inside the 12" stations`;
(e) `the tip thinning joins each 12" station with no kink`.
In `lib/models/design-snapshot.test.ts`: (f) `every version-4 board with a blank reopens with its five station numbers exactly as Phase 11 showed them` — all 39 golden cases, `formatMark` identical in Imperial and Metric, and a re-save changes nothing.

## The fixture

`lib/geometry/__fixtures__/phase11-foil-golden.json` is NEW (no existing fixture changed). It was
generated by `scripts/extract-phase11-foil-golden.ts` running tag v1.3's own `boardOnBlank` while
`blank-fit.ts` and `pchip.ts` were byte-identical to v1.3 (the script checks this and now refuses to
run on this branch, with the regenerate-in-a-v1.3-worktree recipe in its message). 39 cases: the four
presets on their generated picks, the development-database-shaped board (US Blanks 6'8"RP, 78",
2 1/2", tips 5/16" / 1/4", placement 5/16"), 33 sweep cases (every 4th pickable blank, board 2"
shorter, centre / placement / saved tweaks cycling at different rates so the sweep mixes them), and
two guard cases (Marko 6'0" M-Regular, 1 3/4" centre, 1 1/2" tail tip, tail tweak ±1/8") where Phase
11's inner guard really binds at the tail 12". Running it twice wrote identical bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in a plan claim] The tip-window edge bound restated so it is true**
- **Found during:** Task 2.
- **Issue:** the plan's edge test said that over every pickable blank at centres 2 1/4"–3" (blank
  C ≥ centre + 1/4"), placements {min, 0, max}, default tips, the thickness inside a tip window is
  never more than 1/64" under the tip setting (research had measured 0.138 mm). Measured here it is
  false: in 528 of 1,635 board/blank/placement combinations the parallel cut itself leaves less
  foam than the tip setting somewhere inside the window, worst 5.8 mm under a 5/16" nose tip
  (US Blanks 9'3"AX at a 2 1/4" centre, slid to the nose end), also US Blanks 9'3"A, 10'0"T and
  Arctic Foam 10'6" G / 9'9" G at 2 1/4". These are thin centres in long, thick blanks — the "foil
  runs out" territory of D-18. The derivation follows the spec exactly (tip = setting, D-16; the
  guard retired); only the plan's bound was wrong.
- **Fix:** the test (same place in the rewritten foil describe) now pins what does hold, measured
  first: the thickness never digs under the lower of the tip setting and the parallel cut
  (worst 1.4e-14 mm), and wherever the parallel cut leaves at least the setting all through the
  window the board is never more than 1/64" under it (measured 0). The test also asserts the
  "cut below setting" population is non-empty so the rule is exercised. Geometry unchanged.
- **Files modified:** lib/geometry/blank-fit.test.ts.
- **Commit:** `03c0181`.
- **For the founder / 12-03 & 12-07:** on those long, thick blanks with a thin centre, a 5/16" tip
  setting gives a board thinner than 5/16" a few inches in from the tip (as thin as about 1/8").
  D-18's "under 1/8" anywhere is not a fit" will catch the worst; the rest currently read as fits.

**2. [Test-only adjustment, named] Phase 11's two rocker tests read the rocker under Bottom**
- `plainBoard` in `blank-fit.test.ts` now states its cut as the out-of-the-box one with
  `tipStyle: "bottom"`, because the Phase 11 named tests "reproduces the catalogue rocker at the tips
  and 12" stations …" and "levelling puts the curve's minimum at exactly 0" read the rocker AT THE
  TIPS of a board with 0" tip settings; under Pin deck the tip thinning (the whole tip thickness)
  lifts the tips, which is the new model working, not a regression. Titles unchanged.
  `defaultBoard` and `fitContext` spread `DEFAULT_BLANK_CUT` (Pin deck), and the Phase 11 named test
  "the fit check rejects a board thicker than the blank near the nose even when the centre fits"
  states `...DEFAULT_BLANK_CUT` explicitly (it passes under the new two-surface rule, worst place
  within 1" of the nose).

No judging, offer or rescue test (the old `:555–968`) needed its expectation re-derived — all passed
unchanged under the new cut. The floor tests stay on the 3/8" Extra Center Thickness rule until 12-03.
No file outside the twelve was touched; no compile fix was needed anywhere else.

## Transitional behaviour to know about (expected, per the plan's executor notes)

- `parseSnapshot` runs on every save (`app/design/actions.ts`). Until 12-05 gives a freshly picked
  blank (and a preset) its own cut, a board picked and saved on this branch has no Tip Style on its
  blank and is carried over as a Phase 11 board — its two 12" fine-tunes get set to absorb the
  Phase 11 residual. Confined to the development database; the e2e suite runs signed out.
- Callers do not yet pass `{ tipStyle }` to `parseSnapshot`, so carry-overs take Pin deck (the
  out-of-the-box Tip Style) until the account default is wired (12-05).

## Verification

- `npx next typegen && npx tsc --noEmit` — clean.
- `npx vitest run` — 74 files, 2888 passed, 2 skipped (the pre-existing skips).
- `npm run lint` — 0 errors; 11 warnings, all in files this plan did not touch.
- `git diff --name-only main..HEAD -- components app e2e drizzle` — empty.
- `git diff main -- lib/geometry/pchip.ts package.json package-lock.json` — empty.
- Non-comment `ratio` / `guard` in `blank-fit.ts`: 0 / 0. `DEFAULT_BLANK_CUT` lines in `blank-fit.ts`: 2.
- `phase11TwelveInch` / `carryPhase11Blank` outside `phase11-foil.ts` and tests: only `lib/models/design-snapshot.ts`.
- No `version < 5` / `version === 4` / `version <= 4` in `design-snapshot.ts`.
- Human check (recorded, not stopped for, per end-of-phase mode): open a board in a blank on ROCKER
  and confirm the tips still read their settings and the centre the target; the 12" numbers and
  litres move to the new cut.

## Known Stubs

None. `cutOf` is transitional by design (deleted by 12-09) and fills a missing cut with the real
out-of-the-box values, not a placeholder.

## Threat Flags

None beyond the plan's register: `parseSnapshot` now runs geometry on read (T-12-02, mitigated — only
on a blank that already passed the bounded, pickable schema; offsets clamped to ±50 mm and a test
proves the clamped board re-parses); the three new blank keys are zod-bounded with all-or-none
(T-12-01, rejection tests for each malformed shape); the fixture's producer refuses to run unless the
Phase 11 code is tag v1.3's (T-12-03); the carry-over trigger is the blank's shape (T-12-04, tested
with each shape under the other version number).

## Self-Check: PASSED

- FOUND: scripts/extract-phase11-foil-golden.ts, lib/geometry/__fixtures__/phase11-foil-golden.json,
  lib/geometry/phase11-foil.ts, lib/geometry/phase11-foil.test.ts, and the eight modified files.
- FOUND commits: `710d915`, `03c0181`, `c610ac9`.
- All six named-test titles present (grep -cF each = 1) and passing.
