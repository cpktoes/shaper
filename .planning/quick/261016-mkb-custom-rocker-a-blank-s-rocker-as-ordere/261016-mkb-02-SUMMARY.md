---
phase: quick-261016-mkb
plan: 02
status: complete
subsystem: rocker screen, ui
tags: [custom-rocker, customize-rocker-popup, datasheet, saved-blanks, overlay, us-blanks-notation]
requires:
  - phase: quick-261016-mkb plan 01
    provides: the bend, the floor, the draft rules, the note, the two-line name, setBlankRocker, saved blanks' storage and actions
provides:
  - The Customize Rocker button and popup on ROCKER (rows, live drawing, Show my board, zoom, footer)
  - The BLANK button's and the DATASHEET's two-line name; the DATASHEET's Natural Rocker over Custom Rocker
  - components/saved-blanks-provider.tsx (useSavedBlanks), lib/geometry/custom-rocker-art.ts, lib/geometry/custom-rocker-text.ts
  - RockerViewer's optional overlay prop (the page never passes it)
  - Two colour roles, --rocker-adjust-1 / --rocker-adjust-2, in every theme
affects: [quick-261016-mkb plan 03 (the picker's saved-blank cards, the order form, the tile, go-live)]
actuals:
  tokens: 56000   # chars/4 over the realized diff (3,221 lines added across 27 files, pictures excluded)
  tasks: 5
  commits: 6
tech-stack:
  added: []
  patterns:
    - "One spec in, one drawing out: the popup turns its draft into ONE spec, and that spec bends the blank, draws the overlay, writes the note and is what a save keeps"
    - "Labels on a rail slide apart (a two-way sweep) when a small screen has no room, their leaders slanting to the station they measure"
key-files:
  created:
    - components/saved-blanks-provider.tsx
    - components/rocker/customize-rocker.tsx
    - components/rocker/customize-rocker-dialog.tsx
    - components/rocker/custom-rocker-rows.tsx
    - components/rocker/custom-rocker-drawing.tsx
    - components/rocker/custom-rocker-blank-view.tsx
    - lib/geometry/custom-rocker-art.ts
    - lib/geometry/custom-rocker-art.test.ts
    - lib/geometry/custom-rocker-text.ts
    - lib/geometry/custom-rocker-text.test.ts
    - e2e/rocker-custom.spec.ts
  modified:
    - app/design/rocker/page.tsx
    - app/globals.css
    - components/rocker/blank-picker.tsx
    - components/rocker/blank-picker-dialog.tsx
    - components/rocker/blank-filter-bar.tsx
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-datasheet.tsx
    - components/design/slider-row.tsx
    - components/design/slider-row.test.ts
    - components/design/board-lock-scope.test.ts
    - lib/units-isolation.test.ts
    - lib/theme.test.ts
    - e2e/helpers/blank-picker.ts
    - e2e/board-lock-screens.spec.ts
key-decisions:
  - "The blank-alone labels slide apart along their rail when a small screen has no room (measured: the real iPhone drawing is about 350×180, smaller than the plan's 366×240, and the 12\" and centre chips met there)"
  - "The zoom control gets its own band above the drawing on a mouse (it covered the Tail Tip chip); on a touch screen it only appears once zoomed, so the drawing keeps that room"
  - "The key and the Show my board chip share one line, so a phone's pinned drawing does not lose a second line to them"
  - "The page's existing useSvgClientSize measures the blank-alone drawing; callout-primitives.tsx is unchanged"
requirements-completed: [QT-261016-mkb]
duration: "2h 24m (04:16 to 06:41 UTC, about 1h 10m of it the browser gate)"
completed: 2026-10-17
---

# Quick 261016-mkb Plan 02: The Customize Rocker popup on ROCKER — Summary

**With a blank picked, ROCKER now has a Customize Rocker button right under the blank card. It opens a popup where a
shaper sets the blank's rocker the way they order it from the maker — nose and tail changes, a second change nearer
the tip, each stopping at its floor — and watches the foam bend as they slide, the natural rocker dashed behind it and
the changes drawn red and blue the way US Blanks' catalogue does. Saving keeps the blank as one of the shaper's own,
stars it, and puts it on the board in one undo step. The BLANK button and the DATASHEET then name the blank on two
lines — `9'4"B` over `-1/4"N18" +1/8"T36" +1/8"T18"` — and the DATASHEET shows the catalogue's rocker over the rocker
as ordered. The page's own drawing shows the bent foam and nothing coloured.**

## What a shaper can now do on ROCKER

- **Customize Rocker › / Edit Custom Rocker ›** under the blank card (above the fit flag and Remove This Blank); off on
  a locked board, absent with no blank (D-04).
- **The popup**, styled like Pick a Blank (same surface, same size rule — the size classes are now shared from
  `blank-picker-dialog.tsx`, not copied), laid out like the page: rows left and scrolling, the drawing beside them in a
  card like a picker card; on an upright phone the drawing pinned on top (45% of the height) with the rows scrolling
  beneath; held sideways, rows 300 wide beside the drawing.
- **The rows** (D-05, D-06): NOSE and TAIL, each a Rocker slider (1/16", 1 mm in Metric, a value box) beside Bend starts
  (whole inches, `At the centre` at the top, cm in Metric), `+ Add a second nose/tail change`, Remove on a second
  change, `↺ Natural rocker`, and "The fit never changes — bending a blank leaves its thickness and width alone."
  A second change is capped an inch nearer the tip; moving the first pushes it ahead. Each Rocker slider stops at its
  floor and its hint then reads "Floor — the tip would drop below the centre". `+1/2"N` with `+1/2"N18"` lifts the nose
  tip exactly 1" (a browser test reads the tip and its NAT figure off the drawing).
- **The drawing** (D-07): Show my board off (every time it opens): the blank alone on its bottom plane with its printed
  thickness as chips on one rail and its rocker as ordered on the other, the natural figure (`NAT …`) where it differs.
  On: the board in the bent blank, its five stations exactly as the page draws them. Both carry the natural rocker
  dashed, a short dashed mark where each bend starts, and the outline red over the first change's span and blue over
  the second's. The header's note is coloured the same way. The page's zoom works on it (buttons, wheel, drag, pinch).
- **The footer** (D-09): Cancel · Use and edit current blank (only when the board's blank already has a custom rocker)
  · Use and save as a new blank; a draft put back to natural offers Use the natural rocker. The board changes only after
  the save succeeds; a refusal is said in the footer and the popup stays open. Cancel, Esc, ✕ and a click outside change
  nothing.
- **The DATASHEET** (D-02, D-03): the BLANK label reads the name, then `Natural` or the note on its own line; a custom
  blank's block reads Natural Rocker, Custom Rocker, Thickness, Width, with the footnote "Natural Rocker is the catalog
  page's. Custom Rocker is the blank as ordered (…) — check it on the foam." A natural blank's block is unchanged.

## The pictures (`pictures/`, Slate unless named; the Longboard in the US Blanks 9'4"B, `-1/4"N18" +1/8"T36" +1/8"T18"` set through the popup)

| Picture | What to look for |
| --- | --- |
| `02-computer-popup-blank.png` | Rows left, the blank alone right; chips above, readings below with NAT figures (4 1/2" over NAT 4 3/4" at the nose); red at the nose from 18" in, red then blue stacked at the tail; the header's note red, red, blue. |
| `02-computer-popup-board.png` | Show my board on: the board inside the bent blank, the page's own five stations and rails, the coloured outline on the blank behind the board. |
| `02-computer-popup-daylight.png` | The same in Daylight: the darker red and blue read on the light card. |
| `02-computer-popup-metric.png` | `-6 mm`, `45.7 cm in`, `+3 mm`, `91.4 cm in`; every figure in mm, the note still `-1/4"N18" +1/8"T36" +1/8"T18"`. |
| `02-computer-popup-zoom.png` | 3x over the tail: red and blue stacked from 18" in, the dashed bend mark, strokes still hairlines. |
| `02-computer-sidebar.png` | The BLANK button: `9'4"B`, the note under it, then Edit Custom Rocker ›. |
| `02-computer-datasheet.png` | The two-line BLANK label; Natural Rocker over Custom Rocker (4 3/4" → 4 1/2" at the nose tip, 3 1/2" → 3 3/4" at the tail); the footnote. |
| `02-computer-viewer.png` | The page after saving: the bent foam alone, nothing coloured, no dashed natural, no bend marks (D-08). |
| `02-iphone-popup.png` | iPhone 14 upright: the drawing pinned on top standing nose-up, readings left, chips right; the rows beneath. |
| `02-iphone-popup-rows.png` | Reopened (EDIT CUSTOM ROCKER), rows scrolled to the tail's second change; the footer's three buttons, the primary on its own row. |
| `02-pixel7-sideways-popup.png` | Pixel 7 sideways: rows (300 wide) beside the drawing lying flat. |

**Where the build differs from the sketch, and why:**
- The zoom control sits in its own band above the drawing on a computer. In the sketch it floated over the drawing,
  and in the build it covered the Tail Tip chip. On a phone it only appears once zoomed, so there is no band.
- The key and Show my board share one line, and the switch is the Pick a Blank chip (`Show my board: Off`), not a
  checkbox, as the plan asked.
- On a small phone the labels slide apart along their rail and their leaders slant, rather than strictly hanging
  off their station. The sketch's phone picture had its chips running into each other and into the zoom buttons.
- The value box for a first change at the centre reads `At the centre`. The sketch never showed that state.

## For the founder to confirm or overrule (planner's choices, with what was measured)

- **P-3 Two drawings.** With the board on, the popup uses the page's own drawing, given the draft's side profile and
  an overlay that only the popup passes. With it off, a small sibling drawing shows the blank alone. Both get their
  overlay from the same pure function and the same draft spec. A unit test checks every span's stations against that
  spec on the Longboard's and Shortboard's real blanks, four rockers each.
- **P-11 The blank-alone rails read the catalogue's printed figures as ordered,** centre included. The centre reads
  `Center · zero` when it prints 0, `Center` otherwise (a test finds both kinds in the real catalogue).
- **P-12 Layout, measured on the built popup:**
  - Computer 1280×800: popup 1180×736, header 57, footer 57, body 622, rows 340×598, drawing card 804×598.
  - iPhone 14 upright 390×664: full screen, header 61, drawing card 374×299 (45dvh). With two buttons: footer 61,
    rows 219 tall. With three buttons: footer 113, rows 167 tall.
  - Pixel 7 sideways 863×360: full screen, header 61, footer 61, rows 300×222, drawing 539×222.
- **P-13** The drawing turns the way the page's does: nose up on an upright phone, flat sideways and with a mouse. No
  Rotate button.
- **P-14** The red line is the drawn outline less the second change's bend. Blue is the outline itself.
- **P-15** Saving a rocker you already saved reuses that blank and stars it. A test proves edit-in-place keeps ONE
  saved blank and moves its star.
- **P-16** Colours: Daylight and Chalk use `#c62828` and `#1d5fd6`; Slate and Phosphor use `#f0625f` and `#4f9cf5`.
  I re-measured the contrast: lowest 3.02:1 (light themes, blue over the foam on the canvas), highest 7.10:1. Every
  value is at least 3:1, and the note's text reads 5.62–7.10:1 on the panel. The warning colour is never used.
- **P-17** The ROCKER desktop baseline passed unchanged (no picture re-recorded; `git status e2e/*-snapshots` is
  empty).
- **P-18** Every blank picked now shows one more short line on its BLANK button: `Natural`.
- The account path of saving (signed in) is proved by plan 01's unit tests only. **It waits for the founder's own
  signed-in check:** save a custom blank signed in, reload, and Edit Custom Rocker → Use and edit current blank.
  Every browser test runs signed out.

## Gates

- `npx vitest run`: **151 files, 5,613 passed, 2 skipped, 0 failed.** Two earlier full runs, made while the machine
  was loaded by the browser suite, each timed out 1 to 6 tests in files this plan didn't touch (`blank-fit`,
  `blank-card-art`, `custom-rocker` at vitest's 5 s limit). Each of those passes alone. My own layout tests were made
  ten times faster so they add less load.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- The new spec, alone: desktop **6 passed, 3 skipped**. iPhone and Android: **4 passed, 14 skipped**.
- The desktop pass over rocker-custom, new-board, rocker-blanks, board-lock-screens and desktop-baseline:
  **48 passed, 5 skipped (5.6m)**.
- **The plan's background gate** (22 spec files, all three projects): `12 failed, 400 skipped, 488 passed (1.2h)`,
  **not green.** No test reported an absurd duration (no sleep). Every failure was a 30-second timeout, a failed page
  load or an interrupted navigation, in app-settings (iPhone ×2), blank-makers (iPhone ×1) and board-lock-screens
  (9). The board-lock failures are all in its home-page rack setup (opening and locking a board), before any ROCKER
  control is reached.
  - Re-run alone on a fresh server (those three files, all projects): `9 failed, 21 skipped, 72 passed (15.0m)`.
    app-settings and blank-makers passed; board-lock-screens failed in different tests than before.
  - board-lock-screens alone a third time: `2 failed, 18 skipped, 37 passed (6.5m)`. Both failures were on the iPhone:
    p-screens (`Navigation … is interrupted by another navigation`, in the rack setup) and look-summary (the order
    form's Fin System select not greyed).
  - p-screens failed in all three runs, always in its rack setup, a known flaky iPhone test. Every other
    board-lock test passed in at least one run, including s-rocker with the new disabled/enabled checks, and the
    whole file passed on desktop in the earlier desktop pass.
  - Another Playwright WebKit run was using the machine during these runs (load average 8–24). **I am not calling the
    board-lock file green.** It needs one quiet run on main.
- **Not run:** the full browser suite outside the plan's list.

## Commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | fbcb9dd6 | The Customize Rocker button, a one-slider popup, save → star → rocker, the BLANK button's rocker line |
| 2 | 86ea1c4f | The drawing's data and words (pure, tested) and the two colours in every theme |
| 3 | 09128555 | The whole popup: rows, drawing, Show my board, zoom, footer; RockerViewer's overlay prop |
| 4 | 4b40908e | The DATASHEET's two-line name and Natural Rocker over Custom Rocker; the browser tests |
| 5 | 7b0c47ba | The pictures and their archived scripts |
| 5 | (this file) | This summary |

The tracer gate (no stop in this repo): Task 1's verify ran end to end and passed (`1 passed`) before Task 2 began.

## Deviations from Plan

1. **[Rule 1] Labels slide apart on a small screen.** The plan's layout anchored every label to its station. In the
   real iPhone box (about 350×180, measured — the plan assumed 366×240) the 12" and centre chips met. The layout now
   sweeps each rail so neighbours keep 4 px apart, with leaders slanting from the label's edge. Upright chips are 26 px
   tall instead of 30. Tests now also cover the 350×180 box, Metric in every box, and that each leader starts on its
   own label's edge. Commits 09128555 and 4b40908e.
2. **[Rule 1] The zoom control's band and the key's single line.** These are described above. Without them the
   control covered a chip, and the phone drawing lost a line.
3. **[Rule 1] The Bend starts label was cut off ("Bend st…")** when its box read `At the centre`. The two sliders now
   share their line two to three.
4. **`callout-primitives.tsx` unchanged.** Its existing `useSvgClientSize` already measured the svg, so I added no
   `useSvgLayoutSize`.
5. **SliderRow's `leftHint` now takes a node**, as well as getting the planned `valueBox`. This lets the floor hint
   carry `data-rocker-floor-hint`. Text hints render byte-for-byte as before, and its tests say so.
6. **The plan's check `grep -c "overlay" rocker-editor.tsx` = 0 can't hold.** The file already said "overlay" three
   times in comments about the old construction overlay. `grep -c "overlay=" rocker-editor.tsx` is 0, so the page
   passes no overlay. The new desktop test proves no `[data-rocker-overlay]` is on the page after saving.
7. **The second change's Bend starts slider has no thumb** when its only place is 3" in (the first pushed to 4"). Base
   UI draws no thumb when min equals max. Its value box still reads `3" in`, and the browser test reads the box. Worth a
   look: this is plan 01's rule, shown as it is.
8. **`page.tsx` catches a failed saved-blanks read** and treats it as signed out, so the ROCKER page can never fail on
   it.
9. **Each `custom-rocker-art.ts` test was tightened** after Task 2 (the sweep, faster checks). That work rode in the
   Task 3 and Task 4 commits.

## Human verification deferred

- The founder's look at the eleven pictures, and the P-items above.
- The signed-in save, reload and edit-in-place on the account (Clerk never settles on the suite's keys).
- One quiet run of `e2e/board-lock-screens.spec.ts` on all three projects on main.

## Known Stubs

None. The saved blanks have no list of their own on screen yet (no Pick a Blank card, no Remove) — that is plan 03's
by design.

## Threat Flags

None beyond the plan's threat model:
- T-mkb-07: catalogue and saved text render only as React and SVG text.
- T-mkb-08: every control in the new files is disabled on a locked board (inventory test).
- T-mkb-09: the board changes only after the save succeeds.

## Self-Check: PASSED

All created files exist. Commits fbcb9dd6, 86ea1c4f, 09128555, 4b40908e and 7b0c47ba are on this branch. No
`.ts/.js/.mjs/.cjs` is tracked under `.planning/`. No file under `e2e/*-snapshots/` changed.
