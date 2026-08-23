---
created: 2026-08-23
title: Build in bottom contours with shading and selectable shapes
area: general
severity: minor
files:
  - lib/geometry/board.ts
  - lib/geometry/volume.ts
  - lib/geometry/rail-bands.ts
  - components/design/design-store.tsx
  - components/outline/outline-viewer.tsx
source: user request 2026-08-23
resolves_phase:
---

# Build in bottom contours with shading and selectable shapes

## Problem

The app shapes the outline, rail bands, foil, fins and volume, but the underside of the
board is flat by assumption — there is no bottom contour anywhere in the model. That is a
real gap: the contour is one of the primary things a shaper actually cuts into the blank,
and it is one of the biggest influences on how the finished board rides.

User's request, verbatim (2026-08-23):

> "add todo to build in bottom contours. Add shading, change shapes. Nose concave, Double
> though tail, single to double, etc."

Three parts to it:

1. **Selectable contour shapes** — nose concave, single concave, single-to-double, double
   through the tail, vee, flat, belly/roll. The shaper picks a configuration and tunes it,
   the same way tail shape works on the Template screen today.
2. **Shading** — render contour depth on the board so the shaper can *see* where the bottom
   is cut away, rather than reading numbers.
3. **The math**, which per CLAUDE.md must live in `lib/` as pure TypeScript with unit tests.

## What a bottom contour actually is (for whoever picks this up)

A contour is a **depth measured up from a straight edge laid across the bottom** at a given
station. So it is not one curve but two:

- a **depth-vs-station** curve running nose to tail (where the concave starts, where it is
  deepest, where it runs out), and
- a **cross-sectional profile** at each station — single concave is one trough centred on the
  stringer, double is two troughs either side of it, vee is a ridge rather than a trough.

Depths are small: roughly 1/16" to 1/4" at the deepest point. The common modern shortboard
arrangement is single concave under the front foot flowing into a double through the fins,
often exiting to a slight vee off the tail — which is why "single to double" needs to be a
first-class configuration and not two independent settings the shaper has to reconcile.

## Sequencing and knock-on effects

- **Depends on rocker (ROCK-01, Phase 4).** Contour depth is measured relative to the rocker
  line. Building contours before rocker exists means inventing an arbitrary reference and
  redoing it later.
- **Changes the volume math (VOL-01, Phase 3).** A concave removes foam. A volume figure that
  ignores a 1/4" double concave is wrong, and volume is one of the numbers the project's core
  value proposition says a shaper must trust. VOL-01 is scheduled *before* rocker, so volume
  will ship contour-blind — when contours land, `lib/geometry/volume.ts` must be revisited
  rather than extended blindly, and its golden fixtures re-captured.
- **Meets the rail band at the apex.** `lib/geometry/rail-bands.ts` computes tuck/apex from
  the outline and rocker; the contour is what the band runs into on the bottom side, so the
  two have to agree at the seam.
- **No requirement covers this.** `.planning/REQUIREMENTS.md` has Outline, Rocker, Rail
  Contour (that is the *rail* band, a different thing), Foil, Fins and Volume — nothing for
  the bottom. Building this needs a new requirement ID (e.g. `BTM-01`) and a roadmap slot,
  not just this todo.

## Solution

TBD in detail, but the shape of it:

- **`lib/geometry/bottom-contour.ts`** — pure TS, unit tested. Model the configuration as a
  discriminated union per contour kind plus depth control points, mirroring how `TailShape` is
  done in `lib/geometry/board.ts` so each variant carries exactly its own measurements.
- **Shading needs a design decision before code.** The Template view is a 2D plan view, so
  depth has to be *encoded* — a value ramp along the board with a legend, or banded contour
  lines like a topographic map. That is a new visual language, and per the sketch convention
  (`.planning/sketches/MANIFEST.md`) it should be settled in a sketch rather than invented
  inside the viewer component. Note the existing constraint from sketch 004: nothing but faint
  lines inside the outline and no text in there at all — a shading fill will have to be argued
  against that rule, or shown to be compatible with it.
- **Print.** Contour shading is a screen affordance. It must be suppressed for the full-size
  template the same way `--outline-board-fill` already is in the `@media print` block of
  `app/globals.css` — ink inside the outline is wasted on a sheet the shaper cuts along.
- **Open question:** does the contour live on the Template screen, on the (not yet built)
  Rocker/Foil screen, or on its own? It is cross-sectional data like the rail bands, so the
  Rails screen's section-plot treatment may be the closer analogue.
