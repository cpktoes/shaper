---
phase: 15-the-board-rack
plan: 08
subsystem: home page, saved-board actions, go-live checks
tags: [board-rack, rack-order, server-actions, read-only-report]
status: complete
requires:
  - 15-01 (rackModelsAndDrops)
  - 15-03 (orderAfterDuplicate, orderWithNewBoardFirst, parseRackOrderColumn, rackOrderColumnValue, SavedRackEntry)
  - 15-04 (readRackOrder, userPreferences.rackOrder)
  - 15-06 (SetupScreen rackOrder prop)
provides:
  - the home page reads the shaper's stored rack order, without failing the page if the read fails
  - a new board lands first in an arranged rack (D-01)
  - a copy lands right after its original and fixes the order (D-02 / D-16)
  - scripts/check-saved-boards.ts --rack-report (read-only, ids only)
affects:
  - 15-13 (the founder's production run of --rack-report before the push)
tech-stack:
  added: []
  patterns:
    - order read started beside the board list with its .catch attached at once (no unhandled rejection)
    - module-private, owner-scoped helpers called only from exported actions after await auth()
key-files:
  created: []
  modified:
    - app/page.tsx
    - app/design/actions.ts
    - scripts/check-saved-boards.ts
decisions:
  - "Rack placement after a save or duplicate is best-effort: logged and swallowed, never fails the save (T-15-25 accepted)"
  - "--rack-report lists every board the rack leaves out, but exits 1 only for one that opens in the existing check"
metrics:
  duration: ~10 min
  completed: 2026-10-05
  tasks: 2
  files: 3
actuals:
  tokens: 3450
  tasks: 2
  commits: 3
---

# Phase 15 Plan 08: The rack keeps the shaper's order; new boards and copies land where they should; the rack report

The home page now shows the rack in the order the shaper set, read from their account, so it looks the same on any device they sign in on. Saving a brand-new board puts it first in a rack they've arranged. Duplicating a board puts the copy right after its original. And the founder gets a read-only check that shows, by board id only, whether the rack can draw every saved board.

## What changed, for a shaper

- **Your order follows you.** The home page reads the rack order you set, alongside your boards. If that order can't be read for any reason, the rack falls back to newest-first, which is how it has always worked. You still see every board.
- **A new board stands first.** If you've arranged your rack, a board saved for the first time goes to the front, in the spot the unsaved board was standing. If you've never arranged it, nothing gets stored, because newest-first already puts it there.
- **A copy stands beside its original.** Duplicating a board puts the copy straight after the board it came from. That also fixes the rack's order from then on, even if you'd never arranged it before.
- **Editing never moves a board.** Renaming and autosaving leave the order alone. Deleting a board writes nothing to the order either: the rack just skips an id that no longer has a board.
- **If placing a board fails, the save still works.** The failure is logged and the save or duplicate goes through.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | The rack shows the order the shaper set; a new board lands first; a copy lands beside its original | 7327eec | app/page.tsx, app/design/actions.ts |
| 2 | The founder's read-only rack report, by id only | cdada6e | scripts/check-saved-boards.ts |

## Implementation notes

- `app/page.tsx` `BoardRackData`: `readRackOrder(userId)` starts before the board list is awaited and has its `.catch` attached immediately. On failure it logs `Shaper: failed to read the rack order` and returns `null`. The value is passed as `<SetupScreen models={models} rackOrder={rackOrder} />`. The signed-out and Suspense-fallback calls are unchanged.
- `app/design/actions.ts`: three helpers are kept private to the file (not exported):
  - `readStoredRackOrder`: one select on `eq(userPreferences.clerkUserId, clerkId)`, read through `parseRackOrderColumn`.
  - `listRackEntries`: one select of `id`, `name`, `updatedAt` on `eq(models.clerkUserId, clerkId)`.
  - `storeRackOrder`: an insert that sets `clerkUserId:` and updates the existing row if there is one.

  They're called only from `saveModel`'s new-row branch (D-01, and only when an order is already stored) and from `duplicateModel` (D-16, always), both after `await auth()`. The file still exports exactly the four actions. The log lines are `Shaper: couldn't place the new board first in the rack` and `Shaper: couldn't place the copy beside its original in the rack`. The order logic itself is the 15-03 functions, not a new copy of them.
- `scripts/check-saved-boards.ts --rack-report`:
  - The one select now also reads `clerkUserId`, used only to count boards per account and never printed.
  - It makes one call to `rackModelsAndDrops`, the same function the home page uses, with empty names and its log silenced.
  - It prints the three lines, and exits 1 only when the rack drops a board that opens in the existing check.
  - The header documents the flag and the production command for plan 15-13.

## Verification

- `npx vitest run lib/db/ownership.test.ts lib/models/rack-order.test.ts`: 61 passed. `lib/db/ownership.test.ts` is unedited (`git diff --quiet 1fae921 HEAD -- lib/db/ownership.test.ts`).
- `npx vitest run lib/db lib/models`: 14 files, 247 tests passed.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Acceptance greps:
  - `readRackOrder(userId)`: 1
  - `rackOrder={rackOrder}`: 1
  - `^export async function`: 4
  - `orderAfterDuplicate(`: 1
  - `orderWithNewBoardFirst(`: 1
  - both owner-scoped `eq(...)` patterns: 1 each
  - `rack-report`: 5
  - `db.select`: 1
  - insert/update/delete calls: 0
  - added `console.log` lines naming `clerkUserId`, `.name` or a snapshot: 0
- **Development-branch run** (`CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-saved-boards.ts --rack-report`), exit 0:

```
saved boards: 7 (v1 6, v2 0, v3 0, v4 1, v5 0); open: 7 of 7
Phase 11 boards with a blank: 1; five station thicknesses kept: 1 of 1
carried boards that no longer fit where they sit: 1 of 1
saved boards: 7; the rack can draw: 7 of 7
accounts with saved boards: 2; boards per account: 5, 2
boards the rack would leave out: none
```

- Still to do by hand, after the merge (orchestrator or founder, signed in, development branch):
  - Arrange the rack on the laptop and open it on the phone; the order should match.
  - Duplicate a board in a rack that has never been arranged; the copy should stand beside its original.

## Deviations from Plan

**1. Tracer feedback gate: ran the automated check again instead of stopping for a human check**
- **Found during:** Task 1 (`type="tracer"`)
- **Issue:** `workflow.auto_advance` and `_auto_chain_active` are both `false`, which would normally mean stopping after the tracer for a human check. The orchestrator ruled that this plan runs to completion with no waiting, and the plan is `autonomous: true`. The tracer's check is fully automated, and its by-hand check is listed for after the merge.
- **Action:** I ran the tracer's automated check again (unit tests, `tsc`, lint, acceptance greps). It all passed, so I went on to Task 2.

No other deviations. The plan was otherwise carried out as written.

## Known Stubs

None.

## Threat Flags

None. All the new surface (the owner-scoped helpers and the read-only report) is already covered by T-15-21 to T-15-25 in the plan's threat model.

## Self-Check: PASSED

- FOUND: app/page.tsx, app/design/actions.ts, scripts/check-saved-boards.ts
- FOUND: commit 7327eec, commit cdada6e
