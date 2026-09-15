---
phase: quick-260914-v2v
plan: 01
subsystem: rails-viewer
tags: [layout, phone, rails, short-screen]
dependency-graph:
  requires: [design-screen-shell.tsx's overflow-y-auto short-screen rule (10-SWEEP-2.md)]
  provides: [readable rail cross-sections on a phone held sideways]
  affects: [components/rails/rail-band-editor.tsx, components/viewer/tabbed-panel.tsx]
tech-stack:
  added: []
  patterns: ["read a CSS decision from the DOM (getComputedStyle) instead of duplicating its cutoff in JS", "additive [@media(max-height:500px)] class layering, gated behind an opt-in prop"]
key-files:
  created: []
  modified:
    - components/rails/rail-band-editor.tsx
    - components/viewer/tabbed-panel.tsx
    - e2e/phone-rails.spec.ts
    - CLAUDE.md
decisions:
  - "The founder's decision, 2026-09-14, chosen from four fitting rules measured side by side: on a screen 500 dots tall or shorter, the rail plots take the drawing column's own width instead of fitting its height, and the column scrolls."
  - "The plot-fit solver reads whether the column may scroll from the DOM (getComputedStyle(column).overflowY) rather than adding its own 500-dot height check, keeping the cutoff defined in one place (design-screen-shell.tsx)."
  - "TabbedPanel's card-growth shape is the min-h-fit approach (not the flex-none fallback) -- WebKit honoured min-height: fit-content on these flex items on the first measurement, so no fallback was needed."
metrics:
  duration: ~45min
  completed: 2026-09-14
actuals:
  tokens: 42000
  tasks: 3
  commits: 3
status: complete
---

# Phase quick-260914-v2v Plan 01: Sideways rail plots take the drawing column's width Summary

Fixed the rail cross-section drawings on the RAILS screen so a shaper turning their phone
sideways can actually read them, instead of watching all three shrink to slivers.

## What a shaper sees now

Turn the phone sideways on the RAILS screen with Nose, Center and Tail all open. Before this
fix, the app tried to squeeze all three drawings into the short sideways screen at once — on a
real iPhone with Safari's toolbar hidden, that meant each drawing came out about 40 dots tall, a
line rather than a picture. Now the three drawings are drawn at the full width of the drawing
area — 416 dots across, about ten times bigger — and the drawing area scrolls, so a shaper flicks
down through Nose, Center and Tail one at a time at a size they can actually read. The coloured
key that names each band now sits under the last drawing, not printed across the bottom of it,
and the panel around the drawings grows tall enough to hold the whole stack without spilling past
its own border.

Close a section (say, Tail) and the remaining two stay just as big — this isn't a special case
for exactly three open sections.

## What stayed the same

On a computer, nothing changed at all. The drawings still shrink to fit the height of the window
exactly as they always have, and every one of the five desktop reference screenshots this project
keeps still matches, byte for byte — none of them was re-recorded. On a phone held upright,
nothing changed either; that layout already shows one cross-section at a time and never used the
rule this fix touches.

## Which card-growth shape shipped

`TabbedPanel` got a new `growOnShortScreen` prop (off by default; RAILS is the only screen that
passes it) that lets the panel's two card layers grow to fit their content on a short screen
instead of being pinned to a fixed height. The plan allowed for two possible shapes here —
`min-h-fit` or, if WebKit didn't honour that, a `flex-none` fallback. **`min-h-fit` worked on the
first measurement** (WebKit did honour `min-height: fit-content` on these flex items), so no
fallback was needed.

## Task-by-task

**Task 1 — the plots take the column's width instead of fitting its height.** In
`rail-band-editor.tsx`'s plot-fit solver, added a check that asks the DOM whether the drawing
column is allowed to scroll (`getComputedStyle(column).overflowY`), reading `design-screen-shell.tsx`'s
own decision rather than repeating the 500-dot short-screen cutoff. When the column may scroll,
the solver stops trying to fit the plots to the column's height and falls back to its existing
full-width behaviour instead. Commit `4aa1049`.

**Task 2 — the key row moves under the plots, and the panel grows to hold it.** Two small,
height-gated class additions in `rail-band-editor.tsx` (the VIEWER content column and the plots
container both gain `[@media(max-height:500px)]:flex-none`) let those boxes take their content's
own height on a short screen instead of clipping it. A new `growOnShortScreen` prop on
`TabbedPanel` does the matching job one layer up: both its card layers gain
`[@media(max-height:500px)]:min-h-fit` when the prop is set, so the panel itself grows too. Every
class here is prefixed with the `max-height:500px` query, so a real desktop window (never under
500 dots tall) can never reach any of it, and `TabbedPanel` emits byte-identical classes for every
screen that doesn't pass the new prop. Commit `a0e63e6`.

**Task 3 — the browser test proves both real sideways heights, and CLAUDE.md is brought up to
date.** `e2e/phone-rails.spec.ts` gained two new assertion helpers (`expectPlotsFillTheColumn`,
`expectKeyRowUnderThePlots`) called from inside the existing scroll-proof helper, so both the
844x340 (Safari's toolbar showing) and 844x390 (toolbar hidden) tests run the identical proof. The
`test.fail(...)` marker that used to record the 390 case as a known failure is gone — that
shortfall is what Tasks 1-2 fixed — and a third test proves the two-open-sections case doesn't
quietly regress to the old fit-by-height behaviour. CLAUDE.md's "Short screen — height alone"
paragraph now describes three height-gated rules instead of two, recording the new fitting rule
and its date. Commit `600a87e`.

## Verification (real result counts)

| Command | Result |
|---|---|
| `npx tsc --noEmit` (Task 1) | 2 phantom `LayoutProps` errors only (expected, `.next/types`-sourced, not a failure) |
| `npx tsc --noEmit` (Tasks 2, 3) | clean, 0 errors |
| `npm run lint` (all tasks) | 0 errors, 12 pre-existing warnings unrelated to this change |
| `npm test` | 62 test files passed, 2507 tests passed, 2 skipped |
| Task 2 throwaway measurement at 844x390, three open (`e2e/tmp-260914-v2v-measure.spec.ts`, deleted before commit) | 1 passed — plots 416px each; last plot bottom 647, key top 663 (>= 646); card bottom 714 (>= 700); panel bottom 727 (>= 713); column scroll 646/297 |
| `PW_PORT=3162 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts` | 29 passed, 28 skipped |
| Same spec, iPhone only, `-g "held sideways" --repeat-each 3` | 12 passed (3/3 on each of the three held-sideways tests), 3 skipped |
| `e2e/desktop-baseline.spec.ts` + `e2e/desktop-regression.spec.ts`, desktop project | 7 passed; `git status --short e2e` showed no file under any `-snapshots/` directory |
| `e2e/phone-layout.spec.ts e2e/phone-screens.spec.ts e2e/phone-fins-landscape.spec.ts e2e/viewer-toolbar.spec.ts` | 55 passed, 53 skipped |

No `test.fail` remains anywhere in `e2e/phone-rails.spec.ts`.

## Deviations from Plan

None — plan executed exactly as written, including the throwaway measurement spec (written, run,
numbers recorded above, deleted before its commit) and the `min-h-fit` card-growth shape, which
worked without needing the `flex-none` fallback the plan allowed for.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes; this is a
pure CSS/layout and browser-test change to an already-open rail-band drawing.

## Self-Check: PASSED

- `components/rails/rail-band-editor.tsx` — FOUND
- `components/viewer/tabbed-panel.tsx` — FOUND
- `e2e/phone-rails.spec.ts` — FOUND
- `CLAUDE.md` — FOUND
- Commit `4aa1049` — FOUND in `git log --oneline --all`
- Commit `a0e63e6` — FOUND in `git log --oneline --all`
- Commit `600a87e` — FOUND in `git log --oneline --all`
