---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 02
subsystem: database, geometry display boundary
status: complete
tags: [drizzle, migration, user-preferences, planer-passes, units]
requires: []
provides:
  - userPreferences.planerMaxDepthMm / deckSkinMm / tipStyle (nullable columns, development branch migrated)
  - drizzle/0006_deck_skin_planer_tip_style.sql (additive only, waiting for the founder's production run in 12-10)
  - scripts/check-preference-columns.ts (read-only proof, CHECK_ENV_FILE)
  - planerPasses(depth, passDepth, system) and formatPasses(n) in lib/geometry/measure-display.ts
affects: [12-03 (reads the three columns), 12-05 (imports planerPasses / formatPasses), 12-10 (production migrate + check)]
tech-stack:
  added: []
  patterns:
    - "Pass counts come from the printed numbers (1/16\" or whole mm, same 1e-9 nudge as the formatters)"
    - "Read-only DB proof script that loads its own env file (CHECK_ENV_FILE), mirroring seed-blanks.ts"
key-files:
  created:
    - drizzle/0006_deck_skin_planer_tip_style.sql
    - drizzle/meta/0006_snapshot.json
    - scripts/check-preference-columns.ts
  modified:
    - lib/db/schema.ts
    - drizzle/meta/_journal.json
    - lib/geometry/measure-display.ts
    - lib/geometry/measure-display.test.ts
decisions:
  - "The check script's migration count reads drizzle.__drizzle_migrations; it printed 6 before and 7 after, a second proof that 0006 actually ran."
  - "The imperial read-back in the pass-count sweep writes a bare fraction with an explicit 0 whole part, working around a parseImperial bug found here (see Deferred Issues)."
metrics:
  duration: "about 12 minutes"
  completed: 2026-09-26
actuals:
  tokens: 6050
  tasks: 2
  commits: 3
---

# Phase 12 Plan 02: New settings columns and the planer-pass count, Summary

Each shaper's account now has three empty-until-chosen slots on the development database (Planer
Max Depth, Deck Skin, Tip Style), proven there by a new read-only check. The app can also count
planer passes from the two numbers the screen prints, so a shaper dividing them by hand always gets
the same count.

## What a shaper gains

- **Somewhere for three new defaults to live.** The account settings row gains `planer_max_depth_mm`,
  `deck_skin_mm` and `tip_style`. All three start empty ("not chosen yet"), like every other setting.
  Nothing reads them yet; plan 12-03 connects them to the gear menu. The retiring Extra Center
  Thickness setting stays in the database untouched (D-19). It is removed only after the new version
  is live.
- **A pass count you can check by hand.** `planerPasses` divides the foam to come off by the Planer
  Max Depth and rounds up to whole passes. It works from the numbers *as printed*: 1/16" in Imperial,
  whole millimetres in Metric. `formatPasses` reads `1 pass`, `0 passes`, `3 passes`.
  - The UI contract's reference board is the Marko 6'0" M-Regular, with a 1/8" skin and a 2 1/2"
    centre. It reads **5/16" at 1/8" = 3 passes** in Imperial and **7 mm at 3 mm = 3 passes** in
    Metric. The test computes this from the catalogue CSV; it is not copied from the contract.
  - The same board can read one pass different in the two systems. For example, 3/8" at 1/8" a pass
    is 3 passes, while the metric screen prints 10 mm at 3 mm, which is 4. Between 0 and 1" there are
    17 such depths (at 1/64" steps), and none differs by more than one pass. No stored number changes
    when the shaper switches systems.

## Database evidence (Neon development branch only)

The order ran exactly as the plan's executor notes set out, all from inside the worktree.

1. Generate: `npm run db:generate -- --name deck_skin_planer_tip_style`. This wrote `drizzle/0006_deck_skin_planer_tip_style.sql`, which holds exactly these three lines and no DROP:
   ```
   ALTER TABLE "user_preferences" ADD COLUMN "planer_max_depth_mm" double precision;--> statement-breakpoint
   ALTER TABLE "user_preferences" ADD COLUMN "deck_skin_mm" double precision;--> statement-breakpoint
   ALTER TABLE "user_preferences" ADD COLUMN "tip_style" text;
   ```
   It also wrote the journal entry (idx 6, tag `0006_deck_skin_planer_tip_style`) and `0006_snapshot.json`. Neither was hand-edited. drizzle-kit offered no rename and no drop.
2. Check **before** migrating: `CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`, exit **1**:
   ```
   user_preferences: planer_max_depth_mm missing, deck_skin_mm missing, tip_style missing (0 of 3 new columns); extra_center_thickness_mm kept
   drizzle migrations recorded: 6
   ```
3. Migrate: `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate`. It reported "migrations applied successfully!", which on its own proves nothing.
4. Check **after** migrating (same command), exit **0**:
   ```
   user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text (3 of 3 new columns); extra_center_thickness_mm kept
   drizzle migrations recorded: 7
   ```

No `.env*` file was read, printed, copied or written by hand. Both env files were named only as a
variable on their own command. Production was not touched. Plan 12-10 (the founder) runs
`npm run db:migrate:prod` and the same check, **before** the deploy.

## Verification

- `grep -c "ADD COLUMN"` on the migration prints 3. `grep -ci drop` prints 0.
- `lib/db/schema.ts` has `planer_max_depth_mm`, `deck_skin_mm` and `tip_style`, and still has `extra_center_thickness_mm`.
- The check script never prints the connection string: `grep -c "console.log(process.env\|DATABASE_URL}"` prints 0.
- `grep -c "25.4" lib/geometry/measure-display.ts` prints 0. The test file does not contain `7.49`. It uses `parseImperial`, `parseMetric` and `readSeedCatalog`.
- `npx next typegen` ran once, then `npx tsc --noEmit` exited 0.
- `npx vitest run lib/geometry/measure-display.test.ts lib/units-isolation.test.ts`: 105 passed.
- `npx vitest run` (whole suite): 73 files, 2,870 passed, 2 skipped (both skips were already there).
- `npm run lint`: 0 errors. There are 11 warnings, none in this plan's files (`npx eslint` on the four TypeScript files is clean).
- `git diff --name-only f8b6f1b..HEAD` lists exactly the seven planned files. Nothing under `components/`, `app/` or `e2e/` changed, nor `lib/db/queries.ts`, `lib/fit-defaults-preference.ts`, `package.json` or `package-lock.json`.
- The tracer gate for Task 1 passed: after the migrate, the check exited 0 and the typecheck was clean. No human stop was needed (end-of-phase mode). The human check is the before/after output pasted above.

## Deviations from Plan

**1. [Rule 3 - Blocking, test only] The imperial read-back works around a parser bug**
- **Found during:** Task 2 (GREEN run).
- **Issue:** `parseImperial` misreads a bare fraction whose numerator has two digits. `11/16"` comes back as 1 1/16". Its whole-number group takes the first "1" of "11", and the fraction group takes `1/16`. `13/16"` becomes 1 3/16" and `15/16"` becomes 1 5/16". With a whole part in front (`1 11/16"`, `0 11/16"`) it reads correctly. This made the sweep's expected count wrong at 11/16", 13/16" and 15/16". The new `planerPasses` was right in every case.
- **Fix (test only):** `printedBack` in the test writes a bare imperial fraction as `0 11/16"` before parsing it, so it still reads back through the app's own parser. A comment in the test marks this as a known bug. Once `parseImperial` is fixed, the workaround can be deleted and the sweep must pass unchanged.
- **Not fixed:** `lib/geometry/units.ts` is outside this plan's seven files, and every other `lib/geometry/` file belongs to sibling plan 12-01 this wave.
- **Commit:** 74bb7c2

**2. [Process] Task 2 has two commits (test, then feat), not one**
The plan marks Task 2 `tdd="true"`, so the RED/GREEN gates each have their own commit. Both commits carry the `12-02` scope and the trailer.

## Deferred Issues

- **parseImperial misreads `11/16`, `13/16`, `15/16` typed with no whole inch.** This is a real, pre-existing bug that affects shapers. In any imperial typed field (for example a mark, a tip thickness or a rocker height), typing `11/16` stores 1 1/16". That is 3/8" too much, with no error shown. A one-line fix to the regex in `lib/geometry/units.ts` `parseImperial` would solve it, for example letting the whole part match only when a space or the end of the string follows it. A regression test should cover `11/16"`, `13/16"`, `15/16"` and `6'11/16"`. This should be a follow-up quick task. It was not added to `deferred-items.md` or `WINDOWS.md` because both are outside this plan's allowed files; the orchestrator should record it.

## TDD Gate Compliance

- RED: `65e418e test(12-02): …`. 5 tests failed before the functions existed.
- GREEN: `74bb7c2 feat(12-02): …`. All pass.
- REFACTOR: not needed.

## Known Stubs

None. The three columns are deliberately unread until 12-03 (the plan's own sequencing), and the pass functions are wired into the screen by 12-05.

## Threat Flags

None. The only new surface is the read-only check script. It is covered by T-12-05: it prints column names, types and a count only.

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 | 7b2181a | Three new settings columns, migration 0006, read-only check script |
| 2 (RED) | 65e418e | Failing tests for the pass count |
| 2 (GREEN) | 74bb7c2 | `planerPasses` and `formatPasses` |

## Self-Check: PASSED

- All seven files exist on disk: `drizzle/0006_deck_skin_planer_tip_style.sql`, `drizzle/meta/0006_snapshot.json`, `drizzle/meta/_journal.json`, `scripts/check-preference-columns.ts`, `lib/db/schema.ts`, `lib/geometry/measure-display.ts`, `lib/geometry/measure-display.test.ts`.
- All three commits exist on this branch: 7b2181a, 65e418e, 74bb7c2.
- STATE.md and ROADMAP.md were not touched.
