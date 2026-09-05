---
phase: 06-the-design-screens-in-metric
fixed_at: 2026-09-05T20:39:06Z
review_path: .planning/phases/06-the-design-screens-in-metric/06-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-09-05T20:39:06Z
**Source review:** .planning/phases/06-the-design-screens-in-metric/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 3
- Fixed: 2
- Skipped: 1

## Fixed Issues

### CR-01 / BL-01: Metric Board Length typed field commits a length ~10x too long (Template, Fins, Volume)

**Files modified:** `lib/geometry/measure-display.ts`, `lib/geometry/measure-display.test.ts`, `components/outline/outline-controls.tsx`, `components/fins/fin-controls.tsx`, `components/volume/volume-controls.tsx`
**Commit:** a5c6801
**Applied fix:** Added an exported `typedFieldBounds(view, family, system)` helper to
`lib/geometry/measure-display.ts` — the one place that bridges `measureSlider`'s slider-domain
bounds (always millimetres in Metric) to `commitTypedMeasure`'s field-domain bounds (centimetres
for `"dim"`/`"length"`, unchanged millimetres for `"mark"`, unchanged inches for Imperial). Cross-
referenced it from `commitTypedMeasure`'s own doc comment so the trap is documented at both ends.
Updated all three Board Length `MeasureField` call sites (Template, Fins, Volume) to run their
`measureSlider` result through `typedFieldBounds` before passing `min`/`max` to `MeasureField`,
instead of passing the raw millimetre-scale slider bounds straight through. The rocker datasheet's
two `mark`-family `MeasureField`s were left untouched, exactly as instructed — they were already
correct.

Added unit tests for `typedFieldBounds` across all three families and both systems (with
provenance comments deriving expected bounds from `measureSlider`, never hand-typed magic
numbers), plus an integration test suite that builds the view exactly as the real components do,
confirms typing `"188"` on a 1880mm board now stores 1880mm with `error: null`, confirms a
below-floor value clamps to 1530mm, confirms round-tripping the field's own blurred display string
reproduces the same stored value, and includes an explicit regression case proving the OLD wiring
(passing the raw millimetre view bounds) would have produced the broken 15300mm — so the trap
stays documented in the suite going forward.

Verification: `npx vitest run` (2006 passed, 2 pre-existing skips), `npx tsc --noEmit` (clean),
`npm run lint` (0 errors, only pre-existing unrelated warnings in `outline.test.ts` and the
`scripts/extract-prototype-*-golden.mjs` files), `npm run build` (succeeded) — all run in the main
checkout.

### WR-01: Fin Base Length "Override" number input shows an un-snapped value in Metric

**Files modified:** `components/fins/fin-controls.tsx`
**Commit:** fb58e19
**Applied fix:** `BaseLengthField`'s Metric display value now seeds through `roundToWholeMm`
(`value: system === "metric" ? roundToWholeMm(value) : mmToInches(value)`) so pressing "Override"
opens the number input already on the whole-millimetre grid, matching the read-only display's
`formatMark` rounding and every keystroke's own snap. The "Rear Off-Tail Position" override input
(fed by `quadRearOffTailSlider.value`, which `measureSlider` clamps but does not snap in Metric)
received the same treatment for its Metric branch only — Imperial is unchanged in both cases.

Verification: same full gate run as CR-01 above (all green).

## Skipped Issues

### WR-02: Volume screen's Board Length feet options include a value below the enforced range

**File:** `components/volume/volume-controls.tsx:23,62`
**Reason:** Per orchestrator's confirmed design, this is pre-existing Imperial behaviour —
`FEET_OPTIONS = [4, 5, 6, 7, 8, 9, 10]` already existed at this phase's base commit (`63dff034`),
predating Phase 6's Metric work. Phase 6's must_haves explicitly prohibit any change to Imperial
controls or strings ("No imperial string changes"), so fixing this belongs in its own follow-up
task rather than this fix pass.
**Original issue:** `FEET_OPTIONS` offers "4′" as a selectable feet value, but
`BOARD_LENGTH_RANGE_IN` (`{ min: 60, max: 120 }`) enforces a 5′ minimum — `setLengthIn` silently
clamps any selection of "4′" back up to 5′0″ on the next render, so the option is offered but can
never actually be set.

## Not Attempted (out of scope for `critical_warning`)

- **IN-01:** `formatSignedDim`'s unreachable `"-0.0"` dead-code branch (`lib/geometry/units.ts`,
  `lib/geometry/measure-display.ts`) — Info tier, out of `critical_warning` fix scope.
- **IN-02:** Redundant always-truthy `&& toeDisplay` guard in `dimsForMark`
  (`components/fins/fin-viewer.tsx:269,290,315`) — Info tier, out of `critical_warning` fix scope.

---

_Fixed: 2026-09-05T20:39:06Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
