---
phase: quick-261113-et0
plan: 01
subsystem: setup / board files
tags: [brd, akushaper, shape3d, open-as-board, print-overview, rocker-stations]
requires: [261113-d9b (reader, fit, preview dialog), lib/export/brd-fit-preview.ts, components/template/print-pdf.ts]
provides: [brdFileStations, brdFileWidths, fitOutlineWidths, outlineGapSide, brdBoardFields, BRD_FIT_COPY, brdFitSheet, brdFitFramesInBox, buildBrdOverviewPdf]
key-files:
  created:
    - lib/models/brd-board.ts
    - lib/models/brd-board.test.ts
    - components/template/build-brd-overview-pdf.ts
    - components/template/build-brd-overview-pdf.test.ts
  modified:
    - lib/geometry/brd-fit.ts
    - lib/geometry/brd-fit.test.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-fit-preview.test.ts
    - components/setup/brd-fit-dialog.tsx
    - components/setup/open-board-file.tsx
    - components/setup/board-file-copy.ts
    - components/3d/brd-preview-dialog.tsx
    - e2e/brd-fit-preview.spec.ts
decisions:
  - "A tip that comes to a point (thinner than 1/16 inch at its very end) is read with a straightedge along the bottom and the deck from 2 and 1 inch in, and the point's own figures are given in a note; every other tip is read at its very end."
  - "The overview prints through the Overview Sheet's PDF route (jsPDF + print-pdf.ts), on a page A4 wide by Letter tall."
  - "Open as a Board goes through the same onOpen path and the same board reader a JSON board file takes; the opened board holds the fit's own unrounded values."
status: complete
actuals:
  tokens: 33000
  tasks: 3
  commits: 3
---

# Quick 261113-et0: a .brd opens as an editable board, with a printable overview Summary

**The closest-fit preview now has three footer buttons, Print Overview, Open as a Board and Close. It shows the file's own widths, rocker and thickness at our five stations beside our fit's, prints a one-page overview of all of it, and opens our closest fit as a new, unsaved board named after the file.**

## What a shaper sees

- **Under HOW CLOSE** three small tables, WIDTHS, ROCKER and THICKNESS, each with the file's figure and our fit's. The rocker and thickness rows are the app's own five stations (nose tip, 12" from the nose, centre, 12" from the tail, tail tip); the rocker is measured the way the app measures it (lift off the centre's low point). Under them: "To match the file's rocker exactly, pick a blank on ROCKER and use Customize Rocker to bring it to these figures", and, for a tip that comes to a point, a line giving that point's own figures.
- **HOW CLOSE** lines now read "less than 1/16" off" instead of "within <1/16"", and the outline line says which way the file lies at its widest gap ("...3/8" from the nose, where the file is wider than our fit"). Where a gap is reads from the nearer end.
- **Print Overview** makes one page: the file's name and size, both views with both lines and the key, how close each curve gets and where, the three tables, the settings of our fit, and the not-read line. On a computer it opens the print window; on an iPhone or iPad it opens a tab to print from; on Android it downloads a PDF. The preview stays open afterwards.
- **Open as a Board** closes the preview and opens our closest fit as a new board: our outline, hand-set rocker and thickness, no blank, rails, bottom and fins as on any new board. With a board already in progress the home page's usual "Open this board file?" question comes first. Nothing is saved until Save. (The board-name tab reads "Untitled" until Save, as for any unsaved board; the file's name is what the Save prompt offers.)
- **Close** changes nothing, exactly as before.

## The E3 finding: what the file's bottom really does in the last inch

The planner measured it on the four files and I reproduced it from the shipped code (`brdFileStations`, run on the files in `~/Downloads`; every figure below matches the plan's tables to the thousandth of an inch).

- **The egg's nose is the misleading case.** Its bottom curve ends turned up to meet the deck: the very end reads 4.405" with the board 0.030" thick (a point), but the bottom carried straight on from 2" and 1" in reaches 3.939". A blank matched to 4 3/8" would carry nearly half an inch too much nose rocker. The egg's tail is also a point (0.009" thick) but there the two readings agree (2.730" and 2.719").
- **The scoop's nose is real.** It steepens right to the end and finishes under a 0.29"-thick square nose, so its bottom truly stands 4 1/8" there. Our fit (fitted from 1" in, as before) misses about 7/16".
- The 6'2 and the Fryer end square, and the two readings agree within 0.06".

**The rule:** a tip thinner than 1/16" at its very end comes to a point, and is read straight on with a note giving the point's own figures. Every other tip is read at its very end. The centre and the two 12" stations are always read straight off the file. The fit itself is unchanged.

### The rocker and thickness at our five stations, per file (inches; the file / our closest fit)

Rocker (lift off the centre):

| File | Tail tip | Tail 12" | Centre | Nose 12" | Nose tip |
|------|----------|----------|--------|----------|----------|
| 6'10 Egg | 2.719 / 2.708 (**point**; very end 2.730) | 1.273 / 1.273 | 0 / 0 | 1.532 / 1.532 | 3.939 / 3.878 (**point**; very end 4.405) |
| 6'2 Round Tail | 2.383 / 2.383 | 0.961 / 0.961 | 0 / 0 | 1.355 / 1.355 | 4.524 / 4.392 |
| Fryer 5'7 | 2.525 / 2.469 | 1.012 / 1.012 | 0 / 0 | 0.820 / 0.820 | 3.837 / 3.832 |
| Scoop Noserider | 4.001 / 4.019 | 2.262 / 2.262 | 0 / 0 | 1.672 / 1.672 | 4.115 / 3.657 |

Which tips "come to a point": the egg, both ends. The other three files none.

Thickness:

| File | Tail tip | Tail 12" | Centre | Nose 12" | Nose tip |
|------|----------|----------|--------|----------|----------|
| 6'10 Egg | 0.639 / 0.685 (very end 0.009) | 1.593 / 1.593 | 2.598 / 2.598 | 1.524 / 1.524 | 0.482 / 0.473 (very end 0.030) |
| 6'2 Round Tail | 0.573 / 0.579 | 1.779 / 1.779 | 2.687 / 2.687 | 1.650 / 1.650 | 0.392 / 0.319 |
| Fryer 5'7 | 0.369 / 0.431 | 1.616 / 1.616 | 2.308 / 2.308 | 1.632 / 1.632 | 0.240 / 0.250 |
| Scoop Noserider | 0.635 / 0.622 | 1.740 / 1.740 | 2.976 / 2.976 | 1.686 / 1.686 | 0.292 / 0.646 |

### Widths (inches; the file / our closest fit)

| File | Nose 12" | Wide point | Wide point sits | Tail 12" | Tail end |
|------|----------|------------|-----------------|----------|----------|
| Egg | 17.246 / 17.315 | 21.000 / 21.000 | 4.382 forward / same | 14.269 / 14.336 | no flat end / no flat end |
| 6'2 | 13.664 / 13.678 | 20.500 / 20.500 | 3.282 back / same | 15.851 / 16.011 | no flat end / 1.953 |
| Fryer | 13.875 / 13.884 | 18.750 / 18.750 | 0.970 forward / same | 14.399 / 14.437 | no flat end / 2.799 |
| Scoop | 18.203 / 18.302 | 23.000 / 23.000 | 4.822 forward / same | 15.473 / 15.467 | 6.610 / 6.560 |

A tail whose outline closes to the stringer (under 1/16" wide at the very end) reads "No flat end" rather than a misleading 0.

### Which way the outline's widest gap runs

| File | Largest gap | Where | File minus ours there | The sheet says |
|------|-------------|-------|-----------------------|----------------|
| Egg | 1.0 mm | 3/8" from the nose | +2.8 mm | the file is wider than our fit |
| 6'2 Round Tail | 2.1 mm | 1 1/16" from the tail | +3.0 mm | the file is wider |
| Fryer 5'7 | 2.8 mm | 7 1/16" from the tail (the flyers) | -2.9 mm | the file is narrower: where a wing belongs |
| Scoop Noserider | 1.5 mm | 9/16" from the nose | +3.7 mm | the file is wider |

## Commits

1. `138facab` — the maths and tests only: the file's stations, widths, gap direction, the board a fit opens as, one set of words and one sheet.
2. `9ada968d` — the preview's tables, Print Overview, Open as a Board, and the one-page PDF builder.
3. `8ced3b60` — browser tests on a computer and both phones, and the pictures and printed overviews.

## Verification

- **Unit:** the last combined run (`components/template`, `lib/export`, `lib/geometry/brd-fit`, `lib/models`, `lib/units-isolation`): 33 files, 1610 passed, 2 skipped (both skips are old). New tests: `brd-fit` +11 (stations, point rule, widths, gap side), `brd-board` 13, `brd-fit-preview` +17 (sentence rule, where, sheet, box frames), `build-brd-overview-pdf` 40 (four boards x Imperial/Metric x Height 1, 2, 4, 8, long and spaceless file names, a point's note, file names).
- `npx tsc --noEmit` clean. `npm run lint` clean apart from the one known old warning in `lib/db/import-designs-action.test.ts`.
- **Browser (`PW_PORT=3117`):** `e2e/brd-fit-preview.spec.ts` 17 passed, 10 skipped on purpose (b2 to b5 and b8 run on the computer only), 0 failed. `e2e/board-file.spec.ts` 21 passed, 3 failed: f1 on all three projects, the known last-digit failure (`deckLengthMm` 1917.6999999999998 against 1917.7, browser against Node), nothing else. No desktop baseline picture changed (none covers the home page).
- **Paper:** all six overview PDFs read back with pypdf: one page each, 595.28 x 792 pt (210 x 279.4 mm, no larger than Letter or A4), each holding the file's name, "Nose tip", "Our fit", and for the egg the point note.
- The planner's scratch script reproduced every figure in the three tables above within 0.005".

## Pictures and printed overviews (in `pictures/`, all looked at)

- `preview-desktop-{egg,round-tail,squash-flyer,noserider}.png` and `-tables.png` (body scrolled to the tables); `preview-desktop-egg-dark.png` (Slate); `preview-desktop-noserider-metric-tables.png`.
- `preview-phone-egg.png`, `-tables.png`, `-bottom.png` (iPhone 14): the three footer buttons all in view, finger-sized, none overlapping.
- `overview-{egg,round-tail,squash-flyer,noserider}.pdf` (Imperial, from the computer's print frame), `overview-noserider-metric.pdf`, `overview-egg-height2.pdf` (side view at x2), each with a rendered `.pdf.png`. Looked at: one page, nothing clipped, nose on the left, file line grey and our fit's dashes black over it so both read even where they coincide, tables readable, the egg's nose row 3 15/16" beside our 3 7/8" with its point note, the scoop's 4 1/8" beside our 3 11/16", the Fryer's outline line saying narrower.
- `opened-template-squash-flyer.png`, `opened-rocker-squash-flyer.png`: the Fryer after Open as a Board, on TEMPLATE and ROCKER (see the first item under "Found, not fixed").

## Found, not fixed (needs the founder's call)

**Opened fit boards show long decimals on TEMPLATE, the Overview Sheet and the guide cards.** The fit's angles, fullness and rail lengths fall between the sliders' steps, and the app prints those raw: the opened Fryer's TEMPLATE reads "Nose Angle — 48.13482249200385°" and "Tail Rail — 56.35232831638945%" (see `opened-template-squash-flyer.png`). The same raw interpolation is in `components/outline/outline-controls.tsx` (six labels), the drag chip in `outline-viewer.tsx` (seven), `components/template/build-overview-pdf.ts` (the printed Overview Sheet's spec lines) and `lib/geometry/guide-outline.ts`. It is old behaviour that a fitted board exposes (any off-grid board file would show it too), so I did not touch it. Two ways to fix it: (a) display rounding at those ~25 places, through one tested helper (angle and percent to two decimals, so on-grid values read exactly as now); this keeps the board exactly the preview's fit and is the one I'd recommend; (b) snap the fit's angles, fullness and rail lengths to their slider steps inside `brdBoardFields`, which is a one-file change but leaves the opened board a hair different from the preview, which the brief ruled against. Rocker, thickness and widths on the other pages read fine (they go through the mark and dim formatters).

## Deviations from Plan

### The planner's seven departures from the brief (for the founder's look)

1. **Print route.** The brief pointed at the order form's CSS route; this uses the Overview Sheet's PDF route (jsPDF + `print-pdf.ts`): it prints only the sheet by construction, is proven on his devices, and needs no print stylesheet on the home page.
2. **E3 tips.** True tips as asked, except a tip that comes to a point (the egg, both ends), which is read straight on with the point's own figure in a note. Thickness at the tips follows the same rule.
3. **Where a gap is** reads from the nearer end ("3/8" from the nose" rather than "81 5/8" from the tail").
4. **Tail end** reads "No flat end" when the outline closes to the stringer.
5. **Words moved** from `components/setup/board-file-copy.ts` to `lib/export/brd-fit-preview.ts` (`BRD_FIT_COPY`), so one builder in `lib/` feeds the dialog and the paper.
6. **On paper the side view prints at the dialog's Height pick**, both views shrinking together if needed to keep one page; the dialog stays open after Print Overview; jsPDF loads only when Print Overview is pressed.
7. **Tracer-first not used:** the orchestrator set the three-task split.

### My own

**1. [Rule 1 - drawing] Each curve is one path, not many `doc.line` calls.** The plan said successive `doc.line` calls; a dash pattern restarts at every segment, and a curve of hundreds of tiny segments would print as a solid line. `doc.lines` draws each curve as one path so the dash runs unbroken. (Commit 2.)

**2. [Judgement] Stroke styling differs from the plan.** The plan had the file as a 0.35 mm black solid line and our fit a 0.3 mm black dashed line. A black dashed line on a black solid one is invisible where the two coincide, which on a close fit is most of the way round (my first render showed exactly that). The file is now a 0.55 mm mid-grey line and our fit a 0.25 mm black dashed line over it, and the key matches. It is grey ink as well as black, as the dashed stringer already was. (Commit 2.)

**3. [Rule 1 - bug found by test] Own word wrap.** `wrapTextToWidth` does not break a word wider than the line, so a 200-letter file name with no spaces ran off the page. The builder has its own wrap that cuts an over-long word by letters. A letter the printer's standard font has no shape for (anything outside Latin-1 except the em dash) prints as a `?`; typographic quotes become plain ones. (Commit 2.)

**4. [Safety] Table cells shrink a little rather than run into the next column** (down to 5 pt) if a figure is ever too long; none is, in either system, on any board tested.

**5. [Touched a file not in the plan]** `components/3d/brd-preview-dialog.tsx` exports its `PRIMARY_CLASS` (one word), so Open as a Board wears the same accent style as the Board file preview's Save button instead of a copy.

**6. [Kept] `BrdFitCloseWords.at` stays.** The plan removed it once `where` replaced it; nothing in the dialog or the sheet reads it now, only a test does. Harmless; easy to drop.

**7. [Layout] `brdFitFrames` is now a thin wrapper over a shared `framesAt`** that takes the pads as parameters, so `brdFitFramesInBox` can use zero pads. It no longer calls `brdStationX` (that function has a fixed pad) but writes the same x rule; `brdFitFrames`'s output and its existing tests are unchanged.

**8. [Test tolerance] The phone footer's 44-dot check allows 43.95.** WebKit laid the 2.75rem box out at 43.99 on one run; that is the 44-dot rule, not a miss. Every other check is exact.

**9. [Process] Test-first was real for `brd-board` and the PDF builder (both failed before their modules existed); for the `brd-fit` and `brd-fit-preview` additions I wrote the tests first but ran them together with the code, so I did not watch them fail on their own.**

**10. [Scope] `brdFileStations` takes `Pick<BrdLines, "length" | "bottom" | "deck">`** (the plan said `BrdLines`) so the tests can hand it two lines without an outline.

## Honest limits

- A tip that rolls over without coming to a point is read at its very end; a blank matched to a tip like that may differ from what a straightedge would give.
- The app's own exports round the deck at the tips, so a board the app wrote reads thinner at a tip than it was (mid.brd's tail reads 1/2" where the board had about 3/4").
- The real print window on the founder's computer and iPhone is his look: headless browsers do not open it. What is proven is the PDF itself (one page, 595.28 x 792 pt, the words, the tab on a blob address, the Android download name).
- Wings or flyers, rails, bottom contours and the file's cross-sections are still not read; the sheet and the preview say so.
- The opened board forgets the file's lines: nothing is kept with the board but our fit (a ghost of the file on TEMPLATE is a later offer, as the brief said).

## Threat check

No new surface beyond the plan's register: the fit's values pass `readBoardEntry` before `onOpen` (unit-tested: the fields read back equal the fit); the file name is shown as text, cut to 200 letters, slugged for the download; the PDF is built and printed in the browser and sent nowhere; no database change.

## Self-Check: PASSED

Files exist: `lib/models/brd-board.ts`, `components/template/build-brd-overview-pdf.ts` and their tests, 27 files in `pictures/` (15 PNG pictures including the 2 opened-board ones, 6 PDFs and their 6 rendered PNGs). Commits `138facab`, `9ada968d`, `8ced3b60` are in `git log`. `git status` shows only the PLAN and BRIEF untracked (the orchestrator commits them). No AkuShaper file or its text is in the repo: only the pictures and the printed overviews made from them.
