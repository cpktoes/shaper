# Quick task 260903-fqv — orchestrator brief (decisions locked; do not re-litigate)

## The defect, in the founder's terms

On the Full Sized Template (the tiled print, `components/template/build-template-pdf.ts`), page 1
is the nose page. Its fixed furniture sits in the top-right corner, outboard of the rail curve:
the 2in scale-check square in the corner, and the how-to instruction box directly beneath it
(`howToBoxRect`: right-anchored to the page's alignment box, `HOWTO_BOX_TOP_GAP_MM` below the
square, 70mm wide, height from jsPDF word-wrapping — 8 lines / 46mm for every preset, because every
preset tiles two columns and so gets the fourth "left to right" instruction).

The how-to box is placed with no knowledge of the curve. On a wide-nosed board the rail curve runs
straight through it — the founder saw this on the longboard's page 1 (see the rendered page from
the previous task: the curve crosses the instruction text from its top-left to its bottom-right).
The board name + dims block was given a 4mm-daylight rule on both sides in quick task 260903-18d;
the how-to box has no rule at all.

## Measured facts (probe run against HEAD 1c8d5e5, unmodified — full table in
`260903-fqv-probe-measurements.txt` beside this file; all mm, stations measured from the nose tip)

The how-to box's outboard left edge sits at half-width 113.2 (Letter) / 107.3 (A4) — the page-0
alignment box's right edge (183.2 / 177.3, inset by the column overlap) minus 70. Its station span
is 58.8..104.8 from the tip. Curve-side clearance = box left edge − max outline half-width over
that span (negative = the curve is inside the box):

| preset | Letter | A4 |
|---|---|---|
| shortboard | +48.0 | +42.1 |
| fish | **−4.1** | **−10.0** |
| midlength | +15.6 | +9.7 |
| longboard | **−43.7** | **−49.6** |
| widest shortboard (25in) | +28.4 | +22.5 |
| widest longboard (25in) | −61.6 | −67.5 |
| longboard, noseFullness 100 | −55.1 | −61.0 |

So the fish grazes/intrudes as well as the longboard, and it is not a "graze": on the longboard
the curve is 44–50mm inside the box. The deepest station (from the tip) at which the box's left
edge would still be 4mm clear of the curve is 44.0 (longboard Letter) and 38.5 (A4) — the box
starts at 58.8. **No outboard position on page 1 can hold a 70mm-wide box on a wide nose**: the
blank paper outside the curve on the nose page is a wedge that only narrows toward the tail, and
a narrower/taller box makes it worse (deeper = wider curve). Swapping the box above the square
does not help either: the square would then be reached instead (checked).

Inside the outline, directly beneath the name + dims block (4mm gap, left edge 4mm off the
stringer, 70mm wide, needing half-width ≥ 4+70+4 = 78 over its span), the box fits in EVERY case
above, with the curve at least 95 half-width over the span (≥17mm to spare) and its bottom at
least 29mm above page 0's floor (the row-overlap band). Name-block bottoms (from tip): shortboard
167.6, fish 84.6, midlength 106.6, longboard 48.6.

**Out of scope, but record it for the founder in the SUMMARY:** the scale square itself is also
reached on extreme boards (widest-longboard −5.8 / −11.7; longboard at noseFullness 100 −1.8 /
−7.7) and is only 2.5mm clear on the longboard preset at A4 (8.4 at Letter). Do NOT move the
square in this task — its corner placement is a locked decision (D-07; "a corner the curve never
reaches" is what round 3 believed). Flag it; don't fix it.

## Decision: hybrid placement — beside the square when it clears, else inside the outline under the name block

1. **Outboard stays the default.** When the outline curve clears the how-to box's left (curve-side)
   edge by at least the 4mm daylight rule over the box's WHOLE station span, the box stays exactly
   where it is today, beside/below the scale square. Shortboard and midlength (and the widest
   shortboard) therefore print byte-for-byte as they do now — founder decision D-10 ("beside the
   scale square") is honoured whenever the board's shape allows it.
2. **Interior fallback.** Otherwise the box moves inside the outline, directly beneath the board
   name + dims block: top edge = name block bottom − 4mm gap, left edge 4mm off the stringer
   (`NAME_BOX_CLEARANCE_MM`, the same daylight rule both ways), 70mm wide, height unchanged. It
   must be verified contained (min half-width over its span ≥ 4 + width + 4, and bottom ≥ page 0's
   search floor — same floor `nameBlockPlacement` uses). If even that fails (pathological), scan
   downward from there in 1mm steps like `nameBlockPlacement` does, and use the same style of
   documented last-resort fallback. Fish and longboard go interior.
3. **One clearance rule.** Reuse `NAME_BOX_CLEARANCE_MM` (4mm) as the clearance for both the
   outboard curve check and the interior containment — no second magic number. Its doc comment may
   be broadened to say the 4mm daylight rule now applies to page-0 furniture generally, or a
   clearly-named alias may be introduced; do not rename the existing constant (churn across files
   and frozen tests).
4. **The instruction text does not change.** "Measure the square above" stays true in both
   placements (the square is always higher on the page than the box). Existing text tests remain.
5. **The name block does not move**, the scale square does not move, the Paper Saver strip is
   untouched (it has no how-to box by locked decision).

Rejected: always-interior (changes the two presets that print fine today and abandons D-10 for no
gain); narrowing/reflowing the box (dead — see the deepest-station numbers); moving the box to
another page (tail pages have no reliable blank paper); moving the scale square (locked).

## Where the code goes (CLAUDE.md Rule 1)

- The placement DECISION is geometry: a new pure, exported, unit-tested function in
  `lib/geometry/template.ts` (e.g. `howToBoxPlacement`) that takes the layout, the geometry, the
  builder's outboard candidate (top station + half-width start, exactly as `howToBoxRect` computes
  it today), the box width/height, the name block's placement + height (to stack beneath), and the
  clearance, and returns `{ pageIndex, topStation, halfWidthStart, position: "outboard" |
  "interior" }`. It needs a max-half-width-over-span helper alongside the existing
  `minHalfWidthOverStationSpan` — sample finely enough (1mm) that a 46mm span can't hide the
  curve's widest point between samples; the existing 5-sample helper is too coarse for a max.
- `howToBoxRect` in the builder converts the returned placement back to page-local mm through the
  existing `stationToY` / `halfWidthToX`, exactly as `drawNameBlock` does. `drawHowToBox` and
  `templatePageZeroFurnitureRects` must keep sharing that one rect (no drift between what is drawn
  and what is tested). `drawHowToBox` will need the geometry and the name block's placement, so
  `buildTemplatePdf`'s draw order must compute the name block content/placement once per page 0
  and hand it to both — do not compute the name block twice with the risk of diverging.
- ADDITIVE only in `lib/geometry/template.ts`. The two frozen characterisation pins in
  `lib/geometry/template.test.ts` (the eight-function cj5 pin and the seven-function 18d pin) and
  the strip pin/scale-square literal pin must stay green and UNEDITED — nothing this task does may
  change `nameBlockPlacement`, `templatePageBoxes`, `computeTemplateLayout`, or any strip function.
  A new function does not perturb them. If any pin goes red, the task broke something; fix the
  cause, never the digest.

## Tests (every expectation derived, never a number copied from what the new code prints)

- `lib/geometry/template.test.ts`: for every preset × paper: the returned placement is either
  `outboard` with the candidate returned unchanged and curve-side daylight ≥ 4mm over the whole
  span (assert directly via `sampleOutline`), or `interior` with top = name block bottom − 4mm,
  left = 4mm, and min half-width over the span ≥ 4+70+4, bottom ≥ floor. Assert the specific
  outcome per preset by DERIVING it (compute the outboard clearance from the geometry in the test
  and expect `position` to match the sign), not by hard-coding "fish is interior". Include the
  widest-shortboard (stays outboard) and the widest-longboard / noseFullness-100 longboard (go
  interior) variants. Cover the pathological scan/fallback path with a constructed board.
- `components/template/build-template-pdf.test.ts`: the how-to box rect from
  `templatePageZeroFurnitureRects` clears the curve by ≥ 4mm (outboard) or is inside the outline
  with ≥ 4mm both sides (interior), for every preset × paper and the widest variants; the existing
  pairwise no-overlap and inside-the-alignment-box tests keep passing; a new test that the
  interior box never overlaps the name block AND keeps the 4mm gap. The pinned "exactly three
  furniture pieces" test stays.
- Existing `templateHowToLines` / `templateHowToWrappedLines` tests unchanged.

## Verification the orchestrator does after merge (not the executor)

Render page 1 of the Full Sized Template for all four presets at Letter (the suite's opt-in
`TEMPLATE_PDF_OUT` writer, added in 260903-18d, then pypdf split + `qlmanage`) and eyeball:
longboard and fish show the instructions inside the outline under the name box with visible
daylight to the curve; shortboard and midlength are unchanged. `npm run build`, `npm run lint`,
`npm test` from the main checkout.

## Executor environment notes

- You run in a git worktree forked from main's HEAD. `npm run build` cannot run there (Turbopack
  won't resolve `next` outside the main checkout) and a bare `tsc --noEmit` reports two phantom
  `LayoutProps` errors in `app/layout.tsx` / `app/design/layout.tsx` — both known, environmental,
  ignore them. Run `npm test` and `npm run lint`; the orchestrator runs the build in main.
- vitest does not type-check: route every design value through `mm()` / the branded types even in
  tests, or the post-merge build will catch it.
- Write the SUMMARY.md to the ABSOLUTE main-checkout path you are given, not a worktree-relative
  one, and do not commit it.
