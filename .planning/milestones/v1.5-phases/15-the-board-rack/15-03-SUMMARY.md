---
phase: 15-the-board-rack
plan: 03
subsystem: board-rack
status: complete
tags: [rack-order, saver, copy, d-11, pure]
requires: []
provides:
  - "lib/models/rack-order.ts: IN_PROGRESS_KEY, RACK_ORDER_MAX_IDS, RACK_ORDER_MAX_ID_LENGTH, rackEntryKey, applyStoredOrder, savedIdsInOrder, moveInOrder, moveOneStep, insertFirst, insertAfter, orderAfterDuplicate, orderWithNewBoardFirst, rackIndexToSavedIndex, parseRackOrderColumn, rackOrderColumnValue, parseRackOrderInput, turnedKeyOnArrival, turnedKeyAfterRemoval (sortRackEntries unchanged)"
  - "lib/models/rack-order-saver.ts: RACK_ORDER_SAVE_DELAY_MS, RackOrderSaverDeps, RackOrderSaver, createRackOrderSaver"
  - "components/setup/rack-config.ts: PHONE_MOVE_VIA_MENU, RackKind, holdToMoveEnabled, movesOffered, rackCountText, rackHintText, rackHeadingLine, RACK_COPY"
affects: [15-04, 15-06, 15-08, 15-09, 15-11]
tech-stack:
  added: []
  patterns:
    - "lenient column read / column value / strict all-or-nothing input trio (from lib/blank-makers-preference.ts)"
    - "pure queue with injected timers and a recording fake scheduler (from lib/preference-handoff.ts), plus a failure callback"
key-files:
  created:
    - lib/models/rack-order-saver.ts
    - lib/models/rack-order-saver.test.ts
    - components/setup/rack-config.ts
    - components/setup/rack-config.test.ts
  modified:
    - lib/models/rack-order.ts
    - lib/models/rack-order.test.ts
decisions:
  - "A move made while a save is on its way goes out the moment that save lands (the wait is skipped), so the newest order is never held back longer than one round trip."
  - "turnedKeyOnArrival returns the unsaved board's key only when it is actually in the rack's keys, so it can never name a board the rack doesn't show."
  - "RACK_COPY.lastTouched takes either the already-formatted date text or a Date, which it formats exactly as today's cards do (en-US, Oct 4, 2026), so the date wording no longer depends on a component file that this phase may delete."
metrics:
  duration: "about 9 minutes"
  completed: 2026-10-05
actuals:
  tokens: 13000
  tasks: 3
  commits: 6
---

# Phase 15 Plan 03: The rack's order rules, its saver and its words Summary

The rules for where every board stands once a shaper arranges their rack (automatic until the first move, the
unsaved board always first, a new board first, a copy right after its original even in a rack never arranged), a
background saver that sends a quick run of moves as one save and says when a save failed, and one file holding
every word the rack says plus the single D-11 switch — all pure and tested, before any screen uses them.

## What this means for a shaper

- Until you move a board, the rack looks exactly as it does today: the board you're part-way through first, then the
  boards you touched most recently.
- Once you move one, the rack keeps your order. Editing a board no longer jumps it to the front.
- The unsaved board always stands first and nothing can be dropped in front of it.
- A newly saved board stands first; a duplicate stands right next to the board it was copied from.
- Whatever another device writes, or a bad value in the account, the rack can always read the order — at worst it
  falls back to the automatic order. A save that is too long, names a board twice or holds a bad id writes nothing.
- When a board is deleted, the turn passes to the next board along (or the one before, if it was last).
- Moving a board three places in a row saves once. If saving fails, the board goes back where it was.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 (tracer) | The shaper's order as rules | 8035dec (test), cb9abab (feat) | lib/models/rack-order.ts, lib/models/rack-order.test.ts |
| 2 | The account format and the turned board | 1f7e821 (test), 367692a (feat) | lib/models/rack-order.ts, lib/models/rack-order.test.ts |
| 3 | The saver, the rack's words and the D-11 switch | ded69ce (test), aee41b9 (feat) | lib/models/rack-order-saver.ts, lib/models/rack-order-saver.test.ts, components/setup/rack-config.ts, components/setup/rack-config.test.ts |

Tracer gate: Task 1's `<verify>` (`npx vitest run lib/models/rack-order.test.ts`) passed end to end before Task 2
began.

## Verification

- `npx vitest run lib/models/rack-order.test.ts lib/models/rack-order-saver.test.ts components/setup/rack-config.test.ts`: 3 files, 78 tests, all pass.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- `git diff 2a04843 -- lib/models/rack-order.test.ts` shows additions only; every earlier `sortRackEntries` test is untouched and passes.
- Acceptance greps: 6 order exports, 2 limit constants, 5 account/turn exports, no React / browser / database import in `rack-order.ts`;
  `PHONE_MOVE_VIA_MENU = false` declared once and named 5 times outside comments (declaration plus the four defaults);
  8 matching rack strings; `createRackOrderSaver` exported once.

## TDD Gate Compliance

Each task has a `test(...)` commit (RED, tests failing) followed by a `feat(...)` commit (GREEN). No refactor commits
were needed. In Task 2's RED run the one purity guard ("the order rules stay pure") already passed — it guards a
property the file already had, not new behaviour; the other 19 new tests failed as expected.

## Deviations from Plan

None in scope or files: everything stayed inside the plan's six files.

Small choices within the plan's interfaces, recorded under decisions above: a move during an in-flight save goes out
as soon as that save lands; `turnedKeyOnArrival` checks the unsaved board's key is really on the rack; `lastTouched`
accepts a `Date` as well as text. During Task 3's GREEN step one assertion in the saver test written in RED was
tightened (a `flush()` call removed) so the test proves the newest order goes out after the in-flight save lands
without anyone forcing it.

## Known Stubs

None.

## Threat Flags

None. T-15-05 is mitigated as planned: `parseRackOrderInput` rejects (never trims) more than 500 ids, an id outside 1 to
64 characters, a repeat or a non-string, each tested; `parseRackOrderColumn` caps, filters and never throws.

## Self-Check: PASSED

- FOUND: lib/models/rack-order.ts, lib/models/rack-order.test.ts, lib/models/rack-order-saver.ts,
  lib/models/rack-order-saver.test.ts, components/setup/rack-config.ts, components/setup/rack-config.test.ts
- FOUND commits: 8035dec, cb9abab, 1f7e821, 367692a, ded69ce, aee41b9
