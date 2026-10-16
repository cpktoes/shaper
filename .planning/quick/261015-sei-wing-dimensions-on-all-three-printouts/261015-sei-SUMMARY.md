---
phase: quick-261015-sei
plan: 01
subsystem: printouts (Overview Sheet, Full Sized Template, Paper Saver)
tags: [wings, jspdf, template, overview, strip, name-box]
status: complete
requires:
  - quick-261014-wii (wings drawn on the board and its printed curve)
  - quick-261015-hz7 (wing locks to fin trailing edges)
provides:
  - lib/geometry/wing-figures.ts (wingFigures, wingPrintName — each wing's printed figures, the WINGS card's own rule)
  - wing1 / wing2 marks, their labels and the wing label rule in lib/geometry/template.ts
  - wing lines in the name box of both full-size prints; wing lines in the Overview Sheet's spec list
affects:
  - components/template/export-preview-dialog.tsx (computes the wings once for all three printouts)
tech-stack:
  added: []
  patterns:
    - optional keys that are absent on a board without wings keep every frozen digest byte-identical
    - figure-wise wrapping (wrapItemsToWidth) so a number never parts from its unit
key-files:
  created:
    - lib/geometry/wing-figures.ts
    - lib/geometry/wing-figures.test.ts
  modified:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-overview-pdf.ts
    - components/template/build-overview-pdf.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-template-pdf.test.ts
    - components/template/build-strip-pdf.test.ts
    - components/template/export-preview-dialog.tsx
decisions:
  - "Each wing prints exactly what its WINGS card reads (D1), computed once by the export dialog and handed to all three printouts (P8)"
  - "Wing marks are optional TemplateMarks keys, present only on a winged board (P4), so a board with no wings prints byte-for-byte as before (D4)"
metrics:
  tasks: 3
  commits: 3
  completed: 2026-10-15
actuals:
  tokens: 18000
  tasks: 3
  commits: 3
---

# Phase quick-261015-sei Plan 01: Wing dimensions on all three printouts Summary

**Each wing's numbers now print on the Overview Sheet, the Full Sized Template and the Paper Saver, the same figures its card on the WINGS close-up reads, and both full-size prints draw a labelled dashed line across the board at each wing so a shaper can mark it on the foam.**

## What changed, in a shaper's words

- **Overview Sheet.** The spec list carries each wing right after Swallow Depth (Diamond Depth on a diamond tail) and before Tail Angle: a head line `Wing 1 · Fin: 3/16" @ 7 1/2"` (depth @ distance from the tail; `Wing 2: ...` for a wing placed by hand), then one indented line each for `Run`, `Radius` and — only when the wing is locked to a fin — `Offset`. In Metric the position reads in centimetres to one decimal and the rest in whole millimetres (`Wing 1 · Fin: 5 mm @ 19.1 cm`).
- **Full Sized Template and Paper Saver, the board's name box.** Under the dimensions row, one paragraph per wing: `Wing 1 · Fin: 3/16" @ 7 1/2"  ·  Run 1/4"  ·  Radius 0"  ·  Offset 0"`. A long wing line wraps only between figures, so `37` never parts from `mm`.
- **Full Sized Template and Paper Saver, the foam.** A dashed line (the same dash and weight as the Nose 12" / Tail 12" lines) runs from the stringer to the curve at each wing's station, labelled `Wing 1 — 7 1/2" from tail` (Metric `Wing 1 — 19.1 cm from tail`).
- **Labels never print on each other.** On the Full Sized Template a wing within 10 mm of another mark takes the opposite side of the pair: the nose-ward one keeps its label above its line, the tail-ward one draws its label under its line. The Midlength's wing locked exactly on the 12" line reads under it, with Tail 12" above. On the Paper Saver the strip's existing label-row rule already keeps every wing row 6 mm clear.
- **A board with no wings prints exactly as before.** Every frozen digest and every existing test passes with no existing test line edited (the four print test files and `template.test.ts` show zero removed lines against the plan's base).

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 (tracer) | 3bbb406 | `wingFigures` / `wingPrintName`, the Overview Sheet's wing lines, the export dialog computes the figures once |
| 2 | 54e28da | wing1/wing2 marks, their labels, `resolveWingLabelCollisions`, the dialog hands the winged marks to both full-size prints |
| 3 | 811c438 | the name box's wing lines, `templateNameBlockWingItems`, `wrapItemsToWidth`, the furniture matrix tests, the dialog hands `wings` through `dims` |

The tracer gate ran in end-of-phase mode (orchestrator ruling): its verify (`vitest` on the three named files, `next typegen`, `tsc`) passed before Task 2 started.

## Measured facts F1–F8: confirmed or corrected

- **F1 confirmed.** Fish with two wings built the store's way: wing 1 locked at 190.5 mm (`3/16" @ 7 1/2"`, Run `1/4"`, Radius `0"`, Offset `0"`; Metric `5 mm @ 19.1 cm`, `6 mm`, `0 mm`, `0 mm`), wing 2 by hand at 114.3 mm (`3/16" @ 4 1/2"`, Run `1/2"`, Radius `1 7/16"`; Metric `5 mm @ 11.4 cm`, `13 mm`, `37 mm`), fin edges `{ front: 190.5, rear: null }`. The Midlength's wings come out at 12" (locked) and 6 1/4" (locked to the rear fins); Shortboard and Longboard at 11" and 8".
- **F2 confirmed.** The Fish's Overview wing lines all fit in the 60 mm column with the indent intact (asserted for both systems) and the page looks right.
- **F3 confirmed.** The two no-break spaces render blank in courier and the drawn strings appear verbatim in `doc.output()`.
- **F4 confirmed.** The Metric Fish's wing 1 wraps to exactly `Wing 1 · Fin: 5 mm @ 19.1 cm  ·  Run 6 mm` / `Radius 0 mm  ·  Offset 0 mm` (pinned in a test); the box grows by 3 lines (Imperial) / 4 lines (Metric), 4.2 mm each.
- **F5 confirmed, with one precise correction.** Full Sized Template page 1: no overlaps, everything inside the alignment box and the name box clears the curve by at least 4 mm on every preset, both papers, both systems, real and worst-case figures. Paper Saver: with the two wings a real board gets, the Shortboard's name box moves to page 2 on **A4** (page index 1) and stays on page 1 on **Letter**, in both systems. The plan said the move happens from three wing lines on A4 and four on Letter; with the Shortboard's real two wings (checked in a scratch script, both systems) it shows on A4 only. The Fish, Midlength and Longboard keep their name box on page 1 on both papers in both systems.
- **F6 confirmed.** The Fish on Letter puts both wings on Full Sized Template page 13 (index 12), on A4 on pages 11 and 13 (indices 10 and 12); the Paper Saver's wing rows land on page 9 (index 8) on Letter. The Midlength's wing 1 sits exactly on Tail 12" on template page 15 (index 14) on Letter. Both sweeps pass (tiled: every preset x both papers x wing 1 every 1/16" x wing 2 absent/1/2"/1"/3" behind; strip: same positions every 1/8").
- **F7 confirmed.** `markLabels` returns `Record<StationMarkName, string> & Partial<Record<WingMarkName, string>>`; `tsc` is clean and the 07-01 `toEqual` test passes unedited.
- **F8 confirmed.** The helper lives in `lib/geometry/wing-figures.ts`; no import cycle.

## Planner's choices (P1–P8) for the founder to confirm from the pictures

- **P1 Words.** Title Case on paper: `Wing 1 · Fin`, `Wing 2`, `Run`, `Radius`, `Offset` (the card's caps are the card's dress). The line on the foam is `Wing 1 — 7 1/2" from tail` with no `· Fin`.
- **P2 Overview layout.** A head line then one indented row per card row (`Run`, `Radius`, `Offset` for a locked wing) — seven lines for the Fish's two wings.
- **P3 Name box layout.** One paragraph per wing, figures joined by the dims row's own `  ·  `, wrapped only between figures. Each value keeps its own unit (a wing line mixes a centimetre position with millimetre marks in Metric). Look at picture 6 for this.
- **P4 Marks.** Wing lines are optional `wing1`/`wing2` marks in the station dash (only the Wide point has the dotted one).
- **P5 Tiled-template label rule.** When a wing sits within 10 mm of another mark, the tail-ward label is drawn one threshold under its own line. Accepted residual from the plan: 24 cases in the sweep (wing 1 just nose-ward of Tail 12" and wing 2 just tail-ward of it) where a wing's line crosses Tail 12"'s moved label; the labels still never touch. Look at picture 7.
- **P6 Paper Saver labels.** The strip's existing label-row rule places wing rows; no new rule.
- **P7 The WINGS card is not touched.** No screen changes. A test pins `wingFigures` against the card's own formula calls; making the card read `wingFigures` too is a possible follow-up.
- **P8 One computation.** The export dialog works out the placed wings, their figures and the winged marks once and hands the same objects to all three printouts.

## Pictures (look at these before anything is pushed)

All in `/private/tmp/claude-501/-Users-kontoes-Code-shaper/a943832e-bb83-4a90-a834-e556695848ff/scratchpad/sei-pictures/` (the PDFs they come from sit beside them). I looked at each one: nothing overlaps, every label sits clear of its line and of other labels.

1. `sei-1-overview-fish-imperial-letter.png` — the winged Fish's Overview Sheet: both wings' lines between Swallow Depth and Tail Angle, the Run / Radius / Offset rows indented.
2. `sei-2-template-p01-fish-imperial-letter.png` — Full Sized Template page 1: the name box with the dims row and, under it, one paragraph per wing.
3. `sei-3-template-p13-fish-imperial-letter.png` — Full Sized Template page 13: the two dashed wing lines, stringer to curve, labelled `Wing 1 — 7 1/2" from tail` and `Wing 2 — 4 1/2" from tail`, ending at the step in the curve.
4. `sei-4-paper-saver-p01-fish-imperial-letter.png` — Paper Saver page 1: the same name box with the wing lines.
5. `sei-5-paper-saver-p09-fish-imperial-letter.png` — Paper Saver page 9: both wing lines and labels between the two registration rows.
6. `sei-6-template-p01-fish-metric-letter.png` — Metric: the name box in cm and mm (`Wing 1 · Fin: 5 mm @ 19.1 cm  ·  Run 6 mm` / `Radius 0 mm  ·  Offset 0 mm`, then wing 2 over two lines).
7. `sei-7-template-tail12-midlength-imperial-letter.png` — the Midlength's wing 1 locked exactly on the Tail 12" line (page 15): `Tail 12" — 14 1/2"` above the line, `Wing 1 — 12" from tail` under it.

Extra PDFs in the same folder (not rendered): Fish A4 and the Midlength's Overview, Full Sized Template and Paper Saver, plus `report.json` with the wing stations and the pages that carry them.

One thing I noticed that is not mine: on a Metric Full Sized Template page 1 the scale square's caption (`50.8 mm x 50.8 mm — measure before taping`) runs a little past the right border of the page's box. It is the existing caption, unchanged by this task, so I left it.

## Human verification deferred to the founder's look

- The seven pictures above, especially P3 (the name box's two-line wing 1 paragraph) and P5 (the label under the line on the Midlength).
- Confirm the wording and the Title Case (P1), the indented Overview rows (P2), and that the Shortboard's Paper Saver name box moving to page 2 on A4 when it carries two wings is acceptable (F5).
- A real print of the Paper Saver on A4 for the Shortboard, to see the box on its second page, if the founder wants it checked on paper.

## Deviations from Plan

None to the plan's behaviour. Two environment notes:

- **[Rule 3 - Blocking] A cloned `node_modules` carried a self-link into the main checkout.** `cp -Rc` copied `node_modules/node_modules`, a symlink to the main checkout's `node_modules`, which made six `components/design/slider-row.test.ts` tests fail with a duplicate React copy. I removed that one link in the worktree's own clone (`unlink node_modules/node_modules`); nothing in the main checkout was touched. The suite is green with it gone. Nothing is committed for this (the folder is ignored).
- **Commit trailer.** The plan text names `Claude Opus 5.5`; every commit uses the trailer for the model actually running this task, `Claude Sonnet 5.5`, as the orchestrator asked.

No stubs, no threat flags: the task adds no endpoint, no auth path, no file access and no schema change.

## Gates

- `npx vitest run`: 141 files, 5103 tests passed, 2 skipped, 0 failed.
- `npx next typegen && npx tsc --noEmit`: clean (exit 0).
- `npm run lint` and `npx eslint` on every touched file: clean (exit 0).
- Frozen pins: `git diff` of `lib/geometry/template.test.ts` and the three template test files against the plan's base shows additions only (zero removed lines).
- `npm run build` was not run (a worktree cannot resolve `next`; the orchestrator runs it on main after the merge).

## Self-Check: PASSED

- `lib/geometry/wing-figures.ts` and `lib/geometry/wing-figures.test.ts` exist; the eight modified files are in the three commits.
- Commits 3bbb406, 54e28da and 811c438 exist on the worktree branch.
- All seven picture files exist in the scratchpad folder above.
