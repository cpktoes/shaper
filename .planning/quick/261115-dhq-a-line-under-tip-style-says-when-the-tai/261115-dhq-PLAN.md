---
quick_id: 261115-dhq
title: A line under Pin tips to says when a tip would sit below the board's center, and suggests Bottom
date: 2026-11-15
source: to-do 2026-10-02-decide-what-happens-when-a-thin-boards-tip-sits-below-its-center.md (Phase 14's review, WR-02 part 2); the founder's pick of 2026-11-14: Steer it
planned_by: the orchestrator inline (no planner or executor spawned)
---

# A tip below the board's own centre: steer it

## Goal

Under Pin tips to Deck a thin board in a thick blank can drop a tip below the board's own centre, and the rocker reads
negative there. The founder's pick: the blank keeps fitting, and a line under the Deck / Bottom pair says so and
suggests Bottom. Built with a named geometry test on the catalogue and shown on the fixture's kind of board.

## Tasks

1. The rule and its words, pure and tested: `lib/geometry/tip-below-center.ts` reads the side profile every screen reads
   (`stationRocker`, levelled); an end is below the centre when its tip or its 12" station reads under the centre's
   rocker by more than float noise, reported as the deeper drop. The line names the end(s) and the amount through
   `formatMark`, leaves out a drop the readings would print as nothing, and ends with the suggestion.
2. The named catalogue test: the default 6'0" board on every seeded blank through the fit's own judge — with the default
   tips nothing drops at any thin centre under either cut; a 1" centre with a 1" tail tip drops the tail on real blanks
   (the Millennium 6'11"F and the Marko 6'0" M-Thick among them), never the nose, and never under Bottom.
3. ROCKER's Foil section: the line under the Pin tips to row, in the too-close line's ink, only under Deck, greyed with
   the rest on a locked board.
4. Prove it in the browser: `e2e/tip-below-center.spec.ts` on a computer and both phones — thin the default board to 1"
   with a 1" tail tip, pick the Millennium 6'11"F, read the line, see it go under Bottom and come back under Deck;
   pictures.
