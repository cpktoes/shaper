---
phase: quick-261113-vya
plan: 01
subsystem: summary-order-form / printed BOTTOM CONTOURS sheets
tags: [print, order-form, bottom-contours, fit-rule, 12ft-boards]
requires: [quick-261113-si7]
provides:
  - "bottomSheetLayout: tablesSplit, splitNotes {depths, marks}, sheets 1 | 2 | 3; bottomSheetSpare: split {depths, marks}"
  - "Order form prints Bottom Contours · Depths (page 4) and Bottom Contours · Layout Marks (page 5) on a board over 11'6\" with a layout-mark column"
affects: [components/summary/bottom-sheet-fit.ts, components/summary/bottom-contours-sheet.tsx, components/summary/order-form.tsx]
key-files:
  modified:
    - components/summary/bottom-sheet-fit.ts
    - components/summary/bottom-sheet-fit.test.ts
    - components/summary/bottom-contours-sheet.tsx
    - components/summary/order-form.tsx
    - e2e/helpers/bottom-print.ts
    - e2e/summary-bottom-page.spec.ts
    - e2e/summary-planing.spec.ts
  created:
    - .planning/quick/261113-vya-the-printed-bottom-contours-tables-keep-/pictures/ (eight pictures + numbers.md)
decisions:
  - "One table a sheet (option A), not both tables broken at a row: each table whole, Tail to Nose tip, no 'continued'"
  - "Split exactly where today's last rung fails (tight rows, no notes, still under the spare): in practice over 11'6\" with any layout-mark column"
  - "Rows keep their padding on the two sheets; each carries its own table's note plus the full-ink rows note"
status: complete
actuals:
  tokens: 120000   # rough chars/4 over the diff (448 lines added, ~1,400 lines of tests and sources) - an approximation, not measured
  tasks: 3
  commits: 3
---

# Quick 261113-vya: The printed BOTTOM CONTOURS tables keep every row on a board up to 12'0"

**A 12'0" board whose bottom has layout marks now prints its depths table on one sheet and its layout-marks table on the next, each whole from Tail to Nose tip; every board that fit before prints exactly as it did.**

## What changed, in plain words

A board over 11'6" has 25 rows in each bottom table (a row every 6", plus the nose tip). With layout marks the two tables
together were 26 dots too tall for the one sheet they share, and the last row, Nose tip, printed on top of the page's
footer. Now, when the two tables will not share their sheet even with the rows tightened and no notes, the order form
prints them a sheet each: "Bottom Contours · Depths" (page 4) and "Bottom Contours · Layout Marks" (page 5), 25 rows
apiece, today's row height and type size, each with its own reading notes. Page N of M counts the extra sheet, the line
under the paper says "plus three Bottom Contours pages", and the Rail Band Instructions page still prints last when
ticked. On Letter and A4, Imperial and Metric, a marked 12'0" board is 5 pages (6 with the Rail Band page); it was 4 (5).

The split begins exactly where today's last squeeze fails: over 11'6" with at least one layout-mark column. Every board up
to 11'6", and any board of any length whose bottom has no layout marks, is laid out as before.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `71d26dd8` | The rule (`bottom-sheet-fit.ts`), the two sheets (`bottom-contours-sheet.tsx`), the order form (`order-form.tsx`), the 12'0" unit test replacing the `it.todo` |
| 2 | `00352994` | Unit sweep + rule-by-definition check, three-way count checks, the helper's `size` argument, two browser specs |
| 3 | `0f1fb1b2` | Pictures (eight) and `numbers.md` for the founder |

## Proof

- **Unit:** `bottom-sheet-fit.test.ts` 313 tests green. The `it.todo` is now a real 12'0" test; the 10'0" pin stays. Sweep: four shapes, 4'0" to 11'6" (17 lengths), narrowest / stock / widest width, 11 bottoms, both systems (4,488 layouts): none splits, none prints more than two sheets; 11'6 1/16", 11'9" and 12'0" (792 layouts): every marked bottom splits, both sheets have at least the 4-dot spare, every note kept; a bottom with no marks never splits. Rule by definition: split exactly when the last rung (tight, no notes) leaves under the spare.
- **Whole suite once (`npm test`):** 232 files passed; 13,683 tests passed, 2 skipped (13,685); no failures.
- **Layout pin (5,856 layouts):** 5,208 identical; the 648 that differ are exactly the 36 boards at 11'6 1/16", 11'8" and 12'0" (4 shapes x 3 widths) with a layout-mark column, 9 bottoms x 2 systems each, and each differs only in tight true to false, sheets 2 to 3, spare -26 to none. Panel / belly / flat at those lengths and everything up to 11'6" identical.
- **Real PDFs (160, from the dev server on 3117):** the 16 PDFs of the two marked 12'0" boards changed as intended; `lb-144x31-panel` (12'0", no marks) identical page for page. Of the other 144: 135 are byte-identical to the "before" set in at least one of up to five prints; 9 (8 on A4, 1 on Letter) differ only in the size of the axis numbers on the plan drawings (page 1, the Rail Band page; 9 pt vs 11 pt) — see "Deviations". Rows read back from the 16 PDFs: pages 4 and 5 each 25 rows Tail ... Nose tip (Metric stations in cm), lowest row 307 to 321 pt clear of the page mark (was -6.1 pt before on the every-cut board).
- **Browser:** `summary-bottom-page.spec.ts` on 3117: 11 passed, 10 skipped by design (iPhone / Android skip the desktop-only tests), including two new 12'0" tests (Imperial and Metric). `summary-planing.spec.ts --project=desktop -g "BOTTOM CONTOURS page fits"`: 10 passed (five boards x two systems; the 12'0" board's computer print, eight phone widths, Letter and A4 PDFs of 5 pages).

## Tests added or re-pointed

- Re-pointed: the `it.todo` became "the longest board the app allows (12'0\") ... a sheet each"; "sheet count follows the tables" is three-way (3 / 2 / 1); "every sheet the bottom prints on has room" checks `split.depths` and `split.marks` on a split.
- Added: a 12'0" board with no marks does not split; 11'6" keeps one sheet tight and bare while 11'6 1/16" splits; the sweep and the rule-by-definition check; two browser tests (page marks 3 to 5 of 5, 5 of 6 / 6 of 6 with the Rail Band page, one table a sheet, 25 rows with Tail first and Nose tip last, notes equal to `splitNotes`, no tight rows, the three-pages line, no inch mark in Metric); the fit sweep gets a fifth board (12'0" x 31", `tablesSplit`) checking every clip, mark and width on every tables sheet.

## Deviations from Plan

**1. [Rule 3 - blocking] The scratch PDF comparison script could not see page content.** `compare-pdfs.py` tested `if p.get_contents()`, which is false for pypdf's content stream object, so every page compared as empty and only page counts were really checked (the first "144 identical, 16 different" was therefore too good). Fixed the script (`is not None`) in the scratchpad and re-ran. The corrected comparison found the 9 plot-axis differences below. Not a repo file.

**2. Nine non-target PDFs are not byte-identical to the "before" set, and are not caused by this change.** They differ only on pages 1 / 2 / the last page (the plan drawings and the Rail Band page) in the size of the axis numbers on the SVG plots (9 pt vs 11 pt; 9.13 vs 10.99 on the Rail Band page). The same difference appears on boards with no bottom at all (fish flat, metric) where no bottom code runs; two prints of the same flat board flipped between identical and different against "before"; none of the nine has a BOTTOM CONTOURS page among its differences; and the code changed touches only the bottom sheets and the hint under the paper. The axis-number size comes from the plots' measured inverse scale, which looks timing / environment dependent on the dev server (the "before" set was taken earlier in the day). I did not chase it further; it is worth a look separately if it matters, because a printed A4 form can show 9 or 11 pt axis numbers depending on the moment.

**3. Worktree branch guard.** The pre-commit guard in my instructions allows only `agent-*` branches; this work was ordered directly in the `close-bottom-17` checkout on that branch, so I committed there as instructed.

No CSS change: the new sheets are `<Sheet variant="bottom">`, so `order-form.css`'s print block and `use-print-fit.ts` (and the test that makes them agree) are untouched.

## Calls for the founder

1. **One table a sheet, not both broken at a row.** Option C (both tables broken at a station row, "continued") also fits; I chose A because each table reads straight down Tail to Nose tip and matches the shop's two jobs. Say if you want C.
2. **Not changed, your call:** 11'0"-11'6" boards print no reading notes on their tables sheet (10'0": 1 or 3 of 3, 10'6": 1 of 3); after this fix a 12'0" board prints every note and an 11'6" none. Starting the split wherever not every note fits (from about 10'0") would give every board every note but changes 10'0" prints that are live today.
3. **Flagged, not ours:** on page 3 of a short, wide board with a cut in every section and 8 channels (5'0"-6'0" x 25", and the new 4'0" boards and 8'0" x 31") the fit rule counts the page 3.6 to 20.7 dots short, so the picture from above gives way; no row or note is involved.
4. **New, flagged:** the printed plan drawings' axis numbers flip between 9 pt and 11 pt on A4 (see Deviation 2).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Commits `71d26dd8`, `00352994`, `0f1fb1b2` exist; the eight pictures and `numbers.md` exist; the seven source files are changed as listed; `npx tsc --noEmit` clean; `npm run lint` shows only the one old warning in `lib/db/import-designs-action.test.ts`.
