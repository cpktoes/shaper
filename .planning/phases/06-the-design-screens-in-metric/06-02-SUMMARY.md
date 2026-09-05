---
phase: 06-the-design-screens-in-metric
plan: 02
subsystem: ui
tags: [units, metric, react, vitest, typescript, surfboard-geometry]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "06-01 — lib/geometry/measure-display.ts (formatDim/formatMark/formatSignedDim/formatLength/stationLabel/columnUnitSuffix/measureSlider/commitTypedMeasure), metricSliderRange in lib/geometry/units.ts, the design-screen conversion ledger in lib/units-isolation.test.ts"
provides:
  - "components/design/measure-field.tsx — MeasureField, the one typed measurement control in the app, system-aware via a system prop, delegating all parse/clamp/snap/error work to commitTypedMeasure"
  - "The TEMPLATE, FINS and VOLUME Board Length controls converted: one typed centimetre field replaces the feet/inches Selects in Metric, over a 1cm-step slider (D-08)"
  - "The Template Builder (outline-controls.tsx) flipped to converted:true in the units-isolation ledger — its last direct imperial formatter call is gone"
affects: ["06-03", "06-04", "06-05", "06-06", "06-07"]

# Actuals (#2632)
actuals:
  tokens: 9810
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MeasureField(value, onCommit, label, family, min, max, system, bare?, disabled?) — the one typed measurement box every design screen renders, calling commitTypedMeasure for all parse/clamp/snap/error work and holding only the focus/blur/raw-string plumbing ImperialField established"
    - "A hand-rolled Board Length control's middle row branches on system: Imperial renders the existing feet/inches Select pair untouched; Metric renders one MeasureField sized to its own content, sharing the same slider bounds/step from measureSlider"

key-files:
  created:
    - components/design/measure-field.tsx
    - components/design/measure-field.test.ts
  modified:
    - lib/geometry/measure-display.test.ts
    - components/outline/outline-controls.tsx
    - components/volume/volume-controls.tsx
    - components/fins/fin-controls.tsx
    - components/design/slider-row.test.ts
    - lib/units-isolation.test.ts

key-decisions:
  - "Added an optional disabled prop to MeasureField (not in the original Task 1 spec) so the VOLUME screen's typed Board Length field locks the same way its Select pair and Slider already do while 'Measure This Board's Real Shape' is on — without it, a shaper could type over a length the board's own template is supposed to be driving. Rule 2 (auto-add missing critical functionality): this is a correctness gap, not a cosmetic one, since the disabled Selects exist specifically to prevent editing a computed value."
  - "commitTypedMeasure needed no changes — Plan 01 already implemented the full pipeline (bare mode, length-family cm-domain clamping, empty-string revert, mm/cm suffix overrides) exactly as Plan 02's <behavior> spec describes. Task 1's work was additive test coverage plus the new MeasureField component, not a fix to measure-display.ts."
  - "volume-controls.tsx and fin-controls.tsx each needed useUnits() added — neither imported it before this plan, since neither screen had a system-aware element until now."
  - "volume-controls.tsx's Board Length slider bounds were switched from the file's own literal 60/120 to the imported BOARD_LENGTH_RANGE_IN constant (same values), matching outline-controls.tsx's existing pattern and avoiding a second hand-typed copy of the same range."

patterns-established:
  - "Pattern: a hand-rolled Board Length control computes its measureSlider view once per render inside an IIFE (outline-controls.tsx) or as a top-level const (volume-controls.tsx, fin-controls.tsx), feeding value/min/max/step to both the conditional middle row and the Slider beneath it, so the field and the slider can never disagree."

requirements-completed: [SCRN-01, SCRN-02]

coverage:
  - id: D1
    description: "MeasureField — the one typed measurement box in the app, system-aware, delegating to commitTypedMeasure for all parse/clamp/snap/error behaviour"
    requirement: "SCRN-02"
    verification:
      - kind: unit
        ref: "components/design/measure-field.test.ts (source-contract: exactly one Input, one error div, ImperialField's exact classes, calls commitTypedMeasure, onCommit gated on error===null, no error copy declared, no formatter/parser imported outside measure-display, system read from props not useUnits)"
        status: pass
      - kind: unit
        ref: "lib/geometry/measure-display.test.ts#commitTypedMeasure (59 tests total: mark/dim/length families, mm/cm suffix overrides, snapping, clamping, boundary-exact values both systems, empty/whitespace revert, imperial feet-and-inches and out-of-range clamping)"
        status: pass
    human_judgment: false
  - id: D2
    description: "TEMPLATE and VOLUME Board Length controls: one typed centimetre field replaces the feet/inches Selects in Metric, over a 1cm-step slider stopping at 153/304 cm; Imperial byte-identical"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "components/design/slider-row.test.ts (allowlist counts unchanged: OUTLINE_PATH 1, VOLUME_PATH 1, reasons updated to describe the per-system middle row)"
        status: pass
    human_judgment: true
    rationale: "Visual/interaction confirmation (typing 188 moves the thumb and re-labels to 188.0 cm, the thumb steps a centimetre at a time and stops at 153/304, an unreadable value reverts with the error line, Imperial dropdowns are unchanged) requires a browser per Task 2's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."
  - id: D3
    description: "FINS Board Length control: the same typed centimetre field, stopping at 122/365 cm (that screen's own 48-144in range); the shared 0.45 opacity import-template dimming and locking unchanged in both systems; outline-controls.tsx flipped to converted:true in the ledger"
    requirement: "SCRN-01"
    verification:
      - kind: unit
        ref: "components/design/slider-row.test.ts (FINS_PATH allowlist count unchanged at 2, reason updated); lib/units-isolation.test.ts (outline-controls.tsx asserted converted:true, zero banned formatters; fin-controls.tsx and volume-controls.tsx correctly left converted:false, still holding unconverted sliders)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation (the Fins screen's Board Length box stops at 122/365 cm, the import-from-template dimming still applies in both systems) requires a browser per Task 3's <human-check>. Deferred to end-of-phase UAT per workflow.human_verify_mode: end-of-phase (orchestrator ruling)."

duration: ~25min
completed: 2026-09-05
status: complete
---

# Phase 6 Plan 2: One Typed Board Length Field, on All Three Sidebars Summary

**New `MeasureField` component (the app's one system-aware typed measurement box) replacing the feet/inches Select pair with a typed centimetre field on the TEMPLATE, FINS and VOLUME Board Length controls in Metric — Imperial byte-identical throughout.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 8 (2 new, 6 modified)

## Accomplishments

- Built `components/design/measure-field.tsx`: `MeasureField`, the one typed measurement control in the app, structurally the exact sibling of `ImperialField` — same focus/blur/Enter/aria wiring, same `Input` and error-line class strings byte-for-byte — but system-aware via a `system` prop and delegating every parse/clamp/snap/error decision to `commitTypedMeasure`. It performs no conversion of its own and declares no error copy.
- Pinned `commitTypedMeasure`'s full behaviour with 21 new tests in `lib/geometry/measure-display.test.ts`: mark-family mm-suffix override and snap-to-nearest-mm, dim-family cm-domain clamping and mm-suffix override, imperial feet-and-inches on a length-family field, boundary-exact values accepted unchanged in both systems, and empty/whitespace-only input reverting with the millimetre error line. Confirmed Plan 01's `commitTypedMeasure` already implemented every behaviour the plan's spec describes — no fix was needed to `measure-display.ts` itself.
- Converted all three Board Length controls (`outline-controls.tsx`, `volume-controls.tsx`, `fin-controls.tsx`): each now branches its middle row on `system` — Imperial renders the unchanged feet/inches Select pair, Metric renders one `MeasureField` sized to its own content — over a slider that now steps a whole centimetre at a time via `measureSlider`, stopping at 153/304cm (TEMPLATE, VOLUME) or 122/365cm (FINS).
- Flipped `components/outline/outline-controls.tsx` to `converted: true` in `lib/units-isolation.test.ts`'s ledger — with Board Length converted, that file's last direct imperial formatter call (`formatFeetInches`) is gone.
- Updated `slider-row.test.ts`'s `OUTLINE_PATH`, `VOLUME_PATH` and `FINS_PATH` allowlist reasons to describe the new per-system middle row, per D-08's requirement that the allowlist be updated with the change rather than worked around; all three `count` values are unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: One typed measurement box that speaks both systems** - `268b6fc` (feat)
2. **Task 2: A typed board length on the Template Builder and the Volume screen** - `74d2c6f` (feat)
3. **Task 3: The same typed board length on the Fins screen, and the ledger updated** - `848692c` (feat)

**Plan metadata:** committed alongside this SUMMARY by the orchestrator after merge (worktree execution — STATE.md/ROADMAP.md not touched here).

## Files Created/Modified

- `components/design/measure-field.tsx` - New: `MeasureField`, `MeasureFieldProps` — the one system-aware typed measurement box
- `components/design/measure-field.test.ts` - New: source-contract test asserting the component's structural contract (no DOM available in this vitest config)
- `lib/geometry/measure-display.test.ts` - 21 new `commitTypedMeasure` tests covering mark/dim/length families, suffix overrides, snapping, clamping, boundaries and empty-input revert in both systems
- `components/outline/outline-controls.tsx` - Board Length middle row branches on system; slider now driven by `measureSlider`; label reads through `formatLength`
- `components/volume/volume-controls.tsx` - Same Board Length conversion; added `useUnits()` (not previously imported); slider bounds switched from a literal 60/120 to `BOARD_LENGTH_RANGE_IN`
- `components/fins/fin-controls.tsx` - Same Board Length conversion using the screen's own 48-144in range; `MeasureField`'s new `disabled` prop wired to the existing `importTemplate` lock
- `components/design/slider-row.test.ts` - Allowlist reasons for `OUTLINE_PATH`, `VOLUME_PATH`, `FINS_PATH` updated to describe the per-system middle row; counts unchanged
- `lib/units-isolation.test.ts` - `components/outline/outline-controls.tsx` flipped to `converted: true`

## Decisions Made

- Added an optional `disabled` prop to `MeasureField` (Rule 2 — auto-add missing critical functionality, not in Task 1's original spec): the VOLUME screen's Select pair and Slider are already disabled while "Measure This Board's Real Shape" is on, so a shaper can't type over a value the board's own template is computing. Without a `disabled` prop on `MeasureField`, the Metric typed field would have been the only editable control in that dimmed row — a real correctness gap, not a cosmetic one. Wired identically in `volume-controls.tsx` and `fin-controls.tsx` (which already dims/disables under `importTemplate`).
- `commitTypedMeasure` needed zero changes: Plan 01 had already implemented the length-family cm-domain clamp, bare mode, and empty-string revert exactly as this plan's `<behavior>` spec describes. Task 1's real work was the new component plus the missing test coverage (21 cases), not a fix to `measure-display.ts`.
- `volume-controls.tsx`'s Board Length slider bounds moved from a file-local literal (`60`, `120`) to the imported `BOARD_LENGTH_RANGE_IN` constant, matching `outline-controls.tsx`'s existing pattern rather than keeping a second hand-typed copy of the same range now that the file needed to pass a range into `measureSlider`.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: "end-of-phase"`, these `<human-check>` items did not halt execution:

1. **Task 2 (Template + Volume Board Length):** On Metric, the Template Builder and the Volume screen each show one box above the Board Length slider; typing 188 and pressing Enter moves the thumb and re-labels the row to 188.0 cm; the thumb moves a centimetre at a time and stops at 153 and 304. Typing `5 1/2` puts the last good number back with an error line under the box. Switch to Imperial and the two dropdowns are back, unchanged.
2. **Task 3 (Fins Board Length):** On Metric, the Fins screen's Board Length shows the same typed box, stopping at 122 and 365 cm. Tick "import from template" and the row dims exactly as it did before. On Imperial the dropdowns are unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a `disabled` prop to `MeasureField`**
- **Found during:** Task 2 (Volume screen's Board Length control)
- **Issue:** The plan's Task 1 spec for `MeasureFieldProps` did not include a `disabled` prop, but the VOLUME screen's existing Board Length Select pair and Slider are disabled while `importTemplate.dimensionsDisabled` (the "Measure This Board's Real Shape" toggle) is true. Without a way to disable the typed field, a Metric shaper could type over a board length the template import is supposed to be driving — the one control in that dimmed row still editable.
- **Fix:** Added an optional `disabled?: boolean` prop to `MeasureFieldProps`, defaulting to `false`, passed straight through to the underlying `Input`. Wired `disabled={dimensionsDisabled}` in `volume-controls.tsx` and `disabled={importTemplate}` in `fin-controls.tsx` (which has the same lock).
- **Files modified:** `components/design/measure-field.tsx`, `components/volume/volume-controls.tsx`, `components/fins/fin-controls.tsx`
- **Verification:** `components/design/measure-field.test.ts` still asserts exactly one `Input`; `npm test` and `npx tsc --noEmit` both clean.
- **Committed in:** `74d2c6f` (Task 2 commit) and `848692c` (Task 3 commit, for the FINS wiring)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Necessary for correctness — an editable field under a value the template import is meant to lock would be a real bug, not scope creep. No other behavior changed.

## Issues Encountered

None. `npm test` (1974 passed, 2 skipped), `npx tsc --noEmit` (ignoring the known phantom `LayoutProps` worktree noise) and `npm run lint` (0 errors, pre-existing unrelated warnings only) were all clean at every task boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `MeasureField` is now the shared typed-entry component every remaining screen (ROCKER's datasheet cells in particular) will move to in Plan 03, which also retires `ImperialField`.
- All three Board Length controls (TEMPLATE, FINS, VOLUME) are fully converted; the Template Builder's ledger entry is `converted: true`.
- `volume-controls.tsx` and `fin-controls.tsx` remain `converted: false` in the ledger — each still has unconverted sliders (Board Width/Center Thickness on VOLUME belong to Plan 07; the fin-placement sliders belong to Plan 06).
- No blockers. `npm run build` was not run in this worktree per the project's known Turbopack-in-worktree limitation — the orchestrator runs the real build on the main checkout after merge.

---
*Phase: 06-the-design-screens-in-metric*
*Completed: 2026-09-05*
