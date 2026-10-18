---
phase: quick-261017-sru
plan: 01
subsystem: design-screens-wording
tags: [wording, metric, units, select, e2e-baselines]
status: complete
requires: []
provides:
  - forwardFinsHeading, fullSpreadRoundingAside (lib/geometry/fins.ts)
  - diamondDepthClampNote (lib/geometry/measure-display.ts)
  - paperSaverCaption, PAPER_SAVER_SUITS_WIDTH_IN (lib/geometry/template.ts)
  - removeBlankFailureMessage and four saved-blank message constants (lib/saved-blanks-preference.ts)
  - formatWholeFeet, formatWholeInches (lib/geometry/units.ts)
affects: [TEMPLATE, ROCKER, RAILS, VOLUME, FINS, print template]
key-files:
  created:
    - e2e/board-length-picker.spec.ts
  modified:
    - lib/geometry/custom-rocker-text.ts
    - lib/geometry/template.ts
    - lib/geometry/fins.ts
    - lib/geometry/measure-display.ts
    - lib/geometry/outline.ts
    - lib/geometry/units.ts
    - lib/saved-blanks-preference.ts
    - components/saved-blanks-provider.tsx
    - components/outline/outline-controls.tsx
    - components/volume/volume-controls.tsx
    - components/fins/fin-controls.tsx
    - components/fins/fin-data-panel.tsx
    - components/template/export-preview-dialog.tsx
    - components/rails/rail-callouts.ts
    - components/rails/rail-plan-side-figure.tsx
decisions:
  - "The Paper Saver figure stays 20.5\" in Imperial (a named constant, PAPER_SAVER_SUITS_WIDTH_IN); Metric shows the same width as 52.1 cm."
  - "The printed template's center mark changed to the American spelling too; the three frozen characterisation pins hash it by its old name so they still prove every other byte is unchanged."
  - "forwardSectionLabel stays empty for a Twin (the prototype's golden fixtures pin it); the Twin heading is built by forwardFinsHeading from the shared Main Twins name."
metrics:
  tasks: 3
  commits: 4
actuals:
  tokens: 60000
  tasks: 3
  commits: 4
---

# Quick 261017-sru: eight small wording faults on the design screens

Eight wording faults the founder found are fixed, in plain terms for the screen a shaper sees. No geometry number, stored value, golden fixture or layout constant moved.

## What each screen now reads

1. **Center, spelled one way.** The TEMPLATE wing Position hint reads "Center 36"", the Customize Rocker hints read "At the center" / "Nearer the center", the floor note reads "Floor — the tip would drop below the center", the ROCKER top view's spoken name says "center mark", and the printed Full Sized Template and Paper Saver mark reads "Center — 19"". The printed word has the same six letters, so nothing on the paper moves.
2. **MODEL INFO, Single Model:** "...and can be fine-tuned by the forward/aft slider...".
3. **RAILS footnotes (DATA and INSTRUCTIONS):** "how rail shapes affect surfboard performance".
4. **FINS Advanced, Twin:** the block heading reads "Forward Fins — Main Twins". Thruster and Quad still read "Forward Fins — Front Pair", 2+1 "Forward Fins — Side Bites".
5. **One mark, one name.** The example rail's callout says "Rail Mark 1" (same height as before, overlapping nothing, Flat and Domed). The nine-line key on RAILS INSTRUCTIONS and the SUMMARY print option reads Deck Mark 1, Deck Mark 3, Rail Mark 1, Rail Tuck 1. Both FINS toe sliders read "Toe-In — ...".
6. **Metric numbers that stayed in inches.** Metric now reads "Clamped to 51 mm less than Tail Block" under a diamond tail's Depth, "Great for boards ≤52.1 cm wide." on the Paper Saver card, and "(*Full spread may be >2x due to millimetre rounding)" on the FINS DATA tab. Imperial reads exactly as before, except the Paper Saver card's "Wide" is now "wide".
7. **Removing a saved blank:** a failed Remove says "Couldn't remove the blank — check your connection and try again." or, when the sign-in lapsed, "Sign in again to remove blanks from your account." Saving and updating keep their two messages word for word.
8. **Board Length boxes:** with the dropdown closed, TEMPLATE, VOLUME and FINS show 6' and 0" (what the open list shows), not a bare 6 and 0. One item list feeds both the open list and the closed box (Base UI's documented `items` prop on the Select root).

## Decisions

- The Paper Saver width stays the founder's own 20.5" in Imperial, as a named constant; the house fraction formatter would have printed 20 1/2". Metric goes through `formatDim`.
- The printed template's center mark changed with the rest. `lib/geometry/template.test.ts`'s three frozen pins (cj5, 18d, kon) keep their digest maps untouched and hash the data by the old name through one new helper, `digestByTheOldCenterName`, which first asserts the real data holds the new name and none of the old. Each pin's header carries a dated amendment sentence.

## Commits

| Commit | What |
| --- | --- |
| 2d8086da | Items 1-5 and 7: wording, Twin heading, mark names, Remove message |
| 509aeb92 | Item 6: Metric clamp note, Paper Saver width, Full Spread note |
| d13941bb | Item 8: closed Board Length boxes, plus e2e/board-length-picker.spec.ts |
| aa47483e | Re-recorded the TEMPLATE, VOLUME and FINS desktop pictures |

## Tests and gates

- New unit tests: forwardFinsHeading (all five setups, both twin templates, tied to the twin key and DATA group), fullSpreadRoundingAside, diamondDepthClampNote, paperSaverCaption, the four remove/save sentences and removeBlankFailureMessage, formatWholeFeet/formatWholeInches (including the loop tying them to `formatFeetInches` for feet 4-12 and inches 0-11). Rail callout test (j) now covers Flat and Domed. Old-wording pins in custom-rocker-text, template and rail-callouts tests updated.
- Playwright (desktop, webpack, port 3134): rocker-custom, rocker-top-view, summary-rail-key (21 passed, 7 phone-only skipped); board-length-picker (4 passed); desktop-baseline (5 passed); desktop-regression (3 passed). `lineTickCheckbox` in summary-rail-key now matches the whole label so "Deck Mark 3" cannot also catch "Deck Mark 3 Center (full board)".
- `npx tsc --noEmit` and `npm run lint` clean.
- Full `npx vitest run`: everything passes except two environment effects described below.

## Deviations from Plan

**1. [Rule 3 - Blocking] `components/rails/rail-section-plot.tsx` touched (comment only).** A comment quoted the old "Rail Mk1" name; updated so it does not go stale. No code change. Not in the plan's file list.

**2. [Rule 3 - Blocking] `components/template/export-preview-dialog.tsx` types its parameter with `Parameters<typeof paperSaverCaption>[0]`.** `lib/units-isolation.test.ts` fails any print-surface file that imports `lib/geometry/units` and is not on its two lists; importing `UnitsSystem` would have needed a list edit, so the type is derived from the new function instead.

**3. Desktop pictures: the baseline run did NOT fail before re-recording.** The plan expected TEMPLATE, VOLUME and FINS to fail; with `maxDiffPixels: 100` and Playwright's colour tolerance all five passed on the old pictures, and a plain `--update-snapshots` wrote nothing. I re-recorded the three with `--update-snapshots=all -g "TEMPLATE|VOLUME|FINS"` anyway, since the plan calls for those pictures to show the new boxes. A raw pixel diff (>24 per channel) shows VOLUME (9 px) and FINS (10 px) differ only in the Board Length box row. **TEMPLATE differs more than the two boxes**: the old picture's drawing labels (the LENGTH, WIDEPOINT, WP OFFSET and TAIL BLOCK pills, the "Nose @ 12"" labels) and the Width and Nose Angle slider thumbs sit a pixel or two differently, which was already true of the committed picture before this task (the old baseline was simply stale within tolerance). A second re-record produced a byte-identical picture, so the render is deterministic. ROCKER and RAILS were not re-recorded and still pass.

**4. Co-author line.** Commits end with the session's attribution line (Claude Sonnet 5.5) rather than the plan's Opus line, per the orchestrator's instruction.

## Deferred / environment issues (not caused by this task)

- `components/design/slider-row.test.ts` fails 9 tests in this worktree with `Cannot read properties of null (reading 'useId')`: the stack shows `react` resolving from the main checkout's `node_modules` (`../../../node_modules/react`), a duplicate-React effect of running vitest in a worktree with a cloned `node_modules`. The file and everything it imports are untouched by this task.
- Under machine load, `lib/geometry/blank-fit.test.ts` and `lib/geometry/round-tip.test.ts` hit the 5 s timeout in the full run; both pass with `--testTimeout=120000` (together with `phase14-curves.test.ts`).

## Known Stubs

None.

## Threat Flags

None. The Remove messages say only that the sign-in lapsed or the connection failed (T-261017-01, accepted); the pin helper asserts the new name present and the old absent before mapping (T-261017-02, mitigated).

## Self-Check: PASSED

All four commits exist (2d8086da, 509aeb92, d13941bb, aa47483e); `e2e/board-length-picker.spec.ts` exists.
