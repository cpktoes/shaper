---
gsd_summary_version: 1.0
quick_id: 260822-urx
slug: maximise-plot-size-and-callout-legibilit
date: 2026-08-22
status: complete
commits:
  - 07f3003 fix(design): maximise plot size and callout legibility
---

# Summary — Maximise plot size and callout legibility

Corrects 260822-o99, which overshot on negative space.

## Measured result (outline editor, 1440x900)

| | before | after |
|---|---|---|
| rendered scale | 0.707 | **1.196** |
| drawing | 290 x 451 | **507 x 763** |
| callout value on screen | 9.2px | **20.3px** |
| station name on screen | 6.4px | **14.4px** |
| rail plot width | 420 | **480** |

## Why it was small

The drawings scale uniformly to fit (`preserveAspectRatio="xMidYMid meet"`) and are
bound by **height**, not width — at 1440x900 there were 453px of slack on the width
axis that uniform scale cannot spend. So every vertical pixel of padding or heading
margin came straight off the drawing, and the type scale compounded it: a 13-unit
value at 0.707 renders at 9.2px.

## Changes

1. **Vertical space.** Canvas `py-14`/`py-12` -> `py-5`; viewer titles `text-xl mb-10`
   -> `text-sm mb-2`; viewer panels `pt-10` -> `pt-3`. Horizontal padding stays
   moderate — free when the fit is height-bound.
2. **Callout type scale.** Scattered literals (9, 10, 11, 13) with hand-tuned baseline
   offsets became `CALLOUT_FONT_VALUE/NAME/DIM` beside the existing rail constants,
   with the stack offsets derived from them. Raised to 17/12/14; chip box and left
   gutter grew to match. The fin viewer shares the same constant.
3. **Rail plots.** `MAX_PLOT_W` was 420, inherited from a per-plot `max-w-` class,
   which made it the binding constraint on every normal viewport. Now 900 — an
   ultrawide sanity ceiling only — so the solver's container and height limits govern.

Also moved the rail plot's grid, rule and axis colours onto the surf tokens. They were
raw SVG attributes, so the class-based sweeps in the previous two tasks never reached
them. Series colours (apex `#a8425f`, tapered `#6b8e4e`) stay — those encode meaning.

## Tried and reverted

Deriving the viewer container's aspect ratio from `outlineViewMetrics` to remove the
side letterboxing. As a flex item it resolved its width from the wrong basis and
collapsed the drawing to 0.41 scale. Reverted with a note in the code so the next
person does not retry it blind. The centred letterbox splits its slack evenly either
side and is the better trade.

## Remaining constraint

Both viewers are now height-bound with the vertical chrome squeezed to near zero, so
further size gains need viewport height — or dropping the viewer titles and the rail
legend, which is a design call rather than a fix.

**Followed up (db5a6d1):** the founder took the titles option. TEMPLATE/RAIL/FIN
VIEWER are gone, taking the outline to 1.240 scale (526x791, callouts 21.1px) and the
rail plots to 518 wide at 1200x800 / 651 at 1440x900. The rail legend stays.

## Verification

Summary print sheet re-measured: required scale unchanged at 0.39, no card overflows
its cell despite the shared viewBox constants changing. Lint clean, 633 tests pass,
no console or server errors.
