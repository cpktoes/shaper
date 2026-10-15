---
phase: 14-realistic-surfboard-flow
verified: 2026-10-02T23:59:00Z
status: human_needed
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Founder's rehearsal walk on real devices (Phase 13 item 13, 13-UAT.md) on the live site exactly as the shapers will see it, before the freeze on Wednesday 2026-10-07 evening. Walk ROCKER with a blank picked, VOLUME, RAILS, the DATASHEET and the Summary on a real iPhone and a real Android phone."
  - expected: "The curves and tips read as a real surfboard flows, nothing looks broken or newly odd, and the founder signs off the result. This is the second half of SPEC acceptance 9 (the first half, picking the taper's final shape from pictures, is done: D-01 and D-13)."
  - why_human: "Acceptance 9 says the founder walks the result on real devices. Only a person holding a real phone can do that, and the walk is due now (D-17)."
  - test: "In Metric on a real phone, look at both ends of a Nose Thinning Starts slider and a Tail Thinning Starts slider, then press the arrow keys (or a keyboard on a tablet) from an Automatic thumb that sits between whole centimetres (Automatic's 25 1/2 inch start is 647.7 mm)."
  - expected: "A start set at 6 inch in Imperial reads 15.2 cm over a thumb at the slider's left end; the right end reads a whole centimetre just inside half the board; the arrow keys step cleanly from the off-grid thumb with no jump back or snap on first press; nothing is rewritten by looking."
  - why_human: "The Metric range ends sit up to 7.6 mm inside the Imperial range and an Automatic start can sit off the 10 mm grid. How the thumb and keys feel is a look-and-feel check (backstop truth in 14-11 and 14-18); Node tests prove the numbers, not the feel."
  - test: "Print page 2 of the Summary order form from the live site on Letter and A4 (and a phone print width) with a blank picked, and read the Planing box."
  - expected: "The Planing box shows the line 'Thinning starts from the tip: nose X, tail Y.' (in Metric the unit is printed once at the end), on two lines at most, wrapping before 'nose' on the narrowest widths, and the whole PLANING panel stays inside its box on real paper."
  - why_human: "The print-fit browser test proves the box fits on emulated papers and phone widths; only a printed sheet proves it on real paper (backstop truth in 14-16 and 14-18)."
  - test: "On a real iPhone and a real Android phone, with the blank list open, drag a Thinning Starts slider, slide Placement end to end and change a tip setting."
  - expected: "The blank list and the fit flag stay responsive while Automatic recomputes at every placement; no stutter or freeze."
  - why_human: "Automatic's cost is measured in Node (under a second for the whole catalogue list, tens of milliseconds in practice) but WebKit and a real phone's CPU are unmeasured (backstop truth in 14-13 and 14-18)."
  - test: "On a computer in each of the four themes (Daylight, Chalk, Slate, Phosphor), look at ROCKER's drawing with a blank picked and a 12 inch start."
  - expected: "The faint dashed Thinning Starts mark reads as its own line and can be picked out where it meets a 12 inch leader. The founder already noted at go-live 2 that it is hard to pick out on a computer at a 12 inch start (the design predicted it) and asked for no change; confirm that is still acceptable for the showing."
  - why_human: "Legibility of a faint mark is a judgment by eye (backstop truth in 14-15)."
  - test: "Founder's eye on the two re-recorded desktop reference pictures (ROCKER and VOLUME of the first board a visitor sees, about 30.06 to 30.51 L) and on the thin-board corner (a 1 to 1 1/4 inch centre on the Arctic Foam 7'9\" SBF fits and its tail reads below the centre)."
  - expected: "The founder accepts what moved. The curves step's pictures were shown before go-live 1 and the thin-board corner before go-live 2 (the founder ruled 'leave it for the showing'); this is the confirmation that the shipped result is still what they want in front of the room."
  - why_human: "Backstop truths in 14-06 and 14-18 hold these out as a founder look; the decision on the thin-board rule is a pending todo for after 2026-10-10."
unverified_prohibitions:
  - statement: "MUST NOT push, merge to main, deploy or run anything against production without the founder's go, and nothing but rehearsal fixes after the freeze on Wednesday 2026-10-07 evening"
    flag: "unverified-prohibition — human review recommended"
    llm_judge_verdict: "Non-authoritative: main is exactly the two documented --no-ff merges (b3c2d9a second parent adffc5d, 9468fd5 second parent 50eea48) and no code on the surfboard-flow branch differs from main; the summaries record the founder's explicit go for each. The go itself is not checkable from the repository, and it is still before the freeze (today is 2026-10-02)."
  - statement: "MUST NOT add a package and MUST NOT leave a scratch script loose under the repo or .planning/"
    flag: "unverified-prohibition — human review recommended"
    llm_judge_verdict: "Non-authoritative: git diff ed39f4a..HEAD is empty for package.json, package-lock.json, drizzle/, lib/db/ and db/seed/; no .ts, .cjs, .mjs, .js, .py or .sh file was added under .planning/; git status was clean at the start. Scratch is archived in 14-research-scratch.tar.gz."
  - statement: "MUST NOT show a notice, a marker or a \"what's new\" for redrawn boards (D-19)"
    flag: "unverified-prohibition — human review recommended"
    llm_judge_verdict: "Non-authoritative: a grep of components/ and app/ for what's new, redrawn, new curves and similar finds no user-facing text; the new words are the UI-SPEC's (Thinning Starts rows, hints, too-close line, THINNING STARTS, From tip, the printed line). The SPEC's named verification (a browser test of no new text on opening a saved board) was not written as such; the proof is the absence in the code plus the unit test that opening writes nothing."
---

# Phase 14: Realistic Surfboard Flow Verification Report

**Phase Goal:** Every curve a shaper cuts foam to flows the way a real surfboard does: a blank's bottom, thickness and width are drawn between their printed stations by the rule that redraws real blanks most closely, a hand-set board is drawn by the same rule, and a board's thickness runs down steadily into each tip, never thinner on the way than the tip itself, built and live before the founder shows the app on Saturday 2026-10-10.
**Verified:** 2026-10-02
**Status:** human_needed
**Re-verification:** No, initial verification

The code does what the goal says, and both steps are on `main`. Nothing failed. The only open items are the founder's own walk on real devices (the second half of SPEC acceptance 9) and look-and-feel checks the plans deliberately held out.

## Goal Achievement

There is no `.planning/REQUIREMENTS.md` and the ROADMAP lists no separate success criteria for Phase 14, so the contract is the SPEC: its nine acceptance criteria, edges and prohibitions, plus the decisions D-01 to D-28.

### Observable Truths (SPEC acceptance 1 to 9)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 162 catalogue blanks: bottom, thickness and width read the printed value exactly at every station and never leave the two stations either side | VERIFIED | `lib/geometry/root-curve.ts` (`prepareRootCurve`: pchip through signed square roots, squared back; `sample` returns the printed value at a station). `root-curve.test.ts` walks `readSeedCatalog()` (every record, `visited === CATALOG.length`) with `toBe` equality at each station and 200 samples per interval for the range check. `phase14-curves.test.ts` repeats it through the app's own `prepareBlank` on every pickable blank. I ran both: pass. |
| 2 | Each blank's lowest point on the new bottom is its lowest printed station | VERIFIED | `prepareBlankWith` levels the rocker with `levelCurve`; `root-curve.test.ts` acceptance-2 block (every blank, ties from the data, lowest-first/last synthetic) and `phase14-curves.test.ts` ("levels every pickable blank's bottom ... reads exactly 0") pass. |
| 3 | Stress set (1,635 boards) on Automatic: nobody thinner than its tip, none under 1/4", no new hump except the twelve on the US Blanks 9'9"B, none newly pokes out, none newly refused | VERIFIED | `tip-flow.test.ts` acceptance 3. I ran it with the verbose reporter and read the test's own annotation: boards 1635; tips 3270 (2912 at 12", 218 at 12-18", 97 at 18-24", 43 at 24-36", 0 over 36", furthest 32.5"); 249 boards whose two tips differ; rise over 1/64" on 12 boards, all US Blanks 9'9"B (exception list computed from the data); fit under the blend 1418, under the steady taper 1428 (ten freed, none newly refused). These match D-01/D-03/D-20 figures exactly. The buildable subset (1,344) is reported beside it (D-27). |
| 4 | With a start at 12", a board's five station numbers equal those before the tips step | VERIFIED | `tip-flow.test.ts` acceptance 4: both starts set by hand at 12" vs `tipRule: "blend"`, `Object.is` on five thicknesses and five rocker numbers, on both sets. Passes. Code path: `steadyTaper` at W = 12" returns `cut.at` / `unthinned`, same as the blend at the 12" station. |
| 5 | Presets: every station within 0.015" of today's; litres re-recorded from the app, not typed | VERIFIED | `phase14-preset-figures.test.ts` compares live figures with the generated pin against `inchesToMm(0.015)` unrounded and checks the record equals the live app's `presetSummary` litres (`toBe`). Passes. Fixture header says GENERATED by `scripts/extract-phase14-preset-figures.ts --step tips`; litres 29.562 / 35.313 / 50.401 / 75.311 agree with the live cards the go-live summary reports (29.6 / 35.3 / 50.4 / 75.3). |
| 6 | A Phase 11 saved board converts to exactly the numbers it converts to today | VERIFIED | `git diff ed39f4a..HEAD` on `lib/geometry/phase11-foil.test.ts` and `lib/models/design-snapshot.test.ts` is empty (unmodified). `phase11-foil.ts` changed only to re-prepare the blank through `prepareBlankPchip(prepared.record)`, so editing the live rule cannot move it. Both files pass. |
| 7 | A saved board opens with what it stores unchanged and nothing is written by opening it | VERIFIED | `saved-board-open.test.ts` (deep-frozen inputs, Phase 11 / hand-set / blank boards, corrupt and absent starts, version-6 rollback case) passes. `design-snapshot.ts` diff: two optional, `.catch(undefined)` fields, `withoutAutomaticStarts` removes empty keys, version stays 5. No change under `drizzle/`, `lib/db/`, `db/seed/`. |
| 8 | A hand-set board with today's default numbers draws through the same five rocker numbers and five thicknesses, to the last bit | VERIFIED | `root-curve.test.ts` ("the first board a visitor sees reads its five rocker numbers and five thicknesses exactly (acceptance 8)", `toBe`, low point exactly 0) and `phase14-today-handset.test.ts` (today's curve by name reproduces the pin; litres move on the live rule) pass. `board-profile.ts` `buildFallbackProfile` uses `prepareRootCurve` rise / fall. |
| 9 | The founder has picked the taper's final shape from pictures AND walked the result on real devices before the freeze | UNCERTAIN (human) | First half done: D-01 records the founder's pick from `pictures/tip-taper-three-shapes.png`; D-13 from `curve-inside-the-rule.png`; both files exist. Second half is the rehearsal walk, "due now" per the go-live 2 summary; it cannot be done by an agent. See `human_verification` in the frontmatter. |

**Score:** 8/9 truths verified; 0 present-but-behavior-unverified (every state-transition and ordering truth, such as Automatic never reversing as Placement slides, undo keys per tip, Reset Fine-Tune leaving starts alone, has a named test that passes). The ninth is waiting on the founder.

### Requirements Coverage (SPEC R1 to R9; no REQUIREMENTS.md, the SPEC is the requirements file)

Every ID R1 to R9 appears in at least one plan's `requirements:` field; none is orphaned (R1: plans 01, 04, 09; R2: 01, 04, 10; R3: 03, 04; R4: 01, 03, 05, 10; R5: 04; R6: 06, 08 to 17; R7: 08, 09, 15, 17; R8: 01, 02, 04, 05, 07 and others; R9: 01, 02, 05, 07, 08, 11, 13 and others).

| Req | Statement | Status | Evidence checked |
|-----|-----------|--------|------------------|
| R1 | Curves never hump and always flow (thickness never rises toward a tip; bottom never leaves the range between stations) | SATISFIED | Truth 1 range check on all 162 blanks. Truth 3: no board rises toward a tip except the 12 on the 9'9"B, and `fallsSteadily` plus `riseFromThickest` assert exactly no rise from the thickest printed station to either tip on all 1,635 boards. Live rule is wired: `prepareBlank` = `prepareBlankWith(record, "root")`. |
| R2 | Bottom drawn by the square-root rise; chosen by measurement with US Blanks as muse | SATISFIED | `attributeCurve(... "rise")` for rocker. `root-curve.test.ts` measurement block: against the pinned hidden US Blanks stations, the root rule's mean miss is lower than today's for the bottom, thickness and width, and closer on more than half of the distinct curves (computed from the pin, not typed). The precise 0.035" vs 0.112" figures live in the research record and are not asserted as numbers. |
| R3 | Deck plan: thickness by the square-root fall from the thickest station; the deck stays bottom plus thickness, no third curve | SATISFIED | `attributeCurve(... "fall")` for thickness; `BoardOnBlank.thicknessAt` / `rockerAt` only; no deck curve in `blank-fit.ts`. 9'9"B drawn as printed (D-14), test computes the exceptions from the data. |
| R4 | A board follows the best curves; a hand-set board uses the same five-point model | SATISFIED | Blank board follows `prepared.rocker` / `thickness` (new rule). `fallbackProfileWith(..., "root")` draws five typed rocker numbers with the rise and five thicknesses with the fall, exact at the stations; `foil.ts` thickness lookup also uses `prepareRootCurve(... "fall")`. Remove This Blank clamps seeded lifts into the hand-set range (review fix WR-02 part 1). |
| R5 | Blank width joins | SATISFIED | `width: attributeCurve(... "fall")` in `prepareBlankWith`; `phase14-curves.test.ts` "no stress board flips from fitting to refused at the curves step". Per D-13, today's pchip stays callable by name inside the rule only for pin/reports. |
| R6 | Tip thinning start is automatic and settable (6" to centre) | SATISFIED | `tip-taper.ts` (`automaticStart`: 12" first, then each half inch to the range's far end, fallback 12"; `thinningStartRange` 6" to half length rounded in; `pullThinningStart` on read). Store: `setThinningStart` (one undo key per tip), `setThinningStartAutomatic` deletes the key. UI: `ThinningStartRow` x2 closing THICKNESS after Tip Style, slider plus Automatic button, hidden with no blank. Shown in the drawing (`rocker-viewer.tsx` marks), DATASHEET (THINNING STARTS block), printed order form (`planing.thinning` line). Metric via `formatThinningStart` / `formatDim` in `units.ts`, no other 25.4 or 10 in the diff. |
| R7 | Steady taper into each tip, off the named surface, replacing the S-blend | SATISFIED | `steadyTaper` is D-01's parabola; `boardOnBlank` default `tipRule` "steady"; `"blend"` kept by name for pin / reports (D-25). `tip-flow.test.ts` covers Tip Style, Deck Skin, tweak independence and the 12" nudge (D-04), the runs-out reasons, Placement ends, and a no-flicker walk of Placement in 1/16" steps. |
| R8 | Saved boards redraw; nothing rewritten; printed stations never move | SATISFIED | Truth 7 and 6. No seed or catalogue file changed (`git diff ed39f4a..HEAD -- db/seed lib/blanks` empty). Pin carries its blank rows by value (`phase14-today.test.ts`). Rollback edge: version-6 board parses on the curves release's reader (`saved-board-open.test.ts`). |
| R9 | Both steps live before the freeze, with two go-lives and read-only reports | SATISFIED | `main` is `9468fd5`; first parent chain through `b3c2d9a` (second parent `adffc5d`) and `9468fd5` (second parent `50eea48`). `git diff main HEAD` excluding `.planning` is empty, so the branch's code is the live code. Go-live 1's diff (`ed39f4a..adffc5d`) touches no tip code: `blank-fit.ts` there still has only the smoothstep blend and no `tipView`, no `tip-taper.ts`, no `slopeAt` on the root curve (D-28). Reports (`check-saved-boards.ts --curves-report` / `--tips-report`) read once and print counts and maxima only (I did not run them). The founder's own walk remains (truth 9). |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/geometry/root-curve.ts` | Square-root rise / fall, exact at stations, slope | VERIFIED | 111 lines, pure, imports only `./pchip`; wired into `blank-fit.ts`, `board-profile.ts`, `foil.ts` |
| `lib/geometry/tip-taper.ts` | Starts, Automatic, steady taper, too-close flag | VERIFIED | 226 lines, imports only `./outline` and `./units`; wired through `boardOnBlank` `tipView` |
| `lib/geometry/blank-fit.ts` | Live rule + named pchip / blend, per-tip starts | VERIFIED | `prepareBlank` root, `prepareBlankPchip`, `thinningStartsOf`, `tipRule` |
| `lib/models/design-snapshot.ts` | Tolerant two-field start, version 5 | VERIFIED | `.optional().catch(undefined)`, `withoutAutomaticStarts` |
| `components/rocker/rocker-controls.tsx` and store | Thinning Starts rows, mutators | VERIFIED | Two rows after Tip Style; `setThinningStart` / `setThinningStartAutomatic` wired from `rocker-editor.tsx` |
| `rocker-viewer.tsx`, `rocker-datasheet.tsx`, `order-form.tsx` | Mark, THINNING STARTS, printed line | VERIFIED | All read `blank.tips` / `planing.thinning` from the single side profile |
| `lib/geometry/__fixtures__/phase14-today-golden.json` + generator | Pin of today's numbers at `ed39f4a` | VERIFIED | Generated, 24,615 lines (about 1.2 MB, accepted as a judgment call); reproduced by `phase14-today.test.ts` |
| `lib/geometry/__fixtures__/phase14-preset-figures.json` | Presets' recorded litres from the app | VERIFIED | Header marks it GENERATED; test equality against live |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `prepareBlank` -> every screen, list, flag, cards, reports | root rule | WIRED | single function, `.map(prepareBlank)` safe (separate named function for pchip) |
| Phase 11 conversion -> frozen pchip | `prepareBlankPchip(prepared.record)` | WIRED | `phase11-foil.ts` |
| store `blank.<end>ThinningStart` -> `boardOnBlank` -> profile -> viewer / datasheet / order form / flag / list | `thinningStartsOf` | WIRED | `thinning-start-paths.test.ts` asserts the same board through every path |
| Automatic -> store | never stored | VERIFIED | grep: no code path writes `automaticStart` / `fromTip` into the blank; `setThinningStartAutomatic` deletes the key |

### Data-Flow Trace (Level 4)

Every value on the new screens (rows, marks, DATASHEET cells, printed line) comes from `blank.tips.<end>` on the one side profile built from `boardOnBlank`, which reads the stored starts and the prepared blank. No static, hardcoded or mock source found. FLOWING.

### Behavioral Spot-Checks (single files only; full suite and Playwright not re-run, as instructed)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Stress set, acceptance 3 / 4, runs-out reasons, Automatic smoothness | `npx vitest run lib/geometry/tip-flow.test.ts ...` plus five other files | 6 files, 63 tests passed | PASS |
| Curves, pin, hand-set, snapshot, taper, reports, store | `npx vitest run root-curve phase11-foil design-snapshot board-profile thinning-start-paths tip-taper before-after design-store` | 8 files, 267 tests passed | PASS |
| Stress-set size and exception | verbose reporter annotation | 1,635 boards; 12 rise on US Blanks 9'9"B only | PASS |

### Probe Execution

SKIPPED. The phase declares no `probe-*.sh` scripts (none under `scripts/*/tests/`).

### Anti-Patterns Found

None. Added lines in non-fixture code contain no TBD / FIXME / XXX / TODO / HACK / placeholder markers; no empty or static-return stubs on the new paths.

### Edge Coverage and Prohibitions

- All 27 SPEC edges map to a named test or are held out as a backstop (listed in `human_verification`). The three backstops that are looks-only: the Metric slider ends and off-grid thumb, the printed starts line, the blank list feel on a phone, and the desktop reference pictures.
- Desktop baselines: only `rocker-desktop` and `volume-desktop` PNGs changed since `ed39f4a` (as the SPEC predicts); RAILS, FINS and TEMPLATE untouched.
- Test-tier prohibitions (Phase 11 conversion on the frozen rule; no stations moved; no DB or package change; no stored Automatic start; no tips code in go-live 1; 12" start leaves five numbers equal; Automatic ignores tweak, skin and Tip Style; no third deck curve; 0.015" bound untouched; Reset Fine-Tune leaves starts; units through `units.ts`) all have passing tests or empty diffs as listed above. Judgment-tier prohibitions carry the `unverified-prohibition` flag in the frontmatter.

### Human Verification Required

Seven items are in the frontmatter, in the order a person would do them. The first (the real-device rehearsal walk) is the one the phase goal names; the rest are the look-and-feel checks the plans held out on purpose.

### Gaps Summary

No gaps. Notes for the founder's awareness, none of which blocks the phase:

- **Thin-board corner (judgment 1, accepted).** On the default 6'0" board only the Arctic Foam 7'9" SBF with a 1 to 1 1/4" centre can end with its tail below its own centre. The review's WR-02 part 2 is the founder's call; they ruled "leave it for the showing" and a pending todo records the decision for after 2026-10-10. Consistent with D-20.
- **Pin fixture size (judgment 3, accepted).** 1.2 MB against plan 14-01's 450 KB target.
- **Cautious refusal corner (judgment 4, accepted).** Tip Style Bottom, a Deck tweak over the skin and a hand-set start past 12": documented in `blank-flag.tsx` and the summaries; exact on Automatic (review probe on 53,550 boards).
- **Today's curve and the 12" blend stay callable (judgment 5, accepted per D-25).** Pending todo `2026-10-03-retire-todays-curve-and-12-inch-blend-after-the-showing.md`. They are reachable only by name (`prepareBlankPchip`, `tipRule: "blend"`, `handSetCurve: "pchip"`) from the Phase 11 conversion, the pin's test, the reports and pictures; the live default for every screen is the new rule.
- **D-19 proof form.** The SPEC asked for a browser test of "no new text on opening a saved board"; none was written. The outcome holds by absence of any such text in `components/` and `app/` and by the unit proof that opening writes nothing. Low risk.
- **Review items recorded.** WR-01 (spoken names on the two new sliders) and WR-02 part 1 are fixed with tests; the app-wide slider-name gap and IN-06 (one real-board litres check now 3.30% off the maker's figure, inside its 10% tolerance) are recorded for after the showing.

---

_Verified: 2026-10-02_
_Verifier: Claude (gsd-verifier)_
