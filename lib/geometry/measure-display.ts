/**
 * The one place a design value becomes a string a shaper reads, and the one place a slider or a
 * typed field decides its per-system domain, bounds, step, clamp and snap.
 *
 * Every function here takes a `UnitsSystem` and picks its cm/mm family (D-01) by which formatter
 * the caller names — `formatDim` or `formatMark` — so the family classification is legible at
 * every call site instead of hidden inside a ternary. `formatDim` and `formatMark` are where D-09
 * lands: every standalone metric value carries its own unit, composed here as the bare formatter
 * output plus a normal space plus `cm` or `mm`, because cm and mm share a screen and a per-value
 * unit is the only way a number is never misread — the inch mark already does this on every
 * imperial value. The paired bare variants (`formatDimBare`/`formatMarkBare`) exist for D-10's
 * tables, whose column header already carries the unit.
 *
 * The imperial branch of every function below is today's call, unchanged. No design-screen
 * component may format a measurement itself — every one of them reads a design value through this
 * module instead (mechanically enforced by `lib/units-isolation.test.ts`'s conversion ledger).
 *
 * Pure — no React, browser API or database imports (CLAUDE.md Rule 1) — so the composition itself
 * can be verified in isolation, exactly like every other module under `lib/geometry/`.
 */

import { MEASURE_STATION_MM } from "./outline";
import {
  centimetresToMm,
  cubicInchesToCubicMm,
  cubicMmToCubicCentimetres,
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  formatSignedInchesFraction,
  formatWholeMm,
  inchesToMm,
  metricSliderRange,
  mm,
  mmToCentimetres,
  mmToInches,
  parseImperial,
  parseMetric,
  roundToSixteenthInch,
  roundToWholeMm,
  squareMmToSquareCentimetres,
  squareMmToSquareInches,
  type Mm,
  type MeasureFamily,
  type UnitsSystem,
} from "./units";

export type { MeasureFamily };

/** Clamps to `[min, max]`, treating a non-finite input as `min` — the sidebars' own `clampFinite`
 * helper, copied here once so `measureSlider` reproduces it byte-identically in both systems. */
function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * A standalone dims-family value with its own unit, per D-09: imperial `20 1/4"`, metric
 * `51.4 cm`. Use for a board's length, widths and headline thickness wherever the value stands
 * alone (a slider label, a callout, a chip).
 */
export function formatDim(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(value)} cm` : formatInchesFraction(value);
}

/**
 * The bare form of `formatDim`, for D-10's tables: the column header already carries the unit, so
 * the cell reads the number alone in Metric — `51.4`. Imperial is unchanged (the inch mark stays
 * on every imperial cell, D-10).
 */
export function formatDimBare(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? formatCentimetres(value) : formatInchesFraction(value);
}

/**
 * A standalone marks-family value with its own unit, per D-09: imperial `2 5/8"`, metric `67 mm`.
 * Use for rail band marks, rocker heights and the five foil station thicknesses — the small stuff
 * a shaper reads off with a rule against the board.
 */
export function formatMark(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatWholeMm(value)} mm` : formatInchesFraction(value);
}

/** The bare form of `formatMark`, for D-10's tables. Imperial is unchanged. */
export function formatMarkBare(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? formatWholeMm(value) : formatInchesFraction(value);
}

/**
 * A signed dims-family value — imperial `+2 1/4"` / `-1 1/2"` / `0"`, metric `+5.1 cm` /
 * `-2.5 cm` / `0 cm` — for a measurement taken from a datum, where the direction is half the
 * meaning (the widepoint offset). The metric branch takes its sign from what was PRINTED, exactly
 * as `formatSignedInchesFraction` does: format the centimetres first, print an unsigned `0 cm`
 * when that comes back `0.0` or `-0.0`, otherwise prefix an ASCII `+` when there is no leading
 * `-`. Never a typographic minus.
 */
export function formatSignedDim(value: Mm, system: UnitsSystem): string {
  if (system === "metric") {
    const printed = formatCentimetres(value);
    if (printed === "0.0" || printed === "-0.0") return "0 cm";
    return printed.startsWith("-") ? `${printed} cm` : `+${printed} cm`;
  }
  return formatSignedInchesFraction(value);
}

/**
 * A board's total length: imperial `formatFeetInches` (`6'2"`), metric `formatCentimetres` plus
 * `cm` (`188.0 cm`). There is no metric equivalent of the feet-and-inches / total-inches dual
 * form the outline viewer's length callout shows in Imperial — that composition stays local to
 * the caller.
 */
export function formatLength(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(value)} cm` : formatFeetInches(value);
}

/**
 * The volume card's area line (D-04): imperial the existing one-decimal square-inch figure,
 * metric a whole square-centimetre figure with its own unit — `7964 cm²`. A square-centimetre
 * value in the thousands has no meaningful tenths a shaper would cut to, so a whole number is the
 * honest precision here — the same reasoning `formatCubicVolume` below applies to the supporting
 * line under the litres. Neither branch wraps its output in parentheses or appends an
 * "(imported)" suffix — the card composes both, exactly as it does today.
 */
export function formatArea(areaMm2: number, system: UnitsSystem): string {
  if (system === "metric") {
    const cm2 = squareMmToSquareCentimetres(areaMm2);
    const nudge = cm2 < 0 ? -1e-9 : 1e-9;
    return `${Math.round(cm2 + nudge)} cm²`;
  }
  return `${squareMmToSquareInches(areaMm2).toFixed(1)} sq in`;
}

/**
 * The volume card's cubic supporting line (D-04): imperial the existing one-decimal cubic-inch
 * figure, metric a whole cubic-centimetre figure — `34020 cm³`, converted through
 * `cubicInchesToCubicMm` then `cubicMmToCubicCentimetres` so neither factor is restated here. A
 * cubic-centimetre value at this scale has no meaningful tenths a shaper would cut to, the same
 * reasoning `formatArea` above applies to its own line. Neither branch wraps its output in
 * parentheses — the card composes those, exactly as it does today.
 */
export function formatCubicVolume(volumeCubicInches: number, system: UnitsSystem): string {
  if (system === "metric") {
    const cm3 = cubicMmToCubicCentimetres(cubicInchesToCubicMm(volumeCubicInches));
    const nudge = cm3 < 0 ? -1e-9 : 1e-9;
    return `${Math.round(cm3 + nudge)} cm³`;
  }
  return `${volumeCubicInches.toFixed(1)} cu in`;
}

/**
 * The station label every `12"` in the UI becomes (D-03): imperial the literal `12"`, metric the
 * honest conversion off `MEASURE_STATION_MM` — `30.5 cm`, never a hand-typed `30 cm`. The station
 * itself never moves; only its label reads the truth of where it is.
 */
export function stationLabel(system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(MEASURE_STATION_MM)} cm` : `12"`;
}

/**
 * The unit suffix a table header appends to itself in Metric (D-10) — imperial the empty string
 * (today's headers carry no unit), metric ` (cm)` for a dims-family column or ` (mm)` for a
 * marks-family one, each with its own leading space so a caller appends it straight onto the
 * header text (`` `Deck${columnUnitSuffix("mark", system)}` `` -> `Deck (mm)`).
 */
export function columnUnitSuffix(family: MeasureFamily, system: UnitsSystem): string {
  if (system === "imperial") return "";
  return family === "dim" ? " (cm)" : " (mm)";
}

/** `measureSlider`'s return shape: a slider's display-domain value/min/max/step, plus the one
 * function that turns a drag back into a millimetre value. */
export interface MeasureSliderView {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Clamps a dragged display-domain number into this view's own bounds and snaps it onto the
   * system's grid (nearest 1/16" imperial, nearest whole mm metric), returning the stored `Mm`.
   * Only called on an actual drag — nothing upstream of a drag ever calls this, which is what
   * keeps a system flip from snapping or clamping a value the shaper never touched (D-07). */
  toMm: (dragged: number) => Mm;
}

/**
 * The one place a slider's per-system domain, bounds, step, clamp and snap are decided (D-05,
 * D-06, D-07). `rangeIn`/`stepIn` are the slider's existing inch-domain range and step, unchanged
 * from today; `stepMm` is the metric step this same slider takes (1mm for nearly everything, 10mm
 * for board length, D-05).
 *
 * Imperial reproduces exactly what every call site does today: the display value is
 * `mmToInches(value)`, the bounds are `rangeIn` verbatim, and `toMm` clamps a dragged inch number
 * into `rangeIn` (non-finite input becomes the minimum, the sidebars' own `clampFinite`) before
 * converting to millimetres.
 *
 * Metric derives its bounds from `metricSliderRange(rangeIn, stepMm)`. The display value is the
 * stored millimetre value clamped into those bounds — a board set to 1524mm (60in) against a
 * 1530mm metric floor shows its thumb pinned at the floor, but nothing is written: `toMm` only
 * fires on an actual drag, so the flip itself never touches the store. A drag's millimetre number
 * is clamped into the metric bounds and snapped with `roundToWholeMm`, so the stored value and its
 * label can never disagree.
 */
export function measureSlider(
  value: Mm,
  rangeIn: { min: number; max: number },
  stepIn: number,
  stepMm: number,
  system: UnitsSystem,
): MeasureSliderView {
  if (system === "metric") {
    const range = metricSliderRange(rangeIn, stepMm);
    return {
      value: clampFinite(value, range.min, range.max),
      min: range.min,
      max: range.max,
      step: range.step,
      toMm: (dragged: number) => roundToWholeMm(mm(clampFinite(dragged, range.min, range.max))),
    };
  }
  return {
    value: mmToInches(value),
    min: rangeIn.min,
    max: rangeIn.max,
    step: stepIn,
    toMm: (dragged: number) =>
      inchesToMm(clampFinite(dragged, rangeIn.min, rangeIn.max)),
  };
}

/** The exact copy `ImperialField` already shows on an unreadable typed value — byte-identical,
 * never touched by this phase. */
function imperialErrorLine(typed: string): string {
  return `Couldn't read '${typed}' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2.`;
}

/** The UI-SPEC Copywriting Contract's exact wording for an unreadable millimetre-domain typed
 * value (every mm-family field: the ROCKER datasheet cells, RAILS per-section thickness/Corner
 * Cut/Bottom Tuck 3, FINS base-length override, toe-in, off-rail). */
function millimetreErrorLine(typed: string): string {
  return `Couldn't read '${typed}' as millimetres — try a whole number like 67, or centimetres like 6.7 cm.`;
}

/** The UI-SPEC Copywriting Contract's exact wording for an unreadable centimetre-domain typed
 * value (D-08's Board Length field, the only standalone cm field). */
function centimetreErrorLine(typed: string): string {
  return `Couldn't read '${typed}' as centimetres — try a decimal like 188.0, or millimetres like 1880 mm.`;
}

export interface TypedMeasureCommit {
  /** The value to store: the snapped, clamped parse on success, or `current` unchanged on an
   * unreadable typed string. */
  value: Mm;
  /** What the field should show once this commit lands. */
  display: string;
  /** The Copywriting Contract's exact error line, or `null` on a successful commit. */
  error: string | null;
}

/**
 * The one commit pipeline every typed measurement field runs on blur/Enter — the metric
 * counterpart of `ImperialField`'s `commit`, and the seam `MeasureField` (Plan 02) calls into.
 *
 * `min`/`max` are in the DISPLAY domain the parse will land in: inches for `system: "imperial"`;
 * millimetres for a `"mark"` family field in Metric (the field's own unit is mm); centimetres for
 * a `"dim"` or `"length"` family field in Metric (the field's own unit is cm, D-08).
 *
 * On an unreadable typed string the parser (`parseImperial` imperial, `parseMetric` metric)
 * returns `null` and this returns `current` unchanged, `current`'s own re-formatted display, and
 * the family/system-appropriate error line — the field is never left blank and never holds an
 * unreadable value (T-06-01). On a readable one, the parsed value is clamped into `min`/`max` in
 * the display domain, snapped onto the system's grid (`roundToSixteenthInch` imperial,
 * `roundToWholeMm` metric) and returned with `error: null`. `display` uses the bare formatter
 * when `bare` is true (the ROCKER datasheet's in-table cells, D-12) and the unit-suffixed one
 * otherwise; family `"length"` always uses `formatLength`.
 */
export function commitTypedMeasure(args: {
  typed: string;
  current: Mm;
  family: MeasureFamily | "length";
  min: number;
  max: number;
  system: UnitsSystem;
  bare: boolean;
}): TypedMeasureCommit {
  const { typed, current, family, min, max, system, bare } = args;

  const display = (value: Mm): string => {
    if (family === "length") return formatLength(value, system);
    if (family === "dim") return bare ? formatDimBare(value, system) : formatDim(value, system);
    return bare ? formatMarkBare(value, system) : formatMark(value, system);
  };

  if (system === "imperial") {
    const parsed = parseImperial(typed);
    if (parsed === null) {
      return { value: current, display: display(current), error: imperialErrorLine(typed) };
    }
    const clampedIn = clampFinite(mmToInches(parsed), min, max);
    const snapped = roundToSixteenthInch(inchesToMm(clampedIn));
    return { value: snapped, display: display(snapped), error: null };
  }

  // Metric: a "mark"-family field reads and clamps in millimetres; "dim"/"length" read and
  // clamp in centimetres (D-08's typed field is always standalone cm).
  const fieldUnit: "cm" | "mm" = family === "mark" ? "mm" : "cm";
  const parsed = parseMetric(typed, fieldUnit);
  if (parsed === null) {
    const errorLine = fieldUnit === "mm" ? millimetreErrorLine(typed) : centimetreErrorLine(typed);
    return { value: current, display: display(current), error: errorLine };
  }
  if (fieldUnit === "mm") {
    const clamped = mm(clampFinite(parsed, min, max));
    const snapped = roundToWholeMm(clamped);
    return { value: snapped, display: display(snapped), error: null };
  }
  const clampedCm = clampFinite(mmToCentimetres(parsed), min, max);
  const snapped = roundToWholeMm(centimetresToMm(clampedCm));
  return { value: snapped, display: display(snapped), error: null };
}
