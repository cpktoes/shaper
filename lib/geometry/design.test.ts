import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "./presets";
import { buildOutline } from "./outline";
import { computeRailBands } from "./rail-bands";
import { computeVolume, DEFAULT_VOLUME_SPEC } from "./volume";
import { inchesToMm, mm } from "./units";
import { deriveEffectiveVolume, deriveRailValues, deriveTemplateValues, summarizeDesign } from "./design";

describe("summarizeDesign", () => {
  it.each(BOARD_PRESETS)("$id: reports the outline's own length and widepoint width unchanged", (preset) => {
    const summary = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
    expect(summary.length).toBe(preset.outline.length);
    expect(summary.widePointWidth).toBe(preset.outline.widePointWidth);
  });

  it.each(BOARD_PRESETS)("$id: reports the centre section's board thickness", (preset) => {
    const summary = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
    expect(summary.centerThickness).toBe(preset.rails.center.boardThickness);
  });

  it.each(BOARD_PRESETS)("$id: returns a finite, positive litres figure", (preset) => {
    const summary = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
    expect(Number.isFinite(summary.volumeLitres)).toBe(true);
    expect(summary.volumeLitres).toBeGreaterThan(0);
  });
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
      const narrower = summarizeDesign({ outline: preset.outline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });
      const widerOutline = {
        ...preset.outline,
        widePointWidth: mm(preset.outline.widePointWidth + inchesToMm(2)),
      };
      const wider = summarizeDesign({ outline: widerOutline, rails: preset.rails, volume: DEFAULT_VOLUME_SPEC });

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
