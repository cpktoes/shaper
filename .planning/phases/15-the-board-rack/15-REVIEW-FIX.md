---
phase: 15-the-board-rack
fixed_at: 2026-10-06T10:39:28Z
review_path: .planning/phases/15-the-board-rack/15-REVIEW.md
iteration: 1
findings_in_scope: 14
fixed: 13
skipped: 1
status: partial
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-10-06T10:39:28Z
**Source review:** .planning/phases/15-the-board-rack/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 14 (CR-01, WR-01 to WR-05, IN-01 to IN-08)
- Fixed: 13
- Skipped: 1 (WR-05: the founder's check on a real device)

Where the checks ran: everything ran in the agent's isolated git worktree
(`.claude/worktrees/agent-a00f0b53f32592675`, with `node_modules` symlinked from the main checkout).
The browser checks used the webpack dev server (`IS_WEBPACK_TEST=1`) on port 3128. Nothing touched a
database, because the practice rack's new saves are kept in memory.

## Fixed Issues

### CR-01: Going Back to the home page shows the old board order, and the next move overwrites the shaper's arrangement

**Files modified:** `app/actions/rack-order.ts`, `lib/rack-stand-in-server.ts`, `components/setup/use-rack-order.ts`, `lib/models/rack-order-sync.ts` (new), `lib/models/rack-order-sync.test.ts` (new), `lib/models/rack-order-saver.ts`, `lib/models/rack-order-saver.test.ts`
**Commits:** fa96ef2 (the practice rack's saves, plus the failing Back check), 58f02cb (the fix)
**Applied fix:** `saveRackOrder` now calls `revalidatePath("/")` after the upsert, so the copy of the
home page that Back brings up holds the stored order. The practice rack's stand-in does the same for
`/test-rack`. `useRackOrder` no longer resets to every incoming order. One small pure rule
(`rackOrderViewOnArrival`) decides what happens instead:
- While the saver has an order waiting or in flight, the rack keeps the order it shows. The incoming
  order is only noted as seen.
- When the saver is idle, the rack adopts the incoming order and the saver restarts from it.

The saver tells the hook when it becomes busy or idle through a new `onPendingChange`. Both pieces have
unit tests.
**What a shaper sees now:** after moving a board, opening a board and pressing Back (or swiping back
on a phone), the rack still shows the moved order. Their next move builds on that order instead of
overwriting it.
**Proof:**
- Before the fix, browser check k1 (desktop: move with Alt + →, wait for the save, Open This Board,
  Back) failed: the rack showed `stand-in-01, stand-in-02, …` where `stand-in-02, stand-in-01, …` was
  expected. A reload in the same run showed the moved order, so the save had landed and only the Back
  copy was stale.
- After the fix, k1 passes.
- With the refresh temporarily taken out of the stand-in, k1 and the new android check 13b both fail
  again. With it back, both pass.

### WR-01: "Save the order before Duplicate / Rename / Delete" fails when a save is already on its way

**Files modified:** `lib/models/rack-order-saver.ts`, `lib/models/rack-order-saver.test.ts`, `components/setup/use-rack-order.ts`, `components/setup/board-rack.tsx`
**Commit:** a6497c3
**Applied fix:** The saver has a new `settled()`. It resolves once nothing is waiting and nothing is
in flight, whether the last save lands or fails, and it resolves at once when the saver is idle. The
hook exposes `flushAndSettle()`, and `handleDuplicate`, `handleRenameConfirm` and
`handleDeleteConfirm` await it before calling the server action. `dispose()` never drops a waiting
order now: it sends it at once, or straight after the save in flight lands. If that in-flight save
fails after dispose, there is no rack left to roll back or tell, so the shaper's newest order is still
sent rather than dropped. Unit tests cover:
- an order waiting plus one in flight: `settled()` resolves only after both land;
- the failure path;
- an idle saver: resolves at once;
- an order still in its 400 ms wait;
- a move back that cancels the waiting order;
- dispose sending the waiting order, both after a landed save and after a failed one.

**What a shaper sees now:** Duplicate, Rename and Delete wait for any order still saving, so a copy
keeps its place beside its original and the account matches the screen.

### WR-02: Focus is lost after the second delete when the next board is the same one as last time

**Files modified:** `components/setup/board-rack.tsx`, `components/setup/hover-rack.tsx`, `components/setup/swipe-rack.tsx`, `components/setup/use-rack-boards.ts`
**Commit:** d113e5c
**Applied fix:** `focusKey` is replaced by a focus request with a counter, `RackFocusRequest = { key, n }`.
Each request is a new object, so both racks' effects run every time. The swipe rack's effect also
re-centres the track (`placeAt` + `kickRack`) on every request.
**What a shaper sees now:** after any delete, the focus lands on the next board along, and on a phone
that board comes to the middle.
**Not tested in a browser:** deleting needs a signed-in shaper, and the browser suite runs signed out.
The fix was checked with the type-checker, lint and the existing rack checks only.

### WR-03: Hover rack — after the unsaved board is dragged out of the rack, Enter on any board does nothing

**Files modified:** `components/setup/hover-rack.tsx`, `e2e/board-rack.spec.ts`
**Commit:** d5581ed
**Applied fix:** Of the two allowed options, this uses the window listener, as the swipe rack does.
When the unsaved board's drag is refused, the rack listens on the window (capture phase) for
`pointerup`, `pointercancel` and `blur`. When any of them fires, `suppressClickUntil` changes from
`Infinity` to `now + CLICK_AFTER_DROP_MS`. The listener removes itself after firing, and is also
removed when the rack unmounts. The other option, a fixed window set at lift time, was not used: it
could expire while the button is still held, and then a release over the same board would open it.
**What a shaper sees now:** after dragging the unsaved board and letting go anywhere, Enter on a board
opens it.
**Proof:** new desktop check m16a: drag the unsaved board, let go above the rack's heading, then press
Enter on a saved board. The "Open this board?" question appears, and Discard & Open opens the board.
It failed before the fix (the question never appeared) and passes after.

### WR-04: The order's saving, rollback and refresh path has no automated test

**Files modified:** `lib/models/rack-stand-in.ts`, `lib/models/rack-stand-in.test.ts`, `lib/rack-stand-in-server.ts` (new), `app/actions/rack-order.ts`, `app/test-rack/page.tsx`, `e2e/helpers/practice-rack.ts` (new), `e2e/board-rack.spec.ts`, `e2e/board-rack-phone.spec.ts`, `e2e/test-rack.spec.ts`, `e2e/old-safari-buttons.spec.ts`
**Commits:** fa96ef2 (the stand-in and k1), 4c880a8 (k2, k3, 13b)
**Applied fix:** The practice rack now has a dev-only stand-in for saving the order, built the same
way as the Contact form's stand-in:
- `resolveRackStandInSave` is a pure decider. It is on only where `rackStandInRouteEnabled` is
  (never in production, and only with `SHAPER_RACK_STAND_IN` exactly `"1"`), and only for a
  signed-out caller.
- The cookie `shaper-rack-stand-in-save` chooses what a save does: `fail` throws, `slow` stores after
  1.5 s, and anything else stores at once.
- The cookie `shaper-rack-stand-in-session` keys the stored order. Without it, the visitor uses one
  shared session.
- `lib/rack-stand-in-server.ts` is the request glue. It reads the literal `process.env.NODE_ENV` and
  keeps the orders in a map on `globalThis`.
- `saveRackOrder` sends signed-out calls to the stand-in, and `/test-rack` passes the stored order to
  the page as `rackOrder`.
- New boundary tests check that `lib/rack-stand-in-server.ts` contains the literal NODE_ENV read, that
  nothing under `components/` imports it, and that only the action and the `/test-rack` page do.
- `lib/db/ownership.test.ts` was not edited and still passes.

New browser checks:

| # | Check | Before the fix | After the fix |
|---|---|---|---|
| 1 | k1 (desktop): move, wait for the save, Open, Back. The moved order holds. | fails | passes |
| 2 | k2 (desktop, `fail` cookie): move. "Couldn't save the new order — try again." shows, the order goes back, and a reload confirms nothing was kept. | — | passes |
| 3 | k3 (desktop, `slow` cookie): a second move while the first save is still travelling. The recorded sequence of drawn orders never returns to the first move's order after the second appeared, and a reload shows both moves. | — | passes |
| 4 | 13b (android): hold and slide a board, Open, Back. The moved order holds. | fails without the refresh | passes |

**What a shaper sees now:** nothing new on screen. The save, rollback and refresh path is now
covered by tests, and those tests found CR-01 and WR-03.

### IN-01: A board the browser can't draw shifts every drop and move by one place

**Files modified:** `components/setup/board-rack.tsx`
**Commit:** 94bfe86
**Applied fix:** `savedIds` is now built from the boards the rack draws
(`boards.flatMap(board => board.model ? [board.model.id] : [])`) and used by `handleMove`,
`handleMoveOneStep` and the Move rows.
**What a shaper sees now:** a board the browser can't draw no longer throws a drop off by one place.

### IN-02: `saveRackOrder` quietly writes nothing, while the pill says the order is kept

**Files modified:** `lib/models/rack-order.ts`, `lib/models/rack-order.test.ts`, `app/actions/rack-order.ts`, `components/setup/use-rack-order.ts`
**Commit:** 24d621e
**Applied fix:** `saveRackOrder` now returns `RackOrderSaveResult { saved: boolean }`:
- `false` when signed out with the stand-in off, or when `parseRackOrderInput` rejects the list;
- `true` when the order is stored on the account, or by the stand-in.

The hook's save goes through `throwUnlessSaved`, which turns `saved: false` (or no answer) into a
failed save, so the rack rolls back and says "Couldn't save the new order — try again". The type is
imported, not declared in the action file, so `ownership.test.ts`'s function-signature scan still
parses the action.
**What a shaper sees now:** if their sign-in has lapsed, a move goes back and the rack says it
couldn't be saved. It no longer claims "The rack keeps your order."

### IN-03: The rack's vertical words are measured before the Inter web font may have loaded

**Files modified:** `components/setup/use-fonts-ready.ts` (new), `components/setup/hover-rack.tsx`, `components/setup/swipe-rack.tsx`
**Commit:** c1a8910
**Applied fix:** `useFontsReadyCount()` increases its count once `document.fonts.ready` resolves.
Both racks add that count to the `fits` memo's dependencies. They also pass it to `measureWords`,
which then starts a fresh measuring canvas, so no font metrics resolved against the fallback font are
reused. Passing the count in is also what keeps the `exhaustive-deps` lint rule clean.
**What a shaper sees now:** a long board name stays within its room once the app's font has loaded.

### IN-04: The same "last touched" date is formatted in two places

**Files modified:** `components/setup/rack-caption.tsx`
**Commit:** 4386823
**Applied fix:** `formatLastTouched` is deleted. The caption calls
`RACK_COPY.lastTouched(board.model.updatedAt)`. The `PHONE_MOVE_VIA_MENU` line in `rack-config.ts`
was not touched.
**What a shaper sees now:** no change on screen.

### IN-05: The practice-rack specs for 1 and 30 boards never check the count

**Files modified:** `e2e/test-rack.spec.ts`
**Commit:** ec3124b
**Applied fix:** both checks now assert `toHaveCount(boards)` on `[data-rack-board]`. They pass on
all three projects.
**What a shaper sees now:** no change on screen. These checks would now fail if `?boards=` were
ignored.

### IN-06: `--rack-report` checks Phase 11 boards with a different tip style than the home page uses

**Files modified:** `lib/models/rack-report.ts` (new), `lib/models/rack-report.test.ts` (new), `lib/models/rack-models.ts`, `lib/fit-defaults-preference.ts`, `lib/fit-defaults-server.ts`, `app/page.tsx`, `scripts/check-saved-boards.ts`
**Commit:** 9914378
**Applied fix:** The home page's two Tip Style rules are now shared functions, and both the page and
the report call them:
- `rackNeedsTipStyle(rows)` decides whether a rack needs the Tip Style looked up. `app/page.tsx` now
  calls it.
- `carryOverTipStyle({ signedIn, account, browser })` works the Tip Style out.
  `resolveCarryOverTipStyle` now calls it, through a factored-out `fitDefaultsInputs()`; its behaviour
  is unchanged.

How the report uses them:
- The script reads each account's fit defaults only for the accounts `accountsNeedingTipStyle` names.
  A failed read falls back the same way the page's does.
- `rackReport(rows, tipStyles)` groups the rows by account and runs `rackModelsAndDrops` for each
  account with that account's own Tip Style.
- It prints the same three lines as before, plus "Tip Styles that could not be read (Pin deck used): n"
  only when n > 0. It never prints an account id.
- The script's header records the one input the report can't have: the shaper's browser cookie.

Unit tests mock `rackModelsAndDrops` to check the per-account options. They also check that one
shaper's Phase 11 board really comes out with that shaper's Tip Style, that board names are never
read, and that the output never contains an account id.
**What a shaper sees now:** no change on screen. The founder's report now checks what each shaper's
home page actually draws. The script was not run here, because it needs a database.

### IN-07: Swipe rack — a press can stay "live" after a carry or a window blur

**Files modified:** `components/setup/swipe-rack.tsx`
**Commit:** e416daa
**Applied fix:** When a carry ends, the window's pointer-end handler resets `pointerPressed`. The
window's blur handler now ends a pending press (`endPress`), resets `pointerPressed` and finishes the
click suppression. It is not reset on a plain tap's pointerup: on a phone, a tap focuses the board
after pointerup, so resetting there would make a tap jump the track instead of gliding. The board's
own click still clears it.
**What a shaper sees now:** on an iPad with a keyboard, Tab brings the focused board to the middle
after a carry. A hold cut short by the window losing focus no longer lifts a board.

### IN-08: Timing-sensitive checks in the e2e suite

**Files modified:** `e2e/board-rack.spec.ts`, `e2e/board-rack-phone.spec.ts`
**Commit:** 25213a2
**Applied fix:** m20 now counts the page's animation frames from the release and requires the drop
to finish within 3 frames, instead of within 50 ms. Fixed waits were replaced with waiting for the
thing itself:
- the save's response (m12, phone 13);
- the rack coming to rest on a snap point with one board turned (phone 2);
- the track scrolling under a board held at the edge (phone 16);
- the settle after a system cancel (phone 17);
- the turn after a rest (desktop 2, desktop 10, phone 9).

Sleeps were kept only where they deliberately outlast one of the rack's own timers, each with a
comment saying why:
- the 180 ms rest in "nothing turns" checks (desktop 8, m19);
- the 420 ms hold in touchHold and phone 14;
- a tap's touch;
- the 500 ms click window in m16a;
- two "nothing happens" checks (m14, phone 15).

**What a shaper sees now:** no change on screen. Fewer re-runs on a loaded machine.

## Skipped Issues

### WR-05: Hold-and-slide is never tested on WebKit

**File:** `e2e/board-rack-phone.spec.ts:227, 483`
**Reason:** skipped: manual device check (15-10)
**Original issue:** every real-touch case runs on the Chromium `android` project only, so Safari's
touch path (the non-passive touchmove listener added at mount, the callout and contextmenu
suppression, and `touch-action` racing the 420 ms hold) is never proven on WebKit. It stays with the
founder's real iPhone / iPad Safari walk in 15-10.

## Deviations from the orchestrator's designs

1. **Fresh practice-rack session per test, set in the shared spec setup.** The design gives a missing
   session cookie one fixed key. That alone would let every spec that moves a board (m12, m17, the
   phone's 13–17, …) leave its order for the next spec, and for the next run against a reused server.
   So every spec that opens `/test-rack` now calls `freshPracticeRack(page)` in its setup
   (`e2e/helpers/practice-rack.ts`): `board-rack`, `board-rack-phone`, `test-rack`, and the one
   practice-rack case in `old-safari-buttons`. The fixed shared key is kept for a person using the
   practice rack. m17's last segment opens a fresh session, because by then that test has stored its
   own Move right.
2. **What k3 can and can't catch.** I temporarily made the hook adopt every incoming order, and k3
   still passed. With logging I found the reason: this Next build applies an action's refresh only
   once the queued second save has also landed. Only one stored order reached the rack, after both
   saves. So k3 guards the outcome a shaper sees, and the hook's "keep a newer move while saving"
   rule is proven by the unit tests in `lib/models/rack-order-sync.test.ts` rather than in a browser.
   The rule is still the right defence if Next ever applies the in-between refresh.
3. **IN-03:** the count is also passed into `measureWords`, which starts a fresh canvas. Adding it only
   to the memo's dependencies trips the `exhaustive-deps` lint rule, and the fresh canvas is a real
   use of the count.
4. **WR-03:** used the window listener, not the fixed window (reason above).

## Final verification (in the worktree)

- `npx vitest run`: 115 files, 4296 passed, 2 skipped.
- `npx tsc --noEmit`: clean, after `npx next typegen`.
- `npm run lint`: clean.
- `IS_WEBPACK_TEST=1 PW_PORT=3128 npx playwright test e2e/board-rack.spec.ts e2e/board-rack-phone.spec.ts`
  on all three projects: 60 passed, 105 skipped (each spec skips itself on projects it doesn't target).
- `IS_WEBPACK_TEST=1 PW_PORT=3128 npx playwright test e2e/test-rack.spec.ts e2e/phone-home.spec.ts e2e/old-safari-buttons.spec.ts`
  on all three projects: 66 passed, 21 skipped.

---

_Fixed: 2026-10-06T10:39:28Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
