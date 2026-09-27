---
created: 2026-09-27T07:30:00.000Z
title: Summary order form needs the tip thicknesses and the deck/bottom passes somewhere
area: summary
severity: minor
files:
  - components/summary/order-form.tsx
  - components/rocker/rocker-datasheet.tsx
  - lib/geometry/measure-display.ts
---

## Problem

Captured from the founder on 2026-09-27, right after Phase 12 shipped and the order form's Blank line
started naming the picked blank: "summary needs tip thickness and deck/bottom passes info somewhere."

Since Phase 12 the ROCKER screen and its DATASHEET carry everything a shaper cuts to — the Nose Tip and
Tail Tip thicknesses, the Deck Skin, and the FOAM OFF Deck and Bottom rows at the five stations with the
planer passes at the centre. The printed order form (the Shaper Reference sheet a shaper carries to the
blank) shows the outline, rocker and rail-band numbers and, since today, the blank's name and where the
board's centre sits on it — but not the two tip thicknesses, and nothing about how much comes off the deck
and off the bottom (as depth, and as planer passes at the shaper's Planer Max Depth). A shaper still has to
go back to the screen for those.

## Solution

To be planned as a quick task (or two):

- Decide where on the Shaper Reference sheet the numbers belong — probably a small block near the Blank
  line or beside the rocker table: Nose Tip and Tail Tip thicknesses; Deck Skin; the foam off the bottom at
  the centre as a depth and as passes ("3 passes at 1/8\" a pass"); possibly the FOAM OFF Deck / Bottom row
  at the five stations, matching the DATASHEET.
- Read every number through `lib/geometry/measure-display.ts` (marks in 1/16" or whole mm; passes are whole
  numbers) and reuse the DATASHEET's own derivations (`BlankSideView.foamOffDeck` / `foamOffBottom`,
  `planerPasses` / `formatPasses`) rather than a second formula (CLAUDE.md Rule 1 and Rule 2).
- With no blank picked, print only what applies (the tip thicknesses); the foam-off numbers need a blank.
- Keep the printed sheet within its page budget — check with the existing print tests
  (`order-form-print.test.ts`) and a headless print-to-PDF before and after.
