# Brief — quick 261112-ogx: BOTTOM's VIEWER draws the side profile under the cross-section

Builds on quick 261112-lmr (the shared maths `lib/geometry/side-profile.ts` and the Board file preview's two side
profiles — read its SUMMARY) and sketch 023 (`.planning/sketches/023-bottom-side-profile/` — its README's decision,
`index.html` variant A, its pictures). Branch `close-bottom-17`, not pushed; main is 235f5803.

## The founder's ruling (2026-11-12, his words)

"I like A, but lets put the side view at the bottom: Bottom, crossection, side, with sides default scaling to 1x to
minimize distortion of the rocker and use up the least amount of space."

## What to build

1. **BOTTOM's VIEWER draws three drawings, top to bottom:** the board from below (as today), the cross-section (as
   today, its own Height buttons unchanged), then **SIDE VIEW** — the deck (one line), the bottom at the stringer (the
   board's ink edge), the bottom at the rail before the rails are shaped (dashed — the preview's `RAIL_LINE`: share it,
   don't copy it), from `sideProfileLines(resolved, board, profile)` on the store's own resolved bottom (channels never
   on the rail line; the stringer line as the drawn board has it). Under it the preview's key and the facts phrase
   `2 1/8" at the stringer · 2 1/4" side profile max` (the preview's words and formatter — share them).
   - **Height ×1 / ×2 / ×4 / ×8, opening at ×1** (true proportions, the least height), BOTTOM's own `HeightPicker`
     beside the caption `SIDE VIEW` / `SIDE VIEW · HEIGHT ×4` exactly as the preview captions it. The side view's height
     follows the stretch: at ×1 it is a thin drawing; the cross-section takes the room the side view doesn't use.
   - **One length scale with the board from below**, nose the same way, so the section's dash-dot station line runs
     straight through the board from below and the side view (sketch 023 measured it to the same dot). Tapping or
     dragging along the side view moves the section's station, exactly as the board from below does.
   - The flat-bottom key when the two lines are one ("at the stringer and at the rail — the same line on this bottom").
   - Light and dark (`app/globals.css` palette contract); the app's drafting grammar (`Skill("sketch-findings-shaper")`).
2. **The Board file preview's side view opens at ×1 too** (it opens at ×4 today) — same reasons, and the two side views
   then match. Its ×2/×4/×8 buttons stay.
3. **Layout rules (CLAUDE.md's three switches):** on an upright phone (`max-shell`) BOTTOM's drawing stays pinned at its
   current height above the controls (sketch 023: the controls keep 239 dots on a 390×844 iPhone in every variant) —
   the three drawings share that height; on a short screen the drawing column scrolls as it already does; touch sizes by
   the `coarse` pointer (the Height buttons' 44-dot boxes). No new "phone" variant. Measure the split on a 390×844 iPhone
   and on 1280×800, and say it in the SUMMARY.
4. **The GUIDE, DATA and the phone's NOSE/CENTER/TAIL row are unchanged.**

## Rules

- No formula in a component; every length shown through `units.ts` (Metric: the two thicknesses in centimetres to one
  decimal, as the preview).
- Browser tests: update every BOTTOM spec the third drawing moves (`e2e/bottom-*.spec.ts`, `e2e/phone-bottom.spec.ts`
  and any phone-chrome/scroll spec that measures BOTTOM), add checks that the side view draws two bottom lines on a Deep
  Single and one on a flat board, opens at ×1 and stretches at ×4, that its station line lines up with the board from
  below's (within 1 dot), and that a tap on it moves the section. Run every `e2e/bottom-*`, `phone-bottom`,
  `three-d-export` spec on all three projects (`PW_PORT=3117`) and `e2e/desktop-baseline.spec.ts` on desktop — the BOTTOM
  desktop baseline picture WILL change: read the diff picture, and if the only change is the new drawing (and the
  cross-section's height), re-record it and say so; any other change is a fault to fix.
- Pictures for the founder's look into this task's `pictures/` (headless Playwright, the dev server on 3117): BOTTOM on a
  computer, light and dark, on the Deep Single Shortboard; a Rolled Vee; a flat board; at ×4; an upright phone; a
  sideways phone; and the preview at ×1. Look at each one (Read the PNG) and fix what's wrong before finishing.
- CLAUDE.md: one clause where BOTTOM is described (the Layout paragraph), saying VIEWER draws the board from below, the
  cross-section and the side view.
- Work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`); never `cd`
  elsewhere; no push, no merge. `npx next typegen` before `npx tsc --noEmit`. Never the whole Vitest suite in one task.
  Do not open AkuShaper or Shape3D; do not touch `~/Downloads`.
- Plain-English commit messages a shaper can read, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
