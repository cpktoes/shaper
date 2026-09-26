import { describe, expect, it } from "vitest";
import { computeFinPlacement, DEFAULT_FIN_PLACEMENT_SPEC } from "./fins";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { prepareBlank } from "./blank-fit";
import { buildBoardProfile } from "./board-profile";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { buildOutline } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import { computeRailBands, DEFAULT_RAIL_BAND_SPEC } from "./rail-bands";
import { inchesToMm, mm, mmToInches } from "./units";

describe("BOARD_PRESETS", () => {
  it("has exactly 4 entries with the four unique board-type ids", () => {
    expect(BOARD_PRESETS.length).toBe(4);
    const ids = BOARD_PRESETS.map((p) => p.id);
    expect(new Set(ids)).toEqual(new Set(["shortboard", "fish", "midlength", "longboard"]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(BOARD_PRESETS)("$id: buildOutline() does not throw and returns non-empty points", (preset) => {
    let geometry: ReturnType<typeof buildOutline> | undefined;
    expect(() => {
      geometry = buildOutline(preset.outline);
    }).not.toThrow();
    expect(geometry?.points.length).toBeGreaterThan(0);
  });

  it.each(BOARD_PRESETS)("$id: every OutlineSpec field lies inside its OutlineControls slider range", (preset) => {
    const { outline } = preset;

    const lengthIn = mmToInches(outline.length);
    expect(lengthIn).toBeGreaterThanOrEqual(60);
    expect(lengthIn).toBeLessThanOrEqual(120);

    const widePointWidthIn = mmToInches(outline.widePointWidth);
    expect(widePointWidthIn).toBeGreaterThanOrEqual(16);
    expect(widePointWidthIn).toBeLessThanOrEqual(25);

    const widePointOffsetIn = mmToInches(outline.widePointOffset);
    expect(widePointOffsetIn).toBeGreaterThanOrEqual(-12);
    expect(widePointOffsetIn).toBeLessThanOrEqual(12);

    expect(outline.noseAngle).toBeGreaterThanOrEqual(35);
    expect(outline.noseAngle).toBeLessThanOrEqual(90);

    expect(outline.tailAngle).toBeGreaterThanOrEqual(30);
    expect(outline.tailAngle).toBeLessThanOrEqual(90);

    expect(outline.tailRailLength).toBeGreaterThanOrEqual(0);
    expect(outline.tailRailLength).toBeLessThanOrEqual(100);
    expect(outline.noseRailLength).toBeGreaterThanOrEqual(0);
    expect(outline.noseRailLength).toBeLessThanOrEqual(100);

    expect(outline.noseFullness).toBeGreaterThanOrEqual(0);
    expect(outline.noseFullness).toBeLessThanOrEqual(100);

    expect(outline.tailFullness).toBeGreaterThanOrEqual(0);
    expect(outline.tailFullness).toBeLessThanOrEqual(100);
  });

  it.each(BOARD_PRESETS)("$id: tail-shape fields lie inside their own slider ranges", (preset) => {
    const { tail } = preset.outline;

    switch (tail.kind) {
      case "squash":
      case "diamond":
      case "swallow": {
        const endWidthIn = mmToInches(tail.endWidth);
        expect(endWidthIn).toBeGreaterThanOrEqual(0);
        expect(endWidthIn).toBeLessThanOrEqual(16);
        break;
      }
      default:
        break;
    }

    if (tail.kind === "swallow") {
      const crotchDepthIn = mmToInches(tail.crotchDepth);
      expect(crotchDepthIn).toBeGreaterThanOrEqual(1);
      expect(crotchDepthIn).toBeLessThanOrEqual(8);
    }

    if (tail.kind === "diamond") {
      const depthIn = mmToInches(tail.depth);
      expect(depthIn).toBeGreaterThanOrEqual(1);
      expect(depthIn).toBeLessThanOrEqual(5);
    }
  });

  it.each(BOARD_PRESETS)("$id: length/widePointWidth/widePointOffset round-trip inchesToMm to within 1e-9in", (preset) => {
    const { outline } = preset;
    for (const value of [outline.length, outline.widePointWidth, outline.widePointOffset]) {
      const asInches = mmToInches(value);
      const roundTripped = mmToInches(inchesToMm(asInches));
      expect(Math.abs(roundTripped - asInches)).toBeLessThan(1e-9);
    }
  });

  it.each(BOARD_PRESETS)("$id: has non-empty name and descriptor copy", (preset) => {
    expect(preset.name.length).toBeGreaterThan(0);
    expect(preset.descriptor.length).toBeGreaterThan(0);
  });

  it.each(BOARD_PRESETS)("$id: carries a complete rails spec the rail-band calculator accepts", (preset) => {
    for (const key of ["nose", "center", "tail"] as const) {
      const section = preset.rails[key];
      expect(Number.isFinite(section.boardThickness)).toBe(true);
      expect(section.boardThickness).toBeGreaterThan(0);
      expect([1, 2, 3, 4, 5]).toContain(section.family);
      expect(Number.isFinite(section.deckPercent)).toBe(true);
      expect(Number.isFinite(section.ratioTopPercent)).toBe(true);
    }
    expect(typeof preset.rails.tailHardEdge).toBe("boolean");
    expect(() => computeRailBands(preset.rails)).not.toThrow();
  });

  it.each(BOARD_PRESETS)("$id: carries a complete fins spec the fin-placement calculator accepts", (preset) => {
    expect(Number.isFinite(preset.fins.boardLength)).toBe(true);
    expect(Number.isFinite(preset.fins.tailWidth12)).toBe(true);
    expect(() => computeFinPlacement(preset.fins)).not.toThrow();
  });

  it("rails and fins tuning status: all four presets are shaper-captured — none carries the default rails or fins", () => {
    const shortboard = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    // Captured 2026-09-14: centre and tail rails on family 4 (nose stays 3), front fins on the
    // basic model — see the block's own comment in presets.ts.
    expect(shortboard.rails.nose.family).toBe(3);
    expect(shortboard.rails.center.family).toBe(4);
    expect(shortboard.rails.tail.family).toBe(4);
    expect(shortboard.fins.frontModel).toBe("basic");
    const fish = BOARD_PRESETS.find((p) => p.id === "fish")!;
    // Captured 2026-09-14: nose ratio 55, centre and tail rails on family 2, a twin with the front
    // base length overridden to 5 1/2".
    expect(fish.rails.nose.ratioTopPercent).toBe(55);
    expect(fish.rails.center.family).toBe(2);
    expect(fish.rails.tail.family).toBe(2);
    expect(fish.fins.finSetup).toBe("twin");
    expect(fish.fins.advanced.baseLenForwardOverridden).toBe(true);
    const midlength = BOARD_PRESETS.find((p) => p.id === "midlength")!;
    // Captured 2026-09-14: nose and centre rails on family 2 (nose ratio 50/50), tail on 3; a quad
    // on the basic off-rail rear model with the centre fin on and all three base lengths overridden.
    expect(midlength.rails.nose.family).toBe(2);
    expect(midlength.rails.center.family).toBe(2);
    expect(midlength.rails.tail.family).toBe(3);
    expect(midlength.rails.nose.ratioTopPercent).toBe(50);
    expect(midlength.fins.finSetup).toBe("quad");
    expect(midlength.fins.quadRearModel).toBe("basicOffRail");
    expect(midlength.fins.quadCenterFinOn).toBe(true);
    const longboard = BOARD_PRESETS.find((p) => p.id === "longboard")!;
    // Captured 2026-09-14: symmetrical 50/50 nose and centre rails on family 3, a symmetrical 45/55
    // tail on family 4 with no hard edge, and a single fin.
    expect(longboard.rails.nose.symmetrical).toBe(true);
    expect(longboard.rails.center.ratioTopPercent).toBe(50);
    expect(longboard.rails.tail.family).toBe(4);
    expect(longboard.rails.tailHardEdge).toBe(false);
    expect(longboard.fins.finSetup).toBe("single");
    for (const preset of BOARD_PRESETS) {
      expect(preset.rails).not.toEqual(DEFAULT_RAIL_BAND_SPEC);
      expect(preset.fins).not.toEqual(DEFAULT_FIN_PLACEMENT_SPEC);
    }
  });


  // Phase 11 (D-03): a preset's rocker and 12" foil are no longer typed — they come from its blank.
  // The checks below are the retired Bezier/foil-ordering checks re-expressed through the side
  // profile a preset actually opens with (`presetDesignFields` -> `buildBoardProfile`), the same
  // profile the store builds. Every expected number is the preset's own setting or is read off the
  // profile; none is typed.

  it.each(BOARD_PRESETS)("$id: its foil carries exactly the three thicknesses a preset owns — centre and tips — each inside FOIL_THICKNESS_RANGE_IN", (preset) => {
    expect(Object.keys(preset.foil).sort()).toEqual(["center", "noseTip", "tailTip"]);
    for (const key of ["noseTip", "center", "tailTip"] as const) {
      expect(Number.isFinite(preset.foil[key])).toBe(true);
      const thickness = mmToInches(preset.foil[key]);
      expect(thickness).toBeGreaterThanOrEqual(FOIL_THICKNESS_RANGE_IN.min);
      expect(thickness).toBeLessThanOrEqual(FOIL_THICKNESS_RANGE_IN.max);
    }
    expect("rocker" in preset).toBe(false);
  });

  it.each(BOARD_PRESETS)("$id: R13 — the side profile's tips equal its tip settings and its centre equals its centre", (preset) => {
    const { profile } = presetProfile(preset);
    const L = preset.outline.length;
    expect(profile.thicknessAt(mm(0))).toBeCloseTo(preset.foil.tailTip, 9);
    expect(profile.thicknessAt(L)).toBeCloseTo(preset.foil.noseTip, 9);
    expect(profile.thicknessAt(mm(L / 2))).toBeCloseTo(preset.foil.center, 9);
    expect(profile.effectiveFoil.tailTip).toBeCloseTo(preset.foil.tailTip, 9);
    expect(profile.effectiveFoil.noseTip).toBeCloseTo(preset.foil.noseTip, 9);
    expect(profile.effectiveFoil.center).toBeCloseTo(preset.foil.center, 9);
  });

  it.each(BOARD_PRESETS)("$id: both 12in thicknesses sit between their tip and the centre — the centre is the thickest station", (preset) => {
    const { effectiveFoil } = presetProfile(preset).profile;
    expect(effectiveFoil.nose12).toBeGreaterThan(preset.foil.noseTip);
    expect(effectiveFoil.nose12).toBeLessThan(preset.foil.center);
    expect(effectiveFoil.tail12).toBeGreaterThan(preset.foil.tailTip);
    expect(effectiveFoil.tail12).toBeLessThan(preset.foil.center);
  });

  it.each(BOARD_PRESETS)("$id: R13 — no negative thickness and no rocker below the flat anywhere on a 1/4in sweep", (preset) => {
    const { profile } = presetProfile(preset);
    const L = preset.outline.length;
    const step = inchesToMm(0.25);
    for (let s = 0; s <= L + 1e-9; s += step) {
      const station = mm(Math.min(s, L));
      expect(Number.isFinite(profile.thicknessAt(station))).toBe(true);
      expect(profile.thicknessAt(station)).toBeGreaterThan(0);
      expect(profile.rockerAt(station)).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it.each(BOARD_PRESETS)("$id: positive rocker at both tips, and each 12in lift is above the flat and below its own tip's", (preset) => {
    const { stationRocker } = presetProfile(preset).profile;
    expect(stationRocker.noseTip).toBeGreaterThan(0);
    expect(stationRocker.tailTip).toBeGreaterThan(0);
    expect(stationRocker.nose12).toBeGreaterThan(0);
    expect(stationRocker.nose12).toBeLessThan(stationRocker.noseTip);
    expect(stationRocker.tail12).toBeGreaterThan(0);
    expect(stationRocker.tail12).toBeLessThan(stationRocker.tailTip);
  });

  it.each(BOARD_PRESETS)("$id: every board carries more nose rocker than tail rocker, at the tips and at 12in", (preset) => {
    const { stationRocker } = presetProfile(preset).profile;
    expect(stationRocker.noseTip).toBeGreaterThan(stationRocker.tailTip);
    expect(stationRocker.nose12).toBeGreaterThan(stationRocker.tail12);
  });

  it("the four presets differ from one another: no two share a foil or a side profile's station rocker", () => {
    const foils = BOARD_PRESETS.map((p) => JSON.stringify(p.foil));
    const rockers = BOARD_PRESETS.map((p) => JSON.stringify(presetProfile(p).profile.stationRocker));
    expect(new Set(foils).size).toBe(foils.length);
    expect(new Set(rockers).size).toBe(rockers.length);
  });

  it("the Fish's centre thickness divided by its length exceeds the Shortboard's — a fish is proportionally thicker", () => {
    const fish = BOARD_PRESETS.find((p) => p.id === "fish")!;
    const shortboard = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    const fishRatio = fish.foil.center / fish.outline.length;
    const shortboardRatio = shortboard.foil.center / shortboard.outline.length;
    expect(fishRatio).toBeGreaterThan(shortboardRatio);
  });

  it.each(BOARD_PRESETS)("$id: opens in a blank, never as a hand-set board", (preset) => {
    const { profile, fields } = presetProfile(preset);
    expect(profile.blank).not.toBeNull();
    expect(profile.blank!.record).toEqual(fields.blank.copy);
  });
});

/** The side profile a preset opens with — exactly what the store builds from `presetDesignFields`. */
function presetProfile(preset: BoardPreset) {
  const fields = presetDesignFields(preset);
  const profile = buildBoardProfile({
    length: fields.outline.length,
    rocker: fields.rocker,
    foil: fields.foil,
    blank: {
      prepared: prepareBlank(fields.blank.copy),
      placement: fields.blank.placement,
      nose12Offset: fields.blank.nose12Offset,
      tail12Offset: fields.blank.tail12Offset,
    },
  });
  return { fields, profile };
}
