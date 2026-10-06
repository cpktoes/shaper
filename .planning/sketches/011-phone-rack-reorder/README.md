---
sketch: 011
name: phone-rack-reorder
question: "On a phone, where a sideways drag already swipes the rack, how does a shaper move a board to a new place?"
winner: "A"
tags: [phone, home, board-rack, reorder, interaction]
---

# Sketch 011: Moving boards on a phone

## Design Question
The founder (2026-10-05): "the user must be able to reorder the board rack." On a computer you press a
board and drag it (sketch 010 A). On a phone the same sideways drag already swipes the rack (sketch 009
B, the founder's pick), so moving a board needs a gesture of its own. This sketch draws the Board Rack as
decided so far: the Drawing look (010 A), every board turning as it passes the middle (009 B), and the
heading "Board Rack".

## How to View
open .planning/sketches/011-phone-rack-reorder/index.html

In a phone-sized window, or on a real phone, the page becomes the phone; tap **Notes** for the switches.
With a mouse, press and hold to lift a board in A, and drag the rack to swipe it.

## Variants
- **A: Hold and drag ★ (the founder's pick)**: hold a board still for about half a second. It swells a little, then lifts and
  turns blue. Slide it along the rack and let go: the others slide over, a blue mark shows the gap, and the
  dropped board comes to the middle and turns. A quick swipe still moves the rack. Carry a board to within
  46 dots of the screen's edge and the rack scrolls along with you, so it can travel the whole rack. The
  heading says "hold to move". It's how an iPhone's home screen moves app icons.
- **B: Arrange button**: an Arrange button sits beside Board Rack. In arrange mode the boards stop
  turning and stand edge-on, each with a grip under it. Drag a grip to move its board; swipe above the
  grips to move the rack; tap Done.
- **C: Move buttons**: the middle board has ‹ Move › beside Open This Board. Each tap moves it one
  place, and the rack slides under it so it stays in the middle while its neighbour passes behind. The
  buttons grey out at the ends.

In all three the **unsaved board stays first and can't be moved**. Holding it, or reaching it with ‹,
says "The unsaved board stays first until it's saved". The founder confirmed this on 2026-10-05.

## What to Look For
- A: would a shaper find "hold" without being told? Does the hold get in the way of swiping?
- B: clear and hard to trigger by accident, but it adds a mode and a button.
- C: nothing to discover, the same for everyone, and the easiest for screen readers. Moving a board ten
  places is ten taps, though, and the buttons share a row with Open This Board.
- Try the far end: with 15 or 30 boards, take one from the start to the end.

## Tested
In headless Chromium with a mouse, at the iPhone 14 page size:

- **A:** a quick swipe moved the rack and lifted nothing. A half-second hold lifted the Egg, carrying it
  two places dropped it there, and it came to the middle with "Moved Egg. The rack keeps your order."
  Carried to the right edge, the rack scrolled from 80 to 471 dots and the Keel Twin dropped in last
  place. The unsaved board refused to lift.
- **B:** a grip drag moved the Step-Up two places, and Done turned the rack back on.
- **C:** two taps on ‹ moved the Log two places, and ‹ greys out behind the unsaved board.

On a real phone the hold depends on the browser not starting a scroll first. The page stops the scroll
only once a board has lifted (touch-move is cancelled from then on), and it switches off the long-press
menu and text selection on the rack. That needs checking on the founder's iPhone and Android.

## If it gets built
- The order is stored the same way as on a computer (see 010's "If it gets built"). Each device only
  needs its own way to move a board.
- A is the most work: the hold timer, cancelling the scroll once a board lifts, scrolling at the edges,
  and checks on old Safari. C is the least, since it reuses the order logic with two buttons. B sits
  between.
- Reduced motion: drop without the glide, and move with ‹ › without the slide.

## Outcome (2026-10-05)
**Winner: A, Hold and drag**, chosen after the founder tried the published copy on a phone. On a phone or
iPad you move a board in the Board Rack by holding it still until it lifts, then sliding it along and
letting go. A quick swipe still moves the rack, and near the screen's edge the rack scrolls with the board
you're carrying. The dropped board comes to the middle and turns. The heading carries "hold to move". The
Arrange button (B) and the Move buttons (C) were not chosen.

**Confirmed:** the unsaved board stays first and can't be moved until it's saved.

## Published copy
The founder tested this on a phone at https://claude.ai/artifact/V2g7Lw6wSvq5jfUABWfEaY (private to
the founder). It's the same page with three changes the viewer needs: no document skeleton of its own,
colours that follow the phone's light or dark setting, and room for the notch. `publish011.py` in
`sketch-source.tar.gz` makes that copy from `index.html`.

## Source
`sketch-source.tar.gz` holds the scratch files behind `index.html`, `pictures/` and the published copy:
the page template, the calculator script and build step (shared with 009 and 010), the headless-browser
scripts that tested holding, carrying to the edge, the grips and the buttons, and the publish step.
