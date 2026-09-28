---
phase: quick-260927-qrn
plan: 01
subsystem: database
tags: [drizzle, postgres, neon, migration]

requires:
  - phase: 12
    provides: "D-10 (Extra Center Thickness retired from use) and D-19 (the follow-up decision to drop its column after the deploy)"
provides:
  - "The account-settings check (scripts/check-preference-columns.ts) now expects the retired column absent by default, and PRESENT with a new --before-drop option — the one flag production's single pre-DROP run will pass"
  - "Migration 0008: the single ALTER TABLE ... DROP COLUMN statement, its snapshot and journal entry"
  - "lib/db/schema.ts no longer declares extraCenterThicknessMm; the three comments that said it was still kept are corrected"
  - "The Neon development database migrated (8 -> 9), re-migrated (stays at 9), and proven absent both times"
  - "The exact production one-liner, written into the check script's header, for the orchestrator and founder to run after the deploy is live"
affects: ["phase-13", "production-migration", "database-schema"]

actuals:
  tokens: 4876
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["a check script that takes an explicit --before-drop flag to flip its expected-state assertion, so the same read-only proof covers both sides of a deploy-then-drop database change"]

key-files:
  created:
    - drizzle/0008_drop_extra_center_thickness.sql
    - drizzle/meta/0008_snapshot.json
  modified:
    - scripts/check-preference-columns.ts
    - lib/db/schema.ts
    - lib/db/queries.ts
    - lib/fit-defaults-preference.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "The check's default expectation flips from 'present' to 'absent' starting with this migration — --before-drop is the one flag that asks for the old expectation, reserved for production's single run right before its own DROP"

patterns-established:
  - "A column retired in one phase (D-10) and dropped in a later one (D-19) gets exactly one migration for the DROP, generated and proven on the development branch first, with the production run written out as a literal command rather than executed"

requirements-completed: [QT-260927-qrn, 13-SPEC-item-3]

coverage:
  - id: D1
    description: "The check script refuses unknown options, defaults to expecting the retired column absent, and accepts --before-drop to expect it present"
    requirement: "13-SPEC-item-3"
    verification:
      - kind: unit
        ref: "manual run: npx --no-install tsx scripts/check-preference-columns.ts --before-drop / (no flag) / --before-dorp (typo) — all three outputs recorded below"
        status: pass
    human_judgment: false
  - id: D2
    description: "lib/db/schema.ts no longer declares extraCenterThicknessMm; migration 0008 is the single DROP with matching snapshot/journal; a second generate reports no changes"
    requirement: "13-SPEC-item-3"
    verification:
      - kind: unit
        ref: "npm run db:generate (dry run) + git diff of 0007/0008 snapshots + wc -c on the SQL file — all recorded below"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Neon development database migrated from 8 to 9 recorded migrations, re-migrating leaves it at 9, and --before-drop correctly fails once the column is gone"
    requirement: "13-SPEC-item-3"
    verification:
      - kind: integration
        ref: "check-preference-columns.ts runs against the development branch before/after each npm run db:migrate — outputs recorded below"
        status: pass
    human_judgment: false
  - id: D4
    description: "lint, tsc and the full unit suite stay clean after the removal; no *.test.ts file changed"
    requirement: "13-SPEC-item-3"
    verification:
      - kind: unit
        ref: "npm run lint -- --max-warnings 0 / npx tsc --noEmit / npm test — 3,043 passed, 2 skipped"
        status: pass
    human_judgment: false
  - id: D5
    description: "Production migration — running the pull-check-drop-check chain on the live database, after the deploy, with the founder present"
    verification: []
    human_judgment: true
    rationale: "This is explicitly not the executor's step (hard limit + CLAUDE.md Database rule): it needs the deploy to be live and the founder in his own terminal. Not automatable here."

duration: 25min
completed: 2026-09-27
status: complete
---

# Phase 13 Item 3: Retire the Extra Center Thickness Column Summary

**The account-settings check now proves a column is gone instead of proving it's still there; migration 0008 drops it; the practice database has already lost it, twice.**

An unused slot for an old setting — Extra Center Thickness, a Fit & Tip Default the app stopped
reading back in Phase 12 once Planer Max Depth took over its job — is being taken out of the
account settings table. Nothing about any board or saved setting changes for a signed-in shaper.
The practice (development) database has already lost the slot, and the removal was checked twice
over. The live (production) database keeps the slot until this version is actually live on the
site, and then loses it in one step, run with the founder present — because the version live today
still names that slot every time a shaper saves a setting, and taking it away first would break
those saves.

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 7 (1 check script + 3 comment fixes + 3 drizzle files)

## Accomplishments

- `scripts/check-preference-columns.ts` now expects the retired column **absent** by default, and
  **present** only with a new `--before-drop` option; any other option is refused before any
  database work
- Migration `0008_drop_extra_center_thickness` — the single `ALTER TABLE "user_preferences" DROP
  COLUMN "extra_center_thickness_mm";` statement — generated, proven exact, and applied to the
  development database (then re-applied to prove nothing more happens)
- `lib/db/schema.ts` no longer declares `extraCenterThicknessMm`; the three comments in
  `schema.ts`, `queries.ts` and `fit-defaults-preference.ts` that said the column was still kept
  are corrected to say it was dropped by migration 0008
- The exact one-line production command (pull → check present → drop → check absent, wrapped in a
  trap that deletes the pulled env file) is written into the check script's header, ready for the
  orchestrator and founder to run after the deploy is live

## Task Commits

1. **Task 1 (the check script, Step C): teach the check both expectations, prove it on the
   development database while the column was still there** — `39b9b3d` (chore)
2. **Task 2: correct the false comments, re-apply the migration, run every gate, commit the
   removal** — `3a614b9` (refactor)

Both commits carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. Nothing
was pushed.

## Files Created/Modified

- `scripts/check-preference-columns.ts` — added `--before-drop`/`--verbose` option parsing (refuses
  anything else before touching the database), flipped the default expectation to absent, rewrote
  the header comment and doc comments, added the exact production one-liner
- `lib/db/schema.ts` — deleted the `extraCenterThicknessMm` field and its two-line "stays declared"
  comment; added one sentence to the Phase 11 header paragraph noting the D-10/D-19 drop
- `lib/db/queries.ts` — replaced the "kept in the table until a later drop" sentence with "dropped
  by migration 0008"
- `lib/fit-defaults-preference.ts` — replaced the "stays declared in the schema but never named
  here" sentence with "dropped from the schema and the database by migration 0008"
- `drizzle/0008_drop_extra_center_thickness.sql` (new) — the one DROP statement, 71 bytes
- `drizzle/meta/0008_snapshot.json` (new) — schema snapshot without the retired column
- `drizzle/meta/_journal.json` — new entry, idx 8, tag `0008_drop_extra_center_thickness`

## Check Outputs — Task 1 Step B (development database, column still present)

```
$ npx --no-install tsx scripts/check-preference-columns.ts --before-drop
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm present (expected present)
drizzle migrations recorded: 8
exit=0

$ npx --no-install tsx scripts/check-preference-columns.ts
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm present (expected absent)
drizzle migrations recorded: 8
exit=1

$ npx --no-install tsx scripts/check-preference-columns.ts --before-dorp
Unknown option "--before-dorp": the only options are --before-drop and --verbose.
exit=1
(no user_preferences: line — it stopped before any database work)

$ npx eslint --max-warnings 0 scripts/check-preference-columns.ts
(clean, exit 0)
```

## Generate Facts — Task 1 Step E

- SQL text (`drizzle/0008_drop_extra_center_thickness.sql`): `ALTER TABLE "user_preferences" DROP
  COLUMN "extra_center_thickness_mm";`
- Byte count (`wc -c`): **71**
- `git status --short drizzle/` after generate: exactly three paths — the new SQL file, the new
  snapshot, and the modified journal
- Snapshot diff (0007 → 0008): only `id`, `prevId` and the `extra_center_thickness_mm` column
  block removed — nothing else changed
- Journal entry: `{ "idx": 8, "version": "7", "tag": "0008_drop_extra_center_thickness", ... }`
- Second `npm run db:generate < /dev/null`: printed `No schema changes, nothing to migrate 😴`
  and wrote nothing further

**Observation vs. plan-time measurement:** `drizzle-kit generate`'s own summary line reported
`user_preferences 13 columns` both times (before and after the second, no-op generate) — this
counts the columns declared in `schema.ts` after Task 1 Step D's deletion (14 minus 1 = 13), not
the 12 the plan's `must_haves.truths` text stated. Counting every field in the `userPreferences`
table object by hand also gives 13. This is a descriptive mismatch in the plan's prose, not a gate
— no `<verify>` block checks this number, and every gate that does check something (byte count, SQL
text, snapshot diff, journal tag, test/lint/tsc counts) passed exactly as the plan predicted.

## Check Outputs — Task 1 Step F (the development migration chain)

```
$ bash -c 'npx --no-install tsx scripts/check-preference-columns.ts --before-drop && npm run db:migrate && npx --no-install tsx scripts/check-preference-columns.ts'

user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm present (expected present)
drizzle migrations recorded: 8

[drizzle-kit db:migrate output — spinner lines, then] [✓] migrations applied successfully!

user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm absent (expected absent)
drizzle migrations recorded: 9
exit=0
```

Task 1's own automated `<verify>` gate then re-ran the default check and confirmed `absent
(expected absent)` / `recorded: 9`, the exact SQL text, the journal tag, and the check-script
commit subject containing "quick 260927-qrn" — printed `TRACER-OK`.

## Check Outputs — Task 2 (re-applying the migration; proving idempotence and the reversed
expectation)

```
$ npm run db:migrate
[drizzle-kit db:migrate output — spinner lines, then] [✓] migrations applied successfully!

$ npx --no-install tsx scripts/check-preference-columns.ts
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm absent (expected absent)
drizzle migrations recorded: 9
exit=0

$ npx --no-install tsx scripts/check-preference-columns.ts --before-drop
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm absent (expected present)
drizzle migrations recorded: 9
exit=1
```

A second `db:migrate` applied nothing new (still 9). `--before-drop` now fails as designed —
proof that the production chain would stop at its first step if the column were ever found already
gone.

## Gate Results (Task 2)

- `npm run lint -- --max-warnings 0` → **exit 0, 0 problems**
- `npx tsc --noEmit` → **exit 0**
- `npm test` → **76 test files passed, 3,043 tests passed, 2 skipped (3,045 total)** — matches the
  plan-time measurement exactly
- `git diff HEAD~2 --name-only -- '*.test.ts' e2e package.json package-lock.json` → empty (no test
  file, no e2e file, no package file touched)
- Task 2's full automated `<verify>` gate (lint + tsc + test + comment-absence checks + exact
  six-path commit-diff check + check-script run + clean `git status`) printed `TASK2-OK`

## Executor-Run Verification (plan's `<verification>` block, executor's half)

```
$ npx --no-install tsx scripts/check-preference-columns.ts
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm absent (expected absent)
drizzle migrations recorded: 9
exit 0

lint: exit 0. tsc: exit 0. test: 3,043 passed, 2 skipped.

$ git log --oneline origin/main..main
3a614b9 refactor(db): retire the unused Extra Center Thickness column (quick 260927-qrn)
39b9b3d chore(db): the account-settings check can now prove the old Extra Center Thickness slot is gone (quick 260927-qrn)
79590b4 chore: add the example settings file (three names, no values)
e73e80e docs: capture todo - Show a ghost of the last edit on the Template screen
065ea89 docs(phase-13): item 2 done — the housekeeping is live

$ git status --short
?? .planning/quick/260927-qrn-phase-13-item-3-retire-the-unused-extra-/
```

**Observation vs. plan-time measurement:** the plan's `<verification>` prose said "the four existing
docs/chore commits plus this task's two" (six total); the actual count ahead of `origin/main` is
five — three pre-existing commits (`79590b4`, `e73e80e`, `065ea89`) plus this task's two
(`39b9b3d`, `3a614b9`). This is another descriptive miscount in the plan (not a gate — nothing in
`<verify>` checks this number) and does not affect anything: nothing is pushed, and the composition
of what's ahead of `origin/main` is exactly this task's two commits plus whatever was already there
before this task started.

## Migration Files

**`drizzle/0008_drop_extra_center_thickness.sql`** (71 bytes, no trailing newline):
```sql
ALTER TABLE "user_preferences" DROP COLUMN "extra_center_thickness_mm";
```

**`drizzle/meta/_journal.json`** (new entry appended):
```json
{
  "idx": 8,
  "version": "7",
  "when": 1790562514734,
  "tag": "0008_drop_extra_center_thickness",
  "breakpoints": true
}
```

**`drizzle/meta/0008_snapshot.json`**: identical to `0007_snapshot.json` except `id`/`prevId` and
the removal of the `extra_center_thickness_mm` column block from `user_preferences.columns`.

## Decisions Made

None beyond what the plan specified — executed exactly as written, including the orchestrator's
change of Task 1's type from `tracer` to `auto` (no checkpoint was needed since there was nothing
for the founder to see mid-task).

## Deviations from Plan

None — plan executed exactly as written. The two observations above (drizzle-kit's "13 columns"
report vs. the plan's stated "12", and five commits ahead of `origin/main` vs. the plan's stated
"four plus two") are discrepancies between the plan's descriptive prose and the measured reality;
neither is gated by any `<verify>` check, and every actual gate (SQL text, byte count, snapshot
diff, journal tag, migration counts 8→9→9, lint, tsc, unit test count, six-path commit diff) passed
exactly as specified. Nothing was refused by the sandbox; no auto-fix, bug fix, or architectural
change was needed.

## Issues Encountered

None.

## Threat Flags

None - no new attack surface. The check script gained one new option (`--before-drop`) that only
flips an internal expectation flag used in a comparison against database state already being read;
it introduces no new database call, no new file write, no new network call, and no new
untrusted-input path (the option string itself is validated against an exact allow-list before any
other code runs).

## User Setup Required

None for this executor's scope. The production step is explicitly not the executor's — see below.

## Not the Executor's — Orchestrator Block from `<verification>` (verbatim)

**Not the executor's — the orchestrator runs these afterwards (the SUMMARY must repeat this block
verbatim):**

1. Gates on main: `npm run build` (main checkout), `npm run test:e2e` (the settings save's SQL
   changed — it no longer names the column — so the full browser suite, including
   `e2e/fit-defaults.spec.ts`), and `npm run test:e2e:prod`.
2. The founder's go, then `git push origin main`, then wait until Vercel's production deployment of
   this commit is Ready and live (`npx --no-install vercel ls shaper --prod --yes` shows it Ready;
   the live build id changed). Not before — the live code must have stopped naming the column
   (CLAUDE.md Database: removals deploy first).
3. With the founder present, in the founder's own terminal (`run_in_terminal`, as plan 12-10 did),
   this one line:

   ```
   cd /Users/kontoes/Code/shaper && bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts --before-drop && MIGRATE_ENV_FILE=.env.production.pull npx --no-install drizzle-kit migrate && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'
   ```

   Expected: first check `... (4 of 4 columns); extra_center_thickness_mm present (expected
   present)` and `drizzle migrations recorded: 8`; drizzle-kit's apply lines (read again ~30 s later
   for the spinner's final line); second check `... absent (expected absent)` and `drizzle
   migrations recorded: 9`. If the first check fails, the chain has stopped before the DROP —
   report, don't retry. Afterwards confirm the pulled file is gone with `ls -a | grep "^\.env"`
   (never name the path in Bash).
4. The founder signs in on www.shaperassistant.com, changes one setting (a Fit & Tip Default, or
   Imperial/Metric), reloads, and confirms it stuck — SPEC item 3's "Done when". Any save exercises
   the upsert's insert column list.
5. Records: 13-SPEC Progress Log and ROADMAP tick, STATE.md, and the docs commit carrying this PLAN
   and SUMMARY.

## Next Phase Readiness

Development is fully done: the check, the migration, and the code are all committed and proven.
Production is intentionally untouched and waits on: the deploy going live, then the founder's
one-line run above, then his own settings-save confirmation. This SUMMARY and the PLAN are left
uncommitted for the orchestrator's docs commit, per the plan's own instruction.

---
*Phase: quick-260927-qrn*
*Completed: 2026-09-27*
