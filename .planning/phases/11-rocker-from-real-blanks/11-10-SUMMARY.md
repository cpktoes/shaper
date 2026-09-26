---
phase: 11-rocker-from-real-blanks
plan: 10
subsystem: presets-and-new-boards
status: complete
tags: [presets, blanks, generated-module, design-store, fit-defaults, summary, volume, D-01, D-03, D-19, R5, R13, R14]
requires:
  - "11-03: listBlanks, nearestFit, fitAt, boardOnBlank, prepareBlank (lib/geometry/blank-fit.ts)"
  - "11-04: buildBoardProfile, DEFAULT_FALLBACK_ROCKER; computeCrossSectionVolume's thicknessAt"
  - "11-05: readSeedCatalog (lib/blanks/seed-files.ts), isPickable"
  - "11-08: useFitDefaults() -> { defaults: { noseTipThickness, tailTipThickness, ... } }"
  - "11-09: the store's blank field and five moves, boardBlankSchema (snapshot v4)"
provides:
  - "scripts/generate-preset-blanks.ts -> lib/blanks/preset-blanks.generated.json (generated, never hand-edited)"
  - "lib/blanks/preset-blanks.ts: PRESET_BLANKS, PresetBlankPick, presetFitContext, provisionalPresetPick, presetBlank, presetDesignFields"
  - "lib/geometry/presets.ts: BoardPreset without rocker; PresetFoil; PresetBlankCapture (optional captured blank)"
  - "DesignSummaryFields.rocker? / .blank? — summarizeDesign builds the store's side profile"
  - "design store: startedFrom (D-19), a derived `foil` that follows the live tip defaults until the first edit"
affects: [11-11, 11-12, 11-13]
tech-stack:
  added: []
  patterns:
    - "generated client module + drift test against the CSVs through the tested reader (Pitfall 4)"
    - "one pure preset -> board mapping read by both applyPreset and the preset card"
    - "live-until-first-edit value: derived in a memo, baked in by every mutator's updater"
key-files:
  created:
    - scripts/generate-preset-blanks.ts
    - lib/blanks/preset-blanks.generated.json
    - lib/blanks/preset-blanks.ts
    - lib/blanks/preset-blanks.test.ts
    - e2e/new-board.spec.ts
  modified:
    - lib/geometry/presets.ts
    - lib/geometry/presets.test.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - lib/geometry/summary-line.ts
    - lib/geometry/summary-line.test.ts
    - components/setup/board-rack-card.tsx
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - lib/geometry/rocker.test.ts
key-decisions:
  - "The generator writes an empty module first if the JSON is missing, then loads the rule — lib/blanks/preset-blanks.ts imports the file the generator writes, so a first run (or a deleted file) would otherwise fail to import"
  - "The four retired Bezier rocker blocks are frozen inside rocker.test.ts as migration INPUTS, so the version-3 reopen keeps being tested on the real captured curves"
  - "presetFitContext is exported: the rule, the generator and the tests all build the preset's board for the fit check the one same way"
  - "A preset's blank copy is the module's own record object, so the store prepares it once however often a preset is applied"
metrics:
  duration: "about 35 minutes"
  completed: 2026-09-26
actuals:
  tokens: 17300
  tasks: 3
  commits: 4
---

# Phase 11 Plan 10: Presets open in real blanks, untouched boards follow the tip defaults, and every summary agrees Summary

The four presets now open sitting in a real foam blank — picked by a script from the catalogue and
clearly marked as a first pick for the founder to replace. A brand-new board nobody has touched
follows the Nose Tip and Tail Tip set in the gear menu, until the shaper's first edit makes them its
own. And the rack card, the preset card and the VOLUME screen now quote one litres figure for a
board in a blank, all worked out from the board's own copy of that blank.

## What changed, in plain English

- **Presets in blanks (D-03).** Shortboard, Fish, Mid-length and Longboard no longer carry a
  hand-drawn rocker or typed nose 12" / tail 12" thicknesses. Each keeps its outline, rails, fins,
  centre thickness and tip thicknesses, and names a blank and where the board sits on it. Its rocker
  and its 12" thicknesses are that blank's own, scaled to its centre. Opening a preset lands on a
  board already in its blank: the ROCKER drawing shows the blank's outline and the DATASHEET lists it.
- **How the picks were made.** `scripts/generate-preset-blanks.ts` chose, for each preset's own
  length, outline, centre and tips (with the default fit settings), the fitting blank closest in
  length, with ties going to the one with less spare foam at the centre, placed where it fits nearest
  the middle. It wrote those four blanks' catalogue rows into `lib/blanks/preset-blanks.generated.json`,
  so the setup screen can open a preset in its blank without the database. `presets.ts` says in its
  header and on every preset that these are provisional. The founder replaces one by setting the
  board up on ROCKER in the blank they want, pressing "Copy preset values", pasting its `blank:`
  line into the preset and re-running the script. A captured line always wins over the rule.
- **Live tip defaults (D-19).** A new board nobody has edited shows the gear menu's current Nose Tip
  and Tail Tip, and follows them if they change. The first edit of any kind (a slider, a typed value,
  a toggle, picking or sliding a blank, a board name, saving) makes those tips the board's own, and
  from then on the defaults no longer reach it. Presets and saved boards open with their own tips, as
  before.
- **Every summary agrees (D-01 across screens).** A rack card's litres used to come from the board's
  five stored thicknesses, even for a board in a blank. Now the summary builds the same side profile
  the VOLUME screen does. For a board in a blank that means the blank-scaled foil, read from the
  board's own copy of the blank and never from the catalogue. For a hand-set board it means the
  five-station curve, which gives exactly what it did before, to the last digit.

## Generator output (the provisional picks)

```
shortboard: Marko Foam 6'4" TP at 0 mm (0" toward nose; blank 76.000" long) (provisional)
fish: Arctic Foam 5'10" MF at 0 mm (0" toward nose; blank 70.875" long) (provisional)
midlength: Marko Foam 7'5" Machine All at 0 mm (0" toward nose; blank 89.000" long) (provisional)
longboard: US Blanks 9'3"Y at 0 mm (0" toward nose; blank 111.000" long) (provisional)
wrote lib/blanks/preset-blanks.generated.json (4 blanks)
```

**Compared with 11-RESEARCH.md's table:** the script's four picks and placements match exactly
(Marko 6'4" TP, Arctic 5'10" MF, Marko 7'5" Machine All and US Blanks 9'3"Y, all centred). They were
produced by the final tested functions, not copied from that table. Running the script a second time
wrote byte-identical output (same SHA-1).

## Preset litres, before and after (computed, not typed)

"Before" is `summarizeDesign` over the base commit's presets (their own five typed thicknesses,
already on pchip since 11-04). "After" is `presetSummary` now, which is the board in its blank.
Both were computed with a scratch `npx tsx` script that read the old `presets.ts` straight out of git.

| Preset | Before | After | Change | Card line before | Card line after |
|--------|--------|-------|--------|------------------|-----------------|
| Shortboard | 28.5561 L | 30.9035 L | +2.3474 L | 6'2" · 18 3/4" · 2 1/4" · 28.6 L | 6'2" · 18 3/4" · 2 1/4" · 30.9 L |
| Fish | 33.9810 L | 35.9251 L | +1.9441 L | 5'8" · 20 1/4" · 2 1/2" · 34.0 L | 5'8" · 20 1/4" · 2 1/2" · 35.9 L |
| Mid-length | 48.6316 L | 52.7598 L | +4.1282 L | 7'2" · 21 1/4" · 2 3/4" · 48.6 L | 7'2" · 21 1/4" · 2 3/4" · 52.8 L |
| Longboard | 71.4750 L | 76.8682 L | +5.3932 L | 9'0" · 22 1/2" · 3" · 71.5 L | 9'0" · 22 1/2" · 3" · 76.9 L |

The "before" figures are exactly 11-04's recorded pchip figures. Length, width and thickness do not
move. The litres go up by 2 to 5 L because a real blank carries its foam much fuller toward the ends
than the old typed 12" numbers did. For example, the Shortboard's nose 12" is now about 1.87", where
it was typed as 1 3/8". **The founder should look at this when reviewing the picks:** it is the real
shape of the chosen blanks, not a rounding change. No desktop screenshot shows preset-card litres,
so no baseline moves because of it.

Each preset's blank-derived side profile (read in a scratch probe, and asserted as properties in
`presets.test.ts`) has tips and centre exactly equal to the preset's own settings, both 12"
thicknesses between the tip and the centre, no negative thickness, and more nose rocker than tail
rocker at both the tips and 12".

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 (tracer) | A preset opens sitting in a real blank — picked by script from the catalogue, carried on the client, marked provisional | 7663b65 |
| 2 | Rack cards, preset cards and VOLUME quote the same litres for a board in a blank | 372f7ab |
| 3 | A new, untouched board follows the tip defaults in the gear menu — until the shaper touches it | 5438085 |

## Verification

- Tracer gate, re-run after its commit: the generator, then `git diff --exit-code lib/blanks/preset-blanks.generated.json`
  (clean), `npx vitest run lib/blanks/preset-blanks.test.ts lib/geometry/presets.test.ts` and `npx tsc --noEmit`. All green.
- Task 2 RED: 17 of 125 failed before `summarizeDesign` knew the blank (the summary still read the
  five stored thicknesses). GREEN: `npx vitest run lib/geometry/design.test.ts lib/geometry/summary-line.test.ts lib/units-isolation.test.ts`, 150 passed.
- Task 3: `npx vitest run components/design/design-store.test.ts lib/geometry/summary-line.test.ts`, 36 passed.
  `IS_WEBPACK_TEST=1 PW_PORT=3160 npx playwright test e2e/new-board.spec.ts --project=desktop --project=android`: 4 passed.
- End of plan: `npx tsc --noEmit` exit 0. `npx vitest run`: 71 files, 2772 passed, 2 skipped.
  `npm run lint`: 0 errors, 11 warnings, all of them already there before this plan.
- Wider browser checks: `e2e/undo-redo.spec.ts`, `e2e/fit-defaults.spec.ts`, `e2e/phone-trip.spec.ts`
  and `e2e/phone-home.spec.ts` gave 51 passed and 33 skipped on all three projects. `e2e/desktop-baseline.spec.ts -g "TEMPLATE|RAILS|FINS"`
  passed. FINS failed once on the very first run while the dev server compiled, then passed on its own
  rerun with no change, so it is a timing flake. ROCKER and VOLUME baselines were not run, as they are
  expected to be stale until 11-12. Port 3160 was confirmed free afterwards.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `lib/geometry/rocker.test.ts` read `preset.rocker`**
- **Found during:** Task 1
- **Issue:** The version-3 migration test ran `bezierToFiveStations` over every preset's captured
  Bezier. `BoardPreset` no longer has a rocker, so the file stopped compiling. It is outside the
  plan's 14 paths, and it is not one of 11-11's files.
- **Fix:** Froze the four retired Bezier blocks inside that test, exactly as `presets.ts` last carried
  them. They are migration inputs: a board saved from a preset before Phase 11 still carries one.
  The expectations are still read off `buildRocker`.
- **Commit:** 7663b65

**2. [Rule 3 - Blocking] `presetSummary` moved to `presetDesignFields` in Task 1, not Task 2**
- **Issue:** `presetSummary` passed `preset.foil` as a full five-station foil. Once `PresetFoil` had
  only three keys, `tsc` failed in Task 1.
- **Fix:** Task 1 switched `presetSummary` and `FIXED_SUMMARY` to spread `presetDesignFields`. Task 2
  then made `summarizeDesign` blank-aware. Between the two commits the preset card's litres read the
  default 12" fallbacks. That state was never shipped.
- **Commit:** 7663b65, 372f7ab

**3. [Rule 1 - Test contract] The store's `applyPreset` test updated in Task 1**
- **Issue:** The 11-09 source-contract test asserted `applyPreset` wrote `blank: null`.
- **Fix:** It now asserts `...DEFAULT_DESIGN_STATE, ...presetDesignFields(preset)`, which is the new
  contract. The R6 list of handlers allowed to write `blank` is unchanged.
- **Commit:** 7663b65

**4. [Rule 2 - Correctness] Generator bootstrap**
- **Issue:** `lib/blanks/preset-blanks.ts` imports the JSON the generator writes, and the generator
  needs the rule from that module. A first run, or a run after the file is deleted, could not start.
- **Fix:** If the file is missing, the script writes an empty module first and then loads the rule
  with a dynamic import. It never edits an existing file by hand, and it always overwrites the whole
  file with the real output.
- **Commit:** 7663b65

### Choices the plan left open

- `presetFitContext` is exported and tested, so the rule, the generator and the tests build the
  preset's fit-check board the same way.
- `updateFoil`, `removeBlank`, the blank moves and the two VOLUME import toggles build their result
  from the started board, not from `prev`. That way a first edit to one tip also bakes the other
  tip's live value, instead of reverting it to the stale stored default.
- `markSaved` now sets `boardStarted: true`, so saving an untouched board keeps the tips it was saved
  with (D-19 "saving"). The undo snapshot's values do not change there, so no step is recorded.

## Human verification deferred to end-of-phase UAT

The Task 1 tracer did not stop (`human_verify_mode: end-of-phase`). These are for the founder:

- **Review the four provisional picks.** Open each preset from the setup screen, go to ROCKER and
  judge the blank, where the board sits in it, and the rocker it gives. Replace any pick through the
  "Copy preset values" loop described in the `presets.ts` header.
- **The preset cards' litres went up by 2 to 5 L** (see the table above). Confirm this reads right
  for each board type once the picks are settled.
- **D-19 on a real device:** on a new board, change Nose Tip Thickness in Fit & Tip Defaults and
  watch ROCKER follow. Then nudge any control, change the default again, and confirm the board stays.

## Notes for 11-11 and 11-12

- `e2e/new-board.spec.ts` finds the THICKNESS section by its heading button (`/^Thickness\s*[▾▸]$/`)
  and its rows by `Nose Tip — ` and `Tail Tip — `, with a keyboard step on the Tail Tip slider. If
  11-11 renames that heading or those rows, or makes Tail Tip a fine-tune in the blank state, update
  that spec. On a fresh board no blank is picked, so the fallback rows apply there.
- The store's context `foil` is now the derived foil: the live tips while the board is unstarted.
  The sidebar and the blank list should read `foil` from `useDesign()` (as they already do), never
  state directly. No store field or move was renamed or removed. `startedFrom` is internal.
- A preset now opens with a blank picked. From a preset, the ROCKER sidebar is in the blank state
  11-11 is building.

## Known Stubs

None. The provisional picks are intentional (D-03) and marked in `presets.ts`. The founder replaces
them through the capture loop.

## Threat Flags

None beyond the plan's register. T-11-29 is mitigated: the drift test compares every stored row with
its CSV, checks that the module holds no extra blank, and checks that every provisional pick is
still what the rule picks. T-11-30 is mitigated: the store only copies the provider's allow-listed
values. T-11-SC is mitigated: `npx --no-install`, and no package.json change.

## Self-Check: PASSED

- FOUND: scripts/generate-preset-blanks.ts, lib/blanks/preset-blanks.generated.json, lib/blanks/preset-blanks.ts,
  lib/blanks/preset-blanks.test.ts, e2e/new-board.spec.ts
- FOUND commits: 7663b65, 372f7ab, 5438085
