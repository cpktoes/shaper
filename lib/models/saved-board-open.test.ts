import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import golden from "@/lib/geometry/__fixtures__/phase11-foil-golden.json";
import { phase11GoldenBlank } from "@/lib/geometry/__fixtures__/phase11-golden-blank";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildSnapshot, DESIGN_SNAPSHOT_VERSION, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";

// Phase 14 (acceptance 7, R8, D-19): opening a saved board shows it under the new curves and writes
// nothing back — the board keeps exactly what it stores until the shaper next saves it. And the
// rollback edge: if the site is rolled back one deployment after a board is saved with values a
// later step adds, today's reader still opens that board. Written before those values exist, so
// these tests pin today's reader, not a future one. Every snapshot is built from the app's own
// builders and fixtures; no number is typed.

/** Freezes a value and everything inside it, so any write to it throws in strict mode. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** A snapshot as it arrives from the database: built by the save path, then through JSON. */
function asStored(value: unknown): { version: number; design: Record<string, unknown> } {
  return JSON.parse(JSON.stringify(value));
}

const SHORTBOARD = BOARD_PRESETS.find((preset) => preset.id === "shortboard")!;

/** A version-5 board with a blank: the Shortboard preset as it opens, saved. */
function presetBoardFields(): DesignSnapshotFields {
  return {
    ...presetDesignFields(SHORTBOARD),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: `${SHORTBOARD.name} saved`,
    finSystem: "fcs2",
  };
}

/** A version-5 hand-set board: the first board a visitor sees, saved. */
function handSetBoardFields(): DesignSnapshotFields {
  return {
    outline: DEFAULT_BOARD_SPEC.outline,
    rocker: DEFAULT_FALLBACK_ROCKER,
    foil: DEFAULT_FOIL_SPEC,
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "Hand-set saved",
    finSystem: "fcs2",
    blank: null,
  };
}

/** A version-4 board as Phase 11 saved it (no cut on its blank), from the first Phase 11 golden case. */
function phase11Board() {
  const entry = golden.cases[0];
  return asStored({
    version: 4,
    design: {
      outline: { ...DEFAULT_BOARD_SPEC.outline, length: entry.boardLengthMm },
      foil: { ...DEFAULT_FOIL_SPEC, center: entry.centerThicknessMm, noseTip: entry.noseTipMm, tailTip: entry.tailTipMm },
      blank: {
        copy: phase11GoldenBlank(entry.vendor, entry.name),
        placement: entry.placementMm,
        nose12Offset: entry.nose12OffsetMm,
        tail12Offset: entry.tail12OffsetMm,
      },
    },
  });
}

describe("opening a saved board writes nothing to it (acceptance 7)", () => {
  const boards = [
    { label: "a version-5 board in a blank", stored: () => asStored(buildSnapshot(presetBoardFields())), current: true },
    { label: "a version-5 hand-set board", stored: () => asStored(buildSnapshot(handSetBoardFields())), current: true },
    { label: "a version-4 Phase 11 board", stored: phase11Board, current: false },
  ];

  it("builds the three boards the way the app stores them", () => {
    expect(boards[0].stored().version).toBe(DESIGN_SNAPSHOT_VERSION);
    expect(boards[0].stored().design.blank).not.toBeNull();
    expect(boards[1].stored().design.blank).toBeNull();
    expect(boards[2].stored().version).toBeLessThan(DESIGN_SNAPSHOT_VERSION);
    expect(Object.keys(boards[2].stored().design.blank as object)).not.toContain("tipStyle");
  });

  for (const { label, stored, current } of boards) {
    it(`${label}: opens without throwing and the stored board is unchanged`, () => {
      const frozen = deepFreeze(stored());
      const before = JSON.stringify(frozen);
      expect(() => parseSnapshot(frozen)).not.toThrow();
      expect(JSON.stringify(frozen)).toBe(before);
      if (current) {
        expect(buildSnapshot(parseSnapshot(frozen)).design).toEqual(frozen.design);
      }
    });
  }
});

describe("a board saved after the tips step opens on today's site (the rollback edge, written before the new values exist)", () => {
  /** The version-5 preset board as a later release might store it: two extra values on its blank,
   * one of them not even a number, in an envelope stamped with a newer version. */
  function savedLater() {
    const stored = asStored(buildSnapshot(presetBoardFields()));
    const blank = stored.design.blank as Record<string, unknown>;
    return asStored({
      version: DESIGN_SNAPSHOT_VERSION + 1,
      design: { ...stored.design, blank: { ...blank, noseThinningStart: 645, tailThinningStart: "abc" } },
    });
  }

  it("parses without throwing", () => {
    expect(savedLater().version).toBeGreaterThan(DESIGN_SNAPSHOT_VERSION);
    expect(() => parseSnapshot(deepFreeze(savedLater()))).not.toThrow();
  });

  it("returns a blank with exactly today's keys and the board otherwise as stored", () => {
    const later = parseSnapshot(deepFreeze(savedLater()));
    const today = parseSnapshot(asStored(buildSnapshot(presetBoardFields())));
    expect(later.blank).not.toBeNull();
    expect(Object.keys(later.blank!).sort()).toEqual(Object.keys(today.blank!).sort());
    expect(later.blank).not.toHaveProperty("noseThinningStart");
    expect(later.blank).not.toHaveProperty("tailThinningStart");
    expect(later).toEqual(today);
  });
});
