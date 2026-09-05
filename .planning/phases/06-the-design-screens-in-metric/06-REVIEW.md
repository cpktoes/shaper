---
phase: 06-the-design-screens-in-metric
reviewed: 2026-09-05T20:29:41Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - components/design/measure-field.test.ts
  - components/design/measure-field.tsx
  - components/design/slider-row.test.ts
  - components/fins/fin-controls.tsx
  - components/fins/fin-data-panel.tsx
  - components/fins/fin-placement-editor.tsx
  - components/fins/fin-viewer.tsx
  - components/fins/toe-aim-table-modal.tsx
  - components/outline/outline-controls.tsx
  - components/outline/outline-viewer.tsx
  - components/rails/rail-controls.tsx
  - components/rails/rail-data-table.tsx
  - components/rails/rail-section-plot.test.ts
  - components/rails/rail-section-plot.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/rocker-viewer.tsx
  - components/volume/volume-calculation-card.tsx
  - components/volume/volume-controls.tsx
  - components/volume/volume-estimator.tsx
  - lib/geometry/fins.test.ts
  - lib/geometry/fins.ts
  - lib/geometry/measure-display.test.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/units.test.ts
  - lib/geometry/units.ts
  - lib/units-isolation.test.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-09-05T20:29:41Z
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

The phase's core abstraction (`lib/geometry/measure-display.ts` / `units.ts`) is careful, well
tested, and its documented invariants (signed-epsilon rounding, inward slider-bound rounding,
never-write-on-flip) all check out against `units.test.ts` and `measure-display.test.ts`. The
`fins.ts` dim/mark family tagging is consistent and matches the tests in `fins.test.ts`.

However, tracing the one typed measurement control (`MeasureField`) all the way from its callers
into `commitTypedMeasure` surfaces a severe, easily-reproduced defect: **the Metric "Board Length"
typed field on the Template, Fins, and Volume screens commits a board length roughly 10x too
long, on every single successful parse — including simply focusing and blurring the field without
typing anything.** This is a scale-domain mismatch (millimetres vs. centimetres) between what
`measureSlider` hands back and what `commitTypedMeasure` expects for the `"length"` family in
Metric. No existing test exercises this integration path (the unit tests for `commitTypedMeasure`
hand-supply already-correct centimetre bounds, and `measure-field.test.ts` is a source-contract
test with no runtime assertions), so it ships silently. See CR-01.

Two smaller issues (WR-01, WR-02) and two cosmetic/dead-code notes (IN-01, IN-02) round out the
findings. Everything else traced cleanly: the dim/mark family classification, the ten-millimetre
rail-plot grid math, the `1e-9` nudge idiom at slider bounds, and the "never write on a units
flip" contract in `measureSlider` all hold up under inspection and match their tests.

## Critical Issues

### CR-01: Metric Board Length typed field commits a length ~10x too long (Template, Fins, Volume)

**File:** `components/outline/outline-controls.tsx:167-176`, `components/fins/fin-controls.tsx:347-357`, `components/volume/volume-controls.tsx:159-168`

**Issue:**

All three "Board Length" typed fields pass `measureSlider(...).min` / `.max` straight through as
`MeasureField`'s `min`/`max` props:

```tsx
// outline-controls.tsx (boardLength = measureSlider(outline.length, BOARD_LENGTH_RANGE_IN, 1, 10, system))
<MeasureField
  value={outline.length}
  onCommit={(next) => onChange({ length: next })}
  label="Board Length"
  family="length"
  min={boardLength.min}
  max={boardLength.max}
  system={system}
/>
```

For `system: "metric"`, `measureSlider`'s `min`/`max` come from `metricSliderRange`, which is
**millimetre**-domain by construction and by its own tests (`units.test.ts`: `BOARD_LENGTH_RANGE_IN`
(60-120in) at a 10mm step → `{ min: 1530, max: 3040 }`, i.e. millimetres).

But `commitTypedMeasure`'s own doc comment and its unit tests are explicit that for the `"length"`
(and `"dim"`) family in Metric, `min`/`max` must be in **centimetres** — the field's own typed
unit (D-08) — not millimetres:

```ts
// measure-display.ts
* `min`/`max` are in the DISPLAY domain the parse will land in: ... centimetres for
* a `"dim"` or `"length"` family field in Metric (the field's own unit is cm, D-08).
...
const clampedCm = clampFinite(mmToCentimetres(parsed), min, max);
const snapped = roundToWholeMm(centimetresToMm(clampedCm));
```

Because `boardLength.min`/`max` are still millimetre-scale numbers (e.g. `1530`/`3040` for the
Template/Volume screens, `1220`/`3650` for Fins) being compared against a **centimetre**-scale
parsed value (`mmToCentimetres(parsed)`, e.g. `188` for a 1880mm board), `clampFinite` almost
always clamps the result *up* to `min` — because every realistic centimetre value (121-365ish) is
smaller than the millimetre-scale `min` (1220-1530) being used as if it were centimetres.

**Concretely:** a shaper on the Template screen in Metric who types `188` (meaning 188cm) into the
Board Length field gets `clampFinite(188, 1530, 3040) → 1530`, then `centimetresToMm(1530) =
15300`. The stored board length silently becomes **15300mm (15.3 metres)** instead of 1880mm — and
`result.error` is `null`, so no validation message is ever shown.

**Worse: this doesn't require typing anything.** `MeasureField` commits unconditionally on blur
(`onBlur={() => { commit(raw); setFocused(false); }}`), and `onFocus` seeds `raw` with the current
formatted display (`"188.0 cm"`). Simply clicking into the Metric Board Length field on the
Template, Fins, or Volume screen and clicking away corrupts the stored board length to the
(wrongly-scaled) minimum every time, with no error surfaced. This reproduces identically on all
three screens (Template: `1530mm`, Volume: `1530mm`, Fins: `1220mm`, per each screen's own
`measureSlider` range).

No existing test catches this: `measure-display.test.ts`'s `commitTypedMeasure` tests for the
`"length"` family hand-supply already-correct centimetre bounds (`min: 153, max: 304`) rather than
deriving them from `measureSlider`, and `measure-field.test.ts` is a source-contract (regex) test
with no runtime assertions.

**Fix:** convert the slider's millimetre bounds to centimetres before handing them to
`MeasureField` for the `"length"`/`"dim"` family in Metric, e.g.:

```tsx
const boardLength = measureSlider(outline.length, BOARD_LENGTH_RANGE_IN, 1, 10, system);
const boardLengthFieldBounds =
  system === "metric"
    ? { min: mmToCentimetres(boardLength.min), max: mmToCentimetres(boardLength.max) }
    : { min: boardLength.min, max: boardLength.max };
// ...
<MeasureField
  ...
  min={boardLengthFieldBounds.min}
  max={boardLengthFieldBounds.max}
/>
```

Apply the same fix in `fin-controls.tsx` and `volume-controls.tsx`. (The Imperial branch is
unaffected — `measureSlider`'s imperial bounds are already inches, which is what
`commitTypedMeasure`'s imperial branch expects, so `boardLength.min`/`max` can stay as-is there.)

## Warnings

### WR-01: Fin Base Length "Override" number input shows an un-snapped value in Metric

**File:** `components/fins/fin-controls.tsx:125-181` (`BaseLengthField`), instantiated at lines 524-539, 561-576, 623-638

**Issue:** `BaseLengthField`'s raw `<input type="number">` (used for the Center/Forward/Rear "Fin
Base Length" override, and the "Rear Off-Tail Position" override at lines 645-659) reads
`displayValue = system === "metric" ? value : mmToInches(value)`. In Metric, `value` is the raw
stored `Mm` number — e.g. the default `baseLenForward` is `inchesToMm(4.5) = 114.3`, not a whole
millimetre. Pressing "Override" without ever dragging the slider or typing shows `114.3` in a
number input whose `step` is `1`, which is inconsistent with:
  - `roundToWholeMm`'s own documented invariant ("the stored value and the label always agree
    without either one silently drifting a fraction of a millimetre from the other"),
  - the read-only display shown before clicking "Override", which uses `formatMark(value, system)`
    and would round the same value to `"114 mm"`.

Every subsequent keystroke does immediately snap (via `toMm`'s `roundToWholeMm`), so this is only
visible for the brief window between clicking "Override" and the first edit, but it does mean a
shaper who clicks Override and immediately clicks away without changing anything leaves the
underlying spec value at a non-integer millimetre count while every other Metric numeric control in
the app guarantees whole millimetres.

**Fix:** seed the override input's initial value through the same snap used everywhere else, e.g.
`displayValue = system === "metric" ? mmToInches ? ... : Math.round(value) : mmToInches(value)`, or
simply call `toMm(value)`-equivalent (`roundToWholeMm`) when first entering edit mode so the
displayed number always starts on the metric grid.

### WR-02: Volume screen's Board Length feet options include a value below the enforced range

**File:** `components/volume/volume-controls.tsx:23, 62`

**Issue:** `FEET_OPTIONS = [4, 5, 6, 7, 8, 9, 10]` offers "4'" as a selectable feet value, but
`BOARD_LENGTH_RANGE_IN` (imported from `lib/geometry/board.ts`) is `{ min: 60, max: 120 }` — i.e.
5' minimum. `setLengthIn` clamps any total below 60in up to 60in via `clampFinite`, so selecting
"4'" (with any inches value < 12) silently snaps the stored length to 5'0" on the very next
render, and the Select immediately re-derives `lengthFeet` back to `5` — the "4'" option is
offered but can never actually be set. `outline-controls.tsx`'s own `FEET_OPTIONS` (`[5,6,7,8,9,10]`)
and `fin-controls.tsx`'s (`[4..12]`, matching its own `{min:48,max:144}` spec) don't have this
mismatch — only Volume's list is inconsistent with the range it actually clamps against.

**Fix:** either drop `4` from `FEET_OPTIONS` (matching `outline-controls.tsx`'s list) or use a
`BOARD_LENGTH_RANGE_IN`-derived feet list so the two can never drift apart again.

## Info

### IN-01: `formatSignedDim`'s "-0.0" branch is unreachable dead code

**File:** `lib/geometry/units.ts:298-301` (`formatSignedInchesFraction` has the imperial
counterpart at lines 298-300); metric branch in `lib/geometry/measure-display.ts:97-104`

**Issue:** `formatSignedDim`'s metric branch checks `if (printed === "0.0" || printed ===
"-0.0") return "0 cm";`. `formatCentimetres`'s internal `Math.round` can produce a `-0` numeric
result, but `(-0).toFixed(1)` evaluates to `"0.0"` in JavaScript (per the ECMAScript spec,
`toFixed` only prepends `-` when the value is strictly less than zero, and `-0 < 0` is `false`), so
`formatCentimetres` can never actually return the literal string `"-0.0"`. The `"-0.0"` arm is
therefore dead code — harmless (the `"0.0"` arm alone already covers every case reaching this
check, confirmed by `measure-display.test.ts`'s own `mm(-0.04)` case), but worth removing so a
future reader doesn't assume it's load-bearing.

**Fix:** drop the `|| printed === "-0.0"` disjunct, or add a short comment noting it is
defensive/unreachable.

### IN-02: Redundant always-truthy `toeDisplay` guard in `dimsForMark`

**File:** `components/fins/fin-viewer.tsx:269, 290, 315`

**Issue:** Three branches guard on `mark.lateralKind === "..." && mark.side === ... && toeDisplay`.
`toeDisplay` is `formatMark(mark.toe, system)`, which always returns a non-empty string (even for a
zero toe, e.g. `'0"'` or `"0 mm"`), so the `&& toeDisplay` clause can never be falsy and is
effectively dead weight left over from before formatting was routed through the display boundary
(when the pre-formatted value might plausibly have been an empty string).

**Fix:** drop the `&& toeDisplay` conjunct from all three conditions, or replace it with an
explicit intent-revealing check if a future toe-zero suppression is actually wanted.

---

_Reviewed: 2026-09-05T20:29:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
