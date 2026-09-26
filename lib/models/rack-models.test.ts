import { describe, expect, it, vi } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { summarizeDesign } from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { inchesToMm, mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { buildSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import { rackModelsFromRows, type RackRow } from "./rack-models";

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
  blank: { copy: MARKO, placement: mm(0), nose12Offset: mm(0), tail12Offset: mm(0) },
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
});
