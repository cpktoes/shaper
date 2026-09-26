---
phase: 11-rocker-from-real-blanks
plan: 05
subsystem: database
status: complete
tags: [blanks, catalogue, drizzle, neon, seed, migration, R7, R8, R9]
requires:
  - "11-01: lib/blanks/seed-files.ts readSeedCatalog(dir?), lib/blanks/catalog.ts isPickable, lib/geometry/blank.ts BlankRecord/BlankStation"
provides:
  - "lib/db/schema.ts — blanks table (jsonb stations, uniqueIndex blanks_vendor_name_idx), BlankRow"
  - "lib/db/blanks.ts — BlankCatalogResult, BlankReadRow, BlankInsertRow, blankRecordToRow, blankRowToRecord, loadPickableBlanks (never rejects)"
  - "drizzle/0004_blanks.sql + meta/0004_snapshot.json + journal tag 0004_blanks"
  - "scripts/seed-blanks.ts — idempotent single-statement upsert; --check read-only counts + exact CSV comparison"
  - "playwright.config.ts webServer.env SHAPER_BLANKS_SOURCE=seed-csv"
affects: [11-06, 11-11, 11-13]
tech-stack:
  added: []
  patterns:
    - "public owner-less read kept in its own file, held to a stricter ownership contract than queries.ts"
    - "fail-soft server loader: every failure and an empty table resolve to { status: 'unavailable' }"
    - "seed script loads its env file before dynamically importing the db client"
key-files:
  created:
    - lib/db/blanks.ts
    - lib/db/blanks.test.ts
    - scripts/seed-blanks.ts
    - drizzle/0004_blanks.sql
    - drizzle/meta/0004_snapshot.json
  modified:
    - lib/db/schema.ts
    - lib/db/ownership.test.ts
    - playwright.config.ts
    - drizzle/meta/_journal.json
decisions:
  - "Stations stored as one jsonb list, not a normalised stations table: D-01's copy into a board is a straight object copy, and per-station columns become impossible (recorded in the schema header)"
  - "loadPickableBlanks also returns unavailable when rows exist but none is pickable (all malformed or all non-pickable) — a catalogue with nothing to pick is one that did not load, never 'No blank is long enough'"
  - "The seed's --check also compares every stored blank with its CSV record at full precision and exits 1 on any difference (proves R8 and RESEARCH Pitfall 2 against the real database, not just in a unit test)"
  - "Worktree database recipe that worked: run from the WORKTREE with the env file named explicitly — MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate, and SEED_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/seed-blanks.ts. The plan's main-checkout form (cd main && npx --no-install tsx --tsconfig <wt>/tsconfig.json <wt>/scripts/seed-blanks.ts --check) also works"
metrics:
  duration: "about 10 minutes"
  completed: 2026-09-26
actuals:
  tokens: 9500
  tasks: 2
  commits: 3
---

# Phase 11 Plan 05: The blank catalogue in the database, and one safe read — Summary

All 162 vendor blanks now live in the development database, one row each, their stations kept exactly as the catalogues printed them. Seeding again changes nothing. The ROCKER screen has one read that hands it every blank a shaper can pick (158). If the catalogue isn't there it says "the catalog didn't load" and doesn't break. Browser tests, which have no database, read the same catalogue from the committed CSVs.

## What a shaper gains (plain English)

- **The real catalogues are in the database.** The table holds 101 US Blanks, 33 Arctic Foam and 28 Marko Foam blanks. Every station value reads back exactly as its CSV row, and an empty cell is still empty, never 0. Nothing smoothed or interpolated is stored. The curves are drawn on top of these raw numbers, so the curve method can change later without touching the data.
- **Re-seeding is safe.** Running the seed twice updated the same 162 rows and added none.
- **The page can't be broken by the catalogue.** The live site will run this code before the founder migrates and seeds production (11-13). Until then the read reports "unavailable": the table is missing, empty or unreachable. The ROCKER screen will then say "The blank catalog didn't load" rather than falsely saying no blank is long enough.
- **Only real blanks are offered.** The four Marko stand-up paddleboard blanks with missing thicknesses stay stored but are never listed. The rule is applied when the list is read, so no stored flag can drift from it.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 (tracer, TDD) | `blanks` table in the schema, `lib/db/blanks.ts` (row mapping + `loadPickableBlanks`), 12 new behaviour tests, 5 new ownership assertions, Playwright `SHAPER_BLANKS_SOURCE=seed-csv` | `80cb840` |
| 2 [BLOCKING] | Migration `0004_blanks` generated, applied to the Neon development branch; `scripts/seed-blanks.ts`; seeded twice and checked | `c2a67b7` |

Task 1's RED run failed for the right reason: `./blanks` did not exist. Per the orchestrator's one-commit-per-task ruling, the test and the implementation went in as one commit.

## Database evidence (Neon development branch only)

Migrate, from the worktree: `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate` exited 0 with "migrations applied successfully!". That line proves nothing on its own, so the read-only check ran straight afterwards and showed the table present and empty:

```
--check (before seeding):  blanks: 0 (US Blanks 0, Arctic Foam 0, Marko Foam 0); pickable: 0
                           matching the catalogue CSVs exactly: 0 of 162
seed run 1:                blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158
                           matching the catalogue CSVs exactly: 162 of 162
seed run 2:                blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158
                           matching the catalogue CSVs exactly: 162 of 162
--check (after both runs): blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158
                           matching the catalogue CSVs exactly: 162 of 162
```

The plan's own verify command also printed the count line: it runs from the main checkout with `--tsconfig <worktree>/tsconfig.json <worktree>/scripts/seed-blanks.ts --check`.

**Recipe for 11-06 (the orchestrator asked for this):** run from inside the worktree and name main's env file explicitly. For migrations: `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate`. `drizzle.config.ts`'s own loader reads that file, and `out: "./drizzle"` resolves against the worktree, so the new migration is found. No `cd` and no `--config` are needed. The seed uses the same pattern with `SEED_ENV_FILE`. No `.env*` file was read, printed, copied or written by hand. Production was not touched.

## Verification

- `npx vitest run lib/db/blanks.test.ts lib/db/ownership.test.ts lib/auth/open-access.test.ts`: 3 files, 27 tests, all pass.
- `npx vitest run` (whole suite): 69 files, 2,643 passed, 2 skipped (both skips were already there).
- `npx tsc --noEmit`: exit 0, after `npx next typegen` once.
- `npm run lint`: 0 errors. The 12 warnings are the same ones that were there before this plan.
- `grep -rn SHAPER_BLANKS_SOURCE --include=*.ts` lists only `playwright.config.ts`, `lib/db/blanks.ts` and `lib/db/blanks.test.ts`.
- `lib/db/queries.ts` still exports 3 functions. It is unchanged.
- `git diff --name-only` shows no change to `package.json` or `package-lock.json` (D-20).
- `drizzle/0004_blanks.sql` contains `CREATE TABLE "blanks"` and `blanks_vendor_name_idx`. The journal has `idx 4`, tag `0004_blanks`. The SQL body and the snapshot are exactly as drizzle-kit generated them.
- The main checkout's `drizzle/` gained nothing (checked with `ls`).
- `sql.raw` appears once in the seed, inside `excluded(column)`, and it is only ever given `blanks.<column>.name`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] A catalogue with nothing pickable is "unavailable", not "ok" with an empty list**
- **Found during:** Task 1
- **Issue:** The plan returns unavailable only for zero *usable rows*. But rows that all fail the shape check, or that are all non-pickable, would return `{ status: "ok", blanks: [] }`. The screen would then say "No blank is long enough", which is the false E1 message the empty-table rule exists to prevent.
- **Fix:** Unavailable whenever the pickable list is empty. Two tests cover this: all rows malformed, and all rows non-pickable.
- **Commit:** `80cb840`

**2. [Rule 1 - Bug] The shape check must not accept numbers stored as text**
- **Found during:** Task 1
- **Issue:** An early draft used the global `isFinite`, which accepts the text `"900"` as a number.
- **Fix:** Every numeric check now uses `typeof value === "number" && Number.isFinite(value)`. Tests now reject a text distance, a text length and a fractional PDF page.
- **Commit:** `80cb840`

**3. [Rule 2 - Correctness] The seed's `--check` proves exact values, not just counts**
- **Found during:** Task 2
- **Issue:** Matching counts cannot show that a station value survived the database round trip at the CSV's own precision (orchestrator ruling 6, RESEARCH Pitfall 2).
- **Fix:** Every run also prints `matching the catalogue CSVs exactly: N of 162`, comparing each stored blank to its CSV record with full-precision JSON. It exits 1 on any difference. The required count line is unchanged and still comes first.
- **Commit:** `c2a67b7`

**4. [Rule 3 - Blocking] The seed uses a `main()` function rather than top-level await**
- **Found during:** Task 2
- **Issue:** `package.json` has no `"type": "module"`, so tsx runs a `.ts` script as CommonJS, and top-level `await` is not allowed there.
- **Fix:** Wrapped the script in `main().catch(...)`, which prints a plain message and sets exit code 1.

## Watch item for 11-11 (not a defect in this plan's files)

`lib/blanks/seed-files.ts` (from 11-01) computes `SEED_CSV_DIR` at module load with `new URL("../../db/seed/blanks/", import.meta.url)`. Webpack and Turbopack both treat `new URL(<literal>, import.meta.url)` as an asset reference. When the ROCKER page first bundles `lib/db/blanks.ts`, which imports seed-files dynamically, the bundler may try to resolve that directory as an asset. This plan passes its own `process.cwd()` directory, but the module-level constant is still evaluated. No page imports `lib/db/blanks.ts` yet, so neither the build nor the dev server can show whether this bites. The first `IS_WEBPACK_TEST=1` Playwright run and `npm run build` after 11-11 will.

## Known Stubs

None.

## Human verification deferred to end-of-phase UAT

None for this plan. It changes no screen. The tracer's check is automated (the unit tests plus the database counts above), and the "The blank catalog didn't load" state is drawn in 11-11.

## Threat Flags

None beyond the plan's threat model. Every mitigation it lists is in place:
- T-11-11: read-only by construction, enforced by the ownership test.
- T-11-13: bounded, explicitly projected, never rejects.
- T-11-14: parameterised insert; `sql.raw` gets schema column names only.
- T-11-15: the env file is loaded, never printed.
- T-11-16: the variable is grep-checked to one config file.
- T-11-SC: `npx --no-install` everywhere.

## Self-Check: PASSED

- All nine `files_modified` paths exist in the worktree.
- Commits `80cb840` and `c2a67b7` are present in `git log`.
