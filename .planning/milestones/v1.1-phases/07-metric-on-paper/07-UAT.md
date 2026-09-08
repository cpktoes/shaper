---
status: complete
phase: 07-metric-on-paper
source: [07-VERIFICATION.md]
started: 2026-09-06T23:50:00.000Z
updated: 2026-09-07T00:15:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. The Metric print audit of the Summary order form (this phase's own D-10 commitment — recorded as "Not yet run")
expected: With Metric chosen, print-preview /design/summary on Letter and on A4, checking both sheets for any clipped or cut-off header, row or number (especially the compact rail table's section headers, which now carry a unit suffix, and the fin placement panel's fixed-height box). Repeat both paper sizes on Imperial. No clipping anywhere, in either system; Imperial identical to before this phase.
result: pass — automated print-path audit (2026-09-06): fired the real `beforeprint` handler on /design/summary in both systems; both sheets land at zoom 1 (988px content in a 991px box) with ZERO clipped elements across 719 checked nodes, compact rail table headers and fin panel included. `useOrderFormPrintFit` targets the narrower of Letter/A4 and the shorter of the two, so the single measured box (733 x 991 px) IS the Letter/A4 intersection — one pass covers both papers. Imperial page text and drawing operators are byte-identical to the pre-phase build. Separate observation logged under Deferred Follow-Ups.

### 2. Export a Full Sized Template PDF with Metric chosen and look at the actual rendered page
expected: Station marks read `Nose 30.5 cm — 40.0 cm` etc., the scale-check caption reads `50.8 mm x 50.8 mm — measure before taping`, the how-to box's line 2 matches, and the name/dims block reads correctly. Nothing overlaps or clips, and the drawn board (curve, ticks, alignment box, scale square) looks pixel-identical to the Imperial export apart from label text.
result: pass — rendered the Metric template page 1: scale caption `50.8 mm x 50.8 mm - measure before taping`, how-to line 2 matching, dims row `Length 188.0 - Nose 28.6 - Widepoint 47.6 - Offset -2.5 - Tail 36.0 - Thickness 6.4 cm - Volume 34.0 L`. Against the Imperial page, exactly 1 of 152 drawing operators differs: the name-block box height (25.6mm -> 21.4mm, one fewer wrapped line). Curve, ticks, alignment box, scale square, tiling identical.

### 3. Export a Full Sized Template with Imperial chosen — the shaper who never touched the chooser
expected: The page looks exactly as it did before this phase, on a side-by-side glance rather than just the byte-identity unit tests.
result: pass — rebuilt every Imperial PDF from pre-phase commit 625322d and compared page content streams: template (16 and 24 pages), all IDENTICAL, text and drawing operators alike.

### 4. Export a Paper Saver PDF with Metric chosen and inspect an actual page join
expected: The registration line reads `914 mm from tail — rail 273 mm` (or the board-specific equivalent), fits cleanly without crowding the numeral column, and mark labels and the scale caption don't overlap or clip.
result: pass — rendered the Metric Paper Saver page 1: registration line reads `1690 mm from tail - rail 102 mm` (whole millimetres, D-03), scale caption correct, name block dims row in centimetres. Exactly 1 of 126 drawing operators differs from Imperial — the same name-block box height. Page count identical (11 and 15).

### 5. Export a Paper Saver with Imperial chosen
expected: Identical to what it printed before this phase.
result: pass — Imperial Paper Saver page content streams byte-identical to the pre-phase build across all 26 pages.

### 6. Export an Overview Sheet PDF with Metric chosen
expected: Spec block (`Length: 188.0 cm`, depths in mm, one cm² area figure), the length callout, the dashed station names (`NOSE @ 30.5 cm` / `TAIL @ 30.5 cm`) and the widepoint offset label all read correctly without overlap or clipping; the drawn board sits at the same page position as the Imperial export.
result: pass — rendered the Metric Overview Sheet: `Length: 188.0 cm`, depths in mm, `Template Area: 6728 cm2` with the sq-ft parenthetical dropped, `NOSE @ 30.5 cm` / `TAIL @ 30.5 cm`, length callout a single centimetre figure. ZERO geometry differences against Imperial — the only content-stream difference is the offset label text itself. Spec-block line wrapping is identical in style to Imperial's (pre-existing), and Metric is one line shorter.

### 7. Export an Overview Sheet with Imperial chosen
expected: Identical to the pre-phase page.
result: pass — Imperial Overview Sheet content streams byte-identical to the pre-phase build.

### 8. A board whose widepoint offset falls in the narrow window where one system merges the WIDEPOINT/CENTER dashed line and the other keeps them separate
expected: Both printed Overview Sheets read sensibly — no directional label drawn for an offset that prints as zero, and no doubled label where one line was expected.
result: pass — scanned widepoint offsets 0.0-3.0mm in 0.1mm steps: the systems disagree only in the 0.5-0.7mm window. At 0.6mm, Imperial prints `WP Offset: 0"` and draws one merged `WIDEPOINT / CENTER` line (no directional label for an offset it prints as zero); Metric prints `+0.1 cm` and draws two lines with `WP OFFSET - 0.1 cm forward`. Each sheet agrees with its own printed figure.

### 9. A Metric Full Sized Template for an edge-case board — a very short name against a wide dims row, or a preset near the wide/interior placement boundary
expected: The name block, how-to box and scale square never overlap or spill outside the alignment box, matching what the frozen pins prove for Imperial. (Covers code review finding WR-01: the page-0 furniture containment tests never run against a Metric options object. The reviewer confirmed all four shipped presets plus three edge-case variants pass containment in Metric today, so this is a coverage gap rather than a known defect.)
result: pass — ran the page-0 containment and overlap checks in BOTH systems over 9 boards (4 presets, 3 wide variants, an empty name, a 40-character name) x Letter and A4: 38/38 cases contained with no overlaps. Code review finding WR-01 does not reproduce on any of them.

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Deferred Follow-Ups

- test: 1
  idea: "Page 2's closing note reads `All measurements round to the nearest 1/16\" (0.1 cm in cm units) - expect a hair of play when routing to these numbers.` in BOTH systems. On a Metric sheet it leads with inches and claims 0.1 cm precision directly under a column of whole-millimetre numbers (Off-Tail 279 mm, Toe-In 10 mm). The string is a Phase 1 literal in `lib/geometry/fins.ts` - a geometry file deliberately outside the display boundary, which is why no Phase 7 plan touched it and the units-isolation ledger cannot see it. Out of this phase's declared scope; the shaper chose to log it rather than fix it here."
  deferred_at: 2026-09-06

## Gaps
