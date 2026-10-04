---
phase: quick-261003-q2f
plan: 01
subsystem: phone-navigation
tags: [phone, menu, screen-tiles, navigation, undo-redo, playwright]
requires:
  - "quick 261003-q2c (Back and Next at the end of every design screen's controls)"
provides:
  - "The ☰ sheet: six picture tiles of the current board, wherever the top bar is condensed into ☰"
  - "lib/geometry/screen-tiles.ts: the tiles' pure picture geometry, unit-tested on the four presets"
  - "railPlotDots in lib/geometry/rail-bands.ts: one rule for which rail marks get a dot (RAILS plot and RAILS tile)"
  - "formatLengthByWidth in lib/geometry/summary-line.ts"
  - "e2e/helpers/screens.ts: goToScreen, openPhoneMenu, screenTile, expectSixTilesInMenu, expectNoScreensNavigation"
affects:
  - components/design/phone-menu.tsx
  - components/design/phone-top-bar.tsx
  - components/design/phone-undo-bar.tsx
  - components/design/design-screen-shell.tsx
  - components/summary/order-form.tsx
  - components/rails/rail-section-plot.tsx
  - app/page.tsx, app/design/layout.tsx, app/contact/page.tsx, app/privacy/page.tsx, app/error.tsx, app/not-found.tsx
tech-stack:
  added: []
  patterns:
    - "Base UI Menu.Positioner anchored to the top bar's own header: a full-width sheet with no new primitive"
    - "Tile pictures built from the design store inside the open popup only (Base UI unmounts a closed popup)"
key-files:
  created:
    - lib/geometry/screen-tiles.ts
    - lib/geometry/screen-tiles.test.ts
    - components/design/screen-tiles.tsx
    - e2e/helpers/screens.ts
    - e2e/phone-screen-tiles.spec.ts
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/summary-line.ts
    - components/rails/rail-section-plot.tsx
    - components/design/phone-menu.tsx
    - components/design/phone-top-bar.tsx
    - components/design/phone-undo-bar.tsx
    - components/design/design-screen-shell.tsx
    - components/summary/order-form.tsx
    - CLAUDE.md
    - .planning/sketches/MANIFEST.md
  deleted:
    - components/design/phone-tab-bar.tsx
decisions:
  - "The ☰ sheet's first items are six tiles drawn from the current board, on every page where ☰ shows"
  - "No bottom tab bar on any page; the upright phone's Undo/Redo pair sits 16 dots from the bottom-right corner"
  - "All three phone end rooms grew by 4 dots plus the home-bar inset, keeping about 8 dots of daylight above the pair"
status: complete
actuals:
  tokens: 120000
  tasks: 3
  commits: 5
---

# Quick 261003-q2f: the phone menu's screen tiles, drawn from your own board

**On a phone the ☰ menu now opens on six small pictures of the board you are working on, one per
screen. The bottom tab bar is gone, so an upright phone gets its 56 dots back for the controls.**

## What a shaper sees

- **Tap ☰ on a phone** (held upright, or held sideways) and a sheet drops down from the top bar, the
  full width of the screen. Its first six items are tiles: TEMPLATE, ROCKER, RAILS, VOLUME, FINS,
  SUMMARY. Each one has a small picture of the current board as that screen draws it, the screen's
  name, and one line underneath:
  - **TEMPLATE**: the outline lying down, nose on the left. Line: length × width (`6'2" × 18 3/4"`
    for the Shortboard; in Metric `188.0 × 47.6 cm`).
  - **ROCKER**: the side profile at its true proportions, so it reads as a board and not a U, with
    its blank drawn faintly behind it. Line: `On a 6'3"RP`, or `Hand-set` with no blank.
  - **RAILS**: the centre rail's band lines and marks in their usual colours. Line: `Center rail`.
  - **VOLUME**: the board's own estimated litres as the picture (29.6 for the Shortboard, 35.3 Fish,
    50.4 Mid-length, 75.3 Longboard: the same number the preset card and the VOLUME screen show).
    Line: `Estimated`.
  - **FINS**: the tail and fin bases lying down, tail on the right. Line: the fin setup as the FINS
    screen names it (Thruster, Twin, Quad, Single Fin, 2+1).
  - **SUMMARY**: a little order-form page with the board standing in it. Line: `Order form`.
- The screen you are on is ticked. Tapping another tile moves there without reloading, so an
  unsaved board and its undo history come along. Tapping the ticked tile just closes the sheet.
- Under the tiles, the rows that were already in the menu are unchanged: Home (except on the home
  screen), Contact, Privacy, Units, Theme, the account.
- **Upright, the tiles are three across and two down. Sideways, they are one row of six**, each a
  little larger.
- **No bottom tab bar anywhere**: not on the design screens, the home screen, Contact, Privacy or the
  error pages. On an iPhone 14 the controls under the drawing get the 56 dots the bar took.
- **The Undo/Redo pair on an upright phone** now sits 16 dots in from the screen's bottom-right
  corner (plus the home-bar space on a real iPhone). On a computer, and on a phone held sideways, it
  is exactly where it was.
- **Every screen's last row (Back and Next) still scrolls clear of the pair**, with about 8 dots of
  daylight.
- **A computer is unchanged.** It shows no ☰ and no tiles, and every desktop reference screenshot
  matches.

## Measured

- **Sheet**: always at the left edge, the window's full width, top at 48 (directly under the 48-dot bar).
  - iPhone 14 upright 390x664: sheet 390 wide × 616 tall, tiles 117 × 100.
  - Pixel 7 upright 412x839: sheet 412 × 791, tiles 124 × 100.
  - iPhone sideways 844x390: sheet 844 × 342, one row of tiles 130 × 100, bottom of the row at 160.
  - iPhone sideways with Safari's bar 844x340: sheet 844 × 292, tiles 130 × 100, bottom at 160.
  - Pixel 7 sideways 863x360: sheet 863 × 312, tiles 133 × 100, bottom at 160.
- **Undo/Redo pair, upright**: bottom edge 16 dots above the window's bottom and right edge 16 dots
  in (iPhone 648 of 664, Pixel 7 823 of 839).
- **Daylight above the pair, each screen scrolled to its end** (dev server, first preset, one edit,
  both ROCKER Thinning Starts set by hand, the dev-only footer hidden). The last row is Back and
  Next on every screen:

  | Screen | iPhone 14 (390x664) | Pixel 7 (412x839) |
  |---|---|---|
  | TEMPLATE | 7.8 | 8.3 |
  | ROCKER | 7.8 | 8.8 |
  | RAILS | 8.5 | 8.0 |
  | VOLUME | 7.6 | 7.6 |
  | FINS | 8.3 | 8.1 |
  | SUMMARY | 8.3 | 7.5 |

## Commits

| Commit | What |
|---|---|
| 98bef87 | Tests first for the tile pictures and lines (failing until the pictures existed) |
| 8c9d930 | The ☰ sheet opens on six pictures of the board (the pure tile geometry, the tiles, the sheet, the RAILS dot rule shared, the shared browser-test helper, the first tile test) |
| a368a53 | The bottom tab bar is removed, the Undo/Redo pair moves to the corner, the three end rooms grow, project notes updated |
| bb4ffc5 | Every browser test walks the screens through the tiles, plus the new tile tests |
| (last) | This summary |

## The planner's calls (P-1 to P-11), as built

- **P-1**: three columns below the 820-dot shell width, six at or above it (`grid-cols-3 shell:grid-cols-6`).
  Measured above: one row of six at every sideways size, each tile 130 to 133 wide.
- **P-2**: the sheet is Base UI's own `Menu.Positioner`, anchored to the top bar's `<header>`
  (bottom, start, no offset, no collision padding, `collisionAvoidance: none`), sized to
  `--anchor-width` and `--available-height`. On the Pixel 7 the sheet measures 862.84 and 412.19
  wide, because the header itself has those widths at that device's pixel ratio. The tests allow one
  dot either way.
- **P-3**: FINS reads `FIN_SETUPS`' own label, so the line says "Single Fin".
- **P-4**: TEMPLATE's line uses the same formatters as the preset card. Imperial gives each value
  its own mark; Metric gives the unit once (`188.0 × 47.6 cm`).
- **P-5**: the FINS tile uses straight segments through the tail's own points. `fin-viewer.tsx` was
  not touched.
- **P-6**: `railPlotDots` now lives in `lib/geometry/rail-bands.ts`. The RAILS plot and the RAILS
  tile both read it. The apex-centre colour is exported as `RAIL_APEX_CENTER_COLOR`. The RAILS
  reference screenshot is unchanged.
- **P-7**: the pictures are built only while the sheet is open.
- **P-8**: the shell's end block went from 48 to `calc(3.25rem + inset)`, VOLUME's from `pb-6` to
  `pb-[calc(1.75rem + inset)]`, and SUMMARY's from `pb-8` to `pb-[calc(2.25rem + inset)]`. These match
  q2c's numbers exactly.
- **P-9**: only the upright phone's offset changed (`max-shell:bottom-[calc(1rem+env(safe-area-inset-bottom))]`).
  `shell:bottom-4` and `right-4` are unchanged.
- **P-10**: each tile's accessible name is its screen and its line, for example `TEMPLATE — 6'2" × 18 3/4"`
  and `VOLUME — 29.6 L Estimated`. The pictures are hidden from screen readers.
- **P-11**: on the home, Contact, Privacy and error pages the tiles draw the store's board, and no
  tile is ticked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The ticked tile's tick mark was counted as part of its picture**
- **Found during:** Task 1, first browser run. TEMPLATE showed "2 paths" because the lucide tick is
  an SVG too.
- **Fix:** the picture carries `data-tile-picture` and the line carries `data-tile-line`, and the
  tests read those.
- **Commit:** 8c9d930

**2. [Rule 1 - Test fact] The Mid-length's Quad has five fin marks, not four**
- The FINS tile check now compares one-for-one with the board's own marks, and fixes the count only
  for the three presets the plan named (Shortboard 3, Fish 2, Longboard 1).

**3. [Rule 2 - Comments] Two small files outside the plan's list still named the old tab bar**
- `components/design/step-nav.tsx` and `lib/screen-steps.ts` mentioned "the tab bar". Their comments
  now say "the menu's six screen tiles", in line with T4 ("every comment describing it"). No code
  changed.

**4. [Rule 3 - Test shape] A Metric card's dims are read with textContent**
- On a phone the preset card does not lay out its dims line, so `innerText` read only "Shortboard".
  The test now polls `textContent` until the Metric line appears.

**5. [Rule 3 - Blocking] e2e/phone-layout.spec.ts's sideways rotate test opened ROCKER by the old menu row name**
- That row's accessible name is now the tile's ("ROCKER — On a ..."), so the test moves with
  `goToScreen`. This also brings the number of specs using the helper to 15, as the gate requires.

`e2e/phone-chrome.spec.ts` passed unchanged on all three projects. Removing the bar did not move
any band or drawing-area figure it pins, so its table was left as it was.

## Verification

- `npx vitest run`: 105 files, 3956 passed, 2 skipped.
- `npx tsc --noEmit` and `npm run lint`: clean.
- Whole browser suite, one project per run (`PW_PORT=3167 IS_WEBPACK_TEST=1`):
  - **android**: 248 passed, 126 skipped, EXIT 0 (11.6 min).
  - **desktop**: 205 passed, 169 skipped, EXIT 0 (9.8 min). All desktop reference screenshots matched.
  - **iphone**: 239 passed, 135 skipped, EXIT 0 (16.1 min). This was the second full run; see the
    re-run note below.
- **Re-runs (machine load 11 to 90 during the runs):**
  - The first full iPhone run had 236 passed, 135 skipped and 3 failed. All three failures were
    30-second `page.goto` timeouts that happened before any of this task's code ran:
    `fit-defaults.spec.ts` "passing through a field...", `phone-fins-labels.spec.ts` metric labels,
    and `rocker-cut.spec.ts` "Remove This Blank, then one undo...". That log is kept as
    `/tmp/q2f-iphone-run1.log`.
  - Re-run alone, the three files gave 26 passed and 1 skipped. A second full iPhone run then
    passed in full (above), and its log is `/tmp/q2f-iphone.log`.
  - No reference picture failed, so none was re-recorded.

## Self-Check: PASSED

- Files found: lib/geometry/screen-tiles.ts, lib/geometry/screen-tiles.test.ts,
  components/design/screen-tiles.tsx, e2e/helpers/screens.ts, e2e/phone-screen-tiles.spec.ts.
  components/design/phone-tab-bar.tsx is gone, as intended.
- Commits 98bef87, 8c9d930, a368a53 and bb4ffc5 are in `git log`.

## Hand-offs

**For the orchestrator, after the merge:** run `npm run build` and `npm run test:e2e:prod`.
`e2e/prod/phone-controls-clear-undo.spec.ts` now walks the screens through the tiles. Its first test
also checks that every control in the pair's column, Back and Next included, ends at least 7.5 dots
above the pair on all six screens of a production build, and it logs the smallest gap on each
screen. It could not run in this worktree.

**For the founder's review in the browser:** on a phone, open ☰ on TEMPLATE with the Shortboard,
then switch to the Longboard and open it again. Turn the phone sideways and check the single row.
Check that the Undo/Redo pair sits in the corner and that Back and Next scroll clear of it.

## Known Stubs

None.

## Threat Flags

None. Tile moves only ever go to the constant `NAV_LINKS` addresses (T-q2f-01). The pictures only
draw the board already in this browser's memory (T-q2f-02). The pictures exist only while the sheet
is open (T-q2f-03). `aria-current` uses the desktop row's own active test (T-q2f-04).
