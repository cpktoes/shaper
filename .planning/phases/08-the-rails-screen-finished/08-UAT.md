---
status: testing
phase: 08-the-rails-screen-finished
source: [08-VERIFICATION.md]
started: 2026-09-08T14:57:02Z
updated: 2026-09-08T14:57:02Z
---

## Current Test

number: 1
name: INSTRUCTIONS tab example rail draws with every callout legible
expected: |
  Open /design/rails, click INSTRUCTIONS. The example rail draws in its fixed-height card with all ten
  mark names legible and non-overlapping in both Flat and Domed, matching the prototype's own
  "Understanding Rail Markings" plot; Corner Cut sits at the same height as the reference.
awaiting: user response

## Tests

### 1. INSTRUCTIONS tab example rail draws with every callout legible
expected: Open /design/rails, click INSTRUCTIONS. The example rail draws in its fixed-height card with all ten mark names legible and non-overlapping in both Flat and Domed, matching the prototype's own "Understanding Rail Markings" plot; Corner Cut sits at the same height as the reference.
result: [pending]

### 2. The plan/side figure shows the whole example board at once
expected: On the INSTRUCTIONS tab the "Turning Marks Into Rail Bands" figure shows the whole example board without scrolling (capped at about 472px tall), the card stays legible and light in both light and dark themes, and in Metric the station labels and the tail-distance range read in centimetres with the unit carried once.
result: [pending]

### 3. Legend boxes toggle only their own line families
expected: Untick all nine legend boxes, then tick a mixed subset: exactly the ticked line families draw, while the board outline, the side strip and the station labels always stay.
result: [pending]

### 4. View Full Sized measures true on screen
expected: Open "View Full Sized" from the rails VIEWER toolbar. Hold a ruler against the on-screen rail and against the 2 in / 50.8 mm check bar in both Imperial and Metric; both measure physically true. All three tabs (Nose, Center, Tail) are offered even with a sidebar section collapsed, and a rail wider than the dialog scrolls rather than shrinks.
result: [pending]

### 5. View Full Sized prints true
expected: Print the View Full Sized dialog with "Fit to page" off, in both systems. The printed check bar and a known rail mark measure true with a ruler, and no rails-screen chrome (sidebar, tab strip, toolbar) reaches the printed page.
result: [pending]

### 6. The print preference follows the account and never flashes
expected: Tick "Include Rail Band Instructions in Print" on the rails sidebar; reload and see no flash from unticked to ticked; the summary's mirror checkbox is already ticked and both page marks read "of 3". Sign in on a second browser or profile and the value follows the account; sign out and the browser-only value is preserved.
result: [pending]

### 7. The order form is unchanged unticked and gains one fixed page ticked
expected: With the box unticked, the summary's print preview in Imperial and Metric, on Letter and A4, shows pages 1 and 2 exactly as before this milestone (same layout, values, page marks reading "of 2", same note, nothing clipped). Tick the box and a third page appears identically in both systems and paper sizes with the Flat rail and every legend line drawn regardless of the on-screen tab and legend state, never spilling to a fourth page.
result: [pending]

### 8. The production column exists
expected: In the Neon console, on the production branch, user_preferences has a print_rail_instructions boolean column; or, signed in on https://shaper-coral.vercel.app, tick the box and confirm it is still ticked in a private window signed in as the same account (a plain reload is not proof, because the cookie keeps the box ticked even if the account write failed).
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
