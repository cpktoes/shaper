import { describe, expect, it } from "vitest";
import { buildOutline } from "@/lib/geometry/outline";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { computeFinPlacement, importedFinTailFromOutline, type FinPlacementSpec } from "@/lib/geometry/fins";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";

// Quick 261018-dw6 (D-01): a board saved before the Off-Rail tuner stores no nudge, and must open
// exactly where it was. Every snapshot below is built from the app's own builders and presets; the
// only typed numbers are the nudges themselves and the broken values.

function fieldsFor(preset: (typeof BOARD_PRESETS)[number]): DesignSnapshotFields {
  return {
    outline: preset.outline,
    rocker: DEFAULT_FALLBACK_ROCKER,
    foil: DEFAULT_FOIL_SPEC,
    rails: preset.rails,
    fins: preset.fins,
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: `${preset.name} saved`,
    finSystem: "fcs2",
    blank: null,
  };
}

/** A snapshot as it arrives from the database: built by the save path, then through JSON. */
function asStored(fields: DesignSnapshotFields): { version: number; design: { fins: { advanced: Record<string, unknown> } } } {
  return JSON.parse(JSON.stringify(buildSnapshot(fields)));
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** A preset's board as FINS reads it with Import Designed Board ticked. */
function importedBoard(fins: FinPlacementSpec, preset: (typeof BOARD_PRESETS)[number]) {
  const g = buildOutline(preset.outline);
  return {
    spec: { ...fins, boardLength: preset.outline.length, tailWidth12: g.tailWidthAt12in, tailShape: preset.outline.tail.kind },
    tail: importedFinTailFromOutline(g),
  };
}

describe("a board saved before the Off-Rail tuner opens exactly where it was", () => {
  for (const preset of BOARD_PRESETS) {
    it(`${preset.name}: both nudges read 0 and every fin lands where the preset puts it`, () => {
      const stored = asStored(fieldsFor(preset));
      delete stored.design.fins.advanced.forwardOffRailNudge;
      delete stored.design.fins.advanced.rearOffRailNudge;
      expect("forwardOffRailNudge" in stored.design.fins.advanced).toBe(false);

      const opened = parseSnapshot(stored);
      expect(opened.fins.advanced.forwardOffRailNudge).toBe(0);
      expect(opened.fins.advanced.rearOffRailNudge).toBe(0);

      for (const setup of ["thruster", "twin", "2plus1", "quad", "single"] as const) {
        const own = { ...preset.fins, finSetup: setup };
        const reopened = { ...opened.fins, finSetup: setup };
        expect(computeFinPlacement(reopened)).toEqual(computeFinPlacement(own));
        const a = importedBoard(own, preset);
        const b = importedBoard(reopened, preset);
        expect(computeFinPlacement(b.spec, b.tail)).toEqual(computeFinPlacement(a.spec, a.tail));
      }
    });
  }
});

describe("a board saved with a nudge reopens with the same nudge", () => {
  it("the forward and rear nudges round-trip exactly", () => {
    const preset = BOARD_PRESETS[0];
    const fields = fieldsFor(preset);
    const nudged: DesignSnapshotFields = {
      ...fields,
      fins: {
        ...fields.fins,
        advanced: {
          ...fields.fins.advanced,
          forwardOffRailNudge: inchesToMm(-0.125),
          rearOffRailNudge: inchesToMm(0.0625),
        },
      },
    };
    const opened = parseSnapshot(asStored(nudged));
    expect(opened.fins.advanced.forwardOffRailNudge).toBe(inchesToMm(-0.125));
    expect(opened.fins.advanced.rearOffRailNudge).toBe(inchesToMm(0.0625));
    expect(opened.fins).toEqual(nudged.fins);
  });
});

describe("a broken stored nudge reads as no nudge and never stops the board opening", () => {
  const preset = BOARD_PRESETS[1];
  const original = fieldsFor(preset);

  for (const [label, broken] of [
    ["a word", "abc"],
    ["null", null],
    ["a list", [1, 2]],
    ["a true", true],
  ] as const) {
    it(`${label} reads 0 and leaves the rest of the fins untouched`, () => {
      const stored = asStored(original);
      stored.design.fins.advanced.forwardOffRailNudge = broken;
      stored.design.fins.advanced.rearOffRailNudge = broken;
      const opened = parseSnapshot(stored);
      expect(opened.fins).toEqual(original.fins);
      expect(opened.fins.advanced.forwardOffRailNudge).toBe(0);
      expect(opened.fins.advanced.rearOffRailNudge).toBe(0);
    });
  }

  it("a missing key reads 0 and leaves the rest of the fins untouched", () => {
    const stored = asStored(original);
    delete stored.design.fins.advanced.forwardOffRailNudge;
    delete stored.design.fins.advanced.rearOffRailNudge;
    expect(parseSnapshot(stored).fins).toEqual(original.fins);
  });

  it("an enormous stored value is kept as stored and held inside the window by the maths, not rejected", () => {
    const stored = asStored(original);
    stored.design.fins.advanced.forwardOffRailNudge = 1e9;
    const opened = parseSnapshot(stored);
    expect(opened.fins.advanced.forwardOffRailNudge).toBe(1e9);
    expect(computeFinPlacement(opened.fins).resolved.forwardOffRail).toBeLessThan(inchesToMm(2) + 1e-6);
  });

  it("a deep-frozen stored snapshot parses without throwing", () => {
    const stored = deepFreeze(asStored(original));
    expect(() => parseSnapshot(stored)).not.toThrow();
  });
});
