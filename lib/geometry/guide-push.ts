/**
 * How far each GUIDE card pushes its one setting, and the inch frames the cartoons are cut from (Phase 18,
 * D-16, D-17, D-25; UI-SPEC "A push is a round figure in the shaper's own system").
 *
 * A push is a stated amount added to the board's own value and drawn through the app's own maths with
 * that one field changed. One number drives the drawing, the dimension label and the caption, so the
 * number must be one the shaper's own system reads cleanly:
 *
 * - Imperial: the sketch's own inches (`board-data.ts` / `pages-data.ts` PUSH, listed on the words page).
 * - Metric, a dim (a length a shaper quotes as a size): clean half-centimetres — 6" → 15 cm, 4" → 10 cm,
 *   3" → 7.5 cm, 2" → 5 cm, 1" → 2.5 cm, 24" → 60 cm, 8" → 20 cm, and VOLUME's quarter-inch thickness
 *   dim → 0.5 cm. Never `15.2 cm`.
 * - Metric, a mark (a tape mark): whole millimetres — 1/4" → 6, 3/8" → 10, 1/2" → 13, 3/4" → 19, 1" → 25,
 *   1 1/2" → 38, 2" → 50, 4" → 100.
 * - Degrees, percentages, the ratio and the scale read the same in both systems.
 * - The maker's rocker bend (`+1/2"N18"`) stays in inches in both: it prints through `formatRockerNote`,
 *   the maker's own order code (CLAUDE.md Rule 2).
 *
 * This is the one GUIDE file that may call `inchesToMm` (the Rule 2 ledger in `lib/units-isolation.test.ts`
 * names it): every other guide file reads its inches from here. Pure; no React, browser or database.
 */
import { inchesToMm, mm, type Mm, type UnitsSystem } from "./units";
import type { GuidePage } from "./guide-card";

/** What kind of number a push is, which decides how a Metric shaper reads it. */
export type GuidePushFamily = "dim" | "mark" | "degrees" | "percent" | "ratio" | "scale" | "makerNote";

/** One push as written: its page, its key, its family, and its amount in each system's own terms. */
export interface GuidePushEntry {
  page: GuidePage;
  key: string;
  family: GuidePushFamily;
  /** The Imperial amount in inches (dims, marks and the maker's note). */
  inches?: number;
  /** The Metric amount in millimetres (dims and marks). */
  metricMm?: number;
  /** The amount for a family that has no unit (degrees, percent, ratio, scale). */
  value?: number;
}

/**
 * Every push, page by page, as the words page's last section and D-25 state them. The words page's JSON
 * names the Imperial amounts in millimetres; `guide-push.test.ts` holds this table to it.
 */
export const GUIDE_PUSH_TABLE: readonly GuidePushEntry[] = [
  // ROCKER (board-data.ts PUSH)
  { page: "rocker", key: "center", family: "mark", inches: 1 / 2, metricMm: 13 },
  { page: "rocker", key: "tips", family: "mark", inches: 3 / 8, metricMm: 10 },
  { page: "rocker", key: "skin", family: "mark", inches: 1 / 2, metricMm: 13 },
  // A Thinning Start pushed to 24" in, or 8" past the automatic start, whichever is further in.
  { page: "rocker", key: "startIn", family: "dim", inches: 24, metricMm: 600 },
  { page: "rocker", key: "startPastAutomatic", family: "dim", inches: 8, metricMm: 200 },
  { page: "rocker", key: "fine", family: "mark", inches: 1 / 4, metricMm: 6 },
  { page: "rocker", key: "rocker", family: "mark", inches: 1, metricMm: 25 },
  // The maker's bend: +1/2" from 18", the maker's inch order code in both systems.
  { page: "rocker", key: "bend", family: "makerNote", inches: 1 / 2 },
  { page: "rocker", key: "bendFrom", family: "makerNote", inches: 18 },
  // TEMPLATE (pages-data.ts PUSH)
  { page: "template", key: "length", family: "dim", inches: 6, metricMm: 150 },
  { page: "template", key: "angle", family: "degrees", value: 20 },
  { page: "template", key: "full", family: "percent", value: 30 },
  { page: "template", key: "width", family: "dim", inches: 1, metricMm: 25 },
  { page: "template", key: "offset", family: "dim", inches: 3, metricMm: 75 },
  { page: "template", key: "rail", family: "percent", value: 30 },
  { page: "template", key: "block", family: "dim", inches: 2, metricMm: 50 },
  { page: "template", key: "depth", family: "mark", inches: 1, metricMm: 25 },
  { page: "template", key: "tailAngle", family: "degrees", value: 25 },
  { page: "template", key: "wingPos", family: "dim", inches: 4, metricMm: 100 },
  { page: "template", key: "wingDepth", family: "mark", inches: 1 / 2, metricMm: 13 },
  { page: "template", key: "wingRun", family: "mark", inches: 1.5, metricMm: 38 },
  { page: "template", key: "wingOffset", family: "dim", inches: 2, metricMm: 50 },
  // RAILS
  { page: "rails", key: "thick", family: "mark", inches: 1 / 4, metricMm: 6 },
  { page: "rails", key: "deckPercent", family: "percent", value: 85 },
  { page: "rails", key: "scale", family: "scale", value: 0.7 },
  { page: "rails", key: "ratioTop", family: "ratio", value: 35 },
  { page: "rails", key: "apex", family: "mark", inches: 1 / 4, metricMm: 6 },
  { page: "rails", key: "deckMark", family: "mark", inches: 1 / 2, metricMm: 13 },
  { page: "rails", key: "domedBand", family: "mark", inches: 2, metricMm: 50 },
  { page: "rails", key: "tuck1", family: "mark", inches: 1 / 4, metricMm: 6 },
  { page: "rails", key: "tuck3", family: "mark", inches: 3 / 4, metricMm: 19 },
  { page: "rails", key: "blends", family: "dim", inches: 6, metricMm: 150 },
  // VOLUME — the centre thickness is a dim here: VOLUME's own slider reads it through formatDim.
  { page: "volume", key: "length", family: "dim", inches: 6, metricMm: 150 },
  { page: "volume", key: "width", family: "dim", inches: 1, metricMm: 25 },
  { page: "volume", key: "thick", family: "dim", inches: 1 / 4, metricMm: 5 },
  // FINS — every fin number is a mark.
  { page: "fins", key: "finBase", family: "mark", inches: 1, metricMm: 25 },
  { page: "fins", key: "finForward", family: "mark", inches: 1, metricMm: 25 },
  { page: "fins", key: "finOffRail", family: "mark", inches: -1 / 2, metricMm: -13 },
  { page: "fins", key: "finToe", family: "mark", inches: 1 / 2, metricMm: 13 },
];

/** Every page's pushes for one system: a millimetre figure for a dim, a mark or the maker's note, the bare
 * number for the rest. */
export interface GuidePushes {
  rocker: {
    center: Mm;
    tips: Mm;
    skin: Mm;
    startIn: Mm;
    startPastAutomatic: Mm;
    fine: Mm;
    rocker: Mm;
    bend: Mm;
    bendFrom: Mm;
  };
  template: {
    length: Mm;
    angle: number;
    full: number;
    width: Mm;
    offset: Mm;
    rail: number;
    block: Mm;
    depth: Mm;
    tailAngle: number;
    wingPos: Mm;
    wingDepth: Mm;
    wingRun: Mm;
    wingOffset: Mm;
  };
  rails: {
    thick: Mm;
    deckPercent: number;
    scale: number;
    ratioTop: number;
    apex: Mm;
    deckMark: Mm;
    domedBand: Mm;
    tuck1: Mm;
    tuck3: Mm;
    blends: Mm;
  };
  volume: { length: Mm; width: Mm; thick: Mm };
  fins: { finBase: Mm; finForward: Mm; finOffRail: Mm; finToe: Mm };
}

/** One entry's amount in a system. */
export function guidePushAmount(entry: GuidePushEntry, system: UnitsSystem): number {
  switch (entry.family) {
    case "dim":
    case "mark":
      return system === "metric" ? mm(entry.metricMm ?? 0) : inchesToMm(entry.inches ?? 0);
    case "makerNote":
      return inchesToMm(entry.inches ?? 0);
    default:
      return entry.value ?? 0;
  }
}

function pageOf(page: GuidePage, system: UnitsSystem): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of GUIDE_PUSH_TABLE) if (entry.page === page) out[entry.key] = guidePushAmount(entry, system);
  return out;
}

/** Every page's push amounts for the shaper's system (D-25). */
export function guidePush(system: UnitsSystem): GuidePushes {
  return {
    rocker: pageOf("rocker", system) as GuidePushes["rocker"],
    template: pageOf("template", system) as GuidePushes["template"],
    rails: pageOf("rails", system) as GuidePushes["rails"],
    volume: pageOf("volume", system) as GuidePushes["volume"],
    fins: pageOf("fins", system) as GuidePushes["fins"],
  };
}

/**
 * The inch constants the sketch's cartoons cut their windows and set their labels by, page by page, so a
 * page builder never names an inch itself. These are drawing frames, never a figure a shaper reads (the
 * one exception, FINS' tail window, has its own `guideFrame` below), so they are the same in both systems.
 * Each is the sketch's own (`pages.js` and `template.html` in sketch 022's source).
 */
export interface GuideFrames {
  /** TEMPLATE (`pages.js` 121-145): window margins and spans, and the stations its labels sit at. */
  template: {
    margin: Mm; // 2" beyond a tip
    wholeAcross: Mm; // 5" beyond the wide point's half width
    tipSpan: Mm; // 30" of the nose or the tail
    tipAcross: Mm; // 1" beyond the nose's half width
    tailAcross: Mm; // 1.5" beyond the tail's half width
    wideSpan: Mm; // 20" either side of the wide point
    wideAcross: Mm; // 1.5" beyond the wide point's half width
    halfPast: Mm; // 4" past the middle for a half-board window
    halfAcross: Mm; // 3" beyond the wide point's half width
    noseFullAt: Mm; // 14" from the nose
    tailRailAt: Mm; // 10" from the tail
    noseRailAt: Mm; // 16" from the nose
    tailAngleAt: Mm; // 8" from the tail
    tailFullAt: Mm; // 14" from the tail
    wingPast: Mm; // 1" past a wing's run
  };
  /** RAILS (`pages.js` 270-299): the hard-edge window, the section window, and the plot's margins. */
  rails: {
    margin: Mm; // 2" beyond the tail
    pastEnds: Mm; // 6" past Ends At
    acrossAt: Mm; // 8" past Ends At, where the window's width is read
    tailAcross: Mm; // 1.5" beyond the half width
    sectionHalfSpan: Mm; // 3" either side of a station
    sectionAcross: Mm; // 1" beyond the half width
    plotPastApex: Mm; // 0.5" beyond the apex
    plotInboard: Mm; // 1" inboard of the plot's own edge
  };
  /** VOLUME (`pages.js` 412): the plan's window margins and the centre section's window. */
  volume: {
    planMargin: Mm; // 2" beyond each tip
    planAcross: Mm; // 5" beyond the wide point's half width
    sectionHalfSpan: Mm; // 6" either side of the middle
    sectionAcross: Mm; // 1" beyond the half width
  };
  /** FINS (`pages.js` 551-554): the tail window and the stringer's reach. */
  fins: {
    tailMargin: Mm; // 1.5" beyond the tail
    across: Mm; // 1" beyond the half width at the window's end
    stringerTo: Mm; // 26" from the tail
  };
  /** ROCKER (`template.html` 639-675): the side view's window spans and offsets. */
  rocker: {
    centerSpan: Mm; // 36" at the middle
    tipSpan: Mm; // 30" at a tip
    pairSpan: Mm; // 16" for each of a pair
    tipInset: Mm; // 5.5" a tip window sits past its tip
    gapAt: Mm; // 6" behind the middle, where the gap under the board is read
    beyondTip: Mm; // 3" in from a tip, where the foam off is read
    markReach: Mm; // 1" beyond a window, where a tip's thinning mark still draws
  };
}

const inch = (n: number): Mm => inchesToMm(n);

/** The sketch's own frames, in millimetres. */
export const GUIDE_FRAME: GuideFrames = {
  template: {
    margin: inch(2),
    wholeAcross: inch(5),
    tipSpan: inch(30),
    tipAcross: inch(1),
    tailAcross: inch(1.5),
    wideSpan: inch(20),
    wideAcross: inch(1.5),
    halfPast: inch(4),
    halfAcross: inch(3),
    noseFullAt: inch(14),
    tailRailAt: inch(10),
    noseRailAt: inch(16),
    tailAngleAt: inch(8),
    tailFullAt: inch(14),
    wingPast: inch(1),
  },
  rails: {
    margin: inch(2),
    pastEnds: inch(6),
    acrossAt: inch(8),
    tailAcross: inch(1.5),
    sectionHalfSpan: inch(3),
    sectionAcross: inch(1),
    plotPastApex: inch(0.5),
    plotInboard: inch(1),
  },
  volume: {
    planMargin: inch(2),
    planAcross: inch(5),
    sectionHalfSpan: inch(6),
    sectionAcross: inch(1),
  },
  fins: {
    tailMargin: inch(1.5),
    across: inch(1),
    stringerTo: inch(26),
  },
  rocker: {
    centerSpan: inch(36),
    tipSpan: inch(30),
    pairSpan: inch(16),
    tipInset: inch(5.5),
    gapAt: inch(6),
    beyondTip: inch(3),
    markReach: inch(1),
  },
};

/** The one frame length a shaper reads: FINS' tail window, the last 24" (Imperial) or 60 cm (Metric). It
 * is named in the window's own label, so it is a round figure of the shaper's own system. */
export function guideFrame(system: UnitsSystem): { finsTailWindow: Mm } {
  return { finsTailWindow: system === "metric" ? mm(600) : inch(24) };
}
