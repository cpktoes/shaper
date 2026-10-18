/**
 * The Customize Rocker popup's drawing, as numbers (quick 261016-mkb, sketch 016 D — the founder's
 * pick, 2026-10-16; D-07, P-3, P-11, P-14). Pure (CLAUDE.md Rule 1): no React, browser or database
 * import; the components turn these points into SVG and these strings into text, nothing else.
 *
 * Two things live here.
 *
 * 1. THE OVERLAY — the live aid the popup draws over the bent blank, and only the popup (D-07, D-08):
 *    the natural rocker dashed behind the blank, a short dashed mark across the blank where each bend
 *    starts, and the deviation drawn as US Blanks' catalogue page 11 draws it — the outline (deck and
 *    bottom) red over the first change's span and blue over the second's, stacked on the first.
 *    One spec in, one drawing out (the founder's round-ten catch, sketch 016): every line here is
 *    read off the SAME spec the curve was bent by, sampled off the SAME drawn curve. The natural line
 *    is the drawn bottom less the whole bend, so it coincides with the drawn bottom wherever no change
 *    has a share; the blue (second) span is the drawn outline itself; the red (first) span is the
 *    drawn outline less the second change's bend on that end (P-14) — between a first and a second
 *    bend point red and the outline are one line. `rockerOverlay` is the one core and
 *    `blankFrameOverlay` feeds it the bent blank; since quick 261017-ojc the popup draws one picture
 *    in the blank's own frame in both states (the board, when shown, carried into it by
 *    `boardInBlankFrame`), so there is no second frame to feed.
 *
 * 2. THE BLANK ALONE (P-3, P-11) — with Show my board off the popup draws the blank itself with ALL
 *    its dimensions at its own five stations (D-07): its printed thickness as chips on one rail, its
 *    rocker as ordered on the other (tail tip, 12" in, the centre as the zero reference, 12" in, nose
 *    tip), the natural figure small where it differs. `blankAloneStations` says what each station
 *    reads; `blankAloneLayout` says where everything sits, in CSS pixels, for either orientation —
 *    labels on fixed rails, the tips' anchored OUTWARD from their station and the 12" stations'
 *    INWARD, the centre's centred, so neighbours never meet; one uniform scale, so the blank is drawn
 *    at its true proportion.
 *
 * The drafting grammar is the sketch-findings skill's: one ink, meaningful dashes, labels as text on
 * fixed rails, nothing but faint lines inside the blank.
 */

import type { PreparedBlank } from "./blank-fit";
import type { BoardSideProfile } from "./board-profile";
import { printedBlankStations } from "./board-profile";
import { bendAt, bendPoint, customPrintedStations, isNaturalSpec, normalizeSpec, type BlankRockerSpec, type RockerChange } from "./custom-rocker";
import { BLANK_VIEW_TITLES, FIGURE_TAGS } from "./custom-rocker-text";
import type { FoilStationKey } from "./foil";
import { formatMark, stationLabel } from "./measure-display";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "./units";

// ---------------------------------------------------------------------------------------------
// The overlay
// ---------------------------------------------------------------------------------------------

type End = "nose" | "tail";

/** A point of a line: `s` along the frame (the blank's own from its tail tip, or the board's), `h` up. */
export interface Pt {
  s: number;
  h: number;
}

/** One change's span: its outline (bottom and deck) from its bend point to its tip. */
export interface OverlaySpan {
  /** 1 for an end's first change (red), 2 for its second (blue) — the note's own order. */
  order: 1 | 2;
  end: End;
  bottom: Pt[];
  deck: Pt[];
}

/** Where a bend starts: the drawn bottom and deck there (the component pushes the mark past both). */
export interface BendMark {
  s: number;
  bottom: number;
  deck: number;
}

export interface RockerOverlayLines {
  /** The blank's natural bottom, in the same frame and levelling as the drawn bent bottom. */
  natural: Pt[];
  spans: OverlaySpan[];
  bendMarks: BendMark[];
}

/** What the overlay reads the drawn blank through: its bottom and its thickness at `x` along it. */
export interface OverlaySample {
  bottomAt(x: number): number;
  thicknessAt(x: number): number;
}

/** Steps between a span's two ends (both ends exact): 48 even steps, so 50 points. */
const SPAN_STEPS = 49;
/** A span shorter than this also gets a point every 1/16". */
const SHORT_SPAN_MM = inchesToMm(3);
const SIXTEENTH_MM = inchesToMm(1 / 16);
/** The natural line's own even steps over the whole blank (every span's points join them). */
const NATURAL_STEPS = 240;
/** Two positions closer than this are one. */
const SAME_X_MM = 1e-6;

/** The x positions of a span from `a` to `b` (a < b): both ends exactly, even steps between, and every
 * 1/16" when the span is short. */
function spanXs(a: number, b: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i <= SPAN_STEPS; i++) xs.push(i === SPAN_STEPS ? b : a + ((b - a) * i) / SPAN_STEPS);
  if (b - a < SHORT_SPAN_MM) {
    for (let x = Math.ceil(a / SIXTEENTH_MM) * SIXTEENTH_MM; x < b; x += SIXTEENTH_MM) if (x > a) xs.push(x);
  }
  return uniqueSorted(xs);
}

function uniqueSorted(xs: number[]): number[] {
  const sorted = [...xs].sort((p, q) => p - q);
  const out: number[] = [];
  for (const x of sorted) if (out.length === 0 || x - out[out.length - 1] > SAME_X_MM) out.push(x);
  return out;
}

/**
 * The one core: the overlay for `spec` on a blank `lengthMm` long whose DRAWN bottom and thickness
 * `sample` reads (bent by this very spec), each point placed along the frame by `toFrame`. A natural
 * spec draws nothing.
 */
export function rockerOverlay(
  spec: BlankRockerSpec | undefined,
  lengthMm: Mm,
  sample: OverlaySample,
  toFrame: (x: number) => number,
): RockerOverlayLines {
  const s = normalizeSpec(spec, lengthMm);
  if (isNaturalSpec(s)) return { natural: [], spans: [], bendMarks: [] };
  const L = lengthMm;
  const spans: OverlaySpan[] = [];
  const allXs: number[] = [];
  for (const end of ["nose", "tail"] as const) {
    const own = s.changes.filter((change) => change.end === end);
    const second: RockerChange | undefined = own[1];
    own.forEach((change, index) => {
      const p = bendPoint(change, L);
      const xs = end === "nose" ? spanXs(p, L) : spanXs(0, p);
      allXs.push(...xs);
      // P-14: the first change's line is the drawn outline less the second change's bend; the
      // second's is the drawn outline itself.
      const less = index === 0 && second ? (x: number) => bendAt({ changes: [second] }, L, x) : () => 0;
      const bottom = xs.map((x) => ({ s: toFrame(x), h: sample.bottomAt(x) - less(x) }));
      const deck = xs.map((x, i) => ({ s: bottom[i].s, h: bottom[i].h + sample.thicknessAt(x) }));
      spans.push({ order: index === 0 ? 1 : 2, end, bottom, deck });
    });
  }
  const naturalXs = uniqueSorted([
    ...Array.from({ length: NATURAL_STEPS + 1 }, (_, i) => (i === NATURAL_STEPS ? L : (L * i) / NATURAL_STEPS)),
    ...allXs,
  ]);
  const natural = naturalXs.map((x) => ({ s: toFrame(x), h: sample.bottomAt(x) - bendAt(s, L, x) }));
  const markXs = uniqueSorted(s.changes.map((change) => bendPoint(change, L)));
  const bendMarks = markXs.map((x) => {
    const bottom = sample.bottomAt(x);
    return { s: toFrame(x), bottom, deck: bottom + sample.thicknessAt(x) };
  });
  return { natural, spans, bendMarks };
}

/** The overlay in the blank's own frame (`s` from its tail tip), drawn on the bent blank `bent`. */
export function blankFrameOverlay(spec: BlankRockerSpec | undefined, bent: PreparedBlank): RockerOverlayLines {
  return rockerOverlay(
    spec,
    bent.lengthMm,
    { bottomAt: (x) => bent.rocker.sample(x), thicknessAt: (x) => bent.thickness.sample(x) },
    (x) => x,
  );
}

/**
 * The board inside the blank, in the blank's own frame (quick 261017-ojc, D-01, P-3, 2026-10-17): with
 * Show my board on, the popup draws the board inside the SAME picture of the bent blank rather than
 * switching to the page's own viewer, so the board is carried into the blank's frame — `x` from the
 * blank's tail tip, heights above the bent blank's low point (the drawing's bottom plane).
 *
 * `shift` is the one constant that carries a height in the board's frame (zero at the board's own low
 * point) into the blank's frame. It is constant along the board because the board's bottom and the
 * blank's bottom are both the blank's curve less a constant — the crop's re-level, the centre gap, a
 * Bottom fine-tune's re-level; Pin deck's tip thinning appears in both and cancels (the test proves it).
 *
 * `rockerAt(x)` is the board's rocker at blank position `x` read the way the page reads it — the
 * board on a flat table, its own low point zero — or null where the board does not reach. Never the
 * board's bottom height above the blank's plane (P-3): that would add the foam planed off the bottom
 * everywhere, and the BOARD figure would read the centre gap at a centre where the board's rocker is 0.
 *
 * Null for a hand-set board (no blank to draw it in).
 */
export interface BoardInBlank {
  /** Board-frame height + `shift` = blank-frame height. */
  shift: number;
  /** Where the board's tail tip sits along the blank (negative when the board runs past the blank). */
  start: number;
  /** The board's own length. */
  length: number;
  /** The board's outline in the blank's frame, tail to nose: its bottom and its deck. */
  outline: { x: number; bottom: number; deck: number }[];
  /** The board's own five stations in the blank's frame, with its thickness there (the page's figures). */
  stations: { key: FoilStationKey; x: number; bottom: number; deck: number; thickness: Mm }[];
  /** The board's rocker at blank position `x`, as the page reads it, or null off the board. */
  rockerAt(x: number): Mm | null;
}

/** Points along the board's outline (both ends exact). */
const BOARD_OUTLINE_STEPS = 120;
/** A blank position this close past either end of the board still reads the board's tip. */
const BOARD_REACH_SLACK_MM = 1e-6;

export function boardInBlankFrame(profile: BoardSideProfile): BoardInBlank | null {
  const view = profile.blank;
  if (!view) return null;
  const L = profile.length;
  const start = view.start;
  const shift = view.onBlank.prepared.rocker.sample(L / 2 - start) - view.bottomAt(mm(L / 2));
  const outline = Array.from({ length: BOARD_OUTLINE_STEPS + 1 }, (_, i) => {
    const s = mm(i === BOARD_OUTLINE_STEPS ? L : (L * i) / BOARD_OUTLINE_STEPS);
    return { x: s - start, bottom: profile.rockerAt(s) + shift, deck: profile.deckAt(s) + shift };
  });
  const stations = profile.stations.map(({ key, station }) => ({
    key,
    x: station - start,
    bottom: profile.rockerAt(station) + shift,
    deck: profile.deckAt(station) + shift,
    thickness: profile.effectiveFoil[key],
  }));
  return {
    shift,
    start,
    length: L,
    outline,
    stations,
    rockerAt(x) {
      const s = x + start;
      if (s < -BOARD_REACH_SLACK_MM || s > L + BOARD_REACH_SLACK_MM) return null;
      return profile.rockerAt(mm(Math.min(L, Math.max(0, s))));
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The blank alone: what its five stations read (P-11)
// ---------------------------------------------------------------------------------------------

/** One of the blank's own five stations, as the blank-alone drawing reads it. */
export interface BlankAloneStation {
  key: FoilStationKey;
  /** Along the blank, from its tail tip. */
  x: number;
  /** The drawn (bent) bottom and deck there. */
  bottom: number;
  deck: number;
  /** The thickness chip: the station's name over its printed thickness. */
  chip: { name: string; value: string };
  /** The rocker reading: the figure as ordered, the station's name, and the natural figure where it
   * differs once printed (`NAT 4 3/4"`), else null. */
  reading: { value: string; name: string; natural: string | null };
}

/** What the drawing writes where the catalogue prints no figure. */
export const NO_FIGURE = "—";

const KEYS: FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

/**
 * The blank's five stations — tail tip, 12" in, the centre, 12" in, nose tip — reading the catalogue's
 * printed figures as ordered (`customPrintedStations`, the DATASHEET's Custom Rocker row — P-11), the
 * printed thickness on the chips, and the printed natural figure (`NAT …`, the founder's accepted short
 * form) only where it reads differently. The centre is named `Center · zero` when its figure prints 0.
 */
export function blankAloneStations(bent: PreparedBlank, spec: BlankRockerSpec | undefined, system: UnitsSystem): BlankAloneStation[] {
  const L = bent.lengthMm;
  const ordered = customPrintedStations(bent.record, spec);
  const printed = printedBlankStations(bent.record);
  const twelve = inchesToMm(12);
  const xs: Record<FoilStationKey, number> = { tailTip: 0, tail12: twelve, center: L / 2, nose12: L - twelve, noseTip: L };
  const names: Record<FoilStationKey, string> = {
    tailTip: "Tail Tip",
    tail12: `Tail @ ${stationLabel(system)}`,
    center: "Center",
    nose12: `Nose @ ${stationLabel(system)}`,
    noseTip: "Nose Tip",
  };
  const show = (value: Mm | null) => (value === null ? NO_FIGURE : formatMark(value, system));
  const zero = formatMark(mm(0), system);
  return KEYS.map((key) => {
    const x = xs[key];
    const bottom = bent.rocker.sample(x);
    const value = show(ordered[key].rocker);
    const naturalValue = show(printed[key].rocker);
    return {
      key,
      x,
      bottom,
      deck: bottom + bent.thickness.sample(x),
      chip: { name: names[key], value: show(printed[key].thickness) },
      reading: {
        value,
        name: key === "center" && value === zero ? "Center · zero" : names[key],
        natural: printed[key].rocker !== null && naturalValue !== value ? `NAT ${naturalValue}` : null,
      },
    };
  });
}

// ---------------------------------------------------------------------------------------------
// The blank alone: where everything sits
// ---------------------------------------------------------------------------------------------

/** An estimate of a run of text's width in CSS pixels: characters × size × 0.62 for bold, 0.56 for
 * regular, plus any tracking — an estimate, as `CALLOUT_PX`'s are; the browser test checks the real
 * boxes don't meet. */
export function estimateTextWidth(text: string, px: number, weight: 400 | 700, trackingEm = 0): number {
  return text.length * px * ((weight === 700 ? 0.62 : 0.56) + trackingEm);
}

/** The blank-alone drawing's type and spacing, in CSS pixels. */
export const BLANK_ALONE = {
  pad: 8,
  valuePx: 12,
  namePx: 9,
  titlePx: 9,
  titleTracking: 0.08,
  chipHeight: 30,
  /** Standing up, a chip's height runs ALONG the blank, where a short blank has the least room: 26
   * leaves the 12" chip and the centre's 6 px apart on the shortest blank in a phone's box (measured
   * 2026-10-16: at 30 they came within 0.4 px of touching on the US Blanks 5'0"W). */
  chipHeightUpright: 26,
  chipPadX: 6,
  gap: 4,
  /** The least room between a rail and the blank, for the leaders. */
  leaderMin: 10,
  /** Room between a text and its leader. */
  textInset: 3,
} as const;

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutText {
  text: string;
  x: number;
  /** The baseline. */
  y: number;
  size: number;
  weight: 400 | 700;
  anchor: "start" | "middle" | "end";
  role: "value" | "name" | "natural" | "title";
}

/** A leader: from its rail end (where the label sits) to the point on the curve it measures. */
export interface LayoutLeader {
  rail: LayoutPoint;
  curve: LayoutPoint;
}

export interface LayoutLabel {
  box: LayoutBox;
  leader: LayoutLeader;
  texts: LayoutText[];
}

export interface BlankAloneStationLayout {
  key: FoilStationKey;
  chip: LayoutLabel;
  reading: LayoutLabel;
}

export interface BlankAloneLayout {
  viewBox: string;
  width: number;
  height: number;
  /** CSS pixels per millimetre, along the blank and across it alike. */
  scale: number;
  point(x: number, h: number): LayoutPoint;
  /** The foam's outline: the bottom tail to nose, then the deck back. */
  outline: LayoutPoint[];
  /** The bottom plane (h = 0), tip to tip. */
  baseline: { from: LayoutPoint; to: LayoutPoint };
  stations: BlankAloneStationLayout[];
  titles: { box: LayoutBox; text: LayoutText }[];
}

export interface BlankAloneLayoutInput {
  width: number;
  height: number;
  /** `"horizontal"`: lying flat, nose left. `"vertical"`: standing, nose up. */
  orientation: "horizontal" | "vertical";
  lengthMm: number;
  /** The drawn blank along its length: its bottom and its deck. */
  samples: { x: number; bottom: number; deck: number }[];
  stations: BlankAloneStation[];
}

/** Which way a station's labels reach from it along the blank (D-07): the tips outward, the 12"
 * stations inward, the centre both ways. In blank coordinates: +1 toward the nose, −1 toward the tail. */
const REACH: Record<FoilStationKey, -1 | 0 | 1> = { tailTip: -1, tail12: 1, center: 0, nose12: -1, noseTip: 1 };

/** The least air between two labels on one rail, in CSS pixels. */
const RAIL_GAP = 4;

export const RAIL_TITLES = {
  flatChips: "BLANK THICKNESS",
  flatReadings: "BLANK ROCKER · AS ORDERED",
  uprightChips: "THICKNESS",
  uprightReadings: "ROCKER",
} as const;

interface Measured {
  chip: { w: number; h: number };
  reading: { w: number; h: number };
}

/** The size of each station's chip and reading box. Flat: three reading lines; upright: two. */
function measure(station: BlankAloneStation, vertical: boolean): Measured {
  const B = BLANK_ALONE;
  const chipW =
    Math.max(estimateTextWidth(station.chip.name, B.namePx, 400), estimateTextWidth(station.chip.value, B.valuePx, 700)) +
    2 * B.chipPadX;
  const value = estimateTextWidth(station.reading.value, B.valuePx, 700);
  const name = estimateTextWidth(station.reading.name, B.namePx, 400);
  const nat = station.reading.natural ? estimateTextWidth(station.reading.natural, B.namePx, 400) : 0;
  if (vertical) {
    const line1 = value + (nat > 0 ? B.gap + nat : 0);
    return {
      chip: { w: chipW, h: B.chipHeightUpright },
      reading: { w: Math.max(line1, name) + B.textInset, h: B.valuePx + B.gap + B.namePx },
    };
  }
  return {
    chip: { w: chipW, h: B.chipHeight },
    reading: { w: Math.max(value, name, nat) + B.textInset, h: B.valuePx + 2 * (B.gap + B.namePx) },
  };
}

/**
 * Where everything in the blank-alone drawing sits, in the drawing's own CSS pixels (the component
 * measures its box, so one unit is one pixel at 1x). One uniform scale — the smaller of the fit along
 * the blank and the fit across it — so the blank keeps its true proportion. Flat: thickness chips on a
 * top rail under `BLANK THICKNESS`, rocker readings (value, name, NAT …) on a bottom rail over `BLANK
 * ROCKER · AS ORDERED`. Upright: readings on a left rail (value with the NAT figure after it, then the
 * name) and chips on a right rail, `ROCKER` / `THICKNESS` over them. The frame reserves room past each
 * tip for its outward labels; the blank sits centred between the rails.
 */
export function blankAloneLayout(input: BlankAloneLayoutInput): BlankAloneLayout {
  const B = BLANK_ALONE;
  const { width, height, orientation, lengthMm: L, samples, stations } = input;
  const vertical = orientation === "vertical";
  const sizes = new Map(stations.map((st) => [st.key, measure(st, vertical)]));
  const size = (key: FoilStationKey) => sizes.get(key)!;
  const titleH = B.titlePx + B.gap;

  const lo = Math.min(0, ...samples.map((p) => p.bottom));
  const hi = Math.max(...samples.map((p) => p.deck));
  const span = Math.max(hi - lo, 1);

  // The label's extent ALONG the blank (flat: its width; upright: its height) and ACROSS it.
  const along = (m: { w: number; h: number }) => (vertical ? m.h : m.w);
  const noseReach = Math.max(along(size("noseTip").chip), along(size("noseTip").reading));
  const tailReach = Math.max(along(size("tailTip").chip), along(size("tailTip").reading));

  let scale: number;
  let point: (x: number, h: number) => LayoutPoint;
  let chipRail: number; // flat: the chips' bottom edge (y); upright: the chips' left edge (x)
  let readingRail: number; // flat: the readings' top edge (y); upright: the readings' right edge (x)
  const titles: BlankAloneLayout["titles"] = [];
  const title = (text: string, x: number, y: number) => {
    const w = estimateTextWidth(text, B.titlePx, 700, B.titleTracking);
    titles.push({
      box: { x: x - w / 2, y: y - B.titlePx, width: w, height: B.titlePx },
      text: { text, x, y, size: B.titlePx, weight: 700, anchor: "middle", role: "title" },
    });
  };

  if (!vertical) {
    const maxChipH = Math.max(...stations.map((st) => size(st.key).chip.h));
    const maxReadH = Math.max(...stations.map((st) => size(st.key).reading.h));
    const alongRoom = width - 2 * B.pad - noseReach - tailReach;
    const acrossTop = B.pad + titleH + maxChipH + B.leaderMin;
    const acrossBottom = height - B.pad - titleH - maxReadH - B.leaderMin;
    const acrossRoom = acrossBottom - acrossTop;
    scale = Math.max(0, Math.min(alongRoom / L, acrossRoom / span));
    const left = B.pad + noseReach + (alongRoom - L * scale) / 2;
    const baseY = acrossTop + (acrossRoom - span * scale) / 2 + hi * scale;
    point = (x, h) => ({ x: left + (L - x) * scale, y: baseY - h * scale });
    chipRail = B.pad + titleH + maxChipH;
    readingRail = height - B.pad - titleH - maxReadH;
    title(RAIL_TITLES.flatChips, width / 2, B.pad + B.titlePx);
    title(RAIL_TITLES.flatReadings, width / 2, height - B.pad);
  } else {
    const maxChipW = Math.max(...stations.map((st) => size(st.key).chip.w));
    const maxReadW = Math.max(...stations.map((st) => size(st.key).reading.w));
    const top = B.pad + titleH + noseReach;
    const alongRoom = height - top - B.pad - tailReach;
    const acrossLeft = B.pad + maxReadW + B.leaderMin;
    const acrossRight = width - B.pad - maxChipW - B.leaderMin;
    const acrossRoom = acrossRight - acrossLeft;
    scale = Math.max(0, Math.min(alongRoom / L, acrossRoom / span));
    const noseY = top + (alongRoom - L * scale) / 2;
    const baseX = acrossLeft + (acrossRoom - span * scale) / 2 - lo * scale;
    point = (x, h) => ({ x: baseX + h * scale, y: noseY + (L - x) * scale });
    readingRail = B.pad + maxReadW;
    chipRail = width - B.pad - maxChipW;
    title(RAIL_TITLES.uprightReadings, B.pad + maxReadW / 2, B.pad + B.titlePx);
    title(RAIL_TITLES.uprightChips, width - B.pad - maxChipW / 2, B.pad + B.titlePx);
  }

  /** Where a label would like to start along its rail (flat: x; upright: y), given its station's
   * screen position there and its extent: the tips' reach OUTWARD, the 12" stations' INWARD, the
   * centre's both ways (D-07). Flat the nose is screen-left and upright it is screen-up, so "toward the
   * nose" is the smaller screen coordinate either way. */
  const placeAlong = (key: FoilStationKey, at: number, extent: number) => {
    const reach = REACH[key];
    if (reach === 0) return at - extent / 2;
    return reach === 1 ? at - extent : at;
  };
  const railMin = vertical ? B.pad + titleH : B.pad;
  const railMax = vertical ? height - B.pad : width - B.pad;

  /**
   * One rail's labels, kept `RAIL_GAP` apart and inside the rail: each starts where it would like to,
   * then a sweep each way pushes apart any that would meet. On a roomy drawing nothing moves; on a
   * short blank in a small box (a phone held upright) the 12" and centre labels slide apart along the
   * rail, and their leaders slant to the stations they measure.
   */
  const sweep = (wanted: { start: number; extent: number }[]): number[] => {
    const order = wanted.map((_, i) => i).sort((i, j) => wanted[i].start - wanted[j].start);
    const starts = wanted.map((w) => w.start);
    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      const least = k === 0 ? railMin : starts[order[k - 1]] + wanted[order[k - 1]].extent + RAIL_GAP;
      starts[i] = Math.max(starts[i], least);
    }
    for (let k = order.length - 1; k >= 0; k--) {
      const i = order[k];
      const most = k === order.length - 1 ? railMax : starts[order[k + 1]] - RAIL_GAP;
      starts[i] = Math.min(starts[i], most - wanted[i].extent);
    }
    return starts;
  };
  const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));

  const at = stations.map((st) => {
    const p = point(st.x, st.deck);
    return vertical ? p.y : p.x;
  });
  const startsFor = (pick: (m: Measured) => { w: number; h: number }) =>
    sweep(
      stations.map((st, i) => {
        const m = pick(size(st.key));
        const extent = vertical ? m.h : m.w;
        return { start: placeAlong(st.key, at[i], extent), extent };
      }),
    );
  const chipStarts = startsFor((m) => m.chip);
  const readingStarts = startsFor((m) => m.reading);

  const layoutStations: BlankAloneStationLayout[] = stations.map((st, i) => {
    const m = size(st.key);
    const deckPt = point(st.x, st.deck);
    const bottomPt = point(st.x, st.bottom);
    const chipBox: LayoutBox = vertical
      ? { x: chipRail, y: chipStarts[i], width: m.chip.w, height: m.chip.h }
      : { x: chipStarts[i], y: chipRail - m.chip.h, width: m.chip.w, height: m.chip.h };
    const chipMid = chipBox.x + chipBox.width / 2;
    const chip: LayoutLabel = {
      box: chipBox,
      leader: {
        rail: vertical
          ? { x: chipRail, y: clamp(at[i], chipBox.y, chipBox.y + chipBox.height) }
          : { x: clamp(at[i], chipBox.x, chipBox.x + chipBox.width), y: chipRail },
        curve: deckPt,
      },
      texts: [
        { text: st.chip.name, x: chipMid, y: chipBox.y + chipBox.height / 2 - 4, size: B.namePx, weight: 400, anchor: "middle", role: "name" },
        { text: st.chip.value, x: chipMid, y: chipBox.y + chipBox.height - 5, size: B.valuePx, weight: 700, anchor: "middle", role: "value" },
      ],
    };
    if (!vertical) {
      // The reading: under the bottom rail, its text set against the side its leader leaves from.
      const readBox: LayoutBox = { x: readingStarts[i], y: readingRail, width: m.reading.w, height: m.reading.h };
      const sx = clamp(at[i], readBox.x, readBox.x + readBox.width);
      const reach = REACH[st.key];
      const anchor: LayoutText["anchor"] = reach === 0 ? "middle" : reach === 1 ? "end" : "start";
      const tx =
        reach === 0 ? readBox.x + readBox.width / 2 : reach === 1 ? readBox.x + readBox.width - B.textInset : readBox.x + B.textInset;
      const lines: LayoutText[] = [
        { text: st.reading.value, x: tx, y: readingRail + B.valuePx, size: B.valuePx, weight: 700, anchor, role: "value" },
        { text: st.reading.name, x: tx, y: readingRail + B.valuePx + B.gap + B.namePx, size: B.namePx, weight: 400, anchor, role: "name" },
      ];
      if (st.reading.natural) {
        lines.push({
          text: st.reading.natural,
          x: tx,
          y: readingRail + B.valuePx + 2 * (B.gap + B.namePx),
          size: B.namePx,
          weight: 400,
          anchor,
          role: "natural",
        });
      }
      return {
        key: st.key,
        chip,
        reading: { box: readBox, leader: { rail: { x: sx, y: readingRail }, curve: bottomPt }, texts: lines },
      };
    }
    const readBox: LayoutBox = { x: readingRail - m.reading.w, y: readingStarts[i], width: m.reading.w, height: m.reading.h };
    const sy = clamp(at[i], readBox.y, readBox.y + readBox.height);
    const tx = readingRail - B.textInset;
    const natW = st.reading.natural ? estimateTextWidth(st.reading.natural, B.namePx, 400) : 0;
    const line1Y = readBox.y + B.valuePx;
    const lines: LayoutText[] = [
      // Right-aligned against the leader: the NAT figure last on the line, the value before it.
      { text: st.reading.value, x: tx - (natW > 0 ? natW + B.gap : 0), y: line1Y, size: B.valuePx, weight: 700, anchor: "end", role: "value" },
      { text: st.reading.name, x: tx, y: line1Y + B.gap + B.namePx, size: B.namePx, weight: 400, anchor: "end", role: "name" },
    ];
    if (st.reading.natural) {
      lines.push({ text: st.reading.natural, x: tx, y: line1Y, size: B.namePx, weight: 400, anchor: "end", role: "natural" });
    }
    return {
      key: st.key,
      chip,
      reading: { box: readBox, leader: { rail: { x: readingRail, y: sy }, curve: bottomPt }, texts: lines },
    };
  });

  const outline = [
    ...samples.map((p) => point(p.x, p.bottom)),
    ...[...samples].reverse().map((p) => point(p.x, p.deck)),
  ];

  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    scale,
    point,
    outline,
    baseline: { from: point(0, 0), to: point(L, 0) },
    stations: layoutStations,
    titles,
  };
}

// ---------------------------------------------------------------------------------------------
// The one drawing (quick 261017-ojc, 2026-10-17)
// ---------------------------------------------------------------------------------------------
//
// The founder, 2026-10-17: "the edit custom rocker viewer changes a ton with the show board on/off. I
// prefer the on view. Can we make the off view match it?" — then: "keep thickness of the blank above.
// Under it list the Natural Rocker, the Custom Rocker value, and when the board view is on, add the
// Board's 'current' rocker values too." One picture in both states (D-01): the bent blank on its
// bottom plane, its thickness on cards close above the foam (the board's too, when shown — D-02, P-2),
// its rocker figures stacked close under each of its five stations (D-03), the page viewer's chip look
// and its two titles (P-7). `blankViewStations` says what each station reads; `blankViewLayout` says
// where everything sits, in the drawing's own CSS pixels, lying flat or standing nose-up, with the
// Dimensions switch on or off (D-07).

/**
 * Inter Bold's advance widths, in em, measured in Chromium on 2026-10-17 and rounded up about 5%
 * (P-14). Every drawn label is bold, so there is no weight argument. The old rule (0.62 em a
 * character) under-read capitals by about 15% — `CUSTOM` at 9 px tracked is 44.4 px real — and the
 * stacks are full of capitals.
 */
function advanceEm(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch === "1" ? 0.47 : 0.71;
  switch (ch) {
    case " ":
      return 0.29;
    case "/":
      return 0.41;
    case '"':
      return 0.58;
    case ".":
      return 0.35;
    case "-":
      return 0.49;
    case "+":
      return 0.71;
    case "@":
      return 1.07;
    case "·":
      return 0.35;
    case "—":
      return 1.05;
    case "M":
      return 0.98;
    case "W":
      return 1.11;
    case "i":
    case "l":
    case "j":
      return 0.29;
    case "t":
      return 0.38;
    case "r":
      return 0.44;
    case "f":
      return 0.42;
    case "m":
      return 0.97;
  }
  if (ch >= "A" && ch <= "Z") return 0.81;
  if (ch >= "a" && ch <= "z") return 0.65;
  return 0.75;
}

/** A run of bold text's width in CSS pixels at `px`, with `trackingEm` of letter-spacing a character
 * (SVG adds it after every glyph, the last included). Never under what the browser draws (P-14). */
export function textWidthPx(text: string, px: number, trackingEm = 0): number {
  let em = 0;
  for (const ch of text) em += advanceEm(ch) + trackingEm;
  return em * px;
}

/** How far a line of text reaches above and below its baseline, in em — Inter's own ascent and
 * descent, which is the box the browser gives an SVG text. */
export const TEXT_ASCENT_EM = 0.97;
export const TEXT_DESCENT_EM = 0.25;
const cell = (px: number) => (TEXT_ASCENT_EM + TEXT_DESCENT_EM) * px;

/**
 * The one drawing's type and spacing, in CSS pixels at label scale 1 (P-8: the page viewer's on-screen
 * sizes in the computer popup). Every size but the pad, the leader and the gutter shrinks with the
 * label scale.
 */
export const BLANK_VIEW = {
  pad: 8,
  valuePx: 12,
  tagPx: 9,
  namePx: 9,
  titlePx: 10,
  trackingEm: 0.08,
  cardPadX: 6,
  cardPadY: 3,
  /** A flat card's name row, over its figure lines. */
  nameRow: 12,
  /** From one figure line's baseline to the next. */
  linePitch: 14,
  /** Between a tag and its value. */
  tagGap: 4,
  /** Between two figures on one line (standing, NAT and CUSTOM). */
  pairGap: 8,
  /** Air between two labels on a rail. */
  railGap: 3,
  /** A stack's room between its text and the side its leader leaves from. */
  stackInset: 3,
  /** The least room between the foam and a label row, for the leaders. */
  leader: 10,
  titleGap: 6,
  /** A leader starts at least this far in from its card's corners (the card's rounded corner). */
  leaderInset: 4,
  /** Two leaders leaving one card start at least this far apart (P-2). */
  leaderSeparation: 4,
  /** Dimensions off: the room left round the foam — the bend mark's 6-unit overshoot and a hairline. */
  gutter: 8,
  /** The label scales tried in turn; the first that fits wins (P-8). */
  labelScales: [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7],
} as const;

export type FigureKey = "nat" | "custom" | "board" | "blank";

/** One figure on the drawing: its tag (null on the lone thickness figure with no board — P-5), its
 * value, and whether it is a `—` (drawn in the label colour, as the page draws its centre dash). */
export interface ViewFigure {
  key: FigureKey;
  tag: string | null;
  value: string;
  muted: boolean;
}

/** One of the blank's own five stations, as the one drawing reads it. */
export interface BlankViewStation {
  key: FoilStationKey;
  /** Along the blank, from its tail tip. */
  x: number;
  /** The drawn (bent) blank's bottom and deck there. */
  bottom: number;
  deck: number;
  /** The flat card's name (P-6) — through `stationLabel`, so the 12" stations read in the shaper's system. */
  name: string;
  /** Above the foam: the blank's printed thickness, and with the board shown the board's (P-2). */
  thickness: ViewFigure[];
  /** Under the foam: NAT always, CUSTOM once any change is set (P-4), BOARD with the board shown (P-3). */
  rocker: ViewFigure[];
  /** The board's own station of the same name, in the blank's frame (the BOARD thickness line's
   * leader ends on its deck), or null with no board. */
  board: { x: number; bottom: number; deck: number } | null;
  /** The board's bottom at this blank station, in the blank's frame, where the board reaches it. */
  boardBottom: number | null;
}

const STATION_ORDER: FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

/**
 * The blank's five stations — tail tip, 12" in, the centre, 12" in, nose tip — as the one drawing reads
 * them (D-02, D-03): the printed thickness above; under the foam the printed rocker (NAT), the rocker
 * as ordered (CUSTOM, `customPrintedStations` — the DATASHEET's Custom Rocker row) at all five once the
 * spec is not natural (P-4), and with a board its rocker at that same blank position read the way the
 * page reads it (`board.rockerAt`, P-3), `—` where the board does not reach.
 */
export function blankViewStations(
  bent: PreparedBlank,
  spec: BlankRockerSpec | undefined,
  system: UnitsSystem,
  board: BoardInBlank | null,
): BlankViewStation[] {
  const L = bent.lengthMm;
  const printed = printedBlankStations(bent.record);
  const ordered = customPrintedStations(bent.record, spec);
  const custom = !isNaturalSpec(normalizeSpec(spec, L));
  const twelve = inchesToMm(12);
  const xs: Record<FoilStationKey, number> = { tailTip: 0, tail12: twelve, center: L / 2, nose12: L - twelve, noseTip: L };
  const names: Record<FoilStationKey, string> = {
    tailTip: "Tail Tip",
    tail12: `Tail @ ${stationLabel(system)}`,
    center: "Center",
    nose12: `Nose @ ${stationLabel(system)}`,
    noseTip: "Nose Tip",
  };
  const figure = (key: FigureKey, tag: string | null, value: Mm | null): ViewFigure =>
    value === null ? { key, tag, value: NO_FIGURE, muted: true } : { key, tag, value: formatMark(value, system), muted: false };
  const boardStations = new Map(board?.stations.map((st) => [st.key, st]) ?? []);
  return STATION_ORDER.map((key) => {
    const x = xs[key];
    const bottom = bent.rocker.sample(x);
    const thickness = board
      ? [figure("blank", FIGURE_TAGS.blank, printed[key].thickness), figure("board", FIGURE_TAGS.board, boardStations.get(key)!.thickness)]
      : [figure("blank", null, printed[key].thickness)];
    const rocker = [figure("nat", FIGURE_TAGS.nat, printed[key].rocker)];
    if (custom) rocker.push(figure("custom", FIGURE_TAGS.custom, ordered[key].rocker));
    const boardRocker = board ? board.rockerAt(x) : null;
    if (board) rocker.push(figure("board", FIGURE_TAGS.board, boardRocker));
    const pair = boardStations.get(key);
    return {
      key,
      x,
      bottom,
      deck: bottom + bent.thickness.sample(x),
      name: names[key],
      thickness,
      rocker,
      board: pair ? { x: pair.x, bottom: pair.bottom, deck: pair.deck } : null,
      boardBottom: board && boardRocker !== null ? boardRocker + board.shift : null,
    };
  });
}

/** One text the drawing writes: a station's name, a title, or a line of figures (each a tag and a
 * value, drawn as tspans). `y` is the baseline. */
export interface BlankViewText {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  kind: "name" | "title" | "figures";
  /** The words of a name or title; for a figure line, its figures joined (for reading, not drawing). */
  text: string;
  /** A figure line's figures, in order; empty for a name or a title. */
  figures: ViewFigure[];
}

/** A card (above the foam) or a stack (under it): its box, its leaders (each a polyline from the
 * label's own edge to what it measures), the ticks at the points measured, and its texts. */
export interface BlankViewLabel {
  key: FoilStationKey;
  box: LayoutBox;
  leaders: LayoutPoint[][];
  ticks: LayoutPoint[];
  texts: BlankViewText[];
  /** Where the label is held at its screen size while the drawing zooms: its first leader's start. */
  anchor: LayoutPoint;
}

export interface BlankViewTitle {
  key: "thickness" | "rocker";
  box: LayoutBox;
  text: BlankViewText;
}

/** The scaled sizes the component draws the texts at. */
export interface BlankViewType {
  value: number;
  tag: number;
  name: number;
  title: number;
  tagGap: number;
  pairGap: number;
  trackingEm: number;
}

export interface BlankViewLayout {
  viewBox: string;
  width: number;
  /** The drawing's height: the box's, or more on a short screen where the drawing column scrolls (P-9). */
  height: number;
  /** CSS pixels per millimetre, along the blank and across it alike. */
  scale: number;
  /** The labels' shared shrink (P-8): 1, or the first of `BLANK_VIEW.labelScales` that fits. */
  labelScale: number;
  point(x: number, h: number): LayoutPoint;
  /** The foam's outline: its bottom tail to nose, then its deck back. */
  blankOutline: LayoutPoint[];
  /** The board's, the same way round, or null. */
  boardOutline: LayoutPoint[] | null;
  /** The bottom plane (h = 0), tip to tip — the rocker's zero, kept with Dimensions off (P-16). */
  baseline: { from: LayoutPoint; to: LayoutPoint };
  cards: BlankViewLabel[];
  stacks: BlankViewLabel[];
  titles: BlankViewTitle[];
  type: BlankViewType;
}

export interface BlankViewLayoutInput {
  /** The drawing's box, in CSS pixels. */
  width: number;
  height: number;
  /** `"horizontal"`: lying flat, nose left. `"vertical"`: standing, nose up. */
  orientation: "horizontal" | "vertical";
  lengthMm: number;
  /** The drawn blank along its length (x from its tail tip): its bottom and its deck. */
  blank: { x: number; bottom: number; deck: number }[];
  /** The board in the blank's frame (`boardInBlankFrame`'s outline), or null. */
  board: { x: number; bottom: number; deck: number }[] | null;
  /** The overlay drawn over the foam, so nothing of it falls outside the drawing. */
  overlay?: RockerOverlayLines;
  stations: BlankViewStation[];
  /** D-07: false clears every card, stack and title and fits the foam to the box. */
  dimensions: boolean;
  /** P-9: on a short screen the drawing keeps the width's scale and grows taller, the column scrolling. */
  scroll: boolean;
}

/** Which way a station's labels reach from it along the blank: the tips outward, the 12" stations
 * inward, the centre both ways. +1 toward the nose, −1 toward the tail. */
const VIEW_REACH: Record<FoilStationKey, -1 | 0 | 1> = { tailTip: -1, tail12: 1, center: 0, nose12: -1, noseTip: 1 };

interface Sized {
  w: number;
  h: number;
  /** The label's lines: each one or more figures (a card's name is separate). */
  lines: ViewFigure[][];
}

/**
 * Where everything in the one drawing sits, in the drawing's own CSS pixels (the component measures
 * its box, so one unit is one pixel at 1x). One uniform scale, so the foam keeps its true proportion.
 *
 * Lying flat (nose left): the Thickness title, the cards in one row (their bottom edges on one line),
 * the leader gap, the foam, the leader gap, the stacks in one row (their top edges on one line), the
 * Rocker title — the whole composition centred in the height. Standing (nose up): the titles' band
 * across the top, then the stack column, the leader gap, the foam, the leader gap and the card column,
 * centred across. Along each rail the labels start where their station wants them and a two-way sweep
 * keeps them apart; the label scale shrinks in 5% steps until they fit (P-8). Dimensions off (D-07):
 * no labels, the foam (and the board) fitted to the box with only the gutter round it.
 */
export function blankViewLayout(input: BlankViewLayoutInput): BlankViewLayout {
  let last: BlankViewLayout | null = null;
  if (!input.dimensions) return layoutAt(input, 1)!.layout;
  for (const k of BLANK_VIEW.labelScales) {
    const attempt = layoutAt(input, k);
    if (!attempt) continue;
    last = attempt.layout;
    if (attempt.fits) return attempt.layout;
  }
  // Nothing fits even at the smallest scale (never on a pickable blank in any popup size — the unit
  // gate proves it): draw the smallest that computed.
  return last ?? layoutAt(input, BLANK_VIEW.labelScales[BLANK_VIEW.labelScales.length - 1], true)!.layout;
}

function layoutAt(input: BlankViewLayoutInput, k: number, force = false): { layout: BlankViewLayout; fits: boolean } | null {
  const B = BLANK_VIEW;
  const { width: W, height: H, orientation, lengthMm: L, blank, board, overlay, stations, dimensions, scroll } = input;
  const vertical = orientation === "vertical";

  // The extents: the blank AND the board, and the overlay drawn over them.
  let aMin = 0;
  let aMax = L;
  let hMin = 0;
  let hMax = -Infinity;
  const take = (x: number, h: number) => {
    if (x < aMin) aMin = x;
    if (x > aMax) aMax = x;
    if (h < hMin) hMin = h;
    if (h > hMax) hMax = h;
  };
  for (const p of blank) {
    take(p.x, p.bottom);
    take(p.x, p.deck);
  }
  for (const p of board ?? []) {
    take(p.x, p.bottom);
    take(p.x, p.deck);
  }
  if (overlay) {
    for (const p of overlay.natural) take(p.s, p.h);
    for (const span of overlay.spans) for (const p of [...span.bottom, ...span.deck]) take(p.s, p.h);
    for (const m of overlay.bendMarks) {
      take(m.s, m.bottom);
      take(m.s, m.deck);
    }
  }
  if (!Number.isFinite(hMax)) hMax = 1;
  const alongSpan = Math.max(aMax - aMin, 1);
  const acrossSpan = Math.max(hMax - hMin, 1);

  const type: BlankViewType = {
    value: B.valuePx * k,
    tag: B.tagPx * k,
    name: B.namePx * k,
    title: B.titlePx * k,
    tagGap: B.tagGap * k,
    pairGap: B.pairGap * k,
    trackingEm: B.trackingEm,
  };

  const finish = (
    point: (x: number, h: number) => LayoutPoint,
    scale: number,
    height: number,
    cards: BlankViewLabel[],
    stacks: BlankViewLabel[],
    titles: BlankViewTitle[],
  ): BlankViewLayout => ({
    viewBox: `0 0 ${W} ${height}`,
    width: W,
    height,
    scale,
    labelScale: dimensions ? k : 1,
    point,
    blankOutline: [...blank.map((p) => point(p.x, p.bottom)), ...[...blank].reverse().map((p) => point(p.x, p.deck))],
    boardOutline: board ? [...board.map((p) => point(p.x, p.bottom)), ...[...board].reverse().map((p) => point(p.x, p.deck))] : null,
    baseline: { from: point(0, 0), to: point(L, 0) },
    cards,
    stacks,
    titles,
    type,
  });

  // Dimensions off (D-07, P-16): the foam alone, fitted to the box with only the gutter round it.
  if (!dimensions) {
    const g = B.gutter;
    const alongLen = vertical ? H : W;
    const acrossLen = vertical ? W : H;
    const scale = Math.max(0, Math.min((alongLen - 2 * g) / alongSpan, (acrossLen - 2 * g) / acrossSpan));
    const a0 = (alongLen - alongSpan * scale) / 2;
    const c0 = (acrossLen - acrossSpan * scale) / 2;
    const point = vertical
      ? (x: number, h: number) => ({ x: c0 + (h - hMin) * scale, y: a0 + (aMax - x) * scale })
      : (x: number, h: number) => ({ x: a0 + (aMax - x) * scale, y: c0 + (hMax - h) * scale });
    return { layout: finish(point, scale, H, [], [], []), fits: true };
  }

  // The labels' sizes at this scale.
  const tw = (text: string, px: number, tracking = 0) => textWidthPx(text, px, tracking);
  const figureWidth = (f: ViewFigure) =>
    (f.tag ? tw(f.tag, type.tag, B.trackingEm) + type.tagGap : 0) + tw(f.value, type.value);
  const lineWidth = (line: ViewFigure[]) =>
    line.reduce((sum, f) => sum + figureWidth(f), 0) + Math.max(0, line.length - 1) * type.pairGap;
  const padX = B.cardPadX * k;
  const padY = B.cardPadY * k;
  const nameRow = B.nameRow * k;
  const pitch = B.linePitch * k;
  const railGap = B.railGap * k;
  const inset = B.stackInset * k;
  const titleGap = B.titleGap * k;
  const titleH = cell(type.title);

  const cardOf = (st: BlankViewStation): Sized => {
    const lines = st.thickness.map((f) => [f]);
    const nameW = vertical ? 0 : tw(st.name, type.name, B.trackingEm);
    return {
      w: Math.max(nameW, ...lines.map(lineWidth)) + 2 * padX,
      h: 2 * padY + (vertical ? 0 : nameRow) + type.value + (lines.length - 1) * pitch,
      lines,
    };
  };
  const stackOf = (st: BlankViewStation): Sized => {
    let lines: ViewFigure[][];
    if (vertical) {
      const first = st.rocker.filter((f) => f.key !== "board");
      const second = st.rocker.filter((f) => f.key === "board");
      lines = second.length > 0 ? [first, second] : [first];
    } else {
      lines = st.rocker.map((f) => [f]);
    }
    return { w: Math.max(...lines.map(lineWidth)) + inset, h: cell(type.value) + (lines.length - 1) * pitch, lines };
  };
  const cards = stations.map(cardOf);
  const stacks = stations.map(stackOf);
  const byKey = (key: FoilStationKey) => stations.findIndex((st) => st.key === key);
  const nose = byKey("noseTip");
  const tail = byKey("tailTip");
  const alongOf = (s: Sized) => (vertical ? s.h : s.w);
  const noseReach = Math.max(alongOf(cards[nose]), alongOf(stacks[nose]));
  const tailReach = Math.max(alongOf(cards[tail]), alongOf(stacks[tail]));

  let scale: number;
  let height = H;
  let point: (x: number, h: number) => LayoutPoint;
  // Flat: the cards' bottom edge (y) and the stacks' top edge (y). Standing: the cards' left edge (x)
  // and the stacks' right edge (x).
  let cardEdge: number;
  let stackEdge: number;
  const titles: BlankViewTitle[] = [];
  const titleText = (key: "thickness" | "rocker") => BLANK_VIEW_TITLES[key];
  const title = (key: "thickness" | "rocker", cx: number, top: number, lo: number, hi: number) => {
    const text = titleText(key);
    const w = tw(text, type.title, B.trackingEm);
    const x = Math.min(hi - w / 2, Math.max(lo + w / 2, cx));
    titles.push({
      key,
      box: { x: x - w / 2, y: top, width: w, height: titleH },
      text: { x, y: top + TEXT_ASCENT_EM * type.title, anchor: "middle", kind: "title", text, figures: [] },
    });
  };
  let fitsAcross = true;

  if (!vertical) {
    const maxCardH = Math.max(...cards.map((c) => c.h));
    const maxStackH = Math.max(...stacks.map((s) => s.h));
    const alongRoom = W - 2 * B.pad - noseReach - tailReach;
    const fixed = titleH + titleGap + maxCardH + 2 * B.leader + maxStackH + titleGap + titleH;
    const alongScale = alongRoom / alongSpan;
    const acrossScale = (H - 2 * B.pad - fixed) / acrossSpan;
    scale = scroll ? alongScale : Math.min(alongScale, acrossScale);
    if (scroll) height = Math.max(H, 2 * B.pad + fixed + acrossSpan * scale);
    const total = fixed + acrossSpan * scale;
    const top = (height - total) / 2;
    const left = B.pad + noseReach + (alongRoom - alongSpan * scale) / 2;
    cardEdge = top + titleH + titleGap + maxCardH;
    const foamTop = cardEdge + B.leader;
    stackEdge = foamTop + acrossSpan * scale + B.leader;
    const s = scale;
    point = (x, h) => ({ x: left + (aMax - x) * s, y: foamTop + (hMax - h) * s });
    title("thickness", W / 2, top, B.pad, W - B.pad);
    title("rocker", W / 2, stackEdge + maxStackH + titleGap, B.pad, W - B.pad);
  } else {
    const maxCardW = Math.max(...cards.map((c) => c.w));
    const maxStackW = Math.max(...stacks.map((s) => s.w));
    const band = titleH + titleGap;
    const alongRoom = H - 2 * B.pad - band - noseReach - tailReach;
    const acrossRoom = W - 2 * B.pad - maxStackW - maxCardW - 2 * B.leader;
    fitsAcross = acrossRoom > 0;
    scale = Math.min(alongRoom / alongSpan, acrossRoom / acrossSpan);
    const s = scale;
    const noseY = B.pad + band + noseReach + (alongRoom - alongSpan * scale) / 2;
    const total = maxStackW + 2 * B.leader + acrossSpan * scale + maxCardW;
    const left0 = (W - total) / 2;
    stackEdge = left0 + maxStackW;
    const foamLeft = stackEdge + B.leader;
    cardEdge = foamLeft + acrossSpan * scale + B.leader;
    point = (x, h) => ({ x: foamLeft + (h - hMin) * s, y: noseY + (aMax - x) * s });
    title("rocker", stackEdge - maxStackW / 2, B.pad, B.pad, W - B.pad);
    title("thickness", cardEdge + maxCardW / 2, B.pad, B.pad, W - B.pad);
  }
  if (!(scale > 0)) {
    if (!force) return null;
    scale = Math.max(scale, 1e-6);
  }

  // Along each rail: each label starts where its station wants it, then the sweep keeps them apart.
  const railMin = vertical ? B.pad + titleH + titleGap : B.pad;
  const railMax = vertical ? H - B.pad : W - B.pad;
  const at = stations.map((st) => {
    const p = point(st.x, st.deck);
    return vertical ? p.y : p.x;
  });
  const wantedStart = (i: number, extent: number) => {
    const reach = VIEW_REACH[stations[i].key];
    if (reach === 0) return at[i] - extent / 2;
    // Flat the nose is screen-left and standing it is screen-up: toward the nose is the smaller
    // screen coordinate either way.
    return reach === 1 ? at[i] - extent : at[i];
  };
  let fits = fitsAcross;
  const sweep = (sizes: Sized[]): number[] => {
    const wanted = sizes.map((sz, i) => ({ start: wantedStart(i, alongOf(sz)), extent: alongOf(sz) }));
    const order = wanted.map((_, i) => i).sort((i, j) => wanted[i].start - wanted[j].start);
    const starts = wanted.map((w) => w.start);
    for (let n = 0; n < order.length; n++) {
      const i = order[n];
      const least = n === 0 ? railMin : starts[order[n - 1]] + wanted[order[n - 1]].extent + railGap;
      starts[i] = Math.max(starts[i], least);
    }
    for (let n = order.length - 1; n >= 0; n--) {
      const i = order[n];
      const most = n === order.length - 1 ? railMax : starts[order[n + 1]] - railGap;
      starts[i] = Math.min(starts[i], most - wanted[i].extent);
    }
    // Pushed past the rail, or crowded into a neighbour: this scale does not fit.
    const e = 1e-6;
    for (let n = 0; n < order.length; n++) {
      const i = order[n];
      if (starts[i] < railMin - e || starts[i] + wanted[i].extent > railMax + e) fits = false;
      if (n > 0 && starts[i] < starts[order[n - 1]] + wanted[order[n - 1]].extent + railGap - e) fits = false;
    }
    return starts;
  };
  const cardStarts = sweep(cards);
  const stackStarts = sweep(stacks);

  /** Where leaders leave a label's edge: each at its target's along position, clamped in from the
   * corners, two from one card kept apart in their targets' order (P-2). */
  const edgeStarts = (targets: number[], lo: number, hi: number): number[] => {
    const starts = targets.map((t) => Math.min(hi, Math.max(lo, t)));
    if (starts.length === 2) {
      const sep = B.leaderSeparation;
      const [i, j] = targets[0] <= targets[1] ? [0, 1] : [1, 0];
      if (starts[j] - starts[i] < sep) {
        const mid = (starts[i] + starts[j]) / 2;
        let a = mid - sep / 2;
        let b = mid + sep / 2;
        if (a < lo) {
          b += lo - a;
          a = lo;
        }
        if (b > hi) {
          a -= b - hi;
          b = hi;
        }
        starts[i] = a;
        starts[j] = b;
      }
    }
    return starts;
  };
  const alongCoord = (p: LayoutPoint) => (vertical ? p.y : p.x);
  const onEdge = (along: number, edge: number): LayoutPoint => (vertical ? { x: edge, y: along } : { x: along, y: edge });
  const leaderInset = Math.min(B.leaderInset, 0.25 * Math.min(...cards.map(alongOf)));

  const cardLabels: BlankViewLabel[] = stations.map((st, i) => {
    const size = cards[i];
    const box: LayoutBox = vertical
      ? { x: cardEdge, y: cardStarts[i], width: size.w, height: size.h }
      : { x: cardStarts[i], y: cardEdge - size.h, width: size.w, height: size.h };
    const targets = st.thickness.map((f) =>
      f.key === "board" && st.board ? point(st.board.x, st.board.deck) : point(st.x, st.deck),
    );
    const lo = (vertical ? box.y : box.x) + leaderInset;
    const hi = (vertical ? box.y + box.height : box.x + box.width) - leaderInset;
    const starts = edgeStarts(targets.map(alongCoord), lo, hi).map((a) => onEdge(a, cardEdge));
    const cx = box.x + box.width / 2;
    const texts: BlankViewText[] = [];
    const nameH = cell(type.name);
    if (!vertical) {
      texts.push({
        x: cx,
        y: box.y + padY + (nameRow - nameH) / 2 + TEXT_ASCENT_EM * type.name,
        anchor: "middle",
        kind: "name",
        text: st.name,
        figures: [],
      });
    }
    size.lines.forEach((line, n) => {
      const slotTop = box.y + padY + (vertical ? 0 : nameRow) + n * pitch;
      texts.push({
        x: cx,
        y: slotTop + (type.value - cell(type.value)) / 2 + TEXT_ASCENT_EM * type.value,
        anchor: "middle",
        kind: "figures",
        text: line.map((f) => (f.tag ? `${f.tag} ${f.value}` : f.value)).join(" "),
        figures: line,
      });
    });
    return {
      key: st.key,
      box,
      leaders: starts.map((s, n) => [s, targets[n]]),
      ticks: targets,
      texts,
      anchor: starts[0],
    };
  });

  const stackLabels: BlankViewLabel[] = stations.map((st, i) => {
    const size = stacks[i];
    const box: LayoutBox = vertical
      ? { x: stackEdge - size.w, y: stackStarts[i], width: size.w, height: size.h }
      : { x: stackStarts[i], y: stackEdge, width: size.w, height: size.h };
    const blankBottom = point(st.x, st.bottom);
    const heights = st.boardBottom === null ? [st.bottom] : [st.bottom, st.boardBottom].sort((p, q) => p - q);
    const path = heights.map((h) => point(st.x, h));
    const ticks = st.boardBottom === null ? [blankBottom] : [blankBottom, point(st.x, st.boardBottom)];
    const lo = vertical ? box.y : box.x;
    const hi = vertical ? box.y + box.height : box.x + box.width;
    const start = onEdge(Math.min(hi, Math.max(lo, alongCoord(blankBottom))), stackEdge);
    const reach = VIEW_REACH[st.key];
    const anchor: BlankViewText["anchor"] = vertical ? "end" : reach === 0 ? "middle" : reach === 1 ? "end" : "start";
    const tx = anchor === "end" ? box.x + box.width - inset : anchor === "start" ? box.x + inset : box.x + box.width / 2;
    const texts: BlankViewText[] = size.lines.map((line, n) => ({
      x: tx,
      y: box.y + n * pitch + TEXT_ASCENT_EM * type.value,
      anchor,
      kind: "figures",
      text: line.map((f) => `${f.tag} ${f.value}`).join(" "),
      figures: line,
    }));
    return { key: st.key, box, leaders: [[start, ...path]], ticks, texts, anchor: start };
  });

  return { layout: finish(point, scale, height, cardLabels, stackLabels, titles), fits };
}
