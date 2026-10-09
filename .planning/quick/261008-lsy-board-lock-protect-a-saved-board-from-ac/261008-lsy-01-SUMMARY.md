---
phase: quick-261008-lsy
plan: 01
subsystem: board-lock (protection half)
tags: [board-rack, design-store, server-actions, drizzle-migration, playwright]
requires: []
provides:
  - "models.locked nullable boolean column (migration 0010_model_lock), applied to the DEVELOPMENT branch only"
  - "setModelLocked server action; lock refusals in saveModel and deleteModel; unlocked copy in duplicateModel"
  - "design-store: locked state, lockedRef guard on every edit, setOpenBoardLocked, noteRenamed, flushAutosave"
  - "Board Rack: Lock board / Board Locked tick row, padlock in the caption, greyed Delete"
  - "Top bar: Unlock button in place of Save (computer row and phone compact bar)"
  - "Practice-rack stand-in for locks so browser tests can drive it"
affects: [Plan 02 (greying every control reads useDesign().locked)]
tech-stack:
  added: []
  patterns:
    - "A setting about a saved record lives in its own nullable column, never in the design snapshot"
    - "Store guard first: every dirty-marking handler begins with if (lockedRef.current) return;"
key-files:
  created:
    - drizzle/0010_model_lock.sql
    - drizzle/meta/0010_snapshot.json
    - components/design/board-lock-copy.ts
    - e2e/board-lock.spec.ts
  modified:
    - lib/db/schema.ts
    - drizzle/meta/_journal.json
    - scripts/check-preference-columns.ts
    - lib/db/queries.ts
    - lib/models/rack-models.ts
    - lib/models/autosave.ts
    - lib/models/rack-stand-in.ts
    - lib/rack-stand-in-server.ts
    - app/test-rack/page.tsx
    - app/design/actions.ts
    - components/design/design-store.tsx
    - components/design/save-button.tsx
    - components/setup/rack-card-menu.tsx
    - components/setup/rack-caption.tsx
    - components/setup/rack-config.ts
    - components/setup/board-rack.tsx
    - components/setup/setup-screen.tsx
    - components/setup/hover-rack.tsx
    - components/setup/swipe-rack.tsx
    - e2e/board-rack.spec.ts
    - e2e/board-rack-phone.spec.ts
decisions:
  - "Lock stored in models.locked (nullable boolean), not in the snapshot (P1)"
  - "Locking never changes updatedAt (P2)"
  - "Padlock only in the rack caption; sideways standing names get 'locked' for screen readers only (founder answer 1)"
  - "Phone Undo/Redo pair hides on a locked board (founder answer 2)"
  - "No on-screen 'this board is locked' note; Unlock button carries a title tooltip (founder answer 3)"
metrics:
  tasks: 3
  commits: 3
status: complete
actuals:
  tasks: 3
  commits: 3
---

# Phase quick-261008-lsy Plan 01: The board lock (protection half) Summary

A saved board can be locked from the Board Rack's ⋯ menu and unlocked from the top bar, the lock is stored with the board, and a locked board cannot be changed, saved over or deleted — the screen greying of every control is Plan 02.

## What a shaper sees now

- **Board Rack, ⋯ menu:** a new row between Duplicate and Delete reads **Lock board**. Locked, it reads **Board Locked** with a tick and a small padlock at the row's right end. Choosing it locks or unlocks and closes the menu.
- **Locked board's caption:** a small padlock (muted ink, never the warning colour) right after the board's name, with the tooltip/name "Locked". A screen reader also hears "locked" on that board everywhere in the rack ("Fish, locked, 5'8"..., board 2 of 15"). The sideways standing names get no picture.
- **Delete is greyed** on a locked board. Rename and Duplicate still work. A copy of a locked board comes out unlocked.
- **Opening a locked board:** the top bar shows an **Unlock** button (padlock icon) where Save was — in the computer's row and in the phone's compact bar, on an upright phone and held sideways. Hovering it on a computer shows "This board is locked so it can't be changed by accident. Unlock it to change it."
- **Nothing takes on a locked board.** Sliders, typed fields, toggles, drags, Undo and Redo (button or Cmd/Ctrl+Z) are all refused by the shared design store, the Undo/Redo pair hides, and the board never autosaves. (The controls are not yet greyed — that is Plan 02; they simply don't move.)
- **Pressing Unlock** unlocks the board for good (stored). Save comes back as "Saved", the board can be changed, and the rack reads "Lock board" again. While it works it reads "Unlocking…"; if it fails it reads "Not unlocked" in warning ink and pressing it tries again.
- **Locking from the rack the board that is open in the editor** takes effect in the editor at once; an edit still waiting for its autosave is sent just before the lock lands.
- **Failures:** if locking/unlocking from the rack fails, the row stays as it was and the caption says "Couldn't lock — try again." / "Couldn't unlock — try again."
- **Second device:** if a board was locked on another device while this one still had it open, the next save is refused by the server ("locked" answer), this editor locks itself too, and the unsaved edit stays on screen (saved only if Unlock is pressed).

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 (tracer) | dc9ed23 | The column + migration, lock action, rack Lock board row, open board knows its lock, Unlock in the top bar, practice-rack stand-in, t1 |
| 2 | 20c0173 | Store guard on every edit, server refusals (save/delete/copy), padlock, greyed Delete, screen-reader "locked", lock-failed line, t2/t3 + source-contract tests |
| 3 | 82a287d | Phones (p1, p2), 820-wide computer row (d1), failure paths (f1, f2); m17 and 19p now expect the Lock board row |

## Development database proof (migration 0010, development branch only)

Before (`npx --no-install tsx scripts/check-preference-columns.ts`, exit 1):

```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text (5 of 5 columns); extra_center_thickness_mm absent (expected absent)
models: locked missing (0 of 1 columns)
drizzle migrations recorded: 10
```

`npm run db:migrate` run twice (second run changed nothing — idempotent). After (exit 0):

```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text (5 of 5 columns); extra_center_thickness_mm absent (expected absent)
models: locked boolean (1 of 1 columns)
drizzle migrations recorded: 11
```

`drizzle/0010_model_lock.sql` holds exactly `ALTER TABLE "models" ADD COLUMN "locked" boolean;`. Production was NOT touched. The production commands (check, `npm run db:migrate:prod`, check) are in `scripts/check-preference-columns.ts`'s header; they must run BEFORE anything from this quick task is pushed (see ship notes in the plan).

## Test results

- `npm test` (vitest): **128 files, 4591 passed, 2 skipped, 0 failed** (a plain run, no timeouts).
- `npx tsc --noEmit -p .`: clean. `npm run lint`: clean.
- Source-contract tests were written first and seen failing (RED) before the store guard / server refusals / label: 9 failures across `design-store.test.ts`, `ownership.test.ts`, `rack-config.test.ts`, then green.
- Playwright (`PW_PORT=3191`):
  - `e2e/board-lock.spec.ts` alone: desktop t1, t2, t3, d1, f1, f2 pass; iphone p1, p2 pass; android p1, p2 pass (10 passed, 14 skipped by design, 0 failed).
  - `e2e/board-lock.spec.ts` + `e2e/board-rack.spec.ts` + `e2e/board-rack-phone.spec.ts` together: **70 passed, 119 skipped (project-pinned), 0 failed**, 3.0 minutes. m17 and 19p pin the new row.
  - Whole browser suite: 959 passed, 670 skipped, 0 failed (see "Full browser suite" below).

Measured by the phone tests: Unlock is 82.7 x 44.0 dots; air to the wordmark is 56.0 (iPhone, 390) / 78.0 (Pixel 7, 412) upright and 26.0 at 360 wide on both — comfortably over the 8-dot floor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `setModelLocked` return type broke the ownership test's function parser**
- **Found during:** Task 1 verify.
- **Issue:** `lib/db/ownership.test.ts` finds each action's body with a regex that stops at the first `{`; the plan's inline return type `Promise<{ saved: boolean }>` contains one, so the body was read as empty and "awaits auth() first" failed.
- **Fix:** exported a named `SetModelLockedResult` interface and used it as the return type (the same shape `rack-order.ts` uses). Behaviour identical.
- **Files:** `app/design/actions.ts`. **Commit:** dc9ed23.

**2. [Rule 1 - Existing test pinned the old shape] `rack-source.test.ts` forbade a second warning-ink line**
- **Found during:** Task 2.
- **Issue:** two existing source contracts said the caption uses the warning ink exactly once (the duplicate-failed line) and that the Delete menu row's line matches `onClick={onDelete}`. The plan's lock-failed line (same style as the duplicate-failed line) and the greyed Delete legitimately change both.
- **Fix:** the caption contract now says exactly twice (duplicate-failed and lock-failed lines, both saved-board only, board-rack.tsx checked for `lockError` as well) and adds a check that the padlock is never warning ink; the Delete `Menu.Item` kept on one line so its contract still holds unchanged.
- **Files:** `components/setup/rack-source.test.ts`, `components/setup/rack-card-menu.tsx`. **Commit:** 20c0173.

**3. [Plan assertion adjusted — measured] d1 headroom floor**
- **Found during:** Task 3. The plan said the row must "fit exactly as site-nav-width.spec.ts measures it". That spec also asks for 24 dots of slack, but that is measured on the bare "Save" button of a board nobody has saved. Measured at 820 wide: bare Save 24.0, the settled "Saved" face of any open board **4.7**, Unlock **2.0** (the saved slot is 80 dots; Unlock is 82.7). So the open-board faces were already the tight ones.
- **Decision:** the row still fits (no sideways scroll, both ends on screen, slack positive), so per the plan the LockIcon was NOT dropped. d1 asserts fit with slack >= 0 and logs the number. Watch item: Unlock is 2.7 dots tighter than "Saved" at exactly 820 wide with a placeholder-sized account control.

No other deviations. Nothing needed to stop and report.

## Notes for Plan 02 and the founder

- One thing the store does not cover: if a save is already in flight AND a newer edit arrives, then the shaper locks the open board from the rack, that newer edit is not sent before the lock lands (only an edit waiting for its autosave is). Rare, and the lock still holds; the edit stays on screen, unsaved.
- Plan 02 hooks are in place: `useDesign().locked` (reactive) and the real guard in the store. Nothing was added for Plan 02's `BoardLockScope`.
- `applyModel` now takes the lock as its third argument; the only callers are the two in `setup-screen.tsx`.
- Opening the board that is already open in the editor does not re-read its lock from the rack (it keeps the store's value, which the rack's toggle and the Unlock button keep current).

## Threat Flags

None beyond the plan's register: the one new network surface is the `setModelLocked` Server Action, which is auth-first and owner-scoped (checked mechanically by `lib/db/ownership.test.ts`), and the practice-rack lock stand-in follows the existing order stand-in's gating (literal `process.env.NODE_ENV`, flag, signed-out only, safe-id check).

## Known Stubs

None.

## How the founder can look at it

See the orchestrator hand-off message (practice rack at `/test-rack`, or signed in on localhost against the development branch).

## Full browser suite

`PW_PORT=3191 npx playwright test` on the main checkout, after the last commit (82a287d): **959 passed, 670 skipped (project-pinned tests), 0 failed, 0 flaky, exit 0**, 29.9 minutes. Final line and exit read in their own step.

## Self-Check: PASSED (files and commits; suite count noted above)

- Created files exist: `drizzle/0010_model_lock.sql`, `drizzle/meta/0010_snapshot.json`, `components/design/board-lock-copy.ts`, `e2e/board-lock.spec.ts`.
- Commits dc9ed23, 20c0173, 82a287d are on main.
- No file under `lib/geometry/` changed.
