---
phase: quick-261016-mkb
plan: 01
status: complete
subsystem: geometry, database
tags: [custom-rocker, us-blanks-notation, golden, drizzle, neon, saved-blanks]
requires:
  - phase: quick-261015-ve9
    provides: the blank picker, the stars' browser list (starKey) and blankTipRockers' printed-figure rule
provides:
  - lib/geometry/custom-rocker.ts — the bend, the floor, the note's writer and reader, the figures as ordered, the two-line name, the popup's draft rules, prepareBoardBlank
  - BoardBlank.rocker and snapshot rule 8 (version still 5)
  - the store's setBlankRocker and pickBlank(record, placement, rocker?)
  - user_blanks (migration 0011, development branch only), app/actions/user-blanks.ts, lib/saved-blanks-preference.ts
  - account deletion removes saved blanks
affects: [quick-261016-mkb plan 02 (the ROCKER screen), quick-261016-mkb plan 03 (the name everywhere, go-live)]
actuals:
  tokens: 81000   # chars/4 over the realized diff, the generated golden and drizzle snapshot included; 34,000 hand-written
  tasks: 4
  commits: 6
tech-stack:
  added: []
  patterns:
    - "One helper prepares a board's blank (prepareBoardBlank); catalogue-level callers still prepare records"
    - "A bend is a step after the blank's own curve: a dense-knot pchip of natural + bend, levelled like every blank"
key-files:
  created:
    - lib/geometry/custom-rocker.ts
    - lib/geometry/custom-rocker.test.ts
    - lib/geometry/__fixtures__/custom-rocker-golden.json
    - reference/sketches/016-custom-rocker-maths.js
    - scripts/extract-sketch016-custom-rocker-golden.mjs
    - drizzle/0011_user_blanks.sql
    - app/actions/user-blanks.ts
    - lib/saved-blanks-preference.ts
    - lib/saved-blanks-preference.test.ts
    - lib/db/user-blanks-actions.test.ts
  modified:
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/design.ts
    - lib/geometry/before-after.ts
    - lib/models/design-snapshot.ts
    - components/design/design-store.tsx
    - lib/db/schema.ts
    - lib/db/account-deletion.ts
    - lib/clerk-webhook.ts
    - scripts/check-preference-columns.ts
key-decisions:
  - "Task 3 landed as ONE commit, not two: the account-deletion schema scan fails the moment user_blanks exists without its delete, so splitting would leave a red commit between them"
  - "parseRockerNote returns nose changes first, each end in written order (matching how the sketch's reader groups them), and is not normalised — it reports what the note says"
  - "A change whose amount rounds to 0\" is left out of the note (the sketch would print 0\"N); only reachable with an amount under 1/32\", which no slider can set"
  - "bendStartRange starts a first row at 4\" while its end has a second change (P-9's rule, which the behaviour list's \"3 … the centre\" did not spell out for that case)"
requirements-completed: [QT-261016-mkb]
duration: "4h 0m (about 35 min of building; the full browser suite took 3.5h, 1.8h of it a stall while the machine slept)"
completed: 2026-10-17
---

# Quick 261016-mkb Plan 01: The maths and storage for a blank's custom rocker — Summary

**A board can now carry its blank's rocker as ordered from the maker — US Blanks' notation, bent the maker's even way,
held above the blank's low point, saved with the board and prepared through one helper everywhere — proven against
the founder's own sketch, plus a home for a shaper's saved blanks (their account, or this browser). Nothing on any
screen changes yet.**

## What a board gains

- **A rocker as ordered.** A board's blank can carry changes like `-1/4"N18" +1/8"T36" +1/8"T18"`. Each change adds
  its amount × u² past its bend point (u is 0 where the bend starts and 1 at the tip), so the bend starts with no kink
  and reaches its full amount exactly at the tip. Two changes on one end stack: `+1/2"N +1/2"N18"` lifts the
  9'4"B's nose tip from 4 3/4" to 5 3/4" — exactly 1.000000" (the picture and the unit tests both show it).
- **The fit never moves.** Bending changes only the bottom curve: the five thicknesses, the fit verdict and the
  board's litres are identical with and without a custom rocker (unit-tested on the Longboard preset).
- **The same everywhere.** The design store, opening a saved board, the rack and summary pipeline, the
  before-and-after rules and three scripts all prepare a board's blank through `prepareBoardBlank` — so when plan 02
  draws it, the drawing, the station figures, the DATASHEET, the rack picture and the order form all read one bent blank.
- **Saved and reopened.** The rocker rides on the board's blank (snapshot rule 8). A malformed one opens on the
  natural rocker and never rejects the board; every board saved before reads exactly as it did. No board migration.
- **The floor (D-06).** No change can take any part of the blank below its low point: each Rocker slider will stop at
  the floor, rounded to its step (1/16", or 1 mm in Metric).
- **The note written and read the US Blanks way**, always in inches, and the blank's two-line name
  (`9'4"B` / `Natural`), ready for plans 02 and 03.
- **Saved blanks have a home.** A `user_blanks` table on the account (development database only), four sign-in-first
  actions that only ever touch the shaper's own rows, a browser list for a signed-out shaper, a cap of 100 each, and
  deleting an account deletes them too.

## Proven numbers

- The sketch's own code (a byte-for-byte copy, `reference/sketches/016-custom-rocker-maths.js`) generated
  `custom-rocker-golden.json`: 24 cases (12 changes × the 9'4"B and the 6'3"RP), 282 listing lines, 237 read. The
  script writes the same bytes every run (SHA-1 `72cf8b3c…` twice).
- `bendAt` matches the sketch's `delta` within 1e-9" at the five stations and 41 points of every case; the note
  matches `noteOf` on all 24; `floorOf` matches the sketch's floor on all 76 (board, change, system) combinations to
  the exact slider step; `parseRockerNote` matches the sketch's reader on all 282 of US Blanks' own listing lines.
- `-2"T` reaches −2" on the 9'4"B and stops at its floor, −1 3/4", on the 6'3"RP.
- At every printed station the bent curve reads exactly printed + bend (`===`).

## Gates

- Unit tests (`npx vitest run`): 149 files, 5,561 passed, 2 skipped (the same two as before), 0 failed.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean (exit 0).
- Saved boards on the development branch (read-only): `saved boards: 9 (v1 5, v2 0, v3 0, v4 1, v5 3); open: 9 of 9`.
- Full browser suite (`PW_PORT=3191 IS_WEBPACK_TEST=1`, all three projects): first run `6 failed, 902 skipped,
  1150 passed (3.5h)`. One failure was the iPhone's first ROCKER visit on a cold server (the same test passed on
  Android minutes later); the other five came straight after a test that "took" 1.8h — the machine slept mid-run and
  the dev server came back cold. Re-run alone on a fresh server, the five files holding all six (new-board,
  fit-defaults, keyboard-focus, legal-pages, blank-makers): `51 passed, 9 skipped, 0 failed (5.7m)`, including both
  Longboard DATASHEET tests.
- No desktop baseline re-recorded.

## The database (development only)

Migration `drizzle/0011_user_blanks.sql` only creates the table and its index (additive). The development branch was
migrated from this worktree and the read-only check then printed:

`user_blanks: id uuid, clerk_user_id text, copy jsonb, rocker jsonb, created_at timestamp with time zone, updated_at timestamp with time zone (6 of 6 columns)`

(before: `user_blanks missing (0 of 6 columns)`, migrations recorded 11 → 12). **Production is untouched.** At
go-live (plan 03) the founder runs the check → `npm run db:migrate:prod` → check, BEFORE the push that deploys — the
three commands are in `scripts/check-preference-columns.ts`'s header.

## The picture — `pictures/01-the-bend.png`

The 9'4"B and the 6'3"RP side-on at true proportion, nose on the left: the natural blank dashed under the blank bent as
ordered, red ticks where each bend starts, and the five station figures as ordered with the natural figure beneath
any that changed. What to look for: both nose tips lift exactly 1" for `+1/2"N +1/2"N18"` (4 3/4" → 5 3/4" and
4 1/4" → 5 1/4"); the dashed and solid lines are one line inside every bend point; `-2"T` on the 6'3"RP stops at its
floor, `-1 3/4"T`, with its tail tip at 1/16" instead of going below the centre. Drawn by the app's own functions; the
two scripts are archived in `pictures/shoot-source-01.tar.gz`.

## For the founder to confirm or overrule (planner's choices)

- **P-1 Metric amounts.** In Metric the Rocker slider steps 1 mm and the note rounds the amount to the nearest 1/16"
  (every whole mm from 1 mm reads at least 1/16"; the note is within 0.79 mm of the stored figure; at a Metric floor
  the note can read up to 1/32" past it — a −44 mm floor writes `-1 3/4"`). The drawing and tables show the stored mm.
- **P-2 Bend starts in Metric** moves in whole inches (part of the maker's order code), labelled in cm to one decimal
  (`45.7 cm in`) or `At the centre`.
- **P-5 Caps:** 100 saved blanks per account and 100 in a browser (largest saved blank 2,636 bytes; 100 ≈ 257 KB).
  The 101st reads: "You have 100 saved blanks — remove one in Pick a Blank to save another."
- **P-6 The centre is half the blank's length**, the app's centre everywhere else (the printed C differs on 33 of 219
  pickable blanks, by at most 0.005"; equal on the sketch's two blanks — the golden script refuses to run otherwise).
- **P-7 Floors on the real catalogue:** −2" from the centre is reachable at the nose on 184 of 219 blanks and at the
  tail on 155. Five US Blanks blanks (8'9"Y, 8'9"YX, 8'8" EPS, 8'8"X EPS, 9'6" EPS) can't be lowered from the centre at
  all (their slider stops at 0); from 12" or 24" in they can.
- **P-8 The low point:** the bent curve is re-levelled on its own true low point, never clamped, so even a hand-made
  spec past a floor draws honestly (unit-tested: `-2"T` on the 6'3"RP re-levels with its tail tip on the flat).
- **P-9 The second change's room:** while an end has a second change, its first change's Bend starts runs 4" to the
  centre; adding a second to an end whose first sits at 3" moves the first to 4"; a new second change starts at +1/8"
  from 18" in (or the nearest allowed point).
- **P-10 The reader is strict:** a note is read only when it is nothing but changes, at most two per end; `Natural`,
  `NAT` and an empty note read as natural. It agrees with the sketch's looser reader on all 282 listing lines.
- (P-3, P-4 and P-11 … P-23 belong to plans 02 and 03.)

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 (tracer) | 9ffe63ee | A board can carry its blank's rocker as ordered; one helper everywhere; rule 8; setBlankRocker |
| 2 | 704ea251 | The rules proven against the sketch: floor, second change, figures as ordered, note written and read |
| 3 | f7247169 | Saved blanks' home (table on development, actions, browser list) and account deletion removes them |
| 4 | 31dbd66c | The picture of the bend and its archived scripts |
| 4 | (this file) | This summary |

## Deviations from Plan

1. **[Rule 3 – blocking] Task 3 is one commit, not two.** `lib/db/account-deletion.test.ts`'s schema scan fails as
   soon as `user_blanks` exists without its delete, so the plan's two commits would have left a red commit between them.
   The one subject carries both sentences. Files: as planned. Commit f7247169.
2. **[Rule 1 – test arithmetic] The zero-slope test uses ±1" changes.** With the plan's ±0.01 mm central difference, a
   2" change from 18" reads 1.2e-6 per mm (the one-sided quadratic's own figure, amount·h/2span²), just over the 1e-6
   bound; at 1" it reads 6e-7. The bend's slope at the bend point is still exactly 0. Commit 9ffe63ee.
3. **[Rule 1] A snapshot test bend point moved from T36 to T30** — the test blank (Marko 6'0" M-Regular) is 72" long,
   so 36" in is its centre and normalises to "from the centre", correctly.
4. **`app/actions/account.ts`** changed only in a comment (the delete now names saved blanks); no compile fix needed.
5. **The browser list's identity is the note-bearing star key**, so two saved blanks whose amounts round to the same
   sixteenth count as one (by design — they write the same order code).

## Notes for plans 02 and 03

- `blankStarIdentity` for a custom blank is `[maker, "9'4\"B -1/4\"N18\" …"]`; the stars' reader caps a name at 120
  characters (`BLANK_TEXT_MAX`). Real names are short, but a long name with four changes should be checked when plan
  02 stars on save.
- "Export my designs" (the Your data page) does not yet include saved blanks — not in this plan's scope.
- `listSavedBlanks` reads at most 100 rows (the cap); a race past the cap could leave a 101st row unlisted until one is
  removed.

## Human verification deferred

None inside this plan (no checkpoints; the founder looks between plans). For the founder's look: `pictures/01-the-bend.png`
and the P-items above.

## Known Stubs

None — the display helpers, draft rules and saved-blank actions have no screen caller yet by design; plans 02 and 03 wire them.

## Threat Flags

None beyond the plan's threat model (T-mkb-01 … 06 all mitigated as planned: auth first, owner-scoped statements
pinned by ownership.test.ts, strict readers, caps, the third delete in the same batch).

## Self-Check: PASSED

All created files found; commits 9ffe63ee, 704ea251, f7247169 and 31dbd66c are on this branch; no `.ts/.js/.mjs/.cjs`
is tracked under `.planning/`; no file under `e2e/*-snapshots/` changed.
