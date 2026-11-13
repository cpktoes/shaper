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
 * Nothing is rounded here: rounding is for what is shown (the founder's standing rule). Pure: no React, browser or
 * database import (CLAUDE.md Rule 1); all lengths are millimetres.
 */
import type { P2 } from "./bezier-fit";
import { BOARD_LENGTH_RANGE_IN, TAIL_PRESETS, WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec } from "./board";
import { buildFallbackProfile } from "./board-profile";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "./foil";
import { MEASURE_STATION_MM, buildOutline } from "./outline";
import { OUTLINE_SLIDER_LIMITS } from "./outline-drag";
import { ROCKER_LIFT_RANGE_IN, rockerStationPositions, type FiveStationRocker } from "./rocker";
import { degrees, inchesToMm, mm, type Mm } from "./units";

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
  const tailFamily = (squash: boolean) => {
    const tailScore = (x: readonly number[]) =>
      score(gapBetween(tailFilePacked, packLine(drawnOutline(tailSpec(x, squash)).filter((p) => p[0] <= wideStation + 1e-6))));
    const endUnit = clamp((2 * endHalf) / blockMax, 0, 1);
    const starts = squash ? [[tailUnit, 0.3, 0.5, endUnit], [tailUnit, 0.7, 0.5, endUnit]] : [[tailUnit, 0.3, 0.5], [tailUnit, 0.7, 0.5]];
    const runs = starts.map((start) => nelderMead(tailScore, start));
    return runs[0].value <= runs[1].value ? runs[0] : runs[1];
  };
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
  return { spec, drawn: drawnOutline(spec) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Rocker and thickness
// ---------------------------------------------------------------------------------------------------------------------

function fitSideProfile(lines: BrdLines): {
  rocker: FiveStationRocker;
  foil: FoilSpec;
  centre: number;
  bottom: P2[];
  deck: P2[];
  rockerCloseness: Closeness;
  thicknessCloseness: Closeness;
} {
  const length = lines.length;
  const { bottom, deck } = lines;
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

  // Our drawn lines, and how far they lie from the file's, the inch at each tip left out.
  const profile = buildFallbackProfile(rocker, foil, mm(length));
  const ourBottom: P2[] = [];
  const ourDeck: P2[] = [];
  for (let i = 0; i <= DRAWN_STATIONS; i++) {
    const s = (length * i) / DRAWN_STATIONS;
    const low = centre + profile.rockerAt(mm(s));
    ourBottom.push([s, low]);
    ourDeck.push([s, low + profile.thicknessAt(mm(s))]);
  }
  const worst = { rocker: { largest: 0, sum: 0, at: 0 }, thickness: { largest: 0, sum: 0, at: 0 } };
  let counted = 0;
  for (let i = 0; i <= CLOSENESS_STEPS; i++) {
    const s = (length * i) / CLOSENESS_STEPS;
    if (s < BRD_FIT_TIP_SKIP_MM || s > length - BRD_FIT_TIP_SKIP_MM) continue;
    counted++;
    const rockerGap = Math.abs(lineLowestAt(bottom, s) - (centre + profile.rockerAt(mm(s))));
    const thicknessGap = Math.abs(fileThickness(s) - profile.thicknessAt(mm(s)));
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
  };
}

/**
 * The closest board the controls can make to the board in `lines`, and how close it gets: see the file's header. Never
 * throws for lines a reader has accepted; the search budgets are fixed, so the time is the same whatever the file holds.
 */
export function fitBoardToBrd(given: BrdLines): BrdFit {
  // One length for both fits, always one the controls can make.
  const lines = { ...given, length: mm(clamp(given.length, inchesToMm(BOARD_LENGTH_RANGE_IN.min), inchesToMm(BOARD_LENGTH_RANGE_IN.max))) };
  const outline = fitOutline(lines);
  const side = fitSideProfile(lines);
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
  };
}
