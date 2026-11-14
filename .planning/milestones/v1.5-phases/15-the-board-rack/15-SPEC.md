# Phase 15: The Board Rack — Specification

**Created:** 2026-10-05
**Ambiguity score:** 0.04 (gate: ≤ 0.20), after the discussion of 2026-10-05. The requirements below are the founder's own words and picks
from the sketch session of 2026-10-05: sketches 009, 010 and 011, the last tried on the founder's own
phone. Five smaller questions are left for the discussion (Ambiguity Report).
**Requirements:** 10 from the founder's words and picks, plus 10 carried constraints
**Source:** `.planning/sketches/009-phone-swipe-rack/`, `010-sideways-board-rack/`, `011-phone-rack-reorder/`
(each with a README, a working `index.html` and pictures), `.planning/sketches/MANIFEST.md` decisions 11–14,
and the `sketch-findings-shaper` skill's `references/board-rack.md`, which holds the turn maths, the
measured layout figures and what was rejected.

## Goal

A shaper sees their whole quiver at once on the home page and enjoys browsing it. "Your Boards" becomes the
**Board Rack**. Every board stands sideways at one true scale on one floor line, its name and dims running
up beside it. The board under the cursor, or passing the middle of a phone's swipe, turns its real turn to
show its outline, and the rack keeps the order the shaper sets.

## Background

Today the home page shows a shaper's boards as cards, four to a row on a computer and one per screen on a
phone. Each card is a large outline thumbnail with the name, the card line, the last-touched date, Open
This Board and a ⋯ menu (Rename, Duplicate, Delete). The order is automatic: the unsaved board in progress
first, then the most recently touched (`lib/models/rack-order.ts`). Measured on the sketches with a
realistic 15-board quiver:

- **Phone (iPhone 14 page, 390 × 664):** 1 board on the first screen, and about 6,600 dots of scrolling
  before Shape a New Board.
- **Computer (1440 × 900):** 4 boards on screen, and Shape a New Board about 1,585 dots further down.

The sketches drew the same quiver as a rack. On the phone, Shape a New Board stays on the first screen
with 9 boards across mid-rack. On the computer all 15 fit in one row. Every board's rocker, outline and
litres in the sketches came from the app's own calculators.

## Requirements

The founder's words are quoted; the sentence after each quote is the requirement as this phase reads it.

1. **Boards held sideways, showing their rocker.** *"what if the custom board rack held the boards sideways
   (skinny cards with just the name and dims in single line of vertical text, and rocker profile) and only
   the board the cursor was on spun to the outline view?"* — At rest each board stands on its tail, rail
   facing the viewer, showing its **side profile** (rocker up to deck, from the board's own side profile).
   Its **name and card line** (`formatSummaryLine`) run up beside it in **one line of vertical text**,
   reading tail to nose. The board you're on **turns to show its outline**.

2. **The whole quiver, rockers compared, fun to browse.** Intake picks: *"See the whole quiver"*, *"Compare
   rockers"*, *"Fun to browse"*. — Every board is drawn at **one true scale on one floor line** (the tallest
   board sets the scale, never below a 7'0" reference; one scale across every row), so lengths and rockers
   compare side by side.

3. **The real turn.** Shown in every sketch the founder picked from. — The turn is computed, not animated
   from pictures: each station's cross-section is projected at the turn angle from the board's own rocker,
   thickness and half-width, so it is exactly the side profile at 0° and exactly the TEMPLATE outline at 90°
   (a swallow's notch included). The stringer slides from the rail edge to the centre as it turns. The
   formula is in `references/board-rack.md`.

4. **The app's drawing style.** Sketch 010 pick: *"A"* (Drawing rack, over a shop-rack look). — Board fill
   and ink edge, faint dashed height lines every foot (every 50 cm in Metric) with labels, a floor line,
   the stringer in the drafting centreline dash, and no text crossing a board. The theme's own colours only.

5. **On a computer, boards turn as the cursor passes.** Sketch 010 pick: *"follows the cursor"*. — Each
   board's turn follows its distance from the cursor. When the cursor rests (about 180 ms), the nearest
   board finishes turning, and the rack opens around a turning board. The last board touched stays turned
   when the cursor leaves, and its name, card line, last-touched date, Open This Board and ⋯ sit under it.

6. **On a phone or iPad, swipe along the rack.** Intake pick: *"Swipe along the rack"*; sketch 009 pick:
   *"B"*. — A sideways scroller that settles one board in the middle. **Every board turns as it passes the
   middle, following the thumb**, with the caption under the middle board, and Shape a New Board stays on
   the first screen.

7. **It's called the Board Rack.** *"rename it "Board Rack" rather than "your boards""* — The section
   heading reads **Board Rack**, with the number of boards beside it.

8. **The shaper sets the order.** *"the user must be able to reorder the board rack"* — Today's automatic
   order becomes only the starting order; after that the rack keeps the shaper's order. **On a computer:**
   press a board and drag it (into another row too), and the others slide over and a mark shows the gap.
   ⋯ → Move left / Move right, and Alt + arrow on the keyboard, do the same without dragging. **On a phone:**
   sketch 011 pick, *"A"* (tried on the founder's phone): **hold a board until it lifts, then slide it.** A
   quick swipe still moves the rack, the rack scrolls along when a carried board nears the screen's edge,
   and the heading says "hold to move".

9. **The unsaved board stays first.** *"yes the unsaved board stays first"* — The unsaved board in
   progress stays first and can't be moved until it's saved, and nothing can be dropped in front of it.

10. **Live before the freeze.** *"Before Wednesday's freeze"* — Live on the founder's go before Wednesday
    2026-10-07 evening, with a rehearsal walk after, ready for the 2026-10-10 showing.

## Boundaries

- **In:** the home page's saved-boards section (heading, the rack on computers and touch devices, the
  caption, opening a board, Rename/Duplicate/Delete, moving boards, the stored order), the turn maths, and
  the database change for the order.
- **Out:** the Shape a New Board presets (unchanged), the five design screens, printing, sharing, and any
  new screen. Signed-out visitors keep today's behaviour: no rack until a board is in progress.

## Constraints

1. **Rule 1:** the turn maths (and any layout maths that decides what a shaper reads) is pure TypeScript in
   `lib/geometry/`, with tests, and expected values come from the app's own functions or generated
   fixtures, never hand-typed.
2. **Rule 2:** every number on the rack goes through `lib/geometry/units.ts` / `formatSummaryLine`, and
   reads in the shaper's chosen system. Height lines are every foot in Imperial and every 50 cm in Metric.
3. **The rack draws from each saved board's own snapshot**, the same way the rack cards do today: the
   board's own copy of its blank, never the catalogue. Live data, never a cached picture. A board whose
   numbers can't be worked out is dropped, as today (WR-05).
4. **The order is stored additively** (a new nullable column or a new preference). By the Database rule its
   migration goes to production **before** the code that uses it ships, and to the development branch
   during the work.
5. **The screen switches stay separate** (CLAUDE.md Layout): width picks the layout and pointer picks
   control size. Choosing hover-rack versus swipe-rack by pointer is a new job for the pointer switch, to
   be confirmed in the discussion.
6. **Older Safari must work** (the founder's iPad 9th gen, shapers' older iPhones): no CSS 3D, no
   scroll-driven animations, and buttons not relying on default alignment (Safari before 18.4).
7. **Phone real estate is expensive:** nothing extra on the phone that the rack doesn't need, and Shape a
   New Board stays on the first screen.
8. **Keyboard and screen readers:** every board can be reached, opened and moved without a mouse, and
   reduced motion is honoured (a board swaps to its outline and drops into place without the animation).
9. **No new package.**
10. **Nothing is pushed without the founder's go**, and nothing lands after the Wednesday 2026-10-07 freeze.

## Acceptance Criteria

- [ ] The home page section reads **Board Rack** with its board count.
- [ ] On a computer, each saved board stands sideways at one shared scale with its name and card line
      running up beside it. Moving the cursor along turns boards as it passes, and resting finishes the
      nearest board's turn.
- [ ] A turned board shows exactly its TEMPLATE outline (a swallow's notch included), and at rest exactly
      its side profile. Both come from the board's own data, the same as ROCKER and TEMPLATE draw it.
- [ ] The caption under the turned board shows the name, card line, last-touched date, Open This Board and
      ⋯ (Move left, Move right, Rename, Duplicate, Delete). The unsaved board shows IN PROGRESS — NOT SAVED
      and Continue This Board, as today.
- [ ] Clicking or tapping a board opens it exactly as today, including the replace-board check.
- [ ] On a phone or iPad, the rack swipes, every board turns as it passes the middle, and it settles with
      one board turned. Shape a New Board is on the first screen of an iPhone 14 page with 15 boards.
- [ ] Dragging a board on a computer (or ⋯ → Move left / Move right, or Alt + arrow), or holding then
      sliding on a phone, moves it. The order survives a reload and shows on the shaper's other devices.
- [ ] The unsaved board is first and can't be moved, and nothing can be put in front of it.
- [ ] Imperial and Metric both read correctly (card line, height lines), and light and dark themes both
      read.
- [ ] It works on older Safari (the founder's iPad) and with the keyboard, and honours reduced motion.

## Edge Coverage

**Coverage:** 16/16 applicable edges resolved · 0 unresolved

Filled after the discussion (`15-CONTEXT.md` D-01 to D-16), the research (`15-RESEARCH.md`) and the approved
screen contract (`15-UI-SPEC.md` §9 States and its UI Considerations). ✅ = an explicit acceptance criterion a
test asserts; 🧪 = a backstop held out as a real-device or visual check.

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| No boards, signed out, a failed or slow list | R7 | ✅ covered | No heading, no rack, no hint; the presets stand where the rack was (today's rule and Suspense fallback). Test: empty entries render nothing |
| One board, or only the unsaved board | R1, R9 | ✅ covered | One slot, turned, with its caption (the unsaved caption has no ⋯); the hint still shows (D-08, D-09). Test on the stand-in route |
| 30 or more boards | R2, R5, R6 | ✅ covered | Hover rack: balanced rows at one shared scale; swipe rack: one longer track at the same height. Test: every board placed once, rows balanced, one scale |
| A swallow tail | R3 | ✅ covered | At 90° the path is the TEMPLATE silhouette with its notch. Test on the fish preset |
| A hand-set board with no blank | R1, R3 | ✅ covered | The side profile comes from the five typed stations, as everywhere. Test with a hand-set board |
| The longest and shortest boards | R2 | ✅ covered | The tallest sets the scale, never below a 7'0" reference. Test |
| A long name | R1 | ✅ covered | The vertical words shrink to 10px, then the name is cut by grapheme with the numbers whole; the caption name truncates; screen readers hear the full name. Test of the fit rule |
| A long name at the sideways-phone floor | R1 | 🧪 backstop | Check on a real phone held sideways that a cut 20-character name still reads |
| A board whose numbers or art can't be worked out | R1 | ✅ covered | Dropped and logged by id, the rest kept (WR-05). Test |
| A narrow computer window (mouse, under 820) | R5 | ✅ covered | Still the hover rack (D-04), fewer boards per row. Test of the layout function |
| An iPad, a touch laptop, a phone held sideways | R5, R6 | ✅ covered | iPad: swipe rack at any width (pointer, D-04). Touch laptop: first tap turns, second opens (D-05). Sideways phone: the rack takes the short screen, presets a scroll below (D-06). Source-contract and e2e tests |
| A board saved for the first time / a duplicate / a deleted board | R8 | ✅ covered | New board first (D-01); a duplicate right after its original, fixing the order even in an unarranged rack (D-16); a deleted board leaves the list and its id is skipped. Tests of the order functions |
| Two devices moving boards | R8 | ✅ covered | Last write wins; a board missing from the list stands first; an unknown id is skipped; the list is never corrupt. Tests of the merge |
| Hold-and-drag on older Safari | R8 | 🧪 backstop | Proven on the founder's iPad 9th gen and an Android phone on a dev build; if not reliable by Wednesday, D-11's switch turns on |
| Light and dark themes, Imperial and Metric | R2, R4 | ✅ covered | Theme tokens only; height lines every foot or 50 cm; card lines through `formatSummaryLine`. Source-contract and unit tests |
| Reduced motion and keyboard | R8 | ✅ covered | Only 0° and 90° draw under reduced motion; arrows walk, Enter opens, Alt+arrow moves, the status line speaks. e2e |

## Prohibitions (must-NOT)

**Coverage:** 9/9 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT draw a board at its own scale | R2 | resolved | test: one scale for every board in every row |
| MUST NOT use a shop-rack look, a held-up big board, snap-then-turn, an Arrange mode, or ‹ Move › buttons on the phone | R4, R6, R8 | resolved | source-contract test and review against the UI-SPEC; D-12 (no Move rows on the swipe rack unless D-11 is on) |
| MUST NOT put text across a board | R4 | resolved | test: every vertical word sits outside the board's drawn extent |
| MUST NOT use the warning colour for the unsaved board | R9 | resolved | source-contract test: the unsaved board's caption and words use no `--surf-warning-ink` |
| MUST NOT store or cache pictures of boards | R1 | resolved | everything is drawn from each board's data on render; no image files, no stored art |
| MUST NOT change the presets, the design screens or printing | Boundaries | resolved | diff check: no change under `components/{outline,rocker,rails,volume,fins,summary,template}` or the preset card |
| MUST NOT decide which rack by width | R5, R6 | resolved | source-contract test: the rack kind is read only from the pointer (D-04) |
| MUST NOT ship the code before its migration is on production | R10 | resolved | the plan's go-live checkpoint runs `npm run db:migrate:prod` and the column check before the push (Database rule) |
| MUST NOT push, merge to main, deploy or run anything against production without the founder's go, and nothing lands after the Wednesday 2026-10-07 freeze | R10 | resolved | each production step is a founder checkpoint in the plan |

## Ambiguity Report

All five open points were settled on 2026-10-05: four in the discussion (`15-CONTEXT.md`) and one by the
research, ruled on by the founder after it.

| # | Open point | Where it stands |
|---|---|---|
| 1 | Where a newly saved board goes | **Settled, D-01:** first, where the unsaved board stood |
| 2 | Where a duplicate goes | **Settled, D-02 and D-16:** right after its original; duplicating fixes the order even in a rack never arranged |
| 3 | One list on the account, or a position per board | **Settled by research (A):** one nullable `rack_order` list on the account's settings row; null means "not arranged yet" (D-03) |
| 4 | Hover rack versus swipe rack by pointer | **Settled, D-04:** a mouse hovers, a finger swipes, at any width |
| 5 | The hint's wording | **Settled, D-08:** always shown — `point to turn, drag to move` / `hold to move` (and `tap ⋯ to move` only under D-11) |

## Interview Log

- The idea, 2026-10-05: *"what if the custom board rack held the boards sideways (skinny cards with just the
  name and dims in single line of vertical text, and rocker profile) and only the board the cursor was on
  spun to the outline view?"*
- Feel: *"Show me both"* (clean drawings and a real shop rack). Main win: *"See the whole quiver"*,
  *"Compare rockers"*, *"Fun to browse"*. Touch: *"Swipe along the rack"*. Order of sketching: *"Go: phone
  first"*.
- Sketch 009 (phone): *"B"*: turns as it passes.
- During sketch 010: *"rename it "Board Rack" rather than "your boards""*; *"the user must be able to
  reorder the board rack"*.
- Sketch 010 (computer): *"A, follows the cursor, yes sketch 011"*.
- Sketch 011 (moving boards on a phone), after *"publish so i can test on phone"*: *"A, and yes the unsaved
  board stays first"*.
- Wrap-up: all four design areas included (005 left out). Timing: *"Before Wednesday's freeze"*.
