---
status: testing
phase: 07-metric-on-paper
source: [07-VERIFICATION.md]
started: 2026-09-06T23:50:00.000Z
updated: 2026-09-06T23:50:00.000Z
---

## Current Test

number: 1
name: The Metric print audit of the Summary order form (this phase's own D-10 commitment — recorded as "Not yet run")
expected: |
  With Metric chosen, open the browser's print preview of /design/summary. On Letter, check
  both sheets for any clipped or cut-off header, row or number — especially the compact rail
  table's section headers, which now carry a unit suffix, and the fin placement panel's
  fixed-height box. Repeat on A4. Then repeat both paper sizes on Imperial to confirm nothing
  changed. No clipped header, row or number on either sheet, at either paper size, in either
  system; Imperial identical to before this phase.
awaiting: user response

## Tests

### 1. The Metric print audit of the Summary order form (this phase's own D-10 commitment — recorded as "Not yet run")
expected: With Metric chosen, print-preview /design/summary on Letter and on A4, checking both sheets for any clipped or cut-off header, row or number (especially the compact rail table's section headers, which now carry a unit suffix, and the fin placement panel's fixed-height box). Repeat both paper sizes on Imperial. No clipping anywhere, in either system; Imperial identical to before this phase.
result: [pending]

### 2. Export a Full Sized Template PDF with Metric chosen and look at the actual rendered page
expected: Station marks read `Nose 30.5 cm — 40.0 cm` etc., the scale-check caption reads `50.8 mm x 50.8 mm — measure before taping`, the how-to box's line 2 matches, and the name/dims block reads correctly. Nothing overlaps or clips, and the drawn board (curve, ticks, alignment box, scale square) looks pixel-identical to the Imperial export apart from label text.
result: [pending]

### 3. Export a Full Sized Template with Imperial chosen — the shaper who never touched the chooser
expected: The page looks exactly as it did before this phase, on a side-by-side glance rather than just the byte-identity unit tests.
result: [pending]

### 4. Export a Paper Saver PDF with Metric chosen and inspect an actual page join
expected: The registration line reads `914 mm from tail — rail 273 mm` (or the board-specific equivalent), fits cleanly without crowding the numeral column, and mark labels and the scale caption don't overlap or clip.
result: [pending]

### 5. Export a Paper Saver with Imperial chosen
expected: Identical to what it printed before this phase.
result: [pending]

### 6. Export an Overview Sheet PDF with Metric chosen
expected: Spec block (`Length: 188.0 cm`, depths in mm, one cm² area figure), the length callout, the dashed station names (`NOSE @ 30.5 cm` / `TAIL @ 30.5 cm`) and the widepoint offset label all read correctly without overlap or clipping; the drawn board sits at the same page position as the Imperial export.
result: [pending]

### 7. Export an Overview Sheet with Imperial chosen
expected: Identical to the pre-phase page.
result: [pending]

### 8. A board whose widepoint offset falls in the narrow window where one system merges the WIDEPOINT/CENTER dashed line and the other keeps them separate
expected: Both printed Overview Sheets read sensibly — no directional label drawn for an offset that prints as zero, and no doubled label where one line was expected.
result: [pending]

### 9. A Metric Full Sized Template for an edge-case board — a very short name against a wide dims row, or a preset near the wide/interior placement boundary
expected: The name block, how-to box and scale square never overlap or spill outside the alignment box, matching what the frozen pins prove for Imperial. (Covers code review finding WR-01: the page-0 furniture containment tests never run against a Metric options object. The reviewer confirmed all four shipped presets plus three edge-case variants pass containment in Metric today, so this is a coverage gap rather than a known defect.)
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
