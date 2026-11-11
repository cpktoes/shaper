/**
 * The AkuShaper board file for one board (quick 261110-tvk, reworked in 261110-veo): a `.brd` a shaper opens in
 * AkuShaper or Shape3D, written from the surface the 3D screen draws (`buildBoardSurface`), so it can never describe a
 * different board from the one on screen. It holds the board's outline (the right half, tail to nose), its bottom rocker
 * and deck along the stringer, and about a dozen cross-sections at chosen stations — with BOTTOM's concaves and
 * channels in them, because the sections are read off the cut surface. Fins are not written.
 *
 * The file is text in centimetres, tail at x = 0, locked with AkuShaper's own scramble (`brd-scramble.ts`). The outline,
 * rocker and deck are runs of cubic Bézier knots (`lib/geometry/bezier-fit.ts`) fitted through points of the surface to
 * within half a millimetre (1/50"). Channel walls and a square tail's corners stay sharp knots.
 *
 * Sections, the way AkuShaper writes its own (the founder's finding, 2026-11-10: a 3D view joins knot i of one section
 * to knot i of the next, so the same number of knots in the same places on every section is what draws a smooth board):
 * about a dozen stations (1" in from each tip, 12" from each tip, the wide point, where each bottom cut and the channels
 * start, are deepest and end, and no two neighbours more than 8" apart), each with the same knots in the same order —
 * the bottom at the stringer, any channel walls' feet and tops, the bottom edge (the tuck), the rail's widest point, the
 * deck shoulder, the deck at the stringer. The knots are the board's own places; only their handles are fitted. A
 * one-knot section closes the tail and the nose, as AkuShaper's own Scoop does at its square tail.
 *
 * Header: only fields known to open — the founder's egg's machine settings, verbatim (that exact header opened in both
 * programs). Left out on purpose: p58 (a stamp neither program checks), p10 (a blank's file path on someone's PC) and
 * the name fields p08, p45, p48, p49, p51, p54, whose meanings are not sure. The file's own name carries the board's name.
 *
 * A swallow is written as a square tail at the width of its points, to be cut by hand: the outline runs (0, 0) to
 * (0, half the points' width) as a corner and then up the rail, its x never going backwards (a 3D view reads the outline
 * as a half-width at each distance along the board, and an outline that turns back is not drawn). The rocker and deck
 * run back to x = 0 at the points' bottom and deck, as if the notch were not cut, and no section stands inside it.
 *
 * Pure and synchronous. Every mm-to-cm step goes through `lib/geometry/units.ts`.
 */
import { bezierDeviation, fitBezierKnots, fitBezierSpan, type BezierKnot, type P2 } from "../geometry/bezier-fit";
import {
  boardRailHalfOutline,
  boardSectionHalves,
  boardStringerLines,
  type BoardSurface,
  type Vec3,
} from "../geometry/board-surface";
import type { ResolvedBottom } from "../geometry/bottom";
import { inchesToMm, mm, mmToCentimetres, type Mm } from "../geometry/units";
import { boardFileStem } from "../models/board-file";
import { scrambleBrd } from "./brd-scramble";

/** How close the outline, rocker and deck stay to the board on screen. */
export const BRD_TOLERANCE_MM = 0.5;

/** How close a cross-section stays to the board at its own station (measured on the three sample boards: 0.76 to 0.91). */
export const BRD_SECTION_TARGET_MM = 1;

/** The least two neighbouring knots of one section stand apart where the board lets them (no two ever share a point). */
export const BRD_KNOT_GAP_MM = 0.5;

/** The deck shoulder's slot in the deck run of 48 points: 36 of 24 / 32 / 36 / 40 / 43 fitted all three sample boards best. */
export const BRD_SHOULDER_SLOT = 36;

/** The sections nearest each tip stand this far in from it, in inches: the very tip is the one-knot section. */
export const BRD_TIP_SECTION_IN = 1;

/** No two neighbouring sections stand further apart than this, in inches, so a blend of two stays close to the board. */
export const BRD_SECTION_SPACING_IN = 8;

/** The most knots added board-wide beyond the base set, for a span that would otherwise miss by more than the target. */
export const BRD_ADDED_KNOTS_MAX = 4;

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

/** What one knot of a section is, the same for knot number i on every section of a board. */
export type BrdKnotRole =
  | "bottomStringer"
  | "wallFoot"
  | "wallTop"
  | "bottomEdge"
  | "widest"
  | "shoulder"
  | "deckStringer"
  | "added";

/** One cross-section: its station, its points (the half with consecutive repeats dropped) and its fitted knots. */
export interface BrdSection extends BrdCurve {
  station: Mm;
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
  /** What each knot number of every section is, in order: the same for every section of the board. */
  sectionKnotRoles: BrdKnotRole[];
}

/** What shapes the file beyond the surface: the stations where the bottom changes, from `brdBottomStations`. */
export interface BrdOptions {
  bottomStations?: readonly Mm[];
}

/**
 * Whether the file writes this board's tail square although it is not: a swallow (a ring of two pieces) is written as a
 * wide square tail at the width of its points, and its notch is left to be cut by hand (the founder, 2026-11-10, quick
 * 261110-veo: "fish files on the aku site don't have swallows cut, just a big wide tail").
 */
export function brdTailWrittenSquare(surface: BoardSurface): boolean {
  return surface.rings.some((ring) => ring.pieces.length === 2);
}

/**
 * The stations where the bottom changes, for the file's sections to stand at: the start, deepest and end of each of the
 * nose, center and tail cuts that is not flat and has depth, and the channels' start, deepest and end when there are
 * channels with depth. Sorted, repeats dropped.
 */
export function brdBottomStations(resolved: ResolvedBottom): Mm[] {
  const found: number[] = [];
  for (const cut of [resolved.nose, resolved.center, resolved.tail]) {
    if (cut.kind !== "flat" && cut.depth > 0) found.push(cut.start, cut.deepest, cut.end);
  }
  const { channels } = resolved;
  if (channels.count > 0 && channels.depth > 0) found.push(channels.start, channels.deepest, channels.end);
  return [...new Set(found)].sort((a, b) => a - b).map((value) => mm(value));
}

const OFF = 1e-6;

const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const unitFrom = (from: P2, to: P2): P2 => {
  const size = dist(from, to);
  return size > 0 ? [(to[0] - from[0]) / size, (to[1] - from[1]) / size] : [0, 0];
};

/** Which half of a ring each station is read from: indices into the halves, tail to nose. */
function chooseSectionHalves(halves: readonly { station: Mm; reach: number }[], length: Mm, bottomStations: readonly Mm[]): number[] {
  const tip = inchesToMm(BRD_TIP_SECTION_IN);
  const twelve = inchesToMm(12);
  const spacing = inchesToMm(BRD_SECTION_SPACING_IN);
  const nearest = (target: number, kept?: ReadonlySet<number>) => {
    let best = -1;
    halves.forEach((half, i) => {
      if (kept?.has(i)) return;
      if (best < 0 || Math.abs(half.station - target) < Math.abs(halves[best].station - target)) best = i;
    });
    return best;
  };
  let wide = 0;
  let wideAt = -Infinity;
  halves.forEach((half, i) => {
    if (half.reach > wideAt + 1e-9) {
      wideAt = half.reach;
      wide = i;
    }
  });
  const kept = new Set<number>([nearest(tip), nearest(twelve), wide, nearest(length - twelve), nearest(length - tip)]);
  for (const station of bottomStations) {
    if (!(station > 0 && station < length)) continue;
    if ([...kept].some((i) => Math.abs(halves[i].station - station) <= tip)) continue;
    kept.add(nearest(station));
  }
  const order = () => [...kept].sort((a, b) => a - b);
  const first = order();
  for (let k = 0; k + 1 < first.length; k++) {
    const from = halves[first[k]].station;
    const to = halves[first[k + 1]].station;
    const extra = Math.ceil((to - from) / spacing) - 1;
    for (let j = 1; j <= extra; j++) kept.add(nearest(from + ((to - from) * j) / (extra + 1), kept));
  }
  return order();
}

/** One knot's place in the ring's slot list: its slot, what it is, and which channel wall (if a wall's knot). */
interface KnotSlot {
  slot: number;
  role: BrdKnotRole;
  wall?: number;
}

/** The board's slot list, bottom first, plus any knots added board-wide. */
function knotSlots(layout: { count: number; walls: { foot: number; top: number }[]; bottomEdge: number; widest: number }, added: readonly number[]): KnotSlot[] {
  const slots: KnotSlot[] = [{ slot: 0, role: "bottomStringer" }];
  layout.walls.forEach((wall, w) => {
    slots.push({ slot: wall.foot, role: "wallFoot", wall: w }, { slot: wall.top, role: "wallTop", wall: w });
  });
  slots.push(
    { slot: layout.bottomEdge, role: "bottomEdge" },
    { slot: layout.widest, role: "widest" },
    { slot: layout.count - 1 - BRD_SHOULDER_SLOT, role: "shoulder" },
    { slot: layout.count - 1, role: "deckStringer" },
  );
  for (const slot of added) slots.push({ slot, role: "added" });
  return slots.sort((a, b) => a.slot - b.slot);
}

/** A section's points with each consecutive repeat dropped. */
function withoutRepeatPoints(points: readonly P2[]): P2[] {
  const out: P2[] = [];
  for (const p of points) if (out.length === 0 || dist(p, out[out.length - 1]) > OFF) out.push(p);
  return out;
}

interface FittedSection {
  points: P2[];
  knots: BezierKnot[];
  /** Each span between neighbouring knots: its two slots and the points it was fitted to. */
  spans: { from: number; to: number; points: P2[] }[];
  deviation: number;
}

/**
 * One half-section as knots at the board's slots (brief decision 1): the slot points are the knots, except a channel
 * wall that does not stand here (its foot and top are one welded point, or less than `BRD_KNOT_GAP_MM` apart), whose two
 * knots and any added knot slide along the section so no two neighbours sit closer than the gap. Only the handles are
 * fitted, one span at a time.
 */
function fitSection(half: readonly Vec3[], slots: readonly KnotSlot[], walls: readonly { foot: number; top: number }[]): FittedSection {
  const base = half[0][2];
  const raw: P2[] = half.map((p): P2 => [Math.abs(p[1]), p[2] - base]);
  const arc: number[] = [0];
  for (let k = 1; k < raw.length; k++) arc.push(arc[k - 1] + dist(raw[k], raw[k - 1]));
  const reach = Math.max(...raw.map((p) => p[0]));
  const gap = BRD_KNOT_GAP_MM;

  const standing = walls.map((wall) => dist(raw[wall.foot], raw[wall.top]) >= gap);
  const fixed = slots.map((s) => (s.wall === undefined ? s.role !== "added" : standing[s.wall]));
  const at = slots.map((s) => arc[s.slot]);
  // Movable knots (a wall that does not stand, an added knot) keep to their own arc position, pushed apart so that no
  // two neighbours are closer than the gap: outward from the inner fixed knot, then inward from the outer one.
  for (let i = 0; i < slots.length; ) {
    if (fixed[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < slots.length && !fixed[j]) j++;
    const low = at[i - 1];
    const high = at[j];
    for (let k = i; k < j; k++) at[k] = Math.max(at[k], (k === i ? low : at[k - 1]) + gap);
    for (let k = j - 1; k >= i; k--) at[k] = Math.min(at[k], (k === j - 1 ? high : at[k + 1]) - gap);
    if (at[i] < low + gap - 1e-9) for (let k = i; k < j; k++) at[k] = low + ((high - low) * (k - i + 1)) / (j - i + 1);
    i = j;
  }
  const pointAtArc = (s: number): P2 => {
    let k = 0;
    while (k < raw.length - 2 && arc[k + 1] < s) k++;
    const length = arc[k + 1] - arc[k];
    const t = length > 0 ? Math.min(1, Math.max(0, (s - arc[k]) / length)) : 0;
    return [raw[k][0] + (raw[k + 1][0] - raw[k][0]) * t, raw[k][1] + (raw[k + 1][1] - raw[k][1]) * t];
  };
  const points = slots.map((s, i): P2 => (fixed[i] ? raw[s.slot] : pointAtArc(at[i])));

  // The nearest section point at least the gap away on each side of a knot.
  const before = (i: number): P2 => {
    for (let k = raw.length - 1; k >= 0; k--) if (arc[k] < at[i] - 1e-9 && dist(raw[k], points[i]) >= gap) return raw[k];
    return raw[0];
  };
  const after = (i: number): P2 => {
    for (let k = 0; k < raw.length; k++) if (arc[k] > at[i] + 1e-9 && dist(raw[k], points[i]) >= gap) return raw[k];
    return raw[raw.length - 1];
  };

  const incoming: P2[] = [];
  const outgoing: P2[] = [];
  const corner: boolean[] = [];
  slots.forEach((s, i) => {
    let into: P2;
    let out: P2;
    let sharp = false;
    if (s.role === "bottomStringer") {
      into = out = [1, 0];
    } else if (s.role === "deckStringer") {
      into = out = [-1, 0];
    } else if (s.role === "widest" && points[i][0] >= reach - 1e-9) {
      into = out = [0, 1];
    } else if (s.wall !== undefined && standing[s.wall]) {
      sharp = true;
      if (s.role === "wallFoot") {
        into = unitFrom(before(i), points[i]);
        out = unitFrom(points[i], points[i + 1]);
      } else {
        into = unitFrom(points[i - 1], points[i]);
        out = unitFrom(points[i], after(i));
      }
    } else {
      const a = unitFrom(before(i), points[i]);
      const b = unitFrom(points[i], after(i));
      const movable = !fixed[i];
      const turn = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) * (180 / Math.PI);
      if (!movable && turn > 30) {
        sharp = true;
        into = a;
        out = b;
      } else {
        into = out = unitFrom(before(i), after(i));
      }
    }
    incoming.push(into);
    outgoing.push(out);
    corner.push(sharp);
  });

  const knots: BezierKnot[] = points.map((point, i) => ({ point, before: point, after: point, smooth: !corner[i] }));
  const spans: FittedSection["spans"] = [];
  for (let i = 0; i + 1 < slots.length; i++) {
    const between: P2[] = [];
    for (let k = 0; k < raw.length; k++) if (arc[k] > at[i] + 1e-9 && arc[k] < at[i + 1] - 1e-9) between.push(raw[k]);
    const run = withoutRepeatPoints([points[i], ...between, points[i + 1]]);
    const handles = fitBezierSpan(run, outgoing[i], incoming[i + 1]);
    knots[i] = { ...knots[i], after: handles.after };
    knots[i + 1] = { ...knots[i + 1], before: handles.before };
    spans.push({ from: slots[i].slot, to: slots[i + 1].slot, points: run });
  }
  const flat = withoutRepeatPoints(raw);
  return { points: flat, knots, spans, deviation: bezierDeviation(flat, knots) };
}

/**
 * The file's outline, in millimetres: the right half; its widest point is a level knot (the wide point exact), the ends
 * sit on the stringer. It is the right rail alone, so x only rises: a swallow starts at its points' width and is written
 * as a square tail there, (0, 0) to (0, half the points' width) as a corner.
 */
export function brdOutlineCurve(surface: BoardSurface): BrdCurve {
  const half: P2[] = boardRailHalfOutline(surface).map((p) => [p[0], Math.abs(p[1])]);
  const outlinePoints: P2[] = [...half];
  if (Math.abs(outlinePoints[0][1]) > OFF) outlinePoints.unshift([outlinePoints[0][0], 0]);
  const last = outlinePoints[outlinePoints.length - 1];
  if (Math.abs(last[1]) > OFF) outlinePoints.push([last[0], 0]);
  const widest = outlinePoints.reduce((best, p, i) => (p[1] > outlinePoints[best][1] ? i : best), 0);
  return {
    points: outlinePoints,
    knots: fitBezierKnots(outlinePoints, { tolerance: BRD_TOLERANCE_MM, keep: [widest], level: [widest] }),
  };
}

/** Every curve of the file, in millimetres, fitted to the surface. */
export function brdCurves(surface: BoardSurface, options: BrdOptions = {}): BrdCurves {
  const outline = brdOutlineCurve(surface);

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

  // Sections: about a dozen chosen stations, each a ring of the drawn board read slot for slot, so knot i is the same
  // place on every section. y = 0 at the bottom at the stringer.
  const { halves, walls, bottomEdge, widest: widestSlot } = boardSectionHalves(surface);
  const sections: BrdSection[] = [];
  let sectionKnotRoles: BrdKnotRole[] = [];
  if (halves.length > 0) {
    const count = halves[0].points.length;
    const layout = { count, walls, bottomEdge, widest: widestSlot };
    const reaching = halves.map((h) => ({ station: h.station, reach: Math.max(...h.points.map((p) => Math.abs(p[1]))) }));
    const chosen = chooseSectionHalves(reaching, surface.length, options.bottomStations ?? []).map((i) => halves[i]);
    // Added knots are board-wide, so the count and the places stay the same on every section: while a section misses by
    // more than the target, the worst span of any section gets a knot halfway between its slots, on every section.
    const added: number[] = [];
    let slots = knotSlots(layout, added);
    let fits = chosen.map((h) => fitSection(h.points, slots, walls));
    while (added.length < BRD_ADDED_KNOTS_MAX && Math.max(...fits.map((f) => f.deviation)) > BRD_SECTION_TARGET_MM) {
      let worst = -1;
      let worstSlot = -1;
      for (const fit of fits) {
        fit.spans.forEach((span, i) => {
          if (span.to - span.from < 2) return;
          const miss = bezierDeviation(span.points, [fit.knots[i], fit.knots[i + 1]]);
          if (miss > worst) {
            worst = miss;
            worstSlot = Math.floor((span.from + span.to) / 2);
          }
        });
      }
      if (worstSlot < 0) break;
      added.push(worstSlot);
      slots = knotSlots(layout, added);
      fits = chosen.map((h) => fitSection(h.points, slots, walls));
    }
    sectionKnotRoles = slots.map((s) => s.role);
    chosen.forEach((h, i) => sections.push({ station: mm(h.station), points: fits[i].points, knots: fits[i].knots }));
  }

  const thickness = Math.max(...stringer.deck.map((p, i) => p[2] - stringer.bottom[i][2]));
  let bottomLength = 0;
  for (let i = 1; i < bottomPoints.length; i++) {
    bottomLength += Math.hypot(bottomPoints[i][0] - bottomPoints[i - 1][0], bottomPoints[i][1] - bottomPoints[i - 1][1]);
  }
  return {
    length: surface.length,
    width: surface.width,
    thickness: mm(thickness),
    bottomLength: mm(bottomLength),
    outline,
    bottom,
    deck,
    sections,
    sectionKnotRoles,
  };
}

const cm = (value: number) => formatBrdNumber(mmToCentimetres(mm(value)));

function knotLine(knot: BezierKnot): string {
  const { point, before, after, smooth } = knot;
  return `(cp [${cm(point[0])},${cm(point[1])},${cm(before[0])},${cm(before[1])},${cm(after[0])},${cm(after[1])}] ${smooth} false)`;
}

/**
 * A section's knots as the file writes them. A section's two ends carry a horizontal handle on each side of the
 * stringer, so the section reads smooth across it: the first knot's incoming handle mirrors its outgoing one, the last
 * knot's outgoing mirrors its incoming.
 */
function sectionKnots(section: BrdSection): BezierKnot[] {
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
export function brdText(surface: BoardSurface, options: BrdOptions = {}): { text: string; sectionCount: number } {
  const curves = brdCurves(surface, options);
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
  // The one-knot all-zero section that closes each tip, on every board (the way AkuShaper's own Scoop closes its square
  // tail): the real sections stand 1" in, never at a tip.
  section("0.0", [EMPTY_KNOT]);
  for (const s of curves.sections) section(cm(s.station), sectionKnots(s).map(knotLine));
  section(cm(curves.length), [EMPTY_KNOT]);
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
export function brdFile(
  surface: BoardSurface,
  boardName: string,
  options: BrdOptions = {},
): { name: string; data: Uint8Array; sectionCount: number } {
  const { text, sectionCount } = brdText(surface, options);
  return { name: `${boardFileStem(boardName)}.brd`, data: scrambleBrd(text), sectionCount };
}
