---
quick_id: 260909-nvw
status: complete
completed: 2026-09-09
plan: 260909-nvw-PLAN.md
commits:
  - fb2120c
  - 4343385
---

# Quick task 260909-nvw — Slider dots always show on a phone

## What a shaper sees now

Every slider on a phone shows its dot as soon as its row is on screen. Opening the Fine adjust
group reveals Width, Offset, the rail and tail rows with their dots in place, ready to press or
drag — no more sliders that look greyed out until touched, and Width has its dot like everything
else.

## What was actually wrong

On the production build (the live site, and a local `next start`), every slider that loads folded
away had its dot at `--position: NaN%; visibility: hidden` — seven of TEMPLATE's eleven sliders.
Base UI places the dot from a measurement of the slider's box; a folded row measures zero width,
and the observer that should re-measure it once the fold opens is attached inside the dot's own
layout effect, which runs before the control's ref exists, so in production it never attaches. The
dev server runs React in StrictMode, which runs every effect twice and papers over it — which is
why neither the browser suite nor anyone on the dev server ever saw it. The Width slider "not
working at all" was the same thing: no dot to find, and a hidden dot's input cannot take focus.

## The fix

`components/ui/slider.tsx` watches its own control's width from the parent's layout effect (which
runs after the control's ref is set) and remounts the dot, through an epoch in its key, the moment
the width goes from zero to something. The fresh dot measures a real box and attaches its own
observer normally. Nothing remounts for a slider visible at load or on ordinary resizes.

Measured on a local production build after the fix (both WebKit and Chromium): the seven folded
rows go from hidden to real positions the instant the fold opens, 11 dots visible; Width then takes
a touch on its bar (19" → 22 7/8"), a mouse click (→ 18") and a keypress. The sideways layout lays
its rows out at load and was already fine; the desktop was never affected.

## Proof

- `playwright.prod.config.ts` and `npm run test:e2e:prod`: the same three device profiles run
  against a production build; `e2e/prod/slider-dots.spec.ts` asserts every folded dot gets a
  position the moment the fold opens (both phone profiles) and that the desktop's dots are
  positioned at load. 3 passed against the local production server.
- `components/ui/slider-dot-contract.test.ts`: pins the wrapper's wiring. 3 passed.
- Dev-mode gates: `npx vitest run` 2373 passed / 2 skipped (before the contract test was added);
  `npx tsc --noEmit` clean; `npm run lint` 0 errors; `PW_PORT=3100 npx playwright test` 162 passed,
  0 failed, five desktop baselines unchanged.

## Deviations

- Executed inline by the orchestrator rather than through a planner and executor: the founder was
  testing the live site, the diagnosis needed a production build (which executors cannot run in a
  worktree), and the fix is one wrapper hook.
- A detour worth recording: a diagnostic locator (`page.locator("div", { has: … })`, which matches
  every ancestor) picked the first slider on the page instead of Width, so for a while WebKit
  looked as if it ignored bar presses. It does not; the corrected probe shows all three input paths
  working in both engines.

## Human verification deferred

- On the founder's iPhone: open TEMPLATE, tap Fine adjust — every row shows its dot straight away;
  press the middle of the Width bar and drag its dot; turn the phone sideways and check the sidebar
  rows show dots without being touched.
