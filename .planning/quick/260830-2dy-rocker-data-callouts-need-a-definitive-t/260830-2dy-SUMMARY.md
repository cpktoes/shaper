---
phase: 260830-2dy
plan: 01
subsystem: rocker-viewer
tags: [rocker, callouts, viewer-frame, orientation, labels, legibility]

requires:
  - phase: 260830-03j
    provides: cardScale pin (maxCardPinScale/appliedScale) the new rail titles ride for a constant on-screen size across orientations
provides:
  - "rocker-view-frame.ts computes both rail titles' anchors (railLabelSize/deckLabelY/bottomLabelY/labelStationX), reserved at the pin ceiling, in every stationRails mode"
  - "rocker-viewer.tsx paints Thickness over the deck rail and Rocker over the bottom rail, in callouts=\"full\" only"
  - "dead board-length label machinery (labelX/labelY, LENGTH_LABEL_SIZE, LENGTH_LABEL_GAP, PAD_TOP) removed from the module and its suite"
  - "characterisation pin locking the compact/none print-path viewBox to literals captured from the unmodified module"
affects: [rocker-viewer, rocker-editor, summary-order-form]

actuals:
  tokens: 8589
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Rail-band reservation at the pin ceiling (maxCardPinScale), never at the live appliedScale, for a new band — mirrors the existing card-band pattern from 260830-03j so the frame -> fit scale -> card size -> frame loop stays closed"
    - "Characterisation pin: capture a pure function's exact output against the unmodified module before editing, assert the literal afterward, to prove an unrelated path (the print path) was untouched"

key-files:
  created: []
  modified:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
    - components/rocker/rocker-viewer.tsx

key-decisions:
  - "Deleted the board-length label's leftover layout machinery (labelX/labelY, LENGTH_LABEL_SIZE, LENGTH_LABEL_GAP, PAD_TOP) rather than repurposing it for the new titles — the old machinery was one anchor at the nose end of the long axis; the new titles are two anchors centred on the cross axis, needing room on a different axis entirely"
  - "Found and fixed a latent bug while wiring the new anchors: the pin ceiling (maxCardPinScale) was keyed off the raw orientation argument rather than the mode's own effective orientation, so \"compact\" mode (which must ignore orientation by contract) was silently inheriting the vertical ceiling when the app happened to pass orientation: \"vertical\". Rekeyed it off effectiveHorizontal, which changes nothing for \"full\"/\"none\" (where effectiveHorizontal already equals horizontal) but fixes \"compact\"'s cross-orientation invariance"

patterns-established:
  - "railLabelBandDepth(orientation): a rail title's own band, reserved at the ceiling, added outside the existing card band on every edge, in both orientations — the same symmetric-reservation pattern a future third rail feature could reuse"

requirements-completed: [QT-260830-2dy]

coverage:
  - id: D1
    description: "rocker-view-frame.ts computes both rail titles' full anchor set (railLabelSize, deckLabelY, bottomLabelY, labelStationX) in every stationRails mode, reserved at the pin ceiling so the frame never depends on the live card scale"
    requirement: QT-260830-2dy
    verification:
      - kind: unit
        ref: "components/rocker/rocker-view-frame.test.ts — rockerViewLayout — rail titles: horizontal containment / vertical containment / clearance / centring, railLabelBandDepth"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Summary order form's printed ROCKER box (stationRails: \"compact\") and the bare \"none\" path are provably unchanged — their viewBox strings are pinned to literals captured from the unmodified module before any edit"
    requirement: QT-260830-2dy
    verification:
      - kind: unit
        ref: "components/rocker/rocker-view-frame.test.ts — rockerViewLayout — print-path characterisation pin (compact/none viewBox, captured pre-change)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dead board-length label machinery (labelX/labelY, LENGTH_LABEL_SIZE, LENGTH_LABEL_GAP, PAD_TOP) is gone from the module and its suite, not left sitting beside the new rail-title machinery"
    requirement: QT-260830-2dy
    verification:
      - kind: unit
        ref: "grep -c \"LENGTH_LABEL\\|PAD_TOP\\|labelX\\|labelY\" components/rocker/rocker-view-frame.ts — returns 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "rocker-viewer.tsx paints \"Thickness\" and \"Rocker\" as the two rail titles, upright in both orientations, at a constant on-screen size, sitting outside their own rail's cards with a comfortable equal-looking gap — verified visually in the browser"
    verification: []
    human_judgment: true
    rationale: "This plan's Task 3 is a blocking checkpoint:human-verify requiring a live browser pass (npm run dev, both orientations, plus the Summary print check) — the executor runs inside a git worktree and cannot start a dev server or open a browser there. Deferred; recorded as an open unrun-verify entry in .planning/WINDOWS.md (id 2)."

duration: ~25min
completed: 2026-08-30
status: complete
---

# Phase 260830-2dy Plan 01: ROCKER rail titles ("Thickness" / "Rocker") Summary

**Added a pure-layout-owned title to each of the ROCKER editor's two read-out rails — "Thickness" over the deck (thickness) rail, "Rocker" over the bottom (rocker) rail — so the drawing itself says which rail is which, in both orientations, while removing the dead board-length label machinery left over from an earlier quick task.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-30
- **Tasks:** 2 of 3 completed (Task 3 is a blocking browser checkpoint, deferred — see below)
- **Files modified:** 3

## Accomplishments

- `rocker-view-frame.ts` now computes every position, size and gap a rail title needs (`railLabelSize`, `deckLabelY`, `bottomLabelY`, `labelStationX`), reserved at the same pin ceiling the card rails already use, so a title can never shrink or drift when the board is rotated or the card-pin scale changes.
- `rocker-viewer.tsx` paints the two titles — literal `Thickness` and `Rocker`, byte-identical to the sidebar's own section titles and the DATASHEET's row-group labels — inside the existing `callouts === "full"` block, deriving no arithmetic of its own.
- The Summary order form's printed ROCKER box (`stationRails: "compact"`) and the bare `"none"` path are proven untouched: a new characterisation-pin test locks their exact `viewBox` strings to the literals the unmodified module produced, captured before any edit.
- The board-length label's dead layout machinery (`labelX`/`labelY`, `LENGTH_LABEL_SIZE`, `LENGTH_LABEL_GAP`, `PAD_TOP`) is fully deleted from the module and its test suite — nothing was left sitting beside the new title machinery.
- Removing that dead reserve hands the nose-up (vertical) drawing back the margin it was holding for nothing: the vertical frame's own 88% maximisation bar improved from its prior value to ~90.9%, confirmed numerically against the horizontal frame's own ~91.1% share.
- Found and fixed a latent bug while wiring the new anchors up: `maxCardPinScale`'s ceiling was being resolved from the raw `orientation` argument rather than the mode's own effective orientation, so the Summary order form's `"compact"` mode (which is documented to ignore `orientation` entirely) was silently inheriting the taller vertical ceiling whenever the app happened to pass `orientation: "vertical"` alongside it. Rekeyed the ceiling off `effectiveHorizontal` — a no-op for `"full"`/`"none"` (where `effectiveHorizontal` already equals `horizontal`), but it closes a real cross-orientation inconsistency in `"compact"` before the new title anchors could inherit it too.

## Task Commits

Each task was committed atomically:

1. **Task 1: The layout module decides both titles — dead length-label machinery out, rail-title anchors in** - `0a1cac2` (feat)
2. **Task 2: The drawing paints Thickness and Rocker on their rails, upright in both orientations** - `02913fa` (feat)

_Task 3 (browser checkpoint) is deferred — see "Deferred Checkpoint" below._

## Files Created/Modified

- `components/rocker/rocker-view-frame.ts` - Removed `PAD_TOP`/`LENGTH_LABEL_SIZE`/`LENGTH_LABEL_GAP`/`labelX`/`labelY`; added `RAIL_LABEL_SIZE`/`RAIL_LABEL_GAP`/`RAIL_LABEL_EDGE_GUTTER`/`RAIL_LABEL_CAP_RATIO`, `railLabelBandDepth()`, and the four new `RockerViewLayout` fields (`railLabelSize`, `deckLabelY`, `bottomLabelY`, `labelStationX`); rekeyed `pinCeiling` off `effectiveHorizontal`.
- `components/rocker/rocker-view-frame.test.ts` - Added a print-path characterisation-pin suite, `railLabelBandDepth`/`RAIL_LABEL_*` constants suite, horizontal/vertical containment, clearance and centring suites for the new titles; updated the cross-extent formula test and the degenerate-input finiteness assertions; deleted the board-length label's own run-room test and renamed its enclosing `describe`.
- `components/rocker/rocker-viewer.tsx` - Added the `RailTitle` component and rendered two instances (`Thickness`, `Rocker`) inside the existing `callouts === "full"` block; updated the module header comment.

## Decisions Made

- **Deleted, not repurposed, the board-length label's leftover machinery.** The old machinery was one anchor, left-aligned, at the nose end of the frame's long axis. The new titles are two anchors, centre-aligned, on the frame's cross axis. Keeping the old names/constants would have meant reserving room on the wrong axis under a name that no longer described what it held.
- **Rekeyed the card-pin ceiling off `effectiveHorizontal`, not raw `orientation`.** Found while deriving the title anchors: the ceiling calculation (`maxCardPinScale(orientation)`) was reachable by "compact" mode's own cross-orientation invariance test only because that code path was never actually exercised before this task added anchors that ARE computed unconditionally in every mode. This is a Rule 1 (auto-fixed bug) — see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `maxCardPinScale`'s ceiling leaked the raw `orientation` argument into "compact" mode, which must ignore it**
- **Found during:** Task 1, while writing the new `deckLabelY`/`bottomLabelY`/`labelStationX` fields and running the "compact rails ... is horizontal-only by contract" test
- **Issue:** `pinCeiling` was computed as `maxCardPinScale(orientation)` — a pure function of the raw `orientation` argument. `"compact"` mode's own documented contract (`RockerStationRails`'s header comment) is that it "ignores the `orientation` argument entirely." Before this task, nothing reachable by `"compact"` mode actually consumed `pinCeiling`-derived values (`maxCardWidth`/`maxCardHeight` were only read inside the `effectiveHorizontal === false` frame branch, which `"compact"` never enters), so the leak was latent. This task's new anchor fields (`deckLabelY`/`bottomLabelY`) ARE computed unconditionally in every mode and DO read `maxCardWidth`/`maxCardHeight`, which surfaced the bug as a failing test: `rockerViewLayout({ stationRails: "compact", orientation: "vertical" })` no longer deep-equalled the same call with `orientation: "horizontal"`.
- **Fix:** Resolved `pinCeiling` from `maxCardPinScale(effectiveHorizontal ? "horizontal" : orientation)` instead of the raw `orientation`. For `"full"`/`"none"` mode, `effectiveHorizontal` already equals `orientation === "horizontal"`, so this is algebraically identical to before — no behaviour change on either of those paths (confirmed: all pre-existing tests for `"full"`/`"none"` still pass unchanged). For `"compact"` mode, this now always resolves to the horizontal ceiling (1), regardless of what `orientation` the caller passes, restoring the documented invariance.
- **Files modified:** `components/rocker/rocker-view-frame.ts`
- **Verification:** `npx vitest run components/rocker/rocker-view-frame.test.ts` — the previously-failing "is horizontal-only by contract" test now passes, and the full 65-test file is green.
- **Committed in:** `0a1cac2` (part of Task 1's commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix)
**Impact on plan:** Necessary for correctness — without it, the new title anchors would have silently varied for the printed order form's own rail mode depending on an argument that mode is contractually supposed to ignore. No scope creep; the fix is scoped entirely to the `pinCeiling` derivation this task's own new fields depend on.

## Issues Encountered

None beyond the deviation above.

## Deferred Checkpoint

**Task 3 (blocking `checkpoint:human-verify`) is deferred, not completed.** It requires a live browser pass — `npm run dev` from the main checkout, both orientations on `/design/rocker`, plus a Summary-sheet print check on `/design/summary` — which this executor cannot perform from inside a git worktree (no dev server, no browser). Per this task's own constraints, Tasks 1-2 completing with Task 3 deferred is the expected outcome.

Recorded as an open `unrun-verify` entry in `.planning/WINDOWS.md` (entry id 2) so it stays visible at ship time. The founder should run through Task 3's own `<how-to-verify>` steps in the original `260830-2dy-PLAN.md` before considering this rail-title change fully signed off.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The layout module and viewer are both done and fully tested; only the human browser pass (Task 3) remains before this can be considered signed off. No blockers for follow-on work.

---
*Phase: 260830-2dy*
*Completed: 2026-08-30*

## Self-Check: PASSED

- FOUND: components/rocker/rocker-view-frame.ts
- FOUND: components/rocker/rocker-view-frame.test.ts
- FOUND: components/rocker/rocker-viewer.tsx
- FOUND: .planning/quick/260830-2dy-rocker-data-callouts-need-a-definitive-t/260830-2dy-SUMMARY.md
- FOUND commit: 0a1cac2
- FOUND commit: 02913fa
