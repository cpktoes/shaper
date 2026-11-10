/**
 * FINS' GUIDE cards, worked out from the open board's fins, setup by setup (Phase 18, D-04, D-05, D-07, D-08,
 * D-12, D-13, D-16, D-24; UI-SPEC §4 and §5).
 *
 * The page runs Inputs, the trailing-edge Convention, then one group per fin setup in the sidebar's order —
 * the setup's own card first, then its templates or models — then the four Advanced settings. Every setup
 * and model card is the open board's fins with only that setup and its model or template picked and the
 * advanced settings reset the way the sidebar resets them (`resetAdvanced`), worked out by
 * `computeFinPlacement` on the board's own tail. Its caption names what it draws by the result's own
 * header, so McKee Longboard on a board under eight feet says it is drawn as McKee SB/Gun, which is what
 * the maths falls back to. The four Advanced cards push the forward fins' setting (the rear pair and the
 * center fin get the same push) and draw the pushed fins in muted dashes over the board's own.
 *
 * Every drawing is the board in a strip with the tail's last 24" (60 cm in Metric) framed, then that tail
 * again from above, the fins as lines from trailing edge to leading edge with the VIEWER's dots. A fin's
 * `lateral` and `leadingLateral` are already signed by its side, so they are drawn as stored, never
 * multiplied by `side`. Every figure on a card is a mark printed through `formatMark`, and every label sits
 * in a row above or below the tail, never on the board, never on another label (D-08).
 *
 * Pure; no React, browser or database (CLAUDE.md Rule 1). Every inch figure comes from `guidePush`,
 * `GUIDE_FRAME` and `guideFrame`.
 */
import type { Point2D } from "./board";
import {
  computeFinPlacement,
  FIN_SETUPS,
  finRoundingGrain,
  isQuadRearModelAvailable,
  MIN_MCKEE_LONGBOARD_QUAD_LENGTH,
  QUAD_REAR_MODELS,
  resetAdvanced,
  tailOutlineHalfPoints,
  THRUSTER_FRONT_MODELS,
  TWIN_TEMPLATES,
  type FinAdvancedSpec,
  type FinMark,
  type FinPlacementResult,
  type FinPlacementSpec,
  type FinSetup,
  type ImportedFinTail,
  type QuadRearModel,
  type ThrusterFrontModel,
  type TwinTemplate,
} from "./fins";
import {
  GUIDE_MIN_FIT,
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
  guideLabelHull,
  guidePlanPrims,
  guideStripFit,
  guideStrokeMeetsBox,
  guideStrokes,
  guideTextBox,
  guideWindowFit,
  guideWindowName,
  guideX,
  guideY,
  GUIDE_HDIM_LABEL_OFF,
  GUIDE_TEXT_UNITS_MAX,
  type GuideMap,
  type GuideStroke,
} from "./guide-draw";
import { GUIDE_FRAME, guideFrame, guidePush } from "./guide-push";
import { formatDim, formatLength, formatMark } from "./measure-display";
import type { OutlineGeometry } from "./outline";
import { mm, type UnitsSystem } from "./units";

// ---- The cards ---------------------------------------------------------------------------------------

/** The page's eight groups, as the words page names them. */
const INPUTS = "Inputs";
const CONVENTION = "Convention";
const ADVANCED = "Advanced";
const setupLabel = (setup: FinSetup) => FIN_SETUPS.find((s) => s.value === setup)!.label;
const twinLabel = (t: TwinTemplate) => TWIN_TEMPLATES.find((o) => o.value === t)!.label;
const frontLabel = (m: ThrusterFrontModel) => THRUSTER_FRONT_MODELS.find((o) => o.value === m)!.label;
const rearLabel = (m: QuadRearModel) => QUAD_REAR_MODELS.find((o) => o.value === m)!.label;
const setupId = (setup: FinSetup) => guideCardId("fins", setupLabel(setup), setupLabel(setup));

/** FINS' 23 cards, in the words page's order. Every setup and model name is the app's own label. */
export const FINS_GUIDE_CARD_IDS = {
  importDesignedBoard: guideCardId("fins", INPUTS, "Import Designed Board"),
  convention: guideCardId("fins", CONVENTION, "Trailing-edge convention"),
  single: setupId("single"),
  twin: setupId("twin"),
  twinUpright: guideCardId("fins", setupLabel("twin"), twinLabel("upright")),
  twinKeel: guideCardId("fins", setupLabel("twin"), twinLabel("keel")),
  twinTrailer: guideCardId("fins", setupLabel("twin"), twinLabel("trailer")),
  thruster: setupId("thruster"),
  thrusterProportional: guideCardId("fins", setupLabel("thruster"), frontLabel("proportional")),
  thrusterBasic: guideCardId("fins", setupLabel("thruster"), frontLabel("basic")),
  thrusterMcKeeSB: guideCardId("fins", setupLabel("thruster"), frontLabel("mckeeSB")),
  thrusterMcKeeGun: guideCardId("fins", setupLabel("thruster"), frontLabel("mckeeGun")),
  twoPlusOne: setupId("2plus1"),
  quad: setupId("quad"),
  quadBasic: guideCardId("fins", setupLabel("quad"), rearLabel("basic")),
  quadBasicOffRail: guideCardId("fins", setupLabel("quad"), rearLabel("basicOffRail")),
  quadMcKeeSB: guideCardId("fins", setupLabel("quad"), rearLabel("mckeeSB")),
  quadMcKeeLB: guideCardId("fins", setupLabel("quad"), rearLabel("mckeeLB")),
  quadCenter: guideCardId("fins", setupLabel("quad"), "Add 5th/Center fin"),
  finBase: guideCardId("fins", ADVANCED, "Fin Base Length"),
  finForward: guideCardId("fins", ADVANCED, "Aft/Forward position"),
  finOffRail: guideCardId("fins", ADVANCED, "Off-Rail"),
  finToe: guideCardId("fins", ADVANCED, "Toe-In"),
} as const;

/** The 23 ids in order. */
export const FINS_GUIDE_CARD_ORDER: readonly string[] = Object.values(FINS_GUIDE_CARD_IDS);

/** How many cards each of the eight groups holds: Inputs, Convention, Single Fin, Twin, Thruster, 2+1, Quad,
 * Advanced. */
export const FINS_GUIDE_GROUP_SIZES: readonly number[] = [
  1,
  1,
  1,
  1 + TWIN_TEMPLATES.length,
  1 + THRUSTER_FRONT_MODELS.length,
  1,
  1 + QUAD_REAR_MODELS.length + 1,
  4,
];

const ids = FINS_GUIDE_CARD_IDS;

/** The advanced fields each pushed card changes: the forward fins', and the rear pair's and the center
 * fin's the same. */
export const FINS_GUIDE_PUSH_FIELDS: Readonly<Record<string, readonly (keyof FinAdvancedSpec)[]>> = {
  [ids.finBase]: [
    "baseLenForward",
    "baseLenForwardOverridden",
    "baseLenCenter",
    "baseLenCenterOverridden",
    "baseLenRear",
    "baseLenRearOverridden",
  ],
  [ids.finForward]: ["forwardPositionOffset", "centerPositionOffset", "rearPositionOffset"],
  [ids.finOffRail]: ["forwardOffRailNudge", "rearOffRailNudge"],
  [ids.finToe]: ["forwardToeOverride", "rearToeOverride"],
};

/** What FINS' GUIDE reads from the design store — the store's own objects, read only. */
export interface FinsGuideInput {
  /** The fins the page places: the stored fins, the board's length, tail and 12" width while importing. */
  effectiveFins: FinPlacementSpec;
  /** The real tail the fin maths read while importing; `null` for the standalone calculator. */
  finImportedTail: ImportedFinTail | null;
  /** The board's own fins, as VIEWER and DATA show them. */
  finPlacement: FinPlacementResult;
  /** The tail FINS draws while importing (the rounded board), `null` for the generic tail curve. */
  finTailOutline: { points: Point2D[]; connector: Point2D | null } | null;
  /** The board from above, for the strip. */
  outlineGeometry: OutlineGeometry;
  /** Whether Import Designed Board is ticked. */
  finsImportTemplate: boolean;
}

/** The Convention card's tag: the grain every fin number prints to — `to 1/16"`, or `to 1 mm` in Metric
 * (D-24), the one grain `finRoundingGrain` names as a word. */
export function guideFinGrainTag(system: UnitsSystem): string {
  return system === "metric" ? "to 1 mm" : `to ${finRoundingGrain(system)}`;
}

/** A setup picked as the sidebar picks it: the setup, its model or template, the advanced reset. */
function withSetup(base: FinPlacementSpec, setup: FinSetup, patch: Partial<FinPlacementSpec> = {}): FinPlacementSpec {
  const spec = { ...base, ...patch, finSetup: setup };
  return { ...spec, advanced: resetAdvanced(setup, spec.twinTemplate) };
}

/** The forward fins the Advanced cards read: the front pair's lower fin, else the center fin. */
function forwardMark(marks: readonly FinMark[]): FinMark | undefined {
  return marks.find((m) => m.role === "front" && m.side === 1) ?? marks.find((m) => m.role === "front") ?? marks.find((m) => m.role === "center");
}
const hasRailFins = (marks: readonly FinMark[]) => marks.some((m) => m.role === "front" || m.role === "rear");

/**
 * Each card's spec: a setup or model card's board with that setup or model picked, an Advanced card's
 * board with its push, and `null` for the two cards that draw the board's own fins (Import Designed Board
 * and the Convention) — and for Off-Rail and Toe-In on a board with no rail fins, which push nothing.
 */
export function finsGuideVariants(input: FinsGuideInput, system: UnitsSystem): Record<string, FinPlacementSpec | null> {
  const base = input.effectiveFins;
  const push = guidePush(system).fins;
  const adv = base.advanced;
  const railFins = hasRailFins(input.finPlacement.marks);
  const advanced = (patch: Partial<FinAdvancedSpec>): FinPlacementSpec => ({ ...base, advanced: { ...adv, ...patch } });
  return {
    [ids.importDesignedBoard]: null,
    [ids.convention]: null,
    [ids.single]: withSetup(base, "single"),
    [ids.twin]: withSetup(base, "twin"),
    [ids.twinUpright]: withSetup(base, "twin", { twinTemplate: "upright" }),
    [ids.twinKeel]: withSetup(base, "twin", { twinTemplate: "keel" }),
    [ids.twinTrailer]: withSetup(base, "twin", { twinTemplate: "trailer" }),
    [ids.thruster]: withSetup(base, "thruster"),
    [ids.thrusterProportional]: withSetup(base, "thruster", { frontModel: "proportional" }),
    [ids.thrusterBasic]: withSetup(base, "thruster", { frontModel: "basic" }),
    [ids.thrusterMcKeeSB]: withSetup(base, "thruster", { frontModel: "mckeeSB" }),
    [ids.thrusterMcKeeGun]: withSetup(base, "thruster", { frontModel: "mckeeGun" }),
    [ids.twoPlusOne]: withSetup(base, "2plus1"),
    [ids.quad]: withSetup(base, "quad"),
    [ids.quadBasic]: withSetup(base, "quad", { quadRearModel: "basic", quadCenterFinOn: false }),
    [ids.quadBasicOffRail]: withSetup(base, "quad", { quadRearModel: "basicOffRail", quadCenterFinOn: false }),
    [ids.quadMcKeeSB]: withSetup(base, "quad", { quadRearModel: "mckeeSB", quadCenterFinOn: false }),
    [ids.quadMcKeeLB]: withSetup(base, "quad", { quadRearModel: "mckeeLB", quadCenterFinOn: false }),
    // The fifth box is not offered with McKee Longboard's rears, so a board on them shows it behind the
    // neighbouring McKee SB/Gun rears, the model the app falls back to.
    [ids.quadCenter]: withSetup(base, "quad", {
      quadRearModel: base.quadRearModel === "mckeeLB" ? "mckeeSB" : base.quadRearModel,
      quadCenterFinOn: true,
    }),
    [ids.finBase]: advanced({
      baseLenForward: mm(adv.baseLenForward + push.finBase),
      baseLenForwardOverridden: true,
      baseLenCenter: mm(adv.baseLenCenter + push.finBase),
      baseLenCenterOverridden: true,
      baseLenRear: mm(adv.baseLenRear + push.finBase),
      baseLenRearOverridden: true,
    }),
    [ids.finForward]: advanced({
      forwardPositionOffset: mm(adv.forwardPositionOffset + push.finForward),
      centerPositionOffset: mm(adv.centerPositionOffset + push.finForward),
      rearPositionOffset: mm(adv.rearPositionOffset + push.finForward),
    }),
    [ids.finOffRail]: railFins
      ? advanced({
          forwardOffRailNudge: mm(adv.forwardOffRailNudge + push.finOffRail),
          rearOffRailNudge: mm(adv.rearOffRailNudge + push.finOffRail),
        })
      : null,
    [ids.finToe]: railFins ? advanced({ forwardToeOverride: mm(push.finToe), rearToeOverride: mm(push.finToe) }) : null,
  };
}

// ---- The drawing -------------------------------------------------------------------------------------

/** Strip and detail heights (UI-SPEC §4: FINS strip 60, detail 170, 236 in all). */
const STRIP_H = 60;
const DETAIL_H = 170;
const FIGURE_H = STRIP_H + 6 + DETAIL_H;
/** The window name's band at the top of the detail, and one row of labels above or below the tail. */
const NAME_BAND = 3 + GUIDE_TEXT_UNITS_MAX + 2;
const ROW = GUIDE_TEXT_UNITS_MAX + 4 + GUIDE_HDIM_LABEL_OFF;
const BOTTOM_PAD = 2;
/** How far inside the detail's sides a label is kept, and the gap kept between two labels in a row. */
const SIDE_PAD = 3;
const LABEL_GAP = 6;
/** The share of the detail's spare width kept tail-ward of the tail tip, for labels running past it. */
const TAIL_SHARES: readonly number[] = Array.from({ length: 21 }, (_, i) => i / 20).sort((a, b) => Math.abs(a - 0.5) - Math.abs(b - 0.5) || a - b);
/** The least spare width kept, so a narrow board's labels still have somewhere to go. */
const MIN_SPARE = 70;
/** The VIEWER's fin dots, at the card's scale. */
const DOT_R = 2;
/** The furthest row a label is ever sent to (counted from 0). */
const MAX_ROWS = 6;

/** The tail FINS draws: the store's (the rounded board) while importing, the generic tail curve else. */
function drawnTail(input: FinsGuideInput): { points: Point2D[]; connector: Point2D | null } {
  return input.finTailOutline ?? tailOutlineHalfPoints(input.effectiveFins.tailShape, input.effectiveFins.tailWidth12);
}

/** The drawn tail's half width at a station, straight between its points (`x` half width, `y` station). */
function halfAt(points: readonly Point2D[], station: number): number {
  if (points.length === 0) return 0;
  if (station <= points[0].y) return points[0].x;
  for (let j = 1; j < points.length; j++) {
    if (points[j].y >= station) {
      const a = points[j - 1];
      const b = points[j];
      const run = b.y - a.y || 1;
      return a.x + (b.x - a.x) * ((station - a.y) / run);
    }
  }
  return points[points.length - 1].x;
}

/** The drawn tail cut at the window's end. */
function trimmedTail(points: readonly Point2D[], end: number): Point2D[] {
  const out = points.filter((p) => p.y <= end);
  if (out.length < points.length && (out.length === 0 || out[out.length - 1].y < end)) out.push({ x: mm(halfAt(points, end)), y: mm(end) });
  return out;
}

/** The detail's map: `x = ox − s·k` along the board from the tail tip, `y = oy + lateral·k` across it (a
 * left fin's negative lateral draws above the stringer), the half width of the band the tail fills, and the
 * rows of labels it keeps room for above and below that band. */
export type FinsDetailMap = GuideMap & { bandHalf: number; rowsUp: number; rowsDown: number };

function detailMapFor(input: FinsGuideInput, system: UnitsSystem, rowsUp: number, rowsDown: number, share: number): FinsDetailMap {
  const box = guideDetailBox(STRIP_H, DETAIL_H);
  const end = guideFrame(system).finsTailWindow;
  const tail = trimmedTail(drawnTail(input).points, end);
  const bandHalf = Math.max(1, ...tail.map((p) => p.x));
  const top = box.y + NAME_BAND + rowsUp * ROW;
  const bottom = box.y + box.h - BOTTOM_PAD - rowsDown * ROW;
  const span = end + GUIDE_FRAME.fins.tailMargin;
  const k = Math.min((bottom - top) / (2 * bandHalf), (box.w - MIN_SPARE) / span);
  const spare = box.w - span * k;
  const ox = box.x + box.w - spare * share - GUIDE_FRAME.fins.tailMargin * k;
  return { k, kx: -k, ky: k, ox, oy: (top + bottom) / 2, bandHalf, rowsUp, rowsDown };
}

/** Which dimensions a card draws on its board's fins (D-08). */
type FinDim = "offTail" | "rearOffTail" | "centerOffTail" | "offRail" | "toe" | "base";

/** A label waiting for a row: above or below the tail, its words, where along it would like to sit, and the
 * prims it brings once its row is known. */
type Want = {
  side: "up" | "down";
  parts: readonly GuideTextPart[];
  options: readonly { anchor: "start" | "middle" | "end"; x: number }[];
  /** The stretch along the row the label has to stay beside: its dimension's own span, or its leader. */
  near: readonly [number, number];
  make: (label: { lx: number; ly: number; dy: number; anchor: "start" | "middle" | "end"; rowEdge: number }) => GuidePrim[];
};

/** A label's width at the narrowest card, where it is widest. */
function widthOf(parts: readonly GuideTextPart[]): number {
  const box = guideTextBox({ kind: "text", role: "value", x: 0, y: 0, parts, anchor: "start" }, GUIDE_MIN_FIT);
  return box ? box.w : 0;
}

function spanOf(anchor: "start" | "middle" | "end", x: number, w: number): [number, number] {
  return anchor === "start" ? [x, x + w] : anchor === "end" ? [x - w, x] : [x - w / 2, x + w / 2];
}

/** The clear space kept between a label and any line that is not its own dimension's. */
const LINE_GAP = 1;

/** How far a label may sit from what it measures and still read as its label, and the step it is slid by
 * when it looks for a free place in a row. */
const NEAR = 4;
const SLIDE_STEP = 4;

/**
 * Where along a row a label may sit, best first: the places its dimension asks for (slid inside the detail
 * where one runs past its side), then every place in the row that still touches what it measures, nearest
 * its first choice first. A label right of what it measures is anchored at its start and one left of it at
 * its end, so a smaller text closes in on the dimension.
 */
function placesFor(want: Want, lo: number, hi: number): { anchor: "start" | "middle" | "end"; l: number; rr: number }[] {
  const w = widthOf(want.parts);
  const asked = want.options.map((option) => {
    let [l, rr] = spanOf(option.anchor, option.x, w);
    if (l < lo) [l, rr] = [lo, lo + w];
    if (rr > hi) [l, rr] = [hi - w, hi];
    return { anchor: option.anchor, l, rr };
  });
  const [n0, n1] = want.near;
  const first = asked.length > 0 ? (asked[0].l + asked[0].rr) / 2 : (n0 + n1) / 2;
  const slid: { anchor: "start" | "middle" | "end"; l: number; rr: number }[] = [];
  const lefts: number[] = [];
  for (let l = lo; l + w < hi; l += SLIDE_STEP) lefts.push(l);
  if (hi - w >= lo) lefts.push(hi - w);
  for (const l of lefts) {
    const rr = l + w;
    if (rr < n0 - NEAR || l > n1 + NEAR) continue;
    slid.push({ anchor: (l + rr) / 2 < (n0 + n1) / 2 ? "end" : "start", l, rr });
  }
  slid.sort((a, b) => Math.abs((a.l + a.rr) / 2 - first) - Math.abs((b.l + b.rr) / 2 - first));
  return [...asked, ...slid];
}

type PlacedSide = { prims: GuidePrim[]; rows: number; clean: boolean };

/**
 * Places one side's labels in the order given, each in the first row where one of its places fits inside
 * the detail, clear of the labels already there, and where nothing drawn lies on a label: not this
 * dimension's own ticks, not a leader on its way to a row further out, not a line placed before it.
 * With a `cap`, a label that finds no such place inside that many rows fails the whole order (`null`).
 * Without one, a label no row can keep clear of every line takes the first row it merely fits.
 */
function placeInOrder(wants: readonly Want[], side: "up" | "down", box: GuideBox, map: FinsDetailMap, cap: number | null): PlacedSide | null {
  const rows: [number, number][][] = [];
  const prims: GuidePrim[] = [];
  const strokes: GuideStroke[] = [];
  const hulls: GuideBox[] = [];
  const lo = box.x + SIDE_PAD;
  const hi = box.x + box.w - SIDE_PAD;
  const edge0 = side === "down" ? map.oy + map.k * map.bandHalf + 2 : map.oy - map.k * map.bandHalf - 2;
  const out = side === "down" ? 1 : -1;
  const meets = (lines: readonly GuideStroke[], boxes: readonly GuideBox[]) => boxes.some((b) => lines.some((s) => guideStrokeMeetsBox(s, b, LINE_GAP)));
  const tryPlace = (want: Want, strict: boolean): boolean => {
    const places = placesFor(want, lo, hi);
    const last = cap === null ? MAX_ROWS : cap - 1;
    for (let r = 0; r <= last; r++) {
      const row = (rows[r] ??= []);
      for (const { anchor, l, rr } of places) {
        if (row.some(([a, b]) => l < b + LABEL_GAP && a < rr + LABEL_GAP)) continue;
        const lx = anchor === "start" ? l : anchor === "end" ? rr : (l + rr) / 2;
        const rowEdge = edge0 + out * r * ROW;
        const made = want.make({ lx, ly: rowEdge + out * GUIDE_HDIM_LABEL_OFF, dy: side === "down" ? 0.85 : 0, anchor, rowEdge });
        const mine = guideStrokes(made);
        const myHulls = made.flatMap((prim) => guideLabelHull(prim) ?? []);
        if (strict && (meets([...strokes, ...mine], myHulls) || meets(mine, hulls))) continue;
        row.push([l, rr]);
        prims.push(...made);
        strokes.push(...mine);
        hulls.push(...myHulls);
        return true;
      }
    }
    return false;
  };
  let clean = true;
  for (const want of wants) {
    if (tryPlace(want, true)) continue;
    if (cap !== null) return null;
    clean = false;
    if (!tryPlace(want, false)) throw new Error("a FINS label found no row");
  }
  return { prims, rows: rows.reduce((n, row, r) => (row.length > 0 ? r + 1 : n), 0), clean };
}

/** Every order a short list can be taken in, the order given first. */
function orders<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  if (items.length > 4) return [[...items], [...items].reverse()];
  return items.flatMap((item, i) => orders([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

/**
 * Places a card's labels in the rows the map keeps above and below the tail. Which label takes the row
 * nearest the tail decides whose leader passes whose words, so each side tries its labels in every order
 * and keeps the first in which no line lies on a label. `clean` says every label found such a place; where
 * none did, the labels take the rows they merely fit and the rows used may run past the map's.
 */
function placeLabels(wants: readonly Want[], box: GuideBox, map: FinsDetailMap) {
  const side = (which: "up" | "down", cap: number): PlacedSide => {
    const mine = wants.filter((want) => want.side === which);
    for (const order of orders(mine)) {
      const placed = placeInOrder(order, which, box, map, cap);
      if (placed) return placed;
    }
    return placeInOrder(mine, which, box, map, null)!;
  };
  const up = side("up", map.rowsUp);
  const down = side("down", map.rowsDown);
  return { up: up.rows, down: down.rows, clean: up.clean && down.clean, prims: [...up.prims, ...down.prims] };
}

const line = (role: "extension" | "reference", x1: number, y1: number, x2: number, y2: number): GuidePrim => ({ kind: "line", role, x1, y1, x2, y2 });

/** The labels a card's dimensions need, on the board's own fins (D-08): off-tail under the tail at the fin's
 * own station, off-rail beside its trailing edge, toe-in at the upper fin's leading edge against a dashed
 * reference through its trailing edge, the base over the upper fin. */
function dimWants(dims: readonly FinDim[], marks: readonly FinMark[], tail: readonly Point2D[], map: FinsDetailMap, system: UnitsSystem): Want[] {
  const X = (s: number) => guideX(map, s);
  const Y = (a: number) => guideY(map, a);
  const lower = marks.find((m) => m.role === "front" && m.side === 1) ?? marks.find((m) => m.role === "front");
  const upper = marks.find((m) => m.role === "front" && m.side === -1) ?? lower;
  const center = marks.find((m) => m.role === "center");
  const rear = marks.find((m) => m.role === "rear" && m.side === 1) ?? marks.find((m) => m.role === "rear");
  const xTip = X(0);
  const tipHalf = halfAt(tail, 0);
  const wants: Want[] = [];

  const offTail = (m: FinMark, side: "up" | "down", words: (v: string) => string) => {
    const xTe = X(m.offTail);
    const yFin = Y(m.lateral);
    const yTip = Y(side === "down" ? tipHalf : -tipHalf);
    const parts = [guideFigure(words(formatMark(m.offTail, system)))];
    wants.push({
      side,
      parts,
      options: [
        { anchor: "start", x: xTe + 4 },
        { anchor: "middle", x: (xTe + xTip) / 2 },
        { anchor: "end", x: xTip },
      ],
      near: [Math.min(xTe, xTip), Math.max(xTe, xTip)],
      make: (at) => {
        const reach = side === "down" ? 3 : -3;
        return [
          line("extension", xTe, yFin, xTe, at.rowEdge + reach),
          line("extension", xTip, yTip, xTip, at.rowEdge + reach),
          { kind: "dim", x1: xTe, y1: at.rowEdge, x2: xTip, y2: at.rowEdge, parts, lx: at.lx, ly: at.ly, dy: at.dy, anchor: at.anchor },
        ];
      },
    });
  };

  for (const dim of dims) {
    if (dim === "offTail") {
      const m = lower ?? center;
      if (m) offTail(m, "down", (v) => `${v} off tail`);
    } else if (dim === "rearOffTail" && rear) {
      offTail(rear, "down", (v) => `${v} off tail`);
    } else if (dim === "centerOffTail" && center) {
      offTail(center, "up", (v) => `center ${v} off tail`);
    } else if (dim === "offRail" && lower && lower.lateralKind === "rail" && lower.lateralValue !== null) {
      const x = X(lower.offTail);
      const yFin = Y(lower.lateral);
      const yRail = Y(lower.lateral + Math.sign(lower.lateral || 1) * lower.lateralValue);
      const parts = [guideFigure(`${formatMark(lower.lateralValue, system)} off rail`)];
      wants.push({
        side: "down",
        parts,
        options: [
          { anchor: "end", x: x - 4 },
          { anchor: "start", x: x + 4 },
          { anchor: "middle", x },
        ],
        near: [x, x],
        make: (at) => [
          line("extension", x, yRail, x, at.rowEdge + 3),
          { kind: "dim", x1: x, y1: yFin, x2: x, y2: yRail, parts, lx: at.lx, ly: at.ly, dy: at.dy, anchor: at.anchor },
        ],
      });
    } else if (dim === "toe" && upper && upper.toe > 0.5) {
      const xTe = X(upper.offTail);
      const xLe = X(upper.leadingOffTail);
      const yTe = Y(upper.lateral);
      const yLe = Y(upper.leadingLateral);
      const xDim = xLe - 4;
      const parts = [guideFigure(`${formatMark(upper.toe, system)} toe`)];
      wants.push({
        side: "up",
        parts,
        options: [
          { anchor: "end", x: xLe - 8 },
          { anchor: "middle", x: xLe },
          { anchor: "start", x: xLe + 4 },
        ],
        near: [xDim, xDim],
        make: (at) => [
          line("reference", xTe, yTe, xLe - 10, yTe),
          line("extension", xDim, Math.min(yTe, yLe), xDim, at.rowEdge - 3),
          { kind: "dim", x1: xDim, y1: yTe, x2: xDim, y2: yLe, parts, lx: at.lx, ly: at.ly, dy: at.dy, anchor: at.anchor },
        ],
      });
    } else if (dim === "base") {
      const m = upper ?? center;
      if (!m) continue;
      const xTe = X(m.offTail);
      const xLe = X(m.leadingOffTail);
      const parts = [guideFigure(`${formatMark(m.baseLength, system)} base`)];
      wants.push({
        side: "up",
        parts,
        options: [
          { anchor: "middle", x: (xTe + xLe) / 2 },
          { anchor: "start", x: xLe },
          { anchor: "end", x: xTe },
        ],
        near: [Math.min(xTe, xLe), Math.max(xTe, xLe)],
        make: (at) => [
          line("extension", xLe, Y(m.leadingLateral), xLe, at.rowEdge - 3),
          line("extension", xTe, Y(m.lateral), xTe, at.rowEdge - 3),
          { kind: "dim", x1: xLe, y1: at.rowEdge, x2: xTe, y2: at.rowEdge, parts, lx: at.lx, ly: at.ly, dy: at.dy, anchor: at.anchor },
        ],
      });
    }
  }
  return wants;
}

/** The tail from above, open at the window's end the way VIEWER draws it: the upper rail from the window's
 * end to the tail, across it (through a diamond's tip or a swallow's crotch), and back up the lower rail. */
function tailPath(tail: readonly Point2D[], connector: Point2D | null, map: FinsDetailMap): string {
  if (tail.length === 0) return "";
  const f1 = (v: number) => Math.round(v * 10) / 10;
  const at = (s: number, a: number) => `${f1(guideX(map, s))} ${f1(guideY(map, a))}`;
  let d = "";
  for (let j = tail.length - 1; j >= 0; j--) d += `${d ? "L" : "M"}${at(tail[j].y, -tail[j].x)}`;
  if (connector) d += `L${at(connector.y, connector.x)}`;
  for (const p of tail) d += `L${at(p.y, p.x)}`;
  return d;
}

function finPrims(marks: readonly FinMark[], map: GuideMap, role: "fin" | "push", dots: boolean): GuidePrim[] {
  const prims: GuidePrim[] = [];
  for (const m of marks) {
    // `lateral` and `leadingLateral` are signed by the fin's side already (a left fin's are negative).
    const x1 = guideX(map, m.offTail);
    const y1 = guideY(map, m.lateral);
    const x2 = guideX(map, m.leadingOffTail);
    const y2 = guideY(map, m.leadingLateral);
    prims.push({ kind: "line", role, x1, y1, x2, y2 });
    if (dots) {
      prims.push({ kind: "dot", role: "finDot", x: x1, y: y1, r: DOT_R });
      prims.push({ kind: "dot", role: "finDot", x: x2, y: y2, r: DOT_R });
    }
  }
  return prims;
}

/** The detail's map every card on the page shares, with room for the most label rows any card needs, so
 * every card draws the tail at one scale and a shaper can compare one card with another. */
export function finsGuideDetailMap(input: FinsGuideInput, system: UnitsSystem): FinsDetailMap {
  return layoutFor(input, system, finsDrafts(input, system)).map;
}

const CONVENTION_DIMS: readonly FinDim[] = ["offTail", "offRail", "toe", "base"];

/** The rows of labels above and below the tail, fewest first: every row given to labels is height the tail
 * cannot use. */
const ROW_PLANS: readonly [number, number][] = [
  [1, 1],
  [1, 2],
  [2, 1],
  [2, 2],
  [3, 3],
];

/**
 * The map every card shares: the fewest label rows, and where along the detail the tail tip sits, such that
 * every card's labels find a place in them with no line lying on a label. The tail is drawn as large as
 * those rows leave room for. A board no map can keep that clean takes the first whose labels fit their rows.
 */
function layoutFor(input: FinsGuideInput, system: UnitsSystem, drafts: readonly CardDraft[]): { map: FinsDetailMap } {
  const box = guideDetailBox(STRIP_H, DETAIL_H);
  const tail = trimmedTail(drawnTail(input).points, guideFrame(system).finsTailWindow);
  // The first map whose labels merely fit their rows, kept in case no map keeps every label off every line.
  let loose: FinsDetailMap | null = null;
  for (const [rowsUp, rowsDown] of ROW_PLANS) {
    for (const share of TAIL_SHARES) {
      const map = detailMapFor(input, system, rowsUp, rowsDown, share);
      let clean = true;
      const fits = drafts.every(({ draw }) => {
        const placed = placeLabels(dimWants(draw.dims, draw.marks, tail, map, system), box, map);
        clean &&= placed.clean;
        return placed.up <= rowsUp && placed.down <= rowsDown && (clean || !loose);
      });
      if (fits && clean) return { map };
      if (fits) loose ??= map;
    }
  }
  if (loose) return { map: loose };
  const [rowsUp, rowsDown] = ROW_PLANS[ROW_PLANS.length - 1];
  return { map: detailMapFor(input, system, rowsUp, rowsDown, TAIL_SHARES[0]) };
}

function finsFigure(
  input: FinsGuideInput,
  system: UnitsSystem,
  map: FinsDetailMap,
  marks: readonly FinMark[],
  dims: readonly FinDim[],
  pushed: readonly FinMark[] | null,
): GuideFigure {
  const g = input.outlineGeometry;
  const strip = guideStripFit(g.length, mm(2 * g.halfWidePointWidth), STRIP_H);
  const box = guideDetailBox(STRIP_H, DETAIL_H);
  const end = guideFrame(system).finsTailWindow;
  const drawn = drawnTail(input);
  const tail = trimmedTail(drawn.points, end);
  const { rect } = guideWindowFit(
    { s0: -GUIDE_FRAME.fins.tailMargin, s1: end, across: halfAt(drawn.points, end) + GUIDE_FRAME.fins.across },
    strip,
    box,
    { stripHeight: STRIP_H },
  );
  const stripPrims: GuidePrim[] = [...guidePlanPrims(g, strip), ...finPrims(marks, strip, "fin", false), { kind: "rect", role: "window", ...rect }];

  const placed = placeLabels(dimWants(dims, marks, tail, map, system), box, map);
  const close = drawn.connector ? drawn.connector.y : 0;
  const prims: GuidePrim[] = [
    { kind: "path", role: "board", d: tailPath(tail, drawn.connector, map) },
    { kind: "line", role: "stringer", x1: guideX(map, end), y1: map.oy, x2: guideX(map, Math.max(0, close)) + 4, y2: map.oy },
    ...finPrims(marks, map, "fin", true),
    ...(pushed ? finPrims(pushed, map, "push", false) : []),
    ...placed.prims,
    guideWindowName(box, [guideText("Tail, "), guideFigure(formatDim(end, system)), guideText(" from above")]),
  ];
  return { height: FIGURE_H, strip: stripPrims, windows: [{ box, prims }] };
}

// ---- The page ----------------------------------------------------------------------------------------

const ON: GuideTag = { kind: "on", text: "On this board" };
const valueTag = (text: string): GuideTag => ({ kind: "value", text });
const NOT_HERE: GuideTag = { kind: "na", text: "—" };
const drawnAs = (result: FinPlacementResult): GuideCaption => ({ kind: "drawnAs", parts: [guideText(result.modelHeader)] });
const dashed = (figure: string, words: string): GuideCaption => ({ kind: "dashed", parts: [guideFigure(figure), guideText(` ${words}`)] });

/** What a card draws before the shared scale is known: its board's fins, the dimensions on them, and the
 * pushed fins in dashes. */
type CardDraw = { marks: readonly FinMark[]; dims: readonly FinDim[]; pushed: readonly FinMark[] | null };
type CardDraft = Omit<GuideCardModel, "figure"> & { draw: CardDraw };

/** Every card's tag, caption and what it draws, in the words page's order. */
function finsDrafts(input: FinsGuideInput, system: UnitsSystem): CardDraft[] {
  const base = input.effectiveFins;
  const own = input.finPlacement;
  const variants = finsGuideVariants(input, system);
  const tailIn = input.finImportedTail;
  const push = guidePush(system).fins;
  const fwd = forwardMark(own.marks);
  const railFins = hasRailFins(own.marks);

  const draw = (marks: readonly FinMark[], dims: readonly FinDim[], pushed: readonly FinMark[] | null = null): CardDraw => ({ marks, dims, pushed });

  /** A setup or model card: its spec through the maths, tagged when it is the board's own. */
  const drawnCard = (id: string, on: boolean, dims: readonly FinDim[], tag?: GuideTag): CardDraft => {
    const result = computeFinPlacement(variants[id]!, tailIn);
    return { id, tag: tag ?? (on ? ON : GUIDE_NO_TAG), caption: drawnAs(result), draw: draw(result.marks, dims) };
  };
  const pushedOf = (id: string) => (variants[id] ? computeFinPlacement(variants[id]!, tailIn) : null);

  const setupDims: readonly FinDim[] = ["offTail", "offRail"];
  const isSetup = (s: FinSetup) => base.finSetup === s;
  const cards: CardDraft[] = [
    {
      id: ids.importDesignedBoard,
      tag: input.finsImportTemplate ? ON : GUIDE_NO_TAG,
      caption: GUIDE_NO_CAPTION,
      draw: draw(own.marks, ["offTail", "offRail"]),
    },
    { id: ids.convention, tag: valueTag(guideFinGrainTag(system)), caption: GUIDE_NO_CAPTION, draw: draw(own.marks, CONVENTION_DIMS) },
    drawnCard(ids.single, isSetup("single"), setupDims),
    drawnCard(ids.twin, isSetup("twin"), setupDims),
    ...(["upright", "keel", "trailer"] as const).map((t) =>
      drawnCard(
        { upright: ids.twinUpright, keel: ids.twinKeel, trailer: ids.twinTrailer }[t],
        isSetup("twin") && base.twinTemplate === t,
        ["offTail", "base"],
      ),
    ),
    drawnCard(ids.thruster, isSetup("thruster"), setupDims),
    ...(["proportional", "basic", "mckeeSB", "mckeeGun"] as const).map((m) =>
      drawnCard(
        { proportional: ids.thrusterProportional, basic: ids.thrusterBasic, mckeeSB: ids.thrusterMcKeeSB, mckeeGun: ids.thrusterMcKeeGun }[m],
        isSetup("thruster") && base.frontModel === m,
        ["offTail", "toe"],
      ),
    ),
    drawnCard(ids.twoPlusOne, isSetup("2plus1"), setupDims),
    drawnCard(ids.quad, isSetup("quad"), setupDims),
    ...(["basic", "basicOffRail", "mckeeSB", "mckeeLB"] as const).map((m) => {
      const id = { basic: ids.quadBasic, basicOffRail: ids.quadBasicOffRail, mckeeSB: ids.quadMcKeeSB, mckeeLB: ids.quadMcKeeLB }[m];
      // Asked of the app's own rule, never a length compared here (D-13).
      const available = isQuadRearModelAvailable(m, base.boardLength);
      const tag: GuideTag | undefined = available ? undefined : { kind: "na", text: `Needs ${formatLength(MIN_MCKEE_LONGBOARD_QUAD_LENGTH, system)}` };
      return drawnCard(id, isSetup("quad") && base.quadRearModel === m, ["rearOffTail"], tag);
    }),
    drawnCard(ids.quadCenter, isSetup("quad") && base.quadCenterFinOn, ["centerOffTail"]),
  ];

  // The four Advanced settings: the forward fins' own value as the tag, the push in muted dashes.
  const baseRes = pushedOf(ids.finBase)!;
  const baseFwd = forwardMark(baseRes.marks);
  cards.push({
    id: ids.finBase,
    name: railFins ? "Fin Base Length" : own.flags.centerBaseLenFieldLabel,
    tag: fwd ? valueTag(formatMark(fwd.baseLength, system)) : GUIDE_NO_TAG,
    caption: baseFwd ? dashed(formatMark(baseFwd.baseLength, system), "base") : GUIDE_NO_CAPTION,
    draw: draw(own.marks, ["base"], baseRes.marks),
  });
  const forwardRes = pushedOf(ids.finForward)!;
  cards.push({
    id: ids.finForward,
    tag: fwd ? valueTag(formatMark(fwd.offTail, system)) : GUIDE_NO_TAG,
    caption: dashed(formatMark(push.finForward, system), "forward"),
    draw: draw(own.marks, ["offTail"], forwardRes.marks),
  });
  const offRailRes = pushedOf(ids.finOffRail);
  cards.push({
    id: ids.finOffRail,
    tag: railFins ? valueTag(formatMark(own.resolved.forwardOffRail, system)) : NOT_HERE,
    caption: offRailRes ? dashed(formatMark(offRailRes.resolved.forwardOffRail, system), "off the rail") : GUIDE_NO_CAPTION,
    draw: draw(own.marks, railFins ? ["offRail"] : [], offRailRes ? offRailRes.marks : null),
  });
  const toeRes = pushedOf(ids.finToe);
  cards.push({
    id: ids.finToe,
    tag: railFins ? valueTag(formatMark(own.resolved.forwardToe, system)) : NOT_HERE,
    caption: toeRes ? dashed(formatMark(toeRes.resolved.forwardToe, system), "toe-in") : GUIDE_NO_CAPTION,
    draw: draw(own.marks, railFins ? ["toe"] : [], toeRes ? toeRes.marks : null),
  });

  return cards;
}

/** FINS' 23 cards for the open board, in the words page's order. */
export function buildFinsGuide(input: FinsGuideInput, system: UnitsSystem): GuidePageBuild {
  const drafts = finsDrafts(input, system);
  const { map } = layoutFor(input, system, drafts);
  return new Map(
    drafts.map(({ draw, ...card }) => [card.id, { ...card, figure: finsFigure(input, system, map, draw.marks, draw.dims, draw.pushed) }]),
  );
}
