import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import golden from "@/lib/geometry/__fixtures__/phase11-foil-golden.json";
import { DEFAULT_BLANK_CUT, type BlankRecord, type BoardBlank, type TipStyle } from "@/lib/geometry/blank";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { buildBoardProfile } from "@/lib/geometry/board-profile";
import { formatMark } from "@/lib/geometry/measure-display";
import { carryPhase11Blank } from "@/lib/geometry/phase11-foil";
import { summarizeDesign } from "@/lib/geometry/design";
import { MEASURE_STATION_MM } from "@/lib/geometry/outline";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "@/lib/geometry/foil";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import {
  DEFAULT_FALLBACK_ROCKER,
  DEFAULT_ROCKER_SPEC,
  bezierToFiveStations,
  type FiveStationRocker,
  type RockerSpec,
} from "@/lib/geometry/rocker";
import { degrees, inchesToMm, mm, UNITS_SYSTEMS } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { FIT_DEFAULTS_RANGE_IN } from "@/lib/fit-defaults-preference";
import {
  BLANK_DECK_SKIN_MAX_MM,
  DESIGN_SNAPSHOT_VERSION,
  SNAPSHOT_BOARD_LENGTH_MM,
  boardBlankSchema,
  hasPhase11Blank,
  isBoardLengthInRange,
  buildSnapshot,
  designSnapshotSchema,
  parseSnapshot,
  type DesignSnapshotFields,
} from "./design-snapshot";

/** One fixture per preset, using each preset's outline/rails/fins and the shared rocker/foil/
 * volume/name/fin-system defaults — the same field set a real save captures (D-11). No blank: a
 * preset gets its blank in 11-10. */
const FIXTURES: DesignSnapshotFields[] = BOARD_PRESETS.map((preset) => ({
  outline: preset.outline,
  rocker: DEFAULT_FALLBACK_ROCKER,
  foil: DEFAULT_FOIL_SPEC,
  rails: preset.rails,
  fins: preset.fins,
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  railsImportFoilThickness: true,
  boardName: `${preset.name} test board`,
  finSystem: "fcs2",
  blank: null,
}));

/** A fixture whose outline is NOT the default length, so "read at the board's own length" is
 * actually exercised by the migration tests (a default-length board would pass by coincidence). */
const LONG_FIXTURE: DesignSnapshotFields = (() => {
  const index = BOARD_PRESETS.findIndex((preset) => preset.outline.length !== DEFAULT_BOARD_SPEC.outline.length);
  return FIXTURES[index];
})();

/** A distinct (non-default) rocker/foil pair, so the round-trip and reopen tests below exercise real
 * shaper-entered values rather than values that would also pass if a backfill path ran instead. */
const DISTINCT_ROCKER: FiveStationRocker = {
  noseTip: inchesToMm(5.125),
  nose12: inchesToMm(1.5),
  tail12: inchesToMm(0.5),
  tailTip: inchesToMm(2.25),
};
const DISTINCT_FOIL: FoilSpec = {
  noseTip: mm(10),
  nose12: mm(35),
  center: mm(65),
  tail12: mm(42),
  tailTip: mm(8),
};
/** A version-3 eight-field Bezier rocker, as a board saved before Phase 11 carries it. */
const V3_BEZIER: RockerSpec = {
  noseLift: mm(130),
  tailLift: mm(60),
  noseAngle: degrees(35),
  tailAngle: degrees(28),
  noseSmoothness: 62,
  tailSmoothness: 18,
  noseFlatness: 74,
  tailFlatness: 45,
};

/** The top-level design keys a version-3 snapshot carried — the ten fields before Phase 11. */
const V3_KEYS = [
  "outline",
  "rocker",
  "foil",
  "rails",
  "fins",
  "volume",
  "finsImportTemplate",
  "railsImportFoilThickness",
  "boardName",
  "finSystem",
];

const CATALOG = readSeedCatalog();
/** A real catalogue blank, read through the tested catalogue reader — never hand-typed numbers. */
const MARKO: BlankRecord = (() => {
  const record = CATALOG.find((blank) => blank.vendor === "Marko Foam" && blank.name === `6'0" M-Regular`);
  if (!record) throw new Error("the seed catalogue no longer carries Marko Foam 6'0\" M-Regular");
  return record;
})();

/** A version-5 blank: the board's copy, placement, two fine-tunes and its cut (rule 5). */
function boardBlank(copy: BlankRecord = MARKO): BoardBlank {
  return { copy, placement: inchesToMm(0.5), nose12Offset: mm(-1.5), tail12Offset: mm(2), ...DEFAULT_BLANK_CUT };
}

type GoldenCase = (typeof golden.cases)[number];

/** A version-4 envelope for one golden case, exactly as Phase 11 saved such a board: no cut on the
 * blank. Built from the case's own inputs and the catalogue record — never typed numbers. */
function phase11Envelope(entry: GoldenCase, version = 4) {
  const copy = CATALOG.find((blank) => blank.vendor === entry.vendor && blank.name === entry.name);
  if (!copy) throw new Error(`${entry.vendor} ${entry.name} is not in the seeded catalogue`);
  return JSON.parse(
    JSON.stringify({
      version,
      design: {
        outline: { ...DEFAULT_BOARD_SPEC.outline, length: entry.boardLengthMm },
        foil: {
          ...DEFAULT_FOIL_SPEC,
          center: entry.centerThicknessMm,
          noseTip: entry.noseTipMm,
          tailTip: entry.tailTipMm,
        },
        blank: {
          copy,
          placement: entry.placementMm,
          nose12Offset: entry.nose12OffsetMm,
          tail12Offset: entry.tail12OffsetMm,
        },
      },
    }),
  );
}

/** The side profile of a parsed board, built from the parsed fields and the parsed blank's own cut. */
function profileOf(parsed: DesignSnapshotFields) {
  const blank = parsed.blank!;
  return buildBoardProfile({
    length: parsed.outline.length,
    rocker: parsed.rocker,
    foil: parsed.foil,
    blank: {
      prepared: prepareBlank(blank.copy),
      placement: blank.placement,
      nose12Offset: blank.nose12Offset,
      tail12Offset: blank.tail12Offset,
      deckSkin: blank.deckSkin,
      tipStyle: blank.tipStyle,
      fineTuneSurface: blank.fineTuneSurface,
    },
  });
}

const STATION_KEYS = ["tailTip", "tail12", "center", "nose12", "noseTip"] as const;

/** Round-trips a fixture exactly the way a save and a reopen would: build, serialize over the
 * wire/DB boundary as JSON, then parse it back. */
function roundTrip(fields: DesignSnapshotFields): DesignSnapshotFields {
  const snapshot = buildSnapshot(fields);
  const wire = JSON.parse(JSON.stringify(snapshot));
  return parseSnapshot(wire);
}

/** A version-4 snapshot of FIXTURES[0] with a blank, as it would arrive over the wire — for the
 * rejection tests to tamper with. */
function wireWithBlank(): { version: number; design: Record<string, unknown> & { blank: Record<string, unknown> & { copy: { stations: Record<string, unknown>[] } & Record<string, unknown> } } } {
  return JSON.parse(JSON.stringify(buildSnapshot({ ...FIXTURES[0], blank: boardBlank() })));
}

/** A design as a version-3-or-older save wrote it: every field but `blank`, which did not exist. */
function withoutBlank(fields: DesignSnapshotFields): Omit<DesignSnapshotFields, "blank"> {
  const copy: Partial<DesignSnapshotFields> = { ...fields };
  delete copy.blank;
  return copy as Omit<DesignSnapshotFields, "blank">;
}

/** A synthetic pickable station list of any length, strictly tail to nose, with a `C` station. */
function stationsOf(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    label: i === Math.floor(count / 2) ? "C" : `S${i}`,
    fromTailMm: i * 50,
    rockerMm: 10,
    thicknessMm: 60,
    widthMm: 400,
    flag: null,
  }));
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

  it("DESIGN_SNAPSHOT_VERSION is 5", () => {
    expect(DESIGN_SNAPSHOT_VERSION).toBe(5);
  });

  it("DEFAULT_BOARD_SPEC's rocker is the five-station hand-set default", () => {
    expect(DEFAULT_BOARD_SPEC.rocker).toEqual(DEFAULT_FALLBACK_ROCKER);
  });

  it("a round trip returns the same five-station rocker and foil values, field for field", () => {
    const fields: DesignSnapshotFields = { ...FIXTURES[0], rocker: DISTINCT_ROCKER, foil: DISTINCT_FOIL };
    const result = roundTrip(fields);
    expect(result.rocker).toEqual(DISTINCT_ROCKER);
    expect(result.foil).toEqual(DISTINCT_FOIL);
  });

  it("a round trip preserves railsImportFoilThickness in both the true and false states", () => {
    for (const railsImportFoilThickness of [true, false]) {
      const fields: DesignSnapshotFields = { ...FIXTURES[0], railsImportFoilThickness };
      expect(roundTrip(fields).railsImportFoilThickness).toBe(railsImportFoilThickness);
    }
  });

  it("a snapshot with no railsImportFoilThickness key parses and returns true, so a pre-phase board reopens linked", () => {
    const snapshot = buildSnapshot(FIXTURES[0]);
    const wire = JSON.parse(JSON.stringify(snapshot));
    delete wire.design.railsImportFoilThickness;

    const parsed = parseSnapshot(wire);
    expect(parsed.railsImportFoilThickness).toBe(true);
    // Every other field survives untouched — only the missing one was backfilled.
    expect(parsed.rails).toEqual(FIXTURES[0].rails);
    expect(parsed.foil).toEqual(FIXTURES[0].foil);
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

  describe("a thin tip saved before the 1/4\" floor reopens as saved (Phase 13 item 4)", () => {
    it("a hand-set board with a 3/16\" nose tip and a 1/8\" tail tip reopens with exactly those two tips", () => {
      const fields: DesignSnapshotFields = {
        ...FIXTURES[0],
        foil: { ...DEFAULT_FOIL_SPEC, noseTip: inchesToMm(3 / 16), tailTip: inchesToMm(1 / 8) },
      };
      const result = roundTrip(fields);
      expect(result.foil.noseTip).toBe(inchesToMm(3 / 16));
      expect(result.foil.tailTip).toBe(inchesToMm(1 / 8));
    });

    it("the same board WITH a blank reopens with exactly those two tips too", () => {
      const fields: DesignSnapshotFields = {
        ...FIXTURES[0],
        foil: { ...DEFAULT_FOIL_SPEC, noseTip: inchesToMm(3 / 16), tailTip: inchesToMm(1 / 8) },
        blank: boardBlank(),
      };
      const result = roundTrip(fields);
      expect(result.foil.noseTip).toBe(inchesToMm(3 / 16));
      expect(result.foil.tailTip).toBe(inchesToMm(1 / 8));
    });
  });

  describe("older versions reopen as they were saved, now as five stations (D-14)", () => {
    it("version 1 (no rocker, no foil, no blank): the default curve is read at the board's own length", () => {
      const versionOneDesign = {
        outline: LONG_FIXTURE.outline,
        rails: LONG_FIXTURE.rails,
        fins: LONG_FIXTURE.fins,
        volume: LONG_FIXTURE.volume,
        finsImportTemplate: LONG_FIXTURE.finsImportTemplate,
        boardName: LONG_FIXTURE.boardName,
        finSystem: LONG_FIXTURE.finSystem,
      };
      const wire = JSON.parse(JSON.stringify({ version: 1, design: versionOneDesign }));

      const parsed = parseSnapshot(wire);
      expect(parsed.rocker).toEqual(bezierToFiveStations(DEFAULT_ROCKER_SPEC, LONG_FIXTURE.outline.length));
      expect(parsed.blank).toBeNull();
      expect(parsed.foil).toEqual(DEFAULT_FOIL_SPEC);
      // A version-1 snapshot predates the link entirely, so it reopens linked (D-15).
      expect(parsed.railsImportFoilThickness).toBe(true);
      expect(parsed.outline).toEqual(LONG_FIXTURE.outline);
      expect(parsed.rails).toEqual(LONG_FIXTURE.rails);
      expect(parsed.fins).toEqual(LONG_FIXTURE.fins);
      expect(parsed.volume).toEqual(LONG_FIXTURE.volume);
      expect(parsed.finsImportTemplate).toBe(LONG_FIXTURE.finsImportTemplate);
      expect(parsed.boardName).toBe(LONG_FIXTURE.boardName);
      expect(parsed.finSystem).toBe(LONG_FIXTURE.finSystem);
    });

    it("version 2 (the four-lift rocker): maps straight onto the five-station shape unchanged", () => {
      const v2Design = withoutBlank(FIXTURES[0]);
      const saved = { noseTip: 100, nose12: 30, tail12: 10, tailTip: 45 };
      const wire = JSON.parse(JSON.stringify({ version: 2, design: { ...v2Design, rocker: saved } }));

      const parsed = parseSnapshot(wire);
      expect(parsed.rocker).toEqual(saved);
      expect(parsed.blank).toBeNull();
      expect(parsed.outline).toEqual(FIXTURES[0].outline);
    });

    it("version 3 (the eight-field curve): read at the five stations at the board's own length, key for key", () => {
      const v3Design = withoutBlank(LONG_FIXTURE);
      const wire = JSON.parse(JSON.stringify({ version: 3, design: { ...v3Design, rocker: V3_BEZIER } }));

      const parsed = parseSnapshot(wire);
      const expected = bezierToFiveStations(V3_BEZIER, LONG_FIXTURE.outline.length);
      expect(Object.keys(parsed.rocker).sort()).toEqual(["nose12", "noseTip", "tail12", "tailTip"]);
      for (const key of Object.keys(expected) as (keyof FiveStationRocker)[]) {
        expect(parsed.rocker[key]).toBe(expected[key]);
      }
      expect(parsed.blank).toBeNull();
      // Every other field survives untouched — only the rocker was migrated.
      expect(parsed.foil).toEqual(LONG_FIXTURE.foil);
      expect(parsed.outline).toEqual(LONG_FIXTURE.outline);
    });

    it("version 4 without a blank: blank reads null, and an absent blank key reads null too", () => {
      expect(roundTrip(FIXTURES[0]).blank).toBeNull();
      const wire = JSON.parse(JSON.stringify(buildSnapshot(FIXTURES[0])));
      delete wire.design.blank;
      expect(parseSnapshot(wire).blank).toBeNull();
    });

    it("a version-5 blank round-trips deep-equal, copy and cut and all (D-01, rule 5)", () => {
      for (const cut of [
        DEFAULT_BLANK_CUT,
        { deckSkin: inchesToMm(3 / 16), tipStyle: "bottom", fineTuneSurface: "bottom" } as const,
      ]) {
        const fields: DesignSnapshotFields = {
          ...FIXTURES[0],
          rocker: DISTINCT_ROCKER,
          blank: { ...boardBlank(), ...cut },
        };
        const result = roundTrip(fields);
        expect(result).toEqual(fields);
        expect(result.blank?.copy).toEqual(MARKO);
      }
    });

    it("every version-4 board with a blank reopens with its five station numbers exactly as Phase 11 showed them", () => {
      for (const entry of golden.cases) {
        const parsed = parseSnapshot(phase11Envelope(entry), { tipStyle: "pinDeck" });
        const blank = parsed.blank!;
        expect(blank, entry.label).not.toBeNull();
        expect(blank.deckSkin).toBe(DEFAULT_BLANK_CUT.deckSkin);
        expect(blank.tipStyle).toBe("pinDeck");
        expect(blank.fineTuneSurface).toBe("deck");
        const profile = profileOf(parsed);
        for (const key of STATION_KEYS) {
          const shown = profile.effectiveFoil[key];
          const saved = mm(entry.thicknessMm[key]);
          expect(shown, `${entry.label} ${key}`).toBeCloseTo(saved, 9);
          for (const system of UNITS_SYSTEMS) {
            expect(formatMark(shown, system), `${entry.label} ${key} ${system}`).toBe(formatMark(saved, system));
          }
        }
        // Re-saving and reopening the carried board changes nothing — no second carry-over.
        expect(roundTrip(parsed), entry.label).toEqual(parsed);
      }
    });

    it("a version-4 board carried over under Bottom keeps the same five thicknesses — Tip Style never moves a 12\" number", () => {
      for (const entry of golden.cases) {
        const pin = profileOf(parseSnapshot(phase11Envelope(entry), { tipStyle: "pinDeck" }));
        const parsed = parseSnapshot(phase11Envelope(entry), { tipStyle: "bottom" });
        expect(parsed.blank!.tipStyle).toBe("bottom");
        const bottom = profileOf(parsed);
        for (const key of STATION_KEYS) {
          expect(bottom.effectiveFoil[key], `${entry.label} ${key}`).toBeCloseTo(entry.thicknessMm[key], 9);
          expect(bottom.effectiveFoil[key]).toBeCloseTo(pin.effectiveFoil[key], 9);
        }
      }
    });

    it("a carried-over board with no Tip Style passed in takes the out-of-the-box one", () => {
      const parsed = parseSnapshot(phase11Envelope(golden.cases[0]));
      expect(parsed.blank!.tipStyle).toBe(DEFAULT_BLANK_CUT.tipStyle);
      expect(parsed.blank!.deckSkin).toBe(DEFAULT_BLANK_CUT.deckSkin);
      expect(parsed.blank!.fineTuneSurface).toBe(DEFAULT_BLANK_CUT.fineTuneSurface);
    });
  });

  describe("the carry-over is decided by the blank's shape, never the version number (rule 5, Pitfall 5)", () => {
    it("a blank with no cut stamped version 5 (a tab left open across the deploy) is carried over like a version-4 one", () => {
      // A golden case with a non-zero residual, so a carry-over is visible in the offsets.
      const entry = golden.cases.find((c) => c.label === "dev-board")!;
      const asV4 = parseSnapshot(phase11Envelope(entry, 4), { tipStyle: "pinDeck" });
      const asV5 = parseSnapshot(phase11Envelope(entry, 5), { tipStyle: "pinDeck" });
      expect(asV5).toEqual(asV4);
      expect(asV5.blank!.nose12Offset).not.toBe(entry.nose12OffsetMm);
      expect(asV5.blank!.tail12Offset).not.toBe(entry.tail12OffsetMm);
    });

    it("a blank that already carries its cut is returned as stored, even stamped version 4", () => {
      const fields: DesignSnapshotFields = { ...FIXTURES[0], blank: boardBlank() };
      const wire = JSON.parse(JSON.stringify(buildSnapshot(fields)));
      wire.version = 4;
      expect(parseSnapshot(wire, { tipStyle: "bottom" }).blank).toEqual(fields.blank);
    });

    it("hasPhase11Blank reads the blank's shape only", () => {
      const entry = golden.cases[0];
      expect(hasPhase11Blank(phase11Envelope(entry, 4))).toBe(true);
      expect(hasPhase11Blank(phase11Envelope(entry, 5))).toBe(true);
      const withCut = JSON.parse(JSON.stringify(buildSnapshot({ ...FIXTURES[0], blank: boardBlank() })));
      expect(hasPhase11Blank(withCut)).toBe(false);
      expect(hasPhase11Blank({ ...withCut, version: 4 })).toBe(false);
      expect(hasPhase11Blank(JSON.parse(JSON.stringify(buildSnapshot(FIXTURES[0]))))).toBe(false);
      for (const value of [null, undefined, "x", 4, [], {}, { design: null }, { design: { blank: "x" } }]) {
        expect(hasPhase11Blank(value)).toBe(false);
      }
    });

    it("a carried tweak beyond the ±50 mm bound is clamped to it, and the board re-parses", () => {
      // A thin centre in a thick blank at full length, with a large saved tail tweak: Phase 11's
      // 12" thickness then sits far above the new cut's, so the raw residual passes the bound.
      const length = MARKO.lengthMm;
      const board = {
        length,
        centerThickness: inchesToMm(1),
        noseTip: inchesToMm(5 / 16),
        tailTip: inchesToMm(1 / 4),
        nose12Offset: mm(0),
        tail12Offset: mm(45),
      };
      const raw = carryPhase11Blank(prepareBlank(MARKO), board, mm(0), "pinDeck");
      expect(raw.tail12Offset).toBeGreaterThan(50);
      const wire = JSON.parse(
        JSON.stringify({
          version: 4,
          design: {
            outline: { ...DEFAULT_BOARD_SPEC.outline, length },
            foil: { ...DEFAULT_FOIL_SPEC, center: board.centerThickness, noseTip: board.noseTip, tailTip: board.tailTip },
            blank: { copy: MARKO, placement: 0, nose12Offset: 0, tail12Offset: 45 },
          },
        }),
      );
      const parsed = parseSnapshot(wire);
      expect(parsed.blank!.tail12Offset).toBe(50);
      expect(() => roundTrip(parsed)).not.toThrow();
      expect(roundTrip(parsed)).toEqual(parsed);
    });
  });

  it("R1 / D-12: the snapshot has one blank key, and the blank carries its cut but no board centre of its own", () => {
    const snapshot = buildSnapshot({ ...FIXTURES[0], blank: boardBlank() });
    expect(Object.keys(snapshot.design).sort()).toEqual([...V3_KEYS, "blank"].sort());
    expect(Object.keys(snapshot.design.blank!).sort()).toEqual(
      ["copy", "deckSkin", "fineTuneSurface", "nose12Offset", "placement", "tail12Offset", "tipStyle"].sort(),
    );
  });

  describe("a malformed cut on a version-5 blank is rejected (rule 5 — untrusted input)", () => {
    const CUT_KEYS = ["deckSkin", "tipStyle", "fineTuneSurface"] as const;

    it("a blank carrying only one or two of its three cut fields is rejected", () => {
      for (let mask = 1; mask < 7; mask++) {
        const wire = wireWithBlank();
        CUT_KEYS.forEach((key, i) => {
          if (!(mask & (1 << i))) delete wire.design.blank[key];
        });
        expect(() => parseSnapshot(wire), `kept ${mask}`).toThrow();
      }
    });

    it("an unknown Tip Style or fine-tune surface is rejected", () => {
      const sideways = wireWithBlank();
      sideways.design.blank.tipStyle = "sideways";
      expect(() => parseSnapshot(sideways)).toThrow();
      const rail = wireWithBlank();
      rail.design.blank.fineTuneSurface = "rail";
      expect(() => parseSnapshot(rail)).toThrow();
    });

    it("a deck skin under 0 or over 50 mm is rejected", () => {
      for (const deckSkin of [51, -1]) {
        const wire = wireWithBlank();
        wire.design.blank.deckSkin = deckSkin;
        expect(() => parseSnapshot(wire), `${deckSkin}`).toThrow();
      }
      for (const deckSkin of [0, 50]) {
        const wire = wireWithBlank();
        wire.design.blank.deckSkin = deckSkin;
        expect(() => parseSnapshot(wire), `${deckSkin}`).not.toThrow();
      }
    });

    it("a saved Deck Skin reopens exactly as saved — none, and one past the control's 1\" end (Phase 13 item 4b)", () => {
      for (const deckSkin of [mm(0), inchesToMm(1.5)]) {
        const wire = wireWithBlank();
        wire.design.blank.deckSkin = deckSkin;
        expect(parseSnapshot(wire).blank!.deckSkin).toBe(deckSkin);
      }
      expect(inchesToMm(1.5)).toBeGreaterThan(inchesToMm(FIT_DEFAULTS_RANGE_IN.deckSkin.max));
      expect(BLANK_DECK_SKIN_MAX_MM).toBe(50);
    });

    it("each Tip Style and fine-tune surface the app offers parses", () => {
      const styles: TipStyle[] = ["pinDeck", "bottom"];
      for (const tipStyle of styles) {
        for (const fineTuneSurface of ["deck", "bottom"] as const) {
          const wire = wireWithBlank();
          wire.design.blank.tipStyle = tipStyle;
          wire.design.blank.fineTuneSurface = fineTuneSurface;
          expect(parseSnapshot(wire).blank).toMatchObject({ tipStyle, fineTuneSurface });
        }
      }
    });
  });

  it("every pickable blank in the seeded catalogues passes the bounded blank schema", () => {
    const pickable = CATALOG.filter(isPickable);
    expect(pickable.length).toBeGreaterThan(0);
    for (const copy of pickable) {
      expect(() => boardBlankSchema.parse(boardBlank(copy)), `${copy.vendor} ${copy.name}`).not.toThrow();
    }
  });

  describe("a tampered or malformed version-4 snapshot is rejected (rule 4 — untrusted input)", () => {
    it("32 stations parse; 33 are rejected", () => {
      const ok = wireWithBlank();
      ok.design.blank.copy = { ...ok.design.blank.copy, lengthMm: 2000, stations: stationsOf(32) };
      expect(() => parseSnapshot(ok)).not.toThrow();

      const tooMany = wireWithBlank();
      tooMany.design.blank.copy = { ...tooMany.design.blank.copy, lengthMm: 2000, stations: stationsOf(33) };
      expect(() => parseSnapshot(tooMany)).toThrow();
    });

    it("a 400-character flag parses; 401 characters are rejected", () => {
      const ok = wireWithBlank();
      ok.design.blank.copy.stations[0].flag = "x".repeat(400);
      expect(() => parseSnapshot(ok)).not.toThrow();

      const tooLong = wireWithBlank();
      tooLong.design.blank.copy.stations[0].flag = "x".repeat(401);
      expect(() => parseSnapshot(tooLong)).toThrow();
    });

    it("an over-long vendor name is rejected", () => {
      const wire = wireWithBlank();
      wire.design.blank.copy.vendor = "x".repeat(121);
      expect(() => parseSnapshot(wire)).toThrow();
    });

    it("placement 4001 mm is rejected", () => {
      const wire = wireWithBlank();
      wire.design.blank.placement = 4001;
      expect(() => parseSnapshot(wire)).toThrow();
    });

    it("a 51 mm nose 12\" fine-tune is rejected", () => {
      const wire = wireWithBlank();
      wire.design.blank.nose12Offset = 51;
      expect(() => parseSnapshot(wire)).toThrow();
    });

    it("a copy with no thickness at its C station (not pickable) is rejected", () => {
      const wire = wireWithBlank();
      const centre = wire.design.blank.copy.stations.find((station) => station.label === "C")!;
      centre.thicknessMm = null;
      expect(() => parseSnapshot(wire)).toThrow();
    });

    it("stations out of tail-to-nose order are rejected", () => {
      const wire = wireWithBlank();
      wire.design.blank.copy.stations.reverse();
      expect(() => parseSnapshot(wire)).toThrow();
    });

    it("Infinity in a station value is rejected", () => {
      // Built as an object, not JSON — JSON cannot carry Infinity, a direct caller can.
      const wire = wireWithBlank();
      wire.design.blank.copy.stations[1].rockerMm = Infinity;
      expect(() => parseSnapshot(wire)).toThrow();
    });

    it("a present-but-malformed rocker still throws — tolerance is for absence, never a malformed present value", () => {
      const wire = JSON.parse(JSON.stringify(buildSnapshot(FIXTURES[0])));
      wire.design.rocker = { noseTip: "x", nose12: 30, tail12: 10, tailTip: 45 };
      expect(() => parseSnapshot(wire)).toThrow();
    });
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

  describe("a saved board's length is bounded, and a blank outside the range is dropped (WR-05)", () => {
    /** A version-4 wire snapshot of FIXTURES[0] in Marko M-Regular, at `length` mm. */
    function wireAtLength(length: number) {
      const wire = wireWithBlank();
      (wire.design.outline as Record<string, unknown>).length = length;
      return wire;
    }

    it("the reject bounds keep every accepted board long enough for its five stations to run in order", () => {
      expect(SNAPSHOT_BOARD_LENGTH_MM.min / 2).toBeGreaterThan(MEASURE_STATION_MM);
      expect(SNAPSHOT_BOARD_LENGTH_MM.min).toBeLessThan(inchesToMm(BOARD_LENGTH_RANGE_IN.min));
      expect(SNAPSHOT_BOARD_LENGTH_MM.max).toBeGreaterThan(inchesToMm(BOARD_LENGTH_RANGE_IN.max));
    });

    it("the reviewer's crafted 500 mm board in a blank is rejected as invalid — far below the range, too short to draw", () => {
      expect(500).toBeLessThan(SNAPSHOT_BOARD_LENGTH_MM.min);
      expect(() => parseSnapshot(wireAtLength(500))).toThrow();
      // And the same board WITHOUT its blank is rejected too: its five stations can't be ordered.
      const handSet = wireAtLength(500);
      handSet.design.blank = null as never;
      expect(() => parseSnapshot(handSet)).toThrow();
    });

    it("a length far above the range is rejected as invalid", () => {
      expect(() => parseSnapshot(wireAtLength(SNAPSHOT_BOARD_LENGTH_MM.max + 1))).toThrow();
    });

    for (const [label, length] of [
      ["a quarter shorter than the shortest board", inchesToMm(BOARD_LENGTH_RANGE_IN.min * 0.75)],
      ["a quarter longer than the longest board", inchesToMm(BOARD_LENGTH_RANGE_IN.max * 1.25)],
    ] as const) {
      it(`a board in a blank ${label} reopens hand-set (no blank), and summarizing it does not throw`, () => {
        expect(isBoardLengthInRange(length)).toBe(false);
        const parsed = parseSnapshot(wireAtLength(length));
        expect(parsed.blank).toBeNull();
        expect(parsed.outline.length).toBe(length);
        expect(() => summarizeDesign(parsed)).not.toThrow();
      });
    }

    it("a board in a blank at either end of the range keeps its blank, within a millimetre of round-trip slack", () => {
      for (const length of [
        inchesToMm(BOARD_LENGTH_RANGE_IN.min),
        inchesToMm(BOARD_LENGTH_RANGE_IN.max),
        inchesToMm(BOARD_LENGTH_RANGE_IN.min) - 0.5,
        inchesToMm(BOARD_LENGTH_RANGE_IN.max) + 0.5,
      ]) {
        expect(isBoardLengthInRange(length)).toBe(true);
        const parsed = parseSnapshot(wireAtLength(length));
        expect(parsed.blank?.copy).toEqual(MARKO);
        expect(() => summarizeDesign(parsed)).not.toThrow();
      }
    });

    it("every preset's board in a blank round-trips unchanged", () => {
      for (const fixture of FIXTURES) {
        const fields: DesignSnapshotFields = { ...fixture, blank: boardBlank() };
        expect(roundTrip(fields)).toEqual(fields);
      }
    });
  });
});
