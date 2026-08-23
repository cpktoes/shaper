---
gsd_plan_version: 1.0
quick_id: 260822-urx
slug: maximise-plot-size-and-callout-legibilit
date: 2026-08-22
status: complete
---

# Quick Task 260822-urx — Maximise plot size and callout legibility

Corrects 260822-o99 (which overshot on negative space) in response to founder review:
"Too much empty white space with the headings. We need the plots to be as large as
possible on the screen since that's what we're designing. And even full screen the
callout text is too small to read comfortably."

## Measured cause

At 1024x700 on the outline editor:

| | |
|---|---|
| SVG box | 464 x 451 |
| viewBox | 410 x 638 |
| fit by width / height | 1.132 / 0.707 |
| constrained by | **height** |
| rendered scale | **0.707** |
| drawn size | 290 x 451 |
| wasted horizontal space | **174px** |
| callout value on screen | **9.2px** |
| callout station name on screen | **6.4px** |

Two independent faults:

1. **The drawing is height-starved.** `preserveAspectRatio="xMidYMid meet"` scales
   uniformly, so the tighter axis wins — here height, by a wide margin. Every vertical
   pixel spent on padding or heading margin comes straight off the drawing, and the
   174px of slack on the width axis cannot be spent (uniform scale is deliberate — a
   template cannot fake proportion). So vertical space is the only lever on size.
2. **The callout type scale is too small in its own units.** Even at scale 1.0 a
   13-unit value renders at 13px. At 0.707 it is 9.2px. Reclaiming space alone gets
   nowhere near comfortable; the user-unit sizes have to go up too.

## Approach

**Reclaim vertical space** on the three plot screens. The canvas padding
(`py-14`/`py-12`) and the viewer-title margin (`mb-10`) are what the founder is
seeing as excess white space, and they are exactly what is starving the drawing.
Horizontal padding stays moderate — it costs nothing in size (height-bound) but
still reads as composure.

**Raise the callout type scale** in `callout-primitives.tsx`. The sizes are currently
scattered magic numbers (9, 10, 11, 13) alongside hand-tuned baseline offsets
(`y - 2.5`, `y + 10.5`). Promote them to named constants next to the existing rail and
gutter constants, and derive the two-line stack offsets from them, so the scale is one
edit rather than a re-tune. The input chip box grows to match, and the viewBox's left
gutter widens to keep the chip inside the frame.

**Same treatment** for the fin viewer's callouts and the rail plot's axis labels.

**Rail plot colours.** `rail-section-plot.tsx` still draws warm-palette grid lines
(`#ece5d4`, `#cbbf9e`) and axis text (`#6b6355`, `#8a8272`) as raw SVG attributes,
which the class-based greps in the two previous tasks did not reach. Move them onto
the surf tokens. The data-series colours (apex `#a8425f`, tapered `#6b8e4e`) stay —
those encode meaning, like chart series.

## Tasks

- [x] T1 — Reclaim vertical space: canvas padding and viewer-title margins
- [x] T2 — Callout type scale as named constants; derive stack offsets
- [x] T3 — Grow the input chip box and left gutter to fit the larger type
- [x] T4 — Fin viewer + rail plot axis type sizes
- [x] T5 — Rail plot grid/axis colours onto the surf tokens
- [x] T6 — Verify: re-measure rendered scale and on-screen px, screenshots, lint, tests

## Verification

- Rendered scale and on-screen callout px measured before/after at 1024x700 and
  1440x900; callout values comfortably readable at both.
- No callout collisions or clipping at either size, and no chip escaping the viewBox.
- Summary print sheet still fits one page (the same viewers render into it compactly).
- `npm run lint` and `npm test` pass.
