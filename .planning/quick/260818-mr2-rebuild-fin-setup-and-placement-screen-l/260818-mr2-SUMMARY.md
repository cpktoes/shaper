---
phase: quick-260818-mr2
plan: "01"
subsystem: ui
tags: [nextjs, typescript, tailwind, geometry, fin-placement, golden-testing, vitest]

requires:
  - phase: quick-260818-lm0
    provides: "lib/geometry/rail-bands.ts + rail screen pattern (inch-domain-core / Mm-boundary split, extract-and-execute golden fixtures, screen shape) reused verbatim for the fins port"
provides:
  - "lib/geometry/fins.ts — metric-internal, pure TS fin-placement engine covering single/twin/thruster/2+1/quad, all four thruster front models, all four quad rear models, narrow-tail and pintail corrections, and advanced overrides"
  - "lib/geometry/toe-aim-tables.ts — the transcribed McKee toe-in aim tables"
  - "/design/fins screen — sidebar, VIEWER (dimensioned tail diagram), DATA (grouped placement numbers), MODEL INFO, and the toe-in aim-table modal"
  - "FINS entry in the top nav alongside TEMPLATE and RAILS"
affects: [phase-1-foundation, future-fin-screens, cross-screen-template-import]

actuals:
  tokens: 86000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Extract-and-execute golden fixtures for a THIRD lib/geometry module (proven twice before on outline.ts and rail-bands.ts) — the harness extracts and executes renderVals() itself whole, rather than re-deriving its wiring, because most of the fin math lives inline in that one method"
    - "View-layout (dimension-arrow tier stacking) ported into the component layer grouped by FinRole rather than by raw finSetup — functionally identical, narrower and more directly derived from FinPlacementResult"

key-files:
  created:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - lib/geometry/toe-aim-tables.ts
    - lib/geometry/__fixtures__/prototype-fins-golden.json
    - scripts/extract-prototype-fins-golden.mjs
    - app/design/fins/page.tsx
    - components/fins/fin-placement-editor.tsx
    - components/fins/fin-controls.tsx
    - components/fins/fin-setup-icon.tsx
    - components/fins/fin-viewer.tsx
    - components/fins/fin-data-panel.tsx
    - components/fins/fin-model-info.tsx
    - components/fins/toe-aim-table-modal.tsx
  modified:
    - components/site-nav.tsx
    - components/outline/tail-shape-icon.tsx
    - package.json

key-decisions:
  - "FinViewer's dimension tier-stacking layout groups by the distinct FinRole present in FinPlacementResult.marks rather than re-deriving the prototype's setup-driven leftDimKinds/leftDimOffTails arrays. Functionally identical for every real configuration; the one narrow difference (a quad with Basic-Off-Rail rear no longer reserves a phantom, always-empty 'stringer' tier) is cosmetics-only and untested by any golden fixture."
  - "iconOutlinePath exported from components/outline/tail-shape-icon.tsx and reused by components/fins/fin-setup-icon.tsx for the squash outline behind the fin-setup ticks, rather than duplicating the Catmull-Rom/xBaseAt generator a second time."
  - "toeAimTableFor's rowLabel is ported to read the raw rounded board length (e.g. '59') for lengths under 60in even though the row VALUES fall back to the 72+ data — this is the prototype's own toeTableData quirk (Fins.dc.html lines 957-968), ported faithfully rather than 'fixed'."

patterns-established:
  - "Callout-halo color is hardcoded #fff (the viewer card's own white background) rather than referencing an undefined prototype CSS var (var(--sidebar-text) has no defined value in the excerpted prototype source)."

requirements-completed: [FIN-01, FIN-02, FIN-03, VIZ-01, UNIT-01]

coverage:
  - id: D1
    description: "lib/geometry/fins.ts reproduces the prototype's fin positions, spreads, toe values, summary rows, model headers and flags to within 1e-9 inch for 23 fixture states"
    requirement: "FIN-02"
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#computeFinPlacement golden parity (132 assertions across 23 fixtures)"
        status: pass
    human_judgment: false
  - id: D2
    description: "toe-aim-tables.ts transcription verified mechanically (row-length consistency) and the toeAimTableFor row/column selection matches the golden toeTableData output"
    requirement: "FIN-02"
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#toe-aim-tables row-length consistency, #toeAimTableFor row selection"
        status: pass
    human_judgment: false
  - id: D3
    description: "/design/fins renders the sidebar (board length, tail width, tail shape, fin setup, per-setup model pickers, Advanced group), the VIEWER tab's dimensioned tail diagram, the DATA tab's grouped placement numbers with Modified badge, the MODEL INFO tab, the toe-in aim-table modal, and a FINS nav entry linking all three design screens"
    requirement: "FIN-01, FIN-03, VIZ-01, UNIT-01"
    verification:
      - kind: automated_ui
        ref: "curl http://localhost:3000/design/fins — confirmed default-state text (11\", 3 5/16\", 1 3/16\", 3/8\", 6'0) and MODEL INFO/DATA tab labels present in SSR output; cross-screen nav links confirmed present on all three /design/* routes"
        status: pass
      - kind: other
        ref: "npm run build && npx tsc --noEmit && npm run lint (0 errors) && npx vitest run (397/397 passing)"
        status: pass
    human_judgment: true
    rationale: "Interactive behavior (switching fin setups/models, dragging tail width across the narrow-tail threshold, toggling the 5th fin, opening the toe-in modal, hiding callouts) requires a human clicking through the running dev server per the plan's own verification step 4 — SSR/curl checks only prove the default render, not the interaction paths."

duration: ~50min
completed: 2026-08-18
status: complete
---

# Quick Task 260818-mr2: Rebuild Fin Setup & Placement Screen Summary

**Ported the prototype's fin-placement math (single/twin/thruster/2+1/quad, all placement models, narrow-tail and pintail corrections) into `lib/geometry/fins.ts`, golden-tested against 23 extract-and-execute fixtures, plus the full three-tab `/design/fins` screen with dimensioned diagram, grouped data table, model-info reference and the McKee toe-in aim-table modal.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-08-18
- **Tasks:** 3
- **Files modified:** 16 (13 created, 3 modified)

## Accomplishments

- `lib/geometry/fins.ts` — a metric-internal, pure-TypeScript port of `renderVals` and every equation it calls (thruster/quad front models, quad rear models, twin templates, 2+1, single), with a private inch-domain core and an `Mm`-boundary public surface, matching the prototype to within 1e-9 inch across 23 fixture states.
- `scripts/extract-prototype-fins-golden.mjs` — extracts and executes `renderVals` itself (not a re-derivation of its wiring) plus every helper it reaches, against the prototype's own `Fins.dc.html` and `toe-aim-tables.js`.
- `lib/geometry/toe-aim-tables.ts` — the McKee toe-in aim tables transcribed verbatim, with row-length consistency asserted mechanically rather than by eye.
- `/design/fins` — sidebar (board length, tail width, tail shape, fin setup, per-setup model pickers, Advanced overrides with reset), VIEWER tab (dimensioned tail diagram with base lines, dimension arrows, extension lines and callouts), DATA tab (grouped placement numbers with Modified badge and Full Spread footnote), MODEL INFO tab (six reference blocks, verbatim copy), and the toe-in aim-table modal.
- FINS entry added to the top nav (`components/site-nav.tsx`), linking `/design/outline`, `/design/rails` and `/design/fins` on all three screens.

## Task Commits

Each task was committed atomically:

1. **Task 1: Port the fin-placement math with extract-and-execute golden fixtures** - `75ffc7a` (feat)
2. **Task 2: Build the /design/fins sidebar, VIEWER tab and nav entry** - `7021960` (feat)
3. **Task 3: Add the DATA and MODEL INFO tabs and the McKee toe-in aim-table modal** - `3378684` (feat)

**Plan metadata:** pending (this docs commit)

## Files Created/Modified

- `lib/geometry/fins.ts` - Fin-placement geometry engine (inch-domain core + Mm public surface)
- `lib/geometry/fins.test.ts` - Golden parity tests (23 fixtures) plus pinned-value/boundary/reset unit tests
- `lib/geometry/toe-aim-tables.ts` - McKee toe-in aim tables, transcribed verbatim
- `lib/geometry/__fixtures__/prototype-fins-golden.json` - Generated golden fixture (23 states)
- `scripts/extract-prototype-fins-golden.mjs` - Extract-and-execute golden harness
- `app/design/fins/page.tsx` - Route + metadata
- `components/fins/fin-placement-editor.tsx` - Design-state owner, tab bar, modal wiring
- `components/fins/fin-controls.tsx` - Sidebar (inputs, fin selection, Advanced, Settings)
- `components/fins/fin-setup-icon.tsx` - Fin-setup button glyphs (finGlyph/straightFinGlyph port)
- `components/fins/fin-viewer.tsx` - Dimensioned tail diagram (buildFinMark geometry port)
- `components/fins/fin-data-panel.tsx` - DATA tab
- `components/fins/fin-model-info.tsx` - MODEL INFO tab (static reference text)
- `components/fins/toe-aim-table-modal.tsx` - Toe-in aim-table modal
- `components/site-nav.tsx` - Added FINS nav entry
- `components/outline/tail-shape-icon.tsx` - Exported `iconOutlinePath` for reuse by fin-setup-icon.tsx
- `package.json` - Added `golden:fins` script, extended `golden` to run all three extractors

## Decisions Made

- **FinViewer's dimension-stacking layout groups by FinRole, not raw finSetup.** The prototype's `leftDimKinds`/`leftDimOffTails` arrays are built directly from `isThruster`/`isQuad`/`isTwin`/etc. flags that `FinPlacementResult` doesn't carry as booleans. Deriving the same shared-tier layout from the distinct `FinRole`s actually present in `result.marks` is functionally identical for every real configuration. The one narrow difference — a quad with the Basic-Off-Rail rear model no longer reserves a phantom, always-empty "stringer" dimension tier — has zero externally observable effect (nothing overlaps either way) and isn't covered by any golden fixture (golden fixtures assert placement math, not pixel layout).
- **`iconOutlinePath` exported from `tail-shape-icon.tsx`** rather than duplicated in `fin-setup-icon.tsx`, per the plan's explicit instruction to reuse the existing Catmull-Rom/xBaseAt generator for the fin-setup buttons' squash-outline backdrop.
- **Toe-in aim-table row-label quirk ported faithfully.** For board lengths under 60in, `toeAimTableFor`'s `rowLabel` reads the raw rounded length (e.g. `"59"`) even though the row *values* fall back to the `'72+'` data — verified this is genuine prototype behavior (not a porting bug) by running the prototype's own `toeTableData(59, 13)` directly before writing the test.
- **Callout halo color hardcoded to `#fff`.** The prototype's callout spans reference `var(--sidebar-text)`, a CSS custom property with no visible definition in the excerpted source (likely a page-level theme variable outside the component's own `_themeVars()`). Since the viewer card's own background is always white, hardcoding `#fff` achieves the same legibility purpose without inventing a phantom variable.

## Deviations from Plan

None - plan executed exactly as written. (The FinViewer tier-stacking grouping choice above is a deliberate implementation decision within the "view code excluded from lib/geometry, lives in components/fins/fin-viewer.tsx" scope the plan explicitly delegated to this task, not a deviation from a specified behavior.)

## Issues Encountered

- Three self-authored unit tests (not golden-derived) had incorrect expectations on first run: the Full Spread null-check used `!== undefined` instead of `!= null` (JSON serializes `fullSpreadNote: null` as a present key, not an absent one), the narrow-tail-shift assertion had the inequality direction backwards (a larger off-tail number means further from the tail, i.e. more forward), and the `toeAimTableFor` boundary test assumed length 59in selects row `'72+'` when the prototype's own `toeTableData` actually returns rowLabel `'59'` with `'72+'` values as a fallback — verified against the extracted prototype method directly, then fixed the test expectations to match.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/design/fins` is feature-complete for this quick task's scope; `tailHalfWidthAt` is the single seam where real imported template geometry will replace the polynomial fallback once cross-screen state sharing is built.
- Ready for the user's browser review per the plan's verification step 4 (switching fin setups/models, narrow-tail/pintail behavior, DATA/MODEL INFO tabs, toe-in modal, cross-screen nav) — not yet manually clicked through in a live browser session by this executor.

## Self-Check: PASSED

All 13 created files verified present on disk; all 3 task commits (`75ffc7a`, `7021960`, `3378684`) verified present in git history.

---
*Quick task: 260818-mr2*
*Completed: 2026-08-18*
