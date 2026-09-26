---
status: testing
phase: 11-rocker-from-real-blanks
source: [11-VERIFICATION.md]
started: 2026-09-26T19:01:59Z
updated: 2026-09-26T19:01:59Z
---

## Current Test

number: 1
name: On a desktop, open a new board from the Shortboard preset, go to ROCKER, set a Center Thickness, pick a different blank from the list, and slide the board along it.
expected: |
  The four rocker numbers (nose tip, nose 12", tail 12", tail tip) and the foam-to-remove figures change live as the dot moves; every blank that will not fit is still listed, marked as not fitting, with a plain-English reason; the foil's centre reads the Center Thickness that was set and the tips read the tip settings. This is the phase's own DONE WHEN, walked end to end by the shaper it was built for.
awaiting: user response

## Tests

### 1. On a desktop, open a new board from the Shortboard preset, go to ROCKER, set a Center Thickness, pick a different blank from the list, and slide the board along it.
expected: The four rocker numbers (nose tip, nose 12", tail 12", tail tip) and the foam-to-remove figures change live as the dot moves; every blank that will not fit is still listed, marked as not fitting, with a plain-English reason; the foil's centre reads the Center Thickness that was set and the tips read the tip settings. This is the phase's own DONE WHEN, walked end to end by the shaper it was built for.
why_human: The automated browser tests prove each piece with fixed inputs; whether the whole flow reads as numbers a shaper would trust enough to cut foam to is the founder's acceptance, and none of the six items below walks the whole flow. (Added by the orchestrator.)
result: [pending]

### 2. Open the ROCKER screen in each of the four themes (Daylight, Chalk, Slate, Phosphor), pick a blank, and look at the drawing.
expected: The faint outline of the real foam blank sits behind the board's own outline, and the shaded band above the deck and past each tip (the foam that will be planed away) reads clearly as a light wash in every theme — never invisible, never mistaken for a warning colour.
why_human: Colour legibility across four themes is a visual judgement; no automated test measures it (flagged by the plan's own executor in 11-07 and 11-12).
result: [pending]

### 3. Sign in on one device or browser, set a Fit & Tip Default (for example Extra Length to 3"), then sign in on a second device or browser with the same account.
expected: The second device shows the same 3" — the setting followed the shaper's account, not just the browser it was typed on. Also: flipping between Imperial and Metric and reloading should not lose the pick.
why_human: The automated browser tests run signed out (fake test credentials), so the real cross-device account round trip has never actually been exercised — only its pieces are unit-tested separately.
result: [pending]

### 4. On a real iPhone and a real Android phone (not a browser's phone simulator), open ROCKER, pick a blank, drag the placement dot with a thumb, and nudge a 12" fine-tune slider.
expected: Every row, link and slider dot is comfortably big enough to tap; the placement wording never wraps onto a second line mid-drag; the numbers change smoothly as you drag; nothing on the drawing itself responds to a touch.
why_human: This project's own convention treats emulated touch as insufficient proof — real hardware is required for touch-feel judgements (per CLAUDE.md and prior phase learnings).
result: [pending]

### 5. Open each of the four presets (Shortboard, Fish, Mid-length, Longboard) from the setup screen, go to ROCKER, and look at which real foam blank each one landed in and where the board sits on it.
expected: A shaper (the founder) judges whether the blank the app picked automatically is the one they'd actually choose for that board. These are marked 'provisional' on purpose and are meant to be replaced by the founder's own pick through the 'Copy preset values' workflow described in presets.ts.
why_human: This is a business/craft judgement about which foam blank suits which board shape — not something a test can grade. The preset card's quoted volume also went up by 2-5 litres because the real blank's foam is fuller near the tips than the old hand-typed numbers were; the founder should confirm that reads right.
result: [pending]

### 6. Open a board that was saved before this branch existed (a real board from the founder's own account, not a test fixture) from the setup screen's rack, and look at its ROCKER screen.
expected: It looks exactly as it did before — same rocker numbers, same foil — just shown now as four sliders instead of the old Angle/Smoothness/Flatness controls, with no blank picked.
why_human: Only a real pre-existing saved board, with data the tests never wrote, actually proves the migration path end to end (flagged by the plan's own executor in 11-09).
result: [pending]

### 7. Open the two re-recorded reference screenshots (ROCKER and VOLUME) next to their previous versions.
expected: ROCKER's picture shows the new sidebar (Center Thickness, the blank list, the placement control) beside the same board drawing. VOLUME's picture is identical except its litres number, which reads very slightly higher than before.
why_human: A reference screenshot being 'the right picture' is a judgement call, not only a pixel-stability check (which the automated hash comparison already confirms).
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
