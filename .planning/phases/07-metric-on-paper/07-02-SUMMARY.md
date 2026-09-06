---
phase: 07-metric-on-paper
plan: 02
subsystem: printing
tags: [jspdf, units, typescript, pdf-export]

# Dependency graph
requires:
  - phase: 07-metric-on-paper
    provides: "07-01 — the units channel threaded into all three PDF builders (a required system field on BuildStripPdfOptions), markLabels(system) replacing MARK_LABELS, formatCalibrationMark/formatTenthMm for the one decimal-millimetre value in the app, and the shared nameBlockContent helper the Paper Saver's name block already reads through"
provides:
  - "stripRegistrationLabel and stripRegistrationLines in lib/geometry/template.ts take a defaulted system: UnitsSystem parameter — both the station and the rail half-width are marks-family (D-03), routed through formatMark so Metric reads `914 mm from tail — rail 273 mm` and Imperial reproduces today's string byte-for-byte"
  - "components/template/build-strip-pdf.ts passes options.system explicitly into every call it makes into stripRegistrationLines, stripMarkSegments and stripLabelRows — no call site left relying on the imperial default"
  - "scaleSquareCaptionText(system) in build-strip-pdf.ts replacing the SCALE_SQUARE_CAPTION_TEXT constant — the Paper Saver's own sibling half of Plan 01's edit to build-template-pdf.ts's caption, proved identical to it by a cross-file equality test rather than a shared import"
  - "Proof that the Paper Saver's mark labels (already threaded by Plan 01) reach the drawn page unchanged in geometry: baselineStation/pageIndex/kind sequences identical between systems, a pin/round tail prints no Tail Block label in either system"
affects: [07-05-the-conversion-ledger-closes-on-print]

# Actuals (#2632)
actuals:
  tokens: 5868
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The same defaulted system: UnitsSystem = \"imperial\" trailing-parameter idiom Plan 01 established, extended to the Paper Saver's own registration-line composer (stripRegistrationLabel/stripRegistrationLines) — every existing zero-argument call site, including the frozen characterisation pins, stays byte-identical by construction"
    - "A cross-file string-equality test (Paper Saver caption vs Full Sized Template caption, same system) as the guard against one sibling file being converted and not the other — the two files deliberately do not import from each other for a one-line string"

key-files:
  created: []
  modified:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-strip-pdf.ts
    - components/template/build-strip-pdf.test.ts

key-decisions:
  - "Both numbers on the Paper Saver's registration line are marks-family (D-03), so stripRegistrationLabel routes both the station and the half-width through the same formatMark(value, system) call — not formatDim for one and formatMark for the other. Neither number appears on any screen, so there is no dims-family precedent to match; this mirrors the call the shaper made for fin placement at Phase 6 UAT: two numbers on one line read in one unit."
  - "Task 2 needed no production code change. Plan 01 had already threaded system into stripMarkSegments/stripLabelRows and routed the trailing width figure through formatDim (dims-family, per D-04); Task 1 of this plan made every build-strip-pdf.ts call site pass system explicitly. Task 2's job was proving that result on the page — confirming drawLabelRows draws stripLabelRows' text verbatim with no formatting of its own, and that the de-collision logic (which operates on stations, never on string width) produces identical baselineStation sequences in both systems."

requirements-completed: []
# PRNT-03 and PRNT-04 are listed on this plan's frontmatter but are NOT closed by it alone — both
# also appear on 07-01-PLAN.md and 07-05-PLAN.md's own requirements fields. Per 07-01's own
# SUMMARY, the plan that closes the ledger (07-05) is the correct place to flip them; marking them
# complete here would be premature.

coverage:
  - id: D1
    description: "A Metric shaper taping Paper Saver strips together reads `914 mm from tail — rail 273 mm` at every page join, in one unit; an Imperial shaper reads exactly the line they read before this phase"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#stripRegistrationLines / stripLabelRows read the chosen units system (07-02 D-03); components/template/build-strip-pdf.test.ts#the registration line's printed text follows the chosen units system (07-02 D-03)"
        status: pass
    human_judgment: true
    rationale: "Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase — whether the metric registration line actually reads cleanly at the printed page join (does the wider metric string fit, does it read at the same physical spot the imperial string did) needs a human looking at an exported PDF, not just the composed strings."
  - id: D2
    description: "A Metric shaper's Paper Saver mark labels read the same way the Full Sized Template's do — station name in centimetres, the board's own width beside it also in centimetres — and a pin/round tail prints no Tail Block label with a missing number in either system"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "components/template/build-strip-pdf.test.ts#label row placement (07-02 D-04 Metric/Imperial cases, baselineStation sequence identity, pin/round-tailed preset case)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nothing the Paper Saver draws has moved: station bands, sideways slides, numeral columns, registration lines and the calibration square print at the same place and the same size in both systems — proved by the three frozen characterisation pins staying green on their original digests and the scale-square furniture rect being identical between systems"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts's three frozen characterisation-pin describe blocks (unedited, original digests); components/template/build-strip-pdf.test.ts#the scale-square furniture rect has identical x, y, width and height on Metric and Imperial"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Paper Saver's scale-check square is captioned `50.8 mm x 50.8 mm — measure before taping` on Metric, byte-identical to the pre-phase string on Imperial, and matches the Full Sized Template's own caption text for the same system"
    requirement: "PRNT-04"
    verification:
      - kind: unit
        ref: "components/template/build-strip-pdf.test.ts#the Paper Saver's own scale-check caption (07-02 D-01/D-02)"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-06
status: complete
---

# Phase 7 Plan 02: The Paper Saver In Metric Summary

**Threaded the chosen units system into the Paper Saver's own registration lines and scale-check caption — routing both registration-line numbers through the marks-family formatter (D-03) so a Metric shaper reads `914 mm from tail — rail 273 mm` at every page join — while every frozen characterisation pin stayed green on its original digest and every mark label and furniture rectangle proved unmoved between systems.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- The Paper Saver's registration line — the alignment device a shaper marks against the neighbouring sheet when taping strips together — now reads `914 mm from tail — rail 273 mm` on Metric and exactly the pre-phase `36" from tail — rail 10 3/4"` string on Imperial, via `stripRegistrationLabel`/`stripRegistrationLines` in `lib/geometry/template.ts` gaining a defaulted `system: UnitsSystem = "imperial"` parameter.
- Every call `build-strip-pdf.ts` makes into `stripRegistrationLines`, `stripMarkSegments` and `stripLabelRows` now passes `options.system` explicitly — none left relying on the imperial default the frozen pins need.
- Proved (no code change required) that the Paper Saver's mark labels — already threaded by Plan 01 — reach the printed page correctly: a Metric label reads `Nose 30.5 cm — 40.0 cm` in the same station-name-plus-width-in-centimetres shape the Full Sized Template uses, the de-collision logic that nudges label rows apart produces identical `baselineStation` sequences in both systems (positions come from stations, never from string width), and a pin/round-tailed board (the Mid-length preset) prints no Tail Block label in either system.
- The Paper Saver's own scale-check caption is now `scaleSquareCaptionText(system)`, replacing the old fixed `SCALE_SQUARE_CAPTION_TEXT` constant — Metric reads `50.8 mm x 50.8 mm — measure before taping`, Imperial reproduces the old string exactly, and a cross-file test proves this caption is byte-identical to the Full Sized Template's own caption for the same system (the guard against converting one sibling file and not the other).
- All three frozen characterisation pins in `lib/geometry/template.test.ts` remain unedited and pass on their original digests — the drawn board, every working mark, page tiling, the alignment box and the scale square are provably unchanged in either system.

## Task Commits

Each task was committed atomically:

1. **Task 1: The Paper Saver's registration lines in whole millimetres** — `615d3c5` (feat)
2. **Task 2: The Paper Saver's mark labels follow the chooser on the page** — `b5dc968` (test — no production code change was needed; see Decisions Made)
3. **Task 3: The Paper Saver's own scale-check caption** — `6046829` (feat)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — STATE.md/ROADMAP.md excluded, owned by the orchestrator after the wave completes).

## Files Created/Modified

- `lib/geometry/template.ts` — `stripRegistrationLabel` and `stripRegistrationLines` gain a defaulted `system: UnitsSystem = "imperial"` trailing parameter, composing both numbers through `formatMark` (marks-family, D-03); `stripLabelRows` now threads `system` into `stripRegistrationLines` as well as `stripMarkSegments`; the now-unused `formatInchesFraction` import was removed (CLAUDE.md Rule 2 — every conversion now routes through `./measure-display`)
- `lib/geometry/template.test.ts` — new describe block below the three frozen pins proving the defaulted call, the explicit-imperial call and the metric call agree on every field except `label`/`baselineStation`-preserving text
- `components/template/build-strip-pdf.ts` — `buildStripPdf` and `computeStripFurniture` pass `options.system` explicitly into `stripRegistrationLines`, `stripMarkSegments` and `stripLabelRows`; `SCALE_SQUARE_CAPTION_TEXT` constant replaced by exported `scaleSquareCaptionText(system)`; `drawScaleSquare` takes a `system` parameter and calls it
- `components/template/build-strip-pdf.test.ts` — new test coverage: registration-line text per system, mark-label text and baseline-station identity per system, a pin/round-tail no-Tail-Block case, and the scale-check caption's exact strings, cross-file equality with the Full Sized Template, and furniture-rect identity between systems

## Decisions Made

- **Both registration-line numbers are marks-family, composed through one `formatMark(value, system)` call each** — not one dims-family and one marks-family formatter. D-03 settled this at context-gathering time: neither the station nor the rail half-width appears on any screen, so there's no dims-family precedent to match, and a shaper reading two numbers on one line off a metric tape wants one unit, not a decimal point to shift in their head (the same call made for fin placement at Phase 6 UAT).
- **Task 2 required no production code change**, only tests. Plan 01 had already threaded `system` through `stripMarkSegments`/`stripLabelRows` (routing the trailing width figure through `formatDim`, dims-family per D-04) and Task 1 of this plan made every `build-strip-pdf.ts` call site pass `system` explicitly rather than relying on the default. Task 2's acceptance criteria were about proving that wiring reaches the page correctly — confirming `drawLabelRows` draws `stripLabelRows`' text verbatim with no formatting of its own, and that de-collision (station-based, not text-width-based) produces identical `baselineStation` sequences in both systems. Committed as a `test` commit rather than `feat` since nothing outside the test file changed.
- **The Paper Saver's scale-check caption is an independent function, not a shared import**, deliberately mirroring `build-template-pdf.ts`'s own `scaleSquareCaptionText` rather than importing it — these two files' own header comments explain they never import from each other for a one-line string, which is exactly the seam where a units conversion could land in one file and not the other. A cross-file string-equality test (`scaleSquareCaptionText("imperial") === templateScaleSquareCaptionText("imperial")`, and the same for `"metric"`) is the guard against that.

## Deviations from Plan

None — plan executed exactly as written. Task 2 turning out to need no production code was anticipated by the plan itself (its own `<action>` text says "Confirm `drawLabelRows` draws whatever text `stripLabelRows` returns without composing any of its own" — a confirmation, not a mandate to change it), not a deviation from it.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase`, no mid-plan `checkpoint:human-verify` was raised. The following is deferred to the phase's end-of-phase UAT pass:

- **Visual check of an exported Metric Paper Saver PDF.** Confirm on an actual rendered strip that the registration line at each page join reads `914 mm from tail — rail 273 mm` (or the board-specific equivalent), that the wider metric string still reads cleanly at the printed page join without crowding the numeral column, and that mark labels and the scale-check caption read correctly and do not overlap or clip.
- **Visual check that the Imperial Paper Saver is unchanged.** A shaper who has never touched the units chooser should see the exact same strip they saw before this phase.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The Paper Saver's own registration lines and scale-check caption now read the chosen system end to end, alongside its mark labels (Plan 01). Plan 03 (the Overview Sheet in Metric) is unaffected by and independent of this plan's changes.
- The three frozen characterisation pins remain the working proof mechanism for "nothing on paper moved" — confirmed green on their original digests throughout this plan; any future plan touching `lib/geometry/template.ts` should run `npx vitest run lib/geometry/template.test.ts` and treat a changed digest as a hard stop, never a re-capture.
- No blockers. `lib/units-isolation.test.ts`'s conversion ledger has not yet been extended to the print surfaces (Plan 05's named task) — this plan did not touch that file, per its own `files_modified` scope and the orchestrator's ruling that it belongs to Plans 04/05.

## Self-Check: PASSED

All files created/modified verified present on disk; all task commits (`615d3c5`, `b5dc968`, `6046829`) and this SUMMARY's own commit verified present in `git log`.

---
*Phase: 07-metric-on-paper*
*Completed: 2026-09-06*
