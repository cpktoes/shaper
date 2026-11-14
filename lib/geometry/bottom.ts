/**
 * The bottom contours (Phase 17) — the cuts a shaper takes out of the bottom after the blank is planed: a flat, a
 * belly, a vee, a single concave (17-02), the doubles, the Spiral Vee, the Tri-Plane, the Teardrop's closing (17-05)
 * and the channels (17-06) — and the numbers DATA prints: the depths every 6", the layout marks off the stringer and
 * where a cut meets the 1/4" floor (17-05).
 *
 * D-05, the one number: **foam off at (station, distance from the stringer)** — the sum of the cuts, never below zero
 * and never deeper than the 1/4" floor under the planed thickness. Every reader — the shade, the section, DATA, the
 * litres, the 3D board, the CNC files, RAILS, FINS — calls `foamOff` here; none re-derives a cut.
 *
 * The arithmetic is the founder's approved sketch 021 (2026-11-08, "Love everything about it"), ported line for line
 * from its reference copy `reference/sketches/021-bottom-maths.js` (never imported) and proven against the sketch's
 * own executed figures in `__fixtures__/bottom-golden.json`. Each function keeps the sketch's operations in its order
 * so the two agree to 1e-9 mm.
 *
 * What is STORED (`BoardBottom`, D-24) and what is READ (`ResolvedBottom`) differ in one way: where a station is
 * measured from. A Nose cut's Start, Deepest At and End are stored as distances from the nose (D-39), a Center or Tail
 * cut's from the tail (D-07), and a Tail cut's Deepest At as a signed distance from the front fins, + toward the nose
 * (D-03). `resolveBottom` turns them all into stations from the tail, which is what the maths reads.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser, database or `three` import. Every length is millimetres (Rule 2); every
 * inch figure is written through `inchesToMm`.
 */
import type { BoardSideProfile } from "./board-profile";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { inchesToMm, mm, type Litres, type Mm } from "./units";
import type { BoardSection } from "./volume";

/* ============ the names ============ */

export type BottomSectionKey = "nose" | "center" | "tail";
/** What a cut IS — a flat, a belly, a vee, a single concave or a double concave. Comes from the name. */
export type BottomCutKind = "flat" | "belly" | "vee" | "single" | "double";
/** What Off Rail is measured from on a winged board (D-19): the Narrowest outline, or the curve drawn before the wing. */
export type BottomWingRule = "narrowest" | "natural";

/** The three sections in shop order — the order a cut is listed in, on DATA and on paper. */
export const BOTTOM_SECTIONS: readonly BottomSectionKey[] = ["nose", "center", "tail"];

/**
 * The founder's eighteen names (D-04), six per section, in D-04's order within each section — the order of each
 * section's menu, and the sketch's own `NAMES` order. No Bonzer and no other name (SPEC, out of scope).
 */
export const BOTTOM_CUT_NAMES = {
  nose: ["Flat Entry", "Rolled Belly Entry", "Teardrop Nose Concave", "Blended Nose Concave", "Slight Single Concave Entry", "Reverse Vee Nose"],
  center: ["Flat Center", "Deep Single Concave", "Shallow Single Concave", "Early Double Concave", "Continuous Belly / Rolled Mid", "Tri-Plane Hull Center"],
  tail: ["Flat Exit", "Double Concave Exit", "Panel Vee", "Spiral Vee", "Rolled Vee", "Extending Single Concave"],
} as const;

export type BottomCutName = (typeof BOTTOM_CUT_NAMES)[BottomSectionKey][number];

/** Each section's flat — what every board opens with (D-04). */
export const FLAT_CUT_NAMES: Readonly<Record<BottomSectionKey, BottomCutName>> = {
  nose: "Flat Entry",
  center: "Flat Center",
  tail: "Flat Exit",
};

/* ============ the stored shape (D-24) ============ */

/**
 * One section's cut as STORED. The kind comes from the name, never stored. Start, Deepest At and End are the distance
 * from the section's nearest tip — the nose for a Nose cut (D-39), the tail for a Center or Tail cut (D-07) — except a
 * Tail cut's Deepest At, stored as a signed distance from the front fins, + toward the nose (D-03). A flat's numbers
 * are all 0.
 */
export interface BottomCutSpec {
  name: BottomCutName;
  /** A concave's distance in from the reference rail (a mark). */
  offRail: Mm;
  /** A vee's flat panel either side of the stringer, a double's flat (a mark). */
  offStringer: Mm;
  /** A double's trough, out from the stringer (a mark). */
  troughAt: Mm;
  start: Mm;
  deepest: Mm;
  end: Mm;
  /** How deep the cut is at its deepest station; a vee's or belly's lift at the rail (a mark). */
  depth: Mm;
  /** The Spiral Vee's lift under its double (a mark). */
  veeLift: Mm;
  /** 0 to 100: straight to the edge at 0, rounded out at 100. */
  smoothness: number;
  /** A nose single that closes to a point toward the center (the Teardrop's, D-06 / D-32). */
  closesToPoint: boolean;
}

/**
 * The channels as STORED (D-10, D-11, D-44; resolved by 17-05). `startFromFins` and `deepestFromFins` ride with the
 * fins. `angle` is the angle the two angled runs are laid at, in degrees, when the shaper set it by hand — `null`
 * means "this run's own": the rail's own angle for With the rail, the fins' toe-in for Toe-in
 * (`channelDefaultAngle`). Parallel has no angle and ignores it.
 */
export interface BottomChannelsSpec {
  count: 0 | 4 | 6 | 8;
  width: Mm;
  offStringer: Mm;
  startFromFins: Mm;
  deepestFromFins: Mm;
  /** From the tail. */
  end: Mm;
  depth: Mm;
  smoothness: number;
  run: "parallel" | "rail" | "toe";
  /** Degrees, set by hand (D-44) — or `null` for the run's own angle. */
  angle: number | null;
  longest: "inner" | "outer" | "same";
  stagger: Mm;
}

/** A board's whole bottom, as STORED. */
export interface BoardBottom {
  nose: BottomCutSpec;
  center: BottomCutSpec;
  tail: BottomCutSpec;
  channels: BottomChannelsSpec;
  wingRule: BottomWingRule;
}

/* ============ the board facts the bottom is read against ============ */

/**
 * The board's own numbers along its length — built once per board by `design.ts`'s `designBottomBoard` (D-19, D-38).
 * Stations are millimetres from the tail; widths are one side of the stringer.
 */
export interface BottomBoard {
  length: Mm;
  /** The wide point's station. */
  widePoint: Mm;
  /** The wide point's full width, both sides. */
  widePointWidth: Mm;
  /** The front fins' station (`frontFinStation`, D-03). */
  frontFins: Mm;
  /** The front fins' toe-in, raw (D-10; rounded once, on screen). */
  toeDegrees: number;
  /** The rail a vee or belly runs out to: the drawn rail, or a diamond's V where that is wider (D-38). */
  railAt(s: Mm): Mm;
  /** The curve the shaper drew before any wing (the Natural outline). */
  curveAt(s: Mm): Mm;
  /** The Narrowest outline (D-19). */
  narrowestAt(s: Mm): Mm;
  /** The foam actually there on one side (a swallow's notch is air). */
  foamAt(s: Mm): Mm;
  /** The planed thickness. */
  thicknessAt: BoardSideProfile["thicknessAt"];
  /** A swallow's notch inside wall, out from the stringer; 0 elsewhere. */
  notchInner(s: Mm): Mm;
}

/* ============ the sketch's constants ============ */

/** A concave narrower than this shallows out in proportion, so a tip never gets a slot (the sketch's `PINCH`). */
export const PINCH: Mm = inchesToMm(3);
/** A start or end this close to a tip is ON the tip, and the cut runs out at full depth there (the sketch's 0.5). */
export const TIP_TOLERANCE: Mm = mm(0.5);
/** A swallow's notch is only a notch where the drawn curve stands this far outside the foam (the sketch's 0.3). */
export const NOTCH_WALL_MIN: Mm = mm(0.3);
/** A station this far past a cut's Start or End is outside the cut (the sketch's 1e-9). */
export const STATION_GUARD: Mm = mm(1e-9);
/** Deepest At this close to Start or End means no fade on that side (the sketch's 1e-6). */
export const FADE_GUARD: Mm = mm(1e-6);
/** A double's trough stands at least this far outside its flat (the sketch's `IN / 4`). */
export const DOUBLE_TROUGH_GAP: Mm = inchesToMm(1 / 4);
/** A double's flat is at most this share of the cut's half-width (the sketch's 0.5). */
export const DOUBLE_FLAT_SHARE = 0.5;
/** A double's trough is at most this share of the cut's half-width (the sketch's 0.85). */
export const DOUBLE_TROUGH_SHARE = 0.85;
/** The least half-width `keepStationsInOrder` reads a double's marks against (the sketch's `IN`). */
export const DOUBLE_MIN_HALF_WIDTH: Mm = inchesToMm(1);
/** The top view's shade steps every 1/32" of depth (D-12; drawn from 17-06). */
export const BOTTOM_SHADE_STEP: Mm = inchesToMm(1 / 32);
/** The least foam the bottom ever leaves under the deck: the app's own thinnest foil (D-09). */
export const BOTTOM_FLOOR: Mm = inchesToMm(FOIL_THICKNESS_RANGE_IN.min);

/**
 * The mark sliders' step and ranges on BOTTOM (D-06, UI-SPEC §1), in inches: 1/16" steps (1 mm in Metric, through
 * `measureSlider`), the Depth slider 0 to 1/2", Off Rail 0 to 6", Off Stringer 0 to 9", Trough At 1/2" to 8", Vee Lift
 * 0 to 1/2". They live here so the page's sliders and the .brd fit read one set of numbers (quick 261113-gwr).
 */
export const BOTTOM_MARK_STEP_IN = 1 / 16;
export const BOTTOM_DEPTH_RANGE_IN = { min: 0, max: 0.5 } as const;
export const BOTTOM_MARK_RANGES_IN = {
  offRail: { min: 0, max: 6 },
  offStringer: { min: 0, max: 9 },
  troughAt: { min: 0.5, max: 8 },
  depth: BOTTOM_DEPTH_RANGE_IN,
  veeLift: { min: 0, max: 0.5 },
} as const;

/* ============ the starting numbers (D-08) ============ */

/** A cut's numbers with every station from the tail, as the sketch's `makeCut` gives them. */
interface AbsoluteCut {
  offRail: number;
  offStringer: number;
  troughAt: number;
  start: number;
  deepest: number;
  end: number;
  depth: number;
  veeLift: number;
  smoothness: number;
  closesToPoint: boolean;
}

interface CutEntry {
  name: BottomCutName;
  kind: BottomCutKind;
  /** The starting numbers, stations from the tail — the sketch's `d`, line for line, `i(v)` as `inchesToMm(v)`. */
  d?: (b: BottomBoard) => Partial<AbsoluteCut>;
}

const i = inchesToMm;

/**
 * The sketch's `NAMES` table (template.html 367–401), all eighteen names. Set 2026-11-08 from what shapers publish, at
 * the founder's word — still his to correct.
 */
const CUT_TABLE: Readonly<Record<BottomSectionKey, readonly CutEntry[]>> = {
  nose: [
    { name: "Flat Entry", kind: "flat" },
    { name: "Rolled Belly Entry", kind: "belly", d: (b) => ({ start: b.length, deepest: b.length * 2 / 3, end: b.length * 0.55, depth: i(3 / 8), smoothness: 100 }) },
    { name: "Teardrop Nose Concave", kind: "single", d: (b) => ({ offRail: i(2.25), start: b.length - i(3), deepest: b.length - i(20), end: b.length - i(38), depth: i(1 / 4), smoothness: 70, closesToPoint: true }) },
    { name: "Blended Nose Concave", kind: "single", d: (b) => ({ offRail: i(1.625), start: b.length - i(2), deepest: b.length - i(12), end: b.length - i(36), depth: i(3 / 16), smoothness: 70 }) },
    { name: "Slight Single Concave Entry", kind: "single", d: (b) => ({ offRail: i(2), start: b.length - i(12), deepest: b.widePoint, end: b.widePoint - i(6), depth: i(1 / 16), smoothness: 50 }) },
    { name: "Reverse Vee Nose", kind: "vee", d: (b) => ({ start: b.length - i(3), deepest: b.length * 2 / 3, end: b.frontFins + i(4), depth: i(3 / 16), smoothness: 0 }) },
  ],
  center: [
    { name: "Flat Center", kind: "flat" },
    { name: "Deep Single Concave", kind: "single", d: (b) => ({ offRail: i(2), start: b.length - i(16), deepest: (b.widePoint + b.frontFins) / 2, end: i(4), depth: i(1 / 4), smoothness: 50 }) },
    { name: "Shallow Single Concave", kind: "single", d: (b) => ({ offRail: i(2), start: b.length * 2 / 3, deepest: b.frontFins, end: i(4), depth: i(1 / 8), smoothness: 50 }) },
    { name: "Early Double Concave", kind: "double", d: (b) => ({ offRail: i(2), offStringer: i(1), troughAt: i(4), start: b.widePoint, deepest: b.frontFins + i(6), end: b.frontFins + i(2), depth: i(1 / 8), smoothness: 60 }) },
    { name: "Continuous Belly / Rolled Mid", kind: "belly", d: (b) => ({ start: b.length - i(8), deepest: b.widePoint, end: b.frontFins, depth: i(3 / 8), smoothness: 100 }) },
    { name: "Tri-Plane Hull Center", kind: "vee", d: (b) => ({ offStringer: b.widePointWidth / 2 - i(4), start: b.length - i(14), deepest: b.length / 2, end: b.frontFins, depth: i(1 / 8), smoothness: 0 }) },
  ],
  tail: [
    { name: "Flat Exit", kind: "flat" },
    { name: "Double Concave Exit", kind: "double", d: (b) => ({ offRail: i(1), offStringer: i(3 / 4), troughAt: i(3), start: b.frontFins + i(12), deepest: b.frontFins, end: i(4), depth: i(1 / 8), smoothness: 50 }) },
    { name: "Panel Vee", kind: "vee", d: (b) => ({ start: b.length / 3, deepest: b.frontFins, end: 0, depth: i(3 / 16), smoothness: 0 }) },
    { name: "Spiral Vee", kind: "double", d: (b) => ({ offRail: i(1), offStringer: i(3 / 4), troughAt: i(3), start: b.frontFins + i(12), deepest: b.frontFins, end: 0, depth: i(1 / 8), smoothness: 50, veeLift: i(3 / 16) }) },
    { name: "Rolled Vee", kind: "vee", d: (b) => ({ start: b.length / 3, deepest: b.frontFins, end: 0, depth: i(1 / 4), smoothness: 60 }) },
    { name: "Extending Single Concave", kind: "single", d: (b) => ({ offRail: i(2), start: b.frontFins + i(12), deepest: b.frontFins, end: i(4), depth: i(3 / 16), smoothness: 50 }) },
  ],
};

function entryOf(section: BottomSectionKey, name: BottomCutName): CutEntry {
  const entry = CUT_TABLE[section].find((e) => e.name === name);
  if (!entry) throw new Error(`${name} is not a ${section} cut`);
  return entry;
}

/** What a named cut is. Every name is in exactly one section, so the name alone says it. */
export function cutKind(name: BottomCutName): BottomCutKind {
  for (const section of BOTTOM_SECTIONS) {
    const entry = CUT_TABLE[section].find((e) => e.name === name);
    if (entry) return entry.kind;
  }
  throw new Error(`${name} is not a bottom cut`);
}

/** The three tail cuts that are vees (D-42): a Panel Vee, a Rolled Vee, or the Spiral Vee's vee under its double. */
export const TAIL_VEE_NAMES: readonly BottomCutName[] = ["Panel Vee", "Spiral Vee", "Rolled Vee"];

/** Whether a tail cut is one of the vees a center single fades out ahead of (D-42). */
export function isTailVee(name: BottomCutName): boolean {
  return TAIL_VEE_NAMES.includes(name);
}

/**
 * The sketch's `makeCut`: zeros, then the name's starting numbers over them. Stations from the tail.
 *
 * D-42 (the founder, 2026-11-08): when the tail cut is a vee, a center single concave opens deepest halfway from the
 * wide point to the front fins and ends AT the front fins, so it has run out where the vee is deepest. Without a tail
 * vee (or no tail named) the numbers are the sketch's own, line for line.
 */
function makeAbsolute(section: BottomSectionKey, name: BottomCutName, board: BottomBoard, tail?: BottomCutName): AbsoluteCut {
  const entry = entryOf(section, name);
  const c: AbsoluteCut = { offRail: 0, offStringer: 0, troughAt: 0, start: 0, deepest: 0, end: 0, depth: 0, veeLift: 0, smoothness: 0, closesToPoint: false };
  if (entry.d) Object.assign(c, entry.d(board));
  if (section === "center" && entry.kind === "single" && tail !== undefined && isTailVee(tail)) {
    c.deepest = (board.widePoint + board.frontFins) / 2;
    c.end = board.frontFins;
  }
  return c;
}

/* ============ stored ↔ read ============ */

const clampStation = (s: number, board: BottomBoard): Mm => mm(Math.max(0, Math.min(board.length, s)));

/** A stored station → a station from the tail, before any order is kept. Clamped to the board. */
function absoluteStations(section: BottomSectionKey, spec: BottomCutSpec, board: BottomBoard): { start: Mm; deepest: Mm; end: Mm } {
  if (section === "nose") {
    return {
      start: clampStation(board.length - spec.start, board),
      deepest: clampStation(board.length - spec.deepest, board),
      end: clampStation(board.length - spec.end, board),
    };
  }
  if (section === "tail") {
    return {
      start: clampStation(spec.start, board),
      deepest: clampStation(board.frontFins + spec.deepest, board),
      end: clampStation(spec.end, board),
    };
  }
  return { start: clampStation(spec.start, board), deepest: clampStation(spec.deepest, board), end: clampStation(spec.end, board) };
}

/** Stations from the tail → the stored form (D-39 for the nose, D-03 for the tail's Deepest At). */
function storedStations(section: BottomSectionKey, abs: { start: number; deepest: number; end: number }, board: BottomBoard): { start: Mm; deepest: Mm; end: Mm } {
  if (section === "nose") {
    return { start: mm(board.length - abs.start), deepest: mm(board.length - abs.deepest), end: mm(board.length - abs.end) };
  }
  if (section === "tail") return { start: mm(abs.start), deepest: mm(abs.deepest - board.frontFins), end: mm(abs.end) };
  return { start: mm(abs.start), deepest: mm(abs.deepest), end: mm(abs.end) };
}

/** A flat, stored: its name and every number 0. */
function flatSpec(name: BottomCutName): BottomCutSpec {
  return { name, offRail: mm(0), offStringer: mm(0), troughAt: mm(0), start: mm(0), deepest: mm(0), end: mm(0), depth: mm(0), veeLift: mm(0), smoothness: 0, closesToPoint: false };
}

/**
 * A name's starting numbers on this board (D-08), in the stored form: the sketch's `makeCut`, then each station
 * measured from where it is kept. A flat stores all zeros. `tail` is the board's tail cut, read only by a center single
 * (D-42); left out, every name opens on the sketch's own numbers.
 */
export function startingCut(section: BottomSectionKey, name: BottomCutName, board: BottomBoard, tail?: BottomCutName): BottomCutSpec {
  if (entryOf(section, name).kind === "flat") return flatSpec(name);
  const c = makeAbsolute(section, name, board, tail);
  return {
    name,
    offRail: mm(c.offRail),
    offStringer: mm(c.offStringer),
    troughAt: mm(c.troughAt),
    ...storedStations(section, c, board),
    depth: mm(c.depth),
    veeLift: mm(c.veeLift),
    smoothness: c.smoothness,
    closesToPoint: c.closesToPoint,
  };
}

/** One cut as the maths reads it: every station from the tail, in order. */
export interface ResolvedCut {
  section: BottomSectionKey;
  name: BottomCutName;
  kind: BottomCutKind;
  /** The Spiral Vee's double with a vee under it — true for that name alone (the sketch's `spiral`). */
  spiral: boolean;
  offRail: Mm;
  offStringer: Mm;
  troughAt: Mm;
  start: Mm;
  deepest: Mm;
  end: Mm;
  depth: Mm;
  veeLift: Mm;
  smoothness: number;
  closesToPoint: boolean;
}

/**
 * The channels as the maths reads them (D-03, D-10, D-44): Start (the longest pair's), Deepest At and End as stations
 * from the tail, in order, and `angle` — the angle IN USE, in degrees: 0 for Parallel, otherwise the one set by hand
 * or, with none set, the run's own (`channelDefaultAngle`), always between 0 and `CHANNEL_ANGLE_MAX`. It is worked out
 * once, in `resolveChannels`, so the walls, the words on screen and the printed sheet all read the same angle. Every
 * other number as stored.
 */
export interface ResolvedChannels {
  count: BottomChannelsSpec["count"];
  width: Mm;
  offStringer: Mm;
  start: Mm;
  deepest: Mm;
  end: Mm;
  depth: Mm;
  smoothness: number;
  run: BottomChannelsSpec["run"];
  /** The angle in use, degrees: 0 for Parallel (D-44). */
  angle: number;
  longest: BottomChannelsSpec["longest"];
  stagger: Mm;
}

/** The whole bottom as the maths reads it. */
export interface ResolvedBottom {
  nose: ResolvedCut;
  center: ResolvedCut;
  tail: ResolvedCut;
  channels: ResolvedChannels;
  wingRule: BottomWingRule;
}

/**
 * A stored cut, read: every station from the tail, clamped to the board. A flat reads all zeros, as the sketch's flat.
 * A Tail cut's Deepest At follows the front fins, and when a fin move carries it past Start or End the other is pushed
 * to it on read — Start = max(Start, Deepest), End = min(End, Deepest) — with nothing written back (D-36). The stored
 * spec is never mutated.
 */
export function resolveCut(section: BottomSectionKey, spec: BottomCutSpec, board: BottomBoard): ResolvedCut {
  const kind = cutKind(spec.name);
  if (kind === "flat") return { ...flatSpec(spec.name), section, kind, spiral: false };
  const abs = absoluteStations(section, spec, board);
  const deepest = abs.deepest;
  let { start, end } = abs;
  if (section === "tail") {
    start = mm(Math.max(start, deepest));
    end = mm(Math.min(end, deepest));
  }
  return {
    section,
    name: spec.name,
    kind,
    spiral: spec.name === "Spiral Vee",
    offRail: spec.offRail,
    offStringer: spec.offStringer,
    troughAt: spec.troughAt,
    start,
    deepest,
    end,
    depth: spec.depth,
    veeLift: spec.veeLift,
    smoothness: spec.smoothness,
    closesToPoint: spec.closesToPoint,
  };
}

/**
 * The channels, read (D-03; D-36 as it reads for a tail cut): Start and Deepest At ride with the front fins, End is
 * from the tail, each clamped to the board. The fin-anchored Deepest At wins: when a fin move carries it past Start
 * or End, the other is pushed to it — Start = max(Start, Deepest), End = min(End, Deepest) — on read only, with
 * nothing written back. The stored spec is never mutated.
 *
 * The angle in use is settled here and nowhere else (D-44): 0 for Parallel; for With the rail and Toe-in, the angle
 * the shaper set by hand, or — with none set, or one that is not a number — that run's own (`channelDefaultAngle`,
 * which needs the wing `rule` to know which rail a winged board's channels follow), held between 0 and
 * `CHANNEL_ANGLE_MAX`.
 */
export function resolveChannels(spec: BottomChannelsSpec, board: BottomBoard, rule: BottomWingRule): ResolvedChannels {
  const deepest = clampStation(board.frontFins + spec.deepestFromFins, board);
  const start = mm(Math.max(clampStation(board.frontFins + spec.startFromFins, board), deepest));
  const byHand = spec.angle !== null && Number.isFinite(spec.angle) ? spec.angle : null;
  const angle = spec.run === "parallel" ? 0 : clampChannelAngle(byHand ?? channelDefaultAngle(spec.run, { start, deepest }, board, rule));
  return {
    count: spec.count,
    width: spec.width,
    offStringer: spec.offStringer,
    start,
    deepest,
    end: mm(Math.min(clampStation(spec.end, board), deepest)),
    depth: spec.depth,
    smoothness: spec.smoothness,
    run: spec.run,
    angle,
    longest: spec.longest,
    stagger: spec.stagger,
  };
}

/** The whole bottom, read (D-03, D-36, D-39). */
export function resolveBottom(bottom: BoardBottom, board: BottomBoard): ResolvedBottom {
  return {
    nose: resolveCut("nose", bottom.nose, board),
    center: resolveCut("center", bottom.center, board),
    tail: resolveCut("tail", bottom.tail, board),
    channels: resolveChannels(bottom.channels, board, bottom.wingRule),
    wingRule: bottom.wingRule,
  };
}

/**
 * Start ≥ Deepest ≥ End, kept (D-07, R4): the sketch's `normalize`. The station just moved wins and the others are
 * pushed ahead of it — a value is never stopped. Read on the board (stations from the tail), then stored again; a Tail
 * cut's Deepest At stays measured from the fins.
 *
 * A double's two across marks are kept in order too, against its half-width at Deepest At (never read under an inch):
 * Off Stringer at most half of it, Trough At at least Off Stringer + 1/4" and at most 85% of it. `rule` is the bottom's
 * own `wingRule`, which the half-width is measured against (D-19).
 */
export function keepStationsInOrder(
  section: BottomSectionKey,
  spec: BottomCutSpec,
  changed: "start" | "deepest" | "end",
  board: BottomBoard,
  rule: BottomWingRule,
): BottomCutSpec {
  const kind = cutKind(spec.name);
  if (kind === "flat") return { ...spec };
  const c = absoluteStations(section, spec, board);
  if (changed === "start") { if (c.deepest > c.start) c.deepest = c.start; if (c.end > c.deepest) c.end = c.deepest; }
  else if (changed === "end") { if (c.deepest < c.end) c.deepest = c.end; if (c.start < c.deepest) c.start = c.deepest; }
  else if (changed === "deepest") { if (c.start < c.deepest) c.start = c.deepest; if (c.end > c.deepest) c.end = c.deepest; }
  const kept: BottomCutSpec = { ...spec, ...storedStations(section, c, board) };
  if (kind === "double") {
    const C = Math.max(DOUBLE_MIN_HALF_WIDTH, refAt(board, rule, c.deepest) - spec.offRail);
    kept.offStringer = mm(Math.min(spec.offStringer, C * DOUBLE_FLAT_SHARE));
    kept.troughAt = mm(Math.max(kept.offStringer + DOUBLE_TROUGH_GAP, Math.min(spec.troughAt, C * DOUBLE_TROUGH_SHARE)));
  }
  return kept;
}

/**
 * One of a cut's three stations set from the tail — a station slider's drag on BOTTOM (D-07, R4) — as the patch that
 * stores it the way the cut keeps it: from the nose for a Nose cut (D-39), from the front fins for a Tail cut's Deepest
 * At (D-03), from the tail for every other. The other two stations are not in the patch; the store applies it and keeps
 * the three in order in the same step (`keepStationsInOrder`, the dragged one winning).
 */
export function storeCutStation(
  section: BottomSectionKey,
  field: "start" | "deepest" | "end",
  fromTail: Mm,
  board: Pick<BottomBoard, "length" | "frontFins">,
): Partial<BottomCutSpec> {
  if (section === "nose") return { [field]: mm(board.length - fromTail) };
  if (section === "tail" && field === "deepest") return { deepest: mm(fromTail - board.frontFins) };
  return { [field]: mm(fromTail) };
}

/**
 * A cut's station as its label reads it (D-07): taped from the nose for a Nose cut, from the tail for a Center or Tail
 * cut — the same rule the top view's lower rail reads (`topViewMarks`).
 */
export function stationFromNearestTip(section: BottomSectionKey, fromTail: Mm, board: Pick<BottomBoard, "length">): Mm {
  return section === "nose" ? mm(board.length - fromTail) : fromTail;
}

/**
 * A section's cut picked from its menu, opening on its starting numbers (D-08) — the pure half of the store's pick
 * (17-08's `pickBottomCut`, which writes the result in one undoable step).
 *
 * D-42: a center single opens on the numbers its tail asks for (`startingCut`'s `tail`). Picking a new tail cut moves
 * a center single that is still exactly on the starting numbers of the tail it had to the starting numbers of the new
 * one — so picking a tail vee runs that single out at the front fins, and picking a tail that is not a vee puts it
 * back. A center single set by hand (any number moved) is never touched.
 */
export function pickCut(bottom: BoardBottom, section: BottomSectionKey, name: BottomCutName, board: BottomBoard): BoardBottom {
  const next: BoardBottom = { ...bottom, [section]: startingCut(section, name, board, section === "center" ? bottom.tail.name : undefined) };
  if (section === "tail" && cutKind(bottom.center.name) === "single") {
    const asOpened = startingCut("center", bottom.center.name, board, bottom.tail.name);
    if (sameFields(bottom.center, asOpened)) next.center = startingCut("center", bottom.center.name, board, name);
  }
  return next;
}

/* ============ the default, and whether a bottom cuts anything ============ */

/** How many channels a set can have (D-10): two, three or four a side. */
export type ChannelCount = 4 | 6 | 8;

/** Each count's starting width (D-10, D-11; the sketch's `channelWidth`): 2 1/2" for 4, 1 3/4" for 6, 1 1/4" for 8. */
export const CHANNEL_STARTING_WIDTHS: Readonly<Record<ChannelCount, Mm>> = {
  4: inchesToMm(2.5),
  6: inchesToMm(1.75),
  8: inchesToMm(1.25),
};

/** A width this close to one of the three starting widths is still a starting width, so it follows the count (the
 * sketch's 0.01). */
export const CHANNEL_WIDTH_FOLLOWS: Mm = mm(0.01);

/**
 * Every board opens flat with no channels (D-04, D-10). The channels' numbers are D-11's, kept for when a count is
 * picked: 5/16" deep, from 12" ahead of the front fins, deepest at them, out the tail, Off Stringer 0, Smoothness 0,
 * Parallel (so no angle set by hand, D-44), the outer pair longest with a 2" stagger, and the six-channel width of
 * 1 3/4".
 */
export const DEFAULT_BOTTOM: BoardBottom = {
  nose: flatSpec(FLAT_CUT_NAMES.nose),
  center: flatSpec(FLAT_CUT_NAMES.center),
  tail: flatSpec(FLAT_CUT_NAMES.tail),
  channels: {
    count: 0,
    width: CHANNEL_STARTING_WIDTHS[6],
    offStringer: mm(0),
    startFromFins: inchesToMm(12),
    deepestFromFins: mm(0),
    end: mm(0),
    depth: inchesToMm(5 / 16),
    smoothness: 0,
    run: "parallel",
    angle: null,
    longest: "outer",
    stagger: inchesToMm(2),
  },
  wingRule: "narrowest",
};

/**
 * A channel count picked (D-10, D-11): the set opens on D-11's numbers — 5/16" deep, from 12" ahead of the front fins,
 * deepest at them, out the tail, Off Stringer 0, Smoothness 0, Parallel, the outer pair longest with a 2" stagger —
 * and the count's own starting width, unless the width there now was set by hand (more than 0.01 mm from all three
 * starting widths), which is kept (the sketch's count pick, template.html line 1124). Start and Deepest At are stored
 * from the front fins, so the set opens at the same place on any `board`; nothing else about the board changes them.
 */
export function startingChannels(count: ChannelCount, board: BottomBoard, current: BottomChannelsSpec): BottomChannelsSpec {
  const followsCount = ([4, 6, 8] as const).some((n) => Math.abs(current.width - CHANNEL_STARTING_WIDTHS[n]) < CHANNEL_WIDTH_FOLLOWS);
  return { ...DEFAULT_BOTTOM.channels, count, width: followsCount ? CHANNEL_STARTING_WIDTHS[count] : current.width };
}

/**
 * A channel count picked from BOTTOM's `Channels` menu (D-10, D-11; the orchestrator's ruling at 17-09): the count, and
 * that count's starting width (2 1/2" · 1 3/4" · 1 1/4") unless the width there now was set by hand — `startingChannels`'
 * own width rule — with every other channel number kept as it is. `None` (0) hides the set and keeps every number, so
 * the next count opens on them again (UI-SPEC §2, "keeps the settings for the next count"). A board that has never had
 * channels holds D-11's numbers (`DEFAULT_BOTTOM.channels`), so its first count opens exactly on `startingChannels`
 * (the sketch's count pick, template.html line 1124, which changes the count and the width and nothing else).
 */
export function switchChannelCount(current: BottomChannelsSpec, count: BottomChannelsSpec["count"], board: BottomBoard): BottomChannelsSpec {
  if (count === 0) return { ...current, count: 0 };
  return { ...current, count, width: startingChannels(count, board, current).width };
}

/**
 * A Run picked from BOTTOM's `Run` menu (D-10, D-44): the run, and — when it is a different run from the one there —
 * the angle put back to that run's own (`angle: null`), so With the rail opens on the rail's own angle and Toe-in on
 * the fins' toe-in whatever the other was set to. Picking the run already there changes nothing, an angle set by hand
 * included. Every other channel number is kept.
 */
export function switchChannelRun(current: BottomChannelsSpec, run: BottomChannelsSpec["run"]): BottomChannelsSpec {
  return current.run === run ? current : { ...current, run, angle: null };
}

/**
 * An angle off the Angle slider, as it is stored (D-44): on the slider's own 1/2° grid (`CHANNEL_ANGLE_STEP`), between
 * 0 and `CHANNEL_ANGLE_MAX`. The slider's dot rests on a run's own angle (9.1°, say) until it is moved, so its first
 * step would otherwise store a figure off the grid.
 */
export function snapChannelAngle(degrees: number): number {
  return clampChannelAngle(Math.round(degrees / CHANNEL_ANGLE_STEP) * CHANNEL_ANGLE_STEP);
}

/**
 * One of the channels' three stations set from the tail — a channel station slider's drag on BOTTOM (D-03, D-07) — as
 * the patch that stores it the way the channels keep it: Start and Deepest At from the front fins, End from the tail.
 * The other two are not in the patch; the store keeps the three in order in the same step
 * (`keepChannelStationsInOrder`, the dragged one winning).
 */
export function storeChannelStation(
  field: "start" | "deepest" | "end",
  fromTail: Mm,
  board: Pick<BottomBoard, "frontFins">,
): Partial<BottomChannelsSpec> {
  if (field === "start") return { startFromFins: mm(fromTail - board.frontFins) };
  if (field === "deepest") return { deepestFromFins: mm(fromTail - board.frontFins) };
  return { end: fromTail };
}

/**
 * Start ≥ Deepest ≥ End for the channels, kept as a cut's are (`keepStationsInOrder`; the sketch's `normalize`, which
 * runs on the channels too, template.html line 1013): read on the board (stations from the tail, clamped to it), the
 * station just moved wins and the others are pushed ahead of it — a value is never stopped — then stored again, Start
 * and Deepest At from the front fins. Only the starts stagger, so nothing else moves.
 */
export function keepChannelStationsInOrder(
  spec: BottomChannelsSpec,
  changed: "start" | "deepest" | "end",
  board: Pick<BottomBoard, "length" | "frontFins">,
): BottomChannelsSpec {
  const clamp = (s: number) => Math.max(0, Math.min(board.length, s));
  const c = { start: clamp(board.frontFins + spec.startFromFins), deepest: clamp(board.frontFins + spec.deepestFromFins), end: clamp(spec.end) };
  if (changed === "start") { if (c.deepest > c.start) c.deepest = c.start; if (c.end > c.deepest) c.end = c.deepest; }
  else if (changed === "end") { if (c.deepest < c.end) c.deepest = c.end; if (c.start < c.deepest) c.start = c.deepest; }
  else { if (c.start < c.deepest) c.start = c.deepest; if (c.end > c.deepest) c.end = c.deepest; }
  return { ...spec, startFromFins: mm(c.start - board.frontFins), deepestFromFins: mm(c.deepest - board.frontFins), end: mm(c.end) };
}

/** Whether the bottom takes any foam: false when every section is flat (or 0 deep) and there are no channels. */
export function bottomHasCut(bottom: BoardBottom): boolean {
  for (const section of BOTTOM_SECTIONS) {
    const cut = bottom[section];
    if (cutKind(cut.name) !== "flat" && cut.depth > 0) return true;
  }
  return bottomHasChannels(bottom);
}

/** Whether the bottom cuts channels: a count picked and a depth above 0. */
export function bottomHasChannels(bottom: BoardBottom): boolean {
  return bottom.channels.count > 0 && bottom.channels.depth > 0;
}

function sameFields<T extends object>(a: T, b: T): boolean {
  const keys = Object.keys(b) as (keyof T)[];
  if (Object.keys(a).length !== keys.length) return false;
  return keys.every((k) => Object.is(a[k], b[k]));
}

/** Whether a bottom is `DEFAULT_BOTTOM`, field for field. */
export function isDefaultBottom(bottom: BoardBottom): boolean {
  return (
    BOTTOM_SECTIONS.every((section) => sameFields(bottom[section], DEFAULT_BOTTOM[section])) &&
    sameFields(bottom.channels, DEFAULT_BOTTOM.channels) &&
    bottom.wingRule === DEFAULT_BOTTOM.wingRule &&
    Object.keys(bottom).length === Object.keys(DEFAULT_BOTTOM).length
  );
}

/* ============ what Off Rail is measured from ============ */

/** The sketch's `refAt`: the Narrowest outline, or the Natural one (D-19). The same line on a wingless board. */
export function refAt(board: BottomBoard, rule: BottomWingRule, s: Mm): Mm {
  return rule === "natural" ? board.curveAt(s) : board.narrowestAt(s);
}

/* ============ the one number (D-05, D-06) ============ */

/** The across-section curve of a concave (u 0..1, r = smoothness 0..1): deepest at u = 0, nothing at u = 1. */
export const sec = (u: number, r: number): number => (1 - r) * (1 - u) + r * (1 + Math.cos(Math.PI * u)) / 2;
/** The across-section curve of a lift: nothing at the stringer (u = 0), full at the rail (u = 1). */
export const rise = (u: number, r: number): number => (1 - r) * u + r * (1 - Math.cos(Math.PI * u / 2));
/** The fade along the board, 0 to 1 (the sketch's `sm`). */
export const smoothstep = (t: number): number => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;

/**
 * How much of a cut's depth it has at station `s`, given its Start `a`, Deepest At `p` and End `b` (stations from the
 * tail): 0 outside the cut, 1 at its deepest, a smoothstep between — and full depth to the tip where a start or an end
 * lands on one (D-06). The sketch's `fadeAt`.
 */
export function fadeAt(a: number, p: number, b: number, s: number, length: number): number {
  if (s > a + STATION_GUARD || s < b - STATION_GUARD) return 0;
  if (s >= p) { if (a - p < FADE_GUARD) return 1; if (a >= length - TIP_TOLERANCE) return 1; return smoothstep((a - s) / (a - p)); }
  if (p - b < FADE_GUARD) return 1; if (b <= TIP_TOLERANCE) return 1; return smoothstep((s - b) / (p - b));
}

/**
 * A concave's half-width at a station: the reference rail less Off Rail (the sketch's `cutHalfWidth`). A cut that closes
 * to a point (the Teardrop's, D-06 / D-32) narrows behind its Deepest At by √((s − End) / (Deepest − End)), to nothing
 * at its End.
 */
export function cutHalfWidth(cut: ResolvedCut, board: BottomBoard, rule: BottomWingRule, s: Mm): Mm {
  let C = refAt(board, rule, s) - cut.offRail;
  if (cut.closesToPoint && s < cut.deepest && cut.deepest - cut.end > FADE_GUARD) C *= Math.sqrt(Math.max(0, (s - cut.end) / (cut.deepest - cut.end)));
  return mm(C);
}

/**
 * A double's two across marks at half-width `C`, kept in order (the sketch's `doubleMarks`): the flat at the stringer
 * (Off Stringer, at most half the cut's width), then the trough (Trough At, at least 1/4" outside the flat and inside
 * 85% of the width).
 */
export function doubleMarks(cut: Pick<ResolvedCut, "offStringer" | "troughAt">, C: Mm): { flat: Mm; trough: Mm } {
  const a = Math.min(cut.offStringer, Math.max(0, C * DOUBLE_FLAT_SHARE));
  const t = Math.max(a + DOUBLE_TROUGH_GAP, Math.min(cut.troughAt, C * DOUBLE_TROUGH_SHARE));
  return { flat: mm(a), trough: mm(t) };
}

/**
 * One cut alone, in its two kinds of work (D-40): the foam it hollows out of the middle of the bottom (`concave` — a
 * single, a double) and the foam it lifts off toward the rail (`lift` — a vee, a belly, the Spiral Vee's vee). The
 * sketch's `cutOff` is their sum, in its own order (see `cutFoamOff`).
 *
 * - A single concave: `depth × fade × min(1, C / PINCH) × sec(y / C, r)` inside its half-width C — narrower than 3" it
 *   shallows in proportion, so a tip never gets a slot.
 * - A double concave takes nothing inside its flat (Off Stringer), so a single stacked on it leaves the stringer as
 *   the ridge; from the flat it deepens to its trough and shallows again to its edge, `D × sec(u, r)` with
 *   `D = depth × fade × min(1, (C − flat) / PINCH)`.
 * - The Spiral Vee is that double with a Vee Lift under it: `veeLift × fade × rise(y / W, 0)`, nothing at the stringer.
 * - A vee or a belly lifts from Off Stringer (the Tri-Plane's flat panel) out to the rail `railAt(s)`:
 *   `depth × fade × rise((y − F) / (W − F), r)`.
 *
 * Nothing where the board has no rail. A cut may run past its own section; whatever it overlaps, it adds to.
 */
export function cutFoamOffParts(cut: ResolvedCut, board: BottomBoard, rule: BottomWingRule, s: Mm, y: Mm): { concave: number; lift: number } {
  const none = { concave: 0, lift: 0 };
  const W = board.railAt(s);
  if (W <= 0) return none;
  if (cut.kind === "flat" || cut.depth <= 0) return none;
  const f = fadeAt(cut.start, cut.deepest, cut.end, s, board.length); if (f <= 0) return none;
  const r = cut.smoothness / 100; let concave = 0; let lift = 0;
  if (cut.kind === "single" || cut.kind === "double") {
    const C = cutHalfWidth(cut, board, rule, s);
    if (C > 0 && y < C) {
      if (cut.kind === "single") concave += cut.depth * f * Math.min(1, C / PINCH) * sec(y / C, r);
      else {
        const { flat: a, trough: t } = doubleMarks(cut, C);
        if (y > a) {
          const D = cut.depth * f * Math.min(1, (C - a) / PINCH);
          const u = y < t ? (t - y) / (t - a) : (y - t) / (C - t);
          concave += D * sec(Math.min(1, u), r);
        }
      }
    }
    if (cut.spiral && cut.veeLift > 0 && W > 0) lift += cut.veeLift * f * rise(Math.min(1, y / W), 0);
  } else { // vee or belly: a lift from the stringer (or the flat panel's edge, Off Stringer) out to the rail
    const F = cut.offStringer; if (y > F && W > F) lift += cut.depth * f * rise((y - F) / (W - F), r);
  }
  return { concave, lift };
}

/**
 * One cut alone: the foam it takes off at station `s`, `y` out from the stringer — the sketch's `cutOff`, its concave
 * work and its lift added in the sketch's own order (`cutFoamOffParts`).
 */
export function cutFoamOff(cut: ResolvedCut, board: BottomBoard, rule: BottomWingRule, s: Mm, y: Mm): Mm {
  const { concave, lift } = cutFoamOffParts(cut, board, rule, s, y);
  return mm(concave + lift);
}

/**
 * THE one number (D-05): the foam the bottom takes off at station `s`, `y` out from the stringer — the sections' cuts
 * added in shop order (every term is ≥ 0, so the order is the listing order, not an arithmetic one), never below 0.
 *
 * Two kinds of cut, two rules (D-09, D-40):
 * - a concave takes foam from the middle of the bottom, so it is held so that at least 1/4" of foam is left under the
 *   planed thickness (`BOTTOM_FLOOR`) — the floor at the stringer;
 * - a vee or a belly lifts the rails and never touches the stringer (its foam off there is exactly 0). The founder,
 *   2026-11-08: "Belly and Vee should never take thickness off the stringer. The result is a lifted, thinned rail" and
 *   "no lips should ever be present. The contour should extend to the rail and make it effectively thinner." So a
 *   lift is never clamped: it runs out to the rail whatever the foam is there. Where it would reach the deck, the
 *   section's foam simply ends (`bottomedHalfSection` in volume.ts), and a rail left under 1/4" is flagged, not cut
 *   shallower.
 *
 * A double's flat and troughs are concave work (held); the Spiral Vee's vee and the Tri-Plane's planes are lifts (never
 * held, nothing at the stringer).
 *
 * The channels are cut last, into whatever the sections leave (D-05, D-10): their foam off (`channelFoamOff`) is the
 * last term of the sum. Each channel's floor starts at its peak, where it takes nothing — the stringer itself is the
 * first peak — so the channels never take foam off the stringer and are never held there; like a lift, nothing clamps
 * them (D-40 binds their walls too): where a channel's floor would meet the deck near a thin rail, the section's foam
 * ends there and the rail is flagged (`bottomFloorFlags`).
 */
export function foamOff(resolved: ResolvedBottom, board: BottomBoard, s: Mm, y: Mm): Mm {
  if (board.railAt(s) <= 0) return mm(0);
  return mm(sectionsFoamOff(resolved, board, s, y) + channelFoamOff(resolved.channels, board, resolved.wingRule, s, y));
}

/**
 * The one number without the channels (G-17-6, the founder's ruling of 2026-11-10: "channels are the last cut, made
 * after the rail is shaped"): the foam the vees, bellies and concaves alone take off at station `s`, `y` out from the
 * stringer — the concaves held by the 1/4" floor at the stringer, the lifts never held, exactly as `foamOff` adds them.
 * The vees and bellies are cut before the rails are shaped, so this is the bottom the rail stands on (RAILS' rail lift
 * reads it at the rail); the channels are cut afterwards, into what this leaves. `foamOff` is this plus
 * `channelFoamOff`, added in that order, so it is the same number to the last bit.
 */
export function sectionsFoamOff(resolved: ResolvedBottom, board: BottomBoard, s: Mm, y: Mm): Mm {
  if (board.railAt(s) <= 0) return mm(0);
  const { concave, lift } = foamOffParts(resolved, board, s, y);
  const held = Math.min(Math.max(0, concave), stringerFloorCap(board, s));
  return mm(held + Math.max(0, lift));
}

/** The most concave work a station holds: the planed thickness less the 1/4" floor (D-09), never below 0. */
function stringerFloorCap(board: BottomBoard, s: Mm): number {
  return Math.max(0, board.thicknessAt(s) - BOTTOM_FLOOR);
}

/** The sections' concave work and lifts at a point, each summed in shop order, before the floor holds the concaves. */
function foamOffParts(resolved: ResolvedBottom, board: BottomBoard, s: Mm, y: Mm): { concave: number; lift: number } {
  let concave = 0;
  let lift = 0;
  for (const section of BOTTOM_SECTIONS) {
    const parts = cutFoamOffParts(resolved[section], board, resolved.wingRule, s, y);
    concave += parts.concave;
    lift += parts.lift;
  }
  return { concave, lift };
}

/* ============ the channels (D-10, D-11): the founder's sawtooth, cut last ============ */

/** The last wall never lands closer than this to the reference rail at the deepest station (the sketch's
 * `OFF_RAIL_MIN`): a set that would is squeezed. */
export const CHANNEL_OFF_RAIL_MIN: Mm = inchesToMm(1 / 2);
/** A channel narrower than this shallows out in proportion, as a concave does (the sketch's `IN` in `cutOff`). */
export const CHANNEL_PINCH: Mm = inchesToMm(1);
/** A staggered channel never starts closer than this ahead of the deepest station, so the shortest keeps a lead-in
 * (the sketch's `IN` in `chStart`). */
export const CHANNEL_LEAD_IN: Mm = inchesToMm(1);
/** A channel whose wall is no further than this off the stringer is not there (the sketch's 0.5 in `channelEdges`);
 * a set this narrow or narrower has no channels at all. */
export const CHANNEL_EDGE_MIN: Mm = mm(0.5);
/** A fitted width this far under the asked width says the set was squeezed (the sketch's 0.01). */
export const CHANNEL_SQUEEZE_GUARD: Mm = mm(0.01);
/** With the rail, the channels stop narrowing at an inch each (`CHANNEL_PINCH`). They ease into that over this much
 * of width either side of it, so a wall bends into its straight run rather than kinking (see `channelRailWidth`). */
export const CHANNEL_RAIL_EASE: Mm = inchesToMm(1 / 2);
/** The steepest the two angled runs can be laid, in degrees (D-44): the Angle slider runs 0° to this. Ours, for the
 * founder to change — the rail's own angle on the four starting boards is about 9° to 11°. */
export const CHANNEL_ANGLE_MAX = 15;
/** The Angle slider's step, in degrees (D-44). Ours, for the founder to change. */
export const CHANNEL_ANGLE_STEP = 0.5;

/**
 * A channel's floor across its width (the founder's pictures, 2026-11-06: "a quick V that goes into a vertical
 * wall"): u = 0 at its peak (the stringer, or the wall top of the channel inside it), 1 at its own wall at the rail
 * side; straight at r = 0, scooped at r = 1. The sketch's `chan`.
 */
export const chan = (u: number, r: number): number => (1 - r) * u + r * (1 - Math.cos(Math.PI * u / 2));

/**
 * The width the channels get at the deepest station and what the last wall leaves to the reference rail there (the
 * sketch's `channelFit`): the width asked for, squeezed only if the set would not fit with 1/2" left to the rail —
 * `squeezed` says so. `offRail` is read out, never set (D-10). A set of no channels has nothing to fit.
 */
export function channelFit(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule): { perSide: number; width: Mm; offRail: Mm; squeezed: boolean } {
  const n = ch.count / 2;
  const W = refAt(board, rule, ch.deepest);
  if (n < 1) return { perSide: 0, width: mm(0), offRail: mm(W - ch.offStringer), squeezed: false };
  const w = Math.max(0, Math.min(ch.width, (W - ch.offStringer - CHANNEL_OFF_RAIL_MIN) / n));
  return { perSide: n, width: mm(w), offRail: mm(W - ch.offStringer - n * w), squeezed: w < ch.width - CHANNEL_SQUEEZE_GUARD };
}

/** How many Staggers shorter than the longest pair channel `j` (0 beside the stringer) starts (the sketch's `chSteps`). */
function channelSteps(ch: ResolvedChannels, j: number): number {
  return ch.longest === "inner" ? j : ch.longest === "outer" ? ch.count / 2 - 1 - j : 0;
}

/**
 * Where channel `j` (0 beside the stringer) starts, from the tail (the sketch's `chStart`): Stagger behind its
 * neighbour toward the longest pair, never closer than an inch ahead of the deepest station. Only the starts stagger:
 * every channel is deepest at the same station and they all end together (D-10).
 */
export function channelStart(ch: ResolvedChannels, j: number): Mm {
  return mm(Math.max(Math.min(ch.start, ch.deepest + CHANNEL_LEAD_IN), ch.start - channelSteps(ch, j) * ch.stagger));
}

/** How much of the channels' depth channel `j` has at station `s` (the sketch's `chFade`). */
function channelFade(ch: ResolvedChannels, j: number, s: Mm, length: Mm): number {
  return fadeAt(channelStart(ch, j), ch.deepest, ch.end, s, length);
}

/** An angle held to what a run can be laid at: 0 to `CHANNEL_ANGLE_MAX` degrees, and 0 for anything not a number. */
function clampChannelAngle(degrees: number): number {
  return Number.isFinite(degrees) ? Math.max(0, Math.min(CHANNEL_ANGLE_MAX, degrees)) : 0;
}

/**
 * A run's OWN angle, in degrees — the one the channels are laid at until the shaper sets another by hand (the
 * founder, 2026-11-10, D-44: "The toe in and splayed out (along rail) needs an angle adjustment. Set default by the
 * rail and the fins toe in, but overiderable.").
 *
 * - **Parallel** has none: 0.
 * - **Toe-in** is the front fins' raw toe-in (`board.toeDegrees`), so the channels point where the fins point; 0 on a
 *   board whose fins have no toe.
 * - **With the rail** is the rail's own angle over the channels' length: the straight line from the reference rail at
 *   Deepest At to the reference rail at Start (the longest pair's), measured off the stringer. A last wall laid at it
 *   is exactly as far off the rail at Start as it is at Deepest At. Where Start is within an inch of Deepest At there
 *   is no length to measure over, so the inch ahead of Deepest At is used instead (`CHANNEL_LEAD_IN`, the same inch
 *   the shortest channel always keeps); at the very nose, with no board ahead, it is 0. The reference rail is the wing
 *   rule's (`refAt`), so a winged board's channels follow the rail they are measured from.
 *
 * Never negative — a rail that narrows toward the nose over that stretch gives 0, the walls then running straight —
 * and never more than `CHANNEL_ANGLE_MAX`.
 */
export function channelDefaultAngle(
  run: BottomChannelsSpec["run"],
  ch: Pick<ResolvedChannels, "start" | "deepest">,
  board: BottomBoard,
  rule: BottomWingRule,
): number {
  if (run === "parallel") return 0;
  if (run === "toe") return clampChannelAngle(board.toeDegrees);
  const ahead = ch.start - ch.deepest >= CHANNEL_LEAD_IN ? ch.start : mm(Math.min(board.length, ch.deepest + CHANNEL_LEAD_IN));
  const span = ahead - ch.deepest;
  if (!(span > 0)) return 0;
  const rise = refAt(board, rule, ahead) - refAt(board, rule, ch.deepest);
  return clampChannelAngle((Math.atan(rise / span) * 180) / Math.PI);
}

/**
 * How wide each channel of a set laid With the rail is at a station, from the width its straight, fanning walls
 * alone would give it there (`raw`: the set's Width, plus the last wall's turn since the deepest station shared
 * between the channels — less than Width toward the tail, more toward the nose) and the set's fitted Width (`set`).
 *
 * The founder's ruling (2026-11-10, D-43): "the channels with the rail shoud never bunch at the tip. the early
 * wording was correct. They either are straight, or splay in (toe in with the fins) or out (following the rail line)
 * but never meet at a single point." D-44 made the walls straight lines; this is what keeps them from meeting.
 *
 * So a channel narrows toward the tail only while that leaves it real width. It is never narrower than an inch (or
 * than the set's own Width, where that is under an inch): from there to the tip the walls run parallel, an inch
 * apart, and the outer ones run out through the rail as a Parallel set's do. Between fanning and running parallel the
 * width bends over rather than kinks — over the 1/2" either side of the narrowest (less where the set's Width is
 * within 1/2" of it), meeting both with no step and no corner. A channel the fan leaves 1/2" or more wider than the
 * narrowest is exactly as wide as the fan gives it: at the deepest station that is the fitted Width itself.
 */
export function channelRailWidth(raw: Mm, set: Mm): Mm {
  const floor = Math.min(set, CHANNEL_PINCH);
  const ease = Math.min(CHANNEL_RAIL_EASE, set - floor);
  // no room to ease in (a Width of an inch or less): the channels simply stop narrowing at the set's own Width
  if (!(ease > 0)) return mm(Math.max(raw, floor));
  const x = raw - floor;
  if (x >= ease) return raw;
  if (x <= -ease) return mm(floor);
  return mm(floor + (x + ease) ** 2 / (4 * ease));
}

/**
 * One side's channels at a station, each `[inner, outer, index]` out from the stringer — abutting, the outer of one
 * the inner of the next, `index` 0 beside the stringer (the sketch's `channelEdges`, but for the two angled runs — see
 * below). At the deepest station the walls are ruled at Width, 2 × Width … out from Off Stringer, whatever the run.
 *
 * - **Parallel** rules them straight from there; where the outline narrows the outer ones run out through the rail.
 * - **With the rail** (D-44, the founder's photo: "Along the rail is subtle, like the middle board in this image")
 *   lays every wall as a STRAIGHT line, and the set fans. The last wall passes through its place at the deepest
 *   station at the angle in use (`ch.angle`), closing toward the stringer going to the tail and opening toward the
 *   nose; the wall beside the stringer stays at Off Stringer; the walls between share the turn evenly, so wall `j` of
 *   `n` turns `j / n` of what the last one does. Each channel is therefore `Width + (s − deepest) × tan(angle) / n`
 *   wide at station `s` — but never narrower than an inch (`channelRailWidth`), so the set never bunches and its walls
 *   never meet at a point (D-43): where the fan would take a channel under an inch the walls run on parallel, and the
 *   outer ones run out through the rail. At an angle of 0 the set is a Parallel set exactly.
 * - **Toe-in** keeps every channel its Width and angles the whole set at the angle in use — inward toward the nose,
 *   splayed out toward the tail. On its own angle that is the front fins' raw toe-in, so a board whose fins have none
 *   is laid as Parallel until the shaper sets an angle by hand (D-44).
 *
 * Only channels whose wall stands more than 1/2 mm off the stringer are kept, and only channels more than 1/2 mm wide:
 * a channel with no real width is not a channel. A wall past the rail is still returned, on every run: the board ends
 * at its rail, so nothing is cut out there, and DATA and the top view show a wall only between the stringer and the
 * rail. That is what lets an angled wall run out through the rail — toward the tail on any run, and ahead of the
 * deepest station too when an angle set by hand is steeper than the rail's own.
 */
export function channelEdges(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule, s: Mm): [inner: Mm, outer: Mm, index: number][] {
  const { perSide: n, width: w } = channelFit(ch, board, rule);
  if (n < 1 || w <= CHANNEL_EDGE_MIN) return [];
  let w2: number = w;
  let shift = 0;
  if (ch.run === "rail") w2 = channelRailWidth(mm(w + ((s - ch.deepest) * Math.tan(ch.angle * Math.PI / 180)) / n), w);
  else if (ch.run === "toe" && ch.angle > 0) shift = (s - ch.deepest) * Math.tan(ch.angle * Math.PI / 180);
  const out: [Mm, Mm, number][] = [];
  for (let j = 0; j < n; j++) {
    const a = ch.offStringer + j * w2 - shift;
    const b = a + w2;
    const inner = Math.max(0, a);
    if (b > CHANNEL_EDGE_MIN && b - inner > CHANNEL_EDGE_MIN) out.push([mm(inner), mm(b), j]);
  }
  return out;
}

const CHANNEL_WALL_PREFIX = "channels:wall:";
/** The layout-mark key of channel wall `n` (1 out from the stringer): `channels:wall:n`. */
export const channelWallKey = (n: number): string => `${CHANNEL_WALL_PREFIX}${n}`;
/** The layout-mark key of the channels' flat edge (Off Stringer): `channels:flat`. */
export const CHANNEL_FLAT_KEY = "channels:flat";

/**
 * The channels' layout marks at a station, out from the stringer — as a shaper rules them (the sketch's
 * `channelMarks`): the flat's edge when Off Stringer is more than 1/2 mm (`channels:flat`), then every wall
 * (`channels:wall:1` …). `on` says whether that channel has started by this station: a staggered set's shorter
 * channels have not, ahead of their own starts, so their walls are neither cut nor ruled there.
 */
export function channelMarks(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule, s: Mm): { across: Mm; column: string; on: boolean }[] {
  const edges = channelEdges(ch, board, rule, s);
  const out: { across: Mm; column: string; on: boolean }[] = [];
  if (ch.offStringer > CHANNEL_EDGE_MIN && edges.length) {
    out.push({ across: edges[0][0], column: CHANNEL_FLAT_KEY, on: channelFade(ch, edges[0][2], s, board.length) > BOTTOM_MARK_FADE_MIN });
  }
  for (const [, b, j] of edges) out.push({ across: b, column: channelWallKey(j + 1), on: channelFade(ch, j, s, board.length) > BOTTOM_MARK_FADE_MIN });
  return out;
}

/**
 * The foam the channels take off at station `s`, `y` out from the stringer — the channels' branch of the sketch's
 * `cutOff`, line for line: in the channel `[a, b]` that holds `y`, `depth × fade × min(1, (b − a) / 1") × chan(u, r)`
 * with u = (y − a) / (b − a) — nothing at its peak, the full cut at its wall — each channel faded in from its own
 * start. Nothing with fewer than four channels, at no depth, or where the board has no rail — and nothing in a channel
 * of no width, whose u would be 0 / 0: the foam off is always a finite number (CR-01).
 */
export function channelFoamOff(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule, s: Mm, y: Mm): Mm {
  if (ch.count < 4 || ch.depth <= 0) return mm(0);
  if (board.railAt(s) <= 0) return mm(0);
  const f = fadeAt(ch.start, ch.deepest, ch.end, s, board.length);
  if (f <= 0) return mm(0);
  const r = ch.smoothness / 100;
  for (const [a, b, j] of channelEdges(ch, board, rule, s)) {
    if (y >= a && y <= b) {
      const fj = channelFade(ch, j, s, board.length);
      if (fj <= 0) return mm(0);
      const span = b - a;
      if (!(span > 0)) return mm(0);
      return mm(ch.depth * fj * Math.min(1, span / CHANNEL_PINCH) * chan((y - a) / span, r));
    }
  }
  return mm(0);
}

/**
 * Every wall of one side at a station, out from the stringer — one per channel a side, in order, the same number at
 * every station (D-21, research §B): channel `j`'s wall at the outer edge `channelEdges` gives it, or at the stringer
 * where that channel is not there (its wall within 1/2 mm of the stringer). Whether a wall stands — whether its channel
 * has started and is cut there — is the one number's to say. None with fewer than four channels or at no depth.
 */
export function channelWallsAt(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule, s: Mm): Mm[] {
  if (ch.count < 4 || ch.depth <= 0) return [];
  const walls: Mm[] = Array.from({ length: ch.count / 2 }, () => mm(0));
  for (const [, b, j] of channelEdges(ch, board, rule, s)) walls[j] = b;
  return walls;
}

/**
 * The channels' walls as the litres, the 3D board and the CNC files read them (D-21): `channelWallsAt`, measured in
 * from the section's own inside edge as `bottomSampler`'s `across` is (less a swallow's notch wall), never below 0.
 * `design.ts` hands it to `volume.ts` as `bottomWallsAt` beside the sampler, only when the bottom has channels.
 */
export function bottomWallSampler(resolved: ResolvedBottom, board: BottomBoard): (station: Mm) => Mm[] {
  return (station) => {
    const inner = board.notchInner(station);
    return channelWallsAt(resolved.channels, board, resolved.wingRule, station).map((w) => mm(Math.max(0, w - inner)));
  };
}

/** The channels at a station, for the drawings and DATA: the fit at the deepest station, the edges and the marks. */
export function channelLayout(
  resolved: ResolvedBottom,
  board: BottomBoard,
  s: Mm,
): { fit: ReturnType<typeof channelFit>; edges: ReturnType<typeof channelEdges>; marks: ReturnType<typeof channelMarks> } {
  const { channels: ch, wingRule: rule } = resolved;
  return { fit: channelFit(ch, board, rule), edges: channelEdges(ch, board, rule, s), marks: channelMarks(ch, board, rule, s) };
}

/**
 * What the Width and Stagger labels read out, never set (D-10; the sketch's `labelFor`): the width asked for and the
 * width the set gets (`squeezed` when it had to be narrowed to fit), the ramp's angle from the depth and the fitted
 * width in whole degrees, the last wall's distance off the reference rail at the deepest station, and where the
 * shortest pair starts from the tail (the outer pair when the inner is longest, the inner otherwise). The words are
 * the screen's.
 *
 * The last wall's distance is never read out below nothing: with an Off Stringer wider than the board is at the deepest
 * station there is no set and no wall, and `channelFit`'s own figure (the rail less the Off Stringer) goes negative — a
 * distance the label must never print (the code review's CR-01, 2026-11-10).
 */
export function channelReadout(
  ch: ResolvedChannels,
  board: BottomBoard,
  rule: BottomWingRule,
): { width: Mm; fittedWidth: Mm; squeezed: boolean; rampDegrees: number; lastWallOffRail: Mm; shortestStart: Mm } {
  const fit = channelFit(ch, board, rule);
  return {
    width: ch.width,
    fittedWidth: fit.width,
    squeezed: fit.squeezed,
    rampDegrees: fit.width > 0 ? Math.round((Math.atan2(ch.depth, fit.width) * 180) / Math.PI) : 0,
    lastWallOffRail: mm(Math.max(0, fit.offRail)),
    shortestStart: channelStart(ch, ch.longest === "inner" ? ch.count / 2 - 1 : 0),
  };
}

/* ============ the one number, handed to the litres (D-05, D-21) ============ */

/** A reader that remembers its last station: the seam asks for every point of one section at the same station. */
function lastStation(read: (s: Mm) => Mm): (s: Mm) => Mm {
  let at = Number.NaN;
  let value = mm(0);
  return (s) => {
    if (!Object.is(s, at)) {
      at = s;
      value = read(s);
    }
    return value;
  };
}

/**
 * The bottom as the litres, the 3D board and the CNC files read it (D-05, D-21): at a station, `across` millimetres in
 * from the section's own inside edge, the foam the bottom takes off — `foamOff` at `across` plus the swallow's notch
 * wall (`notchInner`, 0 elsewhere), so a cut is read at its true distance from the stringer and the notch itself, which
 * is air, is never cut. `design.ts` builds it once per board and hands it to `volume.ts` as `foamOffAt`; the board's
 * readers are asked once per station, the same numbers either way.
 */
export function bottomSampler(resolved: ResolvedBottom, board: BottomBoard): (station: Mm, across: Mm) => Mm {
  const read = stationReaders(board);
  return (station, across) => foamOff(resolved, read, station, mm(across + read.notchInner(station)));
}

/**
 * `bottomSampler`'s twin for the vees, bellies and concaves alone (G-17-6, the founder, 2026-11-10): the bottom the
 * rail is shaped on, before the channels are cut into it — `sectionsFoamOff` read exactly as `bottomSampler` reads
 * `foamOff`, `across` in from the section's own inside edge plus a swallow's notch wall. The channels are then cut
 * straight up into whatever this and the finished rail leave.
 */
export function bottomSectionsSampler(resolved: ResolvedBottom, board: BottomBoard): (station: Mm, across: Mm) => Mm {
  const read = stationReaders(board);
  return (station, across) => sectionsFoamOff(resolved, read, station, mm(across + read.notchInner(station)));
}

/** The board's readers, each asked once per station (`lastStation`). */
function stationReaders(board: BottomBoard): BottomBoard {
  return {
    ...board,
    railAt: lastStation((s) => board.railAt(s)),
    curveAt: lastStation((s) => board.curveAt(s)),
    narrowestAt: lastStation((s) => board.narrowestAt(s)),
    foamAt: lastStation((s) => board.foamAt(s)),
    thicknessAt: lastStation((s) => board.thicknessAt(s)),
    notchInner: lastStation((s) => board.notchInner(s)),
  };
}

/**
 * DATA's first line (D-34): the litres now, the litres before the bottom, and the foam off between them, each to two
 * decimals. The foam off is worked out from the two figures as printed, in whole hundredths, so the line always adds
 * up as a shaper reads it: `before` less `foamOff` is `now`, digit for digit. A flat bottom reads `0.00`.
 */
export function bottomLitresLine(now: Litres, before: Litres): { now: string; before: string; foamOff: string } {
  const printedNow = now.toFixed(2);
  const printedBefore = before.toFixed(2);
  const hundredths = (printed: string) => Math.round(Number(printed) * 100);
  const off = hundredths(printedBefore) - hundredths(printedNow);
  return { now: printedNow, before: printedBefore, foamOff: (off / 100).toFixed(2) };
}

/**
 * DATA's first line's stringer (D-16; the sketch's `litresLine`): at the board's centre, half its length from the tail,
 * the planed thickness and what the bottom leaves of it at the stringer — the planed thickness less `foamOff` there.
 * Both are marks on screen (`2 1/16"`, `53 mm`).
 */
export function stringerAtCenter(resolved: ResolvedBottom, board: BottomBoard): { planed: Mm; left: Mm } {
  const s = mm(board.length / 2);
  const planed = board.thicknessAt(s);
  return { planed: mm(planed), left: mm(planed - foamOff(resolved, board, s, mm(0))) };
}

/* ============ DATA's numbers (D-16, R8): the depths every 6", the layout marks, the floor ============ */

/** DATA's rows step every 6" from the tail (the sketch's `drawData`). */
export const BOTTOM_DATA_STEP: Mm = inchesToMm(6);
/** The last 6" row stops this short of the nose, where the nose tip's own row stands (the sketch's 1). */
export const BOTTOM_DATA_NOSE_GAP: Mm = mm(1);
/** A row within this of the front fins or the wide point is a reference row, drawn in full ink (the sketch's 3"). */
export const BOTTOM_REFERENCE_REACH: Mm = inchesToMm(3);
/** A width, stringer or mark this close to nothing reads as nothing in DATA (the sketch's 0.5). */
export const BOTTOM_DATA_EDGE: Mm = mm(0.5);
/** A depth this small reads `—` in DATA (the sketch's 0.25) — for the component that formats DATA's cells. */
export const BOTTOM_DATA_DEPTH_SHOWN: Mm = mm(0.25);
/** A cut faded to this share of its depth or less rules no layout mark at a station (the sketch's 0.004). */
export const BOTTOM_MARK_FADE_MIN = 0.004;
/** The floor warning scans every 1/2" of the board, and every DATA row (D-09, D-33). */
export const BOTTOM_FLOOR_SCAN_STEP: Mm = inchesToMm(1 / 2);
/** The deepest cut is read at 61 points across, stringer to rail (the sketch's `deepestAt`). */
const DEEPEST_SPANS = 60;
/** The floor only "meets" a cut that passes it by more than this: a tie to the last binary digit is not a warning. */
const FLOOR_GUARD: Mm = mm(1e-9);

/** One row of DATA's depths table. Every length is a stored `Mm`; the screen formats them (Rule 2). */
export interface BottomDataRow {
  /** From the tail. */
  station: Mm;
  /** The tail's row, the nose tip's, or a 6" station between. */
  label: "tail" | "nose" | "station";
  /** The board's full width there (twice `railAt`); `null` where there is no rail to measure. */
  width: Mm | null;
  /** The deepest cut: the most foam off across the station, the gap under a straightedge laid rail to rail. */
  deepest: Mm;
  /** The vee's or belly's lift at the rail (`sectionsFoamOff` there) — the figure RAILS thins the rail by
   * (`bottomRailLift`). A channel is cut after the rail is shaped and never counts here, even one that runs out
   * through the rail (the founder, 2026-11-11: "Match RAILS"; D-05, D-43). */
  railLift: Mm;
  /** The planed thickness less the cut at the stringer; `null` where the stringer is air (a swallow's notch) or there
   * is no rail. */
  stringerLeft: Mm | null;
  /** A reference row, drawn in full ink: the row within 3" of the front fins, or of the wide point. */
  reference: "wide" | "fins" | null;
  /** The 1/4" floor holds the concaves at the stringer here (D-09): `stringerLeft` is the floor. */
  atFloor: boolean;
}

/** DATA's stations: the tail, every 6" from it, and the nose tip (the sketch's `drawData` rows). */
export function bottomDataStations(board: BottomBoard): Mm[] {
  const rows: Mm[] = [];
  for (let s = 0; s < board.length - BOTTOM_DATA_NOSE_GAP; s += BOTTOM_DATA_STEP) rows.push(mm(s));
  rows.push(board.length);
  return rows;
}

/** The deepest cut at a station: the most foam off across 61 points from the stringer to the rail (the sketch's
 * `deepestAt`). */
export function deepestCutAt(resolved: ResolvedBottom, board: BottomBoard, s: Mm): Mm {
  const W = board.railAt(s);
  let m = 0;
  for (let j = 0; j <= DEEPEST_SPANS; j++) m = Math.max(m, foamOff(resolved, board, s, mm((W * j) / DEEPEST_SPANS)));
  return mm(m);
}

/** Which reference a row is: the front fins first, then the wide point, each within 3" (the sketch's `rowCls`). */
function referenceOf(board: BottomBoard, s: Mm): BottomDataRow["reference"] {
  if (Math.abs(s - board.frontFins) < BOTTOM_REFERENCE_REACH) return "fins";
  if (Math.abs(s - board.widePoint) < BOTTOM_REFERENCE_REACH) return "wide";
  return null;
}

/**
 * DATA's depths table (D-16): a row at the tail, every 6" from it and at the nose tip — the width, the deepest cut,
 * the rail lift and the stringer left. The deepest cut and the stringer left are the one number (`foamOff`), channels
 * included. The rail lift is the vee's or belly's lift at the rail alone (`sectionsFoamOff`), the figure RAILS thins
 * the rail by: a channel is cut after the rail is shaped and never counts there, even one that runs out through the
 * rail (the founder, 2026-11-11: "Match RAILS").
 */
export function bottomDataRows(resolved: ResolvedBottom, board: BottomBoard): BottomDataRow[] {
  const stations = bottomDataStations(board);
  return stations.map((s, k) => {
    const W = board.railAt(s);
    const hasRail = W > BOTTOM_DATA_EDGE;
    const stringerAir = board.notchInner(s) > BOTTOM_DATA_EDGE || !hasRail;
    const stringerLeft = stringerAir ? null : mm(board.thicknessAt(s) - foamOff(resolved, board, s, mm(0)));
    return {
      station: s,
      label: k === 0 ? "tail" : k === stations.length - 1 ? "nose" : "station",
      width: hasRail ? mm(2 * W) : null,
      deepest: deepestCutAt(resolved, board, s),
      railLift: sectionsFoamOff(resolved, board, s, W),
      stringerLeft,
      reference: referenceOf(board, s),
      atFloor: stringerLeft !== null && foamOffParts(resolved, board, s, mm(0)).concave > stringerFloorCap(board, s) + FLOOR_GUARD,
    };
  });
}

/** One column of DATA's layout-marks table. Its words (`Center edge`, `Wall 1`) are the screen's, built from `key`. */
export interface BottomMarkColumn {
  /** `${section}:${mark}`, with the wall's number for a channel wall (`channels:wall:1`). */
  key: string;
  section: BottomSectionKey | "channels";
  mark: "edge" | "flat" | "trough" | "wall";
  /** A channel wall's number, 1 out from the stringer. */
  index?: number;
}

/** The channels' columns (the sketch's `markColumns` for the channels): their marks at the deepest station — the flat's
 * edge when Off Stringer is more than 1/2 mm, then Wall 1, Wall 2 … — or none with no channels or at no depth. */
function channelColumns(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule): BottomMarkColumn[] {
  if (ch.count < 4 || ch.depth <= 0) return [];
  return channelMarks(ch, board, rule, ch.deepest).map((m) =>
    m.column === CHANNEL_FLAT_KEY
      ? { key: m.column, section: "channels" as const, mark: "flat" as const }
      : { key: m.column, section: "channels" as const, mark: "wall" as const, index: Number(m.column.slice(CHANNEL_WALL_PREFIX.length)) },
  );
}

/** The channels' marks at a station (the sketch's `marksOf` for the channels): only once the set has started, and of
 * each wall only from its own channel's start, between the stringer and the rail. */
function channelMarksOf(ch: ResolvedChannels, board: BottomBoard, rule: BottomWingRule, s: Mm): { key: string; y: Mm }[] {
  if (ch.count < 4 || ch.depth <= 0 || fadeAt(ch.start, ch.deepest, ch.end, s, board.length) <= BOTTOM_MARK_FADE_MIN) return [];
  const W = board.railAt(s);
  return channelMarks(ch, board, rule, s)
    .filter((m) => m.on && m.across > BOTTOM_DATA_EDGE && m.across < W)
    .map((m) => ({ key: m.column, y: m.across }));
}

const markColumn = (section: BottomSectionKey, mark: BottomMarkColumn["mark"]): BottomMarkColumn => ({ key: `${section}:${mark}`, section, mark });

/** The columns a cut can put in the layout table (the sketch's `markColumns`). */
function markColumnsOf(cut: ResolvedCut): BottomMarkColumn[] {
  if (cut.kind === "flat" || cut.depth <= 0) return [];
  if (cut.kind === "single") return [markColumn(cut.section, "edge")];
  if (cut.kind === "double") return [markColumn(cut.section, "flat"), markColumn(cut.section, "trough"), markColumn(cut.section, "edge")];
  if (cut.kind === "vee" && cut.offStringer > BOTTOM_DATA_EDGE) return [markColumn(cut.section, "flat")];
  return [];
}

/** A cut's layout marks at a station, out from the stringer — what a shaper rules onto the blank (the sketch's
 * `marksOf`). */
function marksOf(cut: ResolvedCut, board: BottomBoard, rule: BottomWingRule, s: Mm): { key: string; y: Mm }[] {
  if (cut.kind === "flat" || cut.depth <= 0 || fadeAt(cut.start, cut.deepest, cut.end, s, board.length) <= BOTTOM_MARK_FADE_MIN) return [];
  const W = board.railAt(s);
  const key = (mark: BottomMarkColumn["mark"]) => markColumn(cut.section, mark).key;
  if (cut.kind === "single") {
    const C = cutHalfWidth(cut, board, rule, s);
    return C > BOTTOM_DATA_EDGE && C < W ? [{ key: key("edge"), y: C }] : [];
  }
  if (cut.kind === "double") {
    const C = cutHalfWidth(cut, board, rule, s);
    if (C <= BOTTOM_DATA_EDGE) return [];
    const { flat, trough } = doubleMarks(cut, C);
    const out = [{ key: key("flat"), y: flat }, { key: key("trough"), y: trough }];
    if (C < W) out.push({ key: key("edge"), y: C });
    return out.filter((m) => m.y > BOTTOM_DATA_EDGE);
  }
  if (cut.kind === "vee" && cut.offStringer > BOTTOM_DATA_EDGE && cut.offStringer < W) return [{ key: key("flat"), y: cut.offStringer }];
  return [];
}

/**
 * DATA's layout-marks table (D-16): the columns in shop order — each section's flat, trough and edge, as its cut has
 * them, then the channels' flat edge and every wall — and at each station the marks off the stringer, `null` where a
 * cut does not reach (a channel's wall is `null` ahead of its own channel's start). The stations are DATA's rows unless
 * others are asked for. No columns on a flat bottom.
 */
export function bottomLayoutMarks(
  resolved: ResolvedBottom,
  board: BottomBoard,
  stations: readonly Mm[] = bottomDataStations(board),
): { columns: BottomMarkColumn[]; rows: { station: Mm; cells: (Mm | null)[] }[] } {
  const rule = resolved.wingRule;
  const columns = [...BOTTOM_SECTIONS.flatMap((section) => markColumnsOf(resolved[section])), ...channelColumns(resolved.channels, board, rule)];
  const rows = stations.map((station) => {
    const here = new Map<string, Mm>();
    for (const section of BOTTOM_SECTIONS) for (const m of marksOf(resolved[section], board, rule, station)) here.set(m.key, m.y);
    for (const m of channelMarksOf(resolved.channels, board, rule, station)) here.set(m.key, m.y);
    return { station, cells: columns.map((c) => here.get(c.key) ?? null) };
  });
  return { columns, rows };
}

/** Where one cut meets the 1/4" floor (D-09, D-33, D-40). */
export interface BottomFloorFlag {
  section: BottomSectionKey | "channels";
  /** The stations where the floor holds this cut's concave work, so 1/4" is left under the planed thickness. */
  stringer: Mm[];
  /** The stations where this cut takes foam off a rail left thinner than 1/4" (or lifted to the deck, D-40). */
  rails: Mm[];
  /** The flagged station nearest this cut's own tip — the nose for a Nose cut, the tail otherwise; `null` when none. */
  at: Mm | null;
}

/** The floor's scan: every 1/2" from the tail to the nose, and every DATA row, in order. */
function floorScanStations(board: BottomBoard): Mm[] {
  const at = new Set<number>(bottomDataStations(board));
  for (let s = 0; s <= board.length; s += BOTTOM_FLOOR_SCAN_STEP) at.add(s);
  return [...at].sort((a, b) => a - b).map(mm);
}

/**
 * Where each cut meets the 1/4" floor (D-09, D-33 as amended by D-40), for the warning under its Depth and DATA's
 * floor note:
 *
 * - **the stringer form** — the stations (every 1/2", and every DATA row) where the floor holds the concaves and this
 *   cut is one of them: somewhere across the foam at that station (61 points, and a double's trough) its own concave
 *   work is above 0 and the concaves together would leave less than 1/4" under the planed thickness. Only a concave
 *   can meet it; a vee or a belly never touches the stringer (D-40);
 * - **the rail form** — from the sections the litres and the 3D board read (`boardSections`), the stations where a
 *   section's foam is left under 1/4" (`BoardSection.thinAt`, the knife edge of `railEdgeAt` included) and this cut takes
 *   foam off at one of those points.
 *
 * Only the cuts that meet it are listed, in shop order.
 */
export function bottomFloorFlags(resolved: ResolvedBottom, board: BottomBoard, sections?: readonly BoardSection[]): BottomFloorFlag[] {
  const rule = resolved.wingRule;
  const scan = floorScanStations(board);
  const flags: BottomFloorFlag[] = [];
  for (const section of BOTTOM_SECTIONS) {
    const cut = resolved[section];
    if (cut.kind === "flat" || cut.depth <= 0) continue;
    const stringer: Mm[] = [];
    if (cut.kind === "single" || cut.kind === "double") {
      for (const s of scan) {
        // only the foam there: a swallow's notch is air, so the scan starts at its inside wall
        const W = board.railAt(s);
        const inner = board.notchInner(s);
        if (W - inner <= 0) continue;
        const cap = stringerFloorCap(board, s) + FLOOR_GUARD;
        const across: number[] = [];
        for (let j = 0; j <= DEEPEST_SPANS; j++) across.push(inner + ((W - inner) * j) / DEEPEST_SPANS);
        if (cut.kind === "double") {
          const C = cutHalfWidth(cut, board, rule, s);
          const { trough } = doubleMarks(cut, C);
          if (C > 0 && trough > inner) across.push(trough);
        }
        const meets = across.some((y) => cutFoamOffParts(cut, board, rule, s, mm(y)).concave > 0 && foamOffParts(resolved, board, s, mm(y)).concave > cap);
        if (meets) stringer.push(s);
      }
    }
    const rails: Mm[] = [];
    for (const built of sections ?? []) {
      if (!built.thinAt || built.thinAt.length === 0) continue;
      const inner = board.notchInner(built.station);
      if (built.thinAt.some((across) => cutFoamOff(cut, board, rule, built.station, mm(across + inner)) > 0)) rails.push(built.station);
    }
    if (stringer.length === 0 && rails.length === 0) continue;
    const all = [...stringer, ...rails];
    const at = mm(section === "nose" ? Math.max(...all) : Math.min(...all));
    flags.push({ section, stringer, rails, at });
  }
  // The channels, cut last: they never take foam off the stringer (each floor starts at a peak), so only the rail
  // form can meet them — a channel's floor taking foam off a point left under 1/4", or lifted to the deck (D-40).
  const ch = resolved.channels;
  if (ch.count >= 4 && ch.depth > 0) {
    const rails: Mm[] = [];
    for (const built of sections ?? []) {
      if (!built.thinAt || built.thinAt.length === 0) continue;
      const inner = board.notchInner(built.station);
      if (built.thinAt.some((across) => channelFoamOff(ch, board, rule, built.station, mm(across + inner)) > 0)) rails.push(built.station);
    }
    if (rails.length > 0) flags.push({ section: "channels", stringer: [], rails, at: mm(Math.min(...rails)) });
  }
  return flags;
}
