---
phase: 17-bottom-contours
plan: 23
subsystem: bottom-drawing, bottom-data, order-form
status: complete
tags: [bottom, gauges, data, order-form, print-fit, gap-closure, G-17-6]
requires:
  - 17-21 (DATA's Rail lift reads sectionsFoamOff at the rail; the founder's look at 17-21, 2026-11-11)
provides:
  - sectionGauges' rail lift is sectionsFoamOff at board.railAt, held at the slab's thickness (DATA's own figure)
  - BOTTOM_COPY.depthsNote carries the founder's sentence
  - bottomSheetLayout's tablesTight, SheetSizes.tableRowTight (measured), BOTTOM_SHEET_SPARE
  - BottomTablesSheet draws its rows without padding when tablesTight, marked data-bottom-rows="tight"
affects:
  - BOTTOM's VIEWER section and the printed BOTTOM CONTOURS page's sections (rail-lift reading)
  - BOTTOM's DATA note and the printed tables sheet's first note
  - the 9'+ Longboard's printed tables sheet (every note, rows tight where needed)
tech-stack:
  added: []
  patterns:
    - "A sheet's tight row height is measured in a real browser with the padding taken off by an injected stylesheet, never worked out"
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-23-bottom-gauge.png
    - .planning/phases/17-bottom-contours/pictures/17-23-data-note.png
    - .planning/phases/17-bottom-contours/pictures/17-23-pictures-source.tar.gz
  modified:
    - lib/geometry/bottom-draw.ts
    - lib/geometry/bottom-draw.test.ts
    - e2e/bottom-viewer.spec.ts
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-copy.test.ts
    - components/summary/bottom-sheet-fit.ts
    - components/summary/bottom-sheet-fit.test.ts
    - components/summary/bottom-contours-sheet.tsx
    - e2e/summary-bottom-page.spec.ts
decisions:
  - "The stringer-left reading keeps reading the drawn gap at the rail for its room and reach, so it stays put where the rail-lift figure is gone"
  - "Tight rows are measured: 16.6 dots on the computer's sheet, 15.35 on the phone's, each exactly 2 dots under its regular row"
  - "BOTTOM_SHEET_SPARE is exported so the tests read the fit rule's own margin instead of typing it"
metrics:
  duration: about 1 hour 40 minutes (an outage between)
  completed: 2026-11-11
actuals:
  tokens: 21000
  tasks: 2
  commits: 4
---

# Phase 17 Plan 23: The section's rail lift matches DATA, DATA's note in the founder's words, and every note on the Longboard's tables sheet. Summary

**BOTTOM's cross-section now reads its rail lift the way DATA does: the vee's or belly's lift alone. DATA's note says what Rail lift counts in the founder's own sentence. The 9'+ Longboard's printed tables sheet now prints every note. Where it needs the room its rows sit two dots closer together, with the type the same size. No litres figure and no DATA figure moved, and no board prints a page more or fewer.**

## What changed on the screen and on paper

### BOTTOM's section: "Match DATA"

- **Before:** at the very tail of a board with channels, the outer channel runs out through the rail. The section's `rail lift` reading counted that channel. The Fish with a flat tail and eight channels read `5/16" rail lift` at the tail while DATA read a dash.
- **After:** the reading is the vee's or belly's lift at the rail, DATA's Rail lift figure.
  - A flat tail or a concave shows no rail-lift reading at all.
  - A vee reads its own lift. On the Fish with a Rolled Vee and eight channels, the tail reads 1/4" where it read 9/16".
  - Where a channel has run out through the rail, the reading's tick now runs up to where the vee took the rail. That point is in the channel's air.
- **Unchanged:** every other reading on the section, on every board and station checked: the gap at the stringer, the channel and trough floors, and the stringer left. The stringer-left reading keeps its place even where the rail-lift figure has gone.
- **On paper:** the printed BOTTOM CONTOURS page draws its sections where each cut is deepest, at the fins. The channels are still inside the rail there, so the printed sections are the same to the dot. They follow the same rule wherever a channel does reach the rail.
- **Only the tail row changes**, and only on boards with channels. 241 boards were checked at every DATA station (3,733 sections):
  - 72 rail-lift readings went away (flat tails, bellies and concaves with channels)
  - 73 read lower (vees with channels)
  - none appeared
  - none moved off the tail row

The tail row's rail-lift reading on the screen (the same for Hard Edge and soft tails):

| Board | Tail | 4 channels | 6 channels | 8 channels |
|---|---|---|---|---|
| Shortboard | flat | 1/4" → none | 1/16" → none | 3/16" → none |
| Shortboard | Rolled Vee | 1/2" → 1/4" | 5/16" → 1/4" | 7/16" → 1/4" |
| Fish | flat | 5/16" → none | 1/4" → none | 5/16" → none |
| Fish | Rolled Vee | 9/16" → 1/4" | 1/2" → 1/4" | 9/16" → 1/4" |
| Longboard | flat | 1/4" → none | 1/8" → none | 1/8" → none |
| Longboard | Rolled Vee | 1/2" → 1/4" | 3/8" → 1/4" | 3/8" → 1/4" |
| Mid-length | flat or Rolled Vee | unchanged | unchanged | unchanged |

The other cuts with channels on the Shortboard, Fish and Longboard:
- Panel Vee and Spiral Vee now read 3/16". They read 1/4" to 1/2" before.
- Double Concave Exit, Extending Single Concave and Continuous Belly / Rolled Mid now show no rail lift. They read 1/16" to 5/16" before.
- The Fish with a Rolled Vee, eight channels at Off Stringer 3": 5/16" → 1/4".

### DATA's note: "Use the sentence"

- The note under DATA's depths table now reads: "Deepest cut is the largest gap under a straightedge laid rail to rail at that station. **Rail lift is the vee's or belly's lift at the rail; a channel is cut after the rail is shaped and never counts.** Stringer left is the planed thickness less the cut at the stringer."
- Only the middle sentence changed, and it is the founder's word for word.
- The printed tables sheet carries the same note. No GUIDE card or GUIDE words page had the old sentence, so no other words changed.

### The Longboard's printed tables sheet: "Make it fit"

- **Before:** with channels, the 9'+ Longboard's tables sheet printed only the first of its three notes. That was already true before the new sentence. Without channels it printed all three.
- **With the new, longer sentence:** no Longboard setup had room for all three at the old row spacing.
- **After:** every note prints, on every setup, in both systems. The rows lose their one dot of padding above and below, so each row is two dots tighter. The type is the same size and every row is there.
- **Only that sheet changes, and only when its notes need the room.** The Longboard happens to need it on every setup where its tables take their own sheet. Every Shortboard, Fish and Mid-length sheet is exactly as it was apart from the note's words. No board prints a page more or fewer.

Notes printed under the Longboard's tables, before → now. Each of the ten Longboards (five tails × Hard Edge and soft) gave the same counts, in both systems:

| Setups (of the 96) where the tables take their own sheet | Before | Now |
|---|---|---|
| 54 with channels | 1 note | 3 notes, rows tight |
| 35 without channels | 3 notes | 3 notes in the new words, rows tight |

That is 1,780 layouts in all (10 boards × 89 setups × 2 systems). The other 7 setups keep the tables on the page itself, which never tightens and never had notes.

The tight row height was measured in a real browser on the worst Longboard (Teardrop Nose Concave, Early Double Concave, Spiral Vee, 8 channels):
- computer's printed sheet: 18.604 → 16.604 dots
- phone sheet the rule counts (733 wide): 17.354 → 15.354 dots
- every other phone width: exactly 2 dots less as well

The real-browser fit sweep passed for all four boards in both systems:
- every sheet, at every phone width and on both papers, has nothing clipped
- the worst Longboard's tables sheet has about 61 dots clear above the page mark on a computer's print

## Founder's look: Pending

- `.planning/phases/17-bottom-contours/pictures/17-23-bottom-gauge.png` shows BOTTOM's VIEWER section at DATA's tail row, 1280 wide, Imperial, before (left) and after (right).
  - **Fish, flat tail, eight channels:** the `5/16" rail lift` reading is gone, and the `5/16" in the channel` reading is where it was.
  - **Fish, Rolled Vee, eight channels:** the rail lift reads the vee's own `1/4"` instead of `9/16"`.
  - **The printed page's two sections for that board** are identical before and after.
- `.planning/phases/17-bottom-contours/pictures/17-23-data-note.png` shows two things.
  - **DATA on the Fish with a flat tail and eight channels:** the note is ringed in red, and its middle sentence is his.
  - **The Longboard's printed tables sheet,** with Teardrop Nose Concave, Early Double Concave and Spiral Vee, with 8 channels and with none. With channels it went from one note to all three. Without channels it keeps three in the new words. Both sheets' rows sit a little closer, and every row and figure is the same.

Points for him to confirm:
1. The section's rail lift now matches DATA at the tail, and a flat tail with channels shows none.
2. The note reads his sentence as he wrote it.
3. The tighter rows on the Longboard's tables sheet still read easily in the shop.

### Decided for you to confirm or overrule

- **Tighter rows on the Longboard's tables sheet.** To make room, the rows sit two dots closer together (their padding removed). This happens on that sheet only, and only when the notes need it. The type was not made smaller: that would have needed the notes about a fifth smaller. With the new sentence the Longboard needs the room on every setup where its tables take their own sheet, including the ones without channels.
- **The Longboard with channels now prints all three notes.** Before the new sentence it printed only the first of its three.
- **The stringer-left reading stays put.** Where the rail-lift figure is gone, it keeps the place it had rather than moving in toward the rail, so every other reading stays exactly as it was.

Also noted, not changed: the section's reading still draws nothing under 1/16" and rounds to the nearest 1/16". DATA's cell reads `<1/16"` for a small lift. The section's rule is D-13's; the cell's is 17-15's, from his ruling of 2026-11-10.

## Deviations from Plan

**1. [Rule 1 - Bug] The measuring stylesheet missed the station cells**
- **Found during:** Task 2, measuring the tight row
- **Issue:** each row's station cell is a header cell (`th`), not a data cell. The first measurement took the padding off the data cells only, so the row did not shrink.
- **Fix:** the measuring stylesheet now takes the padding off both kinds of cell. The component tightens both too (`STATION_CELL_TIGHT`, `CELL_TIGHT`).
- **Files:** scratch only, and `components/summary/bottom-contours-sheet.tsx` as planned.

**2. The tests read the fit rule's own margin.** `BOTTOM_SHEET_SPARE` is exported from `bottom-sheet-fit.ts` so the new test's "tight only where today's rows have no room" check uses the rule's own margin. The plan did not name this export, and the file was already in the plan.

**3. [Rule 3 - Blocking] The new per-board tests have a timeout of their own**
- **Found during:** the full unit run before Task 2's GREEN commit
- **Issue:** a loaded machine timed the new per-board tests out at the 5-second default. The Longboard and other-board sheet tests take about half a second each alone, and several seconds under load. Left as they were, they would flake at the go-live gate.
- **Fix:** each of the three per-board `it.each` blocks now has a 60-second timeout: two in bottom-sheet-fit.test.ts and one in bottom-draw.test.ts. What they assert did not change.
- **Commit:** 53771e19

**4. The tracer's feedback gate ran without stopping**, as for 17-21. The orchestrator asked for the whole plan with the founder's look collected afterwards. The tracer's checks were re-run end to end before Task 2: the unit suites and BOTTOM's and the paper's browser specs (23 passed, 1 skipped).

## Verification

| Check | Result |
|---|---|
| 17-21 on the base | 17-21-SUMMARY.md present; `railLift: sectionsFoamOff(` in bottom.ts |
| Captures (241 boards' gauges, DATA rows and litres; 7,680 sheet layouts) | Task 1: `data.json`, `litres.json` and `sheets.json` byte-identical. Every gauge but the rail lift identical. Each rail lift is drawn exactly where DATA's figure, held at the thickness, reads, and carries that value (0 exceptions). Task 2: `gauges.json` as Task 1 left it, `data.json` and `litres.json` byte-identical. In all 7,680 layouts only the note's words, `tablesTight` and the Longboard's notes changed. No page spare, sheet count or tables-on-own-sheet decision moved, and nothing is tight off the Longboard |
| `npx tsc --noEmit`, `npm run lint` | pass. Lint's one known warning is in lib/db/import-designs-action.test.ts:42, untouched |
| `npm test` before Task 1's commit | 12,498 passed, 1 failed: bottom.test.ts CR-01, a timeout under load. bottom.test.ts alone: 1,202 passed |
| `npm test` before Task 2's GREEN commit | First run: cut off by a network outage. Re-run: 12,514 passed, 27 failed in 12 files, every one a timeout under load (load average up to 68, with another worktree's suite running beside it). Each of the 12 re-run alone passes: bottom-sheet-fit 306, bottom-draw 329, blank-fit 86, finished-rail 28, board-surface-render 12, board-surface 1,254, phase16-surface-litres-pin 308, round-tip 29, shaping-bay 152, design-snapshot 112, surface-report 210. bottom.test.ts alone: 1,201 passed and CR-01 timed out at 5.3 s against a 5 s limit at load 10; CR-01 by name alone passes |
| Task 1 browser, desktop: bottom-viewer, bottom-screen, bottom-metric, summary-bottom-page | 23 passed, 1 skipped |
| Task 2 unit: components/bottom, components/summary | 422 passed |
| Task 2 unit: bottom.test.ts and the three litres pins | litres pins pass. CR-01 timed out under a browser run's load and passes alone |
| Task 2 browser, desktop: bottom-viewer, bottom-metric, summary-bottom-page | 21 passed, 1 skipped |
| Task 2 fit sweep: summary-planing "BOTTOM CONTOURS page fits" | 8 passed |
| Desktop baselines | none touched; `--update-snapshots` never run |
| Files changed from the base | only the plan's `files_modified` |

## TDD Gate Compliance

- RED, commit 9c0653e7: 41 tests failed, and each for the right reason. The note still had the old sentence, and `tablesTight` did not exist yet. tsc and lint passed on that commit.
- GREEN, commit 53771e19: all pass.

## Threat Flags

None. There is no new endpoint, storage or input. T-17-34 (the gauge reads DATA's own figure) and T-17-37 (rows only tightened, never dropped; tight height measured; real-browser sweep green) are mitigated as planned. T-17-35: litres and DATA byte-identical, and neither bottom.ts nor any litres file was touched.

## Known Stubs

None.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 (tracer) | f431f3df | fix: BOTTOM's section reads the rail lift DATA reads, the vee or belly alone |
| 2 (RED) | 9c0653e7 | test: DATA's note in the founder's words, and every note on the Longboard's tables sheet |
| 2 (GREEN) | 53771e19 | fix: DATA's note in the founder's words, and the Longboard's tables sheet prints every note |
| SUMMARY | (this commit) | docs: the plan's summary |

A network outage stopped the run after the RED commit. The worktree was intact, and the work resumed from the uncommitted GREEN change. The full unit run was repeated, and the GREEN change was committed after it.

## Self-Check: PASSED

- Both pictures, the source archive and every modified file exist; the files changed from the base are exactly the plan's `files_modified`
- f431f3df, 9c0653e7 and 53771e19 are on the branch
