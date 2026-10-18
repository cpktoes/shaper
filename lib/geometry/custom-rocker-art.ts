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
 *    `blankFrameOverlay` feeds it the bent blank.
 *
 * 2. THE ONE DRAWING (quick 261017-ojc, 2026-10-17) — the bent blank in the same grammar whether or not
 *    the board is shown (D-01): the board carried into the blank's frame (`boardInBlankFrame`), what
 *    each of the blank's five stations reads (`blankViewStations` — its thickness above the foam, its
 *    NAT, CUSTOM and BOARD rocker stacked under it), and where everything sits in the drawing's own
 *    CSS pixels, lying flat or standing nose-up, with the Dimensions switch on or off
 *    (`blankViewLayout`). It replaced the blank-alone drawing and the board-frame overlay (P-15).
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

/** What the drawing writes where the catalogue prints no figure, or where the board does not reach. */
export const NO_FIGURE = "—";

/** A point in the drawing, in its own CSS pixels. */
export interface LayoutPoint {
  x: number;
  y: number;
}

/** A box in the drawing, in its own CSS pixels. */
export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
  /** The height the composition itself needs on a short screen (P-9) — what the component asks its
   * box to grow to, so the drawing column scrolls rather than clipping; never read off the box itself,
   * so a box that has grown to it shrinks back when less is needed. Equal to `height` elsewhere. */
  neededHeight: number;
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
    neededHeight = height,
  ): BlankViewLayout => ({
    viewBox: `0 0 ${W} ${height}`,
    width: W,
    height,
    neededHeight,
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
  let neededHeight = H;
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
    if (scroll) {
      neededHeight = 2 * B.pad + fixed + acrossSpan * scale;
      height = Math.max(H, neededHeight);
    }
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

  return { layout: finish(point, scale, height, cardLabels, stackLabels, titles, neededHeight), fits };
}
