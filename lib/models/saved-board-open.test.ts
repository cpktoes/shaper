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
import { inchesToMm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import {
  BLANK_THINNING_START_MAX_MM,
  buildSnapshot,
  DESIGN_SNAPSHOT_VERSION,
  parseSnapshot,
  type DesignSnapshotFields,
} from "./design-snapshot";

// Phase 14 (acceptance 7, R8, D-19): opening a saved board shows it under the new curves and writes
// nothing back — the board keeps exactly what it stores until the shaper next saves it. And the
// rollback edge: if the site is rolled back one deployment after a board is saved with values a
// later step adds, the earlier reader still opens that board (plan 14-05 proved it on that reader;
// plan 14-09 now makes the values real). Then where each tip's thinning starts (D-24): kept when
// valid, Automatic when absent or broken, never rewritten by opening. Every snapshot is built from
// the app's own builders and fixtures; the only numbers typed are the corrupt and rollback values.

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

describe("a board saved after the tips step still opens on the curves release (the rollback edge — proven on that release's own reader by plan 14-05)", () => {
  // Plan 14-05 committed this test against the curves release's reader, before the two starts
  // existed: there it proved both values were dropped and version 6 was accepted, so a board saved
  // after the tips step opens on Automatic if the site is rolled back. On today's reader the same
  // board keeps its valid start, drops its corrupt one, and still drops a key nobody knows.

  /** The version-5 preset board as a later release might store it: both starts (one of them not
   * even a number), a blank key no release knows, and an envelope stamped with a newer version. */
  function savedLater() {
    const stored = asStored(buildSnapshot(presetBoardFields()));
    const blank = stored.design.blank as Record<string, unknown>;
    return asStored({
      version: DESIGN_SNAPSHOT_VERSION + 1,
      design: {
        ...stored.design,
        blank: { ...blank, noseThinningStart: 645, tailThinningStart: "abc", futureField: true },
      },
    });
  }

  it("version 6 still parses without throwing", () => {
    expect(savedLater().version).toBe(6);
    expect(() => parseSnapshot(deepFreeze(savedLater()))).not.toThrow();
  });

  it("an unknown blank key is still dropped, 645 is now kept and \"abc\" now reads Automatic", () => {
    const later = parseSnapshot(deepFreeze(savedLater()));
    const today = parseSnapshot(asStored(buildSnapshot(presetBoardFields())));
    expect(later.blank).not.toBeNull();
    expect(later.blank).not.toHaveProperty("futureField");
    expect(later.blank!.noseThinningStart).toBe(645);
    expect("tailThinningStart" in later.blank!).toBe(false);
    expect(Object.keys(later.blank!).sort()).toEqual([...Object.keys(today.blank!), "noseThinningStart"].sort());
    expect(later).toEqual({ ...today, blank: { ...today.blank!, noseThinningStart: 645 } });
  });
});

describe("where each tip's thinning starts, stored on the blank (D-24)", () => {
  // Starts a shaper might set: the nose's 20" in, the tail's 14" in.
  const NOSE_START = inchesToMm(20);
  const TAIL_START = inchesToMm(14);

  /** The version-5 preset board, stored, with whatever start values are given on its blank. */
  function storedWithStarts(starts: Record<string, unknown>) {
    const stored = asStored(buildSnapshot(presetBoardFields()));
    return asStored({ ...stored, design: { ...stored.design, blank: { ...(stored.design.blank as object), ...starts } } });
  }

  /** The preset board with both starts set, as the app's own design fields. */
  function fieldsWithBothStarts(): DesignSnapshotFields {
    const fields = presetBoardFields();
    return { ...fields, blank: { ...fields.blank!, noseThinningStart: NOSE_START, tailThinningStart: TAIL_START } };
  }

  it("a valid start on each tip is kept exactly", () => {
    const parsed = parseSnapshot(storedWithStarts({ noseThinningStart: NOSE_START, tailThinningStart: TAIL_START }));
    expect(parsed.blank!.noseThinningStart).toBe(NOSE_START);
    expect(parsed.blank!.tailThinningStart).toBe(TAIL_START);
  });

  it("the bound's own ends are kept: 0 and BLANK_THINNING_START_MAX_MM", () => {
    const parsed = parseSnapshot(storedWithStarts({ noseThinningStart: 0, tailThinningStart: BLANK_THINNING_START_MAX_MM }));
    expect(parsed.blank!.noseThinningStart).toBe(0);
    expect(parsed.blank!.tailThinningStart).toBe(BLANK_THINNING_START_MAX_MM);
  });

  it("absent stays absent: a board with no start reads Automatic on both tips and carries no start key", () => {
    const parsed = parseSnapshot(asStored(buildSnapshot(presetBoardFields())));
    expect("noseThinningStart" in parsed.blank!).toBe(false);
    expect("tailThinningStart" in parsed.blank!).toBe(false);
  });

  for (const [label, bad] of [
    ['"x"', "x"],
    ["null", null],
    ["-3", -3],
    ["one past BLANK_THINNING_START_MAX_MM", BLANK_THINNING_START_MAX_MM + 1],
  ] as const) {
    it(`a stored start of ${label} parses without throwing and reads Automatic, leaving no key`, () => {
      const stored = deepFreeze(storedWithStarts({ noseThinningStart: bad, tailThinningStart: bad }));
      expect(() => parseSnapshot(stored)).not.toThrow();
      const parsed = parseSnapshot(stored);
      expect("noseThinningStart" in parsed.blank!).toBe(false);
      expect("tailThinningStart" in parsed.blank!).toBe(false);
      // The rest of the board opens exactly as a board that never had a start.
      expect(parsed).toEqual(parseSnapshot(asStored(buildSnapshot(presetBoardFields()))));
    });
  }

  it("one tip's corrupt start never costs the other tip its valid one", () => {
    const parsed = parseSnapshot(storedWithStarts({ noseThinningStart: NOSE_START, tailThinningStart: "x" }));
    expect(parsed.blank!.noseThinningStart).toBe(NOSE_START);
    expect("tailThinningStart" in parsed.blank!).toBe(false);
  });

  it("a Phase 11 version-4 board parses to a blank with no start (the carry-over sets none)", () => {
    const parsed = parseSnapshot(phase11Board());
    expect(parsed.blank).not.toBeNull();
    expect("noseThinningStart" in parsed.blank!).toBe(false);
    expect("tailThinningStart" in parsed.blank!).toBe(false);
  });

  it("a board with both starts round-trips: saving what was opened stores the same blank", () => {
    const stored = asStored(buildSnapshot(fieldsWithBothStarts()));
    expect(buildSnapshot(parseSnapshot(stored)).design.blank).toEqual(stored.design.blank);
  });

  it("a board back on Automatic is byte-for-byte a board that never had a start", () => {
    const withStarts = fieldsWithBothStarts();
    const { noseThinningStart, tailThinningStart, ...automatic } = withStarts.blank!;
    expect([noseThinningStart, tailThinningStart]).toEqual([NOSE_START, TAIL_START]);
    const backOnAutomatic = { ...withStarts, blank: automatic };
    expect(JSON.stringify(buildSnapshot(backOnAutomatic))).toBe(JSON.stringify(buildSnapshot(presetBoardFields())));
    expect(JSON.stringify(parseSnapshot(asStored(buildSnapshot(backOnAutomatic))))).toBe(
      JSON.stringify(parseSnapshot(asStored(buildSnapshot(presetBoardFields())))),
    );
  });

  it("opening a deep-frozen board with starts writes nothing to it", () => {
    const frozen = deepFreeze(asStored(buildSnapshot(fieldsWithBothStarts())));
    const before = JSON.stringify(frozen);
    expect(() => parseSnapshot(frozen)).not.toThrow();
    expect(JSON.stringify(frozen)).toBe(before);
    expect(buildSnapshot(parseSnapshot(frozen)).design).toEqual(frozen.design);
  });

  it("a corrupt stored start is never rewritten by opening (the frozen copy keeps it)", () => {
    const frozen = deepFreeze(storedWithStarts({ noseThinningStart: "x", tailThinningStart: -3 }));
    const before = JSON.stringify(frozen);
    parseSnapshot(frozen);
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it("a preset's blank sets no start", () => {
    const fields = presetDesignFields(SHORTBOARD);
    expect("noseThinningStart" in fields.blank!).toBe(false);
    expect("tailThinningStart" in fields.blank!).toBe(false);
  });
});
