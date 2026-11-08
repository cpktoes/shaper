/**
 * The bottom contours (Phase 17) — the cuts a shaper takes out of the bottom after the blank is planed: a flat, a
 * belly, a vee, a single concave (this file, 17-02), the doubles, the Spiral Vee, the Tri-Plane, the Teardrop's closing
 * (17-04) and the channels (17-05).
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

/* ============ the names ============ */

export type BottomSectionKey = "nose" | "center" | "tail";
/** What a cut IS — a flat, a belly, a vee or a single concave (17-04 adds the double). Comes from the name. */
export type BottomCutKind = "flat" | "belly" | "vee" | "single";
/** What Off Rail is measured from on a winged board (D-19): the Narrowest outline, or the curve drawn before the wing. */
export type BottomWingRule = "narrowest" | "natural";

/** The three sections in shop order — the order a cut is listed in, on DATA and on paper. */
export const BOTTOM_SECTIONS: readonly BottomSectionKey[] = ["nose", "center", "tail"];

/**
 * The names this wave cuts, in D-04's order within each section — the order of each section's menu. 17-04 inserts the
 * other five (Teardrop Nose Concave, Early Double Concave, Tri-Plane Hull Center, Double Concave Exit, Spiral Vee) in
 * their D-04 places.
 */
export const BOTTOM_CUT_NAMES = {
  nose: ["Flat Entry", "Rolled Belly Entry", "Blended Nose Concave", "Slight Single Concave Entry", "Reverse Vee Nose"],
  center: ["Flat Center", "Deep Single Concave", "Shallow Single Concave", "Continuous Belly / Rolled Mid"],
  tail: ["Flat Exit", "Panel Vee", "Rolled Vee", "Extending Single Concave"],
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
  /** A double's trough, out from the stringer (a mark; 17-04's). */
  troughAt: Mm;
  start: Mm;
  deepest: Mm;
  end: Mm;
  /** How deep the cut is at its deepest station; a vee's or belly's lift at the rail (a mark). */
  depth: Mm;
  /** The Spiral Vee's lift under its double (a mark; 17-04's). */
  veeLift: Mm;
  /** 0 to 100: straight to the edge at 0, rounded out at 100. */
  smoothness: number;
  /** A nose single that closes to a point toward the center (the Teardrop's; 17-04's). */
  closesToPoint: boolean;
}

/** The channels as STORED (D-10, D-11; resolved by 17-05). `startFromFins` and `deepestFromFins` ride with the fins. */
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
/** The top view's shade steps every 1/32" of depth (D-12; drawn from 17-06). */
export const BOTTOM_SHADE_STEP: Mm = inchesToMm(1 / 32);
/** The least foam the bottom ever leaves under the deck: the app's own thinnest foil (D-09). */
export const BOTTOM_FLOOR: Mm = inchesToMm(FOIL_THICKNESS_RANGE_IN.min);

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
 * The sketch's `NAMES` table (template.html 367–401), this wave's thirteen names. Set 2026-11-08 from what shapers
 * publish, at the founder's word — still his to correct.
 */
const CUT_TABLE: Readonly<Record<BottomSectionKey, readonly CutEntry[]>> = {
  nose: [
    { name: "Flat Entry", kind: "flat" },
    { name: "Rolled Belly Entry", kind: "belly", d: (b) => ({ start: b.length, deepest: b.length * 2 / 3, end: b.length * 0.55, depth: i(3 / 8), smoothness: 100 }) },
    { name: "Blended Nose Concave", kind: "single", d: (b) => ({ offRail: i(1.625), start: b.length - i(2), deepest: b.length - i(12), end: b.length - i(36), depth: i(3 / 16), smoothness: 70 }) },
    { name: "Slight Single Concave Entry", kind: "single", d: (b) => ({ offRail: i(2), start: b.length - i(12), deepest: b.widePoint, end: b.widePoint - i(6), depth: i(1 / 16), smoothness: 50 }) },
    { name: "Reverse Vee Nose", kind: "vee", d: (b) => ({ start: b.length - i(3), deepest: b.length * 2 / 3, end: b.frontFins + i(4), depth: i(3 / 16), smoothness: 0 }) },
  ],
  center: [
    { name: "Flat Center", kind: "flat" },
    { name: "Deep Single Concave", kind: "single", d: (b) => ({ offRail: i(2), start: b.length - i(16), deepest: (b.widePoint + b.frontFins) / 2, end: i(4), depth: i(1 / 4), smoothness: 50 }) },
    { name: "Shallow Single Concave", kind: "single", d: (b) => ({ offRail: i(2), start: b.length * 2 / 3, deepest: b.frontFins, end: i(4), depth: i(1 / 8), smoothness: 50 }) },
    { name: "Continuous Belly / Rolled Mid", kind: "belly", d: (b) => ({ start: b.length - i(8), deepest: b.widePoint, end: b.frontFins, depth: i(3 / 8), smoothness: 100 }) },
  ],
  tail: [
    { name: "Flat Exit", kind: "flat" },
    { name: "Panel Vee", kind: "vee", d: (b) => ({ start: b.length / 3, deepest: b.frontFins, end: 0, depth: i(3 / 16), smoothness: 0 }) },
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

/** The sketch's `makeCut`: zeros, then the name's starting numbers over them. Stations from the tail. */
function makeAbsolute(section: BottomSectionKey, name: BottomCutName, board: BottomBoard): AbsoluteCut {
  const entry = entryOf(section, name);
  const c: AbsoluteCut = { offRail: 0, offStringer: 0, troughAt: 0, start: 0, deepest: 0, end: 0, depth: 0, veeLift: 0, smoothness: 0, closesToPoint: false };
  if (entry.d) Object.assign(c, entry.d(board));
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
 * measured from where it is kept. A flat stores all zeros.
 */
export function startingCut(section: BottomSectionKey, name: BottomCutName, board: BottomBoard): BottomCutSpec {
  if (entryOf(section, name).kind === "flat") return flatSpec(name);
  const c = makeAbsolute(section, name, board);
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
  /** The Spiral Vee's double-in-a-vee (17-04's); false for every name of this wave. */
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

/** The whole bottom as the maths reads it. The channels pass through as stored until 17-05 resolves them. */
export interface ResolvedBottom {
  nose: ResolvedCut;
  center: ResolvedCut;
  tail: ResolvedCut;
  channels: BottomChannelsSpec;
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
    spiral: false,
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

/** The whole bottom, read (D-03, D-36, D-39). */
export function resolveBottom(bottom: BoardBottom, board: BottomBoard): ResolvedBottom {
  return {
    nose: resolveCut("nose", bottom.nose, board),
    center: resolveCut("center", bottom.center, board),
    tail: resolveCut("tail", bottom.tail, board),
    channels: bottom.channels,
    wingRule: bottom.wingRule,
  };
}

/**
 * Start ≥ Deepest ≥ End, kept (D-07, R4): the sketch's `normalize` for the three stations. The station just moved
 * wins and the others are pushed ahead of it — a value is never stopped. Read on the board (stations from the tail),
 * then stored again; a Tail cut's Deepest At stays measured from the fins.
 */
export function keepStationsInOrder(
  section: BottomSectionKey,
  spec: BottomCutSpec,
  changed: "start" | "deepest" | "end",
  board: BottomBoard,
): BottomCutSpec {
  if (cutKind(spec.name) === "flat") return { ...spec };
  const c = absoluteStations(section, spec, board);
  if (changed === "start") { if (c.deepest > c.start) c.deepest = c.start; if (c.end > c.deepest) c.end = c.deepest; }
  else if (changed === "end") { if (c.deepest < c.end) c.deepest = c.end; if (c.start < c.deepest) c.start = c.deepest; }
  else if (changed === "deepest") { if (c.start < c.deepest) c.start = c.deepest; if (c.end > c.deepest) c.end = c.deepest; }
  return { ...spec, ...storedStations(section, c, board) };
}

/* ============ the default, and whether a bottom cuts anything ============ */

/**
 * Every board opens flat with no channels (D-04, D-10). The channels' numbers are D-11's, kept for when a count is
 * picked: 5/16" deep, from 12" ahead of the front fins, deepest at them, out the tail, Off Stringer 0, Smoothness 0,
 * Parallel, the outer pair longest with a 2" stagger, and the six-channel width of 1 3/4".
 */
export const DEFAULT_BOTTOM: BoardBottom = {
  nose: flatSpec(FLAT_CUT_NAMES.nose),
  center: flatSpec(FLAT_CUT_NAMES.center),
  tail: flatSpec(FLAT_CUT_NAMES.tail),
  channels: {
    count: 0,
    width: inchesToMm(1.75),
    offStringer: mm(0),
    startFromFins: inchesToMm(12),
    deepestFromFins: mm(0),
    end: mm(0),
    depth: inchesToMm(5 / 16),
    smoothness: 0,
    run: "parallel",
    longest: "outer",
    stagger: inchesToMm(2),
  },
  wingRule: "narrowest",
};

/** Whether the bottom takes any foam: false when every section is flat (or 0 deep) and there are no channels. */
export function bottomHasCut(bottom: BoardBottom): boolean {
  for (const section of BOTTOM_SECTIONS) {
    const cut = bottom[section];
    if (cutKind(cut.name) !== "flat" && cut.depth > 0) return true;
  }
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

/** A concave's half-width at a station: the reference rail less Off Rail (the sketch's `cutHalfWidth`). */
export function cutHalfWidth(cut: ResolvedCut, board: BottomBoard, rule: BottomWingRule, s: Mm): Mm {
  const C = refAt(board, rule, s) - cut.offRail;
  return mm(C);
}

/**
 * One cut alone: the foam it takes off at station `s`, `y` out from the stringer (the sketch's `cutOff`). A flat takes
 * nothing. A single concave is `depth × fade × min(1, C / PINCH) × sec(y / C, r)` inside its half-width C — narrower
 * than 3" it shallows in proportion, so a tip never gets a slot. A vee or a belly lifts from Off Stringer out to the rail
 * `railAt(s)`: `depth × fade × rise((y − F) / (W − F), r)`. Nothing where the board has no rail. A cut may run past its
 * own section; whatever it overlaps, it adds to.
 */
export function cutFoamOff(cut: ResolvedCut, board: BottomBoard, rule: BottomWingRule, s: Mm, y: Mm): Mm {
  const W = board.railAt(s);
  if (W <= 0) return mm(0);
  if (cut.kind === "flat" || cut.depth <= 0) return mm(0);
  const f = fadeAt(cut.start, cut.deepest, cut.end, s, board.length); if (f <= 0) return mm(0);
  const r = cut.smoothness / 100; let out = 0;
  if (cut.kind === "single") {
    const C = cutHalfWidth(cut, board, rule, s);
    if (C > 0 && y < C) out += cut.depth * f * Math.min(1, C / PINCH) * sec(y / C, r);
  } else { // vee or belly: a lift from the stringer (or the flat panel's edge, Off Stringer) out to the rail
    const F = cut.offStringer; if (y > F && W > F) out += cut.depth * f * rise((y - F) / (W - F), r);
  }
  return mm(out);
}

/**
 * THE one number (D-05): the foam the bottom takes off at station `s`, `y` out from the stringer — the sections' cuts
 * added in shop order (every term is ≥ 0, so the order is the listing order, not an arithmetic one), never below 0, and
 * never so deep that less than 1/4" of foam is left under the planed thickness (D-09, `BOTTOM_FLOOR`). The channels join
 * the sum in 17-05.
 */
export function foamOff(resolved: ResolvedBottom, board: BottomBoard, s: Mm, y: Mm): Mm {
  if (board.railAt(s) <= 0) return mm(0);
  let v = 0;
  for (const section of BOTTOM_SECTIONS) v += cutFoamOff(resolved[section], board, resolved.wingRule, s, y);
  return mm(Math.min(Math.max(0, v), Math.max(0, board.thicknessAt(s) - BOTTOM_FLOOR)));
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
  const read: BottomBoard = {
    ...board,
    railAt: lastStation((s) => board.railAt(s)),
    curveAt: lastStation((s) => board.curveAt(s)),
    narrowestAt: lastStation((s) => board.narrowestAt(s)),
    foamAt: lastStation((s) => board.foamAt(s)),
    thicknessAt: lastStation((s) => board.thicknessAt(s)),
    notchInner: lastStation((s) => board.notchInner(s)),
  };
  return (station, across) => foamOff(resolved, read, station, mm(across + read.notchInner(station)));
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
