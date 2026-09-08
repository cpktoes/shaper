---
phase: 07-metric-on-paper
verified: 2026-09-06T23:45:00Z
human_verification_completed: 2026-09-07T00:15:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Export a Full Sized Template PDF with Metric chosen and look at the actual printed/rendered page."
    expected: "Station marks read `Nose 30.5 cm — 40.0 cm` etc., the scale-check caption reads `50.8 mm x 50.8 mm — measure before taping`, the how-to box's line 2 matches, and the name/dims block reads correctly — nothing overlaps or clips, and the drawn board (curve, ticks, alignment box, scale square) looks pixel-identical to the Imperial export apart from label text."
    why_human: "Unit tests prove the composed strings are correct, but only a rendered PDF page shows whether the wider or narrower metric string actually fits where the imperial one did. Deferred by Plan 01's own SUMMARY under `workflow.human_verify_mode: end-of-phase`."
  - test: "Export a Full Sized Template with Imperial chosen (a shaper who never touched the chooser)."
    expected: "The page looks exactly as it did before this phase — a side-by-side glance, not just the byte-identity unit tests."
    why_human: "Visual confirmation of \"nothing changed\", deferred from Plan 01."
  - test: "Export a Paper Saver PDF with Metric chosen and inspect an actual page join."
    expected: "The registration line reads `914 mm from tail — rail 273 mm` (or board-specific equivalent), fits cleanly without crowding the numeral column, and mark labels/scale caption don't overlap or clip."
    why_human: "Deferred by Plan 02's own SUMMARY — the wider metric string's real fit at a page join needs eyes on a rendered strip."
  - test: "Export a Paper Saver with Imperial chosen."
    expected: "Identical to what it printed before this phase."
    why_human: "Visual confirmation, deferred from Plan 02."
  - test: "Export an Overview Sheet PDF with Metric chosen."
    expected: "Spec block (`Length: 188.0 cm`, depths in mm, one cm² area figure), the length callout, dashed station names (`NOSE @ 30.5 cm` / `TAIL @ 30.5 cm`), and the widepoint offset label all read correctly without overlap or clipping; the drawn board sits at the same page position as the Imperial export."
    why_human: "Deferred by Plan 03's own SUMMARY — visual layout of the rendered page."
  - test: "Export an Overview Sheet with Imperial chosen."
    expected: "Identical to the pre-phase page."
    why_human: "Visual confirmation, deferred from Plan 03."
  - test: "Find (or construct) a board whose widepoint offset falls in the narrow window where Imperial merges the WIDEPOINT/CENTER dashed line and Metric keeps them separate (or vice versa), and look at both printed Overview Sheets."
    expected: "Both sheets read sensibly — no directional label drawn for an offset that prints as zero, and no doubled label where one line was expected."
    why_human: "The unit test proves the boundary computation is correct; a human needs to confirm the printed page reads sensibly in that edge case. Deferred by Plan 03's own SUMMARY."
  - test: "The Metric print audit named by Plan 04 Task 3, explicitly recorded as \"Not yet run\" in 07-04-SUMMARY.md: with Metric chosen, open the browser's print preview of /design/summary; on Letter, check both sheets for any clipped or cut-off header, row or number (especially the compact rail table's section headers, which now carry a unit suffix, and the fin placement panel's fixed-height box); repeat on A4; then repeat both paper sizes on Imperial to confirm nothing changed."
    expected: "No clipped header, row or number on either sheet, at either paper size, in either system; Imperial identical to before this phase."
    why_human: "This is the phase's own D-10 commitment (\"the Metric print audit is part of finishing this phase, not a follow-up\") and it is explicitly unresolved — the plan's own SUMMARY records the result as 'Not yet run.' Only a human looking at the browser's print preview can carry this out; no test in the suite renders the order form or drives a print dialog."
  - test: "On Metric, examine an exported Full Sized Template for an unusually shaped or edge-case board (very short name interacting with a wide dims row, or a preset near the wide/interior placement boundary) and confirm the name block, how-to box and scale square never overlap or spill outside the alignment box."
    expected: "No overlap and full containment, matching what the frozen pins prove for Imperial."
    why_human: "Code review finding WR-01 (07-REVIEW.md): the page-0 furniture containment/overlap test suite in build-template-pdf.test.ts never runs against a Metric options object — every containment/overlap case hardcodes `system: \"imperial\"`. The reviewer independently confirmed all four shipped presets plus three wide/edge-case variants pass containment in Metric today (a probe, not committed), so this is a coverage gap rather than a live defect, but it means the class of bug this exact file has hit three times before (post-checkpoint defects 3/4, quick tasks 260903-18d/fqv/h7t) has zero automated Metric coverage. Flagging for awareness rather than as a blocking gap, since success criterion 5's frozen pins are unaffected and no reproducing failure exists on any shipped preset."
---

# Phase 7: Metric on Paper Verification Report

**Phase Goal:** Everything a shaper prints comes out in the system they chose — the Summary order
form, the Overview Sheet, the Full Sized Template and the Paper Saver — while the 1:1 templates
still measure dead true against a ruler.

**Verified:** 2026-09-06T23:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

I read all five plans and summaries in full, cross-checked every claim against the actual source
(not just the SUMMARY narrative), and ran the tests myself rather than trusting the reported
numbers. In plain terms: the code that makes every printed sheet follow a shaper's Metric/Imperial
choice is genuinely in place and tested, the 1:1 templates provably still measure true (their
"frozen" test fixtures are unedited and pass on their original values), and CLAUDE.md now tells the
truth about it. What is still outstanding is the print-preview walkthroughs the plans themselves
deferred to a human — most notably the Metric print audit for the order form, which the executor's
own SUMMARY records as "Not yet run."

### Observable Truths

| # | Truth (from ROADMAP success criteria) | Status | Evidence |
|---|------|--------|----------|
| 1 | The Summary order form prints every measurement in the chosen system | ✓ VERIFIED | `components/summary/order-form.tsx` reads `useUnits()` once and routes all seven dimension cells, the identification strip, the rail-band thickness figure and every fin placement value through `lib/geometry/measure-display.ts`. Confirmed by direct code read (not just SUMMARY claim) and by running `dimension-fit.test.ts` + `units-isolation.test.ts` myself — all pass. |
| 2 | The Overview Sheet PDF prints in the chosen system, dims block and all | ✓ VERIFIED | `overviewSpecLines`, `overviewLengthLabelText`, `overviewWpOffsetLabelText`, `overviewStationLines` and the new `overviewStationWidthText` all take a required `system` parameter and are called from `buildOverviewPdf` with `options.system`; confirmed no `formatFeetInches`/`formatInchesFraction` remains outside a sanctioned comment. `build-overview-pdf.test.ts` (167 tests area) passes. |
| 3 | The Full Sized Template and Paper Saver print their marks, labels and name/dims block in the chosen system | ✓ VERIFIED | `markLabels(system)` replaces `MARK_LABELS`; `stripRegistrationLabel`/`stripRegistrationLines` route both numbers through `formatMark`; `templateNameBlockDimsText`/`nameBlockContent` carry the dims row per D-06; `build-strip-pdf.ts`'s independent scale caption mirrors the template's. All confirmed by direct source read plus passing test files. |
| 4 | In Metric, the printed scale-check square is captioned in millimetres, so a metric ruler alone can confirm 1:1 | ✓ VERIFIED | `SCALE_SQUARE_MM = inchesToMm(2)` unchanged in both `build-template-pdf.ts` and `build-strip-pdf.ts`; caption composed via `formatCalibrationMark(SCALE_SQUARE_MM, system)`, tested to read exactly `50.8 mm x 50.8 mm — measure before taping` on Metric. |
| 5 | Nothing on paper moved: printed geometry is identical, and the frozen characterisation pins in `lib/geometry/template.test.ts` stay green | ✓ VERIFIED | Ran `npx vitest run lib/geometry/template.test.ts` myself: all three "frozen, never edit" describe blocks pass. Read the diffs of every commit touching that file across all 5 plans (`23fa930`, `615d3c5`) — confirmed additions land strictly below/outside the frozen blocks, no line inside them touched. `grep -c 'inchesToMm(2)'` confirms the scale square's own drawn size is untouched in both builder files. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

All five roadmap success criteria are backed by real, passing code — this is not a rubber-stamp of
the SUMMARY narrative. I independently re-ran the relevant test files, read the actual diffs on the
frozen-pin file, and grepped the production source for leftover raw imperial formatters (none
found outside sanctioned exceptions).

However, per this phase's own `workflow.human_verify_mode: end-of-phase` setting, every plan
deliberately deferred its visual/print-preview checks to this end-of-phase pass rather than
verifying them live during execution. Those checks are still outstanding — see Human Verification
Required below — which is why the overall status is `human_needed` rather than `passed`, even
though every mechanically-verifiable truth is green.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/geometry/units.ts` exports `formatTenthMm` | Bare tenth-of-a-mm formatter | ✓ VERIFIED | Present at line 121; covered by 5 passing test cases in `units.test.ts` |
| `lib/geometry/measure-display.ts` exports `formatCalibrationMark` | System-aware calibration formatter | ✓ VERIFIED | Present at line 169; both-system cases pass |
| `lib/geometry/template.ts` defines `markLabels(system)` | Replaces `MARK_LABELS` constant | ✓ VERIFIED | `MARK_LABELS` no longer exists in the file; `markLabels` is used at 3 call sites |
| `Build*PdfOptions` carry a required `system` field | All three builders | ✓ VERIFIED | Confirmed in `build-template-pdf.ts`, `build-strip-pdf.ts`, `build-overview-pdf.ts` |
| `export-preview-dialog.tsx` reads `useUnits()` and passes `system` into all three download calls | Single entry point | ✓ VERIFIED | `useUnits` imported, `system` destructured once, appears in all 3 download option objects |
| `components/summary/dimension-fit.ts` exports the step-down rule | Pure, tested | ✓ VERIFIED | `DIMENSION_FIT_STEPS`/`dimensionValueFitClass` present; 11 test cases pass |
| `lib/units-isolation.test.ts` carries a closed `PRINT_SURFACE_DISPLAY_FILES` ledger | All 5 entries `converted: true` | ✓ VERIFIED | Confirmed all 5 entries converted; closing assertion demonstrated failing when I manually flipped one entry back to `false`, then restored |
| `CLAUDE.md` Rule 2 rewritten | Describes post-Phase-7 boundary | ✓ VERIFIED | "Where this applies today: everywhere..." names all four print surfaces; `use-print-fit.ts` exception sentence intact; `git diff --stat` confined to Rule 2 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| gear-menu chooser | all 3 PDF builders | `useUnits()` in `export-preview-dialog.tsx` → `system` field → builder text-composers | ✓ WIRED | Confirmed by source read and by `lib/units-isolation.test.ts`'s new "no production call site is silently imperial by omission" describe block, which I confirmed via its own SUMMARY was demonstrated to fail on a broken call site and pass when restored |
| order form | `lib/geometry/measure-display.ts` | direct import, single `useUnits()` read | ✓ WIRED | Confirmed in `order-form.tsx` |
| `lib/geometry/template.ts` label functions | frozen pins | defaulted `system = "imperial"` parameter | ✓ WIRED | Every pin call site still calls with zero/no argument and matches the digest |
| Paper Saver caption | Full Sized Template caption | independent, non-importing files kept in sync by a cross-file equality test | ✓ WIRED | Confirmed test exists in `build-strip-pdf.test.ts` comparing `scaleSquareCaptionText` output to the template's own |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite is green | `npm test` | 2132 passed, 2 skipped, 0 failed | ✓ PASS |
| Frozen characterisation pins unedited and green | `npx vitest run lib/geometry/template.test.ts` | all 3 frozen describe blocks pass | ✓ PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint is clean (no new issues) | `npm run lint` | 9 pre-existing warnings, 0 errors, none in phase-7 files | ✓ PASS |
| Ledger closing assertion actually enforces closure | manually flipped `order-form.tsx`'s ledger entry to `false`, re-ran `units-isolation.test.ts`, then restored | assertion failed exactly as expected, restored file verified clean (`git diff` empty) | ✓ PASS |
| Scale square size unchanged in both builder files | `grep -n "SCALE_SQUARE_MM"` in both files | both derive from `inchesToMm(2)`, nothing else | ✓ PASS |
| No raw imperial formatter remains outside sanctioned use | `grep -n "formatFeetInches\|formatInchesFraction"` across all print-surface production files | only sanctioned doc-comment references remain (production code calls `formatLength`/`formatDim`/`formatMark`/`formatCalibrationMark` with an explicit system instead) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| PRNT-01 | 07-04, 07-05 | Summary order form prints every measurement in the chosen system | ✓ SATISFIED | `order-form.tsx` fully converted, ledger closed, REQUIREMENTS.md marks Complete |
| PRNT-02 | 07-03, 07-05 | Overview Sheet PDF prints in the chosen system | ✓ SATISFIED | `build-overview-pdf.ts` fully converted, ledger closed |
| PRNT-03 | 07-01, 07-02, 07-05 | Full Sized Template and Paper Saver print in the chosen system | ✓ SATISFIED | `build-template-pdf.ts`/`build-strip-pdf.ts`/`lib/geometry/template.ts` fully converted, ledger closed |
| PRNT-04 | 07-01, 07-02, 07-05 | Metric scale-check square captioned in millimetres | ✓ SATISFIED | `formatCalibrationMark`/`formatTenthMm` shipped, square size unchanged, caption tested in both builder files |

No orphaned requirements: REQUIREMENTS.md's Phase 7 mapping (PRNT-01 through PRNT-04) matches exactly the requirement IDs declared across the five plans' frontmatter, and all four are marked Complete with no additional Phase-7 IDs left unmapped.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/template/build-template-pdf.ts` | 713-714 | `formatSignedDim(...).replace(/ cm$/, "")` — derives a "bare" value by regex-stripping a formatter's own unit suffix rather than calling a dedicated bare formatter | ℹ️ Info (matches 07-REVIEW.md WR-02) | Works correctly today only because `formatSignedDim`'s metric branch always ends in a literal `" cm"`; fragile to a future formatting change, but not a live defect. No formal follow-up ticket exists yet for this — noted for awareness, not a blocker. |
| `components/template/build-template-pdf.test.ts` | containment/overlap describe blocks | Zero Metric-system coverage of page-0 furniture containment/overlap tests (confirmed by grep: no `"metric"` string anywhere in the 700-1150 line range covering these describe blocks) | ⚠️ Warning (matches 07-REVIEW.md WR-01) | A real, empirically-checked-safe-today coverage gap in the exact class of defect this file has fixed three times before. Does not currently reproduce a failure on any shipped preset (confirmed by the code reviewer's own probe, and consistent with my own review of the test file). Routed to human verification below rather than treated as a blocking gap, since it does not contradict roadmap success criterion 5 (the frozen pins, which are the literal proof mechanism named in that criterion, are unaffected). |

No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) found in any file this phase modified.

### Human Verification Required

See the `human_verification` list in this report's frontmatter for the full, structured set — it
includes the visual/print-preview checks every one of the five plans deferred (per
`workflow.human_verify_mode: end-of-phase`) plus the WR-01 Metric-containment coverage gap the code
review surfaced. The single most load-bearing item is Plan 04 Task 3's Metric print audit, whose own
SUMMARY explicitly records its result as "Not yet run" — this is the phase's own D-10 commitment
("the Metric print audit is part of finishing this phase, not a follow-up") and it genuinely has not
been carried out yet.

### Gaps Summary

No FAILED truths, no MISSING or STUB artifacts, no broken key links, no unresolved debt markers, and
the full test suite (2132 tests), TypeScript compile, and lint all pass cleanly. Every plan-level
must-have I checked against the actual source — not the SUMMARY's description of it — held up:
`markLabels`, `formatTenthMm`, `formatCalibrationMark`, the dims-row/bordered-cell unit rule (D-06
vs D-07), the marks-family Paper Saver registration line (D-03), the widepoint-merge precision trap,
the dimension-fit step-down rule, and the closed conversion ledger are all genuinely present, wired,
and tested.

What keeps this phase from a clean `passed` is entirely in the human-judgment column that the
phase's own plans deliberately deferred rather than skipped: nine `<human-check>` items across the
five plans, the most concrete of which — the Metric print audit on both sheets and both paper
sizes — is explicitly unresolved in 07-04-SUMMARY.md ("Not yet run"). None of these represent a
known defect; they represent verification work that has not yet happened. I am also surfacing the
code review's WR-01 finding (Metric furniture-containment test coverage) as a human-verification
item rather than a gap, because it is a coverage gap the reviewer already empirically checked does
not reproduce on any shipped preset, and it does not touch the frozen pins that roadmap success
criterion 5 is literally about.

**Recommended next step:** run the deferred human-check items above (they take a browser, the gear
menu, and about ten minutes) before considering this phase closed. If any of them turns up a clipped
row or a moved element, that becomes a real gap for a closure plan; if they all pass, this phase can
be marked `passed` on re-verification with no code changes needed.

---

_Verified: 2026-09-06T23:45:00Z_
_Verifier: Claude (gsd-verifier)_


## Human Verification Outcome (2026-09-06)

All nine deferred items were resolved through `/gsd-verify-work 7`, and the shaper accepted the
automated evidence rather than repeating the exports by hand. Every item was settled by
measurement, not by eye:

| # | Item | How it was settled |
|---|------|--------------------|
| 1 | Metric print audit of the order form (D-10) | Fired the real `beforeprint` handler in both systems: both sheets land at zoom 1 (988px in a 991px box) with **zero** clipped elements across 719 nodes. `useOrderFormPrintFit` targets the narrower of Letter/A4 and the shorter of the two, so the one measured box is the Letter/A4 intersection — a single pass covers both papers. |
| 2, 4, 6 | Metric template / Paper Saver / Overview Sheet | Rendered real PDFs and compared content streams against Imperial. Template: **1 of 152** drawing operators differs — the name-block box height (25.6 → 21.4 mm, one fewer wrapped line). Paper Saver: 1 of 126, the same box. Overview Sheet: **zero** geometry differences. |
| 3, 5, 7 | Imperial unchanged | Rebuilt every Imperial PDF from pre-phase commit `625322d`. All **68 pages** across the three surfaces are byte-identical — text and drawing operators alike. |
| 8 | WIDEPOINT/CENTER merge threshold | Scanned offsets 0.0–3.0 mm in 0.1 mm steps: the systems disagree only in a **0.5–0.7 mm** window. At 0.6 mm Imperial prints `0"` and merges; Metric prints `+0.1 cm` and splits. Each sheet agrees with its own printed figure. |
| 9 | Edge-case containment (code review WR-01) | Ran page-0 containment and overlap checks in **both** systems over 9 boards (4 presets, 3 wide variants, an empty name, a 40-character name) × Letter and A4: **38/38** contained, no overlaps. WR-01 does not reproduce. |

### Observation logged, not fixed

Page 2 of the order form closes with `All measurements round to the nearest 1/16" (0.1 cm in cm
units) — expect a hair of play when routing to these numbers.` in both systems. On a Metric sheet
that leads with inches and claims 0.1 cm precision directly beneath whole-millimetre fin numbers.
The string is a Phase 1 literal in `lib/geometry/fins.ts`, a geometry file deliberately outside the
display boundary, so no Phase 7 plan touched it and the units-isolation ledger cannot see it. Out
of this phase's declared scope; recorded under Deferred Follow-Ups in `07-UAT.md` at the shaper's
direction rather than fixed here.
