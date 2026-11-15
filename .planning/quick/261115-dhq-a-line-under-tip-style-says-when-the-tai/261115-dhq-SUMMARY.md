---
quick_id: 261115-dhq
title: A line under Pin tips to says when a tip would sit below the board's center, and suggests Bottom
date: 2026-11-15
status: complete
commits: [1df94397]
---

# A tip below the board's own centre: steer it — summary

## What changed, in plain words

On ROCKER, with a blank picked and the tips pinned to the Deck, a line now appears under the Deck / Bottom pair whenever
the board's tail (or nose) would end up sitting below the board's own centre — the thing that happens to a very thin
board with a thick tip in a thick blank, where the rocker numbers go negative. It says which end, by how much, and
suggests Bottom: "The tail would sit 1/4" below the board's center. Pin tips to Bottom to keep the rocker above it."
The blank keeps fitting, exactly as before; nothing is refused and nothing about the board changes. Under Bottom the line
is never shown, because there the deck rises instead and the drop never happens.

## What the catalogue says today

The to-do was written on 2026-10-02 from the default 6'0" board with a 1 1/4" centre on the Arctic Foam 7'9" SBF. That
case is gone: the founder corrected that blank's T12 rocker from 1 1/16" to 1 5/8" on 2026-10-14, and with the default
1/2" and 5/8" tips no fitting blank in the catalogue drops a tip below the centre at any centre from 1" to 2 1/2", under
either cut. A thick tip on a thin board still does it on dozens of blanks — a 1" centre with a 1" tail tip drops the tail
on 35 of them under Deck, the Millennium 6'11"F by a quarter inch — which is what the line is for. The named test holds
both facts on the seeded catalogue through the fit's own judge.

## How

- `lib/geometry/tip-below-center.ts`: `tipsBelowCenter` reads the side profile's five levelled rocker readings and reports
  each end's drop (the deeper of its tip and its 12" station) above float noise; `tipBelowCenterLine` writes the words
  through `formatMark`, leaving out a drop the readings beside it would print as nothing.
- `components/rocker/rocker-controls.tsx`: the line under the Pin tips to row, in the too-close line's warning ink, only
  under Deck, greyed with the rest on a locked board (`data-tip-below-center`).

## Proof

- `lib/geometry/tip-below-center.test.ts`: the rule and the words in both systems; the named catalogue sweeps above.
- `e2e/tip-below-center.spec.ts`, a computer and both phones: the default board thinned to 1" with a 1" tail tip, no line
  before a blank is picked, the line on the Millennium 6'11"F, gone under Bottom, back under Deck. Pictures in `pictures/`
  (the drawing reads −1/4" at the tail tip and −3/16" at 12", as the line says).
- `tsc` clean; the ROCKER and board-lock inventory tests green.
