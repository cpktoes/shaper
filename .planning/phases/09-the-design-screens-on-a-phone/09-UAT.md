---
status: testing
phase: 09-the-design-screens-on-a-phone
source: [09-VERIFICATION.md]
started: 2026-09-09T10:33:06.945Z
updated: 2026-09-09T10:33:06.945Z
---

## Current Test

number: 1
name: On a real iPhone in Safari, open each design screen and scroll the controls so the dynamic toolbar collapses and re-expands.
expected: |
  The pinned drawing area is never clipped, the bottom tab bar stays visible, and scrolling never gets trapped.
awaiting: user response

## Tests

### 1. On a real iPhone in Safari, open each design screen and scroll the controls so the dynamic toolbar collapses and re-expands.
expected: The pinned drawing area is never clipped, the bottom tab bar stays visible, and scrolling never gets trapped.
result: [pending]

### 2. On a real iPhone, tap a typed number field (e.g. Board Length in Metric, a rail mark, a fin placement number).
expected: The page does not zoom in on focus.
result: [pending]

### 3. On a real iPhone, press and hold one of the outline's or rocker's drag points for two seconds, then drag.
expected: No text-selection callout or magnifier interrupts the drag.
result: [pending]

### 4. On a desktop browser at least 820px wide, across all five design screens: tab to every sidebar control and operate it with the keyboard (arrow keys on sliders, focus rings on buttons/checkboxes/selects), click every button and drag every slider with the mouse, press the rotate button, the construction toggle and the wide-view toggle.
expected: Every control behaves exactly as it does on the currently deployed site — nothing moved, resized, or changed behaviour.
result: [pending]

### 5. Hold an iPhone-sized phone in hand on the ROCKER screen at the default board and look at the side-profile drawing, which is narrower than the pinned drawing area (about 322x341px measured on an iPhone-14-class screen, versus the pinned area's own width).
expected: The founder confirms the narrower rocker drawing still reads clearly enough in the hand, per D-18's accepted trade-off (the board stays upright with the phone rather than lying flat to fill the width).
result: [pending]

### 6. Print a rail cross-section from a real phone's View Full Sized dialog (Print button) and measure the printed page with a ruler, in both Imperial and Metric.
expected: The printed rail is ruler-true (1:1), matching Phase 8's own desktop guarantee, even though the on-screen phone view shows it shrunk with the plain 'Shown smaller than actual size' line and no check bar.
result: [pending]

### 7. At 360px wide in the Metric system, read the RAILS INSTRUCTIONS tab end to end (the example rail card, the three-step copy, the legend grid, the plan/side figure, the closing note).
expected: Nothing clips, overlaps, or truncates, and the cm-formatted numbers read correctly.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
