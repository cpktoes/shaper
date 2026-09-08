---
phase: 08-the-rails-screen-finished
verified: 2026-09-08T08:30:00Z
status: human_needed
score: 7/7 must-haves verified at code level (visual/physical confirmation deferred to human checks below)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open /design/rails, click INSTRUCTIONS, confirm the example rail draws (with the 260908-adg fix, in a fixed-height card) with all ten callout names legible and non-overlapping in both Flat and Domed, side by side against the prototype."
    expected: "Example rail draws at a readable size with mark names beside it, matching the prototype's own Understanding Rail Markings plot; Corner Cut sits at the same height as the reference."
    why_human: "Visual layout/legibility — the 260908-adg sizing fix has not yet been looked at in a browser per its own SUMMARY."
  - test: "On the INSTRUCTIONS tab, confirm the 'Turning Marks Into Rail Bands' figure shows the whole example board at once (capped at ~472px tall) without scrolling, in both light and dark themes, in Imperial and Metric (station labels and tail-distance range in cm)."
    expected: "Whole board visible, card stays legible and light in every theme, Metric reads in centimetres with the unit carried once."
    why_human: "Visual/theme check plus unit-formatting review; not yet verified in a browser per 260908-adg's own SUMMARY."
  untick_and_mix_legend_check:
    test: "Untick all nine legend boxes, then tick a mixed subset, and confirm exactly the ticked line families draw while the board outline, side strip and station labels stay."
    expected: "Line families toggle independently; nothing else in the figure disappears."
    why_human: "Interactive visual behavior deferred per workflow.human_verify_mode: end-of-phase (08-03-SUMMARY)."
  - test: "Open 'View Full Sized' from the rails VIEWER toolbar, hold a ruler against the on-screen rail and the 2-inch/50.8mm check bar, in both Imperial and Metric; confirm all three tabs are offered even with a section collapsed, and that a rail wider than the dialog scrolls rather than shrinks."
    expected: "Both the check bar and a known rail dimension measure physically true; three tabs always present; drawing scrolls, never shrinks."
    why_human: "Physical screen accuracy cannot be verified by code — this is exactly the check RAIL-04's own design intends a human to make (08-04-SUMMARY)."
  - test: "Print the View Full Sized dialog with 'Fit to page' off, in both systems, and measure the printed check bar and a known rail mark with a ruler; confirm no rails-screen chrome (sidebar, tab strip, toolbar) reaches the printed page."
    expected: "Printed rail and check bar measure true; only the dialog's own content is on the page."
    why_human: "Physical print accuracy and print-hide correctness need eyes and a ruler on real paper (08-04-SUMMARY); code-level guard (WR-01 fix) confirmed present in app/design/rails/actual-size.css."
  - test: "Tick 'Include Rail Band Instructions in Print' on the rails sidebar; reload and confirm no flash from unticked to ticked; confirm the summary mirror checkbox is already ticked and both page marks read 'of 3'; sign in on a second browser/profile and confirm the value follows the account; sign out and confirm the browser-only value is preserved."
    expected: "No flash on reload; both checkboxes always agree; the preference follows a signed-in shaper across devices; sign-out preserves the browser value."
    why_human: "Cross-device/session and no-flash behavior needs a live browser and a second signed-in session (08-02-SUMMARY, 08-05-SUMMARY)."
  - test: "With the box unticked, open the summary's print preview in Imperial and Metric, on Letter and A4, and confirm pages 1 and 2 are pixel-for-pixel what they were before this milestone (same layout, values, page marks reading 'of 2', same note, nothing clipped). Tick the box and confirm a third page appears identically in both systems/paper sizes with the Flat rail and every legend line drawn regardless of the on-screen tab/legend state, never spilling to a fourth page."
    expected: "Unticked output byte-identical in appearance to pre-phase; ticked output adds a correct, fixed third page."
    why_human: "PRNT-06's order-form byte-identity proof could not run as a scripted diff — the pre-phase scratch worktree has no `.env.local` and agents are hard-blocked from creating one, so Clerk throws before any route renders (08-06-SUMMARY). This is the named Phase 7 D-10 fallback, not a shortcut invented by this verification."
  - test: "In the Neon console, on the production branch, confirm `user_preferences` has a `print_rail_instructions` boolean column; or sign in on the live site (https://shaper-coral.vercel.app), tick the box, and confirm it is still ticked in a private window signed in as the same account (a plain reload is not proof — the cookie keeps the box ticked even if the account write silently fails)."
    expected: "The column exists in production and the tick genuinely round-trips through the account, not just the cookie."
    why_human: "The shaper's own `npm run db:migrate:prod` run (twice) ended after drizzle-kit's two standard notices without ever printing the '[✓] migrations applied successfully!' line the Phase 5 run showed. The push and the deployed site were independently confirmed by the orchestrator, but no agent can read the production database, so whether the column actually exists in production is unconfirmed (08-06-SUMMARY's own caveat). This is the most consequential open item in the phase."
---

# Phase 8: The Rails Screen, Finished Verification Report

**Phase Goal:** A shaper can read what every mark on a rail cross-section means, hold the rail
against the foam at actual size, see where each rail section sits along the board, and fold that
reference sheet into what comes out of the printer.
**Verified:** 2026-09-08
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | INSTRUCTIONS tab opens beside VIEWER/DATA with a live example rail, every mark named, flips Flat/Domed and reshapes | ✓ VERIFIED (code) | `rail-band-editor.tsx:17,247,309` wires the tab; `rail-instructions.tsx` exports `RailInstructions`/`ExampleRailFigure`; golden fixture `exampleRail.{flat,domed}` pinned by `rail-bands.test.ts` ("computeRailSection example rail golden parity", 4 assertions, all pass); `rail-callouts.ts` produces the ten named callouts, tested in `rail-callouts.test.ts`; `two-option-toggle.tsx` wired and tested. Visual legibility/overlap check deferred to human (below) |
| 2 | "View Full Sized" opens a 1:1 rail with a one-line no-calibration caveat | ✓ VERIFIED (code) | `view-full-sized-dialog.tsx` exists, wired via `ViewerToolbarButton` in `rail-band-editor.tsx:254-261`; `view-full-sized-dialog.test.ts` (7 assertions) proves the formatter-derived check-bar caption, absence of a local conversion factor or `devicePixelRatio` read, and the exact caveat/print-note copy; WR-01 code-review fix (blank-print bug) confirmed present in `app/design/rails/actual-size.css`. Physical ruler-true accuracy is inherently a human check (below) |
| 3 | Plan and side views show where nose/centre/tail sections sit, with a toggleable legend | ✓ VERIFIED (code) | `rail-reference-paths.ts` ported path data pinned against `reference/project/Rails.dc.html` by a parity test; `rail-plan-side-figure.tsx` exports `RailPlanSideFigure`/`RAIL_REFERENCE_LEGEND` (9 entries)/`ALL_RAIL_REFERENCE_GROUPS`; wired into `rail-instructions.tsx` card 2 with local `visibleGroups` state (screen-only, never touches `useDesign` — confirmed by `grep -c 'useDesign' rail-instructions.tsx` = 0). Post-review sizing fix (260908-adg) applied and mechanically confirmed; visual side-by-side deferred to human (below) |
| 4 | Ticking "Include Rail Band Instructions in Print" adds a third printed page; unticked, every printed output is unchanged | ✓ VERIFIED (code) | `rail-controls.tsx:436` and `order-form.tsx:751` both read/write `usePrintRailInstructions()`; `rail-instructions-sheet.tsx` (`RailInstructionsSheet`) is a stateless, hard-`domed={false}`, all-groups sheet proven by an 8-assertion source-contract test; `order-form.tsx` renders sheets in fixed order (order form → reference → instructions, confirmed at lines 256/549/716); `PageMark`'s `of` prop threaded through all three call sites. `components/template/*`, `lib/geometry/rail-bands.ts`, `lib/models/design-snapshot.ts`, `components/summary/use-print-fit.ts`, `components/units-provider.tsx`, `app/globals.css` all confirmed byte-identical to the pre-phase commit `3210103522a3a5e59148401f57904a23fae93026` via `git diff --stat`. Three jsPDF surfaces measured byte-identical (112 pages, 0 differing content-stream operators/bytes, both systems — 08-06-SUMMARY). Order-form visual proof and the production migration state are deferred to human (below) |
| 5 | Every new number reads in the shaper's chosen system | ✓ VERIFIED (automated) | `lib/units-isolation.test.ts` (25 assertions, all pass) mechanically bans a local conversion factor in every new design-screen and print-surface file and requires `converted: true` entries to genuinely import the display boundary; `rail-instructions.tsx`, `rail-plan-side-figure.tsx`, `view-full-sized-dialog.tsx`, `rail-instructions-sheet.tsx` are all listed and pass |

**Score:** 5/5 roadmap success criteria supported by code-level evidence (tests + structural checks); 0 behavior-unverified. Several visual/physical/production-state confirmations are deferred to human verification per `workflow.human_verify_mode: end-of-phase` — see Human Verification Required.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/rails/rail-instructions.tsx` | INSTRUCTIONS tab body + example rail | ✓ VERIFIED | Exists, exports `RailInstructions`/`ExampleRailFigure`/`exampleRailThickness`, wired into `rail-band-editor.tsx` |
| `components/rails/rail-callouts.ts` | Callout layout math | ✓ VERIFIED | Exists, tested (`rail-callouts.test.ts`), 10 anchors, de-overlap pass |
| `components/viewer/two-option-toggle.tsx` | Shared Flat/Domed control | ✓ VERIFIED | Extracted byte-for-byte from `fin-controls.tsx`'s `PillButton`; source-contract test passes; `fin-controls.tsx` untouched (`git diff --quiet` confirmed in 08-01-SUMMARY) |
| `lib/geometry/__fixtures__/prototype-rails-golden.json` (`exampleRail` key) | Golden fixture, never hand-typed | ✓ VERIFIED | `exampleRail.flat`/`exampleRail.domed` present; `npm run golden:rails` re-run leaves the file byte-identical (idempotent) |
| `components/rails/rail-reference-paths.ts` | Ported plan/side path data | ✓ VERIFIED | Pinned against prototype source by parity test; `public/rail-bands-plan-bg.png` byte-identical to `reference/project/assets/rail-bands-plan-bg.png` (`cmp` exits 0), reference copy untouched |
| `components/rails/rail-plan-side-figure.tsx` | Plan/side figure + legend | ✓ VERIFIED | Exports `RailPlanSideFigure`, `RAIL_REFERENCE_LEGEND` (9 entries), `ALL_RAIL_REFERENCE_GROUPS`; sizing fix (260908-adg) applied |
| `components/rails/view-full-sized-dialog.tsx` | 1:1 dialog | ✓ VERIFIED | Exists, wired, tested; WR-01 print-hide fix present |
| `app/design/rails/actual-size.css` | 1:1 print CSS | ✓ VERIFIED | Guards every rule with `:has([data-view-full-sized-dialog])` per WR-01 fix |
| `lib/print-instructions-preference.ts`, `lib/print-instructions-server.ts`, `components/print-instructions-provider.tsx`, `app/actions/print-instructions.ts` | Preference stack | ✓ VERIFIED | All exist; mirror `units-preference.ts`'s shape via generic `lib/preference-handoff.ts`; `lib/units-preference.test.ts` unedited and green (regression proof) |
| `lib/db/schema.ts` (`print_rail_instructions` column) + `drizzle/0003_early_pete_wisdom.sql` | Nullable preference column | ✓ VERIFIED (dev) / ? UNCERTAIN (prod) | Column present in schema; migration SQL is a bare nullable `ADD COLUMN`; applied to Neon **development** branch (confirmed idempotent by two runs); **production** application is only shaper-reported, not independently confirmed (see Human Verification) |
| `components/summary/rail-instructions-sheet.tsx` | Fixed third print sheet | ✓ VERIFIED | Exists, exports `RailInstructionsSheet`; 8-assertion source-contract test (no state, hard `domed={false}`, import allow-list, verbatim copy, correct placement, shared `data-order-form-sheet` hook) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `rail-band-editor.tsx` `RailPage` union | `RailInstructions` render | tab click | ✓ WIRED | Line 309 render branch |
| `rail-instructions.tsx` | `computeRailSection`/`buildRailSegments`/`buildRailProfile`/`railPlotBounds` | direct calls | ✓ WIRED | `lib/geometry/rail-bands.ts` confirmed byte-identical to pre-phase (untouched) |
| `rail-callouts.ts` anchors | `RailSectionPlot` `callouts` prop | optional prop | ✓ WIRED | Absent-prop path proven pixel-identical by existing `rail-section-plot.test.ts` staying green |
| `rail-band-editor.tsx` VIEWER toolbar | `ViewFullSizedDialog` | `ViewerToolbarButton` open state | ✓ WIRED | Lines 254–261 |
| `usePrintRailInstructions()` | `order-form.tsx` sheet count / `PageMark` `of` prop | hook call | ✓ WIRED | `sheetCount` derived once, threaded to all three `PageMark` calls |
| `RailInstructionsSheet` | `ExampleRailFigure` (domed=false) + `RailPlanSideFigure` (all groups) | direct render | ✓ WIRED | Confirmed by source-contract test |
| Third `<Sheet>`'s `data-order-form-sheet` | `useOrderFormPrintFit`'s per-sheet walk | shared attribute, `use-print-fit.ts` untouched | ✓ WIRED | `git diff --quiet components/summary/use-print-fit.ts` against baseline confirmed |
| New print-surface files | `lib/units-isolation.test.ts` print-surface ledger | by-name append | ✓ WIRED | All four new print surfaces listed and pass the stricter print-specific checks |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RAIL-02 | 08-01 | INSTRUCTIONS tab, example rail, golden-pinned | ✓ SATISFIED | Code + tests confirmed above |
| RAIL-03 | 08-01 | Flat/Domed toggle reshapes the rail | ✓ SATISFIED | `two-option-toggle.tsx` wired, tested |
| RAIL-04 | 08-04 | View Full Sized 1:1, no calibration | ✓ SATISFIED (code); physical accuracy is inherently a human check | See Human Verification |
| RAIL-05 | 08-03 | Plan/side figure with legend | ✓ SATISFIED | Ported and pinned; sizing fix applied |
| RAIL-06 | 08-01,03,04,05 | Units through display boundary | ✓ SATISFIED | `lib/units-isolation.test.ts` green |
| PRNT-05 | 08-02, 08-05 | Print-instructions preference, two tick-boxes | ✓ SATISFIED (dev); prod state uncertain | Dev migration applied and idempotent; prod migration shaper-reported only |
| PRNT-06 | 08-06 | Unticked output byte-identical | ✓ SATISFIED for jsPDF surfaces (measured); order-form claim rests on deferred human audit per named Phase 7 fallback | REQUIREMENTS.md marks PRNT-06 "Pending" intentionally, per phase instructions — not treated as a gap here |

No orphaned requirements found: all seven IDs (RAIL-02..06, PRNT-05, PRNT-06) declared in ROADMAP.md Phase 8 are claimed by at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/rails/view-full-sized-dialog.tsx` | 71 | `react-hooks/set-state-in-effect` — `setPxPerInch(measurePxPerInch())` called synchronously inside a `useEffect` | ⚠️ Warning | `npm run lint` reports this as an **error** (not a warning), introduced by this phase's new file (08-04). The 260908-adg quick task summary incorrectly described a *different* lint finding (`rail-band-editor.tsx`'s dev-only `console.log`, IN-01 from the code review) as "pre-existing"; this specific `view-full-sized-dialog.tsx` lint error was not caught by the 08-REVIEW.md code review and was not fixed. It does not break functionality (an extra render at most, not a correctness bug) but it means `npm run lint` — one of CLAUDE.md's listed project commands — is not currently clean. Recommend a small follow-up quick task moving the measurement into a layout-effect-free pattern (e.g. `useState` lazy initializer + `ResizeObserver`, or accepting the lint suppression with a comment) rather than leaving an unaddressed lint error in a shipped file. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/placeholder/stub patterns found in any of the 39 non-`.planning/` files this phase touched (checked against the pre-phase baseline commit).

### Human Verification Required

See the `human_verification` list in the frontmatter above for the full set of deferred checks (visual/legibility, cross-device preference sync, physical ruler-true accuracy, print-preview byte-identity for the order form, and — most importantly — independent confirmation that the `print_rail_instructions` column actually exists on the **production** database, since the shaper's own migration run never printed drizzle-kit's success line).

### Gaps Summary

No code-level gaps found. All artifacts exist, are substantive, are wired, and pass their tests;
`npm test` (2208 passed, 2 skipped, 0 failed) and `npx tsc --noEmit` (clean) both confirmed green
from this checkout. `components/template/*`, `lib/geometry/rail-bands.ts`,
`lib/models/design-snapshot.ts`, `components/summary/use-print-fit.ts`,
`components/units-provider.tsx`, `lib/units-server.ts`, and `app/globals.css` are all confirmed
byte-identical to the pre-phase baseline commit. Both code-review findings (WR-01 blank-print bug,
WR-02 duplicated-thickness drift risk) are fixed and verified present in the current tree. The
post-review sizing quick task (260908-adg) is applied and mechanically confirmed, though its own
two visual checks are still unverified in a browser per its own SUMMARY.

The phase's remaining open items are exactly the ones the plans themselves deferred to
end-of-phase human verification (per `workflow.human_verify_mode: end-of-phase`), plus one
consequential, explicitly self-flagged uncertainty from 08-06-SUMMARY: whether the production
database migration actually completed (the terminal output never showed the expected success
line). This is not treated as a code gap — no plan or agent claims otherwise, and 08-06-SUMMARY
is honest about the caveat — but it is the single item most worth a human's direct confirmation
before considering PRNT-05/PRNT-06 fully closed in production. One non-blocking code-quality item
(the `view-full-sized-dialog.tsx` lint error) is also worth a small follow-up.

---

_Verified: 2026-09-08_
_Verifier: Claude (gsd-verifier)_
