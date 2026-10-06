import { describe, expect, it, vi } from "vitest";
import { inchesToMm } from "@/lib/geometry/units";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { rackModelsFromRows } from "./rack-models";
import {
  RACK_STAND_IN_DEFAULT_COUNT,
  RACK_STAND_IN_ENV,
  RACK_STAND_IN_MAX_COUNT,
  RACK_STAND_IN_ROUTE,
  STAND_IN_LONG_NAME,
  rackStandInRouteEnabled,
  standInBoardCount,
  standInRackRows,
} from "./rack-stand-in";

/**
 * Phase 15's practice rack (RESEARCH Pattern 8): the stand-in boards the browser suite sees at
 * `/test-rack`, and the switch that keeps that page off the live site — pinned exactly like
 * `forcedErrorRouteEnabled`'s own truth table.
 */

describe("RACK_STAND_IN_ROUTE / RACK_STAND_IN_ENV / counts", () => {
  it("names the route, the flag and the counts", () => {
    expect(RACK_STAND_IN_ROUTE).toBe("/test-rack");
    expect(RACK_STAND_IN_ENV).toBe("SHAPER_RACK_STAND_IN");
    expect(RACK_STAND_IN_DEFAULT_COUNT).toBe(15);
    expect(RACK_STAND_IN_MAX_COUNT).toBe(100);
  });
});

describe("rackStandInRouteEnabled", () => {
  it("is true in development with the flag on", () => {
    expect(rackStandInRouteEnabled({ nodeEnv: "development", flag: "1" })).toBe(true);
  });

  it("is false in production even with the flag on", () => {
    expect(rackStandInRouteEnabled({ nodeEnv: "production", flag: "1" })).toBe(false);
  });

  it("is false in production with no flag", () => {
    expect(rackStandInRouteEnabled({ nodeEnv: "production", flag: undefined })).toBe(false);
  });

  it("is false in development with no flag", () => {
    expect(rackStandInRouteEnabled({ nodeEnv: "development", flag: undefined })).toBe(false);
  });

  it("is false in development with flag 'true' (not the exact string '1')", () => {
    expect(rackStandInRouteEnabled({ nodeEnv: "development", flag: "true" })).toBe(false);
  });

  it("is false in development with flag ' 1' (not exactly '1')", () => {
    expect(rackStandInRouteEnabled({ nodeEnv: "development", flag: " 1" })).toBe(false);
  });
});

describe("standInBoardCount", () => {
  it("is 15 with no ?boards= at all", () => {
    expect(standInBoardCount(undefined)).toBe(15);
  });

  it("reads a plain number", () => {
    expect(standInBoardCount("30")).toBe(30);
    expect(standInBoardCount("1")).toBe(1);
  });

  it("clamps to 1 to 100", () => {
    expect(standInBoardCount("0")).toBe(1);
    expect(standInBoardCount("-4")).toBe(1);
    expect(standInBoardCount("500")).toBe(100);
  });

  it("is 15 for anything unreadable", () => {
    expect(standInBoardCount("abc")).toBe(15);
    expect(standInBoardCount("")).toBe(15);
    expect(standInBoardCount("12abc")).toBe(15);
    expect(standInBoardCount([])).toBe(15);
  });

  it("reads the first of a repeated ?boards=", () => {
    expect(standInBoardCount(["4", "9"])).toBe(4);
  });
});

describe("standInRackRows", () => {
  it("gives 100 rows with unique ids that all pass the rack's own validation, nothing logged", () => {
    const rows = standInRackRows(100);
    expect(rows).toHaveLength(100);
    expect(new Set(rows.map((row) => row.id)).size).toBe(100);
    expect(rows[0].id).toBe("stand-in-01");
    const log = vi.fn();
    const models = rackModelsFromRows(rows, log);
    expect(models).toHaveLength(100);
    expect(log).not.toHaveBeenCalled();
  });

  it("every count from 1 to 100 survives the rack's validation with that many boards", () => {
    for (let count = 1; count <= 100; count++) {
      const log = vi.fn();
      expect(rackModelsFromRows(standInRackRows(count), log)).toHaveLength(count);
      expect(log).not.toHaveBeenCalled();
    }
  });

  it("is deterministic", () => {
    expect(standInRackRows(30)).toEqual(standInRackRows(30));
  });

  it("starts with the four presets in their own blanks, the Fish a swallow", () => {
    const models = rackModelsFromRows(standInRackRows(4));
    expect(models.map((model) => model.name)).toEqual(BOARD_PRESETS.map((preset) => preset.name));
    for (const model of models) expect(model.snapshot.blank).not.toBeNull();
    expect(models[1].snapshot.outline.tail.kind).toBe("swallow");
  });

  it("holds hand-set boards from 5'2\" to 9'4\"", () => {
    const models = rackModelsFromRows(standInRackRows(100));
    expect(models.some((model) => model.snapshot.blank === null)).toBe(true);
    const lengths = models.map((model) => model.snapshot.outline.length);
    expect(Math.min(...lengths)).toBeCloseTo(inchesToMm(62), 6);
    expect(Math.max(...lengths)).toBeCloseTo(inchesToMm(112), 6);
  });

  it("holds one board with a long name, and every board's own name matches its row", () => {
    const rows = standInRackRows(100);
    expect(STAND_IN_LONG_NAME.length).toBeGreaterThan(40);
    expect(rows.filter((row) => row.name === STAND_IN_LONG_NAME)).toHaveLength(1);
    expect(rows[5].name).toBe(STAND_IN_LONG_NAME);
    for (const model of rackModelsFromRows(rows)) expect(model.snapshot.boardName).toBe(model.name);
  });

  it("steps each board one hour further back, so the automatic order is the list order", () => {
    const rows = standInRackRows(100);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].updatedAt.getTime()).toBe(rows[i - 1].updatedAt.getTime() - 3_600_000);
    }
  });
});
