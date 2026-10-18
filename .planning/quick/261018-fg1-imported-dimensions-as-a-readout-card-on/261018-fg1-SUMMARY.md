---
phase: quick-261018-fg1
plan: 01
subsystem: design-screens-inputs
tags: [imported-dimensions, readout-card, sketch-017, rocker, rails, volume, fins, units, playwright]
requires:
  - quick-261018-ejc (ROCKER sidebar tidy)
  - quick-261018-e6w (TEMPLATE toolbar)
provides:
  - "lib/geometry/imported-readout.ts: the four screens' imported-size readouts as pure data, every figure through measure-display"
  - "components/design/imported-readout-card.tsx: the one card all four screens draw"
affects:
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-editor.tsx
  - components/rails/rail-controls.tsx
  - components/volume/volume-controls.tsx
  - components/fins/fin-controls.tsx
  - components/fins/fin-placement-editor.tsx
tech-stack:
  added: []
  patterns:
    - "one shared presentational card fed by pure, unit-tested builders"
    - "content-sized grid columns (repeat(n,1fr), no min-w-0) so a wide figure widens its column instead of spilling"
key-files:
  created:
    - lib/geometry/imported-readout.ts
    - lib/geometry/imported-readout.test.ts
    - components/design/imported-readout-card.tsx
    - e2e/helpers/imported-readout.ts
    - e2e/imported-readout.spec.ts
  deleted:
    - lib/geometry/volume-imported-line.ts
    - lib/geometry/volume-imported-line.test.ts
    - lib/geometry/rails-imported-line.ts
    - lib/geometry/rails-imported-line.test.ts
    - lib/geometry/fins-imported-line.ts
    - lib/geometry/fins-imported-line.test.ts
  modified:
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - lib/geometry/keep-figures-together.ts
    - lib/geometry/keep-figures-together.test.ts
    - lib/units-isolation.test.ts
    - e2e/volume-fins-panels.spec.ts
    - e2e/template-rails-panels.spec.ts
    - e2e/rocker-panel.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/phone-rails.spec.ts
    - e2e/desktop-baseline.spec.ts
decisions:
  - "FINS' five figures (diamond, swallow) read 3 then 2 (P-1)"
  - "Columns are content-sized, figures never wrap, names may wrap between words (P-2)"
  - "The card never greys on a locked board, on any screen (P-3)"
  - "Figures in ink, caption alone in the accent ink (the founder's ruling)"
metrics:
  duration: "about 2 hours (most of it the 30-minute browser sweep)"
  completed: 2026-10-18
status: complete
actuals:
  tokens: 90000
  tasks: 3
  commits: 3
---

# Quick 261018-fg1: Imported dimensions as a readout card Summary

The imported sizes on ROCKER, RAILS, VOLUME and FINS now read as a small card, with each size in large figures and its name under it, instead of one small grey sentence.

## Plain English: what changed for a shaper

Nothing about any board changed. No number is worked out differently and nothing saved is rewritten. Only how the imported sizes are written in each screen's INPUTS section changed.

The founder asked (2026-10-18): "can we make the inputs 'imported dimensions' stand out more. Right now they are actually smaller text", then chose from sketch 017: "Go with C readout card, figures in accent = off".

Each screen's INPUTS section used to end with a 12-pixel grey run-on sentence. It now ends with a card like Pick a Blank's (thin outline, rounded corners):

- a small caption in the accent colour in spaced capitals, `FROM TEMPLATE` (or `FROM ROCKER & FOIL` on RAILS);
- each size large (18 pixels, semibold) in the normal dark text colour, with its name under it in small muted capitals. Only the caption takes the accent colour.

| Screen | What the card shows | Columns |
|---|---|---|
| ROCKER | Length, Width | 2 |
| RAILS | Nose @ 12", Center, Tail @ 12" | 3 |
| VOLUME | Length, Width, Thickness, then a ruled foot line "Rail shapes from RAILS" | 3 |
| FINS | Length, Tail @ 12", Tail (the shape's name), plus Tail block (squash, diamond, swallow) and Depth (diamond, swallow) | pin or round 3, squash 2 x 2, diamond or swallow 3 over 2 |

- Imperial reads `6'0"`, `19"`, `1 5/16"`. Metric gives every figure its own unit (`182.9 cm`, `48.3 cm`, `33 mm`), because each stands alone in its own cell. The station labels read `30.5 cm`.
- Unticking Import Rocker & Foil Values (RAILS) or Import Designed Board (VOLUME, FINS) removes the card exactly where the sentence used to be. Ticking again, or one Undo, brings it back. ROCKER's card is always there.
- The card is information, not a control, so it never greys out on a locked board (RAILS' card therefore sits just outside the tick box's greyed area).
- A screen reader hears a group named by its caption holding name/value pairs, name first (`Length, 6'0"`).

## Phone heights (measured, logged by the new browser test)

Card height, in dots, with the tighter phone padding (8 top and bottom, 10 at the sides):

| Screen | iPhone 14 upright | Pixel 7 upright | iPhone sideways 844 x 340 | Pixel 7 sideways | Computer (planned) | Old sentence |
|---|---|---|---|---|---|---|
| ROCKER | 74 | 74 | 74 | 74 | 79 | 16 (1 line) |
| RAILS | 74 | 74 | 74 (Metric: 86) | 74 | 79 | 16 to 32 (1 to 2 lines) |
| VOLUME | 106 | 106 | 106 | 106 | 111 | 16 to 32 |
| FINS squash, diamond, swallow | 117 | 117 | 117 | 117 | 122 | 32 |

Each card adds about 58 to 90 dots on a phone. RAILS in Metric on the sideways iPhone reads 86 because `Nose @ 30.5 cm` and `Tail @ 30.5 cm` wrap to two lines there (they fit on one line on an upright phone). The test caps a phone card at 125 dots. Nothing crossed a card's edge on any phone, at 1280 or at 820 wide, in either system.

## Planner's choices for the founder to keep or change

- **P-1 FINS' five readouts read 3 then 2** (Length, Tail @ 12", Tail over Tail block, Depth), for phone room. It is 117 dots on a phone, the same as the squash 2 x 2. The one edge: a computer window narrower than about 840 wide with both a tail block and a tail width at two-digit-plus-15/16" sizes can crowd (planner's measurement; the 820-wide Metric swallow test passes).
- **P-2 Columns are content-sized:** a wide figure widens its own column instead of spilling; figures never wrap; names may wrap between words, and a station like `30.5 cm` stays in one piece.
- **P-3 The card never greys on a locked board,** on any screen.
- **P-4 Card padding** is 10 top, 12 sides, 11 bottom on a computer; 8 / 10 / 8 on phones under both the width rule and the short-screen rule. It sits 8 dots under its tick box.
- **P-5 VOLUME's Thickness** is the board's centre thickness, as the old sentence read it (`6.4 cm`).
- **P-6 Wording:** the caption and every name live in `lib/geometry/imported-readout.ts`, so a wording change is one edit.
- **Metric station labels take two lines on a computer and on a sideways phone** (`Nose @ 30.5 cm`, `Tail @ 30.5 cm` on RAILS; `Tail @ 30.5 cm` on FINS in the narrowest sidebars). I added one thing the plan did not name: figures in a row line up along their tops when a name beside them wraps (see Deviations).

## Desktop pictures re-recorded

ROCKER, RAILS, VOLUME and FINS only. Old against new was compared first, using the four diff images: only the sidebar from the INPUTS block down moved, and the drawing side and top bar were unchanged. TEMPLATE's picture is byte-identical and still passes. SHA-256 (first 8 characters), old to new:

| Picture | Old | New |
|---|---|---|
| ROCKER | df77b72a | 8b058472 |
| RAILS | 5766a6d9 | 45bdc74a |
| VOLUME | 17b3a6c9 | d9915b11 |
| FINS | 11b3b466 | da13a38a |

Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3164) on this Mac, as the file header in `e2e/desktop-baseline.spec.ts` records.

## Specs rewritten, and what each still proves

- `e2e/volume-fins-panels.spec.ts`: VOLUME's default card with its foot, untick removes it and one Undo brings it back, Metric units per figure. FINS' default card, unticked removes it and FINS' own controls show, Metric, and diamond / swallow / pin following the tail TEMPLATE picked.
- `e2e/template-rails-panels.spec.ts` (RAILS part only): the card's pairs in both systems, gone on untick (with each rail's own slider back), restored on tick. TEMPLATE tests untouched.
- `e2e/rocker-panel.spec.ts`: the `From TEMPLATE` card inside the INPUTS block in both systems, and no leftover "are imported" sentence.
- `e2e/rocker-blanks.spec.ts`: RAILS' Center figure follows ROCKER's Center Thickness slider (`2 3/4"`).
- `e2e/phone-rails.spec.ts`: the shared RAILS controls include the card.
- `e2e/imported-readout.spec.ts` (new, 12 tests that run across the three projects): the look (accent caption, ink figures, 18px / 600 / tabular, 10px label capitals, 10px corners, line-colour border, padding), column and row counts per screen, a swallow's five figures, nothing crossing at 1280 and at 820 in Metric, and the phone walk on four device shapes with heights logged.
- Unit tests: `imported-readout.test.ts` (19 tests, both systems, every tail, built-from-the-formatters, the column rule), plus a new guard in `units-isolation.test.ts`.

## Task commits

1. `9ec2b689` feat(quick-261018-fg1): VOLUME's imported board reads as a card (the tracer: readout module, shared card, VOLUME wired, proven in the browser)
2. `cb6003a0` feat(quick-261018-fg1): the imported dimensions read as a card on ROCKER, RAILS and FINS too
3. `1c5a511a` test(quick-261018-fg1): the imported-dimensions card proven on phones held both ways; four desktop pictures re-recorded

## Verification

- Vitest 153 files, 5927 passed, 2 skipped (full run, 30-second per-test limit). `tsc --noEmit` clean. `npm run lint` clean.
- Playwright (port 3164, webpack): the plan's sweep of 19 spec files across all three projects, 432 passed, 336 skipped by design (project-specific), EXIT 0.
- Review pictures: `pictures/` holds ROCKER, RAILS, VOLUME, FINS (squash and swallow) on a computer and on an upright iPhone, Imperial and Metric (`<screen>-<system>-<device>.png`, 20 files).

## Human verification deferred to the founder's review

- Look at the cards in `pictures/` and on the running site: size, spacing and the accent caption against the ink figures.
- Confirm or change P-1 (FINS' five in 3 then 2), and the card's two-line Metric station labels on RAILS and FINS.
- Confirm the wording: `From TEMPLATE`, `From ROCKER & FOIL`, the figure names, and the foot `Rail shapes from RAILS`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Figures in a row misaligned when a name wrapped**
- **Found during:** Task 2, the 820-wide Metric swallow test counted 3 rows where the card has 2.
- **Issue:** in a reversed flex column, content packs to the bottom, so when `Tail @ 30.5 cm` wrapped to two lines the other figures in its row sat one line lower than that figure.
- **Fix:** added `justify-end` to each cell (in a reversed column that means "to the top"), so figures in a row line up along their tops and names hang beneath.
- **Files modified:** components/design/imported-readout-card.tsx
- **Commit:** cb6003a0

**2. [Plan correction] FINS Metric tail-width figure is 37.4 cm in the browser, 37.5 cm in the old unit test**
- The plan's Task 2 text says `37.4 cm` and the old unit tests said `37.5 cm`. The browser test keeps the original spec's `37.4 cm` (what the live default board's tail width reads in the browser); the unit tests keep their own computed `37.5 cm` (from 14.75"). Both are what the formatters give for their own inputs; no number changed.

**3. [Test robustness] phone walk retries a cut-off `goto`**
- WebKit sometimes still finishes the last page's own navigation when the next `goto` starts ("interrupted by another navigation"). The new phone spec retries that `goto` once instead of failing.

No Rule 4 architecture changes.

## Observation outside this task (not fixed)

While taking review pictures I found that after visiting several design screens by full page load in one browser session, going to TEMPLATE, tapping the swallow tail and moving to FINS could still show Squash (the tap did not take). A fresh session works, and the real spec that does this passes. It looks like something about saved-draft restore timing, nothing to do with the card (the card shows exactly what the board holds). I did not investigate; flagging it for a look.

## Known Stubs

None.

## Threat Flags

None. The card only prints values the screens already computed; nothing crosses a trust boundary.

## Self-Check: PASSED

- Created files present: imported-readout.ts, imported-readout.test.ts, imported-readout-card.tsx, helpers/imported-readout.ts, imported-readout.spec.ts.
- Deleted files gone: the three old builder files and their three tests.
- Commits 9ec2b689, cb6003a0, 1c5a511a are on the branch.
