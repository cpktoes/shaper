---
status: testing
phase: 01-foundation-port-deploy-the-design-tool
source: [01-VERIFICATION.md]
started: 2026-08-21T16:19:09Z
updated: 2026-08-21T16:19:09Z
---

## Current Test

number: 1
name: Fin configuration switching on production
expected: |
  Each configuration shows a plausible, correctly overlaid fin placement with numbers
  that change sensibly between configs; no stale marks from a previous config remain.
awaiting: user response

## Tests

### 1. Switch fin configuration between single, thruster, quad, and twin/2+1 on https://shaper-coral.vercel.app/design/fins and confirm calculated placement (position, angle, toe) and overlay redraw correctly for each
expected: Each configuration shows a plausible, correctly overlaid fin placement with numbers that change sensibly between configs; no stale marks from a previous config remain.
result: [pending]

### 2. Adjust rail-band controls (family, ratio, deck profile, corner cut, single tuck) on /design/rails for nose/center/tail sections against production and confirm numbers and cross-section plot recalculate live
expected: Each section's calculated dimensions (thickness/apex/tuck marks) update immediately and match what a shaper would expect for the adjustment made.
result: [pending]

### 3. Visually check unit display (inches for dimensions, litres for volume) on each of the five design screens individually against production
expected: No raw millimetre value ever appears under an inch label anywhere on any of the five screens.
result: [pending]

### 4. Confirm preset card descriptors never wrap to a second line or truncate at the preset grid's minimum supported card width
expected: Descriptor text stays on one line at all supported widths.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
