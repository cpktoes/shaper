/**
 * The XYZ text set (Phase 16, D-14, D-26; research §C, "Conservative choice"): the board's curves as plain
 * text a shaper hands to Shape3D as guidelines. One point per line, `x y z`, single spaces, millimetres to
 * three decimals with a `.` for the decimal point, Windows (CRLF) line ends, no header line. A file holding
 * more than one curve — the profile's deck and bottom, a swallow's slice inside the notch — has its curves
 * one after another with one blank line between.
 *
 * The numbers are the surface's own millimetres in Shape3D's axes; nothing here converts them.
 *
 * `readXyz` is this writer's own reader, for the tests.
 *
 * Pure: no React, browser or database import.
 */
import type { Vec3 } from "../geometry/board-surface";

/** The text files' line end. */
export const CRLF = "\r\n";

/** A millimetre figure as the files write it: three decimals, a `.`, and never `-0.000`. */
export function formatMm(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`Not a finite number: ${value}`);
  const text = value.toFixed(3);
  return /^-0\.0+$/.test(text) ? text.slice(1) : text;
}

/** Curves as XYZ text: each point `x y z` on its own line, the curves separated by one blank line. */
export function writeXyz(loops: readonly (readonly Vec3[])[]): string {
  return loops
    .map((loop) => loop.map((p) => `${formatMm(p[0])} ${formatMm(p[1])} ${formatMm(p[2])}${CRLF}`).join(""))
    .join(CRLF);
}

/** XYZ text read back into its curves (a blank line ends one curve). Throws on a line that is not `x y z`. */
export function readXyz(text: string): Vec3[][] {
  const loops: Vec3[][] = [];
  let current: Vec3[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") {
      if (current.length > 0) loops.push(current);
      current = [];
      continue;
    }
    const parts = line.trim().split(/\s+/).map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) throw new Error(`Not an x y z line: ${line}`);
    current.push([parts[0], parts[1], parts[2]]);
  }
  if (current.length > 0) loops.push(current);
  return loops;
}
