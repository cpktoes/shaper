/**
 * VOLUME's GUIDE cards, worked out from the open board (Phase 18, D-03, D-04, D-05, D-07, D-16; UI-SPEC §4,
 * "Figures: Rule 2, card by card").
 *
 * VOLUME has no drawing of its own, so every card draws the board the way the other pages do: the plan
 * from above (TEMPLATE's outline) or the centre cross-section (RAILS' rail, both sides). Three cards push
 * one of the quick estimate's numbers — Board Length, Board Width and Center Thickness — and their caption
 * gives the pushed figure and the litres the quick estimate would then read. The Estimated Volume card's
 * tag is the store's own quoted litres (the 51 cross-sections), never the quick estimator's figure.
 *
 * Every figure is worked out by the app's own functions (`buildOutline`, `computeRailSectionOutput`,
 * `finishedRail`, `computeVolume`) and printed through the page's own formatters. Pure; no React, browser
 * or database (CLAUDE.md Rule 1).
 */
import type { OutlineSpec } from "./board";
import { finishedRail } from "./finished-rail";
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
  guideSectionPath,
  guideStripFit,
  guideVDim,
  guideWindowFit,
  guideWindowName,
  guideX,
  guideY,
  GUIDE_TEXT_UNITS_MAX,
  type GuideMap,
} from "./guide-draw";
import { GUIDE_FRAME, guidePush } from "./guide-push";
import { formatArea, formatDim, formatLength, formatMark } from "./measure-display";
import { buildOutline, type OutlineGeometry } from "./outline";
import { computeRailSectionOutput, type RailBandSpec, type RailBandsOutput } from "./rail-bands";
import { mm, type Litres, type Mm, type UnitsSystem } from "./units";
import {
  AREA_FACTORS,
  BOARD_TYPE_LABELS,
  computeVolume,
  SIMPSON_PANEL_COUNT,
  type VolumeResult,
  type VolumeSpec,
} from "./volume";

/** The page's two groups, as the words page names them. */
const INPUTS = "Inputs";
const READS = "What the ESTIMATE card reads";

/** VOLUME's eight cards, in the words page's order. */
export const VOLUME_GUIDE_CARD_IDS = {
  importDesignedBoard: guideCardId("volume", INPUTS, "Import Designed Board"),
  boardLength: guideCardId("volume", INPUTS, "Board Length"),
  boardWidth: guideCardId("volume", INPUTS, "Board Width"),
  centerThickness: guideCardId("volume", INPUTS, "Center Thickness"),
  boardType: guideCardId("volume", INPUTS, "Board Type"),
  estimatedVolume: guideCardId("volume", READS, "Estimated Volume"),
  templateArea: guideCardId("volume", READS, "Template Area"),
  weightedThickness: guideCardId("volume", READS, "Length-Weighted Effective Thickness"),
} as const;

/** The eight ids in order. */
export const VOLUME_GUIDE_CARD_ORDER: readonly string[] = Object.values(VOLUME_GUIDE_CARD_IDS);

/** Which quick-estimate field each pushed card sets. */
export const VOLUME_GUIDE_PUSH_FIELDS: Readonly<Record<string, "length" | "width" | "centerThickness">> = {
  [VOLUME_GUIDE_CARD_IDS.boardLength]: "length",
  [VOLUME_GUIDE_CARD_IDS.boardWidth]: "width",
  [VOLUME_GUIDE_CARD_IDS.centerThickness]: "centerThickness",
};

/** What VOLUME's GUIDE reads from the design store — the store's own objects, read only. */
export interface VolumeGuideInput {
  /** The board's outline as the screens draw it (wings placed). */
  outline: OutlineSpec;
  outlineGeometry: OutlineGeometry;
  /** The rails the litres read (thicknesses from the foil when that box is ticked). */
  effectiveRails: RailBandSpec;
  railBands: RailBandsOutput;
  /** VOLUME's own length, width and centre thickness — the drawn board's while importing. */
  effectiveVolume: VolumeSpec;
  volumeResult: VolumeResult;
  /** The litres every screen quotes (`deriveQuotedVolumeLitres`). */
  quotedVolumeLitres: Litres;
  /** Whether Import Designed Board is ticked. */
  importing: boolean;
}

/** The quick estimate's own spec: VOLUME's three numbers and its Board Type, nothing imported. */
function quickSpec(input: VolumeGuideInput): VolumeSpec {
  return { ...input.effectiveVolume, importTemplateDimensions: false, importRailThickness: false };
}

/**
 * Each pushed card's quick-estimate spec — the quick spec with its one field pushed by the page's push
 * amount — and `null` for a card that pushes nothing.
 */
export function volumeGuideVariants(input: VolumeGuideInput, system: UnitsSystem): Record<string, VolumeSpec | null> {
  const push = guidePush(system).volume;
  const base = quickSpec(input);
  const amount = { length: push.length, width: push.width, centerThickness: push.thick };
  const out: Record<string, VolumeSpec | null> = {};
  for (const id of VOLUME_GUIDE_CARD_ORDER) {
    const field = VOLUME_GUIDE_PUSH_FIELDS[id];
    out[id] = field ? { ...base, [field]: mm(base[field] + amount[field]) } : null;
  }
  return out;
}

/** Litres as the page prints a quick estimate: one decimal, the same in both systems. */
const quickLitres = (litres: number) => `${litres.toFixed(1)} L`;
/** A step's litres on Board Type's scale: one decimal, and whole litres from 100 L up, where seven figures with
 * a decimal would run into each other on the narrowest card (the picked step's own label keeps its decimal). */
const stepLitres = (litres: number) => (litres.toFixed(1).length > 4 ? litres.toFixed(0) : litres.toFixed(1));

/** Strip, plan and section frame sizes (UI-SPEC §4: VOLUME strip 60, plan 100, section 110). */
const STRIP_H = 60;
const PLAN_H = 100;
const SECTION_H = 110;
const TYPES_H = 130;
/** A window name's band at the top of a detail, and a dimension label's band under a plan. */
const NAME_BAND = 3 + GUIDE_TEXT_UNITS_MAX + 2;
const DIM_BAND = 6 + GUIDE_HDIM_LABEL_OFF + GUIDE_TEXT_UNITS_MAX + 2;
/** The room kept right of a drawing for a vertical dimension's label. */
const LABEL_GUTTER = 85;

interface PlanOptions {
  /** The plan drawn in muted dashes, the board as it is drawn under it. */
  push?: OutlineGeometry;
  shade?: boolean;
  /** The 51 stations the quoted litres are worked out at. */
  stations?: boolean;
  dims: { length?: boolean; width?: boolean };
}

/** The board from above in a strip, then again in a plan detail under it, nose left. */
function planFigure(
  base: OutlineGeometry,
  opts: PlanOptions,
  nameParts: readonly GuideTextPart[],
  system: UnitsSystem,
): GuideFigure {
  const L = base.length;
  const hw = base.halfWidePointWidth;
  const strip = guideStripFit(L, mm(2 * hw), STRIP_H);
  const box = guideDetailBox(STRIP_H, PLAN_H);
  const longest = Math.max(L, opts.push?.length ?? 0);
  const widest = Math.max(hw, opts.push?.halfWidePointWidth ?? 0);
  const band: GuideBox = { x: box.x + 6, y: box.y, w: box.w - 6 - LABEL_GUTTER, h: box.h };
  const { map, rect } = guideWindowFit({ s0: 0, s1: longest, across: widest }, strip, band, {
    stripHeight: STRIP_H,
    top: NAME_BAND,
    bottom: DIM_BAND,
  });
  // The detail is fitted nose left with the tail at the band's right edge, so a longer push grows toward
  // the nose, as it does on the board.
  const shift = band.x + band.w - guideX(map, 0);
  const detail: GuideMap = { ...map, ox: map.ox + shift };

  const stripPrims: GuidePrim[] = [...guidePlanPrims(base, strip), { kind: "rect", role: "window", ...rect }];
  const prims: GuidePrim[] = [...guidePlanPrims(base, detail, opts.shade ? "shade" : "board", 6)];
  if (opts.stations) {
    for (let i = 1; i < SIMPSON_PANEL_COUNT; i++) {
      const s = (L * i) / SIMPSON_PANEL_COUNT;
      const half = guideHalfWidthAt(base.points, s);
      if (half <= 0) continue;
      const x = guideX(detail, s);
      prims.push({ kind: "line", role: "station", x1: x, y1: guideY(detail, -half), x2: x, y2: guideY(detail, half) });
    }
  }
  if (opts.push) prims.push(...guidePlanPrims(opts.push, detail, "push"));
  if (opts.dims.length) {
    const y = guideY(detail, widest) + 6;
    prims.push(guideHDim(guideX(detail, L), guideX(detail, 0), y, [guideFigure(formatLength(L, system))], false));
  }
  if (opts.dims.width) {
    const x = guideX(detail, 0) + 8;
    const yTop = guideY(detail, -hw);
    const yBot = guideY(detail, hw);
    const xWide = guideX(detail, base.widePointStation);
    prims.push({ kind: "line", role: "extension", x1: xWide, y1: yTop, x2: x + 3, y2: yTop });
    prims.push({ kind: "line", role: "extension", x1: xWide, y1: yBot, x2: x + 3, y2: yBot });
    prims.push(guideVDim(x, yTop, yBot, [guideFigure(formatDim(mm(2 * hw), system))]));
  }
  prims.push(guideWindowName(box, nameParts));
  return { height: STRIP_H + 6 + PLAN_H, strip: stripPrims, windows: [{ box, prims }] };
}

/** The finished centre rail, through RAILS' own functions, at a thickness. */
function centreRail(input: VolumeGuideInput, thickness: Mm, x0: Mm) {
  const output = computeRailSectionOutput("center", { ...input.effectiveRails.center, boardThickness: thickness }, false);
  return { output, rail: finishedRail(output, x0) };
}

/** The board from above with the centre station cut, then the centre cross-section, both rails, in the
 * detail; the `push` thickness in muted dashes over it. */
function sectionFigure(
  input: VolumeGuideInput,
  base: OutlineGeometry,
  opts: { pushThickness?: Mm; weighted?: boolean },
  system: UnitsSystem,
): GuideFigure {
  const L = base.length;
  const hw = base.halfWidePointWidth;
  const T = input.effectiveVolume.centerThickness;
  const tallest = T + guidePush(system).volume.thick;
  const strip = guideStripFit(L, mm(2 * hw), STRIP_H);
  const box = guideDetailBox(STRIP_H, SECTION_H);
  const frame = GUIDE_FRAME.volume;
  const { rect } = guideWindowFit(
    { s0: L / 2 - frame.sectionHalfSpan, s1: L / 2 + frame.sectionHalfSpan, across: hw + frame.sectionAcross },
    strip,
    box,
    { stripHeight: STRIP_H },
  );
  const xCut = guideX(strip, L / 2);
  const halfAtCut = guideHalfWidthAt(base.points, L / 2);
  const stripPrims: GuidePrim[] = [
    ...guidePlanPrims(base, strip),
    { kind: "line", role: "cut", x1: xCut, y1: guideY(strip, -halfAtCut) - 5, x2: xCut, y2: guideY(strip, halfAtCut) + 5 },
    { kind: "rect", role: "window", ...rect },
  ];

  // The section stands on its bottom, true to scale, the width of the band left of the label gutter.
  const bottomY = box.y + box.h - 12;
  const usableW = box.w - 8 - LABEL_GUTTER;
  const k = Math.min(usableW / (2 * hw), (box.h - NAME_BAND - 12 - 4) / tallest);
  const cx = box.x + 8 + hw * k;
  const section: GuideMap = { k, kx: k, ky: -k, ox: cx, oy: bottomY };

  const baseRail = centreRail(input, T, mm(0));
  const x0 = mm(Math.max(baseRail.output.bounds.xAxisMin, -hw));
  const drawn = centreRail(input, T, x0);
  const prims: GuidePrim[] = [
    { kind: "line", role: "baseline", x1: box.x, y1: bottomY, x2: box.x + box.w, y2: bottomY },
    { kind: "path", role: "board", d: guideSectionPath(drawn.rail.samples, hw, section) },
  ];
  if (opts.pushThickness !== undefined) {
    const pushed = centreRail(input, opts.pushThickness, mm(Math.min(x0, centreRail(input, opts.pushThickness, mm(0)).output.bounds.xAxisMin)));
    prims.push({ kind: "path", role: "push", d: guideSectionPath(pushed.rail.samples, hw, section) });
  }
  const xDim = guideX(section, hw) + 8;
  if (opts.weighted) {
    const w = input.volumeResult.weightedThickness;
    const y = guideY(section, w);
    prims.push({ kind: "line", role: "mark", x1: guideX(section, -hw), y1: y, x2: guideX(section, hw) + 4, y2: y });
    prims.push(guideVDim(xDim, bottomY, y, [guideFigure(formatMark(w, system))]));
  } else {
    prims.push({ kind: "line", role: "extension", x1: cx, y1: guideY(section, T), x2: xDim + 3, y2: guideY(section, T) });
    prims.push(guideVDim(xDim, bottomY, guideY(section, T), [guideFigure(formatDim(T, system))]));
  }
  prims.push(guideWindowName(box, [guideText("Center cross-section")]));
  return { height: STRIP_H + 6 + SECTION_H, strip: stripPrims, windows: [{ box, prims }] };
}

/** Board Type's seven steps, Performance to Beefy, with the quick estimate at each. */
function typesFigure(input: VolumeGuideInput, system: UnitsSystem): GuideFigure {
  const spec = quickSpec(input);
  const x0 = 24;
  const x1 = 276;
  const y = 70;
  const prims: GuidePrim[] = [{ kind: "line", role: "board", x1: x0, y1: y, x2: x1, y2: y }];
  const steps = AREA_FACTORS.length;
  for (let i = 0; i < steps; i++) {
    const x = x0 + ((x1 - x0) * i) / (steps - 1);
    const on = i === spec.boardTypeIndex;
    const litres = computeVolume({ ...spec, boardTypeIndex: i }, null, null).volumeLitres;
    prims.push({ kind: "line", role: "board", x1: x, y1: y - (on ? 10 : 5), x2: x, y2: y + 5 });
    prims.push({ kind: "text", role: on ? "value" : "valueMuted", x, y: y + 9, dy: 0.85, parts: [guideFigure(stepLitres(litres))], anchor: "middle" });
    if (on) {
      const anchor = i < 2 ? "start" : i > steps - 3 ? "end" : "middle";
      prims.push({
        kind: "text",
        role: "value",
        x,
        y: y - 14,
        parts: [guideText(`${BOARD_TYPE_LABELS[i]} · `), guideFigure(quickLitres(litres))],
        anchor,
      });
    }
  }
  prims.push({ kind: "text", role: "name", x: x0, y: 30, parts: [guideText("Performance")], anchor: "start" });
  prims.push({ kind: "text", role: "name", x: x1, y: 30, parts: [guideText("Beefy")], anchor: "end" });
  prims.push({ kind: "text", role: "note", x: 150, y: 106, parts: [guideText("Quick estimate, in litres, for")], anchor: "middle" });
  prims.push({
    kind: "text",
    role: "note",
    x: 150,
    y: 122,
    parts: [
      guideFigure(formatLength(spec.length, system)),
      guideText(" × "),
      guideFigure(formatDim(spec.width, system)),
      guideText(" × "),
      guideFigure(formatDim(spec.centerThickness, system)),
    ],
    anchor: "middle",
  });
  return { height: TYPES_H, strip: prims, windows: [] };
}

/** A pushed card's caption: the pushed figure, then the quick estimate's litres. */
function pushCaption(figure: string, litres: number): GuideCaption {
  return {
    kind: "dashed",
    parts: [guideFigure(figure), guideText(" → "), guideFigure(quickLitres(litres)), guideText(" quick estimate")],
  };
}

const valueTag = (text: string): GuideTag => ({ kind: "value", text });

/** The plan at VOLUME's own length and width — the drawn board itself while importing. */
export function volumeGuidePlan(input: VolumeGuideInput, length: Mm, width: Mm): OutlineGeometry {
  return buildOutline({ ...input.outline, length, widePointWidth: width });
}

/** VOLUME's eight cards for the open board, in the words page's order. */
export function buildVolumeGuide(input: VolumeGuideInput, system: UnitsSystem): GuidePageBuild {
  const ids = VOLUME_GUIDE_CARD_IDS;
  const v = input.effectiveVolume;
  const r = input.volumeResult;
  const variants = volumeGuideVariants(input, system);
  const base = volumeGuidePlan(input, v.length, v.width);
  const litresOf = (id: string) => computeVolume(variants[id]!, null, null).volumeLitres;
  const lengthVariant = variants[ids.boardLength]!;
  const widthVariant = variants[ids.boardWidth]!;
  const thickVariant = variants[ids.centerThickness]!;
  const plan = (nameParts: readonly GuideTextPart[], opts: PlanOptions) => planFigure(base, opts, nameParts, system);
  const planName = [guideText("Plan, from above")];
  const sectionsName = [guideText(`${SIMPSON_PANEL_COUNT + 1} cross-sections`)];

  const cards: GuideCardModel[] = [
    {
      id: ids.importDesignedBoard,
      tag: input.importing ? { kind: "on", text: "On this board" } : GUIDE_NO_TAG,
      caption: GUIDE_NO_CAPTION,
      figure: plan(sectionsName, { stations: true, dims: { length: true, width: true } }),
    },
    {
      id: ids.boardLength,
      tag: valueTag(formatLength(v.length, system)),
      caption: pushCaption(formatLength(lengthVariant.length, system), litresOf(ids.boardLength)),
      figure: plan(planName, { push: volumeGuidePlan(input, lengthVariant.length, v.width), dims: { length: true } }),
    },
    {
      id: ids.boardWidth,
      tag: valueTag(formatDim(v.width, system)),
      caption: pushCaption(formatDim(widthVariant.width, system), litresOf(ids.boardWidth)),
      figure: plan(planName, { push: volumeGuidePlan(input, v.length, widthVariant.width), dims: { width: true } }),
    },
    {
      id: ids.centerThickness,
      tag: valueTag(formatDim(v.centerThickness, system)),
      caption: pushCaption(formatDim(thickVariant.centerThickness, system), litresOf(ids.centerThickness)),
      figure: sectionFigure(input, base, { pushThickness: thickVariant.centerThickness }, system),
    },
    {
      id: ids.boardType,
      tag: valueTag(BOARD_TYPE_LABELS[v.boardTypeIndex] ?? ""),
      caption: GUIDE_NO_CAPTION,
      figure: typesFigure(input, system),
    },
    {
      id: ids.estimatedVolume,
      // The litres every screen quotes, as the ESTIMATE card prints them (D-03) — never the quick estimate.
      tag: valueTag(`${input.quotedVolumeLitres.toFixed(2)} L`),
      caption: GUIDE_NO_CAPTION,
      figure: plan(sectionsName, { stations: true, dims: {} }),
    },
    {
      id: ids.templateArea,
      // The name follows Import Designed Board, as the ESTIMATE card labels the row.
      name: r.importingTemplate ? "Template Area" : "Board Area (estimated)",
      tag: valueTag(formatArea(r.area, system)),
      caption: GUIDE_NO_CAPTION,
      figure: plan(planName, { shade: true, dims: { length: true, width: true } }),
    },
    {
      id: ids.weightedThickness,
      name: r.geomReady ? "Length-Weighted Effective Thickness" : "Weighted Thickness",
      tag: valueTag(formatMark(r.weightedThickness, system)),
      caption: GUIDE_NO_CAPTION,
      figure: sectionFigure(input, base, { weighted: true }, system),
    },
  ];
  return new Map(cards.map((card) => [card.id, card]));
}
