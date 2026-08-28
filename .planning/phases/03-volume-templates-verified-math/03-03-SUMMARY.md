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

## Self-Check: PASSED

- FOUND: lib/geometry/template.ts (markPlacements, matchMarkPositions)
- FOUND: components/template/build-template-pdf.ts (templateNameBlockText, templateHowToLines)
- FOUND commit: 3ec4363
- FOUND commit: 1b498c3

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
