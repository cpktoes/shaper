---
phase: quick-261018-dvu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/phase11-foil.ts
  - lib/geometry/phase11-foil.test.ts
  - lib/geometry/blank-fit.test.ts
  - lib/geometry/custom-rocker.test.ts
  - lib/geometry/before-after.ts
  - lib/geometry/before-after.test.ts
  - lib/geometry/phase14-today.test.ts
  - lib/geometry/phase14-today-handset.test.ts
  - lib/geometry/thinning-start-paths.test.ts
  - lib/geometry/tip-flow.test.ts
  - lib/geometry/phase14-curves.test.ts
  - lib/geometry/round-tip.test.ts
  - lib/geometry/board-profile.test.ts
  - scripts/check-saved-boards.ts
  - scripts/phase14-before-after.ts
  - lib/geometry/blank-fit.ts
  - lib/geometry/root-curve.ts
  - lib/geometry/board-profile.ts
  - lib/geometry/design.ts
  - lib/geometry/round-tip.ts
  - lib/geometry/design.test.ts
  - lib/geometry/rack-art.test.ts
  - components/rocker/blank-flag.tsx
  - .planning/quick/261018-dvu-retire-the-old-bottom-curve-the-hand-set/261018-dvu-SUMMARY.md
autonomous: true
requirements: [QT-261018-dvu]
estimate:
  # One executor, three sequential tasks, every one a removal or a like-for-like rewrite. The whole
  # change was tried at plan time in a scratch copy and measured green at each task boundary, so the
  # cost is reading the named regions, editing, and three suite runs (about 50 s each).
  # Calibration: factor 1, 0 samples.
  tokens: 120000
  raw_tokens: 120000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "Every board a shaper has saved opens to exactly the numbers it opens to today. Boards saved under Phase 11 convert exactly as before: lib/geometry/phase11-foil.test.ts, lib/models/design-snapshot.test.ts and lib/models/saved-board-open.test.ts pass with every expected value unchanged — the only diff in phase11-foil.test.ts is its import lines and the one `const W` line, forced by the 12-inch constant's removal. No fixture under lib/geometry/__fixtures__ is regenerated."
    - "The four preset cards, the first board a visitor sees and every rack card show the same litres, station thicknesses and rocker numbers as before (before-after.test.ts's live describe, design.test.ts, rack-art.test.ts and rack-models.test.ts pass unchanged in what they assert)."
    - "The old bottom curve (pchip straight through a blank's printed values), the hand-set pchip option and the 12-inch S-shaped tip blend are gone from lib/, scripts/, components/ and app/: the final grep gate prints nothing."
    - "The record of what the site showed before Phase 14 stays: lib/geometry/__fixtures__/phase14-today-golden.json, lib/geometry/__fixtures__/phase14-today.ts and scripts/extract-phase14-today-golden.ts are byte-identical to the base commit, and the pin is still read by root-curve.test.ts and phase14-preset-figures.test.ts."
    - "The Arctic tape-check command in the pending todo still works: `scripts/phase14-before-after.ts --step curves --samples <dir>` prints the six boards' live figures and writes one CSV per board of the live rocker, thickness and deck every 1/2 inch."
    - "The deck-tweak quick refusal works exactly as before (the founder decided on 2026-10-18 to keep it): the body of `tweakExceedsDeckSkin` is byte-identical to the base. Its two comments — above it in lib/geometry/blank-fit.ts, and in components/rocker/blank-flag.tsx — now record that decision instead of pointing at the todo. blank-flag.tsx is the only file under components/ that changes, and only in comment lines."
  artifacts:
    - path: "lib/geometry/phase11-foil.ts"
      provides: "phase11Thickness — Phase 11's own pchip thickness curve, private to the conversion"
      contains: "function phase11Thickness"
    - path: "lib/geometry/blank-fit.ts"
      provides: "prepareBlank (square-root rule only) and boardOnBlank (steady taper only)"
      contains: "export function prepareBlank"
    - path: "lib/geometry/design.ts"
      provides: "DesignRules with its one remaining field, LIVE_DESIGN_RULES"
      contains: "export const LIVE_DESIGN_RULES"
    - path: "lib/geometry/before-after.ts"
      provides: "boardFigures / boardProfileWith — a board's live figures only"
      contains: "export function boardFigures"
    - path: "scripts/phase14-before-after.ts"
      provides: "the live curve figures and samples for the six Phase 14 picture boards"
      contains: "station_in,rocker_in,thickness_in,deck_in"
    - path: "lib/geometry/__fixtures__/phase14-today-golden.json"
      provides: "the pin — unchanged record of the site before Phase 14"
  key_links:
    - from: "lib/models/design-snapshot.ts"
      to: "lib/geometry/phase11-foil.ts"
      via: "carryPhase11Blank reads phase11TwelveInch, now on the private Phase 11 thickness curve"
      pattern: "phase11Thickness\\(prepared\\.record\\)"
    - from: "lib/geometry/design.ts"
      to: "lib/geometry/board-profile.ts"
      via: "designSideProfile -> buildBoardProfile with no rule switches left"
      pattern: "buildBoardProfile\\("
    - from: "lib/geometry/thinning-start-paths.test.ts"
      to: "lib/geometry/before-after.ts"
      via: "source scan requires before-after.ts to keep calling thinningStartsOf("
      pattern: "thinningStartsOf\\("
---

<!-- planner-discipline-allow: prepareBlankPchip -->
<!-- planner-discipline-allow: handSetCurve -->
<!-- planner-discipline-allow: tipRule -->
<!-- planner-discipline-allow: TipRule -->
<!-- planner-discipline-allow: TIP_EASE_WINDOW_MM -->
<!-- planner-discipline-allow: RULES_BEFORE_CURVES -->
<!-- planner-discipline-allow: RULES_BEFORE_TIPS -->
<!-- planner-discipline-allow: RULES_LIVE -->
<!-- planner-discipline-allow: CurveRule -->
<!-- planner-discipline-allow: curves-report -->
<!-- planner-discipline-allow: tips-report -->
<!-- planner-discipline-allow: "blend" -->
<!-- planner-discipline-allow: "pchip" -->
<!-- planner-discipline-allow: prepareBlankWith -->
<!-- planner-discipline-allow: fallbackProfileWith -->
<!-- planner-discipline-allow: smoothstep -->
<!-- planner-discipline-allow: compareFigures -->
<!-- planner-discipline-allow: summarizeMoves -->
<!-- planner-discipline-allow: movesReportLines -->
<!-- planner-discipline-allow: tipsReportLines -->
<!-- planner-discipline-allow: decide after the showing -->

<objective>
Phase 14 kept the site's old ways of drawing a board callable by name until the Oct 10 showing, so the
before-and-after pictures, the saved-boards report and the pin could show what moved (Phase 14 D-25).
The showing is past. This task retires them — the founder's ruling, section 1 of
`.planning/todos/pending/2026-10-03-retire-todays-curve-and-12-inch-blend-after-the-showing.md`:

- the old blank curve (pchip straight through a blank's printed values),
- the option to draw a board with no blank on that old curve,
- the 12-inch S-shaped tip blend and its 12-inch window constant (Phase 11's conversion reads the
  12-inch station from `MEASURE_STATION_MM` instead — the same number),
- the two "before" rule sets in `before-after.ts`,
- and every test and script part that existed only to prove or report on those rules.

In plain English for the founder: nothing a shaper sees changes. Every saved board, every Phase 11
board, every preset card and every rack card opens to exactly the numbers it shows today. Only the
leftover old maths behind the showing's comparisons is removed.

KEPT, by ruling: the pin file `lib/geometry/__fixtures__/phase14-today-golden.json` and its generator
`scripts/extract-phase14-today-golden.ts`, unchanged. The generator never called anything removed
here. It runs the code of commit ed39f4a and already refuses to run anywhere else (checked at plan
time: it exits 1 on today's tree and writes nothing). It keeps compiling because `tsc` covers
`scripts/`. The pin stays read by root-curve.test.ts and phase14-preset-figures.test.ts.

Section 2 of the todo needs no code. The founder decided on 2026-10-18 to keep the deck-tweak quick
refusal, so the body of `tweakExceedsDeckSkin` stays exactly as it is. Task 3 only rewords its two
comments so they record that decision instead of pointing at the todo: the one above it in
lib/geometry/blank-fit.ts, and the one in components/rocker/blank-flag.tsx. Both are comment-only edits.

Purpose: the board maths has one way to draw a blank, one way to draw a hand-set board and one way to
thin a tip, which makes it easier to trust and to change.
Output: three commits (one per task) and the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/todos/pending/2026-10-03-retire-todays-curve-and-12-inch-blend-after-the-showing.md

## What the planner measured (2026-10-18, base main e74dddc2, in scratch copies — never in the main checkout)

- The full change was applied in three steps matching Tasks 1–3. Each step was green: `npx tsc --noEmit`
  exit 0, eslint clean, and the full vitest suite passing (Task 1 targeted files 420/420; after Task 2
  and after Task 3: 154 files, 5,720 passed, 2 skipped). At the base the suite is 156 files, 5,759
  passed, 2 skipped. So exactly 2 files and 39 tests go, every one listed under Task 2. No other test
  changes count.
- A probe recorded every Phase 11 number before and after: 39 golden cases × both Tip Styles, 7,884
  conversions across every pickable blank (3 lengths × 3 placements × 2 centres × 2 tweaks), and 224 live
  boards' litres and station figures. The two outputs were byte-identical (sha1 d8658ab0…). So Phase 11
  keeps a private copy of its curve, and `phase11-foil-golden.json` is NOT re-pinned.
- Under heavy machine load (load average 36–58), two existing blank-fit.test.ts tests ("the board's
  bottom sits exactly the centre gap…" and "moves to the fitting placement nearest…") hit vitest's
  5-second limit once. Alone they take 0.84–1.04 s both before and after this change. If either times
  out, re-run `npx vitest run lib/geometry/blank-fit.test.ts` alone before suspecting the change. Do not
  raise their limits.
- Optional head start: the planner's trial is saved as a git patch at
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/e9352e0d-c213-496a-b7fd-fe0822ba7df2/scratchpad/261018-dvu-trial.patch`.
  It applies cleanly to e74dddc2 with `git apply -p2`. Each task can apply only its own files with one
  `--include='<path>'` per file listed in that task's `<files>`; every file belongs to exactly one task.
  Run `git apply -p2 --check` first. If the file is unreadable or any file no longer applies (for
  example, the sibling fins task changed design.ts first), do that file by hand from this plan. Either
  way, review what you commit against the actions below. The plan, not the patch, is the contract.
  The patch was made before the deck-tweak comment amendment. It does not contain Task 3 item 8
  (blank-flag.tsx) or the reworded paragraph above `tweakExceedsDeckSkin` in blank-fit.ts, so make
  those two comment edits by hand after applying.

## Environment notes

- Pure geometry: do NOT start `next dev` or Playwright. Gates are vitest, tsc, eslint and grep.
- Record the base first: run `git rev-parse HEAD` before Task 1 and write the hash down. Every diff gate
  below compares against it. Shell variables do not survive from one command to the next, so prefix
  each gate command with `BASE=<that hash>;` or paste the hash wherever this plan says `"$BASE"`.
- In a fresh worktree, run `npx next typegen` once before `npx tsc --noEmit`. Otherwise
  app/layout.tsx and app/design/layout.tsx fail on `LayoutProps`, which is missing route types and has
  nothing to do with this change. It leaves tracked files alone.
- Comments: the final grep gate also counts comments. New or edited comments must describe the retired
  rules in words ("the curve the site drew before Phase 14", "Phase 12's 12-inch blend"), never by
  their old code names.
- Sibling quick task 261018-dw6 (fins) runs in parallel. This plan's only files it might also touch are
  `lib/geometry/design.ts` (imports, the `DesignRules` doc and two lines in `designSideProfile`) and
  `lib/geometry/design.test.ts` (one line near 103). Nothing under lib/models/ is edited. Under
  components/, only the comment in components/rocker/blank-flag.tsx changes (Task 3, item 8).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Boards saved under Phase 11 keep their own copy of the curve they were drawn on; the tests that only borrowed the old curve get their own</name>
  <files>lib/geometry/phase11-foil.ts, lib/geometry/phase11-foil.test.ts, lib/geometry/blank-fit.test.ts, lib/geometry/custom-rocker.test.ts</files>
  <read_first>lib/geometry/phase11-foil.ts (whole, 130 lines); lib/geometry/blank-fit.ts lines 140–215 (how the old preparation built its curves: same knots, stored order, empty cell not a knot); lib/geometry/phase11-foil.test.ts lines 1–10 and 74–80; lib/geometry/blank-fit.test.ts lines 30–62 (imports), 336–373, 580–592, 1852–1862; lib/geometry/custom-rocker.test.ts lines 1–8, 44, 293–305</read_first>
  <action>
Founder's "one thing to watch": Phase 11 boards were drawn on the old curve, so the conversion keeps
a private copy of that curve's thickness. This is the only half the conversion ever read.

1. lib/geometry/phase11-foil.ts
   - Change the `./blank-fit` import to `blankStationOf, boardOnBlank, clampPlacement, FIT_EPSILON_MM,
     type PreparedBlank`.
   - Add `type BlankRecord` to the `./blank` import, `MEASURE_STATION_MM` from `./outline`, and
     `preparePchip, type PreparedPchip` from `./pchip`.
   - Add a private, non-exported `phase11Thickness(record: BlankRecord): PreparedPchip`. It walks
     `record.stations` in stored order, collects `{ x: fromTailMm, y: thicknessMm }` for every station
     whose `thicknessMm` is not null, and returns `preparePchip(points)`.
   - Doc comment for it: the blank's thickness as Phase 11 drew it, pchip straight through the printed
     thicknesses, an empty cell not a knot. It is the thickness half of the preparation the site used
     before Phase 14, which was retired after the Oct 10 showing (quick 261018-dvu). It lives here,
     privately, so a Phase 11 board converts exactly as it always has.
   - In `phase11TwelveInch`:
     - replace the re-prepared old blank with `phase11Thickness(prepared.record)`;
     - set the blank length to `prepared.record.lengthMm` (the old preparation's length was the
       record's);
     - sample that curve;
     - read the 12-inch station `s` from `MEASURE_STATION_MM`.
   - Rewrite that function's last doc paragraph. It now says the number is read on Phase 11's own curve
     via `phase11Thickness`, whatever the live rule is. Remove the old function's name and the D-25 tag
     from it.
   - In `carryPhase11Blank`, both 12-inch constant uses become `MEASURE_STATION_MM`.
   - Why this is exact: the old function copied the record and ran the same `preparePchip` over the same
     knots in the same order. The removed constant was literally `MEASURE_STATION_MM`. The old function's
     throw on a blank with no centre thickness cannot be reached, because the caller's blank came from
     `prepareBlank`, which throws on the same condition first.

2. lib/geometry/phase11-foil.test.ts — only what the removal forces:
   - drop the 12-inch window constant from the `./blank-fit` import;
   - import `MEASURE_STATION_MM` from `./outline`;
   - `const W` (near line 76) becomes `MEASURE_STATION_MM`.
   - Not one expected value or assertion changes.

3. lib/geometry/blank-fit.test.ts
   - Imports:
     - remove `prepareBlankPchip` and `TIP_EASE_WINDOW_MM` from the `./blank-fit` list;
     - add `preparePchip` to the `./pchip` import, which today brings in only `type PreparedPchip`;
     - `levelCurve` and `MEASURE_STATION_MM` are already imported.
   - Test "the board's bottom sits exactly the centre gap above the blank's bottom at every station, so
     the rocker is the blank's own" (near line 336) is REWRITTEN, keeping its assertion. In its Phase 11
     golden loop, the blank becomes `prepareBlank(record)` with its `rocker` replaced by
     `levelCurve(preparePchip(knots), 0, record.lengthMm)`. Here `knots` are the record's stations with a
     non-null `rockerMm`, in stored order, as `{ x: fromTailMm, y: rockerMm }`.
     - Only the bottom is swapped: under Tip Style Bottom, with fine-tunes on the Deck and no tweak, the
       board's rocker reads nothing but the blank's levelled bottom and its length.
     - Reword the comment above the loop to say this in words.
     - `toBeCloseTo(…, 9)` against the golden stays.
   - `const W` in describe "the board's foil, cut from the blank (D-05, D-09, D-13, D-16)" (near line 590)
     and `const station = L - …` in "(b) a negative 12" fine-tune…" (near line 1859) both read
     `MEASURE_STATION_MM`.

4. lib/geometry/custom-rocker.test.ts — test "prepareBoardBlank is the board's copy prepared, then bent
   by the board's rocker" (near line 294) is REWRITTEN, keeping its assertion that `prepareBoardBlank`
   bends whichever preparation it is handed.
   - Replace the retired preparation with a test-local `halved`: `prepareBlank` of a copy of the record
     with every non-null printed `rockerMm` halved (`mm(value / 2)`).
   - Compare `prepareBoardBlank({ copy, rocker: s }, halved)` against
     `withCustomRocker(halved(copy), s)` at every sampled point, as variables `other` / `otherByHand`.
   - Add a one-line comment: any other preparation passed in is the one bent.
   - Drop the retired name from the `./blank-fit` import. `BlankRecord` and `mm` are already imported.

Commit: `refactor(quick-261018-dvu): boards saved under Phase 11 keep their own copy of the curve they were drawn on, so retiring the old curve cannot move their numbers`
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/phase11-foil.test.ts lib/geometry/blank-fit.test.ts lib/geometry/custom-rocker.test.ts lib/models/design-snapshot.test.ts lib/models/saved-board-open.test.ts && npx tsc --noEmit && git diff --quiet "$BASE" -- lib/geometry/__fixtures__ lib/models && ! grep -nE 'prepareBlankPchip|TIP_EASE_WINDOW_MM' lib/geometry/phase11-foil.ts lib/geometry/phase11-foil.test.ts lib/geometry/blank-fit.test.ts lib/geometry/custom-rocker.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - The five files pass: 420 tests (phase11-foil 5, blank-fit 86, custom-rocker 225, design-snapshot 83, saved-board-open 21), the same counts as at the base.
    - `git diff "$BASE" -- lib/geometry/phase11-foil.test.ts | grep -c '^[-+][^-+]'` prints 5: the import lines and the `const W` line, and no expected value.
    - `git diff --quiet "$BASE" -- lib/geometry/__fixtures__ lib/models` exits 0: no fixture re-pinned and no saved-board test touched.
    - `npx tsc --noEmit` exits 0.
  </acceptance_criteria>
  <done>Phase 11 boards convert through their own private curve. No test outside blank-fit.ts and before-after.ts needs the old blank preparation. Committed.</done>
</task>

<task type="auto">
  <name>Task 2: Retire the before-and-after reports, the pin's reproduction tests and every test that compared the old rules with today's</name>
  <files>lib/geometry/before-after.ts, lib/geometry/before-after.test.ts, lib/geometry/phase14-today.test.ts, lib/geometry/phase14-today-handset.test.ts, lib/geometry/thinning-start-paths.test.ts, lib/geometry/tip-flow.test.ts, lib/geometry/phase14-curves.test.ts, lib/geometry/round-tip.test.ts, lib/geometry/board-profile.test.ts, scripts/check-saved-boards.ts, scripts/phase14-before-after.ts</files>
  <read_first>lib/geometry/before-after.ts (whole); lib/geometry/before-after.test.ts lines 1–170 and the describe list (grep -n "describe("); lib/geometry/thinning-start-paths.test.ts lines 1–14, 88–106, 148–184; lib/geometry/tip-flow.test.ts lines 30–40, 112–200, 200–280; lib/geometry/phase14-curves.test.ts (whole, 134 lines); lib/geometry/round-tip.test.ts lines 12–28, 262–275, 360–368; lib/geometry/board-profile.test.ts lines 147–174; scripts/check-saved-boards.ts lines 30–100, 135–260, 320–345; scripts/phase14-before-after.ts (whole, 538 lines)</read_first>
  <action>
Remove every comparison with the old rules, and every report or test whose only job was that
comparison. In this task the library files keep the old rules; Task 3 removes them. The suite stays
green in between (measured).

A. `git rm` lib/geometry/phase14-today.test.ts (6 tests) and lib/geometry/phase14-today-handset.test.ts
   (3 tests). Their only job was to reproduce the pin on the old rules (founder's ruling).

B. lib/geometry/before-after.ts becomes the reader of a board's LIVE figures. The name is kept.
   - Rewrite the header. It reads a board's live five thicknesses, five rocker numbers, litres and fit
     verdict through the one pipeline every screen reads, with each board's own stored Thinning Starts.
   - The header also says the file is named for the Phase 14 before-and-after comparison it held. That
     comparison and the old rules were retired after the Oct 10 showing (quick 261018-dvu). What is left
     serves scripts/phase14-before-after.ts and thinning-start-paths.test.ts.
   - Delete:
     - the three rule-set constants (both "before" sets and the live set);
     - the station-key list;
     - `compareFigures` with `BoardMove`;
     - `summarizeMoves` with `MovesReport`;
     - the three report thresholds and the inches formatter;
     - `movesReportLines` and `tipsReportLines`.
     Their only callers were the reports removed below.
   - `BoardFigures` loses its `reachesStation` field, and `boardFigures` stops filling it. Only the
     comparison read it.
   - `boardProfileWith` loses its two lines that pass a tip rule and a hand-set curve. Both are optional
     with the live defaults, so nothing moves.
   - `boardProfileWith` MUST keep its `...thinningStartsOf(blank)` call. thinning-start-paths.test.ts
     scans this file's source for `thinningStartsOf(`.
   - Prune imports to: `fitAt, thinningStartsOf`; `type FitSettings`; `buildBoardProfile, type
     BoardSideProfile`; `prepareBoardBlank`; `summarizeDesignWith, type DesignRules, type
     DesignSummaryFields`; `type FoilStationKey`; `buildOutline, sampleOutline`;
     `DEFAULT_FALLBACK_ROCKER`; `type Mm`.

C. lib/geometry/before-after.test.ts keeps ONLY describe "the live rules are exactly what every screen
   shows" with its per-board test: four presets plus the first board, 5 tests.
   - Its calls pass `LIVE_DESIGN_RULES`, imported from `./design`.
   - Delete:
     - "today's rules, kept by name, reproduce the pin" (6 tests);
     - the hand-set "boardProfileWith on today's rules draws … today's curve" test (1);
     - describes `compareFigures` (5), `summarizeMoves` (4), `movesReportLines` (3), "the tips step…" (3)
       and `tipsReportLines` (2);
     - their helpers: the recorded-preset fields function, the five-numbers builder, the stress-board
       fields builder, the station-key list and any report-format helpers.
   - Prune imports to what is left.
   - Replace the header comment: live figures equal what every screen shows, expected values computed
     by the app, and the comparisons were retired with the old rules (quick 261018-dvu).
   - 29 → 5 tests.

D. lib/geometry/thinning-start-paths.test.ts:
   - import only `boardFigures` from `./before-after`;
   - add `LIVE_DESIGN_RULES` to the existing `./design` import;
   - its two `boardFigures(…)` calls pass `LIVE_DESIGN_RULES`;
   - leave the SITES list untouched.

E. lib/geometry/tip-flow.test.ts — remove the 12-inch-blend comparisons (founder's ruling):
   - Header comment (lines ~31–36): every check reads the live steady taper. Add that the comparisons
     with Phase 12's 12-inch blend were retired with it (quick 261018-dvu).
   - The `Measured` interface and `measureAll`:
     - drop the blend board;
     - drop the "newly pokes" field and its per-sample check;
     - drop the "fits under the blend" field;
     - keep thinner-than-tip, under-floor, fits under the steady taper, rise, rise from thickest and the
       two starts.
   - Delete describe 'acceptance 4: a start at 12" gives the same five numbers as before the tips step'
     (2 tests). Its only oracle was the blend.
   - In the acceptance 3 describe:
     - delete the test "no board newly pokes out of its blank, and no board that fits under the blend is
       refused" (2 tests);
     - the describe title drops "none newly poking or refused";
     - the `annotate` line drops the "fit under the blend" count and keeps "fit under the steady taper".
   - Every other test is untouched. 21 → 17 tests.

F. lib/geometry/phase14-curves.test.ts:
   - delete describe "no stress board flips from fitting to refused at the curves step (R5)" (1 test);
   - the header comment drops "or today's rule run in the same test …", and adds one sentence: the flip
     check compared against the curve the site drew before Phase 14 and went with it (quick 261018-dvu);
   - imports shrink to `prepareBlank` from `./blank-fit`, with no stress-set import;
   - 3 → 2 tests.

G. lib/geometry/round-tip.test.ts:
   - delete the test "leaves the pchip rule, kept by name for old boards, exactly as it was" in
     describe "roundZeroTips — width only (D3)". It only proved the old rule's width was left alone;
   - remove the retired name and `preparePchip` from the imports (no other use);
   - the `liveWidth` doc (near line 364) says "the same composition `prepareBlank` makes";
   - 30 → 29 tests.

H. lib/geometry/board-profile.test.ts — test "is the square-root rise and fall between the stations,
   not today's curve" (near line 147):
   - delete its trailing block, which builds a hand-set profile on the old curve and asserts it differs;
   - keep both exact square-root equality checks;
   - rename it "is the square-root rise and fall between the stations";
   - test count unchanged at 93.

I. scripts/check-saved-boards.ts — remove the curves report and the tips report (the todo's
   `--curves-report`, and the tips report "if a later plan adds one", which plan 14-18 did):
   - their two header paragraphs;
   - their two production command lines;
   - the dynamic import of `../lib/geometry/before-after`;
   - their two flags;
   - the move arrays and the two "could not compare" counters;
   - the two in-loop comparison blocks;
   - the two print blocks.

   Keep a blank line before the rack-report block. Everything else stays byte-identical:
   - the three summary lines;
   - `--thin-tips`, `--rack-report` and `--verbose`;
   - the exit-code rule;
   - both `...thinningStartsOf(carried)` sites. thinning-start-paths.test.ts counts exactly two.

   This script reads a database, so do not run it. tsc and lint are its gate.

J. scripts/phase14-before-after.ts keeps its path (the Arctic tape-check todo runs
   `--step curves --samples <dir>`) and becomes the LIVE side only.
   - Header: it prints the six Phase 14 picture boards' live figures. Until the showing it compared the
     old curves and 12-inch blend with the live ones for each go-live (D-15). Those rules were retired
     (quick 261018-dvu), and the before side and the tips step went with them. List the six boards as
     the old header did, and say that `--samples` writes `station_in,rocker_in,thickness_in,deck_in`.
   - Keep `SETTINGS`, `STATIONS`, the Arctic constant, `Board`, `parseArgs`, `recordOf`, `boards()`
     (the six boards, unchanged), `both()`, `verdict()` and `sampleStations()`.
   - `figureLines(board, figures)` prints, for each station:
     `<label> thickness <both(...)>; rocker <both(...)>`
     Then `litres <3 decimals>`, then `card: <formatSummaryLine(summarizeDesign(fields), "imperial")>`,
     and, for a board in a blank, `in its blank where it sits: <verdict>`.
   - `samplesCsv(profile)` writes one profile in those four columns, in inches to 4 places.
   - `main` accepts only `--step curves`:
     - with no step, it prints the plain sentence "Say which figures to print: --step curves.";
     - with any other step, it prints a plain sentence that the one step it knows is "curves" and that
       the before-and-after steps were retired with the old curves;
     - both cases set exit code 1.
     - For each board, figures come from `boardFigures(fields, LIVE_DESIGN_RULES, SETTINGS)`, and the CSV
       from `boardProfileWith(fields, LIVE_DESIGN_RULES)`.
   - Delete:
     - the fixture board and its constant;
     - `fine()`;
     - the whole tips step: start phrases, start lines, fixture lines, thin-centre lines, stress samples,
       both tolerances, the stress measure type and function, stress lines and `tipsStep`;
     - every import only they used.
     The tips step's live-side counts (where tips start, thin, rise, fit on the stress set) are still
     recorded on every run by tip-flow.test.ts's annotation.

Commit: `refactor(quick-261018-dvu): retire the before-and-after reports and tests that compared the old curve and the 12-inch tip blend with today's, kept only for the showing`
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run lib/geometry && npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves | grep -c '^== ' && ! npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step tips && ! grep -rnE 'RULES_BEFORE_CURVES|RULES_BEFORE_TIPS|RULES_LIVE|curves-report|tips-report|compareFigures|summarizeMoves|movesReportLines|tipsReportLines' lib scripts components app --include=*.ts --include=*.tsx</automated>
  </verify>
  <acceptance_criteria>
    - Per-file test counts (`npx vitest list <file> | wc -l`): before-after 5, tip-flow 17, phase14-curves 2, round-tip 29, board-profile 93, thinning-start-paths 14, root-curve 18, phase14-preset-figures 9.
    - `scripts/phase14-before-after.ts --step curves` exits 0 and prints 6 `== ` headings. With `--samples <a scratch dir outside the repo>` it writes 6 CSVs, each starting `station_in,rocker_in,thickness_in,deck_in`. `--step tips` exits 1 with a plain sentence.
    - `grep -c 'thinningStartsOf(' scripts/check-saved-boards.ts` prints 2. `grep -c 'thinningStartsOf(' lib/geometry/before-after.ts` prints at least 1.
    - `npx tsc --noEmit` exits 0, and `npx eslint lib/geometry scripts` prints nothing.
    - Exactly 39 tests and 2 files fewer than the base run (5,759 → 5,720 at e74dddc2).
  </acceptance_criteria>
  <done>No test or script compares against the old rules any more. The live figures, the tape-check samples and the saved-boards check (without its two retired reports) all work. Committed.</done>
</task>

<task type="auto">
  <name>Task 3: Remove the old blank curve, the old hand-set curve and the 12-inch tip blend from the board maths</name>
  <files>lib/geometry/blank-fit.ts, lib/geometry/root-curve.ts, lib/geometry/board-profile.ts, lib/geometry/design.ts, lib/geometry/round-tip.ts, lib/geometry/design.test.ts, lib/geometry/rack-art.test.ts, components/rocker/blank-flag.tsx</files>
  <read_first>lib/geometry/blank-fit.ts lines 1–60, 66–75, 140–220, 255–300, 340–600 (boardOnBlank whole), 895–925 (the comment above tweakExceedsDeckSkin); lib/geometry/root-curve.ts lines 40–56; lib/geometry/board-profile.ts lines 30–45, 165–215, 320–390; lib/geometry/design.ts lines 15–40, 205–300; lib/geometry/round-tip.ts lines 55–66; lib/geometry/design.test.ts lines 82–106; lib/geometry/rack-art.test.ts lines 152–168; components/rocker/blank-flag.tsx lines 1–35</read_first>
  <action>
The library loses the old rules (Phase 14 D-25, retired by the founder's ruling). This task moves code;
it does not rewrite it. The live branch keeps the same expressions in the same order, so no number moves.

1. lib/geometry/blank-fit.ts
   - Header:
     - "today's pchip inside it" becomes "pchip inside it";
     - delete the sentence saying the old pchip rule survives by name;
     - "On the live rule the width's 0-wide tips are round" becomes "The width's 0-wide tips are round";
     - delete the sentence saying Phase 12's S-shaped ease survives by name.
   - Delete the 12-inch ease-window constant and its comment. `MEASURE_STATION_MM` stays imported:
     `boardOnBlank`'s `S12` reads it.
   - The `./root-curve` import drops the curve-rule type. The `./tip-taper` import drops
     `thinningStartRange`; only the blend branch used it.
   - `attributeCurve` loses its rule parameter and always returns `prepareRootCurve(points, kind)`.
     Update its doc to say it is drawn with the square-root rule running the way `kind` says.
   - Fold the private prepare-with-a-rule helper into `prepareBlank` itself. Merge the two doc comments:
     - this is the one preparation every screen, the blank list, the flag, the rack and preset cards and
       the saved-boards check use (Phase 14 D-13);
     - the bottom is the square-root rise, thickness and width the square-root fall;
     - every printed station is read exactly, and the rocker is levelled over the blank;
     - the record is copied first;
     - it throws on a blank with no C thickness.
     The width is always `roundZeroTips(widthCurve)`, with the comment "A tip printed 0 wide is drawn
     round (D3)."
   - Delete the exported old-curve function and its doc.
   - `BoardOnBlankInput` loses its tip-rule field and doc. Delete the tip-rule type and its doc.
     `BoardOnBlank` loses its "the tip rule the board was cut with" field.
   - Delete the S-ease helper function.
   - In `boardOnBlank`'s doc, delete the "Under the blend rule… line for line as Phase 12 wrote it"
     sentence.
   - In `boardOnBlank`'s body:
     - delete the rule constant and the four `let` declarations;
     - move the steady branch's statements up to the function's own level, unchanged and in the same
       order;
     - declare `tips`, `derivedThicknessAt`, `tipThinningAt` (with its parameter typed `(s: number)`)
       and `automaticThicknessAt` with `const`;
     - delete the whole else-branch (the S-ease, its window and its fixed tip views);
     - the returned object loses its tip-rule entry.
   - Leave the body of `tweakExceedsDeckSkin` exactly as it is. In its doc comment, change only the
     paragraph "It is conservative in one corner (Phase 14): …" (near lines 914–918). Its last sentence,
     "Recorded for the founder to decide after the showing, in the pending todo for retiring today's
     curve and 12" blend.", becomes a sentence saying the founder decided on 2026-10-18 to keep this
     quick refusal: a little cautious in that rare Tip Style Bottom corner, but instant. Keep the corner's
     description and the 30-second reason. Every other line of that comment stays as it is.

2. lib/geometry/root-curve.ts: delete the curve-rule type and its doc comment. `RootKind` stays.

3. lib/geometry/board-profile.ts
   - Imports drop the tip-rule type, the curve-rule type and `preparePchip`. Only the old hand-set curve
     used `preparePchip`.
   - `buildFallbackProfile` becomes the body itself:
     - rocker `levelCurve(prepareRootCurve(rockerPoints, "rise"), 0, length)`;
     - foil `prepareRootCurve(foilPoints, "fall")`;
     - the rest unchanged.
     Delete the private with-a-rule helper and its doc.
   - `BoardProfileInput.blank` loses its tip-rule field and doc. `BoardProfileInput` loses its hand-set
     curve field and doc.
   - `buildBoardProfile` returns `buildFallbackProfile(rocker, foil, length)` when there is no blank, and
     no longer spreads a tip rule into the board input.

4. lib/geometry/design.ts
   - Imports drop the tip-rule type and the curve-rule type import.
   - `DesignRules` keeps only `prepare`. Rewrite its doc:
     - it says how a blank's catalogue rows become the curves the board is cut from;
     - every screen uses the live preparation;
     - a hand-set board is always drawn with the square-root rule and every tip with the steady taper,
       since the curve and 12-inch blend the site used before Phase 14 were retired after the Oct 10
       showing (quick 261018-dvu).
   - `LIVE_DESIGN_RULES = { prepare: prepareBlank }`. Trim its doc to the preparation.
   - `designSideProfile` drops its two lines that pass a tip rule and a hand-set curve.
   - `summarizeDesignWith`'s doc reads "with the blank preparation passed in".
   - `DesignRules` is deliberately KEPT with one field. Folding it away would touch
     components/rocker/custom-rocker-drawing.tsx, lib/models/rack-models.ts and five tests that pass
     `LIVE_DESIGN_RULES`, and it is outside the founder's brief.

5. lib/geometry/round-tip.ts: reword the header paragraph "Width only (D3).":
   - `prepareBlank` (not the folded helper) wraps the width curve and nothing else;
   - the hand-set foil helper is named `buildFallbackProfile`;
   - delete the sentence about the old rule being untouched.

6. lib/geometry/design.test.ts (near line 103): the explicit rules object is `{ prepare: prepareBlank }`.
   The test still checks that `summarizeDesign` equals the pipeline on `prepareBlank`.

7. lib/geometry/rack-art.test.ts (near line 160): the direct `buildBoardProfile` call drops its
   hand-set-curve argument line. The live rule is the only one. The assertions are unchanged.

8. components/rocker/blank-flag.tsx, comment only. In the header's bullet "Ahead of all of these: a 12"
   fine-tune on the Deck bigger than the board's Deck Skin…" (near lines 21–27), the closing clause
   "— recorded in the pending todo for retiring today's curve and 12" blend." becomes a clause saying
   the founder decided on 2026-10-18 to keep this quick refusal: a little cautious in that rare corner,
   but instant. Change no other line, and no code, in this file.

Commit: `refactor(quick-261018-dvu): remove the pre-Phase-14 blank curve, the old hand-set curve and the 12-inch tip blend from the board maths — no board's numbers change`

Then write the SUMMARY. Write it in plain English for the founder, saying what changed on the board or
the screen (nothing) and what left the code. Include:
- the three commits;
- the test totals (base versus now);
- the 39 removed tests by file;
- the rewritten tests;
- that the pin and its generator are kept;
- that the Arctic tape-check command still works, with its CSV now holding one set of live columns
  instead of before/after pairs;
- that the founder's 2026-10-18 deck-tweak decision (keep the quick refusal) is now recorded in the two
  comments that used to point at the todo, with the refusal's code unchanged.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run lint && npx vitest run && ! grep -rnE 'prepareBlankPchip|handSetCurve|tipRule|TipRule|TIP_EASE_WINDOW_MM|RULES_BEFORE_CURVES|RULES_BEFORE_TIPS|RULES_LIVE|CurveRule|curves-report|tips-report|"blend"|"pchip"|prepareBlankWith|fallbackProfileWith|smoothstep' lib scripts components app --include=*.ts --include=*.tsx --include=*.mjs && git diff --quiet "$BASE" -- lib/geometry/__fixtures__ scripts/extract-phase14-today-golden.ts lib/models app && test "$(git diff --name-only "$BASE" -- components)" = "components/rocker/blank-flag.tsx" && ! git diff -U0 "$BASE" -- components/rocker/blank-flag.tsx | grep -E '^[-+][^-+]' | grep -vE '^[-+] \*' && diff <(git show "$BASE":lib/geometry/blank-fit.ts | awk '/^export function tweakExceedsDeckSkin/,/^}/') <(awk '/^export function tweakExceedsDeckSkin/,/^}/' lib/geometry/blank-fit.ts) && ! grep -n 'decide after the showing' lib/geometry/blank-fit.ts components/rocker/blank-flag.tsx</automated>
  </verify>
  <acceptance_criteria>
    - The full `npx vitest run` passes with exactly 2 files and 39 tests fewer than at the base: 154 files, 5,720 passed, 2 skipped when the base is e74dddc2. If the sibling fins task merged first, use the base's own totals minus 2 and 39.
    - `npx tsc --noEmit` exits 0 and `npm run lint` exits 0.
    - The grep gate above prints nothing. It covers every .ts/.tsx/.mjs under lib, scripts, components and app, including `__fixtures__/*.ts` and the pin generator, which name none of these. The pin's JSON is kept on purpose and is outside the gate's file types.
    - `git diff --quiet "$BASE" -- lib/geometry/__fixtures__ scripts/extract-phase14-today-golden.ts lib/models app` exits 0.
    - `git diff --name-only "$BASE" -- components` lists exactly `components/rocker/blank-flag.tsx`, and every changed line in it is a ` *` comment line.
    - The body of `tweakExceedsDeckSkin` is byte-identical to the base (the awk extract diff is empty).
    - Neither deck-tweak comment says "decide after the showing" any more; both say the founder decided on 2026-10-18 to keep the quick refusal.
    - lib/geometry/phase11-foil.test.ts, lib/models/design-snapshot.test.ts and lib/models/saved-board-open.test.ts pass with their expected values unchanged from the base.
  </acceptance_criteria>
  <done>The board maths has one blank curve, one hand-set curve and one tip rule. Every saved board, Phase 11 board, preset card and rack card reads exactly what it read before. The pin and its generator are kept. Committed, and the SUMMARY is written.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| stored board snapshot → geometry | a shaper's saved board (Phase 11 boards included) is turned into the numbers they cut foam to |
| production database → scripts/check-saved-boards.ts | a read-only, founder-run check that reads every saved board; this task removes two of its report options |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-dvu-01 | Tampering (integrity of a shaper's numbers) | `phase11TwelveInch` / `carryPhase11Blank` in lib/geometry/phase11-foil.ts | high | mitigate | private `phase11Thickness` runs the same pchip over the same knots in the same order as the retired preparation; phase11-foil.test.ts (39 v1.3 golden cases, `toBe`), design-snapshot.test.ts and saved-board-open.test.ts pass with expected values unchanged; no fixture re-pinned (`git diff --quiet` gate); plan-time probe byte-identical over 7,884 conversions |
| T-dvu-02 | Tampering (integrity of live figures) | `prepareBlank`, `boardOnBlank`, `buildBoardProfile`, `designSideProfile` | high | mitigate | the live branch is moved to function level unchanged (same expressions, same order); only dead branches deleted; the full suite (preset figures, rack art, pinned round-nose and custom-rocker goldens, thinning-start paths) must pass with 39 tests fewer and no others touched |
| T-dvu-03 | Information disclosure | scripts/check-saved-boards.ts | low | accept | removing the curves and tips reports only removes output; the remaining lines are byte-identical (counts and board ids only, never a snapshot, name, user id or connection string) |
| T-dvu-04 | Repudiation (loss of the record) | the Phase 14 pin and its generator | low | mitigate | `phase14-today-golden.json`, `__fixtures__/phase14-today.ts` and `scripts/extract-phase14-today-golden.ts` byte-identical to base (`git diff --quiet` gate); still read by root-curve.test.ts and phase14-preset-figures.test.ts |

No packages are installed, so there is no supply-chain row.
</threat_model>

<verification>
- After Task 3: `npx tsc --noEmit`, `npm run lint` and the full `npx vitest run` pass. The totals are 2 files and 39 tests fewer than the base.
- The removed-names grep gate prints nothing.
- The fixture, model and app folders and the pin generator are unchanged from the base. Under components/ only the comment in blank-flag.tsx changes.
- The body of `tweakExceedsDeckSkin` is untouched, and its two comments record the founder's 2026-10-18 decision.
- `scripts/phase14-before-after.ts --step curves --samples <scratch dir>` writes the six live CSVs.
</verification>

<success_criteria>
- The old curve, the hand-set pchip option and the 12-inch blend are gone from the code (the todo's "Done when", section 1).
- Phase 11 boards and saved boards open to exactly the numbers they open to today, proven by the three named suites with unchanged expected values.
- The pin file and its generator are kept as the record of the site before Phase 14.
- Three plain-English commits; nothing else in the repo moves.
</success_criteria>

<output>
Create `.planning/quick/261018-dvu-retire-the-old-bottom-curve-the-hand-set/261018-dvu-SUMMARY.md` when done.
</output>
