---
quick_id: 261114-lym
title: Live coordinates under the pointer on the TEMPLATE and ROCKER curves
date: 2026-11-14
source: to-do 2026-09-14-live-pointer-coordinates-on-the-template-and-rocker-curves.md (the founder's request of 2026-09-14); his pick of 2026-11-14: hover only, nothing on touch
planned_by: the orchestrator inline (no planner or executor spawned)
---

# Live coordinates under the pointer

## Goal

A mouse or trackpad over the TEMPLATE curve reads the station up from the tail and the board's width there, with a dot
on the curve; over the ROCKER profile it reads the station, the rocker and the thickness, with a dot on the bottom and
one on the deck. A finger gets nothing. Every number is read off the curve the viewer draws (`sampleOutline`,
`profile.rockerAt`, `profile.thicknessAt`) and formatted through the shaper's system (the station and the width as dims,
the rocker and the thickness as marks). Nothing about the stored board changes.

## Tasks

1. TEMPLATE: the hover point from the drawing's own pointer-to-board map, a millimetre at a time; the read-out drawn by
   the card the touch drag already uses (one builder for both), placed clear of the board, the station read-outs and
   the input chips; a dot on the rail the pointer is nearer. Not on a coarse pointer, not while a drag is live, not
   where the callouts are hidden (thumbnails, prints).
2. ROCKER: the station from the turned group's own matrix, to a sixteenth; a card above the deck in the VIEWER's own
   grammar only (never the order form's), dots on the bottom and the deck, a faint station line between.
3. Prove it: `e2e/pointer-readout.spec.ts` on the computer (both pages, the read-out follows the pointer, gone off the
   drawing) and both phones (a tap draws nothing); pictures.
