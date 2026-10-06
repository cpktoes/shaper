---
sketch: 010
name: sideways-board-rack
question: "On a computer, what does the Board Rack look like, and how does a board turn and move under the cursor?"
winner: "A"
tags: [desktop, home, board-rack, interaction, motion, reorder]
---

# Sketch 010: The Board Rack, on a computer

## Design Question
The same idea as sketch 009, on a computer, where the cursor picks the board. Two things are decided
here. One is the look: the founder asked to see both the app's clean drawings and a real shop rack, and
009's pick (B) left the look open. The other is how the turn follows the cursor. 009's winner on a
phone was "each board turns as it passes the middle, following your thumb".

While this sketch was being built the founder added two requirements (2026-10-05):

- The section is called **Board Rack**: "rename it Board Rack rather than Your Boards". The rack
  variants say Board Rack, here and in 009. Today's tab keeps the live site's "Your Boards".
- **"The user must be able to reorder the board rack."** On a computer, you drag a board along the rack
  (below). On a phone a sideways drag already swipes the rack, so reordering there needs its own gesture.
  That's a follow-up sketch.

## How to View
open .planning/sketches/010-sideways-board-rack/index.html

In a browser window at least 1,100 dots wide, the page is the app at your window's real size. Narrower
than that, it draws a 1280 × 800 window scaled to fit. Sketch tools → Window picks 1440 × 900,
1280 × 800 or 1024 × 768.

## Variants
- **Today (for comparison)**: today's Your Boards, four cards to a row.
- **A: Drawing rack ★ (the founder's pick)**: the app's drafting style. Boards in the board fill with an ink edge, faint dashed
  height lines every foot (every 50 cm in Metric), a floor line. The rack **opens** around the turning
  board, its neighbours sliding aside.
- **B: Shop rack**: white foam boards standing on a padded floor rail against a wall, a faint back rail,
  soft shadows. The turning board **lifts out in front**, scaled up a touch, with a wood stringer. The
  rack itself never moves.

Switches in the sketch bar: **Turn** (Follows the cursor / The board you're on), **Boards** (1 / 4 / 15
/ 30) and **Units**. Sketch tools: theme, window size, slow motion, which way the words read, height
lines on or off.

- **Follows the cursor ★ (the founder's pick)** is 009's winner brought to a computer. Boards turn as the cursor passes (two
  half-turned when it sits between them), and when the cursor stops the nearest board finishes turning.
- **The board you're on** is the founder's original wording: only the board under the cursor turns, at
  its own pace. It stays turned while the cursor is anywhere over its outline, so the next board doesn't
  flip as you move across a wide board.

Either way the last board the cursor touched stays turned when the cursor leaves. Its name, dims,
last-touched date, Open This Board and ⋯ (Move left, Move right, Rename, Duplicate, Delete) sit under
it, so you can move straight down to them.

## Moving boards
- Press a board and drag it. It lifts out, edge-on and outlined in the accent colour (Drawing) or
  shadowed (Shop rack). The other boards slide over to make room, a blue mark shows the gap it will land
  in, and letting go drops it. With 30 boards it can be carried into the other row.
- A click without dragging (under 6 dots of movement) still opens the board.
- **⋯ → Move left / Move right** moves a board without dragging. On the keyboard, the arrows walk along
  the rack and **Alt + arrow** moves the turned board.
- **The unsaved board stays first** until it's saved, because it has no stored place yet; nothing can go
  in front of it. This is an assumption for the founder to confirm.

## What to Look For
- Sweep the cursor slowly along the rack, then quickly. Fun, or too busy? Switch Turn to "The board
  you're on" for the calmer version.
- Stop on a board and move down to Open This Board or ⋯. The board stays turned.
- Drag a board to a new place, and into the other row with 30 boards.
- Drawing or Shop rack: which feels like Shaper Assistant? (The look is still open from 009.)
- Compare with Today: how much of the quiver is on screen, and how far down Shape a New Board sits.

## Measured
In a 1440 × 900 browser with the sketch bar showing, 15 boards:

| | Today | Board Rack |
|---|---|---|
| Boards on screen | 4 of 15 | 15 of 15 |
| Shape a New Board | about 1,585 dots further down | about 120 dots down; its heading peeks in at the bottom |

One row of 15 draws the tallest board 380 dots tall, about 3.4 dots per inch. Thirty boards make two
rows at 290 dots (about 2.6 dots per inch), both at one scale, with 15 on screen before scrolling.
Every rocker, outline and litres figure comes from the app's own calculators, each board in the nearest
blank that fits (see 009's Notes and `sketch-source.tar.gz`).

## If it gets built
- **A stored order.** Today the rack sorts itself: the unsaved board first, then the most recently
  touched (`lib/models/rack-order.ts`). A shaper's own order has to be stored, either as a position on each
  saved board (a new nullable column, so the migration goes to production before the code ships, per
  the Database rule) or as an ordered list on the account. Open questions: does a newly saved board go
  first? Does a duplicate land next to its original? Does the order follow the shaper to every device?
  (It would, if it's stored on the account.)
- Hover on a computer and swipe on a phone or iPad means the **pointer** picks the behaviour. That's a
  new job for the pointer switch (see 009).
- The turn maths belongs in `lib/geometry/`, pure and tested (Rule 1). It needs no CSS 3D and works on
  older Safari.
- Honour reduced motion: a board swaps to its outline, and a dragged board drops, without the animation.
- Pictures of each state are in `pictures/`.

## Outcome (2026-10-05)
**Winner: A, Drawing rack, with the turn following the cursor.** On a computer the Board Rack is drawn
in the app's drafting style. Boards stand on one floor line at one scale, faint dashed height lines run
every foot, and the name and dims run up beside each board. Boards turn as the cursor passes, and the
rack opens around the turning board; when the cursor stops, the nearest board finishes turning, with its
name, dims, Open and ⋯ under it. The shop-rack look (B) and the calmer "board you're on" turn were not
chosen.

This also answers the look 009 left open: **the phone's rack is drawn in this Drawing style too.**

**Confirmed later the same day (in sketch 011):** the unsaved board stays first until it's saved. Moving
boards on a phone is sketch 011's hold and drag.

## Source
`sketch-source.tar.gz` holds the scratch files behind `index.html` and `pictures/`: the page template,
its rack engine, the calculator script and the build step (shared with 009), and the headless-browser
scripts that tested the hover, the drags (including from one row to the other) and took the pictures.
