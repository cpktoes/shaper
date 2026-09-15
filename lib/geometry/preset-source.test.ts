import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS, type OutlineSpec } from "./board";
import { DEFAULT_FIN_PLACEMENT_SPEC, type FinPlacementSpec } from "./fins";
import { DEFAULT_FOIL_SPEC, FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "./foil";
import {
  buildFinsPresetSource,
  buildOutlinePresetSource,
  buildRailsPresetSource,
  buildRockerPresetSource,
  formatPresetInches,
  PRESET_INCH_PLACES,
} from "./preset-source";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "./rail-bands";
import { DEFAULT_ROCKER_SPEC, ROCKER_LIFT_RANGE_IN, type RockerSpec } from "./rocker";
import { degrees, inchesToMm, mm } from "./units";

/**
 * Reads a pasted block exactly the way `presets.ts` reads it: inside an object literal, with only
 * the two authoring helpers that file imports in scope. Evaluated in THIS realm (`runInThisContext`
 * rather than a fresh vm context) so the object that comes back is an ordinary object
 * `toStrictEqual` can compare constructor-for-constructor with the spec that went in.
 */
function pasteBlock(block: string): Record<string, unknown> {
  const read = runInThisContext(`(function (inchesToMm, degrees) { "use strict"; return ({\n${block}\n}); })`) as (
    inchesToMmFn: typeof inchesToMm,
    degreesFn: typeof degrees,
  ) => Record<string, unknown>;
  return read(inchesToMm, degrees);
}

/** Every position a slider with this inch range and step can land on, in inches. */
function sliderPositions(range: { readonly min: number; readonly max: number; readonly step: number }): number[] {
  const first = Math.round(range.min / range.step);
  const last = Math.round(range.max / range.step);
  const positions: number[] = [];
  for (let k = first; k <= last; k++) positions.push(k * range.step);
  return positions;
}

describe("formatPresetInches", () => {
  it('prints 2 1/16" as 2.0625 — the exact sixteenth, never the 2.063 a three-decimal rounding gave', () => {
    expect(formatPresetInches(inchesToMm(2.0625))).toBe("2.0625");
    expect(`inchesToMm(${formatPresetInches(inchesToMm(2.0625))})`).toBe("inchesToMm(2.0625)");
  });

  it("prints the four sixteenths the 2026-09-14 Shortboard capture had to hand-correct exactly", () => {
    expect(formatPresetInches(inchesToMm(2.0625))).toBe("2.0625");
    expect(formatPresetInches(inchesToMm(0.4375))).toBe("0.4375");
    expect(formatPresetInches(inchesToMm(1.5625))).toBe("1.5625");
    expect(formatPresetInches(inchesToMm(0.9375))).toBe("0.9375");
  });

  it("prints whole inches and short decimals as short as they are, with no padding", () => {
    expect(formatPresetInches(inchesToMm(74))).toBe("74");
    expect(formatPresetInches(inchesToMm(18.75))).toBe("18.75");
    expect(formatPresetInches(inchesToMm(1.31))).toBe("1.31");
    expect(formatPresetInches(inchesToMm(-0.5))).toBe("-0.5");
    expect(formatPresetInches(inchesToMm(0))).toBe("0");
  });

  it.each([
    ["rocker lift", ROCKER_LIFT_RANGE_IN],
    ["foil thickness", FOIL_THICKNESS_RANGE_IN],
  ])("every %s slider position pastes back as the very same stored number", (_name, range) => {
    for (const inches of sliderPositions(range)) {
      const stored = inchesToMm(inches);
      const printed = formatPresetInches(stored);
      expect(printed).toBe(String(inches));
      expect(inchesToMm(Number(printed))).toBe(stored);
    }
  });

  it("a thirty-second (the RAILS corner-cut slider's step) and a typed sixty-fourth paste back exactly too", () => {
    for (const inches of [1 / 32, 3 / 32, 5 / 64, 2 + 1 / 64]) {
      const stored = inchesToMm(inches);
      const printed = formatPresetInches(stored);
      expect(printed).toBe(String(inches));
      expect(inchesToMm(Number(printed))).toBe(stored);
    }
  });

  it("a value with no short inch figure — a whole millimetre from a Metric slider — prints six places, within 0.0000127 mm", () => {
    expect(formatPresetInches(mm(52))).toBe("2.047244");
    for (const stored of [mm(52), mm(514), mm(67), mm(1880)]) {
      const printed = formatPresetInches(stored);
      expect(printed.split(".")[1]?.length ?? 0).toBeLessThanOrEqual(PRESET_INCH_PLACES);
      expect(Math.abs(inchesToMm(Number(printed)) - stored)).toBeLessThan(0.0000127);
    }
  });
});

describe("preset source blocks", () => {
  /** The rocker and foil the founder captured on 2026-09-14 (presets.ts's `shortboard` block) — as
   * a literal here rather than read from `BOARD_PRESETS`, so a later recapture of the Shortboard
   * cannot change what this test pins: the FORM of the paste, sixteenths and all. */
  const captured: { rocker: RockerSpec; foil: FoilSpec } = {
    rocker: {
      noseLift: inchesToMm(5.5),
      tailLift: inchesToMm(2.0625),
      noseAngle: degrees(30),
      tailAngle: degrees(26),
      noseSmoothness: 49,
      tailSmoothness: 100,
      noseFlatness: 50,
      tailFlatness: 44.5,
    },
    foil: {
      noseTip: inchesToMm(0.4375),
      nose12: inchesToMm(1.375),
      center: inchesToMm(2.25),
      tail12: inchesToMm(1.5625),
      tailTip: inchesToMm(0.9375),
    },
  };

  it("the 2026-09-14 Shortboard rocker and foil print in presets.ts's own authoring form, exact sixteenths and all", () => {
    expect(buildRockerPresetSource(captured.rocker, captured.foil)).toBe(
      [
        "rocker: {",
        "  noseLift: inchesToMm(5.5),",
        "  tailLift: inchesToMm(2.0625),",
        "  noseAngle: degrees(30),",
        "  tailAngle: degrees(26),",
        "  noseSmoothness: 49,",
        "  tailSmoothness: 100,",
        "  noseFlatness: 50,",
        "  tailFlatness: 44.5,",
        "},",
        "foil: {",
        "  noseTip: inchesToMm(0.4375),",
        "  nose12: inchesToMm(1.375),",
        "  center: inchesToMm(2.25),",
        "  tail12: inchesToMm(1.5625),",
        "  tailTip: inchesToMm(0.9375),",
        "},",
      ].join("\n"),
    );
    expect(pasteBlock(buildRockerPresetSource(captured.rocker, captured.foil))).toStrictEqual(captured);
  });

  it.each(BOARD_PRESETS)("$id: all four blocks, pasted back the way presets.ts reads them, give the same spec to the last bit", (preset) => {
    expect(pasteBlock(buildOutlinePresetSource(preset.outline))).toStrictEqual({ outline: preset.outline });
    expect(pasteBlock(buildRockerPresetSource(preset.rocker, preset.foil))).toStrictEqual({
      rocker: preset.rocker,
      foil: preset.foil,
    });
    expect(pasteBlock(buildRailsPresetSource(preset.rails))).toStrictEqual({ rails: preset.rails });
    expect(pasteBlock(buildFinsPresetSource(preset.fins))).toStrictEqual({ fins: preset.fins });
  });

  it("the defaults paste back too, every tail shape included", () => {
    for (const tailPreset of Object.values(TAIL_PRESETS)) {
      const outline: OutlineSpec = { ...DEFAULT_BOARD_SPEC.outline, tail: tailPreset.tail };
      expect(pasteBlock(buildOutlinePresetSource(outline))).toStrictEqual({ outline });
    }
    expect(pasteBlock(buildRockerPresetSource(DEFAULT_ROCKER_SPEC, DEFAULT_FOIL_SPEC))).toStrictEqual({
      rocker: DEFAULT_ROCKER_SPEC,
      foil: DEFAULT_FOIL_SPEC,
    });
    expect(pasteBlock(buildRailsPresetSource(DEFAULT_RAIL_BAND_SPEC))).toStrictEqual({ rails: DEFAULT_RAIL_BAND_SPEC });
    expect(pasteBlock(buildFinsPresetSource(DEFAULT_FIN_PLACEMENT_SPEC))).toStrictEqual({ fins: DEFAULT_FIN_PLACEMENT_SPEC });
  });

  it("a board set to awkward sixteenths and thirty-seconds on every screen pastes back exactly", () => {
    const outline: OutlineSpec = {
      ...DEFAULT_BOARD_SPEC.outline,
      length: inchesToMm(74.0625),
      widePointWidth: inchesToMm(18.9375),
      widePointOffset: inchesToMm(-1.0625),
      tail: { kind: "swallow", endWidth: inchesToMm(8.0625), crotchDepth: inchesToMm(3.1875) },
    };
    const rocker: RockerSpec = { ...DEFAULT_ROCKER_SPEC, noseLift: inchesToMm(5.1875), tailLift: inchesToMm(2.0625) };
    const foil: FoilSpec = {
      noseTip: inchesToMm(0.4375),
      nose12: inchesToMm(1.4375),
      center: inchesToMm(2.3125),
      tail12: inchesToMm(1.5625),
      tailTip: inchesToMm(0.9375),
    };
    const rails: RailBandSpec = {
      ...DEFAULT_RAIL_BAND_SPEC,
      nose: {
        ...DEFAULT_RAIL_BAND_SPEC.nose,
        boardThickness: inchesToMm(1.3125),
        cornerCutOffsetOverride: inchesToMm(3 / 32),
        bottomTuck3Override: inchesToMm(0.6875),
      },
    };
    const fins: FinPlacementSpec = {
      ...DEFAULT_FIN_PLACEMENT_SPEC,
      tailWidth12: inchesToMm(14.1875),
      advanced: {
        ...DEFAULT_FIN_PLACEMENT_SPEC.advanced,
        baseLenForward: inchesToMm(4.5625),
        forwardToeOverride: inchesToMm(0.1875),
        rearPositionOffset: inchesToMm(-0.3125),
        quadRearOffRailOverride: inchesToMm(1.1875),
        quadRearOffTailOverride: inchesToMm(5.0625),
      },
    };

    expect(pasteBlock(buildOutlinePresetSource(outline))).toStrictEqual({ outline });
    expect(pasteBlock(buildRockerPresetSource(rocker, foil))).toStrictEqual({ rocker, foil });
    expect(pasteBlock(buildRailsPresetSource(rails))).toStrictEqual({ rails });
    expect(pasteBlock(buildFinsPresetSource(fins))).toStrictEqual({ fins });
    expect(buildFinsPresetSource(fins)).toContain("quadRearOffRailOverride: inchesToMm(1.1875),");
    expect(buildRailsPresetSource(rails)).toContain("cornerCutOffsetOverride: inchesToMm(0.09375),");
  });
});

describe("the four editors share the one printer", () => {
  const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
  const EDITORS = [
    "components/outline/outline-editor.tsx",
    "components/rocker/rocker-editor.tsx",
    "components/rails/rail-band-editor.tsx",
    "components/fins/fin-placement-editor.tsx",
  ];

  /** Strips `//` line comments and `/* *\/` block comments — the same helper lib/theme.test.ts and
   * lib/units-isolation.test.ts already copy between themselves. */
  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .join("\n");
  }

  it.each(EDITORS)("%s takes its block from preset-source and keeps no inch printer of its own", (file) => {
    const source = stripComments(readFileSync(join(REPO_ROOT, file), "utf8"));
    expect(source).toMatch(/from "@\/lib\/geometry\/preset-source"/);
    expect(source).not.toMatch(/toFixed\(/);
    expect(source).not.toMatch(/roundedInches/);
  });
});
