---
quick_id: 261114-l2p
title: RAILS' thin bottom line carries on under the tuck band on a rail with channels
date: 2026-11-14
status: complete
commits: [c72bcfe4]
---

# RAILS' thin bottom line carries on under the tuck band — summary

## What changed, in plain words

On a soft, rolled rail with channels, RAILS' thin bottom line used to stop at the last bottom mark, up on the channel's
floor, while the tuck band below it started from the planed bottom — so the two did not meet (about 1/16" to 1/8" apart
on the stock Longboard's tail). The founder ruled "Carry the line under the tuck": the bottom line now runs on outboard,
following the channels' floors and walls, until it meets the band, and ends exactly there. Nothing else moves: a board
without channels, a section whose channels never reach the last mark, and every Hard Edge tail draw as before. The
printed Rail Band Reference draws the same plot, so paper follows.

## How

- `railBottomLineToBand` in `lib/geometry/rail-bottom.ts`: `railBottomLine`, then, where the drawn bottom at the last
  mark stands above the band's foot, the drawn bottom's own points on to the crossing with the band's straight line.
- `rail-section-plot.tsx` finds the band rising from the last bottom mark (Tuck 1 on a single tuck, Tuck 2 otherwise)
  and draws the bottom connector through the helper.

## Proof

- `rail-bottom.test.ts` (77 tests): the Longboard's gap that was (over 0.03"), the carried line's end on the band
  within 1e-9, every carried point on the drawn bottom above the band; the no-channels and Hard Edge cases equal to the
  plain line; every preset's soft rail at 4, 6 and 8 channels ending on the band or plain. `tsc` and lint clean.
- Pictures in `pictures/`: the Longboard's tail at 2.5x on the dev server, 6 channels, Finished Rail off — before
  (the line ending in the air at the last mark) and after (meeting the Tuck 2 band).
- The RAILS browser specs are owed at the next push gate.
