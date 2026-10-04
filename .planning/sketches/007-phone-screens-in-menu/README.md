---
sketch: 007
name: phone-screens-in-menu
question: "With no tab bar at the bottom, how does an upright phone show which screen you're on and take you to another?"
winner: "C1"
tags: [phone, layout, navigation, chrome, menu]
---

# Sketch 007: Screens in the ☰ menu

## Design Question
The founder's idea (2026-10-03): put the six-screen tab bar "under the hamburger menu" on an upright
phone. The tab bar costs 56 dots of a 664-dot iPhone page (plus about 34 more for a home-screen app),
and a phone held sideways already works this way — its ☰ menu lists the six screens first. With the
bar gone, how does a shaper still see where they are and get to another screen?

## How to View
open .planning/sketches/007-phone-screens-in-menu/index.html

## Variants
- **Today (for comparison)** — the bottom tab bar, one tap to any screen.
- **A: Straight move** — the bar goes; ☰ lists the six screens first, ticked on the current one
  (the sideways phone's menu today). Least work: the screens group stops hiding below the shell width.
- **B: Screen name in the top bar** — on design screens the wordmark gives way to "ROCKER ▾"; tapping
  it opens the six screens. ☰ keeps Home, Contact, Privacy, Units, Theme and the account.
- **C: Screen tiles** — ☰ opens a sheet with the six screens as big picture tiles, the rest beneath
  (round 1, rough pictures — the founder's pick).
- **C1: Tiles from your board** (round 2) — each tile is that screen's own drawing of the current board,
  labels left out: its outline lying down, its side profile in its blank, its center rail's band diagram,
  its real litres, its tail and fins, a small order form. A Board switch (sketch tools) shows the tiles
  following Shortboard, Fish, Mid-length and Longboard.
- **C2: Fixed drawings** (round 2) — the same realistic drawings whatever the board (the Shortboard's),
  with no numbers anywhere: the Volume tile is a jug and the word "Litres".

## What to Look For
- Controls you can see without scrolling: 122 dots today against 178 with the bar gone (+56, +46%)
  on an iPhone 14's Safari page; the toolbar can give the space to the drawing instead.
- Whether you can still tell which screen you're on at a glance (A relies on the screen's own
  heading in the controls; B names it in the top bar; C shows it only when the sheet is open).
- One tap to change screens today against two in every variant — sketch 008's Next button is the
  answer for the usual walk through the screens.
- The Undo/Redo pair drops from 12 dots above the tab bar to 16 dots from the bottom edge.

## Notes
- The phone mock-up's page is the measured Playwright profiles: iPhone 14 390 × 664, small Android
  360 × 640, Pixel 7 412 × 839. The drawing is pinned at 66% of the page height (the app's default
  `phonePinned`), so with the bar gone the controls get the 56 dots unless the drawing's cap changes.
- Built from one shared engine with sketch 008 (each index.html is self-contained; the two app
  palettes are built into the page so it also works when opened as a snapshot).

## Outcome (2026-10-03)
**Winner: C — Screen tiles.** The founder: "ooh, I kinda like the screen tiles." On an upright phone the
bottom tab bar goes, and ☰ opens a sheet with the six screens as picture tiles, the current one
ticked, and Home, Contact, Privacy, Units, Theme and the account underneath. Paired with sketch 008's
Back + Next for the usual walk through a board; see 008's "Together" tab for the two on one phone.

## Round 2 (2026-10-03)
The founder: "The tile idea is great, but the icons need to look realistic (rocker cannot look like a U).
Can we use current board as the art? If we can't use current board art, we'll need to design something and
make it clear that the liters are not real, etc. (like just say Liters)."

Yes — every screen already draws from the board's own numbers, so each tile can be a small, label-free
copy of its screen's drawing. For the sketch the drawings were lifted off the real screens on the dev server
(each preset opened, then the outline, the side profile and its blank, the three rail plots, the Volume
screen's Estimated Volume and the fins drawing read out of the page), so C1's pictures ARE the app's.
The app spells the word "Litres", so C2 does too. Pictures of each sheet are in `pictures/`.

**Round 2 winner: C1 — Tiles from your board** (the founder, 2026-10-03). The phone's ☰ sheet draws each
tile from the current board: label-free copies of the Template outline, the Rocker side profile in its
blank, the center rail's band diagram, the Volume screen's real estimate, the Fins tail and fins, and a
small order form. Built for real, the thumbnails come straight from the design store's own data (outline
geometry, side profile, rail bands, volume, fin placement) — nothing is captured or stored.
