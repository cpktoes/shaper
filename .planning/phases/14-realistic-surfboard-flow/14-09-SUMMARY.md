---
phase: 14-realistic-surfboard-flow
plan: 09
subsystem: models (saved-board reader), geometry (blank type)
status: complete
tags: [tips-step, D-02, D-06, D-24, R6, R8, acceptance-7, rollback-edge]
requires:
  - "14-05: lib/models/saved-board-open.test.ts (acceptance 7 and the rollback test written on the curves release's reader)"
  - "14-07: go-live 1 shipped, so tips code may land"
provides:
  - "BoardBlank.noseThinningStart?: Mm and BoardBlank.tailThinningStart?: Mm (lib/geometry/blank.ts)"
  - "BLANK_THINNING_START_MAX_MM = 5000 (lib/models/design-snapshot.ts)"
  - "boardBlankSchema: both fields as z.number().min(0).max(BLANK_THINNING_START_MAX_MM).optional().catch(undefined)"
  - "parseSnapshot: a start that reads Automatic leaves no key on the parsed blank"
affects: [14-10, 14-14, 14-17]
tech-stack:
  added: []
  patterns:
    - "Tolerant optional field: .optional().catch(undefined), then the key is deleted after parsing so Automatic is identical to never-set"
key-files:
  created: []
  modified:
    - lib/geometry/blank.ts
    - lib/models/design-snapshot.ts
    - lib/models/saved-board-open.test.ts
decisions:
  - "A start that reads as Automatic is removed from the parsed blank by a small helper (withoutAutomaticStarts) applied before the Phase 11 carry-over. It is needed: Zod 4's .catch(undefined) leaves the key present with an undefined value for a corrupt start (measured: {a:'x'} parses to {a: undefined}), while an absent key stays absent."
  - "The two starts are written inline in boardBlankSchema, each with its own .catch(undefined), exactly as the plan states; the refine counting the cut is untouched."
metrics:
  duration: "about 12 minutes"
  completed: 2026-10-02
  tasks: 2
  files: 3
actuals:
  tokens: 4600    # chars/4 over the realized diff (18,500 chars)
  tasks: 2
  commits: 2
---

# Phase 14 Plan 09: A board can remember where each tip's thinning starts. Summary

**A board's blank can now store two optional distances: where the nose's thinning starts and where the tail's does, in millimetres in from that tip. When either is missing, that tip is on Automatic. That covers every board saved so far, every preset and every new board. A stored value is read forgivingly. Anything that is not a number, or is below 0 or past 5,000 mm, reads as Automatic and never stops a board opening. Opening a board never rewrites what it stores. There is no database change, and the saved-board version stays 5.**

## What this means for a shaper

- **Nothing on any screen changed yet.** This plan only gives a board somewhere to keep the two numbers. The Thinning Starts slider that sets them, and the drawing that uses them, come in later plans (14-10, 14-14).
- **Every board you already have opens exactly as before**, on Automatic at both tips.
- **A damaged value can't lock you out of a board.** That tip simply goes back to Automatic. The rest of the board, including a good start on the other tip, opens as stored.
- **Going back to Automatic leaves no trace.** A board set back to Automatic saves byte for byte the same as one that never had a start. That means there's no phantom "unsaved change".
- **If the site is ever rolled back to the curves release**, a board saved with a start still opens there with both tips on Automatic. Plan 14-05 proved that on that release's own reader.

## The two field names (later plans import these exactly)

- `noseThinningStart` and `tailThinningStart` on the board's blank (`design.blank` in a saved board), in millimetres in from that tip. If a key is absent, that tip is on Automatic.
- `BLANK_THINNING_START_MAX_MM = 5000` is exported from `lib/models/design-snapshot.ts`.

## What was built

1. **`lib/geometry/blank.ts`**: `BoardBlank` gains `noseThinningStart?: Mm` and `tailThinningStart?: Mm`, after `fineTuneSurface`. Each has its own doc comment:
   - absent means Automatic;
   - only the Thinning Starts slider sets it, and its Automatic button removes it;
   - it is not part of `BlankCut` and is not counted by the cut's "all three or none" rule.
2. **`lib/models/design-snapshot.ts`**:
   - The exported `BLANK_THINNING_START_MAX_MM = 5000`.
   - Both fields added to `boardBlankSchema`, with the refine unchanged.
   - `withoutAutomaticStarts`, applied to the kept blank before the Phase 11 carry-over. It returns a new object and never writes to the parsed value.
   - Header rule 6, with the header updated to "Six rules".
   - `DESIGN_SNAPSHOT_VERSION` stays 5.
3. **`lib/models/saved-board-open.test.ts`**:
   - **The rollback test** is retitled `a board saved after the tips step still opens on the curves release (the rollback edge — proven on that release's own reader by plan 14-05)`. It now asserts four things:
     - version 6 parses;
     - an unknown blank key (`futureField`) is still dropped;
     - `645` is now kept;
     - `"abc"` now reads Automatic and leaves no key.
   - **New describe `where each tip's thinning starts, stored on the blank (D-24)`:**
     - Valid starts are kept exactly, including both ends of the bound (0 and 5000).
     - When a start is absent, no key appears.
     - `"x"`, `null`, `-3` and 5001 each parse without throwing, leave no key, and give the same board as one with no start.
     - A corrupt start on one tip doesn't cost the other tip its valid one.
     - A Phase 11 version-4 board carries no start.
     - A board with both starts round-trips through save.
     - A board back on Automatic is byte-identical to one that never had a start.
     - A deep-frozen board, with valid or with corrupt starts, is unchanged by opening.
     - A preset's blank sets no start.
   - **Task 2 test `the stored start needs no database change and no account setting (D-06)`:** it reads `lib/db/schema.ts` and finds `snapshot: jsonb("snapshot")` and no mention of a start. Every `*fit-defaults*` file under `lib/` and every migration under `drizzle/` also mentions none.

## Verification

- `npx vitest run lib/models/saved-board-open.test.ts lib/models/design-snapshot.test.ts lib/models/rack-models.test.ts`: 3 files passed. After Task 1, 80 tests passed. After Task 2, `saved-board-open.test.ts` alone passed 21 of 21.
- A wider run of `lib/models`, `lib/blanks`, `phase11-foil.test.ts` and `lib/geometry/blank*` passed: 15 files, 393 tests.
- `npx next typegen` then `npx tsc --noEmit`: exit 0. `npx eslint` on the three files: exit 0.
- Acceptance greps:
  - `ThinningStart?: Mm` in blank.ts: 2.
  - `BLANK_THINNING_START_MAX_MM` in design-snapshot.ts: 4.
  - `catch(undefined)`: 2.
  - `DESIGN_SNAPSHOT_VERSION = 5`: one line.
  - The Task 2 title: 1.
- `git diff --stat 9275b7b -- drizzle lib/db/schema.ts lib/fit-defaults-preference.ts package.json package-lock.json lib/models/design-snapshot.test.ts lib/geometry/phase11-foil.test.ts` is empty. No database change, no new package, and the Phase 11 guard tests are byte-identical.
- Tracer gate: Task 1's verify was re-run after its commit and passed. Per ruling 9, there was no human stop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Type error in the new helper**
- **Found during:** Task 1. `tsc` rejected assigning a generic object to `Record<string, unknown>`.
- **Fix:** I wrote the shallow copy as an explicit cast. No behaviour changed.
- **Files modified:** lib/models/design-snapshot.ts
- **Commit:** 06ddac5

### Notes

- **[Addition] More cases than the plan listed.** These are all in the plan's own test file:
  - both ends of the bound are kept;
  - a corrupt start on one tip doesn't drop a valid start on the other;
  - a frozen board with corrupt starts isn't rewritten by opening;
  - Task 2 also checks every migration file and every `*fit-defaults*` file under `lib/`, not only `fit-defaults-preference.ts`.
- **[Test layout] Task 2's test sits in its own describe, `where the start is kept`.** That keeps the exact title string to one occurrence, as the acceptance grep requires.
- No file outside `files_modified` was touched.

## Known Stubs

None. The fields are complete, but no code writes them yet. That is by design: the slider, store and profile come in plans 14-10, 14-14 and 14-17.

## Threat Flags

None. There is no new surface.
- **T-14-18 and T-14-19:** each start is bounded and read forgivingly, with a test for each malformed shape.
- **T-14-20:** the rollback test is kept and extended.

## Self-Check: PASSED

- FOUND: lib/geometry/blank.ts, lib/models/design-snapshot.ts, lib/models/saved-board-open.test.ts
- FOUND: 06ddac5 (Task 1), 804c4a6 (Task 2)
