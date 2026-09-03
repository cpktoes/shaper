# Quick Task 260903-h7t: Full Sized Template: keep the 2in scale-check square clear of the rail curve on wide boards - Context

**Gathered:** 2026-09-03
**Status:** Ready for planning (founder decisions locked; do not re-litigate)

<domain>
## Task Boundary

On the Full Sized Template (the tiled print, `components/template/build-template-pdf.ts`), page 1
is the nose page. Its 2in x 2in scale-check square sits in the top-right corner of the page's
alignment box (`scaleSquareRect` / `drawScaleSquare`), anchored there by decision D-07 on the
belief that it is "a corner the curve never reaches". Quick task 260903-fqv measured that it IS
reached on extreme boards: on the widest longboard (25in widepoint) the rail curve runs into the
square's own footprint by 5.8mm (Letter) / 11.7mm (A4); on the longboard preset at 100% nose
fullness by 1.8mm / 7.7mm. The plain longboard preset is 8.4mm (Letter) / 2.5mm (A4) clear.

This task moves the DECISION of where the square goes into pure geometry
(`lib/geometry/template.ts`, next to `howToBoxPlacement`), and gives it a fallback for the boards
whose corner the curve reaches. The square stays exactly 2in x 2in in every case — a scale check
that is not 2in is worthless. The Paper Saver strip's own scale square (`stripFurniture`) is
locked and untouched.

</domain>

<decisions>
## Implementation Decisions

### Trigger: the corner is kept unless the curve actually touches the square (0mm rule)
- Founder chose "corner unless the curve actually touches it" over the 4mm daylight rule and over
  "always move". The square keeps today's corner spot whenever the outline curve's MAXIMUM
  half-width, anywhere over the square's own footprint (square plus its caption reserve —
  50.8 + 5 + 3 = 58.8mm tall, measured from the alignment box's top edge), stays at or inboard of
  the footprint's curve-side (left) edge. Clearance >= 0 keeps the corner; clearance < 0 moves it.
- This is deliberately a DIFFERENT number from `NAME_BOX_CLEARANCE_MM` (4mm). Name it as its own
  exported constant in `lib/geometry/template.ts` — e.g. `SCALE_SQUARE_CORNER_CLEARANCE_MM = 0`
  — with a doc comment quoting the founder's decision, so nobody later "tidies" it into the 4mm
  rule. Its value is a decision, not a formula; a test may assert it is 0 as a pin of that
  decision.
- Outcome (probe against HEAD db2ab8a, `260903-h7t-probe-measurements.txt` beside this file):
  shortboard, fish, midlength, the widest shortboard AND the plain longboard keep the corner on
  both paper sizes (longboard: 8.4mm clear at Letter, 2.5mm at A4). Only the widest longboard
  (-5.8 / -11.7) and the 100%-nose longboard (-1.8 / -7.7) move. Every preset the app ships
  therefore prints byte-for-byte as it does today.
- The caption '2" x 2" — measure before taping' is 48.9mm wide at its 9pt bold (measured with
  jsPDF's own `getTextWidth`), narrower than the 50.8mm square it is centred under, so protecting
  the square's own footprint width protects the caption too. Do not widen the furniture rect.

### Fallback: inside the outline on page 1, stacked under the how-to box
- Founder chose this over the second-column nose page (page index 1, either corner) and over
  "always inside". When the corner is reached, the square moves INSIDE the outline on page 1
  (page index 0): its top edge `NAME_BOX_CLEARANCE_MM` (4mm) below the bottom edge of the lowest
  piece of interior furniture already on the page, its left edge 4mm off the stringer, and at
  least 4mm of daylight between its right edge and the curve over its whole footprint height —
  the same 4mm rule and the same `clearanceMm + width + clearanceMm` required-half-width shape
  `howToBoxPlacement`'s interior branch already uses. Required half-width = 4 + 50.8 + 4 = 58.8.
- "Lowest interior furniture" = the how-to box's bottom edge when the how-to box is interior,
  otherwise the name block's bottom edge. On every board where the square must move, the how-to
  box is ALREADY interior — provably: the outline only widens from the tip to the widepoint, and
  the how-to box's own outboard spot is both deeper on the page (58.8..104.8mm from the tip) and
  further inboard (its left edge is 70mm in from the box edge vs. the square's 50.8mm), so the
  curve reaches the box's spot before it can reach the square's. Assert this invariant in a test
  (derived, across every case); the name-block branch is defensive and must be covered with a
  constructed input (e.g. a candidate whose `halfWidthStart` is forced inboard so the corner is
  refused while the how-to box is handed in as outboard).
- Probe (same file) for the two boards that move: square top 98.6mm from the tip, bottom 157.4mm
  (with caption), minimum outline half-width over that span 164.5-170.6mm (required 58.8 — over
  100mm of daylight to the curve), bottom 89mm (Letter) / 107mm (A4) above page 1's search floor.
  The first candidate (exactly 4mm under the how-to box) is accepted; no scan step is needed on
  any real board.
- If even that band does not fit (pathological), scan toward the tail in
  `NAME_BLOCK_SEARCH_STEP_MM` (1mm) steps exactly the way `howToBoxPlacement` does, with the same
  style of documented last-resort fallback (deepest band whose bottom sits at page 1's search
  floor, clamped so the top never rises above the stacking ceiling or the page's printable range).
- Page 1 keeps exactly three pieces of furniture (scale square, how-to box, name block) in every
  case — the square never leaves page 1. The pinned "exactly three named furniture pieces" test
  stays as is.

### How-to wording: one wording for every board
- Founder chose one wording over placement-dependent wording. Instruction line 2 becomes exactly:
  `Measure the 2" x 2" square. It should be exactly 2" x 2".`
  on every board, replacing `Measure the square above. It should be exactly 2" x 2".` (which is
  false when the square sits below the box). Lines 1, 3 and 4 are unchanged.
- Measured with jsPDF at the box's 9pt regular: the numbered line is 81.2mm wide against the
  box's 64mm inner width, so it wraps to two rows exactly like today's 80.7mm line — the how-to
  box stays 8 rows / 46mm tall, and every interior placement from 260903-fqv is unchanged. Add a
  test that each numbered instruction wraps to at most two rows for every preset x paper (so a
  future wording change that grows the box is caught), and one that line 2 mentions `2" x 2"` and
  no longer says "above".
- The square's own caption ('2" x 2" — measure before taping') is unchanged.

### Where the code goes (CLAUDE.md Rule 1)
- NEW pure, exported, unit-tested function in `lib/geometry/template.ts`, placed right after
  `howToBoxPlacement` — e.g. `scaleSquarePlacement(layout, geometry, candidate, squareMm,
  footprintHeightMm, howToBox: HowToBoxPlacement, howToBoxHeightMm, nameBlock: NameBlockPlacement,
  nameBlockHeightMm, clearanceMm = NAME_BOX_CLEARANCE_MM, cornerClearanceMm =
  SCALE_SQUARE_CORNER_CLEARANCE_MM)` returning `{ pageIndex, topStation, halfWidthStart,
  position: "corner" | "interior" }`. `candidate` is the builder's corner spot expressed in the
  board's own station/half-width frame: `topStation = pageBox.stationRange[1]`,
  `halfWidthStart = pageBox.halfWidthRange[1] - squareMm` — exactly today's `scaleSquareRect`
  formula regrouped, so converting it back through `stationToY`/`halfWidthToX` reproduces the
  historical x/y to floating-point noise (prove it with a round-trip test, as 260903-fqv did for
  the how-to box). Reuse the module-private `minMaxHalfWidthOverStationSpanFine` (1mm sampling,
  endpoints folded in) for both the corner MAX check and the interior MIN check; do not add a
  second sampler.
- The builder (`components/template/build-template-pdf.ts`) only converts the answer to page-local
  mm. Resolve page 1's furniture ONCE, before the page loop — name block, then how-to box, then
  scale square (the square depends on the other two) — and hand that single resolved bundle to
  `drawScaleSquare`, `drawHowToBox`, `drawNameBlock` AND `templatePageZeroFurnitureRects`, so the
  drawn square and the tested square can never drift (extend the existing `ResolvedNameBlock` /
  `computeHowToBoxPlacement` pattern rather than adding a parallel one; `computeHowToBoxPlacement`
  itself and the how-to box's outboard candidate are unchanged). Name the footprint height
  (`SCALE_SQUARE_MM + SCALE_SQUARE_CAPTION_GAP_MM + SCALE_SQUARE_CAPTION_HEIGHT_MM`) as a constant
  rather than repeating the sum. Export a `templateScaleSquarePlacement(options)` mirroring
  `templateHowToBoxPlacement` so tests can assert against `sampleOutline` in the board's own
  frame. `drawScaleSquare` draws on `placement.pageIndex` (always 0 today) instead of a hard-coded
  page 0 check.
- ADDITIVE only in `lib/geometry/template.ts`. The frozen characterisation pins in
  `lib/geometry/template.test.ts` — the eight-function cj5 pin, the seven-function 18d pin, the
  strip digest pin and the strip scale-square literal pin — stay green and UNEDITED. Nothing may
  change `nameBlockPlacement`, `howToBoxPlacement`, `templatePageBoxes`, `computeTemplateLayout`
  or any strip function. If a pin goes red, the task broke something; fix the cause, never the
  digest.

### Tests (every expectation derived, never a number copied from what the new code prints)
- `lib/geometry/template.test.ts` (new describe block appended below everything existing): for
  every preset x paper plus the three wide variants already used by the `howToBoxPlacement`
  block (widest shortboard, widest longboard, 100%-nose longboard): `position` is "corner" exactly
  when the candidate's own curve-side clearance (computed in the test from `sampleOutline` over
  the footprint span) is >= `SCALE_SQUARE_CORNER_CLEARANCE_MM`; corner returns the candidate
  field-for-field with pageIndex 0; interior has `halfWidthStart === NAME_BOX_CLEARANCE_MM`, min
  half-width over the footprint span >= 4 + squareMm + 4, bottom >= page 1's search floor, top <=
  (stacking edge - 4) where the stacking edge is derived in the test from the how-to placement
  the test itself computes. A "derived outcome matches the planning facts" test: corner for
  shortboard, fish, midlength, longboard and the widest shortboard on both papers; interior for
  the widest longboard and the 100%-nose longboard on both. The how-to-is-interior-whenever-the-
  square-is invariant. The pathological oversized-footprint fallback. The defensive
  name-block-stacking branch with a constructed candidate.
- `components/template/build-template-pdf.test.ts`: for every case x paper via
  `buildOptionsFor` / `buildOptionsForOutline` (real per-preset geometry — the existing overlap
  and containment tests use `buildOptions(paper)`, which is always the shortboard's geometry with
  only the name swapped, so they never exercise a longboard's page 1): no two furniture rects
  overlap; every rect inside the alignment box; corner -> the drawn rect matches the historical
  formula (`x = boxRect.x + boxRect.width - 50.8`, `y = boxRect.y`) within 1e-6mm; interior ->
  the rect's top is >= 4mm below the how-to box's bottom, its left edge is exactly 4mm off the
  stringer, and it clears the curve by >= 4mm over its footprint (via
  `templateScaleSquarePlacement` + `sampleOutline`). The facts test again at this layer. The
  existing "exactly three furniture pieces" test unchanged. The how-to wording tests above.
- Extend the opt-in `TEMPLATE_PDF_OUT` sample writer (test-file only) so `TEMPLATE_PDF_PRESET`
  also accepts the wide-variant ids (`widest-shortboard`, `widest-longboard`,
  `fullnose-longboard`) from the test file's own `WIDE_TEMPLATE_CASES` — today it only knows the
  four named presets, and the two boards this task actually changes are not presets, so the
  orchestrator could not otherwise render them for the founder.

### Claude's Discretion
- Exact function/constant/field names beyond those given above, the order of the new describe
  blocks, and how the resolved-furniture bundle type is shaped in the builder.
- Whether the round-trip and containment assertions live in one describe block or two.

</decisions>

<specifics>
## Specific Ideas

- Rejected, with reasons, so the planner does not reopen them: the 4mm trigger (founder chose 0mm
  — the plain longboard keeps its corner square on both paper sizes, where 4mm would have moved it
  at A4 only); "always inside the outline" (on the shortboard the stack of name block, instructions
  and square runs 34mm past page 1's floor — its name block sits 142mm from the tip because of the
  narrow nose); the second-column nose page in either corner (founder chose to keep everything on
  page 1); moving the square along page 1's outboard edge (it is already flush with the top, and
  anything further inboard is reached sooner); shrinking the square (never — it must be exactly
  2in).
- Do not compute the name block or the how-to box a second time anywhere — one resolved bundle.
- Sample PDFs for the founder's eye: the orchestrator (not the executor) renders page 1 of
  longboard-letter and longboard-a4 (corner kept, 8.4 / 2.5mm clear), widest-longboard-letter and
  fullnose-longboard-letter (square inside under the how-to box), and shortboard-letter (unchanged)
  with the extended writer, then pypdf split + `qlmanage -t`.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/quick/260903-fqv-full-sized-template-keep-the-how-to-box-/260903-fqv-CONTEXT.md` and
  `260903-fqv-SUMMARY.md` ("Out-of-scope finding") — the finding this task acts on, and the
  hybrid-placement pattern (`howToBoxPlacement`) this task mirrors.
- `260903-h7t-probe-measurements.txt` (beside this file) — corner clearance and interior-stack fit
  for every preset x paper and the three wide variants, measured against HEAD db2ab8a.
- `.planning/phases/03-volume-templates-verified-math/03-CONTEXT.md` — D-07 (the 2in x 2in
  scale-check square prints on the nose page so the shaper can verify 100% scale before taping).
- CLAUDE.md Rule 1 (geometry pure and tested in `lib/geometry/`) and Rule 2 (`inchesToMm`, never a
  bare 25.4 or 50.8 literal for a design value — `SCALE_SQUARE_MM = inchesToMm(2)` already).

</canonical_refs>

## Executor environment notes

- You run in a git worktree forked from this branch's HEAD. `npm run build` cannot run there
  (Turbopack won't resolve `next` outside the main checkout) and a bare `tsc --noEmit` reports two
  phantom `LayoutProps` errors in `app/layout.tsx` / `app/design/layout.tsx` — both known,
  environmental, ignore them. Run `npm test` and `npm run lint`; the orchestrator runs the build.
- vitest does not type-check: route every design value through `mm()` / the branded types even in
  tests, or the post-merge build will catch it.
- Write the SUMMARY.md to the ABSOLUTE task-directory path you are given, not a worktree-relative
  one, and do not commit it.
