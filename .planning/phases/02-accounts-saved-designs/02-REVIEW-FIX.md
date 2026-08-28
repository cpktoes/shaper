---
phase: 02-accounts-saved-designs
fixed_at: 2026-08-28T01:55:43Z
review_path: .planning/phases/02-accounts-saved-designs/02-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-08-28T01:55:43Z
**Source review:** .planning/phases/02-accounts-saved-designs/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (3 Critical, 3 Warning — Info findings excluded per `fix_scope: critical_warning`)
- Fixed: 6
- Skipped: 0

**Verification environment:** All fixes were made and verified directly on the main working
tree, branch `main` (per explicit run instructions — this project's `npm run build` will not
resolve `next` from a git worktree, so isolation was not used for this run). `npm test`,
`npx tsc --noEmit`, `npm run lint`, and `npm run build` were all run from
`/Users/kontoes/Code/shaper` and are reproducible from that same tree.

## Fixed Issues

### CR-01: Autosave can report "Saved" while a newer, unsent edit is silently dropped

**Files modified:** `components/design/design-store.tsx`
**Commit:** `f419fee`
**Status:** fixed: requires human verification (bad-state-handling / race-condition fix — covered by the existing 739-test suite and `tsc`, but the actual race (an edit landing mid-flight) is not exercised by an automated test and should be confirmed by hand: open a board, trigger an edit, and before the "Saved" nav state settles, make another edit — the nav must not settle to "Saved" until that second edit is also written.)

**Applied fix:** Added a `designSnapshotFieldsRef` that always mirrors the latest
`designSnapshotFields` (kept current in a no-deps `useEffect`, since React's rules of hooks
forbid writing a ref during render — this needed a small adaptation from the REVIEW.md
suggestion, which showed a bare ref assignment). `performSave`'s `.then` handler now clears
`dirty` only when `designSnapshotFieldsRef.current` still matches the snapshot that was actually
sent (`snapshotAtSaveTime`); if an edit landed while the request was in flight, `dirty` stays
`true` and the autosave effect (which already re-runs when `saveInFlight` flips back to `false`)
schedules a follow-up save. `lib/models/autosave.ts`'s decision rules were not touched — the fix
lives entirely in the store's async handling, so its existing tests needed no changes.

### CR-02: Renaming the currently-open board from the rack is silently undone by the next autosave

**Files modified:** `components/setup/board-rack.tsx`
**Commit:** `6530184`
**Status:** fixed: requires human verification (bad-state-handling fix, correctness confirmed by `tsc`/lint/build but the actual desync only shows up across two screens over time — please confirm by hand: open a board, go back to `/`, rename that same board from its menu, reopen it and nudge a slider, and check the rack still shows the new name after the next autosave.)

**Applied fix:** `BoardRack` now also destructures `setBoardName` from `useDesign()`, and
`handleRenameConfirm` calls `setBoardName(name)` when the row being renamed (`renamingModel.id`)
matches the store's currently open `modelId` — exactly the fix REVIEW.md suggested, applied
as-is since the code context matched.

### CR-03: The very first save's failure is completely unhandled when the name prompt is skipped

**Files modified:** `components/design/save-button.tsx`
**Commit:** `15ed11a`
**Status:** fixed

**Applied fix:** Adapted from REVIEW.md's suggestion, which would have broken
`BoardNamePrompt`'s own error handling: that dialog's `handleSubmit` relies on `onSave` (i.e.
`runFirstSave`) throwing on failure so it can keep the dialog open with an inline error. Catching
inside `runFirstSave` itself (as REVIEW.md's snippet showed) would have swallowed that throw and
made the dialog silently close on a failed save. Instead, `runFirstSave` was left unchanged
(still throws), and the direct, dialog-skipping call site in `startSave` now attaches its own
`.catch`, setting a new `firstSaveError` state and logging the error. When `modelId === null` and
`firstSaveError` is set, the button renders the same clickable "Not saved" the store's own error
state already uses (UI-SPEC save-control), which retries via `startSave` and clears the error.

### WR-01: `saveModel`'s update path reports success even when zero rows were affected

**Files modified:** `app/design/actions.ts`
**Commit:** `2e26d21`
**Status:** fixed

**Applied fix:** Applied as suggested — the update branch now uses
`.returning({ id: models.id })` and throws `"Couldn't find that board."` if no row comes back,
matching the pattern `renameModel`/`duplicateModel` already use via their pre-update `select`.
`lib/db/ownership.test.ts`'s source-contract checks (auth-before-db-call, owner-scoped
statements) still pass unchanged.

### WR-02: Failed autosaves retry every 1200ms indefinitely, with no backoff

**Files modified:** `components/design/design-store.tsx`
**Commit:** `785f54d`
**Status:** fixed: requires human verification (timing/retry-policy logic — covered by `tsc`/lint/tests, but the backoff curve itself is not covered by an automated test; please confirm by hand or with a flaky-network simulation that repeated save failures visibly space out rather than firing every ~1.2s.)

**Applied fix:** Took REVIEW.md's second suggested option (grow the retry delay) rather than a
hard retry cap, since a hard cap would have required new UI-facing state. Added a
`consecutiveFailuresRef`, incremented on each `saveModel` rejection and reset to `0` on success
or when a different board is opened (`applyModel`). A new local `autosaveDelayFor` helper (not
added to `lib/models/autosave.ts`, since it only changes the timer's delay and not
`decideAutosave`'s save/wait/idle decision) doubles the debounce delay per consecutive failure,
capped at 30 seconds. The nav's existing "Not saved" click still bypasses this timer entirely for
an instant manual retry. While making this change, `npx eslint` surfaced a pre-existing
`react-hooks/refs` violation in the CR-01 fix (a ref written during render) that hadn't been
caught yet — fixed in the same commit by moving that ref update into a no-deps `useEffect`.

### WR-03: `created_at`/`updated_at` are timezone-naive, but formatted as if they were exact

**Files modified:** `lib/db/schema.ts`, `drizzle/0001_timezone_aware_timestamps.sql`, `drizzle/meta/0001_snapshot.json`, `drizzle/meta/_journal.json`
**Commit:** `b48fd5a`
**Status:** fixed — **migration not yet applied to any database**

**Applied fix:** Declared both columns `timestamp(..., { withTimezone: true })` as suggested, and
ran `npx drizzle-kit generate` to produce the matching migration (`0001_timezone_aware_
timestamps.sql`) and its snapshot/journal entries — `drizzle-kit generate` only diffs the schema
file against the existing migration history and needs no live database connection, so this ran
safely without touching `.env.local` or any deployed database. **The generated `ALTER COLUMN ...
SET DATA TYPE timestamp with time zone` migration has not been run against any database** (dev or
production) — running `drizzle-kit migrate` (or applying the SQL by hand) against a live
database was left for a deliberate, reviewed step, not something to do silently inside an
automated fix pass. Someone should run the migration before relying on this fix in a deployed
environment.

## Skipped Issues

None — all 6 in-scope findings were fixed.

---

_Fixed: 2026-08-28T01:55:43Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
