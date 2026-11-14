/**
 * RAILS' GUIDE cards, worked out from the open board's own rails (Phase 18, D-04, D-05, D-07, D-16, D-18, D-26;
 * UI-SPEC §4, "Figures: Rule 2, card by card").
 *
 * Every rail has the same controls, so one card stands for all three (D-04): it draws the centre's rail, and the
 * tail's where only the tail has the control (Hard Edge, Scaled from center by, Tail Rail Blends From · Ends At).
 * A card is the board from above with its three stations — the one it cuts drawn dash-dot — then the
 * cross-section at that station as VIEWER draws it: the bands in the page's own colours, keyed by their
 * `RailSegmentKey`, the apex centre, the finished rail in ink, and the one setting pushed in muted dashes. Tail
 * Rail Blends From · Ends At draws the tail from above instead, the hard edge running from the tail to Blends
 * From and fading by Ends At.
 *
 * Every pushed section is the board's own section spec with exactly one field changed (or the tail's hard-edge
 * flag), through `computeRailSectionOutput`, then `finishedRail` from the base board's own left edge — the
 * smallest `xAxisMin` of its three sections, as VIEWER shares one edge between its plots. A push that the
 * control's own limit leaves no room for goes the other way; with no room at all the card draws the board as it
 * is with no caption (D-26). Every figure is printed through the RAILS page's own formatters. Pure: no React,
 * browser or database (CLAUDE.md Rule 1).
 */
import { finishedRail, type FinishedRail } from "./finished-rail";
import {
  GUIDE_MIN_FIT,
  GUIDE_NO_CAPTION,
  GUIDE_NO_TAG,
  guideCardId,
  guideFigure,
  guideText,
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
  guideTextBox,
  guideVDim,
  guideWindowFit,
  guideWindowName,
  guideX,
  guideY,
  GUIDE_TEXT_UNITS_MAX,
  type GuideMap,
} from "./guide-draw";
import { GUIDE_FRAME, guidePush } from "./guide-push";
import { formatDim, formatMark, formatSignedMark, measureSlider, stationLabel } from "./measure-display";
import { MEASURE_STATION_MM, type OutlineGeometry } from "./outline";
import {
  computeRailSectionOutput,
  effectiveDeckPercent,
  hardEdgeBlendsFrom,
  hardEdgeBlendsFromWindow,
  hardEdgeEndsAt,
  hardEdgeEndsAtWindow,
  railFamilyLabel,
  railNudgesOf,
  railPlotDots,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_STEP_IN,
  type RailBandSpec,
  type RailBandsOutput,
  type RailFamily,
  type RailNudgeKey,
  type RailSectionKey,
  type RailSectionOutput,
  type RailSectionSpec,
} from "./rail-bands";
import { mm, type Mm, type UnitsSystem } from "./units";

/** The page's three groups, as the words page names them. */
const INPUTS = "Inputs";
const RAILS = "Nose Rail · Center Rail · Tail Rail";
const ADVANCED = "Advanced";

/** RAILS' seventeen cards, in the words page's order. */
export const RAILS_GUIDE_CARD_IDS = {
  importFoil: guideCardId("rails", INPUTS, "Import Rocker & Foil Values"),
  thickness: guideCardId("rails", INPUTS, 'Board Thickness · Thickness @12"'),
  deckProfile: guideCardId("rails", RAILS, "Deck Profile"),
  family: guideCardId("rails", RAILS, "Family"),
  ratio: guideCardId("rails", RAILS, "Ratio"),
  symmetrical: guideCardId("rails", RAILS, "Symmetrical"),
  hardEdge: guideCardId("rails", RAILS, "Hard Edge"),
  scaled: guideCardId("rails", ADVANCED, "Scaled from center by"),
  apexThickness: guideCardId("rails", ADVANCED, "Apex Thickness"),
  deckMark1: guideCardId("rails", ADVANCED, "Deck Mark 1"),
  deckMark3: guideCardId("rails", ADVANCED, "Deck Mark 3"),
  domedDeckBand: guideCardId("rails", ADVANCED, "Domed Deck Band"),
  singleTuck: guideCardId("rails", ADVANCED, "Use Single Tuck"),
  bottomTuck1: guideCardId("rails", ADVANCED, "Bottom Tuck 1"),
  bottomTuck3: guideCardId("rails", ADVANCED, "Bottom Tuck 3"),
  sharpBottomTuck: guideCardId("rails", ADVANCED, "Sharp Bottom Tuck"),
  blends: guideCardId("rails", ADVANCED, "Tail Rail Blends From · Tail Rail Ends At"),
} as const;

/** The seventeen ids in order. */
export const RAILS_GUIDE_CARD_ORDER: readonly string[] = Object.values(RAILS_GUIDE_CARD_IDS);

/** The one field each pushed card changes: a `RailSectionSpec` field (a nudge as `nudges.<key>`), the tail's
 * hard-edge flag, or the tail rail's blend pair. The Import card pushes nothing. */
export type RailsGuidePushField =
  | "boardThickness"
  | "deckPercent"
  | "family"
  | "ratioTopPercent"
  | "symmetrical"
  | "singleTuck"
  | "sharpBottomTuck"
  | "scaleFromCenter"
  | `nudges.${RailNudgeKey}`
  | "tailHardEdge"
  | "tailHardEdgeBlends";

const ids = RAILS_GUIDE_CARD_IDS;

export const RAILS_GUIDE_PUSH_FIELDS: Readonly<Record<string, RailsGuidePushField>> = {
  [ids.thickness]: "boardThickness",
  [ids.deckProfile]: "deckPercent",
  [ids.family]: "family",
  [ids.ratio]: "ratioTopPercent",
  [ids.symmetrical]: "symmetrical",
  [ids.hardEdge]: "tailHardEdge",
  [ids.scaled]: "scaleFromCenter",
  [ids.apexThickness]: "nudges.apexThickness",
  [ids.deckMark1]: "nudges.deckMark1",
  [ids.deckMark3]: "nudges.deckMark3",
  [ids.domedDeckBand]: "nudges.domedDeckBand",
  [ids.singleTuck]: "singleTuck",
  [ids.bottomTuck1]: "nudges.bottomTuck1",
  [ids.bottomTuck3]: "nudges.bottomTuck3",
  [ids.sharpBottomTuck]: "sharpBottomTuck",
  [ids.blends]: "tailHardEdgeBlends",
};

/** Which rail each card draws (D-04): the centre's, the tail's for the controls only the tail has. */
export const RAILS_GUIDE_SECTION: Readonly<Record<string, RailSectionKey>> = Object.fromEntries(
  RAILS_GUIDE_CARD_ORDER.map((id) => [id, id === ids.hardEdge || id === ids.scaled || id === ids.blends ? "tail" : "center"]),
);

/** What RAILS' GUIDE reads from the design store — the store's own objects, read only. */
export interface RailsGuideInput {
  /** The rails RAILS draws (thicknesses from the foil while Import Rocker & Foil Values is ticked), with the
   * tail's Hard Edge flag and its two blend settings. */
  effectiveRails: RailBandSpec;
  /** `computeRailBands(effectiveRails)`, as VIEWER draws it. */
  railBands: RailBandsOutput;
  railsImportFoilThickness: boolean;
  /** The board from above, for the strip and the tail's plan. */
  outlineGeometry: OutlineGeometry;
  /** The board's length, as RAILS' blend sliders read it. */
  boardLength: Mm;
}

/** A pushed card's board: one section with one field changed (or the tail's flag), or the blend pair moved. */
export type RailsGuideVariant =
  | { kind: "section"; key: RailSectionKey; spec: RailSectionSpec; hardEdge: boolean }
  | { kind: "blends"; blendsFrom: Mm; endsAt: Mm };

/** The base board's own drawing edge: the smallest `xAxisMin` of its three sections (RESEARCH Finding 3). */
export function railsGuideX0(input: RailsGuideInput): Mm {
  const b = input.railBands;
  return mm(Math.min(b.nose.bounds.xAxisMin, b.center.bounds.xAxisMin, b.tail.bounds.xAxisMin));
}

/** A section's hard edge as the board has it: the tail's flag, never on the nose or the centre. */
const hardEdgeOf = (input: RailsGuideInput, key: RailSectionKey) => key === "tail" && input.effectiveRails.tailHardEdge;

/**
 * A nudge's push within the slider's own window (`RAIL_NUDGE_LIMIT_IN` through `measureSlider`, exactly as
 * RAILS' Advanced slider reads it): the push amount toward the far end, held at the slider's end if it would
 * pass it; the other way when the slider is already at that end; `null` with no room either way.
 */
function nudgePush(current: Mm, amount: Mm, key: RailNudgeKey, system: UnitsSystem): Mm | null {
  const limit = RAIL_NUDGE_LIMIT_IN[key];
  const slider = measureSlider(current, { min: -limit, max: limit }, RAIL_NUDGE_STEP_IN, 1, system);
  const top = slider.toMm(slider.max);
  const bottom = slider.toMm(slider.min);
  const up = Math.min(current + amount, top);
  if (up - current > 0.01) return mm(up);
  const down = Math.max(current - amount, bottom);
  if (current - down > 0.01) return mm(down);
  return null;
}

/**
 * The blend pair pushed, within RAILS' own slider windows: the pair together toward the centre, else the other way;
 * and, since quick 261113-psx, when the pair cannot move together — a board that says nothing sits with Blends From at
 * the bottom of its slider and Ends At at the top of its own — Blends From alone toward the centre (a longer hard
 * edge), else Ends At alone toward the tail; `null` with no room any of those ways.
 */
function blendsPush(input: RailsGuideInput, system: UnitsSystem): { blendsFrom: Mm; endsAt: Mm } | null {
  const L = input.boardLength;
  const from = hardEdgeBlendsFrom(input.effectiveRails, L);
  const ends = hardEdgeEndsAt(input.effectiveRails, L);
  const amount = guidePush(system).rails.blends;
  const e = 0.01;
  for (const sign of [1, -1]) {
    const f = mm(from + sign * amount);
    const t = mm(ends + sign * amount);
    const fw = hardEdgeBlendsFromWindow(t, L);
    const tw = hardEdgeEndsAtWindow(f, L);
    if (f >= fw.min - e && f <= fw.max + e && t >= tw.min - e && t <= tw.max + e) return { blendsFrom: f, endsAt: t };
  }
  const startAlone = mm(from + amount);
  const startWindow = hardEdgeBlendsFromWindow(ends, L);
  if (startAlone >= startWindow.min - e && startAlone <= startWindow.max + e) return { blendsFrom: startAlone, endsAt: ends };
  const endAlone = mm(ends - amount);
  const endWindow = hardEdgeEndsAtWindow(from, L);
  if (endAlone >= endWindow.min - e && endAlone <= endWindow.max + e) return { blendsFrom: from, endsAt: endAlone };
  return null;
}

/** The Deck Profile pushed to the push's 85%, or back to Flat on a board already domed there. */
function deckPercentPush(current: number, system: UnitsSystem): number {
  const target = guidePush(system).rails.deckPercent;
  return Math.abs(effectiveDeckPercent(current) - target) < 0.5 ? 100 : target;
}

/** The Ratio pushed to the push's 35/65, or its mirror on a board whose apex already sits above the middle. */
function ratioPush(current: number, system: UnitsSystem): number {
  const target = guidePush(system).rails.ratioTop;
  return current >= 50 ? target : 100 - target;
}

/** The scale pushed to the push's 0.70, or back to 1.00 on a rail already there. */
function scalePush(current: number, system: UnitsSystem): number {
  const target = guidePush(system).rails.scale;
  return Math.abs(current - target) < 1e-6 ? 1 : target;
}

/**
 * Each pushed card's board — the base section spec with exactly its one field changed — and `null` for a card
 * that pushes nothing (the Import card, and any push whose control has no room).
 */
export function railsGuideVariants(input: RailsGuideInput, system: UnitsSystem): Record<string, RailsGuideVariant | null> {
  const push = guidePush(system).rails;
  const rails = input.effectiveRails;
  const out: Record<string, RailsGuideVariant | null> = {};
  const section = (id: string, patch: Partial<RailSectionSpec> | null, hardEdge?: boolean): RailsGuideVariant | null => {
    const key = RAILS_GUIDE_SECTION[id];
    if (patch === null) return null;
    return { kind: "section", key, spec: { ...rails[key], ...patch }, hardEdge: hardEdge ?? hardEdgeOf(input, key) };
  };
  const nudged = (id: string, key: RailNudgeKey, amount: Mm): RailsGuideVariant | null => {
    const spec = rails[RAILS_GUIDE_SECTION[id]];
    const nudges = railNudgesOf(spec.nudges);
    const to = nudgePush(nudges[key], amount, key, system);
    return section(id, to === null ? null : { nudges: { ...nudges, [key]: to } });
  };
  const c = rails.center;
  const t = rails.tail;

  out[ids.importFoil] = null;
  out[ids.thickness] = section(ids.thickness, { boardThickness: mm(c.boardThickness + push.thick) });
  out[ids.deckProfile] = section(ids.deckProfile, { deckPercent: deckPercentPush(c.deckPercent, system) });
  out[ids.family] = section(ids.family, { family: (c.family <= 3 ? 5 : 1) as RailFamily });
  out[ids.ratio] = section(ids.ratio, { ratioTopPercent: ratioPush(c.ratioTopPercent, system) });
  out[ids.symmetrical] = section(ids.symmetrical, { symmetrical: !c.symmetrical });
  // The tail's Hard Edge drawn the other way. Coming on, it turns the tail's Symmetrical off, as the page's own
  // tick box does (R21: the two can never both be on).
  out[ids.hardEdge] = rails.tailHardEdge
    ? section(ids.hardEdge, {}, false)
    : section(ids.hardEdge, t.symmetrical ? { symmetrical: false } : {}, true);
  out[ids.scaled] = section(ids.scaled, { scaleFromCenter: scalePush(t.scaleFromCenter ?? 1, system) });
  out[ids.apexThickness] = nudged(ids.apexThickness, "apexThickness", push.apex);
  out[ids.deckMark1] = nudged(ids.deckMark1, "deckMark1", push.deckMark);
  out[ids.deckMark3] = nudged(ids.deckMark3, "deckMark3", push.deckMark);
  out[ids.domedDeckBand] = nudged(ids.domedDeckBand, "domedDeckBand", push.domedBand);
  out[ids.singleTuck] = section(ids.singleTuck, { singleTuck: !c.singleTuck });
  out[ids.bottomTuck1] = nudged(ids.bottomTuck1, "bottomTuck1", push.tuck1);
  out[ids.bottomTuck3] = nudged(ids.bottomTuck3, "bottomTuck3", push.tuck3);
  out[ids.sharpBottomTuck] = section(ids.sharpBottomTuck, { sharpBottomTuck: !c.sharpBottomTuck });
  const blends = blendsPush(input, system);
  out[ids.blends] = blends === null ? null : { kind: "blends", ...blends };
  return out;
}

/** A pushed section's output, through RAILS' own function. */
export function railsGuidePushedOutput(variant: Extract<RailsGuideVariant, { kind: "section" }>): RailSectionOutput {
  return computeRailSectionOutput(variant.key, variant.spec, variant.hardEdge);
}

/** A section's finished rail as a card draws it: from the base board's own left edge, or the section's own when
 * that reaches further (a pushed dome can run a band past it). */
export function railsGuideFinishedRail(input: RailsGuideInput, output: RailSectionOutput): FinishedRail {
  return finishedRail(output, mm(Math.min(railsGuideX0(input), output.bounds.xAxisMin)));
}

/** Strip, section and plan heights (UI-SPEC §4: RAILS strip 60, a section 120, the tail from above 110). */
const STRIP_H = 60;
const SECTION_H = 120;
const PLAN_H = 110;
/** A window name's band at the top of a detail. */
const NAME_BAND = 3 + GUIDE_TEXT_UNITS_MAX + 2;
/** The band over the deck for a deck mark's dimension label. */
const TOP_DIM_BAND = GUIDE_TEXT_UNITS_MAX + 1 + GUIDE_HDIM_LABEL_OFF;
/** The band under the bottom for a tuck's dimension label (the line 4 under, the label under that, clear of
 * the line's end ticks). */
const BOTTOM_DIM_BAND = 4 + GUIDE_HDIM_LABEL_OFF + 1.1 * GUIDE_TEXT_UNITS_MAX + 1;
/** The room kept right of the rail for a vertical dimension's label. */
const LABEL_GUTTER = 84;
/** How far inside the rail's line the tail's hard edge is drawn on the plan, in drawing units. */
const EDGE_INSET = 2.5;

/** The three stations a rail is cut at: the tail 12", the centre, the nose 12". */
function stationsOf(length: number): Record<RailSectionKey, number> {
  return { tail: MEASURE_STATION_MM, center: length / 2, nose: length - MEASURE_STATION_MM };
}

const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose rail", center: "Center rail", tail: "Tail rail" };

/** The strip: the whole board from above with its three stations, the one a card cuts drawn dash-dot. */
function stripPrims(input: RailsGuideInput, cut: RailSectionKey | null, strip: GuideMap): GuidePrim[] {
  const g = input.outlineGeometry;
  const prims: GuidePrim[] = [...guidePlanPrims(g, strip)];
  const stations = stationsOf(g.length);
  for (const key of ["nose", "center", "tail"] as const) {
    const s = stations[key];
    const half = guideHalfWidthAt(g.points, s);
    const on = key === cut;
    const x = guideX(strip, s);
    prims.push({
      kind: "line",
      role: on ? "cut" : "station",
      x1: x,
      y1: guideY(strip, -half) - (on ? 5 : 2),
      x2: x,
      y2: guideY(strip, half) + (on ? 5 : 2),
    });
  }
  return prims;
}

/** Which of a section's marks a card dimensions (the sketch's `dims`). */
type RailDim = "thickness" | "tapered" | "apex" | "apexCenter" | "deckMark1" | "deckMark3" | "domedBand" | "tuck1" | "tuck3" | "edge";

const CARD_DIMS: Readonly<Record<string, readonly RailDim[]>> = {
  [ids.importFoil]: ["thickness"],
  [ids.thickness]: ["thickness"],
  [ids.deckProfile]: ["tapered"],
  [ids.family]: ["apex"],
  [ids.ratio]: ["apexCenter"],
  [ids.symmetrical]: ["tuck1"],
  [ids.hardEdge]: ["edge"],
  [ids.scaled]: ["deckMark1"],
  [ids.apexThickness]: ["apex"],
  [ids.deckMark1]: ["deckMark1"],
  [ids.deckMark3]: ["deckMark3"],
  [ids.domedDeckBand]: ["domedBand"],
  [ids.singleTuck]: ["tuck3"],
  [ids.bottomTuck1]: ["tuck1"],
  [ids.bottomTuck3]: ["tuck3"],
  [ids.sharpBottomTuck]: ["tuck3"],
};

const f1 = (v: number) => Math.round(v * 10) / 10;

function linePath(points: readonly { x: number; y: number }[], map: GuideMap): string {
  return points.map((p, i) => `${i ? "L" : "M"}${f1(guideX(map, p.x))} ${f1(guideY(map, p.y))}`).join("");
}

/**
 * A section card's drawing: the strip with the card's station cut, then that station's cross-section — x 0 at
 * the rail and negative toward the stringer, y up off the bottom, as `rail-section-plot.tsx` draws it — with
 * the bands, the apex centre, the finished rail in ink, and the push's finished rail in muted dashes.
 */
function sectionFigure(
  input: RailsGuideInput,
  id: string,
  variant: Extract<RailsGuideVariant, { kind: "section" }> | null,
  system: UnitsSystem,
): GuideFigure {
  const key = RAILS_GUIDE_SECTION[id];
  const g = input.outlineGeometry;
  const strip = guideStripFit(g.length, mm(2 * g.halfWidePointWidth), STRIP_H);
  const box = guideDetailBox(STRIP_H, SECTION_H);
  const base = input.railBands[key];
  const x0 = railsGuideX0(input);
  const pushed = variant ? railsGuidePushedOutput(variant) : null;
  const baseRail = railsGuideFinishedRail(input, base);
  const pushX0 = pushed ? mm(Math.min(x0, pushed.bounds.xAxisMin)) : x0;
  const pushRail = pushed ? railsGuideFinishedRail(input, pushed) : null;

  // The section fitted into the band the label gutters leave, true to scale, the rail at the right.
  const xLeft = Math.min(x0, pushX0);
  const xRight = GUIDE_FRAME.rails.plotPastApex;
  const yTop = Math.max(base.boardThickness, pushed?.boardThickness ?? 0);
  const left = box.x + 6;
  const right = box.x + box.w - LABEL_GUTTER;
  const bottomY = box.y + box.h - BOTTOM_DIM_BAND;
  const topY = box.y + NAME_BAND + TOP_DIM_BAND + 4;
  const k = Math.min((right - left) / (xRight - xLeft), (bottomY - topY) / yTop);
  const map: GuideMap = { k, kx: k, ky: -k, ox: right - xRight * k, oy: bottomY };
  const X = (x: number) => guideX(map, x);
  const Y = (y: number) => guideY(map, y);
  const r = base.result;

  const samples = baseRail.samples;
  const prims: GuidePrim[] = [];
  if (samples.length > 0) {
    prims.push({
      kind: "path",
      role: "railFill",
      d: `${linePath(samples, map)}L${f1(X(samples[samples.length - 1].x))} ${f1(Y(0))}L${f1(X(samples[0].x))} ${f1(Y(0))}Z`,
    });
  }
  prims.push({ kind: "line", role: "baseline", x1: box.x, y1: f1(Y(0)), x2: box.x + box.w, y2: f1(Y(0)) });
  prims.push({ kind: "line", role: "reference", x1: box.x, y1: f1(Y(base.boardThickness)), x2: f1(X(xRight)), y2: f1(Y(base.boardThickness)) });
  prims.push({ kind: "line", role: "reference", x1: f1(X(0)), y1: f1(Y(0)), x2: f1(X(0)), y2: f1(Y(yTop)) });
  for (const seg of base.segments) {
    prims.push({ kind: "path", role: "band", band: seg.key, d: linePath([seg.p1, seg.p2], map) });
  }
  const baseDots = railPlotDots(base.segments, r, base.domed).filter((dot) => dot.key !== "apexCenter");
  for (const dot of baseDots) prims.push({ kind: "dot", role: "markDot", x: f1(X(dot.x)), y: f1(Y(dot.y)), r: 1.3 });
  prims.push({ kind: "line", role: "apex", x1: f1(X(0) - 5), y1: f1(Y(r.apexCenter)), x2: f1(X(0) + 5), y2: f1(Y(r.apexCenter)) });
  prims.push({ kind: "path", role: "rail", d: linePath(samples, map) });
  if (pushed && pushRail) {
    prims.push({ kind: "path", role: "push", d: linePath(pushRail.samples, map) });
    // The pushed marks that moved, as the sketch's ghost dots.
    for (const dot of railPlotDots(pushed.segments, pushed.result, pushed.domed)) {
      if (dot.key === "apexCenter") continue;
      const same = baseDots.some((b) => Math.abs(b.x - dot.x) < 0.5 && Math.abs(b.y - dot.y) < 0.5);
      if (!same) prims.push({ kind: "dot", role: "pushDot", x: f1(X(dot.x)), y: f1(Y(dot.y)), r: 1.3 });
    }
  }

  const xDim = X(0) + 8;
  const vdim = (ya: number, yb: number, value: Mm) => {
    for (const y of [ya, yb]) {
      if (y > 0.01) prims.push({ kind: "line", role: "extension", x1: f1(X(0) + 2), y1: f1(Y(y)), x2: f1(xDim + 3), y2: f1(Y(y)) });
    }
    prims.push(guideVDim(f1(xDim), f1(Y(ya)), f1(Y(yb)), [guideFigure(formatMark(value, system))]));
  };
  const deckDim = (mark: Mm) => {
    const y = Y(yTop) - 4;
    for (const x of [0, -mark]) prims.push({ kind: "line", role: "extension", x1: f1(X(x)), y1: f1(y - 3), x2: f1(X(x)), y2: f1(Y(base.boardThickness)) });
    prims.push(guideHDim(f1(X(-mark)), f1(X(0)), f1(y), [guideFigure(formatMark(mark, system))], true, "middle"));
  };
  const bottomDim = (mark: Mm) => {
    if (mark <= 1) return;
    prims.push(guideHDim(f1(X(-mark)), f1(X(0)), f1(Y(0) + 4), [guideFigure(formatMark(mark, system))], false, "middle"));
  };
  const note = (text: string) =>
    prims.push({ kind: "text", role: "value", x: f1(X(0)), y: f1(Y(0) + 7), dy: 0.85, parts: [guideText(text)], anchor: "end" });

  for (const dim of CARD_DIMS[id] ?? []) {
    switch (dim) {
      case "thickness":
        vdim(0, base.boardThickness, base.boardThickness);
        break;
      case "tapered":
        vdim(0, base.thicknessEff, base.railThicknessClamped);
        break;
      case "apex":
        vdim(r.railTuck1, r.railMark1, r.apexLenRange);
        break;
      case "apexCenter":
        vdim(0, r.apexCenter, r.apexCenter);
        break;
      case "deckMark1":
        deckDim(r.deckMark1);
        break;
      case "deckMark3":
        deckDim(r.deckMark3);
        break;
      case "domedBand":
        deckDim(r.domedDeckBand);
        break;
      case "tuck1":
        if (!r.hardEdge && !r.singleTuck) bottomDim(r.bottomTuck1);
        break;
      case "tuck3":
      case "edge":
        if (r.hardEdge) note("Hard edge");
        else bottomDim(r.bottomTuck3);
        break;
    }
  }
  const station = stationsOf(g.length)[key];
  prims.push(guideWindowName(box, [guideText(`${SECTION_TITLE[key]} · `), guideFigure(formatDim(mm(station), system))]));
  return { height: STRIP_H + 6 + SECTION_H, strip: stripPrims(input, key, strip), windows: [{ box, prims }] };
}

/**
 * Tail Rail Blends From · Ends At: the strip with the tail station cut and the window, then the tail from above,
 * one rail from the stringer out — the hard edge running sharp from the tail to Blends From and fading by Ends
 * At, both marks across the rail, and the pushed pair in muted dashes.
 */
function blendsFigure(input: RailsGuideInput, pushedPair: { blendsFrom: Mm; endsAt: Mm } | null, system: UnitsSystem): GuideFigure {
  const g = input.outlineGeometry;
  const L = input.boardLength;
  const frame = GUIDE_FRAME.rails;
  const from = hardEdgeBlendsFrom(input.effectiveRails, L);
  const ends = hardEdgeEndsAt(input.effectiveRails, L);
  const strip = guideStripFit(g.length, mm(2 * g.halfWidePointWidth), STRIP_H);
  const box = guideDetailBox(STRIP_H, PLAN_H);
  const farEnd = Math.max(ends, pushedPair?.endsAt ?? 0);
  const win = {
    s0: -frame.margin,
    s1: farEnd + frame.pastEnds,
    across: guideHalfWidthAt(g.points, ends + frame.acrossAt) + frame.tailAcross,
    half: true,
  };
  const bottom = 3 + 1.1 * GUIDE_TEXT_UNITS_MAX + 2;
  const fitted = guideWindowFit(win, strip, box, { stripHeight: STRIP_H, top: NAME_BAND, bottom });
  const map = fitted.map;
  const X = (s: number) => guideX(map, s);
  const Y = (a: number) => guideY(map, a);

  // One rail, tail to nose along the outline, back along the stringer.
  const pts = [
    ...g.points.filter((p) => p.station < win.s1).map((p) => ({ s: p.station, w: p.halfWidth })),
    { s: win.s1, w: guideHalfWidthAt(g.points, win.s1) },
  ];
  const prims: GuidePrim[] = [];
  if (pts.length > 1) {
    const rail = pts.map((p, i) => `${i ? "L" : "M"}${f1(X(p.s))} ${f1(Y(p.w))}`).join("");
    const close = Math.max(0, g.centreCloseStation);
    prims.push({ kind: "path", role: "board", d: `${rail}L${f1(X(win.s1))} ${f1(Y(0))}L${f1(X(close))} ${f1(Y(0))}Z` });
  }
  prims.push({ kind: "line", role: "stringer", x1: f1(X(win.s1)), y1: f1(Y(0)), x2: f1(X(Math.max(0, g.centreCloseStation)) + 4), y2: f1(Y(0)) });
  // The hard edge, sharp from the tail to Blends From, then fading to the tucked rail by Ends At.
  const along = (s0: number, s1: number) => {
    const out: { x: number; y: number }[] = [];
    for (const p of g.points) if (p.station >= s0 && p.station <= s1) out.push({ x: p.station, y: guideHalfWidthAt(g.points, p.station) });
    out.unshift({ x: s0, y: guideHalfWidthAt(g.points, s0) });
    out.push({ x: s1, y: guideHalfWidthAt(g.points, s1) });
    // Drawn just inside the rail's own line, so the edge reads as its own line beside the outline.
    return out.map((p, i) => `${i ? "L" : "M"}${f1(X(p.x))} ${f1(Y(p.y) + EDGE_INSET)}`).join("");
  };
  if (input.effectiveRails.tailHardEdge) {
    prims.push({ kind: "path", role: "band", band: "hardEdge", d: along(Math.max(0, g.points[0]?.station ?? 0), from) });
    prims.push({ kind: "path", role: "thinning", d: along(from, ends) });
  }
  const across = (s: number, role: "mark" | "push"): GuidePrim => ({
    kind: "line",
    role,
    x1: f1(X(s)),
    y1: f1(Y(0)),
    x2: f1(X(s)),
    y2: f1(Y(guideHalfWidthAt(g.points, s)) - 4),
  });
  prims.push(across(from, "mark"), across(ends, "mark"));
  if (pushedPair) prims.push(across(pushedPair.blendsFrom, "push"), across(pushedPair.endsAt, "push"));
  // Each mark's figure under the stringer, Blends From toward the tail and Ends At toward the nose, so the two
  // run away from each other and never meet.
  const labelY = f1(Y(0) + 3);
  // Blends From's figure starts at its mark and runs toward the tail, and on the default (the 12" station, a hand from
  // the tail's end) it would run past the window's tail edge, as Ends At's can past its nose edge, so it is held inside
  // that edge the same way, at the narrowest card's text size: it slides back under its own mark by just what it needs.
  const startLabel = (x: number): GuidePrim => ({ kind: "text", role: "value", x: f1(x), y: labelY, dy: 0.85, parts: [guideFigure(formatDim(from, system))], anchor: "start" });
  const startWidth = guideTextBox(startLabel(0), GUIDE_MIN_FIT)?.w ?? 0;
  prims.push(startLabel(Math.min(X(from) + 3, box.x + box.w - 2 - startWidth)));
  // On a short board Ends At sits close to the window's nose edge, and its figure would run off that edge and
  // lose its first digit (`9 1/2"` for 29 1/2"). So the figure is held inside the window at the narrowest card's
  // text size: it slides back under its own mark by just what it needs, and still ends well short of Blends From's.
  const endsLabel = (x: number): GuidePrim => ({ kind: "text", role: "value", x: f1(x), y: labelY, dy: 0.85, parts: [guideFigure(formatDim(ends, system))], anchor: "end" });
  const endsWidth = guideTextBox(endsLabel(0), GUIDE_MIN_FIT)?.w ?? 0;
  prims.push(endsLabel(Math.max(X(ends) - 3, box.x + 2 + endsWidth)));
  prims.push(guideWindowName(box, [guideText("Tail, from above")]));

  const stripLines: GuidePrim[] = [...stripPrims(input, "tail", strip), { kind: "rect", role: "window", ...fitted.rect }];
  return { height: STRIP_H + 6 + PLAN_H, strip: stripLines, windows: [{ box, prims }] };
}

const onTag = (on: boolean): GuideTag => (on ? { kind: "on", text: "On this board" } : GUIDE_NO_TAG);
const valueTag = (text: string): GuideTag => ({ kind: "value", text });
const dashed = (parts: readonly GuideTextPart[]): GuideCaption => ({ kind: "dashed", parts });
const ratioText = (top: number) => `${top}/${100 - top}`;

/** The card name the sidebar gives the thickness: `Board Thickness` on the centre, `Thickness @12"` on the tips
 * (Metric `Thickness @ 30.5 cm`, as `rail-controls.tsx` composes it). */
export function railsThicknessName(system: UnitsSystem): string {
  return `Board Thickness · Thickness @${system === "imperial" ? "" : " "}${stationLabel(system)}`;
}

/** RAILS' seventeen cards for the open board, in the words page's order. */
export function buildRailsGuide(input: RailsGuideInput, system: UnitsSystem): GuidePageBuild {
  const rails = input.effectiveRails;
  const c = rails.center;
  const t = rails.tail;
  const center = input.railBands.center;
  const r = center.result;
  const variants = railsGuideVariants(input, system);
  const sectionOf = (id: string) => {
    const v = variants[id];
    return v && v.kind === "section" ? v : null;
  };
  const figure = (id: string) => sectionFigure(input, id, sectionOf(id), system);
  const pushedOf = (id: string) => {
    const v = sectionOf(id);
    return v ? railsGuidePushedOutput(v) : null;
  };
  /** A caption for a pushed card, or none when its push had no room. */
  const caption = (id: string, parts: () => readonly GuideTextPart[]): GuideCaption => (variants[id] ? dashed(parts()) : GUIDE_NO_CAPTION);
  const nudgeCaption = (id: string, key: RailNudgeKey) =>
    caption(id, () => {
      const v = sectionOf(id)!;
      const before = railNudgesOf(rails[v.key].nudges)[key];
      return [guideFigure(formatSignedMark(mm(railNudgesOf(v.spec.nudges)[key] - before), system))];
    });
  const nudgeTag = (key: RailNudgeKey) => valueTag(formatMark(key === "apexThickness" ? r.apexLenRange : r[key], system));

  const deckPushed = pushedOf(ids.deckProfile);
  const from = hardEdgeBlendsFrom(rails, input.boardLength);
  const ends = hardEdgeEndsAt(rails, input.boardLength);
  const blends = variants[ids.blends];

  const cards: GuideCardModel[] = [
    { id: ids.importFoil, tag: onTag(input.railsImportFoilThickness), caption: GUIDE_NO_CAPTION, figure: figure(ids.importFoil) },
    {
      id: ids.thickness,
      name: railsThicknessName(system),
      tag: valueTag(formatMark(c.boardThickness, system)),
      caption: caption(ids.thickness, () => [guideFigure(formatMark(sectionOf(ids.thickness)!.spec.boardThickness, system)), guideText(" thick")]),
      figure: figure(ids.thickness),
    },
    {
      id: ids.deckProfile,
      tag: center.domed
        ? valueTag(formatMark(center.railThicknessClamped, system))
        : { kind: "value", text: `${formatMark(center.railThicknessClamped, system)} · Flat` },
      caption: caption(ids.deckProfile, () =>
        deckPushed!.domed
          ? [guideText("domed to "), guideFigure(formatMark(deckPushed!.railThicknessClamped, system))]
          : [guideText("flat")],
      ),
      figure: figure(ids.deckProfile),
    },
    {
      id: ids.family,
      tag: valueTag(railFamilyLabel(c.family)),
      caption: caption(ids.family, () => [guideText(railFamilyLabel(sectionOf(ids.family)!.spec.family))]),
      figure: figure(ids.family),
    },
    {
      id: ids.ratio,
      tag: valueTag(ratioText(c.ratioTopPercent)),
      caption: caption(ids.ratio, () => [guideFigure(ratioText(sectionOf(ids.ratio)!.spec.ratioTopPercent))]),
      figure: figure(ids.ratio),
    },
    {
      id: ids.symmetrical,
      tag: onTag(c.symmetrical),
      caption: caption(ids.symmetrical, () => [guideText(c.symmetrical ? "not symmetrical" : "symmetrical")]),
      figure: figure(ids.symmetrical),
    },
    {
      id: ids.hardEdge,
      tag: onTag(rails.tailHardEdge),
      caption: caption(ids.hardEdge, () => [guideText(rails.tailHardEdge ? "tucked" : "hard edge")]),
      figure: figure(ids.hardEdge),
    },
    {
      id: ids.scaled,
      tag: valueTag((t.scaleFromCenter ?? 1).toFixed(2)),
      caption: caption(ids.scaled, () => [guideFigure(sectionOf(ids.scaled)!.spec.scaleFromCenter.toFixed(2))]),
      figure: figure(ids.scaled),
    },
    { id: ids.apexThickness, tag: nudgeTag("apexThickness"), caption: nudgeCaption(ids.apexThickness, "apexThickness"), figure: figure(ids.apexThickness) },
    { id: ids.deckMark1, tag: nudgeTag("deckMark1"), caption: nudgeCaption(ids.deckMark1, "deckMark1"), figure: figure(ids.deckMark1) },
    { id: ids.deckMark3, tag: nudgeTag("deckMark3"), caption: nudgeCaption(ids.deckMark3, "deckMark3"), figure: figure(ids.deckMark3) },
    { id: ids.domedDeckBand, tag: nudgeTag("domedDeckBand"), caption: nudgeCaption(ids.domedDeckBand, "domedDeckBand"), figure: figure(ids.domedDeckBand) },
    {
      id: ids.singleTuck,
      tag: onTag(c.singleTuck),
      caption: caption(ids.singleTuck, () => [guideText(c.singleTuck ? "two tucks" : "one tuck")]),
      figure: figure(ids.singleTuck),
    },
    { id: ids.bottomTuck1, tag: nudgeTag("bottomTuck1"), caption: nudgeCaption(ids.bottomTuck1, "bottomTuck1"), figure: figure(ids.bottomTuck1) },
    { id: ids.bottomTuck3, tag: nudgeTag("bottomTuck3"), caption: nudgeCaption(ids.bottomTuck3, "bottomTuck3"), figure: figure(ids.bottomTuck3) },
    {
      id: ids.sharpBottomTuck,
      tag: onTag(c.sharpBottomTuck),
      caption: caption(ids.sharpBottomTuck, () => [guideText(c.sharpBottomTuck ? "rounded" : "sharp")]),
      figure: figure(ids.sharpBottomTuck),
    },
    {
      id: ids.blends,
      tag: valueTag(`${formatDim(from, system)} · ${formatDim(ends, system)}`),
      caption:
        blends && blends.kind === "blends"
          ? dashed([guideFigure(formatDim(blends.blendsFrom, system)), guideText(" · "), guideFigure(formatDim(blends.endsAt, system))])
          : GUIDE_NO_CAPTION,
      figure: blendsFigure(input, blends && blends.kind === "blends" ? blends : null, system),
    },
  ];
  return new Map(cards.map((card) => [card.id, card]));
}
