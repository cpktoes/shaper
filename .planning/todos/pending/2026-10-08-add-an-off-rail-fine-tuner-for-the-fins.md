---
created: 2026-10-08T21:22:47.083Z
title: Add an off-rail fine tuner for the fins
area: geometry
severity: minor
files:
  - components/fins/fin-controls.tsx:61 (OFF_RAIL_BOUNDS, 1" to 2" in 1/16" steps)
  - components/fins/fin-controls.tsx:526 (the forward fins' Aft/Forward position slider, "(off-rail unchanged)")
  - components/fins/fin-controls.tsx:645 (the quad rear Off-Rail slider, today's only off-rail control)
  - lib/geometry/fins.ts:76 (FinAdvancedSpec's forwardPositionOffset, the pattern to follow)
  - lib/geometry/fins.ts:620 (clampOffRail, which already holds off-rail between 1" and 2")
  - lib/geometry/fins.ts:653 (each template's own off-rail figure)
---

## Problem

The founder, 2026-10-08: "fins need an off rail fine tuner."

On FINS, the side and front fins' distance in from the rail is set by the chosen template and can't
be changed (thruster sides, twin, 2+1 side bites, quad fronts). The templates use figures like 1 1/8"
or 1 3/16". In Advanced, a shaper can fine-tune where those fins sit along the board (Aft/Forward
position), their toe and their base length, but not how far in from the rail they sit. The position
slider's own label even says "(off-rail unchanged)". The only off-rail control today is the quad
rear fins' Off-Rail slider, and only for the quad rear models that offer it.

## Solution

TBD. Likely a fine tuner in Advanced's forward-fins section built like the Aft/Forward position one:
a slider that nudges the template's off-rail in and out from where the template puts it. It reads in
the shaper's system (Imperial fractions, whole millimetres in Metric) and resets with Reset Advanced
and with a change of fin setup.

Questions for the founder before planning:

- **Nudge or set:** a ± fine tuner around the template's figure (like Aft/Forward position), or a
  slider that sets the off-rail outright (like the quad rear Off-Rail)?
- **Range:** the app already holds off-rail between 1" and 2" (`clampOffRail`). Is that the right
  window, or should a fine tuner be narrower, e.g. ±1/2"?
- **Which fins:** the front and side fins only, or the quad rears too, for the quad models that
  have no Off-Rail slider today?

Notes for the plan:

- The off-rail number feeds the fin placement maths, so the new input goes in `FinAdvancedSpec` and is
  applied inside `lib/geometry/fins.ts` with unit tests (CLAUDE.md Rule 1). It is never added in the
  component.
- Saved boards carry no value for the new field, so it needs a zero default that leaves every saved
  board exactly where it is.
- The "(off-rail unchanged)" wording on the position slider will need another look once off-rail can
  move.
