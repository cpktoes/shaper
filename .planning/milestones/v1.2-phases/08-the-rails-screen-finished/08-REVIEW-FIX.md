---
phase: 08-the-rails-screen-finished
fixed_at: 2026-09-08T15:21:00Z
review_path: .planning/phases/08-the-rails-screen-finished/08-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-09-08
**Source review:** .planning/phases/08-the-rails-screen-finished/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (both Warnings; no Critical/Blocker findings in the source review)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: `order-form-print.test.ts`'s third assertion can never fail on the property it claims to test

**Files modified:** `components/summary/order-form-print.test.ts`
**Commit:** d2daaab
**Applied fix:** The third test's hardcoded `const wrapperPrintPaddingIn = 0;` was replaced with a
value read out of the `[data-order-form-page]` print rule itself, via the same
`firstOrderFormPageRuleBody` helper the first test already uses. Added a local
`paddingToInches(value, unit, mmPerInch)` helper that converts a matched CSS length (`px`, `mm`,
`in`, or unitless — which must be `0`) into inches, with a test-local `CSS_REFERENCE_PX_PER_INCH =
96` documented as the CSS spec's reference pixel for a stylesheet length, not a board-dimension
conversion (CLAUDE.md Rule 2 governs design values; `use-print-fit.ts` measures the real
px-per-inch at runtime on purpose). Retitled the test to "the fitted sheet, plus the wrapper's
print padding as the stylesheet declares it, fits inside the shortest portrait paper's printable
height" and rewrote the inline comment to explain the padding is now read from the print rule, not
assumed.

**Bites-the-bug check (per the fix design):** Temporarily changed `order-form.css`'s
`[data-order-form-page]` print-rule padding from `padding: 0 !important` to `padding: 32px
!important`, ran `components/summary/order-form-print.test.ts`, and confirmed the third test now
fails (`fitted sheet height (10.3182in) plus wrapper print padding (0.3333...in) does not fit
inside the shortest paper's printable height (10.3701in)` — `10.6516 > 10.3701`), alongside the
sibling first test (the padding regex) also failing as expected. Reverted with `git checkout --
app/design/summary/order-form.css` and confirmed the file was back to `padding: 0 !important` with
no diff against git before re-running the suite.

### WR-02: The new axis-label fit check is only ever applied to the bottom (x) axis; the left (y) axis's own adjacent-tick spacing is never verified

**Files modified:** `components/rails/rail-section-plot.tsx`, `components/rails/rail-section-plot.test.ts`
**Commit:** ca8778f
**Applied fix:** Added and exported `railPlotStackedLabelsFit(ticks, renderScale): boolean` beside
`railPlotTicksFit` — the vertical twin, checking that adjacent LABELLED left-axis ticks' on-screen
gap (`spacingIn * SCALE * renderScale`) is at least `CALLOUT_PX.name + AXIS_LABEL_FIT_MARGIN_PX`
(the pinned label face height, not text width). Doc comment explains why left-axis labels are
checked against face height rather than character count, and records that today this never thins
the axis further than the bottom axis's own check (10mm step at scale 0.785 is ~17.3px against a
13px threshold), so the function exists to make that hold by construction rather than by
coincidence. Updated `chooseMetricLabelEvery` to accept a candidate only when both
`railPlotTicksFit(candidate.xTicks, renderScale)` AND `railPlotStackedLabelsFit(candidate.yTicks,
renderScale)` pass, and updated its doc comment accordingly. Added a `describe("railPlotStackedLabelsFit", ...)`
block in the test file (reusing the existing `everyTick`/`everySecond` fixtures from the
`buildRailPlotGrid`/`railPlotTicksFit` describes): the default 10mm-labelled left axis fits at all
four measured render scales (0.785, 1.2, 1.8, 2.3) and at `MIN_PINNED_FIT_SCALE` (0.66, imported
from `components/viewer/callout-primitives`); a contrived scale of 0.5 (~11.0px against the 13px
threshold) returns `false`, proving the function can fail; and an assertion pinning that the
bottom axis is still what decides the default board's thinning at 0.785 (left axis fits at both
`labelEvery` 1 and 2, bottom axis only fits at 2 — reusing `railPlotTicksFit`'s own already-tested
outcome rather than exporting `chooseMetricLabelEvery` itself).

**Verification:**
- `npx vitest run components/rails/rail-section-plot.test.ts` — 22 tests passed (19 pre-existing +
  3 new).
- `npx vitest run` (full suite) — 42 files, 2255 passed, 2 pre-existing skips (up from the review's
  baseline of 2252 passed, matching the 3 new tests added).
- `npx tsc --noEmit` — clean, exit 0 (no errors in either touched file or elsewhere).
- `npx eslint components/rails/rail-section-plot.tsx components/rails/rail-section-plot.test.ts` —
  clean, no output.
- Imperial fixtures and every pre-existing `rail-section-plot.test.ts` test stayed green unchanged
  (no assertions in the pre-existing tests were modified).

Plan prohibitions honored: `computeRailPlotBounds`, `railPlotProjection`, `SCALE`, `LEFT_PAD`,
`AXIS_LABEL_PAD`, `Y_TICK_LABEL_GAP`, `CALLOUT_RIGHT_PAD`, `CALLOUT_BOTTOM_PAD` were not touched;
the Imperial branch of `buildRailPlotGrid` and the Imperial rendering path were not touched;
`components/summary/order-form.tsx`, `components/ui/dialog.tsx` and `components/template/*` were
not touched.

## Skipped Issues

None — both in-scope findings were fixed.

---

_Fixed: 2026-09-08_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
