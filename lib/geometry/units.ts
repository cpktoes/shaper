/**
 * Units boundary.
 *
 * Millimetres are the only unit the geometry math (lib/geometry/board.ts,
 * lib/geometry/outline.ts, and everything built on top of them) ever sees.
 * Inches, feet-and-inches, and litres exist solely at this boundary: control
 * values coming from the UI are converted to millimetres here before they
 * enter design state, and millimetre values are converted back to inches
 * only when rendering a label. No other module should perform an inch/mm
 * conversion — route it through this file instead.
 */

/** Millimetres — the internal unit for every length/width/depth in the design state. */
export type Mm = number & { readonly __brand: "Mm" };
/** Degrees — angles (nose angle, tail angle, rocker angles, etc). */
export type Degrees = number & { readonly __brand: "Degrees" };
/** Litres — volume, computed from cubic millimetres. */
export type Litres = number & { readonly __brand: "Litres" };

export const mm = (value: number): Mm => value as Mm;
export const degrees = (value: number): Degrees => value as Degrees;
export const litres = (value: number): Litres => value as Litres;

export const MM_PER_INCH = 25.4;

export function mmToInches(value: Mm): number {
  return value / MM_PER_INCH;
}

export function inchesToMm(value: number): Mm {
  return mm(value * MM_PER_INCH);
}

export function cubicMmToLitres(volumeMm3: number): Litres {
  return litres(volumeMm3 / 1_000_000);
}

/**
 * The app's two measuring systems. Imperial is one variant of this type, not the app's
 * privileged default — every display site that reads a design value takes a `UnitsSystem`
 * argument rather than defaulting to inches with a metric branch bolted alongside (v1.1
 * kickoff: adopt "chosen units system" as the primary noun before ~300 Phase 6 call sites are
 * written against it, so none of them inherit an Imperial-favoring asymmetry).
 */
export type UnitsSystem = "imperial" | "metric";

/** Every registered system, in menu order. Iterate this — never name the two systems by hand —
 * so a future system addition (or a silently dropped branch) fails a test instead of falling
 * back to Imperial. See `lib/geometry/summary-line.test.ts`'s invariant test. */
export const UNITS_SYSTEMS: readonly UnitsSystem[] = ["imperial", "metric"];

export const MM_PER_CM = 10;

export function mmToCentimetres(value: Mm): number {
  return value / MM_PER_CM;
}

export function centimetresToMm(value: number): Mm {
  return mm(value * MM_PER_CM);
}

/**
 * Formats a millimetre value as a bare centimetre number with exactly one decimal place —
 * `"188.0"`, never `"188"` and never with a unit suffix. A tenth of a centimetre is one
 * millimetre, which is what a metric tape measure actually reads, and the trailing zero is
 * kept deliberately (D-01): the unit itself is composed once, at the end of a whole dims line,
 * by the caller (`lib/geometry/summary-line.ts`), not by this function.
 *
 * Applies the same signed epsilon nudge (`1e-9`, negated for negative values) that
 * `formatInchesFraction` documents, before `toFixed(1)`: a value that round-tripped through
 * inches (or picked up float noise any other way) can land a few ULPs on the wrong side of a
 * tenths-of-a-centimetre rounding boundary, and the nudge pushes it back onto the correct side
 * without changing any genuinely different value's rounding.
 */
export function formatCentimetres(value: Mm): string {
  const cm = mmToCentimetres(value);
  const nudge = cm < 0 ? -1e-9 : 1e-9;
  const rounded = Math.round((cm + nudge) * 10) / 10;
  return rounded.toFixed(1);
}

/**
 * Formats a millimetre value as a bare whole-millimetre number — `"67"`, never `"67.0"` and never
 * with a unit suffix. This is D-02's **marks** family: rail band marks, rocker heights and the
 * five foil station thicknesses — the numbers a shaper measures with a rule against the board
 * rather than reads off as a size. `formatCentimetres` is the **dims** family (a board's length,
 * widths and headline thickness, the numbers a shaper quotes as a size); which family a value
 * belongs to is decided by what the number *is*, not by which screen it appears on — a foil's
 * centre thickness reads `6.7` on a card's dimensions line and `67` in the ROCKER datasheet
 * column, and both are correct for what they show.
 *
 * Applies the same signed epsilon nudge (`1e-9`, negated for negative values) that
 * `formatInchesFraction` and `formatCentimetres` document, before rounding: a value that
 * round-tripped through inches (or picked up float noise any other way) can land a few ULPs on
 * the wrong side of a whole-millimetre boundary, and the nudge pushes it back onto the correct
 * side — and, just as importantly, keeps this formatter's tie-break in agreement with
 * `formatCentimetres`'s, so the two never disagree about which way the same value rounds.
 */
export function formatWholeMm(value: Mm): string {
  const nudge = value < 0 ? -1e-9 : 1e-9;
  const rounded = Math.round(value + nudge);
  return String(rounded);
}

/**
 * Snaps a millimetre value to the nearest whole millimetre — the metric counterpart of
 * `roundToSixteenthInch`. A snap on the model, not a display nicety: this is what Phase 6's
 * sliders step by when reading in Metric, so the stored value and the label always agree without
 * either one silently drifting a fraction of a millimetre from the other. Uses the same signed
 * epsilon nudge as `formatWholeMm`, so `formatWholeMm(roundToWholeMm(v))` always equals
 * `formatWholeMm(v)` — snapping first never changes what a shaper reads.
 */
export function roundToWholeMm(value: Mm): Mm {
  const nudge = value < 0 ? -1e-9 : 1e-9;
  return mm(Math.round(value + nudge));
}

/**
 * Parses a free-form metric length string into millimetres (D-04). A bare number is read as
 * `fieldUnit` — a centimetre field reads `"51.4"` as 51.4cm, a millimetre field reads `"67"` as
 * 67mm — and an explicit `cm` or `mm` suffix (either case, with or without a preceding space)
 * overrides the field's own unit, so `"514 mm"` typed into a centimetre field still works.
 *
 * Returns `null` — never throws — for empty or whitespace-only input, for a suffix with no
 * number, and for anything that does not match cleanly: a comma decimal separator (`"51,4"`) and
 * an imperial fraction (`"5 1/2"`) are both rejected rather than guessed at, because guessing
 * either would silently produce a wrong number a shaper might cut to (T-05-15). This mirrors
 * `parseImperial`'s return-null-never-throw contract exactly, because the typed field's commit
 * path reverts to the last good value on `null`.
 */
export function parseMetric(input: string, fieldUnit: "cm" | "mm"): Mm | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(cm|mm)?$/i);
  if (!match) return null;

  const [, numStr, unitSuffix] = match;
  const value = parseFloat(numStr);
  const unit = unitSuffix ? (unitSuffix.toLowerCase() as "cm" | "mm") : fieldUnit;
  return unit === "cm" ? centimetresToMm(value) : mm(value);
}

/**
 * Converts a design area from square millimetres to square inches — the only other place besides
 * `mmToInches` that turns `MM_PER_INCH` into a real device number, so the Overview Sheet's printed
 * "Template Area" can never drift from the same `area` field `lib/geometry/outline.ts` computes
 * for everything else (CLAUDE.md Rule 2: never reach for 25.4 anywhere else).
 */
export function squareMmToSquareInches(areaMm2: number): number {
  return areaMm2 / (MM_PER_INCH * MM_PER_INCH);
}

/**
 * Formats a millimetre value as an imperial fraction string, e.g. `18 1/2"`.
 * Ported from the prototype's `toFrac` (reference/project/Template.dc.html
 * lines 309-320): round to the nearest 1/denominator, split whole and
 * fractional parts, carry when the fraction rounds up to a full inch, and
 * reduce the fraction by repeatedly halving numerator and denominator.
 */
export function formatInchesFraction(
  value: Mm,
  denominator: 8 | 16 | 32 = 16,
): string {
  const inches = mmToInches(value);
  const sign = inches < 0 ? "-" : "";
  // Nudge away from zero by a tiny epsilon before rounding: a value that started life as an
  // exact N.5 sixteenth (e.g. an inch measurement round-tripped once through Mm) can land a few
  // floating-point ULPs on the wrong side of that boundary purely from the unit conversion, which
  // would otherwise flip Math.round's tie-break to the wrong sixteenth. 1e-9 is far larger than
  // that round-trip noise and far smaller than half of the coarsest supported denominator's unit
  // (1/16 at denominator=8), so it never changes a genuinely different value's rounding.
  const nudge = inches < 0 ? -1e-9 : 1e-9;
  const rounded = Math.abs(Math.round(inches * denominator + nudge) / denominator);
  let whole = Math.floor(rounded + 1e-9);
  let fracUnits = Math.round((rounded - whole) * denominator);
  if (fracUnits === denominator) {
    whole += 1;
    fracUnits = 0;
  }
  if (fracUnits === 0) {
    return `${sign}${whole}"`;
  }
  let num = fracUnits;
  let den = denominator;
  while (num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return `${sign}${whole > 0 ? whole + " " : ""}${num}/${den}"`;
}

/**
 * Formats a millimetre value as a signed inch fraction — `+2 1/4"`, `-1 1/2"`, `0"`.
 *
 * For measurements taken *from* a datum rather than *of* something, where the direction is half
 * the meaning: the widepoint offset is the only one today (positive toward the nose, negative
 * toward the tail), read on both the outline editor's Offset slider and the order form's
 * dimensions row. `formatInchesFraction` alone cannot express it — it prints a leading `-` but
 * never a leading `+`, so a nose-side offset and a measurement of the same size look identical.
 *
 * Zero prints unsigned: a widepoint dead on centre has no direction to report.
 */
export function formatSignedInchesFraction(
  value: Mm,
  denominator: 8 | 16 | 32 = 16,
): string {
  // The sign is decided by what was PRINTED, not by the raw value. `formatInchesFraction` takes
  // its own sign from the input before rounding, so a value a hair below zero comes back as
  // `-0"` — normalised to `0"` here rather than in that function, whose output is pinned by
  // golden tests across the rail/fin/volume screens.
  const formatted = formatInchesFraction(value, denominator);
  if (formatted === '-0"' || formatted === '0"') return '0"';
  return formatted.startsWith("-") ? formatted : `+${formatted}`;
}

/**
 * Snaps a millimetre value to the nearest 1/16 inch. Ported from the prototype's `round16`
 * (reference/project/Rails.dc.html line 652: `Math.round(x * 16) / 16`), applied here in the
 * inch domain then converted back to Mm. This is not a display nicety — it's the taper clamp
 * the rail-band calculator applies to Deck Profile's tapered rail thickness before that value
 * ever reaches a shaper's slider label, so it belongs on the model, not the formatter.
 */
export function roundToSixteenthInch(value: Mm): Mm {
  const inches = mmToInches(value);
  return inchesToMm(Math.round(inches * 16) / 16);
}

/**
 * Formats a millimetre value as feet-and-inches, e.g. `6'0"`. Rounds the
 * inch value to the nearest 1/16 FIRST, then splits feet/inches — this is
 * what prevents float drift from the millimetre round-trip (1828.8mm)
 * printing as `5'11 15/16"` instead of `6'0"`.
 */
export function formatFeetInches(value: Mm): string {
  const inches = mmToInches(value);
  const roundedInches = Math.round(inches * 16) / 16;
  const feet = Math.floor((roundedInches + 1e-9) / 12);
  const remainderInches = roundedInches - feet * 12;
  return `${feet}'${formatInchesFraction(inchesToMm(remainderInches))}`;
}

/**
 * Parses a free-form imperial length string into millimetres. Accepts an
 * optional feet part (`6'`), an optional whole-inch or decimal part
 * (`19`, `18.5`), an optional space-separated fraction (`1/2`), and an
 * optional trailing double-quote. Returns null for empty/whitespace-only
 * or unparseable input.
 */
export function parseImperial(input: string): Mm | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  let rest = trimmed;
  let feet = 0;
  let hasFeet = false;

  const feetMatch = rest.match(/^(-?\d+(?:\.\d+)?)\s*'/);
  if (feetMatch) {
    feet = parseFloat(feetMatch[1]);
    hasFeet = true;
    rest = rest.slice(feetMatch[0].length).trim();
  }

  if (rest.endsWith('"')) {
    rest = rest.slice(0, -1).trim();
  }

  let inchesValue = 0;
  let hasInches = false;

  if (rest.length > 0) {
    const match = rest.match(
      /^(-?\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$/,
    );
    if (!match) return null;
    const [, wholeStr, numStr, denStr] = match;
    if (wholeStr === undefined && numStr === undefined) {
      return null;
    }
    const whole = wholeStr !== undefined ? parseFloat(wholeStr) : 0;
    const isNegative = whole < 0 || wholeStr?.startsWith("-") === true;
    let frac = 0;
    if (numStr !== undefined && denStr !== undefined) {
      const den = parseInt(denStr, 10);
      if (den === 0) return null;
      frac = parseInt(numStr, 10) / den;
    }
    inchesValue = isNegative ? whole - frac : whole + frac;
    hasInches = true;
  }

  if (!hasFeet && !hasInches) return null;

  const total = feet * 12 + inchesValue;
  return inchesToMm(total);
}
