---
quick_id: 261114-loa
title: TEMPLATE's station read-outs clear the toolbar on a phone held sideways
date: 2026-11-14
status: complete
commits: [5331652e]
---

# TEMPLATE's station read-outs clear the toolbar on a phone held sideways — summary

## What changed, in plain words

On a phone held sideways the Tail @ 12" reading used to sit under the toolbar's buttons. Now it slides toward the nose
until it stands clear of them, its tick still on the true station and its line bent to carry it across — the same look
a reading pushed aside by a neighbour already has. On a short board the slid reading would run into the Center reading,
so it pushes that one along too, keeping one gap between them; the Nose reading stays put. A computer, an upright phone
and every printed page are untouched.

## Proof

- Unit: 8 tests on the rule (`readout-clear.test.ts`); `tsc` and lint clean.
- Browser: `e2e/template-sideways-readings.spec.ts` — on the Pixel 7 and iPhone sideways no reading lies under the
  toolbar, the three stand in a row, the Nose one has no bent leader; on a 1280 × 800 window no reading has one. The
  desktop TEMPLATE baseline picture still matches; `template-toolbar.spec.ts` green on all three devices.
- Pictures: the Pixel 7 sideways before (quick 261018-e6w's) and after.

## Limits

The read-out's width is counted from its letters at the pinned sizes (0.62 em a value letter, 0.78 em a spaced name
letter), not measured — the gap of 10 dots covers the estimate. The rule acts at 1x only; a zoomed drawing is the
shaper's own framing.
