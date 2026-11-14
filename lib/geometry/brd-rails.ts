/**
 * The closest rails RAILS' own controls make to the rails of a board read from a `.brd` (quick 261113-kvo; the founder,
 * 2026-11-13: "It looks promising, so we should then try to fit bottom contours and rail shapes too", and, on what the fit
 * is balancing: "the rocker is tricky because we're trying to balance a foil without contours and square rails with a
 * finished boards rocker along the stringer").
 *
 * In a shaper's words, what it does:
 *  1. **Looks at three places.** RAILS bands three rails: the tail 12", the centre and the nose 12". The file's own
 *     cross-section nearest each of those (never one within an inch of a tip, each section used once) is the rail to match.
 *  2. **Measures against our board, not an empty rail.** Each trial rail is laid into the board that will open (its outline,
 *     rocker, foil and bottom) through the app's own `boardSections`, the very ring the litres, the 3D board and the `.brd`
 *     writer read, so a rail is judged as it will actually sit. How far apart two rails are is the largest gap plus the
 *     typical gap, measured both ways, over the rail region only: the outer 3" of the bottom, round the widest point and over
 *     the whole deck to the stringer (`BRD_RAIL_STRIP_MM`). The inner bottom belongs to BOTTOM.
 *  3. **Tries RAILS' own controls on RAILS' own steps** (nothing here restates a slider's range): a grid of Ratio and Deck
 *     Profile with Symmetrical off and on, then each tuck box on the best three; then, one control at a time, Ratio, Deck
 *     Profile, Family, the boxes, and the Advanced menu (Scaled from center by on the tips, the six nudges, the Domed Deck Band
 *     most of all). A control moves off a new board's value only when that brings the rail at least 0.1 mm closer
 *     (`BRD_RAIL_MOVE_GAIN_MM`), and afterwards anything off a new board's value that can go back for 0.1 mm or less does
 *     (`BRD_RAIL_PRUNE_MM`), so a setting the file cannot see stays where a new board puts it.
 *  4. **Lines the tips up with the centre when that is closer.** Where a tip's Family or boxes differ from the centre's, RAILS
 *     blends one into the other between the stations, and a nose fitted Symmetrical against a centre that is not puts a
 *     little Symmetrical rail into the centre's section a few inches ahead of it (measured on the Egg: 3.88 mm off, 2.07 mm
 *     once the nose took the centre's boxes). So each tip is also tried with the centre's Family and boxes, and the variant
 *     with the fewest differences is kept unless another is a tenth of a millimetre closer over the whole board
 *     (`BRD_RAIL_ALIGN_PREFER_MM`).
 *  5. **Tells the bottom where our rail begins.** The bottom is read out to nine-tenths of the way to the rail
 *     (`BRD_BOTTOM_WINDOW`), but a soft rolled rail starts well inside that and then reads as a belly. Where our finished rail
 *     meets a flat bottom more than 1/4" inside the nine-tenths line (`BRD_RAIL_NARROW_MIN_MM`), that section's reading
 *     width stops there (`brdRailWindows`) and the bottom is read again on those widths.
 *  6. **Two orders, the closer wins** (`lib/export/brd-fit-preview.ts`): the bottom first and then the rails (the usual), and,
 *     only when that leaves some whole section more than 4 mm off with a vee or a belly read (`BRD_RAIL_FIRST_TRY_MM`),
 *     the rails first on a flat bottom. The order decides who claims a rise near the rail: a bottom read first takes a soft
 *     50/50 rail for a belly (the founder's longboard), and a rail fitted first takes a rolled-in bottom edge for rail (the
 *     Scoop Noserider: 3.22 mm became 7.58 mm), so the bottom's reading is kept unless the rail's is clearly closer
 *     (`BRD_RAIL_FIRST_GAIN_MM`, 0.25 mm over the whole section, bottom and rail together).
 *
 * What the model cannot follow (findings, with the number, not failures): a deck crowned right across (RAILS' deck is flat
 * inside the Domed Deck Band; the Egg's nose deck keeps falling from the stringer, so Deck Profile runs to its 75% floor
 * and the dome to its limit and the rail is still 2.07 mm off); between the three stations (our rail blends straight from one
 * station's numbers to the next, while the Scoop's own sections between its centre and nose are 3.22 mm off); a board built
 * on a blank (its thickness curve is the blank's, the fit opens a hand-set five-station foil, so about 5 mm on a long
 * board); the tail's Rail Blends From and Ends At (an AkuShaper file's few sections cannot show where a tail's rail blends,
 * so they stay where a new board puts them); and settings that draw nearly the same rail (Family against Apex Thickness,
 * the scale against the deck marks), so the shape is what is stood behind, and the words may differ from the board's own.
 *
 * Pure: no React, browser, database or `lib/export` import (CLAUDE.md Rule 1); every length is millimetres, every inch figure
 * goes through `inchesToMm`, nothing is rounded (the controls' own steps are grids, not rounding).
 */
import type { P2 } from "./bezier-fit";
import type { BoardBottom } from "./bottom";
import { bottomHasCut } from "./bottom";
import { ghostRail } from "./bottom-draw";
import { BRD_BOTTOM_WINDOW } from "./brd-bottom";
import type { BrdFit } from "./brd-fit";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  LIVE_DESIGN_RULES,
  railAnchorStations,
} from "./design";
import type { FinPlacementSpec } from "./fins";
import type { FoilSpec } from "./foil";
import { buildOutline, MEASURE_STATION_MM } from "./outline";
import {
  DEFAULT_RAIL_BAND_SPEC,
  RAIL_NUDGE_KEYS,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_STEP_IN,
  RAIL_RATIO_RANGE,
  RAIL_SCALE_RANGE,
  DECK_PERCENT_MIN,
  ZERO_RAIL_NUDGES,
  deckProfileSliderStep,
  type RailBandSpec,
  type RailFamily,
  type RailMarkNudges,
  type RailSectionKey,
  type RailSectionSpec,
} from "./rail-bands";
import { inchesToMm, mm, mmToInches, type Mm } from "./units";
import { boardSections, type CrossSectionVolumeInput, type RailAnchorStations } from "./volume";

/* ============ the constants (each one measured; see the header) ============ */

/** The rail region: the outer 3" of the bottom, round the widest point and over the whole deck. Measured on four AkuShaper files and two of the app's own: the rail's own shape starts within 3" of the widest point on every one. */
export const BRD_RAIL_STRIP_MM: Mm = inchesToMm(3);
/** The file's half section is sampled this finely (steps a span) before it is resampled: finer than the 16 the reader keeps for the preview. */
export const BRD_RAIL_SAMPLE_STEPS = 48;
/** The file's half is resampled by arc length to this many points, so a long gentle stretch weighs the same as a tight rail. */
export const BRD_RAIL_TARGET_POINTS = 120;
/** A control moves off a new board's value only when that brings the rail at least this much closer (the bottom fit's own bar). */
export const BRD_RAIL_MOVE_GAIN_MM: Mm = mm(0.1);
/** After the moves, a setting off a new board's value goes back when that costs no more than this. */
export const BRD_RAIL_PRUNE_MM: Mm = mm(0.1);
/** A tip takes the centre's Family and boxes unless another variant is more than this closer over the whole board. */
export const BRD_RAIL_ALIGN_PREFER_MM: Mm = mm(0.1);
/** A section's bottom window narrows only when our rail begins more than this inside the usual nine-tenths line (1/4"). */
export const BRD_RAIL_NARROW_MIN_MM: Mm = inchesToMm(1 / 4);
/** Rails-first is tried only when the bottom-first board leaves some whole section more than this off. */
export const BRD_RAIL_FIRST_TRY_MM: Mm = mm(4);
/** Rails-first is chosen only when it is at least this much closer over the whole sections (bottom and rail together). */
export const BRD_RAIL_FIRST_GAIN_MM: Mm = mm(0.25);

/** The deck's meeting with the rail: a gap within this of the widest point is "at the rail" (1/4"). */
const RAIL_AT_MM: Mm = inchesToMm(1 / 4);
/** Rounds of main moves, and of Advanced-then-main moves, before a search stops. */
const MOVE_ROUNDS = 6;
/** The Ratio grid's coarse spacing, and the Deck Profile grid's, as a share of its range (percent): the seed. */
const SEED_RATIO_STEP = 5;
const SEED_DECK_SHARE = 5;
/** How many of the seed's best grid points have each tuck combination tried on them. */
const SEED_BEST = 3;
/** A trial counts as closer only by more than this (rounding noise). */
const NOISE = 1e-12;
/** A rail with no foam (a section too narrow to stand on) scores as no match at all. */
const NO_MATCH = Infinity;
/** The nudge steps tried, in 1/16" steps; the Domed Deck Band also tries 16 (its range is a thousand times a step wider). */
const NUDGE_TRIES = [1, 2, 4, 8] as const;
const DOME_TRIES = [1, 2, 4, 8, 16] as const;
/** "Scaled from center by" moves tried (tips only). */
const SCALE_TRIES = [-0.15, -0.1, -0.05, 0.05] as const;

const KEYS: readonly RailSectionKey[] = ["nose", "center", "tail"];

/* ============ what a rail setting is ============ */

/** The file's half section: stringer bottom first, round the widest point, to the deck at the stringer; heights are from the stringer bottom. */
export interface BrdRailLine {
  station: Mm;
  points: readonly P2[];
}

/** One rail's settings, every one a control RAILS has. `hardEdge` belongs to the tail alone; the centre's `scale` is always 1. */
export interface BrdRailSetting {
  family: RailFamily;
  ratio: number;
  deckPercent: number;
  symmetrical: boolean;
  singleTuck: boolean;
  sharpBottomTuck: boolean;
  hardEdge: boolean;
  scale: number;
  nudges: RailMarkNudges;
}
export type BrdRailSettings = Record<RailSectionKey, BrdRailSetting>;

/** What a new board starts a rail with: Family 3, 60/40, Deck Profile 100%, nothing ticked, the tail's Hard Edge on, every nudge 0. */
export function newBoardRailSetting(key: RailSectionKey): BrdRailSetting {
  const section = DEFAULT_RAIL_BAND_SPEC[key];
  return {
    family: section.family,
    ratio: section.ratioTopPercent,
    deckPercent: section.deckPercent,
    symmetrical: section.symmetrical,
    singleTuck: section.singleTuck,
    sharpBottomTuck: section.sharpBottomTuck,
    hardEdge: key === "tail" ? DEFAULT_RAIL_BAND_SPEC.tailHardEdge : false,
    scale: section.scaleFromCenter,
    nudges: { ...ZERO_RAIL_NUDGES },
  };
}

const FOIL_KEY: Record<RailSectionKey, "nose12" | "center" | "tail12"> = { nose: "nose12", center: "center", tail: "tail12" };

/** The rails a fit opens with: each anchor's section on a new board's, with the fitted controls and the foil's thickness there. */
export function brdRailsSpec(settings: BrdRailSettings, foil: FoilSpec): RailBandSpec {
  const hardEdge = settings.tail.hardEdge;
  const section = (key: RailSectionKey): RailSectionSpec => {
    const s = settings[key];
    const off = key === "tail" && hardEdge;
    return {
      ...DEFAULT_RAIL_BAND_SPEC[key],
      boardThickness: foil[FOIL_KEY[key]],
      deckPercent: s.deckPercent,
      family: s.family,
      ratioTopPercent: s.ratio,
      symmetrical: off ? false : s.symmetrical,
      singleTuck: off ? false : s.singleTuck,
      sharpBottomTuck: off ? false : s.sharpBottomTuck,
      scaleFromCenter: key === "center" ? 1 : s.scale,
      nudges: { ...s.nudges },
    };
  };
  return { nose: section("nose"), center: section("center"), tail: section("tail"), tailHardEdge: hardEdge };
}

/** One setting put on all three anchors (the centre's scale 1): the section at any station is exactly that setting, no fade. */
function uniformRails(setting: BrdRailSetting, foil: FoilSpec): RailBandSpec {
  return brdRailsSpec({ nose: setting, center: setting, tail: setting }, foil);
}

/* ============ the board the rails are measured on ============ */

/** The board that opens: its cross-section input (rails swapped in per trial), its anchors, length and foil. */
export interface BrdRailBoard {
  input: CrossSectionVolumeInput;
  anchors: RailAnchorStations;
  length: Mm;
  foil: FoilSpec;
}

/**
 * The board `brdBoardFields` opens, as the litres and the 3D board read it: the fit's outline, rocker and foil, no blank, the
 * bottom when it cuts something. The rails fitted are measured on this board, bottom and all. `fins` are the fins fitted to a
 * file that carries them (quick 261113-qyz): the bottom's tail cut stands from the front fins, so the board the rails are
 * measured on has them in place; left out, a new board's fins as before. `brdRailBegins` calls this with no bottom at all, where
 * the fins change nothing.
 */
export function brdRailBoard(fit: Pick<BrdFit, "outline" | "rocker" | "foil">, bottom: BoardBottom | null, fins?: FinPlacementSpec): BrdRailBoard {
  const geometry = buildOutline(fit.outline);
  const profile = designSideProfile({ outline: fit.outline, rocker: fit.rocker, foil: fit.foil, blank: null }, LIVE_DESIGN_RULES);
  const board = designBottomBoard(fit.outline, geometry, profile, designFinPlacement({ outline: fit.outline, fins }));
  const cut = bottom && bottomHasCut(bottom) ? { bottom, board } : undefined;
  return {
    input: designCrossSectionInput(geometry, profile, DEFAULT_RAIL_BAND_SPEC, fit.outline.length, cut),
    anchors: railAnchorStations(profile.effectiveFoil, fit.outline.length),
    length: fit.outline.length,
    foil: profile.effectiveFoil,
  };
}

/** Our half section at `station` with `rails`, stringer bottom first, every height less the stringer bottom's; `[]` where there is no foam. */
export function brdOurRailHalf(board: BrdRailBoard, rails: RailBandSpec, station: Mm): P2[] {
  const ring = ghostRail(boardSections({ ...board.input, rails }, [station]), station);
  if (!ring || ring.length === 0) return [];
  const half = [...ring].reverse();
  const base = half[0][1];
  return half.map(([x, y]): P2 => [x, y - base]);
}

/* ============ how close two rails are ============ */

/** The widest point of a half: the first point holding the largest x. */
function apexOf(half: readonly P2[]): number {
  let apex = 0;
  for (let k = 1; k < half.length; k++) if (half[k][0] > half[apex][0]) apex = k;
  return apex;
}

/** The rail region of a half: from the first bottom-run point within `BRD_RAIL_STRIP_MM` of the widest point, to the end. */
export function brdRailRegion(half: readonly P2[]): P2[] {
  if (half.length === 0) return [];
  const apex = apexOf(half);
  const reach = half[apex][0];
  let first = 0;
  while (first < apex && half[first][0] < reach - BRD_RAIL_STRIP_MM) first++;
  return half.slice(first) as P2[];
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  let t = length2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / length2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = px - (ax + t * dx);
  const ey = py - (ay + t * dy);
  return Math.sqrt(ex * ex + ey * ey);
}

/** A polyline's coordinates as two flat arrays, so the nearest-point search runs without chasing tuples. */
interface Poly {
  xs: Float64Array;
  ys: Float64Array;
}
const polyOf = (points: readonly P2[]): Poly => ({ xs: Float64Array.from(points, (p) => p[0]), ys: Float64Array.from(points, (p) => p[1]) });

/**
 * A point's nearest distance to a whole polyline. A segment is skipped when it lies wholly further away, on either axis, than
 * the nearest found so far (the search starts at the segment nearest `hint`, because the points of a half run in order and the
 * next point's nearest segment is almost always next to the last one's): the same answer as measuring every segment, a few
 * times faster. `hint` is updated to where this point's nearest segment was.
 */
function nearest(px: number, py: number, line: Poly, hint: { at: number }): number {
  const { xs, ys } = line;
  const last = xs.length - 1;
  if (last === 0) return Math.hypot(px - xs[0], py - ys[0]);
  const start = Math.min(Math.max(hint.at, 0), last - 1);
  let at = start;
  let best = segmentDistance(px, py, xs[start], ys[start], xs[start + 1], ys[start + 1]);
  for (let i = 0; i < last; i++) {
    const xa = xs[i] - px;
    const xb = xs[i + 1] - px;
    if ((xa > best && xb > best) || (xa < -best && xb < -best)) continue;
    const ya = ys[i] - py;
    const yb = ys[i + 1] - py;
    if ((ya > best && yb > best) || (ya < -best && yb < -best)) continue;
    const d = segmentDistance(px, py, xs[i], ys[i], xs[i + 1], ys[i + 1]);
    if (d < best) {
      best = d;
      at = i;
    }
  }
  hint.at = at;
  return best;
}

/** Where the largest gap is, and how close it comes. `inFromRail` is how far in from the file's widest point the largest gap sits. */
export interface BrdRailGap {
  largest: Mm;
  mean: Mm;
  at: P2;
  where: "deck" | "rail" | "bottom";
  inFromRail: Mm;
}

/** A file half prepared once: its points, its rail region, its widest point's x and height. */
interface Target {
  all: readonly P2[];
  allPoly: Poly;
  region: readonly P2[];
  reach: number;
  apexY: number;
}

function targetOf(file: readonly P2[], region: readonly P2[] = brdRailRegion(file)): Target {
  const apex = file.length > 0 ? apexOf(file) : 0;
  return {
    all: file,
    allPoly: polyOf(file),
    region,
    reach: file.length > 0 ? file[apex][0] : 0,
    apexY: file.length > 0 ? file[apex][1] : 0,
  };
}

function gapAgainst(target: Target, ours: readonly P2[]): BrdRailGap {
  if (ours.length === 0 || target.all.length === 0) return { largest: mm(NO_MATCH), mean: mm(NO_MATCH), at: [0, 0], where: "deck", inFromRail: mm(0) };
  const region = brdRailRegion(ours);
  const oursPoly = polyOf(ours);
  const hint = { at: 0 };
  let largest = 0;
  let sum = 0;
  let at: P2 = target.region[0] ?? [0, 0];
  for (const p of target.region) {
    const d = nearest(p[0], p[1], oursPoly, hint);
    sum += d;
    if (d > largest) {
      largest = d;
      at = p;
    }
  }
  hint.at = 0;
  for (const p of region) {
    const d = nearest(p[0], p[1], target.allPoly, hint);
    sum += d;
    if (d > largest) {
      largest = d;
      at = p;
    }
  }
  const inFromRail = Math.max(0, target.reach - at[0]);
  const where = inFromRail <= RAIL_AT_MM ? "rail" : at[1] > target.apexY ? "deck" : "bottom";
  return { largest: mm(largest), mean: mm(sum / (target.region.length + region.length)), at, where, inFromRail: mm(inFromRail) };
}

/**
 * How close `ours` comes to `file` over the rail region: every file point in its region against our whole half, every point of
 * ours in its region against the file's whole half; the largest and the mean, the point of the largest, and whether it lies on
 * the deck, at the rail (within 1/4" of the widest point) or on the bottom, with how far in from the rail it is.
 */
export function brdRailGap(file: readonly P2[], ours: readonly P2[]): BrdRailGap {
  return gapAgainst(targetOf(file), ours);
}

/** The same two-way measure over every point of both halves (no region): the bottom and the rail together. */
export function brdRailWholeGap(file: readonly P2[], ours: readonly P2[]): { largest: Mm; mean: Mm } {
  if (ours.length === 0 || file.length === 0) return { largest: mm(NO_MATCH), mean: mm(NO_MATCH) };
  const filePoly = polyOf(file);
  const oursPoly = polyOf(ours);
  const hint = { at: 0 };
  let largest = 0;
  let sum = 0;
  for (const p of file) {
    const d = nearest(p[0], p[1], oursPoly, hint);
    sum += d;
    if (d > largest) largest = d;
  }
  hint.at = 0;
  for (const p of ours) {
    const d = nearest(p[0], p[1], filePoly, hint);
    sum += d;
    if (d > largest) largest = d;
  }
  return { largest: mm(largest), mean: mm(sum / (file.length + ours.length)) };
}

/** Resamples a polyline by arc length to `n` points. */
function resample(points: readonly P2[], n: number): P2[] {
  if (points.length < 2) return [...points];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    seg.push(d);
    total += d;
  }
  const out: P2[] = [];
  let acc = 0;
  let k = 1;
  for (let j = 0; j < n; j++) {
    const target = (total * j) / (n - 1);
    while (k < points.length - 1 && acc + seg[k - 1] < target) {
      acc += seg[k - 1];
      k++;
    }
    const t = seg[k - 1] > 0 ? Math.min(1, Math.max(0, (target - acc) / seg[k - 1])) : 0;
    out.push([points[k - 1][0] + (points[k][0] - points[k - 1][0]) * t, points[k - 1][1] + (points[k][1] - points[k - 1][1]) * t]);
  }
  return out;
}

/**
 * A file's usable section prepared for the search: its half resampled by arc length to `BRD_RAIL_TARGET_POINTS`, and its rail
 * region (cut from the finely sampled half, from one point before the region starts so the first stretch is whole) resampled
 * to as many points of its own. So the rail, the whole point of the fit, weighs as much as the half does as a whole, however
 * long the bottom run in front of it is. (Measured: the region taken from the whole half's 120 points instead gave the Fryer a
 * different local optimum, 0.50 mm typical against 0.37.)
 */
interface Prepared {
  line: BrdRailLine;
  file: P2[];
  target: Target;
}
const PREPARED = new WeakMap<BrdRailLine, Prepared>();
function prepared(line: BrdRailLine): Prepared {
  let p = PREPARED.get(line);
  if (!p) {
    const file = resample(line.points, BRD_RAIL_TARGET_POINTS);
    const started = line.points.length - brdRailRegion(line.points).length;
    const region = resample(line.points.slice(Math.max(0, started - 1)), BRD_RAIL_TARGET_POINTS);
    p = { line, file, target: targetOf(file, region) };
    PREPARED.set(line, p);
  }
  return p;
}

/** The gap the fit measures a section by: the file's half as `prepared` against ours. */
export function brdRailLineGap(line: BrdRailLine, ours: readonly P2[]): BrdRailGap {
  return gapAgainst(prepared(line).target, ours);
}

/* ============ the three anchor sections ============ */

/**
 * The file's section nearest each of the tail 12", the middle of the board and the nose 12", each section used once (the nearest
 * pair is given first; a tie goes nose, centre, tail). A file with fewer sections leaves a key with none. Shared with the BOTTOM
 * block's three columns, which read the same three places.
 */
export function brdAnchorSections<T extends { station: Mm }>(sections: readonly T[], length: Mm): Record<RailSectionKey, T | null> {
  const wanted: Record<RailSectionKey, number> = { nose: length - MEASURE_STATION_MM, center: length / 2, tail: MEASURE_STATION_MM };
  const pairs = KEYS.flatMap((key, k) => sections.map((section, i) => ({ key, i, k, distance: Math.abs(section.station - wanted[key]) })));
  pairs.sort((a, b) => a.distance - b.distance || a.k - b.k || a.i - b.i);
  const chosen: Record<RailSectionKey, T | null> = { nose: null, center: null, tail: null };
  const used = new Set<number>();
  for (const pair of pairs) {
    if (chosen[pair.key] || used.has(pair.i)) continue;
    chosen[pair.key] = sections[pair.i];
    used.add(pair.i);
  }
  return chosen;
}

/* ============ the search ============ */

interface Scored {
  c: BrdRailSetting;
  v: number;
}

const settingKey = (c: BrdRailSetting): string =>
  [c.family, c.ratio, c.deckPercent.toFixed(9), c.symmetrical, c.singleTuck, c.sharpBottomTuck, c.hardEdge, c.scale, ...RAIL_NUDGE_KEYS.map((k) => c.nudges[k].toFixed(9))].join("|");

/** The Deck Profile grid at a rail: 100% down to the floor in the slider's own steps (the step follows that rail's thickness). */
function deckGrid(thickness: Mm): { grid: number[]; step: number } {
  const step = deckProfileSliderStep(mmToInches(thickness));
  const grid: number[] = [];
  for (let k = 0; 100 - k * step >= DECK_PERCENT_MIN - 1e-9; k++) grid.push(100 - k * step);
  return { grid, step };
}

/** A scale value kept on its grid and clear of float fuzz. */
const onScaleGrid = (value: number): number => Number((Math.round(value / RAIL_SCALE_RANGE.step) * RAIL_SCALE_RANGE.step).toFixed(9));

interface SearchOptions {
  /** Start the descent from here, boxes and Family held (a polish or an alignment), instead of seeding. */
  from?: BrdRailSetting;
}

/** Fits one anchor: its file section against our board with this setting at every anchor. */
function fitAnchor(board: BrdRailBoard, section: Prepared, key: RailSectionKey, options: SearchOptions = {}): BrdRailSetting {
  const hold = options.from !== undefined;
  const memo = new Map<string, Scored>();
  const score = (c: BrdRailSetting): Scored => {
    const k = settingKey(c);
    const hit = memo.get(k);
    if (hit) return hit;
    const gap = gapAgainst(section.target, brdOurRailHalf(board, uniformRails(c, board.foil), section.line.station));
    const s = { c, v: gap.largest + gap.mean };
    memo.set(k, s);
    return s;
  };
  const { grid, step } = deckGrid(board.foil[FOIL_KEY[key]]);
  const base = newBoardRailSetting(key);
  let cur: Scored;

  if (hold) {
    // A polish after the foil changed a little: the starting Deck Profile is put on the slider's steps as they now stand.
    const from = options.from!;
    const onGrid = grid[Math.min(grid.length - 1, Math.max(0, Math.round((100 - from.deckPercent) / step)))];
    cur = score(Math.abs(onGrid - from.deckPercent) < 1e-9 ? from : { ...from, deckPercent: onGrid });
  } else {
    const baseline = score(base);
    const every = Math.max(1, Math.round(SEED_DECK_SHARE / step));
    const seedDecks = grid.filter((_, k) => k % every === 0);
    const points: Scored[] = [];
    // Ratio x Deck Profile with Symmetrical off and on; on the tail also with Hard Edge on (it and Symmetrical never both).
    for (const hardEdge of key === "tail" ? [false, true] : [false]) {
      for (const symmetrical of hardEdge ? [false] : [false, true]) {
        for (let ratio = RAIL_RATIO_RANGE.min; ratio <= RAIL_RATIO_RANGE.max; ratio += SEED_RATIO_STEP) {
          for (const deckPercent of seedDecks) points.push(score({ ...base, hardEdge, symmetrical, ratio, deckPercent }));
        }
      }
    }
    points.sort((a, b) => a.v - b.v);
    const tucks = [
      { singleTuck: false, sharpBottomTuck: false, symmetrical: false },
      { singleTuck: true, sharpBottomTuck: false, symmetrical: false },
      { singleTuck: false, sharpBottomTuck: true, symmetrical: false },
      { singleTuck: true, sharpBottomTuck: true, symmetrical: false },
      { singleTuck: false, sharpBottomTuck: false, symmetrical: true },
      { singleTuck: true, sharpBottomTuck: false, symmetrical: true },
      { singleTuck: false, sharpBottomTuck: true, symmetrical: true },
    ];
    const seeds: Scored[] = [];
    for (const best of points.slice(0, SEED_BEST)) {
      for (const t of tucks) if (!best.c.hardEdge || (!t.singleTuck && !t.sharpBottomTuck && !t.symmetrical)) seeds.push(score({ ...best.c, ...t }));
    }
    seeds.sort((a, b) => a.v - b.v);
    const leader = [baseline, ...seeds].sort((a, b) => a.v - b.v)[0];
    cur = leader.v < baseline.v - BRD_RAIL_MOVE_GAIN_MM ? leader : baseline;
  }

  const tryAll = (candidates: BrdRailSetting[]): boolean => {
    let best = cur;
    for (const c of candidates) {
      const s = score(c);
      if (s.v < best.v - NOISE) best = s;
    }
    if (best !== cur && best.v < cur.v - BRD_RAIL_MOVE_GAIN_MM) {
      cur = best;
      return true;
    }
    return false;
  };

  const mainMoves = (): boolean => {
    let moved = false;
    const ratios: BrdRailSetting[] = [];
    for (const d of [-5, -2.5, -1, -0.5, 0.5, 1, 2.5, 5]) {
      const ratio = cur.c.ratio + d;
      if (ratio >= RAIL_RATIO_RANGE.min && ratio <= RAIL_RATIO_RANGE.max) ratios.push({ ...cur.c, ratio });
    }
    moved = tryAll(ratios) || moved;
    const at = Math.round((100 - cur.c.deckPercent) / step);
    const decks: BrdRailSetting[] = [];
    for (const d of [-3, -2, -1, 1, 2, 3]) if (at + d >= 0 && at + d < grid.length) decks.push({ ...cur.c, deckPercent: grid[at + d] });
    moved = tryAll(decks) || moved;
    if (hold) return moved;
    moved = tryAll(([1, 2, 3, 4, 5] as RailFamily[]).filter((family) => family !== cur.c.family).map((family) => ({ ...cur.c, family }))) || moved;
    const kinds: BrdRailSetting[] = [];
    if (!cur.c.hardEdge) kinds.push({ ...cur.c, symmetrical: !cur.c.symmetrical }, { ...cur.c, singleTuck: !cur.c.singleTuck }, { ...cur.c, sharpBottomTuck: !cur.c.sharpBottomTuck });
    if (key === "tail") kinds.push({ ...cur.c, hardEdge: !cur.c.hardEdge, singleTuck: false, sharpBottomTuck: false, symmetrical: false });
    moved = tryAll(kinds) || moved;
    return moved;
  };

  const advancedMoves = (): boolean => {
    let moved = false;
    if (key !== "center") {
      const scales: BrdRailSetting[] = [];
      for (const d of SCALE_TRIES) {
        const scale = onScaleGrid(cur.c.scale + d);
        if (scale >= RAIL_SCALE_RANGE.min - 1e-9 && scale <= RAIL_SCALE_RANGE.max + 1e-9) scales.push({ ...cur.c, scale });
      }
      moved = tryAll(scales) || moved;
    }
    for (const nudge of RAIL_NUDGE_KEYS) {
      if (cur.c.hardEdge && (nudge === "bottomTuck1" || nudge === "bottomTuck3")) continue;
      if (cur.c.singleTuck && nudge === "bottomTuck1") continue;
      const limit = RAIL_NUDGE_LIMIT_IN[nudge];
      const tries = nudge === "domedDeckBand" ? DOME_TRIES : NUDGE_TRIES;
      const candidates: BrdRailSetting[] = [];
      const steps = Math.round(mmToInches(cur.c.nudges[nudge]) / RAIL_NUDGE_STEP_IN);
      for (const t of tries) {
        for (const d of [-t, t]) {
          const inches = (steps + d) * RAIL_NUDGE_STEP_IN;
          if (Math.abs(inches) <= limit + 1e-9) candidates.push({ ...cur.c, nudges: { ...cur.c.nudges, [nudge]: mm(inchesToMm(inches)) } });
        }
      }
      moved = tryAll(candidates) || moved;
    }
    return moved;
  };

  for (let round = 0; round < MOVE_ROUNDS; round++) if (!mainMoves()) break;
  for (let round = 0; round < MOVE_ROUNDS; round++) {
    const advanced = advancedMoves();
    const main = mainMoves();
    if (!advanced && !main) break;
  }

  // Parsimony: a setting off a new board's value goes back when that costs no more than the prune bar.
  for (let changed = true; changed; ) {
    changed = false;
    const c = cur.c;
    const backs: BrdRailSetting[] = [];
    for (const nudge of RAIL_NUDGE_KEYS) if (c.nudges[nudge] !== 0) backs.push({ ...c, nudges: { ...c.nudges, [nudge]: mm(0) } });
    if (c.scale !== base.scale) backs.push({ ...c, scale: base.scale });
    if (!hold) {
      if (c.singleTuck) backs.push({ ...c, singleTuck: false });
      if (c.sharpBottomTuck) backs.push({ ...c, sharpBottomTuck: false });
      if (c.symmetrical) backs.push({ ...c, symmetrical: false });
      if (c.family !== base.family) backs.push({ ...c, family: base.family });
    }
    let best: Scored | null = null;
    for (const b of backs) {
      const s = score(b);
      if (s.v <= cur.v + BRD_RAIL_PRUNE_MM && (!best || s.v < best.v)) best = s;
    }
    if (best) {
      cur = best;
      changed = true;
    }
  }
  return cur.c;
}

/* ============ the whole board ============ */

/** A board's rail value over every usable section: the largest of the largests plus the mean of the means. */
function railValue(lines: readonly BrdRailLine[], board: BrdRailBoard, rails: RailBandSpec): { value: number; largest: number; mean: number } {
  let largest = 0;
  let sum = 0;
  for (const line of lines) {
    const gap = gapAgainst(prepared(line).target, brdOurRailHalf(board, rails, line.station));
    largest = Math.max(largest, gap.largest);
    sum += gap.mean;
  }
  const mean = lines.length > 0 ? sum / lines.length : 0;
  return { value: largest + mean, largest, mean };
}

/** The same over the whole sections, bottom and rail together (the figure the two orders are compared by). */
export function brdRailWholeValue(lines: readonly BrdRailLine[], board: BrdRailBoard, rails: RailBandSpec): { value: number; largest: number; mean: number } {
  let largest = 0;
  let sum = 0;
  for (const line of lines) {
    const gap = brdRailWholeGap(prepared(line).file, brdOurRailHalf(board, rails, line.station));
    largest = Math.max(largest, gap.largest);
    sum += gap.mean;
  }
  const mean = lines.length > 0 ? sum / lines.length : 0;
  return { value: largest + mean, largest, mean };
}

/** A tip takes the centre's Family and boxes (a Hard Edge tail takes only the Family; its Hard Edge is kept). */
const aligned = (tip: BrdRailSetting, centre: BrdRailSetting): BrdRailSetting =>
  tip.hardEdge
    ? { ...tip, family: centre.family }
    : { ...tip, family: centre.family, symmetrical: centre.symmetrical, singleTuck: centre.singleTuck, sharpBottomTuck: centre.sharpBottomTuck };

const differs = (tip: BrdRailSetting, centre: BrdRailSetting): boolean =>
  tip.family !== centre.family ||
  (!tip.hardEdge && (tip.symmetrical !== centre.symmetrical || tip.singleTuck !== centre.singleTuck || tip.sharpBottomTuck !== centre.sharpBottomTuck));

/**
 * The closest rails the controls make to the file's three anchor sections on `board`. With `from`, the descent only: every
 * control polished from those values on the board as it now stands, Family and boxes held (after a bottom is re-read). Without
 * it: the seed, the descent, the prune, and the alignment of the tips to the centre where that is closer over the whole board.
 */
export function fitBrdRails(lines: readonly BrdRailLine[], board: BrdRailBoard, from?: BrdRailSettings): BrdRailSettings {
  const chosen = brdAnchorSections(lines, board.length);
  const settings = {} as BrdRailSettings;
  for (const key of KEYS) {
    const line = chosen[key];
    settings[key] = !line ? (from ? from[key] : newBoardRailSetting(key)) : fitAnchor(board, prepared(line), key, from ? { from: from[key] } : {});
  }
  if (from) return settings;

  const tips = (["nose", "tail"] as const).filter((tip) => chosen[tip] && differs(settings[tip], settings.center));
  const variants: BrdRailSettings[] = [settings];
  const realigned = {} as Record<"nose" | "tail", BrdRailSetting>;
  for (const tip of tips) realigned[tip] = fitAnchor(board, prepared(chosen[tip]!), tip, { from: aligned(settings[tip], settings.center) });
  if (tips.includes("nose")) variants.push({ ...settings, nose: realigned.nose });
  if (tips.includes("tail")) variants.push({ ...settings, tail: realigned.tail });
  if (tips.length === 2) variants.push({ ...settings, nose: realigned.nose, tail: realigned.tail });
  if (variants.length === 1) return settings;
  const scored = variants.map((v) => ({ v, value: railValue(lines, board, brdRailsSpec(v, board.foil)).value }));
  const closest = Math.min(...scored.map((s) => s.value));
  const fewest = (v: BrdRailSettings) => Number(differs(v.nose, v.center)) + Number(differs(v.tail, v.center));
  return scored.filter((s) => s.value <= closest + BRD_RAIL_ALIGN_PREFER_MM).sort((a, b) => fewest(a.v) - fewest(b.v) || a.value - b.value)[0].v;
}

/* ============ where our rail begins, and the bottom's reading widths ============ */

/**
 * How far in from its widest point our finished rail meets the bottom, at each station, on the board with the fit's outline,
 * rocker and foil and NO bottom: our half's widest x less the x of the last point still on the bottom walking out from the
 * stringer.
 */
export function brdRailBegins(fit: Pick<BrdFit, "outline" | "rocker" | "foil">, rails: RailBandSpec, stations: readonly Mm[]): Mm[] {
  const board = brdRailBoard(fit, null);
  return stations.map((station) => {
    const half = brdOurRailHalf(board, rails, station);
    if (half.length === 0) return mm(0);
    const apex = apexOf(half);
    let edge = 0;
    for (let k = 0; k < apex; k++) {
      if (half[k][1] <= 1e-6) edge = k;
      else break;
    }
    return mm(half[apex][0] - half[edge][0]);
  });
}

/**
 * Each usable section's bottom window: where our rail begins when that is more than `BRD_RAIL_NARROW_MIN_MM` inside the usual
 * `window` share of its reach (never wider than that), `undefined` otherwise so the section keeps exactly today's window.
 * `narrowed` says whether any section narrowed.
 */
export function brdRailWindows(lines: readonly BrdRailLine[], begins: readonly Mm[]): { windows: (Mm | undefined)[]; narrowed: boolean } {
  const windows = lines.map((line, i): Mm | undefined => {
    const reach = Math.max(...line.points.map((p) => p[0]));
    const usual = BRD_BOTTOM_WINDOW * reach;
    const ours = Math.min(usual, reach - begins[i]);
    return ours < usual - BRD_RAIL_NARROW_MIN_MM ? mm(ours) : undefined;
  });
  return { windows, narrowed: windows.some((w) => w !== undefined) };
}

/* ============ what is shown ============ */

/** One usable section, measured on the board that opens: the file's half, ours, and the rail gap. */
export interface BrdRailSection {
  station: Mm;
  file: P2[];
  ours: P2[];
  gap: BrdRailGap;
}

/** The rails the fit chose, measured on the board that opens. */
export interface BrdRailsFit {
  settings: BrdRailSettings;
  rails: RailBandSpec;
  order: "bottom-first" | "rails-first";
  /** The file section each anchor was fitted to (its station), or null where the file had none there. */
  read: Record<RailSectionKey, Mm | null>;
  /** Every usable section, tail to nose. */
  sections: BrdRailSection[];
  closeness: { largest: Mm; typical: Mm; station: Mm; where: BrdRailGap["where"]; inFromRail: Mm };
  /** Some section's bottom window stopped where our rail begins. */
  narrowed: boolean;
}

/** `settings` measured against every usable section, the slow exact way, on the board that opens. */
export function measureBrdRails(
  lines: readonly BrdRailLine[],
  board: BrdRailBoard,
  settings: BrdRailSettings,
  extra: Pick<BrdRailsFit, "order" | "read" | "narrowed">,
): BrdRailsFit {
  const rails = brdRailsSpec(settings, board.foil);
  const sections = lines.map((line): BrdRailSection => {
    const p = prepared(line);
    const ours = brdOurRailHalf(board, rails, line.station);
    return { station: line.station, file: p.file, ours, gap: gapAgainst(p.target, ours) };
  });
  let worst: BrdRailSection | null = null;
  let sum = 0;
  for (const section of sections) {
    sum += section.gap.mean;
    if (!worst || section.gap.largest > worst.gap.largest) worst = section;
  }
  return {
    settings,
    rails,
    order: extra.order,
    read: extra.read,
    sections,
    closeness: {
      largest: worst ? worst.gap.largest : mm(0),
      typical: mm(sections.length > 0 ? sum / sections.length : 0),
      station: worst ? worst.station : mm(0),
      where: worst ? worst.gap.where : "deck",
      inFromRail: worst ? worst.gap.inFromRail : mm(0),
    },
    narrowed: extra.narrowed,
  };
}
