---
sketch: 007
name: phone-screens-in-menu
question: "With no tab bar at the bottom, how does an upright phone show which screen you're on and take you to another?"
winner: "C"
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
- **C: Screen tiles** — ☰ opens a sheet with the six screens as big picture tiles, the rest beneath.

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
