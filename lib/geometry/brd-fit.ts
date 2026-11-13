/**
 * The closest board the app's own controls can make to a board read from a `.brd` file (quick 261113-d9b, the founder,
 * 2026-11-13, R1: "open the file in a preview with our closest fit laid over it ... to see how close fitting gets before
 * building the real import").
 *
 * Every board in this app is drawn from controls (`OutlineSpec`, `FiveStationRocker`, `FoilSpec`); a `.brd` is free
 * curves. This finds the control values whose curves lie closest to the file's, so the look can say honestly how far off
 * the closest board the sliders can make is, per curve and where along the board. The answer is always a board the
 * controls could make: every value is clamped to its own control's range (imported, never restated), the tail is a
 * squash, pin or round (never a swallow or diamond, and no wings), and the rocker and foil are hand-set (no blank).
 *
 * How it works, all measured before it was written down:
 *  - Outline. The wide point is read off the file (its largest half-width and where that stands). The nose half and the
 *    tail half of the outline are then independent, so each is fitted alone, by a bounded Nelder-Mead search scored by the
 *    largest gap plus the typical gap between the file's half and the drawn half. The tail is fitted both as a pointed
 *    tail and as a squash with a straight end; a file whose end stands square takes the squash.
 *  - Rocker and thickness. The centre and the two 12" stations are read straight off the file. The file rounds each tip
 *    over its last inch (as this app's own 3D export does), so a tip's figure is instead the one that follows the file best
 *    over the stretch from 1" to 12" in from that tip, found by a golden-section search; the closeness figures leave that
 *    last inch out too.
 *
 * The file's OWN rocker and thickness at the app's five stations (quick 261113-et0, E3) are read separately, straight off the
 * file's lines (`brdFileStations`), because they are the numbers a shaper matches a blank against. The true tip is the right
 * figure unless the tip comes to a point: the rounded end of a file's bottom curve can climb to meet the deck (a 6'10 egg's
 * nose reads 4 3/8" at its very point, but the bottom carried straight on reaches 3 15/16"), and a blank matched to the
 * point would carry nearly half an inch too much nose rocker. So a tip thinner than 1/16" at its very end has its bottom and
 * deck carried straight on from 2" and 1" in, as if a straightedge were laid along them, and the point's own figures are
 * kept beside it for the shaper to read.
 *
 * The rocker is the file's FINISHED rocker, along the stringer (quick 261113-gwr, the founder, 2026-11-13: "the rocker is
 * tricky because we're trying to balance a foil without contours and square rails with a finished board's rocker along
 * the stringer (which isn't always as smooth as the pre contoured rocker). But, for concaves the stringer rocker will
 * always be more, and with flat, vee or belly the stringer rocker will always match"). Ours (the five stations and the
 * foil) is the board BEFORE contours. Under a flat, vee or belly the two are the same line and nothing changes; under a
 * concave the finished stringer reads more, by the concave's depth at the stringer there, so the board is planed that much
 * lower: `fitBoardToBrd(lines, stringerLift)` fits the five-station rocker and the foil to the file's stringer LESS that
 * lift (the deck stays: the planed deck is the finished deck), draws our finished stringer as the planed one plus the lift,
 * and reports the closeness of the finished stringers. The smooth five-station rocker is never bent to chase the ripple
 * where our concave's ends miss the file's: the ripple shows honestly in the closeness figure. Measured on a Shortboard
 * with a 1/4" Deep Single Concave, written and read back: the refit's rocker and foil come back within 0.03 to 0.1 mm of
 * the same board written flat (centre thickness 2.254" both; without the lift 2.087").
 *
 * Nothing is rounded here: rounding is for what is shown (the founder's standing rule). Pure: no React, browser or
 * database import (CLAUDE.md Rule 1); all lengths are millimetres.
 */
import type { P2 } from "./bezier-fit";
import { BOARD_LENGTH_RANGE_IN, TAIL_PRESETS, WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec } from "./board";
import { buildFallbackProfile } from "./board-profile";
import { findBrdWings, type BrdFileWing } from "./brd-wings";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "./foil";
import { MEASURE_STATION_MM, buildOutline } from "./outline";
import { OUTLINE_SLIDER_LIMITS } from "./outline-drag";
import { ROCKER_LIFT_RANGE_IN, rockerStationPositions, type FiveStationRocker, type RockerStationKey } from "./rocker";
import { degrees, inchesToMm, mm, type Mm } from "./units";
import {
  WING_DEPTH_RANGE_IN,
  WING_POSITION_MIN_IN,
  WING_RUN_RANGE_IN,
  clampWingStations,
  wingFootprint,
  wingPositionTop,
  wingTakeAt,
  type Wing,
} from "./wings";

/** A board's three curves in millimetres: the shape a reader hands over (`lib/export/brd-read.ts`). */
export interface BrdLines {
  length: Mm;
  /** The outline's right half, tail to nose, as (distance from the tail, half-width). */
  outline: readonly P2[];
  /** The bottom and the deck along the stringer, as (distance from the tail, height). */
  bottom: readonly P2[];
  deck: readonly P2[];
}

/** How far a fitted curve strays from the file's: the largest gap, a typical (mean) gap and where the largest is. */
export interface Closeness {
  largest: Mm;
  typical: Mm;
  /** Distance from the tail of the point that holds the largest gap. */
  at: Mm;
}

export interface BrdFit {
  outline: OutlineSpec;
  rocker: FiveStationRocker;
  foil: FoilSpec;
  /** Our lines for drawing: the outline's right half as TEMPLATE closes it, and the bottom and deck, 201 stations tail to nose. */
  lines: { outline: P2[]; bottom: P2[]; deck: P2[] };
  closeness: { outline: Closeness; rocker: Closeness; thickness: Closeness };
  /**
   * How much our concaves lift the finished stringer above the planed one at the five rocker stations (all `mm(0)` for
   * a fit made without a lift): what the board was planed lower by.
   */
  stringerLift: Record<RockerStationKey, Mm>;
  /**
   * The wings the file's outline draws, as measured (nose-most first, as wing 1 is on the WINGS tab); empty for a file with none.
   * When there are any, `outline.wings` holds ours, fitted around them, in the same order: wing k here is wing k there.
   */
  fileWings: BrdFileWing[];
}

/** The last inch at each tip is left out of the rocker and thickness figures: the file rounds its tips there, ours ends square. */
export const BRD_FIT_TIP_SKIP_MM = inchesToMm(1);

/** The most a search may spend, whatever the file holds. */
const NELDER_MEAD_ITERATIONS = 150;
const GOLDEN_STEPS = 30;
/** Stations compared when a tip is fitted (from the skipped inch to the 12" station), and across the board for the closeness figures. */
const TIP_FIT_SAMPLES = 44;
const CLOSENESS_STEPS = 400;
const DRAWN_STATIONS = 200;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// ---------------------------------------------------------------------------------------------------------------------
// Reading a line
// ---------------------------------------------------------------------------------------------------------------------

/** Every y a line holds at station `s`: each segment that spans it, a segment standing straight up at `s` giving both ends. */
function heightsAt(line: readonly P2[], s: number): number[] {
  const found: number[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [x0, y0] = line[i];
    const [x1, y1] = line[i + 1];
    if (s < Math.min(x0, x1) - 1e-9 || s > Math.max(x0, x1) + 1e-9) continue;
    if (Math.abs(x1 - x0) < 1e-9) found.push(y0, y1);
    else found.push(y0 + ((y1 - y0) * (s - x0)) / (x1 - x0));
  }
  return found;
}

/** The nearer end's height, for a station the line never reaches. */
function nearerEnd(line: readonly P2[], s: number): number {
  if (line.length === 0) return 0;
  const first = line[0];
  const last = line[line.length - 1];
  return Math.abs(s - first[0]) <= Math.abs(s - last[0]) ? first[1] : last[1];
}

/** The highest the line stands at a station. A station off the line's ends reads the nearer end; never infinite. */
export function lineHighestAt(line: readonly P2[], s: number): number {
  const found = heightsAt(line, s);
  return found.length > 0 ? Math.max(...found) : nearerEnd(line, s);
}

/** The lowest the line stands at a station: see `lineHighestAt`. */
export function lineLowestAt(line: readonly P2[], s: number): number {
  const found = heightsAt(line, s);
  return found.length > 0 ? Math.min(...found) : nearerEnd(line, s);
}

// ---------------------------------------------------------------------------------------------------------------------
// How far two lines are apart
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A line packed for nearest-distance queries. Per segment j: the largest station among segments 0..j (`preMax`) and the
 * smallest among segments j..end (`sufMin`), which let a query stop looking as soon as no segment further along could be
 * nearer than the best found.
 */
interface PackedLine {
  x: Float64Array;
  y: Float64Array;
  n: number;
  preMax: Float64Array;
  sufMin: Float64Array;
}

function packLine(line: readonly P2[]): PackedLine {
  const n = line.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = line[i][0];
    y[i] = line[i][1];
  }
  const segments = Math.max(n - 1, 1);
  const preMax = new Float64Array(segments);
  const sufMin = new Float64Array(segments);
  let high = -Infinity;
  for (let j = 0; j < n - 1; j++) {
    high = Math.max(high, x[j], x[j + 1]);
    preMax[j] = high;
  }
  let low = Infinity;
  for (let j = n - 2; j >= 0; j--) {
    low = Math.min(low, x[j], x[j + 1]);
    sufMin[j] = low;
  }
  return { x, y, n, preMax, sufMin };
}

/** The distance from a point to one segment of a packed line, the projection clamped to the segment. */
function segmentDistance(px: number, py: number, line: PackedLine, j: number): number {
  const ax = line.x[j];
  const ay = line.y[j];
  const dx = line.x[j + 1] - ax;
  const dy = line.y[j + 1] - ay;
  const sq = dx * dx + dy * dy;
  let t = sq > 0 ? ((px - ax) * dx + (py - ay) * dy) / sq : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = px - ax - t * dx;
  const ey = py - ay - t * dy;
  return Math.sqrt(ex * ex + ey * ey);
}

/** The exact nearest distance from a point to a packed line, searching outward from where the point's station falls. */
function nearestDistance(px: number, py: number, line: PackedLine): number {
  const segments = line.n - 1;
  if (segments < 1) return Math.hypot(px - line.x[0], py - line.y[0]);
  // The first segment from which every station is at least px (sufMin never falls as j rises).
  let lo = 0;
  let hi = segments - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (line.sufMin[mid] >= px) hi = mid;
    else lo = mid + 1;
  }
  let best = Infinity;
  for (let j = lo; j < segments; j++) {
    if (line.sufMin[j] - px >= best) break;
    const d = segmentDistance(px, py, line, j);
    if (d < best) best = d;
  }
  for (let j = lo - 1; j >= 0; j--) {
    if (px - line.preMax[j] >= best) break;
    const d = segmentDistance(px, py, line, j);
    if (d < best) best = d;
  }
  return best;
}

function gapBetween(file: PackedLine, ours: PackedLine): Closeness {
  let largest = 0;
  let at = 0;
  let sum = 0;
  for (let i = 0; i < file.n; i++) {
    const d = nearestDistance(file.x[i], file.y[i], ours);
    sum += d;
    if (d > largest) {
      largest = d;
      at = file.x[i];
    }
  }
  for (let i = 0; i < ours.n; i++) {
    const d = nearestDistance(ours.x[i], ours.y[i], file);
    if (d > largest) {
      largest = d;
      at = ours.x[i];
    }
  }
  return { largest: mm(largest), typical: mm(file.n > 0 ? sum / file.n : 0), at: mm(at) };
}

/**
 * How far apart two lines lie: for every point of `file` its nearest distance to `ours`, and for every point of `ours` its
 * nearest to `file`. `largest` is the biggest of all of them and `at` the station of the point that holds it; `typical` is
 * the mean over the file's points. Exact for any line (the search is pruned, never approximate).
 */
export function polylineGap(file: readonly P2[], ours: readonly P2[]): Closeness {
  return gapBetween(packLine(file), packLine(ours));
}

// ---------------------------------------------------------------------------------------------------------------------
// Searching
// ---------------------------------------------------------------------------------------------------------------------

/** A bounded Nelder-Mead search on the unit box: every candidate is clamped back into [0, 1] after every move. */
function nelderMead(score: (x: readonly number[]) => number, start: readonly number[]): { x: number[]; value: number } {
  const n = start.length;
  const inBox = (x: readonly number[]) => x.map((v) => clamp(v, 0, 1));
  let simplex = [inBox(start)];
  for (let i = 0; i < n; i++) {
    const moved = [...start];
    moved[i] += moved[i] > 0.5 ? -0.15 : 0.15;
    simplex.push(inBox(moved));
  }
  let values = simplex.map((x) => score(x));
  for (let iteration = 0; iteration < NELDER_MEAD_ITERATIONS; iteration++) {
    const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
    simplex = order.map((i) => simplex[i]);
    values = order.map((i) => values[i]);
    if (values[n] - values[0] < 1e-4) break;
    const centre = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centre[j] += simplex[i][j] / n;
    const along = (a: number) => inBox(centre.map((c, j) => c + a * (simplex[n][j] - c)));
    const reflected = along(-1);
    const reflectedValue = score(reflected);
    if (reflectedValue < values[0]) {
      const expanded = along(-2);
      const expandedValue = score(expanded);
      if (expandedValue < reflectedValue) {
        simplex[n] = expanded;
        values[n] = expandedValue;
      } else {
        simplex[n] = reflected;
        values[n] = reflectedValue;
      }
    } else if (reflectedValue < values[n - 1]) {
      simplex[n] = reflected;
      values[n] = reflectedValue;
    } else {
      const contracted = along(0.5);
      const contractedValue = score(contracted);
      if (contractedValue < values[n]) {
        simplex[n] = contracted;
        values[n] = contractedValue;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = inBox(simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])));
          values[i] = score(simplex[i]);
        }
      }
    }
  }
  const best = values.indexOf(Math.min(...values));
  return { x: simplex[best], value: values[best] };
}

/** The value in [low, high] that minimises `score`: golden-section, a fixed number of steps. */
function goldenSection(score: (value: number) => number, low: number, high: number): number {
  const ratio = (Math.sqrt(5) - 1) / 2;
  let a = low;
  let b = high;
  let c = b - ratio * (b - a);
  let d = a + ratio * (b - a);
  let fc = score(c);
  let fd = score(d);
  for (let step = 0; step < GOLDEN_STEPS; step++) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - ratio * (b - a);
      fc = score(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + ratio * (b - a);
      fd = score(d);
    }
  }
  return (a + b) / 2;
}

// ---------------------------------------------------------------------------------------------------------------------
// The outline
// ---------------------------------------------------------------------------------------------------------------------

/** The point `distance` along a line from its start (the last point when the line is shorter). */
function pointAlong(line: readonly P2[], distance: number): P2 {
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const d = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    if (d > 0 && walked + d >= distance) {
      const t = (distance - walked) / d;
      return [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])];
    }
    walked += d;
  }
  return line[line.length - 1];
}

/** The outline's right half as TEMPLATE closes it: a first point off the stringer gets its straight end drawn in. */
function drawnOutline(spec: OutlineSpec): P2[] {
  const points = buildOutline(spec).points.map((p): P2 => [p.station, p.halfWidth]);
  return points[0][1] > 1e-6 ? [[points[0][0], 0], ...points] : points;
}

const RAD_TO_DEG = 180 / Math.PI;

interface OutlineFit {
  spec: OutlineSpec;
  drawn: P2[];
  fileWings: BrdFileWing[];
}

function fitOutline(lines: BrdLines): OutlineFit {
  const length = lines.length;
  const file = lines.outline;

  // The wide point, straight off the file.
  let half = 0;
  let wideAt = 0;
  for (const [x, y] of file) {
    if (y > half) {
      half = y;
      wideAt = x;
    }
  }
  const offsetLimit = inchesToMm(OUTLINE_SLIDER_LIMITS.widePointOffsetIn.max);
  const widePointWidth = mm(clamp(2 * half, inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.min), inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max)));
  const widePointOffset = mm(clamp(wideAt - length / 2, -offsetLimit, offsetLimit));

  const limits = OUTLINE_SLIDER_LIMITS;
  const base: OutlineSpec = {
    length: mm(length),
    widePointWidth,
    widePointOffset,
    tailRailLength: 50,
    noseRailLength: 50,
    noseAngle: degrees(60),
    noseFullness: 50,
    tailAngle: degrees(60),
    tailFullness: 50,
    tail: { kind: "round" },
  };
  const wideStation = buildOutline(base).widePointStation;
  const noseFile = file.filter(([x]) => x >= wideAt - 1e-6);
  const tailFile = file.filter(([x]) => x <= wideAt + 1e-6);
  const noseFilePacked = packLine(noseFile);
  const tailFilePacked = packLine(tailFile);
  const score = (g: Closeness) => g.largest + g.typical;

  // Nose: angle, fullness, rail length. The angle's seed is the chord from the tip to the file's point an inch back.
  const toUnit = (value: number, range: { min: number; max: number }) => (value - range.min) / (range.max - range.min);
  const fromUnit = (unit: number, range: { min: number; max: number }) => range.min + unit * (range.max - range.min);
  const noseSpec = (x: readonly number[]): OutlineSpec => ({
    ...base,
    noseAngle: degrees(fromUnit(x[0], limits.noseAngle)),
    noseFullness: fromUnit(x[1], limits.fullness),
    noseRailLength: fromUnit(x[2], limits.railLength),
  });
  const noseBack = pointAlong([...noseFile].reverse(), inchesToMm(1));
  const noseSeed = clamp(Math.atan2(noseBack[1], length - noseBack[0]) * RAD_TO_DEG, limits.noseAngle.min, limits.noseAngle.max);
  const noseScore = (x: readonly number[]) =>
    score(gapBetween(noseFilePacked, packLine(drawnOutline(noseSpec(x)).filter((p) => p[0] >= wideStation - 1e-6))));
  const noseUnit = toUnit(noseSeed, limits.noseAngle);
  let nose = nelderMead(noseScore, [noseUnit, 0.3, 0.5]);
  const noseAgain = nelderMead(noseScore, [noseUnit, 0.7, 0.5]);
  if (noseAgain.value < nose.value) nose = noseAgain;
  const withNose = noseSpec(nose.x);

  // Tail: a straight end standing on the stringer means a squash; the angle's seed is the chord along the rail from there.
  const endHalf = lineHighestAt(file, 0);
  const railFromEnd = tailFile.filter(([x, y]) => !(x < 1e-6 && y < endHalf - 1e-6));
  const tailBack = railFromEnd.length > 0 ? pointAlong(railFromEnd, inchesToMm(1)) : ([0, endHalf] as P2);
  const tailSeed = clamp(Math.atan2(tailBack[1] - endHalf, tailBack[0]) * RAD_TO_DEG, limits.tailAngle.min, limits.tailAngle.max);
  const tailUnit = toUnit(tailSeed, limits.tailAngle);
  const blockMax = inchesToMm(limits.tailBlockIn.max);
  const tailSpec = (x: readonly number[], squash: boolean): OutlineSpec => ({
    ...withNose,
    tailAngle: degrees(fromUnit(x[0], limits.tailAngle)),
    tailFullness: fromUnit(x[1], limits.fullness),
    tailRailLength: fromUnit(x[2], limits.railLength),
    tail: squash ? { kind: "squash", endWidth: mm(clamp(x[3], 0, 1) * blockMax) } : { kind: "round" },
  });
  const tailFamily = (squash: boolean, target: PackedLine = tailFilePacked) => {
    const tailScore = (x: readonly number[]) =>
      score(gapBetween(target, packLine(drawnOutline(tailSpec(x, squash)).filter((p) => p[0] <= wideStation + 1e-6))));
    const endUnit = clamp((2 * endHalf) / blockMax, 0, 1);
    const starts = squash ? [[tailUnit, 0.3, 0.5, endUnit], [tailUnit, 0.7, 0.5, endUnit]] : [[tailUnit, 0.3, 0.5], [tailUnit, 0.7, 0.5]];
    const runs = starts.map((start) => nelderMead(tailScore, start));
    return runs[0].value <= runs[1].value ? runs[0] : runs[1];
  };
  // A file whose outline steps in on the way to the tail has a wing (or two): the tail is then fitted around them.
  const fileWings = findBrdWings(file);
  if (fileWings.length > 0) {
    const spec = fitTailAroundWings({
      length: mm(length),
      wideStation,
      file,
      tailFile,
      tailFilePacked,
      endHalf,
      tailSpec,
      tailFamily,
      fileWings,
      namePointed: (unit) => {
        // A pointed tail is called pin or round by whichever preset's angle is nearer: the geometry draws the two alike.
        const angle = fromUnit(unit, limits.tailAngle);
        return Math.abs(angle - TAIL_PRESETS.pin.tailAngle) <= Math.abs(angle - TAIL_PRESETS.round.tailAngle) ? "pin" : "round";
      },
      fromUnit,
      toUnit,
    });
    return { spec, drawn: drawnOutline(spec), fileWings };
  }

  const pointed = tailFamily(false);
  const squashed = tailFamily(true);
  const useSquash = endHalf > 1 ? true : squashed.value < pointed.value - 0.1;
  let spec: OutlineSpec;
  if (useSquash) {
    spec = tailSpec(squashed.x, true);
  } else {
    // A pointed tail is called pin or round by whichever preset's angle is nearer: the geometry draws the two alike.
    const angle = fromUnit(pointed.x[0], limits.tailAngle);
    const kind = Math.abs(angle - TAIL_PRESETS.pin.tailAngle) <= Math.abs(angle - TAIL_PRESETS.round.tailAngle) ? "pin" : "round";
    spec = { ...tailSpec(pointed.x, false), tail: { kind } };
  }
  return { spec, drawn: drawnOutline(spec), fileWings: [] };
}

/** What the winged tail fit needs from `fitOutline`: the file's tail half, the tail's own spec builder and its search. */
interface TailAroundWings {
  length: Mm;
  wideStation: number;
  file: readonly P2[];
  /** The file's points up to its wide point: the indices in `fileWings` index this. */
  tailFile: readonly P2[];
  tailFilePacked: PackedLine;
  endHalf: number;
  tailSpec: (x: readonly number[], squash: boolean) => OutlineSpec;
  tailFamily: (squash: boolean, target?: PackedLine) => { x: number[]; value: number };
  fileWings: readonly BrdFileWing[];
  namePointed: (angleUnit: number) => "pin" | "round";
  fromUnit: (unit: number, range: { min: number; max: number }) => number;
  toUnit: (value: number, range: { min: number; max: number }) => number;
}

/** Rounds of "fit the wings with the curve held, then refit the curve to what those wings leave": the best round is kept. */
const WING_FIT_ROUNDS = 3;

/**
 * The tail, and our wings, fitted to a file whose outline has wings (quick 261113-hyy). The app draws a wing by taking its
 * depth out of the curve behind it, fading linearly to nothing at the tail pod (construction A, `wings.ts`): ahead of the
 * wing the outline IS the curve, behind it the curve less the wing's take. So the honest target is that the curve PLUS our
 * wings, drawn by the app's own `buildOutline`, lies on the file's outline end to end, and the curve is fitted to the outline
 * above the wing and to the tail block, never through the step:
 *  1. The file with the wing taken back out (its depth added back, fading to nothing at the tail like the app's own) is a
 *     smooth outline: the curve is fitted to that, both tail families as for any file.
 *  2. Our wings are seeded where the file's are, their depths from what that curve stands above the file at each wing's inner
 *     corner, and polished against the file's tail half with the curve held.
 *  3. The curve is then refitted to what the polished wings leave behind them (the file's points the wings no longer cover,
 *     lifted by exactly what the app takes there), and the wings polished again; three rounds, the best-scoring kept. The
 *     polish alone gets a single wing right but two wings wander; refitting the curve from the wings fixes that.
 * Measured on the Fryer squash twin's flyer: the file's wing 7 7/16" off the tail, 1/4" deep, 3/8" run; ours 7 3/8", 1/4",
 * 3/8"; the outline's widest gap falls from 2.75 mm to 1.29 mm (what is left is the squash tail's rounded corner against ours
 * square, the same limit a wingless squash has). Every wing opens with sharp corners (radius 0), no fin lock and its values as
 * found, never rounded to the slider's grid: fitting the radius was tried and gained under 0.01 mm on the Fryer and was not
 * stable on the app's own rounded wings (it trades against run and position).
 */
function fitTailAroundWings(c: TailAroundWings): OutlineSpec {
  const { fileWings, tailFile, wideStation } = c;
  const geometry = { length: c.length, widePointStation: mm(wideStation) };
  const range = (r: { min: number; max: number }) => ({ min: inchesToMm(r.min), max: inchesToMm(r.max) });
  const stationRange = { min: inchesToMm(WING_POSITION_MIN_IN), max: wingPositionTop(geometry) };
  const depthRange = range(WING_DEPTH_RANGE_IN);
  const runRange = range(WING_RUN_RANGE_IN);
  const unit = (v: number, r: { min: number; max: number }) => clamp(c.toUnit(v, r), 0, 1);

  /** Our wings from three unit numbers each, inside the sliders' ranges and the order rule. */
  const wingsOf = (u: readonly number[]): Wing[] => [
    ...clampWingStations(
      fileWings.map((_, k) => ({
        station: mm(c.fromUnit(u[3 * k], stationRange)),
        depth: mm(c.fromUnit(u[3 * k + 1], depthRange)),
        run: mm(c.fromUnit(u[3 * k + 2], runRange)),
        radius: mm(0),
        lock: null,
        finOffset: mm(0),
      })),
      geometry,
    ),
  ];

  /**
   * The tail half's points less every wing's step and footprint: for wing k, each point before its outer corner that is
   * either at or past its inner corner (by index) or nose-ward of `low[k]` less a millimetre. The outer corner's own point
   * stays (a square step's two points share one station: only the index tells them apart).
   */
  const keep = (low: readonly number[]): P2[] =>
    tailFile.filter(([x], i) => !fileWings.some((w, k) => i < w.outerIndex && (i >= w.innerIndex || x >= low[k] - 1)));

  const score = (g: Closeness) => g.largest + g.typical;
  const tailGap = (target: PackedLine, spec: OutlineSpec) => gapBetween(target, packLine(drawnOutline(spec).filter((p) => p[0] <= wideStation + 1e-6)));

  // 1. The file with our wings taken back out: each kept point lifted by the wings' depths, fading to nothing at the tail.
  const lifted = keep(fileWings.map((w) => w.inner)).map(([x, y]): P2 => [
    x,
    y + fileWings.reduce((sum, w) => sum + (x <= w.inner ? (w.depth * x) / w.inner : 0), 0),
  ]);
  const base = packLine(lifted);
  const pointed = c.tailFamily(false, base);
  const squashed = c.tailFamily(true, base);
  const squash = c.endHalf > 1 ? true : squashed.value < pointed.value - 0.1;
  let xs = [...(squash ? squashed.x : pointed.x)];

  // 2. Seeds: the depth each wing must take, so that the curve less the wings stands on the file at the wing's inner corner.
  const curve = drawnOutline(c.tailSpec(xs, squash));
  const depths: number[] = [];
  fileWings.forEach((w) => {
    const before = depths.reduce((sum, d, j) => sum + d * Math.min(1, w.inner / fileWings[j].inner), 0);
    depths.push(clamp(lineHighestAt(curve, w.inner) - before - lineHighestAt(c.file, w.inner), depthRange.min, depthRange.max));
  });
  let u = fileWings.flatMap((w, k) => [
    unit(w.station, stationRange),
    unit(depths[k], depthRange),
    unit(clamp(w.run, runRange.min, runRange.max), runRange),
  ]);

  // 3. Polish the wings with the curve held, then refit the curve to what they leave; keep the best round.
  let best: { value: number; xs: number[]; u: number[] } | null = null;
  for (let round = 0; round < WING_FIT_ROUNDS; round++) {
    const held = c.tailSpec(xs, squash);
    const polished = nelderMead((x) => score(tailGap(c.tailFilePacked, { ...held, wings: wingsOf(x) })), u);
    u = polished.x;
    if (!best || polished.value < best.value) best = { value: polished.value, xs: [...xs], u: [...u] };
    if (round === WING_FIT_ROUNDS - 1) break;
    const wings = wingsOf(u);
    const drawn = buildOutline({ ...held, wings });
    const feet = wings.map((w) => wingFootprint(w).inner);
    const behind = keep(fileWings.map((w, k) => Math.min(feet[k], w.inner))).map(([x, y]): P2 => [x, y + wingTakeAt(drawn, mm(x))]);
    const target = packLine(behind);
    xs = nelderMead((x) => score(tailGap(target, c.tailSpec(x, squash))), xs).x;
  }
  const answer = best as { value: number; xs: number[]; u: number[] };
  const spec: OutlineSpec = { ...c.tailSpec(answer.xs, squash), wings: wingsOf(answer.u) };
  return squash ? spec : { ...spec, tail: { kind: c.namePointed(answer.xs[0]) } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Rocker and thickness
// ---------------------------------------------------------------------------------------------------------------------

function fitSideProfile(lines: BrdLines, stringerLift?: (station: Mm) => number): {
  rocker: FiveStationRocker;
  foil: FoilSpec;
  centre: number;
  bottom: P2[];
  deck: P2[];
  rockerCloseness: Closeness;
  thicknessCloseness: Closeness;
  stringerLift: Record<RockerStationKey, Mm>;
} {
  const length = lines.length;
  const { deck } = lines;
  // The file's bottom is its finished stringer. The board is planed lower than that by our concaves' lift there (see the
  // header); with no lift the lines are the file's own, untouched.
  const liftAt = (s: number): number => (stringerLift ? stringerLift(mm(s)) : 0);
  const bottom: readonly P2[] = stringerLift ? lines.bottom.map(([x, y]): P2 => [x, y - liftAt(x)]) : lines.bottom;
  const inch = inchesToMm(1);
  const twelve = MEASURE_STATION_MM;
  const liftRange = { min: inchesToMm(ROCKER_LIFT_RANGE_IN.min), max: inchesToMm(ROCKER_LIFT_RANGE_IN.max) };
  const thicknessRange = { min: inchesToMm(FOIL_THICKNESS_RANGE_IN.min), max: inchesToMm(FOIL_THICKNESS_RANGE_IN.max) };

  const stations = Object.fromEntries(rockerStationPositions(mm(length)).map(({ key, station }) => [key, station])) as Record<
    "tailTip" | "tail12" | "center" | "nose12" | "noseTip",
    Mm
  >;
  const centre = lineLowestAt(bottom, stations.center);
  const fileLift = (s: number) => lineLowestAt(bottom, s) - centre;
  const fileThickness = (s: number) => lineHighestAt(deck, s) - lineLowestAt(bottom, s);
  const lift = (s: number) => mm(clamp(fileLift(s), liftRange.min, liftRange.max));
  const thick = (s: number) => mm(clamp(fileThickness(s), thicknessRange.min, thicknessRange.max));

  // The centre and the 12" stations straight off the file; the tips start at the file's last-inch figure and are refitted.
  const rocker: FiveStationRocker = {
    tailTip: lift(stations.tailTip),
    tail12: lift(stations.tail12),
    nose12: lift(stations.nose12),
    noseTip: lift(stations.noseTip),
  };
  const foil: FoilSpec = {
    tailTip: thick(stations.tailTip),
    tail12: thick(stations.tail12),
    center: thick(stations.center),
    nose12: thick(stations.nose12),
    noseTip: thick(stations.noseTip),
  };

  // Each tip: the one figure that follows the file best over the stretch from 1" to 12" in from it, the rest held.
  const tipStations = (tip: "tailTip" | "noseTip") => {
    const out: number[] = [];
    for (let k = 0; k <= TIP_FIT_SAMPLES; k++) {
      const d = inch + (k / TIP_FIT_SAMPLES) * (twelve - inch);
      out.push(tip === "tailTip" ? d : length - d);
    }
    return out;
  };
  for (const tip of ["tailTip", "noseTip"] as const) {
    const sample = tipStations(tip);
    foil[tip] = mm(
      goldenSection(
        (value) => {
          const profile = buildFallbackProfile(rocker, { ...foil, [tip]: mm(value) }, mm(length));
          return Math.max(...sample.map((s) => Math.abs(fileThickness(s) - profile.thicknessAt(mm(s)))));
        },
        thicknessRange.min,
        thicknessRange.max,
      ),
    );
  }
  for (const tip of ["tailTip", "noseTip"] as const) {
    const sample = tipStations(tip);
    rocker[tip] = mm(
      goldenSection(
        (value) => {
          const profile = buildFallbackProfile({ ...rocker, [tip]: mm(value) }, foil, mm(length));
          return Math.max(...sample.map((s) => Math.abs(fileLift(s) - profile.rockerAt(mm(s)))));
        },
        liftRange.min,
        liftRange.max,
      ),
    );
  }

  // Our drawn lines, and how far they lie from the file's, the inch at each tip left out. Our bottom is drawn as the
  // finished stringer (the planed one plus the lift there); the deck is the planed one, which is the finished deck.
  const profile = buildFallbackProfile(rocker, foil, mm(length));
  const ourBottom: P2[] = [];
  const ourDeck: P2[] = [];
  for (let i = 0; i <= DRAWN_STATIONS; i++) {
    const s = (length * i) / DRAWN_STATIONS;
    const low = centre + profile.rockerAt(mm(s));
    ourBottom.push([s, stringerLift ? low + liftAt(s) : low]);
    ourDeck.push([s, low + profile.thicknessAt(mm(s))]);
  }
  // The gaps are between FINISHED stringers: the file's own lines against ours with its lift put back.
  const fileBottom = lines.bottom;
  const finishedThickness = (s: number) => lineHighestAt(deck, s) - lineLowestAt(fileBottom, s);
  const worst = { rocker: { largest: 0, sum: 0, at: 0 }, thickness: { largest: 0, sum: 0, at: 0 } };
  let counted = 0;
  for (let i = 0; i <= CLOSENESS_STEPS; i++) {
    const s = (length * i) / CLOSENESS_STEPS;
    if (s < BRD_FIT_TIP_SKIP_MM || s > length - BRD_FIT_TIP_SKIP_MM) continue;
    counted++;
    const finished = stringerLift ? liftAt(s) : 0;
    const rockerGap = Math.abs(lineLowestAt(fileBottom, s) - (centre + profile.rockerAt(mm(s)) + finished));
    const thicknessGap = Math.abs(finishedThickness(s) - (profile.thicknessAt(mm(s)) - finished));
    worst.rocker.sum += rockerGap;
    worst.thickness.sum += thicknessGap;
    if (rockerGap > worst.rocker.largest) worst.rocker = { ...worst.rocker, largest: rockerGap, at: s };
    if (thicknessGap > worst.thickness.largest) worst.thickness = { ...worst.thickness, largest: thicknessGap, at: s };
  }
  const closeness = (w: { largest: number; sum: number; at: number }): Closeness => ({
    largest: mm(w.largest),
    typical: mm(counted > 0 ? w.sum / counted : 0),
    at: mm(w.at),
  });
  return {
    rocker,
    foil,
    centre,
    bottom: ourBottom,
    deck: ourDeck,
    rockerCloseness: closeness(worst.rocker),
    thicknessCloseness: closeness(worst.thickness),
    stringerLift: Object.fromEntries(
      rockerStationPositions(mm(length)).map(({ key, station }) => [key, mm(stringerLift ? liftAt(station) : 0)]),
    ) as Record<RockerStationKey, Mm>,
  };
}

/**
 * The closest board the controls can make to the board in `lines`, and how close it gets: see the file's header. Never
 * throws for lines a reader has accepted; the search budgets are fixed, so the time is the same whatever the file holds.
 */
export function fitBoardToBrd(given: BrdLines, stringerLift?: (station: Mm) => number): BrdFit {
  // One length for both fits, always one the controls can make.
  const lines = { ...given, length: mm(clamp(given.length, inchesToMm(BOARD_LENGTH_RANGE_IN.min), inchesToMm(BOARD_LENGTH_RANGE_IN.max))) };
  const outline = fitOutline(lines);
  const side = fitSideProfile(lines, stringerLift);
  return {
    outline: outline.spec,
    rocker: side.rocker,
    foil: side.foil,
    lines: { outline: outline.drawn, bottom: side.bottom, deck: side.deck },
    closeness: {
      outline: polylineGap(lines.outline, outline.drawn),
      rocker: side.rockerCloseness,
      thickness: side.thicknessCloseness,
    },
    stringerLift: side.stringerLift,
    fileWings: outline.fileWings,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The file's own figures (quick 261113-et0, E3)
// ---------------------------------------------------------------------------------------------------------------------

/** A tip thinner (or an outline narrower) than this at its very end comes to a point: there is no end a blank could match. */
export const BRD_POINT_MM = inchesToMm(1 / 16);

/** The two stations a straightedge is laid along when a tip comes to a point: 1" and 2" in from the tip. */
export const BRD_STRAIGHTEDGE_MM: { near: Mm; far: Mm } = { near: inchesToMm(1), far: inchesToMm(2) };

/** The file's lift and thickness at one of the app's five rocker stations. */
export interface BrdFileStation {
  key: RockerStationKey;
  station: Mm;
  /** Lift off the centre's low point (the app's own measure); the centre is exactly 0. */
  lift: Mm;
  thickness: Mm;
  /** Tips only: the very end's own figures when the tip comes to a point (`lift` and `thickness` are then the straight-on ones). */
  point: { lift: Mm; thickness: Mm } | null;
}

/**
 * The file's own rocker and thickness at the app's five stations, tail to nose, read off its bottom and deck lines the way the
 * app measures rocker. The centre and the two 12" stations are read as they stand; a tip is read at its very end, except a tip
 * that comes to a point (thinner than `BRD_POINT_MM` there), where the bottom and the deck are carried straight on from 2" and
 * 1" in, thickness never below nothing, and the point's own figures are kept in `point`. Nothing else is clamped: these are the
 * file's figures, not ones a slider must be able to hold.
 */
export function brdFileStations(lines: Pick<BrdLines, "length" | "bottom" | "deck">): BrdFileStation[] {
  const length = lines.length;
  const centre = lineLowestAt(lines.bottom, length / 2);
  const lift = (s: number) => lineLowestAt(lines.bottom, s) - centre;
  const thick = (s: number) => lineHighestAt(lines.deck, s) - lineLowestAt(lines.bottom, s);
  return rockerStationPositions(mm(length)).map(({ key, station }): BrdFileStation => {
    if (key === "center") return { key, station, lift: mm(0), thickness: mm(thick(station)), point: null };
    if (key !== "tailTip" && key !== "noseTip") return { key, station, lift: mm(lift(station)), thickness: mm(thick(station)), point: null };
    // Distance from the tip, so one rule serves both ends.
    const at = (d: number) => (key === "tailTip" ? d : length - d);
    const end = { lift: mm(lift(at(0))), thickness: mm(thick(at(0))) };
    if (end.thickness >= BRD_POINT_MM) return { key, station, lift: end.lift, thickness: end.thickness, point: null };
    const { near, far } = BRD_STRAIGHTEDGE_MM;
    return {
      key,
      station,
      lift: mm(2 * lift(at(near)) - lift(at(far))),
      thickness: mm(Math.max(0, 2 * thick(at(near)) - thick(at(far)))),
      point: end,
    };
  });
}

/** The widths a shaper quotes, all full widths: 12" in from each end, the wide point and where it sits, and the tail's end. */
export interface BrdOutlineWidths {
  nose12: Mm;
  wide: Mm;
  /** The wide point's station less half the length: plus toward the nose, minus toward the tail. */
  wideOffset: Mm;
  tail12: Mm;
  /** The straight end's full width, or null when the outline closes to the stringer (no flat end). */
  tailEnd: Mm | null;
}

/** The file's widths, off its outline. */
export function brdFileWidths(lines: Pick<BrdLines, "length" | "outline">): BrdOutlineWidths {
  const length = lines.length;
  let half = 0;
  let wideAt = 0;
  for (const [x, y] of lines.outline) {
    if (y > half) {
      half = y;
      wideAt = x;
    }
  }
  const end = 2 * lineHighestAt(lines.outline, 0);
  return {
    nose12: mm(2 * lineHighestAt(lines.outline, length - MEASURE_STATION_MM)),
    wide: mm(2 * half),
    wideOffset: mm(wideAt - length / 2),
    tail12: mm(2 * lineHighestAt(lines.outline, MEASURE_STATION_MM)),
    tailEnd: end < BRD_POINT_MM ? null : mm(end),
  };
}

/** Our fit's widths, off the outline the controls draw: the same five figures as `brdFileWidths`. */
export function fitOutlineWidths(spec: OutlineSpec): BrdOutlineWidths {
  const g = buildOutline(spec);
  const end = 2 * g.points[0].halfWidth;
  return {
    nose12: g.noseWidthAt12in,
    wide: mm(2 * g.halfWidePointWidth),
    wideOffset: mm(g.widePointStation - spec.length / 2),
    tail12: g.tailWidthAt12in,
    tailEnd: end < BRD_POINT_MM ? null : mm(end),
  };
}

/** Which way the file's outline lies from ours at a station: wider (it stands out past ours), narrower, or null when they agree. */
export function outlineGapSide(file: readonly P2[], ours: readonly P2[], at: number): "wider" | "narrower" | null {
  const diff = lineHighestAt(file, at) - lineHighestAt(ours, at);
  if (Math.abs(diff) < 0.01) return null;
  return diff > 0 ? "wider" : "narrower";
}
