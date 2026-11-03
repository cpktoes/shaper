---
phase: quick-261102-gec
plan: 02
subsystem: rails
status: complete
tags: [rails, controls, advanced-menu, finished-rail, phone]
requires: ["261102-gec-01"]
provides:
  - "RAILS sidebar: Ratio 20/80-80/20 in halves (marks 20/80, 50/50, 80/20; Sym on its own line), Deck Profile 75-100%"
  - "Each rail's Advanced menu: Scaled from center by (nose, tail), seven nudge sliders, Use Single Tuck, Reset"
  - "design-store: updateRailNudge (one undo step per mark), resetRailAdvanced (one undo step)"
  - "lib/geometry/rail-bands.ts: RAIL_NUDGE_NAMES, RAIL_NUDGE_STEP_IN, defaultRailAdvanced, deckProfileSliderStep"
  - "lib/geometry/finished-rail.ts: finishedRailPath"
  - "The finished rail drawn on every VIEWER cross-section and View Full Sized, with a Finished Rail toolbar switch (view state, never saved)"
affects: [RAILS screen, View Full Sized dialog, RAILS desktop reference picture]
tech-stack:
  added: []
  patterns: ["a view-only toolbar toggle in useState beside the screen (FINS callouts precedent)", "one store action per slider family so each slider is its own undo step"]
key-files:
  created:
    - e2e/rails-advanced.spec.ts
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/geometry/finished-rail.ts
    - lib/geometry/finished-rail.test.ts
    - components/design/design-store.tsx
    - components/design/slider-row.test.ts
    - components/rails/rail-controls.tsx
    - components/rails/rail-band-editor.tsx
    - components/rails/rail-section-plot.tsx
    - components/rails/rail-section-plot.test.ts
    - components/rails/view-full-sized-dialog.tsx
    - e2e/board-lock-screens.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
decisions:
  - "PC14-PC24 applied as planned; the founder's section-4b answers confirmed PC15, PC16 and PC21"
metrics:
  completed: 2026-11-02
actuals:
  tokens: 18300    # chars/4 over the realized diff (73,300 chars, pictures and the archive left out)
  tasks: 3
  commits: 4
duration: about 2 h 40 min (the phone suite alone ran 1 h 12 min)
---

# Quick 261102-gec Plan 02: the controls and the drawing — Summary

**RAILS now has your fuller controls: Ratio from 20/80 to 80/20 in halves, Deck Profile down to 75%, a
per-rail Advanced menu that scales the nose and tail and nudges seven marks, and the finished rail drawn
on every cross-section with a button to hide it.**

## For the founder, in plain words

**Ratio.** The slider now runs from 20/80 to 80/20 and moves in halves, so 62.5/37.5 is there. The
marks under it read 20/80 at the left end, 50/50 in the middle and 80/20 at the right end. The old 60/40
mark is gone: on the wider track it ran into 50/50 in every column on a computer and on a phone.
**Sym** now sits on its own line under those marks. Beside the readout it no longer fit the half-width
column. On the tail, Hard Edge stays on the line under Sym, as you asked.

**Deck Profile** stops at 75%, the thinnest rail your sheet allows. It still runs Flat on the left to
Heavily Domed on the right. A board saved below 75% shows its slider at the right end and draws at 75%.
Its saved number only changes if you move that slider.

**Advanced, on each rail**, top to bottom:
- **Scaled from center by**, on the nose and tail only: 0.50 to 1.00 in 0.05 steps, starting at 0.75.
  It scales Apex Thickness, Deck Mark 1 and Deck Mark 3. Deck Mark 2 follows Deck Mark 1, and the dome
  never scales. The centre has no such slider; it is always 1.
- **Apex Thickness, Deck Mark 1, Deck Mark 2, Deck Mark 3** nudge sliders.
- **Use Single Tuck**, which hides the Bottom Tuck 1 and 2 sliders.
- **Bottom Tuck 1, Bottom Tuck 2, Bottom Tuck 3** nudge sliders.
- **Reset Advanced Settings.**

Each nudge slider starts at 0 in the middle of its track. It moves its mark in 1/16" steps (1 mm in
Metric), up to ±1/2" for the deck marks and ±1/4" for the others. Its label reads the mark it lands on
and the nudge, e.g. `Deck Mark 1 — 1 1/4" (+1/16")`. The nudge is saved as the amount, so the mark still
follows thickness, Family and Ratio afterwards. When the apex has to shrink to fit on the rail, the Apex
Thickness label adds `, trimmed to fit`. On the tail, while Hard Edge is on, Use Single Tuck and all
three bottom tuck sliders are hidden, because a hard-edge tail has no tucks. **Reset** puts every nudge
back to 0, the scale back to 0.75, Single Tuck off and, on the tail, Hard Edge back on. It is a single
undo. Undo also steps back one slider at a time: a Deck Mark 1 drag and a Bottom Tuck 3 drag are two
separate undos.

**The finished rail.** Every cross-section on VIEWER (all three on a computer, the one picked on a phone)
and the View Full Sized window now draws the finished rail. That is the shape your cuts leave, with each
corner blended halfway into the bands either side, drawn as a heavy ink line over the bands. The board's
own fill colour sits under it, below the grid. "Finished Rail" is the last entry in the key. On a tucked
rail it touches the rail line at the Apex Center. On the hard-edge tail it runs straight down the wall to
a sharp corner.

**The Finished Rail button** is the new curve icon, first in the VIEWER toolbar's top-right corner. It
starts on, and one tap hides the finished rail and its key entry. It only changes the view: it is never
saved with the board, it starts on again each time you come back to RAILS, and it works on a locked
board. Per your answer, the printed order form, the INSTRUCTIONS example and the RAILS picture in the
phone menu still show only the cut bands.

**What did NOT change.** How a board is saved, the database, and every other screen are unchanged. The
rules plan 01 set up are unchanged too. Volume is plan 03's job (your "switch to the finished curve"
ruling); this plan doesn't touch litres.

**What to try in the browser** (Shortboard, RAILS):
1. Drag Ratio all the way both ways: 20/80 and 80/20, in halves.
2. Open Advanced on the Nose and nudge Deck Mark 1. The label and the drawing move, and so does the DATA
   tab. Then try Reset.
3. On the Center, set Family to Boxy and Ratio to 80/20. Apex Thickness reads "trimmed to fit".
4. Tick Use Single Tuck. Bottom Tuck 1 and 2 disappear. On the tail, untick Hard Edge to see its tucks.
5. Tap the curve icon in the VIEWER corner to hide and show the finished rail. Open View Full Sized with
   it on and with it off.
6. On your phone, pick NOSE/CENTER/TAIL over the drawing and scroll down to that rail's Advanced. The
   sliders are full touch size.

## Pictures (`pictures/`, Shortboard preset)

| File | What to look at |
|------|-----------------|
| `p2-viewer-on-desktop.png` | 1280 x 800: the three cross-sections with the finished rail and fill; the curve button pressed; "Finished Rail" last in the key; Ratio's 20/80 · 50/50 · 80/20 marks and Sym on its own line |
| `p2-viewer-off-desktop.png` | the same after the button: back to the cut bands only, no key entry (the dark "Compiling" chip is the dev server's own badge) |
| `p2-advanced-nose-desktop.png` | the Nose rail's Advanced: Scaled from center by — 0.75, the seven nudges, Use Single Tuck, Reset |
| `p2-advanced-center-desktop.png` | the Center rail's Advanced: no scale slider; below it the Tail's Sym and Hard Edge lines |
| `p2-fullsize-desktop.png` | View Full Sized with the finished rail and its key entry |
| `p2-ratio-narrow.png` | the Family/Ratio row at an 820-dot window with Ratio at 40.5/59.5: the readout on one line, three marks clear of each other |
| `p2-viewer-center-iphone.png` | iPhone 14, CENTER: the finished rail on the phone's one plot, the curve button beside View Full Sized |
| `p2-advanced-iphone.png` | iPhone 14, NOSE: the Advanced menu under the drawing in the stacked layout |

The shooting script is in `pictures/shoot-source-02.tar.gz` (no loose `.ts` left in `pictures/`).

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | e00c26cb | RAILS: Ratio now runs 20/80 to 80/20 in halves, Deck Profile stops at 75%, and each rail's Advanced menu can scale the nose and tail and nudge seven marks |
| 2 | a6991844 | RAILS: every cross-section now draws the finished rail — the cut rail blended halfway into each band — with a VIEWER button to hide it |
| 3 | 7d5e0529 | RAILS: browser proof of the fuller Advanced menu and the finished rail on a computer and both phones, with after pictures |
| 4 | (this) | docs(quick-261102-gec): plan 02 summary |

## Gates

- **Unit suite:** 156 files, 5,889 passed, 2 skipped (pre-existing), 0 failed. Added 5 tests in `rail-bands.test.ts`,
  2 in `finished-rail.test.ts` and 1 in `rail-section-plot.test.ts`.
- **`npx tsc --noEmit`:** clean (after `npx next typegen`). **`npm run lint`:** clean.
- **`e2e/rails-advanced.spec.ts`** (new): desktop 9 passed + 1 skipped (the finger test is phone-only); iPhone 10 passed;
  Android 10 passed.
- **The RAILS spec list** (`rails-advanced`, `phone-rails`, `template-rails-panels`, `board-lock-screens`, `slider-touch`,
  `summary-planing`, `summary-rail-key`, every project): **149 passed, 85 skipped, 0 failed** (12.0 min).
- **Phone suite** (`npm run test:e2e:phone`, both phones): **787 passed, 806 skipped, 3 failed** (1.2 h). All three were
  load timeouts, and each **passed when re-run alone**:
  1. `board-lock-screens` p-screens (iPhone): the lock never reached the editor within 20 s (`openLockedBoard`), on a
     cold server.
  2. `board-lock-screens` look-volume (iPhone): opening a board from the rack timed out at 30 s.
  3. `wings.spec.ts:1371` Longboard placement B (Android): the page stayed on `/` after the preset tap. This is a
     wings test that never reaches RAILS.

  Re-runs: 2 passed (the two lock tests on iPhone), 2 passed (`wings.spec.ts:1371` on Android).
- **`desktop-baseline.spec.ts`:** only `rails-desktop` differed. Its diff shows the finished rail and fill, the
  new toolbar button, the key entry, the Ratio marks and Sym's own line, and nothing else. It was re-recorded alone with
  `--update-snapshots`. Final run: **5 passed, 10 skipped, 0 failed**; no other reference picture changed.
- `components/summary/order-form.tsx`, `components/rails/rail-instructions.tsx` and `lib/geometry/screen-tiles.ts`
  are unchanged (`git diff --stat` empty), and so are `lib/db/` and `drizzle/`. The board's saved shape does not change.

## The planner's choices, as applied

- **PC14**: the Ratio marks are 20/80 (left end), 50/50 (centred) and 80/20 (right end, `right-0`), and 60/40 is gone.
  The comment cites M9.
- **PC15**: the Ratio heading line holds only the readout, keeping its `flex h-5 items-center leading-5` line so it stays
  level with Family (the pictures show the two tracks level). Sym sits on its own `mt-2` line with
  `coarse:min-h-11`.
- **PC16**: Hard Edge stays under Sym on the tail (the founder's answer, 4b).
- **PC17**: the Advanced rows follow this order: scale, Apex, Deck Marks 1-3, Use Single Tuck, Bottom Tucks 1-3, Reset.
- **PC18**: the labels read `<name> — <formatMark(mark)> (<formatSignedMark(nudge)>)`, plus `, trimmed to fit` on
  Apex Thickness while `apexTrimmed`. The scale reads two decimals and does not go through `units.ts`. The warning
  colour is never used.
- **PC19**: `updateRailNudge` uses the undo key `rails:<key>:nudge:<nudgeKey>`, with the lock check first.
- **PC20**: `resetRailAdvanced` writes `defaultRailAdvanced(key)` and, on the tail,
  `tailHardEdge = DEFAULT_RAIL_BAND_SPEC.tailHardEdge`, all in one `setState` with `noteEdit(null)`.
- **PC21**: a `ViewerToolbarButton` with `SplineIcon` sits first in RAILS' VIEWER toolbar, labelled "Hide/Show finished
  rail" with the title "Finished Rail". Its state is `useState(true)` in `rail-band-editor.tsx`, and it is passed to
  the computer plot row, the phone plot and `ViewFullSizedDialog`.
- **PC22**: the closed path filled with `var(--color-surf-board-fill)` is the svg's first child. The open curve is
  `var(--color-surf-ink)`, 3 wide, `non-scaling-stroke`, with a round join, drawn after the band lines and before the
  dots. It is worked out from the plot's own `xAxisMin` and projected through the plot's own px/py. "Finished Rail"
  is the last key entry.
- **PC23**: Deck Profile's slider value is `clamp(175 - deckPercent, 75, 100)` (the display is held, so the stored
  value isn't rewritten). It writes `clamp(175 - v, 75, 100)`, and its step comes from
  `deckProfileSliderStep` (tested: both ends exactly reachable at every thickness from 1" to 3 1/2" by 1/16").
- **PC24**: `measureSlider(nudge, ±RAIL_NUDGE_LIMIT_IN, RAIL_NUDGE_STEP_IN, 1, system)`.

## The planner's measured facts, confirmed

- **M9 (d)**: confirmed in the browser. At an 820-dot window and on a 360-dot phone (iPhone and Android), "Ratio —
  40.5/59.5" stays one line high (no taller than Family's heading) and ends inside its half column. The three marks'
  boxes don't overlap (spec test 9 on all three projects; `p2-ratio-narrow.png`). In the narrowest columns the long
  Apex Thickness label wraps onto a second line, as PC18 accepted.
- **M13**: confirmed by design. Each nudge has its own undo key, and the store test's "every handler starts with the
  lock check / startedFrom" sweep covers both new actions.
- **M14**: drawn as stated. On the default rails the finished rail meets the rail line at the Apex Center, and the
  hard-edge tail runs down the wall to a sharp corner (`p2-viewer-on-desktop.png`, Tail).

## Deviations from Plan

1. **[Rule 1, the plan's own check] The raw-slider count grep.** The acceptance's `grep -cE '<Slider[^R]'` prints 0
   on this file both before and after, because `<Slider` ends its line here. The intended count was taken with
   `grep -cE '<Slider($|[^R])'` and is **2** (Family and Ratio), so every new slider is a `SliderRow`.
2. **Test-handle attributes.** I added `data-ratio-readout` and `data-ratio-mark` to the Ratio readout and marks so the
   browser check can measure them. They change no pixels. `rail-controls.tsx` is in this plan's files.
3. **Small spec fix before the commit.** The Advanced heading's accessible name includes its ▾/▸ arrow, and a plain
   `name: "Advanced"` also matched "Reset Advanced Settings". The spec and the picture script now use
   `/^Advanced [▾▸]$/`.
4. **Volume's open question is already answered.** The plan asked the SUMMARY to raise "should volume switch to the
   finished curve" (R5). The founder answered it after plan 01 ("Switch to the finished curve"), and it is plan 03.
   This plan does not touch volume.
5. **iPhone finger test.** The plan expected the touch test to need Chromium's CDP. On iPhone (WebKit) Playwright's
   `touchscreen.tap` drove the bar press successfully, so test 10 runs on both phones, using CDP on Android and a
   touchscreen tap on iPhone.

No other files outside `files_modified` were touched.

## Open questions for the founder

- **Hard Edge's place (PC16).** Answered: it stays under Sym on the tail. Nothing is owed.
- **The finished rail on the printed order form (PC21).** Answered: it is a screen aid only. Nothing is owed.
- **Volume on the finished curve (R5).** Answered: switch, done in plan 03. Nothing is owed here.

One thing for your eye, not a question: in the key, "Board Thickness" and "Finished Rail" both have dark ink dots,
because both are the board's own edge. If you'd like the finished rail's swatch to look different (say, a short
heavy line instead of a dot), that is a small follow-up.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-gec-06: `measureSlider` and the engine's own held windows still apply. T-gec-07:
the switch is `useState` only and never reaches the design store or `designSnapshotFields`. T-gec-08: every new slider
is a `SliderRow`, both store actions check the lock first, and the s-rails lock test passes with Advanced open and the
Finished Rail button toggled on a locked board.

## Self-Check: PASSED

- Present: `e2e/rails-advanced.spec.ts`, the eight `pictures/p2-*.png`, `pictures/shoot-source-02.tar.gz`. No loose `.ts`
  in `pictures/`.
- Commits on the branch: e00c26cb, a6991844, 7d5e0529.
