---
phase: 08-the-rails-screen-finished
reviewed: 2026-09-08T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - app/design/rails/actual-size.css
  - app/design/summary/order-form.css
  - components/auth/sign-in-banner.tsx
  - components/rails/rail-callouts.ts
  - components/rails/rail-section-plot.test.ts
  - components/rails/rail-section-plot.tsx
  - components/rails/view-full-sized-dialog.test.ts
  - components/rails/view-full-sized-dialog.tsx
  - components/summary/order-form-print.test.ts
  - components/summary/use-print-fit.ts
  - components/viewer/callout-primitives.tsx
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 08: Code Review Report (Gap-Closure Follow-Up — 08-07, 08-08, 08-09)

**Reviewed:** 2026-09-08
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found (both findings are Warnings; no Critical/Blocker findings)

## Summary

This pass covers only the three gap-closure plans (08-07 View Full Sized print layout, 08-08
Metric axis labels on the example rail, 08-09 order-form blank Letter pages) and the orchestrator
follow-up fix commit `2fd8941`. `git diff 705eb48..HEAD` was used per-file to isolate exactly what
changed in each of the 11 listed files, and every changed region was read in the context of the
whole file.

Confirmed out of scope, unmodified: `components/ui/dialog.tsx` and `components/template/*` (`git
diff --stat` against the base commit returns nothing for either path).

Verification performed beyond static reading:
- `npx tsc --noEmit` — clean (the two pre-existing `LayoutProps` errors in `app/layout.tsx` /
  `app/design/layout.tsx` are unrelated to any reviewed file and predate this diff).
- `npx vitest run` — full suite green: 42 files, 2252 passed, 2 pre-existing skips.
- Traced the `computeRailPlotBounds`/`railPlotProjection`/`buildRailPlotGrid` math by hand against
  the new `labelEvery`/`leftAxisUnit` options and the two new fit-check functions
  (`railPlotTicksFit`, `railPlotLeftLabelsFit`) in `rail-section-plot.tsx` — the geometry is
  internally consistent (the `View Full Sized` dialog's true-size math never asks for callout room
  and is unaffected by any of this plan's Metric-label changes; `LEFT_PAD - Y_TICK_LABEL_GAP = 14`
  viewBox units matches the actual strip a left-axis label has to fit inside).
- Checked the `RAIL_CALLOUT_CHAR_PX` → `CALLOUT_CHAR_PX` move for stragglers (`grep` across the
  repo) — none found; `rail-callouts.ts`'s only change in this diff is the import/rename.
- Cross-checked a theoretical concern (whether the dialog's own document-global `@page {
  size: landscape }` rule could lose the CSS cascade to a stale, unscoped `@page { size: portrait
  }` rule from `order-form.css` surviving a client-side navigation from `/design/summary` — a risk
  category `order-form.css`'s own header comment names for exactly this reason) against
  `08-07-SUMMARY.md`'s post-merge measurement: the orchestrator explicitly re-measured "the
  client-side-navigation case" in headless Chrome after the fix and got one correct landscape page.
  Since this was empirically measured on the real DOM/cascade rather than assumed, it is not
  reported as a finding here.
- Cross-checked the order form page-count fix (padding zeroing) against the orchestrator's
  post-merge print-to-PDF measurement (2 pages unticked / 3 ticked, no blank pages, Letter and A4,
  both unit systems) — matches the code.

Both findings below are test-reliability issues, not behavioral bugs — every piece of production
logic touched by these three plans traces to a passing unit test, a passing type-check, or a
real post-merge print-to-PDF/ruler measurement recorded in the phase's own SUMMARY.md files.

## Warnings

### WR-01: `order-form-print.test.ts`'s third assertion can never fail on the property it claims to test

**File:** `components/summary/order-form-print.test.ts:95-121`
**Issue:** The test titled *"the fitted sheet, plus the wrapper's now-zero padding, fits inside the
shortest portrait paper's printable height"* derives `fittedSheetHeightIn` from the real `@page`
margin, `PAGE_MARGIN_MM`, `MM_PER_INCH`, `FIT_SAFETY` and `PORTRAIT_PAPER_IN` — all read from the
actual source files, none hand-typed, exactly as the plan intended. But the "wrapper's now-zero
padding" half of the claim is not read from anywhere; it is a hardcoded literal:

```ts
// The wrapper's screen padding no longer reaches print (pinned by the first test above), so
// it contributes 0 to the printed flow.
const wrapperPrintPaddingIn = 0;
```

Because `FIT_SAFETY` (0.995) is always strictly less than 1, `fittedSheetHeightIn` is always
strictly less than `printableHeightIn` regardless of the value of `wrapperPrintPaddingIn` — the
assertion `fittedSheetHeightIn + 0 <= printableHeightIn` is true for any value of `FIT_SAFETY < 1`
and has no dependency on whether `order-form.css` actually zeroes the wrapper's padding. It reads
as "prove the padding fix keeps the sheet on the page," but it is actually just re-proving
`FIT_SAFETY < 1`, a fact unrelated to this plan's change. The comment even names the real source of
truth ("pinned by the first test above") — i.e., the author already knew this test's real coverage
comes entirely from WR-01's sibling test (the `padding: 0 !important` regex, `order-form-print.
test.ts:70-76`), and this third test adds no independent signal. If a future edit weakens or
relocates that first regex test (e.g., the padding reset moves to a rule `firstOrderFormPageRuleBody`
doesn't scan, or is changed to a value other than `0`), this third test will keep passing and give
false confidence that the "sheet fits the page" property still holds.
**Fix:** Either derive `wrapperPrintPaddingIn` from the same CSS body the first test already
extracts (so a regression in the padding reset also fails this test), or remove the third test and
fold its paper-size arithmetic into the first as a comment — a single test that reads
`firstOrderFormPageRuleBody(css)` for the padding value AND checks the height budget is a stronger
guarantee than two tests where the second's guarantee is a subset of `FIT_SAFETY < 1`:

```ts
it("the padding regex-matched value, plus the fitted sheet, fits inside the shortest portrait paper's printable height", () => {
  const css = readStripped(ORDER_FORM_CSS_PATH);
  const body = firstOrderFormPageRuleBody(css);
  const paddingMatch = body.match(/padding:\s*([\d.]+)\s*(?:px|mm|in)?\s*!important/);
  expect(paddingMatch, "no numeric padding value found in the print rule").not.toBeNull();
  const wrapperPrintPaddingIn = Number(paddingMatch![1]); // 0 today, but now actually read, not assumed
  // ...rest unchanged
});
```

### WR-02: The new axis-label fit check is only ever applied to the bottom (x) axis; the left (y) axis's own adjacent-tick spacing is never verified

**File:** `components/rails/rail-section-plot.tsx:336-349` (`railPlotTicksFit`), `:377-386`
(`chooseMetricLabelEvery`)
**Issue:** `railPlotTicksFit(ticks, renderScale)` is a general-purpose function — it takes any
`RailPlotTick[]` and checks adjacent-label collision — but it is only ever invoked with
`candidate.xTicks` inside `chooseMetricLabelEvery`. The `labelEvery` value it picks (which
determines how many ticks are thinned) is then applied to **both** axes via
`buildRailPlotGrid({ minX, minY, maxY }, "metric", { labelEvery })`. There is no equivalent call
checking that adjacent y-axis labels (stacked vertically, e.g. `10 mm` / `20 mm` one above the
other) don't collide with each other at the chosen `labelEvery` and the plot's measured render
scale — only `railPlotLeftLabelsFit` is applied to the y-axis, and that function checks a different
property (whether the *widest single label* fits the fixed-width left-hand strip), not whether two
*adjacent* labels' text extents overlap vertically. In the common case a two-or-three-digit y-axis
label's text width (used by the x-axis check) is comparable to or larger than its own text height,
so thinning that clears the x-axis collision will generally also clear y-axis vertical spacing —
but that relationship is never asserted, tested, or even commented on; it holds by coincidence of
the current font metrics, not by construction. `08-08-SUMMARY.md`'s own measured-scale table only
reports the fit outcome for the bottom axis and the left strip width, not left-axis adjacent-label
collision, so this gap was not independently verified there either.
**Fix:** Either call `railPlotTicksFit(candidate.yTicks, renderScale)` alongside the existing
x-axis check inside `chooseMetricLabelEvery` (thinning further if the y-axis doesn't fit at the
x-axis's own chosen `labelEvery`), or add a short comment at `railPlotTicksFit`'s call site
recording the reasoning for why only the x-axis needs the check (e.g., "label text width always
exceeds label text height for the mm ranges this plot draws, so a spacing that clears the x-axis
horizontally clears the y-axis vertically") so a future reader doesn't have to re-derive it, and add
a regression test pinning that relationship the same way the existing `railPlotTicksFit`/
`railPlotLeftLabelsFit` describe blocks pin their own scales.

---

_Reviewed: 2026-09-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
