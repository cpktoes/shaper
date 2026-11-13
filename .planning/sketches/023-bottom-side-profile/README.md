---
sketch: 023
name: bottom-side-profile
question: "Where does the side profile — the deck, the bottom at the stringer and the bottom at the rail before the rails are shaped, Height ×1/×2/×4/×8 opening at ×4 — sit on the BOTTOM page: a third drawing in VIEWER (A), its own SIDE VIEW tab (B), or swapped with the bottom view by a FROM BELOW / FROM THE SIDE toggle (C)?"
winner: "A, re-ordered: bottom view, cross-section, side view; side view opens at x1"
builds_on: 021
tags: [bottom, side-profile, rocker, contours, viewer, tabs, toolbar, phone, units, themes]
---

# Sketch 023: The side profile on the BOTTOM page

## The ask (the founder, 2026-11-12)
*"…there should be two overlaid side profiles: 1) what the profile looks like along the stringer, and 2) what the
profile looks like at the rail (assuming a rectangular blank cross section — before rails have been shaped). This could
mean that for a Vee bottom, the rail will be higher than a stringer, and in a concave the stringer higher than the rail.
In fact, this is so important that I think I'd like to add this side profile view to the bottom page so you can see how
contours affect the overall flow of the rocker along the stringer."* And the same hour: sketch the placement first; the
side profile stretches with **Height ×1 / ×2 / ×4 / ×8, opening at ×4**, the same buttons as the section.

The Board file preview on the 3D page already draws the two lines. This sketch puts them on BOTTOM, in that preview's
look and words, and asks only where they go.

## How to View
open .planning/sketches/023-bottom-side-profile/index.html

The bar picks the variant (A, B, C), the board, the theme, Imperial / Metric and Auto / Phone frame. **Shortboard** opens
with 021's Deep Single Concave in CENTER; **Shortboard, Rolled Vee** is the same board with a Rolled Vee in TAIL and a
flat center. Change any cut, depth or station in the sidebar and the side view redraws with the bottom view and the
section. Tap or drag along the side view and the section moves there, as it does on the bottom view. `?variant=B`,
`?board=shortboard-vee` and `?bare=1` (the bar hidden) open the sketch that way; the pictures use `bare=1` so every
picture is the page at the app's own size.

## What every variant draws
- **The deck**, one line: the planed rocker plus the planed thickness (the blank is square across before the rails).
- **The bottom at the stringer**, the board's ink edge: the planed rocker raised by what the cuts take off at the
  stringer.
- **The bottom at the rail, before the rails are shaped**, dashed in the muted ink (the preview's own line, 1.5 wide,
  dash 3 2), drawn only where it parts from the stringer's line: below it under a concave, above it under a vee or a
  belly. Channels never touch either line (they are cut after the rails, the founder's ruling of 2026-11-10).
- **No planed-bottom line.** Wherever only a concave is cut, the rail's line *is* the planed bottom; wherever only a vee
  or belly is cut, the stringer's line is. A third line would lie on top of one of the two almost everywhere; it would
  only part from both where a concave and a vee overlap (a Spiral Vee, a center single running into a tail vee).
- The wide point and the fins as faint station lines, the section's **dash-dot cutting line** with its grab point, and
  under the drawing the key (*at the stringer* · *at the rail, before the rails are shaped*; on a flat bottom the one
  entry *at the stringer and at the rail — the same line on this bottom*) and one facts line:
  *2 1/8" at the stringer · 2 1/4" side profile max* (Metric: *5.5 cm at the stringer · 5.7 cm side profile max*).
- The caption reads **SIDE VIEW · HEIGHT ×4** with ×1 ×2 ×4 ×8 beside it. If a Height would push the board out of its
  box it is fitted instead and the caption says what it really is (*HEIGHT ×2.6*), the section's own rule.

## Variants
- **A — a third drawing in VIEWER.** Bottom view on top, side view in the middle, section under it. The side view uses
  the bottom view's length scale, so the cutting line runs straight down through both (measured: the two lines stand at
  the same dot). The bottom view keeps its rails of names and marks; the side view carries none, and the one grab point
  moves under the side view. On a 1280 × 800 computer the three fit at ×4, but the bottom view is drawn smaller than in
  021 (about 60% of the panel's width) because it now shares the height.
- **B — its own SIDE VIEW tab**, VIEWER · SIDE VIEW · DATA · GUIDE. VIEWER is 021's. SIDE VIEW draws the side profile in
  70% of the tab with its own rails (wide point and fins above, the live cut's Start, Deepest and End below) and a
  **small section under it** rather than an inset or none — an inset would sit on the drawing, and with no section,
  moving the cutting line along the side would show nothing. Below the 820 line the tab reads **SIDE** (as ROCKER's TOP
  VIEW reads TOP), its full name kept for screen readers; that leaves the strip 112 dots after GUIDE on a 390 phone, so
  *Shortboard* stays (spelled out, SIDE VIEW leaves 76 — still drawn at 390, gone on a 360 phone).
- **C — swap.** A **FROM BELOW / FROM THE SIDE** pair in the viewer toolbar's dress (bordered, the pressed one filled
  with the accent) sits at the right of the drawing's caption on a computer, and at the end of the NOSE · CENTER · TAIL
  row on a phone (**BELOW / SIDE** there, full names for screen readers). The section stays beneath either one. The side
  view's box is as tall as its drawing needs at the Height picked (at most 60%), and the section takes the rest.

## The numbers, cross-checked against the app
The sketch works the side profile with its own maths — 021's cuts, now with the app's two rules from the Phase 17 walk
(a concave is held to leave 1/4" under the deck, a vee or belly never is; channels are left off the rail's line) and
D-42 (a center single ahead of a tail vee runs out at the fins) — over the board figures read from the app's own maths
(`board-data.ts`: the four presets as the app opens them, every 1/720 of the length, now with the planed rocker). It
was compared with the app's own `sideProfileLines` every 1" from the tail to the nose (76 stations):

| Board | Worst gap | Stringer line | Rail line | Deck | Thicknesses (app = sketch) |
|---|---|---|---|---|---|
| 6'2" Shortboard, Deep Single Concave in CENTER | **0.009 mm** (deck, 7" from the tail) | 0.005 mm | 0.005 mm | 0.009 mm | 2 1/8" at the stringer · 2 1/4" max |
| 6'2" Shortboard, Rolled Vee in TAIL | **0.009 mm** (deck, 7" from the tail) | 0.005 mm | 0.005 mm | 0.009 mm | 2 1/4" at the stringer · 2 1/4" max |

Far under the half millimetre asked; the gaps are only the sketch reading the rocker and thickness between its sampled
stations. No app numbers had to be embedded.

## On a phone (390 × 844, the sketch bar hidden)
BOTTOM pins its drawing at 66% of the screen, and none of the three variants changes that: the top bar is 48 dots, the
pinned drawing 557, and **the controls keep 239 dots in every variant**. What changes is how the 557 is shared:

| Variant | Bottom view | Side view | Section |
|---|---|---|---|
| A (all three) | 160 | 124 | 106 |
| B, SIDE tab | — | 319 | 74 |
| C, FROM THE SIDE | — | 164 | 229 |

(Heights of the drawings themselves, in dots; B's VIEWER tab and C's FROM BELOW are 021's split.) The board's length
sets the side view's scale, so on an upright phone a 6'2" at ×4 is under a hundred dots tall in any variant.

## What to Look For
- **Which place.** A shows everything at once and keeps the stations lined up, at the cost of three small drawings on a
  phone (the section drops to 106 dots). B leaves VIEWER untouched and gives the side room for ×8. C costs one tap and
  keeps the phone's drawings big.
- **B at ×4 is mostly air** on its own tab (`phone-B-deep-single.png`); at ×8 it fills it (`phone-B-height-x8.png`).
  Should SIDE VIEW open at ×8, or keep ×4 like the section?
- **A on a phone:** keep the 66% pin and three small drawings, or give the drawings more of the screen and the controls
  less?
- Whether a planed-bottom line is wanted after all (see above for why it is left out).
- The words: the key and the facts line are the Board file preview's, unchanged.

## Pictures
`pictures/` — computer 1280 × 800 and upright phone 390 × 844, all on the page alone (no sketch bar):
`desktop-A-deep-single`, `desktop-B-deep-single` (SIDE VIEW tab), `desktop-B-viewer-tab`, `desktop-C-deep-single` (FROM
THE SIDE), `desktop-C-from-below`, `desktop-A-rolled-vee`, `desktop-A-slate` (dark), `desktop-A-metric`,
`phone-A-deep-single`, `phone-B-deep-single`, `phone-B-height-x8`, `phone-C-deep-single`, `phone-A-rolled-vee`.

## Checked
Headless Chromium at 1280 × 800 and 390 × 844 (touch): no page errors across the three variants, five boards, both unit
systems and every tab; the side view redraws when a slider moves; dragging along the side view to 12" moves the section
to 12" (*Section · 12" from the tail*); in A the two cutting lines stand at the same dot; picking a Rolled Vee in TAIL
lifts the rail 6 mm above the stringer 6" from the tail; the page never scrolls sideways on the phone.

Also changed from 021: the finished-rail ghost and its box are gone (not this sketch's question), the winged Fish is gone
from the bar, and the INPUTS card's thickness reads as a dim in Metric (*5.7 cm*, not *57 mm*) with the three figures
sized to fit.

## Source
`sketch-source.tar.gz` holds `board-data.ts` (the app's figures and its `sideProfileLines` for the two boards, run with
`npx tsx` from the worktree), `boards.json`, `app-side-profiles.json`, the page template, `build.py`, the edit script,
`check.cjs` (the cross-check, the sweep, the live checks and the phone measurements) with its `check-results.json`,
`shots.cjs` (the pictures) and `probe.cjs`.

## Decision (the founder, 2026-11-12)
*"I like A, but lets put the side view at the bottom: Bottom, crossection, side, with sides default scaling to 1x to
minimize distortion of the rocker and use up the least amount of space."* So: **A**, with the drawings in the order
**board from below, cross-section, side view**, and the side view opening at **Height ×1** (true proportions, the least
height); the ×2/×4/×8 buttons stay for a closer look. The board from below and the side view still share one length
scale, so the station line runs through both. B and C are kept in the file for the record.
