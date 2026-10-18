---
phase: quick-261017-ojc
plan: 01
subsystem: rocker / Customize Rocker popup
status: complete
tags: [customize-rocker, drawing, phone, dimensions-toggle, toolbar-icons]
requires: [quick-261016-mkb]
provides:
  - one drawing for the Customize Rocker popup in both states (board off / on)
  - stacked NAT / CUSTOM / BOARD rocker figures under the blank's five stations
  - the phone's Dimensions toggle; Show my board and Dimensions as toolbar icons
affects:
  - components/rocker/rocker-viewer.tsx (the unused overlay prop removed; the page draws exactly what it drew)
tech-stack:
  added: []
  patterns:
    - "a label layout in CSS px with a shared 5%-step label shrink, proven on every pickable blank"
    - "text widths from a per-character Inter Bold table (textWidthPx)"
key-files:
  created: []
  modified:
    - lib/geometry/custom-rocker-art.ts
    - lib/geometry/custom-rocker-art.test.ts
    - lib/geometry/custom-rocker-text.ts
    - lib/geometry/custom-rocker-text.test.ts
    - components/rocker/custom-rocker-blank-view.tsx
    - components/rocker/custom-rocker-drawing.tsx
    - components/rocker/customize-rocker-dialog.tsx
    - components/rocker/rocker-viewer.tsx
    - components/viewer/toolbar-button.tsx
    - components/viewer/zoom-viewport.tsx
    - components/design/board-lock-scope.test.ts
    - e2e/rocker-custom.spec.ts
decisions:
  - "P-1: the popup grows its own blank drawing and never mounts the page's ROCKER viewer"
  - "P-2 (confirmed by the founder): with the board on, each blank station's card carries two tagged lines, BLANK and BOARD, each with its own leader"
  - "P-3: the BOARD rocker figure is the board's rocker as the page reads it; a dash where the board does not reach"
  - "P-6 (confirmed by the founder): standing nose-up on an upright phone the station names are dropped; the figures keep their tags"
  - "P-10: Dimensions is not remembered — On every time the popup opens"
metrics:
  duration: "about 65 minutes of work, plus a 28-minute browser gate and the full suite"
  completed: 2026-10-17
  tasks: 5
  files: 12
actuals:
  tokens: 24000
  tasks: 5
  commits: 6
---

# Quick 261017-ojc: the Customize Rocker popup's drawing, one grammar for both states — Summary

**The Customize Rocker popup now draws one picture of the bent blank whether or not your board is shown:
the blank's printed thickness on cards just above the foam, its Natural (NAT), Custom (CUSTOM) and —
with the board on — Board (BOARD) rocker stacked under each of its five stations, Show my board as an
icon in the drawing's upper right, and on a phone a Dimensions icon that clears the figures so the foam
fills the drawing.**

## What a shaper sees now

**On a computer, Show my board off** (`pictures/ojc-computer-off.png`): the heading reads BLANK
DIMENSIONS. Above the foam, five cards — Nose Tip, Nose @ 12", Center, Tail @ 12", Tail Tip — each with
the blank's printed thickness. Under the foam, at the same five stations, the rocker figures stacked:
NAT (the catalogue's printed figure) alone on a natural blank; NAT and CUSTOM (as ordered, the
DATASHEET's Custom Rocker row) at all five once any change is set, even where they agree. The two titles
are the page viewer's own words, Thickness over the cards and Rocker under the stacks. The natural rocker
dashed, the bend marks, red for the first change and blue for the second are as they were.

**Show my board on** (`ojc-computer-on.png`): the same drawing, with your board drawn inside the foam and
the heading BLANK DIMENSIONS & YOUR BOARD. Each card gains a second line: BLANK and the blank's thickness,
BOARD and the board's thickness at the board's own station of that name — each line with its own leader
to what it measures. Each stack gains a BOARD line: the board's rocker at that blank station, read the
way the ROCKER page reads it (the board on a flat table). At the blank's two tips it reads a dash,
because your board stops short of the blank there. On the Longboard in the 9'4"B with
`-1/4"N18" +1/8"T36" +1/8"T18"` BOARD reads 2 1/2" · 0" · 2 3/16" at the blank's Nose 12" · Center ·
Tail 12", equal to CUSTOM there, exactly as the plan measured.

**The icons**: Show my board is a new icon — a blank seen from the side with the board inside it —
pressed in the accent colour when on, with the zoom control under it as on the ROCKER page. The key line
(Natural dashed · the first change red · the second change blue) sits alone under the drawing.

**On a phone** (`ojc-iphone-off.png`, `ojc-iphone-on.png`): the drawing stands nose-up, the Rocker figures
in a column on the left, the Thickness cards on the right, no station names (the stations read by
position — P-6). A second icon, Dimensions (a ruler), sits left of Show my board, pressed by default.
Turn it off (`ojc-iphone-on-no-dimensions.png`) and every card, figure, title and tick goes; the foam
(and the board) grows to fill the drawing, and the dashed natural rocker, the bend marks, red and blue,
and the bottom plane stay. The zoom still works. It comes back On every time the popup opens.

**A phone held sideways** (`ojc-pixel7-sideways-on.png`, `…-no-dimensions.png`): the drawing lies flat;
with the board on the figures shrink a little (95% on the Pixel 7) and the drawing column scrolls to the
Rocker title rather than squeezing. Dimensions off makes the foam about 1.6 times longer.

**A computer gets no Dimensions icon** — it has the room. A narrow browser window does get it (width
decides, never the pointer).

### Compared with the look the founder prefers (02-computer-popup-board.png)

The new drawing keeps that view's look — cards hugging the foam, the viewer's chips, ticks and titles —
and differs in three ways, each on purpose: the figures sit at the **blank's** five catalogue stations
(the blank is the subject in both states), so the board's own thickness rides on each card as a BOARD line
instead of having cards of its own; the rocker figures are stacked and tagged (NAT / CUSTOM / BOARD) rather
than one board figure; and the board's Thinning Starts dashes are no longer drawn in the popup (P-12), so
the only dashed marks across the foam are the bend marks.

## The pictures (`pictures/`)

| Picture | What to look for |
|---|---|
| ojc-computer-off.png | Board off: cards above, NAT/CUSTOM stacks below, heading Blank Dimensions, one icon |
| ojc-computer-on.png | Board on: board inside the foam, BLANK/BOARD lines, BOARD rocker, `—` at both tips |
| ojc-computer-off-daylight.png / ojc-computer-on-daylight.png | Both states in Daylight — every label and the icon read |
| ojc-computer-on-metric.png | Metric: figures in whole millimetres, 12" stations as 30.5 cm, the note still in inches |
| ojc-iphone-off.png / ojc-iphone-on.png | Upright iPhone: nose-up, Rocker column left, Thickness right, two icons |
| ojc-iphone-on-no-dimensions.png | Dimensions off: the foam and board fill the drawing |
| ojc-pixel7-sideways-on.png / …-no-dimensions.png | Pixel 7 sideways, board on, Dimensions on then off |

## The planner's choices, for the founder to confirm or overrule

- **P-2 — CONFIRMED by the founder (2026-10-17).** With the board on, the board's thickness is a second
  line (BOARD) on each blank station's card, each line with its own leader, not a second row of cards.
  Built so: the two leaders leave the card's edge at least 4 px apart, in their targets' order.
- **P-6 — CONFIRMED by the founder (2026-10-17).** Standing nose-up on an upright phone the station names
  are dropped; the figures keep their NAT / CUSTOM / BOARD and BLANK / BOARD tags.
- **P-1** — the popup grows its own drawing and never mounts the page's ROCKER viewer. Built; the page's
  desktop ROCKER picture passes unchanged.
- **P-3** — BOARD rocker is the board's rocker as the page reads it, `—` where the board doesn't reach.
  Proved: the board's bottom sits exactly the centre gap (plus the crop's own low point) above the
  blank's, which BOARD keeps out; `—` at both blank tips on every preset that opens in a blank.
- **P-4** — a natural draft shows NAT alone; once any change is set NAT and CUSTOM show at all five.
- **P-5** — board off, a card is untagged (name over value); board on, its lines read BLANK and BOARD.
  Rocker lines are always tagged; `—` in the label colour.
- **P-7** — titles Thickness and Rocker, the page viewer's words (a unit test pins them to the viewer's).
- **P-8** — figures 12 px, tags and names 9 px tracked, titles 10 px; all shrink together in 5% steps.
  Smallest label scale measured by the 219-blank unit gate: **computer 1, narrow window 1, Pixel 7
  upright 1, iPhone upright 0.95, Pixel 7 sideways 0.9, iPhone sideways 0.9** (the plan measured 0.85 for
  the iPhone sideways; this layout needs one step less). On the real Longboard in the 9'4"B: 1 on a
  computer, 0.95 on the upright iPhone and the Pixel 7 sideways with the board on.
- **P-9** — on a short screen the drawing keeps the width's scale and the column scrolls (proved in the
  browser on both sideways phones: the last stack and the Rocker title come into the card on scrolling).
- **P-10** — Dimensions is not remembered: On every time the popup opens. Foam length measured in the
  browser with Dimensions on → off: upright iPhone **109.7 → 187.6 px** (board on; plan 111 → 187),
  Pixel 7 upright 183.8 → 266.0, iPhone sideways **294.9 → 487.0** (plan 293 → 486), Pixel 7 sideways
  **313.9 → 506.0** (plan 314 → 507).
- **P-11** — Show my board's glyph is drawn here (`BoardInBlankIcon`); Dimensions is lucide's
  `RulerDimensionLineIcon`. The drawing starts below an 80-px band with a mouse, 40 px on a touch screen;
  both icons are 34 dots drawn with a 44-dot touch box (proved on both upright phones).
- **P-12** — the board's Thinning Starts marks are not drawn in the popup.
- **P-13** — leaders of different stations never cross while the board ends within 12" of each blank tip
  (asserted on every layout of the gate).
- **P-14** — text widths from a per-character Inter Bold table; never under the Chromium measurements.
- **P-15** — nothing left behind: the old blank-alone drawing, its layout, its titles and width rule, the
  board-frame overlay and the page viewer's overlay prop are gone with their tests.
- **P-16** — with Dimensions off the dashed bottom plane stays.

## The real drawing sizes, measured in the browser, against the unit gate's boxes

| Screen | Browser (svg box) | Unit gate box | Off by |
|---|---|---|---|
| Computer 1280×800 | 778.0 × 467.5 | 778 × 469 | 1.5 px |
| iPhone 14 upright | 356.0 × 202.5 | 356 × 203 | 0.5 px |
| Pixel 7 upright | 378.0 × 281.3 | 378 × 279 | 2.3 px |
| Pixel 7 sideways (Dimensions off, no scroll growth) | 521.0 × 140.0 | 523 × 143 | 3 px |
| iPhone sideways 844×390 (board on, grown to scroll) | 502.0 × 185.3 | 502 × 181 (grows) | — |

None more than 8 px off, so the gate's boxes stand as planned.

## Gates

- `npx vitest run`: **152 files, 5,717 passed, 2 skipped** — including the 219-blank layout gate (six
  popup sizes × three rockers × board off/on × Imperial/Metric, plus Dimensions off), the one-spec
  overlay tests, the board-in-the-blank's-frame tests, the lock inventory and units isolation.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Task 4's browser gate (13 spec files, desktop + iPhone + Android):
  `3 failed, 267 skipped, 321 passed (27.9m)`. The three: the two upright-phone icon-size checks read
  the button while the popup's opening animation still scaled it (43.9 px) — fixed to read the laid-out
  size, then **re-run alone: 2 passed**; and `board-lock-screens.spec.ts` "p-screens" on the iPhone, the
  known cold-server timeout — **re-run alone: 1 passed**.
- The ROCKER desktop baseline picture passed unchanged in every run; no picture was re-recorded
  (`git status e2e/desktop-baseline.spec.ts-snapshots` clean).
- Full suite (`PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test`, after the pictures' commit):
  `17 failed, 943 skipped, 1164 passed (1.9h)`. None of the 17 touches the Customize Rocker popup (lock
  screens, phone tiles, privacy footer, Board Rack, error page, new board, old-Safari buttons, the
  TEMPLATE ghost, a ROCKER fine-tune, the practice rack, undo/redo, wings) — they failed late in a
  two-hour run on one loaded dev server. **Re-run alone (`--last-failed`): 17 passed (2.8m).**

## Deviations from the plan

1. **[Rule 1 — bug] The drawing's frame now uses whole pixels.** The first browser run of Task 1 failed
   its zoom check: the drawing measured its own height as 468 (rounded) on its first draw and 467.5 a
   moment later, so Back to 1x returned a frame half a pixel different. The drawing now rounds its
   measured size before laying out. (Task 1, `b1e20929`.)
2. **[Rule 2] The layout reports a `neededHeight`.** For the sideways scroll (P-9) the drawing's box must
   grow to what the composition needs; reading that off the box itself would ratchet (a grown box never
   shrinks). The layout now returns the height the composition needs, worked from the width alone, and
   the unit gate proves a box grown to it lays out the same. (Task 3.)
3. **[Rule 2] The overlay is in the layout's extents.** The dashed natural line and the coloured spans are
   counted when fitting the drawing, so nothing of them can leave the drawing (a small optional input
   beside the plan's list).
4. **Metric figures carry "mm".** The plan's browser check read Metric figures as bare whole numbers;
   the drawing prints marks through `formatMark` as the ROCKER page's own cards do (`67 mm`), so the check
   reads `^-?\d+ mm$` or `—`. The unit gate measures the wider `mm` figures too.
5. **Card text sits in the font's real ascent and descent.** A stack's box is the full height the browser
   gives its text (Inter's ascent + descent) so the browser's own label boxes match the gate's.
6. **The short-screen card growth** uses `flex-[1_0_auto]` beside the kept `min-h-[220px]` on the card
   (a card cannot carry two minimum heights), with `min-h-fit` on the two inner boxes.
7. **The Show my board icon** was redrawn once after the first pictures: the first glyph read as a smile
   at its real size; the second is a long rockered lens with the board as a filled lens inside it.
8. **Task 2 was one commit, not a test commit then an implementation commit** (the orchestrator's one
   commit per task); the tests were written and run before the layout code was added to the file.

No file outside `files_modified` was touched.

## Human verification deferred

- The founder's look at the ten pictures before the merge (D-06).
- Whether the new Show my board glyph reads as "a board inside a blank" to a shaper.
- The sideways-phone scroll on a real iPhone and Pixel (proved in emulation only).

## Commits

- `b1e20929` Customize Rocker: Show my board is now an icon in the drawing's corner, and it draws your board inside the same picture of the blank instead of switching to a different drawing
- `c2beb2a0` The Customize Rocker drawing's figures and layout, worked out and tested …
- `0d8d72bb` The Customize Rocker drawing looks the same with or without your board …
- `8a27d834` Browser tests: the Customize Rocker drawing's stacked rocker figures …
- `d16b77bd` Pictures of the new Customize Rocker drawing on a computer and both phones, for the founder's look
- this summary

## Self-Check: PASSED

All five commits exist; the drawing files, the spec, the ten `ojc-*.png` pictures and
`shoot-source.tar.gz` are on disk; no `.ts`/`.js` script is tracked under `.planning/`; the desktop
baseline pictures are untouched.
