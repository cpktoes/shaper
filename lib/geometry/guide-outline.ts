/**
 * TEMPLATE's GUIDE cards, worked out from the open board (Phase 18, D-04 to D-08, D-11, D-16, D-17, D-26;
 * UI-SPEC §4 and §5).
 *
 * Twenty-two cards, one per control or named choice under the sidebar's own headings: Board Length, the
 * nose's angle and fullness, the four widepoint controls, the five tail shapes each drawn on this board,
 * Tail Block, Depth, Tail Angle and the tail's fullness, then the six controls of the WINGS tab's sidebar.
 * Each card draws the board from above, nose left — the whole board in a strip, a dash-dot window on the
 * part the control shapes, that part closer — with the one setting pushed in muted dashes beside the board
 * as it is. Every pushed outline is `buildOutline` of the open board with that one field changed; the push
 * amounts are `guidePush(system).template`, held inside the control's own limits (`measureSlider` of the
 * control's own range, so a Metric limit is the slider's own millimetre figure). Where a push has no room
 * it is drawn the other way, and where neither way has room the board is drawn as it is with no caption
 * (D-26).
 *
 * Depth belongs to a diamond or a swallow alone (D-11): on any other tail the card says so, writes *no depth
 * on a squash tail* inside its window (never over the board), and draws the board as a swallow in dashes
 * with the swallow's depth dimensioned, so the setting is still seen.
 *
 * Every figure is printed through the page's own formatters; degrees and percentages as the sidebar prints
 * them. Pure; no React, browser or database (CLAUDE.md Rule 1).
 */
import { BOARD_LENGTH_RANGE_IN, TAIL_PRESETS, WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec, type TailShape } from "./board";
import type { FinMark } from "./fins";
import {
  GUIDE_NO_CAPTION,
  GUIDE_NO_TAG,
  guideCardId,
  guideFigure,
  guideText,
  type GuideBox,
  type GuideCaption,
  type GuideCardModel,
  type GuideFigure,
  type GuidePageBuild,
  type GuidePrim,
  type GuideTag,
  type GuideTextPart,
} from "./guide-card";
import {
  guideDetailBox,
  GUIDE_HDIM_LABEL_OFF,
  guideHDim,
  guideHalfWidthAt,
  guidePlanPrims,
  guideStripFit,
  guideVDim,
  guideWindowFit,
  guideWindowName,
  guideX,
  guideY,
  GUIDE_TEXT_UNITS_MAX,
  type GuideMap,
  type GuideWindowSpec,
} from "./guide-draw";
import { GUIDE_FRAME, guidePush } from "./guide-push";
import { formatControlNumber, formatDim, formatLength, formatMark, formatSignedDim, formatSignedMark, measureSlider } from "./measure-display";
import { buildOutline, MEASURE_STATION_MM, type OutlineGeometry } from "./outline";
import { degrees, mm, type Mm, type UnitsSystem } from "./units";
import { lockedWingStation } from "./wing-lock";
import {
  canAddSecondWing,
  effectiveWingRadius,
  nextWing,
  wingFootprint,
  wingLockEdge,
  wingPositionRangeForSlot,
  wingRadiusTop,
  WING_DEPTH_RANGE_IN,
  WING_FIN_OFFSET_RANGE_IN,
  WING_RUN_RANGE_IN,
  WING_STEP_IN,
  WING_STEP_MM,
  type Wing,
  type WingFinEdges,
} from "./wings";

/** The page's five groups, as the words page names them. */
const LENGTH = "Board Length";
const NOSE = "Nose Controls";
const WIDE = "Widepoint Controls";
const TAIL = "Tail Controls";
const WINGS = "Wings";

const id = (group: string, name: string) => guideCardId("template", group, name);

/** TEMPLATE's 22 cards, in the words page's order. The two Fullness and the two Depth cards are four cards
 * with four ids: page, group and name together (D-27). */
export const TEMPLATE_GUIDE_CARD_IDS = {
  boardLength: id(LENGTH, "Board Length"),
  noseAngle: id(NOSE, "Nose Angle"),
  noseFullness: id(NOSE, "Fullness"),
  width: id(WIDE, "Width"),
  offset: id(WIDE, "Offset"),
  tailRail: id(WIDE, "Tail Rail"),
  noseRail: id(WIDE, "Nose Rail"),
  pin: id(TAIL, "Pin"),
  round: id(TAIL, "Round"),
  diamond: id(TAIL, "Diamond"),
  squash: id(TAIL, "Squash"),
  swallow: id(TAIL, "Swallow"),
  tailBlock: id(TAIL, "Tail Block"),
  tailDepth: id(TAIL, "Depth"),
  tailAngle: id(TAIL, "Tail Angle"),
  tailFullness: id(TAIL, "Fullness"),
  addWing: id(WINGS, "+ Add a wing"),
  wingPosition: id(WINGS, "Position from tail"),
  wingDepth: id(WINGS, "Depth"),
  wingRun: id(WINGS, "Vertical run"),
  wingRadius: id(WINGS, "Corner radius"),
  wingLock: id(WINGS, "Lock to front fin · Offset from the fin"),
} as const;

/** The 22 ids in order. */
export const TEMPLATE_GUIDE_CARD_ORDER: readonly string[] = Object.values(TEMPLATE_GUIDE_CARD_IDS);

const ids = TEMPLATE_GUIDE_CARD_IDS;
const TAIL_KINDS = ["pin", "round", "diamond", "squash", "swallow"] as const satisfies readonly TailShape["kind"][];
const TAIL_CARD: Record<TailShape["kind"], string> = {
  pin: ids.pin,
  round: ids.round,
  diamond: ids.diamond,
  squash: ids.squash,
  swallow: ids.swallow,
};

/**
 * The outline fields each card changes — in its push, or (the five tails, Depth on a tail that has none,
 * and the wing cards) in the board it draws. Every other field of the open board is carried unchanged.
 */
export const TEMPLATE_GUIDE_PUSH_FIELDS: Readonly<Record<string, readonly (keyof OutlineSpec)[]>> = {
  [ids.boardLength]: ["length"],
  [ids.noseAngle]: ["noseAngle"],
  [ids.noseFullness]: ["noseFullness"],
  [ids.width]: ["widePointWidth"],
  [ids.offset]: ["widePointOffset"],
  [ids.tailRail]: ["tailRailLength"],
  [ids.noseRail]: ["noseRailLength"],
  [ids.pin]: ["tail", "tailAngle", "tailFullness"],
  [ids.round]: ["tail", "tailAngle", "tailFullness"],
  [ids.diamond]: ["tail", "tailAngle", "tailFullness"],
  [ids.squash]: ["tail", "tailAngle", "tailFullness"],
  [ids.swallow]: ["tail", "tailAngle", "tailFullness"],
  [ids.tailBlock]: ["tail"],
  // A diamond's or swallow's own depth is in its tail; any other tail is drawn as the swallow preset.
  [ids.tailDepth]: ["tail", "tailAngle", "tailFullness"],
  [ids.tailAngle]: ["tailAngle"],
  [ids.tailFullness]: ["tailFullness"],
  [ids.addWing]: ["wings"],
  [ids.wingPosition]: ["wings"],
  [ids.wingDepth]: ["wings"],
  [ids.wingRun]: ["wings"],
  [ids.wingRadius]: ["wings"],
  [ids.wingLock]: ["wings"],
};

/** What TEMPLATE's GUIDE reads from the design store — the store's own objects, read only. */
export interface TemplateGuideInput {
  /** The outline as the store hands it out: every locked wing placed (`resolveWingStations`). */
  outline: OutlineSpec;
  outlineGeometry: OutlineGeometry;
  /** The trailing edges a wing can lock to (`wingFinEdges` of the placed fins). */
  wingFinEdges: WingFinEdges;
  /** The board's fins as FINS places them — the Lock card draws them. */
  finMarks: readonly FinMark[];
}

/** One card's boards: the one it draws, and the one in muted dashes beside it (`null`: nothing pushed). */
export interface TemplateGuideVariant {
  base: OutlineSpec;
  push: OutlineSpec | null;
}

const EPS = 1e-6;

/** A control's own limits in millimetres, as its slider sets them in the shaper's system. */
function sliderLimits(
  value: Mm,
  rangeIn: { min: number; max: number },
  stepIn: number,
  stepMm: number,
  system: UnitsSystem,
): { lo: number; hi: number } {
  const view = measureSlider(value, rangeIn, stepIn, stepMm, system);
  return { lo: view.toMm(view.min), hi: view.toMm(view.max) };
}

/** A push inside the control's limits: up by the amount (held at the top), else down by it (held at the
 * bottom), else `null` — no room either way (D-26). */
function pushWithin(value: number, amount: number, lo: number, hi: number): number | null {
  const up = Math.min(hi, value + amount);
  if (up > value + EPS) return up;
  const down = Math.max(lo, value - amount);
  if (down < value - EPS) return down;
  return null;
}

/** A wing's depth or run pushed to the sketch's figure, or by it where the wing already has that much. */
function wingAmount(value: number, amount: number, lo: number, hi: number): number | null {
  if (value < amount - EPS) return Math.min(hi, amount);
  return pushWithin(value, amount, lo, hi);
}

function withEndWidth(tail: TailShape, endWidth: Mm): TailShape {
  return tail.kind === "pin" || tail.kind === "round" ? tail : { ...tail, endWidth };
}

/** The board with a tail shape's preset — what pressing that tail button does (`TAIL_PRESETS`). */
function withTailPreset(outline: OutlineSpec, kind: TailShape["kind"]): OutlineSpec {
  const preset = TAIL_PRESETS[kind];
  return { ...outline, tail: preset.tail, tailAngle: preset.tailAngle, tailFullness: preset.tailFullness };
}

/** The board the wing cards draw: the open board with its own wings, or with the wing "+ Add a wing" would
 * add first when it has none (D-07, Pitfall 6 — the first wing's radius depends on the live system). */
function wingBase(input: TemplateGuideInput, system: UnitsSystem): OutlineSpec {
  const wings = input.outline.wings ?? [];
  if (wings.length > 0) return input.outline;
  return { ...input.outline, wings: [nextWing([], input.wingFinEdges, input.outlineGeometry, system)] };
}

function withFirstWing(outline: OutlineSpec, wing: Wing): OutlineSpec {
  const wings = outline.wings ?? [];
  return { ...outline, wings: [wing, ...wings.slice(1)] };
}

/** Every card's boards for the open board in the shaper's system. */
export function templateGuideVariants(input: TemplateGuideInput, system: UnitsSystem): Record<string, TemplateGuideVariant> {
  const o = input.outline;
  const g = input.outlineGeometry;
  const p = guidePush(system).template;
  const out: Record<string, TemplateGuideVariant> = {};
  const set = (cardId: string, push: OutlineSpec | null, base: OutlineSpec = o) => {
    out[cardId] = { base, push };
  };
  const pushed = (value: number | null, make: (v: number) => OutlineSpec) => (value === null ? null : make(value));

  // Board Length, Nose Controls, Widepoint Controls.
  const length = sliderLimits(o.length, BOARD_LENGTH_RANGE_IN, 1, 10, system);
  set(ids.boardLength, pushed(pushWithin(o.length, p.length, length.lo, length.hi), (v) => ({ ...o, length: mm(v) })));
  set(ids.noseAngle, pushed(pushWithin(o.noseAngle, p.angle, 35, 90), (v) => ({ ...o, noseAngle: degrees(v) })));
  set(ids.noseFullness, pushed(pushWithin(o.noseFullness, p.full, 0, 100), (v) => ({ ...o, noseFullness: v })));
  const width = sliderLimits(o.widePointWidth, WIDEPOINT_WIDTH_RANGE_IN, 0.125, 1, system);
  set(ids.width, pushed(pushWithin(o.widePointWidth, p.width, width.lo, width.hi), (v) => ({ ...o, widePointWidth: mm(v) })));
  const offset = sliderLimits(o.widePointOffset, { min: -12, max: 12 }, 0.25, 1, system);
  set(ids.offset, pushed(pushWithin(o.widePointOffset, p.offset, offset.lo, offset.hi), (v) => ({ ...o, widePointOffset: mm(v) })));
  set(ids.tailRail, pushed(pushWithin(o.tailRailLength, p.rail, 0, 100), (v) => ({ ...o, tailRailLength: v })));
  set(ids.noseRail, pushed(pushWithin(o.noseRailLength, p.rail, 0, 100), (v) => ({ ...o, noseRailLength: v })));

  // The five tails, each drawn on this board with its preset; nothing pushed.
  for (const kind of TAIL_KINDS) set(TAIL_CARD[kind], null, withTailPreset(o, kind));

  // Tail Block: none on a pin or round tail (the geometry's own flag).
  const tail = o.tail;
  if (g.tailBlockPinned || tail.kind === "pin" || tail.kind === "round") {
    set(ids.tailBlock, null);
  } else {
    const block = sliderLimits(tail.endWidth, { min: 0, max: 16 }, 0.125, 1, system);
    set(ids.tailBlock, pushed(pushWithin(tail.endWidth, p.block, block.lo, block.hi), (v) => ({ ...o, tail: withEndWidth(tail, mm(v)) })));
  }

  // Depth: a diamond's or a swallow's own, pushed; any other tail drawn as the swallow preset.
  if (tail.kind === "diamond") {
    const range = sliderLimits(tail.depth, { min: 1, max: 5 }, 0.0625, 1, system);
    // The diamond's depth as the outline allows it: a push that leaves the clamped depth where it is has
    // no room that way.
    const candidates = [Math.min(range.hi, tail.depth + p.depth), Math.max(range.lo, tail.depth - p.depth)];
    const room = candidates.find(
      (d) => Math.abs(buildOutline({ ...o, tail: { ...tail, depth: mm(d) } }).effectiveDiamondDepth - g.effectiveDiamondDepth) > EPS,
    );
    set(ids.tailDepth, room === undefined ? null : { ...o, tail: { ...tail, depth: mm(room) } });
  } else if (tail.kind === "swallow") {
    const range = sliderLimits(tail.crotchDepth, { min: 1, max: 8 }, 0.0625, 1, system);
    set(
      ids.tailDepth,
      pushed(pushWithin(tail.crotchDepth, p.depth, range.lo, range.hi), (v) => ({ ...o, tail: { ...tail, crotchDepth: mm(v) } })),
    );
  } else {
    set(ids.tailDepth, withTailPreset(o, "swallow"));
  }

  // Tail Angle: pinned on a diamond (the geometry's own flag).
  if (g.tailAnglePinned) set(ids.tailAngle, null);
  else set(ids.tailAngle, pushed(pushWithin(o.tailAngle, p.tailAngle, 30, 90), (v) => ({ ...o, tailAngle: degrees(v) })));
  set(ids.tailFullness, pushed(pushWithin(o.tailFullness, p.full, 0, 100), (v) => ({ ...o, tailFullness: v })));

  // Wings: + Add a wing pushes the wing the button would add; the rest push wing 1.
  const wings = o.wings ?? [];
  if (wings.length === 0) set(ids.addWing, wingBase(input, system));
  else if (wings.length === 1 && canAddSecondWing(wings, g))
    set(ids.addWing, { ...o, wings: [...wings, nextWing(wings, input.wingFinEdges, g, system)] });
  else set(ids.addWing, null);

  const base = wingBase(input, system);
  const baseWings = base.wings ?? [];
  const w = baseWings[0];
  const position = sliderLimits(w.station, wingPositionRangeForSlot(baseWings, 0, g), WING_STEP_IN, WING_STEP_MM, system);
  set(
    ids.wingPosition,
    pushed(pushWithin(w.station, p.wingPos, position.lo, position.hi), (v) => withFirstWing(base, { ...w, lock: null, station: mm(v) })),
    base,
  );
  const depth = sliderLimits(w.depth, WING_DEPTH_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
  set(ids.wingDepth, pushed(wingAmount(w.depth, p.wingDepth, depth.lo, depth.hi), (v) => withFirstWing(base, { ...w, depth: mm(v) })), base);
  const run = sliderLimits(w.run, WING_RUN_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
  set(ids.wingRun, pushed(wingAmount(w.run, p.wingRun, run.lo, run.hi), (v) => withFirstWing(base, { ...w, run: mm(v) })), base);
  const radiusTop = wingRadiusTop(w, system);
  const radius = effectiveWingRadius(w);
  const radiusPush = radius < radiusTop - EPS ? radiusTop : radius > EPS ? mm(0) : null;
  set(ids.wingRadius, pushed(radiusPush, (v) => withFirstWing(base, { ...w, radius: mm(v) })), base);
  if (wingLockEdge(w, 0, input.wingFinEdges) === null) {
    set(ids.wingLock, null, base);
  } else {
    const off = sliderLimits(w.finOffset, WING_FIN_OFFSET_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
    // A locked wing sits at the fin's trailing edge plus its offset: the app's own lock rule places it.
    set(
      ids.wingLock,
      pushed(pushWithin(w.finOffset, p.wingOffset, off.lo, off.hi), (v) => {
        const moved = { ...w, finOffset: mm(v) };
        return withFirstWing(base, { ...moved, station: lockedWingStation(moved, 0, input.wingFinEdges, g) });
      }),
      base,
    );
  }
  return out;
}

/* ============ the drawing ============ */

/**
 * The part of the board a card's detail shows (the sketch's `templateCartoon` windows). `widetail` is the
 * wide point's window run back to the tail, so the Width card can stand its dimension beyond the tail, off
 * the board (D-08), where the sketch's window cut the board at both ends and left the label over it.
 */
type WindowKind = "whole" | "nose" | "tail" | "wide" | "widetail" | "tailhalf" | "nosehalf";

const WINDOW_NAMES: Record<WindowKind, string> = {
  whole: "Whole board",
  nose: "Nose",
  tail: "Tail",
  wide: "Wide point",
  widetail: "Wide point",
  tailhalf: "Tail half",
  nosehalf: "Nose half",
};

/** Strip and detail heights (UI-SPEC §4: TEMPLATE strip 70, detail 100 or 140). */
const STRIP_H = 70;
const DETAIL_H: Record<WindowKind, number> = {
  whole: 100,
  tailhalf: 100,
  nosehalf: 100,
  nose: 140,
  tail: 140,
  wide: 140,
  widetail: 140,
};
/** A window name's band at the top of a detail, and a dimension label's band under the board. */
const NAME_BAND = 3 + GUIDE_TEXT_UNITS_MAX + 2;
const DIM_BAND = 6 + GUIDE_HDIM_LABEL_OFF + GUIDE_TEXT_UNITS_MAX + 2;
/** The room kept right of a drawing for a vertical dimension's label (a 9-character figure at 10 dots on
 * the narrowest card, with its gap). */
const LABEL_GUTTER = 94;

/** The widest the board is between two stations. */
function maxHalf(g: OutlineGeometry, s0: number, s1: number): number {
  let best = Math.max(guideHalfWidthAt(g.points, s0), guideHalfWidthAt(g.points, s1));
  for (const point of g.points) if (point.station >= s0 && point.station <= s1) best = Math.max(best, point.halfWidth);
  return best;
}

/** A card's window along and across the board, wide enough for the board and its push. */
function windowSpec(kind: WindowKind, base: OutlineGeometry, push: OutlineGeometry | null): GuideWindowSpec {
  const f = GUIDE_FRAME.template;
  const L = base.length;
  const boards = push ? [base, push] : [base];
  const reach = (s0: number, s1: number) => Math.max(...boards.map((b) => maxHalf(b, s0, s1)));
  const span = (s0: number, s1: number, beyond: number): GuideWindowSpec => ({ s0, s1, across: reach(s0, s1) + beyond });
  switch (kind) {
    case "whole": {
      const s1 = Math.max(...boards.map((b) => b.length));
      return span(0, s1, 0);
    }
    case "nose":
      return span(L - f.tipSpan, L + f.margin, f.tipAcross);
    case "tail":
      return span(-f.margin, f.tipSpan, f.tailAcross);
    case "wide":
      return span(base.widePointStation - f.wideSpan, base.widePointStation + f.wideSpan, f.wideAcross);
    case "widetail":
      return span(-f.margin, base.widePointStation + f.wideSpan, f.wideAcross);
    case "tailhalf":
      return span(-f.margin, L / 2 + f.halfPast, f.halfAcross);
    case "nosehalf":
      return span(L / 2 - f.halfPast, L + f.margin, f.halfAcross);
  }
}

/** A dimension along the board under it: from station `s0` to `s1`, its label below. */
type AlongDim = { s0: number; s1: number; parts: readonly GuideTextPart[] };

interface FigureOptions {
  base: OutlineGeometry;
  push: OutlineGeometry | null;
  win: WindowKind;
  /** A dimension along the board, under it. */
  along?: AlongDim;
  /** A vertical dimension right of the board: the width at the wide point, or the tail block. */
  across?: { at: "wide" | "block"; parts: readonly GuideTextPart[] };
  /** The centre station, for the Offset card. */
  centre?: boolean;
  /** A figure or a note in the name band's right end, clear of the board. */
  label?: { role: "value" | "note"; parts: readonly GuideTextPart[] };
  /** The fins, for the Lock card. */
  fins?: readonly FinMark[];
}

/** The board from above in a strip, then the window's part of it closer, nose left. */
function templateFigure(opts: FigureOptions): GuideFigure {
  const { base, push } = opts;
  const L = base.length;
  const hw = base.halfWidePointWidth;
  const strip = guideStripFit(L, mm(2 * hw), STRIP_H);
  const box = guideDetailBox(STRIP_H, DETAIL_H[opts.win]);
  const win = windowSpec(opts.win, base, push);
  const gutter = opts.across ? LABEL_GUTTER : 6;
  const band: GuideBox = { x: box.x + 6, y: box.y, w: box.w - 6 - gutter, h: box.h };
  const { map, rect } = guideWindowFit(win, strip, band, {
    stripHeight: STRIP_H,
    top: NAME_BAND,
    bottom: opts.along ? DIM_BAND : 7,
  });
  // The whole board is fitted with its tail at the band's right edge, so a longer push grows toward the
  // nose, as it does on the board.
  const detail: GuideMap = opts.win === "whole" ? { ...map, ox: map.ox + (band.x + band.w - guideX(map, 0)) } : map;
  const boards = push ? [base, push] : [base];
  const inWindow = (s: number) => s > win.s0 && s < win.s1;

  const stripPrims: GuidePrim[] = [...guidePlanPrims(base, strip), { kind: "rect", role: "window", ...rect }];
  const prims: GuidePrim[] = [...guidePlanPrims(base, detail, "board", 6)];
  // The 12" stations from each end and the wide point, as the VIEWER draws them.
  for (const s of [MEASURE_STATION_MM, L - MEASURE_STATION_MM]) {
    if (!inWindow(s)) continue;
    const half = guideHalfWidthAt(base.points, s);
    const x = guideX(detail, s);
    prims.push({ kind: "line", role: "station", x1: x, y1: guideY(detail, -half) - 4, x2: x, y2: guideY(detail, half) + 4 });
  }
  if (inWindow(base.widePointStation)) {
    const x = guideX(detail, base.widePointStation);
    prims.push({ kind: "line", role: "widepoint", x1: x, y1: guideY(detail, -hw) - 4, x2: x, y2: guideY(detail, hw) + 4 });
  }
  if (opts.centre) {
    const half = guideHalfWidthAt(base.points, L / 2);
    const x = guideX(detail, L / 2);
    prims.push({ kind: "line", role: "station", x1: x, y1: guideY(detail, -half) - 4, x2: x, y2: guideY(detail, half) + 4 });
  }
  for (const fin of opts.fins ?? []) {
    if (!inWindow(fin.offTail)) continue;
    const x = guideX(detail, fin.offTail);
    const y = guideY(detail, fin.lateral);
    prims.push({ kind: "line", role: "fin", x1: x, y1: y, x2: guideX(detail, fin.leadingOffTail), y2: guideY(detail, fin.leadingLateral) });
    prims.push({ kind: "dot", role: "finDot", x, y, r: 2 });
  }
  if (push) prims.push(...guidePlanPrims(push, detail, "push"));

  if (opts.along) {
    const { s0, s1, parts } = opts.along;
    const lo = Math.min(s0, s1);
    const hi = Math.max(s0, s1);
    const y = guideY(detail, Math.max(...boards.map((b) => maxHalf(b, lo, hi)))) + 6;
    prims.push(guideHDim(guideX(detail, s0), guideX(detail, s1), y, parts, false));
  }
  // A vertical dimension stands just beyond the tail's last point (a diamond's point is behind its corners),
  // off the board, its label in the gutter kept for it.
  const beyondTail = guideX(detail, Math.min(0, base.points[0].station, base.centreCloseStation)) + 8;
  if (opts.across) {
    if (opts.across.at === "wide") {
      const x = beyondTail;
      const xWide = guideX(detail, base.widePointStation);
      const yTop = guideY(detail, -hw);
      const yBot = guideY(detail, hw);
      prims.push({ kind: "line", role: "extension", x1: xWide, y1: yTop, x2: x + 3, y2: yTop });
      prims.push({ kind: "line", role: "extension", x1: xWide, y1: yBot, x2: x + 3, y2: yBot });
      prims.push(guideVDim(x, yTop, yBot, opts.across.parts));
    } else {
      const corner = base.points[0].station;
      const x = beyondTail;
      const hb = base.halfTailBlockWidth;
      const yTop = guideY(detail, -hb);
      const yBot = guideY(detail, hb);
      const xCorner = guideX(detail, corner);
      if (Math.abs(xCorner - x) > 9) {
        prims.push({ kind: "line", role: "extension", x1: xCorner, y1: yTop, x2: x + 3, y2: yTop });
        prims.push({ kind: "line", role: "extension", x1: xCorner, y1: yBot, x2: x + 3, y2: yBot });
      }
      prims.push(guideVDim(x, yTop, yBot, opts.across.parts));
    }
  }
  if (opts.label) {
    prims.push({ kind: "text", role: opts.label.role, x: box.x + box.w - 4, y: box.y + 3, dy: 0.85, parts: opts.label.parts, anchor: "end" });
  }
  prims.push(guideWindowName(box, [guideText(WINDOW_NAMES[opts.win])]));
  return { height: STRIP_H + 6 + DETAIL_H[opts.win], strip: stripPrims, windows: [{ box, prims }] };
}

/* ============ the cards ============ */

const valueTag = (text: string): GuideTag => ({ kind: "value", text });
const naTag = (text: string): GuideTag => ({ kind: "na", text });
const ON_THIS_BOARD: GuideTag = { kind: "on", text: "On this board" };

/** A degree or a percentage as a pushed figure: the sidebar's own number, clear of float dust. */
const plain = formatControlNumber;

function dashed(...parts: GuideTextPart[]): GuideCaption {
  return { kind: "dashed", parts };
}

/** The tail's depth as the board draws it: the cut from the tail's corners or tips to where it closes. */
function cutDepth(g: OutlineGeometry): Mm {
  return mm(Math.abs(g.centreCloseStation - g.points[0].station));
}

/** TEMPLATE's 22 cards for the open board, in the words page's order. */
export function buildTemplateGuide(input: TemplateGuideInput, system: UnitsSystem): GuidePageBuild {
  const o = input.outline;
  const g = input.outlineGeometry;
  const variants = templateGuideVariants(input, system);
  const built = new Map<OutlineSpec, OutlineGeometry>([[o, g]]);
  const geometry = (spec: OutlineSpec) => {
    let out = built.get(spec);
    if (!out) {
      out = buildOutline(spec);
      built.set(spec, out);
    }
    return out;
  };
  const boards = (cardId: string) => {
    const v = variants[cardId];
    return { base: geometry(v.base), push: v.push ? geometry(v.push) : null, spec: v.push };
  };
  const cards: GuideCardModel[] = [];
  const card = (cardId: string, tag: GuideTag, caption: GuideCaption, figure: GuideFigure) => {
    // D-26: a card never says "dashed" with nothing dashed.
    cards.push({ id: cardId, tag, caption: variants[cardId].push ? caption : GUIDE_NO_CAPTION, figure });
  };
  const fig = (cardId: string, win: WindowKind, extra: Omit<FigureOptions, "base" | "push" | "win"> = {}) => {
    const b = boards(cardId);
    return templateFigure({ base: b.base, push: b.push, win, ...extra });
  };
  const pushOf = (cardId: string) => variants[cardId].push;

  // Board Length.
  card(
    ids.boardLength,
    valueTag(formatLength(o.length, system)),
    dashed(guideFigure(formatLength(pushOf(ids.boardLength)?.length ?? o.length, system))),
    fig(ids.boardLength, "whole", { along: { s0: 0, s1: g.length, parts: [guideFigure(formatLength(g.length, system))] } }),
  );

  // Nose Controls.
  card(
    ids.noseAngle,
    valueTag(`${plain(o.noseAngle)}°`),
    dashed(guideFigure(`${plain(pushOf(ids.noseAngle)?.noseAngle ?? o.noseAngle)}°`)),
    fig(ids.noseAngle, "nose", { label: { role: "value", parts: [guideFigure(`${plain(o.noseAngle)}°`)] } }),
  );
  card(
    ids.noseFullness,
    valueTag(`${plain(o.noseFullness)}%`),
    dashed(guideFigure(`${plain(pushOf(ids.noseFullness)?.noseFullness ?? o.noseFullness)}%`), guideText(" full")),
    fig(ids.noseFullness, "nose", { label: { role: "value", parts: [guideFigure(`${plain(o.noseFullness)}%`), guideText(" full")] } }),
  );

  // Widepoint Controls.
  card(
    ids.width,
    valueTag(formatDim(o.widePointWidth, system)),
    dashed(guideFigure(formatDim(pushOf(ids.width)?.widePointWidth ?? o.widePointWidth, system)), guideText(" wide")),
    fig(ids.width, "widetail", { across: { at: "wide", parts: [guideFigure(formatDim(mm(2 * g.halfWidePointWidth), system))] } }),
  );
  card(
    ids.offset,
    valueTag(formatSignedDim(o.widePointOffset, system)),
    dashed(guideFigure(formatSignedDim(pushOf(ids.offset)?.widePointOffset ?? o.widePointOffset, system))),
    fig(ids.offset, "wide", {
      centre: true,
      along: { s0: g.length / 2, s1: g.widePointStation, parts: [guideFigure(formatSignedDim(o.widePointOffset, system))] },
    }),
  );
  card(
    ids.tailRail,
    valueTag(`${plain(o.tailRailLength)}%`),
    dashed(guideFigure(`${plain(pushOf(ids.tailRail)?.tailRailLength ?? o.tailRailLength)}%`), guideText(" long")),
    fig(ids.tailRail, "tailhalf", { label: { role: "value", parts: [guideText("Tail Rail "), guideFigure(`${plain(o.tailRailLength)}%`)] } }),
  );
  card(
    ids.noseRail,
    valueTag(`${plain(o.noseRailLength)}%`),
    dashed(guideFigure(`${plain(pushOf(ids.noseRail)?.noseRailLength ?? o.noseRailLength)}%`), guideText(" long")),
    fig(ids.noseRail, "nosehalf", { label: { role: "value", parts: [guideText("Nose Rail "), guideFigure(`${plain(o.noseRailLength)}%`)] } }),
  );

  // Tail Controls: the five tails, each on this board.
  const blockDim = (b: OutlineGeometry) =>
    b.tailBlockPinned || b.halfTailBlockWidth <= 0
      ? {}
      : { across: { at: "block" as const, parts: [guideFigure(formatDim(mm(2 * b.halfTailBlockWidth), system))] } };
  for (const kind of TAIL_KINDS) {
    const cardId = TAIL_CARD[kind];
    card(cardId, o.tail.kind === kind ? ON_THIS_BOARD : GUIDE_NO_TAG, GUIDE_NO_CAPTION, fig(cardId, "tail", blockDim(boards(cardId).base)));
  }

  // Tail Block: `—` on a pin or round tail, the board drawn as it is.
  const tail = o.tail;
  const blockPinned = g.tailBlockPinned || tail.kind === "pin" || tail.kind === "round";
  const blockPush = pushOf(ids.tailBlock)?.tail;
  card(
    ids.tailBlock,
    blockPinned ? naTag("—") : valueTag(formatDim(tail.endWidth, system)),
    blockPush && blockPush.kind !== "pin" && blockPush.kind !== "round"
      ? dashed(guideFigure(formatDim(blockPush.endWidth, system)), guideText(" block"))
      : GUIDE_NO_CAPTION,
    fig(ids.tailBlock, "tail", blockDim(g)),
  );

  // Depth: a diamond's or a swallow's alone (D-11).
  const depthBoards = boards(ids.tailDepth);
  if (tail.kind === "diamond" || tail.kind === "swallow") {
    const own = tail.kind === "diamond" ? g.effectiveDiamondDepth : tail.crotchDepth;
    const pushedDepth = depthBoards.push
      ? tail.kind === "diamond"
        ? depthBoards.push.effectiveDiamondDepth
        : (depthBoards.spec!.tail as Extract<TailShape, { kind: "swallow" }>).crotchDepth
      : own;
    card(
      ids.tailDepth,
      valueTag(formatMark(own, system)),
      dashed(guideFigure(formatMark(pushedDepth, system)), guideText(" deep")),
      fig(ids.tailDepth, "tail", {
        along: { s0: g.points[0].station, s1: g.centreCloseStation, parts: [guideFigure(formatMark(cutDepth(g), system))] },
      }),
    );
  } else {
    const swallow = TAIL_PRESETS.swallow.tail as Extract<TailShape, { kind: "swallow" }>;
    const ghost = depthBoards.push!;
    card(
      ids.tailDepth,
      naTag("Diamond & swallow only"),
      dashed(guideText("as a swallow, "), guideFigure(formatMark(swallow.crotchDepth, system)), guideText(" deep")),
      fig(ids.tailDepth, "tail", {
        along: { s0: ghost.points[0].station, s1: ghost.centreCloseStation, parts: [guideFigure(formatMark(swallow.crotchDepth, system))] },
        label: { role: "note", parts: [guideText(`no depth on a ${tail.kind} tail`)] },
      }),
    );
  }

  // Tail Angle: `—` on a diamond, the board drawn as it is.
  card(
    ids.tailAngle,
    g.tailAnglePinned ? naTag("—") : valueTag(`${plain(o.tailAngle)}°`),
    dashed(guideFigure(`${plain(pushOf(ids.tailAngle)?.tailAngle ?? o.tailAngle)}°`)),
    fig(ids.tailAngle, "tail", g.tailAnglePinned ? {} : { label: { role: "value", parts: [guideFigure(`${plain(o.tailAngle)}°`)] } }),
  );
  card(
    ids.tailFullness,
    valueTag(`${plain(o.tailFullness)}%`),
    dashed(guideFigure(`${plain(pushOf(ids.tailFullness)?.tailFullness ?? o.tailFullness)}%`), guideText(" full")),
    fig(ids.tailFullness, "tail", { label: { role: "value", parts: [guideFigure(`${plain(o.tailFullness)}%`), guideText(" full")] } }),
  );

  // Wings: the board with the wing "+ Add a wing" would add first, or its own wing 1.
  const wingCount = (o.wings ?? []).length;
  const added = boards(ids.addWing).push;
  const newWing = added?.wings?.[added.wings.length - 1];
  card(
    ids.addWing,
    wingCount === 0 ? naTag("None yet") : valueTag(wingCount === 1 ? "1 wing" : `${wingCount} wings`),
    newWing
      ? dashed(guideText("a "), guideFigure(formatMark(newWing.depth, system)), guideText(" wing at "), guideFigure(formatDim(newWing.station, system)))
      : GUIDE_NO_CAPTION,
    fig(ids.addWing, "tail"),
  );

  // Wing 1 as the board draws it (placed: every station inside its limits).
  const w = boards(ids.wingPosition).base.wings![0];
  const pushedWing = (cardId: string) => {
    const b = boards(cardId).push;
    return b?.wings?.[0] ?? null;
  };
  const position = pushedWing(ids.wingPosition);
  card(
    ids.wingPosition,
    valueTag(formatDim(w.station, system)),
    position ? dashed(guideFigure(formatDim(position.station, system)), guideText(" from the tail")) : GUIDE_NO_CAPTION,
    fig(ids.wingPosition, "tail", { along: { s0: 0, s1: w.station, parts: [guideFigure(formatDim(w.station, system))] } }),
  );
  const deeper = pushedWing(ids.wingDepth);
  card(
    ids.wingDepth,
    valueTag(formatMark(w.depth, system)),
    deeper ? dashed(guideFigure(formatMark(deeper.depth, system)), guideText(" deep")) : GUIDE_NO_CAPTION,
    fig(ids.wingDepth, "tail", { label: { role: "value", parts: [guideFigure(formatMark(w.depth, system)), guideText(" deep")] } }),
  );
  const longer = pushedWing(ids.wingRun);
  const footprint = wingFootprint(w);
  card(
    ids.wingRun,
    valueTag(formatMark(w.run, system)),
    longer ? dashed(guideFigure(formatMark(longer.run, system)), guideText(" run")) : GUIDE_NO_CAPTION,
    fig(ids.wingRun, "tail", { along: { s0: footprint.stepStart, s1: w.station, parts: [guideFigure(formatMark(w.run, system))] } }),
  );
  const rounder = pushedWing(ids.wingRadius);
  card(
    ids.wingRadius,
    valueTag(formatMark(effectiveWingRadius(w), system)),
    rounder ? dashed(guideFigure(formatMark(effectiveWingRadius(rounder), system)), guideText(" radius")) : GUIDE_NO_CAPTION,
    fig(ids.wingRadius, "tail", {
      label: { role: "value", parts: [guideFigure(formatMark(effectiveWingRadius(w), system)), guideText(" radius")] },
    }),
  );
  const locked = wingLockEdge(w, 0, input.wingFinEdges) !== null;
  const offset = pushedWing(ids.wingLock);
  card(
    ids.wingLock,
    locked ? { kind: "on", text: "Locked" } : valueTag("Free"),
    offset ? dashed(guideFigure(formatSignedMark(offset.finOffset, system)), guideText(" from the fin")) : GUIDE_NO_CAPTION,
    fig(ids.wingLock, "tail", {
      fins: input.finMarks,
      ...(locked ? { label: { role: "value" as const, parts: [guideFigure(formatSignedMark(w.finOffset, system)), guideText(" from the fin")] } } : {}),
    }),
  );

  return new Map(cards.map((c) => [c.id, c]));
}
