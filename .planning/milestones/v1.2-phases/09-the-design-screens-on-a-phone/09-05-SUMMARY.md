---
phase: 09-the-design-screens-on-a-phone
plan: 05
subsystem: ui
tags: [tailwind-v4, touch-targets, accessibility, playwright, coarse-pointer]

requires:
  - phase: 09-the-design-screens-on-a-phone
    provides: "09-02: the coarse-pointer custom variant in app/globals.css and the phone shell every design screen renders through"
provides:
  - "coarse:h-11 / coarse:size-11 on Button's default and icon size variants (components/ui/button.tsx) — every default and icon button in the app grows to 44px on a touch screen, unchanged on a mouse"
  - "coarse:after:-inset-4 on the Slider Thumb (components/ui/slider.tsx) — the invisible tap ring grows from 28px to 44px on touch at all fourteen call sites at once; the visible 12px dot never changes"
  - "coarse:text-base on Input (components/ui/input.tsx) — any touch pointer gets 16px type, which stops iOS zooming the page on focus"
  - "coarse:h-11 coarse:text-base on both MeasureField input branches (components/design/measure-field.tsx) — typed number fields (board length, rail marks, fin placement numbers) are 44px tall with 16px text on touch"
  - "coarse:min-h-11 on every checkbox-and-label row across Outline, Rails, Fins, Volume and the Rail Instructions legend (with print:min-h-0 on the legend, since it also prints as the order form's third page)"
  - "e2e/touch-sizing.spec.ts — measures every one of the above on iPhone/Android emulation and asserts the unchanged smaller sizes on desktop"
affects: [09-06, 09-07]

actuals:
  tokens: 6227
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Touch-size overrides live on the three or four shared components (Button, Slider, Input, MeasureField) rather than at each of the ~70 call sites — one coarse: class per component reaches every screen that renders it"
    - "A slider thumb's touch target is measured in Playwright by reading the pseudo-element's own computed inset (getComputedStyle(el, '::after').top) and inflating the thumb's real bounding box by that amount on every side, since the after pseudo-element has no boundingClientRect of its own"
    - "Board Length only renders as a typed MeasureField in Metric (Imperial shows two Select combos instead, D-08) — the touch-sizing spec sets localStorage's shaper-units key to metric before navigation, the same key components/units-provider.tsx reads, rather than clicking through the phone menu on every test"
    - "The Button touch-size assertion filters on the literal class tokens h-8/size-8 (unique to the default/icon variants) rather than scoping to a DOM region, so it finds every in-scope button on a page — including the phone top bar's Save button — without picking up the one sm-sized dev-only button these two screens render"

key-files:
  created:
    - e2e/touch-sizing.spec.ts
  modified:
    - components/ui/button.tsx
    - components/ui/slider.tsx
    - components/ui/input.tsx
    - components/design/measure-field.tsx
    - components/outline/outline-controls.tsx
    - components/rails/rail-controls.tsx
    - components/rails/rail-instructions.tsx
    - components/fins/fin-controls.tsx
    - components/volume/volume-controls.tsx

key-decisions:
  - "Comments beside each coarse: class avoid repeating the exact class-name string (writing 'the touch-size override below' instead of quoting coarse:h-11 verbatim), so the plan's own grep -c acceptance criteria count exactly one real occurrence per class, not one plus a comment echo."
  - "The touch-sizing spec's Button assertion targets [data-slot=\"button\"].h-8 and [data-slot=\"button\"].size-8 specifically (not a bare [data-slot=\"button\"] scoped to the sidebar), because live DOM inspection during authoring found the ONLY data-slot=\"button\" element inside outline/volume's own <aside> is the dev-only 'Copy preset values' button at size=\"sm\" — deliberately out of Task 1's scope. The class-token filter finds the phone top bar's Save button (a real default-size Button reachable from both test pages) while correctly excluding the dev button, without needing to touch phone-top-bar.tsx or phone-menu.tsx (09-02's files, out of this plan's scope)."
  - "The spec sets localStorage's units key to metric via addInitScript before each navigation so a typed MeasureField is actually present to measure on TEMPLATE and VOLUME — in the default Imperial system, Board Length renders as two feet/inches Select combos instead of a typed field, per D-08, and the plan's own scope was these two screens only."

requirements-completed: [PHON-03, PHON-05]

coverage:
  - id: D1
    description: "Default and icon Buttons grow to 44px on a touch screen (coarse:h-11, coarse:size-11), unchanged on a mouse at any width"
    requirement: "PHON-03"
    verification:
      - kind: e2e
        ref: "e2e/touch-sizing.spec.ts — '/design/outline: every visible default/icon button is at least 44x44' and '/design/volume: ...' (iphone, android); 'TEMPLATE: default button is 32px tall...' (desktop)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The slider thumb's invisible tap ring grows from 28px to 44px on touch (coarse:after:-inset-4); the visible 12px dot never changes size"
    requirement: "PHON-03"
    verification:
      - kind: e2e
        ref: "e2e/touch-sizing.spec.ts — 'every visible slider thumb's tap target is at least 44x44' (iphone, android, both routes); desktop asserts the target stays 28px"
        status: pass
    human_judgment: false
  - id: D3
    description: "Typed number fields (board length, rail marks, fin placement) grow to 44px tall with 16px text on touch, which stops iOS zooming the page on focus; unchanged 28px/14px on a mouse"
    requirement: "PHON-03"
    verification:
      - kind: e2e
        ref: "e2e/touch-sizing.spec.ts — 'every visible typed measure field is at least 44px tall with 16px text' (iphone, android); 'focusing a typed measure field never zooms the page'; desktop asserts 28px/14px"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every checkbox-and-label row across Outline, Rails, Fins and Volume is at least 44px tall on touch; the Rail Instructions legend gets the same rule plus print:min-h-0 so its printed page (the order form's third sheet) never re-spaces"
    requirement: "PHON-03"
    verification:
      - kind: e2e
        ref: "e2e/touch-sizing.spec.ts — 'every visible checkbox row is at least 44px tall' (iphone, android, both routes)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The five desktop baseline screenshots and the two mouse-drag regression tests still match to the pixel after every central component (Button, Slider, Input) changed, because every added class is coarse-gated"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts — 7/7 passing, no snapshot regenerated, re-run after every task"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual desktop regression pass: on a desktop browser at least 820px wide, tab through every control and operate it with the keyboard, click every button and drag every slider with the mouse, across all five design screens, confirming nothing differs from the deployed site"
    verification: []
    human_judgment: true
    rationale: "Requires a human at a real desktop browser operating every control by keyboard and mouse across all five screens — the automated desktop baseline/regression suite (D5) exercises the same surface pixel-for-pixel and via one real mouse-drag on two screens, but not full keyboard-only operation of every slider/checkbox/select, deferred per workflow.human_verify_mode (end-of-phase UAT)."

duration: 40min
completed: 2026-09-09
status: complete
---

# Phase 9 Plan 5: Touch Sizing — Buttons, Sliders, Fields and Checkbox Rows Grow for a Finger Summary

**Every button, slider hit-ring, typed number field and checkbox row on the five design screens now measures at least 44 CSS px on a touch screen and exactly today's smaller size on a mouse, changed in four shared components (Button, Slider, Input, MeasureField) plus five checkbox-row wrappers, all keyed to the pointer type via Tailwind's `coarse:` variant — never to viewport width.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3 (all auto), no deviations
- **Files touched:** 10 (1 new, 9 modified)

## Accomplishments

- `components/ui/button.tsx`: `coarse:h-11` on the `default` size, `coarse:size-11` on the `icon` size — every default/icon button in the app (including the phone top bar's Save button) reaches 44px on touch; `xs`/`sm`/`lg`/`icon-xs`/`icon-sm`/`icon-lg` deliberately left alone
- `components/ui/slider.tsx`: `coarse:after:-inset-4` on the Thumb's invisible hit ring (8px/side to 16px/side, making a 44px target around the unchanged 12px visible dot) — fixes all fourteen `SliderRow` call sites from one place
- `components/ui/input.tsx`: `coarse:text-base` — any touch pointer gets 16px type regardless of viewport width (a touchscreen laptop at desktop width needs it too), which is the whole cure for iOS zoom-on-focus; the existing `md:text-sm` width step is untouched
- `components/design/measure-field.tsx`: `coarse:h-11 coarse:text-base` on both `inputClassName` branches — typed board length, rail mark, and fin placement fields are 44px tall with 16px text on touch, unchanged 28px/14px on a mouse
- `coarse:min-h-11` added to every checkbox-and-label row wrapper in `outline-controls.tsx`, `rail-controls.tsx` (6 rows), `fin-controls.tsx` (3 rows), `volume-controls.tsx` (2 rows) and `rail-instructions.tsx`'s nine-item legend (with `print:min-h-0` there too, since that file also prints as the order form's third page)
- `e2e/touch-sizing.spec.ts` (new): measures every one of the above on `/design/outline` and `/design/volume`, on `iphone`/`android` (asserting >=44px, and an exact `"16px"` string match on typed-field font size) and on `desktop` (asserting the exact unchanged smaller sizes — 32px button, 28px field/14px text, 28px slider target); also checks the Fine adjust disclosure row and every bottom tab bar tab are >=44px, and that focusing a typed field leaves `window.visualViewport.scale` at 1
- `npm test` (2285 tests), `npx tsc --noEmit`, `npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` (7/7, no snapshot regenerated) and `npx playwright test e2e/touch-sizing.spec.ts --project=iphone --project=android` (22/22) all pass at the end of the plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Grow the three central controls on a touch screen — button, slider thumb, text input** — `39eb654` (feat)
2. **Task 2: 44px typed fields and 44px checkbox rows across the design screens** — `effe16e` (feat)
3. **Task 3: Measure every target and prove a number field does not zoom the page** — `c0542c7` (test)

## Files Created/Modified

- `components/ui/button.tsx` — `coarse:h-11` (default), `coarse:size-11` (icon)
- `components/ui/slider.tsx` — `coarse:after:-inset-4` on the Thumb
- `components/ui/input.tsx` — `coarse:text-base`
- `components/design/measure-field.tsx` — `coarse:h-11 coarse:text-base` on both input branches
- `components/outline/outline-controls.tsx` — `coarse:min-h-11` on the "View Construction Lines" row
- `components/rails/rail-controls.tsx` — `coarse:min-h-11` on all six checkbox rows (Sym, Hard Edge, Remove, Use Single Tuck, Use Board's Rocker & Foil Thickness, Include Rail Band Instructions in Print)
- `components/rails/rail-instructions.tsx` — `coarse:min-h-11 print:min-h-0` on the nine-item legend row
- `components/fins/fin-controls.tsx` — `coarse:min-h-11` on all three checkbox rows (Import Template Values, Add 5th/Center fin, Fin Placement Callouts)
- `components/volume/volume-controls.tsx` — `coarse:min-h-11` on both checkbox rows (Measure This Board's Real Shape, Use This Board's Real Rail & Thickness Data)
- `e2e/touch-sizing.spec.ts` — new, this plan's own touch-sizing proof

## Decisions Made

See `key-decisions` in the frontmatter for the full list. The one worth restating in plain English: **on the two screens this plan tests (TEMPLATE and VOLUME), the only Button component actually reachable inside the sidebar itself is a dev-only "Copy preset values" button that is deliberately a smaller size this plan doesn't touch.** Rather than scope the spec's button check to the sidebar and get a false failure (or a check that never runs against anything real), the spec targets the `h-8`/`size-8` class tokens that are unique to the default/icon sizes — which correctly finds the phone top bar's Save button (grown by this same plan's Task 1 change, since it's the same shared `Button` component) and correctly skips the dev-only button, without touching any file outside this plan's `files_modified`.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria (grep counts, desktop baseline/regression, `npm test`, `npx tsc --noEmit`, the new spec on all three projects) were met without needing an auto-fix.

## Issues Encountered

**Pre-existing test-environment flakiness, not caused by this plan.** During Task 1 and Task 2 verification, running the full `e2e/desktop-baseline.spec.ts` + `e2e/desktop-regression.spec.ts` suite together intermittently failed one screenshot comparison per run — but a *different* screen failed each time (FINS, then RAILS, then TEMPLATE), each with a tiny pixel diff (0.01-0.02% of the image), and every single one passed cleanly when re-run in isolation. This wave runs four executors in parallel (this plan plus 09-03, 09-04, 09-06), each launching its own `next dev` server and headless Chromium instances at the same time — the CPU/rendering contention from that is the far more likely explanation than a real pixel regression, especially since the specific failing test was never consistent across runs and never touched a file this plan modified in the way that would explain the diff (a font-loading/animation-timing race, not a layout change). Documented here rather than fixed, per the deviation rules' scope boundary (pre-existing, environment-level, not caused by this task's changes). The final verification pass (recorded above) ran clean on every required command.

## User Setup Required

None — no external service configuration required. No dependency was installed (`npm install --no-audit --no-fund` only synced existing `package.json`; `git diff package.json` is empty).

## Human verification deferred to end-of-phase UAT

- **Tapping a number field on a real iPhone to confirm the page does not zoom.** Playwright's WebKit/Chromium emulation does not reproduce iOS Safari's actual auto-zoom-on-focus behavior for a sub-16px field, so `touch-sizing.spec.ts`'s `window.visualViewport.scale === 1` assertion is a regression guard on the 16px rule itself, not a reproduction of the real iOS behavior. A real device check is the actual proof.
- **Manual desktop regression pass (PHON-05, VALIDATION.md Manual-Only table).** On a desktop browser at least 820px wide, across all five design screens: tab through every control and operate it with the keyboard, click every button and drag every slider with the mouse, confirming nothing changed size or position from the deployed site. This plan's automated equivalents (the five pixel-identical desktop baseline screenshots, plus two real mouse-drag regression tests on TEMPLATE and ROCKER) exercise the same surface and passed at every task and at final verification, but full keyboard-only operation of every control was not run by a human during this autonomous execution.
- **A general look at the grown controls on real iOS and Android hardware** — the buttons, slider hit-rings, typed fields and checkbox rows should all be confirmed comfortable under a real thumb, not just measured by Playwright's device emulation.

## Next Phase Readiness

- Every shared control component (`Button`, `Slider`, `Input`) and `MeasureField` now carries its pointer-keyed touch-size rule — any later plan in this phase that renders through these components inherits 44px targets automatically, with no further per-call-site work.
- `e2e/touch-sizing.spec.ts` is this plan's own spec file (distinct from `e2e/phone-layout.spec.ts`, which owns the phone-shell surface) — later plans extend this file for further touch-sizing assertions rather than starting a new one, per its own header comment.
- No blockers for 09-06 or 09-07.

## Self-Check: PASSED

All 9 modified files and 1 created file (`e2e/touch-sizing.spec.ts`) confirmed on disk. All 3 commits (`39eb654`, `effe16e`, `c0542c7`) confirmed in `git log`. `git diff --diff-filter=D` against each commit's parent showed no unexpected deletions. No missing items.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-09*
