import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "./presets";
import { buildOutline } from "./outline";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "./rail-bands";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "./foil";
import { computeVolume, DEFAULT_VOLUME_SPEC } from "./volume";
import { inchesToMm, mm } from "./units";
import {
  deriveEffectiveRails,
  deriveEffectiveVolume,
  deriveRailValues,
  deriveTemplateValues,
  summarizeDesign,
} from "./design";

// summarizeDesign's tests below all pass railsImportFoilThickness: false so they keep exercising
// the rack card's rail-thickness reporting exactly as before this plan — the link's own behaviour
// (foil driving the bands) is covered directly by the deriveEffectiveRails suite further down.
describe("summarizeDesign", () => {
  it.each(BOARD_PRESETS)("$id: reports the outline's own length and widepoint width unchanged", (preset) => {
    const summary = summarizeDesign({
      outline: preset.outline,
      rails: preset.rails,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: false,
      volume: DEFAULT_VOLUME_SPEC,
    });
    expect(summary.length).toBe(preset.outline.length);
    expect(summary.widePointWidth).toBe(preset.outline.widePointWidth);
  });

  it.each(BOARD_PRESETS)("$id: reports the centre section's board thickness", (preset) => {
    const summary = summarizeDesign({
      outline: preset.outline,
      rails: preset.rails,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: false,
      volume: DEFAULT_VOLUME_SPEC,
    });
    expect(summary.centerThickness).toBe(preset.rails.center.boardThickness);
  });

  it.each(BOARD_PRESETS)("$id: returns a finite, positive litres figure", (preset) => {
    const summary = summarizeDesign({
      outline: preset.outline,
      rails: preset.rails,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: false,
      volume: DEFAULT_VOLUME_SPEC,
    });
    expect(Number.isFinite(summary.volumeLitres)).toBe(true);
    expect(summary.volumeLitres).toBeGreaterThan(0);
  });

  it.each(BOARD_PRESETS)("$id: with the link on, reports the foil's own centre thickness instead of the rails spec's", (preset) => {
    const distinctFoil: FoilSpec = { ...DEFAULT_FOIL_SPEC, center: mm(preset.rails.center.boardThickness + inchesToMm(1)) };
    const summary = summarizeDesign({
      outline: preset.outline,
      rails: preset.rails,
      foil: distinctFoil,
      railsImportFoilThickness: true,
      volume: DEFAULT_VOLUME_SPEC,
    });
    expect(summary.centerThickness).toBe(distinctFoil.center);
    expect(summary.centerThickness).not.toBe(preset.rails.center.boardThickness);
  });
});

// New cases per PLAN.md's <behavior>: pins the three-station mapping (D-09's planner note) and
// proves the rocker line has no way to reach a rail band number (D-11 — deriveEffectiveRails takes
// no rocker argument at all, so there is nothing rocker-shaped for this suite to even pass in).
describe("deriveEffectiveRails", () => {
  const DISTINCT_FOIL: FoilSpec = {
    noseTip: mm(10),
    nose12: mm(35),
    center: mm(65),
    tail12: mm(42),
    tailTip: mm(8),
  };

  it.each(BOARD_PRESETS)("$id: with the link on, maps foil.nose12/center/tail12 onto the three sections' boardThickness", (preset) => {
    const result = deriveEffectiveRails(preset.rails, DISTINCT_FOIL, true);
    expect(result.nose.boardThickness).toBe(DISTINCT_FOIL.nose12);
    expect(result.center.boardThickness).toBe(DISTINCT_FOIL.center);
    expect(result.tail.boardThickness).toBe(DISTINCT_FOIL.tail12);
  });

  it.each(BOARD_PRESETS)("$id: with the link on, neither foil.noseTip nor foil.tailTip appears anywhere in the returned spec", (preset) => {
    const result = deriveEffectiveRails(preset.rails, DISTINCT_FOIL, true);
    const values = [
      result.nose.boardThickness,
      result.center.boardThickness,
      result.tail.boardThickness,
    ];
    expect(values).not.toContain(DISTINCT_FOIL.noseTip);
    expect(values).not.toContain(DISTINCT_FOIL.tailTip);
  });

  it.each(BOARD_PRESETS)("$id: with the link off, the input spec is returned unchanged", (preset) => {
    const result = deriveEffectiveRails(preset.rails, DISTINCT_FOIL, false);
    expect(result.nose.boardThickness).toBe(preset.rails.nose.boardThickness);
    expect(result.center.boardThickness).toBe(preset.rails.center.boardThickness);
    expect(result.tail.boardThickness).toBe(preset.rails.tail.boardThickness);
  });

  it.each(BOARD_PRESETS)(
    "$id: every non-thickness field is identical in and out, with the link on or off",
    (preset) => {
      for (const linked of [true, false]) {
        const result = deriveEffectiveRails(preset.rails, DISTINCT_FOIL, linked);
        for (const key of ["nose", "center", "tail"] as const) {
          expect(result[key].deckPercent).toBe(preset.rails[key].deckPercent);
          expect(result[key].family).toBe(preset.rails[key].family);
          expect(result[key].ratioTopPercent).toBe(preset.rails[key].ratioTopPercent);
          expect(result[key].symmetrical).toBe(preset.rails[key].symmetrical);
          expect(result[key].cornerCutOffsetOverride).toBe(preset.rails[key].cornerCutOffsetOverride);
          expect(result[key].removeCornerCut).toBe(preset.rails[key].removeCornerCut);
          expect(result[key].singleTuck).toBe(preset.rails[key].singleTuck);
          expect(result[key].bottomTuck3Override).toBe(preset.rails[key].bottomTuck3Override);
        }
        expect(result.tailHardEdge).toBe(preset.rails.tailHardEdge);
      }
    },
  );

  it("the input spec object is not mutated by either branch", () => {
    const original: RailBandSpec = JSON.parse(JSON.stringify(DEFAULT_RAIL_BAND_SPEC));
    deriveEffectiveRails(DEFAULT_RAIL_BAND_SPEC, DISTINCT_FOIL, true);
    deriveEffectiveRails(DEFAULT_RAIL_BAND_SPEC, DISTINCT_FOIL, false);
    expect(DEFAULT_RAIL_BAND_SPEC).toEqual(original);
  });

  it("feeding DEFAULT_RAIL_BAND_SPEC and DEFAULT_FOIL_SPEC with the link on returns a spec deep-equal to DEFAULT_RAIL_BAND_SPEC", () => {
    const result = deriveEffectiveRails(DEFAULT_RAIL_BAND_SPEC, DEFAULT_FOIL_SPEC, true);
    expect(result).toEqual(DEFAULT_RAIL_BAND_SPEC);
  });

  it.each(BOARD_PRESETS)(
    "$id: computeRailBands(deriveEffectiveRails(...)) changes with foil.center and is untouched by a rocker-only change (structurally: the function takes no rocker argument)",
    (preset) => {
      const baseline = computeRailBands(deriveEffectiveRails(preset.rails, DEFAULT_FOIL_SPEC, true));
      const changedCenter = computeRailBands(
        deriveEffectiveRails(preset.rails, { ...DEFAULT_FOIL_SPEC, center: mm(DEFAULT_FOIL_SPEC.center + inchesToMm(1)) }, true),
      );
      expect(changedCenter.center.result.thickness).not.toBe(baseline.center.result.thickness);

      // deriveEffectiveRails has no rocker parameter to pass a changed rocker value through, so
      // calling it identically twice (as any rocker-only edit would leave every argument here)
      // always reproduces the identical band numbers — the structural proof D-11 asks for.
      const repeated = computeRailBands(deriveEffectiveRails(preset.rails, DEFAULT_FOIL_SPEC, true));
      expect(repeated).toEqual(baseline);
    },
  );
});

// Direct unit tests for the three derive*() functions RESEARCH.md's Validation Architecture
// flagged as exercised only transitively (through summarizeDesign above), where a wrong field
// mapping inside any one of them could be cancelled out by the composition and never noticed.

describe("deriveTemplateValues", () => {
  it.each(BOARD_PRESETS)("$id: maps the geometry's own area/width fields, not a recomputed copy", (preset) => {
    const geometry = buildOutline(preset.outline);
    const result = deriveTemplateValues(preset.outline, geometry);

    expect(result.area).toBe(geometry.area);
    expect(result.length).toBe(preset.outline.length);
    expect(result.widePointWidth).toBe(preset.outline.widePointWidth);
    expect(result.noseWidthAt12).toBe(geometry.noseWidthAt12in);
    expect(result.tailWidthAt12).toBe(geometry.tailWidthAt12in);
  });
});

describe("deriveRailValues", () => {
  it.each(BOARD_PRESETS)("$id: maps each of the six fields to the matching nose/center/tail boardThickness and profile", (preset) => {
    const railBands = computeRailBands(preset.rails);
    const result = deriveRailValues(railBands);

    expect(result.noseThickness).toBe(railBands.nose.boardThickness);
    expect(result.centerThickness).toBe(railBands.center.boardThickness);
    expect(result.tailThickness).toBe(railBands.tail.boardThickness);
    expect(result.noseProfile).toBe(railBands.nose.profile);
    expect(result.centerProfile).toBe(railBands.center.profile);
    expect(result.tailProfile).toBe(railBands.tail.profile);
  });
});

describe("deriveEffectiveVolume", () => {
  it.each(BOARD_PRESETS)(
    "$id: importTemplateDimensions off returns the volume spec unchanged, regardless of importRailThickness",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, geometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));

      for (const importRailThickness of [false, true]) {
        const volume = { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: false, importRailThickness };
        const effective = deriveEffectiveVolume(volume, templateValues, railValues);
        expect(effective.length).toBe(volume.length);
        expect(effective.width).toBe(volume.width);
        expect(effective.centerThickness).toBe(volume.centerThickness);
      }
    },
  );

  it.each(BOARD_PRESETS)(
    "$id: importTemplateDimensions on takes length/width from the template, and centerThickness from rail values only when importRailThickness is also on",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, geometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));

      const withoutRailThickness = deriveEffectiveVolume(
        { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness: false },
        templateValues,
        railValues,
      );
      expect(withoutRailThickness.length).toBe(templateValues.length);
      expect(withoutRailThickness.width).toBe(templateValues.widePointWidth);
      expect(withoutRailThickness.centerThickness).toBe(DEFAULT_VOLUME_SPEC.centerThickness);

      const withRailThickness = deriveEffectiveVolume(
        { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness: true },
        templateValues,
        railValues,
      );
      expect(withRailThickness.length).toBe(templateValues.length);
      expect(withRailThickness.width).toBe(templateValues.widePointWidth);
      expect(withRailThickness.centerThickness).toBe(railValues.centerThickness);
    },
  );
});

describe("live-recompute invariant (VOL-01)", () => {
  it.each(BOARD_PRESETS)(
    "$id: widening the widepoint width and leaving everything else alone increases the litres figure the full pipeline produces",
    (preset) => {
      const narrower = summarizeDesign({
        outline: preset.outline,
        rails: preset.rails,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: false,
        volume: DEFAULT_VOLUME_SPEC,
      });
      const widerOutline = {
        ...preset.outline,
        widePointWidth: mm(preset.outline.widePointWidth + inchesToMm(2)),
      };
      const wider = summarizeDesign({
        outline: widerOutline,
        rails: preset.rails,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: false,
        volume: DEFAULT_VOLUME_SPEC,
      });

      expect(wider.volumeLitres).not.toBe(narrower.volumeLitres);
      expect(wider.volumeLitres).toBeGreaterThan(narrower.volumeLitres);
    },
  );
});

describe("computeVolume method disclosure (transparency prohibition)", () => {
  it.each(BOARD_PRESETS)(
    "$id: templateAvailable and importingTemplate reflect whether the drawn outline's area is being used",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, geometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));

      const importingOn = computeVolume(
        { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true },
        templateValues,
        railValues,
      );
      const importingOff = computeVolume(
        { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: false },
        templateValues,
        railValues,
      );

      // The drawn outline's area is available either way — a real OutlineGeometry was built...
      expect(importingOn.templateAvailable).toBe(true);
      expect(importingOff.templateAvailable).toBe(true);
      // ...but only the toggle determines whether the litres figure actually used it, which is
      // the flag the Volume card reads to disclose which method produced the number.
      expect(importingOn.importingTemplate).toBe(true);
      expect(importingOff.importingTemplate).toBe(false);
    },
  );
});
