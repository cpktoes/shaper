---
phase: quick-261003-q2c
plan: 01
subsystem: design-screens-navigation
tags: [navigation, step-nav, wizard, phone, print, playwright]
requires: []
provides:
  - "Back and Next pair at the end of every design screen's controls (TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY)"
  - "lib/screen-steps.ts: screenStepsAround and screenWord, pure and unit-tested"
affects:
  - components/design/design-screen-shell.tsx
  - components/summary/order-form.tsx
  - components/volume/volume-controls.tsx
  - components/fins/fin-controls.tsx
tech-stack:
  added: []
  patterns:
    - "StepNav reads NAV_LINKS (never copied) and the route; renders real next/link links wearing the app's button styling"
key-files:
  created:
    - lib/screen-steps.ts
    - lib/screen-steps.test.ts
    - components/design/step-nav.tsx
    - e2e/step-nav.spec.ts
  modified:
    - components/design/design-screen-shell.tsx
    - components/summary/order-form.tsx
    - components/volume/volume-controls.tsx
    - components/fins/fin-controls.tsx
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
decisions:
  - "Back and Next are links, so a move never reloads the page and an unsaved board is never lost"
  - "The pair carries both data-print-hide and print:hidden, so it never reaches paper"
  - "The pair's landmark is named 'Back and Next' (no word 'screens'), so existing tests that find the top row and tab bar are unaffected"
  - "VOLUME's and FINS' control columns lose h-full so the pair sits after their content, not on top of it"
status: complete
actuals:
  tokens: 60000
  tasks: 3
  commits: 5
---

# Quick 261003-q2c: Back and Next at the end of every design screen's controls

**Every design screen now ends its controls with a step back and a step on, so a shaper walks a board TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY with no menu.**

## What a shaper sees

- At the end of each screen's controls, below the last slider or button, there is a pair: **Back** on the left (outlined, a left arrow and the previous screen's name, for example "Rocker") and **Next** on the right (filled with the app's accent colour, the next screen's name and a right arrow, for example "Rails"). Back is a little narrower than Next.
- **TEMPLATE has only Next** ("Rocker"). **SUMMARY has only Back** ("Fins"). Each then fills its row. (SUMMARY's Back is centred under the print buttons, at most 320 dots wide, so on a computer it does not stretch across the window.)
- On a touch screen each button is 44 dots tall; with a mouse it is the app's normal 32.
- Moving is instant and keeps the board: a Nose Thinning Start set by hand on ROCKER still reads the same after walking on to SUMMARY and back.
- The buttons **never print**, never show on the home or Contact page, and on a computer they go away together with the sidebar when TEMPLATE's "Hide the sidebar for a wider view" is on (the top row still lists all six screens there).
- On an upright phone, the last buttons on VOLUME and SUMMARY scroll clear above the floating Undo/Redo pair, with about 8 dots of daylight (measured 7.5 to 8.3), and a tap at their centre lands on them.
- Works in every layout: upright iPhone and Pixel, a Pixel held sideways (863x360, the desktop layout), and a computer.

## Commits

| Commit | What |
| ------ | ---- |
| 61dbcc5 | Design screens end with Back and Next buttons (the helper, the unit tests, the component, the shell mount, first browser test) |
| a4f5e90 | SUMMARY's Back, VOLUME's column fix, and the rest of the browser spec |
| 9180fd6 | FINS: keep the pair below the fin controls (column fix plus an every-screen overlap test) |
| b34abf0 | VOLUME's reference picture re-recorded |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] VOLUME's control column was as tall as its sidebar, pushing the pair out of reach**
- **Found during:** Task 2 (the clearance test failed: VOLUME's Next ended 32 dots under the Undo button's top edge on an upright phone, 24 dots above the page's end instead of 64)
- **Issue:** `VolumeControls`' root was `flex h-full flex-col`. With the pair right after it, the column took the whole sidebar's height and the pair landed at the end of that height, with the sidebar's 40-dot bottom padding not counted after it. Measured: aside box ended 52 dots above the pair's bottom edge.
- **Fix:** dropped `h-full` (it did nothing else; the column is a plain flex-col with a gap). Comment in the file says why.
- **Files modified:** components/volume/volume-controls.tsx
- **Commit:** a4f5e90

**2. [Rule 1 - Bug] FINS' control column had the same fault and the pair drew over "Thruster Model"**
- **Found during:** Task 3 (desktop-baseline FINS picture showed the pair sitting in the middle of the sidebar)
- **Issue:** `FinControls`' root was `flex h-full flex-col`, so the pair landed at the scroller's height with the fin model's own settings spilling out underneath it. Not in the plan: the plan assumed FINS' new row would be out of frame in its reference picture.
- **Fix:** dropped `h-full` the same way. Added a browser test, "on each of the five design screens the pair sits below the last of the screen's own controls", which checks that nothing in the sidebar reaches below the top of the pair on TEMPLATE, ROCKER, RAILS, VOLUME and FINS. Proved it has teeth: with the old FINS code it failed by 195.5 dots.
- **Files modified:** components/fins/fin-controls.tsx, e2e/step-nav.spec.ts
- **Commit:** 9180fd6

**3. [Rule 3 - Test shape] the home and Contact "no pair" check split into two tests; the clearance check kept to VOLUME and SUMMARY**
- Two `goto` calls in one test were interrupted by the first page's own navigation; one address per test fixes it.
- A first draft of the clearance test visited all six screens. On TEMPLATE the dev server's controls window under the pinned drawing is only about 57 dots tall at 390x664, so scrolled to its end the pair is simply out of that window and the tap check is meaningless there. The plan's two stops (VOLUME, SUMMARY) stay; the production-build spec covers the rest.

None of these touched the pair's design as planned.

## The planner's calls, for the founder to overrule

- **P-1:** SUMMARY's Back is capped at 320 dots wide and centred (`max-w-80`), matching the widest the controls column's content ever gets on a computer.
- **P-2:** VOLUME (`max-shell:pb-6`, design-screen-shell.tsx) and SUMMARY (`max-shell:pb-8`, order-form.tsx) carry their own room under the pair on an upright phone, so they match the 64 dots the other screens' scrollers end with. Measured daylight above the Undo/Redo pair: VOLUME 7.6, SUMMARY 7.5 to 8.3.
- **P-3:** the arrows are the app's own lucide icons (`ArrowLeftIcon`, `ArrowRightIcon`), not the sketch's text arrows.
- **P-4:** 24 dots above the pair (`mt-6`).

## Reference picture re-recorded

`e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png` only. The diff is the new row under the Center Thickness slider: an outlined "Rails" with a left arrow and a filled "Fins" with a right arrow. Nothing else moved. After the FINS fix, FINS' own picture matches its old baseline (the pair is below the fold there), so no other picture was touched.

## Verification

- `npx vitest run`: 104 files, 3897 passed, 2 skipped (including the 9 new tests in lib/screen-steps.test.ts; RED seen before the helper existed).
- `npx tsc --noEmit` and `npm run lint`: clean (`npx next typegen` run once for the route types).
- `e2e/step-nav.spec.ts` (the new spec): iphone 8 passed, 2 skipped; android 9 passed, 1 skipped (its sideways Pixel 7 describe ran and passed); desktop 8 passed, 2 skipped. The clearance test ran on both phones.
- The twelve existing spec files, final run after the last code commit: desktop 47 passed, 83 skipped (phone-only tests); iphone 64 passed, 1 timed out, 65 skipped; android 63 passed, 67 skipped.

### Re-runs and flakes (machine load average 60 to 300 throughout)

- iphone: `phone-chrome.spec.ts` ROCKER upright hit a 15-second `page.goto` timeout on an untouched screen. Re-ran that file alone on iphone: 17 passed, 27 skipped.
- An earlier full desktop sweep (before the FINS fix) failed `phone-chrome` RAILS at 820x800 with the same kind of `goto` timeout, plus TEMPLATE and RAILS reference pictures on the very first run after a cold start. With my changes taken out (files restored to the plan's base commit, then put back), RAILS still failed that run (12453 pixels) and TEMPLATE passed; on a later run with my changes TEMPLATE passed alone and in the file and RAILS passed. Both pictures are timing-sensitive on a loaded machine and unrelated to the new row (it is out of frame on both). The final full desktop sweep passed all 47.

## Hand-offs

**For the orchestrator, after the merge:** run `npm run build` and `npm run test:e2e:prod`. `e2e/prod/phone-controls-clear-undo.spec.ts` was not edited; its general rule already looks at every `a[href]`, so it now checks the new links on all six screens of a production build against the floating pair. Worth a look in the browser too: SUMMARY on a computer (Back centred under the print buttons) and FINS and RAILS on a phone.

**For quick task 261003-q2f:** VOLUME's `max-shell:pb-6` (design-screen-shell.tsx) and SUMMARY's `max-shell:pb-8` (order-form.tsx) must be resized together with the shell's `max-shell:after:` block if the Undo/Redo pair's phone position moves; `e2e/step-nav.spec.ts`'s clearance test ("VOLUME's Next and SUMMARY's Back end above the pair...") will say if they are not. The step nav's landmark name "Back and Next" must stay free of the word "screens" (the tab bar is found by that word). Do not add `h-full` to any control column (VOLUME, FINS) without checking the pair still sits below the controls; the "pair sits below the last of the screen's own controls" test guards it.

## Known Stubs

None.

## Threat Flags

None. The pair's targets come only from the NAV_LINKS constant (T-q2c-01); moves are client-side (T-q2c-02, proven by the hand-set Thinning Start surviving the walk); the pair is hidden under print media on ROCKER and SUMMARY (T-q2c-03).

## Self-Check: PASSED

Files found: lib/screen-steps.ts, lib/screen-steps.test.ts, components/design/step-nav.tsx, e2e/step-nav.spec.ts. Commits 61dbcc5, a4f5e90, 9180fd6, b34abf0 are in `git log`.
