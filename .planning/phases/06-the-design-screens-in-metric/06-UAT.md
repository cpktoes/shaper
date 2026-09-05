---
status: testing
phase: 06-the-design-screens-in-metric
source: [06-VERIFICATION.md]
started: 2026-09-05T20:43:11.570Z
updated: 2026-09-05T20:43:11.570Z
---

## Current Test

number: 1
name: On the Template Builder with Metric chosen, the Width row reads `Width — 51.4 cm` for a 20 1/4 in board, the thumb moves a millimetre at a time, and the ends of its travel are 40.7 and 63.5. Switch to Imperial and the row is exactly as before.
expected: |
  Metric width slider labels/steps/bounds correct; Imperial byte-identical
awaiting: user response

## Tests

### 1. On the Template Builder with Metric chosen, the Width row reads `Width — 51.4 cm` for a 20 1/4 in board, the thumb moves a millimetre at a time, and the ends of its travel are 40.7 and 63.5. Switch to Imperial and the row is exactly as before.
expected: Metric width slider labels/steps/bounds correct; Imperial byte-identical
result: [pending]

### 2. On Metric, the Offset row reads with a leading `+` toward the nose and a leading `-` toward the tail, `0 cm` dead centre; Depth on a swallow or diamond tail reads in whole millimetres; the percent and angle rows are unchanged. On Imperial everything reads as it did.
expected: Signed offset formatting and Depth mark-family formatting correct in the live UI
result: [pending]

### 3. On Metric, the Template viewer's length callout reads a single centimetre figure, the three width callouts read in centimetres with their stations named `@ 30.5 cm`, and the tail block reads `… cm wide`. On Imperial the drawing is unchanged, dual length form included. Check one dark theme as well as Daylight.
expected: Viewer callouts read correctly in both themes
result: [pending]

### 4. On Metric, the Template Builder and the Volume screen each show one box above the Board Length slider; typing 188 and pressing Enter moves the thumb and re-labels the row to 188.0 cm; the thumb moves a centimetre at a time and stops at 153 and 304. Typing `5 1/2` puts the last good number back with an error line under the box. Switch to Imperial and the two dropdowns are back, unchanged.
expected: Typed Board Length field commits, clamps, reverts on bad input, and Imperial dropdowns are unaffected
result: [pending]

### 5. On Metric, the Fins screen's Board Length shows the same typed box, stopping at 122 and 365 cm. Tick "import from template" and the row dims exactly as it did before. On Imperial the dropdowns are unchanged.
expected: Fins Board Length field and import-template dimming behave correctly
result: [pending]

### 6. On Metric the seven ROCKER sliders read in whole millimetres, move a millimetre at a time, and the two read-outs under the lift sliders name their station in centimetres. The angle and smoothness rows are untouched. On Imperial the sidebar is exactly as it was.
expected: Rocker sidebar sliders and read-outs correct in both systems
result: [pending]

### 7. On Metric the datasheet's row labels say which unit each row is in, the station columns are named in centimetres, every cell is a bare number, and typing into a thickness cell then tabbing away re-prints it as a whole millimetre. Typing nonsense puts the old number back with an error line. On Imperial the whole table is unchanged.
expected: Rocker datasheet typed cells commit/revert correctly with correct headers
result: [pending]

### 8. On Metric the rocker drawing's five stations are named in centimetres and every callout number reads in millimetres; the drawing itself has not moved. On Imperial it is unchanged. Check one dark theme as well as Daylight.
expected: Rocker viewer callouts correct and board geometry unchanged, in both themes
result: [pending]

### 9. On Metric the RAILS sidebar's thickness, Corner Cut and Bottom Tuck 3 rows read in whole millimetres and move a millimetre at a time, the nose and tail thickness rows name their station in centimetres, and the Deck Profile clamp note appears exactly when it did before. On Imperial the sidebar is unchanged.
expected: Rails sidebar sliders and clamp note correct
result: [pending]

### 10. On Metric the DATA page's rail table shows `(mm)` on each section column and bare numbers in every cell, with any absent value still an em dash and any hard edge still reading Hard Edge. On Imperial the table is unchanged. Open the Summary order form on Metric and confirm its rail card follows — that is the expected part-converted state until Phase 7.
expected: Rail data table headers/cells correct; Summary's embedded rail card follows
result: [pending]

### 11. On Metric the rail cross-section plot's grid squares are ten millimetres, its ticks count 0, 10, 20 and so on, and one tick per axis says mm; counting squares against the table's marks agrees. On Imperial the plot is pixel-for-pixel what it was.
expected: Rail plot grid/ticks correct and pixel-identical in Imperial
result: [pending]

### 12. On Metric, the Fins DATA tab's summary line reads its length and tail width each with their own cm, off-tail rows read in centimetres and toe-in and off-rail rows read in whole millimetres in the same group. Open the toe-aim tables: both headings say cm, the title reads in centimetres, and the highlighted column is the same one it was on Imperial. Switch to Imperial and both surfaces are unchanged.
expected: Fin DATA tab and toe-aim modal correct family-by-family
result: [pending]

### 13. On Metric the Tail Width row names its station in centimetres and reads its width in centimetres, and each Fin Base Length reads `114 mm standard`; press Override and the box takes whole millimetres, stepping one at a time, refusing anything below 64 or above 190. Tick "Import Template Values" and both rows dim exactly as before. On Imperial the sidebar is unchanged.
expected: Fins sidebar Tail Width/Base Length controls correct
result: [pending]

### 14. On Metric every Fins slider reads in its right family — positions and off-tail in centimetres, toe-in and off-rail in whole millimetres — and no inch mark is left anywhere on the sidebar, the quad rear heading included. On Imperial the whole sidebar is unchanged.
expected: Every remaining fins slider in correct family, no stray inch marks
result: [pending]

### 15. On Metric the fin drawing's toe and off-rail callouts read in millimetres and its off-tail callouts in centimetres, each with its own unit; the summary line and the base-length legend follow. Nothing has moved on the drawing. On Imperial it is unchanged. Check one dark theme as well as Daylight.
expected: Fin viewer callouts correct, board unmoved, both themes
result: [pending]

### 16. On Metric the Volume screen's Board Width and Center Thickness read in centimetres and move a millimetre at a time; the card's dimension rows read in centimetres, its cross-section and weighted thickness rows in whole millimetres, its area line in square centimetres and its supporting line in cubic centimetres. The litres figure is the same number it was on Imperial, and the same number the setup screen's card quotes for the same board. On Imperial the whole screen is unchanged.
expected: Volume sidebar and card correct; litres identical across systems and screens
result: [pending]

### 17. Backstop 1 — no flash of inches on the Summary: with Metric chosen, hard-reload /design/summary and watch the first paint. The outline callouts, the rocker callouts, the rail plot and the rail data table must read metric from the very first frame, with no inch values appearing and no hydration warning in the browser console. Repeat once signed in and once signed out.
expected: No flash of inches, no hydration mismatch, signed in and signed out
result: [pending]

### 18. Backstop 2 — the order form's overflow audit on Metric: with Metric chosen, open the browser's print preview of /design/summary and re-run the order form's usual overflow check on every compact panel. The compact rail table's section headers now carry a unit suffix, and those panels clip their overflow by design, so confirm no header or row is cut off on paper on both Letter and A4. Record the result in the summary; if anything clips, file it rather than widening a panel here.
expected: No clipped headers/rows on Letter or A4 print preview
result: [pending]

### 19. Sweep the five design screens on Metric looking for any stray inch mark, and on Imperial confirm every screen reads exactly as it did before the phase.
expected: No stray inch marks anywhere in Metric; Imperial fully unchanged
result: [pending]

## Summary

total: 19
passed: 0
issues: 0
pending: 19
skipped: 0
blocked: 0

## Gaps
