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
 *    bend point red and the outline are one line. `rockerOverlay` is the one core; the blank's own
 *    frame (`blankFrameOverlay`, Show my board off) and the board's frame (`boardFrameOverlay`, Show
 *    my board on) only feed it a different curve and a different shift along the board.
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
import type { BlankSideView } from "./board-profile";
import { printedBlankStations } from "./board-profile";
import { bendAt, bendPoint, customPrintedStations, isNaturalSpec, normalizeSpec, type BlankRockerSpec, type RockerChange } from "./custom-rocker";
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

/** The overlay in the board's frame (`s` from the board's tail tip), read off the side view's own
 * blank bottom and deck — the drawing the popup shows with Show my board on. */
export function boardFrameOverlay(spec: BlankRockerSpec | undefined, view: BlankSideView): RockerOverlayLines {
  const at = (x: number) => mm(x + view.start);
  return rockerOverlay(
    spec,
    view.record.lengthMm,
    { bottomAt: (x) => view.bottomAt(at(x)), thicknessAt: (x) => view.deckAt(at(x)) - view.bottomAt(at(x)) },
    (x) => x + view.start,
  );
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
