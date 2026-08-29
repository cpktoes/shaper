import { describe, expect, it } from "vitest";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "@/lib/geometry/foil";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_ROCKER_SPEC, type RockerSpec } from "@/lib/geometry/rocker";
import { mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import {
  DESIGN_SNAPSHOT_VERSION,
  buildSnapshot,
  designSnapshotSchema,
  parseSnapshot,
  type DesignSnapshotFields,
} from "./design-snapshot";

/** One fixture per preset, using each preset's outline/rails/fins and the shared rocker/foil/
 * volume/name/fin-system defaults — the same field set a real save captures (D-11). No preset
 * carries its own rocker/foil yet (that tuning is a later plan's job — CONTEXT.md D-12), so every
 * fixture uses the shared defaults for those two fields. */
const FIXTURES: DesignSnapshotFields[] = BOARD_PRESETS.map((preset) => ({
  outline: preset.outline,
  rocker: DEFAULT_ROCKER_SPEC,
  foil: DEFAULT_FOIL_SPEC,
  rails: preset.rails,
  fins: preset.fins,
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  boardName: `${preset.name} test board`,
  finSystem: "fcs2",
}));

/** A distinct (non-default) rocker/foil pair, so the round-trip and reopen tests below actually
 * exercise real shaper-entered values rather than values that would also pass by coincidence if
 * the backfill path ran instead of the real one. */
const DISTINCT_ROCKER: RockerSpec = {
  noseTip: mm(130),
  nose12: mm(40),
  tail12: mm(12),
  tailTip: mm(60),
};
const DISTINCT_FOIL: FoilSpec = {
  noseTip: mm(10),
  nose12: mm(35),
  center: mm(65),
  tail12: mm(42),
  tailTip: mm(8),
};

/** Round-trips a fixture exactly the way a save and a reopen would: build, serialize over the
 * wire/DB boundary as JSON, then parse it back. */
function roundTrip(fields: DesignSnapshotFields): DesignSnapshotFields {
  const snapshot = buildSnapshot(fields);
  const wire = JSON.parse(JSON.stringify(snapshot));
  return parseSnapshot(wire);
}

describe("design-snapshot", () => {
  it.each(FIXTURES.map((f, i) => [BOARD_PRESETS[i].id, f] as const))(
    "%s: a full serialize/parse round trip returns a deeply-equal design",
    (_id, fields) => {
      expect(roundTrip(fields)).toEqual(fields);
    },
  );

  it("buildSnapshot stamps the current version", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    expect(snapshot.version).toBe(DESIGN_SNAPSHOT_VERSION);
  });

  it("DESIGN_SNAPSHOT_VERSION is 2", () => {
    expect(DESIGN_SNAPSHOT_VERSION).toBe(2);
  });

  it("a round trip returns the same rocker and foil values, field for field", () => {
    const fields: DesignSnapshotFields = { ...FIXTURES[0], rocker: DISTINCT_ROCKER, foil: DISTINCT_FOIL };
    const result = roundTrip(fields);
    expect(result.rocker).toEqual(DISTINCT_ROCKER);
    expect(result.foil).toEqual(DISTINCT_FOIL);
  });

  it("a snapshot with no rocker key parses successfully and returns DEFAULT_ROCKER_SPEC", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    delete wire.design.rocker;

    const parsed = parseSnapshot(wire);
    expect(parsed.rocker).toEqual(DEFAULT_ROCKER_SPEC);
    // Every other field survives untouched — only the missing one was backfilled.
    expect(parsed.foil).toEqual(FIXTURES[0].foil);
    expect(parsed.outline).toEqual(FIXTURES[0].outline);
  });

  it("a snapshot with no foil key parses successfully and returns a complete, finite DEFAULT_FOIL_SPEC", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    delete wire.design.foil;

    const parsed = parseSnapshot(wire);
    expect(parsed.foil).toEqual(DEFAULT_FOIL_SPEC);
    for (const value of Object.values(parsed.foil)) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("a whole version-1-shaped snapshot (no rocker, no foil) parses successfully with complete defaults for both, alongside its own seven restored fields", () => {
    const versionOneDesign = {
      outline: FIXTURES[0].outline,
      rails: FIXTURES[0].rails,
      fins: FIXTURES[0].fins,
      volume: FIXTURES[0].volume,
      finsImportTemplate: FIXTURES[0].finsImportTemplate,
      boardName: FIXTURES[0].boardName,
      finSystem: FIXTURES[0].finSystem,
    };
    const wire = JSON.parse(JSON.stringify({ version: 1, design: versionOneDesign }));

    const parsed = parseSnapshot(wire);
    expect(parsed.rocker).toEqual(DEFAULT_ROCKER_SPEC);
    expect(parsed.foil).toEqual(DEFAULT_FOIL_SPEC);
    expect(parsed.outline).toEqual(FIXTURES[0].outline);
    expect(parsed.rails).toEqual(FIXTURES[0].rails);
    expect(parsed.fins).toEqual(FIXTURES[0].fins);
    expect(parsed.volume).toEqual(FIXTURES[0].volume);
    expect(parsed.finsImportTemplate).toBe(FIXTURES[0].finsImportTemplate);
    expect(parsed.boardName).toBe(FIXTURES[0].boardName);
    expect(parsed.finSystem).toBe(FIXTURES[0].finSystem);
  });

  it("a present-but-malformed rocker still throws — tolerance is for absence, never a malformed present value", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    wire.design.rocker.noseTip = "not a number";

    expect(() => parseSnapshot(wire)).toThrow();
  });

  it("a snapshot missing a whole top-level field (an older version) still parses, with the default filled", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    delete wire.design.fins;

    const parsed = parseSnapshot(wire);
    expect(parsed.fins).toEqual(DEFAULT_FIN_PLACEMENT_SPEC);
    // Every other field survives untouched — only the missing one was backfilled.
    expect(parsed.outline).toEqual(FIXTURES[0].outline);
    expect(parsed.rails).toEqual(FIXTURES[0].rails);
  });

  it("a snapshot missing rails falls back to DEFAULT_RAIL_BAND_SPEC", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    delete wire.design.rails;

    expect(parseSnapshot(wire).rails).toEqual(DEFAULT_RAIL_BAND_SPEC);
  });

  it("rejects a structurally wrong snapshot rather than half-accepting it", () => {
    expect(() => parseSnapshot({ version: 1, design: { outline: "not an outline" } })).toThrow();
    expect(() => parseSnapshot({ version: "not a number", design: {} })).toThrow();
    expect(() => parseSnapshot(null)).toThrow();
    expect(() => parseSnapshot("just a string")).toThrow();
    expect(() => parseSnapshot([])).toThrow();
  });

  it("rejects a present-but-malformed nested field rather than defaulting it away", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    wire.design.outline.tail = { kind: "not-a-real-tail-kind" };

    expect(() => parseSnapshot(wire)).toThrow();
  });

  it("designSnapshotSchema alone recognizes a well-formed snapshot", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    expect(() => designSnapshotSchema.parse(wire)).not.toThrow();
  });
});
