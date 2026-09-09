---
phase: quick-260909-hd9
plan: 01
subsystem: ui
tags: [react, tailwind, playwright, vitest, viewer-toolbar]

requires:
  - phase: quick-260909-h3g
    provides: "Rotate button hidden on any coarse pointer (className=\"max-shell:hidden coarse:hidden\") on both TEMPLATE and ROCKER"
provides:
  - "ViewerToolbar — one flex row (flex-row-reverse, gap-1.5) pinned to a viewer panel's top-right corner, replacing per-button hand-picked slot positions"
  - "TEMPLATE, ROCKER and RAILS toolbars all draw from ViewerToolbar, so a hidden button (Rotate, Wide view) leaves no empty parking space"
  - "e2e/viewer-toolbar.spec.ts — measured proof the corner-most button sits flush with the row's right edge on phone, landscape-phone and desktop"
affects: [viewer, outline, rocker, rails, e2e]

actuals:
  tokens: 11400
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "One flex-row-reverse row per viewer toolbar, pinned by the row (not the button), so a hidden child costs the layout nothing"

key-files:
  created:
    - e2e/viewer-toolbar.spec.ts
  modified:
    - components/viewer/toolbar-button.tsx
    - components/viewer/toolbar-button.test.ts
    - components/outline/outline-editor.tsx
    - components/rocker/rocker-editor.tsx
    - components/rails/rail-band-editor.tsx

key-decisions:
  - "Chose one flex row (ViewerToolbar, flex-row-reverse + gap-1.5) over per-breakpoint position overrides — measured that a 34px button box + 6px gap reproduces today's hand-picked 40px step exactly, so the desktop stays pixel-identical while also fixing the touch-screen-at-desktop-width case no width-only override could reach"
  - "Positioning moved off the button (ViewerToolbarButton) entirely and onto the new row wrapper (ViewerToolbar); the button's own `slot` prop and its per-slot class lookup table were deleted rather than left dormant, so any leftover call site is a hard TypeScript error"

patterns-established:
  - "Corner-pinned button rows: wrap floating icon buttons in ViewerToolbar rather than positioning each one individually — a hidden button then costs the row nothing on any device"

requirements-completed: [QT-260909-hd9]

coverage:
  - id: D1
    description: "TEMPLATE and ROCKER toolbars are one flex-row-reverse row (ViewerToolbar) pinned to the panel's corner instead of individually positioned buttons; RAILS' single button also moved into the same row component"
    requirement: "QT-260909-hd9"
    verification:
      - kind: unit
        ref: "components/viewer/toolbar-button.test.ts#viewer toolbar button extraction (05-06) > all three editors open and close the shared ViewerToolbar row exactly once"
        status: pass
      - kind: unit
        ref: "components/viewer/toolbar-button.test.ts#viewer toolbar button extraction (05-06) > no editor still hands an individual button its own position"
        status: pass
      - kind: unit
        ref: "components/viewer/toolbar-button.test.ts#viewer toolbar button extraction (05-06) > the shared module declares ViewerToolbar exactly once, and only the row is pinned"
        status: pass
    human_judgment: false
  - id: D2
    description: "On a phone, the corner-most visible button (Export Template on TEMPLATE, construction lines on ROCKER) sits flush with the row's right edge, and the row is exactly as wide as its visible buttons plus one 6px gap per space — a hidden button costs the row nothing"
    requirement: "QT-260909-hd9"
    verification:
      - kind: e2e
        ref: "e2e/viewer-toolbar.spec.ts#phone, upright — the corner icons pack tight with no gap where a hidden one used to be > TEMPLATE (/design/outline): two icons pack into the corner, Export Template in it"
        status: pass
      - kind: e2e
        ref: "e2e/viewer-toolbar.spec.ts#phone, upright — the corner icons pack tight with no gap where a hidden one used to be > ROCKER (/design/rocker): one icon sits alone in the corner"
        status: pass
    human_judgment: false
  - id: D3
    description: "A phone held sideways (coarse pointer, viewport at or past the 820px shell breakpoint) still packs three icons into the corner — the case no phone-width-only fix could reach"
    requirement: "QT-260909-hd9"
    verification:
      - kind: e2e
        ref: "e2e/viewer-toolbar.spec.ts#phone held sideways — the corner still packs tight even at a width wide enough for the desktop layout > TEMPLATE (/design/outline): three icons pack into the corner, Export Template in it"
        status: pass
    human_judgment: false
  - id: D4
    description: "Desktop stays pixel-identical: all four TEMPLATE icons, all three ROCKER icons and the single RAILS icon sit at the exact same 0/40/80/120px line-up as before, and all five desktop baseline screenshots match with no --update-snapshots"
    requirement: "QT-260909-hd9"
    verification:
      - kind: e2e
        ref: "e2e/viewer-toolbar.spec.ts#desktop — the icons sit at the identical spacing they have always had (3 tests: TEMPLATE, ROCKER, RAILS)"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (all 5 screenshots, --project=desktop, re-run after both tasks)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The full existing test suite (vitest and Playwright) still passes unedited, apart from the deliberately extended toolbar contract test"
    requirement: "QT-260909-hd9"
    verification:
      - kind: unit
        ref: "npx vitest run (46 files, 2318 passed, 2 pre-existing skips)"
        status: pass
      - kind: e2e
        ref: "PW_PORT=3117 npx playwright test (111 passed, 99 skipped by project guard, exit 0)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Human-check visual pass (phone-sized browser window, TEMPLATE and ROCKER icon placement, widen back to desktop) named in Task 2's <verify>"
    verification: []
    human_judgment: true
    rationale: "Orchestrator ruling for this run directs deferring any human checkpoint to the SUMMARY rather than stopping; the automated measurements in D2-D4 already prove the same geometry numerically, but the visual pass itself was not performed by a human in this run."

duration: 35min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-hd9: One corner-pinned toolbar row replaces hand-picked button slots

**The floating icons over the TEMPLATE, ROCKER and RAILS drawings now sit in one row pinned to the panel's top-right corner (`ViewerToolbar`, `flex-row-reverse` + `gap-1.5`), so a hidden button (Rotate or Wide view on a phone) leaves no empty parking space in front of the ones that remain.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2
- **Files modified:** 5 (plus 1 new e2e spec)

## Accomplishments

- Replaced each toolbar button's hand-picked position (`slot={0,1,2,3}`, a lookup table of `right-0`/`right-10`/`right-20`/`right-30`) with one shared `ViewerToolbar` row component that all three viewer screens wrap their buttons in.
- The row is pinned once (`absolute top-0 right-0 z-10`) and lays its children out `flex-row-reverse` with a measured `gap-1.5` (6px) — chosen because a button's drawn box is 34px and the old hand-picked step was 40px, so 34 + 6 = 40 reproduces the desktop line-up exactly with no arbitrary value.
- On a phone, hiding Rotate and/or Wide view now removes them from the flex layout entirely — the survivors close the gap automatically instead of stopping short of the corner. This also fixes the touch-screen-at-desktop-width case (a tablet held sideways) that no phone-width-only override could reach.
- Extended the toolbar contract test (`components/viewer/toolbar-button.test.ts`) to cover all three editors (previously only outline and rocker), asserting each opens/closes exactly one `ViewerToolbar`, that no editor still hands a button its own position, and that only the row — not the button — carries the pinned box.
- Added `e2e/viewer-toolbar.spec.ts`: a new browser test measuring the row's geometry on iPhone, Android (including the Pixel-7-landscape case from quick task 260909-h3g) and desktop, proving the founder's complaint as numbers rather than "it looks right."
- Re-ran the desktop baseline screenshots and the full Playwright suite after each task; nothing else moved.

## Task Commits

Each task was committed atomically (Task 1 followed TDD: RED then GREEN):

1. **Task 1 (RED): add failing test for the corner icons packing into one row** - `f5d1e75` (test)
2. **Task 1 (GREEN): pack the corner icons into one row instead of hand-picked positions** - `d6314f5` (feat)
3. **Task 2: measure the corner icons in a real browser, phone and desktop** - `3a7692b` (test)

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed the full RED → GREEN cycle:
- RED: `f5d1e75` added three new assertions to `toolbar-button.test.ts` and confirmed they failed (3 failing, 4 pre-existing passing) before any source change.
- GREEN: `d6314f5` implemented `ViewerToolbar`, removed the per-button slot system, and rewired all three editors; all 7 assertions passed afterward.
- No REFACTOR commit was needed — the implementation was already clean on the first GREEN pass.

## Files Created/Modified

- `components/viewer/toolbar-button.tsx` - Added `ViewerToolbar` (the pinned, `flex-row-reverse` row); deleted `ViewerToolbarSlot` and `TOOLBAR_SLOT_POSITION`; moved the out-of-flow/stacking classes off `TOOLBAR_BUTTON_BASE` and onto the new row; button base gained `flex flex-none items-center` in their place.
- `components/viewer/toolbar-button.test.ts` - Extended to read `rail-band-editor.tsx` too; added three new assertions covering the row's open/close count, the removed per-button position, and the row (not button) owning the pinned box.
- `components/outline/outline-editor.tsx` - Wrapped the four floating buttons (Rotate, Export Template's dialog trigger, Construction lines, Wide view) in `<ViewerToolbar>`; moved Rotate above the `ExportPreviewDialog` in the JSX so DOM order matches the old corner-to-left slot order; deleted every `slot={n}` prop.
- `components/rocker/rocker-editor.tsx` - Same treatment for its three buttons (Rotate, Construction lines, Wide view).
- `components/rails/rail-band-editor.tsx` - Wrapped the single View Full Sized button in `<ViewerToolbar>`; `ViewFullSizedDialog` stays outside the row, unchanged, since it is a controlled dialog rather than a trigger.
- `e2e/viewer-toolbar.spec.ts` (new) - Measures the row and its visible buttons' bounding boxes on phone (upright), phone (landscape, Pixel-7-landscape/android only) and desktop; asserts corner-flush spacing, row-width-matches-visible-buttons, contiguous spacing, and (desktop only) the exact old 0/40/80/120px line-up.

## Decisions Made

- **One flex row over per-breakpoint position overrides.** Measured first: a toolbar button's drawn box is 34px (24px icon + 4px padding each side + 1px border each side under Preflight's `border-box`), and the old hand-picked step was 40px. A `gap-1.5` (6px) row reproduces that step exactly (34 + 6 = 40), so the row wins outright — pixel-identical on desktop, and it fixes the touch-screen-at-desktop-width case (a tablet held sideways) that no amount of phone-only overrides could reach.
- **`flex-row-reverse`, not `flex`.** The row is pinned by its right edge, so the first JSX child lands in the corner and later children step left — matching the old slot numbering (0 = corner) so a future fifth button is appended at the end of the JSX rather than needing to be prepended.
- **Deleted the `slot` prop rather than deprecating it.** `ViewerToolbarButtonProps` still omits `slot` from the underlying `<button>` props (it's a real HTML attribute), so any leftover call site passing a position is now a hard TypeScript error instead of a silently ignored prop.

## Deviations from Plan

None - plan executed exactly as written, including the exact task order, file list, and measured `gap-1.5` value.

## Issues Encountered

None.

## Human verification deferred

Task 2's `<verify>` names a manual visual pass: "On a phone-sized browser window open TEMPLATE: the Export Template icon and the construction-lines icon sit tight in the drawing's top-right corner with no gap in front of them. On ROCKER the single construction-lines icon is in the corner. Widen the window back to a desktop and all four icons on TEMPLATE are back in their usual line, in their usual order." Per this run's orchestrator ruling (never stop for a human), this was not performed as a manual step here. The automated measurements in `e2e/viewer-toolbar.spec.ts` (coverage D2-D4 above) already prove the same geometry numerically on all three device profiles, so the founder or a later reviewer can treat those passing assertions as the evidence, or take the manual look described above at their convenience.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The corner-pinned toolbar row pattern (`ViewerToolbar`) is now the one place to add a fourth or fifth button to any of the three viewer screens — a new button appended at the end of the JSX lands at the far left automatically, with no position math required.
- No blockers. Desktop baseline screenshots and the full Playwright suite are green; `npx tsc --noEmit` and `npm run lint` are clean.

---
*Phase: quick-260909-hd9*
*Completed: 2026-09-09*

## Self-Check: PASSED

All 6 modified/created source files and the SUMMARY file itself were confirmed present on disk. All 3 task commits (`f5d1e75`, `d6314f5`, `3a7692b`) were confirmed present in `git log`.
