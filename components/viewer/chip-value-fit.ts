/**
 * A long chip value drawn small enough to sit inside its chip (quick 261015-hz7, 2026-10-15, D8).
 *
 * Why: walking the first wings build, the founder's WING chip read `1/4" @ 30 9/16"`, which drew
 * 108.7 px wide inside a 104 px chip — any wing position with a fraction past about 30" overflowed,
 * on the close-up, the VIEWER and the phone alike. The chip itself stays exactly as wide as every
 * other chip and stays right-aligned to the gutter rail (sketch 004); only a value too long for it
 * is set a little smaller, so `WING 1 · 3/8" @ 11"` (sketch 014's own wording) reads as the founder
 * drew it. The worst cases — `15/16" @ 59 15/16"` and `25 mm @ 152.4 cm` — draw at about 10.4 px.
 *
 * The widths come from measurement, not a font file: each character's advance in em at the bold
 * 700 callout face (Inter), measured with `getComputedTextLength` in Chromium and WebKit, the larger
 * of the two engines kept and rounded up (F9). A lone space measures 0 there, so its 0.236 em is
 * (string − characters) ÷ spaces over four strings. Summed, the table lands within 0.15 px of every
 * measured string at 14 px — kerning is negligible in these strings. A character not in the table
 * counts as 1.02 em, wider than any measured one, so an unexpected glyph errs on the small side.
 *
 * Layout, not geometry (the callout primitives' own rule): pure, no React and no browser API, so it
 * can be checked in isolation; the board's numbers still come from `measure-display.ts`.
 */

import type { CalloutSizes } from "./callout-primitives";

/** Each character's advance at the bold callout face, in em (F9: Chromium and WebKit, the larger). */
export const CHIP_VALUE_EM: Readonly<Record<string, number>> = {
  "0": 0.675,
  "1": 0.433,
  "2": 0.631,
  "3": 0.647,
  "4": 0.677,
  "5": 0.623,
  "6": 0.651,
  "7": 0.582,
  "8": 0.652,
  "9": 0.651,
  " ": 0.236,
  "/": 0.389,
  '"': 0.553,
  "@": 1.017,
  ".": 0.335,
  c: 0.59,
  m: 0.913,
  // Quick 261015-my3 (2026-10-15, F2): the signs of a wing's OFFSET from its fin (`+1/4"`,
  // `-1/2"` — an ASCII hyphen, as `formatSignedMark` prints it), measured the same way in Chromium.
  "+": 0.658,
  "-": 0.446,
};

/** A character the table does not know, in em — wider than any it does. */
export const CHIP_VALUE_UNKNOWN_EM = 1.02;

/** Room kept clear inside each side of the chip, in screen pixels at the pinned 104 px chip. */
export const CHIP_VALUE_INSET_PX = 4;

/** The pinned chip width the inset is measured against (`CALLOUT_PX.chipW`, restated to stay pure). */
const PINNED_CHIP_PX = 104;

/** A value's estimated width in em at the bold callout face. */
export function chipValueEm(value: string): number {
  let em = 0;
  for (const ch of value) em += CHIP_VALUE_EM[ch] ?? CHIP_VALUE_UNKNOWN_EM;
  return em;
}

/**
 * The font size a chip's value draws at: the chip's own value size, unless the value's estimated
 * width passes the chip less 4 px a side (96/104 of its width), and then the size that just fits.
 * Scales with the sizes handed in — pinned or unpinned alike.
 */
export function chipValueFontSize(value: string, sizes: Pick<CalloutSizes, "value" | "chipW">): number {
  const em = chipValueEm(value);
  if (!(em > 0)) return sizes.value;
  const room = sizes.chipW * (1 - (2 * CHIP_VALUE_INSET_PX) / PINNED_CHIP_PX);
  return Math.min(sizes.value, room / em);
}

/**
 * The font size a value draws at to sit inside `roomPx` (quick 261015-my3, 2026-10-15, D4): `maxPx`,
 * unless its estimated width passes the room, and then the size that just fits. The WINGS close-up's
 * data cards fit each row's value (RUN, RADIUS, OFFSET) to the room its label leaves — the radius
 * can reach 64" on a 2"-run, 1/16"-deep wing (F3), so a long value is set smaller rather than run
 * out of its card. Any unit, as long as `maxPx` and `roomPx` share it.
 */
export function fitTextSize(value: string, maxPx: number, roomPx: number): number {
  const em = chipValueEm(value);
  if (!(em > 0) || !(roomPx > 0)) return maxPx;
  return Math.min(maxPx, roomPx / em);
}
