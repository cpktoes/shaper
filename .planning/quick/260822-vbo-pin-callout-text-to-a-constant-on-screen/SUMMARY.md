---
gsd_summary_version: 1.0
quick_id: 260822-vbo
slug: pin-callout-text-to-a-constant-on-screen
date: 2026-08-22
status: complete
commits:
  - 839a9f7 fix(design): pin callout text to a constant on-screen size
---

# Summary — Pin callout text to a constant on-screen size

## Result

| screen | before (1280x800) | after (every size tested) |
|---|---|---|
| outline value | 18.4px | **14px** |
| outline name | 13px | **11px** |
| fins value | 23.9px | **14px** |
| rails axis | 11.2px | **11px** |

Reference: screen title 18px, table data `text-sm` 14px. Verified at 1024x700,
1280x800, 1440x900 and 1600x1000 — constant across both screen and window size.

## Why a retune could not work

Callout `font-size` was in SVG user units, so the rendered size was `units x fitScale`.
Each viewer had a **different** fit scale at the same viewport (1.083 / 1.408 / 1.115),
and each moves with window height because the drawings are height-bound. A fixed unit
size is therefore correct at exactly one window size on exactly one screen.

The text now counters the fit. The board still scales — a template cannot fake
proportion — but a dimension label is UI, not geometry.

## Mechanics

- `useSvgFitScale(ref, vbW, vbH)` — ResizeObserver hook returning px-per-user-unit.
  Quantised at 0.005 so sub-pixel resize jitter does not re-render every callout.
- A resolved-sizes context feeds `CalloutChip`, `OutputRail` and `DimensionLine`;
  `outline-viewer.tsx` alone has a dozen call sites that should not carry sizing props.
- Opt-in per viewer via `pinCalloutText`, defaulting off.

## The Summary is deliberately excluded

Its cards render the same viewers at roughly half scale into small cells, where a pinned
14px would swamp the card and overlap, and its compact paths already carry the
`--summary-font-*` scale the print-fit depends on. Verified still unpinned at 12/17
units, print scale unchanged at 0.39, no card overflows.

## Clipping found and fixed

A pinned chip grows in user units as the fit scale falls (104px is 104 units at scale
1.0 but 147 at 0.707). At a 560px-tall window it overran the frame's left gutter by 5
units and clipped. Two guards:

- Gutters widened (`OUTLINE_VIEW_MIN_X` -84 -> -104, width -> 514). Free, because these
  drawings are height-bound — horizontal slack never costs board size.
- `MIN_PINNED_FIT_SCALE = 0.66` floors the counter-scaling. Below it the callouts scale
  down with the drawing instead of clipping. Confirmed at 1024x460: text degrades to
  11.7px, clearance stays positive.

## Note on verification

The browser console reported a parse error and a `ReferenceError` during this work. Both
were stale buffer entries from intermediate HMR states — each file was edited in two
steps (a reference inserted before its definition, a provider opened before it was
closed). Confirmed stale by functional measurement and by `npm run build` compiling
clean. Worth remembering that this console returns a session-wide buffer, not
since-last-load.
