---
phase: 15-the-board-rack
plan: 06
subsystem: board-rack
status: complete
tags: [board-rack, hover-rack, tracer, home-page, reduced-motion, d-05, d-07]
requires:
  - 15-01 (rackBoardFigures, rack-art turn maths)
  - 15-02 (hoverRackLayout and friends, rack timings, useReducedMotion)
  - 15-03 (applyStoredOrder, turnedKeyOnArrival / AfterRemoval, RACK_COPY)
  - 15-05 (/test-rack practice rack)
provides:
  - "components/setup/board-rack.tsx: the Board Rack section (BoardRackEntry now carries RackModel; rackOrder prop; turnedKey, frozen, captions, dialogs)"
  - "components/setup/hover-rack.tsx: HoverRack({ boards, turnedKey, openKey, frozen, onTurn, onOpen, caption, focusKey })"
  - "components/setup/rack-caption.tsx: RackCaption({ board, variant, onOpen, onRename, onDuplicate, onDelete, duplicateError }), formatLastTouched"
  - "components/setup/use-rack-boards.ts: RackBoard, RackBoardEntry, useRackBoards"
  - "SetupScreen.rackOrder? / BoardRack.rackOrder? (read in app/page.tsx from 15-08)"
  - "DOM hooks: data-rack-kind, data-rack-board, data-rack-art, data-turn, data-rack-caption"
affects: [15-07, 15-08, 15-09, 15-11, 15-12]
tech-stack:
  added: []
  patterns:
    - "React renders every rack element once with a stable key; one requestAnimationFrame loop writes d / transform / opacity / data-turn and the buttons' left / width through refs (RESEARCH Pattern 7)"
    - "The turned board is worked out during render with React's adjust-state-while-rendering pattern (joined keys kept in state), never an effect"
    - "A useSyncExternalStore mounted flag: the server renders the heading, line and a 520-tall reserved box; the rack draws on the client"
key-files:
  created:
    - components/setup/hover-rack.tsx
    - components/setup/rack-caption.tsx
    - components/setup/use-rack-boards.ts
    - e2e/board-rack.spec.ts
  modified:
    - components/setup/board-rack.tsx
    - components/setup/setup-screen.tsx
    - app/page.tsx
    - e2e/phone-home.spec.ts
    - e2e/phone-trip.spec.ts
    - e2e/old-safari-buttons.spec.ts
  deleted:
    - components/setup/board-rack-card.tsx
decisions:
  - "Each board's transparent button covers the board's own room (its 48-dot slot plus the extra room it opens as it turns), not just the thin drawn side profile: the row's buttons then tile it with no gap and no overlap, so a click anywhere along the rack lands on the board under the cursor (UI-SPEC §6)."
  - "Leaving a row's drawing (into the band under the floor line, or out of the rack) is a rest on the last board the cursor was over; moves inside the band are then ignored, so the rack holds still while the shaper reaches the caption."
  - "The cursor's rest is detected inside the frame loop (180 ms since the last move over a drawing), not by a separate timer, so the settle never fights a stray frame."
  - "A finger's tap on the hover rack is told by the pointerdown that preceded the click; a keyboard Enter (no pointerdown) opens like a mouse click."
metrics:
  duration: "about 45 minutes"
  completed: 2026-10-06
  tasks: 3
  files: 11
actuals:
  tokens: 14500
  tasks: 3
  commits: 3
---

# Phase 15 Plan 06: The Board Rack on the Home Page Summary

The home page's "Your Boards" card grid is now the Board Rack: every saved board and the unsaved board stand on their tails at one true scale on one floor line, showing their rockers, with name and card line running up beside each; the board under the cursor turns its real turn to its TEMPLATE outline, and the rested board's caption (name, card line, last touched, Open This Board, ⋯) sits underneath. Opening a board works exactly as before.

## What a shaper will see

- **On a computer:** the heading `BOARD RACK` with `15 boards · point to turn, drag to move` beside it. All 15 boards stand in one row on a wide screen at about 3.4 dots per inch, with dashed height lines every foot from 4′. The board you were last working on arrives already turned (D-07).
- **Moving the mouse** along the rack turns each board by its distance from the cursor, and the rack opens around it. Resting for 180 ms finishes the nearest board's turn and moves its caption under it with a short glide.
- **A big quiver** wraps into balanced rows (30 boards: 15 + 15 at 1280; 15 boards: 8 + 7 in a 600-dot window). Moving into another row hands it the turning.
- **Under a row's floor line** (the caption, the ⋯) the rack holds still, so Open This Board is easy to reach.
- **With reduced motion** a board is only ever edge-on or fully turned.
- **On a touch-screen laptop** a finger's first tap turns a board and shows its caption, and a second tap opens it. A mouse click opens at once.
- **The unsaved board** stands first, with `In progress — not saved`, its name, card line and Continue This Board, and no ⋯.
- **With no boards**, nothing shows. No notice announces the change (D-15).
- **On phones and iPads** this same rack shows until 15-07 brings the swiping rack.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 (tracer) | The Board Rack on the home page, end to end | 25d1f1b | board-rack.tsx, hover-rack.tsx, rack-caption.tsx, use-rack-boards.ts, e2e/board-rack.spec.ts |
| 2 | Rows, holding still, reduced motion, touch laptops, the stored-order prop; old card deleted | 1640a78 | hover-rack.tsx, setup-screen.tsx, app/page.tsx, board-rack-card.tsx (deleted), e2e/board-rack.spec.ts |
| 3 | The phone and older-Safari checks read the Board Rack | b7af2b0 | e2e/phone-home.spec.ts, e2e/phone-trip.spec.ts, e2e/old-safari-buttons.spec.ts |

**Tracer gate:** Task 1's verify was run end to end (typegen, tsc, lint, `e2e/board-rack.spec.ts` + `e2e/test-rack.spec.ts` on desktop: 9 passed) before Task 2 began.

## Verification

- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- `npx vitest run lib components`: 4172 passed, 2 skipped. On the loaded machine two heavy suites outside this plan (`blank-fit.test.ts`, `phase14-curves.test.ts`) hit the 5-second timeout. Re-run alone with `units-isolation.test.ts`, all 105 passed. `units-isolation` still passes with the card file gone.
- `IS_WEBPACK_TEST=1 PW_PORT=3122 npx playwright test e2e/board-rack.spec.ts --project=desktop`: 12 passed (cases 1 to 11a).
- The Task 3 list on all three projects (iphone, android, desktop) passed in three foreground batches, with no failures:
  - phone-home + phone-trip + old-safari-buttons: 60 passed, 24 skipped.
  - phone-screen-tiles + phone-sideways-top-bar + phone-dialogs + step-nav: 79 passed, 53 skipped.
  - phone-setup-landscape + new-board + error-pages + app-settings + test-rack + board-rack: 84 passed, 39 skipped.
- Acceptance greps all pass:
  - `RACK_COPY.heading`: 1. `Your Boards` outside comments: 0. `coarse:hidden`: 1. `hidden coarse:inline`: 1.
  - `requestAnimationFrame`: 1. `useState(` in hover-rack: 2 (width, font family). `rackBoardFigures` in the hook: 3. Warning ink in the caption outside comments: 1.
  - `rackOrder` in setup-screen: 3. `sortRackEntries` there: 0. No import of the deleted card. `useReducedMotion` in hover-rack: 2.
  - `Your Boards` in the three old specs: 0 each. `Board Rack` in phone-home: 3. `data-rack-board` in old-safari: 2.
  - `app/page.tsx` changed only the type import and the variable's type.
- The viewers, `preset-card.tsx` and `card-thumbnail.tsx` are untouched (empty diff).
- A scratch screenshot pass checked the drawing at 15 boards, mid-sweep, at rest, 30 boards, and a 600-wide window. It matched sketch 010 A. The temporary spec was deleted and never committed.

## Deviations from Plan

### Interpretations (no rule needed, recorded for the verifier)

**1. Board buttons cover the board's room, not only its drawn span**
- **Plan said:** each button is "absolutely placed over the board's current box: row top to floor, the drawn span's width".
- **Why changed:** a resting side profile is only about 8 dots wide, which would leave gaps between buttons that open nothing.
- **What was built:** each button is as wide as the board's slot plus the extra room it opens while turning (`HOVER_SLOT + boardExtra(halfExtent(...))`), centred on the board. The room-making offsets come from the same extras, so the row's buttons tile it exactly. On the turned board the button is the outline's width, as UI-SPEC §11 asks.

**2. The duplicate error text comes from `RACK_COPY.duplicateFailed`**
- `handleDuplicate` otherwise stays verbatim; only the typed string changed. It is the identical text, following the orchestrator's ruling that the rack's words come from `rack-config.ts`.

**3. Delete hands the focus on**
- When the turned board leaves the rack (a delete), the rack also sets `focusKey` to the next turned board, so focus lands on that board's button (UI-SPEC §9 / §11).
- Base UI's own focus return after the dialog closes was not exercised: this suite has no saved boards with a working delete.

### Auto-fixed Issues

None. No wave-1 file needed a change.

## Known Stubs

None. Two pieces are deliberately left to later plans, as the plan states:
- Keyboard walking and roving tabindex: 15-11. Until then every board button is an ordinary tab stop.
- Freezing while the ⋯ menu is open: 15-11 adds `onMenuOpenChange`. Until then `frozen` covers the dialogs, and a pointer moving into the menu's popup counts as leaving the rack, which is a rest on the turned board.

## Threat Flags

None.
- **T-15-16:** names are React text and attribute values only, and no element is built from a string.
- **T-15-17:** `useRackBoards` wraps `rackBoardFigures` per board, then drops and logs only that board.
- **T-15-18:** the art is worked out once per list change, and frames only write attributes through refs.

No new network endpoint, storage use or trust boundary was added. No rack file touches browser storage, and no picture is stored.

## Self-Check: PASSED

- FOUND: components/setup/hover-rack.tsx, components/setup/rack-caption.tsx, components/setup/use-rack-boards.ts, e2e/board-rack.spec.ts, components/setup/board-rack.tsx
- GONE as planned: components/setup/board-rack-card.tsx
- FOUND commits: 25d1f1b, 1640a78, b7af2b0
