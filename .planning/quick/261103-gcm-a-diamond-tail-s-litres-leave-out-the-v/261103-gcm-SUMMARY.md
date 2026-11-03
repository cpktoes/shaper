---
phase: quick-261103-gcm
plan: 01
subsystem: geometry / volume
tags: [volume, litres, template-area, swallow, diamond, tail-cut]
status: complete
requires: [quick-261103-drw]
provides:
  - "tailCutStation, foamHalfWidth, outlinePlanArea (lib/geometry/outline.ts)"
  - "crossSectionStations and a cut-split Simpson in computeCrossSectionVolume (lib/geometry/volume.ts)"
  - "crossSectionFoam: the one foam rule every litres figure reads (lib/geometry/design.ts)"
affects: [VOLUME, preset cards, Board Rack cards, phone VOLUME tile, SUMMARY order form, Full Sized Template, Overview Sheet]
tech-stack:
  added: []
  patterns: ["relation tests against the drawing's own shoelace, no typed figures"]
key-files:
  created:
    - lib/geometry/tail-cut.test.ts
  modified:
    - lib/geometry/outline.ts
    - lib/geometry/volume.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - components/design/design-store.tsx
    - components/template/build-overview-pdf.ts
    - components/template/build-overview-pdf.test.ts
    - lib/geometry/units.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
decisions:
  - "The litres and the Template Area count the tail as TEMPLATE draws it: a swallow's notch is air, a diamond's V is foam"
  - "A swallow's notch walls are counted as square cuts through the board (the founder's optional railed-notch question was not taken up)"
  - "The drawn curve (sampleOutline, OutlineGeometry.area) stays the prototype's own; TEMPLATE's measuring lines, the fins and the blank fit keep reading it"
metrics:
  completed: 2026-11-03
  duration: about 70 minutes
actuals:
  tokens: 11600
  tasks: 3
  commits: 5
---

# Quick 261103-gcm: Litres That Follow the Tail Summary

**A swallow tail's notch is no longer counted as foam and a diamond tail's V now is. The litres and
the Template Area are worked out from the outline exactly as TEMPLATE draws it, so the Fish drops
from 34.84 L to 34.65 L, a Shortboard with the Diamond button rises from 29.61 L to 29.91 L, and every
square, pin and round tail reads exactly what it did before.**

## What the founder will see

| Where | Before | After |
|---|---|---|
| VOLUME, the Fish as opened | 34.84 L, Template Area 1109.0 sq in | **34.65 L**, **1095.3 sq in** |
| VOLUME, a Shortboard with the Diamond button | 29.61 L, Template Area 1038.7 sq in | **29.91 L**, **1053.7 sq in** |
| Home page, the Fish's card | 34.8 L | **34.7 L** |
| Home page, the other three cards | 29.6 L, 49.4 L, 72.4 L | the same |
| Phone ☰ sheet, the Fish's VOLUME tile | 34.8 L | **34.7 L** |
| Printed Overview Sheet, the Fish | 1109.0 sq in (7.70 sq ft) | **1095.3 sq in (7.61 sq ft)** |

In Metric the Fish's Template Area reads 7066 cm² (was 7155) and the Diamond Shortboard's 6798 cm² (was 6701).

Pictures, each pair taken the same way before and after the change, under
`.planning/quick/261103-gcm-a-diamond-tail-s-litres-leave-out-the-v/pictures/`:

- `before-volume-fish.png` / `after-volume-fish.png`: VOLUME on the Fish.
- `before-volume-diamond.png` / `after-volume-diamond.png`: VOLUME on a Shortboard after pressing the Diamond tail button.
- `before-home-cards.png` / `after-home-cards.png`: the four preset cards (only the Fish's litres changes).
- `before-phone-volume-tile.png` / `after-phone-volume-tile.png`: the Fish's tiles in the phone's ☰ sheet.
- `shoot-source.tar.gz`: the script that took them (`shots.config.ts`, `shots.spec.ts`), plus `table.ts`, which printed every figure in the tables below.

Each picture run also printed, beside what the screen showed, what the app's own maths says it should
show, and the two agreed every time.

## The one rule, for a shaper

TEMPLATE draws a swallow tail as two points with a V-shaped notch cut between them, and a diamond tail
as a tail block with a V-shaped point behind it. Until now the litres were worked out from the curve of
the rail alone, which runs straight across a swallow's notch, so the notch was counted as foam. The
same curve stops at a diamond's tail block, so the V behind it was left out. Now, at every cross-section
along the board, the litres count only the foam that is really there in the drawing: inside a swallow's
notch, just the two tail pieces either side of it; behind a diamond's tail block, the V itself, narrowing
to nothing at its point. The notch's walls are counted as straight, square cuts through the board, just
as TEMPLATE draws them. The Template Area is the area of that same drawing.

## Litres before and after

The four presets as their cards show them, the first board a visitor sees, and a Shortboard with the Diamond button:

| Board | Litres before | Litres after | Card before | Card after |
|---|---:|---:|---:|---:|
| Shortboard (4" squash) | 29.6122 | 29.6122 (identical) | 29.6 L | 29.6 L |
| Fish (swallow, 10" wide, 2 3/4" deep) | 34.8426 | **34.6507** | 34.8 L | **34.7 L** |
| Mid-length (round) | 49.4062 | 49.4062 (identical) | 49.4 L | 49.4 L |
| Longboard (squash) | 72.3514 | 72.3514 (identical) | 72.4 L | 72.4 L |
| First board (4" squash) | 30.2902 | 30.2902 (identical) | — | — |
| Shortboard, Diamond button | 29.6103 | **29.9120** | — | — |

The Longboard's entry in the presets' record sits on its frozen blank and reads 73.57 L, unchanged.
That record was re-measured by its own script, and the Fish's litres is the only line that moved
(34.84256332970324 to 34.65070010841522).

## By tail kind (Template Area in mm², litres to four decimals)

"Drawn" is the area of the outline TEMPLATE draws, worked out independently of the new rule.

| Board | Template Area before | Drawn | Template Area after | Litres before | Litres after |
|---|---:|---:|---:|---:|---:|
| Shortboard as opened (squash) | 672,767 | 672,767 | 672,767 | 29.6122 | 29.6122 |
| Shortboard, Pin button | 654,622 | 654,622 | 654,622 | 29.0156 | 29.0156 |
| Shortboard, Round button | 695,686 | 695,686 | 695,686 | 30.4935 | 30.4935 |
| Shortboard, Diamond button | 670,140 | 679,817 | 679,817 | 29.6103 | 29.9120 |
| Shortboard, Swallow button | 678,481 | 670,739 | 670,739 | 29.7340 | 29.5439 |
| Fish as opened (swallow) | 715,512 | 706,641 | 706,641 | 34.8426 | 34.6507 |
| Fish, Diamond button | 686,618 | 696,295 | 696,295 | 34.0345 | 34.2809 |
| Fish, Swallow button | 695,298 | 687,557 | 687,557 | 34.0231 | 33.8553 |
| Mid-length, Diamond button | 950,106 | 959,783 | 959,783 | 50.0873 | 50.2741 |
| Mid-length, Swallow button | 956,144 | 948,402 | 948,402 | 49.8385 | 49.6722 |
| Longboard, Diamond button | 1,305,414 | 1,315,092 | 1,315,092 | 71.0924 | 71.4234 |
| Longboard, Swallow button | 1,296,538 | 1,288,796 | 1,288,796 | 70.1713 | 69.9877 |
| First board, Diamond button | 663,916 | 673,593 | 673,593 | 30.1884 | 30.4140 |
| First board, Swallow button | 672,872 | 665,130 | 665,130 | 30.1983 | 30.0611 |

Every square, pin and round button on all five boards (19 boards in all) reads the same Template Area
and the same litres to the last digit. A swallow loses roughly 0.14 to 0.19 L and a diamond gains
roughly 0.19 to 0.33 L, depending on the board. Every figure here matches the plan's measured table.

**Where the diamond's +0.30 L comes from** (the plan's measurement against a 4,000-section reference):
about 0.22 L is the foam in the V itself, and about 0.08 L is foam the old evenly spaced cross-sections
dropped at the tail block. They jumped from "no foam" just behind the block to the full block width
just past it, missing the block's real place.

## How the cross-sections land on the corners

The litres still come from 51 cross-sections added up along the board with Simpson's rule, and VOLUME
still says "51 cross-sections integrated". On a board with a cut tail, one of the 51 now sits exactly on
the cut's corner: a diamond's tail block, or a swallow's crotch. The rest are spaced evenly on either
side of it, and Simpson's rule runs over each side separately. The cut's edges are straight, so this
measures the V or the notch whole rather than straddling the corner. On a tail with no cut the 51
sections are exactly where they always were.

## Every place that quotes litres or the Template Area

| Reader | How it reads | Before → after |
|---|---|---|
| VOLUME's Estimated Volume | the design store's `crossSectionVolume`, now spreading `crossSectionFoam` | corrected for swallow and diamond |
| VOLUME's Template Area row | `deriveTemplateValues`, now `outlinePlanArea` | the drawn area |
| Home page preset cards | `presetSummary` → `summarizeDesign` | corrected (only the Fish moves) |
| Board Rack cards | `rack-models.ts` → `summarizeDesign` | corrected |
| Phone ☰ VOLUME tile | the store's `quotedVolumeLitres` | corrected |
| SUMMARY order form | the store's `quotedVolumeLitres` | corrected |
| Full Sized Template and Paper Saver | `export-preview-dialog.tsx` → the store's `quotedVolumeLitres` | corrected |
| Overview Sheet's Template Area line | now `outlinePlanArea` | the drawn area |
| App Default Settings' units example | `presetSummary` of the Shortboard | unchanged (squash tail) |

These still read the drawn curve itself (`sampleOutline`), which is right for them, and are unchanged:
TEMPLATE's measuring lines and the Overview Sheet's station lines (`template.ts`,
`build-overview-pdf.ts`), the ROCKER datasheet's widths, `outline-viewer.tsx`, `wing-close-up.tsx`, and
the blank fit (`preset-blanks.ts`, `use-blank-list.ts`, `blank-flag.tsx`, `before-after.ts`, the
Phase 14 stress set). The blank fit never sees a diamond's V. That is harmless, because the V is
narrower than the tail block, which the fit already checks, and a blank is wider there anyway.

No saved board's data changes. Litres are never stored with a board; they are worked out each time a
board is drawn. A saved swallow or diamond board simply shows its corrected litres the next time it is opened.

## Tests added or changed

- **New: `lib/geometry/tail-cut.test.ts`** (266 checks over 30 boards: the four presets and the first
  board, each as opened and with each of the five tail buttons, plus a winged Fish and a winged diamond).
  No figure in it is typed. Every expected number comes from the app's own functions:
  - where the corner sits for each tail kind;
  - the foam width matches the drawn curve exactly wherever there is no cut;
  - inside a diamond's V the foam runs straight from the point to the tail block;
  - inside a swallow's notch the air removed is the straight notch edge, and the foam is never below zero;
  - the new plan area equals the drawing's own area on every board, wings included;
  - VOLUME's Template Area equals the drawing;
  - the 51 stations land on the corner with an even count of sections either side;
  - Simpson on those stations finds the whole V or notch, and the cut adds no sampling error;
  - square, pin and round tails read the old litres section by section;
  - a swallow's litres fall and a diamond's rise, each by no more than its cut's area times the
    thickest section inside it.
  - Seen failing first on the old code, for the real reasons. VOLUME's Template Area was 1.2% to 1.4%
    off the drawing on every swallow and diamond. A swallow's and a diamond's litres were exactly
    what they would be uncut.
- **`lib/geometry/design.test.ts`**: the five hand-built copies of the litres pipeline now spread
  `crossSectionFoam`, so they keep mirroring the app. The Template Area mapping test expects
  `outlinePlanArea` and is renamed to say it maps the drawn outline's area.
- **`components/template/build-overview-pdf.test.ts`**: the two Template Area expectations read
  `outlinePlanArea`, with a note that the Fish's line now counts its notch as air.
- **`lib/geometry/__fixtures__/phase14-preset-figures.json`**: regenerated by
  `scripts/extract-phase14-preset-figures.ts --step tips`. Only the Fish's litres moved, and a second
  run wrote the same bytes.
- Untouched: `lib/geometry/outline.test.ts` and `prototype-outline-golden.json`. The prototype's curve and area are exactly as they were.

## Gates

- **Unit, the four geometry suites** (tail-cut, outline, volume, design): 700 passed.
- **Unit, full `npm test`**: 157 files; 6646 passed, 2 skipped, 1 failed. The failure was
  `blank-fit.test.ts`'s runs-out reason test, which timed out at 5 s under load. Run alone it passes, 86 of 86.
- **`npx next typegen` + `npx tsc --noEmit`**: clean. **`npm run lint`**: clean.
- **Browser, the five specs on all three projects** (`desktop-baseline`, `volume-fins-panels`,
  `phone-screen-tiles`, `imported-readout`, `board-rack`): 85 passed, 139 skipped (tests that run on
  another project only), 10 failed. The machine's load average was about 70 throughout, from other work.
  Every failure was a time limit, never a wrong figure:
  - The desktop TEMPLATE reference picture timed out with 4,104 scattered anti-aliasing pixels; the
    two pictures are visually identical. Run alone, **all five desktop reference pictures pass
    unchanged**. None was re-recorded, and no log entry was written.
  - The other nine, re-run together: 10 passed, 7 failed, all timeouts. With a 120 s test limit:
    8 passed, 5 failed, all inside the phone spec's fixed 30 s "tap a preset card, reach TEMPLATE" helper.
  - The phone-tile tests, re-run on both phones: 9 passed, 1 failed. That includes the Fish's and the
    Longboard's tiles, whose VOLUME litres check reads the corrected figure.
  - The last one alone, with a 120 s limit: passed.
- **Greps**: no `sampleOutline(outlineGeometry` left in `design.ts` or `design-store.tsx`.
  `crossSectionFoam(outlineGeometry)` appears once in each. The outline golden and its test are
  unchanged from the base, as are the desktop reference pictures and their spec. The presets' record
  differs by exactly one line.

## Deviations from Plan

1. **[Orchestrator ruling] A fourth picture pair.** The phone's VOLUME tile (the Fish, iPhone) was
   photographed before and after, as the dispatch asked. The plan named three pairs.
2. **The before pictures were committed with the failing tests** (commit e3bf751e), not separately.
   The plan lists both under Task 1 and names only the test commit.
3. **`table.ts` was added to `shoot-source.tar.gz`.** It printed this SUMMARY's tables from the app's own
   functions, so the figures can be re-run.
4. **The Overview Sheet's tests were changed in the same commit as the Sheet** (dd3a7930). They were
   never committed failing. The plan only predicted they would fail.
5. **Browser gate load flakes were re-run** as described under Gates. Nothing was re-recorded.
6. **The after pictures and the SUMMARY are two commits.** The plan names one commit for both; the
   dispatch asked for the SUMMARY to land last as its own `docs(quick-261103-gcm): summary` commit.
7. **Commit trailer.** The dispatch's suggested line named another model and allowed the harness's own.
   Every commit ends with the harness's `Co-Authored-By: Claude Opus 5.5` line.

No auto-fixes were needed; the geometry passed its relation tests on the first green run.

## For the founder's look

- **The notch walls are square cuts.** A swallow's notch is counted as two straight walls cut square
  through the board, exactly as TEMPLATE draws them. If you rail the inside of a swallow's notch, that
  would take off about 0.02 L more on the Fish. Your call; not done here.
- **Open question:** should the inside of a swallow's notch carry a rail, as in the item above? If so,
  which rail: the tail's own, or a harder one?

## Self-Check: PASSED

- All nine modified files and the new test file exist in the worktree.
- Commits e3bf751e, 155efa8f, dd3a7930 and 3600208f are on the branch (this SUMMARY is the fifth).
- All eight pictures and `shoot-source.tar.gz` exist.
