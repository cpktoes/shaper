---
phase: 08-the-rails-screen-finished
plan: 01
subsystem: rails-screen
tags: [rails, instructions-tab, callouts, golden-fixture, units]
dependency-graph:
  requires:
    - lib/geometry/rail-bands.ts (computeRailSection, buildRailSegments, buildRailProfile, railPlotBounds — read-only)
    - components/rails/rail-section-plot.tsx (RailSectionPlot, RAIL_SEGMENT_COLORS — extended)
    - components/fins/fin-controls.tsx (PillButton — extraction source, untouched)
    - lib/geometry/measure-display.ts (formatMark)
    - scripts/extract-prototype-rails-golden.mjs (extended)
  provides:
    - components/rails/rail-instructions.tsx (RailInstructions, ExampleRailFigure)
    - components/rails/rail-callouts.ts (RailCallout, RAIL_CALLOUT_ANCHORS, buildRailCallouts, deOverlapCallouts)
    - components/viewer/two-option-toggle.tsx (TwoOptionToggle)
    - RailSectionPlot's optional callouts prop
    - lib/geometry/__fixtures__/prototype-rails-golden.json exampleRail key
  affects:
    - components/rails/rail-band-editor.tsx (RailPage union widened to include "instructions")
    - lib/units-isolation.test.ts (new ledger entry)
tech-stack:
  added: []
  patterns:
    - Diagram-layout math (callouts) lives under components/, not lib/geometry/ (CLAUDE.md Rule 1)
    - Golden-fixture extension pattern: new top-level key alongside the existing per-scenario loop, never a hand-typed expected number
    - Shared two-option control extracted from a private per-screen component, byte-for-byte class strings preserved
key-files:
  created:
    - components/rails/rail-instructions.tsx
    - components/rails/rail-callouts.ts
    - components/rails/rail-callouts.test.ts
    - components/viewer/two-option-toggle.tsx
    - components/viewer/two-option-toggle.test.ts
  modified:
    - scripts/extract-prototype-rails-golden.mjs
    - lib/geometry/__fixtures__/prototype-rails-golden.json
    - lib/geometry/rail-bands.test.ts
    - components/rails/rail-band-editor.tsx
    - components/rails/rail-section-plot.tsx
    - lib/units-isolation.test.ts
decisions:
  - "Added a legitimate 'stated example thickness' label (through formatMark) to the INSTRUCTIONS card's caption row so components/rails/rail-instructions.tsx genuinely earns its converted:true ledger entry — D-19 explicitly allows a stated example thickness through formatMark as one of the card's two permitted figure types, and the units-isolation ledger's own importsDisplayBoundary check requires a converted:true file to actually import lib/geometry/measure-display."
  - "computeRailSection's ComputeRailSectionInput has no domed field — the prototype's own computeSection destructures a domed parameter but never reads it in the function body (confirmed by re-reading Rails.dc.html lines 704-722); domed only matters to buildRailSegments/buildRailProfile/railPlotBounds, which take it as a separate argument. Task 1's action text and the rail-bands.test.ts example-rail test were both written passing domed into computeRailSection and had to drop it to type-check."
  - "rail-callouts.ts imports RAIL_SEGMENT_COLORS directly from rail-section-plot.tsx (a components/ file, not lib/geometry/) rather than hardcoding a second copy of the six hex/CSS-var values, keeping one source of truth for segment colour identity. Doing so pulls in rail-section-plot.tsx's own useUnits() -> app/actions/units.ts -> lib/db/client.ts import chain, which throws at module-load time in vitest with no DATABASE_URL set — resolved with the same vi.mock('@/app/actions/units', ...) stub rail-section-plot.test.ts already uses, not by avoiding the import."
  - "Added a railPlotProjection(output, xAxisMin) export to rail-section-plot.tsx so rail-instructions.tsx builds callout anchors in the exact same inches-to-pixel space RailSectionPlot itself draws in, rather than a second, potentially-drifting projection formula in rail-instructions.tsx."
metrics:
  duration: ~65min
  completed: 2026-09-08
status: complete
actuals:
  tokens: 11342
  tasks: 3
  commits: 5
---

# Phase 08 Plan 01: The INSTRUCTIONS Tab and Its Example Rail Summary

A third tab, INSTRUCTIONS, now sits beside VIEWER and DATA on the rails screen: it draws the
prototype's own "Understanding Rail Markings" example rail — computed through the app's own rail
band calculator, never hand-typed — with all ten of the prototype's mark names (Apex, Domed Taper,
Rail Mk1, Corner Cut, Deck 3, Deck 2, Deck 1, Tuck 1, Bottom Tuck 1, Bottom Tuck 3) labelled in
their DATA-tab legend colours, and a Flat/Domed toggle that reshapes the example between the
board's full thickness and its tapered domed rail.

## What Was Built

**Task 1 — the INSTRUCTIONS tab and its live example rail.** Extended
`scripts/extract-prototype-rails-golden.mjs` with a new `exampleRail` fixture key (Flat and
Domed states, computed by executing the prototype's own `computeSection`/`buildSegmentDefs`), and
pinned `computeRailSection` against it with a new describe block in `rail-bands.test.ts`. Created
`components/rails/rail-instructions.tsx`, exporting `ExampleRailFigure` (the live rail, run through
`RailSectionPlot`) and `RailInstructions` (the tab body, currently one card: title, caption with
a stated example thickness through `formatMark`, and the figure). Widened `RailPage` in
`rail-band-editor.tsx` to add the INSTRUCTIONS tab and its render branch, and added the new file to
`lib/units-isolation.test.ts`'s design-screen ledger. `lib/geometry/rail-bands.ts` is byte-identical
to its pre-plan state.

**Task 2 — the Flat/Domed toggle.** Extracted `fin-controls.tsx`'s private `PillButton` into a
shared `TwoOptionToggle` (`components/viewer/two-option-toggle.tsx`), proven byte-for-byte
identical to the original via a source-contract test (TDD: test written and watched fail before the
component existed). Wired it into the INSTRUCTIONS card header, right-aligned against the title;
clicking Flat or Domed now redraws the example rail. `fin-controls.tsx` itself is untouched.

**Task 3 — the ten mark callouts.** Created `components/rails/rail-callouts.ts` (pure diagram-layout
math, no React): `RAIL_CALLOUT_ANCHORS` (the ten marks' fixed key/name/side), `buildRailCallouts`
(computes each mark's pixel position from a `RailSectionOutput` and the plot's own projection), and
`deOverlapCallouts` (the prototype's cluster-and-push pass, ported behaviourally — same-side labels
closer than the minimum gap are pushed apart, opposite sides never affect each other, ties keep
input order). Added an optional `callouts` prop to `RailSectionPlot` (absent = today's exact
VIEWER-tab rendering) and corrected its stale header comment. Wired the callouts into
`ExampleRailFigure` via a new `railPlotProjection` export from `rail-section-plot.tsx`, so callout
anchors land in the same pixel space the plot itself draws in.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking] `ComputeRailSectionInput` has no `domed` field**
- **Found during:** Task 1 (writing the example-rail test) and again while wiring `ExampleRailFigure`
- **Issue:** The plan's own action text calls `computeRailSection({ ..., domed, ... })`, but
  `ComputeRailSectionInput` (the already-ported type) has no `domed` field — re-reading the
  prototype's `computeSection` (Rails.dc.html lines 704-722) confirms it destructures `domed` but
  never reads it in its own body; only `buildProfilePoints`/`buildSegmentDefs` (and the app's
  `buildRailSegments`/`buildRailProfile`) take `domed` as their own separate argument. This was
  correctly omitted when `rail-bands.ts` was first ported.
- **Fix:** Dropped `domed` from every `computeRailSection` call site added by this plan
  (`rail-instructions.tsx`, `rail-bands.test.ts`); `domed` is still passed to
  `buildRailSegments`/`buildRailProfile`/`railPlotBounds` where it belongs.
- **Files modified:** `components/rails/rail-instructions.tsx`, `lib/geometry/rail-bands.test.ts`
- **Commits:** ace70d5, 34bb981 (folded into the task commits that introduced the calls)

**2. [Rule 2 - missing critical functionality] `rail-instructions.tsx` needed a genuine display-boundary import to earn `converted: true`**
- **Found during:** Task 1, after adding the ledger entry
- **Issue:** The plan directs adding `{ file: "components/rails/rail-instructions.tsx", converted: true }`
  to `DESIGN_SCREEN_DISPLAY_FILES`, but `lib/units-isolation.test.ts`'s own
  `importsDisplayBoundary` check requires a `converted: true` file to actually import
  `lib/geometry/measure-display` — and the plan's Task 1 action text, read literally, gives the
  card no measurement text to display at all.
- **Fix:** Added a small "stated example thickness" label to the caption row, read through
  `formatMark` — exactly the figure D-19 explicitly permits ("the only figures on the card are the
  plot's grid ticks and any stated example thickness through `formatMark`") and the UI-SPEC's
  Typography table names ("Callout value text ... example rail's stated thickness"). This makes the
  ledger entry honest rather than gaming the regex check with an unused import.
- **Files modified:** `components/rails/rail-instructions.tsx`
- **Commit:** ace70d5

**3. [Rule 3 - blocking] `rail-callouts.test.ts` needed the same DB-action stub `rail-section-plot.test.ts` already uses**
- **Found during:** Task 3, first test run
- **Issue:** `rail-callouts.ts` imports `RAIL_SEGMENT_COLORS` from `./rail-section-plot`, which
  reads `useUnits()` → `app/actions/units.ts` (a real `"use server"` action) → `lib/db/client.ts`,
  which calls `neon(process.env.DATABASE_URL!)` at module-load time. With no `DATABASE_URL` in this
  worktree, importing `rail-callouts.ts` for a plain unit test crashed at import, not at any
  assertion.
- **Fix:** Added the identical `vi.mock("@/app/actions/units", () => ({ saveUnitsPreference: async () => {} }))`
  stub `rail-section-plot.test.ts` already carries (with the same explanatory comment), before the
  import — not by avoiding the `RAIL_SEGMENT_COLORS` import, which would have meant a second,
  potentially-drifting copy of the six segment colours.
- **Files modified:** `components/rails/rail-callouts.test.ts`
- **Commit:** 27c2926 (test) — the fix landed in the same RED commit since it was needed before the
  test could even fail meaningfully

None of the three required a checkpoint: all are either bugs in matching the plan to the already-
ported code (Rule 3) or filling in a detail the plan's own constraints (D-19, the units ledger)
already required (Rule 2).

## Human Verification Deferred to End-of-Phase UAT

Per `workflow.human_verify_mode: end-of-phase` and the orchestrator's ruling, every `<human-check>`
below was not performed by this executor and is carried forward for the phase's UAT pass:

- **Task 1:** Open `/design/rails`, click INSTRUCTIONS, confirm an example rail cross-section draws
  in the card with the same grid and coloured bands the VIEWER tab uses.
- **Task 2:** On the INSTRUCTIONS tab, click Domed and confirm the example rail visibly reshapes (a
  thinner rail with the domed taper), then click Flat and confirm it returns.
- **Task 3:** Side-by-side against the prototype's own Understanding Rail Markings plot, confirm all
  ten names appear, that Corner Cut sits at the same height as it does in the reference, and that no
  two names overlap in either Flat or Domed. Also confirm the VIEWER tab's three plots look exactly
  as they did before this plan — no callouts, no shift.

## Self-Check: PASSED

- FOUND: components/rails/rail-instructions.tsx
- FOUND: components/rails/rail-callouts.ts
- FOUND: components/rails/rail-callouts.test.ts
- FOUND: components/viewer/two-option-toggle.tsx
- FOUND: components/viewer/two-option-toggle.test.ts
- FOUND: commit ace70d5
- FOUND: commit 0a458ee
- FOUND: commit 85b0632
- FOUND: commit 27c2926
- FOUND: commit 34bb981
