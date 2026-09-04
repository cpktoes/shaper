---
status: passed
phase: 01-foundation-port-deploy-the-design-tool
source: [01-VERIFICATION.md]
started: 2026-08-21T16:20:00Z
updated: 2026-08-21T16:46:52Z
---

## Current Test

number: 4
name: Preset card descriptors never wrap
expected: |
  Descriptor text stays on one line at all supported widths.
awaiting: none — all tests resolved

## Tests

### 1. Switch fin configuration between single, thruster, quad, and twin/2+1 on production and confirm calculated placement and overlay redraw correctly
expected: Each configuration shows a plausible, correctly overlaid fin placement with numbers that change sensibly between configs; no stale marks from a previous config remain.
result: pass
source: automated (browser verification against production)
evidence: |
  Fin marker counts match fin counts exactly (2 edge points per fin):
  Single Fin=2 circles/6 lines, Twin=4/14, Thruster=6/18, 2+1=6/18, Quad=8/25.
  Callout sets change per config with no stale labels carried over — e.g. Single Fin
  shows only 14 3/4" / Tail @ 12" / 5 1/2", none of Thruster's 11" / 3/8" / 1 3/16" / 3 5/16".

### 2. Adjust rail-band controls on /design/rails and confirm numbers and cross-section plot recalculate live
expected: Each section's calculated dimensions update immediately and match what a shaper would expect for the adjustment made.
result: pass
source: automated (browser verification against production)
evidence: |
  Nose thickness input 1.3125 -> 1.75 moved the label from 1 5/16" to 1 3/4" (correct
  fractional formatting) and changed the plot geometry signature (hash -1904033980 ->
  2100547400). Center (2 1/2") and Tail (1 9/16") correctly unchanged — section scoping holds.
  Deck-profile and ratio controls also re-drove plot geometry. Ratio input (min 30 / max 70,
  value 60) renders "Ratio — 60/40" correctly.

### 3. Visually check unit display (inches, litres) on each of the five design screens
expected: No raw millimetre value ever appears under an inch label anywhere on any of the five screens.
result: pass
source: automated (browser verification against production)
evidence: |
  Audited /design/outline, /design/rails, /design/volume, /design/fins, /design/summary.
  Zero mm/cm matches, zero suspicious bare numbers in the 300-3000 range on every screen.
  Inches render as feet-and-inches and fractions (6'0", 14 3/4", 1 5/16"); litres render
  as "25.78 L" on Volume and Summary.

### 4. Confirm preset card descriptors never wrap to a second line or truncate
expected: Descriptor text stays on one line at all supported widths.
result: pass (accepted with amendment)
source: automated (browser verification) + user decision
evidence: |
  Measured via Range.getClientRects: all four descriptors render 2 line boxes at full
  1280px desktop width (cards 188px wide, white-space: normal, no truncation).
  The declared truth is therefore NOT met as written — it was over-specified at plan time.
  User reviewed and accepted the two-line descriptors as-is: "#4 can stay as is."
  No truncation or overflow occurs; only the one-line constraint is waived.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None blocking phase completion. Test 4's declared "single line" constraint was waived by
explicit user decision rather than met; recorded above as accepted-with-amendment.
