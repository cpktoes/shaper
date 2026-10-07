---
phase: quick-261007-fnz
plan: 01 and 02
subsystem: drawing viewers (ROCKER, TEMPLATE, RAILS, FINS, ROCKER's TOP VIEW tab)
status: complete
tags: [zoom, pan, pinch, grid, viewers, touch]
requires: []
provides:
  - one shared zoom for every drawing viewer (components/viewer/zoom-viewport.tsx, zoom-math.ts, zoom-grid.tsx)
  - zoom on ROCKER's side view, TEMPLATE, each RAILS cross-section, FINS (to 4x) and the TOP VIEW tab
affects: [ROCKER, TEMPLATE, RAILS, FINS]
tech-stack:
  added: []
  patterns:
    - "a viewer hands the shared zoom only its base viewBox, its grid frame and maxZoom; everything else is shared"
    - "sizes pinned to the fit are pinned to fit x zoom; raw drawing-unit widths, dashes, radii and gaps x zoomUnit"
key-files:
  created:
    - components/viewer/zoom-math.ts
    - components/viewer/zoom-math.test.ts
    - components/viewer/zoom-viewport.tsx
    - components/viewer/zoom-grid.tsx
    - e2e/viewer-zoom.spec.ts
  modified:
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-top-view.tsx
    - components/viewer/callout-primitives.tsx
    - components/outline/outline-viewer.tsx
    - components/outline/outline-editor.tsx
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-band-editor.tsx
    - components/fins/fin-viewer.tsx
    - components/fins/fin-placement-editor.tsx
    - e2e/desktop-baseline.spec.ts-snapshots/{rocker,outline,rails,fins}-desktop-desktop-darwin.png
decisions:
  - "Each RAILS plot's zoom row is handed (React portal) to a see-through copy of the plot row's layout, so it sits at the right end of the plot's title line without being inside the plot row the browser tests count as the drawing"
  - "FINS's zoom provider sits in fin-placement-editor.tsx (the plan's allowed fallback) with maxZoom FINS_MAX_ZOOM = 4"
  - "TEMPLATE's own press handler runs in the capture phase ahead of the shared pan, keeping one press handler on the drawing"
  - "Three small additions to the shared pieces, made once in components/viewer/: zoomDashToken, ZoomGrid omitMajor, and an output reading's 2-unit lift following the zoom unit"
metrics:
  completed: 2026-10-07
  duration: plan 02 about 3 h 20 min
estimate:
  tokens: 240000
actuals:
  tokens: 17100
  tasks: 3
  commits: 9
---

# Quick 261007-fnz (plans 01 and 02): Continuous zoom in every drawing viewer — Summary

**One shared zoom — the wheel, a trackpad pinch, two fingers, a drag to move around, the zoom row and a grid that appears
as you zoom in — now on ROCKER's side view, TEMPLATE, every RAILS cross-section, FINS (up to 4x) and ROCKER's TOP VIEW
tab, with every 1x screen and every printed page pixel for pixel what it was.**

## What it means for a shaper

Every drawing on the design screens can now be looked at closely. On a computer, turn the mouse wheel over the drawing
(or pinch on the trackpad) and it zooms toward the pointer in half steps, from 1x up to 10x (FINS stops at 4x — it is
already drawn large). Once zoomed in, drag with the mouse to move the drawing around; it never slides off the edge of the
board. A small row under the toolbar icons (or in the drawing's corner where there are no icons) shows the level, with
zoom out, zoom in and a button back to 1x; a double-click also goes back to 1x. On a phone, pinch with two fingers to zoom
and to move around; once zoomed in, one finger moves the drawing too; a double-tap goes back to 1x. The zoom row only
appears on a phone once you have zoomed in, so a phone's normal screen is unchanged.

On TEMPLATE the drag points still work at every zoom: press on a point and drag it exactly as before — it is just as
easy to grab at 3x as at 1x, and finer on the board — and drag anywhere else to move the drawing. On a phone one finger
still picks a point and drags it, on it or from anywhere else on the drawing; if a second finger lands mid-drag, the drag
stops where it got to and the two fingers zoom instead. On RAILS each cross-section zooms on its own (zooming the nose
leaves the center and tail alone); on a phone held sideways a thumb on a plot still scrolls the drawing column at 1x, and
only once that plot is zoomed in does the thumb move the plot instead.

Lines, dots, cards and words stay the same size on screen at every zoom — only the board gets bigger. As you zoom in, a
grid appears behind the drawing at the finest spacing that stays readable (1", 1/2", 1/4", 1/8", 1/16"; Metric 2 cm, 1 cm,
5 mm, 2 mm, 1 mm), with the 1" (2 cm) lines darker, counted from the board's tail tip and its stringer (ROCKER: the tail
tip and the rocker baseline). RAILS keeps its own inch (10 mm) grid and numbers exactly as they were and adds only finer
lines between them.

What stays the same: at 1x every drawing is exactly what it was; the order form, the Overview Sheet, the Full Sized
Template, the Paper Saver, the View Full Sized dialog, the reference figures, the ☰ tiles, the Board Rack and the
computer's small blank-from-above picture over ROCKER's side view never zoom; and nothing about the zoom is saved —
turning the board, leaving the screen or reloading starts again at 1x.

## Commits

Plan 01 (ROCKER first, merged to main at 07ea5f1, the founder approved ROCKER as built):

| Commit | Subject |
|---|---|
| cf8f51c | docs(quick-261007-fnz): ROCKER at 1x as drawn today — the before shots the zoom must not change |
| 7bcd933 | ROCKER: the mouse wheel zooms the side view toward the pointer, and the level shows under the toolbar |
| de4e46c | Zoom on ROCKER: pinch, drag to pan, the zoom buttons and double-click, with lines and words the same size at every zoom |
| f9a1a65 | ROCKER: a grid appears as you zoom in, finest that stays readable, 1-inch lines darker |
| de916ca | test(quick-261007-fnz): ROCKER's desktop baseline picture now shows the zoom row under the toolbar |
| 0655a4c | docs(quick-261007-fnz): pictures — ROCKER at 1x and at 6x on the nose with the grid, Imperial and Metric |

Plan 02 (this worktree, on top of 07ea5f1):

| Commit | Subject |
|---|---|
| 3d5a725 | docs(quick-261007-fnz): TEMPLATE, RAILS, FINS and TOP VIEW at 1x as drawn today — the before shots |
| 08a3fdc | test(quick-261007-fnz): TEMPLATE's zoom tests, written before TEMPLATE can zoom |
| 972d72f | TEMPLATE zooms like ROCKER: wheel, pinch, pan and the zoom buttons, with every drag point still dragging at any zoom |
| 92facc2 | RAILS: each cross-section zooms on its own; FINS zooms up to 4x — same controls and grid as ROCKER |
| 5b0b19a | The TOP VIEW tab on a phone zooms like the side view; the computer's corner picture stays as it is |
| 76e8eb2 | TEMPLATE keeps one press handler for the drawing, with the zoom's pan behind it |
| 827621a | test(quick-261007-fnz): TEMPLATE, RAILS and FINS desktop baseline pictures now show their zoom rows |
| 6555a0b | docs(quick-261007-fnz): pictures — TEMPLATE, RAILS, FINS and the TOP VIEW tab at 1x and 3x |
| (this) | docs(quick-261007-fnz): summary |

## The shared pieces, and what each viewer hands them

- `components/viewer/zoom-math.ts` — the view maths with no React or DOM: half-step levels, the box-shaped zoomed view
  kept inside the frame, zoom about a point (with the plan-01 `anchor` memory so repeated steps at one pointer re-aim at
  the same drawing point), pan, pinch, wheel bursts, the grid ladder and line positions, `scaleDash`,
  `rectInContentFrame`. Tested in `zoom-math.test.ts`.
- `components/viewer/zoom-viewport.tsx` — `ViewerZoomProvider` (the level, never saved; reset by its React `key`),
  `useViewerZoom(svgRef, baseViewBox, { touch, canPanFrom, onPinchStart })`, `ScreenSizeGroup`, `ViewerZoomControl`,
  and (plan 02) `zoomDashToken`.
- `components/viewer/zoom-grid.tsx` — `ZoomGrid`, the grid drawn first in a viewer's content group; (plan 02) `omitMajor`.
- `components/viewer/callout-primitives.tsx` — every tick, leader, card hairline and gap follows `useViewerZoomUnit()`.

| Viewer | Provider (key) | Base viewBox | touch | maxZoom | Grid frame | Control |
|---|---|---|---|---|---|---|
| ROCKER side view | rocker-editor, keyed on orientation | the layout's string | pan | 10 | tail tip / rocker baseline | under the icons |
| TEMPLATE | outline-editor, keyed on orientation | vertical or turned frame | viewer | 10 | tail tip / stringer, in the turned group | under the icons |
| RAILS (each plot) | `RailPlotZoom` per plot (phone: keyed on the section) | `0 0 w h` | pan | 10 | RAILS's own origin, ladder from 1" (10 mm), `omitMajor` | right end of the title line (computer), plot corner (phone) |
| FINS | fin-placement-editor, `maxZoom={FINS_MAX_ZOOM}` | `0 -36 530 406` | pan | 4 | tail tip / stringer | drawing's corner |
| TOP VIEW tab | rocker-editor TOP VIEW tab, keyed on orientation | the frame's string | pan | 10 | tail tip / stringer, in the turned group | tab's corner |

The computer's mini display (`TopViewInset`) renders `RockerTopView` without `zoomable`, which never reads a zoom, so it
cannot follow the side view's provider it sits inside.

## Measured facts (plan 01's M1–M12), as confirmed

- M1, M2, M4, M6–M9, M11, M12 — confirmed in plan 01 (ROCKER) and not re-measured here.
- M3 — confirmed: TEMPLATE's `toBoardPoint` needed no change; a mouse drag of the widepoint at 3x reaches the solver and
  a finger's direct and remote drags work at a pinched zoom (`e2e/viewer-zoom.spec.ts`).
- M5 — confirmed on 1280 × 800: TEMPLATE 7.66 px per inch at 1x (its 1" grid lines are 22.97 px apart at 3x), each RAILS
  plot 59.59 (fit 1.064; 1/8" lines at 3x), FINS 18.64 (fit 1.331; 1/2" lines 27.96 px apart at 3x). The TOP VIEW tab on
  an iPhone 14 measured 5.13 px per inch at 1x, so at 3x (15.4 px per inch) not even the 1" rung reaches 20 px: no grid
  at 3x there, by the rule; the 1" grid first appears at 4x (20.5 px).
- M10 — confirmed: RAILS's seven line kinds keep `vector-effect` and were not given a zoom-unit width.

## Gates

- `npx vitest run`: 128 files, 4565 passed, 2 skipped (after the press-handler fix; before it, the two
  `drag-pick-wiring.test.ts` source checks failed — see Deviations).
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Playwright, `PW_PORT=3172 IS_WEBPACK_TEST=1`, all three projects:
  - `viewer-zoom` + `touch-drag` + `desktop-regression`: 42 passed, 81 skipped (projects a test does not apply to).
  - `viewer-toolbar`, `phone-chrome`, `rocker-top-view`, `phone-rails`, `phone-fins-labels`, `phone-fins-landscape`,
    `outline-ghost`, `touch-sizing`, `summary-planing`, `undo-redo`: 207 passed, 232 skipped, 2 failed on the long
    cold-server run (`rocker-top-view.spec.ts:179` timed out opening ROCKER; `touch-sizing.spec.ts:400` did not find
    TEMPLATE's typed field); both passed re-run alone.
  - `desktop-baseline`: 5 passed after re-recording three (ROCKER and VOLUME unchanged).
  - `touch-drag.spec.ts`, `desktop-regression.spec.ts`, `phone-rails.spec.ts` and the FINS phone specs pass unedited.
- Scope: since 07ea5f1 the diff touches only plan 02's `files_modified` plus the three documented additions in
  `components/viewer/` (32 lines). Nothing under `lib/`, `app/`, `components/summary/` or `components/design/` changed.

## Baselines re-recorded, and why

- Plan 01: `rocker-desktop-desktop-darwin.png` — the new zoom row under ROCKER's toolbar.
- Plan 02: `outline-desktop-desktop-darwin.png` (zoom row under TEMPLATE's icons), `rails-desktop-desktop-darwin.png`
  (a zoom row at the right end of each of the three titles), `fins-desktop-desktop-darwin.png` (zoom row in the corner).
  Each diff was opened first: the red pixels are the zoom rows alone. FINS's diff also showed faint, below-threshold
  anti-aliasing differences on two labels; the FINS drawing itself matches the 1x proof shot taken before the work pixel
  for pixel, so those came from the old baseline's rendering, not from this change.

## The 1x proof (all pixel-identical, before vs after)

Plan 01: `rocker-1x-desktop-fresh`, `-blank`, `-vertical`, `rocker-1x-iphone-blank`, `rocker-1x-summary`.
Plan 02: `outline-1x-desktop`, `-construction`, `-horizontal`, `outline-1x-iphone`; `rails-1x-desktop-nose`, `-center`,
`-tail`, `rails-1x-iphone`; `fins-1x-desktop`, `fins-1x-iphone`; `topview-1x-iphone-tab`, `topview-1x-desktop-inset`;
the order form's `summary-1x-outline` (Deck template), `summary-1x-fins` (Bottom template with the fin marks),
`summary-1x-rails` (center), `-rails-nose`, `-rails-tail`. All 17 plus plan 01's 5 re-shot after the last code commit with
no `--update-snapshots`: 14 tests, all passed. They live in `pictures/1x-proof/`.

## Pictures for the founder (`pictures/`)

- `template-1x.png` / `template-3x.png` — TEMPLATE on a computer; at 3x over the tail third: the 1" grid around the board,
  the chips and the Tail @ 12" reading the same size as at 1x.
- `rails-1x.png` / `rails-3x-center.png` — the Center cross-section at 3x on its apex while Nose and Tail stay at 1x; the
  1/8" lines between RAILS's own inch lines, dots the same size.
- `fins-1x.png` / `fins-3x.png` — FINS at 3x on the centre fin; the 1/2" grid counted from the tail and the stringer.
- `topview-1x-iphone.png` / `topview-3x-iphone.png` — the TOP VIEW tab on an iPhone 14 with US Blanks 6'2"A, at 3x on the
  nose: the level and reset in the corner; no grid yet at 3x (see M5).
- From plan 01: `rocker-1x.png`, `rocker-6x-nose.png`, `rocker-6x-nose-metric.png`.
- The picture scripts are in `pictures/shoot-source.tar.gz` (plan 01's scripts extended with "proof-02" and
  "founder-02"); no loose script is left under `.planning/`.

## Founder questions (from plan 01)

The founder approved ROCKER as built, so the defaults below are in force; each is easy to change in one place.

- Q1. Metric grid 2 cm, 1 cm, 5 mm, 2 mm, 1 mm with 2 cm lines darker — default in force (yes).
- Q2. The zoom row in its own row under the toolbar icons — default in force (yes); FINS and the TOP VIEW tab use the
  drawing's corner, RAILS the right end of each title.
- Q3. On a phone the row shows only once zoomed in, as the level and reset — default in force (yes).
- Q4. Decided by the orchestrator before dispatch: one finger pans once zoomed in and is the browser's at 1x on ROCKER,
  RAILS, FINS and the TOP VIEW tab — built that way.
- Q5. The grid behind the board, showing around it and through the blank's foam — default in force (yes).
- Q6. Half steps even during a pinch — default in force (steps, per the brief).
- Q7. TEMPLATE: a mouse drag on a drag point moves it, anywhere else pans; a finger keeps pick-then-drag-from-anywhere at
  every zoom — built that way; open for the founder to confirm on the TEMPLATE pictures.

## Deviations from Plan

### Plan 01 (as its executor reported)

1. `ZoomState` gained an optional `anchor`, so repeated zoom steps at one pointer re-aim at the same drawing point when
   the clamp moved the view (the slip grew to 22 px at 6x without it).
2. The tracer test allows a whole-pixel difference for where the pointer can land (a mouse position is a whole pixel).
3. The grid's anchor test reads line positions from the attributes arithmetically, not from single-precision `baseVal`.
4. ROCKER's provider also wraps the computer's corner picture (it sits in the same box), which therefore must never read
   a zoom — plan 02's `zoomable` prop keeps it that way.
5. The provider's live state for its input listeners lives in a `useState`-created object (no ref read during render).
6. `StationCard` / `StationReadout` read the zoom unit from context rather than through props.

### Plan 02

1. **[Rule 1 - Bug] The tracer's slider.** The plan said the widepoint drag moves the Wide Point Width slider; the
   widepoint's drag moves WP Offset (Width is slider-only, `lib/geometry/outline-drag.ts`). The tests assert Offset.
2. **[Rule 3 - Blocking] Where each RAILS zoom row lives.** With the row inside the plot row, `phone-rails.spec.ts`
   ("every open rail still draws side by side") counted the rows' icons as drawings (12 svgs, not 3). Each plot's row is
   now handed by a React portal to a see-through copy of the plot row's own layout (same column, widths, gaps, a blank
   line where each title is and a box of each plot's shape), so it lands at the right end of its title line exactly as R1
   asks (measured: x 931–1099 on 1280 × 800, clear of the titles and the toolbar) and the spec passes unedited.
   `RailPlotZoom` (in `rail-section-plot.tsx`) is each plot's provider; the plan's "title line `relative`" was not needed.
3. **[Rule 3 - Blocking] TEMPLATE's press handler.** Composing the pan into TEMPLATE's own press handler named the zoom's
   handler a second time and failed `components/viewer/drag-pick-wiring.test.ts` (exactly one press handler on the
   drawing). TEMPLATE's handler now runs in the capture phase and the zoom's arrives with the rest of its props; the
   zoom's `canPanFrom` declines a press TEMPLATE already took. No behaviour change.
4. **Extending the shared pieces once (orchestrator ruling), 32 lines in `components/viewer/`:** `zoomDashToken` (TEMPLATE
   and FINS draw reference lines with CSS dash tokens, which `scaleDash` cannot read; the exact `var()` at 1x),
   `ZoomGrid`'s `omitMajor` (RAILS draws its own inch lines; no line drawn twice), and `OutputRail`'s 2-unit lift off its
   line now follows the zoom unit (exactly 2 at 1x). Task 3's "components/viewer untouched" scope check therefore does
   not hold literally; these are the only lines.
5. **Gaps follow the zoom unit, not only widths.** Besides widths, dashes and radii, the small gaps that place a word or a
   tick off its line follow the zoom unit, so they stay put on screen: TEMPLATE's WP Offset card step, RAILS's tick
   lengths and axis-number gaps, FINS's dimension-line offsets, tick extensions, label gaps and label halos. Metric RAILS's
   number thinning reads the zoomed scale, so more numbers show as you zoom in. All exactly 1x at 1x (proof shots).
6. **FINS's provider** sits in `fin-placement-editor.tsx` (the plan's allowed fallback), so the key link
   `maxZoom={FINS_MAX_ZOOM}` is in that file; `FINS_MAX_ZOOM` is exported from `fin-viewer.tsx`.
7. **The phone's RAILS plot box** was `coarse:relative`; it is now always `relative` (no visual change).
8. **Order-form proof shots:** the order form draws no FINS diagram, so `summary-1x-fins.png` is its Bottom template with
   the fin marks; two extra RAILS shots (nose, tail) were added.
9. **RAILS's 3x picture** aims at the rail's apex-centre dot rather than the apex line's midpoint (which showed mostly
   empty grid).

## Known Stubs

None.

## Self-Check: PASSED

All created files and pictures exist; commits 3d5a725, 08a3fdc, 972d72f, 92facc2, 5b0b19a, 76e8eb2, 827621a, 6555a0b are
on this branch, and plan 01's six are in its history.
