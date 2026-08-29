---
phase: 03-volume-templates-verified-math
plan: 03
subsystem: templates
tags: [jspdf, pdf-export, geometry, print]

requires:
  - phase: 03-volume-templates-verified-math (plan 01)
    provides: lib/geometry/template.ts (computeTemplateLayout, computeTemplateMarks) and components/template/build-template-pdf.ts (buildTemplatePdf) — the tile layout and PDF renderer this plan extends
provides:
  - markPlacements() and matchMarkPositions() in lib/geometry/template.ts — pure mark-to-page and overlap-alignment data
  - The complete printed template: four working marks, a name block that survives any board name, match-mark crosshairs, and a plain-English how-to box
affects: [03-04, 03-05, 03-06, 03-07, template-preview-dialog]

actuals:
  tokens: 7100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Mark/overlap placement is pure data in lib/geometry/template.ts (markPlacements, matchMarkPositions); build-template-pdf.ts only iterates that data and calls jsPDF primitives — never computes page arithmetic itself"
    - "Row-overlap duplication: a mark or match-mark whose station falls inside an overlap band is returned once per overlapping page (not deduplicated), so trimming one edge never loses it"
    - "Truncate, never shrink: templateNameBlockText measures with jsPDF's own getTextWidth at the name block's real font/size before drawing, so the ellipsis rule never risks dropping type below the 9pt print floor"

key-files:
  created: []
  modified:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-template-pdf.test.ts

key-decisions:
  - "markPlacements and matchMarkPositions both express positions in the board's own absolute station/half-width frame (the same values stationToY/halfWidthToX already accept for the outline curve) rather than translating to a page-local pixel frame — keeps 'the drawing module computes nothing' true without inventing a second coordinate system"
  - "matchMarkPositions records a pairedPageIndex alongside each mark so a page carrying both a row overlap and a column overlap (a wide board's non-corner pages) can be filtered to one specific shared edge at a time, instead of conflating the two overlap types"
  - "markPlacements restricts marks to column-0 pages only — a tick always starts at the stringer (half-width 0), which only column 0 touches; the tick's outer end (sampleOutline at that station) is drawn regardless of whether it would cross into a second column's page"
  - "How-to box placed directly below the nose page's scale-check square and label, right-aligned to the square's own right edge, sized to the four (or three) how-to lines it actually holds — no fixed guess at box height"

requirements-completed: [TMPL-01]

coverage:
  - id: D1
    description: "markPlacements returns exactly the four D-06 working marks (nose 12in, tail 12in, centre, widepoint), each on a valid page whose stationRange contains its station, with tailTwelve/noseTwelve/widepoint matching the geometry's own values and each tick's half-width extent equal to sampleOutline at that station"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#describe(markPlacements)"
        status: pass
    human_judgment: false
  - id: D2
    description: "matchMarkPositions places two alignment crosshairs per shared overlap band, with the identical (station, halfWidth) pair recorded against both overlapping pages — verified for both a forced single-column board (row-adjacent case) and a maximum-widepoint-width board (column-adjacent case)"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#describe(matchMarkPositions)"
        status: pass
    human_judgment: false
  - id: D3
    description: "templateNameBlockText falls back to 'Untitled Board' for an empty or whitespace-only name, returns a short name unchanged, and truncates a too-long name with a trailing ellipsis measured (via jsPDF's own getTextWidth) to fit the block's width"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "components/template/build-template-pdf.test.ts#describe(templateNameBlockText)"
        status: pass
    human_judgment: false
  - id: D4
    description: "templateHowToLines returns exactly three lines for a single-column layout and four (including the sideways-taping instruction) for a multi-column layout; buildTemplatePdf still produces one PDF page per layout page with valid PDF bytes after marks, match marks and the how-to box are added"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "components/template/build-template-pdf.test.ts#describe(templateHowToLines)"
        status: pass
      - kind: unit
        ref: "components/template/build-template-pdf.test.ts#describe(buildTemplatePdf)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The finished printed template (four marks, refined name block, match marks, how-to box) reads correctly on paper — deferred to the phase acceptance walkthrough per this plan's own <verification> section"
    human_judgment: true
    rationale: "Visual confirmation of the finished printed page happens at the phase acceptance walkthrough (plan 07), per this plan's own verification section — no automated test can confirm legibility or on-paper layout quality"

duration: ~20min
completed: 2026-08-28
status: complete
---

# Phase 03 Plan 03: Finished Printed Template — Marks, Name Block, Match Marks, How-To Box Summary

**The tiled 1:1 template PDF from plan 01 gains its four working marks (nose 12in, tail 12in, centre, widepoint) told apart by dash pattern alone, a name block that survives an empty or overlong board name via truncation-not-shrinking, overlap match-mark crosshairs proven identical on both sides of every shared edge, and a plain-English how-to box beside the scale square that explains the sideways taping order only on boards that actually need it.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-28
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- `markPlacements(layout, marks, geometry)` in `lib/geometry/template.ts`: places the four D-06 working marks onto the column-0 page(s) that carry them, duplicated across a row overlap band so a mark is never lost when the shaper trims one of the overlapping edges. Each placement carries the mark's absolute station, the half-width extent the tick spans (from the stringer out to `sampleOutline` at that station), and its label text.
- `components/template/build-template-pdf.ts` draws the four ticks at 0.25mm, told apart by dash pattern alone (5 4 for nose/tail/centre, matching the on-screen station dash; 2 3 dotted for widepoint) so they survive a monochrome printer without depending on colour — labels sit on the stringer side of each tick, where there is always paper.
- `templateNameBlockText(boardName, widthLimitMm, doc)`: resolves the empty-name fallback (`Untitled Board`, matching `board-rack-card.tsx`/`continue-board-card.tsx`, deliberately not `order-form.tsx`'s lower-case variant) and the long-name truncation rule — measured with jsPDF's own `getTextWidth` at the name block's real font, truncating with an ellipsis rather than ever shrinking type below the 9pt print floor.
- `matchMarkPositions(layout)`: places two alignment crosshairs inside every row and column overlap band, recording the exact same (station, halfWidth) pair against both overlapping pages (tagged with a `pairedPageIndex` so a page with both a row and a column overlap doesn't have its two edges' marks conflated) — the contract that makes lining the marks up a positive confirmation, not an eyeball judgement on a cut edge.
- `templateHowToLines(layout)`: a small pure helper returning the nose page's how-to box copy — three fixed numbered lines always, plus a fourth sideways-taping instruction only when the layout's `columns > 1`, omitted entirely for the common single-column case.
- The nose page now draws a bordered how-to box beside the scale-check square, sized to however many lines it actually holds, and the match-mark crosshairs on every page that shares an overlap band with a neighbour.

## Task Commits

Each task was committed atomically:

1. **Task 1: The four working marks, and a name block that survives any board name** - `3ec4363` (feat)
2. **Task 2: Match marks in the overlap, and the how-to box that stops a 97-percent print** - `1b498c3` (feat)

## Files Created/Modified

- `lib/geometry/template.ts` - new exports `markPlacements`, `TemplateMarkPlacement`, `matchMarkPositions`, `TemplateMatchMark`
- `lib/geometry/template.test.ts` - new `markPlacements` and `matchMarkPositions` describe blocks, covering both paper sizes, a forced single-column board, and the maximum-widepoint-width board
- `components/template/build-template-pdf.ts` - new exports `templateNameBlockText`, `templateHowToLines`; new drawing functions `drawMarks`, `drawMatchMarks`, `drawHowToBox`; `drawNameBlock` refactored to route through `templateNameBlockText`
- `components/template/build-template-pdf.test.ts` - new `templateNameBlockText` and `templateHowToLines` describe blocks; existing `buildTemplatePdf` smoke test still asserts page count and PDF magic bytes with marks now included

## Decisions Made

- `markPlacements`/`matchMarkPositions` both express positions in the board's own absolute station/half-width frame (the same values the drawing module's existing `stationToY`/`halfWidthToX` helpers already accept for the outline curve) rather than pre-translating to a page-local pixel frame — the drawing module still computes no page arithmetic of its own, it just feeds these values through the same helpers it already uses.
- `matchMarkPositions` records a `pairedPageIndex` on every entry so a non-corner page on a wide, multi-column board (which carries both a row overlap and a column overlap) can be filtered to one specific shared edge at a time in tests and in the drawing loop, rather than conflating the two overlap types.
- `markPlacements` restricts marks to column-0 pages — a tick always starts at the stringer (half-width 0), which only column 0 touches; its outer end is drawn wherever `sampleOutline` puts it, even if that would extend past column 0's own page width on a very wide board (accepted per the plan's acceptance criteria, which test tick extent equality, not column containment of the full tick).
- The how-to box sits directly below the nose page's scale-check square and its label, right-aligned to the square's own right edge, with its own height derived from the actual line count (3 or 4) rather than a fixed guess.

## Deviations from Plan

None - both tasks executed exactly as written, including the D-06/D-08/D-09/D-10 print-artifact details from 03-UI-SPEC.md and 03-CONTEXT.md.

One test-construction note worth recording: `BOARD_PRESETS[0]`'s own widepoint width (18.75in) already tiles to two columns on both Letter and A4 at the standard 10mm margin — realistically, every board in `WIDEPOINT_WIDTH_RANGE_IN` (16in–25in) is wide enough that a portrait page's short edge can't fit the full half-width in one column. The plan's instruction to test "a single-column board" was satisfied with a deliberately narrower-than-realistic 10in widepoint width, purely to exercise the row-adjacent match-mark invariant in isolation from the column-adjacent case — not a claim that any real board renders single-column.

## Issues Encountered

None. `npx tsc --noEmit` reports the same two pre-existing `Cannot find name 'LayoutProps'` errors in `app/design/layout.tsx` and `app/layout.tsx` documented in plan 01's SUMMARY — known worktree-only phantom errors (Next.js's generated route types aren't visible from a worktree checkout), unrelated to this plan's changes; confirmed unchanged before and after this plan's edits.

## Next Phase Readiness

**Plan is complete.** Both tasks are done and committed: the template PDF now carries all of Print Artifact Contract items 1–7 — the four working marks, the refined name block, match-mark crosshairs, and the how-to box. `npm test` passes at 832/832 (up from 826/826 baseline), `npm run lint` reports 0 errors, and every acceptance-criteria string check (`Nose 12"`, `Tail 12"`, `Centre`, `Wide point`, `setLineDashPattern` for both dash patterns, `Untitled Board`, `getTextWidth`, `Print at 100%`, `measure before taping`) is present in `components/template/build-template-pdf.ts`. `git diff --name-only components/summary/` remains empty — the Summary print surface was untouched, as scoped.

**What's ready:** Later plans in Phase 03 (the preview dialog per D-03/D-04, the folded Summary print-sheet refit) can build on this finished template renderer. Visual confirmation of the finished printed page — that the marks, name block, match marks and how-to box actually read correctly on paper — is deferred to the phase acceptance walkthrough (plan 07), per this plan's own `<verification>` section.

## Post-checkpoint fixes

The user printed page 1 of a real export and reported four defects on paper. Each was fixed and
committed atomically as its own `fix(03-03): ...` commit.

**1. How-to box text overran its own border.** Line 2 ("Measure the square above...") and line 3
("Cut out each page and tape them...") ran past the box's right edge and were clipped in the
printout. `templateHowToWrappedLines` now word-wraps each numbered line to the box's own inner
width, measured with jsPDF's own `getTextWidth` at the box's real font/size rather than a guessed
character count; `drawHowToBox` sizes the box to however many wrapped lines that produces.
Commit: `5135a54`.

**2. Station lines carried no printed dimension.** The four working marks (nose 12in, tail 12in,
centre, widepoint) drew a tick and a name but no measurement. `templateMarkDimensionText` /
`templateMarkLabelText` print the board's own full width at each mark's station (the existing
`formatInchesFraction` formatter, matching how a shaper reads a tape measure), and `drawMarks`
falls back to two stacked lines (name, then dimension) rather than let either run off the tick's
own paper into the outline curve when there isn't room for one line.
Commit: `df1b2e3`.

**3. The name + dims box wasn't contained inside the outline on page 1, and only carried three of
seven dimension values.** The box previously landed on whichever page held the board's centre
station — not page 1 — and showed only length, widepoint width and thickness. Per the
coordinator's refinement mid-fix, it now carries every value the Summary order form's own
dimensions row shows (length, nose, widepoint, offset, tail, thickness, volume), read from the
same design state and formatted with the same `lib/geometry/units.ts` functions. A new pure
function, `nameBlockPlacement` (`lib/geometry/template.ts`), scans down page 1's own outline width
from the nose tip for the first station band — over the box's whole height — wide enough to hold
the box at its full width, so every corner is verifiably inside the board outline rather than just
placed near it. Because the fuller box needs more room, its real height (name line plus however
many lines the wrapped dims row needs) is computed first and fed into the placement search —
containment wins over a fixed position. `BuildTemplatePdfOptions.dims` gained four required
fields; `export-preview-dialog.tsx` (the only caller) was updated to supply them from the same
design-store values `order-form.tsx` already reads. `components/summary/` itself was not touched.
Commit: `be94ae8`.

**4. Crosshair match marks, and one sat on top of the how-to box's own text.** Overlap alignment
marks were small crosshairs; the photo showed one landing directly on the how-to box's text on
page 1. Match marks are now a single solid tick, oriented perpendicular to the trim edge it
crosses (vertical for a nose-tail seam, horizontal for a side-by-side seam) — taping two pages
means aligning two solid lines into one continuous line across the seam. The underlying placement
bug is fixed too: `matchMarkPositions`'s default edge fractions could put a column-adjacent mark
inside the top ~35% of page 1, exactly where the scale square and how-to box live. It now accepts
an optional `FurnitureZone` list and retries a sequence of tighter, more-central fraction pairs
until one clears every zone; `buildTemplatePdf` builds that zone from the scale square's and
how-to box's own real rectangles before computing match marks. `nameBlockPlacement` also keeps the
name+dims box's own bottom edge clear of the row-overlap band page 1 shares with the next page,
since that band carries its own match marks — furniture and marks never share the same paper, in
either direction. `templatePageZeroFurnitureRects` + `rectsOverlap` give a direct pairwise
non-overlap test across every board preset and paper size, including a forced multi-column board
that reproduces the original photo's collision.
Commit: `931d046`.

**Verification:** `npm test` (874/874), `npx tsc --noEmit` (0 errors beyond the pre-existing,
worktree-only `LayoutProps` phantom errors documented in plan 01/03's own summaries), and
`npm run lint` (0 errors) all pass after all four fixes. New/updated test coverage: how-to box
wrapping (`wrapTextToWidth`, `templateHowToWrappedLines`), station-line dimension text
(`templateMarkDimensionText`/`templateMarkLabelText`), name-block containment
(`nameBlockPlacement`, exercised across every `BOARD_PRESETS` entry and both paper sizes, plus a
row-overlap-band clearance case), match-mark orientation (`edge` field) and furniture-avoidance
(`avoidZones`), and pairwise furniture non-overlap (`templatePageZeroFurnitureRects` +
`rectsOverlap`).

**Deviation note:** `components/template/export-preview-dialog.tsx` was modified outside this
plan's original file list — required because it is the sole caller of `BuildTemplatePdfOptions`,
which gained required fields in fix 3. This is a mechanical caller update (Rule 3: blocking-issue
fix), not a scope expansion; `components/summary/` and `components/outline/outline-editor.tsx`
were not touched.

### Round 2 — after a real re-print compared against the iShaper reference template

The user re-printed the tiled template and compared it against an iShaper reference template they
own, and reported two more defects. Each was fixed and committed atomically as its own
`fix(03-03): ...` commit. `components/template/export-preview-dialog.tsx` was NOT touched this
round — neither fix changed `BuildTemplatePdfOptions`'s required fields.

**1. The tail did not print all the way to the board's own end.** The tail page's outline curve
already sampled all the way down to the tailblock station (`geometry.tailPodStation`, usually 0);
what was actually missing was the horizontal cut line closing that curve off square to the
stringer, plus a printed dimension for it — the user's "the tip of the tail is not printing" was
this missing closing line, not a coverage gap in the curve. `computeTemplateMarks`
(`lib/geometry/template.ts`) now adds an optional `tailBlock` mark whenever the tail actually has
a squared block (`geometry.halfTailBlockWidth > 0` — squash, diamond and swallow tails; a pin or
round tail's curve already narrows to meet the stringer on its own, so nothing is added for those).
`markPlacements` places it through the same machinery as the other four working marks; `drawMarks`
draws it SOLID at the outline curve's own line weight (it is a real cut edge, not a measurement
reference) with the board's own tailblock width printed alongside it — `Tail Block — 4"` for the
default shortboard preset, matching the example in the report verbatim.
Commit: `49034bc`.

**2. The match-mark crosshairs from round 1's fix 4 were the wrong mechanism entirely.** The
coordinator's first read of the user's iShaper reference (as a description, not the file itself)
suggested zero-overlap tiling with a hard-clipped border; the user corrected this after seeing that
guess applied — the iShaper reference tiles WITH overlap (unchanged from this project's own
`TEMPLATE_OVERLAP_MM`), and the "margin bars" the reference actually uses are page borders inset
from each page's own printable edge by the overlap amount on any side that borders another page.
The overlap strip between a page's border and its own paper edge deliberately shows duplicate
curve content, which is what a shaper checks against the neighbouring sheet's own overlap strip
before taping. `matchMarkPositions`, `TemplateMatchMark` and `FurnitureZone` (and their drawing
counterparts, `drawMatchMarks` and `pageZeroFurnitureZone`) are removed entirely. A new pure
function, `templatePageBoxes` (`lib/geometry/template.ts`), derives every page's own alignment box
directly from the existing tile grid — inset by `layout.overlap` on any bordering edge, flush with
the printable edge on any outer edge with no neighbour. `drawPageBox`
(`components/template/build-template-pdf.ts`) draws the box as four independent line segments
rather than one `doc.rect`, because the stringer-side edge on a column-0 page keeps its own dashed
stringer styling (per the user's own instruction to keep the stringer dashed) while the other three
sides are plain solid lines. The outline curve and the stringer line are NOT clipped to the box —
they still draw all the way to each page's own printable edge exactly as before, since the overlap
strip only works as an alignment check if the curve actually appears in it. The how-to box copy was
rewritten to match: it now describes lining a page's edge up against the next page's own border
line and checking the curve matches in the overlap, then taping, instead of the old
cut-and-match-marks wording.
Commit: `f4c1326`.

**Verification:** `npm test` (902/902, up from 874/874 baseline), `npx tsc --noEmit` (0 errors
beyond the pre-existing, worktree-only `LayoutProps` phantom errors documented in plan 01/03's own
summaries), and `npm run lint` (0 errors) all pass after both fixes. New/updated test coverage: a
`tailBlock` describe block in `markPlacements` (present only for a squared-tail preset, absent for
round/pin, station/label/dimension text all asserted, plus a check that every preset's sampled
points reach the board's own full length), a `templateMarkLabelText — Tail Block` describe block in
`components/template/build-template-pdf.test.ts` asserting the exact `Tail Block — 4"` string for
the shortboard preset, and a `templatePageBoxes` describe block replacing the old
`matchMarkPositions` one — every page's box nested inside its own printable range, `stringerEdge`
true only for column-0 pages, and the exact inset-vs-flush rule verified per edge for every board
preset and paper size. The pre-existing overlap tests (`consecutive rows/columns overlap by exactly
TEMPLATE_OVERLAP_MM`) were left untouched, since the tile layout itself did not change.

### Round 3 — a third real print, two more defects on the tiled template

The user printed the tiled template again and reported two more defects, in their own words:
"the center and widepoint lines don't extend to the edge and the 2\" box and instructions are not
inside the margin/line up lines." Both were fixed and committed as one atomic `fix(03-03): ...`
commit (the two defects shared enough surface — both live in `drawMarks`/furniture-placement code
in the same file — that the coordinator scoped them as a single commit rather than two).

**1. Station reference lines (nose 12in, tail 12in, centre, widepoint) stopped short of the
outline curve on a multi-column board.** Each of these lines is a width measurement: it spans from
the stringer to the outline curve at that station, nothing more. The coordinator's first read of
the report ("don't extend to the edge") suggested extending the lines all the way to the page's
own printable edge — that read was corrected mid-fix: the real bug was that a wide board's line
(the widepoint, by definition the board's widest point, routinely tiles to more than one column)
only ever got drawn on the column-0 page, so it visually vanished partway across the board instead
of continuing onto the neighbouring column's sheet where the curve actually lives. A new pure
function, `markLineSegments` (`lib/geometry/template.ts`), splits every mark's full
stringer-to-curve span into the one or more page-clipped segments needed to draw it in full —
including into the overlap strip a page shares with its column neighbour, exactly like the outline
curve itself is already clipped per page — and never past the curve into blank paper. Printed
dimension labels stay on the column-0 segment, inside the box region, unchanged from before.

**2. The 2"×2" scale-check square, its caption, and the how-to instructions box sat outside the
alignment box, in the overlap strip a neighbouring sheet gets taped over.** These three pieces of
page-0 furniture were anchored to the page's own raw printable edge (`paperWidthMm - margin`,
`margin`), which only coincides with the alignment box's own edge when a board is narrow enough to
tile as a single column — on any multi-column board (most real boards, per plan 03-03's own
round-1 note that even the default shortboard preset already tiles two columns) the box is inset
from the printable edge by the tile overlap, and the furniture landed in that inset strip instead.
`scaleSquareRect` and `howToBoxRect` are now anchored to the page's own alignment box
(`templatePageBoxes`) via a shared `pageBoxRect` helper, not the raw page edge. A new exported pair,
`templatePageZeroBoxRect` and `rectContains`, gives a direct containment test — every furniture
rectangle from `templatePageZeroFurnitureRects` is asserted to sit fully inside the box (with a
1e-6mm floating-point tolerance for edge-flush placements), across every board preset and paper
size, including the forced multi-column case that reproduces the original defect.
Commit: `6ed095e`.

**Verification:** `npm test` (965/965, up from 902/902 baseline), `npx tsc --noEmit` (0 errors
beyond the pre-existing, worktree-only `LayoutProps` phantom errors documented above), and
`npm run lint` (0 errors, the same 9 pre-existing unrelated warnings) all pass. New/updated test
coverage: a `markLineSegments` describe block in `lib/geometry/template.test.ts` (every mark's
segments start at the stringer and the last one stops exactly at the curve, no gap between
consecutive segments, only the column-0 segment carries `hasLabel`, and a forced
maximum-widepoint-width board's widepoint line is asserted to cross more than one page), and a
"page-0 furniture is fully inside the alignment box" describe block in
`components/template/build-template-pdf.test.ts` (every furniture rectangle contained inside
`templatePageZeroBoxRect`, across every preset, both paper sizes, and the forced multi-column
case).

## Self-Check: PASSED

- FOUND: lib/geometry/template.ts (markPlacements, templatePageBoxes, markLineSegments)
- FOUND: components/template/build-template-pdf.ts (templateNameBlockText, templateHowToLines, rectContains)
- FOUND commit: 3ec4363
- FOUND commit: 1b498c3
- FOUND commit: 5135a54 (post-checkpoint fix 1)
- FOUND commit: df1b2e3 (post-checkpoint fix 2)
- FOUND commit: be94ae8 (post-checkpoint fix 3)
- FOUND commit: 931d046 (post-checkpoint fix 4)
- FOUND commit: 49034bc (round 2 post-checkpoint fix 1)
- FOUND commit: f4c1326 (round 2 post-checkpoint fix 2)
- FOUND commit: 6ed095e (round 3 post-checkpoint fix)

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
