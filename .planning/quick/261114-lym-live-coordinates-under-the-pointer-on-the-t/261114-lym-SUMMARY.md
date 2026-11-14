---
quick_id: 261114-lym
title: Live coordinates under the pointer on the TEMPLATE and ROCKER curves
date: 2026-11-14
status: complete
commits: [39067740]
---

# Live coordinates under the pointer — summary

## What changed, in plain words

Move a mouse or trackpad over the board on TEMPLATE and a small card reads the station up from the tail and the board's
width there, with a dot on the rail nearest the pointer; on ROCKER the card reads the station, the rocker and the
thickness, with a dot on the bottom and one on the deck and a faint station line between. The numbers come off the very
curves the viewers draw, in the shaper's own system. A finger gets nothing (the founder's pick); thumbnails and printed
pages never show it; nothing about the saved board changes.

## How

- TEMPLATE: the hover point through the drawing's own pointer-to-board map, to the millimetre; the touch drag's card
  builder now serves both, and for the hover card it also keeps clear of the three station read-outs and the input chips.
- ROCKER: the station from the turned group's matrix, to a sixteenth; the card above the deck and above the thickness
  cards (`deckRailY`); the VIEWER's own grammar only.

## Proof

- `e2e/pointer-readout.spec.ts`: on a computer both pages read, follow the pointer along the board and clear off the
  drawing; on both phones a tap draws nothing. `tsc` and lint clean. Pictures in `pictures/`.

## Limits

The TEMPLATE card's width is counted from its letters; the ROCKER card's too. On ROCKER the read-out answers at any
height over the drawing for the station under the pointer, not only on the profile itself — a station is a station.
