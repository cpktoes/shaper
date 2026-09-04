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
