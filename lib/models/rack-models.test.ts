import { describe, expect, it, vi } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT } from "@/lib/geometry/blank";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import {
  LIVE_DESIGN_RULES,
  designBottomBoard,
  designFinPlacement,
  designSideProfile,
  summarizeDesign,
  type DesignSummaryFields,
} from "@/lib/geometry/design";
import { DEFAULT_BOTTOM, bottomHasCut, startingChannels, startingCut, type BoardBottom } from "@/lib/geometry/bottom";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { buildRackBoardArt } from "@/lib/geometry/rack-art";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm, mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { SNAPSHOT_BOARD_LENGTH_MM, buildSnapshot, type DesignSnapshotFields } from "./design-snapshot";
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

  it.each(CASES)("%s: with its fins and Import Template box present and no bottom, the card reads exactly as before", (_, fields) => {
    const withFins = { ...fields, fins: DEFAULT_FIN_PLACEMENT_SPEC, finsImportTemplate: false };
    const without: DesignSummaryFields = { ...withFins };
    delete without.fins;
    delete without.finsImportTemplate;
    expect(rackBoardFigures(withFins).summary).toEqual(rackBoardFigures(without).summary);
  });

  it("a board's own fins reach the card: a Panel Vee follows the board's front fins, as VOLUME counts it (T-04-11)", () => {
    const preset = BOARD_PRESETS.find((p) => p.id === "fish")!;
    const base: DesignSummaryFields = { ...presetDesignFields(preset), volume: DEFAULT_VOLUME_SPEC, railsImportFoilThickness: true };
    const board = designBottomBoard(base.outline, buildOutline(base.outline), designSideProfile(base, LIVE_DESIGN_RULES), designFinPlacement(base));
    const bottom = { ...DEFAULT_BOTTOM, tail: startingCut("tail", "Panel Vee", board) };
    // the front fins moved 1" up the board from where the preset has them (FINS' own Forward Position offset)
    const movedFins = { ...base.fins!, advanced: { ...base.fins!.advanced, forwardPositionOffset: inchesToMm(1) } };
    const card = rackBoardFigures({ ...base, bottom, fins: movedFins });
    expect(card.summary).toEqual(summarizeDesign({ ...base, bottom, fins: movedFins }));
    expect(card.summary.volumeLitres).not.toBe(rackBoardFigures({ ...base, bottom }).summary.volumeLitres);
  });
});

describe("every preset opens flat (Phase 17, D-04)", () => {
  it.each(BOARD_PRESETS.map((preset) => [preset.name, preset] as const))("%s: no bottom of its own, and the store's opening bottom cuts nothing", (_, preset) => {
    const fields = presetDesignFields(preset);
    expect("bottom" in fields).toBe(false);
    expect(bottomHasCut(DEFAULT_BOTTOM)).toBe(false);
    const asOpened: DesignSummaryFields = { ...fields, volume: DEFAULT_VOLUME_SPEC, railsImportFoilThickness: true };
    expect(summarizeDesign({ ...asOpened, bottom: DEFAULT_BOTTOM })).toEqual(summarizeDesign(asOpened));
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

describe("a saved board's bottom reaches its rack card (Phase 17, D-24)", () => {
  const board = designBottomBoard(
    FIELDS.outline,
    buildOutline(FIELDS.outline),
    designSideProfile(FIELDS, LIVE_DESIGN_RULES),
    designFinPlacement(FIELDS),
  );
  const BOTTOM: BoardBottom = { ...DEFAULT_BOTTOM, center: startingCut("center", "Deep Single Concave", board) };

  it("the card counts the cut exactly as VOLUME does: fewer litres than the same board saved flat", () => {
    const log = vi.fn();
    const [flat, cut] = rackModelsFromRows([row("flat", FIELDS), row("cut", { ...FIELDS, bottom: BOTTOM })], log);
    expect(log).not.toHaveBeenCalled();
    expect("bottom" in flat.snapshot).toBe(false);
    expect(cut.snapshot.bottom).toEqual(BOTTOM);
    const card = rackBoardFigures(cut.snapshot);
    expect(card.summary).toEqual(summarizeDesign({ ...FIELDS, bottom: BOTTOM }));
    expect(card.summary.volumeLitres).toBeLessThan(rackBoardFigures(flat.snapshot).summary.volumeLitres);
  });

  it("a crafted bottom never drops the card: the board stands on the rack, flat", () => {
    const flatCard = rackBoardFigures(rackModelsFromRows([row("flat", FIELDS)], vi.fn())[0].snapshot).summary;
    for (const bad of ["x", 7, null, [], { nose: { name: "Bonzer", depth: 1e9 }, channels: { count: 5 }, wingRule: "widest" }]) {
      const log = vi.fn();
      const stored = row("crafted-bottom", FIELDS);
      (stored.snapshot as { design: Record<string, unknown> }).design.bottom = bad;
      const result = rackModelsAndDrops([row("before", FIELDS), stored, row("after", FIELDS)], log);
      expect(result.dropped, JSON.stringify(bad)).toEqual([]);
      expect(log).not.toHaveBeenCalled();
      expect(result.models.map((model) => model.id)).toEqual(["before", "crafted-bottom", "after"]);
      expect("bottom" in result.models[1].snapshot, JSON.stringify(bad)).toBe(false);
      expect(rackBoardFigures(result.models[1].snapshot).summary).toEqual(flatCard);
    }
  });

  it("a bottom at the furthest numbers the reader lets through still makes a card", () => {
    const far = SNAPSHOT_BOARD_LENGTH_MM.max;
    const numbers = {
      offRail: inchesToMm(12),
      offStringer: inchesToMm(12),
      troughAt: inchesToMm(12),
      start: far,
      deepest: far,
      end: mm(-far),
      depth: inchesToMm(1),
      veeLift: inchesToMm(1),
      smoothness: 100,
      closesToPoint: true,
    };
    const edge: BoardBottom = {
      nose: { name: "Teardrop Nose Concave", ...numbers },
      center: { name: "Early Double Concave", ...numbers },
      tail: { name: "Spiral Vee", ...numbers },
      channels: {
        ...startingChannels(8, board, DEFAULT_BOTTOM.channels),
        width: inchesToMm(12),
        offStringer: inchesToMm(12),
        startFromFins: far,
        deepestFromFins: mm(-far),
        depth: inchesToMm(1),
        stagger: inchesToMm(12),
      },
      wingRule: "natural",
    };
    const log = vi.fn();
    const result = rackModelsAndDrops([row("edge", { ...FIELDS, bottom: edge })], log);
    expect(result.dropped).toEqual([]);
    expect(log).not.toHaveBeenCalled();
    expect(result.models[0].snapshot.bottom).toEqual(edge);
    expect(Number.isFinite(rackBoardFigures(result.models[0].snapshot).summary.volumeLitres)).toBe(true);
  });
});
