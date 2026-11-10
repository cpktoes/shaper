import { describe, expect, it } from "vitest";
import { guideVolumeInput } from "./__fixtures__/guide-volume-input";
import { guideCaptionText, GUIDE_VIEWBOX_WIDTH } from "./guide-card";
import { guideFigureBounds, guideLabelOverlaps } from "./guide-draw";
import { guidePush } from "./guide-push";
import {
  buildVolumeGuide,
  VOLUME_GUIDE_CARD_IDS,
  VOLUME_GUIDE_CARD_ORDER,
  VOLUME_GUIDE_PUSH_FIELDS,
  volumeGuidePlan,
  volumeGuideVariants,
} from "./guide-volume";
import { formatArea, formatDim, formatLength, formatMark } from "./measure-display";
import { inchesToMm, mm, UNITS_SYSTEMS } from "./units";
import { BOARD_TYPE_LABELS, computeVolume, type VolumeSpec } from "./volume";

const shortboard = guideVolumeInput("shortboard");
const ids = VOLUME_GUIDE_CARD_IDS;

describe("buildVolumeGuide — the Shortboard as its card opens it", () => {
  it("gives the eight cards in the words page's order", () => {
    expect([...buildVolumeGuide(shortboard, "imperial").keys()]).toEqual(VOLUME_GUIDE_CARD_ORDER);
    expect(VOLUME_GUIDE_CARD_ORDER).toHaveLength(8);
  });

  it("tags Estimated Volume with the store's quoted litres to two decimals — never the quick estimate (D-03)", () => {
    for (const system of UNITS_SYSTEMS) {
      const card = buildVolumeGuide(shortboard, system).get(ids.estimatedVolume)!;
      expect(card.tag).toEqual({ kind: "value", text: `${shortboard.quotedVolumeLitres.toFixed(2)} L` });
      expect(card.tag.text).not.toBe(`${shortboard.volumeResult.volumeLitres.toFixed(2)} L`);
    }
  });

  it("tags every input as VOLUME's own controls read it", () => {
    for (const system of UNITS_SYSTEMS) {
      const cards = buildVolumeGuide(shortboard, system);
      const v = shortboard.effectiveVolume;
      expect(cards.get(ids.importDesignedBoard)!.tag).toEqual({ kind: "on", text: "On this board" });
      expect(cards.get(ids.boardLength)!.tag.text).toBe(formatLength(v.length, system));
      expect(cards.get(ids.boardWidth)!.tag.text).toBe(formatDim(v.width, system));
      expect(cards.get(ids.centerThickness)!.tag.text).toBe(formatDim(v.centerThickness, system));
      expect(cards.get(ids.boardType)!.tag.text).toBe(BOARD_TYPE_LABELS[v.boardTypeIndex]);
      expect(cards.get(ids.templateArea)!.tag.text).toBe(formatArea(shortboard.volumeResult.area, system));
      expect(cards.get(ids.weightedThickness)!.tag.text).toBe(formatMark(shortboard.volumeResult.weightedThickness, system));
    }
  });

  it("pushes exactly one quick-estimate field per pushed card; the rest of the spec is identical", () => {
    for (const system of UNITS_SYSTEMS) {
      const variants = volumeGuideVariants(shortboard, system);
      const base: VolumeSpec = { ...shortboard.effectiveVolume, importTemplateDimensions: false, importRailThickness: false };
      const push = guidePush(system).volume;
      const amount = { length: push.length, width: push.width, centerThickness: push.thick };
      for (const id of VOLUME_GUIDE_CARD_ORDER) {
        const field = VOLUME_GUIDE_PUSH_FIELDS[id];
        const variant = variants[id];
        if (!field) {
          expect(variant, id).toBeNull();
          continue;
        }
        expect(variant, id).not.toBeNull();
        expect({ ...variant!, [field]: base[field] }, id).toEqual(base);
        expect(variant![field], id).toBeCloseTo(base[field] + amount[field], 9);
      }
    }
  });

  it("captions each push with its pushed figure and the litres computeVolume gives that variant", () => {
    for (const system of UNITS_SYSTEMS) {
      const cards = buildVolumeGuide(shortboard, system);
      const variants = volumeGuideVariants(shortboard, system);
      const read = { length: formatLength, width: formatDim, centerThickness: formatDim };
      for (const [id, field] of Object.entries(VOLUME_GUIDE_PUSH_FIELDS)) {
        const variant = variants[id]!;
        const litres = computeVolume(variant, null, null).volumeLitres;
        expect(guideCaptionText(cards.get(id)!.caption), id).toBe(
          `dashed · ${read[field](variant[field], system)} → ${litres.toFixed(1)} L quick estimate`,
        );
      }
    }
  });

  it("reads Board Length's caption in Imperial as the length plus six inches, and in Metric with no inch mark", () => {
    const imperial = guideCaptionText(buildVolumeGuide(shortboard, "imperial").get(ids.boardLength)!.caption);
    expect(imperial.startsWith(`dashed · ${formatLength(mm(shortboard.effectiveVolume.length + inchesToMm(6)), "imperial")} → `)).toBe(true);
    for (const card of buildVolumeGuide(shortboard, "metric").values()) {
      const text = `${card.tag.text} ${guideCaptionText(card.caption)}`;
      expect(text, card.id).not.toMatch(/["″]|\d'/);
    }
  });

  it("draws no caption on the five cards that push nothing", () => {
    const cards = buildVolumeGuide(shortboard, "imperial");
    for (const id of [ids.importDesignedBoard, ids.boardType, ids.estimatedVolume, ids.templateArea, ids.weightedThickness]) {
      expect(cards.get(id)!.caption.kind, id).toBe("none");
    }
  });

  it("draws the plan at VOLUME's own length and width, which is the drawn board itself while importing", () => {
    const plan = volumeGuidePlan(shortboard, shortboard.effectiveVolume.length, shortboard.effectiveVolume.width);
    expect(plan.points).toEqual(shortboard.outlineGeometry.points);
  });

  it("draws three pushes in muted dashes and every drawing inside its own 300-wide box", () => {
    for (const system of UNITS_SYSTEMS) {
      for (const card of buildVolumeGuide(shortboard, system).values()) {
        const prims = [...card.figure.strip, ...card.figure.windows.flatMap((w) => w.prims)];
        const pushes = prims.filter((p) => p.kind === "path" && p.role === "push");
        expect(pushes.length, card.id).toBe(VOLUME_GUIDE_PUSH_FIELDS[card.id] ? 1 : 0);
        const b = guideFigureBounds(card.figure);
        for (const n of [b.x, b.y, b.w, b.h]) expect(Number.isFinite(n), card.id).toBe(true);
        expect(b.x, card.id).toBeGreaterThanOrEqual(0);
        expect(b.y, card.id).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w, card.id).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
        expect(b.y + b.h, card.id).toBeLessThanOrEqual(card.figure.height);
      }
    }
  });

  it("keeps every label clear of the others and inside its window, on the narrowest card and an upright phone", () => {
    for (const system of UNITS_SYSTEMS) {
      for (const card of buildVolumeGuide(shortboard, system).values()) {
        for (const fit of [0.7, 0.79, 1.26]) expect(guideLabelOverlaps(card.figure, fit), `${card.id} ${system} ${fit}`).toEqual([]);
      }
    }
  });
});

describe("buildVolumeGuide — on the other presets and with Import Designed Board unticked", () => {
  it("draws every preset without a collision or a figure outside its box", () => {
    for (const id of ["fish", "midlength", "longboard"] as const) {
      const input = guideVolumeInput(id);
      for (const card of buildVolumeGuide(input, "imperial").values()) {
        expect(guideLabelOverlaps(card.figure, 0.7), `${id} ${card.id}`).toEqual([]);
        const b = guideFigureBounds(card.figure);
        expect(b.x + b.w, `${id} ${card.id}`).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
      }
    }
  });

  it("unticked: no tag on Import Designed Board, the names follow the ESTIMATE card, the quick figure is quoted", () => {
    const input = guideVolumeInput("shortboard", { importTemplateDimensions: false, importRailThickness: false });
    const cards = buildVolumeGuide(input, "imperial");
    expect(cards.get(ids.importDesignedBoard)!.tag.kind).toBe("none");
    expect(cards.get(ids.templateArea)!.name).toBe("Board Area (estimated)");
    expect(cards.get(ids.weightedThickness)!.name).toBe("Weighted Thickness");
    expect(cards.get(ids.estimatedVolume)!.tag.text).toBe(`${input.volumeResult.volumeLitres.toFixed(2)} L`);
    expect(cards.get(ids.boardLength)!.tag.text).toBe(formatLength(input.effectiveVolume.length, "imperial"));
  });
});

describe("buildVolumeGuide — a very big board", () => {
  it("keeps Board Type's seven litres figures clear of each other at 100 L and over", () => {
    const big = guideVolumeInput("longboard", {
      length: inchesToMm(120),
      width: inchesToMm(25),
      centerThickness: inchesToMm(5),
      importTemplateDimensions: false,
      importRailThickness: false,
    });
    for (const system of UNITS_SYSTEMS) {
      const card = buildVolumeGuide(big, system).get(ids.boardType)!;
      const spec = { ...big.effectiveVolume, importTemplateDimensions: false, importRailThickness: false };
      const litres = BOARD_TYPE_LABELS.map((_, i) => computeVolume({ ...spec, boardTypeIndex: i }, null, null).volumeLitres);
      expect(Math.max(...litres)).toBeGreaterThan(100);
      for (const fit of [0.7, 0.79, 1.26]) expect(guideLabelOverlaps(card.figure, fit), `${system} at ${fit}`).toEqual([]);
    }
  });
});
