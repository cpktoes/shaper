---
phase: 14-realistic-surfboard-flow
plan: 10
subsystem: geometry
status: complete
tags: [tips, taper, automatic, blank-fit, stress-set, phase-14]
requires:
  - "14-08 tip-taper.ts (tipView, steadyTaper, THINNING_START_MIN_MM/STEP_MM) and PreparedPchip.slopeAt"
  - "14-09 BoardBlank.noseThinningStart / tailThinningStart"
  - "14-04 DesignRules / summarizeDesignWith; 14-05 RULES_BEFORE_CURVES / RULES_LIVE; 14-06 preset figures generator"
provides:
  - "TipRule ('steady' | 'blend'); thinningStartsOf"
  - "BoardOnBlankInput.noseThinningStart / tailThinningStart / tipRule"
  - "BoardOnBlank.tips { nose, tail } (TipView), automaticThicknessAt, tipRule"
  - "BoardProfileInput.blank.tipRule; DesignRules.tipRule; RULES_BEFORE_CURVES.tipRule = 'blend', RULES_LIVE.tipRule = 'steady'"
  - "lib/geometry/tip-flow.test.ts (acceptance 3 and 4 on the stress set and its buildable subset)"
affects:
  - "14-12, 14-14, 14-17 (spread thinningStartsOf into the board inputs)"
  - "14-13 (the thinningStart runs-out cause; runsOutCause already reads each tip's own start)"
tech-stack:
  added: []
  patterns:
    - "One board derivation, two tip rules selected by an optional input field; the old rule kept line for line under a name"
    - "Stress-set tests measure every board once, then each assertion filters the measurements (full set and buildable subset)"
key-files:
  created:
    - lib/geometry/tip-flow.test.ts
    - .planning/todos/pending/2026-10-03-retire-todays-curve-and-12-inch-blend-after-the-showing.md
  modified:
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-fit.test.ts
    - lib/geometry/board-profile.ts
    - lib/geometry/design.ts
    - lib/geometry/before-after.ts
    - lib/geometry/phase14-today.test.ts
    - lib/geometry/phase14-curves.test.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
decisions:
  - "The steady rule's thickness checks each tip's window with the same strict comparisons the blend used (s < tail start, s > L − nose start), so a 12\" start leaves the 12\" station on the planer cut bit for bit (acceptance 4)."
  - "buildBoardProfile passes tipRule to boardOnBlank only when it is set, so a board input never carries an undefined key."
  - "Acceptance 3's 'newly pokes' is checked sample by sample: wherever the steady board pokes out by more than FIT_EPSILON_MM, the blend board pokes out by more than FIT_EPSILON_MM at that same sample."
  - "The 'changing Tip Style' test sets the tail's start at 15\" and the nose's at 13\" by hand, so it covers a tail start further in than its 12\" fine-tune and a nose start just past 12\"."
metrics:
  duration: "about 70 min"
  completed: 2026-10-03
  tasks: 3
  files: 10
actuals:
  tokens: 14800
  tasks: 3
  commits: 4
---

# Phase 14 Plan 10: The steady taper inside the board, proven on every test board Summary

Every board in a blank now thins steadily into each tip. Phase 12 used an S-shaped ease over the last 12". Now each tip's thickness runs down along one smooth curve, from where its thinning starts to the tip setting. On Automatic that start is 12", unless the board can't run down steadily from there; then it moves further in on its own. On all 1,635 test boards, none is thinner than its own tip, none is under the 1/4" floor, none newly pokes out of its blank, and none that fitted before is refused. With both starts at 12", every board's five thicknesses and five rocker numbers are exactly what they were. The old 12" ease is still there by name (`tipRule: "blend"`), only so the record of the live site's numbers and the before-and-after reports keep reproducing. Nothing on screen gains a control yet. The preset cards' litres rise a little.

## What was built

- **The steady taper in `boardOnBlank` (D-01 to D-03, D-23).** Each tip gets its own planer cut: the un-thinned thickness seen from that tip, with the blank's own thickness slope, flipped at the nose. Both read 0 where the board runs off the blank. `tipView` turns that cut into a start and a taper. Inside a tip's start the thickness is the taper. From the start inward it is the planer cut itself, untouched. The thinning is still the planer cut less the thickness, and it comes off the bottom (Pin deck) or the deck (Bottom), so the rocker, foam-off-deck and foam-off-bottom formulas are unchanged.
- **The stored starts and the rule switch.** `BoardOnBlankInput` gains optional `noseThinningStart`, `tailThinningStart` (absent means Automatic) and `tipRule` (absent means `"steady"`). `BoardOnBlank` gains `tips.nose` / `tips.tail` (each tip's `TipView`), `automaticThicknessAt` (the thickness with both tips on Automatic, whatever is stored) and `tipRule`. `thinningStartsOf(blank)` returns only the starts that are actually stored. It is the one helper later plans use to pass the starts in.
- **Today's blend, kept by name (D-25).** The `"blend"` branch is Phase 12's code line for line. Its tip views read 12", Automatic, with no flag. `RULES_BEFORE_CURVES` now carries `tipRule: "blend"` and `RULES_LIVE` `tipRule: "steady"`. The rule is threaded through `DesignRules.tipRule`, `summarizeDesignWith`, `boardProfileWith` and `BoardProfileInput.blank.tipRule`. The pin's tests (`phase14-today.test.ts`) and the curves step's own "no stress board flips to refused" test (`phase14-curves.test.ts`) cut their boards with the blend, so they still compare what they were written to compare.
- **The fine-tune hump** still peaks at the 12" station (`MEASURE_STATION_MM`, D-04). **`runsOutCause`** now reads each tip's own start (`tips.tail.fromTip`, `tips.nose.fromTip`) for the `tipSetting` cause, not a fixed 12".
- **The comments that had gone false** were rewritten: the file header, `TIP_EASE_WINDOW_MM`, `tipThinningAt`, `derivedThicknessAt`, the `boardOnBlank` Tips bullet, `runsOutCause`, `tweakExceedsDeckSkin`, and `BlankSideView.derived12` in `board-profile.ts`.

## The stress set, measured (`tip-flow.test.ts`, all starts on Automatic)

| Measure | All 1,635 boards | 1,344 buildable boards |
|---|---|---|
| Thinner anywhere than its own tip setting | **0** | **0** |
| Under the 1/4" floor | **0** | **0** |
| Newly poking out of the blank (against the blend) | **0** | **0** |
| Fits under the blend → refused under the steady taper | **0** | **0** |
| Fit under the blend / under the steady taper | 1,418 / **1,428** | 1,163 / **1,169** |
| Boards rising more than 1/64" toward a tip | **12**, all on **US Blanks 9'9"B** (in the computed exception list) | **12**, same blank |
| Boards at or under the 1/64" line | 1,623 | 1,332 |
| Largest rise toward a tip | 0.0663" | 0.0663" |
| Boards whose printed thickness falls steadily from its thickest station (checked exactly: never rises, 1e-9 mm) | 1,635 | 1,344 |
| Tips starting at 12" | 2,912 of 3,270 | 2,509 of 2,688 |
| 12–18" / 18–24" / 24–36" / over 36" | 218 / 97 / 43 / 0 | 116 / 55 / 8 / 0 |
| Furthest start | 32 1/2" | 30" |
| Boards whose two tips start differently | 249 | 135 |

These match CONTEXT and the research exactly (Q16, 14-08's own count). **Acceptance 4:** with both starts set by hand at 12", every stress board's five thicknesses and five rocker numbers are bit-identical (`Object.is`) to the blend, on both sets.

A mutation check showed the tests do catch a regression. Cutting the "live" side with the blend made 4 of the 6 acceptance-3 tests fail (thinner than the tip, and humps outside the exception list) on both sets. The file was then restored.

## The preset cards at the tips step (acceptance 5)

Re-generated from the app with `scripts/extract-phase14-preset-figures.ts --step tips`. The five thicknesses and five rocker numbers did not move, because all eight starts are 12". `phase14-preset-figures.test.ts` passes unedited.

| Preset | Litres, curves step → tips step |
|---|---|
| Shortboard | 29.478 → **29.562** (card 29.5 → 29.6) |
| Fish | 35.093 → **35.313** (card 35.1 → 35.3) |
| Mid-length | 50.286 → **50.401** (card 50.3 → 50.4) |
| Longboard | 75.309 → **75.311** (card 75.3 → 75.3) |

These equal the research's "after tips" column (Q10).

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 (tracer) | The steady taper inside the one board derivation, proven on every test board | `3f8fa2d` |
| 2 | The Phase 12 tests the new rule makes false, rewritten for it | `ebbcaeb` |
| 3 | Re-record the preset cards' figures; write down what is removed after the showing | `9fac1e4` |

Tracer gate: this run was autonomous (ruling 10). The tracer's verify passed end to end before the expansion tasks began: the six suites (plus `design.test.ts`) and `tsc --noEmit`.

## Task 2's rewritten tests

- `each 12" station's thickness is the blank's less the skin and the gap, unless that tip's thinning starts further in (D-07)`: both branches occur in the catalogue, and the test asserts each was reached. Where the start is further in, the 12" thickness equals `steadyTaper` on the same planer cut exactly, and it is above the planer cut there.
- `changing Tip Style or a tip thickness moves no number at or inside each tip's Thinning Starts point`: starts set by hand (tail 15", nose 13"), with the fine-tunes non-zero. Nothing from the starts inward moves, bit for bit.
- `the steady taper leaves the planer cut along its own slope at each start`: every pickable blank, both Tip Styles, every Automatic tip whose start was found. Thickness, and the bottom (Pin deck) or deck (Bottom), have no kink beyond the blank's own plus 1e-5.
- The four runs-out tests are rebuilt on the same boards, with both starts set by hand at 6" (`THINNING_START_MIN_MM`). Each still finds at least one runs-out and still asserts its own cause: `thinCenter` for the 1" board and (a), `fineTune` not blamed for (b′), `offBlank` for (c). Every cause can still arise, so no test was dropped.
- New: `D-20: on Automatic the default 72" board at a 1" centre has no runs-out verdict in the catalogue`. It passes with no verdict of either group whose worst is a runs-out.
- Every other test in the file passes unedited, including the 250 ms whole-catalogue timing guard and the deck-tweak-over-skin block. The file now has 76 tests.

## Verification

- `npx vitest run` (whole unit suite): 102 files, **3,773 passed**, 2 skipped. The skips existed before this plan and are not in its files.
- `npx tsc --noEmit` exits 0 (after `npx next typegen`); `npm run lint` exits 0.
- Acceptance greps: `export type TipRule` 1, `export function thinningStartsOf` 1, `tipView(` 2, `process.env` 0 in `blank-fit.ts` and `tip-taper.ts`; `tipRule: "blend"` 1 in `before-after.ts` and 1 in `phase14-curves.test.ts`. Both describe titles appear once in `tip-flow.test.ts`, and all four Task 2 titles once in `blank-fit.test.ts`. The record's `step` is `tips`, and the todo names `prepareBlankPchip`, `handSetCurve`, `tipRule` and the deck-tweak corner.
- `phase11-foil.test.ts` and `design-snapshot.test.ts` are unmodified and pass. Every changed file is in the plan's `files_modified`. No package was added, no environment file or database was touched, and no browser test or baseline was run or moved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Acceptance grep] Two test titles written as single-quoted / template strings**
- **Found during:** Task 2
- **Issue:** The plan checks each title with `grep -cF` against the plain text, which contains `12"`. Written as a double-quoted string, the source held `12\"`, so the grep printed 0.
- **Fix:** The D-07 title is now a template string and the D-20 title a single-quoted string. The titles vitest reports are unchanged.
- **Commit:** `ebbcaeb`

**2. [Rule 2 - Doc correctness] Two more comments brought in line**
- **Found during:** Task 1
- **Issue:** `tweakExceedsDeckSkin`'s comment said the tip ease is flat at 12", and `BlankSideView.derived12` said the 12" thickness is always the blank's less the skin and gap. Both are now false where a start is further in.
- **Fix:** Both comments were rewritten. The first now names the deck-tweak corner the todo records. Both files are in `files_modified`.
- **Commit:** `3f8fa2d`

Otherwise the plan was carried out exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-14-21 (Automatic's scan inside the blank list) is bounded: the whole-catalogue 250 ms timing guard in `blank-fit.test.ts` stays green, and `tip-flow.test.ts` measures 1,635 boards under both rules in about 1.5 s. T-14-22 (a corrupt start) is handled by `tipView`: a non-finite start reads as Automatic, and a finite one is pulled into range.

## Self-Check: PASSED

- FOUND: lib/geometry/tip-flow.test.ts, lib/geometry/blank-fit.ts, lib/geometry/blank-fit.test.ts, lib/geometry/__fixtures__/phase14-preset-figures.json, .planning/todos/pending/2026-10-03-retire-todays-curve-and-12-inch-blend-after-the-showing.md
- FOUND commits: 3f8fa2d, ebbcaeb, 9fac1e4
