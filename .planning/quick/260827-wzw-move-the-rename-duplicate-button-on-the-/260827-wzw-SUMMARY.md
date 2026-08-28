---
phase: 260827-wzw
plan: 01
subsystem: ui
tags: [react, tailwind, base-ui]

# Dependency graph
requires:
  - phase: 02-accounts-saved-designs
    provides: BoardRackCard saved-variant with RackCardMenu (Rename/Duplicate/Delete)
provides:
  - Board-actions trigger repositioned to the saved card's bottom-right corner
affects: [setup, board-rack]

# Actuals (#2632)
actuals:
  tokens: 930
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Card-sized relative box wrapping only the whole-card button + its overlay control, kept separate from sibling elements below the card (e.g. an error message), so absolute offsets always measure from the card's own corner."

key-files:
  created: []
  modified:
    - components/setup/board-rack-card.tsx

key-decisions:
  - "Introduced a dedicated inner relative div around the whole-card button and RackCardMenu, rather than moving the relative class or restructuring the outer wrapper, so the duplicateError paragraph stays a sibling below the card and never affects the trigger's offset."

patterns-established:
  - "Pattern: card overlay controls (menu triggers, badges) get their own card-sized relative wrapper distinct from any wrapper that also holds below-card content."

requirements-completed: [QUICK-260827-wzw]

coverage:
  - id: D1
    description: "Three-dot Rename/Duplicate/Delete trigger moved from the card's top-right corner to its bottom-right corner, anchored to the card itself"
    requirement: "QUICK-260827-wzw"
    verification:
      - kind: unit
        ref: "grep 'absolute right-2 bottom-2 z-10' components/setup/board-rack-card.tsx"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: other
        ref: "npm run lint"
        status: pass
      - kind: unit
        ref: "npm test (739 tests, 15 files)"
        status: pass
    human_judgment: true
    rationale: "Visual placement, overlap with card text/thumbnail, click-through behavior, and menu-opening-downward readability require eyes on the running app in a browser — this executor has no browser tooling."

# Metrics
duration: 8min
completed: 2026-08-27
status: complete
---

# Phase 260827-wzw: Move board-actions button to bottom-right corner Summary

**RackCardMenu trigger on saved board-rack cards repositioned from top-right to bottom-right, anchored to a new card-sized wrapper so it never drifts when a duplicate-error message is showing.**

## Performance

- **Duration:** 8 min
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments
- The three-dot Rename/Duplicate/Delete trigger on each saved board card now sits in the bottom-right corner instead of the top-right.
- The trigger's positioning ancestor is now a dedicated box around just the card button and the menu — not the outer wrapper that also holds the duplicate-error text — so the corner offset can never be thrown off by that message appearing.
- The card button and the menu trigger remain DOM siblings (never nested), preserving the existing click-safety guarantee that clicking the menu never opens the board.
- Header comment in `board-rack-card.tsx` rewritten to describe the current structure only.

## Task Commits

Each task was committed atomically:

1. **Task 1: Anchor the board-actions button to the card's bottom-right corner** - `52156a3` (feat)

**Task 2 (Confirm the moved button in the running app):** no code changes were needed — `npm test` was run as the automated gate (739/739 passing); the browser/visual confirmation portion is recorded below as an outstanding human-verification item, per this execution's tooling constraints (no browser available to this executor).

**Plan metadata:** to be committed by the orchestrator (docs commit).

## Files Created/Modified
- `components/setup/board-rack-card.tsx` - Wrapped the whole-card button and `RackCardMenu` in a new card-sized `relative` box; moved the trigger's offset classes from `absolute top-2 right-2 z-10` to `absolute right-2 bottom-2 z-10`; updated the file's header comment to describe the new structure and corner.

## Decisions Made
- Added a new inner `<div className="relative">` around only the button + menu (rather than repurposing the outer wrapper's `relative` class) so the `duplicateError` paragraph — which stays a sibling below that box in the outer flex column — can never affect where the trigger's bottom offset is measured from.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Outstanding Human Verification (deferred to orchestrator's browser pass)

Task 2's `<human-check>` items could not be performed by this executor (no browser tooling available). All automated gates passed (`npx tsc --noEmit`, `npm run lint`, `npm test` — 739/739). The following need a live check on http://localhost:3000, signed in with at least one saved board:

1. The three-dot button sits in the bottom-right corner of each saved board card, clear of the board drawing it used to cover.
2. It does not collide with or obscure the board name, the dimensions line, the "Last touched" date, or the "Open This Board" line.
3. Clicking it opens the Rename / Duplicate / Delete menu and does NOT open the board. Note whether the menu opening downward from the lower corner reads acceptably over the cards below it — if not, that is a follow-up task, not a change here.
4. Rename opens the rename dialog, Delete opens the delete confirmation, Duplicate copies the board — all exactly as before.
5. Clicking anywhere else on the card still opens that board, and keyboard focus on the card still shows the accent ring.
6. The in-progress (not-saved) card is unchanged and still has no three-dot button.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

No blockers. Change is isolated to one presentational component; geometry suites remain green. Awaiting the browser confirmation pass listed above.

---
*Phase: 260827-wzw*
*Completed: 2026-08-27*

## Self-Check: PASSED

- FOUND: components/setup/board-rack-card.tsx
- FOUND: 52156a3
