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
 * throw into the page. The cross-sections are read forgivingly and bounded: at most `BRD_READ_MAX_SECTIONS` of them,
 * at most `BRD_READ_MAX_KNOTS` knots each; a section with a line that is not a knot, a bad figure or a station off the
 * board is dropped on its own and the rest of the file still reads; AkuShaper's `gps : (` guide-point blocks inside a
 * section are skipped. A file with no usable section reads with `sections: []`. Of the header only the length,
 * the thickness and the width are kept, as numbers, and — since quick 261113-qyz — the fin line (p50, nine figures) and
 * the fin system's word (p51): every other field (names, folder paths) is dropped on the spot. The fin line is read before
 * the first curve only (as the sizes are), as nine finite figures within `BRD_READ_MAX_CM` or not at all; `brdFinsFromLine`
 * (`lib/geometry/brd-fins.ts`) then holds its fins to the rules (on the board, front ahead of back). The word is kept only
 * as 1 to 32 plain characters with a letter in them, and only beside a fin that was kept: it is the one piece of the file's
 * header text that is ever shown.
 *
 * Written from the format's facts only, never from another program's code. Pure: no React, browser or database
 * import (CLAUDE.md Rule 1). Lengths come out in millimetres, through `centimetresToMm`.
 */
import type { P2 } from "../geometry/bezier-fit";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { brdFinsFromLine, noBrdFins, type BrdFileFins } from "../geometry/brd-fins";
import { centimetresToMm, inchesToMm, mm, type Mm } from "../geometry/units";
import type { BrdReadKnot } from "./brd";
import { BRD_PREVIEW_CURVE_STEPS, BRD_PREVIEW_SECTION_STEPS, sampleKnots } from "./brd-preview";
import { brdFinWord, parseBrdFinLine } from "./brd-fin-line";
import { BRD_MAGIC, unscrambleBrd } from "./brd-scramble";
import { BRD_FILE_ACCEPT, BRD_READ_MAX_BYTES, isBrdFileName } from "./brd-file-basics";

export { brdFinWord, parseBrdFinLine };

// The picker word, the size cap and the file-name test live in `brd-file-basics.ts` (the home page needs them before a file is
// picked and must not download this reader for them); they are re-exported here so everything else keeps importing them from here.
export { BRD_FILE_ACCEPT, BRD_READ_MAX_BYTES, isBrdFileName };

/** The most lines read, and the most knots one curve (or one cross-section) may hold. */
export const BRD_READ_MAX_LINES = 50_000;
export const BRD_READ_MAX_KNOTS = 200;

/** The most cross-sections kept (this app's own files write 20 to 35; AkuShaper's carry 4 to 7). */
export const BRD_READ_MAX_SECTIONS = 64;

/** A knot's numbers (centimetres) stay inside this: far beyond any board, short of anything that breaks a sum. */
const BRD_READ_MAX_CM = 10_000;

/** A curve must reach within this of both ends of the board (1 cm), or it is not a board's curve. */
const BRD_REACH_MM = 10;

/** A line that opens an AkuShaper guide-point block, and whether that block also closes on the same line (`gps : ( (gp [..]) )`). */
const opensGuideBlock = (line: string): boolean => line.startsWith("gps : (");
const guideBlockEndsOnSameLine = (line: string): boolean => line.length > "gps : (".length && line.endsWith(")");

/**
 * One cross-section of the file (quick 261113-gwr): a half section from the bottom at the stringer, out along the bottom,
 * round the rail to the deck at the stringer.
 */
export interface ReadBrdSection {
  /** Along the board from the tail. */
  station: Mm;
  /** The whole half section sampled (out from the stringer, up from the stringer's bottom), stringer bottom first. */
  points: P2[];
  /** The knots as read, in centimetres (the rails fit can sample from these again if it needs to). */
  knots: BrdReadKnot[];
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
  /** The cross-sections the file holds that could be used, tail to nose; `[]` when there are none. */
  sections: ReadBrdSection[];
  /** The fins the file's p50 holds that sit on the board, and its p51 word beside them (quick 261113-qyz). */
  fins: BrdFileFins;
}

export type ReadAnyBrdResult =
  | { ok: true; board: ReadBrdBoard }
  | { ok: false; problem: "unreadable" }
  | { ok: false; problem: "out-of-range"; length: Mm };

const UNREADABLE = { ok: false, problem: "unreadable" } as const;

const SECTION_HEAD = /^\(p36 (\S+)(?:\s|$)/;
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

// A size figure of the header is held to the same limit as a knot's (quick 261114-118, the go-live review's IN-01): one outside it is
// treated like one that is not a number at all, so a crafted file cannot make a size line print "Infinity". Absent length: the file
// is unreadable; absent width or thickness: the outline's own are used.
const headerNumber = (value: string | undefined): number | null => {
  if (value === undefined) return null;
  const n = Number(value.trim());
  return value.trim() !== "" && Number.isFinite(n) && Math.abs(n) <= BRD_READ_MAX_CM ? n : null;
};

const isStamped = (bytes: Uint8Array): boolean =>
  bytes.length >= BRD_MAGIC.length && [...BRD_MAGIC].every((ch, i) => bytes[i] === ch.charCodeAt(0));

/**
 * Reads any program's board file: the outline, bottom and deck, and its cross-sections where it has usable ones. Never throws. `unreadable` is any file that is not a
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
    const rawSections: { station: number; knots: BrdReadKnot[] }[] = [];
    let open: BrdReadKnot[] | null = null;
    let sawCurve = false;
    // The fin line and the fin system's word, raw, read before the first curve like the size fields (quick 261113-qyz).
    let finLine: string | null = null;
    let finWord: string | null = null;
    // The cross-section block (`p35`): `inSections` while it runs, `section` the one being read, `skipping` inside a
    // `gps : (` guide-point block (a lone `)` ends it). A damaged section is marked `bad` and dropped when it closes.
    let inSections = false;
    let sectionsDone = false;
    let skipping = false;
    let section: { station: number; knots: BrdReadKnot[]; bad: boolean } | null = null;
    const closeSection = () => {
      const done = section;
      section = null;
      if (!done || done.bad || done.knots.length < 2 || !Number.isFinite(done.station)) return;
      if (rawSections.length >= BRD_READ_MAX_SECTIONS) return;
      rawSections.push({ station: done.station, knots: done.knots });
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (inSections) {
        if (skipping) {
          if (line === ")") skipping = false;
          continue;
        }
        if (opensGuideBlock(line)) {
          // On one line (`gps : ( (gp [..]) )`) there is nothing more to skip, so the section's own `)` must still close it.
          skipping = !guideBlockEndsOnSameLine(line);
          continue;
        }
        if (line === ")") {
          if (section) closeSection();
          else {
            inSections = false;
            sectionsDone = true;
          }
          continue;
        }
        if (rawSections.length >= BRD_READ_MAX_SECTIONS) continue;
        const head = SECTION_HEAD.exec(line);
        if (head) {
          // A section that opens inside another one drops the first.
          if (section) section.bad = true;
          section = { station: Number(head[1]), knots: [], bad: false };
          if (!Number.isFinite(section.station) || Math.abs(section.station) > BRD_READ_MAX_CM) section.bad = true;
          continue;
        }
        if (!section || line === "") continue;
        const knot = parseKnot(line);
        if (!knot || section.knots.length >= BRD_READ_MAX_KNOTS) section.bad = true;
        else section.knots.push(knot);
        continue;
      }
      if (open) {
        // AkuShaper may put a `gps : (` guide-point block inside the outline, bottom or deck too (a board drawn over
        // guide points): it is skipped like the ones inside a cross-section, and the curve's own `)` still closes it.
        if (skipping) {
          if (line === ")") skipping = false;
          continue;
        }
        if (opensGuideBlock(line)) {
          skipping = !guideBlockEndsOnSameLine(line);
          continue;
        }
        if (line === ")") {
          open = null;
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
      if (key === "p35" && value === "(" && !sectionsDone && curves.size === 3) {
        inSections = true;
        continue;
      }
      if ((key === "p32" || key === "p33" || key === "p34") && value === "(") {
        open = [];
        curves.set(key, open);
        sawCurve = true;
        continue;
      }
      // Only the three size fields are kept, as numbers, and the two fin fields, as the strings the rules above handle;
      // every other field's text is dropped here.
      if (!sawCurve && (key === "p01" || key === "p03" || key === "p04")) header.set(key, headerNumber(value));
      else if (!sawCurve && key === "p50") finLine = value;
      else if (!sawCurve && key === "p51") finWord = brdFinWord(value);
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

    // The cross-sections that can be used: a station on the board (within 1 cm of it), every sampled point a figure.
    const sections: ReadBrdSection[] = [];
    for (const raw of rawSections) {
      const station = centimetresToMm(raw.station);
      if (station < -BRD_REACH_MM || station > lengthMm + BRD_REACH_MM) continue;
      const points = sampleKnots(raw.knots, BRD_PREVIEW_SECTION_STEPS);
      if (points.length < 2 || points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) continue;
      sections.push({ station: mm(station), points, knots: raw.knots });
    }
    sections.sort((a, b) => a.station - b.station);

    const width = header.get("p04");
    const thickness = header.get("p03");
    const finFigures = finLine === null ? null : parseBrdFinLine(finLine);
    const fins = finFigures ? brdFinsFromLine(finFigures, outline, mm(lengthMm), finWord) : noBrdFins();
    return {
      ok: true,
      board: {
        length: mm(lengthMm),
        width: width !== null && width !== undefined && width > 0 ? centimetresToMm(width) : null,
        thickness: thickness !== null && thickness !== undefined && thickness > 0 ? centimetresToMm(thickness) : null,
        outline,
        bottom,
        deck,
        sections,
        fins,
      },
    };
  } catch {
    return UNREADABLE;
  }
}
