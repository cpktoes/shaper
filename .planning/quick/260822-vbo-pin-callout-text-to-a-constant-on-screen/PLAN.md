---
gsd_plan_version: 1.0
quick_id: 260822-vbo
slug: pin-callout-text-to-a-constant-on-screen
date: 2026-08-22
status: complete
---

# Quick Task 260822-vbo — Pin callout text to a constant on-screen size

Founder review: "The callouts on the main pages all need to be consistent sized. They
should not be bigger than the headers, and the same size as the data in the tables."

## Measured problem (all at 1280x800)

| screen | SVG fit scale | callout on screen |
|---|---|---|
| outline | 1.083 | 18.4px value / 13px name |
| fins | 1.408 | **23.9px** |
| rails axis | 1.115 | 11.2px |

Reference: screen title 18px, section heading 12px, table data `text-sm` = 14px.

## Why a retune is not enough

Callout `font-size` is in SVG user units, so what lands on screen is
`units x fitScale`. Each viewer has a **different** fit scale at the same viewport
(1.083 / 1.408 / 1.115), and each scale moves with window height because the drawings
are height-bound. So any fixed user-unit size is correct at exactly one viewport on
exactly one screen. Consistency requires the text to **counter-scale**: size it at
`targetPx / fitScale` so the rendered size is constant.

This is the right model anyway — the board outline is geometry and must scale (a
template cannot fake proportion), but a dimension *label* is UI. It should read the
same whether the drawing is large or small.

## Targets

- value / dimension text: **14px**, matching the tables' `text-sm` data
- station and chip names: **11px** — secondary annotations, kept a step below so the
  chip does not become the loudest thing on the drawing
- both sit under the 18px screen title, satisfying "not bigger than the headers"

## Approach

1. **`useSvgFitScale(ref, vbW, vbH)`** in `callout-primitives.tsx` — a ResizeObserver
   hook returning px-per-user-unit for the current `meet` fit.
2. **A resolved-sizes context.** The primitives (`CalloutChip`, `OutputRail`,
   `DimensionLine`) read sizes from context rather than module constants, so the many
   call sites in `outline-viewer.tsx` need no prop drilling. Default value is the
   present unit-based scale, so anything that does not opt in is untouched.
3. **Opt-in per viewer** via `pinCalloutText`. The three editor screens pass it. The
   **Summary does not**: its cards render the same viewers at roughly half scale, where
   a pinned 14px would swamp a small card and overlap, and its compact paths already
   have the `--summary-font-*` scale the print-fit depends on.
4. **Chip box counter-scales too**, since it holds the text. That widens the chip in
   user units at low scale, so the frame's left gutter must clear it — free here,
   because the drawing is height-bound and horizontal slack costs nothing.

## Tasks

- [x] T1 — `useSvgFitScale` hook + resolved-sizes context and defaults
- [x] T2 — Primitives read sizes from context
- [x] T3 — Widen the frame gutters to clear a counter-scaled chip
- [x] T4 — Wire `pinCalloutText` through the three editor viewers
- [x] T5 — Rail plot axis labels onto the same mechanism
- [x] T6 — Verify: all three screens land at 14px/11px and hold across viewport sizes

## Verification

- Callout value measures 14px on outline, fins and rails, at 1024x700, 1280x800 and
  1440x900 — i.e. constant across both screen and window size.
- Nothing clipped: no chip escapes the viewBox at the smallest scale tested.
- Summary unchanged: print-fit scale still 0.39, no card overflows.
- `npm run lint` and `npm test` pass.
