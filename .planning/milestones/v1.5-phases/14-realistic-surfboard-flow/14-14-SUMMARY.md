---
phase: 14-realistic-surfboard-flow
plan: 14
subsystem: ROCKER sidebar + design store
status: complete
tags: [thinning-starts, rocker, undo, R6]
requires:
  - 14-09 (BoardBlank.noseThinningStart / tailThinningStart, the parser that drops a non-number)
  - 14-10 (thinningStartsOf in lib/geometry/blank-fit.ts)
  - 14-11 (the word and slider helpers in lib/geometry/blank-reasons.ts, SliderRow.hintAction)
  - 14-12 (BlankSideView.tips.{nose,tail})
provides:
  - DesignContextValue.setThinningStart(end, start), .setThinningStartAutomatic(end)
  - RockerControlsProps.onThinningStart, .onThinningStartAutomatic
  - local ThinningStartRow and AutomaticButton in rocker-controls.tsx; FineTuneRow takes reachesStation
affects:
  - 14-15 (viewer + DATASHEET read the same tips), 14-18 (rehearsal walk)
tech-stack:
  added: []
  patterns:
    - going back to Automatic deletes the stored key from a fresh copy of the blank, so the board equals one that never had a start
    - one coalescing undo key per tip (`blank:thinningStart:nose` / `:tail`)
key-files:
  created: []
  modified:
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-editor.tsx
    - e2e/rocker-cut.spec.ts
    - e2e/touch-sizing.spec.ts
decisions:
  - "Automatic removes the stored start with `delete` on a fresh copy of the blank (the design-snapshot.ts precedent), not an unused destructured variable; never assigns undefined"
  - "The inert Automatic button's second press is proven with dispatchEvent('click'), which fires its handler directly past pointer-events-none"
metrics:
  duration: ~2h wall clock (includes a hung test run and an API outage), ~45 min of work
  completed: 2026-10-02
  tasks: 3
  files: 6
actuals:
  tokens: 12000
  tasks: 3
  commits: 4
---

# Phase 14 Plan 14: The Thinning Starts controls on ROCKER Summary

With a blank picked, THICKNESS on ROCKER now ends with two new sliders after Tip Style: **Nose Thinning
Starts** and **Tail Thinning Starts**. Each slider runs from 6" at the tip (left) to the board's centre
(right). The label shows the distance in use. Under the slider, the left side says whether the start was
picked automatically or set by hand, and an **Automatic** button on the right puts it back. Dragging a
slider sets that tip by hand and counts as one undo step. Pressing Automatic is its own undo step.
Switching blanks keeps a start set by hand. ↺ Reset Fine-Tune leaves the starts alone. A start set too
close to its tip gets one sentence in warning ink under its slider, saying where the board is thinnest
and that Automatic would clear it. THICKNESS's opening line now reads "each tip is thinned from its
Thinning Starts point". A 12" row reads "From the tip taper" when that tip starts further in.

## What a shaper will see

- A new board on its first blank: both rows read `Picked automatically`. Both Automatic buttons are
  dimmed in place, and pressing one does nothing.
- On the fixture board (a 10'0" board on the Arctic Foam 10'9" LB, slid to the tail end) the tail row
  reads `Automatic: 12" is too short`, with a distance further in than 12". The Tail @ 12" row reads
  `From the tip taper …`. Dragging the tail back to 12" by hand brings up `The board is thinnest …`,
  which names Automatic's distance. One press of Automatic clears that line.
- In Metric a 12" start reads `30.5 cm`, exactly like the `Nose @ 30.5 cm` station. Switching to
  Imperial changes nothing stored.
- With no blank, neither row is on the page. They are hidden, not just greyed out.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Store moves, side profile fed the starts, the two rows and the Automatic button (tracer) | 76a6d01 |
| 2 | New THICKNESS opening line, the 12" row's "From the tip taper", comments rewritten, old intro assertion replaced (ruling 9) | 8855ee7 |
| 3 | Browser tests: six new ROCKER tests and one new phone touch test | b51a769 |

Tracer gate: Task 1's verify (vitest store + slider-row, `tsc --noEmit`, lint) passed after its commit.
Following ruling 11, it did not stop for a human check.

## Verification

- `npx vitest run components/design/design-store.test.ts components/design/slider-row.test.ts`: 47 passed.
  The ROCKER raw-slider allowlist is still 1.
- `npx tsc --noEmit` (after `npx next typegen`) exits 0. `npm run lint` exits 0, and the hooks rule
  accepts both move names.
- Browser runs, `IS_WEBPACK_TEST=1 PW_PORT=3142`, final pass with everything committed:
  - `e2e/rocker-cut.spec.ts`: desktop 15/15, iphone + android 30/30.
  - `e2e/touch-sizing.spec.ts`: 39 passed and 24 skipped on all three projects. The skips are by design:
    each describe skips the other pointer's projects.
  - `e2e/rocker-blanks.spec.ts`: 30/30 on all three projects, including the `From blank` test, which is
    unchanged.
- No snapshot file changed (`git diff --name-only 26db272 -- 'e2e/*-snapshots'` is empty). `package.json`,
  `package-lock.json`, `phase11-foil.test.ts` and `design-snapshot.test.ts` are untouched.
- Acceptance greps: `setThinningStartAutomatic` appears 5 times in the store and `thinningStartsOf(` 2 times.
  `onThinningStartAutomatic` appears 1 time in the editor. `Thinning Starts` appears 2 times in the controls.
  `thicknessIntroWithBlank(system)` and `fineTuneSourceHint(` each appear 1 time. "the tips are thinned in
  the last" appears 0 times in the controls and 0 in the spec. `aria-live` appears 0 times, unchanged.
  In the spec, `thicknessIntroWithBlank` appears 2 times and `Arctic Foam` 3 times.

## Deviations from Plan

1. **`grep -c "<Slider"` count went from 8 to 9 (acceptance criterion read literally).** That grep also
   matches `<SliderRow`, and the new `ThinningStartRow` adds one `<SliderRow`. The real raw `<Slider>`
   count did not change: it is still the one Center Thickness slider, and `slider-row.test.ts`'s ROCKER
   allowlist of 1 passes. This matches the plan's intent ("the rows use SliderRow").
2. **`design-store.test.ts`'s existing lists gained the two moves.** `MAY_ASSIGN_BLANK`, "the blank moves
   each write the blank" and `STARTS_THE_BOARD` now name them. Without that, the existing R6 and D-19 tests
   would flag them. The file is in scope.
3. **Comment touch-up beyond the plan's line list.** In `rocker-controls.tsx`, Tip Style's inline comment
   "Last in THICKNESS" was no longer true, so it was rewritten.
4. **Test-run housekeeping.** The first full three-spec run hung for over 1h40m during an API outage. I
   stopped only my own processes (that run and its 3142 dev server) and re-ran each spec in the
   foreground, under 10 minutes each. All passed. No background job is left running.

## Known Stubs

None.

## Threat Flags

None. T-14-27: only `thinningStartSlider(...).toMm` values reach `setThinningStart`, and the profile
clamps on read. T-14-28: there is one undo key per tip, `noteEdit(null)` for Automatic, and the key is
deleted, not stored empty. No new endpoint, network path or schema change.

## Self-Check: PASSED

- FOUND: all six modified files.
- FOUND commits: 76a6d01, 8855ee7, b51a769.
