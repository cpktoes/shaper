/**
 * A forgiving reader for a `.brd` board file from any program (quick 261113-d9b, the founder, 2026-11-13: "I think we
 * now need to try importing a .brd file into our app" — first as a look only, R1; the Open a board file… button takes
 * it, R2; only the outline, the rocker and the thickness are read, R3).
 *
 * `readBrdText` in `brd.ts` is a strict reader of this app's own writer and throws on any line it does not expect; this
 * one is for other programs' files. AkuShaper's differ from ours in the header (other fields, folder paths, numbers
 * like `3.08E-4`), in how a line ends (Windows or not), in the second flag of a knot, and in extra blocks of guide
 * points under a section. A file may be the scrambled one (the stamp, then the locked text) or the plain copy
 * AkuShaper leaves beside it, with no stamp.
 *
 * The file is anyone's, so it is read defensively: a size cap before anything is read, at most 50,000 lines and 200
 * knots a curve, every number finite and sensible, and the whole read guarded so a bad file is an answer, never a
 * throw into the page. Reading stops at the cross-sections, which are never read (R3). Of the header only the length,
 * the thickness and the width are kept, as numbers: every other field (names, folder paths) is dropped on the spot.
 *
 * Written from the format's facts only, never from another program's code. Pure: no React, browser or database
 * import (CLAUDE.md Rule 1). Lengths come out in millimetres, through `centimetresToMm`.
 */
import type { P2 } from "../geometry/bezier-fit";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { centimetresToMm, inchesToMm, mm, type Mm } from "../geometry/units";
import type { BrdReadKnot } from "./brd";
import { BRD_PREVIEW_CURVE_STEPS, sampleKnots } from "./brd-preview";
import { BRD_MAGIC, unscrambleBrd } from "./brd-scramble";

/** What Open a board file… adds to its file picker for a `.brd`; the shared `BOARD_FILE_ACCEPT` stays JSON only. */
export const BRD_FILE_ACCEPT = ".brd";

/** The most bytes a `.brd` may be before it is not read at all. */
export const BRD_READ_MAX_BYTES = 2 * 1024 * 1024;

/** The most lines read, and the most knots one curve may hold. */
export const BRD_READ_MAX_LINES = 50_000;
export const BRD_READ_MAX_KNOTS = 200;

/** A knot's numbers (centimetres) stay inside this: far beyond any board, short of anything that breaks a sum. */
const BRD_READ_MAX_CM = 10_000;

/** A curve must reach within this of both ends of the board (1 cm), or it is not a board's curve. */
const BRD_REACH_MM = 10;

/** Whether a picked file's name says it is a `.brd`. */
export function isBrdFileName(name: string): boolean {
  return /\.brd$/i.test(name);
}

/** A board read from a `.brd`: its length and size fields (where the file has them) and three curves in millimetres. */
export interface ReadBrdBoard {
  length: Mm;
  /** The file's own width and thickness fields, when it has them. */
  width: Mm | null;
  thickness: Mm | null;
  /** The outline's right half, tail to nose, as (distance from the tail, half-width): y is an absolute value. */
  outline: P2[];
  /** The bottom and the deck along the stringer, as (distance from the tail, height). */
  bottom: P2[];
  deck: P2[];
}

export type ReadAnyBrdResult =
  | { ok: true; board: ReadBrdBoard }
  | { ok: false; problem: "unreadable" }
  | { ok: false; problem: "out-of-range"; length: Mm };

const UNREADABLE = { ok: false, problem: "unreadable" } as const;

const KNOT = /^\(cp \[([^\]]*)\] (true|false) (true|false)\)$/;
const FIELD = /^([A-Za-z0-9]+) : (.*)$/;

/** One knot line, or null when the line is not a knot or holds a number that is not a sensible figure. */
function parseKnot(line: string): BrdReadKnot | null {
  const match = KNOT.exec(line);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length !== 6 || parts.some((part) => part === "")) return null;
  const v = parts.map(Number);
  if (v.some((n) => !Number.isFinite(n) || Math.abs(n) > BRD_READ_MAX_CM)) return null;
  return {
    point: [v[0], v[1]],
    before: [v[2], v[3]],
    after: [v[4], v[5]],
    smooth: match[2] === "true",
  };
}

/** The text of a plain (unstamped) file: each byte as one character, the way the scrambled file's text is made. */
function plainText(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return text;
}

const headerNumber = (value: string | undefined): number | null => {
  if (value === undefined) return null;
  const n = Number(value.trim());
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
};

const isStamped = (bytes: Uint8Array): boolean =>
  bytes.length >= BRD_MAGIC.length && [...BRD_MAGIC].every((ch, i) => bytes[i] === ch.charCodeAt(0));

/**
 * Reads any program's board file: the outline, bottom and deck. Never throws. `unreadable` is any file that is not a
 * board's text, is damaged, holds a figure that is not a figure, or whose curves do not run from the tail to the nose;
 * `out-of-range` is a readable board whose length this app cannot make (`BOARD_LENGTH_RANGE_IN`), with that length.
 */
export function readAnyBrd(bytes: Uint8Array): ReadAnyBrdResult {
  try {
    if (bytes.length === 0 || bytes.length > BRD_READ_MAX_BYTES) return UNREADABLE;
    const text = isStamped(bytes) ? unscrambleBrd(bytes) : plainText(bytes);
    // At most this many lines are read (a longer file is read as far as that and no further).
    const lines = text.split(/\r?\n/, BRD_READ_MAX_LINES);

    const header = new Map<string, number | null>();
    const curves = new Map<string, BrdReadKnot[]>();
    let open: BrdReadKnot[] | null = null;
    let sawCurve = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (open) {
        if (line === ")") {
          open = null;
          if (curves.size === 3) break;
          continue;
        }
        if (line === "") continue;
        const knot = parseKnot(line);
        if (!knot || open.length >= BRD_READ_MAX_KNOTS) return UNREADABLE;
        open.push(knot);
        continue;
      }
      const field = FIELD.exec(line);
      if (!field) continue;
      const [, key, value] = field;
      // The cross-sections are never read (R3): nothing after this matters.
      if (key === "p35" && value === "(") break;
      if ((key === "p32" || key === "p33" || key === "p34") && value === "(") {
        open = [];
        curves.set(key, open);
        sawCurve = true;
        continue;
      }
      // Only the three size fields are kept, and only as numbers; every other field's text is dropped here.
      if (!sawCurve && (key === "p01" || key === "p03" || key === "p04")) header.set(key, headerNumber(value));
    }

    const length = header.get("p01");
    if (length === null || length === undefined || !(length > 0)) return UNREADABLE;
    const knots = ["p32", "p33", "p34"].map((key) => curves.get(key));
    if (knots.some((k) => !k || k.length < 2)) return UNREADABLE;

    const lengthMm = centimetresToMm(length);
    if (
      lengthMm < inchesToMm(BOARD_LENGTH_RANGE_IN.min) - 1e-6 ||
      lengthMm > inchesToMm(BOARD_LENGTH_RANGE_IN.max) + 1e-6
    ) {
      return { ok: false, problem: "out-of-range", length: lengthMm };
    }

    const [outlineRaw, bottom, deck] = knots.map((k) => sampleKnots(k as BrdReadKnot[], BRD_PREVIEW_CURVE_STEPS));
    for (const line of [outlineRaw, bottom, deck]) {
      if (line.length < 2) return UNREADABLE;
      const stations = line.map(([x]) => x);
      if (stations.some((x) => !Number.isFinite(x))) return UNREADABLE;
      if (Math.min(...stations) > BRD_REACH_MM || Math.max(...stations) < lengthMm - BRD_REACH_MM) return UNREADABLE;
      if (line.some(([, y]) => !Number.isFinite(y))) return UNREADABLE;
    }
    const outline = outlineRaw.map(([x, y]): P2 => [x, Math.abs(y)]);

    const width = header.get("p04");
    const thickness = header.get("p03");
    return {
      ok: true,
      board: {
        length: mm(lengthMm),
        width: width !== null && width !== undefined && width > 0 ? centimetresToMm(width) : null,
        thickness: thickness !== null && thickness !== undefined && thickness > 0 ? centimetresToMm(thickness) : null,
        outline,
        bottom,
        deck,
      },
    };
  } catch {
    return UNREADABLE;
  }
}
