---
quick_id: 261115-dv3
title: Every slider in the app speaks its name and its printed value
date: 2026-11-15
status: complete
commits: [1196fc59]
---

# Every slider speaks its name and its printed value — summary

## What changed, in plain words

A shaper using a screen reader now hears what every slider is and what it is set to, the way the row prints it:
`Center Thickness, 2 1/2"`, `Nose Angle, 55°`, `Placement, centered` — and in Metric `64 mm` or `182.9 cm`, never the
bare millimetres the slider runs on. Nothing moved or changed on screen for anyone else.

## How

- One rule instead of forty edits: the shared slider row (`components/design/slider-row.tsx`) now reads its spoken name
  and value back out of what it already prints — the label beside its value, the value in a box, or the name and value
  folded into one label after the house ` — ` separator (`components/design/slider-spoken.ts`, pure and tested). A row
  that already said something fuller on purpose (the Thinning Starts twins, the hand-set grid, the rail nudges named per
  rail, FINS' pairs, the 3D rack's raise rows) keeps its own words.
- The six sliders the shared row never held get their own: Board Length on TEMPLATE, FINS and VOLUME (the length as the
  row above prints it, `6'0"` or `182.9 cm`), FINS' Tail Width @ 12", RAILS' Family (`Medium`) and Ratio (`50/50`).
- `slider-row.test.ts`'s server-render pin updated deliberately, as the to-do asked: a row without the props now speaks
  its label line; a label-less row still says nothing; passing the props as undefined renders the same markup.

## Proof

- `components/design/slider-spoken.test.ts`: the rule on every label shape.
- `e2e/slider-spoken-names.spec.ts`, a computer and both phones, Imperial and Metric: every design screen walked (ROCKER
  with a blank picked and its Advanced fold open; VOLUME and FINS with Import Designed Board unticked so their own
  sliders exist; every closed Advanced fold opened), every slider on the page read, and each held to a name and a value
  that say at least what its row prints. Over forty sliders a walk; the Metric walk waits for a page to read in
  centimetres before it looks, since the chooser's pick is applied once React owns the page.
- `tsc` clean, lint unchanged (the one old warning), every component test green (581).

## Notes for next time

- The app keeps a figure and its unit together with a no-break space: a Playwright regex wants `\s`, not a space.
- A row whose label carries the value in brackets as well (`Apex Thickness — 5/8" (0")`) speaks the mark alone; the
  sweep accepts a spoken value and a printed one that contain each other either way.
