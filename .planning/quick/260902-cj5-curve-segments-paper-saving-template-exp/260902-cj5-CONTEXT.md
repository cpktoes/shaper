# Quick Task 260902-cj5: Paper-saving rail-strip template export - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Task Boundary

Add a third card to the Template export dialog that prints the board's half-outline as a
**continuous single-column strip of landscape pages at true 1:1**, each page slid sideways so
only the rail curve region is printed — the founder's "paper saving option". The reference
artifact is `blending curves_egg_D_7_10_22_5.pdf` (Chris's Downloads; analysed in full below).
Geometry in `lib/geometry/template.ts` (pure, unit-tested — Rule 1); drawing in
`components/template/` (the only place jsPDF is imported); the card in
`export-preview-dialog.tsx`. The existing Overview Sheet and Full Template artifacts must be
byte-for-byte unaffected.

</domain>

<decisions>
## Implementation Decisions

### Straight middle pages — PRINT EVERY PAGE (locked)
- Faithful to the reference: the strip runs nose to tail with no pages omitted, including the
  near-straight middle. No straightness tolerance, no automatic skipping, no "optional" flags.
- The founder's "blend by hand" workflow is enabled by the line labels below, not by the layout
  omitting anything. A shaper may simply not tape the middle pages.

### Page furniture — SCALE SQUARE + NAME/DIMS BLOCK ON PAGE 1; NUMBER + LINES ON EVERY PAGE (locked)
- Page 1 (nose end) carries the 2in scale square and the board name/dims block, using the SAME
  conventions and drawing helpers the full template already uses (`SCALE_SQUARE_MM`,
  `nameBlockPlacement`/dims row). One scale check per printed set.
- Every page carries: the rail curve for its station band, the two horizontal registration
  lines, and a large page number (the reference's own idiom — a big numeral, not a caption).
- The working station marks (nose 12in, tail 12in, centre, widepoint, tail block when squared)
  are drawn on whichever page they fall, in the full template's existing mark grammar.
- No per-page box border, no per-page scale square, no how-to box. As clean as the reference
  apart from page 1's identification and scale check.

### Registration-line labels — STATION AND RAIL HALF-WIDTH ON EVERY LINE (locked)
- Each registration line is labelled with its station (distance from the tail) and the rail's
  half-width where the curve crosses it, in the app's imperial-fraction format via
  `lib/geometry/units.ts` (Rule 2) — e.g. `36" from tail — rail 10 3/4"`.
- Because page N's bottom line and page N+1's top line are the same station, the same label
  appears on both, which is what lets a shaper mark the blank from either page and blend by hand
  between any two.

### Claude's Discretion
- **Horizontal positioning rule per page** (the "slide"): the reference keeps the curve toward
  the RIGHT of the page and draws the stringer only when it lands on the page (pages 1, 12–14
  of 14). Choose a deterministic rule (e.g. the page's max half-width sits a fixed inset from the
  right printable edge; draw the stringer when its x falls inside the printable area) and pin it
  by test. It must be a pure function of geometry + paper, never of a page's neighbours.
- **Station band per page and overlap**: derive from the landscape paper's SHORT edge minus
  margins (the station axis runs top-to-bottom on a landscape page), reusing
  `TEMPLATE_MARGIN_MM`/`TEMPLATE_OVERLAP_MM` unless a reason to differ is stated. The reference's
  lines sit ~0.67in from the top/bottom edges (≈7.17in band on Letter).
- **Page order**: nose first (page 1 = nose tip), matching the full template's row order.
- **Card copy and name**: the founder calls it the "paper saving option"; the todo's title was
  "Curve segments — saves paper", but the artifact is a continuous strip, not segments — do not
  call it "segments". Something like "Paper Saver" with a one-line description. The dialog is
  `sm:max-w-sm` and its card row was sized for TWO cards; a third must not crowd or overflow —
  stacking the cards vertically or another layout adjustment is in scope if needed. "Full
  Template" stays the default selection.
- **Tile diagram / preview**: the dialog previews the full template's tile grid; decide whether
  the strip shows a page-count line, a simple strip diagram, or reuses the diagram component.
  Must not regress the existing two artifacts' previews.
- **Paper sizes**: both `letter` and `a4`, landscape, honouring the existing `PaperSize` union.
- **File name** of the downloaded PDF: parallel the existing artifacts' naming.

</decisions>

<specifics>
## Specific Ideas — the reference PDF, analysed page by page

Source: `/Users/kontoes/Downloads/blending curves_egg_D_7_10_22_5.pdf` (egg, 7'10" × 22.5").
Rendered pages (Quick Look, one PNG per page) at
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/refpages/pNN.pdf.png`
(session scratch — re-render from the PDF if missing: split with pypdf, `qlmanage -t` each page).

- 14 pages, ALL Letter landscape (11.00 × 8.50in). Each page's only text is its number.
- Each page: the rail curve running top→bottom, TWO horizontal lines (≈0.67in from the top and
  bottom edges → a ≈7.17in station band), and one large numeral. 14 × ~6.7in step ≈ 94in = the
  whole 7'10" board — the strip is CONTINUOUS, middle included.
- **Per-page horizontal translation, proven**: the stringer's x differs page to page where it is
  visible — p1 ≈1.34in, p12 ≈0.98in, p13/p14 ≈2.2in from the left edge — and on p7 (widepoint,
  half-width 11.25in) the curve sits ≈9.5in from the left edge, so a fixed stringer would be
  off-page. The stringer is drawn only where it fits: p1 (nose tip meets it), p12–p14 (tail
  narrows to it). Pages 2–11 show no stringer.
- Pages 4–10 are nearly straight (the board's middle) and are still printed.
- Nose tip (p1) and tail tip (p14) close onto the stringer; the tail here is rounded (no squared
  tail block).
- The two lines per page are the tile boundaries: consecutive pages share a station at page N's
  bottom line / page N+1's top line — that is the alignment mechanism ("blending curves" = mark
  the crossings, fair the curve between them).

</specifics>

<canonical_refs>
## Canonical References

- `.planning/todos/pending/2026-08-28-blending-curves-paper-saving-template-option.md` — the
  founder's original capture (note: it describes "segments"; the artifact is a continuous strip —
  this CONTEXT supersedes that wording).
- `lib/geometry/template.ts` — `computeTemplateLayout`/`TemplatePage` (the portrait tile grid
  this strip parallels), `computeTemplateMarks`, `markPlacements`, `nameBlockPlacement`,
  `PAPER_MM`, `TEMPLATE_MARGIN_MM`, `TEMPLATE_OVERLAP_MM`.
- `components/template/build-template-pdf.ts` — the full template's drawing conventions to
  reuse (scale square, name/dims block, mark grammar, line weights); the only jsPDF importer.
- `components/template/export-preview-dialog.tsx` — `ARTIFACT_CARDS`, `ExportArtifact`, the
  download branch; the dialog is `sm:max-w-sm`.
- CLAUDE.md Rule 1 (geometry pure + tested, golden values never hand-typed) and Rule 2 (inches on
  screen/paper, mm in data, every conversion through `lib/geometry/units.ts`).

</canonical_refs>
