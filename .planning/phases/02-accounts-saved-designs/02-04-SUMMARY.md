---
phase: 02-accounts-saved-designs
plan: 04
subsystem: ui
tags: [server-actions, drizzle, base-ui, react, dialogs]

# Dependency graph
requires:
  - phase: 02-accounts-saved-designs (plan 01)
    provides: Clerk sign-in, the `models` table, `saveModel`, `parseSnapshot`/`buildSnapshot`, and the ownership-test source-contract pattern
  - phase: 02-accounts-saved-designs (plan 03)
    provides: the complete board rack (in-progress + saved cards, one ordered list) this plan adds management to
provides:
  - "renameModel, duplicateModel, deleteModel — three more ownership-scoped Server Actions in app/design/actions.ts, all covered by the widened lib/db/ownership.test.ts source-contract"
  - "components/setup/rack-card-menu.tsx — RackCardMenu, the app's one Base UI menu pattern reused for Rename/Duplicate/Delete"
  - "components/setup/rename-dialog.tsx and delete-confirm-dialog.tsx — the two new dialogs, each with their own in-flight/error handling"
  - "BoardRack now owns the whole rack's Rename/Delete dialog state plus a per-card duplicateErrors map — the single place D-13's board management lives"
affects: [02-05, 02-06]

# Actuals (#2632)
actuals:
  tokens: 6415
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Menu trigger as a DOM sibling, not a nested interactive element: BoardRackCard's saved variant wraps the whole-card <button> and RackCardMenu in a relatively-positioned <div>, with the trigger absolutely positioned over the card's corner — a click on it can never bubble into the card's own navigation, because it was never a descendant of the button in the first place."
    - "One dialog instance per rack, not per card: BoardRack lifts renamingModel/deletingModel state (mirroring setup-screen.tsx's ReplaceBoardDialog 'pending' convention) so there is exactly one RenameDialog and one DeleteConfirmDialog for the whole rack, regardless of board count."
    - "Instant actions get per-item error state, not a dialog: Duplicate has no confirmation step, so its failure surfaces as a duplicateErrors map keyed by row id, rendered inline on that one card — retried simply by choosing Duplicate again."
    - "Render-phase state reset on a reused dialog (sign-in-dialog.tsx's wasOpen pattern, now shared by rename-dialog.tsx and delete-confirm-dialog.tsx): comparing open against a tracked wasOpen during render, not in an effect, re-arms the field/error/in-flight state for whichever board the dialog now applies to."

key-files:
  created:
    - components/setup/rack-card-menu.tsx
    - components/setup/rename-dialog.tsx
    - components/setup/delete-confirm-dialog.tsx
  modified:
    - app/design/actions.ts
    - lib/db/ownership.test.ts
    - components/setup/board-rack-card.tsx
    - components/setup/board-rack.tsx

key-decisions:
  - "BoardRackCard's onRename/onDuplicate/onDelete are optional props defaulting to no-ops, so the menu renders correctly even before a caller wires real behavior in — kept Task 2 (the menu shell) and Task 3 (the wiring) each independently type-safe without touching board-rack.tsx twice for the same reason."
  - "Rename never touches the design store, even when the renamed board is the one open in the editor — D-13 only changes the row's label; deleting the open board clears modelId (via the store's existing setModelId) so the next Save creates a fresh row instead of writing over a row that's gone."
  - "Duplicate's failure affordance is an inline warning-ink row below the card (outside the whole-card button, so clicking it never navigates) rather than reopening the menu with an error — chosen at execution per the plan's own 'pick the affordance' instruction."

requirements-completed: [MODL-01, MODL-03]

coverage:
  - id: D1
    description: "renameModel, duplicateModel and deleteModel each re-derive the caller from the session, scope every query by both row id and clerk_user_id, and are the only four exported actions in app/design/actions.ts (a fifth would fail the widened source-contract test)"
    requirement: "MODL-01"
    verification:
      - kind: unit
        ref: "lib/db/ownership.test.ts#every exported async function awaits auth() before any database call; no exported function signature accepts a caller-supplied owner parameter; every Drizzle statement constrains on the owning-user column; app/design/actions.ts exports exactly the four expected actions"
        status: pass
      - kind: manual_procedural
        ref: "Cross-account IDOR check: signed in as one shaper, passing another shaper's row id to rename/duplicate/delete and confirming no row changes"
        status: unknown
    human_judgment: true
    rationale: "The cross-account check requires two real Clerk sessions and a live Neon database inspection; no browser/DB tool was available in this execution environment. The mechanical ownership-scoping is proven by the unit tests above; only the live cross-account behavior is unverified."
  - id: D2
    description: "Every saved rack card carries a Rename / Duplicate / Delete menu built on the app's one Base UI menu pattern, with Delete in the destructive color; the in-progress card carries no menu"
    requirement: "MODL-03"
    verification:
      - kind: unit
        ref: "grep acceptance criteria: @base-ui/react/menu present, no components/ui/dropdown-menu.tsx generated, data-highlighted:bg-surf-well present, surf-warning-ink present, aria-label present; npx tsc --noEmit and npm run lint both clean"
        status: pass
      - kind: manual_procedural
        ref: "Browser check: clicking the trigger opens the menu without navigating, Tab reaches the card and the trigger as two separate stops, the in-progress card shows no trigger"
        status: unknown
    human_judgment: true
    rationale: "Keyboard-focus order and click-vs-navigate behavior need a live browser session; not available in this execution environment. The DOM-sibling structure (trigger never nested inside the card's button) was verified by reading the rendered JSX and by npm run build succeeding, not by driving a browser."
  - id: D3
    description: "Rename changes only the label (blocked inline on empty/whitespace before any request); Duplicate is instant and produces a 'Copy of …' card with the original untouched; Delete is unreachable without a confirm naming the board; every failure (rename, duplicate, delete) is visible and retryable, never a silent no-op"
    requirement: "MODL-01, MODL-03"
    verification:
      - kind: unit
        ref: "grep acceptance criteria: Rename board/Board needs a name present in rename-dialog.tsx with no slice/substring/maxLength; Delete Board/Couldn't delete present in delete-confirm-dialog.tsx; npm test (730/730), npx tsc --noEmit, npm run lint, npm run build all pass"
        status: pass
      - kind: manual_procedural
        ref: "Browser check: live rename/duplicate/delete flows, forced failures on each, and deleting the board currently open in the editor"
        status: unknown
    human_judgment: true
    rationale: "These are interaction/network-failure flows that need a live signed-in browser session against the real Neon database; not available in this execution environment. All automatable checks (unit tests, tsc, lint, build, every plan-specified grep) pass."

duration: ~20min
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 4: Board Management — Rename, Duplicate, Delete Summary

**Three ownership-scoped Server Actions (renameModel/duplicateModel/deleteModel), a Base-UI rack-card menu matching the nav's settings menu, and Rename/Delete dialogs wired up with their own in-flight and failure states — including what happens when the board being renamed or deleted is the one open in the editor.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-27
- **Tasks:** 3/3 completed (Task 1 is TDD)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- `lib/db/ownership.test.ts` now asserts `app/design/actions.ts` exports exactly `saveModel`, `renameModel`, `duplicateModel`, `deleteModel` and no others — a fifth action added later without updating this list fails loudly, on top of the existing auth-before-db-call and owner-scoping checks now covering all four.
- `renameModel` updates only the `name` column (verbatim, no cap or normalization), constrained on row id and `clerk_user_id`.
- `duplicateModel` reads the source row through an ownership-scoped select (never trusting client input), validates it through `parseSnapshot`, and inserts a fresh `Copy of {name}` row with new timestamps — floating it to the top of the last-touched-first rack. The source row is untouched.
- `deleteModel` removes the row outright — there is no trash table, since D-13 makes the confirm dialog the safety.
- `RackCardMenu` is built directly on `@base-ui/react/menu`, matching `components/settings-menu.tsx`'s shell/positioning/row-hover treatment byte-for-byte rather than adding a second, shadcn-generated dropdown-menu pattern. Delete gets the destructive `surf-warning-ink` color, the only place it appears on the rack.
- `BoardRackCard`'s saved variant restructures the whole-card button and the menu trigger as DOM siblings inside a relatively-positioned wrapper — the trigger sits visually over the card's corner but is never a descendant the card's own click handler could catch.
- `RenameDialog` and `DeleteConfirmDialog` mirror `board-name-prompt.tsx`/`replace-board-dialog.tsx`'s shells respectively, each disabling their primary action while in flight and keeping the dialog open with an inline error on failure.
- `BoardRack` owns one `RenameDialog` and one `DeleteConfirmDialog` for the whole rack (not one pair per card) plus a per-card `duplicateErrors` map, since Duplicate has no dialog of its own and needs a visible, retryable failure affordance instead.
- Deleting the board currently open in the editor clears its `modelId` (the design itself stays on screen) so the next Save creates a fresh row instead of writing over one that's gone; renaming never touches the store at all.

## Task Commits

Each task was committed atomically:

1. **Task 1: renameModel, duplicateModel and deleteModel — each scoped to its owner** — `8d0d0a2` (test, RED) → `46c33c5` (feat, GREEN)
2. **Task 2: The rack card's three-item menu** — `2084e25` (feat)
3. **Task 3: Rename, Duplicate and Delete wired up, including when they fail** — `a27f25b` (feat)

**Plan metadata:** this commit (docs: complete plan)

_Note: Task 1 is `tdd="true"` — the widened ownership test was committed first and confirmed failing (only `saveModel` existed), then the three actions were added and the same test confirmed passing, per the plan's TDD gate._

## Files Created/Modified

- `app/design/actions.ts` — added `renameModel`, `duplicateModel` (+ `DuplicateModelResult`), `deleteModel`, each following `saveModel`'s established auth-first, ownership-scoped, `revalidatePath`-on-success shape
- `lib/db/ownership.test.ts` — added the "exports exactly the four expected actions" source-contract test
- `components/setup/rack-card-menu.tsx` — new: `RackCardMenu`, the Base UI menu shell shared with `settings-menu.tsx`
- `components/setup/rename-dialog.tsx` — new: `RenameDialog`, pre-filled/auto-selected field, inline validation, disable-while-saving, error-on-failure
- `components/setup/delete-confirm-dialog.tsx` — new: `DeleteConfirmDialog`, destructive confirm naming the board, disable-while-deleting, error-on-failure
- `components/setup/board-rack-card.tsx` — saved variant restructured to a relatively-positioned wrapper around the card button and `RackCardMenu`; added `onRename`/`onDuplicate`/`onDelete`/`duplicateError` props
- `components/setup/board-rack.tsx` — owns `renamingModel`/`deletingModel`/`duplicateErrors` state, calls the three new Server Actions, renders the two lifted dialogs, and clears `modelId` on deleting the open board

## Decisions Made

- `BoardRackCard`'s three callback props are optional, defaulting to no-ops — this let Task 2 (the menu shell) ship a fully-typed, working-if-inert menu without first touching `board-rack.tsx`, and let Task 3 wire real behavior in without changing the props' shape.
- Rename leaves the design store untouched even when the renamed board is open in the editor (only the row's label changes); delete clears `modelId` via the store's existing `setModelId` so the next Save on that board creates a new row rather than erroring against a row that's gone.
- Duplicate's failure affordance is an inline warning-ink line below the card, outside the whole-card button (so clicking it can't navigate) — chosen at execution time per the plan's "pick the affordance and verify by forcing a failure" instruction, since Duplicate has no dialog to keep open.
- One `RenameDialog`/`DeleteConfirmDialog` pair lives at the rack level, not per card — mirrors `setup-screen.tsx`'s existing lifted-state pattern for the replace-board confirm, and avoids mounting N otherwise-identical dialog instances for a rack with N boards.

## Deviations from Plan

None — plan executed exactly as written. The rack-level (rather than per-card) dialog placement and the optional-callback-props shape were both left to Claude's discretion by the plan's own "Keep the dialog open/close state local to the card or the rack" and "Pick the affordance during execution" instructions, not deviations from anything the plan specified.

## Issues Encountered

- **No live browser or Neon session available in this execution environment.** Every acceptance criterion checkable by `npm test` (730/730), `npx tsc --noEmit`, `npm run lint`, `npm run build`, and every plan-specified `grep` passes. The plan's manual-verification rows — the cross-account IDOR check, the menu's click-vs-navigate and keyboard-focus behavior, live rename/duplicate/delete flows including forced failures, and deleting the board currently open in the editor — all require a live signed-in browser session against the real Neon database, which this environment has no tool to drive. These are marked `human_judgment: true` in the `coverage` block above rather than claimed as verified. The dev server (left running throughout) served `/` and `/design/outline` at 200 with no server-side errors after every change.

## User Setup Required

None — no external service configuration required. (Clerk and Neon were already configured in 02-01.)

## Next Phase Readiness

- Board management is now complete: a shaper can rename, duplicate, and delete any of their own saved boards from the rack, and every one of those three actions is mechanically proven to check ownership via the widened `lib/db/ownership.test.ts`.
- `RackCardMenu` is a reusable Base UI menu pattern beyond this one use — any future per-item menu on this app should build on it rather than introducing a shadcn dropdown-menu.
- **Recommended before shipping this plan:** a live browser pass with a signed-in shaper who has at least one saved board, to confirm the menu's keyboard/click behavior, the rename/duplicate/delete happy paths, each forced-failure affordance, and — with two Clerk accounts — the cross-account IDOR check that no action lets one shaper touch another's row.

---
*Phase: 02-accounts-saved-designs*
*Completed: 2026-08-27*

## Self-Check: PASSED

All 7 key files plus this SUMMARY.md found on disk; all 4 commits (`8d0d0a2`, `46c33c5`, `2084e25`, `a27f25b`) found in git history.

## Post-completion fix (orchestrator)

- `6958df6` — fix(02-04): renameModel updated only the row's name column, leaving the old name
  embedded in the stored snapshot; reopening restored the old name and the next autosave wrote it
  back over the column, silently reverting the rename. renameModel now rebuilds the snapshot
  envelope with the new name (ownership-scoped read, refusing a foreign id) and writes column and
  envelope together — the same write-boundary invariant saveModel and duplicateModel hold.
  Found in orchestrator review of the plan's diff; 730/730 tests and tsc clean after the fix.
