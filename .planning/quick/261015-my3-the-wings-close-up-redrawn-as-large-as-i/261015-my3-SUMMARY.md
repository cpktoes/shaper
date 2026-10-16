---
phase: quick-261015-my3
plan: 01
status: complete
subsystem: ui
tags: [outline, wings, template, callouts, zoom, phone, metric, playwright]

requires:
  - phase: quick-261015-hz7
    provides: the wing fixes (slot locks, chip value fit, spreadApart bounds, the close-up's full and compact frames)
provides:
  - "components/outline/wing-view-layout.ts: one close-up frame (closeUpFrame with the two-pass gutter, the toolbar-corner rule and the hug), WING_CARD_PX, WING_CARD_LABEL_PX, wingCardHeightPx, CLOSE_UP_CORNER_PX"
  - "components/outline/wing-data-card.tsx: WingDataCard — head, hairline, RUN / RADIUS / OFFSET rows"
  - "components/outline/outline-viewer.tsx: outlineViewBoxSize (the VIEWER's own frame size, one definition) and the exported GHOST_STROKE_WIDTH"
  - "components/viewer/chip-value-fit.ts: the + and - widths and fitTextSize"
  - "the WINGS tab's zoom (its own ViewerZoomProvider, ViewerZoomControl, useViewerZoom, ZoomGrid above 1x)"
affects: [TEMPLATE WINGS tab]

actuals:
  tokens: 31000    # chars/4 over the added lines of 2788d2c..HEAD (about 97,500 characters) plus this summary
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A drawing's line weight matched to a sibling viewer's: (sibling fit / own fit) / zoom, from the sibling's own pure frame size, fed through ViewerZoomUnitProvider"
    - "A frame whose gutter is sized to a pinned card at the frame's own fit, in two passes from fixed inputs, so nothing feeds back"

key-files:
  created:
    - components/outline/wing-data-card.tsx
    - .planning/quick/261015-my3-the-wings-close-up-redrawn-as-large-as-i/261015-my3-SUMMARY.md
  modified:
    - components/outline/wing-view-layout.ts
    - components/outline/wing-view-layout.test.ts
    - components/outline/wing-close-up.tsx
    - components/outline/wings-panel.tsx
    - components/outline/outline-editor.tsx
    - components/outline/outline-viewer.tsx
    - components/viewer/chip-value-fit.ts
    - components/viewer/chip-value-fit.test.ts
    - e2e/wings.spec.ts
    - e2e/viewer-zoom.spec.ts
    - .claude/skills/sketch-findings-shaper/references/wings.md

key-decisions:
  - "Nothing on the right also removes the Center and Nose @ 12\" read-outs (planner's reading, ruled)"
  - "Cards 120 px wide, only extreme values set smaller (planner, ruled)"
  - "The dashed no-wings curve at the VIEWER's ghost weight, 1.25 (planner, ruled)"
  - "The tail block on one line, TAIL BLOCK 4\" (planner, ruled)"
  - "The compact frame retired; one frame with the board hugging the gutter (planner, ruled)"
  - "The close-up DOES draw the VIEWER's grid above 1x (orchestrator's reversal of the planner)"

metrics:
  completed: 2026-10-15
---

# Quick 261015-my3: The WINGS close-up, as large as it can be — Summary

**Every wing number now sits in that wing's card on the left, nothing is drawn to the right of the board, the
tail block's width is written under the tail, the board draws about a fifth to a third larger, its lines are
exactly as thick as the VIEWER's, and the close-up zooms like the VIEWER.**

## What a shaper now sees, against the founder's words

1. **"The thickness of the lines need to match the template viewer."** The board's outline, the fin marks, the
   stringer, the 12" station, the widepoint line, the leaders and the card edges on the WINGS tab are now the
   same thickness on screen as the VIEWER's in the same window — on a phone held sideways, the same as the
   VIEWER *turned*, since that is how the VIEWER draws there. They stay that thickness at any zoom. Measured
   (close-up / VIEWER, dots): 1280 × 800 1.925 / 1.925; 1024 × 768 1.824 / 1.824; upright iPhone 1.219 / 1.220;
   upright Pixel 1.564 / 1.564; sideways Pixel 1.347 / 1.347; sideways iPhone 1.321 / 1.321. Before, the
   close-up drew 0.85–1.98 (F1).
2. **"I don't think we need any dims on the right … Nothing on the right."** The "Ahead of / Behind wing n"
   read-outs, the depth and run dimensions, and the Tail @ 12" read-out on the right are gone (and the Center and
   Nose @ 12" read-outs that showed in a grown window — see the rulings).
3. **"Lets put all the wing data in the data cards on the left (add a Run and Radius value to each card and an
   offset from fin when locked to the fin too)."** Each wing's card reads `3/8" @ 20 1/2"`, then `RUN 1/2"`,
   `RADIUS 15/16"` (the corner actually drawn) and, only while the wing is locked to its fin, `OFFSET +1/4"` /
   `0"` / `-1/2"`. In Metric the position is centimetres (`5 mm @ 27.9 cm`) and the run, radius and offset whole
   millimetres (`RUN 6 mm`, `RADIUS 0 mm`, `OFFSET 0 mm`). The tail's width at 12" is a card of its own,
   `TAIL @ 12"` (`TAIL @ 30.5 cm`), with a level leader to the board's edge at the 12" station.
4. **"Tail block can be written directly under the tail itself."** `TAIL BLOCK 4"` on one line under the tail,
   centred on the stringer. A pin or round tail has no block, so nothing is written.
5. **"We also don't need the off tail callouts since that info is now in the cards."** The position dimensions
   beside the cards are gone.
6. **"This should allow the wing view to be as large as possible."** Measured in the browser (dots per inch of
   board, the 26" window, two default wings):

   | Window | Before (F5) | After (measured) | Top pad |
   |---|---|---|---|
   | 1280 × 800, all five boards | 18.16–18.77 | 22.09 (Mid-length 22.70 — a round tail needs no room for the tail block's words) | 8 |
   | 1024 × 768, all five boards | 13.67–14.17 | 17.92–18.27 | 86–93 (below the toolbar and zoom row) |
   | iPhone upright (WebKit) | 9.48–9.82 | 12.07–12.45 (default, Longboard) | 65–67 |
   | Pixel upright | 10.03–10.39 | 12.80–13.20 (default, Longboard) | 62–64 |
   | Pixel sideways | 9.46 | 9.46 | 8 |
   | iPhone sideways | 10.54 | 10.54 | 8 |

   Nothing leaves the drawing and nothing sits under the toolbar or the zoom row (proven on every screen).
7. **"Wings tab also needs zoom capabilities like the viewer."** The mouse wheel and a trackpad pinch zoom toward
   the pointer, the zoom row under the toolbar steps in and out and goes back to 1x, a double-click (a double-tap
   on a phone) goes back to the whole tail, above 1x a drag on empty drawing moves the view, two fingers pinch on a
   phone while one finger still drags a grab point, a grab point drags its wing correctly at 3x, and the words,
   cards and grab points keep their size at 6x. Above 1x the VIEWER's grid shows behind the board, counted from the
   tail tip and the stringer. Each tab starts at 1x; nothing about the zoom is saved.

The VIEWER, the prints and every other screen draw exactly as before: the five desktop baselines pass with no
snapshot file modified, the VIEWER's viewBox strings come from the same numbers (its frame arithmetic moved
unchanged into `outlineFrameNumbers`), and no file under `lib/geometry/` changed — the wing golden and every frozen
fixture pass unedited.

## Rulings for the founder to confirm

- **Center and Nose @ 12" read-outs gone too** (D2) — they only ever showed in a grown window, on the right.
- **One line for the tail block**, `TAIL BLOCK 4"` (D3) — two lines would cost about 3% of the board's height.
- **Cards 120 px wide** (D4) — holds every common value at full size; only extremes are set smaller. The radius can
  reach 64" on a 2"-run, 1/16"-deep wing (F3); its row reads `RADIUS 64"` (in Metric four-digit millimetres) and
  stays inside its card.
- **The compact frame retired** (D6) — one frame for every screen.
- **The board hugs the gutter** (D6) — the spare width goes to the right under the toolbar, rather than centring the
  board (which would have needed a 79-unit top pad at 1280 × 800 and grown the board only 4–6%).
- **The dashed no-wings curve at the VIEWER's ghost weight, 1.25** (D1).
- **The zoom draws the VIEWER's grid above 1x** — the orchestrator reversed the planner's "no grid".
- **A phone held sideways draws the same size as before** — it is bound by its height; the zoom is the way in there.
- **Card insets scale with the card below the pinned floor** — on a phone held sideways the whole card is drawn at
  0.72 of its size, so its 4 px inset reads 2.9 dots there (see Deviations).

## Measured facts — confirmed or corrected

- **F1 confirmed.** VIEWER frame 514 × 638 upright, Fish 533.3 × 638, turned 729.6 × 367.35 (F1's 367.4 to one
  decimal); the VIEWER's and close-up's boxes are equal; the line widths above match F1's VIEWER column.
- **F2 confirmed** for the widths the code uses (labels, `+` 0.658 em, `-` 0.446 em; estimates within 1.5 px).
- **F3 confirmed**: the 2"-run, 1/16"-deep radius top reads 64" in Imperial. Corrected detail: in Metric the run's
  top is 50 mm (not 51), so the Metric radius top on the thinnest wing is a four-digit millimetre value below F3's
  1626 mm; a wing left at a 50 mm run and switched back to Imperial reads 62" until its run is set to 2" again.
- **F4 confirmed** (corner blocks 168 × 74 fine, 74 × 34 coarse).
- **F5 confirmed**, every after-figure within 0.05 of the plan's (unit test and browser): gutter 143.2 / fit 0.990 /
  22.09 px per inch / width 811.85 at 1280 × 800; padTop 87.7 / fit 0.939 / 18.06 at 1024 × 768; gutter 203.8 /
  padTop 65.4 / 12.45 on the upright iPhone box; 10.54 sideways. WebKit's own upright-iPhone figures (12.07–12.45)
  sit inside F5's Chromium range, so the 11.7 floor stands.
- **F6 confirmed** (the 32-unit bottom pad holds the words; proven inside the drawing on every screen).
- **F7 confirmed and rewritten**: the station-dim, read-out and `data-frame` checks became card checks.
- **One plan figure corrected:** the plan's grid proof said "at 6x on the tail, 1/2" lines". At 6x the larger
  close-up draws about 132 dots per inch, so the grid's 20-dot rule gives 1/4" lines there; the 1/2" lines (1 cm in
  Metric), with the inch (2 cm) lines darker, appear at 3x — the proof checks them at 3x in both systems.
- **The tracer's tail-block check moved boards:** the plan put it on the Mid-length, whose round tail has no block;
  the tracer proves the Mid-length writes nothing and the default board's squash tail writes `TAIL BLOCK 4"`,
  matching the VIEWER's own TAIL BLOCK chip.

## Deviations from Plan

1. **[Rule 1 - Bug] A card's name line 1 px lower than a chip's.** The browser proof's 1 px top rule found a card's
   name box within 0.2 px of the card's top edge (a chip's own layout). The card nudges its name 1 px down.
   `wing-data-card.tsx`, commit 9a2b189.
2. **[Rule 1 - Bug] The card's top value fitted with a 5% allowance.** On a phone held sideways in Safari the two
   longest values (`15/16" @ 53 15/16"`, `5 mm @ 20.3 cm`) drew 4.4% wider than the measured table and came 1.1
   dots from the card's edge. Their room is now divided by 1.05 before fitting; on a computer only values over
   about 107 px are affected, by a fraction of a point. Same commit.
3. **The inset rule reads in the card's own pixels.** Below the pinned floor (a phone held sideways) every card is
   drawn smaller, so the test's 4 px side and 1 px top/bottom insets are scaled by the card's drawn width / 120.
4. **`outlineViewBoxSize` is unit-tested** under vitest with the units action stubbed, as `rail-callouts.test.ts`
   already does — no fallback to a browser check was needed.
5. **`data-wing-stringer`** added to the close-up's stringer line as a test hook for the line-weight and grid proofs.

## The hydration warning in the gate log

The first scoped run's dev-server log carried one `Hydration failed` from the root layout (`SiteNav` and the
layout's outer `div`), on the iPhone project's `viewer-toolbar.spec.ts` TEMPLATE test — the VIEWER tab, where the
WINGS close-up is not drawn. **Not from this change:** it did not recur on the same tests warm, nor on a second fully
cold scoped run of this change (`.next` wiped; 101 passed, no hydration message), nor on a cold run of the base
commit 2788d2c. It is a one-off on a cold first compile. The close-up's own first render matches the server by
construction: its weight unit is exactly 1 and the zoom at 1x until the svg is measured, and the WINGS panel only
mounts after a tab click.

## Gates

- `npx vitest run`: 140 files, 5029 passed, 2 skipped.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- Playwright, `PW_PORT=3175 IS_WEBPACK_TEST=1`, `e2e/wings.spec.ts e2e/viewer-zoom.spec.ts
  e2e/desktop-baseline.spec.ts e2e/viewer-toolbar.spec.ts`, all three projects, cold server: **101 passed, 184
  skipped, 0 failed, EXIT 0** (8.5 min). No snapshot file modified.
- On the base commit's cold run, `desktop-baseline` RAILS once differed by 2% while a measuring run loaded the
  machine; it passed in both of this change's full runs (load, not code).

## Commits

- 54bdc28 — the close-up larger, every wing number in its card, the TAIL @ 12" card, the tail block under the tail
- 3e11d10 — the lines at the VIEWER's weight, and the zoom (with the grid above 1x)
- 9a2b189 — the browser proofs on five boards, phones and zoom; the wing design notes; the card's two fit fixes
- (this summary)

## Deferred

None.

## Self-Check: PASSED

All key files exist; commits 54bdc28, 3e11d10 and 9a2b189 are on the branch.
