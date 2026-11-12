---
created: 2026-11-11
title: A 9'7" to 10'0" board with channels should print every note on its BOTTOM CONTOURS tables sheet
area: print
severity: minor
files:
  - components/summary/bottom-sheet-fit.ts
  - components/summary/bottom-sheet-fit.test.ts
  - components/summary/bottom-contours-sheet.tsx
source: Phase 17 fix-wave code review (17-FIXWAVE-REVIEW.md, WR-02), 2026-11-11
resolves_phase:
---

# Long boards with channels should print every note on the tables sheet

## Problem

17-23 ("Make it fit") made the 9'0" Longboard's printed tables sheet print all three notes by setting the table rows
2 dots closer. That holds up to 9'6". From 9'7" to 10'0" with any channels the tight rows are still about 25 to 30 dots
short, and the two notes that drop include the one that explains the channel columns (1,296 of 1,296 layouts tried).
No row or figure is lost, and without channels every length prints all its notes. It printed one note of three before
17-23 too, so this is not a step back — but the new test reads only 9'0" boards and cannot see it.

The founder, 2026-11-11: "Close 17, log as follow-ups".

## What is needed

Room for the notes on the longest boards with channels (a second tightening step, a shorter channel note, or the notes
on the next sheet — the founder's call from a picture), and the fit test widened to every length up to 10'0".
