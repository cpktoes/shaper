---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: Accounts & Saved Designs
status: planning
stopped_at: Completed quick task 260822-vcs (viewer callout system)
last_updated: "2026-08-22T09:03:00.000Z"
last_activity: 2026-08-22
last_activity_desc: Completed quick task 260822-vcs (viewer callout system)
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-18)

**Core value:** The rail-band and fin-placement calculators produce numbers a shaper trusts enough to cut foam to — everything else supports that.
**Current focus:** Phase 01 — foundation-port-deploy-the-design-tool

## Current Position

Phase: 2 — Accounts & Saved Designs
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-21 — Phase 01 complete, transitioned to Phase 2

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 91min | 3 tasks | 13 files |
| Phase 01 P02 | 34min | 3 tasks | 8 files |
| Phase 01 P03 | 26min | 3 tasks | 2 files |
| Phase 01 P04 | 20min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Existing Claude Design prototype (rail-band + fin-placement calculators) is ported into `reference/` and rebuilt as the real app in Phase 1, not rebuilt from scratch
- [Roadmap]: ROCK-01 and FOIL-01 (rocker/foil editors) deferred to Phase 4 — Phase 1's port carries the rail-band/fin-placement calculators forward; volume (Phase 3) initially computes off outline+rocker before foil becomes user-editable in Phase 4
- [Roadmap]: This roadmap covers build-guide milestones M1-M3 only; M4 (invite shapers), M5 (billing/Pro), M6 (exports/sharing/gallery) are future milestones, not in v1 requirements
- [Phase ?]: 01-01: DesignProvider+SiteNav promoted to root layout so / and /design/* share one board-state instance
- [Phase ?]: 01-01: body clamped to h-full+overflow-hidden and every aside+main design shell switched from flex-wrap to flex-nowrap+h-full so panels respect the viewport (sidebar scrolls, viewer fits, no page scroll)
- [Phase ?]: 01-01: mobile/phone-width layout (cards overlapping sidebar below ~640px) explicitly deferred to a later phase per user
- [Phase ?]: 01-02: hideCallouts on OutlineViewer extended to also suppress the dashed centerline/station reference lines (not just the dimension overlay) so preset-card thumbnails at full editor scale stay clean
- [Phase ?]: 01-02: hasBoardInProgress is a flag set on write inside applyPreset/updateOutline, never derived by comparing the outline against its default
- [Phase ?]: 01-03: Deployed live at https://shaper-coral.vercel.app, Git-integrated to main for auto-deploy on push, zero secrets/env vars in the platform
- [Phase ?]: 01-03: Node version pinned in Vercel's own project setting (not package.json's engines field), keeping package.json untouched per plan 02's concurrency assumption
- [Phase ?]: [Phase 1] 01-04: turbopackSourceMaps disabled in next.config.ts — server-chunk .js.map was leaking the dev-only preset-capture affordance's label text even though the compiled .js correctly dead-code-eliminated it
- [Phase ?]: [Phase 1] 01-04: only Mid-length and Longboard presets were captured/tuned; Shortboard and Fish reviewed live and kept at their original drafted values by the shaper's own approval
- [Phase ?]: [Phase 1] 01-04: hideFinMarks added to OutlineViewer (per-consumer gate, following hideCallouts) to suppress fin marks on the outline editor screen only, per checkpoint feedback
- [Phase ?]: [Phase 1] 01-04: fin-callout centering fix in components/fins/fin-viewer.tsx (outside plan's declared files) treated as a contained deviation and fixed directly — maxLeftTier now centers the tier-stacking vertical offset instead of assuming a fixed reference tier
- [Quick 260821-prf]: applyPreset rebuilds state as `{ ...DEFAULT_DESIGN_STATE, outline, rails, fins, boardStarted: true }` so any future DesignState field resets safely by default instead of silently carrying over
- [Quick 260821-prf]: Volume-import toggle actions (toggleImportTemplateDimensions, toggleImportRailThickness) also set boardStarted: true for consistency with WR-02, even though not explicitly named in the plan
- [Quick 260821-prf]: BoardPreset extended with rails/fins, all four presets seeded (not hand-tuned) from DEFAULT_RAIL_BAND_SPEC/DEFAULT_FIN_PLACEMENT_SPEC per user decision — real per-board-type tuning happens via the new Rails/Fins capture affordances in a follow-up session
- [Quick 260821-bt3]: Bottom Tuck 3 override floor enforced in rail-bands.ts's computeSectionInches (geometry layer), not only in the UI slider bounds — a UI-only guard would leave a stale override permanently shadowing the symmetrical derivation, which was the unrecoverable part of the original bug
- [Quick 260821-bt3]: Rail Controls Bottom Tuck 3 slider min/max now computed per-section (bottomTuck1 floor, max(1.5", current value)) instead of the shared static TUCK_BOUNDS constant, since the legal range depends on symmetrical/family/scale/thickness
- [Quick 260821-bt3b]: Bottom Tuck 3 override floor tightened from inclusive to strict via a named exported MIN_BOTTOM_TUCK_SEPARATION_IN (1/16in) constant, not a floating-point epsilon — tied to the app's fractional-inch display/slider granularity
- [Quick 260821-bt3b]: New bottomTuck3Derived result field (geometry layer) exposes the un-overridden bottomTuck3 value including the hardEdge rule, so rail-controls.tsx's slider max can track it instead of recomputing symmetrical/hardEdge branching in the component
- [Quick 260821-rss]: Rail Viewer plots solve for one shared measured WIDTH (not height) since every open section's viewBox width is identical by construction -- rendering all plots at that one width forces one shared scale and aligned x-axes, superseding 260821-rpf's proportional-height flex-grow approach which let scale/left-edge drift between plots
- [Quick 260822-vcs]: Outline/fin viewers rebuilt on the callout-system grammar (sketches 001-004): shared components/viewer/callout-primitives.tsx module with rail/gutter constants (not per-call arguments), SVG <text> throughout (no more absolutely-positioned HTML overlay), hideCallouts keeps the legacy tight viewBox so preset-card thumbnails stay pixel-identical; fin mark's own lateralKind dash preserved (keys result.legend's Front/Rear/Center grouping) rather than collapsed with the callout leader-line dashes

### Pending Todos

1 pending:

- [minor/general] Add finished-board photo uploads with ratings — `.planning/todos/pending/2026-08-19-add-finished-board-photo-uploads-with-ratings.md`

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260818-kvp | Rebuild Template/outline editor screen: lib/geometry units+outline port with Vitest golden tests, plus outline editor page with Tailwind+shadcn | 2026-08-18 | c408bb0 | [260818-kvp-rebuild-template-outline-editor-screen-l](./quick/260818-kvp-rebuild-template-outline-editor-screen-l/) |
| 260818-lm0 | Rebuild Rail Band Calculator screen: lib/geometry rail-bands port with Vitest golden tests, plus rails screen with cross-section plots and data table | 2026-08-18 | 6d01d2e | [260818-lm0-rebuild-rail-band-calculator-screen-lib-](./quick/260818-lm0-rebuild-rail-band-calculator-screen-lib-/) |
| 260818-mr2 | Rebuild Fin Setup & Placement screen: lib/geometry fins port (placement models, toe equations, McKee aim tables) with Vitest golden tests, plus fins screen with dimensioned diagram, data and model info tabs | 2026-08-18 | 3378684 | [260818-mr2-rebuild-fin-setup-and-placement-screen-l](./quick/260818-mr2-rebuild-fin-setup-and-placement-screen-l/) |
| 260818-nyw | Rebuild Volume Estimator screen: lib/geometry volume port with Vitest golden tests, shared design store wiring outline+rails+fins, volume screen with factor and real-geometry paths | 2026-08-18 | 14b4834 | [260818-nyw-rebuild-volume-estimator-screen-lib-geom](./quick/260818-nyw-rebuild-volume-estimator-screen-lib-geom/) |
| 260818-u1n | Port Summary screen: six-panel dashboard at /design/summary composing existing views via additive compact props, board name in shared store, one-page landscape print path | 2026-08-18 | 124f1fc | [260818-u1n-port-the-summary-screen-following-the-es](./quick/260818-u1n-port-the-summary-screen-following-the-es/) |
| 260821-dmg | Fix two phase 01 UAT UI issues: dev-only "Copy preset values" button restyled for dark sidebar legibility; Corner Cut Offset slider given its own narrower/finer bounds separate from Bottom Tuck 3 | 2026-08-21 | e08614a | [20260821-uat-ui-fixes](./quick/20260821-uat-ui-fixes/) |
| 260821-prf | Extend presets to rail bands and fin setups (seeded from defaults); fix applyPreset board-replacement and boardStarted tracking (REVIEW.md WR-01, WR-02); dev-only preset-capture affordances added to Rails and Fins screens | 2026-08-21 | 329872f | [20260821-preset-rails-fins](./quick/20260821-preset-rails-fins/) |
| 260821-bt3 | Fix Bottom Tuck 3 slider inverting rail geometry: floor override at Bottom Tuck 1 in rail-bands.ts geometry layer (not just UI), dynamic slider bounds in rail-controls.tsx, golden-wide invariant test coverage | 2026-08-21 | 8fff110 | [20260821-bottom-tuck3-floor](./quick/20260821-bottom-tuck3-floor/) |
| 260821-bt3b | Refine Bottom Tuck 3 fix: strict (not merely non-inverting) separation via named MIN_BOTTOM_TUCK_SEPARATION_IN constant, plus new bottomTuck3Derived geometry field so the slider can always climb back to its natural value | 2026-08-21 | e717db5 | [20260821-bottom-tuck3-refine](./quick/20260821-bottom-tuck3-refine/) |
| 260821-rpf | Rail plots scale to fit height instead of forcing scroll: removed overflow-y-auto from Rail Viewer plots container, added computeRailPlotBounds export in rail-section-plot.tsx, proportional flex-grow stack (by natural viewBox height) with fit="height" per section | 2026-08-21 | fc80f3d | [20260821-rails-plots-fit-height](./quick/20260821-rails-plots-fit-height/) |
| 260821-rss | Fix Rail Viewer plots' scale/alignment drift left by 260821-rpf: revert proportional flex-grow to a single measured shared plotWidth (ResizeObserver + measured title chrome), so all open plots share one scale and aligned x-axes | 2026-08-21 | dd8571b | [20260821-rails-plots-shared-scale](./quick/20260821-rails-plots-shared-scale/) |
| 260822-vcs | Implement the viewer callout system (sketches 001-004): new callout-system CSS tokens, shared components/viewer/callout-primitives.tsx module, outline/fin viewers rebuilt with SVG-text chips/output-rail replacing the HTML overlay, board-summary/outline-editor aspect fixes for the widened viewBox | 2026-08-22 | b3fc9b3 | [20260822-viewer-callout-system](./quick/20260822-viewer-callout-system/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-22T09:03:00.000Z
Stopped at: Completed quick task 260822-vcs (viewer callout system)
Resume file: None
