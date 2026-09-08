---
phase: 05-the-units-chooser
plan: 05
subsystem: ui
tags: [refactor, sliders, react, drift-guard]

requires:
  - phase: 05-the-units-chooser
    provides: "05-03's completed Wave 2, which unblocked Wave 3's two folded groundwork plans"
provides:
  - "components/design/slider-row.tsx — the one shared SliderRow component and sliderValue helper used by all five control sidebars"
  - "TEMPLATE, ROCKER, RAILS, FINS and VOLUME sidebars rendering their sliders through that one shared component instead of five hand-rolled copies"
affects: [06-design-screens-in-metric]

actuals:
  tokens: 9800
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One composition point per shared control-sidebar piece: SliderRow follows the same idea 05-03's CardMetadataLine and 05-06's ViewerToolbarButton established — markup five files hand-rolled five slightly different ways is pulled into components/design/ once, keeping each call site's own unit conversion visible through onValueChange rather than hiding it inside the shared component"
    - "An allowlist-with-reason pattern for a deliberately un-migrated instance: components/design/slider-row.test.ts names every remaining hand-rolled <Slider> render and requires a one-line reason, so a slider that genuinely doesn't fit the shared shape is a recorded decision rather than a silent gap the drift guard would otherwise flag as a regression"

key-files:
  created:
    - components/design/slider-row.tsx
    - components/design/slider-row.test.ts
  modified:
    - components/outline/outline-controls.tsx
    - components/rails/rail-controls.tsx
    - components/fins/fin-controls.tsx
    - components/rocker/rocker-controls.tsx
    - components/volume/volume-controls.tsx

key-decisions:
  - "The extraction kept each slider's own unit conversion at its call site through the onValueChange prop, rather than moving inches-to-millimetres/degrees/percentage conversion into the shared component — this is the seam Phase 6 plugs the units hook into, and hiding it inside SliderRow would have made that harder, not easier"
  - "A density prop (\"default\" | \"tight\") was added so FINS' slightly closer label spacing survives the move rather than being silently normalised to the other four sidebars' wider gap"
  - "Eight sliders across TEMPLATE, RAILS, FINS and VOLUME were deliberately left hand-rolled rather than force-fit into SliderRow, and are named in the test's ALLOWLIST with a reason each (see Deviations below) — the plan's own top invariant, that nothing a shaper sees may change, was ranked above hitting the plan's stated minimum render count, and the shaper approved that call at the checkpoint"

requirements-completed: [UNIT-02]

coverage:
  - id: D1
    description: "All five control sidebars — TEMPLATE, ROCKER, RAILS, FINS, VOLUME — render the great majority of their sliders (34 of 42 total slider instances) through one shared SliderRow component instead of five hand-rolled copies of the same markup"
    requirement: "UNIT-02"
    verification:
      - kind: unit
        ref: "components/design/slider-row.test.ts#shared SliderRow (the fix for five hand-rolled slider markups) — every sidebar imports the shared row module; no sidebar still declares its own row or value helper; every remaining direct <Slider> render is named in the allowlist; the shared component exports exactly SliderRow and sliderValue"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3 — approved (with the 34-vs-38 deviation explicitly disclosed and accepted)"
        status: pass
    human_judgment: true
    rationale: "Whether every slider still looks and drags exactly as it did before the move — label wording, hint placement, dimming, spacing — is a visual/interaction judgment only a human eye and hand confirm; the checkpoint was run, the deviation was disclosed, and it was approved."
  - id: D2
    description: "Every slider keeps its own unit conversion visible at its call site through onValueChange, instead of a generic numeric callback hiding it inside the shared component"
    verification:
      - kind: unit
        ref: "components/design/slider-row.tsx — onValueChange: (value: number) => void, documented as the seam Phase 6's units hook plugs into; each call site's own conversion body was moved verbatim"
        status: pass
    human_judgment: false
  - id: D3
    description: "The TEMPLATE sidebar's disabled dimming, left/right hints, note line and clamped-depth warning all survive the migration unchanged"
    requirement: "UNIT-02"
    verification:
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3, step 4 (disabled row dims as a whole, clamped-depth warning still appears in the same words and colour) — approved"
        status: pass
    human_judgment: true
    rationale: "Confirming an exact wording/colour match against the pre-migration screen is a visual check only a human performs."
  - id: D4
    description: "A slider deliberately left outside the shared component is named in an allowlist with a reason, so an un-migrated slider is a recorded decision rather than an oversight"
    verification:
      - kind: unit
        ref: "components/design/slider-row.test.ts#every allowlist entry carries a one-line reason and points at a real sidebar file"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-05
status: complete
---

# Phase 5 Plan 5: The Shared Slider Row Summary

**All five control sidebars — TEMPLATE, ROCKER, RAILS, FINS, VOLUME — now render their sliders through one shared `SliderRow` component (34 of 42 slider instances), with eight sliders deliberately left hand-rolled and named in a drift-guard allowlist because their shape genuinely doesn't fit the shared row.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-04T18:48:00Z
- **Completed:** 2026-09-04T19:00:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 7 (2 new, 5 modified)

## Accomplishments

- Nothing changed on screen. Every slider on all five design screens still shows the same label,
  the same value in the same place, the same hints under the track, and the same dimming and
  spacing as before. This plan is groundwork behind the scenes, not a visible change — it exists
  so Phase 6's units work touches one shared component and five call sites instead of rewriting
  the same markup five separate times.
- A new file, `components/design/slider-row.tsx`, is now the one place the label-track-hints-note
  markup lives, along with `sliderValue`, the tiny helper that reads a number out of the slider
  drag callback — previously declared identically in all five sidebar files.
- Each slider's own conversion — inches to millimetres, a branded degrees value, or a plain
  percentage — stays visible at its own call site through the `onValueChange` prop, rather than
  being absorbed into the shared component. That is deliberate: it is exactly the seam Phase 6
  will plug the units-system hook into.
- TEMPLATE's disabled-row dimming, its left/right hints, its note line and its clamped-depth
  warning all still work exactly as before. FINS' slightly tighter label spacing was preserved
  through a `density="tight"` option rather than being silently pulled in line with the other four
  screens' wider gap.
- Eight sliders were deliberately left hand-rolled rather than forced into the shared shape (see
  Deviations below), and each is named in a new drift-guard test
  (`components/design/slider-row.test.ts`) with a one-line reason, so any slider that later
  reverts to its own copy — or any new hand-rolled slider that shows up unlisted — fails the test
  instead of quietly passing review.

## Task Commits

Tasks 1 and 2 were executed by a prior executor agent in an isolated worktree; the orchestrator
merged that worktree into `main`. This continuation confirmed the merged commits, recorded the
approved checkpoint (with its disclosed deviation), and closed out the plan's documentation.

1. **Task 1: The shared row, and the three sidebars that already have a local one** — `277ac62`
   (feat)
2. **Task 2: The two sidebars that hand-roll it, plus the drift guard** — `5899166` (feat)
3. **Orchestrator merge of the executor worktree into `main`** — `02b8c58` (chore, the point at
   which this plan's code landed on `main`)
4. **Task 3: Walk all five control sidebars and confirm nothing changed** —
   `checkpoint:human-verify`, resume-signal "approved" (no commit of its own; this is the
   checkpoint this SUMMARY closes out)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `components/design/slider-row.tsx` (new) — `SliderRow` (label/`displayValue`, value/min/max/
  step, `onValueChange`, `disabled`, `leftHint`/`rightHint`, `note`, `className`, `density`) and
  `sliderValue`, the shared value-reading helper. Markup, classes and element order were copied
  verbatim from the richest of the five existing local helpers (TEMPLATE's).
- `components/design/slider-row.test.ts` (new) — source-contract drift guard, same idiom as
  `lib/theme.test.ts`: strips comments from all five sidebar files and asserts each imports the
  shared module, none still declares its own row/value helper, and every remaining direct
  `<Slider` render (not `<SliderRow`) is named in an explicit allowlist with a reason.
- `components/outline/outline-controls.tsx` — its local row helper and value helper deleted; ten
  call sites now use `SliderRow` with flex sizing passed through `className`. One Board Length
  slider (with its feet/inches `Select` combo) stays hand-rolled, named in the allowlist.
- `components/rails/rail-controls.tsx` — its local `ControlSlider`/value helper deleted; two call
  sites (Board Thickness, Deck Profile) migrated in task 1. Four sliders (Family, Ratio, Corner
  Cut Offset, Bottom Tuck 3) stay hand-rolled, named in the allowlist — each carries hint or
  checkbox shapes the shared row's plain-string label and two-hint layout can't hold.
- `components/fins/fin-controls.tsx` — its local `RangeRow`/value helper deleted; six call sites
  migrated with `density="tight"`. Two sliders (Board Length, Tail Width @ 12") stay hand-rolled,
  named in the allowlist.
- `components/rocker/rocker-controls.tsx` — all thirteen sliders migrated to `SliderRow`, the
  paired two-per-line layout kept via `className` flex sizing on each child instead of a wrapper
  div; its local value helper deleted.
- `components/volume/volume-controls.tsx` — Board Width, Center Thickness and Board Type (three
  sliders) migrated to `SliderRow`, including the one nested inside a conditional block, which
  keeps its condition unchanged. One Board Length slider stays hand-rolled, named in the
  allowlist.

## Decisions Made

See `key-decisions` above. In short: unit conversion stays at the call site (the seam Phase 6
needs), FINS' tighter spacing survives through a `density` prop, and eight sliders were kept
hand-rolled by deliberate, documented choice rather than forced into a shape that would have
changed how they look.

## Deviations from Plan

### Disclosed and approved at the checkpoint

**1. [Scope — disclosed, approved] 34 SliderRow renders instead of the plan's stated minimum of 38**
- **Found during:** Task 2 (the two sidebars that hand-roll it, plus the drift guard)
- **Issue:** The plan's acceptance criterion asked for a combined count of at least 38
  `<SliderRow` renders across the five sidebars. The actual count, confirmed directly against the
  merged source on `main`, is 34: TEMPLATE 10, ROCKER 13, RAILS 2, FINS 6, VOLUME 3.
- **Reason:** Eight sliders were deliberately left hand-rolled because their shape doesn't fit
  `SliderRow`'s fixed label-then-track-then-hints layout without changing how a shaper sees them:
  - The three Board Length sliders (TEMPLATE, FINS, VOLUME) each have a feet/inches `Select`
    dropdown sitting between the label and the track, a slot `SliderRow` has no room for.
  - FINS' Tail Width @ 12" would fit the shared row on its own, but it shares one 0.45 opacity
    dimming state with its neighboring Board Length slider under a single toggle, and `SliderRow`'s
    own disabled dimming is Tailwind's 0.4 — migrating only one of the pair would leave two
    adjacent sliders fading to visibly different shades.
  - RAILS' Family (three hint captions), Ratio (four hint captions plus a Sym checkbox), Corner
    Cut Offset and Bottom Tuck 3 (a checkbox sharing the label's heading line) all carry shapes
    `SliderRow`'s plain-string label and two-hint layout cannot hold.
- **Fix:** None applied — this is a disclosed deviation, not a bug. All eight are named
  individually in `components/design/slider-row.test.ts`'s `ALLOWLIST`, each with a one-line
  reason, so the gap is a recorded decision the drift guard actively protects rather than an
  unmigrated oversight.
- **Verification:** The shaper was told explicitly, at the Task 3 checkpoint, that the count fell
  short of the plan's stated minimum and why. Resume-signal: "approved" — the plan's own top
  invariant ("nothing a shaper sees should change") was ranked above hitting the numeric target,
  and the shaper approved that ranking.
- **Committed in:** `5899166` (Task 2 commit, which added both the remaining migrations and the
  allowlist that documents the eight exceptions).

---

**Total deviations:** 1 disclosed scope deviation (34 vs. the plan's stated 38-render minimum),
approved by the shaper with full disclosure. 0 undisclosed auto-fixes.
**Impact on plan:** None on correctness or the plan's actual goal — every migrated slider behaves
identically to before, and the eight exceptions are a documented, tested decision rather than a
silent gap. Phase 6 still touches one shared component plus five call sites for the 34 migrated
sliders; the eight exceptions will each need their own attention when Phase 6 teaches sliders to
read in the chosen units system, which is a known, named, and bounded remainder rather than a
surprise.

## Issues Encountered

None beyond the disclosed deviation above. `npx vitest run` passes at 30 files / 1896 tests / 2
pre-existing skips on `main` after the merge. `git status --short` is clean.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UNIT-02's folded-todo groundwork is complete for the slider row, with the eight-slider exception
  list explicit and tested rather than hidden.
- Phase 5's Wave 3 is now fully closed (05-05 and 05-06 both complete); Wave 4 (05-07, ship it) is
  unblocked.
- Phase 6 planning should account for the eight hand-rolled sliders named in
  `components/design/slider-row.test.ts`'s allowlist as separate, individually-shaped work rather
  than assuming all sliders on the five screens already share one component.
- No blockers.

---
*Phase: 05-the-units-chooser*
*Completed: 2026-09-05*
