---
created: 2026-10-02
title: Decide what happens when a very thin board's tip sits below its own center
area: geometry
priority: minor
source: Phase 14 code review, WR-02 part 2; the founder's ruling at go-live 2 (2026-10-02) — leave it for the showing, decide the rule after the 10th
---

# Decide what happens when a very thin board's tip sits below its own center

## What

Since Phase 14's tips step a thin board in a thick blank fits (D-20): the thinning starts further in and
each tip stays as thick as its setting. Under Tip Style **Pin deck** that foam comes back on the bottom,
so the tip's bottom drops. On a very thin board in a very thick blank it drops below the board's own
center, and the rocker reads negative there:

- the default 6'0" board with a 1 1/4" center on the Arctic Foam 7'9" SBF (a 4 1/8"-thick blank): tail
  tip −3/16", tail @ 12" −3/16";
- with a 1" center: about −7/16" at the tail tip.

Measured on 2026-10-02 (`scratchpad/orch14/reverse-rocker.ts`, the app's own maths): on the 6'0" board
that is the only blank in the catalogue that does it, and only at centers of 1" and 1 1/4"; from 1 1/2"
up, none; none of the 1,635 stress boards (centers 2 1/4" to 3"). Under Tip Style Bottom it never
happens (the deck rises instead, and far fewer blanks fit).

The picture the founder decided from is
`.planning/phases/14-realistic-surfboard-flow/pictures/go-live-2/thin-board-drawing.png`.

## The decision to make

Whether a board whose tip would sit below its own center should be offered as fitting at all. Options
on the table:

1. **Refuse it** — a new reason in the blank list and the flag ("the tail would sit below the board's
   center"), judged where the board sits like every other reason.
2. **Leave it** — the numbers and the drawing say honestly what the cut gives; a shaper who asks for a
   1 1/4" board from a 4" blank sees it.
3. **Steer it** — keep it fitting but say so in a line under Tip Style (and suggest Bottom).

## Already done

Remove This Blank no longer leaves such a board drawn 0.2" off its own rocker numbers: a tip that sat
below the center lands on 0 when the board becomes hand-set (review fix `40cb76e`).

## Done when

The founder has picked one of the options (or another), and the pick is built with a named geometry test
on the catalogue and shown on the fixture above.
