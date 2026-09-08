---
phase: 08-the-rails-screen-finished
verified: 2026-09-08T15:35:00Z
status: passed
score: 5/5 roadmap success criteria verified; 7/7 requirements satisfied (PRNT-06 satisfied-pending-completion-mark, per phase instructions)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "5/5 roadmap success criteria supported by code-level evidence; several visual/physical/production-state items deferred to human verification"
  gaps_closed:
    - "G-08-5: View Full Sized dialog print was shifted half a dialog off the page and auto-shrunk — fixed in 08-07 + orchestrator follow-up 2fd8941 (translate reset moved into the dialog's own verbatim style element; landscape @page rule added; sign-in banner print-hidden)"
    - "G-08-9: In Metric, the INSTRUCTIONS example rail's axis numbers collided (bottom axis) and clipped (left axis) — fixed in 08-08 + review follow-up ca8778f + orchestrator fix d46307f (labelEvery thinning, leftAxisUnit suppression, inside-plot fallback placement, stacked-label fit check)"
    - "G-08-10: Order form printed a blank first and last page on Letter — fixed in 08-09 + review follow-up d2daaab (wrapper padding zeroed for print, @page margin now cross-checked against use-print-fit.ts's PAGE_MARGIN_MM)"
  gaps_remaining: []
  regressions: []
---

# Phase 8: The Rails Screen, Finished Verification Report

**Phase Goal:** A shaper can read what every mark on a rail cross-section means, hold the rail
against the foam at actual size, see where each rail section sits along the board, and fold that
reference sheet into what comes out of the printer.
**Verified:** 2026-09-08
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 08-07, 08-08, 08-09, closing UAT gaps G-08-5,
G-08-9, G-08-10)

## What changed since the previous verification

The previous 08-VERIFICATION.md (`status: human_needed`) certified 7/7 must-haves at the code
level and deferred eight items to a human UAT pass. The shaper then ran that UAT (08-UAT.md):
7 of 10 tests passed outright (tests 1–4, 6–8 — including the physical ruler check of View Full
Sized on screen, the print preference following the account with no flash, the order form's
unticked/ticked page content, and the production database column). Three tests found real bugs
(G-08-5, G-08-9, G-08-10), which were fixed by gap-closure plans 08-07/08-08/08-09, code-reviewed
(08-REVIEW.md, 2 warnings, both fixed per 08-REVIEW-FIX.md), and re-measured by the orchestrator
on `main` after merge.

This verification does not re-litigate the seven UAT passes. It (a) confirms the gap-closure code
genuinely exists and is wired, (b) confirms the code-review fixes are genuinely applied, (c) runs
the full test suite, `tsc`, `build` and `lint` itself, and (d) independently re-measures all three
closed gaps with its own headless-Chrome PDF/DOM checks — not trusting the SUMMARY's own numbers.

## Independent Re-Measurement (this verification's own evidence)

Run against the phase's own dev server (`next dev -p 3005`, already running, signed out) with a
fresh headless Chrome 152 instance driven over CDP — same method the orchestrator and UAT used,
run again independently rather than reused.

| Gap | Check | Result |
|-----|-------|--------|
| G-08-5 | Open View Full Sized, print to PDF (Letter, `preferCSSPageSize: true`) | **1 page, landscape** (792×612pt); extracted text contains the check-bar caveat ("This assumes a standard screen at 100% zoom... Check bar: 2\"") and the ten mark names; contains no "Sign in", "VIEWER", "DATA" or "INSTRUCTIONS" text — no chrome or banner leaked onto the page |
| G-08-5 | Dialog's own print `<style>` element | Present in the live DOM once the dialog is open, containing both `landscape` and `translate: none` — matches 08-07-SUMMARY's fix (the reset was moved off the stylesheet, which Lightning CSS was folding into `transform`, into the dialog's own verbatim style tag) |
| G-08-9 | INSTRUCTIONS tab, Metric, Flat — every `<text>` element's bounding box inside the plot's first multi-label `<svg>` (27 labels) | **0 overlapping label pairs, 0 labels clipped left of the svg's own box** (bottom axis reads 0, 20 mm, 40 … 200 — every 20mm; left axis reads bare 0/20/40/60/80, drawn inside the plot) |
| G-08-9 | Same check after clicking Domed | **0 overlaps, 0 clipped** — same 27-label count, confirming the fix holds across both rail shapes |
| G-08-10 | Order form print-to-PDF, box unticked, Letter | **2 pages**, 612×792pt each — no blank leading/trailing page |
| G-08-10 | Order form print-to-PDF, box ticked (cookie set), Letter | **3 pages**, 612×792pt each |
| G-08-10 | Order form print-to-PDF, box ticked, A4 | **3 pages**, 595.9×841.9pt each |

All three gaps are independently confirmed closed by direct PDF/DOM measurement taken during this
verification — not merely re-stating the SUMMARY's own claims.

## Automated Checks (run by this verification)

| Check | Command | Result |
|-------|---------|--------|
| Full test suite | `npx vitest run` | **42 files, 2255 passed, 2 skipped, 0 failed** |
| Gap-closure test files (isolated) | `npx vitest run components/rails/view-full-sized-dialog.test.ts components/rails/rail-section-plot.test.ts components/summary/order-form-print.test.ts` | **3 files, 39 passed** |
| Type check | `npx tsc --noEmit` | Clean, exit 0 (the two pre-existing `LayoutProps` errors the phase's SUMMARYs mention are no longer present) |
| Production build | `npm run build` | Compiled and typechecked successfully, all 8 routes generated |
| Lint | `npm run lint` | **0 errors**, 10 pre-existing unrelated warnings (no-img-element in `rail-plan-side-figure.tsx`, unused vars/eslint-disable in test/scripts files). The `view-full-sized-dialog.tsx` `react-hooks/set-state-in-effect` lint **error** the previous verification flagged as an open anti-pattern is **gone** — `npx eslint components/rails/view-full-sized-dialog.tsx` reports nothing |
| Git working tree | `git status --short` | Clean before and after this verification |
| Gap-closure commits present on `main` | `git log -1 <hash>` for all 11 referenced commits | All 11 found (4a28874, 27a26a8, 2fd8941, 1df06ef, 2843309, 5bef3f1, ca8778f, d46307f, 1360d62, bc9f13d, d2daaab) |

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | INSTRUCTIONS tab opens beside VIEWER/DATA with a live example rail, every mark named, flips Flat/Domed and reshapes | ✓ VERIFIED | Code-level wiring unchanged from prior verification (`rail-band-editor.tsx:309`, `rail-instructions.tsx`, golden-pinned `rail-bands.test.ts`); UAT test 1 (Imperial legibility) and test 3 (legend toggling) PASSED by the shaper; the Metric-only axis-label defect (G-08-9) is now independently confirmed fixed above, in both Flat and Domed |
| 2 | "View Full Sized" opens a 1:1 rail with a one-line no-calibration caveat, on screen and on paper | ✓ VERIFIED | UAT test 4 (physical ruler, on screen) PASSED by the shaper. The print half (test 5, G-08-5) FAILED at UAT and is now independently confirmed fixed: this verification's own PDF measurement shows one landscape page, all content inside the margins, correct caveat/check-bar text, no chrome — matching the orchestrator's own 143.99pt/625.5pt measurements in 08-07-SUMMARY |
| 3 | Plan and side views show where nose/centre/tail sections sit, with a toggleable legend | ✓ VERIFIED | Unchanged from prior verification; UAT test 2 (whole-board figure sizing, Metric station labels) and test 3 (legend) both PASSED by the shaper |
| 4 | Ticking "Include Rail Band Instructions in Print" adds a third printed page; unticked, every printed output is unchanged | ✓ VERIFIED | UAT test 6 (preference follows account, no flash) and test 7 (order-form content unticked/ticked) PASSED by the shaper. The page-count defect (test 10, G-08-10 — blank first/last page on Letter) FAILED at UAT and is now independently confirmed fixed: this verification's own print-to-PDF shows exactly 2 pages unticked / 3 ticked on both Letter and A4, no blank pages |
| 5 | Every new number reads in the shaper's chosen system | ✓ VERIFIED | `lib/units-isolation.test.ts` (still green, unmodified by gap closure) mechanically bans a local conversion factor in every new design-screen/print-surface file; the Metric axis-label fix (G-08-9) is a rendering-density fix, not a units fix, and does not touch any conversion path — confirmed unmodified files in `lib/geometry/units.ts` |

**Score:** 5/5 roadmap success criteria verified — all three UAT-identified gaps closed and
independently re-measured; the remaining seven UAT passes stand as human-verified per the run
context and are not re-litigated here.

### Required Artifacts (gap-closure additions since prior verification)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/design/rails/actual-size.css` | Print-rule fix for the dialog's off-page shift (G-08-5) | ✓ VERIFIED | `transform: none` reset retained; comment explains why `translate: none` deliberately does **not** live here (Lightning CSS folds it into `transform`) and instead rides in the dialog's own style element |
| `components/rails/view-full-sized-dialog.tsx` | Own verbatim `<style>` with landscape `@page` + `translate: none` (G-08-5) | ✓ VERIFIED | Lines 161–166: plain `<style>` element, mounted only while the dialog is open; confirmed present in the live DOM by this verification's own CDP check |
| `components/auth/sign-in-banner.tsx` | `data-print-hide` on signed-out print (G-08-5) | ✓ VERIFIED | Attribute present at line 81; confirmed by this verification's PDF text extraction (no "Sign in" text on the printed page) |
| `components/rails/rail-section-plot.tsx` | `railPlotTicksFit`, `railPlotStackedLabelsFit`, `railPlotLeftLabelsFit`, `labelEvery`/`leftAxisUnit` options (G-08-9 + WR-02 fix) | ✓ VERIFIED | All four functions present and wired into `chooseMetricLabelEvery`, which now checks **both** axes (`railPlotTicksFit(candidate.xTicks, ...)` AND `railPlotStackedLabelsFit(candidate.yTicks, ...)`) — closing WR-02, the code-review finding that only the x-axis was checked |
| `components/summary/order-form.css` | Wrapper padding zeroed for print (G-08-10) | ✓ VERIFIED | `[data-order-form-page] { padding: 0 !important }` present, on the same rule that already pins the wrapper white |
| `components/summary/order-form-print.test.ts` | Source-contract tests pinning the padding reset + margin mirror (G-08-10 + WR-01 fix) | ✓ VERIFIED | 3 assertions; the third assertion's `wrapperPrintPaddingIn` is now read from the stylesheet via `firstOrderFormPageRuleBody`/`paddingToInches`, not hardcoded to `0` — closing WR-01, the code-review finding that the third test could never fail on the property it claimed to test |

### Code Review Findings — Fix Confirmation

| Finding | Status | Evidence |
|---------|--------|----------|
| WR-01 (test can't fail on its own claim) | ✓ FIXED | `order-form-print.test.ts:83-90` — `wrapperPrintPaddingIn` derived from a regex match on the print rule's own body, not a literal `0`; the fix report's "bites-the-bug" check (temporarily setting padding to 32px and confirming the test fails) is a real regression-proof pattern |
| WR-02 (y-axis label collision never checked) | ✓ FIXED | `chooseMetricLabelEvery` (rail-section-plot.tsx) now requires both `railPlotTicksFit` and `railPlotStackedLabelsFit` to pass; `railPlotStackedLabelsFit` exported and tested at multiple render scales including a contrived failing case |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RAIL-02 | 08-01 | INSTRUCTIONS tab, example rail, golden-pinned | ✓ SATISFIED | REQUIREMENTS.md `[x]`; unchanged since prior verification |
| RAIL-03 | 08-01 | Flat/Domed toggle reshapes the rail | ✓ SATISFIED | REQUIREMENTS.md `[x]`; confirmed clean in both shapes by this verification's Metric axis check |
| RAIL-04 | 08-04, 08-07 | View Full Sized 1:1, no calibration, prints true size and clean | ✓ SATISFIED | REQUIREMENTS.md `[x]`; UAT test 4 passed (screen); G-08-5 (print) independently re-measured fixed by this verification |
| RAIL-05 | 08-03 | Plan/side figure with legend | ✓ SATISFIED | REQUIREMENTS.md `[x]`; unchanged since prior verification |
| RAIL-06 | 08-01,03,04,05,08 | Units through display boundary | ✓ SATISFIED | REQUIREMENTS.md `[x]`; `lib/units-isolation.test.ts` still green; G-08-9's fix is a label-density fix, not a units-boundary change |
| PRNT-05 | 08-02, 08-05 | Print-instructions preference, two tick-boxes | ✓ SATISFIED | REQUIREMENTS.md `[x]`; UAT test 6 (no flash, cross-device) and test 8 (production column) both passed |
| PRNT-06 | 08-06, 08-09 | Unticked output byte-identical; order form prints exactly its sheets | ✓ SATISFIED, pending REQUIREMENTS.md checkbox | REQUIREMENTS.md still shows `[ ]` — per phase instructions this is the checkpoint-plan convention (08-06 proved the jsPDF surfaces byte-identical; 08-09 + this verification's own independent PDF page-count measurement now proves the order form's page count too), left for the phase-completion step to mark, not treated as a gap |

No orphaned requirements: all seven Phase 8 IDs (RAIL-02..06, PRNT-05, PRNT-06) are declared by at
least one plan's `requirements`/`requirements-completed` frontmatter and are accounted for above.
`PHON-01..03` and other v1.2 requirement families are explicitly out of scope for Phase 8 (mapped
to later phases in REQUIREMENTS.md) and are not orphaned here.

### Anti-Patterns Found

None. The `view-full-sized-dialog.tsx` lint error (`react-hooks/set-state-in-effect`) the previous
verification flagged as an unresolved anti-pattern is no longer present — `npx eslint
components/rails/view-full-sized-dialog.tsx` and the full `npm run lint` both report it clean. No
`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder pattern found in any file touched by the gap-closure
plans (08-07, 08-08, 08-09) or their review-fix commits.

### Non-Blocking Note (not a gap, not routed as human verification)

Per this verification's run context: the one thing genuinely outside any automated or PDF-based
proof is a literal ruler held against a physical printed sheet of the View Full Sized dialog on a
shaper's own printer — a printer with "Fit to page" left on would still shrink it, and no scripted
check can rule that out. This verification's own PDF measurement (one landscape page, content
inside the margins, correct check-bar text) and the orchestrator's earlier point measurement
(check bar 143.99pt = 2in, rail box 625.5pt = 8.69in, PDF transform 0.75 — true size, no shrink)
together are strong evidence the geometry is correct; the shaper's own UAT test 4 already confirmed
the on-screen version measures true with a ruler. This is recorded here as information only — it
does not block the phase and is not listed as a `human_verification` item, per the run context's
explicit instruction not to send a passing phase back through UAT for a check the design has
always required.

### Gaps Summary

None. All three UAT-identified gaps (G-08-5, G-08-9, G-08-10) are closed, confirmed present and
wired in the code, confirmed by the full test suite (2255 passed), confirmed by a clean build/
typecheck/lint, and independently re-measured by this verification's own headless-Chrome PDF/DOM
checks rather than by trusting the gap-closure plans' own SUMMARY claims. Both code-review warnings
from the gap-closure pass (WR-01, WR-02) are fixed and verified present. No regressions found in
any of the seven UAT items the shaper already passed — the files those items depend on
(`rail-bands.ts`, `rail-callouts.ts`'s Imperial path, `use-print-fit.ts`'s numeric constants,
`lib/units-isolation.test.ts`) are unmodified or, where modified, are covered by tests confirmed
green above. Phase 8's goal is achieved: a shaper can read every rail-cross-section mark, hold the
rail true-size against the foam on screen and on paper, see where each section sits on the board,
and fold that reference sheet into what the printer actually produces.

---

_Verified: 2026-09-08_
_Verifier: Claude (gsd-verifier)_
