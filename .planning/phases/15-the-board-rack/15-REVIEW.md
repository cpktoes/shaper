---
phase: 15-the-board-rack
reviewed: 2026-10-06T00:00:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - app/actions/rack-order.ts
  - app/design/actions.ts
  - app/globals.css
  - app/page.tsx
  - app/test-rack/page.tsx
  - components/design/use-viewer-media.ts
  - components/setup/board-rack.tsx
  - components/setup/hover-rack.tsx
  - components/setup/rack-caption.tsx
  - components/setup/rack-card-menu.tsx
  - components/setup/rack-config.test.ts
  - components/setup/rack-config.ts
  - components/setup/rack-source.test.ts
  - components/setup/rack-status.tsx
  - components/setup/setup-screen.tsx
  - components/setup/swipe-rack.tsx
  - components/setup/use-rack-boards.ts
  - components/setup/use-rack-order.ts
  - drizzle/0009_rack_order.sql
  - e2e/board-rack-phone.spec.ts
  - e2e/board-rack.spec.ts
  - e2e/old-safari-buttons.spec.ts
  - e2e/phone-home.spec.ts
  - e2e/phone-trip.spec.ts
  - e2e/prod/test-rack.spec.ts
  - e2e/test-rack.spec.ts
  - lib/db/ownership.test.ts
  - lib/db/queries.ts
  - lib/db/schema.ts
  - lib/geometry/design.ts
  - lib/geometry/rack-art.test.ts
  - lib/geometry/rack-art.ts
  - lib/geometry/rack-layout.test.ts
  - lib/geometry/rack-layout.ts
  - lib/geometry/rack-room.test.ts
  - lib/geometry/screen-tiles.ts
  - lib/models/rack-gesture.test.ts
  - lib/models/rack-gesture.ts
  - lib/models/rack-models.test.ts
  - lib/models/rack-models.ts
  - lib/models/rack-order-saver.test.ts
  - lib/models/rack-order-saver.ts
  - lib/models/rack-order.test.ts
  - lib/models/rack-order.ts
  - lib/models/rack-stand-in.test.ts
  - lib/models/rack-stand-in.ts
  - playwright.config.ts
  - scripts/check-preference-columns.ts
  - scripts/check-saved-boards.ts
findings:
  critical: 1
  warning: 5
  info: 8
  total: 14
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-10-06
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

I reviewed the Board Rack end to end: the stored order and its saves (the server action, the
placements in `app/design/actions.ts`, the batching saver and the client hook), both frame loops,
the touch and keyboard paths, the test-only practice rack, the geometry, and the tests.

What is sound:
- **Ownership is right.** Every statement is scoped to the signed-in shaper's account, nothing
  takes an owner from the client, `saveRackOrder` checks its input all-or-nothing and keeps only
  the shaper's own board ids, and the source contract test covers the new file.
- **`/test-rack` cannot be reached on the live site.** It reads the literal `process.env.NODE_ENV`
  and needs a flag that only `playwright.config.ts` sets.
- **The geometry follows Rule 1 and Rule 2.** The formulas live in `lib/geometry/`, unit
  conversions go through `units.ts`, and the expected values come from the app's own functions.
- **Animation loops and listeners are cleaned up**, including under StrictMode's double mount.

The problems sit where the client's copy of the order meets the server's copy:

- **One Critical bug.** After a shaper rearranges the rack, opens a board and presses the
  browser's Back button (or swipes back on a phone), the rack shows the order from before the
  move. The next move they make then saves over the arrangement they lost. Next.js reuses the
  saved copy of a page on Back/Forward, and `saveRackOrder` deliberately never refreshes the home
  page, so that saved copy still holds the old order.
- **The "save the order before Duplicate / Rename / Delete" promise is not kept** when a save is
  already on its way.
- **Focus can be lost after a second delete.**
- **Enter on a board can stop working** after the unsaved board is dragged out of the rack.
- **The saving and rollback path has no automated test at all.** The practice rack's saves always
  "succeed", because it runs signed out.

## Critical Issues

### CR-01: Going Back to the home page shows the old board order, and the next move overwrites the shaper's arrangement

**File:** `app/actions/rack-order.ts:28-49`, `components/setup/use-rack-order.ts:54-63, 71-90, 105`
**Issue:** `saveRackOrder` stores the new order on purpose without `revalidatePath("/")` (line 28:
"No `revalidatePath` — the rack already shows the new order"). So the copy of `/` that Next keeps
for the browser still holds the order from page load. Next 16 reuses that copy on Back/Forward —
`node_modules/next/dist/docs/01-app/04-glossary.md:47`: "Pages are not cached by default but are
reused during browser back/forward navigation". The suite itself relies on this: it uses
`page.goBack()` throughout `e2e/board-rack*.spec.ts`.

What a shaper sees:
1. They drag *Log 9'4"* from 5th to 1st. The pill says "Moved Log 9'4". The rack keeps your
   order.", and the save lands on their account.
2. They tap Open This Board, look at the board, then press Back (or swipe back on the phone).
   `BoardRack` mounts again from the saved copy. `useRackOrder` starts with
   `{ basis: <old order>, ids: null }`, and the rack draws the **old** order: the Log is back in
   5th place.
3. They move any other board. `commit` builds the new list from the old order on screen, and the
   saver sends it (`saved` was seeded with the old order through `orderFromBasis(basis)`). The
   account's arrangement from step 1 is overwritten. That is silent data loss of the arrangement,
   the thing R8 says the rack keeps.

This only goes away when something else happens to refresh `/`: an autosave on the design screen,
a Rename / Duplicate / Delete, or a full reload. Opening a board just to look at it, then going
Back, is the most common way off the home page and back.
**Fix:** Either make the saved copy fresh, or remember on the client what this tab last saved.
- **Smallest fix:** call `revalidatePath("/")` after the upsert in `saveRackOrder`. With that, the
  Back copy is refreshed (revalidatePath doc line 19, "causes all previously visited pages to
  refresh when navigated to again").
- **But first** make `useRackOrder` keep its local order while a save is pending. Otherwise the
  re-render that comes back with each save resets `local` to the server's (possibly one-move-old)
  order mid-burst. Concretely: skip the reset in render when `saverRef.current?.pending()` is true,
  or when the incoming basis equals the order the saver just saved.
```ts
// app/actions/rack-order.ts
import { revalidatePath } from "next/cache";
...
  await db.insert(userPreferences)...;
  revalidatePath("/");
```
- **Alternative without a server re-render:** keep a module-level
  `lastSaved: { from: string; ids: string[] } | null` in `use-rack-order.ts`, set in the saver's
  `onSaved`. Initialise `local` from it when the incoming `basis === lastSaved.from`, so a Back
  navigation shows (and keeps building on) what this tab last saved.

Either way, add an e2e case that moves a board, opens it, goes Back, and asserts the moved order.
That needs a signed-in stand-in — see WR-04.

## Warnings

### WR-01: "Save the order before Duplicate / Rename / Delete" fails when a save is already on its way, so a copy can lose its place beside its original

**File:** `components/setup/board-rack.tsx:186-224`, `lib/models/rack-order-saver.ts:105-107, 124-128`, `components/setup/use-rack-order.ts:84-89`
**Issue:** `handleDuplicate`, `handleRenameConfirm` and `handleDeleteConfirm` call `flush()` and
rely on Server Actions running one at a time (T-15-27). But `flush()` only sends a waiting order
when **nothing is in flight** (`sendIfIdle`). Here is the sequence when one save (A) is travelling
and a newer move (B) is waiting:
1. `flush()` sends nothing.
2. `duplicateModel` is queued behind A.
3. When A lands, the saver's `.then` sends B — queued **after** the duplicate.
4. The duplicate reads A, stores A plus the copy beside its original, and returns. The new
   `rackOrder` changes `basis`, the hook resets `local` to the server's order, and the screen
   shows A plus the copy: move B visibly snaps back.
5. B then runs on the server and overwrites the account with B, which has no copy in it.

Next visit, the copy is "unlisted" and stands **first**, not beside its original (D-02/D-16 lost),
and the screen had shown the opposite of what was stored. Rename and Delete reach the same
mismatch between screen and account. The window is a move made, then Duplicate/Rename/Delete
chosen, within about one save round trip plus 400 ms. Narrow, but this is exactly the race T-15-27
claims to close.
**Fix:** Make the flush awaitable and wait for the saver to go idle before calling the action:
```ts
// rack-order-saver.ts — resolves once nothing is waiting or in flight
settled(): Promise<void>  // resolve from the success/failure branches when waiting === null && inFlight === null
// board-rack.tsx
const handleDuplicate = async (model: RackModel) => {
  await flushAndSettle();   // flush() then await saver.settled()
  ...
};
```
Also guard `dispose()` in the basis-change cleanup: today it drops a waiting order without sending
it (`waiting = null`) whenever something is in flight.

### WR-02: Focus is lost after the second delete when the next board is the same one as last time

**File:** `components/setup/board-rack.tsx:91, 164, 210`; `components/setup/hover-rack.tsx:641-643`; `components/setup/swipe-rack.tsx:975-984`
**Issue:** After a delete, focus is handed to the next board through
`setFocusKey(turnedKeyAfterRemoval(...))`, and both racks focus it in `useEffect(..., [focusKey])`.
`focusKey` is never cleared. Example: delete A, so focus goes to B (`focusKey = "B"`). Later turn
to C, the last board, and delete it; the fallback is the board before it, B again. `setFocusKey("B")`
is a no-op, neither effect runs, and focus drops to the page body when the dialog closes. A
keyboard or screen-reader user then has no place in the rack (UI E10). On the swipe rack the track
also isn't re-centred by this path.
**Fix:** Make each request distinct, e.g. a counter:
```ts
const [focusRequest, setFocusRequest] = useState<{ key: string; n: number } | null>(null);
setFocusRequest((prev) => ({ key, n: (prev?.n ?? 0) + 1 }));
// racks: useEffect(() => { if (focusRequest) ... }, [focusRequest]);
```
There is also no test that proves focus lands on the next board after a delete: the practice rack
runs signed out, so `deleteModel` throws there. Add a component-level or signed-in test.

### WR-03: Hover rack — after the unsaved board is dragged out of the rack, Enter on any board does nothing

**File:** `components/setup/hover-rack.tsx:724-727, 795-804, 842-846`
**Issue:** `liftBoard` sets `suppressClickUntil = Infinity` and, for the unsaved board, returns
**without** `setPointerCapture`. The only thing that brings the value back to a finite one is the
rack root's own `onPointerUp` (line 803). If the mouse is released outside the rack, that handler
never fires and the value stays `Infinity`. From then on `handleBoardClick` swallows every board
click — including Enter/Space from the keyboard, which arrive as clicks. That lasts until a later
mouse press on a board resets it to 0 (line 832). A keyboard user who once dragged the unsaved
board off the rack can no longer open a board with Enter.
**Fix:** Capture the pointer for the refusal too, or listen for the release on `window`, as the
swipe rack does with `releaseClick`. Simplest: in the unsaved-board branch, set a finite window
instead of `Infinity`:
```ts
if (board.kind === "in-progress") {
  state.suppressClickUntil = nowMs() + CLICK_AFTER_DROP_MS;
  current.onMove(board.key, 0);
  return;
}
```

### WR-04: The order's saving, rollback and refresh path has no automated test, and the e2e "never failed" checks can't fail

**File:** `components/setup/use-rack-order.ts` (no test); `e2e/board-rack.spec.ts:485`; `e2e/board-rack-phone.spec.ts:532`
**Issue:** `lib/models/rack-order-saver.ts` is unit-tested on its own. Its wiring in
`useRackOrder` is not tested anywhere:
- the `basis` comparison during render,
- the saver re-created per basis,
- `onFailed` putting the order back with the right basis,
- the cleanup's flush and dispose.

The practice rack runs signed out, so `saveRackOrder` returns quietly on every call. The e2e
assertions `expect(statusRegion(page)).not.toHaveText(RACK_COPY.saveFailed)` therefore pass no
matter what the client does with a failure: a save that can never fail proves nothing about
failure. As a result:
- R8's "a failed save puts the board back and says so" is never exercised in a browser.
- CR-01 and WR-01 went undetected.
**Fix:**
- Add a stand-in save to the practice rack that obeys a test cookie, as the Contact form's
  `SHAPER_CONTACT_STAND_IN` does (`ok` / `fail` / `slow`, dev-only, behind the same literal
  `NODE_ENV` gate). Then add e2e cases for:
  - a failed save, which reverts and shows the pill;
  - move, then open, then Back, which keeps the moved order;
  - move, then Duplicate while a slow save is in flight.
- Or unit-test `useRackOrder` with `@testing-library/react`'s `renderHook` and a mocked
  `saveRackOrder`.

### WR-05: Hold-and-slide is never tested on WebKit — the engine on the founder's iPad and on every iPhone

**File:** `e2e/board-rack-phone.spec.ts:227, 483` (and the other `project.name !== "android"` skips)
**Issue:** Every real-touch case (hold, lift, slide, edge-scroll, the swipe that must not lift, a
cancelled touch, the unsaved board refusing) runs on the Chromium `android` project only, through
CDP touch events. The rack's touch path is mostly there for Safari:
- the single non-passive `touchmove` listener added at mount (old Safari ignores one added
  mid-touch),
- the `-webkit-touch-callout` and `contextmenu` suppression,
- `touch-action: pan-x pan-y` racing the 420 ms hold,
- the 120 ms settle timer standing in for `scrollend`.

None of it is ever proven on WebKit. A regression that stops a held board following the finger on
iOS, or lets the page scroll under a carried board (T-15-28), would pass the suite.
**Fix:** Add an iPhone-project pass using `page.touchscreen` / WebKit's touch emulation for at
least hold → lift → drop and a cancelled hold. If WebKit emulation can't do it, record a manual
iOS / iPad Safari < 18.4 check for those three gestures in the 15-10 device walk.

## Info

### IN-01: A board the browser can't draw shifts every drop and move by one place

**File:** `components/setup/board-rack.tsx:239-252, 279-308`; `components/setup/use-rack-boards.ts:92-93`
**Issue:** `useRackBoards` leaves out a board whose figures throw. Drop places (`toRackIndex`) and
`canMoveLeft`/`canMoveRight` are worked out against the drawn boards. But `savedIdsInOrder(rackEntries)`
still includes the board that was left out, so a drop lands one place off and a Move can "succeed"
with no visible change. This is practically unreachable, because the server drops such boards
first with the same `rackBoardFigures`.
**Fix:** Build `savedIds` from `boards` (`boards.filter(b => b.model).map(b => b.key)`) rather
than from `rackEntries`.

### IN-02: `saveRackOrder` quietly writes nothing, while the pill says the order is kept

**File:** `app/actions/rack-order.ts:33-36`
**Issue:** A signed-out caller, or a list over 500 ids, returns without writing or throwing.
Signed out is needed for the practice rack. For a real shaper whose sign-in lapsed in another tab,
the pill still says "The rack keeps your order." and nothing is stored.
**Fix:** Return `{ saved: boolean }` and have the hook treat `false` as a failure everywhere except
the practice rack. Or throw for a rejected list.

### IN-03: The rack's vertical words are measured before the Inter web font may have loaded, and are never measured again

**File:** `components/setup/hover-rack.tsx:271-284, 574-579`; `components/setup/swipe-rack.tsx:384-397, 823-828`
**Issue:** `fitSpineWords` measures with a canvas, using the family name read when the rack was
first sized. A font that loads later doesn't trigger a new measurement. next/font's size-adjusted
fallback keeps the error small, but a long name fitted against the fallback can draw slightly
longer than its room.
**Fix:** Bump a counter on `document.fonts.ready.then(...)` and add it to the `fits` memo's
dependencies.

### IN-04: The same "last touched" date is formatted in two places

**File:** `components/setup/rack-caption.tsx:27-30`, `components/setup/rack-config.ts:53-57`
**Issue:** `formatLastTouched` and `formatRackDate` are identical. The caption formats the date
first and then passes the text to `RACK_COPY.lastTouched`, which formats it again if it's a `Date`.
**Fix:** Keep one (`RACK_COPY.lastTouched(model.updatedAt)`) and delete the other.

### IN-05: The practice-rack specs for 1 and 30 boards never check the count

**File:** `e2e/test-rack.spec.ts:24-30`
**Issue:** `opens with 1 board` and `opens with 30 boards` only assert the "Shape a New Board"
heading, so they would pass if `?boards=` were ignored.
**Fix:** `await expect(page.locator("[data-rack-board]")).toHaveCount(boards);`

### IN-06: `--rack-report` checks Phase 11 boards with a different tip style than the home page uses

**File:** `scripts/check-saved-boards.ts` (`rackModelsAndDrops(..., () => {})` in the `--rack-report` block)
**Issue:** The home page passes the shaper's own Tip Style for Phase 11 blanks (`app/page.tsx`).
The report passes no options, so those boards are checked with Pin deck. Which boards get left out
almost certainly matches, but the report is not literally "what the home page runs".
**Fix:** Group rows by `clerkUserId` and pass each account's resolved Tip Style. Or document the
difference in the report's header.

### IN-07: Swipe rack — a press can stay "live" after a carry or a window blur

**File:** `components/setup/swipe-rack.tsx:780-782, 952-954, 1057-1061`
**Issue:** `pointerPressed` is cleared only by a click or a cancel on the button. After a carry the
finger lifts elsewhere, no click comes, and the next Tab focus on an iPad keyboard no longer brings
the board to the middle. Also, `onBlur` drops a carry but not a pending `press`, so a hold
interrupted by a blur with no pointer cancel could still lift after the finger is gone.
**Fix:** In the window `onPointerEnd` and `onBlur`, reset `pointerPressed.current = false`, and
clear `rack.frame.press` on blur.

### IN-08: Timing-sensitive checks in the e2e suite

**File:** `e2e/board-rack.spec.ts:746-772` (m20: turned within 50 ms of release), plus many fixed `waitForTimeout(...)` calls in both rack specs
**Issue:** A 50 ms wall-clock check and fixed sleeps are flake-prone on a loaded machine. The memory
notes another project's Playwright sharing port and load. This won't hide a bug, but it will cost
reruns.
**Fix:** Poll for the condition (`expect.poll`) and loosen m20 to frames (e.g. at most 3
`requestAnimationFrame` ticks) rather than milliseconds.

---

_Reviewed: 2026-10-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
