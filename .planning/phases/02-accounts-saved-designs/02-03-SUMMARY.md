---
phase: 02-accounts-saved-designs
plan: 03
subsystem: ui
tags: [react, nextjs-suspense, react-context, vitest]

# Dependency graph
requires:
  - phase: 02-accounts-saved-designs (plan 01)
    provides: Clerk sign-in, the `models` table, `listModels`/`saveModel`, `parseSnapshot`, and the tracer's BoardRack/BoardRackCard/SetupScreen
  - phase: 02-accounts-saved-designs (plan 02)
    provides: dirty tracking, saveStatus and the autosave machinery on the design store
provides:
  - "lib/models/rack-order.ts — sortRackEntries, a pure tested ordering rule: in-progress board always first, saved boards most-recently-touched first, row id breaking exact-timestamp ties"
  - "BoardRackCard's in-progress variant — the same card shell as a saved board, drawing live from the design store, tagged \"In progress — not saved\" in muted (never warning) ink"
  - "SetupScreen composing one ordered rack (in-progress + saved) via sortRackEntries, replacing the standalone ContinueBoardCard in the preset grid"
  - "A hardened home-page read path: a failed or corrupt board-list degrades to the plain preset grid (logged server-side), and the list fetch is isolated behind a Suspense boundary so a slow query never blocks or spins"
affects: [02-04, 02-05, 02-06]

# Actuals (#2632)
actuals:
  tokens: 6430
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ordering-as-a-pure-function: sortRackEntries lives in lib/models/ (not lib/geometry/, since it isn't board math) but follows the identical pure/tested/no-React-import boundary contract as everything under lib/geometry/ — a component composes the list, the pure function decides its order, never the other way round."
    - "One list, one sort, one renderer: SetupScreen composes the in-progress entry and the saved entries into a single array and calls sortRackEntries once; BoardRack only renders an already-ordered list — it does not re-derive order, so there is exactly one place a shaper's rack order can be wrong."
    - "Streaming an uncached DB read behind its own Suspense boundary (BoardRackData in app/page.tsx), with the fallback re-rendering the same client component (SetupScreen) at its own empty state — so 'loading' and 'nothing to show' are pixel-identical, never a spinner."

key-files:
  created:
    - lib/models/rack-order.ts
    - lib/models/rack-order.test.ts
  modified:
    - components/setup/board-rack.tsx
    - components/setup/board-rack-card.tsx
    - components/setup/setup-screen.tsx
    - app/page.tsx
    - lib/db/queries.ts

key-decisions:
  - "sortRackEntries is generic over T extends RackEntry, so setup-screen.tsx can sort objects that carry the full SavedModel alongside id/name/updatedAt without a second lookup pass after sorting."
  - "The in-progress card's tie-break/identity question doesn't apply — there is at most one in-progress entry per render, so it always sorts first by a direct kind check rather than needing an id of its own."
  - "The slow-query Suspense boundary lives in app/page.tsx (a nested async BoardRackData Server Component), not inside setup-screen.tsx or board-rack.tsx — this required no change to either client component's prop shape, since the fallback is just another render of SetupScreen with an empty models array, identical to the already-existing empty/signed-out case."
  - "continue-board-card.tsx is left on disk, unmodified and unimported — its job (the first rack card) moved into BoardRackCard's in-progress variant, but the plan explicitly does not own deleting a file it didn't create the last reference to removing."

requirements-completed: [MODL-02, MODL-03]

coverage:
  - id: D1
    description: "sortRackEntries orders the in-progress entry first, saved boards most-recently-touched first, with a deterministic row-id tiebreak and no input mutation"
    requirement: "MODL-03"
    verification:
      - kind: unit
        ref: "lib/models/rack-order.test.ts (6 tests: in-progress-first from any input position, most-recent-first, deterministic tie/repeat, distinct-by-id names, empty input, no mutation)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A signed-in shaper's home screen leads with their rack (in-progress card first, saved boards after) above the preset grid; a signed-out visitor or a shaper with nothing saved and nothing in progress sees exactly the plain preset grid"
    requirement: "MODL-03"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit, npm run lint, npm test (729/729), npm run build — all pass with the rack wired into setup-screen.tsx"
        status: pass
    human_judgment: true
    rationale: "No Clerk session or saved Neon rows exist in this execution environment (no browser/login tool available), so the actual signed-in rendering order and the signed-out plain-grid view were not visually confirmed live — only the code path and its automated checks were verified."
  - id: D3
    description: "Each rack card shows the board's own outline, name, dimensions in shaper units plus litres, and a last-touched date (saved) or the \"In progress — not saved\" tag (in-progress), with names truncating via CSS only"
    requirement: "MODL-03"
    verification:
      - kind: unit
        ref: "grep acceptance criteria: 'In progress' present, no surf-warning class, truncate present, no .slice/.substring/.substr, no inline 25.4/1_000_000 conversions in board-rack-card.tsx"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation of the rendered card (thumbnail alignment, truncation behavior on a real long name, tag color in the browser) needs a live browser session with a signed-in shaper; not available in this execution environment."
  - id: D4
    description: "A corrupt saved-board row is dropped (and logged) without breaking the rest of the rack; a failed or slow board-list read degrades to the plain preset grid rather than a broken or spinning page"
    requirement: "MODL-03"
    verification:
      - kind: unit
        ref: "grep acceptance criteria: parseSnapshot present, catch blocks around both the listModels call and the per-row parse in app/page.tsx; no insert/update/delete verb in lib/db/queries.ts"
        status: pass
    human_judgment: true
    rationale: "Manually corrupting a row's snapshot jsonb in Neon, pointing DATABASE_URL at an unreachable host, and artificially throttling the query all require live Neon/browser access this execution environment does not have; the code paths and their unit-level acceptance criteria were verified instead."

duration: ~30min
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 3: The Board Rack, Complete Summary

**A pure `sortRackEntries` function pins the unsaved in-progress board first and orders saved boards newest-touched first with a deterministic tiebreak; the home screen now composes and renders that single ordered rack, and a corrupt row or a slow/failed board-list query degrades to the plain preset screen instead of breaking the page.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-27
- **Tasks:** 3/3 completed (one TDD)
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `lib/models/rack-order.ts`'s `sortRackEntries`: the in-progress board always sorts first regardless of input order (D-07), saved boards sort most-recently-touched first, and an exact `updatedAt` tie is broken deterministically by row id — calling it twice on the same input always returns the same order, and the input array is never mutated.
- `BoardRackCard` gained an `"in-progress"` variant sharing the identical card shell, window frame and thumbnail treatment as a saved card, drawing its outline live from the design store and carrying the "In progress — not saved" tag in muted ink — never the warning color, since it's information about where a board lives, not a problem.
- `SetupScreen` now composes one list — the in-progress entry from the store plus one entry per saved row from props — runs it through `sortRackEntries` once, and hands the already-ordered result to `BoardRack`, which is now a pure renderer. The standalone `ContinueBoardCard` is gone from the preset grid; its job is the rack's first card.
- `app/page.tsx`'s board-list read now logs (server-side) both a failed `listModels` call and each row dropped by a failing `parseSnapshot`, and isolates the read inside a `Suspense`-wrapped nested Server Component whose fallback renders the exact same plain-preset-grid view the empty/signed-out cases already produce — so a slow query degrades into "no boards yet" rather than a spinner.
- `lib/db/queries.ts`'s `listModels` doc-comment now states its read-only contract and the no-live-cross-tab-sync promise explicitly.

## Task Commits

Each task was committed atomically:

1. **Task 1: The rack's ordering rule, as a pure tested function** — `776a014` (test, RED) → `362641d` (feat, GREEN)
2. **Task 2: The complete rack — in-progress card first, saved boards after** — `b6f8ae6` (feat)
3. **Task 3: Make the rack survive a bad row and a slow query** — `ae29693` (feat)

**Plan metadata:** this commit (docs: complete plan)

_Note: Task 1 is `tdd="true"` — the test file was committed first (verified failing via `git stash` against the not-yet-existing module), then the implementation was restored and committed separately, per the plan's TDD gate._

## Files Created/Modified

- `lib/models/rack-order.ts` — `RackEntry`/`SavedRackEntry`/`InProgressRackEntry` and `sortRackEntries`, pure and generic over richer saved-entry shapes
- `lib/models/rack-order.test.ts` — table-driven coverage of every ordering rule in the plan's behavior block
- `components/setup/board-rack-card.tsx` — added the `"in-progress"` variant alongside the existing saved-card rendering, sharing a `CARD_SHELL_CLASS`/`CardThumbnail`/`CardMetadataLine` set of small internal helpers to keep the two variants' markup from drifting apart
- `components/setup/board-rack.tsx` — rewritten to take an already-ordered `BoardRackEntry[]` and render one card per entry; still returns `null` for an empty list
- `components/setup/setup-screen.tsx` — builds the rack's entry list from the design store + `models` prop, sorts it via `sortRackEntries`, removes the standalone `ContinueBoardCard` from the preset grid
- `app/page.tsx` — the board-list read is now inside `BoardRackData`, a nested async Server Component wrapped in `<Suspense fallback={<SetupScreen models={[]} />}>`; both failure paths (a thrown `listModels` call, a per-row `parseSnapshot` rejection) now log server-side before degrading
- `lib/db/queries.ts` — `listModels`'s doc-comment states the read-only/no-write/no-cross-tab-sync contract explicitly

## Decisions Made

- `sortRackEntries<T extends RackEntry>` is generic so the caller (`setup-screen.tsx`) can sort objects carrying the full `SavedModel` alongside the `id`/`name`/`updatedAt` the sort itself needs, avoiding a second pass to re-attach the model after ordering.
- The slow-query Suspense boundary was placed in `app/page.tsx` via a nested `BoardRackData` async component rather than restructuring `SetupScreen` or `BoardRack` — this kept the fix inside Task 3's declared files and required no change to either client component's prop contract, since the fallback is simply another render of the already-existing empty state.
- `continue-board-card.tsx` was left on disk, unimported, per the plan's explicit instruction not to delete a file this plan doesn't own removing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grep-sensitive doc-comment wording in `lib/db/queries.ts`**
- **Found during:** Task 3, running the plan's own acceptance-criteria greps
- **Issue:** The first draft of `listModels`'s expanded doc-comment used the literal word "delete" in prose ("a save, rename or delete performed in another tab"), which matched the acceptance criterion's `grep -nE '\b(insert|update|delete)\b' lib/db/queries.ts` check meant to confirm the read path performs no writes.
- **Fix:** Reworded the sentence to describe the same fact ("a change made to a board from another tab or another device") without the literal matched word.
- **Files modified:** `lib/db/queries.ts`
- **Verification:** The grep now returns exit 1 (no matches) as the acceptance criterion requires; `npx tsc --noEmit`, `npm test`, `npm run lint` all still pass.
- **Committed in:** `ae29693` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a self-inflicted doc-comment wording collision, caught and fixed before committing)
**Impact on plan:** No scope creep — the fix only reworded prose inside the same doc-comment this task was already writing.

## Issues Encountered

- **No live browser or Neon session available in this execution environment.** Every acceptance criterion checkable by `npm test`/`npx tsc --noEmit`/`npm run lint`/`npm run build`/grep passed. The plan's manual-verification rows — the rack's visible order across two reloads with real saved boards, a corrupted row's card disappearing while the rest of the rack survives, an unreachable-database fallback, and a throttled-query visual check — all require a signed-in browser session against the live Neon/Clerk setup, which this environment has no tool to drive. These are marked `human_judgment: true` in the `coverage` block above rather than claimed as verified.
- `npm run dev`'s server (left running throughout, per the environment notes) served `/` at 200 with no errors both before and after every change, confirming the signed-out code path at minimum renders without throwing.

## User Setup Required

None — no external service configuration required. (Clerk and Neon were already configured in 02-01.)

## Next Phase Readiness

- `lib/models/rack-order.ts`'s `sortRackEntries` and the `RackEntry`/`SavedRackEntry`/`InProgressRackEntry` types are stable, pure, and available for any later plan that needs the same ordering (e.g. a future rename/duplicate/delete action that needs to know where a freshly-touched row will land in the rack).
- `BoardRackCard`'s `variant` prop and its shared internal helpers (`CardThumbnail`, `CardMetadataLine`) give 02-04's rack-card menu (Rename/Duplicate/Delete) a stable place to attach a trigger without duplicating the card markup.
- **Recommended before shipping this plan:** a live browser pass with a signed-in shaper who has at least one saved board and one board in progress, to confirm the rack's visible order, the in-progress tag's color, and the corrupted-row/unreachable-database/throttled-query degradations the plan's own acceptance criteria call for.

---
*Phase: 02-accounts-saved-designs*
*Completed: 2026-08-27*
