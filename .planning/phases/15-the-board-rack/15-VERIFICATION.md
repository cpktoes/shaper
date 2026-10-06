---
phase: 15-the-board-rack
verified: 2026-10-06T16:00:00Z
status: human_needed
score: 9/10 must-haves verified
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "R8 — the shaper's order is stored on their account and shows on their other devices (and survives a reload)"
    test: "Signed in on the live site, move a board, reload; then open the home page on a second device"
    expected: "The moved order holds after the reload and appears on the other device"
    why_human: "Every test runs signed out with no database (the practice rack keeps orders in memory); the save action, the column and the merge are proven by unit and source tests, but a real round trip through Neon on production data has never been exercised by a test"
human_verification:
  - {test: "Signed in on the live site: look at your own saved boards on the rack, move one, reload, then open the home page on a second device", expected: "Boards stand in the stored order; the move is kept after a reload and shows on the other device (R8)", why_human: "No test signs in or touches a database; only a real account on production shows the stored order following the shaper"}
  - {test: "Move a board, press Open This Board, then Back", expected: "The moved order holds on the real home page, not the old one (CR-01 fix)", why_human: "The fix (revalidatePath plus the order-sync merge) is proven on the practice rack in a browser, never on real saved boards through Next's Back cache on the live site"}
  - {test: "Duplicate a board straight after moving a board", expected: "The copy stands right beside its original and the earlier move is still there (D-02, D-16, WR-01)", why_human: "The real duplicate action reads and writes the account's order in the database; tests only cover the pure order rule and the pending-save wait"}
  - {test: "Delete the board that is turned", expected: "The turn and the keyboard focus pass to the next board (the previous one if it was last) (WR-02)", why_human: "Focus placement after a real delete against the live database; the practice rack proves it only with stand-in data"}
  - {test: "VoiceOver on an iPhone: swipe through the rack", expected: "Each board reads its full name, card line and 'board 3 of 15' (UI-SPEC open item 4)", why_human: "Screen-reader speech cannot be driven by Playwright"}
  - {test: "Alt + left arrow on a focused board in real Chrome and Firefox on Windows or Linux", expected: "The board moves one place and the browser does NOT go Back (UI-SPEC open item 3, T-15-32)", why_human: "Only proven in Playwright's Chromium on macOS, where Alt + left is not the Back shortcut"}
---

# Phase 15: The Board Rack — Verification Report

**Phase Goal:** A shaper sees their whole quiver at once on the home page and enjoys browsing it: "Your Boards" becomes the Board Rack, every board standing sideways at one true scale on one floor line with its name and dims running up beside it, the board under the cursor (or passing the middle of a phone's swipe) turning its real turn to show its outline, and the rack kept in the order the shaper sets.
**Verified:** 2026-10-06
**Status:** human_needed (no gaps; every automated check passes; the items above need the founder on the live site)
**Re-verification:** No, initial verification

Shaper has no `.planning/REQUIREMENTS.md`; the requirements are the SPEC's own R1 to R10. Truths below are those ten.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| R1 | Boards stand on their tail, rail to the viewer, showing their side profile, with name and card line in one vertical line | VERIFIED | `lib/geometry/rack-art.ts` builds 65 stations from `designSideProfile` and `sampleOutline` (the app's own profile, shared with the card litres); `rackBoardFigures` runs on the server and `rackModelsAndDrops` drops and logs an undrawable board by id (WR-05). Name fit (shrink, then cut by grapheme, numbers whole) is tested in `rack-layout.test.ts`. The side-profile-at-0-degrees and hand-set-board cases are in `rack-art.test.ts`. |
| R2 | One true scale on one floor line, tallest sets the scale, never below 7'0", one scale across rows | VERIFIED | `rack-layout.test.ts` (7'0" floor, 30 boards one scale at every width, 9'4" sets the scale, height lines every foot, bare 150 / 200 in Metric). No `25.4` or `304.8` in any new file (grep clean; `units-isolation.test.ts` passes). |
| R3 | The real turn, computed: exact side profile at 0 degrees, exact TEMPLATE outline at 90 degrees (swallow notch kept), stringer slides to the centre | VERIFIED | `turnedBoardPoints` switches to `silhouette(geometry)` (exported from `screen-tiles.ts`, the TEMPLATE's own construction) from 1.562 rad; `rack-art.test.ts` covers 0 degrees, 90 degrees, the fish preset's notch, the stringer. Pure TypeScript, no React or DB import (Rule 1). |
| R4 | The app's drawing style; no text across a board; theme colours only | VERIFIED | `rack-source.test.ts` pins theme tokens and the unsaved board's no-warning-ink rule (warning ink appears once, on the duplicate-failed line, and on Delete); `rack-art.test.ts`, `rack-room.test.ts` and e2e case 12 pin that no word crosses a board, resting or mid-turn, on a computer and a phone. |
| R5 | On a computer boards turn as the cursor passes; rest finishes the turn; the room opens around a turning board; caption under the last-touched board | VERIFIED | `hover-rack.tsx`, `rack-layout.ts` (turn follows distance, rows balanced fuller-first, reserved band), `rack-caption.tsx` (name, card line, Last touched, Open This Board, the menu with Move left / Move right, Rename, Duplicate, Delete; the unsaved caption has the tag and Continue This Board and no menu). Click opens through `handleSelectModel`, so the replace-board check is kept. Orchestrator's 829-pass e2e covers the desktop cases. |
| R6 | On a phone or iPad a sideways swipe settles one board in the middle, each board turns as it passes, Shape a New Board stays on the first screen | VERIFIED | `swipe-rack.tsx`; the rack kind comes from `useCoarsePointer()` alone (`board-rack.tsx:130`, pinned by a source test) so an iPad swipes at any width; e2e cases 1 to 8, 10, 12a measure Shape a New Board on a 390 x 664 page. Orchestrator's e2e run: iPhone, Android and desktop all green. |
| R7 | The heading reads Board Rack with the count and an always-on hint | VERIFIED | `RACK_COPY.heading = "Board Rack"`; `rackHeadingLine` gives `15 boards · point to turn, drag to move` or `· hold to move`, both phrasings in the markup and the pointer picks (`coarse:`). Renders nothing at all with no boards, so signed-out visitors see the presets as before (confirmed by the orchestrator's live check). |
| R8 | The shaper sets the order: drag, Alt + arrow, the menu's Move rows on a computer; hold then slide on a phone; stored and shown on other devices | VERIFIED for the moving; stored-on-account half is PRESENT_BEHAVIOR_UNVERIFIED | Moves: one pure rule (`moveInOrder`, `moveOneStep`, `rackIndexToSavedIndex` in `rack-order.ts`) behind both racks, e2e m12 to m22 and 13 to 21p. Storage: nullable `user_preferences.rack_order` (`drizzle/0009_rack_order.sql`, additive); `saveRackOrder` takes the identity only from `auth()`, validates all-or-nothing, keeps only the shaper's own ids, then `revalidatePath("/")` (CR-01); `app/page.tsx` reads it beside the board list and fails soft to the automatic order. D-01 (`saveModel`), D-02 and D-16 (`duplicateModel` via `orderAfterDuplicate`) are wired in `app/design/actions.ts` and logged-and-swallowed on failure. The database round trip (reload, second device) has no test: human item 1. |
| R9 | The unsaved board stays first, can't be moved, nothing goes in front | VERIFIED | `applyStoredOrder` always puts it first and the id list never holds it; `handleMove` / `handleMoveOneStep` refuse it with the spoken line; `rackIndexToSavedIndex` clamps a drop in front of it. e2e m16, 15 and the order unit tests. |
| R10 | Live before the Wednesday freeze, migration to production before the code | VERIFIED (from the founder's pasted records and the orchestrator's live check) | Production column check read 4 of 5 before and 5 of 5 after `db:migrate:prod` (9 to 10 migrations), then the push (c417257, tip d955b04) — the Database rule's order. Live on www.shaperassistant.com since 2026-10-06. The post-go-live rehearsal walk is the founder's and is still to do (human items). |

**Score:** 9 of 10 truths fully verified; 1 (R8's cross-device storage) is present and wired but behaviourally unexercised, so it goes to a human.

### Required Artifacts (spot-checked in the tree)

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/geometry/rack-art.ts`, `rack-layout.ts` | VERIFIED | Pure, tested (rack-art 289, rack-layout 460, rack-room 343 test lines) |
| `lib/models/rack-order.ts`, `rack-order-saver.ts`, `rack-order-sync.ts`, `rack-gesture.ts`, `rack-models.ts` | VERIFIED | Pure, tested |
| `app/actions/rack-order.ts` | VERIFIED | `auth()` first, strict input, own ids only |
| `drizzle/0009_rack_order.sql` + `lib/db/schema.ts` | VERIFIED | `ALTER TABLE "user_preferences" ADD COLUMN "rack_order" text;` nullable |
| `components/setup/{board-rack,hover-rack,swipe-rack,rack-caption,rack-status,rack-card-menu}.tsx` | VERIFIED | Substantive and wired from `setup-screen.tsx` |
| `app/test-rack/page.tsx` + `lib/rack-stand-in-server.ts` | VERIFIED | Gated by literal `process.env.NODE_ENV` and `SHAPER_RACK_STAND_IN`; 404 in a production build (orchestrator's `test:e2e:prod`) |
| `scripts/check-saved-boards.ts --rack-report` | VERIFIED | Founder ran it: 10 of 10 drawable |

### Key Links

| From | To | Status |
|------|----|--------|
| `app/page.tsx` -> `readRackOrder` -> `SetupScreen` -> `BoardRack` -> `applyStoredOrder` | the stored order reaches the screen | WIRED |
| `BoardRack.handleMove*` -> `useRackOrder.commit` -> `createRackOrderSaver` -> `saveRackOrder` -> column -> `revalidatePath("/")` | a move is shown at once and stored | WIRED |
| `saveModel` / `duplicateModel` -> `orderWithNewBoardFirst` / `orderAfterDuplicate` -> `storeRackOrder` | D-01, D-02, D-16 | WIRED |
| `useCoarsePointer()` -> rack kind | D-04 | WIRED, source-pinned |
| `rackModelsFromRows` -> `rackBoardFigures` | WR-05 drop rule | WIRED |

### Behavioral Spot-Checks (this verification)

| Check | Result |
|-------|--------|
| `npx vitest run lib/models lib/geometry/rack-{art,layout,room}.test.ts lib/db components/setup lib/units-isolation.test.ts` | 22 files, 588 passed |
| `npx tsc --noEmit` | clean |
| Debt markers (TBD / FIXME / XXX / TODO / HACK) in the phase's source files | none |
| Phase 15 commits touching presets or the five design screens' components | none (only the earlier quick 261005-big, before the phase began) |

Not re-run, cited from the orchestrator on gate commit 8416c23 (code-identical to the shipped d955b04): lint clean, full vitest 115 files / 4,375 passed, `test:e2e:prod` 18 passed, full `test:e2e` 829 passed / 0 failed, the live check and the founder's production report.

### Requirements Coverage

R1 to R10 are all claimed by the plans (15-01 to 15-13) and none is orphaned; verdicts are the table above. The SPEC's Edge Coverage (16 rows) and Prohibitions (9 rows) are each backed by a named test or a recorded founder check; the two real-device backstops (long name sideways; hold-and-drag on older Safari) were closed by the founder on an iPad 9th gen and an Android phone ("looks and feels great on all").

### Anti-Patterns Found

None blocking. `15-VALIDATION.md` is still `status: draft` / `nyquist_compliant: false` with every row unticked; it was seeded at planning and never closed out. Housekeeping only (the passing tests it lists exist), but `/gsd-validate-phase` or a hand edit should tidy it.

## Judgment on the Deviations and Rulings

1. **15-01 (side-profile extraction, two test refinements): sound.** `designSideProfile` is a verbatim move from `summarizeDesignWith` (diff read), so the card litres and the rack's drawing can't drift; the whole suite stayed green. Negative-zero and the 89.5-degree bound are honest Rule-1 refinements, not weakened checks.
2. **15-02 (fuller rows first, 288 always means two or more rows): sound,** a layout choice pinned by the layout tests.
3. **Orchestrator's room fix after the tracer: sound and necessary.** It closes the SPEC's "no text across a board" prohibition, and is pinned by `rack-room.test.ts` and e2e case 12 at rest and mid-sweep. The accepted ~8-dot end movement and halo-brushing-a-tick are cosmetic and disclosed.
4. **15-07 (wider phone slot on tall screens, tucked top room, iPad-width wording): sound.** The 153 vs 118-dot caption is the one place the built screen differs from UI-SPEC §4; the founder judged it fine on devices, so it is a recorded acceptance, not a gap. Consider updating UI-SPEC so the two documents agree.
5. **15-09 (self-glide after a drop, release-after-hold never opens, status pill steps aside, carried board under neighbours ~110 ms): sound,** all founder-accepted on devices; the pill rule keeps Open This Board uncovered.
6. **15-11 ("inert" as behaviour, boards placed by transform): sound.** It is what lets focus land on the next board after a delete; the hold-still behaviour is covered by m19.
7. **Code review's 13 fixes and the one skip: sound.** CR-01 is the right fix (revalidate the page plus the pending-save-aware merge), pinned by unit tests and e2e k1 to k3 and 13b. WR-04's stand-in is provably dead in production (literal `NODE_ENV` plus a flag set only in the test config, 404 proven by the prod spec). WR-05's skip is legitimate: the founder's device check lists the three Safari gestures and the move, open, Back check as items 10 to 12 and "+". One residual: the check was an iPad (Safari) and an Android phone, not an iPhone; an iPhone is the same WebKit, and the walk can confirm it.
8. **D-11 "keep": sound and honoured.** `PHONE_MOVE_VIA_MENU = false`, the fallback stays prepared and un-flipped, the ⋯ on a phone is Rename, Duplicate, Delete (D-12), tests pin both switch positions.

## Gaps Summary

No gaps. Nothing blocks the phase goal. What is left is the founder's rehearsal walk on the live site, signed in, listed in `human_verification` above: the stored order following the shaper across reload and devices, Back after a move on real data, duplicate straight after a move, delete of the turned board, VoiceOver on an iPhone, and Alt + left in Chrome and Firefox off a Mac. When those are ticked the phase can close; the ROADMAP still shows Phase 15 unticked and `15-VALIDATION.md` still draft, both orchestrator housekeeping.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_
