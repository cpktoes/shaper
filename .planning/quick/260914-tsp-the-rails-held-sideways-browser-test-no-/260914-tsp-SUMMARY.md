---
phase: quick-260914-tsp
plan: 01
subsystem: testing
tags: [playwright, e2e, rails, phone-layout, flaky-test]

requires: []
provides:
  - "A settled-layout wait (`settledDrawingColumn`) e2e/phone-rails.spec.ts can reuse for any
    future test that needs to measure a rail-plot-driven drawing after hydration, not before it"
  - "The `data-rail-plot-fit=\"measured\"` hook on rail-band-editor.tsx's desktop plots row, the
    first honest 'the browser has measured this' signal this screen has"
affects: [e2e/phone-rails.spec.ts, components/rails/rail-band-editor.tsx]

actuals:
  tokens: 4114
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Two-stage settle wait: page.waitForFunction on a browser-set marker, then a second
      page.waitForFunction polling { polling: \"raf\" } until a metric holds steady for 10
      frames, with the running count kept on window under a namespaced key — same shape as
      e2e/summary-preview.spec.ts's existing --order-form-preview-scale wait."
    - "A held-out known failure (test.fail(true, reason)) that runs the SAME body as the passing
      case, rather than a skip, so a fixed defect flips Playwright's own report instead of
      staying silently absent."

key-files:
  created: []
  modified:
    - components/rails/rail-band-editor.tsx
    - e2e/phone-rails.spec.ts
    - CLAUDE.md

key-decisions:
  - "The new browser-measured marker is a boolean state flag (plotFitMeasured) flipped inside the
    solver's own recompute, next to setPlotWidth, so React batches both into one render — set
    only on the real-measurement path, never on the degenerate early return, so its presence
    means 'the browser measured this container' and not merely 'this effect ran'."
  - "The 390 case (toolbar hidden) is kept as a running test.fail expected failure rather than
    removed or skipped — it's a standing, machine-checked record of a real UI shortfall (three
    open plots collapse to 40px slivers with nothing left to scroll) that flips itself the day
    the plot-fit rule changes."
  - "The fit rule itself (MAX_PLOT_W, the chrome arithmetic, the solver) was not touched — whether
    three open plots should shrink that far on a short screen is the founder's call, left as an
    open question, not decided here."

patterns-established:
  - "settledDrawingColumn / proveDrawingColumnScrolls in e2e/phone-rails.spec.ts: the house
    pattern for 'wait until a browser-measured layout has actually settled' before asserting
    against a drawing column driven by a useLayoutEffect solver."

requirements-completed: [QT-260914-tsp]

coverage:
  - id: D1
    description: "The 844x340 held-sideways scroll test (a real iPhone with Safari's own bar
      showing) passes deterministically, waiting for the browser's real layout instead of racing
      the page."
    verification:
      - kind: e2e
        ref: "e2e/phone-rails.spec.ts › RAILS held sideways ... › iPhone sideways with Safari's bar showing, 844x340 ...; repeat-each 5"
        status: pass
    human_judgment: false
  - id: D2
    description: "The 844x390 case (toolbar hidden) is recorded as a known, expected Playwright
      failure — not silently dropped, not a skip — proving the three-open-plots-collapse-to-
      slivers shortfall stays visible until the founder decides how plots should fit."
    verification:
      - kind: e2e
        ref: "e2e/phone-rails.spec.ts › RAILS held sideways ... › iPhone sideways with the toolbar hidden, 844x390 ...; repeat-each 5"
        status: pass
    human_judgment: false
  - id: D3
    description: "The rails screen gains one pixel-inert, test-only measured-fit hook and no
      other behavior change; the desktop baselines and regression pass unchanged and
      unregenerated."
    verification:
      - kind: unit
        ref: "npx tsc --noEmit; npm run lint; npm test (62 files, 2507 passed, 2 skipped, untouched)"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts + e2e/desktop-regression.spec.ts --project=desktop (7 passed, no snapshot regenerated)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-15
status: complete
---

# Quick Task 260914-tsp: Rails-held-sideways browser test — no more racing the page

**The RAILS-on-a-real-iPhone-sideways scroll test now waits for the browser to actually finish
measuring the drawing before it checks anything, instead of sometimes winning a race against the
page loading — and the one sideways height where scrolling genuinely doesn't work anymore (toolbar
hidden) is recorded as a standing, machine-checked known issue instead of quietly passing by luck.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-15T04:46:58Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added one invisible, test-only marker to the Rails screen (`data-rail-plot-fit="measured"`) that
  only appears once the browser has actually sized the three rail drawings for real — nothing a
  shaper can see changed, no plot moved or resized differently than before.
- Rewrote the flaky held-sideways scroll test so it waits for that marker, and then waits until the
  drawing column has stopped changing shape for ten screen-refreshes running, before it measures
  anything. No more guessing with a timer — it genuinely waits for the real page.
- Split the single old test into two: one at 340 dots tall (a real iPhone held sideways with
  Safari's own address bar on screen) which must scroll and does, every single time; and one at the
  full 390 dots (same phone, toolbar hidden) which is now honestly recorded as *not* scrollable —
  at that height the three open rail drawings shrink down to 40-dot slivers and there's nothing left
  to scroll. That second one is marked as a known, expected failure rather than deleted or skipped,
  so if a future change to how the drawings resize ever fixes it, the test will loudly announce
  "this started passing" instead of staying silently wrong forever.
- Updated CLAUDE.md's short-screen explanation to say which of the two sideways heights is actually
  proven (340) and which is the recorded known gap (390), so nobody reading it is misled into
  thinking the full 390 case already works.

## Task Commits

Each task's file changes are committed together — a single atomic commit, since the plan's three
tasks form one coherent fix (a test-only marker, the rewritten test that consumes it, and the
documentation that describes both):

1. **`0e72eaf`** — `test: the rails held-sideways check waits for the drawing to settle instead of
   racing the page` — carries `components/rails/rail-band-editor.tsx`, `e2e/phone-rails.spec.ts`,
   and `CLAUDE.md` together.

**Plan metadata:** this SUMMARY, committed separately (see below) as the last commit in this
worktree.

## Files Created/Modified

- `components/rails/rail-band-editor.tsx` — added a `plotFitMeasured` state flag, flipped `true`
  only on the real-measurement path inside the existing plot-sizing solver (never on the
  degenerate early-paint/hidden-pane branch), and rendered as the conditional, pixel-inert
  `data-rail-plot-fit="measured"` attribute on the desktop plots row. No other line changed — the
  sizing rule itself is untouched.
- `e2e/phone-rails.spec.ts` — added two file-local helpers (`settledDrawingColumn`,
  `proveDrawingColumnScrolls`) and replaced the single flaky 844x390 test with two tests sharing
  one body: 844x340 (must always pass) and 844x390 (known expected failure). Every other test in
  the file is untouched.
- `CLAUDE.md` — the "Short screen — height alone." paragraph now names 340 as the height the test
  proves the scroll at, and 390 (toolbar hidden) as the height recorded as an expected failure
  until the founder decides how rail plots should fit on a short screen.

## Decisions Made

- **The browser-measured marker is scoped narrowly.** It only ever means "the browser just ran a
  real measurement of this container" — it deliberately does NOT flip on the initial server-drawn
  paint or on a hidden/zero-size pane (a portrait phone's desktop plots row is always
  `max-shell:hidden` and would otherwise never clear a "has this run" bar that was really asking
  "did this measure anything real").
- **The 390 case stays in the file as an expected failure, not a skip or a deletion.** A skipped
  test is invisible; this one runs every time and fails for a specific, numeric reason — so it
  cannot silently rot, and the day it starts passing Playwright itself will say so.
- **The plot-sizing rule (the solver, `MAX_PLOT_W`, the chrome math) was not touched.** Whether
  three open rail drawings should really shrink that far on a very short sideways phone screen is
  a founder call, not something decided inside this quick task.

## Deviations from Plan

None — plan executed exactly as written. All `<reference_snippets>` helper bodies (sections A and
B) were used verbatim as instructed; the comment content (section C) and the CLAUDE.md insertion
(section D) were written to match the plan's described content and intent.

## Issues Encountered

None. `npx tsc --noEmit` reported only the two pre-existing phantom `LayoutProps` errors from
`.next/types` (unrelated to this change, present before it, explicitly called out in the plan as
not a failure) on the first run of the day; on the later re-run under a warm cache it reported
nothing at all.

## Verification — every command run, with its real result

All six commands were run from inside this agent's own worktree
(`/Users/kontoes/Code/shaper/.claude/worktrees/agent-a3e3565b55b25f81c`), in order, every one green
before anything was committed. `--update-snapshots` was never passed; port 3000, `next dev`, and
`npm run dev`/`npm run build` were never touched; every Playwright run used
`PW_PORT=3161 IS_WEBPACK_TEST=1`, which starts and stops its own dev server on 3161.

1. **`npx tsc --noEmit`** — clean of anything under `e2e/` or `components/` (only the two known
   `.next/types` phantom `LayoutProps` lines on the first run; none at all on the later re-run).
2. **`npm run lint`** — 0 errors, 12 pre-existing warnings in unrelated files (unchanged by this
   task).
3. **`npm test`** (vitest) — `Test Files 62 passed (62)`, `Tests 2507 passed | 2 skipped (2509)`.
   Untouched by this work, as required.
4. **`PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts`** (all three
   projects) — `28 passed`, `26 skipped` (project-scoped `test.skip` guards, expected), exit code
   0. The 390 case reported with the `✘` marker Playwright uses for an *expected* failure and was
   counted inside the "passed" total, never as an unexpected pass and never as a skip.
5. **`PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts --project=iphone
   -g "held sideways" --repeat-each 5`** — `15 passed`, `5 skipped` (the Pixel-7-only test,
   correctly skipped on the iphone project each of the 5 repeats). Of the 15 "passed": 5 are the
   pinned INSTRUCTIONS-heading test, 5 are the 844x340 scroll test (5/5, every run), and 5 are the
   844x390 known-failure test (5/5 reported as expected failures — Playwright's own `✘` marker in
   the per-test line, folded into "passed" in the summary because the failure matched
   `test.fail`'s declared expectation). Never once an unexpected pass.
6. **`PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts
   e2e/desktop-regression.spec.ts --project=desktop`** — `7 passed` (5 desktop baseline
   screenshots — TEMPLATE, ROCKER, RAILS, VOLUME, FINS — plus 2 desktop mouse-drag regression
   checks). No snapshot was regenerated; the five baseline screenshots under
   `e2e/desktop-baseline.spec.ts-snapshots/` matched as they already stood.

## Threat Flags

None - no new attack surface. The only production change is the constant string
`data-rail-plot-fit="measured"`, which carries no board data and no measurement value — see the
plan's own threat register (T-260914-tsp-01, already disposed "accept").

## Next Phase Readiness

- No blockers. This closes the flaky-test concern noted in the plan's own objective; the 390
  known-failure test is the standing record of the one real remaining gap (three open rail plots
  shrinking to unusable slivers on the shortest sideways phone height), left for the founder to
  decide, not for a future test fix.

---
*Phase: quick-260914-tsp*
*Completed: 2026-09-15*
