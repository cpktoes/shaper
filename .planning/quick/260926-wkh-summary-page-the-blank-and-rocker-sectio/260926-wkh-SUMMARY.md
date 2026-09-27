---
phase: quick-260926-wkh
plan: 01
subsystem: summary order form
status: complete
tags: [summary, order-form, blanks, print, e2e]
requires:
  - "useDesign().blank — the board's own copy of the blank picked on ROCKER (Phase 11 D-01)"
  - "lib/blanks/csv.ts parseCsv — the catalogue reader, used by the new browser test"
provides:
  - "The Shaper Use Only box's Blank field: prints the picked blank as vendor then name, or a ruled line"
  - "e2e/summary-blank.spec.ts — the first browser proof of the Shaper Use Only box"
affects:
  - components/summary/order-form.tsx
tech-stack:
  added: []
  patterns:
    - "Blank named with ROCKER's own inline template, vendor + ' ' + name, from the board's copy"
key-files:
  created:
    - e2e/summary-blank.spec.ts
  modified:
    - components/summary/order-form.tsx
decisions:
  - "Blank takes a full-width line of its own above Board # and Price (the founder's choice, 2026-09-27), not a wider share of the old row"
metrics:
  duration: "about 20 minutes"
  completed: 2026-09-26
actuals:
  tokens: 5500
  tasks: 2
  commits: 3
---

# Quick 260926-wkh: The order form's Blank field names the picked blank — Summary

The Summary's Shaper Use Only box now has a field called **Blank** where the old two-part
blank-and-rocker field was. It prints the blank picked on ROCKER as vendor then name
(`US Blanks 6'2"A`), or an empty ruled line when the board has no blank. It sits on a full-width
line of its own, so every blank in the catalogues prints whole.

## Note for the founder

- **New name.** On page 2 of the order form (the Shaper Reference sheet), the shaded Shaper Use
  Only box's field is now just **Blank**. The old "Blank & Rocker" label is gone.
- **What prints.** If you picked a blank on ROCKER, the field prints it for you, maker then name,
  the same words ROCKER's list uses (for example `US Blanks 6'2"A`). It's taken from the board's own
  copy of that blank, so it always names the blank these numbers were cut from. If the board has no
  blank (a fresh board, or you removed it on ROCKER), the field is an empty line for the shop to
  write on, as before.
- **Why it moved.** At the old width, 19 of the catalogue's longer names would have printed cut
  off with a "…". Most were Marko Foam blanks (`Marko Foam 10'0" MK-SUP-STD`, `Marko Foam 6'0"
  M-Regular`) and the SUP blanks (`US Blanks 10'4"A SUP EPS`).
- **The new layout.** Blank now has a line of its own across the whole box, directly above Board #
  and Price. Board # and Price share the row under it, half each, so both have a **longer** line to
  write on than before. Nothing else on either printed page moved.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | The order form's Blank field prints the blank picked on ROCKER | 8a27781 | components/summary/order-form.tsx, e2e/summary-blank.spec.ts |
| 2 | The Blank field has a line of its own, so every blank's full name prints | 15f56c3 | components/summary/order-form.tsx, e2e/summary-blank.spec.ts |

## What was proven

- **Task 1:** `e2e/summary-blank.spec.ts` passed 6 of 6 (2 tests on iPhone, Android, desktop). A fresh
  board shows the ruled line. Picking the first fitting blank on ROCKER and walking to SUMMARY by the
  app's own link prints exactly the name ROCKER's row gives it.
- **Task 2 (test first):** the new desktop check tried all 162 catalogue names in the field. Before
  the layout change it **failed** and named 19 cut-off blanks on screen, the same count the plan
  measured. After the change it passes on screen and under print media.
- **Every Summary spec** (`e2e/summary-*`, all three devices): 43 passed, 26 skipped (each spec's own
  skips), 0 failed.
- **Desktop baseline:** 5 of 5 passed, no `--update-snapshots`.
- `npx tsc --noEmit` clean. `npx vitest run`: 2985 passed, 2 skipped. `npm run lint`: 0 errors. Its
  11 warnings are all in files this task did not touch (see Deferred Issues).
- `order-form-primitives.tsx`, `lib/`, `components/design/`, `components/rocker/` and
  `e2e/rocker-blanks.spec.ts` are untouched across both commits.

## Desktop baseline pictures (SHA-256)

| Picture | Before (plan, 1d2ee9b) | After (15f56c3) | Same |
|---|---|---|---|
| fins | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | yes |
| outline | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | yes |
| rails | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | yes |
| rocker | 0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9 | 0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9 | yes |
| volume | b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34 | b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34 | yes |

The same five hashes were also read at bb6fae2, before any change in this worktree.

## Deviations

None. Both tasks were done as the amended plan says. Two small notes:

- The Blank field takes no `className`. The Shaper Use Only box lays its lines out in a column, so
  the field stretches to the full width by itself, the same way Board Name does. The plan allowed
  for this ("`w-full` if the primitive needs it, otherwise none").
- Task 2 went in as one commit, with the failing test and the fix together, not as separate `test`
  then `fix` commits. The orchestrator's ruling was one commit per task. The failing run is recorded
  above: 19 names, the same as the plan's measurement.

## Deferred Issues

- `npm run lint` shows 11 existing "unused eslint-disable directive" warnings in
  `components/rails/rail-plan-side-figure.tsx`, `components/viewer/drag-spacing.test.ts`,
  `lib/geometry/outline.test.ts` and four `scripts/extract-prototype-*-golden.mjs` files. None of
  them is in this task's files, so they were left alone.

## Threat model

- T-wkh-01: the name reaches the page as React text through `OrderFormField`'s `value` prop. No
  `dangerouslySetInnerHTML`.
- T-wkh-02: Task 1's test checks the printed name word for word against ROCKER's own row. Task 2's
  test proves no catalogue name is cut off on paper.

## Self-Check: PASSED

- FOUND: components/summary/order-form.tsx (label="Blank", value={blankLabel}, above Board #)
- FOUND: e2e/summary-blank.spec.ts
- FOUND: 8a27781, 15f56c3 in `git log`
