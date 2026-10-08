import { describe, expect, it, vi } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT } from "@/lib/geometry/blank";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { LIVE_DESIGN_RULES, designSideProfile, summarizeDesign, type DesignSummaryFields } from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { buildRackBoardArt } from "@/lib/geometry/rack-art";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm, mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { rackBoardFigures, rackModelsAndDrops, rackModelsFromRows, type RackRow } from "./rack-models";

/** WR-05: one saved board that can't be drawn drops only its own rack card, never the page. */

const MARKO = readSeedCatalog().find((blank) => blank.vendor === "Marko Foam" && blank.name === `6'0" M-Regular`)!;

const FIELDS: DesignSnapshotFields = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rocker: DEFAULT_FALLBACK_ROCKER,
  foil: DEFAULT_FOIL_SPEC,
  rails: DEFAULT_RAIL_BAND_SPEC,
  fins: DEFAULT_FIN_PLACEMENT_SPEC,
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  railsImportFoilThickness: true,
  boardName: "rack test",
  finSystem: "fcs2",
  blank: { copy: MARKO, placement: mm(0), nose12Offset: mm(0), tail12Offset: mm(0), ...DEFAULT_BLANK_CUT },
};

function row(id: string, fields: DesignSnapshotFields): RackRow {
  return { id, name: id, snapshot: JSON.parse(JSON.stringify(buildSnapshot(fields))), updatedAt: new Date(0) };
}

describe("rackModelsFromRows", () => {
  it("drops the reviewer's crafted 500 mm board in a blank, logs it, and keeps every other card", () => {
    const log = vi.fn();
    const crafted = row("crafted", { ...FIELDS, outline: { ...FIELDS.outline, length: mm(500) } });
    // Without the parser's length bound this board would throw inside summarizeDesign on render.
    expect(() => summarizeDesign({ ...FIELDS, outline: { ...FIELDS.outline, length: mm(500) } })).toThrow();
    const models = rackModelsFromRows([row("before", FIELDS), crafted, row("after", FIELDS)], log);
    expect(models.map((model) => model.id)).toEqual(["before", "after"]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain("crafted");
  });

  it("keeps a board just outside the length range as a hand-set card instead of dropping it", () => {
    const log = vi.fn();
    const short = inchesToMm(50);
    const models = rackModelsFromRows([row("short", { ...FIELDS, outline: { ...FIELDS.outline, length: short } })], log);
    expect(models).toHaveLength(1);
    expect(models[0].snapshot.blank).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it("drops a row that isn't a snapshot at all, and keeps the rest", () => {
    const log = vi.fn();
    const models = rackModelsFromRows(
      [{ id: "junk", name: "junk", snapshot: { version: 4, design: "nope" }, updatedAt: new Date(0) }, row("good", FIELDS)],
      log,
    );
    expect(models.map((model) => model.id)).toEqual(["good"]);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("hands a valid board back exactly as it parses", () => {
    const [model] = rackModelsFromRows([row("good", FIELDS)], vi.fn());
    expect(model.snapshot).toEqual(FIELDS);
    expect(model.name).toBe("good");
    expect(model.updatedAt).toEqual(new Date(0));
  });

  it("reads the lock: true is locked; null, false and a missing value are not (quick 261008-lsy)", () => {
    const withLock = (id: string, locked: boolean | null | undefined): RackRow => ({ ...row(id, FIELDS), locked });
    const result = rackModelsFromRows(
      [withLock("yes", true), withLock("nul", null), withLock("no", false), row("none", FIELDS)],
      vi.fn(),
    );
    expect(result.map((model) => [model.id, model.locked])).toEqual([
      ["yes", true],
      ["nul", false],
      ["no", false],
      ["none", false],
    ]);
  });

  describe("a board saved under Phase 11 takes the Tip Style it is handed (D-14)", () => {
    /** An UNTYPED version-4 envelope with a Phase 11 blank — no cut on the blank — so no typed
     * literal is left without a cut once 12-09 makes the cut required. */
    function phase11Row(id: string): RackRow {
      const envelope = JSON.parse(JSON.stringify(buildSnapshot(FIELDS)));
      envelope.version = 4;
      delete envelope.design.blank.deckSkin;
      delete envelope.design.blank.tipStyle;
      delete envelope.design.blank.fineTuneSurface;
      return { id, name: id, snapshot: envelope, updatedAt: new Date(0) };
    }

    it("carries a Phase 11 board over with the shaper's own Tip Style when one is passed", () => {
      const log = vi.fn();
      const [model] = rackModelsFromRows([phase11Row("old")], log, { tipStyle: "bottom" });
      expect(log).not.toHaveBeenCalled();
      expect(model.snapshot.blank?.tipStyle).toBe("bottom");
      expect(model.snapshot.blank?.deckSkin).toBe(DEFAULT_BLANK_CUT.deckSkin);
      expect(model.snapshot.blank?.fineTuneSurface).toBe("deck");
    });

    it("carries the same board over with Pin deck when no Tip Style is passed", () => {
      const [model] = rackModelsFromRows([phase11Row("old")], vi.fn());
      expect(model.snapshot.blank?.tipStyle).toBe("pinDeck");
      expect(model.snapshot.blank?.deckSkin).toBe(DEFAULT_BLANK_CUT.deckSkin);
      expect(model.snapshot.blank?.fineTuneSurface).toBe("deck");
    });

    it("leaves a board that already has its own cut exactly as saved, whatever Tip Style is passed", () => {
      const [withBottom] = rackModelsFromRows([row("new", FIELDS)], vi.fn(), { tipStyle: "bottom" });
      const [withNothing] = rackModelsFromRows([row("new", FIELDS)], vi.fn());
      expect(withBottom.snapshot).toEqual(FIELDS);
      expect(withNothing.snapshot).toEqual(FIELDS);
      expect(withBottom.snapshot.blank?.tipStyle).toBe("pinDeck");
    });
  });
});

/** Phase 15: a row also needs its rack art, worked out by the one function the browser and the
 * go-live report (D-13) use, so a board the rack can't draw is dropped by the same rule everywhere. */
describe("rackBoardFigures", () => {
  const PRESET_FIELDS: [string, DesignSummaryFields][] = BOARD_PRESETS.map((preset) => [
    preset.name,
    { ...presetDesignFields(preset), volume: DEFAULT_VOLUME_SPEC, railsImportFoilThickness: true },
  ]);
  const CASES: [string, DesignSummaryFields][] = [...PRESET_FIELDS, ["a hand-set board", { ...FIELDS, blank: null }]];

  it.each(CASES)("%s: the card's numbers and the rack art, from the board's own pipeline", (_, fields) => {
    const figures = rackBoardFigures(fields);
    expect(figures.summary).toEqual(summarizeDesign(fields));
    expect(figures.art).toEqual(buildRackBoardArt(designSideProfile(fields, LIVE_DESIGN_RULES), buildOutline(fields.outline)));
  });

  it("throws for the crafted 500 mm board in a blank", () => {
    expect(() => rackBoardFigures({ ...FIELDS, outline: { ...FIELDS.outline, length: mm(500) } })).toThrow();
  });
});

describe("rackModelsAndDrops", () => {
  const crafted = () => row("crafted", { ...FIELDS, outline: { ...FIELDS.outline, length: mm(500) } });
  const notASnapshot = (): RackRow => ({ id: "junk", name: "junk", snapshot: { nope: true }, updatedAt: new Date(0) });

  it("keeps the good boards and names every dropped board by id, in the order they came", () => {
    const log = vi.fn();
    const result = rackModelsAndDrops([row("before", FIELDS), crafted(), notASnapshot(), row("after", FIELDS)], log);
    expect(result.models.map((model) => model.id)).toEqual(["before", "after"]);
    expect(result.dropped).toEqual(["crafted", "junk"]);
    expect(log).toHaveBeenCalledTimes(2);
    expect(String(log.mock.calls[0][0])).toContain("crafted");
    expect(String(log.mock.calls[1][0])).toContain("junk");
  });

  it("rackModelsFromRows hands back exactly its models", () => {
    const rows = [row("before", FIELDS), crafted(), notASnapshot(), row("hand-set", { ...FIELDS, blank: null }), row("after", FIELDS)];
    expect(rackModelsFromRows(rows, vi.fn())).toEqual(rackModelsAndDrops(rows, vi.fn()).models);
  });
});
