---
phase: quick-261109-efm
plan: 01
subsystem: 3d-page
tags: [3d, race, sliders, e2e]
key-files:
  modified:
    - e2e/three-d-bay.spec.ts
    - components/3d/three-d-screen.tsx
decisions:
  - "A slider touched during a view's move lands that move first, so it is measured from the board the shaper is about to see."
metrics:
  tasks: 2
  commits: 2
actuals:
  tasks: 2
  commits: 2
status: complete
completed: 2026-11-09
---

# Quick 261109-efm: a slider touched during a view move lands the move first

**In plain English:** on the 3D page, touching Rotate on Side or Look Down the Rail while a view button's turn was still
under way used to measure the slider from the board's old state. Bottom, then Deck, then Rotate on Side landed the
board bottom up again. Nose, then Tail, then Look Down the Rail swung the nose back toward you with the slider pinned at
-25. Now the turn lands first and the slider takes its step from where the board was going.

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 | `80c5d795` | e2e/three-d-bay.spec.ts: checks 8f and 8g, plus a "key on a slider" kind of second press in `pressDuringMove` |
| 2 | `6f948006` | components/3d/three-d-screen.tsx: `onRoll` and `onSight` call `finishMotion()` before reading the face / end |

## Red run (Task 1, on the unfixed screen)

`PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-bay.spec.ts -g "8f|8g" --project=desktop --project=iphone --workers=1`
gave **4 failed, 0 passed**, all for the stated reason, none a timeout finding an element:

- 8f (desktop and iphone): `expect(locator).toHaveValue(expected) failed`, `Expected: "1"`, `Received: "-179"`
- 8g (desktop and iphone): `expect(locator).toHaveValue(expected) failed`, `Expected: "6"`, `Received: "-25"`

**8f used the dispatched-key path** (`sliderKey`, a `keydown` ArrowRight on `input[aria-label="Rotate on Side"]`). It
reached Base UI's handler and produced the expected -179 on the unfixed code, so the slider-value fallback was not
needed. 8g uses the existing `slider: { name, value: 6 }` path.

## Green runs (Task 2, after the fix)

- 8f + 8g on desktop, iphone, android: **6 passed**.
- 8b to 8e on desktop and iphone: **8 passed**.
- `sed ... | grep -cE '^\s+finishMotion\(\);'` structural check: **2** (onRoll and the top of onSight).
- `npx tsc --noEmit`: 0 errors, none in the touched files.
- `npm run lint`: 0 errors, 1 pre-existing warning (`_calls` unused in lib/db/import-designs-action.test.ts, not touched).
- x-3d on the iphone alone, `--repeat-each=3`: **2 passed, 1 failed**. The failure is in the test's own navigation step,
  before any slider is touched: `goToScreen(page, "3D")` stayed on `/design/outline` for its 60 s retry window
  (`expect(page).toHaveURL(/\/design\/3d$/)` received `http://localhost:3163/design/outline`, helpers/screens.ts:111).
  That was the first run, which includes the dev server's first compile of the 3D route. It never reached the 3D
  controls, so it is not the slider race. The orchestrator is running its own x-3d gate and should treat this as
  a possible cold-start flake, not a result of this fix.

## `npm test`

Two full runs: 4 failed files (13 then 12 failed tests of 9675), the 4 files re-run alone: 19 failed.
None import `three-d-screen.tsx` and none touch code this task changed.
- `components/design/slider-row.test.ts` (9 tests): `TypeError: Cannot read properties of null (reading 'useId')`, a
  React-copy problem of this worktree's node_modules, not a timing issue.
- `lib/geometry/blank-fit.test.ts`, `board-surface-render.test.ts`, `round-tip.test.ts`: `Test timed out in 5000ms`
  (heavy whole-catalogue geometry tests on a loaded machine, with several Vitest and Playwright runs overlapping).
These are environmental and were not investigated further (out of scope per the scope boundary). The orchestrator's
own gate on the main checkout will settle whether they are green there.

## Deviations from Plan

None to the code. The plan executed as written. Notes: `npm test` was not clean in this worktree (see above, environmental,
unrelated files); x-3d was run 3 times and passed 2 of 3 (see above).

## Not committed (left for the orchestrator)

- This SUMMARY.md and the PLAN.md folder (docs commit is the orchestrator's).
- `next-env.d.ts` and the AGENTS.md block: `git status` shows neither modified, so nothing to leave.

## Known Stubs

None.

## Self-Check: PASSED

- `80c5d795` and `6f948006` both present in `git log`; each touches one file.
- Both source files exist and carry the described changes.

## Orchestrator's gate (2026-11-09, after the executor returned)

Run in this worktree, one run at a time, while the Phase 17 session's own suites kept the machine busy (load averages
between 26 and 120).

- **x-3d alone on the iPhone, `--repeat-each=3`** (`PW_PORT=3163 IS_WEBPACK_TEST=1 npx playwright test
  e2e/board-lock-screens.spec.ts:851 --project=iphone --workers=1 --repeat-each=3`): **3 passed**. The executor's one
  failure was its cold first compile timing out on the way to the 3D page, before any slider was touched.
- **8b to 8g on the iPhone and the desktop:** 11 passed, 1 failed: 8d on the desktop, inside `settled` (the board
  never read still for a quarter second within 10 s, at load 100+). 8d never touches a slider. Re-run alone on the
  desktop, `--repeat-each=3`: **3 passed**. It was the load, not this change.
- **`npm test`:** the first full run at the default 5 s limit had 78 failures in 12 files, all on a machine at load
  120+. Two causes, neither from this change. One: `node_modules/node_modules` in this worktree was a stray link to the
  main checkout's node_modules, so Vitest loaded two copies of React (`useId` of null in slider-row.test.ts). It was a
  link, not a copy, so removing it touched nothing else. Two: the heavy whole-catalogue tests ran past 5 s. Re-run with
  `--testTimeout=180000`: **180 files, 9673 passed, 2 skipped, 0 failed**.
- **`npm run lint`:** 0 errors, the one old `_calls` warning.
- **STATE.md:** the log row was added, but not the "Last activity" line. The Phase 17 branch has already rewritten that
  line, and it will merge main to pick this fix up, so leaving the line alone saves it a merge conflict.
