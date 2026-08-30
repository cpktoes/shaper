---
created: 2026-08-30
title: Extract a shared SliderRow component and migrate all five control sidebars
area: ui
severity: minor
files:
  - components/outline/outline-controls.tsx
  - components/rocker/rocker-controls.tsx
  - components/rails/rail-controls.tsx
  - components/fins/fin-controls.tsx
  - components/volume/volume-controls.tsx
source: quick task 260830-122 (paired the rocker sidebar's angle/smoothness and flatness sliders)
resolves_phase:
---

# Extract a shared SliderRow component across control sidebars

Right now every control sidebar hand-rolls the same slider markup — a label line, a `Slider`, and
sometimes hints or a note underneath — copied wholesale into each of the five design screens'
sidebar files. `outline-controls.tsx` already has its own private `SliderRow` helper for the
TEMPLATE sidebar; the other four (`rocker-controls.tsx`, `rail-controls.tsx`, `fin-controls.tsx`,
`volume-controls.tsx`) each write the same markup out by hand, slider by slider.

Quick task 260830-122 paired six of the ROCKER sidebar's sliders onto three shared lines, the same
two-per-line layout `outline-controls.tsx`'s `SliderRow` already gives the TEMPLATE sidebar — and
deliberately did **not** extract a shared component to do it, duplicating two CSS utility classes
instead. Two reasons that call still holds, restated here so the trigger below is legible on its
own:

1. **Extracting for two files is a half-migration.** `rail-controls.tsx`, `fin-controls.tsx` and
   `volume-controls.tsx` would still hand-roll the same markup, leaving three stragglers and a
   component that is "the shared one" only sometimes.
2. **It would touch the TEMPLATE screen for no visible gain.** `outline-controls.tsx`'s `SliderRow`
   already carries disabled/hint/note behaviour and a clamped-depth warning that a two-line rocker
   task had no reason to re-verify.

**The trigger:** the moment a third sidebar wants its own sliders paired two-to-a-line, extract the
shared component once and migrate all five control files together in the same pass, rather than
letting a second one-off duplication happen.

**What the extraction has to preserve:** every sidebar's sliders convert their committed number
differently on commit — some go through an inches/millimetres conversion, some carry a branded
units type, some are plain percentages. A shared wrapper has to keep each slider's own conversion
visible at its call site (as `outline-controls.tsx`'s `SliderRow` already does via its
`onValueChange` prop), not hide it behind one generic numeric callback.
