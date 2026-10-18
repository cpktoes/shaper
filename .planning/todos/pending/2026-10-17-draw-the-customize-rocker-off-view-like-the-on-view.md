---
created: 2026-10-17T23:40:00.000Z
title: Draw the Customize Rocker popup's Show-my-board-off view like the on view
area: rocker
severity: minor
files:
  - components/rocker/custom-rocker-drawing.tsx (the card: RockerViewer when Show my board is on, CustomRockerBlankView when off)
  - components/rocker/custom-rocker-blank-view.tsx (today's blank-alone drawing — to retire)
  - lib/geometry/custom-rocker-art.ts (blankAloneLayout and its collision tests — to retire with it; the overlay functions stay)
  - components/rocker/rocker-viewer.tsx (the page's viewer: one board side profile, its frame clamped 60–120", its five rails the board's stations)
  - components/rocker/rocker-view-frame.ts (the frame rule to relax for blanks longer than 120")
  - e2e/rocker-custom.spec.ts (the `[data-blank-alone-reading]` checks)
---

## Problem

The founder, 2026-10-17, after custom rocker went live (quick 261016-mkb): "the edit custom rocker viewer
changes a ton with the show board on/off. I prefer the on view. Can we make the off view match it?" Then:
"lets come back to this. remind me later."

With Show my board on, the popup draws the page's own ROCKER viewer — the board in the bent blank, its five
station cards hugging the foam. With it off, a separate drawing shows the blank alone with its figures on
rails at the top and bottom edges and long leaders (plan 02's P-3 chose a sibling drawing because the viewer's
frame is built from the board's length, clamped to 60–120", and its rails are the board's stations). The two
states look like two different tools.

The heading over the drawing (fast task 171: BLANK DIMENSIONS / YOUR BOARD'S DIMENSIONS) is done.

## Solution

Draw the blank alone with the page's own viewer, so both states share one grammar:

- RockerViewer gains a "blank as the subject" mode: the foam drawn as the subject, the blank's five catalogue
  stations (nose tip, 12" in, centre, 12" in, tail tip — the same five the DATASHEET prints) as the cards, no
  board; the natural dashed line, bend marks and the red/blue spans from the same overlay function the on view
  uses (one spec in, one drawing out).
- The frame rule relaxes past 120" for the 36 pickable blanks longer than that (the longest is 151.5").
- The popup's off state swaps to it; `custom-rocker-blank-view.tsx` and `blankAloneLayout` (with its 219-blank
  collision tests) retire.
- The spec's blank-alone readings move to the viewer's cards; pictures on a computer, an upright phone and a
  sideways one.

**Question for the founder first:** the on view shows no natural sub-figure under a card, while today's off view
prints the natural rocker small beneath each changed figure (`NAT 4 3/4"`, their round-13 ruling). Keep that
small natural line under the rocker cards in the new off view, or drop it and let the dashed line carry the
natural?

A quick task with a brief (the 261016-mkb pattern), not a fast one: a viewer mode, a frame rule, a swap, tests
and pictures.
