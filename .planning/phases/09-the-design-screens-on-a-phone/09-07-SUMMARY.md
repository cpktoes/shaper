---
phase: 09-the-design-screens-on-a-phone
plan: 07
subsystem: design-screens
tags: [outline-viewer, rocker-viewer, drag, touch, playwright, cdp, e2e]

# Dependency graph
requires:
  - "09-06: nearestOutlineDragTarget/nearestSideProfileDragTarget and the four hit-radius constants (OUTLINE_DRAG_HIT_PX/_COARSE_PX, SIDE_PROFILE_DRAG_HIT_PX/_COARSE_PX)"
  - "09-02: DesignScreenShell, useCoarsePointer, the phone shell's Fine adjust fold pattern the touch-drag e2e test has to open before reading a folded label"
provides:
  - "One delegated pointer-down pick per drawing in components/outline/outline-viewer.tsx and components/rocker/rocker-viewer.tsx (D-15), replacing five/four per-circle onPointerDown handlers"
  - "The drag readout chip (D-17): a touch-only live-reading card (CalloutChipFrame + accent-inked text) that follows the dragged point and reads the same label/value SliderRow composes"
  - "e2e/touch-drag.spec.ts: a real (CDP) touch drag proof on the android project, TEST-01's automated half"
  - "select-none + WebkitTouchCallout: none on both viewers' hit circles and root SVGs (PHON-04's long-press-popup suppression)"
  - "touch-action:none on both viewers' root SVGs (bugfix beyond the plan's own text — see Deviations)"
affects: []

# Actuals (#2632)
actuals:
  tokens: 13583
  tasks: 4
  commits: 6

tech-stack:
  added: []
  patterns:
    - "One delegated pointer-down handler on the drawing's root <svg> (gated on showConstruction && the drag callback), replacing five/four per-circle handlers — converts the press to board coordinates once, then calls the pure nearestOutlineDragTarget/nearestSideProfileDragTarget pick; the hit circles keep their visual ring, cursor and data-drag-target test hook but own no handler of their own."
    - "One hit radius drives both what is drawn and what is picked: hitRadiusPx (useCoarsePointer() selects the 09-06 measured coarse constant or the historic 15px) converted once to board millimetres via handleUnit and the render scale, never a second number."
    - "The readout chip is drawn as a sibling of the rotated content <g>, not a child of it, in the SVG's own rendered viewBox space — a small pure linear map (toViewBoxPoint, the exact inverse of the content group's rotate(-90)/rotate(90)) places the touched point there once, so the chip's box and text are always screen-upright with no counter-rotation of its own, and the never-clipped clamp is an exact bounds check against the same four viewBox numbers the <svg> itself uses, not an approximation across two coordinate spaces."
    - "Source-contract vitest tests (components/viewer/*.test.ts) for .tsx behavior vitest's own node environment cannot render: read the real viewer source with readFileSync and assert structural properties (import present, handler count, banned pattern absent) — the same idiom drag-spacing.test.ts and toolbar-button.test.ts already established. Used here for both this plan's TDD tasks."

key-files:
  created:
    - components/viewer/drag-pick-wiring.test.ts
    - components/viewer/drag-readout-chip.test.ts
    - e2e/touch-drag.spec.ts
  modified:
    - components/outline/outline-viewer.tsx
    - components/rocker/rocker-viewer.tsx
    - CLAUDE.md

key-decisions:
  - "The widepoint's own readout chip shows Width AND Offset (two lines), even though solveOutlineDrag's widepoint case only ever returns widePointOffset — Width stays a slider-only input, never moved by a drag. This matches the plan's own explicit example and the sidebar's own grouping (WP OFFSET is already drawn directly beneath the WIDEPOINT chip in the construction overlay); every other target's chip shows only the field(s) its own solve returns."
  - "The readout chip's text is two <tspan> runs per line inside one <text> (the label at CALLOUT_PX.name/muted colour, the value at CALLOUT_PX.value/accent-ink), not CalloutChip's own stacked name-over-value rows — one line per driven field (Width — 19 1/4\", not Width / 19 1/4\" on two rows), matching the plan's own 'two-line chip' behaviour description and SliderRow's own label — displayValue composition."
  - "Both nearestOutlineDragTarget/nearestSideProfileDragTarget calls at the delegated handler reuse the SAME raw (board-mm) points array already built for the view-space dragTargets mapping (dragPointsAt), so the pick and the drawing can never read two different snapshots of the same five/four points."

requirements-completed: [PHON-04, TEST-01]

coverage:
  - id: 09-07-T1
    description: "One delegated pick for every pointer type; the desktop mouse-drag regression and all five baseline screenshots stay green with nothing regenerated"
    requirement: "PHON-04, PHON-05"
    verification:
      - kind: unit
        ref: "components/viewer/drag-pick-wiring.test.ts — 14 tests"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-regression.spec.ts + e2e/desktop-baseline.spec.ts — 7/7 passing, no snapshot regenerated, re-run after every task"
        status: pass
    human_judgment: false
  - id: 09-07-T2
    description: "No markup built from a string; the chip reads the solver's clamped value (the live outline/rocker spec), never the raw pointer position; never appears for a mouse"
    requirement: "PHON-04, PHON-05"
    verification:
      - kind: unit
        ref: "components/viewer/drag-readout-chip.test.ts — 10 tests, including a banned-formatter/dangerouslySetInnerHTML grep and npm test's own lib/units-isolation.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts — no snapshot regenerated (a mouse never sees the chip, so no desktop pixel moved)"
        status: pass
    human_judgment: false
  - id: 09-07-T3
    description: "A real, trusted touch drag (CDP) moves the board and shows the readout while it moves; the CDP call lives only under e2e/"
    requirement: "PHON-04, TEST-01"
    verification:
      - kind: e2e
        ref: "e2e/touch-drag.spec.ts — 2/2 passing on the android project"
        status: pass
    human_judgment: false
  - id: 09-07-T4
    description: "The whole phase's suite is green; the five desktop baseline images still match after every plan; CLAUDE.md explains how to run the browser tests"
    requirement: "PHON-05, TEST-01"
    verification:
      - kind: unit
        ref: "npm test — 2309 passed, 2 skipped; npx tsc --noEmit; npm run lint — 0 errors"
        status: pass
      - kind: e2e
        ref: "npx playwright test (all three projects) — 86 passed, 70 skipped by project, 0 failed; e2e/desktop-baseline.spec.ts re-run standalone at the end — 5/5, none regenerated"
        status: pass
    human_judgment: false
  - id: D-Manual-1
    description: "Desktop mouse drag and keyboard operation unchanged on every viewer touched (VALIDATION.md Manual-Only row 1)"
    requirement: "PHON-05"
    verification: []
    human_judgment: true
    rationale: "Playwright's own automated regression covers one drag per viewer and the five pixel-identical baseline screenshots, but the full keyboard/focus/hover/rotate/construction-toggle/wide-view walkthrough is a human pass, per this plan's own <verification> section and workflow.human_verify_mode (end-of-phase)."

duration: 28min
completed: 2026-09-09
status: complete
---

# Phase 9 Plan 07: Thumb Drag, Finger-Sized Zones and a Live Reading While It Moves Summary

**Both viewers now pick the nearest control point through one delegated press handler instead of five (or four) racing per-circle ones, grow their grab zones to a measured finger-sized radius on touch while staying pixel-identical on a mouse, show a small live-reading card by the finger while it drags, and a real (CDP) touch drag proves the whole chain end to end on Android — closing out the phase's Playwright paperwork along the way.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-09T02:20:11-07:00 (first commit)
- **Completed:** 2026-09-09T02:48:34-07:00 (last commit)
- **Tasks:** 4 (2 TDD, 2 plain auto)
- **Files touched:** 6 (3 created, 3 modified)

## Accomplishments

- **One delegated drag-start pick per drawing (D-15).** Both viewers' root `<svg>` now carries a single `onPointerDown`, gated on `showConstruction && <the drag callback>`, that converts the press to board coordinates once (the existing `toBoardPoint`) and asks `nearestOutlineDragTarget`/`nearestSideProfileDragTarget` (09-06) which of the five/four points, if any, is within reach — never which hit-circle happened to win the browser's own paint-order hit-test. The per-circle handlers are gone entirely (not left alongside for the mouse), per the plan's own `assumption_delta_decision`. `grep -c "onPointerDown"` is exactly 1 in each file.
- **One hit radius drives both what is drawn and what is picked.** `useCoarsePointer()` selects the 09-06 measured coarse constant (`OUTLINE_DRAG_HIT_COARSE_PX`/`SIDE_PROFILE_DRAG_HIT_COARSE_PX`) or the historic 15px, converted once from CSS px to board millimetres at the current render scale; both viewers' private `DRAG_HIT_PX = 15` constants are gone, replaced by the shared import.
- **No movement threshold, one pointer path.** A press starts the drag immediately on both a mouse and a touch — no `onMouseDown`/`onTouchStart` added beside the pointer handlers.
- **The long-press popup can no longer interrupt a drag.** `select-none` and an inline `WebkitTouchCallout: "none"` are on every hit circle and each drawing's root SVG (both places, per RESEARCH.md's own Pitfall 3 warning).
- **A live-reading card follows a dragged point (D-17).** Built from the shared `CalloutChipFrame` + SVG `<text>`/`<tspan>` (not a new chip component), reading the exact `label — value` a shaper's own sidebar slider row would show — `Width — 19 1/4"` then `Offset — 2"` for the widepoint, one line per driven field elsewhere — inked in `--color-surf-accent-ink` so a live reading is told apart from the drawing's permanent callouts by colour alone. It reads the live `outline`/`rocker` spec (never the raw pointer position), so a point clamped against its own solver bound shows the clamped value. Positioned in the SVG's own rendered viewBox space via a small exact linear map (the inverse of the content group's own rotation), clamped to stay fully inside the drawing's frame. Touch-only at every viewport width — `readoutChip` is `null` whenever no `pointerType === "touch"` drag is live — so the mouse baseline screenshots never moved.
- **A real touch drag, proven with trusted input (TEST-01).** New `e2e/touch-drag.spec.ts` uses Chrome DevTools Protocol's `Input.dispatchTouchEvent` (android project only — no WebKit equivalent, and `page.touchscreen` can only tap) to drag the widepoint: Offset changes, Width does not, the readout chip is visible mid-drag and gone the instant the finger lifts, and no text got selected. A second test proves nearest-point-wins using coordinates derived at run time from the rendered hit circles, never hardcoded.
- **A real bug found and fixed by building the real test (not just written around).** See Deviations below — `touch-action: none` was missing from both viewers' root `<svg>`, and a real touch drag that moved even slightly past its own starting circle was being handed to native scrolling and cancelled.
- **CLAUDE.md now tells a shaper Playwright is installed**, not still pending — the two `test:e2e`/`test:e2e:phone` commands, the port-3100 note, and one short paragraph naming the phase's two phone-only switches (the 820px shell breakpoint and the coarse-pointer variant) and the rule that keeps them from ever being conflated.
- **Whole-suite proof, run at the end:** `npx tsc --noEmit`, `npm test` (2309 passed, 2 skipped), `npm run lint` (0 errors), `npx playwright test` across all three projects (86 passed, 70 correctly skipped by project, 0 failed), and a final standalone re-run of `e2e/desktop-baseline.spec.ts` — all five images matched, none regenerated.

## Task Commits

1. **Task 1: One press handler per drawing, finger-sized zones, no long-press popup** (TDD)
   - `4cb2127` — test(09-07): add failing test for the one delegated drag pick (RED)
   - `7805ca1` — feat(09-07): one delegated drag pick per drawing, finger-sized on touch (GREEN)
2. **Task 2: A readout by the finger, in the shaper's own words and units** (TDD)
   - `ef01422` — test(09-07): add failing test for the touch-only drag readout chip (RED)
   - `feb8a43` — feat(09-07): a small live-reading card follows a finger while it drags (GREEN)
3. **Task 3: Prove a real touch drag moves the board**
   - `833c5f4` — test(09-07): prove a real touch drag moves the board, Android/CDP (also carries the touch-action bugfix — see Deviations)
4. **Task 4: Close the phase — update the project notes and run everything once**
   - `6ec0336` — docs(09-07): tell a shaper how to run the browser tests

_TDD gate compliance: both `test(...)` commits (`4cb2127`, `ef01422`) were verified to fail for the expected reason (missing wiring, not an accidental pass) before their matching `feat(...)` commits — 10/14 and 3/10 assertions respectively failed against the pre-task code, confirmed by running each test file standalone before writing any implementation._

## Files Created/Modified

- `components/viewer/drag-pick-wiring.test.ts` — new. Source-contract test for Task 1's delegated pick, mirroring `toolbar-button.test.ts`'s idiom (neither viewer can be rendered in vitest's node-only environment).
- `components/viewer/drag-readout-chip.test.ts` — new. Same idiom for Task 2's readout chip.
- `e2e/touch-drag.spec.ts` — new. Real CDP touch drag + nearest-point-wins proof, android project only.
- `components/outline/outline-viewer.tsx` — the delegated pick, the coarse/fine hit radius, `select-none`/`WebkitTouchCallout`/`touch-none` on the root SVG and hit circles, the readout chip and its `outlineReadoutLines`/`toViewBoxPoint` helpers, a `data-readout-chip` test hook (mirrors `data-drag-target`).
- `components/rocker/rocker-viewer.tsx` — the same, for the rocker's four curve handles.
- `CLAUDE.md` — Stack section (Playwright installed, not pending), Commands block (`test:e2e`/`test:e2e:phone`), Layout section (the 820px shell breakpoint vs. the coarse-pointer variant).

No file was deleted. `git diff package.json` is empty — no dependency was installed.

## Decisions Made

See `key-decisions` in the frontmatter for the full list. Worth restating in plain English:

1. **The widepoint's chip shows both Width and Offset**, even though dragging the widepoint only ever changes Offset (Width stays a slider-only input, exactly as it always has — quick task 260822-lg3's own "widepoint drag constrained to offset only"). This matches the plan's own explicit example and the drawing's own existing grouping (the WP OFFSET chip already sits directly beneath the WIDEPOINT chip).
2. **The chip's text is one line per driven field**, each line a single `<text>` with two differently-styled `<tspan>` runs (muted label, accent-inked value) — not `CalloutChip`'s own two-ROW name/value stack. A widepoint drag shows a genuine two-*line* card (`Width — 19 1/4"` / `Offset — 2"`), matching the plan's own description.
3. **The readout chip is a sibling of the rotated content group, not a child of it.** Drawn directly in the SVG's own rendered viewBox space via a small exact linear map (the precise inverse of the content group's `rotate(-90)`/`rotate(90)`), so the chip is always screen-upright with no counter-rotation math of its own, and the "never clipped" clamp is an exact bounds check against the same four numbers the `<svg viewBox>` attribute itself uses — not an approximation across two different coordinate spaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `touch-action: none` was missing from both viewers' root `<svg>`, only on the hit circles**
- **Found during:** Task 3, while building the real CDP touch-drag test — a touch drag that moved even a few pixels past its own starting circle was silently cancelled (a `pointercancel`), even though `preventDefault()` was already called on the pointerdown and pointer capture was already set.
- **Issue:** Pointer capture redirects *event dispatch* to keep the same element receiving `pointermove`, but it does not override the browser's own native touch-gesture arbitration, which is decided from the `touch-action` CSS of the elements the touch's original hit-test path actually passed through. The hit circles already carried `touch-none` (unchanged, pre-existing), but the delegated handler (Task 1) is now on the root `<svg>` itself, and a real finger routinely drags well outside the small ~18-22px circle it started on — at that point the touch is moving across SVG territory with no `touch-action: none` of its own, and Chromium can still hand the gesture to native scrolling.
- **Fix:** Added `touch-none` to both viewers' root `<svg>` `className`, alongside the existing `select-none`. Confirmed with real (CDP) touch input, not assumed — the touch-drag e2e test failed reliably before this fix (chip visible right after `touchstart`, gone after a single `touchmove`) and passed reliably after it.
- **Files modified:** `components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`
- **Commit:** `833c5f4` (bundled with Task 3's own test-file commit, since the test is what surfaced the bug and the fix is what makes it pass)

Or, in short: none beyond the one bug above — every other task's `<action>` shape and acceptance criteria were followed as written.

## Human Verification Deferred to End-of-Phase UAT

This is the last plan in the phase, so the full list gathered from every plan in the wave:

- **Desktop mouse drag and keyboard operation unchanged on every viewer touched (VALIDATION.md Manual-Only row 1, PHON-05).** On a desktop browser ≥ 820px wide, on TEMPLATE and ROCKER: drag every one of the nine points with the mouse and confirm each lands where it lands today; confirm no readout chip ever appears for the mouse; tab to every control and operate it with the arrow keys; use the rotate button and the construction toggle; turn wide view on and off. Playwright's automated equivalents (the real mouse-drag regression test, the five pixel-identical baseline screenshots) cover the mouse-driven and pixel-identity surface and pass, but the full keyboard/focus/hover walkthrough is a human pass.
- **Page fits the visible area as Safari's toolbar shows and hides (VALIDATION.md Manual-Only row 2, PHON-02, carried since 09-02).** On a real iPhone in Safari, open each design screen, scroll the controls so the toolbar collapses and re-expands; confirm the bottom tab bar stays visible and nothing is clipped or trapped. Device emulators do not reproduce Safari's dynamic viewport resize.
- **No long-press text popup during a real thumb drag (VALIDATION.md Manual-Only row 3, PHON-04).** On a real iPhone, press and hold a drag point for two seconds, then drag; no selection or callout should appear. This plan's own `select-none`/`WebkitTouchCallout: none` suppression and the android/CDP touch-drag test (`window.getSelection()` empty) are the closest automated proxy Playwright's device emulation can offer — the iOS callout itself is not emulated.
- **Tapping a number field on a real iPhone never zooms the page** (carried from 09-05's own `coarse:text-base` 16px fix) — confirm on a real device, not an emulator.
- **Printing a rail from a phone and measuring it with a ruler, in both unit systems** (carried from 09-04) — confirm the printed scale is ruler-true.
- **Reading the RAILS INSTRUCTIONS tab at 360px in Metric** (carried from 09-04) — confirm nothing truncates or overlaps at the narrowest supported width.
- **A real-device look at ROCKER's narrower-than-full-width drawing (D-18, carried from 09-02/09-03).** The automated specs prove the drawing stays within the 40–68% pinned-height band at the founder's own chosen 66dvh ceiling, but whether a rocker drawing that measures roughly 322×341px on an iPhone-sized screen — narrower than its own pinned area — *reads right in the hand* is the founder's own judgment call.
- **A real touch drag on the ROCKER viewer specifically** (this plan's own automated test only exercises the outline viewer, per TEST-01's own "at least the outline viewer" requirement and RESEARCH.md's own rationale — CDP's `Input.dispatchTouchEvent` has no WebKit equivalent, so only the Chromium/android project carries it, and one viewer's proof was judged sufficient for the automated half). The rocker viewer's delegated pick, coarse radius and readout chip are built identically (same source-contract test coverage, same desktop regression proof) but a real-device touch drag on ROCKER's own four curve handles has not been separately exercised.

## User Setup Required

None — no external service configuration required. No dependency was installed (`git diff package.json` is empty).

## Next Phase Readiness

- Phase 9 (the-design-screens-on-a-phone) is now feature-complete across all seven plans: PHON-04's thumb-drag work (the last automated piece) and TEST-01 (the touch-drag proof) both close out here.
- No blockers for the phase's own end-of-phase UAT pass, which is where the "Human Verification Deferred" list above gets worked through.
- `npm run build` was not run in this worktree — Turbopack cannot resolve `next` from a worktree checkout — and must be run from the main checkout after this wave merges, per this plan's own executor-environment note.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-09*

## Self-Check: PASSED

All 7 commits (`4cb2127`, `7805ca1`, `ef01422`, `feb8a43`, `833c5f4`, `6ec0336`, `74572db`) verified present in `git log`. All 7 touched/created files (`components/viewer/drag-pick-wiring.test.ts`, `components/viewer/drag-readout-chip.test.ts`, `e2e/touch-drag.spec.ts`, `components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`, `CLAUDE.md`, this SUMMARY) verified present on disk.
