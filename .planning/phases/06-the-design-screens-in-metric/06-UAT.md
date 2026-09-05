---
status: diagnosed
phase: 06-the-design-screens-in-metric
source: [06-VERIFICATION.md]
started: 2026-09-05T20:43:11.570Z
updated: 2026-09-05T21:45:59.251Z
---

## Current Test

[testing complete]

## Tests

### 1. On the Template Builder with Metric chosen, the Width row reads `Width — 51.4 cm` for a 20 1/4 in board, the thumb moves a millimetre at a time, and the ends of its travel are 40.7 and 63.5. Switch to Imperial and the row is exactly as before.
expected: Metric width slider labels/steps/bounds correct; Imperial byte-identical
result: pass

### 2. On Metric, the Offset row reads with a leading `+` toward the nose and a leading `-` toward the tail, `0 cm` dead centre; Depth on a swallow or diamond tail reads in whole millimetres; the percent and angle rows are unchanged. On Imperial everything reads as it did.
expected: Signed offset formatting and Depth mark-family formatting correct in the live UI
result: pass

### 3. On Metric, the Template viewer's length callout reads a single centimetre figure, the three width callouts read in centimetres with their stations named `@ 30.5 cm`, and the tail block reads `… cm wide`. On Imperial the drawing is unchanged, dual length form included. Check one dark theme as well as Daylight.
expected: Viewer callouts read correctly in both themes
result: pass

### 4. On Metric, the Template Builder and the Volume screen each show one box above the Board Length slider; typing 188 and pressing Enter moves the thumb and re-labels the row to 188.0 cm; the thumb moves a centimetre at a time and stops at 153 and 304. Typing `5 1/2` puts the last good number back with an error line under the box. Switch to Imperial and the two dropdowns are back, unchanged.
expected: Typed Board Length field commits, clamps, reverts on bad input, and Imperial dropdowns are unaffected
result: issue
reported: "the box is not big enough for the text."
severity: minor

### 5. On Metric, the Fins screen's Board Length shows the same typed box, stopping at 122 and 365 cm. Tick "import from template" and the row dims exactly as it did before. On Imperial the dropdowns are unchanged.
expected: Fins Board Length field and import-template dimming behave correctly
result: pass

### 6. On Metric the seven ROCKER sliders read in whole millimetres, move a millimetre at a time, and the two read-outs under the lift sliders name their station in centimetres. The angle and smoothness rows are untouched. On Imperial the sidebar is exactly as it was.
expected: Rocker sidebar sliders and read-outs correct in both systems
result: pass

### 7. On Metric the datasheet's row labels say which unit each row is in, the station columns are named in centimetres, every cell is a bare number, and typing into a thickness cell then tabbing away re-prints it as a whole millimetre. Typing nonsense puts the old number back with an error line. On Imperial the whole table is unchanged.
expected: Rocker datasheet typed cells commit/revert correctly with correct headers
result: pass

### 8. On Metric the rocker drawing's five stations are named in centimetres and every callout number reads in millimetres; the drawing itself has not moved. On Imperial it is unchanged. Check one dark theme as well as Daylight.
expected: Rocker viewer callouts correct and board geometry unchanged, in both themes
result: pass

### 9. On Metric the RAILS sidebar's thickness, Corner Cut and Bottom Tuck 3 rows read in whole millimetres and move a millimetre at a time, the nose and tail thickness rows name their station in centimetres, and the Deck Profile clamp note appears exactly when it did before. On Imperial the sidebar is unchanged.
expected: Rails sidebar sliders and clamp note correct
result: pass

### 10. On Metric the DATA page's rail table shows `(mm)` on each section column and bare numbers in every cell, with any absent value still an em dash and any hard edge still reading Hard Edge. On Imperial the table is unchanged. Open the Summary order form on Metric and confirm its rail card follows — that is the expected part-converted state until Phase 7.
expected: Rail data table headers/cells correct; Summary's embedded rail card follows
result: pass

### 11. On Metric the rail cross-section plot's grid squares are ten millimetres, its ticks count 0, 10, 20 and so on, and one tick per axis says mm; counting squares against the table's marks agrees. On Imperial the plot is pixel-for-pixel what it was.
expected: Rail plot grid/ticks correct and pixel-identical in Imperial
result: pass

### 12. On Metric, the Fins DATA tab's summary line reads its length and tail width each with their own cm, off-tail rows read in centimetres and toe-in and off-rail rows read in whole millimetres in the same group. Open the toe-aim tables: both headings say cm, the title reads in centimetres, and the highlighted column is the same one it was on Imperial. Switch to Imperial and both surfaces are unchanged.
expected: Fin DATA tab and toe-aim modal correct family-by-family
result: issue
reported: "all fin placement data should be in mm"
severity: major

### 13. On Metric the Tail Width row names its station in centimetres and reads its width in centimetres, and each Fin Base Length reads `114 mm standard`; press Override and the box takes whole millimetres, stepping one at a time, refusing anything below 64 or above 190. Tick "Import Template Values" and both rows dim exactly as before. On Imperial the sidebar is unchanged.
expected: Fins sidebar Tail Width/Base Length controls correct
result: pass

### 14. On Metric every Fins slider reads in its right family — positions and off-tail in centimetres, toe-in and off-rail in whole millimetres — and no inch mark is left anywhere on the sidebar, the quad rear heading included. On Imperial the whole sidebar is unchanged.
expected: Every remaining fins slider in correct family, no stray inch marks
result: pass

### 15. On Metric the fin drawing's toe and off-rail callouts read in millimetres and its off-tail callouts in centimetres, each with its own unit; the summary line and the base-length legend follow. Nothing has moved on the drawing. On Imperial it is unchanged. Check one dark theme as well as Daylight.
expected: Fin viewer callouts correct, board unmoved, both themes
result: issue
reported: "all fin dims should be mm"
severity: major

### 16. On Metric the Volume screen's Board Width and Center Thickness read in centimetres and move a millimetre at a time; the card's dimension rows read in centimetres, its cross-section and weighted thickness rows in whole millimetres, its area line in square centimetres and its supporting line in cubic centimetres. The litres figure is the same number it was on Imperial, and the same number the setup screen's card quotes for the same board. On Imperial the whole screen is unchanged.
expected: Volume sidebar and card correct; litres identical across systems and screens
result: pass

### 17. Backstop 1 — no flash of inches on the Summary: with Metric chosen, hard-reload /design/summary and watch the first paint. The outline callouts, the rocker callouts, the rail plot and the rail data table must read metric from the very first frame, with no inch values appearing and no hydration warning in the browser console. Repeat once signed in and once signed out.
expected: No flash of inches, no hydration mismatch, signed in and signed out
result: pass

### 18. Backstop 2 — the order form's overflow audit on Metric: with Metric chosen, open the browser's print preview of /design/summary and re-run the order form's usual overflow check on every compact panel. The compact rail table's section headers now carry a unit suffix, and those panels clip their overflow by design, so confirm no header or row is cut off on paper on both Letter and A4. Record the result in the summary; if anything clips, file it rather than widening a panel here.
expected: No clipped headers/rows on Letter or A4 print preview
result: skipped
reason: "Deferred follow-up: the Summary order form is the same component on screen and on paper; Phase 7 (Metric on Paper, PRNT-01) converts it. User confirmed: leave for Phase 7."

### 19. Sweep the five design screens on Metric looking for any stray inch mark, and on Imperial confirm every screen reads exactly as it did before the phase.
expected: No stray inch marks anywhere in Metric; Imperial fully unchanged
result: pass


## Summary

total: 19
passed: 15
issues: 3
pending: 0
skipped: 1
blocked: 0

## Deferred Follow-Ups

- test: 18
  idea: "Primary dims show in inches.  Fin data also shows in inches. (Summary order form on Metric) — deferred to Phase 7 / PRNT-01 by user decision"
  deferred_at: 2026-09-05

## Gaps
- gap_id: G-06-4
  truth: "Typed Board Length field commits, clamps, reverts on bad input, and Imperial dropdowns are unaffected"
  status: failed
  reason: "User reported: the box is not big enough for the text."
  severity: minor
  test: 4
  root_cause: "components/design/measure-field.tsx pins the typed box at 64px (w-16 min-w-16 max-w-16, 50px of text room) for every family/system/mode, copied from the retired ImperialField which only ever showed short bare datasheet fractions. A Metric board length is always 8 characters (122.0 cm to 365.8 cm) and measures 59-63px in Inter 14px, so 9-13px of it is clipped on the Template, Volume and Fins sidebars. Character count was used as a proxy for pixel width."
  artifacts:
    - path: "components/design/measure-field.tsx"
      issue: "single fixed width class string for both standalone and bare modes; comment justifies fit by character count"
    - path: ".planning/phases/06-the-design-screens-in-metric/06-UI-SPEC.md"
      issue: "lines ~158 and ~234-236 record the 64px reuse as the contract; must be amended with measured widths"
  missing:
    - "Standalone mode (Board Length sites) uses w-24 min-w-24 max-w-24 (96px; lines up with the error line's existing w-24) or at minimum w-20; bare mode (rocker datasheet cells) keeps w-16 so the min-w-[540px] table stays byte-identical"
    - "Rewrite the class comment and the UI-SPEC/06-02 plan wording to state measured widths (Inter 14px: 365.8 cm is about 63px vs a 50px content box) instead of a character count"
    - "Imperial never renders the field (it renders the two Selects), so no Imperial change; the rocker datasheet's bare cells must not change width"
  debug_session: .planning/debug/typed-length-box-too-narrow.md
- gap_id: G-06-12
  truth: "Fin DATA tab and toe-aim modal correct family-by-family"
  status: failed
  reason: "User reported: all fin placement data should be in mm"
  severity: major
  decision: "User decision 2026-09-05: every fin PLACEMENT number (distance up from the tail, off-rail, toe-in) reads in whole millimetres on the DATA tab, the sidebar sliders and the drawing callouts; board length and tail width (summary line, Tail Width slider, toe-aim table headings) stay in centimetres."
  test: 12
  root_cause: "Design decision reversal, not a defect: Phase 6's D-01 table (06-CONTEXT.md line ~75) classified fin off-tail positions as the cm 'dim' family, and plans 06-05/06-06 implemented it at nine sites: family: 'dim' on the three Off-Tail rows in lib/geometry/fins.ts (lines ~905, 934, 959), four formatDim calls on off-tail values in components/fins/fin-controls.tsx (~556, 594-597, 684, 707) and one formatDim on the off-tail callout in components/fins/fin-viewer.tsx (~224). Toe-in, off-rail, off-stringer, full spread and base length were already 'mark'. Slider domains already step 1 mm; Imperial output is structurally identical for both formatters."
  artifacts:
    - path: "lib/geometry/fins.ts"
      issue: "Off-Tail rows tagged family: 'dim' at ~905/934/959; doc comment ~137-142 and toeAimTableFor comment ~1171-1174 cite the old D-01 rationale"
    - path: "components/fins/fin-controls.tsx"
      issue: "formatDim on placement numbers at ~556, ~594-597, ~684, ~707; comment ~270-273"
    - path: "components/fins/fin-viewer.tsx"
      issue: "formatDim(mark.offTail) at ~224; comment ~220-221"
    - path: "lib/geometry/fins.test.ts"
      issue: "lines ~454/479/494 pin toBe('dim') for the off-tail rows; describe/it titles ~444-484 describe the old split"
  missing:
    - "Flip the three Off-Tail family tags to 'mark' and the five formatDim placement calls to formatMark; no arithmetic, slider bound or storage change"
    - "Keep board dims in cm: fin-controls Tail Width (~385) and Board Length (~321), fin-data-panel summary line (~43-45), fin-viewer compact heading (~563), toe-aim modal title (~42-43), fins.ts toe-aim columns/rowLabel/identicalFromLabel (~1187-1192)"
    - "Update fins.test.ts expectations (derive strings via inchesToMm -> formatMark, never hand-typed); golden-parity blocks and fullSpreadFamily tests stay untouched and green"
    - "Record the superseding decision in 06-CONTEXT.md D-01 (~75, ~342) and 06-UI-SPEC.md (~152, ~328-330); consider adding fin placement numbers to CLAUDE.md Rule 2's Marks list"
    - "Toe-aim table CELL values (aim distances off the stringer): pending shaper decision, see G-06-12 decision field"
  debug_session: .planning/debug/fin-placement-numbers-in-cm.md
- gap_id: G-06-15
  truth: "Fin viewer callouts correct, board unmoved, both themes"
  status: failed
  reason: "User reported: all fin dims should be mm"
  severity: major
  decision: "Same root as G-06-12 — fix together; fin drawing off-tail callouts, summary line's off-tail figures and base-length legend read in mm; board dims stay cm."
  related: G-06-12
  test: 15
  root_cause: "Same root cause as G-06-12: components/fins/fin-viewer.tsx formats the off-tail callout with formatDim (~224) because the model tags off-tail as 'dim'. Fix together with G-06-12."
  artifacts:
    - path: "components/fins/fin-viewer.tsx"
      issue: "formatDim(mark.offTail, system) at ~224 renders the off-tail callout in cm"
  missing:
    - "Switch the off-tail callout to formatMark; the compact heading (~563, board length + tail width) stays cm and the base-length legend (~598) is already mm"
  debug_session: .planning/debug/fin-placement-numbers-in-cm.md
