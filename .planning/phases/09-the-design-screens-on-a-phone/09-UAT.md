---
status: diagnosed
phase: 09-the-design-screens-on-a-phone
source: [09-VERIFICATION.md]
started: 2026-09-09T10:33:06.945Z
updated: 2026-09-09T18:02:59.575Z
---

## Current Test

[testing complete]

## Tests

### 1. On a real iPhone in Safari, open each design screen and scroll the controls so the dynamic toolbar collapses and re-expands.
expected: The pinned drawing area is never clipped, the bottom tab bar stays visible, and scrolling never gets trapped.
result: pass

### 2. On a real iPhone, tap a typed number field (e.g. Board Length in Metric, a rail mark, a fin placement number).
expected: The page does not zoom in on focus.
result: pass

### 3. On a real iPhone, press and hold one of the outline's or rocker's drag points for two seconds, then drag.
expected: No text-selection callout or magnifier interrupts the drag.
result: pass

### 4. On a desktop browser at least 820px wide, across all five design screens: tab to every sidebar control and operate it with the keyboard (arrow keys on sliders, focus rings on buttons/checkboxes/selects), click every button and drag every slider with the mouse, press the rotate button, the construction toggle and the wide-view toggle.
expected: Every control behaves exactly as it does on the currently deployed site — nothing moved, resized, or changed behaviour.
result: issue
reported: "all functions but you cannot tell which slider you're on when tabbing though, theres no indicator which you've selected and even the tail shape icons barely show which is currently selected wiht the tab"
severity: major

### 5. Hold an iPhone-sized phone in hand on the ROCKER screen at the default board and look at the side-profile drawing, which is narrower than the pinned drawing area (about 322x341px measured on an iPhone-14-class screen, versus the pinned area's own width).
expected: The founder confirms the narrower rocker drawing still reads clearly enough in the hand, per D-18's accepted trade-off (the board stays upright with the phone rather than lying flat to fill the width).
result: pass

### 6. Print a rail cross-section from a real phone's View Full Sized dialog (Print button) and measure the printed page with a ruler, in both Imperial and Metric.
expected: The printed rail is ruler-true (1:1), matching Phase 8's own desktop guarantee, even though the on-screen phone view shows it shrunk with the plain 'Shown smaller than actual size' line and no check bar.
result: issue
reported: "print buttons dont do anything"
severity: major

### 7. At 360px wide in the Metric system, read the RAILS INSTRUCTIONS tab end to end (the example rail card, the three-step copy, the legend grid, the plan/side figure, the closing note).
expected: Nothing clips, overlaps, or truncates, and the cm-formatted numbers read correctly.
result: pass

## Summary

total: 7
passed: 5
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-09-6
  truth: "The printed rail is ruler-true (1:1), matching Phase 8's own desktop guarantee, even though the on-screen phone view shows it shrunk with the plain 'Shown smaller than actual size' line and no check bar."
  status: failed
  reason: "User reported: print buttons dont do anything"
  severity: major
  test: 6
  root_cause: "CONFIRMED on the device (2026-09-09): printing works when the address is typed into Safari itself; the site had been launched from a Home-Screen icon, which iOS 26 opens as a standalone web app by default, and window.print() is a silent no-op there. The page does its part: on a phone the tap reaches the Print button and window.print() runs synchronously inside a live user activation (measured with a counting stub on both phone projects, on the dev build and on the deployed site). Underlying gap: window.print() is the only phone print path, nothing detects standalone mode, and nothing ever confirmed a phone can print; Playwright cannot exercise the native print step."
  artifacts:
    - path: "components/rails/view-full-sized-dialog.tsx"
      issue: "the phone's only print path is a bare onClick window.print() (line ~281); correct, but a no-op in an iOS standalone web app with no fallback"
    - path: "components/summary/use-print-fit.ts"
      issue: "printOrderForm is the same bare window.print() (line ~162), so SUMMARY (Phase 10's screen) shares the cause; its button also sits partly off a phone's left edge"
    - path: "e2e/phone-rails.spec.ts"
      issue: "the phone dialog test stops at 'Print button is visible' and never asserts the handler runs"
  missing:
    - "FOUNDER DECISION (2026-09-09): detect the Home-Screen web app (standalone display mode) and, in the View Full Sized dialog on a phone, replace the Print button with a plain note telling the shaper to open this page in Safari to print; printing itself stays exactly as it is. No PDF path in this phase."
    - "A phone-project e2e asserting that tapping Print calls a stubbed window.print in the normal (Safari) case, and that the standalone case shows the note instead"
    - "SUMMARY's print buttons share the cause but are Phase 10's screen: note only"
  debug_session: ".planning/debug/phone-print-button-does-nothing.md"
- gap_id: G-09-4
  truth: "Every control behaves exactly as it does on the currently deployed site — nothing moved, resized, or changed behaviour."
  status: failed
  reason: "User reported: all functions but you cannot tell which slider you're on when tabbing though, theres no indicator which you've selected and even the tail shape icons barely show which is currently selected wiht the tab"
  severity: major
  test: 4
  root_cause: "Pre-existing, not a phase-9 regression. (1) Sliders: components/ui/slider.tsx puts focus-visible:ring-3 on the thumb <div>, but Base UI 1.7.0 gives keyboard focus to a nested visually-hidden <input type=range> (clip-path inset 50%), so the thumb is never :focus-visible and its ring never paints; the input's own outline is clipped away. (2) Tail-shape tiles and the FINS/RAILS hand-rolled buttons have no focus style, so only the browser's automatic outline shows, painted in the app base layer's outline-ring/50 colour (--surf-accent-ink at 50% opacity, about 2.3:1 on the sidebar), hence barely visible."
  artifacts:
    - path: "components/ui/slider.tsx"
      issue: "focus-visible ring keyed on the thumb <div>, which is never the focused element (line ~47)"
    - path: "app/globals.css"
      issue: "--ring is --surf-accent-ink and the base layer applies outline-ring/50 to every element, a faint fallback ring; .slider-accent hooks (lines ~700-714) are the app-side place for thumb styling"
    - path: "components/outline/outline-controls.tsx"
      issue: "tail-shape tiles (lines ~329-358) have no focus-visible style"
    - path: "components/fins/fin-controls.tsx"
      issue: "PillButton and the tail-shape/fin-setup grids have no focus-visible style"
    - path: "components/rails/rail-controls.tsx"
      issue: "hand-rolled selection buttons (lines ~85, ~341) have no focus-visible style"
  missing:
    - "Key the slider thumb's focus ring on the focused inner input: a has-focus-visible: rule (e.g. .slider-accent [data-slot=slider-thumb]:has(:focus-visible)) beside the existing .slider-accent hooks"
    - "An explicit, full-opacity focus-visible ring in the palette accent on every hand-rolled selection button (TEMPLATE tail tiles, FINS pills and grids, RAILS buttons), ideally one shared class"
    - "A decision on the 50% ring opacity inherited from shadcn defaults, which also mutes the Select and Checkbox rings"
    - "A desktop keyboard-focus e2e: Tab to a slider thumb and assert its box-shadow is not none; at-rest desktop baselines must stay pixel-identical"
  debug_session: ".planning/debug/keyboard-focus-invisible-on-sliders.md"