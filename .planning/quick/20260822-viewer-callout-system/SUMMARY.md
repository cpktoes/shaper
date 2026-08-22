---
phase: quick-260822-vcs
plan: 01
subsystem: ui
tags: [svg, callouts, drafting, outline-viewer, fin-viewer, design-tokens]

requires:
  - phase: quick-260821-rss
    provides: no direct dependency, but the last completed quick task before this one on the same viewer components
provides:
  - New app/globals.css tokens (--outline-stringer-dash, --outline-station-dash, --outline-dim-ink, --outline-callout-label) implementing the reference-line/dimension-line grammar locked in .planning/sketches/ 001-004
  - components/viewer/callout-primitives.tsx -- shared DimensionTick, DimensionLine, CalloutChip, OutputRail primitives plus the outline viewer's canonical rail/gutter constants, importable by any future plan-view board viewer
  - components/outline/outline-viewer.tsx rebuilt on the callout system -- SVG-text chips/rails replacing the absolutely-positioned HTML overlay, widened viewBox (-50 -16 410 638) with a legacy-viewBox fallback for hideCallouts
  - components/fins/fin-viewer.tsx rebuilt on the same grammar -- outputs only, ticks instead of arrowheads, dash tokens for reference lines, SVG text throughout
affects: [any future plan-view board viewer or callout addition; components/summary/board-summary.tsx and components/outline/outline-editor.tsx, both updated for the new viewBox aspect]

actuals:
  tokens: 12278
  tasks: 5
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Rails/gutters as module constants, not per-call arguments (components/viewer/callout-primitives.tsx) -- a new callout must join an existing rail or define one in the shared module, never invent a per-call offset"
    - "hideCallouts renders the legacy tight viewBox (0 0 340 620) and legacy padding, while every other render uses the widened callout-system viewBox -- lets a display-gated consumer (preset-card thumbnails) stay pixel-identical to its pre-callout-system rendering without a second code path"
    - "SVG <text> at raw px coordinates instead of percentage-based absolutely-positioned HTML overlay divs -- removes the pctLeft/pctTop/transform indirection entirely since the label now lives in the same coordinate space as the geometry it describes"

key-files:
  created:
    - components/viewer/callout-primitives.tsx
  modified:
    - app/globals.css
    - components/outline/outline-viewer.tsx
    - components/fins/fin-viewer.tsx
    - components/summary/board-summary.tsx
    - components/outline/outline-editor.tsx

key-decisions:
  - "hideCallouts keeps OutlineViewer's original tight 0 0 340 620 viewBox and original PAD_X=30 padding, rather than always using the new widened -50 -16 410 638 viewBox -- guarantees preset-card thumbnails render pixel-identical to before, satisfying the plan's hard constraint without a second drawing routine"
  - "Tail Block chip is omitted entirely when geometry.tailBlockPinned is true (pin/round tails) -- those tail shapes have no flat block width to name, so showing '0\" wide' would be misleading; the plan's four named chips (Length, Widepoint, WP offset, Tail block) apply to squash/diamond/swallow tails only"
  - "Preserved the fin mark's own dash-by-lateralKind (none/2 3/8 4) instead of collapsing it to match the plan's literal 'two line treatments not five' framing -- that dash is not a callout leader line, it keys the same Front/Rear/Center grouping as result.legend's dash swatches below the diagram (lib/geometry/fins.ts); collapsing it would silently break the legend's meaning. The two dash tokens replace only the reference lines (centreline, tail-width-12 line) and every leader/extension/dimension line collapses to plain solid ink"
  - "outline-editor.tsx's Template Viewer wrapper (aspect-[340/620], not in the plan's declared file list) needed the same aspect fix as board-summary.tsx's Template card -- both render the full (non-hideCallouts) callout system against the new widened viewBox, so both would letterbox/shrink the drawing without the fix"
  - "Output label uses the sketch's spelling 'Centre' (not the app's usual 'Center') for the mid-length derived width -- the sketches are stated as the specification for this system, and 'Centre' appears repeatedly in the locked design language distinguishing it from the Widepoint chip"

patterns-established:
  - "Shared callout primitives module under components/viewer/, not lib/geometry/ -- diagram layout stays separate from geometry math per CLAUDE.md's constraint that lib/ is reserved for pure geometry"

requirements-completed: []

coverage:
  - id: D1
    description: "Zero hardcoded hex colours remain in outline-viewer.tsx or fin-viewer.tsx; every colour resolves through an app --outline-* token or an existing shadcn CSS variable"
    verification:
      - kind: unit
        ref: "grep -nE '#[0-9a-fA-F]{3,6}' components/outline/outline-viewer.tsx components/fins/fin-viewer.tsx returns no matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "No absolutely-positioned HTML label overlay remains in either viewer -- every label is SVG <text>"
    verification:
      - kind: unit
        ref: "grep -n 'pointer-events-none absolute inset-0' components/outline/outline-viewer.tsx components/fins/fin-viewer.tsx returns no matches"
        status: pass
    human_judgment: false
  - id: D3
    description: "Outline viewer draws the new callout system: static stringer/centreline dash, derived nose/tail station dash, widepoint rail dots (never a line), output rail (nose/centre/tail widths), and input chips (Length, Widepoint, WP offset, Tail block) with horizontal leaders"
    verification:
      - kind: other
        ref: "Source review of components/outline/outline-viewer.tsx against .planning/sketches/004-clean-interior-svg/index.html's variant A SVG; npm run build succeeds"
        status: pass
    human_judgment: true
    rationale: "Correct visual placement, spacing, and readability of the new chips/rail against a variety of real board geometries (short boards, extreme widepoint offsets, each tail shape) is a rendered-layout outcome best confirmed in-browser, per this task's own environment_note deferring live checks to the orchestrator."
  - id: D4
    description: "Fin viewer shows outputs only (tail-width-12 input label pair removed), uses drafting ticks instead of arrowheads, and every callout leader/extension/dimension line is solid ink using the two shared dash tokens only for the two reference lines"
    verification:
      - kind: other
        ref: "Source review of components/fins/fin-viewer.tsx; grep -n strokeDasharray shows exactly two non-legend dash values (var(--outline-stringer-dash), var(--outline-station-dash)) plus the pre-existing, intentionally-preserved lateralKind dash on the fin mark itself"
        status: pass
    human_judgment: true
    rationale: "Whether the converted SVG-text label positions (ported from percentage/transform-based HTML spans to raw px + text-anchor) land legibly for every fin setup (single/thruster/quad/twin/2+1, each tail shape) is a rendered outcome best confirmed in-browser."
  - id: D5
    description: "preset-card.tsx thumbnails render unchanged (hideCallouts keeps the legacy tight viewBox); board-summary.tsx's Template card and outline-editor.tsx's Template Viewer both updated to the new viewBox aspect so neither letterboxes/distorts"
    verification:
      - kind: other
        ref: "Source review: preset-card.tsx untouched, still passes hideCallouts, and OutlineViewer's hideCallouts branch is unchanged from its pre-task-3 behavior (0 0 340 620 viewBox, PAD_X=30). board-summary.tsx and outline-editor.tsx both changed aspect-[340/620] -> aspect-[410/638]."
        status: pass
    human_judgment: true
    rationale: "Confirming the preset-card thumbnails are pixel-identical and the Template/Summary drawings fill their cards without letterboxing is a rendered-layout comparison best done visually against the pre-task screenshots, per this task's environment_note."
  - id: D6
    description: "npm run test (598, unchanged), npm run lint, and npm run build all pass; lib/geometry golden fixtures untouched"
    verification:
      - kind: unit
        ref: "npm run test -- 598 tests pass (same count as before this task); npm run lint -- 0 errors (9 pre-existing, unrelated warnings); npm run build -- succeeds"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-22
status: complete
---

# Quick Task: Implement the Viewer Callout System

**Rebuilt the outline and fin viewers on the drafting-dimension-line callout grammar locked in sketches 001-004 -- SVG-text chips and an aligned output rail replace the old absolutely-positioned HTML overlay, with rails/gutters enforced as shared module constants and every colour/dash resolved through tokens**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-22T08:35:00Z
- **Completed:** 2026-08-22T09:03:00Z
- **Tasks:** 5
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- Added four new CSS tokens to `app/globals.css` (`--outline-stringer-dash`, `--outline-station-dash`, `--outline-dim-ink`, `--outline-callout-label`) and eliminated every hardcoded hex colour from both viewers (`#4472C4`, `#3a5f9e`, `#1c1b19`, `#fff`, `#8a8272`), replacing each with the matching existing/new token.
- Built `components/viewer/callout-primitives.tsx`: `DimensionTick`, `DimensionLine`, `CalloutChip`, `OutputRail`, plus the outline viewer's canonical rail/gutter constants (`OUTLINE_CHIP_WIDTH`, `OUTLINE_CHIP_RIGHT_X`, `OUTLINE_OUTPUT_VALUE_X`, `OUTLINE_GUTTER_GAP`, the widened viewBox constants) as module-level constants rather than per-call arguments.
- Rebuilt `components/outline/outline-viewer.tsx`: the interior now draws only faint reference lines (static stringer/mid-length centreline sharing one long-short-short dash, derived nose/tail-12" stations sharing a shorter dash, widepoint marked with two rail dots and never a line); outputs (nose/centre/tail widths) read out to one aligned right rail; inputs (Length, Widepoint, WP offset, Tail block) are named left-gutter chips with horizontal leaders, WP offset grouped under Widepoint with no leader of its own, Tail block omitted for pin/round tails. viewBox widens to `-50 -16 410 638` except when `hideCallouts` is set, which keeps the original tight `0 0 340 620` viewBox so preset-card thumbnails stay pixel-identical.
- Rebuilt `components/fins/fin-viewer.tsx` on the same grammar: removed the tail-width-12" input label pair (already in the sidebar, outputs-only per sketch 002), replaced arrowhead dimension markers with the shared `DimensionTick`, converted every label from an absolutely-positioned HTML span to native SVG `<text>` at the diagram's own pixel coordinates, and collapsed the ad hoc reference-line dashes (both previously `"6 4"`) into two distinct shared tokens. Deliberately preserved the fin mark's own dash-by-`lateralKind`, since it keys the same grouping as `result.legend`'s Front/Rear/Center dash swatches.
- Updated `components/summary/board-summary.tsx`'s Template card and `components/outline/outline-editor.tsx`'s Template Viewer wrapper from `aspect-[340/620]` to `aspect-[410/638]` to match the widened viewBox; verified `components/setup/preset-card.tsx` needs no change since its `hideCallouts` render keeps the legacy tight viewBox.
- `npm run test` (598, unchanged from before this task), `npm run lint` (0 errors), and `npm run build` all pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tokens + hex removal** - `8b97631` (feat)
2. **Task 2: Shared callout primitives module** - `89ac5ec` (feat)
3. **Task 3: Outline viewer rebuild** - `11b7260` (feat)
4. **Task 4: Fin viewer rebuild** - `ea906dc` (feat)
5. **Task 5: Consumer aspect-ratio fixes** - `b3fc9b3` (fix)

## Files Created/Modified

- `app/globals.css` - Four new callout-system tokens; two hardcoded hex values already had existing tokens
- `components/viewer/callout-primitives.tsx` - New shared module: `DimensionTick`, `DimensionLine`, `CalloutChip`, `OutputRail`, plus the outline viewer's canonical rail/gutter constants
- `components/outline/outline-viewer.tsx` - Full callout-system rebuild: SVG-text chips/rails, widened viewBox with legacy fallback for `hideCallouts`
- `components/fins/fin-viewer.tsx` - Full callout-system rebuild: outputs only, ticks instead of arrowheads, SVG text, dash-token reference lines
- `components/summary/board-summary.tsx` - Template card wrapper aspect ratio updated to match the new viewBox
- `components/outline/outline-editor.tsx` - Template Viewer wrapper aspect ratio updated to match the new viewBox (deviation, not in the plan's declared file list)

## Decisions Made

- `hideCallouts` keeps `OutlineViewer`'s original tight `0 0 340 620` viewBox and `PAD_X=30` padding rather than always using the new widened viewBox, so preset-card thumbnails stay pixel-identical without a second drawing routine.
- Tail Block chip is omitted when `geometry.tailBlockPinned` is true (pin/round tails have no flat block width to name).
- Preserved the fin mark's own `lateralKind` dash instead of collapsing it into the "two line treatments" -- it is not a callout leader line, it keys `result.legend`'s Front/Rear/Center dash-swatch grouping (`lib/geometry/fins.ts`), and collapsing it would silently break that legend.
- Used the sketch's "Centre" spelling for the mid-length derived-width output label, matching the locked design language rather than the app's usual "Center".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] outline-editor.tsx Template Viewer aspect ratio**
- **Found during:** Task 5, while verifying every OutlineViewer consumer against the new widened viewBox
- **Issue:** `components/outline/outline-editor.tsx` (the primary Template/Outline editing screen, not in the plan's declared `files_modified` list) wraps `OutlineViewer` in a `div` hardcoding `aspect-[340/620]`, matching the viewer's old tight viewBox exactly. This screen does not set `hideCallouts`, so it renders the full new callout system against the widened `-50 -16 410 638` viewBox -- without the fix, the drawing would letterbox/shrink inside its card on the app's main editing screen.
- **Fix:** Updated the wrapper to `aspect-[410/638]`, matching the same fix already planned for `board-summary.tsx`'s Template card.
- **Files modified:** `components/outline/outline-editor.tsx`
- **Verification:** `npx tsc --noEmit`, `npx eslint`, `npm run build` all pass; source review confirms the wrapper aspect now matches the viewer's non-`hideCallouts` viewBox exactly.
- **Committed in:** `b3fc9b3` (Task 5 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Necessary for visual correctness on the app's primary Template editing screen; no scope creep beyond fixing the same class of bug the plan already named for `board-summary.tsx`.

## Issues Encountered

This session did not drive a browser to visually confirm chip/rail placement, leader alignment, or the preset-card/Template/Summary aspect-ratio fixes render as expected on a live board -- `npm run test`, `npm run lint`, and `npm run build` all pass, and every structural claim (viewBox values, token usage, absence of hardcoded hex/HTML overlay, `hideCallouts` fallback behavior) was verified by source review and grep. Per this task's own environment_note, the dev server is orchestrator-managed and live browser verification is the orchestrator's responsibility, not this session's.

## User Setup Required

None.

## Next Phase Readiness

No blockers. Recommend the orchestrator's browser pass specifically check:
1. `/design/outline` -- chips (Length, Widepoint, WP offset, Tail block for squash/diamond/swallow tails) read correctly with horizontal leaders that never cross the board silhouette; output rail (Nose @ 12", Centre, Tail @ 12") aligns at one x; widepoint rail dots visible and distinct from the centre output when the two nearly coincide.
2. `/design/fins` -- no tail-width-12" label pair remains; per-fin dimension values read legibly with ticks instead of arrowheads; the legend below still shows three distinct dash swatches matching the fin marks on the board.
3. `/design/summary` -- Template and Fin Placement cards render without letterboxing/distortion; input chips are absent in the Template card (compact) while the output rail is present; print preview (`Print Summary` button / browser print dialog) still fits one landscape page.
4. Setup screen preset cards -- thumbnails look exactly as they did before this task (no chips, no reference lines, clean outline only).

---
*Phase: quick-260822-vcs*
*Completed: 2026-08-22*

## Self-Check: PASSED
