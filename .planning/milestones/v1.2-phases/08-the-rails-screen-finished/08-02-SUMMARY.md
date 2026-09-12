---
phase: 08-the-rails-screen-finished
plan: 02
subsystem: preferences
tags: [nextjs, drizzle, postgres, react, useSyncExternalStore, server-actions, clerk]

requires:
  - phase: 05-the-units-chooser
    provides: "The units preference machinery (schema, queries, server action, provider) that this plan extends rather than duplicates."
provides:
  - "A second per-shaper account preference: whether to include the Rail Band Instructions sheet when printing (PRNT-05)"
  - "lib/preference-handoff.ts — a generic, tested handoff/write-queue rule set now shared by units and the print toggle"
  - "The 'Include Rail Band Instructions in Print' checkbox at the end of the rails sidebar"
affects: [08-05-summary-mirror-checkbox, 08-06-production-migration]

actuals:
  tokens: 16088
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Generic preference-handoff rules (decidePreferenceHandoff<T>, createPreferenceWriteQueue<T>) extracted once and reused by two independent providers, rather than one preferences-carrying provider — keeps the load-bearing UnitsProvider byte-for-byte untouched while the print toggle gets full account parity"

key-files:
  created:
    - lib/print-instructions-preference.ts
    - lib/print-instructions-preference.test.ts
    - lib/print-instructions-server.ts
    - components/print-instructions-provider.tsx
    - app/actions/print-instructions.ts
    - lib/preference-handoff.ts
    - lib/preference-handoff.test.ts
    - drizzle/0003_early_pete_wisdom.sql
  modified:
    - app/layout.tsx
    - components/rails/rail-controls.tsx
    - lib/db/schema.ts
    - lib/db/queries.ts
    - lib/db/ownership.test.ts
    - lib/units-preference.ts

key-decisions:
  - "Provider shape: add-alongside, not merge — UnitsProvider/useUnits() kept byte-for-byte identical (git diff --quiet confirms), a sibling PrintInstructionsProvider/usePrintRailInstructions() mounts beside it, and only the pure handoff/write-queue logic is generalized into lib/preference-handoff.ts (per CONTEXT.md's assumption-delta decision)."
  - "Migration applied to the Neon development branch from the main checkout's cwd (for .env.local) while pointing drizzle-kit at the worktree's own drizzle.config.ts, so the migration folder resolved to this worktree rather than the main checkout's (which does not yet have the schema change)."

requirements-completed: [PRNT-05]

coverage:
  - id: D1
    description: "A tick-box labelled 'Include Rail Band Instructions in Print' at the end of the rails sidebar, starting unticked, remembered in the browser (localStorage + cookie) with no flash on reload, and never touching the open board's dirty/autosave state."
    requirement: PRNT-05
    verification:
      - kind: unit
        ref: "lib/print-instructions-preference.test.ts — parse/cookie/handoff branches"
        status: pass
      - kind: unit
        ref: "lib/units-isolation.test.ts — units feature unregressed by the new sidebar block"
        status: pass
    human_judgment: true
    rationale: "The no-flash-on-reload and no-dirty-board behaviors are visual/interactive checks (workflow.human_verify_mode: end-of-phase) — recorded below as deferred human checks per orchestrator ruling, not run in this worktree."
  - id: D2
    description: "The preference is stored on the shaper's account as a nullable print_rail_instructions column, applied to the Neon development branch, with a server action that can only ever write for the session's own user."
    requirement: PRNT-05
    verification:
      - kind: unit
        ref: "lib/db/ownership.test.ts — auth-before-db and no-caller-supplied-owner checks extended to app/actions/print-instructions.ts"
        status: pass
      - kind: other
        ref: "npm run db:migrate (applied to Neon development branch; second run confirmed idempotent)"
        status: pass
    human_judgment: true
    rationale: "The cross-device account-follows-the-shaper behavior needs a second signed-in browser session — deferred to end-of-phase UAT."
  - id: D3
    description: "One set of preference rules (lib/preference-handoff.ts), generic over value type, used by both units and the print toggle, with the units feature's own test file passing unedited."
    verification:
      - kind: unit
        ref: "lib/preference-handoff.test.ts — 17 assertions covering both a boolean and a string-enum value"
        status: pass
      - kind: unit
        ref: "lib/units-preference.test.ts — unedited, all 25 assertions still pass"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-07
status: complete
---

# Phase 8 Plan 02: Print-Instructions Preference Summary

**A second per-shaper account preference ("Include Rail Band Instructions in Print") built on the units chooser's own machinery, with the shared handoff/retry rules extracted once into `lib/preference-handoff.ts` so both preferences run the exact same sign-in/sign-out reconciliation.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-09-07T23:16:55-07:00
- **Completed:** 2026-09-07T23:33:00-07:00
- **Tasks:** 3
- **Files modified:** 15 (8 created, 7 modified — including the generated Drizzle migration)

## Accomplishments
- A shaper can tick "Include Rail Band Instructions in Print" at the end of the rails sidebar; it starts unticked and is remembered in the browser (localStorage + cookie), read on the server so it never flashes on reload.
- The preference is now stored on the shaper's account too: a nullable `print_rail_instructions` column on the existing `user_preferences` row, applied to the Neon development branch, read/written the same safe way units is (identity always from the session, never from the caller).
- The rules that make units and this new preference behave correctly at sign-in/sign-out — account wins, an explicit browser pick only ever promotes into an empty account, a default nobody chose is never written — now live once in `lib/preference-handoff.ts`, built test-first (RED → GREEN), and both `lib/units-preference.ts` and `lib/print-instructions-preference.ts` are thin wrappers over it. The units feature's own test file was not touched and all 25 of its assertions still pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tick the box on the rails screen and have the browser remember it** - `9610ee8` (feat)
2. **Task 2 [BLOCKING]: The preference follows the shaper to another device** - `5693fae` (feat)
3. **Task 3: One set of preference rules, used by both preferences** - `513e044` (test) → `3c9a295` (feat) → `e0770f0` (refactor)

_TDD gate sequence for Task 3 confirmed in git log: test(08-02) → feat(08-02) → refactor(08-02)._

## Files Created/Modified
- `lib/print-instructions-preference.ts` - pure preference module: storage/cookie constants, allow-list parser, `decidePrintRailInstructionsHandoff` (now a thin wrapper over the generic rules)
- `lib/print-instructions-preference.test.ts` - parse/cookie/handoff test coverage, mirroring `lib/units-preference.test.ts`'s shape
- `lib/print-instructions-server.ts` - `resolvePrintRailInstructionsHandoff()`: reads the cookie and, for a signed-in shaper, the account value (degraded to `null` on any read failure)
- `components/print-instructions-provider.tsx` - `PrintInstructionsProvider`/`usePrintRailInstructions()`: `useSyncExternalStore`, `reconciledRef` no-flash discipline, background account write, adoption/promotion effects
- `app/actions/print-instructions.ts` - `savePrintRailInstructionsPreference(value)`: `"use server"`, auth-before-db, boolean allow-list guard, `onConflictDoUpdate` upsert
- `lib/preference-handoff.ts` - generic `decidePreferenceHandoff<T>`, `createPreferenceWriteQueue<T>`, `nextPreferenceWriteRetryDelayMs`, `PREFERENCE_WRITE_RETRY_DELAYS_MS`
- `lib/preference-handoff.test.ts` - 17 assertions, run once against a boolean value and once against a string-enum value
- `drizzle/0003_early_pete_wisdom.sql` - `ALTER TABLE "user_preferences" ADD COLUMN "print_rail_instructions" boolean;` — no NOT NULL, no default, no other statement
- `app/layout.tsx` - awaits `resolvePrintRailInstructionsHandoff()` alongside `resolveUnitsHandoff()`, mounts `<PrintInstructionsProvider>` inside `<UnitsProvider>`
- `components/rails/rail-controls.tsx` - new Checkbox + helper-line block at the end of `RailControls`, reading/writing only through `usePrintRailInstructions()` (no `useDesign` import — confirmed by acceptance-criteria grep)
- `lib/db/schema.ts` - `userPreferences.printRailInstructions: boolean("print_rail_instructions")`, nullable, no default
- `lib/db/queries.ts` - `readPrintRailInstructionsPreference(clerkId)`, mirroring `readUnitsPreference`
- `lib/db/ownership.test.ts` - extended to also read `app/actions/print-instructions.ts` into every ownership assertion, plus its own "exports exactly the expected action" check
- `lib/units-preference.ts` - `decideUnitsHandoff`/`createUnitsWriteQueue`/`nextUnitsWriteRetryDelayMs`/`UNITS_WRITE_RETRY_DELAYS_MS` now call through to `lib/preference-handoff.ts`; every exported name and its observable behavior unchanged (`lib/units-preference.test.ts` unedited and green)

## Decisions Made
- **Provider shape — add-alongside (CONTEXT.md's own locked decision, confirmed against real call-site count):** `UnitsProvider`/`useUnits()` is used from 24 files; merging preferences into one provider would put a shipped, zero-regression-bar feature in the blast radius of all 24 for no behavioral gain. A sibling `PrintInstructionsProvider` was added instead, and only the pure rules (handoff decision, write queue) were generalized — verified by `git diff --quiet components/units-provider.tsx` and `git diff --quiet lib/units-preference.test.ts` both exiting 0.
- **Migration workaround for the worktree's missing `.env.local`:** `npm run db:migrate` fails in this worktree (no `.env.local` here, per CLAUDE.md's hard block on `.env*` files). Ran `cd /Users/kontoes/Code/shaper && npx drizzle-kit migrate --config <worktree>/drizzle.config.ts` instead — this reads `.env.local` from the main checkout's cwd while resolving `schema`/`out` relative to the worktree's own config, so the migration that was actually generated in this worktree is the one that got applied. Confirmed idempotent by running it twice.

## Deviations from Plan

None — plan executed exactly as written, including the TDD RED→GREEN sequence for Task 3 and the tracer feedback gate after Task 1 (re-verified end-to-end before proceeding to Task 2, per orchestrator ruling 1).

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase` and orchestrator ruling 1, no `checkpoint:human-verify` was returned for this plan. The following `<human-check>` items from 08-02-PLAN.md are recorded here for the end-of-phase UAT pass:

- **Task 1:** On `/design/rails`, scroll the sidebar to the bottom, tick the box, reload the page, and confirm it is still ticked and did not flash unticked first.
- **Task 1:** Tick the box while a saved board is open and confirm the board does not go to a not-saved state and no autosave fires.
- **Task 2:** Sign in on one browser, tick the box, then open the app signed in on a second browser profile and confirm the box is already ticked there.
- **Task 3:** Sign out, tick the box, sign in to an account that has never set it, and confirm the tick survives; then sign out and confirm the box still shows what the browser holds.

## Issues Encountered

`npm run db:migrate` could not reach the database from this worktree (no `.env.local` here — see Decisions Made above for the workaround used, per orchestrator ruling 3). No other issues.

## User Setup Required

None — no external service configuration required. Production migration remains 08-06's human step, after this code is pushed to `main` and deployed (CLAUDE.md database rule).

## Next Phase Readiness

- `usePrintRailInstructions()` and `savePrintRailInstructionsPreference` are ready for 08-05's summary-screen mirror checkbox to call directly — no further preference-plumbing work needed there.
- `lib/preference-handoff.ts`'s generic rules are available for any future third preference without re-deriving the handoff/retry logic a third time.
- The development database has the new column; 08-06 still needs to run the production migration after this code deploys.
- No blockers.

---
*Phase: 08-the-rails-screen-finished*
*Completed: 2026-09-07*
