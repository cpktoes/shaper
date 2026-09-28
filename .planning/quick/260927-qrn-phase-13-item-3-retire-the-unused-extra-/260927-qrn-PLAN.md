---
phase: quick-260927-qrn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/check-preference-columns.ts
  - lib/db/schema.ts
  - lib/db/queries.ts
  - lib/fit-defaults-preference.ts
  - drizzle/0008_drop_extra_center_thickness.sql
  - drizzle/meta/0008_snapshot.json
  - drizzle/meta/_journal.json
autonomous: true
requirements: [QT-260927-qrn, 13-SPEC-item-3]

estimate:
  # Sequential on the main checkout (orchestrator decision: the executor must read the main checkout's env
  # file, implicitly, to migrate the Neon development branch). Small edits; the heaviest outputs are `npm test`
  # (~3,043 tests, 14 s) and two drizzle-kit runs. Generate, the unit suite and tsc were dry-run at plan time.
  tokens: 40000
  raw_tokens: 40000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "The app no longer describes an Extra Center Thickness column on the account settings table: lib/db/schema.ts declares 12 columns on user_preferences, `npx tsc --noEmit` is clean, and `npm test` passes in full (3,043 passed, 2 skipped — measured at plan time with the field removed)."
    - "Migration 0008 is exactly one statement, `ALTER TABLE \"user_preferences\" DROP COLUMN \"extra_center_thickness_mm\";` (71 bytes, as the plan-time dry run produced), recorded in the journal as idx 8 / `0008_drop_extra_center_thickness`, with a snapshot that differs from 0007 only by its two ids and the one column; a second `npm run db:generate` reports no schema changes."
    - "The settings-column check expects the retired column ABSENT by default and exits 1 if it is present; with `--before-drop` it expects it PRESENT and exits 1 if it is absent; any other option is refused before any database work; it still prints only column names, types and a migration count."
    - "On the development database, before the migration, `--before-drop` passed (present, 8 migrations recorded); after `npm run db:migrate` the default check passes (absent, 9); a second `npm run db:migrate` leaves it at absent, 9; `--before-drop` then fails (absent, expected present)."
    - "The tests that make the app ignore a legacy Extra Center Thickness key in an old cookie or a crafted save are unchanged — the diff touches no *.test.ts file — and lint stays at 0 warnings."
    - "Production is untouched by the executor: no production migration, no env pull, no push. The one-line production command is written into the check script's header exactly as this plan gives it, for the orchestrator to run with the founder after the deploy is live."
  artifacts:
    - path: scripts/check-preference-columns.ts
      provides: "Read-only before-and-after proof: default expects the retired column absent, --before-drop expects it present"
      contains: "--before-drop"
    - path: drizzle/0008_drop_extra_center_thickness.sql
      provides: "The DROP, and nothing else"
      contains: "DROP COLUMN \"extra_center_thickness_mm\""
    - path: drizzle/meta/_journal.json
      provides: "Journal entry idx 8"
      contains: "0008_drop_extra_center_thickness"
    - path: drizzle/meta/0008_snapshot.json
      provides: "Schema snapshot without the retired column"
    - path: lib/db/schema.ts
      provides: "user_preferences without the retired field; header comment records the drop"
  key_links:
    - from: lib/db/schema.ts
      to: drizzle/meta/0008_snapshot.json
      via: "drizzle-kit generate — a second generate must report no schema changes"
      pattern: "No schema changes"
    - from: drizzle/meta/_journal.json
      to: "drizzle.__drizzle_migrations on the development branch"
      via: "npm run db:migrate — proven only by the check's count going 8 -> 9"
      pattern: "drizzle migrations recorded: 9"
    - from: scripts/check-preference-columns.ts (header)
      to: "the production step the orchestrator runs with the founder"
      via: "the exact one-line trap-guarded command, pasted as written"
      pattern: "--before-drop && MIGRATE_ENV_FILE="
---

<objective>
SPEC item 3 (Phase 12 D-19): retire the Extra Center Thickness column that Phase 12 (D-10) stopped using. Take
it out of the app's description of the account settings table, write migration 0008 that drops it, prove that
migration on the Neon **development** database (applied, then re-applied), and leave the **production** step —
which by CLAUDE.md's Database rule waits until the new code is live — written out as one pasteable command.

Why this order (CLAUDE.md Database, "removals wait for the deploy"): Drizzle names every column of a table on
every insert, so the version of the app that is live today names `extra_center_thickness_mm` every time a
signed-in shaper saves a setting. Production must keep the column until the new code (which no longer declares
it) is live. New code that omits a nullable column works fine against a database that still has it.

**Execution: SEQUENTIAL on the main checkout** (/Users/kontoes/Code/shaper, branch `main`) — no worktree,
because the development migration reads the main checkout's own env file.

**Hard limits — do not cross any of these:**
- Never touch production: no `npm run db:migrate:prod`, no `vercel env pull`, no `vercel` command at all, no
  production env file, no `git push`. The production step belongs to the orchestrator and the founder, after
  the deploy (see `<verification>`).
- Never name any `.env*` path in a Bash command, never read or print an env file, never print a connection
  string. Every database command in this plan reads the development env file implicitly (its default) — so
  no path needs naming. (The one place a production env file is named is inside the check script's header
  comment, written with the Edit tool.)
- If the sandbox or a permission check refuses any database command, STOP and report exactly what was refused.
  Never route around a refusal (no alternative command, no other agent).
- If `drizzle-kit generate` shows any interactive prompt, or writes anything other than the one statement
  below, STOP: delete the files it wrote (`drizzle/0008_*`, the new snapshot, and restore the journal with
  `git checkout -- drizzle/meta/_journal.json`) and report.
- Do not edit or stage `.planning/STATE.md`, `.planning/ROADMAP.md`, `13-SPEC.md` or `.planning/config.json`.
  Do not touch `package.json`, `package-lock.json`, any `*.test.ts` or anything under `e2e/`.
- Commit with explicitly staged paths only — never `git add -A`, `git add .` or `git commit -a`. Before each
  commit, `git diff --cached --name-status` must list exactly that commit's paths. This task's own PLAN.md and
  SUMMARY.md stay uncommitted (the orchestrator's docs commit takes them).
- Commit messages: conventional prefix, subject ending `(quick 260927-qrn)`, a plain-English body a shaper could
  read (CLAUDE.md: what it does to the board, the settings or the screen — not which file changed), final line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Write each message to a file in your scratchpad and
  use `git commit -F <file>`.

**Measured at plan time (2026-09-27, main at 79590b4) — use these facts:**

| What | Measured |
|---|---|
| The field | lib/db/schema.ts lines 83-85: a two-line comment (83-84) and the `extra_center_thickness_mm` double-precision field (85) inside `userPreferences`. Nothing in the app reads or writes it |
| Removing it | With lines 83-85 deleted: `npx vitest run` → 76 files, 3,043 passed, 2 skipped (14 s); `npx tsc --noEmit` → exit 0. The main checkout was reverted afterwards |
| `drizzle-kit generate --name drop_extra_center_thickness` (v0.31.10, dry-run in a scratch copy, stdin from /dev/null) | No prompt. Wrote `drizzle/0008_drop_extra_center_thickness.sql` = exactly `ALTER TABLE "user_preferences" DROP COLUMN "extra_center_thickness_mm";` (71 bytes, no trailing newline, same as 0007), `drizzle/meta/0008_snapshot.json` (diff vs 0007: `id`/`prevId` and the one column block only), a journal entry idx 8 tag `0008_drop_extra_center_thickness`; reported `user_preferences 13 columns` before → a rerun printed `No schema changes, nothing to migrate` |
| Development database today | The current check prints `... (4 of 4 columns); extra_center_thickness_mm kept` and `drizzle migrations recorded: 8` (orchestrator, today) |
| Production today | 8 migrations recorded (0000-0007; 0007 applied for quick 260926-wmf); the column present |
| Comments the removal makes false | schema.ts 83-84 (deleted with the field); queries.ts 94-96; fit-defaults-preference.ts 219-221. Still true and staying: fit-defaults-preference.ts lines 8, 19, 155, 182 (a legacy key in an old cookie is ignored, a crafted save naming it is refused); app/actions/fit-defaults.ts 34; lib/geometry/blank.ts 115; every test that asserts the key/column is not used |

Purpose: SPEC item 3's "Done when" — neither database has the column, and a signed-in shaper's settings still
save on the live site. This plan delivers the development half and the code; the production half is the
orchestrator's, with the founder present, after the deploy (orchestrator decision).
Output: two commits (the check; the removal with its migration), a migrated development database, the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/13-ready-for-the-shapers/13-SPEC.md
@scripts/check-preference-columns.ts
@drizzle.config.ts
</context>

<tasks>

<task type="auto">
  <!-- Orchestrator: was type="tracer"; set to auto because in this repo a tracer task makes the executor stop for a
       human-verify checkpoint (auto_advance is false), and there is nothing for the founder to see mid-task.
       The verify gate below is unchanged. -->
  <name>Task 1: end to end on the development database — the check learns both expectations and is proven while the column is still there, then the schema stops declaring it, migration 0008 is generated, and the development database is migrated through the same chain shape production will use</name>
  <files>scripts/check-preference-columns.ts, lib/db/schema.ts, drizzle/0008_drop_extra_center_thickness.sql, drizzle/meta/0008_snapshot.json, drizzle/meta/_journal.json</files>
  <read_first>
    - scripts/check-preference-columns.ts (whole file, 125 lines — already in context above)
    - lib/db/schema.ts lines 76-100 (the userPreferences table)
    - drizzle.config.ts (MIGRATE_ENV_FILE; unset means the development env file)
  </read_first>
  <action>
Step A — teach the check both expectations (per D-19; keep it read-only and keep its two-line output shape).
In scripts/check-preference-columns.ts:
- At the very start of `main()`, before any env file is loaded and before the database client is imported,
  read the options from `process.argv.slice(2)`. The accepted options are exactly `--before-drop` and
  `--verbose`. For anything else, print one line to stderr — Unknown option "<arg>": the only options are
  --before-drop and --verbose. — set `process.exitCode = 1` and return. Do this with console.error and a
  return, not a throw (a throw would go through `describeFailure`, which hides the message).
- `--before-drop` means the retired column is expected PRESENT; without it, ABSENT is expected. That default
  flips today on purpose: from migration 0008 on, "gone" is the normal state, and `--before-drop` exists only
  for production's one run just before its DROP.
- Keep NEW_COLUMNS, the select (its IN list still names the retired column, so presence can be seen), the
  migration count and `describeFailure`/`--verbose` exactly as they are.
- Line 1 now ends with the retired column's actual state and the expected one, in this exact wording:
  `; extra_center_thickness_mm present (expected present)` / `absent (expected absent)` /
  `present (expected absent)` / `absent (expected present)` — built from RETIRED_COLUMN plus the two words.
  Line 2 stays `drizzle migrations recorded: <n>`.
- Exit 1 when fewer than 4 of the 4 columns match their types, or when the actual state differs from the
  expected one. Otherwise leave the exit code at 0.
- Update the RETIRED_COLUMN doc comment: retired by Phase 12 D-10, dropped by migration 0008 (quick task
  260927-qrn, D-19); expected absent unless `--before-drop`.
- Rewrite the header comment. Keep the title line style, the "why a separate check" paragraph, the
  never-printed rules and the env-file paragraph. Replace the retired-column sentences and the output/exit
  description to match the new behaviour (both line-1 endings shown). Explain the option and why the default is
  "absent": a removal deploys first and drops after (D-19, CLAUDE.md Database), so production is checked with
  `--before-drop` right before its DROP, and every run after that expects the column gone. Commands section:
  keep the two development commands as they are (main checkout; worktree with CHECK_ENV_FILE); replace the
  production entry with: "production — quick task 260927-qrn, run once, in the founder's terminal, from the main
  checkout, only AFTER the deploy that stops naming the column is live: it pulls the production settings to a
  temporary file, checks the column is still there, runs the drop, checks it is gone, and deletes the file on
  exit. Any failed step stops the rest." followed by this line, verbatim (one line, copy it exactly):
  bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts --before-drop && MIGRATE_ENV_FILE=.env.production.pull npx --no-install drizzle-kit migrate && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'
  Add one sentence after it: earlier production runs (plan 12-10, quick 260926-wmf) used the check on its own,
  after `npm run db:migrate:prod`.
- Keep `D-20: nothing in package.json` — no npm script, no dependency.

Step B — prove the check on the development database while the column is still there (read-only; nothing
here names an env file). Run each of these and keep the full two-line output for the SUMMARY:
1. `npx --no-install tsx scripts/check-preference-columns.ts --before-drop` → exit 0, line 1 ends
   `(4 of 4 columns); extra_center_thickness_mm present (expected present)`, line 2 `drizzle migrations recorded: 8`.
2. `npx --no-install tsx scripts/check-preference-columns.ts` → exit 1, line 1 ends `present (expected absent)`.
3. `npx --no-install tsx scripts/check-preference-columns.ts --before-dorp` (a deliberate typo) → exit 1, one
   Unknown option line on stderr, and no `user_preferences:` line (it stopped before any database work).
If run 1 says `absent`, the development database was already changed by something else: STOP and report.
Then `npx eslint --max-warnings 0 scripts/check-preference-columns.ts` → clean.

Step C — commit 1 (the check only). Stage exactly scripts/check-preference-columns.ts. Suggested subject:
`chore(db): the account-settings check can now prove the old Extra Center Thickness slot is gone (quick 260927-qrn)`.
Body in plain English: nothing about any board or setting changes; this is the read-only check that looks inside
the database's account-settings table; it used to fail if the unused Extra Center Thickness slot was missing,
because until now that slot had to stay; from now on it expects the slot gone, and its --before-drop option
checks the slot is still there just before the live database loses it, so the removal is proven before and
after. Trailer line as in the hard limits.

Step D — stop declaring the column (per D-10, D-19). In lib/db/schema.ts delete lines 83-85 whole: the
two-line comment and the Extra Center Thickness field below it. Nothing else in schema.ts yet (its header
comment is Task 2).

Step E — generate migration 0008. First confirm `git status --short drizzle/` is empty and no `drizzle/0008_*`
exists. Run `npm run db:generate -- --name drop_extra_center_thickness < /dev/null` (stdin from /dev/null so
any prompt fails fast instead of waiting — the plan-time dry run showed none). Then check, against the measured
facts table: exactly three paths changed/added under drizzle/ (`git status --short drizzle/`); the SQL file holds
the one statement and is 71 bytes (`wc -c`); `git diff --no-index drizzle/meta/0007_snapshot.json
drizzle/meta/0008_snapshot.json` shows only `id`, `prevId` and the one column's block; the journal's new entry is
idx 8 with tag `0008_drop_extra_center_thickness`. Then run `npm run db:generate < /dev/null` once more → it must
print `No schema changes, nothing to migrate` and write nothing (`git status --short drizzle/` unchanged). Any
deviation → STOP per the hard limits.

Step F — migrate the development database through the production chain's own shape (minus the pull; every
command reads the development env file by default). Run, as one command:
`bash -c 'npx --no-install tsx scripts/check-preference-columns.ts --before-drop && npm run db:migrate && npx --no-install tsx scripts/check-preference-columns.ts'`
Expected: the first check `present (expected present)` / `recorded: 8`; drizzle-kit's own lines (its
"applied successfully" line proves nothing on its own); the second check `absent (expected absent)` /
`drizzle migrations recorded: 9`, exit 0. Keep the whole output for the SUMMARY. If the migrate step is refused
or errors, STOP and report — do not retry by another route.

Leave the schema and drizzle changes uncommitted — Task 2 commits them together with the comments they make
false, so the history never holds a commit whose comments contradict its code.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && out=$(npx --no-install tsx scripts/check-preference-columns.ts); rc=$?; echo "$out"; [ $rc -eq 0 ] && grep -qF '(4 of 4 columns); extra_center_thickness_mm absent (expected absent)' <<<"$out" && grep -qxF 'drizzle migrations recorded: 9' <<<"$out" && [ "$(cat drizzle/0008_drop_extra_center_thickness.sql)" = 'ALTER TABLE "user_preferences" DROP COLUMN "extra_center_thickness_mm";' ] && grep -qF '"tag": "0008_drop_extra_center_thickness"' drizzle/meta/_journal.json && [ "$(git log -1 --format=%s -- scripts/check-preference-columns.ts | grep -c 'quick 260927-qrn')" = 1 ] && echo TRACER-OK</automated>
  </verify>
  <done>
    The check script refuses unknown options, expects the column absent by default and present with
    `--before-drop`, and was proven both ways on the development database before its migration (present/8 passes
    with the flag, fails without it). It is committed on its own. lib/db/schema.ts no longer declares the field;
    migration 0008 is the one DROP statement with its snapshot and journal entry, and a second generate reports no
    changes. The development database ran the chain: before `present (expected present)`/8, after
    `absent (expected absent)`/9. Schema and drizzle changes sit uncommitted for Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: correct the comments the removal made false, re-apply the migration to prove nothing more happens, run every gate, and commit the removal</name>
  <files>lib/db/schema.ts, lib/db/queries.ts, lib/fit-defaults-preference.ts, drizzle/0008_drop_extra_center_thickness.sql, drizzle/meta/0008_snapshot.json, drizzle/meta/_journal.json</files>
  <read_first>
    - lib/db/schema.ts lines 1-35 (the header; the Phase 11 paragraph is lines 23-33)
    - lib/db/queries.ts lines 86-100
    - lib/fit-defaults-preference.ts lines 1-25 and 215-232
  </read_first>
  <action>
Comment fixes only — no code change in these files beyond Task 1's field deletion (per D-19):
- lib/db/schema.ts header, the Phase 11 paragraph (lines 23-33): it lists Extra Center Thickness among the five
  Phase 11 columns. Keep that history and add one sentence right after the five-column description saying
  Phase 12 (D-10) retired Extra Center Thickness and migration 0008 (quick task 260927-qrn, D-19) dropped its
  column, so four of those five remain. Refer to it by its display name or its snake_case column name.
- lib/db/queries.ts lines 94-96: the last sentence says the retired column is kept in the table until a later
  drop. Replace that sentence with: the retired Extra Center Thickness column was dropped by migration 0008
  (D-19, quick task 260927-qrn). Keep the preceding "Selects exactly these seven columns" sentence intact.
- lib/fit-defaults-preference.ts lines 219-221: the sentence says the retired column is still declared in the
  schema but never named here. Replace it with: the retired Extra Center Thickness column is not among these
  names — it was dropped from the schema and the database by migration 0008 (D-19, quick task 260927-qrn), so
  no save can write it. Leave lines 8, 19, 155 and 182 alone: they describe the app still ignoring a legacy key
  in an old cookie and refusing it in a crafted save, which stays true and stays tested.
- Leave app/actions/fit-defaults.ts, lib/geometry/blank.ts, and every *.test.ts untouched.

Re-apply the migration (CLAUDE.md: what production receives has been applied and re-applied at least once).
Run `npm run db:migrate`, then `npx --no-install tsx scripts/check-preference-columns.ts` → exit 0,
`absent (expected absent)`, `drizzle migrations recorded: 9` (still 9 — nothing more applied). Then run
`npx --no-install tsx scripts/check-preference-columns.ts --before-drop` → exit 1, line 1 ends
`absent (expected present)`: proof that the production chain stops at its first step if the column is ever
found already gone. Keep all output for the SUMMARY.

Gates, on main: `npm run lint -- --max-warnings 0` (exit 0, 0 problems — it has been 0 since item 2);
`npx tsc --noEmit` (exit 0); `npm test` (all passing — 3,043 passed and 2 skipped at plan time; record the count).

Commit 2 (the removal). Stage exactly these six paths: lib/db/schema.ts, lib/db/queries.ts,
lib/fit-defaults-preference.ts, drizzle/0008_drop_extra_center_thickness.sql, drizzle/meta/0008_snapshot.json,
drizzle/meta/_journal.json. Suggested subject:
`refactor(db): retire the unused Extra Center Thickness column (quick 260927-qrn)`.
Body in plain English: nothing about any board, blank match or saved setting changes. Extra Center Thickness
was a Fit & Tip Default the app stopped using when Planer Max Depth replaced it in the foil update, but its
empty slot stayed in the account settings table. This takes it out of the app's picture of that table and adds
the step that deletes the slot from the database. The practice database has already lost it (and was checked
twice). The live database keeps it until this version is live, then loses it in one step run with the founder
— because the version live today still mentions that slot every time a signed-in shaper saves a setting, and
removing it first would stop those saves. Trailer line as in the hard limits.

After committing: `git status --short` must show only this task's untracked quick folder (PLAN, and SUMMARY once
written) — nothing else modified or untracked. Push nothing.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && set -o pipefail && npm run lint -- --max-warnings 0 && npx tsc --noEmit && npm test 2>&1 | tail -5 && [ "$(grep -vE '^[[:space:]]*(\*|//)' lib/db/schema.ts | grep -cF 'doublePrecision("extra_center_thickness_mm")')" = 0 ] && ! grep -nE 'stays declared|stays in the table|until a follow-up step' lib/db/schema.ts lib/db/queries.ts lib/fit-defaults-preference.ts && [ -z "$(git diff HEAD~2 --name-only -- '*.test.ts' e2e package.json package-lock.json)" ] && [ "$(git diff --name-only HEAD~1 HEAD | LC_ALL=C sort | tr '\n' ' ')" = "drizzle/0008_drop_extra_center_thickness.sql drizzle/meta/0008_snapshot.json drizzle/meta/_journal.json lib/db/queries.ts lib/db/schema.ts lib/fit-defaults-preference.ts " ] && out=$(npx --no-install tsx scripts/check-preference-columns.ts) && echo "$out" && grep -qF 'absent (expected absent)' <<<"$out" && grep -qxF 'drizzle migrations recorded: 9' <<<"$out" && [ -z "$(git status --porcelain | grep -v '^?? .planning/quick/260927-qrn-')" ] && echo TASK2-OK</automated>
  </verify>
  <done>
    The three false comments are corrected and the true ones (legacy key ignored or refused) are untouched; no test
    file changed. A second development migration applied nothing (still absent, 9) and `--before-drop` now fails as
    designed. Lint 0 warnings, tsc clean, the unit suite passes in full. Commit 2 holds exactly the six removal paths
    with a plain-English body; nothing is pushed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| executor on the main checkout → Neon development branch | The executor mutates the development database only, through the env file drizzle and the check read by default |
| founder's terminal → Neon production branch | Holds real shapers' saved boards and settings; only the orchestrator and founder cross it, after the deploy |
| env files holding connection strings → terminal output, logs, git | A leaked connection string is full database access |
| deployed old code ↔ database shape | Until the new code is live, production code names the column on every settings save |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-q-qrn-01 | Denial of service | Production DROP before the new code is live | high | mitigate | The executor never runs any production command (hard limits); the production step is the orchestrator's, only after Vercel's production deployment of this commit is Ready and the live build has changed; the chain opens with `--before-drop`, so a wrong-state database stops it before the DROP |
| T-q-qrn-02 | Information disclosure | Connection strings in env files | high | mitigate | The check prints only names, types and a count, and hides the driver's message unless `--verbose`; no Bash command names or reads a `.env*` file; the pulled production file is removed by `trap … EXIT INT TERM`; `.env*` stays git-ignored |
| T-q-qrn-03 | Tampering | Migration 0008 carrying more than the one DROP | high | mitigate | Task 1 Step E gates: exact SQL text and byte count, snapshot diff limited to ids plus the one column, a second generate reporting no changes; any prompt or deviation stops the task and removes what generate wrote |
| T-q-qrn-04 | Tampering (data loss) | Values in `extra_center_thickness_mm` | low | accept | Retired by Phase 12 D-10 and read by nothing since; the drop is the founder-approved D-19 follow-up (SPEC item 3); Neon's restore window is the backstop |
| T-q-qrn-05 | Repudiation | "migrations applied successfully" taken as proof | medium | mitigate | Only the read-only check counts: before and after states and the 8 → 9 count are recorded in the SUMMARY, for development now and production later |
| T-q-qrn-06 | Tampering | A mistyped option silently flipping the check's expectation | medium | mitigate | Unknown options are refused before any database work with exit 1, which stops the `&&` chain; proven by Step B run 3 |
| T-q-qrn-07 | Elevation of privilege | Routing around a refused database command | medium | mitigate | Hard limit: stop and report; no alternative route, no other agent |
| T-q-qrn-08 | Denial of service | A browser tab opened before the deploy saving after the DROP | low | accept | The production address serves the newest deployment once it is live; a stale tab's save is refused and one reload fixes it (the same note as Phase 12's IN-04) |
</threat_model>

<verification>
**The executor runs these on main after Task 2 (all read-only except the two development migrations already
done):**
- `npx --no-install tsx scripts/check-preference-columns.ts` → exit 0, `(4 of 4 columns); extra_center_thickness_mm absent (expected absent)`, `drizzle migrations recorded: 9`.
- `npm run lint -- --max-warnings 0` → exit 0. `npx tsc --noEmit` → exit 0. `npm test` → all passing (record the count).
- `git log --oneline origin/main..main` → the four existing docs/chore commits plus this task's two; nothing pushed.
- `git status --short` → only `?? .planning/quick/260927-qrn-phase-13-item-3-retire-the-unused-extra-/`.

**Not the executor's — the orchestrator runs these afterwards (the SUMMARY must repeat this block verbatim):**
1. Gates on main: `npm run build` (main checkout), `npm run test:e2e` (the settings save's SQL changed — it no
   longer names the column — so the full browser suite, including `e2e/fit-defaults.spec.ts`), and
   `npm run test:e2e:prod`.
2. The founder's go, then `git push origin main`, then wait until Vercel's production deployment of this commit
   is Ready and live (`npx --no-install vercel ls shaper --prod --yes` shows it Ready; the live build id changed).
   Not before — the live code must have stopped naming the column (CLAUDE.md Database: removals deploy first).
3. With the founder present, in the founder's own terminal (`run_in_terminal`, as plan 12-10 did), this one line:

   cd /Users/kontoes/Code/shaper && bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts --before-drop && MIGRATE_ENV_FILE=.env.production.pull npx --no-install drizzle-kit migrate && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'

   Expected: first check `... (4 of 4 columns); extra_center_thickness_mm present (expected present)` and
   `drizzle migrations recorded: 8`; drizzle-kit's apply lines (read again ~30 s later for the spinner's final
   line); second check `... absent (expected absent)` and `drizzle migrations recorded: 9`. If the first check
   fails, the chain has stopped before the DROP — report, don't retry. Afterwards confirm the pulled file is gone
   with `ls -a | grep "^\.env"` (never name the path in Bash).
4. The founder signs in on www.shaperassistant.com, changes one setting (a Fit & Tip Default, or Imperial/Metric),
   reloads, and confirms it stuck — SPEC item 3's "Done when". Any save exercises the upsert's insert column list.
5. Records: 13-SPEC Progress Log and ROADMAP tick, STATE.md, and the docs commit carrying this PLAN and SUMMARY.
</verification>

<success_criteria>
- lib/db/schema.ts no longer declares the Extra Center Thickness field; the three comments that said it was kept
  are corrected; tsc clean; the unit suite passes in full; lint 0 warnings; no test file changed.
- `drizzle/0008_drop_extra_center_thickness.sql` is the single DROP; snapshot and journal entry match; a second
  generate reports no changes.
- The check refuses unknown options, expects absent by default and present with `--before-drop`, prints only
  names/types/counts, and its header carries the exact production line from `<verification>`.
- Development database: `--before-drop` passed at present/8 before; the chain migrated it; absent/9 after, and
  still absent/9 after a second migrate.
- Two commits on main with plain-English bodies and the trailer; nothing pushed; production untouched;
  STATE.md, ROADMAP.md, 13-SPEC.md and config.json untouched.
</success_criteria>

<output>
Create `.planning/quick/260927-qrn-phase-13-item-3-retire-the-unused-extra-/260927-qrn-SUMMARY.md` when done,
with `status: complete` in its frontmatter. Do not commit it. Open with a short plain-English paragraph a shaper
could read: an unused slot for an old setting is being removed from the account settings; nothing about any
board or saved setting changes; the practice database has lost it already; the live one loses it in one step with
the founder, after this version is live. Then record:
- both commit SHAs and subjects;
- every check output from Task 1 Steps B and F and Task 2 (both lines each, with exit codes) — the 8 → 9 count
  and present → absent are the proof, not drizzle's "applied successfully";
- the generate facts (SQL text, 71 bytes, snapshot diff, the no-changes rerun);
- the gate results (lint, tsc, unit test count);
- the orchestrator's block from `<verification>` ("Not the executor's"), verbatim, including the one-line
  production command;
- any deviation, and anything refused by the sandbox.
</output>
