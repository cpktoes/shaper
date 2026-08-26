---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: Accounts & Saved Designs
status: planning
stopped_at: "Completed quick task 260826-07b: TabbedPanel's 12px inset defaulted; human-check (visual measurement) still pending"
last_updated: "2026-08-26T19:14:17.714Z"
last_activity: 2026-08-24
last_activity_desc: "Completed quick task 260824-i05: Reverted the colour palette to the currently published version"
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
Last activity: 2026-08-26 - Completed quick task 260826-ist: Landing page thumbnail gains the faint edge that matches the tabs

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
- [Phase ?]: 260826-07b: TabbedPanel's inner content card now defaults to p-3, composed through cn so panelClassName overrides deterministically; Volume/Template's redundant copies removed, Rails/Fins pt-1 nudges retired, Template rotate button rebased to top-0/right-0

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
| 260823-ipc | Order form shading switched from grey to the reduced accent hue (new --order-form-shade token at 7%, held there by contrast) and page 1 type raised so nothing prints under 7.9px (was 5.8px); fixed a latent leading-none clip on the dimension values and raised the dims/rocker bands to suit. Zero AA failures across both sheets, min ratio 4.83:1 | 2026-08-23 | f43dea9 | [260823-ipc-accent-tinted-shading-and-aa-compliant-t](./quick/260823-ipc-accent-tinted-shading-and-aa-compliant-t/) |
| 260823-jrn | Rocker box narrowed to sit above the template window only (inside a new right-hand column) and made 58% taller; rail plots column now runs the full height of the drawings row. Class renamed order-form-band-rocker to order-form-rocker since its percentage now reads against the column | 2026-08-23 | a8e1cde | [260823-jrn-rocker-above-the-template-window](./quick/260823-jrn-rocker-above-the-template-window/) |
| 260823-kq8 | Page 2 tables stacked instead of side by side: fin placement under the rail data, both full width. Fin sections laid out in CSS columns to repair the row stretch full width introduced (label and value were ending up most of a page apart), footnote moved outside the columned flow to span the panel | 2026-08-23 | c88bbba | [260823-kq8-fin-placement-under-the-rail-data](./quick/260823-kq8-fin-placement-under-the-rail-data/) |
| 260823-mt5 | Shaper Use Only box moved from page 1 header to the foot of page 2 (the shaper own page; front is the customer copy). Page 1 header band 17% to 12% with the rider fields spread into the remaining height, handing 5% of the sheet to the drawings row — boards ~8% larger, confirmed by a controlled A/B on the header percentage alone | 2026-08-23 | 4e05c0f | [260823-mt5-shaper-use-only-to-page-two](./quick/260823-mt5-shaper-use-only-to-page-two/) |
| 260823-nv2 | Logo box, Rail Sections and Laminating given one shared right edge via a single column geometry (--order-form-spine/gap/left, fixed-width RailLabel, glassing boxes wrapped in a content column) — 0px spread at print width. Core dims row 6.2% to 7.4% with roomier cells; Finish split into Leash and Finish; Fin System/Leash/Finish now three equal portions. Note: flex 0 0 calc() silently drops its basis in this pipeline — use flex none plus width | 2026-08-23 | a3815b3 | [260823-nv2-align-columns-and-split-the-finish-box](./quick/260823-nv2-align-columns-and-split-the-finish-box/) |
| 260823-pw7 | 9pt (12px) type floor across both order-form sheets via clamp minimums plus matching cqw coefficients; caption rows made non-wrapping with truncating notes and captions shortened to suit. Uncovered and fixed a print bug: the print-fit hook pinned the sheets but not the container-query root, so printed type size depended on the print viewport. Nav menu right-justified | 2026-08-23 | 5621dfa | [260823-pw7-twelve-px-type-floor-and-right-nav](./quick/260823-pw7-twelve-px-type-floor-and-right-nav/) |
| 260823-qr3 | Accent-filled controls given a surf-black hairline so they read as drawn objects rather than flat fills: slider track (now 6px so the stroke does not crowd the range), slider thumb, the three fin toggles and the summary print button. The slider treatment was one class string duplicated 14 times across four control files; centralised as .slider-accent in globals.css, leaving shadcn ui/slider.tsx untouched | 2026-08-23 | 609554c | [260823-qr3-hairline-stroke-on-accent-controls](./quick/260823-qr3-hairline-stroke-on-accent-controls/) |
| 260823-rt8 | Original two-token cyan accent restored (reverses b7fe483): --color-surf-accent-cyan #00e5ff for fills, which return to black text, and --color-surf-accent-cyan-ink #00767f for accent text and drawing strokes. All ~35 call sites re-mapped by role using the b7fe483 diff as the authority, plus the board-fill wash, construction lines, order-form shade tint and slider-accent class built since. Order form min contrast improved 4.83 to 5.10:1 | 2026-08-23 | 48c7ef1 | [260823-rt8-restore-the-cyan-accent-scheme](./quick/260823-rt8-restore-the-cyan-accent-scheme/) |
| 260823-sv4 | Order form spine labels widened 18.4px to 24px via the single --order-form-spine token. The column geometry from 260823-nv2 tracked the change automatically — logo/Rail Sections/Laminating right edges stayed at 0px spread with no other value touched, its first real test | 2026-08-23 | e5e76a8 | [260823-sv4-wider-order-form-spines](./quick/260823-sv4-wider-order-form-spines/) |
| 260823-tw9 | Order form panels no longer scroll: rail data table row type 2cqw to 1.75cqw plus leading-tight on both tables, containers switched from overflow-auto to hidden so regressions clip (which the audit catches) instead of silently scrolling. Testing the worst-case quad+centre fin setup found the fin section list was losing the 5th/Center Fin entirely — CSS columns overflow sideways in a fixed-height box, 697px off-sheet — fixed by a grid whose column count follows the section count | 2026-08-23 | c84496e | [260823-tw9-no-scrolling-order-form-windows](./quick/260823-tw9-no-scrolling-order-form-windows/) |
| 260823-ux2 | Dev-only Copy preset values button pinned to a real sidebar footer across all three editors: each aside became a flex column with a scrolling controls region plus a flex-none footer. It was never pinned anywhere — outline and rails only looked right because their controls happened to fit, while the longer fins controls pushed it past the aside bottom | 2026-08-23 | f7c6af6 | [260823-ux2-pin-the-preset-button-to-the-sidebar](./quick/260823-ux2-pin-the-preset-button-to-the-sidebar/) |
| 260824-i05 | Revert the colour palette to the currently published version: hard-reset main from 7665f23 to origin/main (12b6023), discarding the five unpushed five-colour-palette commits entirely. Production deploys from every push to main and the work was never pushed, so the live site had never left the old palette. lib/design/contrast.ts and palette.test.ts went with it by explicit decision, so the WCAG AA bar is no longer machine-checkable | 2026-08-24 | 12b6023 (reset target) | [260824-i05-revert-the-colour-palette-to-the-current](./quick/260824-i05-revert-the-colour-palette-to-the-current/) |
| 34 | TabbedPanel's inner content card gains a default 12px inset composed through cn; Volume and Template's redundant padding copies removed, Rails/Fins pt-1 nudges retired (both screens now get the inset for free), Template rotate button rebased top-3/right-3 -> top-0/right-0 [260826-07b-tab-panel-content-indent] | 2026-08-26 | 4c4b17a | — |
| 35 | Write the root CLAUDE.md: purpose, stack, commands, geometry-in-lib and units rules | 2026-08-26 | 7b88a86 | — |
| 260826-icz | Home page surfaces re-layered onto the theme contract: the page background moved off the sand canvas onto the app-chrome ground (the Colour Bench calls it "Window"), the preset and Continue cards off shadcn's bg-card onto canvas, and the board thumbnail well off --outline-page-bg onto panel. All four themes follow automatically since these are contract tokens; --outline-page-bg itself was left pointing at canvas because the /design SVG viewer still consumes it. Ground and panel are the same value in every ramp, so the result reads as two alternating tones (page, lifted card, page again inside the well), matching how the design screens already layer | 2026-08-26 | abad7b7 | [260826-icz-home-page-surfaces-page-background-to-wi](./quick/260826-icz-home-page-surfaces-page-background-to-wi/) |
| 260826-ist | Landing page board thumbnail gains the faint hairline edge, matching the inner content card inside the tabbed panel on every design screen: `border border-surf-line-faint` on a well that was already `rounded-lg bg-surf-panel`, so the three computed values (1px solid line-faint, panel fill, 10px radius) now match TabbedPanel byte for byte. box-sizing: border-box means nothing moved — well width, 340/620 aspect and the grid all measured unchanged; the OutlineViewer SVG is absolute inset-0 so the board now draws 1px inside the line rather than under it. Verified in all four themes: 4.13:1 Daylight/Chalk, 3.80:1 Phosphor, 1.56:1 Slate. Noted for later: --surf-line and --surf-line-faint are the same value in every theme except Slate | 2026-08-26 | 4c614cb | [260826-ist-landing-page-thumbnail-well-gains-the-fa](./quick/260826-ist-landing-page-thumbnail-well-gains-the-fa/) |

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
| 260824-llx | Three-layer CSS custom property theming system (ramps -> semantic contract -> Tailwind bridge) with light and dark themes; root class toggle overriding a no-JS prefers-color-scheme default; literal --color-surf-* names kept as aliases so 228 call sites were untouched; AA verified numerically in both themes | 2026-08-24 | 1597fcc | [260824-llx-css-custom-property-theming-system-with-](./quick/260824-llx-css-custom-property-theming-system-with-/) |
| 260824-m6k | Settings gear in the nav opening a theme chooser (System/Light/Dark) wired to the root classes; preference persisted in localStorage and restored by a pre-hydration inline script whose behaviour is asserted against the pure module in tests; useSyncExternalStore rather than effect-plus-setState. Units toggle deliberately skipped | 2026-08-24 | 7c7f2b5 | [260824-m6k-settings-menu-in-the-nav-with-a-theme-ch](./quick/260824-m6k-settings-menu-in-the-nav-with-a-theme-ch/) |
| 260824-nhh | Fix foregrounds on filled surfaces that broke under theming: text on the accent fill was ink (1.40:1 dark) and text on the ink fill was white (1.10:1 dark). 11 sites to --surf-on-accent, 4 to a new derived --surf-on-ink; two sites needed conditional logic rather than a swap | 2026-08-24 | 057ed3e | [260824-nhh-fix-on-fill-foreground-tokens-that-break](./quick/260824-nhh-fix-on-fill-foreground-tokens-that-break/) |
| 260824-p03 | Apply the founder's blue palette to both ramps (accent #3490bc/#2d7495 replacing cyan, ink #010d1f, warm light well, slate dark well, wash 10%/20%). Accent now clears 3:1 on its ground so it no longer needs a boundary stroke; on-accent is now theme-dependent. Four well pairings recorded as latent-under-bar | 2026-08-24 | 71e100c | [260824-p03-apply-the-founder-s-new-light-and-dark-r](./quick/260824-p03-apply-the-founder-s-new-light-and-dark-r/) |
| 260824-p88 | Dark ramp to green phosphor (#00ff40 ink/line/accent, #a8ffbe muted, on-accent = ground, wash 5%). All pairings pass and it resolves the blue ramp's well failures; accent pair collapses to one value, line-faint no longer faint, muted brighter than ink. Proves the 260824-nhh on-fill fix — old code would draw #00ff40 on #00ff40 | 2026-08-24 | 75fe27f | [260824-p88-green-phosphor-dark-ramp](./quick/260824-p88-green-phosphor-dark-ramp/) |
| 260824-pdg | Promote the app's regions into the contract: --surf-sidebar, --surf-canvas and --surf-tab-active added to both ramps and wired through 24 call sites including everything nested inside a region; widepoint dropped as its own colour and derived from accent-ink. Bench rebuilt with a Regions group and a 29-row audit | 2026-08-24 | 2a8bca8 | [260824-pdg-promote-app-regions-into-the-token-contr](./quick/260824-pdg-promote-app-regions-into-the-token-contr/) |
| 260824-tef | Borders onto the line tokens: 42 hand-mixed muted opacities (six weights) to --surf-line (5 control edges) and --surf-line-faint (37 dividers/rules/grids), plus two more found hiding as color-mix in the --outline-* CSS layer. Light unchanged; dark hairlines now glow, per the ramp's own line-faint value | 2026-08-24 | 28597e0 | [260824-tef](./quick/260824-tef-*/) |
| 260824-tg3 | surf-black onto ink and on-accent: 79 sites to *-surf-ink, 4 border edges on the accent fill to border-surf-on-accent (they had gone invisible in the green ramp where ink == accent) | 2026-08-24 | 7d5746b | [260824-tg3](./quick/260824-tg3-*/) |
| 260824-th9 | surf-muted onto surf-ink-muted: 95 occurrences, pure rename, no value changes | 2026-08-24 | 9fb52a5 | [260824-th9](./quick/260824-th9-*/) |
| 260824-tih | shadcn's neutrals onto the surf contract: 18 live + 13 unused tokens mapped in globals.css so components/ui/* stays regeneration-safe; 83 per-theme declarations deleted, net -90 lines. Closes the border/input 1.26:1 gap. No oklch left outside a comment | 2026-08-24 | eca3446 | [260824-tih](./quick/260824-tih-*/) |
| 260824-tq7 | Retire the literal token names: last 54 occurrences migrated (surf-base/accent-cyan/accent-orange -> ground/accent/warning) in one longest-first pass, then the frozen alias block deleted once the rename made it duplicate the semantic bridge. Bridge is now 17 tokens, each declared once; literal names 291 -> 0 | 2026-08-24 | 35f4c57 | [260824-tq7-clear-the-last-literal-token-names](./quick/260824-tq7-clear-the-last-literal-token-names/) |
| 260824-um4 | Four themes via a registry in lib/theme.ts (Daylight/Chalk light, Slate/Phosphor dark); two revived from this project's own verified palettes. :not() guards dropped — specificity and source order suffice. All four CSS blocks generated from one definition. Bench gets a four-chip picker and exports every theme at once | 2026-08-24 | 8d69b05 | [260824-um4-four-named-themes-two-light-two-dark](./quick/260824-um4-four-named-themes-two-light-two-dark/) |
| 260824-uyz | Save the colour bench source to .planning/sketches/themes/ with a README recording the published artifact URL, how to republish to it, and the hand-kept PUBLISHED/globals.css drift coupling that no test can cover. Flags default.css as stale | 2026-08-24 | (this commit) | [260824-uyz-save-the-colour-bench-into-the-repo](./quick/260824-uyz-save-the-colour-bench-into-the-repo/) |
| 260825-gou | Apply the founder's updated palette: Daylight to warm paper + sage (resolving its two latent well pairings), Phosphor to a deeper fully-monochrome terminal, default dark Phosphor -> Slate. All four themes now clear every pairing, so the WELL CAVEAT is gone. New tests read globals.css and assert the defaults/blocks agree with the registry | 2026-08-25 | 8bc1a96 | [260825-gou-updated-four-theme-palette](./quick/260825-gou-updated-four-theme-palette/) |
| 260825-h06 | Board fill becomes a literal colour token (--surf-board-fill) instead of a color-mix strength; tab strips gain the bordered panel their border-b-0 always implied but never had, fixing canvas/tabs/cards reading as one area in Phosphor; bench rail gets its own scroll container | 2026-08-25 | 0b1a779 | [260825-h06-board-fill-colour-bench-fidelity-scroll](./quick/260825-h06-board-fill-colour-bench-fidelity-scroll/) |
| 260825-pkq | Extract components/viewer/tabbed-panel.tsx and use it on all four design screens, so Template and Volume gain the tab+panel treatment; panel edge moves from line-faint (1.22:1 on Daylight's canvas, invisible) to line (3.01:1); canvas frame thinned; bench hex field and colour picker now drive each other | 2026-08-25 | 6971cdb | [260825-pkq-shared-tabbedpanel-across-design-screens](./quick/260825-pkq-shared-tabbedpanel-across-design-screens/) |
| 260825-ra5 | TabbedPanel gains an inner content card (line-faint, fully rounded) inside the panel's line edge; canvas frame 24/16 -> 12px. Exposed that --radius had been undefined since 8d69b05, so every rounded-* utility in the app rendered square — restored and now guarded by a test | 2026-08-25 | dc5ebb5 | [260825-ra5-inner-content-card-and-radius-fix](./quick/260825-ra5-inner-content-card-and-radius-fix/) |
| 260825-rmb | Bench specimen slider tracked --surf-ground where the app uses --surf-well (plus three more token mismatches found by auditing the whole specimen); outline tail-shape chips fixed — their inline styles hid an ad-hoc muted mix and an accent-on-accent border from both earlier migrations | 2026-08-25 | 2f3291f | [260825-rmb-bench-fidelity-and-inline-style-borders](./quick/260825-rmb-bench-fidelity-and-inline-style-borders/) |
| 260825-rqm | Order form's --order-form-shade mixed the accent into a hardcoded `white`, producing near-white blocks on both dark themes (#f0f9f0 Phosphor, #f0f5f8 Slate). Now mixes into --color-surf-panel; light themes byte-identical. Fourth hiding place for un-themeable literals: a route-scoped stylesheet | 2026-08-25 | 1be7797 | [260825-rqm-order-form-shade-hardcoded-white](./quick/260825-rqm-order-form-shade-hardcoded-white/) |
| 260825-s00 | Bench specimen's slider fill was outset over the track's own 1px --surf-ink border (negative inset), painting the stroke away under the accent portion; live seats the fill inside the border so the hairline wraps the whole control. Reseated on the padding box with left-only pill rounding, no markup change; thumb also brought from 13px to the app's 12px. Second bench-fidelity drift in two days | 2026-08-25 | af3e98e | [260825-s00-bench-slider-stroke-under-accent-fill](./quick/260825-s00-bench-slider-stroke-under-accent-fill/) |
| 260825-uan | Four theme ramps moved onto the founder's exported palette: 18 values in globals.css LAYER 1 (Daylight 2, Chalk 12, Slate 4; Phosphor untouched). Chalk now shares 13 of 17 tokens with Daylight — it is Daylight with a blue accent; Slate's canvas and panel swapped roles. Prose the new values falsified rewritten in globals.css and lib/theme.ts, bench PUBLISHED re-synced and republished. All four themes pass every contrast bar | 2026-08-25 | a25cf1c | [260825-uan-theme-ramp-update](./quick/260825-uan-theme-ramp-update/) |
| 260825-vot | Template viewer gains a horizontal (nose-left) board: a rotate button inside the viewer panel turns the board within the frame it already occupies, layout untouched. Built by rotating the SVG group and counter-rotating the two callout components rather than refactoring ~40 projector call sites; drag works in both orientations by taking the rotated group's getScreenCTM. Print/Summary stay vertical by construction — the prop defaults to vertical and those consumers never pass it | 2026-08-25 | 1cffcb3 | [260825-vot-template-viewer-rotate](./quick/260825-vot-template-viewer-rotate/) |
| 260825-w8d | The rotated frame transposed the vertical one instead of fitting its own content, so the rotation delivered only +2% board length — the mechanism worked but the value did not. Frame now sized from the callout system's constants: +11% measured. The frame is width-bound at typical windows, so the long-axis pad was the whole gain, not the cross-axis | 2026-08-25 | fdb5835 | [260825-w8d-horizontal-frame-fit](./quick/260825-w8d-horizontal-frame-fit/) |
| 260825-wrq | Rotate button enlarged and given a boundary: icon 20px -> 24px, box 28 -> 34, `border-surf-line` (the 3:1 non-text token, not line-faint) plus `bg-surf-ground`. The fill reads as no visible plate — ground and panel are the same value in all four themes — its real job is opacity, keeping board lines from running under the glyph on an absolutely-positioned z-10 button | 2026-08-25 | 235c209 | [260825-wrq-rotate-button-size-border](./quick/260825-wrq-rotate-button-size-border/) |
| 260825-wyg | Panel tabs on all four design screens shortened and moved onto the app's heading treatment: single className edit in tabbed-panel.tsx (py-2.5 text-sm font-bold -> py-1.5 text-xs font-display font-bold tracking-architectural uppercase), matching the menu bar links and sidebar headings. Inactive tabs 42px -> 30px, active 41px -> 29px; border-b-0/-mt-px/rounded-t-lg join untouched. Human verification of the visual result is pending | 2026-08-25 | 71b29b1 | [260825-wyg-tab-height-and-font](./quick/260825-wyg-tab-height-and-font/) |
| 260825-x7p | Order form's --order-form-shade repointed from the accent-at-7% mix to var(--color-surf-board-fill), so the logo block, spine labels and Shaper Use Only box theme the same way the board drawings do. Comment rewritten with the measured four-theme contrast table (muted ink 5.35/5.11/6.36/5.11 against the 4.5:1 floor, down from 6.02/5.81/7.45/5.96), the @media print consequence (panels now print unfilled, judged a near-no-op since they were already ~white and keep their ink border), and the no-literals lesson from 260825-rqm. Four-theme + print-preview human-check still pending | 2026-08-26 | 8e56cd8 | [260825-x7p-summary-bars-board-fill](./quick/260825-x7p-summary-bars-board-fill/) |

## Session Continuity

Last session: 2026-08-26T07:19:15.691Z
Stopped at: Completed quick task 260826-07b: TabbedPanel's 12px inset defaulted; human-check (visual measurement) still pending
Resume file: None
