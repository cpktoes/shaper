---
quick_id: 260909-kyz
status: complete
completed: 2026-09-09
plan: 260909-kyz-PLAN.md
commits:
  - 30b14b8
  - 9956559
---

# Quick task 260909-kyz — Sliders work under a finger again

## What a shaper sees now

Every slider in the app takes a finger anywhere on its bar, not just on the little dot. On an
upright phone the Fine adjust sliders (Width, Offset, the rail and tail rows) move when you press
the bar or drag the dot; on a phone held sideways the same rows in the sidebar do too; and RAILS'
Deck Profile and every other slider behave the same way. A drag that wanders up or down by a
thumb's width never scrolls the controls list out from under the finger.

## What was actually wrong

The founder's report named the fold and the sideways sidebar, but both were innocent. Every
slider in the app was drawing **two dots, one exactly on top of the other**: the shadcn wrapper in
`components/ui/slider.tsx` fell back to a two-ended `[min, max]` array whenever it was handed a
plain number, and this app hands every slider a plain number. Counted live before the fix:
22 thumbs for 11 sliders on TEMPLATE, 24 for 12 on RAILS, each pair on the identical pixel.

Base UI only tracks the one real value. A press anywhere on the bar picked the nearer of the two
coincident dots — the phantom second one — looked up a value that does not exist, and quietly did
nothing. A mouse never showed it because a mouse aims at the dot; a finger lands on the bar, and
roughly 71% of a 151px bar was dead. Measured with real touch input in Chromium (Pixel 7 upright
through the Fine adjust fold, Pixel 7 sideways in the sidebar) and with a desktop mouse: a press at
5, 20, 50, 75 or 95% of the bar left Width at 19" in every case; a drag starting on the dot worked
everywhere. So this was never a phone-layout bug.

## The fix

- `components/ui/slider.tsx`: one dot per slider — the fallback now builds a single-entry array
  from the value it was given. A bar press at 75% now moves Width to about 23", at 20% to 17 5/8",
  upright and sideways alike, and Deck Profile on RAILS from 1 5/16" to 1" / 1 1/4".
- Belt and braces: `touch-none` added to the slider's track and dot as well as its control, because
  `touch-action` is not inherited and a browser that ignores the parent's setting would otherwise
  be free to scroll the list mid-drag. A mouse never sees this.
- Two side benefits for free, because each phantom dot carried its own hidden range input: Tab now
  stops once per slider instead of twice, and a screen reader announces each slider once.

## Proof

- `e2e/slider-touch.spec.ts` (new, android project, real CDP touch): three cases — the Width row
  behind the Fine adjust fold on an upright Pixel 7, the same row in the sidebar on a Pixel 7 held
  sideways, and RAILS' Deck Profile row. Each presses the bar and drags the dot with 60px of
  vertical wander. Committed failing first (30b14b8), green after the fix (9956559).
- `components/ui/slider-touch-contract.test.ts` (new): pins the single-dot fallback and the
  `touch-none` on control, track and dot in the source.
- Full regression sweep, run by the orchestrator in this worktree after the executor's session
  ended (see Deviations): `PW_PORT=3124 npx playwright test` — 162 passed, 153 skipped
  (project guards), 0 failed across iphone, android and desktop, including `e2e/keyboard-focus.spec.ts`,
  `e2e/touch-sizing.spec.ts` and `e2e/desktop-regression.spec.ts`; the five desktop baseline
  screenshots matched with none regenerated; `npx vitest run` 2373 passed / 2 skipped;
  `npx tsc --noEmit` clean; `npm run lint` 0 errors; `package.json` / `package-lock.json` unchanged.

## Deviations

- The executor's session ended after committing Tasks 1 and 2 while its background Playwright run
  was still going (the run's dev server never answered, leaving three timeout artefacts under
  `test-results/`). The orchestrator re-ran that spec (11 passed) and the whole of Task 3's sweep
  in this worktree, and wrote this summary from the commits and the plan's own measurements.
- Not changed, on purpose: the hidden native range input inside each dot. Chromium's
  `elementFromPoint` at the dot's centre returns the dot, not the input, so it is not stealing the
  touch here. If the founder's iPhone still misbehaves after this fix, `pointer-events: none` on
  that input (one rule beside the `.slider-accent` hooks in `app/globals.css`) is the next thing
  to try.

## Human verification deferred

- On the founder's iPhone in Safari, upright with the Fine adjust group open and then held
  sideways: press the middle of the Width bar (the value should jump to the finger), drag the dot
  with a wandering thumb (the value should follow and the list must not scroll), and try a RAILS
  slider the same way.

## Phase 10 note

None of this touches Phase 10's scope; it is a component fix that reaches every screen.
