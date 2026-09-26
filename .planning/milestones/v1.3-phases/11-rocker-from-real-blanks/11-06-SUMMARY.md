---
phase: 11-rocker-from-real-blanks
plan: 06
subsystem: database
status: complete
tags: [preferences, fit-defaults, drizzle, neon, migration, server-action, D-09, R2, R5, R12]
requires:
  - phase: 11-02
    provides: "lib/fit-defaults-preference.ts: FIT_DEFAULTS_KEYS, parseFitDefaultValue, parseFitDefaultsCookieValue, decideFitDefaultsHandoff, FIT_DEFAULTS_COOKIE_NAME, EMPTY_FIT_DEFAULTS_PREFERENCE"
  - phase: 11-05
    provides: "migration 0004_blanks as the journal's previous entry; the worktree migrate recipe (MIGRATE_ENV_FILE)"
provides:
  - "user_preferences columns extra_length_mm, extra_center_thickness_mm, width_margin_mm, nose_tip_thickness_mm, tail_tip_thickness_mm (double precision, nullable, no default)"
  - "drizzle/0005_fit_defaults.sql, drizzle/meta/0005_snapshot.json, journal tag 0005_fit_defaults — applied to the Neon DEVELOPMENT branch"
  - "readFitDefaultsPreference(clerkId) in lib/db/queries.ts"
  - "resolveFitDefaultsHandoff() in lib/fit-defaults-server.ts"
  - "saveFitDefaultsPreference(values) in app/actions/fit-defaults.ts — the only export"
affects: [11-08, 11-11, 11-13]
tech-stack:
  added: []
  patterns: ["third instance of the account-preference pattern (units, print toggle, fit defaults): nullable columns, projection-only read, fail-soft server resolver, auth-first upsert action"]
key-files:
  created:
    - lib/fit-defaults-server.ts
    - app/actions/fit-defaults.ts
    - drizzle/0005_fit_defaults.sql
    - drizzle/meta/0005_snapshot.json
  modified:
    - lib/db/schema.ts
    - lib/db/queries.ts
    - lib/db/ownership.test.ts
    - drizzle/meta/_journal.json
decisions:
  - "saveFitDefaultsPreference treats a MISSING field the same as an invalid one and writes nothing: the client always sends all five (null for not chosen), so a partial object can only be a crafted call. This is stricter than 'null or valid' and never writes half a preference."
  - "The read-only database proof uses a scratchpad script (outside the repo) that loads the env file the same way drizzle.config.ts does, prints only column names/types and a row count, and never prints a value or a connection string."
metrics:
  duration: "about 4 minutes"
  completed: 2026-09-26
actuals:
  tokens: 5500
  tasks: 2
  commits: 3
---

# Phase 11 Plan 06: Fit and tip defaults on the shaper's account — Summary

**A shaper's five fit and tip defaults (Extra Length, Extra Center Thickness, Width Margin, Nose Tip, Tail Tip) now have five empty-until-chosen columns on their saved preferences, applied to the development database. A read fetches only those five. A server lookup for the first paint can't break a page. One save action checks who is signed in before it writes anything.**

## What this does for a shaper

- **The numbers that decide which blanks fit are now per shaper.** The 2" extra length, 3/8" extra centre thickness and 1" width margin are no longer fixed. Each shaper's own values can be saved on their account, and 11-11's blank list will read them. The same goes for the nose and tail tip thicknesses a new board starts from.
- **An empty column means "not chosen".** Until a shaper sets a value, it stays empty and the app shows the standard default. The Imperial/Metric setting works the same way.
- **The live site can't be broken by the order of deployment.** The live site will run this code before the founder migrates production (11-13). Until then, the account lookup fails quietly. The page then shows whatever the browser remembers, or the standard defaults.
- **Only you can save your defaults.** The save action reads who is signed in from the session before it touches the database. It takes no "whose account" argument. It refuses the whole save if any of the five numbers is out of range or not a real number.

The gear-menu row and dialog that use all of this arrive in 11-08, which also wires the lookup into the root layout.

## Tasks

| Task | What | Commit |
|------|------|--------|
| 1 (tracer) | Five nullable columns in the schema; `readFitDefaultsPreference` (five-column projection, each through `parseFitDefaultValue`); `resolveFitDefaultsHandoff` (session + cookie + try/catch account read → `decideFitDefaultsHandoff`); `saveFitDefaultsPreference` (auth first, signed-out no-op, allow-list on every field, upsert on `clerkUserId`); ownership guards extended | `05891a5` |
| 2 [BLOCKING] | Migration generated, renamed to `0005_fit_defaults`, applied to the Neon development branch and proven read-only | `904c266` |

## Database evidence (Neon development branch only)

Generated from the worktree with `npm run db:generate` as `drizzle/0005_damp_the_watchers.sql`, then renamed to `drizzle/0005_fit_defaults.sql`. The journal tag was changed to match. The SQL body and snapshot were not hand-edited. The file holds exactly five statements and nothing touching `blanks` or `models`:

```
ALTER TABLE "user_preferences" ADD COLUMN "extra_length_mm" double precision;
ALTER TABLE "user_preferences" ADD COLUMN "extra_center_thickness_mm" double precision;
ALTER TABLE "user_preferences" ADD COLUMN "width_margin_mm" double precision;
ALTER TABLE "user_preferences" ADD COLUMN "nose_tip_thickness_mm" double precision;
ALTER TABLE "user_preferences" ADD COLUMN "tail_tip_thickness_mm" double precision;
```

The main checkout's `drizzle/` gained nothing; `git status` showed the three files only in this worktree.

**Before migrating** (read-only check, `information_schema.columns` plus a five-column `select ... limit 1`):

```
user_preferences columns: clerk_user_id, units, created_at, updated_at, print_rail_instructions
select of the five columns: FAILED — column "extra_length_mm" does not exist
drizzle migrations recorded: 5
```

**Migrate**, run from the worktree: `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate` exited 0 and printed `[✓] migrations applied successfully!`.

**After migrating:**

```
  extra_length_mm            double precision  nullable=YES  default=null
  extra_center_thickness_mm  double precision  nullable=YES  default=null
  width_margin_mm            double precision  nullable=YES  default=null
  nose_tip_thickness_mm      double precision  nullable=YES  default=null
  tail_tip_thickness_mm      double precision  nullable=YES  default=null
select of the five columns: OK (1 row(s) returned, values not printed)
drizzle migrations recorded: 6
```

**Re-run**: the same migrate command again exited 0. The count stayed at 6 migrations recorded, so the re-run changed nothing.

No `.env*` file was read by hand, printed, copied or written. The check script loads the env file itself, the way `drizzle.config.ts` does, and it lives in the session scratchpad, not the repo. Production was not touched: `db:migrate:prod` is the founder's step after the deploy (11-13).

## Verification

- `npx vitest run lib/db/ownership.test.ts lib/auth/open-access.test.ts lib/fit-defaults-preference.test.ts`: 3 files, 44 tests, all pass. This includes the new `app/actions/fit-defaults.ts exports exactly the expected action and no others`. The new action is also covered by the auth-before-database test, the no-owner-parameter test and the owned-table scoping loop.
- `npx vitest run` (whole suite): 71 files, 2,741 passed, 2 skipped (both skips were already there).
- `npx tsc --noEmit` (after `npx next typegen`): exit 0.
- `npm run lint`: 0 errors. The 12 warnings are all in `scripts/*.mjs` and were already there; none are in this plan's files.
- `grep -c "select()" lib/db/queries.ts` prints 0: every read is a projection.
- Plan verify: `grep -c "ADD COLUMN"` prints 5, and the journal holds `0004_blanks` (idx 4) and `0005_fit_defaults` (idx 5).

## Human verification deferred to end-of-phase UAT

- None specific to this plan. Nothing a shaper can see changes until 11-08 adds the gear-menu row and dialog. The end-to-end check (set a default, sign in on another device, see it follow) belongs to that plan's UAT.

## Deviations from Plan

- **Migrate command form.** Per orchestrator ruling 3, the migrate ran from the worktree with `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate`, the form 11-05 proved. The plan's older `cd <main> && npx drizzle-kit migrate --config <worktree>/...` form was not needed. The target database is the same development branch.
- **Missing field refuses the write.** The plan says each field must be `null` or pass `parseFitDefaultValue`. A field that is absent altogether is treated as failing, so nothing is written. This is a slightly stricter reading of the same rule (see decisions).

Otherwise the plan was executed exactly as written.

## Threat model coverage

- T-11-17: identity comes only from `await auth()`, the first statement in the action. There is no owner parameter, and the upsert is keyed on the session's `clerkUserId`. All of this is asserted by `lib/db/ownership.test.ts`.
- T-11-18: every field must be `null` or pass `parseFitDefaultValue`, and any failure refuses the whole write. The upsert is a parameterised Drizzle call, with no raw SQL.
- T-11-19: the account read runs inside try/catch and degrades to `null`. It selects only the five new columns, so the existing units and print reads never ask for a column that doesn't exist yet.
- T-11-20: only the development branch was migrated here.

## Self-Check: PASSED

- FOUND: lib/fit-defaults-server.ts, app/actions/fit-defaults.ts, drizzle/0005_fit_defaults.sql, drizzle/meta/0005_snapshot.json
- FOUND: commits 05891a5, 904c266
