---
quick_id: 261114-l6s
title: The BOTTOM CONTOURS tables' notes print on the next sheet when they do not fit under the tables
date: 2026-11-14
status: complete
commits: [ed5ae546]
---

# The tables' notes onto the next sheet — summary

## What changed, in plain words

When a long board's BOTTOM CONTOURS tables take a sheet of their own and DATA's three notes on reading them do not fit
underneath — not even with the rows set tight, as 17-23 did for the 9'0" Longboard — the notes now print whole on the
sheet after the tables, headed "Bottom Contours · Reading the Tables", instead of two of them dropping. That is a 9'7" to
10'0" board with channels, and now also an 11'6" board, which printed no note before. Every board up to 9'6" prints
exactly as it did. The SUMMARY's on-screen sentence counts the extra page ("three Bottom Contours pages").

## How

- `bottom-sheet-fit.ts`: a third rung after today's rows and the tight rows — `notesOnOwnSheet` carries every note; the
  tables keep today's rows unless they need the tight ones alone; `sheets` counts the sheet; `bottomSheetSpare` reports
  its room.
- `bottom-contours-sheet.tsx`: `BottomTablesSheet part="notes"` draws the notes alone; `order-form.tsx` prints it as page 5.

## Proof

- `bottom-sheet-fit.test.ts` (new sweep: the Longboard at every inch from 9'0" to 10'0" on the 96 setups in both systems,
  2,496 layouts) and the order-form tests — 337 green; `tsc` and lint clean. The 11'6" boundary test now expects its
  notes on the sheet after the tables.
- On the dev server, a 9'8" Longboard with 6 channels: six sheets, the fifth the three notes (`pictures/`).
- The SUMMARY browser specs are owed at the next push gate (their fitted boards are 9'0" and 12'0", which do not take
  the new sheet).
