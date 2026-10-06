---
sketch: 009
name: phone-swipe-rack
question: "On a phone or iPad, how does swiping along a sideways board rack feel, with the board in the middle turned to show its outline?"
winner: "B"
tags: [phone, home, board-rack, interaction, motion]
---

# Sketch 009: Your Boards as a rack, on a phone

## Design Question
The founder's idea (2026-10-05): "what if the custom board rack held the boards sideways (skinny cards
with just the name and dims in single line of vertical text, and rocker profile) and only the board the
cursor was on spun to the outline view?"

The founder's answers before anything was drawn: show both looks (clean drawings and a real shop rack);
the wins wanted are all three of *see the whole quiver*, *compare rockers* (every board at one scale on
one floor line) and *fun to browse*; and phones and iPads, which have no cursor, **swipe along the rack
with the board in the middle turned**. The founder asked for the phone first, so this is 009. The
computer version, where the cursor picks the board, is sketch 010.

## How to View
open .planning/sketches/009-phone-swipe-rack/index.html

In a phone-sized window (under 520 dots wide, or on a real phone) the page becomes the phone itself.
Swipe with your thumb, and tap **Notes** for the description and the switches.

## Variants
- **Today (for comparison)**: today's Your Boards on a phone, one full-width card per board, stacked.
- **A: Snap, then turn**: the rack glides and settles with one board in the middle, and once it stops
  that board turns to show its outline. Its name, dims, last-touched date, Open and ⋯ (Rename,
  Duplicate, Delete) sit underneath.
- **B: Turns as it passes ★ (the founder's pick)**: the same rack, but every board turns as it crosses the middle, following
  your thumb. It still settles with one board fully turned.
- **C: Held up**: the rack becomes a shorter strip along the bottom, and the middle board is drawn big
  above it, like today's card. The big board turns away and the next one turns in whenever the middle
  board changes. The strip's words are just the name and length; the full dims sit beside the big board.

Switches beside the phone: **Look** (Drawing / Shop rack), **Boards** (1 / 4 / 15 / 30), **Units**
(Imperial / Metric), and ← → to move one board. Sketch tools: theme, phone size, slow-motion turn,
which way the words read, height lines on or off.

- **Drawing look**: the app's drafting style. Boards in the board fill with an ink edge, faint dashed
  height lines every foot (every 50 cm in Metric), and a floor line. The rack **opens** around the
  turned board; its neighbours slide aside.
- **Shop rack look**: white foam boards on a wall with a padded floor rail, a faint back rail and soft
  shadows. The turned board **lifts out in front** of its neighbours with a wood stringer, and the
  rack itself never moves.

## What to Look For
- Swipe, let go, and watch the turn. A waits for the rack to stop; B turns with your thumb. Which is
  more fun to browse, and which is calmer?
- Tap a board at the side: it slides to the middle. Tap the turned board, or Open This Board, to open it.
- Can you still compare rockers and lengths at a glance? All boards share one scale and one floor.
- Whether the words up each board are readable at phone size: 11 dots, reading tail to nose.
- Shop rack versus Drawing: which feels like Shaper Assistant?
- Boards = 30: the page stays the same height; only the rack gets longer.

## Notes
- **Every number is the app's own.** The 30 boards (a 15-board quiver, then a pro shaper's customer
  boards) were run through the app's calculators (`summarizeDesign`, `buildBoardProfile`,
  `buildOutline`, `formatSummaryLine`) from a scratch script. Each was placed in the nearest catalogue
  blank that fits, as the app does for a preset, so the rockers, outlines and litres are real. The
  board named "Untitled Board" is the Shortboard preset, 29.6 L, as on the live site.
- **The turn is real.** Each station's cross-section, taken as an ellipse of the board's half-width by
  half its thickness, is turned about the board's long axis and projected: `x = t·cosθ − w·sinθ`. At 0°
  that is exactly the side profile (rocker up to deck) and at 90° exactly the outline, so a board
  turns the way that board would. The swallow's notch appears as the turn completes, and the stringer
  slides from the rail edge to the centre as it turns.
- **Measured on the sketched iPhone 14 page (390 × 664), 15 boards.** Today shows 1 board on the
  first screen, and you scroll about 6,600 dots to reach Shape a New Board. With the rack, Shape a New
  Board stays on the first screen, 5 boards show at the start of the rack and 9 fit across mid-rack.
  The rack draws the tallest board 357 dots tall, about 3.2 dots per inch.

## If it gets built
- The turn maths is a pure function of the board's side profile and outline. It belongs in
  `lib/geometry/` with tests (Rule 1), beside `screen-tiles.ts`, which already draws a board's side
  profile and outline from the design store's values.
- Nothing here needs CSS 3D or scroll-driven animations: one SVG path per board, redrawn from plain
  scroll events and `requestAnimationFrame`. So it works on the older Safari in the founder's iPad and
  in shapers' older iPhones. Scroll snapping is supported there.
- Swipe on phones and iPads, hover on computers: that choice reads the **pointer**. Today the pointer
  switch only decides how big controls draw and whether the Rotate button shows, so using it to choose
  how the rack behaves is a new job for it, and the founder's call.
- Honour reduced motion: the board swaps to its outline without turning.

## Outcome (2026-10-05)
**Winner: B, Turns as it passes.** On a phone or iPad, Your Boards becomes a sideways rack you swipe.
Every board turns as it crosses the middle, following your thumb, and the rack settles with one board
fully turned, its name, dims, Open and ⋯ underneath. Snapping first and then turning (A) and the
held-up big board (C) were not chosen.

**Still open:** the look. The founder picked B without choosing between Drawing and Shop rack, so the
look is decided in sketch 010, where the two looks are its variants.

## Renamed (2026-10-05)
The founder, while sketch 010 was being built: "rename it Board Rack rather than Your Boards". The rack
variants now say **Board Rack**; the Today tab keeps the live site's "Your Boards". The founder also asked
that **the shaper can reorder the rack**. On a phone a sideways drag already swipes it, so moving boards
there needs its own gesture. That's a follow-up sketch, since 010 covers dragging on a computer.

## Source
`sketch-source.tar.gz` holds the scratch files that made `index.html`: the page template, the script
that ran the app's calculators over the quiver (run from the repo root with
`npx --no-install tsx --tsconfig ./tsconfig.json quiver-data.ts quiver.json`), and the step that put
the numbers into the page. They are archived, not loose, because a stray `.ts` file under `.planning/`
would be read by the type check and lint.
