/**
 * The AkuShaper board file for one board (quick 261110-tvk): a `.brd` a shaper opens in AkuShaper or Shape3D,
 * written from the surface the 3D screen draws (`buildBoardSurface`), so it can never describe a different board
 * from the one on screen. It holds the board's outline (the right half, tail to nose), its bottom rocker and deck
 * along the stringer, and one cross-section at every litres station that has foam — with BOTTOM's concaves and
 * channels in them, because the sections are read off the cut surface. Fins are not written.
 *
 * The file is text in centimetres, tail at x = 0, locked with AkuShaper's own scramble (`brd-scramble.ts`). Every
 * curve is a run of cubic Bézier knots (`lib/geometry/bezier-fit.ts`) fitted through points of the surface to within
 * half a millimetre (1/50"). Channel walls, a swallow's notch and a square tail's corners stay sharp knots.
 *
 * Header: only fields known to open — the founder's egg's machine settings, verbatim (that exact header opened in both
 * programs). Left out on purpose: p58 (a stamp neither program checks), p10 (a blank's file path on someone's PC) and
 * the name fields p08, p45, p48, p49, p51, p54, whose meanings are not sure. The file's own name carries the board's name.
 *
 * A swallow's notch: the outline starts at the crotch on the stringer, runs back along the notch's edge to the
 * swallow's point, then along the rail. Each section inside the notch is the rail-side piece only, one curve from the
 * notch wall out round the rail and back to the wall, its distance across measured from the stringer line, with plain
 * corner ends.
 *
 * Pure and synchronous. Every mm-to-cm step goes through `lib/geometry/units.ts`.
 */
import { fitBezierKnots, type BezierKnot, type P2 } from "../geometry/bezier-fit";
import {
  boardFileHalfOutline,
  boardHalfSlices,
  boardStringerLines,
  type BoardSurface,
} from "../geometry/board-surface";
import { mm, mmToCentimetres, type Mm } from "../geometry/units";
import { boardFileStem } from "../models/board-file";
import { scrambleBrd } from "./brd-scramble";

/** How close every curve stays to the board on screen. */
export const BRD_TOLERANCE_MM = 0.5;

/**
 * The egg's machine fields, verbatim and in order: cutter settings whose meanings are not known, written exactly as the
 * file that opened in both programs had them.
 */
export const BRD_MACHINE_FIELDS: readonly (readonly [string, string])[] = [
  ["p07", "V4.4"],
  ["p55", "0"],
  ["p56", "0"],
  ["p57", "0"],
  ["p43", "c:\\machine"],
  ["p11", "15"],
  ["p12", "13"],
  ["p13", "0"],
  ["p14", "28.2"],
  ["p59", "0.9400000000000001"],
  ["p15", "3.0838964009757846E-4"],
  ["p16", "0.0038074890297145228"],
  ["p17", "10.01"],
  ["p18", "0.1"],
  ["p99", "0.1"],
  ["p19", "0.0"],
  ["p20", "0.0"],
  ["p21", "0.5"],
  ["p22", "0.5"],
  ["p23", "1.0"],
  ["p24", "200"],
  ["p25", "35"],
  ["p42", "30"],
  ["p26", "300"],
  ["p70", "210"],
  ["p44", "140.0"],
  ["p60", "85.0"],
  ["p61", "25.0"],
  ["p46", "8"],
  ["p47", "0"],
  ["noseAngelWings", "true"],
  ["tailAngelWings", "false"],
  ["p62", "-1.0"],
  ["p63", "-1.0"],
  ["p64", "-1.0"],
  ["p65", "false"],
  ["p66", "0.0"],
  ["p67", "0.0"],
  ["p68", "0.0"],
  ["p69", "0.0"],
  ["p80", "60.0"],
  ["p81", "20.0"],
  ["p82", "0.0"],
  ["p83", "110.0"],
  ["p85", "false"],
  ["p86", "0.0"],
  ["p87", "180"],
  ["p88", "210"],
  ["p38", "5"],
  ["p53", "0"],
  ["p41", "false"],
  ["p50", "[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]"],
  ["p27", "[120.0,0.0,28.8]"],
  ["p28", "[257.5,0.0,28.939999999999998]"],
  ["p29", "[0.0,0.0,66.2]"],
  ["p30", "[70.0,0.0,40.0]"],
  ["p31", "[72.89453357245351,0.0,34.71636112128822]"],
];

/**
 * A number the way Java's `Double.toString` prints it for the sizes a board has: a plain decimal (`208.28`, `6.60400…`),
 * `0.0` for zero. Anything under a hundredth of a micron in centimetres reads `0.0` (so no exponent form ever
 * appears, and no `-0.0`). Throws on NaN and on infinity.
 */
export function formatBrdNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error("A board file number is not finite.");
  if (Math.abs(value) < 1e-6) return "0.0";
  const text = String(value);
  return text.includes(".") ? text : `${text}.0`;
}

/** One fitted curve and the points it was fitted through (all millimetres). */
export interface BrdCurve {
  points: P2[];
  knots: BezierKnot[];
}

/** One cross-section: its station and its fitted half. `inNotch` is a piece inside a swallow's notch (rail side only). */
export interface BrdSection extends BrdCurve {
  station: Mm;
  inNotch: boolean;
}

export interface BrdCurves {
  length: Mm;
  width: Mm;
  /** The largest thickness along the stringer. */
  thickness: Mm;
  /** The length along the stringer's bottom curve. */
  bottomLength: Mm;
  outline: BrdCurve;
  bottom: BrdCurve;
  deck: BrdCurve;
  sections: BrdSection[];
}

const OFF = 1e-6;

/** Every curve of the file, in millimetres, fitted to the surface. */
export function brdCurves(surface: BoardSurface): BrdCurves {
  // Outline: the right half; its widest point is a level knot (the wide point exact), the ends sit on the stringer.
  const half: P2[] = boardFileHalfOutline(surface).map((p) => [p[0], Math.abs(p[1])]);
  const outlinePoints: P2[] = [...half];
  if (Math.abs(outlinePoints[0][1]) > OFF) outlinePoints.unshift([outlinePoints[0][0], 0]);
  const last = outlinePoints[outlinePoints.length - 1];
  if (Math.abs(last[1]) > OFF) outlinePoints.push([last[0], 0]);
  const widest = outlinePoints.reduce((best, p, i) => (p[1] > outlinePoints[best][1] ? i : best), 0);
  const outline: BrdCurve = {
    points: outlinePoints,
    knots: fitBezierKnots(outlinePoints, { tolerance: BRD_TOLERANCE_MM, keep: [widest], level: [widest] }),
  };

  // Rocker: the stringer's bottom, and the deck with the tips' edges closing the profile.
  const stringer = boardStringerLines(surface);
  const bottomPoints: P2[] = stringer.bottom.map((p) => [p[0], p[2]]);
  const bottom: BrdCurve = { points: bottomPoints, knots: fitBezierKnots(bottomPoints, { tolerance: BRD_TOLERANCE_MM }) };
  const deckPoints: P2[] = [bottomPoints[0], ...stringer.deck.map((p): P2 => [p[0], p[2]]), bottomPoints[bottomPoints.length - 1]];
  const deckKnots = fitBezierKnots(deckPoints, { tolerance: BRD_TOLERANCE_MM });
  // The tip edges are corners; an edge with no height was a repeat and is gone, so its end stays smooth.
  const tailEdge = Math.hypot(deckPoints[1][0] - deckPoints[0][0], deckPoints[1][1] - deckPoints[0][1]) > OFF;
  const noseEdge =
    Math.hypot(
      deckPoints[deckPoints.length - 1][0] - deckPoints[deckPoints.length - 2][0],
      deckPoints[deckPoints.length - 1][1] - deckPoints[deckPoints.length - 2][1],
    ) > OFF;
  if (tailEdge) deckKnots[0] = { ...deckKnots[0], smooth: false };
  if (noseEdge) deckKnots[deckKnots.length - 1] = { ...deckKnots[deckKnots.length - 1], smooth: false };
  const deck: BrdCurve = { points: deckPoints, knots: deckKnots };

  // Sections: each right half from the bottom at the inside edge to the deck there, y = 0 at that bottom.
  const sections: BrdSection[] = boardHalfSlices(surface).map((slice) => {
    const base = slice.points[0][2];
    const points: P2[] = slice.points.map((p) => [Math.abs(p[1]), p[2] - base]);
    const inNotch = points[0][0] > OFF;
    const level = inNotch ? [] : [0, points.length - 1];
    const knots = fitBezierKnots(points, { tolerance: BRD_TOLERANCE_MM, keep: level, level });
    if (inNotch) {
      knots[0] = { ...knots[0], smooth: false };
      knots[knots.length - 1] = { ...knots[knots.length - 1], smooth: false };
    }
    return { station: mm(slice.station), inNotch, points, knots };
  });

  const thickness = Math.max(...stringer.deck.map((p, i) => p[2] - stringer.bottom[i][2]));
  let bottomLength = 0;
  for (let i = 1; i < bottomPoints.length; i++) {
    bottomLength += Math.hypot(bottomPoints[i][0] - bottomPoints[i - 1][0], bottomPoints[i][1] - bottomPoints[i - 1][1]);
  }
  return { length: surface.length, width: surface.width, thickness: mm(thickness), bottomLength: mm(bottomLength), outline, bottom, deck, sections };
}

const cm = (value: number) => formatBrdNumber(mmToCentimetres(mm(value)));

function knotLine(knot: BezierKnot): string {
  const { point, before, after, smooth } = knot;
  return `(cp [${cm(point[0])},${cm(point[1])},${cm(before[0])},${cm(before[1])},${cm(after[0])},${cm(after[1])}] ${smooth} false)`;
}

/**
 * A section's knots as the file writes them. A stringer section's two ends carry a horizontal handle on each side of
 * the stringer, so the section reads smooth across it: the first knot's incoming handle mirrors its outgoing one, the
 * last knot's outgoing mirrors its incoming. A piece inside a swallow's notch is written as it was fitted.
 */
function sectionKnots(section: BrdSection): BezierKnot[] {
  if (section.inNotch) return section.knots;
  const knots = section.knots.slice();
  const first = knots[0];
  const last = knots[knots.length - 1];
  knots[0] = { ...first, before: [2 * first.point[0] - first.after[0], first.after[1]] };
  knots[knots.length - 1] = { ...last, after: [2 * last.point[0] - last.before[0], last.before[1]] };
  return knots;
}

/** The empty section at a pointed end of the board: one knot, all zeros. */
const EMPTY_KNOT = "(cp [0.0,0.0,0.0,0.0,0.0,0.0] false false)";

/** The board's text, ready to scramble, and how many cross-sections it carries beside the two empty ends. */
export function brdText(surface: BoardSurface): { text: string; sectionCount: number } {
  const curves = brdCurves(surface);
  const lines: string[] = [];
  const field = (key: string, value: string) => lines.push(`${key} : ${value}`);
  field("p01", cm(curves.length));
  field("p02", cm(curves.bottomLength));
  field("p03", cm(curves.thickness));
  field("p04", cm(curves.width));
  for (const [key, value] of BRD_MACHINE_FIELDS) field(key, value);
  const block = (key: string, knots: readonly BezierKnot[]) => {
    field(key, "(");
    for (const knot of knots) lines.push(knotLine(knot));
    lines.push(")");
  };
  block("p32", curves.outline.knots);
  block("p33", curves.bottom.knots);
  block("p34", curves.deck.knots);
  field("p35", "(");
  const section = (station: string, knots: readonly string[]) => {
    lines.push(`(p36 ${station} -1.0 -1.0`, ...knots, ")");
  };
  // The empty section that closes each tip, unless a real section already stands there: a squared tail or nose has its
  // own cross-section at x = 0 (or at the length), and two sections at one station would divide by a zero distance.
  const stations = curves.sections.map((s) => s.station);
  if (stations.length === 0 || stations[0] > OFF) section("0.0", [EMPTY_KNOT]);
  for (const s of curves.sections) section(cm(s.station), sectionKnots(s).map(knotLine));
  if (stations.length === 0 || stations[stations.length - 1] < curves.length - OFF) section(cm(curves.length), [EMPTY_KNOT]);
  lines.push(")");
  return { text: `${lines.join("\n")}\n`, sectionCount: curves.sections.length };
}

/** One knot read back from a file, in centimetres. */
export interface BrdReadKnot {
  point: [number, number];
  before: [number, number];
  after: [number, number];
  smooth: boolean;
}

export interface BrdRead {
  /** The one-line fields in file order (p01…, the machine fields), as written. */
  header: [string, string][];
  outline: BrdReadKnot[];
  bottom: BrdReadKnot[];
  deck: BrdReadKnot[];
  sections: { station: number; knots: BrdReadKnot[] }[];
}

const NUM = "(-?\\d+\\.\\d+)";
const KNOT = new RegExp(`^\\(cp \\[${Array(6).fill(NUM).join(",")}\\] (true|false) false\\)$`);
const SECTION_HEAD = new RegExp(`^\\(p36 ${NUM} -1\\.0 -1\\.0$`);

/**
 * A strict reader for the board text (the tests and the browser specs use it): the header's one-line fields, then the
 * outline, bottom and deck knots, then the sections. It throws on any line it does not expect.
 */
export function readBrdText(text: string): BrdRead {
  if (!text.endsWith(")\n")) throw new Error("A board file ends with a closing bracket and a newline.");
  const lines = text.slice(0, -1).split("\n");
  let at = 0;
  const fail = (why: string): never => {
    throw new Error(`Board file line ${at + 1}: ${why} (${JSON.stringify(lines[at] ?? "")})`);
  };
  const next = () => lines[at++];

  const header: [string, string][] = [];
  while (at < lines.length && lines[at] !== "p32 : (") {
    const m = /^([A-Za-z0-9]+) : (\S.*)$/.exec(lines[at]);
    if (!m || m[2] === "(") fail("expected a header field");
    else header.push([m[1], m[2]]);
    at++;
  }
  const knot = (): BrdReadKnot => {
    const m = KNOT.exec(lines[at] ?? "");
    if (!m) return fail("expected a knot");
    at++;
    const v = m.slice(1, 7).map(Number);
    return {
      point: [v[0], v[1]],
      before: [v[2], v[3]],
      after: [v[4], v[5]],
      smooth: m[7] === "true",
    };
  };
  const knots = (): BrdReadKnot[] => {
    const out: BrdReadKnot[] = [];
    while (lines[at] !== ")") out.push(knot());
    at++;
    return out;
  };
  const expectLine = (want: string) => {
    if (next() !== want) {
      at--;
      fail(`expected ${want}`);
    }
  };

  expectLine("p32 : (");
  const outline = knots();
  expectLine("p33 : (");
  const bottom = knots();
  expectLine("p34 : (");
  const deck = knots();
  expectLine("p35 : (");
  const sections: BrdRead["sections"] = [];
  while (lines[at] !== ")") {
    const m = SECTION_HEAD.exec(lines[at] ?? "");
    if (!m) fail("expected a section");
    at++;
    sections.push({ station: Number(m![1]), knots: knots() });
  }
  at++;
  if (at !== lines.length) fail("unexpected line after the last section");
  return { header, outline, bottom, deck, sections };
}

/**
 * The export's one download: `{stem}.brd`, the board text locked as AkuShaper locks its own, the same board always the
 * same bytes. `sectionCount` counts the fitted cross-sections, not the two empty ends.
 */
export function brdFile(surface: BoardSurface, boardName: string): { name: string; data: Uint8Array; sectionCount: number } {
  const { text, sectionCount } = brdText(surface);
  return { name: `${boardFileStem(boardName)}.brd`, data: scrambleBrd(text), sectionCount };
}
