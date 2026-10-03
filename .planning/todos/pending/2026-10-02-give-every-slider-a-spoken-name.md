---
created: 2026-10-02
title: Give every slider in the app a spoken name and a spoken value
area: ui
priority: minor
source: Phase 14 code review, WR-01 (the wider gap; the two Thinning Starts sliders were named in the review's fix pass)
---

# Give every slider in the app a spoken name and a spoken value

## What

Every slider row in the app draws its label as plain text beside the slider, so a screen reader hears
"slider" and a raw number with no name and no unit (in Metric the number is millimetres while the label
reads centimetres or a fraction). The Phase 14 review named the two new Thinning Starts sliders, because
they are twins that differ only by nose or tail; every other slider is still unnamed.

`SliderRow` (`components/design/slider-row.tsx`) now takes `sliderLabel` and `sliderValueText`. Pass them
on every row: the label's own name (Board Length, Center Thickness, Placement, Deck Skin, the fine-tunes,
the rail and fin sliders, ...) and the value the way the label prints it, through the same formatters.

## Why not now

It touches every design screen's sidebar a few days before the showing and the freeze. The rows render
identically to the eye; only what a screen reader says changes.

## Done when

`getByRole("slider", { name: ... })` finds every slider by its label on all five design screens, each
slider's spoken value equals the value its label shows in both unit systems, and the server-render pin in
`components/design/slider-row.test.ts` is updated deliberately.
