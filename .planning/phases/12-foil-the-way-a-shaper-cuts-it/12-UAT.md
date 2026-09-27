---
status: testing
phase: 12-foil-the-way-a-shaper-cuts-it
source: [12-VERIFICATION.md]
started: 2026-09-27T04:22:58.368Z
updated: 2026-09-27T04:22:58.368Z
---

## Current Test

number: 1
name: Walk the phase's own DONE WHEN goal on ROCKER — pick a blank, watch the deck sit one skin below the blank's deck, the bottom parallel the blank's rocker, the four rocker numbers read the blank's own, the 12" stations fall out of that, then thin a tip and watch only the last 12" move
expected: |
  every number matches the founder's brief in plain sight — deck skin constant, bottom parallel, rocker numbers the blank's own, tips thinned last, curve fixed before thinning
awaiting: user response

## Tests

### 1. Walk the phase's own DONE WHEN goal on ROCKER — pick a blank, watch the deck sit one skin below the blank's deck, the bottom parallel the blank's rocker, the four rocker numbers read the blank's own, the 12" stations fall out of that, then thin a tip and watch only the last 12" move
expected: every number matches the founder's brief in plain sight — deck skin constant, bottom parallel, rocker numbers the blank's own, tips thinned last, curve fixed before thinning
why human: this is a felt, whole-screen judgement of the finished feature, not a single assertion; the geometry is proven by six named unit tests and code-read, but nobody has watched the drawing and sidebar move together in a browser
result: [pending]

### 2. On a real iPhone and a real Pixel, pick a blank and drag the Deck Skin slider thumb with a thumb (not a keyboard)
expected: the label never wraps, the Center's OFF BOTTOM and the passes line follow the drag live, nothing on the drawing jumps
why human: 12-05's e2e drives this slider by keyboard on all three Playwright profiles; a real thumb drag has not been walked (12-05 SUMMARY, Human check)
result: [pending]

### 3. On a real phone, tap the Tip Style and Fine-tune off pills with a thumb, and the Deck Skin / Planer Max Depth / Restore Defaults controls in Fit & Tip Defaults
expected: every pill and field feels finger-sized and easy to hit, hints wrap cleanly, the readouts respond
why human: the touch-size e2e proves 44px CSS heights, not how a real thumb feels landing on them (12-04 SUMMARY, 12-08 SUMMARY, Human check)
result: [pending]

### 4. Signed in on a real device, set Tip Style to Bottom (and Planer Max Depth, Deck Skin) in Fit & Tip Defaults, then open the gear menu on a second device signed in to the same account
expected: the second device shows the same Tip Style / Planer Max Depth / Deck Skin, and flipping Imperial/Metric and reloading keeps the pick (the Phase 11 CR-01 case)
why human: Clerk never settles under the e2e suite's fake key, so the browser tests cannot reach this account round trip; only unit tests of the save/read path exist (12-03, 12-04, 12-06 SUMMARY, Human check)
result: [pending]

### 5. Signed in with Tip Style set to Bottom, open a board saved under Phase 11 from the rack
expected: it opens with Tip Style reading Bottom, and its five station thicknesses (tail tip, tail 12", centre, nose 12", nose tip) read exactly what Phase 11 showed, matching the recorded read-only database evidence (7 of 7 boards open, 1 of 1 Phase 11 board keeps its five numbers)
why human: this is an account-signed-in rack flow the e2e suite (which runs signed out) cannot reach; the claim rests on a script run once against the development database in 12-06's own session, not re-run here per the orchestrator's no-.env-file instruction
result: [pending]

### 6. In each of the four visual themes, with a blank picked, look at the drawing
expected: a deck-side foam band and a bottom-side foam band both show, in the same muted shade, both widening over the last 12" on the side the Tip Style takes the extra from; on a board that doesn't fit, the outline crosses the blank's line where foam runs out, with no warning colour on the drawing itself
why human: 12-09 SUMMARY records this was never walked in a browser by eye; it is a rendering/visual judgement across four themes, not a DOM assertion
result: [pending]

### 7. Open a saved board whose carried-over 12" fine-tune exceeds ±1/4" (the snapshot allows up to ±50 mm; the largest measured residual is 27.1 mm)
expected: the label and the Tweak hint read the true stored value with the thumb pinned at the end of its track (per UI-SPEC §10); a drag replaces it with an in-range value, and one undo restores the saved one
why human: 12-08 SUMMARY records this has not been walked on a real saved board; it needs a board with a residual that large, which the seeded/dev fixtures may not currently contain
result: [pending]

### 8. Open the re-recorded ROCKER desktop baseline (rocker-desktop-desktop-darwin.png) beside the previous one
expected: only the list intro's new wording and the one extra line of wrap should differ; the drawing, Center Thickness section, top bar and first four listed blanks should be identical
why human: 12-03 SUMMARY recorded this diff was inspected by the executor at plan time; an independent human eye on the two images has not happened, and the hash-only check this verifier ran cannot see whether the new sentence itself reads well
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Founder Questions (from 12-VERIFICATION.md — decisions, not tests)

1. The 522 thin-tip-window boards: under D-18's "under 1/8 inch anywhere" floor, a board whose tip setting is thicker than the parallel cut can still dip below its tip setting a few inches in from the tip (down to 3.30 mm) and count as fitting. Is 1/8 inch the right floor?
2. Carried-over Phase 11 boards: about nine in ten open with a Deck fine-tune bigger than the Deck Skin, so every blank is greyed until the shaper resets the fine-tune, raises the Deck Skin or takes the fine-tune off the Bottom; the flag now says exactly that and offers Reset Fine-Tune. Acceptable as the D-14 outcome?
3. IN-02: the D-18 reason line always says "this blank is too thick for this center", even when a negative fine-tune is the cause. Keep the wording?
4. IN-03: a saved board may carry a Deck Skin anywhere in 0–50 mm (the control allows 1/16"–1/2"); left loose so every saved board still opens (R9). Keep?
5. IN-04: a browser tab left open from Phase 11 across the deploy has its Restore Defaults refused quietly and can overwrite a signed-out shaper's three new cookie settings. Accept as a transition edge (noted in the ship checkpoint)?

## Gaps
