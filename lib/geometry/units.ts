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
  const rounded = Math.abs(Math.round(inches * denominator) / denominator);
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
