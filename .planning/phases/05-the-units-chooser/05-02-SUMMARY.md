---
phase: 05-the-units-chooser
plan: 02
subsystem: database
tags: [units, drizzle, neon, clerk, server-actions, react-hooks]

requires:
  - phase: 05-01-one-end-to-end-units-path
    provides: decideUnitsHandoff/UnitsHandoff in lib/units-preference.ts, resolveUnitsHandoff's stub in lib/units-server.ts, components/units-provider.tsx's adoptIntoBrowser effect and promoteToAccount slot
provides:
  - A user_preferences table in Neon (nullable units column, one row per shaper, keyed on the Clerk user id), created by a migration applied to the development branch
  - saveUnitsPreference (app/actions/units.ts), an auth-first, ownership-scoped upsert Server Action
  - readUnitsPreference (lib/db/queries.ts), a read that treats an untrusted/legacy column value as "no choice"
  - resolveUnitsHandoff (lib/units-server.ts) now resolves real signedIn/account values, not stubs
  - The units provider's background account write: fire-and-forget on every pick, with a bounded quiet retry ladder, and the one-time promotion of a browser's explicit pick into an empty account
affects: [05-05-metric-on-the-five-design-screens, 05-06-metric-on-paper, 05-07-claude-md-rewrite-and-deploy]

actuals:
  tokens: 6650
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "userPreferences keys on clerkUserId as a PRIMARY KEY (one row per shaper, upsert via onConflictDoUpdate), unlike models where clerkUserId is only an indexed, repeatable column — the shape difference is documented in schema.ts's header comment"
    - "The units Server Action resolves quietly instead of throwing when signed out (unlike saveModel, which throws) — the provider calls it optimistically on every pick, and a signed-out shaper's pick is never an error condition for this action"
    - "The background account write's retry policy is a pure, tested function (nextUnitsWriteRetryDelayMs) that the provider's effect calls into, mirroring lib/models/autosave.ts's separation of policy-as-pure-function from timer-and-call-in-component"
    - "A newer pick cancels any pending retry via a ref-held setTimeout handle and resets a ref-held attempt counter, so a stale retry for an older system can never fire after a newer pick already changed it"

key-files:
  created:
    - app/actions/units.ts
    - drizzle/0002_tearful_vanisher.sql
    - drizzle/meta/0002_snapshot.json
  modified:
    - lib/db/schema.ts
    - lib/db/queries.ts
    - lib/db/ownership.test.ts
    - lib/units-preference.ts
    - lib/units-preference.test.ts
    - lib/units-server.ts
    - components/units-provider.tsx
    - drizzle/meta/_journal.json

key-decisions:
  - "Task 1 (checkpoint:decision, gate=blocking) was pre-resolved by the shaper before this executor was dispatched: option-a, a dedicated user_preferences table with a nullable units column keyed on the Clerk user id (the recommended option). No re-ask; recorded here as the decision this plan built against."
  - "lib/db/schema.ts's header comment was rewritten (not just appended to) — it previously said there was deliberately no per-user storage; it now says per-user preferences live here, keyed by Clerk's user id, and that this is not a users table by another name."
  - "The ownership-scoping regex in lib/db/ownership.test.ts was generalised from the literal table name models to any identifier followed by .clerkUserId, so one assertion covers both models.clerkUserId and userPreferences.clerkUserId rather than needing a second copy of the check."

requirements-completed: [UNIT-03, UNIT-04]

coverage:
  - id: D1
    description: "A user_preferences table exists in the schema with a nullable units column and a Clerk-id primary key; the migration that creates it has been generated and applied to the Neon development branch, and a second run reports nothing left to apply"
    requirement: "UNIT-03"
    verification:
      - kind: other
        ref: "npm run db:generate && npm run db:migrate (twice) against the Neon development branch"
        status: pass
      - kind: other
        ref: "grep -c user_preferences lib/db/schema.ts; grep -c CREATE TABLE drizzle/0002_tearful_vanisher.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: "saveUnitsPreference derives the writing identity from await auth() and never from a client-supplied parameter, upserts on the Clerk user id, and validates the system argument before writing"
    requirement: "UNIT-03"
    verification:
      - kind: unit
        ref: "lib/db/ownership.test.ts#every exported async function in app/design/actions.ts and app/actions/units.ts awaits auth() before any database call"
        status: pass
      - kind: unit
        ref: "lib/db/ownership.test.ts#no exported function signature accepts a caller-supplied owner parameter"
        status: pass
      - kind: unit
        ref: "lib/db/ownership.test.ts#app/actions/units.ts exports exactly the expected action and no others"
        status: pass
      - kind: unit
        ref: "lib/db/ownership.test.ts#every Drizzle statement touching an owned table constrains on the owning-user column"
        status: pass
    human_judgment: false
  - id: D3
    description: "readUnitsPreference returns null for a missing row or for a column value outside the two registered systems, never trusting the stored value as-is"
    requirement: "UNIT-03"
    verification:
      - kind: unit
        ref: "lib/units-preference.test.ts#parseUnitsPreference returns null — never a default — for anything unrecognised or absent"
        status: pass
    human_judgment: true
    rationale: "parseUnitsPreference (the allow-list readUnitsPreference delegates to) is exhaustively unit tested, but readUnitsPreference itself talks to the live Neon database and has no test double in this codebase's existing patterns (listModels has none either) — its correctness against a real row was confirmed by code review and by the successful migration/read path, not by an automated test of the query itself."
  - id: D4
    description: "The sign-in handoff now resolves against real signedIn/account values: an account's saved choice wins outright and is adopted into the browser even when the browser held a different explicit choice; an empty account adopts and keeps an explicit browser pick; a failed or not-yet-existing account read degrades to the cookie value"
    requirement: "UNIT-04"
    verification:
      - kind: unit
        ref: "lib/units-preference.test.ts#decideUnitsHandoff (all five cases, including the account-wins-over-a-different-browser-value case and the two signed-in-with-neither degrade case)"
        status: pass
    human_judgment: true
    rationale: "decideUnitsHandoff's decision rule is exhaustively unit tested (carried over from 05-01), but resolveUnitsHandoff's real wiring of await auth() + readUnitsPreference + the cookie into that rule, and the live first-paint result across an actual sign-in/reload/sign-out cycle against the Neon development branch, was not exercised in this automated worktree run — no live browser or Clerk session was available. This is recorded as an open item in .planning/WINDOWS.md (unrun-verify) for a human to confirm."
  - id: D5
    description: "A signed-in pick switches the screen on the click; the account write happens afterward in the background with a bounded, quiet retry ladder, and a newer pick cancels any pending retry so a stale attempt can never overwrite it"
    requirement: "UNIT-03"
    verification:
      - kind: unit
        ref: "lib/units-preference.test.ts#UNITS_WRITE_RETRY_DELAYS_MS / nextUnitsWriteRetryDelayMs (ladder shape, three rungs, exhausted returns null, negative floors to first rung)"
        status: pass
    human_judgment: true
    rationale: "The retry-delay policy itself is a pure function and is fully unit tested. The provider's use of it — scheduling and cancelling a real setTimeout, resetting the attempt counter on a newer pick, and never surfacing a rejected write to the shaper — has no component-level test in this codebase (units-provider.tsx has none, matching theme-provider.tsx's own untested-component precedent) and was verified by code review against lib/models/autosave.ts's nextStatusAfter discipline, not by an automated test of the effect itself."

duration: 22min
completed: 2026-09-05
status: complete
---

# Phase 5 Plan 2: The Units Choice Gets an Account Home

**A `user_preferences` table on the Neon development branch, an auth-first `saveUnitsPreference` Server Action, and the sign-in handoff now running on real account data instead of 05-01's stubs — a shaper's pick follows them to any device, with a bounded, silent retry if the account write ever fails.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-05T01:13:53Z
- **Completed:** 2026-09-05T01:36:00Z
- **Tasks:** 2 (Task 1 was a pre-resolved decision checkpoint, not code; Task 2 auto; Task 3 tdd tracer-style RED/GREEN)
- **Files modified:** 11 (3 new, 8 modified)

## Accomplishments

- A shaper now has a real account home for their units choice: `user_preferences`, one row per
  shaper keyed on their Clerk sign-in, with the `units` column left empty until they actually
  pick something. The migration that creates it has been generated and applied to the Neon
  **development** branch — confirmed by running it a second time and finding nothing left to do.
- `saveUnitsPreference` (a new Server Action) writes that choice, but only for whoever is
  currently signed in — it derives the writing identity from `await auth()` and never accepts a
  user id from the client, and it quietly does nothing for a signed-out caller rather than
  throwing (a signed-out shaper's pick lives entirely in the browser).
- `readUnitsPreference` reads it back, treating any value outside the two registered systems —
  a hand-edit, a legacy value, anything unexpected — as "hasn't chosen yet" rather than trusting
  it.
- `lib/db/ownership.test.ts`, the mechanical guard that already held `app/design/actions.ts` to
  "auth first, no client-supplied owner, every statement scoped to its own row," now holds the
  new action file to the same three rules, plus a fourth (exports exactly the one expected
  action) that will catch a second action added later without being named.
- `resolveUnitsHandoff` (the server-side function `app/layout.tsx` already called every request)
  now resolves *real* `signedIn`/`account` values instead of 05-01's `signedIn: false, account:
  null` stub — the full account-vs-browser rule from 05-01 (already fully unit-tested) is wired
  end to end for the first time. A failed or not-yet-existing account read degrades to the
  cookie value, the same way a failed board-list read degrades to an empty rack.
- The units provider now performs the account write in the background after every pick: the
  screen switches on the click exactly as before, and only afterward does a `saveUnitsPreference`
  call go out. If it fails, it retries up to three times with a growing delay (about one second,
  then four, then fifteen) before giving up silently — no toast, no banner, no reverted check. A
  newer pick cancels any retry still in flight for an older one, so a slow retry can never
  overwrite a more recent choice.
- The one-time promotion path is wired too: when a browser's explicit pick reaches an account
  that has nothing saved, it's written to the account once (guarded so a re-render can't fire it
  twice), through the same write-and-retry helper a click uses.

## Task Commits

Each task was committed atomically:

1. **Task 1: Decide the shape of the account storage** — pre-resolved by the shaper (option-a)
   before this executor was dispatched; no code, no commit of its own. Recorded above under
   `key-decisions`.
2. **Task 2: The account column, its migration, and the auth-first write** — `a44efc5` (feat)
3. **Task 3 (RED): Failing test for the background write's retry ladder** — `5904f1e` (test)
4. **Task 3 (GREEN): Wire the sign-in handoff and the quiet background write** — `35a600e` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — SUMMARY.md and
REQUIREMENTS.md only; STATE.md/ROADMAP.md are updated centrally by the orchestrator).

_Note: Task 3 was a `tdd="true"` task. RED (failing test) → GREEN (implementation); no separate
REFACTOR commit was needed — the GREEN implementation needed no cleanup pass._

## Files Created/Modified

- `lib/db/schema.ts` — added `userPreferences` (table) and `UserPreferenceRow` (type); rewrote
  the file's header comment, which previously claimed there was deliberately no per-user
  storage.
- `drizzle/0002_tearful_vanisher.sql` (new, generated by `npm run db:generate`) — the migration
  that creates `user_preferences`. Contains only a `CREATE TABLE` statement; does not touch
  `models`.
- `drizzle/meta/0002_snapshot.json` (new) and `drizzle/meta/_journal.json` (modified) —
  drizzle-kit's own bookkeeping for the new migration.
- `lib/db/queries.ts` — added `readUnitsPreference(clerkId): Promise<UnitsSystem | null>`, a
  read-only, ownership-scoped select run through `parseUnitsPreference`.
- `app/actions/units.ts` (new) — `saveUnitsPreference(system): Promise<void>`, the auth-first,
  validated, ownership-scoped upsert.
- `lib/db/ownership.test.ts` — extended to scan `app/actions/units.ts` alongside
  `app/design/actions.ts`; added an "exports exactly the expected action" assertion for it; and
  generalised the ownership-scoping regex from the literal `models.clerkUserId` to any
  `<identifier>.clerkUserId`, so `userPreferences.clerkUserId` is checked by the same assertion.
- `lib/units-preference.ts` — added `UNITS_WRITE_RETRY_DELAYS_MS` (three rungs: 1s, 4s, 15s) and
  `nextUnitsWriteRetryDelayMs(attempt)`, the pure, tested retry-ladder policy.
- `lib/units-preference.test.ts` — added the RED test cases for the retry ladder (rungs 0-2,
  exhausted returns null, negative floors to the first rung, ladder is non-empty and strictly
  increasing).
- `lib/units-server.ts` — `resolveUnitsHandoff` now calls `await auth()` and
  `readUnitsPreference(userId)` (wrapped in try/catch, degrading to `null`) instead of the 05-01
  stub's hardcoded `signedIn: false, account: null`.
- `components/units-provider.tsx` — added the background account write (`scheduleAccountWrite`,
  holding a retry timeout handle and attempt counter in refs, called from `setSystem` after the
  synchronous browser-store write) and the promotion effect (`handoff.promoteToAccount`, fired
  once per mount through the same write helper). The existing adoption effect
  (`handoff.adoptIntoBrowser`) is unchanged.

## Decisions Made

See `key-decisions` in the frontmatter. In short: Task 1's one-way-door decision (a dedicated
`user_preferences` table, not a `users` table, not deferring account storage) was made by the
shaper before this executor started and is recorded here rather than re-litigated; the schema
file's header comment was rewritten rather than patched, since it made a claim ("deliberately no
per-user storage") that is no longer true; and the ownership test's scoping check was generalised
to cover any table's `clerkUserId` column rather than adding a second, near-duplicate assertion
for `userPreferences`.

## Deviations from Plan

None — plan executed exactly as written. The migration filename
(`drizzle/0002_tearful_vanisher.sql`) differs from the plan's placeholder name
(`drizzle/0002_units_preference.sql`), but the plan itself says this is expected ("the executor
does not hand-write it, and the generated name may differ").

## Issues Encountered

None. `npm test` passed at 27 files / 1852 tests / 2 pre-existing skips after Task 3 (up from
1848 after Task 2, up from 1847 before this plan — each task added exactly the tests it should
have). `npx tsc --noEmit` showed only the two pre-existing phantom `LayoutProps` errors documented
as a known worktree artifact (not introduced by this plan). `npm run lint` showed only
pre-existing warnings in unrelated files, 0 errors. `npm run db:migrate` against the Neon
development branch succeeded on the first run and reported nothing further to do on the second.

## User Setup Required

None — no external service configuration required. (The migration was applied to the
**development** branch only, per the plan; production migration is 05-07's job, after this
plan's code is on `main` and Vercel has deployed it.)

## Next Phase Readiness

- The account half of UNIT-04 is now real: `resolveUnitsHandoff` resolves actual `signedIn`/
  `account` values, and the fully-tested `decideUnitsHandoff` rule from 05-01 is exercised end to
  end for the first time.
- The background write (D-11) is built and unit-tested at the policy level; its component-level
  wiring (the retry timeout, the cancel-on-newer-pick behavior) has no automated component test,
  matching this codebase's existing precedent of leaving provider-level effects untested in
  favor of testing the pure functions they call.
- **Recorded in `.planning/WINDOWS.md` as an open `unrun-verify` item:** the plan's own top-level
  manual verification step (sign in against the Neon development branch, pick Metric, reload,
  confirm it stuck, sign out, confirm no change, sign in on a second browser profile, confirm
  Metric is waiting) was not run in this automated worktree — no live browser or Clerk session
  was available to this executor, and the plan defines no `checkpoint:human-verify` task for it.
  A human should run this pass before the phase is considered fully verified.
- No blockers for 05-03/05-04 (the parallel plans in this wave) or for 05-05 onward — this plan
  touched only its own declared files (`lib/db/*`, `app/actions/units.ts`, `drizzle/*`,
  `lib/units-preference.ts`, `lib/units-server.ts`, `components/units-provider.tsx`) and did not
  touch `lib/geometry/units.ts` or `components/setup/*`, which the other wave-2 plans own.

## Self-Check: PASSED

All 11 key files (3 created, 8 modified) confirmed present on disk via `[ -f ]`. All three task
commits (`a44efc5`, `5904f1e`, `35a600e`) confirmed present via `git log --oneline --all`.

---
*Phase: 05-the-units-chooser*
*Completed: 2026-09-05*
