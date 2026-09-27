---
phase: quick-260927-0fq
plan: 01
status: complete
subsystem: summary-order-form
tags: [order-form, blanks, placement, print, e2e]
requires: [quick-260926-wkh]
provides: "The order form's Blank line names the blank and where the board's centre sits on it, in ROCKER's own words"
affects: [components/summary/order-form.tsx, e2e/summary-blank.spec.ts]
tech-stack:
  added: []
  patterns: ["Summary reuses ROCKER's formatPlacement on the side profile's clamped placement"]
key-files:
  created: []
  modified:
    - components/summary/order-form.tsx
    - e2e/summary-blank.spec.ts
decisions:
  - "The Blank line reads the placement from the side profile (sideProfile.blank.placement, pulled inside the blank on read), never the raw stored number, so it always matches ROCKER's Placement label."
metrics:
  completed: 2026-09-27
  tasks: 2
  files: 2
actuals:
  tokens: 9500
  tasks: 2
  commits: 3
---

# Quick 260927-0fq: The order form's Blank line also says where the board sits on the blank Summary

The printed order form's Blank line now reads the blank's vendor and name followed by where the board's centre sits on it (`— centered`, or `— center 1/16" toward nose`), worded by the same helper ROCKER's Placement label uses.

## Note for the founder

On page 2 of the printed order form, in the shaded Shaper Use Only box, the **Blank:** line now tells the shop where to lay the board on the blank, as well as which blank to use:

- Left where ROCKER puts it when you pick a blank: `US Blanks 6'2"A — centered`
- Slid along the blank on ROCKER: `US Blanks 6'2"A — center 1/16" toward nose` in Imperial, or `US Blanks 6'2"A — center 1 mm toward nose` in Metric. Sixteenths of an inch in Imperial and whole millimetres in Metric, the same as every other mark.

The words after "center" are always exactly what ROCKER's `Placement — ...` label says for that board, because both screens use the same wording and read the same placement. That still holds if you lengthen the board after sliding it: ROCKER pulls the placement back inside the blank, and so does the sheet. A board with no blank still gets an empty ruled line for the shop to write on.

**Will it fit?** Yes, every time. The brief estimated about 328 px of room in print. Measured, there is more than that:

| | Room for the value | Widest name | Widest placement note | Name + note |
|---|---|---|---|---|
| On screen | 737 px | 297 px (`Marko Foam 10'0" MK-SUP-STD`) | 295.0 px (`— center 44 13/16" toward nose`) | about 592 px, fits |
| In print | 603 px | 248 px | 245.7 px | about 494 px, fits |

The longest note any board can carry comes from the shortest board the app allows (60") on the longest blank in the catalogue (the 12'6"). A new browser test tries all 162 blank names beside that note, on screen and on paper. None of them gets cut off with a "…". It picked the widest note by measuring 3,747 possible wordings in both systems.

## What changed

- **Task 1** (`b60d165`, feat): `components/summary/order-form.tsx` builds the Blank label from `blank.copy` (vendor, name) plus `formatPlacement(sideProfile.blank.placement, system)`, as `— centered` or `— center {words}`. It needs both the blank and the side view, the same way ROCKER does. The three comments were rewritten to match (the label, the Shaper Use Only fields, and the widths). The spec gained `sliderUnder`, `pickFirstFittingBlank` and `goToSummary` helpers. The picked-blank test now checks `Placement — centered` on ROCKER and `{name} — centered` on the Summary. A new test runs twice (Imperial, then Metric): it nudges ROCKER's Placement slider one step toward the nose and checks that ROCKER's own words reach the Summary unchanged. The Metric run makes sure the words say ` mm ` and contain no `"`.
- **Task 2** (`fb0dc6a`, test): the desktop-only width test now reads each blank's `length_in` from the CSVs too. It builds every placement note from `placementRange`, `placementSlider` and `formatPlacement`, using the longest blank and `BOARD_LENGTH_RANGE_IN.min`. It measures each note's real drawn width with a DOM Range and appends the widest to all 162 names. It asserts no name is cut off under screen or print media. A non-vacuity check (all names joined) must be reported as cut off.

## Verification

- **RED before the change (Task 1):** 9 failed, 4 passed, 2 skipped. On iphone, android and desktop, the three new or changed tests got the bare name `US Blanks 6'2"A` where they expected `US Blanks 6'2"A — centered`, `... — center 1/16" toward nose` and `... — center 1 mm toward nose`.
- **GREEN after it:** `e2e/summary-blank.spec.ts` 13 passed, 2 skipped (the width test is desktop-only).
- `npx next typegen`, `npx tsc --noEmit` clean. `npx vitest run`: 74 files, 2985 passed, 2 skipped. `npm run lint`: 0 errors. The 11 warnings are all pre-existing, in files outside this task.
- Every `e2e/summary-*` spec (6 specs, iphone, android, desktop): 49 passed, 26 skipped, 0 failed.
- Width test output: `widest note on screen: " — center 44 13/16" toward nose" (295.0px); in print: " — center 44 13/16" toward nose" (245.7px); 3747 notes, 162 names`.
- `e2e/desktop-baseline.spec.ts --project=desktop`: 5 passed, no `--update-snapshots`. The five reference pictures are byte-identical:

| Picture | Before (pinned) | After |
|---|---|---|
| fins | `a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62` | `a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62` |
| outline | `ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0` | `ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0` |
| rails | `6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373` | `6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373` |
| rocker | `0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9` | `0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9` |
| volume | `b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34` | `b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34` |

- Only `components/summary/order-form.tsx` and `e2e/summary-blank.spec.ts` changed across the two task commits. Nothing under `lib/`, `components/design/`, `components/rocker/`, `components/settings-menu.tsx`, `order-form-primitives.tsx` or `e2e/rocker-blanks.spec.ts` changed.

## Commits

| Task | Commit | Subject |
|---|---|---|
| 1 | b60d165 | feat: the order form's Blank line also says where the board sits on the blank |
| 2 | fb0dc6a | test: every blank's full name still prints with the longest placement note |

## Deviations

None. The plan was executed as written. Two small notes:
- Three helpers were added to the spec (`pickFirstFittingBlank`, `goToSummary` and `readCatalogue`, which replaces `catalogueBlankNames`) so the picked-blank tests don't repeat themselves. The plan allowed either widening the reader or adding a sibling helper.
- The span reset after the width check now spells the non-breaking space (the one the field renders when empty) as a Unicode escape instead of pasting the invisible character itself.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: components/summary/order-form.tsx, e2e/summary-blank.spec.ts
- FOUND: b60d165, fb0dc6a
