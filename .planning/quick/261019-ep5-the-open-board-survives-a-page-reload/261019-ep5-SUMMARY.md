---
phase: quick-261019-ep5
plan: 01
status: complete
subsystem: design-store
tags: [open-board, reload, localStorage, design-store, browser-tests]
requires:
  - lib/models/design-snapshot.ts (buildSnapshot / parseSnapshot — the copy is exactly a save's snapshot)
provides:
  - lib/models/open-board.ts — the board on screen kept in this browser, read back once per page load
  - e2e/helpers/open-board.ts — storedOpenBoard(page), forgetOpenBoardOnEveryLoad(page)
affects:
  - components/design/design-store.tsx (one-time read-back, owner rule, debounced write, write-as-the-page-goes)
  - every browser test that reloads or reopens on purpose to get a fresh board
tech-stack:
  added: []
  patterns:
    - "Browser copy of client state: localStorage plus a page-memory fallback, a never-throwing reader validated through the save reader"
    - "One-time read-back in a microtask an effect queues (lint forbids setState in an effect body; StrictMode runs mount effects twice)"
key-files:
  created:
    - lib/models/open-board.ts
    - lib/models/open-board.test.ts
    - e2e/open-board-reload.spec.ts
    - e2e/helpers/open-board.ts
  modified:
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - e2e/outline-ghost.spec.ts
    - e2e/viewer-zoom.spec.ts
    - e2e/board-lock-screens.spec.ts
    - e2e/board-rack.spec.ts
    - e2e/wings.spec.ts
decisions:
  - "The open board is kept in this browser under shaper-open-board, version 1, written 250 ms after the last change and at once as the page goes away or is hidden (P-1)"
  - "A board opened from the rack belongs to the account signed in when it is opened, set in applyModel itself, so re-opening the board already open keeps its owner (deviation from F-8, Rule 1)"
  - "The new spec's checks that the board came back after a load wait up to 30 s, like waitForBlankButton: the redraw was measured at 4-11 s on a loaded cold dev server"
metrics:
  duration: "about 7 h 15 min (11:08 to 18:25), most of it two full browser suites and their re-runs on an overloaded machine"
  completed: 2026-10-19
actuals:
  tokens: 16500
  tasks: 3
  commits: 4
---

# Quick 261019-ep5: the open board survives a page reload — Summary

**The board on screen is now kept in this browser and comes back after a reload, a phone refreshing its tab, or a new deploy: same blank, foil, outline, wings, fins, rails, volume settings and Board Name. A saved board keeps saving to its own place in the rack for the same shaper.**

## What was wrong

The founder, 2026-10-19: *"Somehow, I keep ending up on a board without a blank and a pretty lame looking foil."*

The board being shaped lived only in the page's memory. Every full page load threw it away and opened the stock 6'0" board, with no blank and the stock foil. Full page loads happen when:
- a shaper presses reload;
- a phone's Safari refreshes a tab that was in the background;
- a shaper opens a bookmark;
- the site is deployed: an open tab reloads itself on its next screen change once the site has changed, and the founder deploys several times a day.

Boards saved in the rack were always safe. It was the open board, and any change since the last autosave, that was lost.

## What a shaper sees now

- **Reload, deploy, phone tab refresh:** the same board comes back. The stock board shows for a moment first, then the kept board replaces it.
- **A board nobody has touched is never kept.** Until the first change, preset or save, nothing is written, so an untouched board's foil tips keep following the gear menu's Tip defaults.
- **Starting a new board from a preset, or opening one from the rack, replaces the kept board at once.** After that, a reload brings back the new board, never the old one.
- **A saved board keeps saving to its own place in the rack after a reload, for the same shaper.** An edit that hadn't autosaved before the reload is saved once the shaper is confirmed signed in.
- **A different account signed in on the same browser gets the board as a new, unsaved board.** Nothing is ever sent to another shaper's saved board; the server already refused that, and now the app doesn't even try.
- **A damaged or unreadable copy is ignored.** The stock board opens with no error, and the next change writes a good copy over it.
- **A name typed a moment before a reload still comes back.** The copy is written as the page goes away or is hidden, not only after the short wait.
- **Not kept:** the undo history (it starts fresh, as it always does for a newly opened board) and the Save button's Saving/Saved/Not saved status.
- **Nothing new is sent anywhere.** The copy stays in this browser. An unsaved board is still unsaved; it just survives the browser now.

Nothing about how a board is worked out changed, and nothing saved in an account was rewritten.

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 | 3e11e760 | fix: the board you are shaping comes back after a reload or a new deploy |
| 2 | d90cc4b1 | fix: a saved board that comes back after a reload saves only to its own shaper's account |
| 3 | 0a462319 | test: browser tests prove the board you are shaping survives a reload |
| — | (this file) | docs(quick-261019-ep5): summary of the open-board-reload task |

## The planner's choices (each can be overruled)

- **P-1:** the key is `shaper-open-board`, the copy carries its own version 1, and it is written 250 ms after the last change.
- **P-2:** the reader uses the out-of-the-box Tip Style for the Phase 11 carry-over. Every copy this app writes already carries its blank's cut, so the carry-over never triggers for a real copy.
- **P-3:** if the browser refuses a write (storage full), the older stored copy is removed too, so a stale board can never come back later.
- **P-4:** saved-board and account ids are read as text of at most 200 characters; anything else and the whole copy is ignored.
- **P-5:** the new spec runs on the computer and the iPhone; Android is skipped, as one phone is enough for this proof.
- **P-6 — known, by design:**
  - With two tabs open on two different boards, a reload brings back whichever board was changed last.
  - On a shared computer, the last board stays in that browser after signing out, until a new board is started (a sign-out alone never clears it).
  - After a shaper deletes their account, the last open board stays in that browser too.

## The flags (where the code shaped the mechanism)

- **F-1:** the read-back runs in a microtask the effect queues, with its guard set inside the microtask. This repo's lint forbids setting state straight from an effect, and in development React runs every mount effect twice.
- **F-2:** a test that wants a fresh board clears the copy at the start of each new load (`forgetOpenBoardOnEveryLoad`). Clearing it from inside the page isn't enough, because the leaving page writes its copy as it goes.
- **F-3:** there are 19 `page.reload()` calls in the browser tests, not 18.
- **F-4:** the store's header sentence saying the autosave timer was the only effect that writes state was rewritten. The read-back and the owner rule's drop write state too, and each answers something outside React.
- **F-5:** the three refs sit beside `lockedRef`, and the owner effect is declared before the write effect.
- **F-6:** run from my own worktree on port 3190 under webpack (ruling O-1).
- **F-7:** the read-back and the owner drop live inside effects, never as new named handlers, so the store's source-contract sweeps still hold.
- **F-8:** amended (see Deviations). `applyModel` sets the owner to the account signed in at that moment, instead of leaving it empty for the owner effect to fill.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 - Bug] Re-opening the board already open from the rack would have lost its owner**
- **Found during:** Task 2.
- **Issue:** F-8 had `applyModel` clear the owner and leave the owner effect to adopt the signed-in account. That effect only runs when the open saved board's id, its lock or the account changes. Re-opening the board already open changes none of them, so the owner stayed empty. The copy would then be written without an owner, and after a reload the board would come back as an unsaved board, no longer saving to its row.
- **Fix:** `applyModel` sets the owner to the signed-in account itself (none on the signed-out practice rack). A source contract pins it.
- **Files:** `components/design/design-store.tsx`, `components/design/design-store.test.ts`.
- **Commit:** d90cc4b1.

**2. [Rule 1 - Test validity] Test 5 passed even with the write-as-the-page-goes switched off**
- **Found during:** Task 3. I disabled the flush for one run and the test still passed: the dev server answers a reload more slowly than 250 ms, so the normal timed write landed first.
- **Fix, a stronger check rather than a weaker one:** inside the page, the test types the name, confirms within about 20 ms that the copy has not been written yet, fires the page-going-away event, and confirms the copy is then written at once. The original "reload at once and the name is still there" check stays. With the flush off, the test now fails ("" instead of "Reload test").
- **Commit:** 0a462319.

**3. [Rule 3 - Blocking] The new spec's "it came back" checks allow 30 seconds**
- **Found during:** Task 3. Under load, on a cold dev server, the iPhone took 4 to 11 seconds to redraw the screen with the restored Fish. I measured it with temporary logging (since removed): the copy itself is read and set at once; it is the redraw of a board in its blank that is slow in development.
- **Fix:** only the checks that the kept board appeared after a load use `COMES_BACK_MS` = 30 s, the same allowance `waitForBlankButton` gives the BLANK button. The spec also sets a 90-second limit per test, as several other specs do. These are my own new tests, and every check still fails if the board never comes back.
- **Commit:** 0a462319.

### Existing browser tests touched (judged by intent, nothing weakened, no picture re-recorded)

| Spec | Rule | Why |
| ---- | ---- | --- |
| `e2e/outline-ghost.spec.ts` (both reloads) | J1 | "A fresh board, one drag, one Undo": the reload must start the stock board. |
| `e2e/viewer-zoom.spec.ts` ~1646 | J3 (comment only) | A reload now brings the winged board back, so the tab reads `WINGS · 1`, which `/WINGS/` already matched. |
| `e2e/template-toolbar.spec.ts` | none | Passed unchanged, as the plan expected. |
| `e2e/board-lock-screens.spec.ts` (`openLockedBoard`) | J1 | Its retry starts again "from a fresh rack". The first try's practice board would otherwise appear as a sixth, in-progress card, and Open This Board would ask "Open this board?". |
| `e2e/board-rack.spec.ts` test 6 | J1 | "...and one saved board alone" after an unsaved one: that load must start the stock board. |
| `e2e/wings.spec.ts` 183 and 1276 | J1 | 183 reads "the default board's squash tail" after a Mid-length. 1276 opens a second preset in the same test, which met "Start a new design?". |

## Gates

- **Unit tests (`npm test`):** 154 files, 5,964 passed, 2 skipped. The 2 skipped are the existing PDF builder skips (`components/template/build-*-pdf.test.ts`), not mine. The new `lib/models/open-board.test.ts` has 28 tests; the store's contracts gained 6.
- **Lint (`npm run lint`):** clean, with no new lint-suppression comment.
- **Types (`npx next typegen && npx tsc --noEmit`):** clean.
- **New spec (`e2e/open-board-reload.spec.ts`):** 10 passed, 2 skipped (Tests 5 and 6 run on the computer only). It also passed 20 of 20 while the unit suite ran alongside to add load.
- **Touched specs, alone, every project:** outline-ghost, viewer-zoom, template-toolbar and the new spec pass. board-lock-screens, board-rack and wings pass apart from the load failures listed below.

**The full browser suite (port 3190, webpack):**
- **Run 1, before the J1 edits:** 1,236 passed, 23 failed, 1,063 skipped, EXIT 1, 2.2 h.
- **Run 2, after the J1 edits:** 1,234 passed, 25 failed, 1,063 skipped, EXIT 1, 2.7 h.

Neither run is clean, and I want to be plain about why. While run 2 went, another agent session (worktree `agent-af86d170567c7b9e2`) was running its own browser suites on this machine. Load averages reached 61 to 96, and my own dev server grew to 4.4 GB and 179% CPU over the run. Every run-2 failure has been re-run alone, and none comes from the kept board:
- **Locked-board tests (board-lock-screens on the iPhone and the computer, board-lock d1):** an existing race. A trace with read-back logging showed that on a cold or loaded server the test taps Lock board and then Open This Board 0.2 s later, before the lock is saved, so the board opens unlocked. No copy was read anywhere; the only read-backs were on the rack page and found nothing. Alternating runs: the original store failed d1 once in 6; mine passed 12 of 12. The iPhone set passed 14 of 14 alone.
- **s-fins (board-lock-screens):** the same failure on both stores. The original failed 1 in 6, mine 2 in 6, run back to back.
- **"Tap Start Shaping, TEMPLATE doesn't arrive in 2-3 s":** step-nav ×3, new-board ×4, wings 240, phone-screen-tiles 406, and my own Tests 1 and 5 in run 2. In alternating runs, step-nav 269 failed 3 of 6 on the original store and 2 of 6 on mine. A probe measured tap-to-TEMPLATE at 1.2-2.0 s on both stores.
- **error-pages 97:** alternating runs gave 0 in 16 on the original, 1 in 16 on mine. The failure is the not-found page's Home link on a fresh browser with no board kept.
- **undo-redo 251:** failed 3 of 3 on the original store too.
- **Everything else:** these passed alone twice — rocker-blanks 60, touch-sizing 273, old-safari-buttons 147, desktop-baseline 175, imported-readout 204, legal-pages 39, privacy 117, outline-ghost 112, board-rack m17, test-rack ×2 (connection resets), summary-blank 197, and my new spec's Tests 1 and 5: 50 of 50 on the computer, 40 of 40 on the phones.

**Not run here, the orchestrator's (ruling O-1):** `npm run build` and `npm run test:e2e:prod`. Both must run on the main checkout after the merge. A full suite on a quieter machine would also be worth a look before go-live, given how loaded this one was.

## Notes for the founder

- **Vercel's Skew Protection** would separately stop the deploy reloads, but it is a paid-plan feature and wouldn't help with a phone's tab reload or a bookmark. This change covers all three causes.
- **Nothing is sent anywhere.** A saved board still autosaves to the account as before, and an unsaved board is still unsaved; it just survives the browser.
- **The privacy page.** Its Cookies line talks about remembering settings. The open board is now kept in the browser too (never sent to us), so you may want a sentence there. `content/legal/privacy.md` is your text, and this task didn't touch it.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-ep5-01 to T-ep5-06): the reader is strict and never throws, a saved board is trusted only with its account, the server's ownership check is unchanged, and a refused write removes the older copy.

## Self-Check: PASSED

- FOUND: lib/models/open-board.ts, lib/models/open-board.test.ts, e2e/open-board-reload.spec.ts, e2e/helpers/open-board.ts
- FOUND commits: 3e11e760, d90cc4b1, 0a462319
