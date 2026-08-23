---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: Accounts & Saved Designs
status: planning
stopped_at: Design pivot complete and pushed; drag confirmed good by the founder
last_updated: "2026-08-23T16:01:09.306Z"
last_activity: 2026-08-22
last_activity_desc: Accent construction lines and round drag targets (260822-was)
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
Last activity: 2026-08-23 - Completed quick task 260823-h6l: Rail plots beside a fixed-scale template window on the order form

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

11 pending:

- [minor/general] Add finished-board photo uploads with ratings — `.planning/todos/pending/2026-08-19-add-finished-board-photo-uploads-with-ratings.md`
- [minor/general] Mobile/phone-width layout polish for the design screens — `.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`
- [minor/ui] Copy-spec-to-clipboard across the design screens — `.planning/todos/pending/2026-08-21-copy-spec-to-clipboard.md`
- [minor/general] Fins imported tail uses the generic polynomial curve, not the drawn outline — `.planning/todos/pending/2026-08-21-fins-imported-template-width-branch.md`
- [minor/general] Extend presets beyond outline to rail bands and fin setups — `.planning/todos/pending/2026-08-21-presets-for-rails-and-fins.md`
- [minor/ui] Rails: port the INSTRUCTIONS page (third tab) — `.planning/todos/pending/2026-08-21-rails-instructions-page.md`
- [minor/ui] Rails viewer: View Full Sized modal and board-outline plan view — `.planning/todos/pending/2026-08-21-rails-viewer-extras.md`
- [minor/ui] Global settings: units toggle (inches vs cm) and colour themes — `.planning/todos/pending/2026-08-21-units-toggle-global-settings.md`
- [minor/ui] Verify and refit the Summary print sheet after the callout-system rebuild — `.planning/todos/pending/2026-08-22-summary-print-after-callout-system.md`
- [minor/general] Build in bottom contours with shading and selectable shapes — `.planning/todos/pending/2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`
- [minor/ui] Horizontal board view (nose left) as an option on the Template screen — `.planning/todos/pending/2026-08-23-horizontal-board-view-option.md`


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
| 260822-wcs | Widepoint Controls: Width and Offset onto one line; split railLength into independent tailRailLength/noseRailLength across spec, geometry, presets and tests | 2026-08-22 | 9991f0c | [20260822-widepoint-controls-split](./quick/20260822-widepoint-controls-split/) |
| 260822-lg3 | Draggable outline control points: new lib/geometry/outline-drag.ts inverse solve with round-trip tests, construction overlay reduced to the input side, OutlineViewer onOutlineDrag pointer handling wired to the shared store; widepoint drag constrained to offset only; viewer frame grows for wide boards instead of shrinking the drawing | 2026-08-22 | 59b3f75 | [20260822-draggable-control-points](./quick/20260822-draggable-control-points/) |
| 260822-n02 | Fix the Summary's clipped fin placement diagram: fin-viewer viewBox widened to contain its own drawing (heading and outline top were rendering outside it), Volume Estimate card made content-height so Fin Placement takes the remaining column height | 2026-08-22 | adc5c24 | [20260822-fin-placement-not-clipped](./quick/20260822-fin-placement-not-clipped/) |
| 260822-nbz | Summary Volume card brought to row parity with the Volume screen (center thickness plus the three cross-section rows); print sheet fixed to one landscape page — pinned @page margin, page box derived from Letter/A4 instead of a magic number, and the grid moved to container queries so the measured layout is the printed one | 2026-08-22 | a0c47d0 | [20260822-summary-volume-rows-and-one-page-print](./quick/20260822-summary-volume-rows-and-one-page-print/) |
| 260823-hbv | Preserve the horizontal board view as a post-MVP option: pending todo on main, live mockup as sketch 005 on branch design/horizontal-template-view | 2026-08-23 | 83ed049 | — |
| 260823-ffv | Rebuild the Summary as a portrait shop order form on branch design/order-form-summary: LB_order_form.pdf layout muse, deck+bottom outlines (fin marks on bottom only), rail plots and marking data replacing the contours checkboxes, fin placement numbers beside the bottom drawing, fin system selector replacing fin setup, live board name plus write-in fields through one shared field component | 2026-08-23 | 59f9366 | [260823-ffv-rebuild-the-summary-screen-as-a-portrait](./quick/260823-ffv-rebuild-the-summary-screen-as-a-portrait/) |
| 260823-gc4 | Remove the widepoint knots and match the station line colour on the order form: two CSS token overrides on the outline panel (--outline-widepoint-line to the station-line grey, --outline-widepoint-knot transparent), leaving the distinguishing dash and the outline editor untouched | 2026-08-23 | 10d8ed0 | [260823-gc4-remove-the-widepoint-knots-and-match-the](./quick/260823-gc4-remove-the-widepoint-knots-and-match-the/) |
| 260823-ggs | Split the order form into two portrait pages: page 1 keeps the drawings (outline panel recaptioned COLOR DESIGN & LOGOS with blank sketching space) and the rail plots, page 2 carries the rail band marking data and fin placement numbers at a 1.55x type scale with an identification strip; print-fit hook now sizes each sheet independently, fixing a 100%-sizing override and a rounding-induced blank-page risk | 2026-08-23 | 67330b3 | [260823-ggs-move-the-rail-band-and-fin-placement-dat](./quick/260823-ggs-move-the-rail-band-and-fin-placement-dat/) |
| 260823-h6l | Rail section plots moved to a left column (~1/3) beside the template window (~2/3) on order form page 1; OutlineViewer cropToBoard replaced by fixedFrame, sized from new BOARD_LENGTH_RANGE_IN/WIDEPOINT_WIDTH_RANGE_IN constants in board.ts so one window holds any board (extreme is the shortest-and-widest, 5'0" x 25") without the frame resizing per board | 2026-08-23 | c1c8359 | [260823-h6l-rail-plots-beside-a-fixed-scale-template](./quick/260823-h6l-rail-plots-beside-a-fixed-scale-template/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |
| 260822-o99 | Port the new surf design tokens to Tailwind v4 (@theme static, v3 config was inert) and move every surface onto the white ground: bg-surf-base universally, massive negative space around the 2D previews, border-surf-muted/20 hairlines only where separation is structural | 2026-08-22 | f28cbe8 | [260822-o99-port-the-new-surf-design-tokens-to-tailw](./quick/260822-o99-port-the-new-surf-design-tokens-to-tailw/) |
| 260822-ubq | Typography overhaul: headings to font-display/caps/tracking-architectural, body labels to Inter text-sm surf-muted; repaired the self-referential --font-sans that was rendering every SVG board callout in the browser default serif | 2026-08-22 | 889b3a9 | [260822-ubq-typography-overhaul-primary-headings-to-](./quick/260822-ubq-typography-overhaul-primary-headings-to-/) |
| 260822-urx | Maximise plot size and callout legibility: reclaim over-generous canvas/heading whitespace, promote the SVG callout type scale to derived constants and raise it, lift the artificial 420px rail-plot width cap, move rail plot grid/axis colours onto the surf tokens | 2026-08-22 | 07f3003 | [260822-urx-maximise-plot-size-and-callout-legibilit](./quick/260822-urx-maximise-plot-size-and-callout-legibilit/) |
| 260822-vwt | Drop the redundant TEMPLATE/RAIL/FIN VIEWER titles from the three editor canvases and give the reclaimed height to the drawings | 2026-08-22 | db5a6d1 | (fast task — no plan dir) |
| 260822-vbo | Pin callout text to a constant on-screen size across the board viewers (14px values matching table data, 11px names) by countering each SVG's fit scale; Summary stays proportional | 2026-08-22 | 839a9f7 | [260822-vbo-pin-callout-text-to-a-constant-on-screen](./quick/260822-vbo-pin-callout-text-to-a-constant-on-screen/) |
| 260822-vo2 | Task 3 of the design pivot: cyan for selection (fills, black text) and orange for warnings, with darkened ink siblings for text/strokes since neither accent clears AA on white; deleted the outline-accent aliases; grouped selection chips by whitespace | 2026-08-22 | a9e411d | [260822-vo2-task-3-cyan-for-accent-selection-and-ora](./quick/260822-vo2-task-3-cyan-for-accent-selection-and-ora/) |
| 260822-vws | Replace the cyan accent with a deeper surf blue #006994 (6.09:1); collapse the fill and ink tokens into one, flip accent fills to white text, invert the chip icons that sit on the fill | 2026-08-22 | b7fe483 | [260822-vws-replace-the-cyan-accent-with-a-deeper-su](./quick/260822-vws-replace-the-cyan-accent-with-a-deeper-su/) |
| 260822-bfw | Give the board outline a 6% accent-blue wash on screen, suppressed under @media print so a cut template stays clean; reverses the flat-white call made during the pivot | 2026-08-22 | (see log) | (fast task — no plan dir) |
| 260822-was | Construction lines onto the accent; draggable control points redrawn as three-part round targets (board-fill disc, accent ring, orange core) on exactly the five points that move, counter-scaled to a constant on-screen size | 2026-08-22 | 2b39ef6 | [260822-was-construction-lines-onto-the-accent-colou](./quick/260822-was-construction-lines-onto-the-accent-colou/) |

## Session Continuity

Last session: 2026-08-22T09:03:00.000Z
Stopped at: Design pivot complete and pushed; drag confirmed good
Resume file: None
