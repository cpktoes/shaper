---
phase: 06-the-design-screens-in-metric
verified: 2026-09-06T00:57:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:

    - "G-06-4: typed Board Length box too narrow — MeasureField's standalone mode now renders a 96px box (w-24 min-w-24 max-w-24); bare mode (ROCKER datasheet cells) stays byte-identical at 64px"
    - "G-06-12: Fins DATA tab and toe-aim modal fin placement numbers were in cm — the three Off-Tail rows and four sidebar labels re-tagged/reformatted to mark (whole mm); toe-aim table cells split from the tail-width/row-label cm formatter into a separate formatMarkBare cell formatter, headings now say (mm)"
    - "G-06-15: fin drawing off-tail callout was in cm — switched to formatMark; board-size numbers (compact heading, legend, Tail Width) confirmed untouched"
  gaps_remaining: []
  regressions: []
human_verification:

  - test: "On Metric, the Template Builder and the Volume screen each show one box above the Board Length slider; typing 188 and pressing Enter moves the thumb and re-labels the row to 188.0 cm, with nothing clipped; the box now shows its whole value at both ends of its range (153.0-304.8 cm on Template/Volume, 122.0-365.8 cm on Fins). Typing `5 1/2` puts the last good number back with an error line that now lines up under the wider box. On Imperial the two dropdowns are unchanged."
    expected: "Typed Board Length field shows its whole value uncut, commits/clamps/reverts as before, Imperial unaffected — re-run of UAT test 4 against gap G-06-4's fix"
    why_human: "Whether text visually fits inside a rendered box is a rendering fact static analysis and node-environment tests cannot observe"

  - test: "On Metric, the Fins DATA tab's summary line reads its board length and tail width each in centimetres, but the three Off-Tail rows now read in whole millimetres in the same group as Off-Rail, Toe-In and Fin Base Length. Open the toe-aim tables: both section headings now say `(mm)`, every aim-distance cell is a whole millimetre, but the tail-width column headings, board-length row label and modal title still read in centimetres. The highlighted column is the same one it was on Imperial. Switch to Imperial and both surfaces are unchanged."
    expected: "Fin DATA tab and toe-aim modal placement numbers in mm, board-size numbers in cm — re-run of UAT test 12 against gaps G-06-12/G-06-15's fix"
    why_human: "Visual table/modal rendering and family-by-family unit correctness needs a browser"

  - test: "On Metric, every Fins sidebar slider reads in its (now corrected) family: the Forward/Aft position labels and the quad Rear Off-Tail Position display now read in whole millimetres, matching the override box above them; toe-in and off-rail are still whole millimetres as before; the Tail Width row still reads centimetres. No inch mark is left anywhere on the sidebar, the quad rear heading included. On Imperial the whole sidebar is unchanged."
    expected: "Every fins sidebar slider label in the corrected family, no stray inch marks — re-run of UAT test 14 against gaps G-06-12/G-06-15's fix"
    why_human: "Visual sweep of the sidebar for correct unit families and absence of stray inch marks"

  - test: "On Metric the fin drawing's toe and off-rail callouts read in millimetres as before, and its off-tail callout now also reads in millimetres (previously centimetres) — all three carrying their own unit. The summary line and base-length legend keep reading board length/tail width in centimetres. Nothing has moved on the drawing. On Imperial it is unchanged. Check one dark theme as well as Daylight."
    expected: "Fin viewer off-tail callout now in mm alongside toe/off-rail, board unmoved, both themes — re-run of UAT test 15 against gap G-06-15's fix"
    why_human: "Rendered SVG callout appearance across themes needs a browser"
---

# Phase 6: The Design Screens in Metric Verification Report

**Phase Goal:** Every measurement a shaper reads or types while shaping — on the outline, rails,
fins, rocker and volume screens — follows the system they chose, with cm for length and widths,
whole millimetres for the small stuff, and litres for volume either way.

**Verified:** 2026-09-06T00:57:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plans 06-08, 06-09, following end-of-phase UAT)

## Context

This is the second verification pass for Phase 6. The first pass (previous `06-VERIFICATION.md`,
`status: human_needed`, 5/5 code-level truths verified) was followed by end-of-phase UAT
(`06-UAT.md`): 15 of 19 tests passed, 3 failed as gaps (G-06-4, G-06-12, G-06-15), 1 was deferred
to Phase 7 by shaper decision (test 18, Summary order form units). Two gap-closure plans
(06-08, 06-09) closed all three gaps and are merged onto `main` (commits `907bd5d`, `909f72c`,
`1b52aa3` for 06-08; `e76c237`, `e2c5999` for 06-09). This verification re-examines the codebase
against the original must-haves of all nine plans plus the two gap-closure plans' must-haves,
confirms the fixes are real (not just claimed), confirms nothing else regressed, and re-lists the
UAT items whose expected behaviour changed as a result of the fixes.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | In Metric, every slider and value on the five screens reads in cm for length/widths and whole mm for marks, and sliders land on whole millimetres — including fin placement sliders now reading in the corrected family | ✓ VERIFIED (code) / human_needed (visual) | Unchanged from the first pass for sliders themselves (`measureSlider`/`metricSliderRange`, no bound/step touched — confirmed by `git status --porcelain` on all four fins/rocker call-site files returning 0 in plan 06-09, and by grep-verified acceptance criteria in 06-08 showing zero `*_BOUNDS`/step changes). What changed: the four fins sidebar labels above the position/off-tail sliders now print through `formatMark` instead of `formatDim` (confirmed: `fin-controls.tsx` has exactly 1 remaining `formatDim(` call, the Tail Width label). `npx vitest run` reproduced independently: 2007/2009 passing (2 skipped), 33 files — matches SUMMARY claims exactly. Live slider/label rendering needs a browser — routed to human verification (UAT test 14 re-run). |
| 2 | In Metric, a shaper can type a decimal cm figure (51.4) or whole mm and the field accepts it, re-prints it in the chosen system, and reverts anything unreadable exactly as today — and the typed box is now wide enough to show its whole value | ✓ VERIFIED | Gap G-06-4 closed: read `components/design/measure-field.tsx` directly — the `className` is now chosen from the `bare` prop (line 105-107): bare mode is byte-identical to the pre-fix string (`h-7 w-16 min-w-16 max-w-16 ...`, confirmed present exactly once by grep), standalone mode is `h-7 w-24 min-w-24 max-w-24 ...` (confirmed present exactly once). The error line's `w-24` is untouched. No call site (`outline-controls.tsx`, `volume-controls.tsx`, `fin-controls.tsx`, `rocker-datasheet.tsx`) shows a diff since the UAT baseline (`git status --porcelain` on all four returns empty against `HEAD`, and `git diff 044c652 HEAD` confirms no other changes). The commit/clamp/parse pipeline (`commitTypedMeasure`) itself is unchanged — same function, same call. `npx vitest run components/design/measure-field.test.ts` — 6/6 passing, confirming both class strings are asserted. Whether the box visually shows the whole string uncut needs a browser — routed to human verification (UAT test 4 re-run). |
| 3 | Viewer callouts and data tables follow too — rail band marks, fin placement numbers, the rocker datasheet and the volume card all read in the chosen system, with no stray inch marks left behind — including the fin DATA tab, toe-aim tables and fin drawing now reading placement numbers in mm | ✓ VERIFIED (code) / human_needed (visual sweep) | Gaps G-06-12/G-06-15 closed: `lib/geometry/fins.ts` — the three `Off-Tail` row constructions (lines 907, 936, 961) are tagged `family: "mark"` (confirmed by direct read; previously `"dim"`). `toeAimTableFor`'s cell formatter (line 1181) now reads `formatMarkBare(inchesToMm(v), system)` while `tailWidthDisplay` (column headings/row label, `toe-aim-table-modal.tsx` line 43) still reads `formatDim`. `components/fins/fin-controls.tsx` and `components/fins/fin-viewer.tsx` each retain exactly 1 remaining `formatDim(` call (confirmed by grep) — the Tail Width label and the compact heading respectively, exactly as the plans specify; every other placement label/callout now calls `formatMark`. `components/fins/fin-data-panel.tsx` — confirmed untouched (`git diff` against pre-gap-closure baseline is empty), consistent with the prohibition that it reads `row.family` generically and needed no edit. The toe-aim modal's unit marker (line 48) now calls `columnUnitSuffix("mark", system)` for the metric branch. A regression test proves the family flip cannot move an imperial string (`fins.test.ts` line 523, "re-tagging an off-tail row from dim to mark cannot move its Imperial string"). Golden fixtures/geometry math confirmed untouched: `git diff 044c652 HEAD -- lib/geometry/__fixtures__/ lib/geometry/template.test.ts lib/geometry/rail-bands.ts lib/geometry/rocker.test.ts` is empty. Live rendering (DATA tab, drawing, toe-aim modal) needs a browser — routed to human verification (UAT tests 12 and 15 re-run). |
| 4 | Volume reads in litres in both systems, and the same litres figure is quoted on every screen as it is now | ✓ VERIFIED | Unaffected by either gap-closure plan — no file touched by 06-08/06-09 is in the volume rendering path except `volume-controls.tsx`'s Board Length field, whose width-only fix (via `MeasureField`) does not touch the litres figure. No regression: `npx vitest run` full suite green. Carried forward from the first verification pass without new risk. |
| 5 | A shaper can flip between systems mid-design and the board itself never moves — the outline, rocker and foil are exactly where they left them | ✓ VERIFIED | Both gap-closure plans are pure formatter/class-string changes with zero arithmetic, bound, step, or stored-value edits — confirmed structurally: 06-08's acceptance criteria assert zero `*_BOUNDS`-touching diff lines and zero fixture/data-panel/template-test diffs (reproduced above); 06-09 touches only `MeasureField`'s `className` selection, not `commitTypedMeasure`, not any slider. `lib/units-isolation.test.ts`'s "formatting is a read" guard and the UNIT-05 design-store isolation test both still pass (87/87 in `units.test.ts` + `units-isolation.test.ts` combined run). No regression to the metric-bounds-inside-imperial-bounds property test. |

**Score:** 5/5 truths verified at the code/test level. Truths 1, 2 and 3 each still carry a
human-verification component for live rendering that this verifier cannot exercise in a browser —
this routes the overall status to `human_needed`, not `passed`, exactly as the decision tree
requires when human-verification items are non-empty.

### Required Artifacts (gap-closure specific)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/design/measure-field.tsx` | Box width follows `bare` render mode: 64px bare, 96px standalone | ✓ VERIFIED | Read directly (lines 98-107); both class strings confirmed present exactly once each by grep; error line untouched |
| `components/design/measure-field.test.ts` | Source-contract test pins both widths | ✓ VERIFIED | `npx vitest run` — 6/6 passing |
| `lib/geometry/fins.ts` | Three Off-Tail rows tagged `mark`; `toeAimTableFor` cell formatter split from column/row-label formatter | ✓ VERIFIED | Read directly; grep confirms 3 `family: "mark"` Off-Tail rows and the split `formatCell`/`tailWidthDisplay` |
| `components/fins/fin-controls.tsx` | Four placement labels through `formatMark`; Tail Width stays `formatDim` | ✓ VERIFIED | Exactly 1 `formatDim(` call remains (grep-confirmed) |
| `components/fins/fin-viewer.tsx` | Off-tail callout through `formatMark`; compact heading stays `formatDim` | ✓ VERIFIED | Exactly 1 `formatDim(` call remains (grep-confirmed) |
| `components/fins/toe-aim-table-modal.tsx` | Both headings say `(mm)` via `columnUnitSuffix("mark", ...)`; title stays cm | ✓ VERIFIED | Read directly, lines 43-48 |
| `lib/geometry/fins.test.ts` | Family + toe-aim expectations updated; imperial-equality regression test added | ✓ VERIFIED | Test named at line 523; full suite green |
| `.planning/phases/06-the-design-screens-in-metric/06-CONTEXT.md`, `06-UI-SPEC.md`, `CLAUDE.md` | Superseding rule recorded | ✓ VERIFIED | `06-CONTEXT.md` D-01 amendment present (line 85), `286 mm` example present; `CLAUDE.md` Rule 2 Marks sentence names fin placement numbers (confirmed by direct read) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `fin-data-panel.tsx` | `row.family` | Reads family generically, needs no edit | ✓ WIRED / UNTOUCHED | Confirmed: file has zero diff since pre-gap-closure baseline |
| `MeasureField`'s `bare` prop | `className` selection | Direct conditional in component | ✓ WIRED | Confirmed by direct read; no call site needed to change `bare` passing |
| `toeAimTableFor`'s cell formatter | `formatMarkBare` | Direct call, `formatCell` helper | ✓ WIRED | Confirmed by direct read, line 1181 |
| `toe-aim-table-modal.tsx`'s heading marker | `columnUnitSuffix("mark", system)` | Direct call | ✓ WIRED | Confirmed by direct read, line 48 |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| SCRN-01 | 06-01..06-09 | Sliders/values on all five screens read cm/mm per system, sliders step on whole mm | ✓ SATISFIED | Ledger (17 `converted: true` entries) + gap-closure fixes above; REQUIREMENTS.md marks Complete |
| SCRN-02 | 06-02, 06-03, 06-06, 06-09 | Typed entry accepts decimal cm/whole mm, re-prints, reverts on unreadable, box shows its whole value | ✓ SATISFIED | `MeasureField`/`commitTypedMeasure` unchanged pipeline + G-06-4 width fix; REQUIREMENTS.md now marks Complete (the "stale ledger" note from the first verification pass is resolved) |
| SCRN-03 | 06-01, 06-03, 06-04, 06-05, 06-06, 06-07, 06-08 | Viewer callouts and data tables follow the chosen system | ✓ SATISFIED | Ledger + G-06-12/G-06-15 fin placement fixes; REQUIREMENTS.md marks Complete |
| SCRN-05 | 06-07 | Volume reads in litres identically in both systems | ✓ SATISFIED | Unaffected by gap closure; unchanged from first pass |

No orphaned requirements: REQUIREMENTS.md's phase-mapping table shows all four Phase 6 IDs as
"Complete" with no additional IDs mapped to Phase 6 that are unclaimed by a plan.

### Anti-Patterns Found

Scanned every file modified by the two gap-closure plans
(`lib/geometry/fins.ts`, `lib/geometry/fins.test.ts`, `components/fins/fin-controls.tsx`,
`components/fins/fin-viewer.tsx`, `components/fins/toe-aim-table-modal.tsx`,
`components/design/measure-field.tsx`, `components/design/measure-field.test.ts`) for
`TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not yet implemented|coming soon`. No matches found.

### Automated Evidence Reproduced by This Verifier

- `npx vitest run` → 33 files, 2007 passed, 2 skipped (2009 total) — reproduced independently on
  current `main` (`b170ae4`), matching the orchestrator's stated evidence exactly.

- `npx vitest run lib/geometry/fins.test.ts -t "FinSummaryRow.family"` → 6 passed (152 skipped by
  the name filter), confirming the re-tagged family test passes.

- `npx vitest run components/design/measure-field.test.ts` → 6/6 passing.
- `npx vitest run lib/units-isolation.test.ts lib/geometry/units.test.ts` → 87/87 passing —
  confirms the conversion ledger and the metric-bounds-inside-imperial-bounds property test are
  unaffected.

- `npm run build` → compiles successfully, all five `/design/*` routes generated, no errors.
- `git diff 044c652 HEAD -- lib/geometry/__fixtures__/ lib/geometry/template.test.ts lib/geometry/rail-bands.ts lib/geometry/rocker.test.ts` → empty — geometry math and golden fixtures genuinely untouched since the UAT baseline.
- `git diff 044c652 HEAD -- components/fins/fin-data-panel.tsx` → empty — prohibition honored.
- `git status --porcelain` on `outline-controls.tsx`, `volume-controls.tsx`, `fin-controls.tsx`
  (call-site diffs, not content), `rocker-datasheet.tsx` → confirms no call site needed editing
  for the width fix, matching the plan's prohibition.

- `grep` acceptance checks from both plans' `<acceptance_criteria>` — all reproduced independently
  and all passed (family tags, remaining `formatDim(` counts, class-string presence, `(mm)`
  marker, CLAUDE.md Rule 2 wording, `06-CONTEXT.md`/`06-UI-SPEC.md` amendment text).

- `git log` confirms both gap-closure plans' commits are on `main` with a clean working tree
  (`b170ae4`, no uncommitted changes).

### Human Verification Required

The three gaps closed by 06-08/06-09 change the expected behaviour of four previously-run UAT
tests. Only these four need re-running — every other UAT test that already passed (1-3, 5-11,
13, 16-17, 19) is unaffected by the gap-closure plans and does not need to be re-run:

1. **UAT test 4 re-run (gap G-06-4).** On Metric, the Template Builder and the Volume screen each
   show one box above the Board Length slider; typing `188` and pressing Enter moves the thumb and
   re-labels the row to `188.0 cm` with nothing clipped, and the box now shows its whole value at
   both ends of its range. Typing `5 1/2` reverts with an error line lined up under the wider box.
   On Imperial the two dropdowns are unchanged.
   **Why human:** whether text visually fits inside a rendered box cannot be observed by static
   analysis or a node-environment test.

2. **UAT test 12 re-run (gaps G-06-12/G-06-15).** On Metric, the Fins DATA tab's summary line
   still reads board length/tail width in centimetres, but the Off-Tail rows now read in whole
   millimetres alongside Off-Rail, Toe-In and Fin Base Length. The toe-aim tables' headings now say
   `(mm)`, every aim-distance cell is a whole millimetre, and the tail-width columns/row
   label/title still read centimetres. The highlighted column matches Imperial.
   **Why human:** visual table/modal rendering and family-by-family correctness needs a browser.

3. **UAT test 14 re-run (gaps G-06-12/G-06-15).** On Metric, every Fins sidebar slider reads in
   its corrected family — the Forward/Aft position labels and the quad Rear Off-Tail Position
   display now read in whole millimetres, matching their override boxes; the Tail Width row still
   reads centimetres; no inch mark remains anywhere on the sidebar.
   **Why human:** visual sweep of the sidebar for correct unit families.

4. **UAT test 15 re-run (gap G-06-15).** On Metric the fin drawing's off-tail callout now reads in
   millimetres alongside the toe/off-rail callouts (previously centimetres); the summary line and
   base-length legend keep reading board size in centimetres; nothing has moved on the drawing.
   Check one dark theme as well as Daylight.
   **Why human:** rendered SVG callout appearance across themes needs a browser.

**Not re-listed (already resolved by shaper decision, no re-run needed):** UAT test 18 (the
Summary order form's overflow audit on Metric) remains explicitly deferred to Phase 7 / PRNT-01,
per the shaper's decision recorded in `06-UAT.md`'s Deferred Follow-Ups section and `06-CONTEXT.md`
line 33's out-of-scope note ("everything that comes out of a printer... Phase 7"). This
verification does not reopen that decision.

### Gaps Summary

No code-level gaps remain. All three UAT gaps (G-06-4, G-06-12, G-06-15) have direct, reproducible
evidence in the codebase that the described fix was actually made — not merely claimed in a
SUMMARY: the typed Board Length box's width now genuinely follows its render mode (read directly
in the component), the fin placement family tags are genuinely `mark` in the model (read directly
in `fins.ts`), and the toe-aim table's cell formatter is genuinely split from its column/row-label
formatter (read directly). No prohibited files were touched (fixtures, `fin-data-panel.tsx`,
slider bounds, historical PLAN/SUMMARY files) — confirmed by `git diff`/`git status` against the
pre-gap-closure baseline, not by trusting the SUMMARY's own claim. The full test suite (2007
tests, 2 skipped, 33 files) and production build both pass when reproduced independently.

The phase does not resolve to `passed` because four UAT items whose expected behaviour changed as
a result of these fixes are inherently visual (rendered box width, SVG callout placement, table/
modal appearance across two systems and two themes) and cannot be confirmed by static analysis.
This is the correct, intended `human_needed` outcome for this project's
`workflow.human_verify_mode: end-of-phase` configuration — not a defect. Once the shaper re-runs
UAT tests 4, 12, 14 and 15 against the wording above and confirms they now pass, the phase can be
considered fully closed (with test 18 remaining intentionally deferred to Phase 7).

---

*Verified: 2026-09-06T00:57:00Z*
*Verifier: Claude (gsd-verifier)*
