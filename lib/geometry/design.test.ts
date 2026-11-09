import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT, type BoardBlank } from "./blank";
import { prepareBlank } from "./blank-fit";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import { buildBoardProfile } from "./board-profile";
import { railBlendArea, sectionFinishedRail } from "./finished-rail";
import { BOARD_PRESETS } from "./presets";
import { presetSummary } from "./summary-line";
import { buildOutline, foamHalfWidth, outlinePlanArea, sampleOutline } from "./outline";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "./rail-bands";
import { DEFAULT_FALLBACK_ROCKER, type FiveStationRocker } from "./rocker";
import { DEFAULT_FOIL_SPEC, foilStationPoints, type FoilSpec } from "./foil";
import { computeCrossSectionVolume, computeVolume, DEFAULT_VOLUME_SPEC } from "./volume";
import { inchesToMm, mm, type Mm } from "./units";
import { phase16FinCases } from "./__fixtures__/phase16-fin-cases";
import bottomGolden from "./__fixtures__/bottom-golden.json";
import { phase16Boards, phase16SurfaceBoards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_FLOOR,
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  foamOff,
  refAt,
  resolveBottom,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
} from "./bottom";
import { recordedPresetDesignFields } from "./__fixtures__/phase14-preset-blanks";
import { computeFinPlacement, frontFinStation } from "./fins";
import {
  crossSectionFoam,
  designCrossSectionInput,
  deriveEffectiveRails,
  deriveEffectiveVolume,
  deriveQuotedVolumeLitres,
  deriveRailValues,
  deriveTemplateValues,
  designBottomBoard,
  designFinPlacement,
  designSideProfile,
  bottomRailLift,
  LIVE_DESIGN_RULES,
  railAnchorStations,
  railsOnTheBottom,
  summarizeDesign,
  summarizeDesignWith,
  type DesignSummaryFields,
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

  it("summarizeDesign is summarizeDesignWith on the live rules, for the presets and the first board a visitor sees", () => {
    // The presets as applyPreset builds them (presetSummary's fields), and the store's default board
    // (DEFAULT_DESIGN_STATE: the default outline, rails, foil and hand-set rocker, no blank).
    const boards: DesignSummaryFields[] = [
      ...BOARD_PRESETS.map((preset) => ({
        ...presetDesignFields(preset),
        railsImportFoilThickness: true,
        volume: DEFAULT_VOLUME_SPEC,
      })),
      {
        outline: DEFAULT_BOARD_SPEC.outline,
        rails: DEFAULT_RAIL_BAND_SPEC,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: true,
        volume: DEFAULT_VOLUME_SPEC,
        rocker: DEFAULT_FALLBACK_ROCKER,
        blank: null,
      },
    ];
    expect(boards).toHaveLength(BOARD_PRESETS.length + 1);
    for (const fields of boards) {
      expect(summarizeDesign(fields)).toEqual(summarizeDesignWith(fields, { prepare: prepareBlank }));
    }
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
          expect(result[key].sharpBottomTuck).toBe(preset.rails[key].sharpBottomTuck);
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
  it.each(BOARD_PRESETS)("$id: maps the drawn outline's area (tail cut included) and the geometry's own width fields, not a recomputed copy", (preset) => {
    const geometry = buildOutline(preset.outline);
    const result = deriveTemplateValues(preset.outline, geometry);

    expect(result.area).toBe(outlinePlanArea(geometry));
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

  // One basis (quick 261102-gec plan 03, the founder's D-V1, PV2/PV5): VOLUME's working rows read the same
  // finished rail the quoted litres do, through the same helper.
  it.each(BOARD_PRESETS)("$id: carries each section's own finished-rail blend area (one rail)", (preset) => {
    const railBands = computeRailBands(preset.rails);
    const result = deriveRailValues(railBands);
    for (const key of ["nose", "center", "tail"] as const) {
      const expected = railBlendArea(sectionFinishedRail(railBands[key].result, railBands[key].domed));
      expect(expected).toBeGreaterThan(0);
      expect(result[`${key}BlendArea`]).toBe(expected);
    }
  });

  it.each(BOARD_PRESETS)(
    "$id: each Cross-Section Thickness row is lower than on the cut rail by exactly its blend area over the station's half width",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, geometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));
      const cutOnly = { ...railValues, noseBlendArea: 0, centerBlendArea: 0, tailBlendArea: 0 };
      const spec = { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness: true };
      const finished = computeVolume(spec, templateValues, railValues);
      const cut = computeVolume(spec, templateValues, cutOnly);
      expect(finished.geomReady).toBe(true);
      const rows = [
        ["tail", finished.tailCrossSectionThickness, cut.tailCrossSectionThickness, templateValues.tailWidthAt12],
        ["center", finished.centerCrossSectionThickness, cut.centerCrossSectionThickness, templateValues.widePointWidth],
        ["nose", finished.noseCrossSectionThickness, cut.noseCrossSectionThickness, templateValues.noseWidthAt12],
      ] as const;
      for (const [key, finishedRow, cutRow, width] of rows) {
        const drop = (railValues[`${key}BlendArea`] ?? 0) / (width / 2);
        expect(drop).toBeGreaterThan(0);
        expect(Math.abs((cutRow as number) - (finishedRow as number) - drop), key).toBeLessThan(1e-9);
      }
      expect(finished.volumeLitres).toBeLessThan(cut.volumeLitres);
    },
  );
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
    "$id: importTemplateDimensions on takes length/width from the template and centerThickness from the rails, whatever the stored importRailThickness (one box, quick 261017-vdh)",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, geometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));

      for (const importRailThickness of [false, true]) {
        const effective = deriveEffectiveVolume(
          { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness },
          templateValues,
          railValues,
        );
        expect(effective.length).toBe(templateValues.length);
        expect(effective.width).toBe(templateValues.widePointWidth);
        expect(effective.centerThickness).toBe(railValues.centerThickness);
        expect(effective.importRailThickness).toBe(true);
      }
    },
  );

  it.each(BOARD_PRESETS)(
    "$id: a board saved in the retired in-between state computes as importing rail data too",
    (preset) => {
      const geometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, geometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));
      const inBetween = { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness: false };

      const result = computeVolume(deriveEffectiveVolume(inBetween, templateValues, railValues), templateValues, railValues);
      expect(result.importingTemplate).toBe(true);
      expect(result.importingRailThickness).toBe(true);
    },
  );

  it.each(BOARD_PRESETS)(
    "$id: summarizeDesign quotes the same litres for the in-between board as for the same board with both flags on",
    (preset) => {
      const base = {
        outline: preset.outline,
        rails: preset.rails,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: false,
      };
      const inBetween = summarizeDesign({
        ...base,
        volume: { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness: false },
      });
      const bothOn = summarizeDesign({
        ...base,
        volume: { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: true, importRailThickness: true },
      });
      expect(inBetween.volumeLitres).toBe(bothOn.volumeLitres);
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

// New cases per PLAN.md's <behavior> (04-04 Task 2): deriveQuotedVolumeLitres is the one rule
// deciding which of the two litres figures the app quotes (D-13, threat T-04-11), and
// summarizeDesign must run the identical rule so a rack card's litres can never disagree with the
// Volume screen's.
describe("deriveQuotedVolumeLitres", () => {
  it.each(BOARD_PRESETS)(
    "$id: returns the cross-section figure when the board is importing its template dimensions",
    (preset) => {
      const outlineGeometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, outlineGeometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));
      const effectiveVolume = deriveEffectiveVolume(DEFAULT_VOLUME_SPEC, templateValues, railValues);
      const estimator = computeVolume(effectiveVolume, templateValues, railValues);
      const crossSection = computeCrossSectionVolume({
        ...crossSectionFoam(outlineGeometry),
        foil: DEFAULT_FOIL_SPEC,
        rails: preset.rails,
        length: preset.outline.length,
      });

      const quoted = deriveQuotedVolumeLitres(estimator, crossSection, true);
      expect(quoted).toBe(crossSection.volumeLitres);
      expect(quoted).not.toBe(estimator.volumeLitres);
    },
  );

  it.each(BOARD_PRESETS)(
    "$id: returns the estimator's figure when the board is not importing its template dimensions",
    (preset) => {
      const outlineGeometry = buildOutline(preset.outline);
      const templateValues = deriveTemplateValues(preset.outline, outlineGeometry);
      const railValues = deriveRailValues(computeRailBands(preset.rails));
      const crossSection = computeCrossSectionVolume({
        ...crossSectionFoam(outlineGeometry),
        foil: DEFAULT_FOIL_SPEC,
        rails: preset.rails,
        length: preset.outline.length,
      });
      const estimatorSpec = { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: false };
      const effectiveVolume = deriveEffectiveVolume(estimatorSpec, templateValues, railValues);
      const estimator = computeVolume(effectiveVolume, templateValues, railValues);

      const quoted = deriveQuotedVolumeLitres(estimator, crossSection, false);
      expect(quoted).toBe(estimator.volumeLitres);
      expect(quoted).not.toBe(crossSection.volumeLitres);
    },
  );
});

describe("summarizeDesign volume disclosure (D-13) — a rack card and the Volume screen cannot disagree", () => {
  it.each(BOARD_PRESETS)("$id: matches deriveQuotedVolumeLitres for the identical full snapshot", (preset) => {
    const fields = {
      outline: preset.outline,
      rails: preset.rails,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: false,
      volume: DEFAULT_VOLUME_SPEC,
    };
    const summary = summarizeDesign(fields);

    const outlineGeometry = buildOutline(fields.outline);
    const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
    const railValues = deriveRailValues(computeRailBands(fields.rails));
    const effectiveVolume = deriveEffectiveVolume(fields.volume, templateValues, railValues);
    const estimator = computeVolume(effectiveVolume, templateValues, railValues);
    const crossSection = computeCrossSectionVolume({
      ...crossSectionFoam(outlineGeometry),
      foil: fields.foil,
      rails: fields.rails,
      length: fields.outline.length,
    });
    const expected = deriveQuotedVolumeLitres(estimator, crossSection, estimator.importingTemplate);

    expect(summary.volumeLitres).toBe(expected);
  });

  it.each(BOARD_PRESETS)(
    "$id: returns the estimator's figure when the volume import toggle is off, matching that board's Volume screen",
    (preset) => {
      const fields = {
        outline: preset.outline,
        rails: preset.rails,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: false,
        volume: { ...DEFAULT_VOLUME_SPEC, importTemplateDimensions: false },
      };
      const summary = summarizeDesign(fields);

      const outlineGeometry = buildOutline(fields.outline);
      const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
      const railValues = deriveRailValues(computeRailBands(fields.rails));
      const effectiveVolume = deriveEffectiveVolume(fields.volume, templateValues, railValues);
      const estimator = computeVolume(effectiveVolume, templateValues, railValues);

      expect(summary.volumeLitres).toBe(estimator.volumeLitres);
    },
  );
});

describe("summarizeDesign's litres respond to foil, not rocker (VOL-01/D-11)", () => {
  it.each(BOARD_PRESETS)("$id: changing only a foil thickness changes summarizeDesign's litres", (preset) => {
    const base = summarizeDesign({
      outline: preset.outline,
      rails: preset.rails,
      foil: DEFAULT_FOIL_SPEC,
      railsImportFoilThickness: false,
      volume: DEFAULT_VOLUME_SPEC,
    });
    const thickerFoil: FoilSpec = { ...DEFAULT_FOIL_SPEC, center: mm(DEFAULT_FOIL_SPEC.center + inchesToMm(1)) };
    const changed = summarizeDesign({
      outline: preset.outline,
      rails: preset.rails,
      foil: thickerFoil,
      railsImportFoilThickness: false,
      volume: DEFAULT_VOLUME_SPEC,
    });

    expect(changed.volumeLitres).not.toBe(base.volumeLitres);
  });

  it.each(BOARD_PRESETS)(
    "$id: identical calls reproduce identical litres, and a hand-set board's litres ignore its rocker (D-11: rocker never reaches thickness)",
    (preset) => {
      const fields = {
        outline: preset.outline,
        rails: preset.rails,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: false,
        volume: DEFAULT_VOLUME_SPEC,
      };
      const first = summarizeDesign(fields);
      const second = summarizeDesign(fields);
      expect(second.volumeLitres).toBe(first.volumeLitres);
      // Phase 11: the summary now takes the board's rocker too (it builds the side profile), but
      // with no blank the rocker only shapes the bottom — never the thickness or the litres.
      const lifted = summarizeDesign({
        ...fields,
        rocker: { ...DEFAULT_FALLBACK_ROCKER, noseTip: mm(DEFAULT_FALLBACK_ROCKER.noseTip + inchesToMm(2)) },
        blank: null,
      });
      expect(lifted.volumeLitres).toBe(first.volumeLitres);
    },
  );
});

// Phase 11 (D-01 across screens): a board in a blank is summarised from the SAME side profile the
// store builds — from the board's own copy of its blank — so a rack card, a preset card and the
// VOLUME screen quote one litres figure. Every expectation below is recomputed through the same
// functions the store calls; nothing is typed.
describe("summarizeDesign for a board sitting in a blank (D-01, 11-10)", () => {
  const catalogue = readSeedCatalog().filter(isPickable);

  /** What the store computes for these fields: its side profile, effective rails and quoted litres. */
  function asTheStoreComputes(fields: {
    outline: OutlineSpec;
    rails: RailBandSpec;
    foil: FoilSpec;
    rocker: FiveStationRocker;
    blank: BoardBlank;
    railsImportFoilThickness: boolean;
    volume: typeof DEFAULT_VOLUME_SPEC;
  }) {
    const outlineGeometry = buildOutline(fields.outline);
    const profile = buildBoardProfile({
      length: fields.outline.length,
      rocker: fields.rocker,
      foil: fields.foil,
      blank: {
        prepared: prepareBlank(fields.blank.copy),
        placement: fields.blank.placement,
        nose12Offset: fields.blank.nose12Offset,
        tail12Offset: fields.blank.tail12Offset,
        // The board's own cut, as the store passes it (Phase 12).
        deckSkin: fields.blank.deckSkin,
        tipStyle: fields.blank.tipStyle,
        fineTuneSurface: fields.blank.fineTuneSurface,
      },
    });
    const effectiveRails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    const templateValues = deriveTemplateValues(fields.outline, outlineGeometry);
    const railValues = deriveRailValues(computeRailBands(effectiveRails));
    const estimator = computeVolume(deriveEffectiveVolume(fields.volume, templateValues, railValues), templateValues, railValues);
    const crossSection = computeCrossSectionVolume({
      ...crossSectionFoam(outlineGeometry),
      foil: profile.effectiveFoil,
      thicknessAt: profile.thicknessAt,
      rails: effectiveRails,
      length: fields.outline.length,
    });
    return { profile, crossSection, quoted: deriveQuotedVolumeLitres(estimator, crossSection, estimator.importingTemplate) };
  }

  /** Every preset in its own blank, plus the same board slid and fine-tuned — a spread of real cases. */
  const CASES = BOARD_PRESETS.flatMap((preset) => {
    const fields = { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
    const moved = {
      ...fields,
      blank: {
        ...fields.blank,
        placement: inchesToMm(0.5),
        nose12Offset: inchesToMm(1 / 8),
        tail12Offset: inchesToMm(-1 / 16),
      },
    };
    // Phase 12: the same board with a cut of its own — a thicker skin, the tips off the bottom and
    // the fine-tunes on the bottom — so the store mirror below is exercised on a non-default cut.
    const ownCut = {
      ...moved,
      blank: { ...moved.blank, deckSkin: inchesToMm(1 / 4), tipStyle: "bottom" as const, fineTuneSurface: "bottom" as const },
    };
    return [
      { label: `${preset.id} as opened`, fields },
      { label: `${preset.id} slid 1/2in and fine-tuned`, fields: moved },
      { label: `${preset.id} slid, fine-tuned and cut its own way`, fields: ownCut },
    ];
  });

  it.each(BOARD_PRESETS)("$id: the Tip Style never moves the thickness, so Pin deck and Bottom quote the same litres (D-08)", (preset) => {
    const fields = { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
    const pinDeck = summarizeDesign({ ...fields, blank: { ...fields.blank, ...DEFAULT_BLANK_CUT, tipStyle: "pinDeck" } });
    const bottom = summarizeDesign({ ...fields, blank: { ...fields.blank, ...DEFAULT_BLANK_CUT, tipStyle: "bottom" } });
    expect(bottom.volumeLitres).toBe(pinDeck.volumeLitres);
  });

  it.each(BOARD_PRESETS)("$id: a preset board's litres are its preset card's litres (presetSummary), on the preset's own cut", (preset) => {
    const fields = { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
    expect(fields.blank.tipStyle).toBe(DEFAULT_BLANK_CUT.tipStyle);
    expect(summarizeDesign(fields).volumeLitres).toBe(presetSummary(preset).volumeLitres);
  });

  it.each(CASES)("$label: the litres are exactly the store's cross-section litres from the blank's side profile", ({ fields }) => {
    const summary = summarizeDesign(fields);
    const store = asTheStoreComputes(fields);
    expect(summary.volumeLitres).toBe(store.quoted);
    expect(summary.volumeLitres).toBe(store.crossSection.volumeLitres);
  });

  it.each(CASES)("$label: the thickness quoted is the board's centre (the blank is scaled to it)", ({ fields }) => {
    expect(summarizeDesign(fields).centerThickness).toBeCloseTo(fields.foil.center, 9);
  });

  it.each(BOARD_PRESETS)("$id: a board in a blank does not quote the hand-set five-station litres", (preset) => {
    const fields = { ...presetDesignFields(preset), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
    const inBlank = summarizeDesign(fields).volumeLitres;
    const handSet = summarizeDesign({ ...fields, blank: null }).volumeLitres;
    expect(inBlank).not.toBe(handSet);
  });

  it("reads the board's own copy of its blank, never the catalogue: a copy with a thicker blank changes the litres", () => {
    const shortboard = BOARD_PRESETS.find((preset) => preset.id === "shortboard")!;
    const fields = { ...presetDesignFields(shortboard), railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
    const copy = fields.blank.copy;
    // A doctored copy: every thickness 10% up except at the centre station, so the centre-scaled
    // foil fills out between the stations and the litres must move.
    const doctored = {
      ...copy,
      stations: copy.stations.map((station) =>
        station.label === "C" || station.thicknessMm === null
          ? station
          : { ...station, thicknessMm: mm(station.thicknessMm * 1.1) },
      ),
    };
    const original = summarizeDesign(fields).volumeLitres;
    const changed = summarizeDesign({ ...fields, blank: { ...fields.blank, copy: doctored } }).volumeLitres;
    expect(changed).toBeGreaterThan(original);
    expect(catalogue.some((record) => record.vendor === copy.vendor && record.name === copy.name)).toBe(true);
  });

  it("a snapshot without rocker or blank (every board saved before Phase 11 read this way) is summarised exactly as before", () => {
    // `rocker` and `blank` absent: the hand-set profile from the stored foil, whose thickness is
    // `sampleFoil` exactly — the same litres computeCrossSectionVolume gives with no thicknessAt.
    for (const preset of BOARD_PRESETS) {
      const fields = {
        outline: preset.outline,
        rails: preset.rails,
        foil: DEFAULT_FOIL_SPEC,
        railsImportFoilThickness: true,
        volume: DEFAULT_VOLUME_SPEC,
      };
      const outlineGeometry = buildOutline(fields.outline);
      const effectiveRails = deriveEffectiveRails(fields.rails, fields.foil, true);
      const crossSection = computeCrossSectionVolume({
        ...crossSectionFoam(outlineGeometry),
        foil: fields.foil,
        rails: effectiveRails,
        length: fields.outline.length,
      });
      expect(summarizeDesign(fields).volumeLitres).toBe(crossSection.volumeLitres);
    }
  });
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

// Quick 261016-mkb (2026-10-16): a board's blank may carry its rocker as ordered from the maker. The
// rack, the summary and every report prepare it through the one helper, and bending a blank never
// changes its thickness or width — so the five thicknesses and the litres stay exactly the natural
// board's while the nose tip lifts.
describe("a blank's custom rocker reaches the side profile and leaves the fit alone (quick 261016-mkb)", () => {
  const preset = BOARD_PRESETS.find((p) => p.id === "longboard")!;
  const naturalFields: DesignSummaryFields = {
    ...presetDesignFields(preset),
    railsImportFoilThickness: true,
    volume: DEFAULT_VOLUME_SPEC,
  };
  const bentFields: DesignSummaryFields = {
    ...naturalFields,
    blank: { ...naturalFields.blank!, rocker: { changes: [{ end: "nose", amount: inchesToMm(1 / 2) }] } },
  };

  it("the five thicknesses are the natural board's exactly; the nose tip lifts and the tail tip stays", () => {
    const natural = designSideProfile(naturalFields, LIVE_DESIGN_RULES);
    const bent = designSideProfile(bentFields, LIVE_DESIGN_RULES);
    expect(bent.effectiveFoil).toEqual(natural.effectiveFoil);
    expect(bent.stationRocker.noseTip).toBeGreaterThan(natural.stationRocker.noseTip);
    expect(bent.stationRocker.tailTip).toBe(natural.stationRocker.tailTip);
  });

  it("summarizeDesign gives the natural board's litres", () => {
    expect(summarizeDesign(bentFields).volumeLitres).toBe(summarizeDesign(naturalFields).volumeLitres);
  });
});

describe("designFinPlacement — the fins exactly as FINS places them, for the bottom (Phase 17, D-03)", () => {
  const opened = phase16FinCases().filter((c) => c.label.endsWith("|opened"));

  it("covers every preset as it opens", () => {
    expect(opened.map((c) => c.preset.id)).toEqual(BOARD_PRESETS.map((p) => p.id));
  });

  for (const c of opened) {
    it(`${c.label}: the store's own chain gives the very marks FINS opens with (Import Template on)`, () => {
      expect(designFinPlacement(recordedPresetDesignFields(c.preset)).marks).toEqual(c.marks);
    });
  }

  it("an absent Import Template reads ticked, the store's default", () => {
    for (const c of opened) {
      const fields = recordedPresetDesignFields(c.preset);
      expect(designFinPlacement(fields).marks).toEqual(designFinPlacement({ ...fields, finsImportTemplate: true }).marks);
    }
  });

  it("with Import Template off the fins are the standalone calculator's, which never sees the outline", () => {
    for (const c of opened) {
      const fields = recordedPresetDesignFields(c.preset);
      expect(designFinPlacement({ ...fields, finsImportTemplate: false }).marks).toEqual(
        computeFinPlacement(c.preset.fins, null).marks,
      );
    }
  });

  it("Import Template moves the front fins on a preset it reaches — the reason the bottom reads the store's chain", () => {
    const moved = opened.filter((c) => {
      const fields = recordedPresetDesignFields(c.preset);
      return (
        frontFinStation(designFinPlacement(fields)) !==
        frontFinStation(designFinPlacement({ ...fields, finsImportTemplate: false }))
      );
    });
    expect(moved.length).toBeGreaterThan(0);
  });
});

describe("designBottomBoard — the board facts the bottom is read against (Phase 17, D-19, D-38)", () => {
  // the five boards bottom-golden.json was taken on, built as its script builds them, from the app
  const all = phase16Boards();
  const presets = BOARD_PRESETS.map((preset) => {
    const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
    return { id: preset.id, fields: all.find((b) => b.label === label)!.fields };
  });
  const fish = presets.find((p) => p.id === "fish")!.fields;
  const wing = {
    station: mm(frontFinStation(designFinPlacement(fish)) + inchesToMm(4)),
    depth: inchesToMm(1 / 4),
    run: inchesToMm(1),
    radius: mm(0),
    lock: null,
    finOffset: mm(0),
  };
  const jobs = [...presets, { id: "fishwing", fields: { ...fish, outline: { ...fish.outline, wings: [wing] } } }];
  const bottomBoardOf = (fields: DesignSummaryFields) =>
    designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));

  it.each(jobs)("$id: its facts and its samplers equal the sketch's at the golden's probes", ({ id, fields }) => {
    const g = bottomGolden.boards.find((b) => b.id === id)!.facts;
    const b = bottomBoardOf(fields);
    for (const [app, sketch] of [
      [b.length, g.L],
      [b.widePoint, g.wide],
      [b.widePointWidth, g.widePointWidth],
      [b.frontFins, g.fin],
      [b.toeDegrees, g.toeDeg],
    ]) {
      expect(Math.abs(app - sketch)).toBeLessThan(1e-9);
    }
    g.grid.s.forEach((sv, k) => {
      const s = mm(sv);
      for (const [app, sketch] of [
        [b.railAt(s), g.probes.curveAt[k]],
        [b.curveAt(s), g.probes.natural[k]],
        [b.narrowestAt(s), g.probes.narrow[k]],
        [refAt(b, "natural", s), g.probes.natural[k]],
        [refAt(b, "narrowest", s), g.probes.narrow[k]],
        [b.foamAt(s), g.probes.foamAt[k]],
        [b.thicknessAt(s), g.probes.thickAt[k]],
        [b.notchInner(s), g.probes.innerAt[k]],
      ]) {
        expect(Math.abs(app - sketch)).toBeLessThan(1e-9);
      }
    });
  });

  it("on the winged Fish, refAt under each wing rule equals the sketch's every 1/2\"", () => {
    const b = bottomBoardOf(jobs.find((j) => j.id === "fishwing")!.fields);
    const refCases = (bottomGolden.cases as unknown as { kind: string; wingRule: string; s: number; ref: number }[]).filter((c) => c.kind === "refAt");
    expect(refCases.length).toBeGreaterThan(100);
    for (const c of refCases) {
      expect(Math.abs(refAt(b, c.wingRule === "natural" ? "natural" : "narrowest", mm(c.s)) - c.ref)).toBeLessThan(1e-9);
    }
  });

  it("a diamond's V is foam the vees and bellies run out to (D-38): railAt is foamHalfWidth behind the tail block", () => {
    const diamonds = phase16SurfaceBoards().filter((x) => x.label.includes("|diamond|"));
    expect(diamonds.length).toBeGreaterThan(0);
    for (const { fields } of diamonds) {
      const geometry = buildOutline(fields.outline);
      const b = bottomBoardOf(fields);
      const block = geometry.points[0].station;
      let inside = 0;
      for (let k = 1; k < 40; k++) {
        const s = mm((block * k) / 40);
        if (sampleOutline(geometry, s) !== 0) continue;
        inside++;
        expect(b.railAt(s)).toBe(foamHalfWidth(geometry, s));
        expect(b.railAt(s)).toBeGreaterThan(0);
        expect(b.notchInner(s)).toBe(0);
      }
      expect(inside).toBeGreaterThan(0);
      // ahead of the tail block the rail is the drawn rail itself
      const ahead = mm(block + inchesToMm(6));
      expect(b.railAt(ahead)).toBe(sampleOutline(geometry, ahead));
    }
  });
});

describe("the litres count the bottom's cut (Phase 17, D-05, D-20, D-21, D-33)", () => {
  // the five boards bottom-golden.json was taken on, built as its script builds them, from the app
  const all = phase16Boards();
  const presets = BOARD_PRESETS.map((preset) => {
    const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
    return { id: preset.id, fields: all.find((b) => b.label === label)!.fields };
  });
  const fish = presets.find((p) => p.id === "fish")!.fields;
  const wing = {
    station: mm(frontFinStation(designFinPlacement(fish)) + inchesToMm(4)),
    depth: inchesToMm(1 / 4),
    run: inchesToMm(1),
    radius: mm(0),
    lock: null,
    finOffset: mm(0),
  };
  const jobs = [...presets, { id: "fishwing", fields: { ...fish, outline: { ...fish.outline, wings: [wing] } } }];
  const fieldsOf = (id: string) => jobs.find((j) => j.id === id)!.fields;
  const bottomBoardOf = (fields: DesignSummaryFields) =>
    designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
  /** A bottom of the named cuts at their starting numbers on this board — through `startingCut`, never typed. */
  const bottomOf = (fields: DesignSummaryFields, names: Partial<Record<BottomSectionKey, string>>): BoardBottom => {
    const board = bottomBoardOf(fields);
    const bottom = structuredClone(DEFAULT_BOTTOM);
    for (const section of BOTTOM_SECTIONS) {
      const name = names[section];
      if (name) bottom[section] = startingCut(section, name as BottomCutName, board);
    }
    return bottom;
  };
  const litresOf = (fields: DesignSummaryFields, bottom?: BoardBottom) => summarizeDesign({ ...fields, bottom }).volumeLitres;
  const fallOf = (fields: DesignSummaryFields, bottom: BoardBottom) => litresOf(fields) - litresOf(fields, bottom);

  type GoldenCut = { kind: "cut"; board: string; section: BottomSectionKey; name: string; cut: { kind: string }; litresOff: number };
  type GoldenOpening = { kind: "opening"; board: string; channels: number; cuts: Record<BottomSectionKey, { name: string }>; litresOff: number };
  const goldenCases = bottomGolden.cases as unknown as { kind: string }[];
  const thisWave = (name: string) => BOTTOM_SECTIONS.some((s) => (BOTTOM_CUT_NAMES[s] as readonly string[]).includes(name));
  const cutCases = (goldenCases.filter((c) => c.kind === "cut") as GoldenCut[]).filter((c) => thisWave(c.name) && c.cut.kind !== "flat");
  const opening = (id: string) =>
    (goldenCases.filter((c) => c.kind === "opening") as GoldenOpening[]).find((c) => c.board === id && c.channels === 0)!;
  const SHORT_RAILED = ["shortboard", "fish", "midlength", "fishwing"];

  it("the Shortboard with a Deep Single Concave at its starting numbers quotes fewer litres than without it", () => {
    const fields = fieldsOf("shortboard");
    expect(litresOf(fields, bottomOf(fields, { center: "Deep Single Concave" }))).toBeLessThan(litresOf(fields));
  });

  it("covers this wave's ten cuts on the five boards", () => {
    expect(cutCases).toHaveLength(10 * 5);
  });

  it.each(cutCases.map((c) => ({ ...c, label: `${c.board}: ${c.name}` })))(
    "$label alone: the litres fall, and never by more than the sketch's slab figure (the finished rail only takes less)",
    ({ board, section, name, litresOff }) => {
      const fields = fieldsOf(board);
      const fall = fallOf(fields, bottomOf(fields, { [section]: name }));
      expect(fall).toBeGreaterThan(0);
      expect(fall).toBeLessThanOrEqual(litresOff * 1.005);
    },
  );

  it.each(cutCases.filter((c) => c.cut.kind === "single" && SHORT_RAILED.includes(c.board)).map((c) => ({ ...c, label: `${c.board}: ${c.name}` })))(
    "$label: a single concave on a short-railed board falls within 0.5% of the sketch's own figure",
    ({ board, section, name, litresOff }) => {
      const fields = fieldsOf(board);
      const fall = fallOf(fields, bottomOf(fields, { [section]: name }));
      expect(Math.abs(fall / litresOff - 1)).toBeLessThan(0.005);
    },
  );

  it.each(["shortboard", "fish", "fishwing"])("%s: its opening cuts fall within 0.5% of the sketch's own figure", (id) => {
    const fields = fieldsOf(id);
    const op = opening(id);
    const names = Object.fromEntries(BOTTOM_SECTIONS.map((s) => [s, op.cuts[s].name]));
    expect(Math.abs(fallOf(fields, bottomOf(fields, names)) / op.litresOff - 1)).toBeLessThan(0.005);
  });

  it("the Mid-length with a Rolled Belly Entry, a Deep Single and a Rolled Vee falls by what the three take off one at a time", () => {
    const fields = fieldsOf("midlength");
    const trio = { nose: "Rolled Belly Entry", center: "Deep Single Concave", tail: "Rolled Vee" } as const;
    const together = fallOf(fields, bottomOf(fields, trio));
    const alone = BOTTOM_SECTIONS.reduce((sum, s) => sum + fallOf(fields, bottomOf(fields, { [s]: trio[s] })), 0);
    expect(together).toBeGreaterThan(0);
    expect(Math.abs(together / alone - 1)).toBeLessThan(1e-3);
    // and, as every cut alone, never more than the sketch's three slab figures together
    const sketch = BOTTOM_SECTIONS.reduce((sum, s) => sum + cutCases.find((c) => c.board === "midlength" && c.name === trio[s])!.litresOff, 0);
    expect(together).toBeLessThanOrEqual(sketch * 1.005);
  });

  it("Smoothness moves a single concave's litres by under 0.1% of the foam it takes off (D-06: the two section curves hold the same foam)", () => {
    const fields = fieldsOf("shortboard");
    const at = (smoothness: number) => {
      const bottom = bottomOf(fields, { center: "Deep Single Concave" });
      bottom.center = { ...bottom.center, smoothness };
      return litresOf(fields, bottom);
    };
    const litres = [0, 50, 100].map(at);
    const fall = litresOf(fields) - litres[1];
    expect(Math.max(...litres) - Math.min(...litres)).toBeLessThan(fall * 1e-3);
  });

  it("a hand-set board with no blank bottoms the same way: its thickness is the foil's and its litres fall", () => {
    const stock = phase16SurfaceBoards().find((b) => b.label === "stock|hard")!.fields;
    expect(stock.blank).toBeNull();
    expect(fallOf(stock, bottomOf(stock, { center: "Deep Single Concave", tail: "Rolled Vee" }))).toBeGreaterThan(0);
  });

  it("the input carries the bottom only when it cuts something; four arguments stay what they were", () => {
    const fields = fieldsOf("shortboard");
    const geometry = buildOutline(fields.outline);
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    const board = bottomBoardOf(fields);
    const four = designCrossSectionInput(geometry, profile, rails, fields.outline.length);
    const flat = designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom: DEFAULT_BOTTOM, board });
    const cut = designCrossSectionInput(geometry, profile, rails, fields.outline.length, {
      bottom: bottomOf(fields, { center: "Deep Single Concave" }),
      board,
    });
    expect(Object.keys(flat)).toEqual(Object.keys(four));
    expect("foamOffAt" in four).toBe(false);
    expect(typeof cut.foamOffAt).toBe("function");
  });
});

describe("RAILS bands the rail the bottom leaves, in a step only RAILS takes (Phase 17, D-22, D-35, D-40)", () => {
  const all = phase16Boards();
  const fieldsOf = (id: string) => {
    const preset = BOARD_PRESETS.find((p) => p.id === id)!;
    return all.find((b) => b.label === `${id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`)!.fields;
  };
  /** Everything RAILS reads for a board: its effective rails, its three anchors and its bottom's facts. */
  const railsOf = (fields: DesignSummaryFields) => {
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const geometry = buildOutline(fields.outline);
    const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
    const effectiveRails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    const anchors = railAnchorStations(profile.effectiveFoil, fields.outline.length);
    return { board, effectiveRails, anchors };
  };
  /** A bottom of the named cuts at their starting numbers on this board — through `startingCut`, never typed. */
  const bottomOf = (board: BottomBoard, names: Partial<Record<BottomSectionKey, BottomCutName>>): BoardBottom => {
    const bottom = structuredClone(DEFAULT_BOTTOM);
    for (const section of BOTTOM_SECTIONS) {
      const name = names[section];
      if (name) bottom[section] = startingCut(section, name, board);
    }
    return bottom;
  };

  it("the three anchors are the litres' own: the foil's tail 12\", centre and nose 12\" stations", () => {
    const fields = fieldsOf("fish");
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const points = foilStationPoints(profile.effectiveFoil, fields.outline.length);
    const station = (key: string) => points.find((p) => p.key === key)!.station;
    expect(railAnchorStations(profile.effectiveFoil, fields.outline.length)).toEqual({
      tail: station("tail12"),
      center: station("center"),
      nose: station("nose12"),
    });
  });

  it("with no bottom, all 102 Phase 16 boards' rails come back as the very same object and band exactly as before", () => {
    expect(all).toHaveLength(102);
    for (const { fields } of all) {
      const { board, effectiveRails, anchors } = railsOf(fields);
      const onBottom = railsOnTheBottom(effectiveRails, bottomRailLift(resolveBottom(DEFAULT_BOTTOM, board), board), anchors);
      expect(onBottom).toBe(effectiveRails);
      expect(computeRailBands(onBottom)).toEqual(computeRailBands(effectiveRails));
    }
  });

  it("the Fish's Panel Vee lowers each anchor by exactly its own rail lift, the tail's most", () => {
    const fields = fieldsOf("fish");
    const { board, effectiveRails, anchors } = railsOf(fields);
    const resolved = resolveBottom(bottomOf(board, { tail: "Panel Vee" }), board);
    const onBottom = railsOnTheBottom(effectiveRails, bottomRailLift(resolved, board), anchors);
    const liftAt = (s: Mm) => foamOff(resolved, board, s, board.railAt(s));
    expect(onBottom).not.toBe(effectiveRails);
    expect(liftAt(anchors.tail)).toBeGreaterThan(0);
    for (const key of ["tail", "center", "nose"] as const) {
      expect(onBottom[key].boardThickness).toBeCloseTo(effectiveRails[key].boardThickness - liftAt(anchors[key]), 9);
      // nothing else on the section moves
      expect({ ...onBottom[key], boardThickness: 0 }).toEqual({ ...effectiveRails[key], boardThickness: 0 });
    }
    expect(onBottom.tail.boardThickness).toBeLessThan(effectiveRails.tail.boardThickness);
    // the switches the rails carry beside the three sections are the rails' own
    expect({ ...onBottom, nose: null, center: null, tail: null }).toEqual({ ...effectiveRails, nose: null, center: null, tail: null });
  });

  it("a Deep Single Concave alone leaves RAILS as the same object: a concave lifts the stringer, never the rail", () => {
    const fields = fieldsOf("shortboard");
    const { board, effectiveRails, anchors } = railsOf(fields);
    const resolved = resolveBottom(bottomOf(board, { center: "Deep Single Concave" }), board);
    expect(railsOnTheBottom(effectiveRails, bottomRailLift(resolved, board), anchors)).toBe(effectiveRails);
  });

  it("the Longboard's belly lowers its centre anchor by the belly's lift at the rail (D-35's second picture)", () => {
    const fields = fieldsOf("longboard");
    const { board, effectiveRails, anchors } = railsOf(fields);
    const resolved = resolveBottom(bottomOf(board, { center: "Continuous Belly / Rolled Mid" }), board);
    const onBottom = railsOnTheBottom(effectiveRails, bottomRailLift(resolved, board), anchors);
    const lift = foamOff(resolved, board, anchors.center, board.railAt(anchors.center));
    expect(lift).toBeGreaterThan(0);
    expect(onBottom.center.boardThickness).toBeCloseTo(effectiveRails.center.boardThickness - lift, 9);
  });

  it("a lift deeper than the rail can stand is held at RAILS' 1/4\" floor, never a rail of no thickness", () => {
    const fields = fieldsOf("fish");
    const { effectiveRails, anchors } = railsOf(fields);
    const onBottom = railsOnTheBottom(effectiveRails, () => mm(effectiveRails.center.boardThickness * 2), anchors);
    for (const key of ["tail", "center", "nose"] as const) expect(onBottom[key].boardThickness).toBe(BOTTOM_FLOOR);
  });

  it("never moves the rack card's thickness or VOLUME's estimator rows (Pitfalls 5 and 6): a Panel Vee board reads the planed figures", () => {
    const fields = fieldsOf("fish");
    const { board, effectiveRails, anchors } = railsOf(fields);
    const bottom = bottomOf(board, { tail: "Panel Vee" });
    const flatSummary = summarizeDesign(fields);
    const veeSummary = summarizeDesign({ ...fields, bottom });
    expect(veeSummary.centerThickness).toBe(flatSummary.centerThickness);
    expect(veeSummary.volumeLitres).toBeLessThan(flatSummary.volumeLitres);
    // VOLUME's rows read the shared effective rails, which the bottom cannot reach
    const profile = designSideProfile({ ...fields, bottom } as DesignSummaryFields, LIVE_DESIGN_RULES);
    const sharedRails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    expect(deriveRailValues(computeRailBands(sharedRails))).toEqual(deriveRailValues(computeRailBands(effectiveRails)));
    // and RAILS' own figures do move — so the two above are not equal by accident
    const onBottom = railsOnTheBottom(effectiveRails, bottomRailLift(resolveBottom(bottom, board), board), anchors);
    expect(deriveRailValues(computeRailBands(onBottom)).tailThickness).toBeLessThan(
      deriveRailValues(computeRailBands(effectiveRails)).tailThickness,
    );
  });
});
