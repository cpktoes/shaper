---
phase: 02-accounts-saved-designs
plan: 02
subsystem: ui
tags: [autosave, react-context, clerk, server-actions, debounce]

# Dependency graph
requires:
  - phase: 02-accounts-saved-designs (plan 01)
    provides: Clerk sign-in/sign-up, the `models` table, `saveModel`/`listModels` Server Actions, and the two-state tracer SaveButton
provides:
  - "lib/models/autosave.ts — a pure, tested autosave decision function (decideAutosave) and status mapper (nextStatusAfter)"
  - "dirty/saveStatus tracking on the design store, paired with every mutator that already tracked boardStarted"
  - "an autosave effect in DesignProvider that writes a saved board to Postgres AUTOSAVE_DEBOUNCE_MS after the shaper stops editing"
  - "markSaved/requestSave on the design context for the shaper's first manual save and any later retry"
  - "SaveButton's four nav states: Save, Saving..., Saved, Not saved (one-click retry, no dialog)"
affects: [03-board-rack, 04-*]

# Actuals (#2632)
actuals:
  tokens: 7430
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure decision module + component-owned timer: lib/models/autosave.ts holds the rules (signed out / never saved / already in flight -> idle|wait|save), design-store.tsx owns the setTimeout and the actual saveModel call — mirrors the lib/geometry/units.ts boundary/component split."
    - "dirty is a state field paired 1:1 with boardStarted on every mutator (13 call sites), so a new mutator can't silently opt out of autosave; applyModel is the one documented exception."
    - "SaveStatus only ever reaches 'saved' via nextStatusAfter mapping a PromiseSettledResult — a rejected save can never render as saved, enforced by the function's own type rather than by convention at each call site."

key-files:
  created:
    - lib/models/autosave.ts
    - lib/models/autosave.test.ts
  modified:
    - components/design/design-store.tsx
    - components/design/save-button.tsx

key-decisions:
  - "AUTOSAVE_DEBOUNCE_MS = 1200ms — inside CONTEXT.md's 800-3000ms discretion window, long enough that dragging a slider doesn't fire a write per frame, short enough that a shaper who stops and looks away sees 'Saved' before wondering."
  - "Added markSaved(id, name) to the design store (not named in Task 2's action text, but listed in the plan's own 'Artifacts this phase produces' section) so the shaper's first manual save lands on saveStatus 'saved' immediately instead of passing back through 'idle' with no modelId-driven trigger to update it."
  - "requestSave is a no-op while modelId is null or a save is already in flight, mirroring decideAutosave's own gates rather than duplicating the checks in the button."
  - "Autosave failures (including a redeploy rotating a Server Action id) are surfaced as the ordinary 'error' status with a one-click retry — never swallowed to a silent no-op, per the plan's explicit failure-mode instruction."

requirements-completed: [MODL-01, MODL-02]

coverage:
  - id: D1
    description: "decideAutosave/nextStatusAfter — every autosave gate (signed out, never saved, already in flight, not dirty) decided by one pure tested function"
    requirement: "MODL-01"
    verification:
      - kind: unit
        ref: "lib/models/autosave.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A saved board autosaves a moment after the shaper stops editing; a never-saved board or a signed-out shaper autosaves nothing"
    requirement: "MODL-01"
    verification: []
    human_judgment: true
    rationale: "Requires watching a live browser session against the Neon database (a slider edit, a wait, and an updated_at check) — no browser/DB inspection tool was available in this execution environment."
  - id: D3
    description: "The nav shows Save / Saving... / Saved / Not saved, with 'Saved' only ever following a confirmed write, and a failed save retries in one click with no dialog"
    requirement: "MODL-02"
    verification:
      - kind: unit
        ref: "grep acceptance criteria: Saving/Not saved/Saved strings present, surf-warning-ink present, no <Dialog|AlertDialog|toast in save-button.tsx"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (offline save showing 'Not saved', clicking to retry, watching it settle) needs a live browser; not available in this execution environment."
  - id: D4
    description: "Save while signed out opens sign-in and continues straight into the name prompt and save, without a second click"
    requirement: "MODL-02"
    verification: []
    human_judgment: true
    rationale: "Interactive sign-in flow requires a live browser session; unchanged from 02-01's already-verified resume-after-sign-in mechanism, but not re-verified live in this execution."

duration: ~35min (across two sessions, separated by a host disk-space checkpoint)
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 2: Autosave and the Nav's Four Save States Summary

**Boards that autosave themselves 1.2s after a shaper stops editing, via a pure tested decision function, with a four-state nav Save control that never lies about whether the work is safe.**

## Performance

- **Duration:** ~35 min of active work, split across two sessions (a host machine ran out of disk space mid-Task 2; work resumed cleanly once space was freed — see Issues Encountered)
- **Tasks:** 3/3 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `lib/models/autosave.ts`: a pure, tested `decideAutosave` covering every gate (signed out, never saved, already in flight, not dirty) plus `nextStatusAfter`, which cannot map a rejected save to "saved" — the anti-lying-save-state prohibition enforced in the type system, not by convention.
- `design-store.tsx` now tracks `dirty`/`saveStatus` alongside every existing `boardStarted` mutator, and runs an autosave effect that debounces `AUTOSAVE_DEBOUNCE_MS` (1200ms) after the last edit before writing a saved board's snapshot to Postgres via `saveModel`, inside a transition.
- `SaveButton` shows the filled "Save" button only before a board's first save; afterward it reads the store's `saveStatus`/`isDirty` directly, rendering "Saving…", "Saved" with an accent check glyph, or warning-ink "Not saved" that retries on a single click — no dialog or toast interrupts a shaper mid-shape.
- Save while signed out still opens the sign-in dialog and continues straight into the name prompt and the save the shaper was reaching for (unchanged from 02-01, now sharing the same store-driven status pipeline once the first save lands).

## Task Commits

Each task was committed atomically:

1. **Task 1: The autosave rules, as a pure tested function** — `ff800af` (test, RED) → `8e170e9` (feat, GREEN)
2. **Task 2: Dirty tracking and autosave inside the design store** — `0f0384a` (feat)
3. **Task 3: The nav's four save states, and Save while signed out** — `c2dc10c` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `lib/models/autosave.ts` — `SaveStatus`, `AutosaveDecision`, `AUTOSAVE_DEBOUNCE_MS`, `decideAutosave`, `nextStatusAfter`
- `lib/models/autosave.test.ts` — table-driven coverage of every autosave gate
- `components/design/design-store.tsx` — `dirty`/`saveStatus` on `DesignState`, the autosave effect, `performSave`, `markSaved`, and `saveStatus`/`isDirty`/`requestSave`/`markSaved` on `DesignContextValue`
- `components/design/save-button.tsx` — rewritten as a four-state control driven by store state instead of local `saving` state

## Decisions Made

- `AUTOSAVE_DEBOUNCE_MS = 1200` — documented reasoning lives in `lib/models/autosave.ts`'s doc-comment (CONTEXT.md's 800-3000ms discretion window).
- `markSaved(id, name)` added to the store (see Deviations) so the button's first-save path sets `modelId`, `boardName`, `dirty: false` and `saveStatus: "saved"` atomically, rather than the nav briefly showing a stale status after the first save.
- `saveInFlight` is local `useState` in `DesignProvider`, not a `DesignState` field — no screen reads it directly, only the autosave effect and `performSave` need it to satisfy `decideAutosave`'s "never two concurrent writes" rule and to re-check after a save settles whether another edit arrived mid-flight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `markSaved(id, name)` to the design store**
- **Found during:** Task 3 (wiring `SaveButton`'s first-save path to the new status machinery)
- **Issue:** The plan's own "Artifacts this phase produces" frontmatter section lists `DesignContextValue.markSaved` as a new symbol this plan creates, but Task 2's action text never names or describes it — only `requestSave` is spelled out. Without it, the shaper's first save (which has no `modelId` yet for the autosave effect to target) would set `modelId`/`boardName` via the old `setModelId`/`setBoardName` calls and leave `saveStatus` at its default `"idle"`, so the nav would render neither the plain "Save" button (modelId is now set) nor "Saved" (status never changed) — a dead, unlabeled state.
- **Fix:** Added `markSaved(id, name)` to `design-store.tsx`, setting `modelId`, `boardName`, `dirty: false` and `saveStatus: "saved"` in one update; `save-button.tsx`'s first-save path calls it instead of `setModelId`/`setBoardName` separately.
- **Files modified:** `components/design/design-store.tsx`, `components/design/save-button.tsx`
- **Verification:** `npm test` (723/723), `npx tsc --noEmit`, `npm run lint` (0 errors) all pass with `markSaved` wired through; `npm run build` succeeds.
- **Committed in:** `c2dc10c` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for the nav to correctly report "Saved" after a shaper's very first save. No scope creep — the symbol was already named in the plan's own artifact manifest.

## Issues Encountered

- **Host disk exhaustion mid-execution.** Partway through Task 2, the host machine's root volume ran out of space (down to 243Mi free), causing every `Bash` invocation — including `df -h` and `true` — to fail with `ENOSPC`. Execution halted cleanly at a `checkpoint:human-action` with Task 1 fully committed and verified, and Task 2's only uncommitted change being a harmless imports-only edit to `design-store.tsx`. The user freed space (25Gi available afterward); the coordinator confirmed via `git status` that the tree matched the checkpoint report exactly, and execution resumed from Task 2 after re-verifying the `npm test`/`tsc` baseline was still green. No code was lost or reverted.
- **No browser/DB inspection tool available in this execution environment.** Several of the plan's acceptance criteria and success criteria require watching a live browser session (an offline save settling, sign-in resuming a save, a `models` row's `updated_at` advancing in Neon). These are marked `human_judgment: true` in the `coverage` block above rather than claimed as verified; all automatable checks (unit tests, `tsc`, `lint`, `build`, and every plan-specified `grep` acceptance criterion) pass.

## User Setup Required

None — no external service configuration required. (Clerk and Neon were already configured in 02-01.)

## Next Phase Readiness

- `saveStatus`/`isDirty`/`requestSave`/`markSaved` are now stable, documented parts of `DesignContextValue` — later plans in this phase (rack card menu, rename/duplicate/delete) can read or extend this state without re-deriving it.
- **Recommended before shipping this plan:** a live browser pass against the running dev server (already left running on `localhost:3000`) to confirm the two manual-verification items above — edit a saved board and watch it autosave, and force an offline save to confirm the "Not saved" retry cycle.

---
*Phase: 02-accounts-saved-designs*
*Completed: 2026-08-27*

## Self-Check: PASSED

All created/modified files found on disk; all four task commit hashes (`ff800af`, `8e170e9`, `0f0384a`, `c2dc10c`) found in git history.
