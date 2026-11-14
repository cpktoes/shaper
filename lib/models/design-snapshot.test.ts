import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import golden from "@/lib/geometry/__fixtures__/phase11-foil-golden.json";
import { phase11GoldenBlank } from "@/lib/geometry/__fixtures__/phase11-golden-blank";
import { DEFAULT_BLANK_CUT, type BlankRecord, type BoardBlank, type TipStyle } from "@/lib/geometry/blank";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { buildBoardProfile } from "@/lib/geometry/board-profile";
import { formatMark } from "@/lib/geometry/measure-display";
import { normalizeSpec, type BlankRockerSpec, type RockerChange } from "@/lib/geometry/custom-rocker";
import { carryPhase11Blank } from "@/lib/geometry/phase11-foil";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  bottomHasCut,
  CHANNEL_ANGLE_MAX,
  CHANNEL_ANGLE_STEP,
  channelDefaultAngle,
  isDefaultBottom,
  pickCut,
  resolveBottom,
  startingChannels,
  startingCut,
  type BoardBottom,
  type BottomBoard,
} from "@/lib/geometry/bottom";
import {
  LIVE_DESIGN_RULES,
  designBottomBoard,
  designFinPlacement,
  designSideProfile,
  summarizeDesign,
} from "@/lib/geometry/design";
import { MEASURE_STATION_MM, buildOutline } from "@/lib/geometry/outline";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "@/lib/geometry/foil";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import {
  defaultTailRailBlendsFrom,
  defaultTailRailEndsAt,
  DEFAULT_RAIL_BAND_SPEC,
  DEFAULT_TIP_RAIL_SCALE,
  HARD_EDGE_BLENDS_FROM_RANGE_IN,
  HARD_EDGE_MIN_BLEND_IN,
  RAIL_NUDGE_KEYS,
  ZERO_RAIL_NUDGES,
  computeRailBands,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
} from "@/lib/geometry/rail-bands";
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
  SNAPSHOT_SHORTEST_IN,
  blankRockerSpecSchema,
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
 * blank. Built from the case's own inputs and the blank as Phase 11 saw it — the pinned fixture —
 * never typed numbers. */
function phase11Envelope(entry: GoldenCase, version = 4) {
  const copy = phase11GoldenBlank(entry.vendor, entry.name);
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

    it("the shortest board a save carries stays 30\" (quick 261113-si7): half of 4'0\" would sit the centre on the 12\" stations", () => {
      expect(SNAPSHOT_SHORTEST_IN).toBe(30);
      expect(SNAPSHOT_BOARD_LENGTH_MM.min).toBe(inchesToMm(30));
      expect(SNAPSHOT_BOARD_LENGTH_MM.max).toBe(inchesToMm(288));
      // 24" (half of 4'0") is refused, with or without a blank; 30" and a 36" board open.
      expect(() => parseSnapshot(wireAtLength(inchesToMm(24)))).toThrow();
      const handSet = wireAtLength(inchesToMm(24));
      handSet.design.blank = null as never;
      expect(() => parseSnapshot(handSet)).toThrow();
      expect(() => parseSnapshot(wireAtLength(inchesToMm(30)))).not.toThrow();
    });

    it("the boards the app now makes are in range: 4'0\" and 12'0\" keep their blank", () => {
      expect(isBoardLengthInRange(inchesToMm(48))).toBe(true);
      expect(isBoardLengthInRange(inchesToMm(144))).toBe(true);
      expect(isBoardLengthInRange(inchesToMm(47))).toBe(false);
      expect(isBoardLengthInRange(inchesToMm(145))).toBe(false);
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

describe("wings ride on the outline, read forgivingly as a whole (rule 7, quick 261014-wii)", () => {
  const BASE: DesignSnapshotFields = FIXTURES[0];
  const oneWing = {
    station: inchesToMm(11),
    depth: inchesToMm(3 / 8),
    run: inchesToMm(1 / 4),
    radius: mm(0),
    lock: "front-trailing" as const,
    finOffset: mm(0),
  };
  const twoWing = {
    station: inchesToMm(15.5),
    depth: inchesToMm(1 / 4),
    run: inchesToMm(1 / 2),
    radius: inchesToMm(3 / 16),
    lock: null,
    finOffset: inchesToMm(-1),
  };
  const withWings = (wings: unknown) =>
    ({ version: DESIGN_SNAPSHOT_VERSION, design: { ...BASE, outline: { ...BASE.outline, wings } } }) as unknown;

  it("the version stays 5", () => {
    expect(DESIGN_SNAPSHOT_VERSION).toBe(5);
  });

  it("an outline saved without wings opens with no wings key", () => {
    const parsed = parseSnapshot(buildSnapshot(BASE));
    expect("wings" in parsed.outline).toBe(false);
    expect(parsed.outline).toEqual(BASE.outline);
  });

  it("one wing and two wings round-trip value for value", () => {
    for (const wings of [[oneWing], [oneWing, twoWing]]) {
      const fields = { ...BASE, outline: { ...BASE.outline, wings } };
      const parsed = parseSnapshot(JSON.parse(JSON.stringify(buildSnapshot(fields))));
      expect(parsed.outline.wings).toEqual(wings);
      expect(parsed.outline).toEqual(fields.outline);
    }
  });

  it("removing the last wing saves an empty list, which opens as an empty list", () => {
    const parsed = parseSnapshot(withWings([]));
    expect(parsed.outline.wings).toEqual([]);
  });

  it.each([
    ["three wings", [oneWing, twoWing, oneWing]],
    ["a depth of 0", [{ ...oneWing, depth: 0 }]],
    ["a negative run", [{ ...oneWing, run: -1 }]],
    ["a string station", [{ ...oneWing, station: "11" }]],
    ["a sideways lock", [{ ...oneWing, lock: "sideways" }]],
    ["not a list", { station: 1 }],
  ])("%s opens the board with no wings, every other field intact", (_label, wings) => {
    const parsed = parseSnapshot(withWings(wings));
    expect("wings" in parsed.outline).toBe(false);
    expect(parsed.outline).toEqual(BASE.outline);
    expect(parsed.fins).toEqual(BASE.fins);
    expect(parsed.boardName).toBe(BASE.boardName);
  });

  // The slot locks (quick 261015-hz7, 2026-10-15, D1, D10): read on open, never rewritten.
  const rearWing = {
    station: inchesToMm(6.25),
    depth: inchesToMm(3 / 16),
    run: inchesToMm(1 / 2),
    radius: inchesToMm(1 / 4),
    lock: "rear-trailing" as const,
    finOffset: mm(0),
  };

  it("an old leading-edge lock on wing 1 reads as the trailing edge, its station and offset kept", () => {
    const leading = { ...oneWing, lock: "front-leading", finOffset: inchesToMm(1) };
    const parsed = parseSnapshot(withWings([leading]));
    expect(parsed.outline.wings).toEqual([{ ...leading, lock: "front-trailing" }]);
  });

  it("a front lock on wing 2 and a rear lock on wing 1 read as placed by hand at their stored stations", () => {
    const parsed = parseSnapshot(withWings([{ ...rearWing, station: inchesToMm(11) }, { ...oneWing, station: inchesToMm(6) }]));
    expect(parsed.outline.wings!.map((w) => w.lock)).toEqual([null, null]);
    expect(parsed.outline.wings!.map((w) => w.station)).toEqual([inchesToMm(11), inchesToMm(6)]);
    const leadingOnTwo = parseSnapshot(withWings([oneWing, { ...oneWing, station: inchesToMm(6), lock: "front-leading" }]));
    expect(leadingOnTwo.outline.wings![1].lock).toBeNull();
  });

  it("a rear lock on wing 2 round-trips value for value", () => {
    const wings = [oneWing, rearWing];
    const fields = { ...BASE, outline: { ...BASE.outline, wings } };
    const parsed = parseSnapshot(JSON.parse(JSON.stringify(buildSnapshot(fields))));
    expect(parsed.outline.wings).toEqual(wings);
  });

  it("out-of-order and past-the-top stations parse exactly as stored (corrected only when drawn)", () => {
    const outOfOrder = [{ ...oneWing, lock: null }, { ...twoWing }];
    expect(parseSnapshot(withWings(outOfOrder)).outline.wings).toEqual(outOfOrder);
    const pastTop = [{ ...oneWing, lock: null, station: inchesToMm(60) }];
    expect(parseSnapshot(withWings(pastTop)).outline.wings).toEqual(pastTop);
  });

  it("a board whose locks all fit opens with the very same wing objects' values and no new keys", () => {
    const parsed = parseSnapshot(withWings([oneWing, rearWing]));
    expect(Object.keys(parsed.outline.wings![0]).sort()).toEqual(Object.keys(oneWing).sort());
  });
});

describe("a blank's rocker as ordered rides on the blank, read forgivingly as a whole (rule 8, quick 261016-mkb)", () => {
  const nose = (amountIn: number, fromTipIn?: number): RockerChange =>
    fromTipIn === undefined
      ? { end: "nose", amount: inchesToMm(amountIn) }
      : { end: "nose", amount: inchesToMm(amountIn), fromTip: inchesToMm(fromTipIn) };
  const tail = (amountIn: number, fromTipIn?: number): RockerChange =>
    fromTipIn === undefined
      ? { end: "tail", amount: inchesToMm(amountIn) }
      : { end: "tail", amount: inchesToMm(amountIn), fromTip: inchesToMm(fromTipIn) };

  /** A saved board with a blank carrying `rocker` exactly as written, over the wire as JSON. */
  function withRocker(rocker: unknown) {
    const wire = wireWithBlank();
    wire.design.blank.rocker = rocker;
    return JSON.parse(JSON.stringify(wire));
  }

  it("the version stays 5", () => {
    expect(DESIGN_SNAPSHOT_VERSION).toBe(5);
  });

  it("a board saved with a valid spec reopens with that spec, normalised", () => {
    const valid: BlankRockerSpec = { changes: [tail(0.125, 18), nose(-0.25, 18.3), tail(0.125, 30)] };
    const parsed = parseSnapshot(withRocker(valid));
    expect(parsed.blank!.rocker).toEqual(normalizeSpec(valid, MARKO.lengthMm));
    expect(parsed.blank!.rocker).toEqual({ changes: [nose(-0.25, 18), tail(0.125, 30), tail(0.125, 18)] });
    const again = roundTrip(parsed);
    expect(again.blank!.rocker).toEqual(parsed.blank!.rocker);
  });

  it("a board saved without one reopens with no rocker key at all", () => {
    const parsed = parseSnapshot(JSON.parse(JSON.stringify(wireWithBlank())));
    expect("rocker" in parsed.blank!).toBe(false);
    expect(parsed.blank).toEqual(parseSnapshot(withRocker(undefined)).blank);
  });

  it.each([
    ["not an object", '+1/2"N'],
    ["a list, not an object", [nose(0.5)]],
    ["changes not a list", { changes: { end: "nose", amount: 10 } }],
    ["an unknown end", { changes: [{ end: "middle", amount: 10 }] }],
    ['an amount past +2"', { changes: [nose(2.0625)] }],
    ['an amount past -2"', { changes: [tail(-2.0625)] }],
    ["an amount that is not a number", { changes: [{ end: "nose", amount: "12" }] }],
    ["more than four changes", { changes: [nose(0.5), nose(0.25, 12), tail(0.5), tail(0.25, 12), tail(0.125, 6)] }],
    ["three on one end", { changes: [nose(0.5), nose(0.25, 12), nose(0.125, 6)] }],
    ["a negative bend point", { changes: [{ end: "nose", amount: 10, fromTip: -1 }] }],
  ])("a malformed spec (%s) reopens the board on its natural rocker, everything else intact", (_, rocker) => {
    const plain = parseSnapshot(JSON.parse(JSON.stringify(wireWithBlank())));
    const parsed = parseSnapshot(withRocker(rocker));
    expect("rocker" in parsed.blank!).toBe(false);
    expect(parsed).toEqual(plain);
  });

  it("a natural spec — no changes, or only zero amounts — reopens with no rocker key", () => {
    for (const rocker of [{ changes: [] }, { changes: [nose(0), tail(0, 18)] }]) {
      const parsed = parseSnapshot(withRocker(rocker));
      expect("rocker" in parsed.blank!).toBe(false);
    }
  });

  it("the strict schema itself refuses three changes on one end and accepts two; the board schema never rejects for it", () => {
    expect(blankRockerSpecSchema.safeParse({ changes: [nose(0.5), nose(0.25, 12), nose(0.125, 6)] }).success).toBe(false);
    expect(blankRockerSpecSchema.safeParse({ changes: [nose(0.5), nose(0.25, 12)] }).success).toBe(true);
    expect(boardBlankSchema.safeParse({ ...boardBlank(), rocker: "bent" }).success).toBe(true);
  });
});

describe("each rail's scale and nudges ride on the rail section, read forgivingly (rule 10, quick 261102-gec)", () => {
  type WireSection = Record<string, unknown> & { nudges?: unknown; scaleFromCenter?: unknown };
  const wire = () =>
    JSON.parse(JSON.stringify(buildSnapshot(FIXTURES[0]))) as {
      version: number;
      design: { rails: Record<"nose" | "center" | "tail", WireSection> & { tailHardEdge: boolean } };
    };

  it("a rail section saved before them opens with the tip default (1 since fast task 189) on the nose and tail, 1 on the centre, and every nudge 0", () => {
    const stored = wire();
    for (const key of ["nose", "center", "tail"] as const) {
      delete stored.design.rails[key].scaleFromCenter;
      delete stored.design.rails[key].nudges;
    }
    const opened = parseSnapshot(stored);
    expect(opened.rails.nose.scaleFromCenter).toBe(DEFAULT_TIP_RAIL_SCALE);
    expect(opened.rails.tail.scaleFromCenter).toBe(DEFAULT_TIP_RAIL_SCALE);
    expect(opened.rails.center.scaleFromCenter).toBe(1);
    for (const key of ["nose", "center", "tail"] as const) expect(opened.rails[key].nudges).toEqual(ZERO_RAIL_NUDGES);
  });

  it("a tail saved with both Symmetrical and Hard Edge on opens with Hard Edge winning and Symmetrical off; either alone is kept (rule 11, fast task 190)", () => {
    const both = wire();
    both.design.rails.tail.symmetrical = true;
    both.design.rails.tailHardEdge = true;
    const opened = parseSnapshot(both);
    expect(opened.rails.tailHardEdge).toBe(true);
    expect(opened.rails.tail.symmetrical).toBe(false);
    // The stored board is not touched by the reading.
    expect(both.design.rails.tail.symmetrical).toBe(true);

    const symmetricalOnly = wire();
    symmetricalOnly.design.rails.tail.symmetrical = true;
    symmetricalOnly.design.rails.tailHardEdge = false;
    expect(parseSnapshot(symmetricalOnly).rails.tail.symmetrical).toBe(true);
    expect(parseSnapshot(symmetricalOnly).rails.tailHardEdge).toBe(false);

    const hardEdgeOnly = wire();
    hardEdgeOnly.design.rails.tail.symmetrical = false;
    hardEdgeOnly.design.rails.tailHardEdge = true;
    expect(parseSnapshot(hardEdgeOnly).rails.tail.symmetrical).toBe(false);
    expect(parseSnapshot(hardEdgeOnly).rails.tailHardEdge).toBe(true);
    // The other rails' Symmetrical is never touched by the tail's rule.
    const noseSym = wire();
    noseSym.design.rails.nose.symmetrical = true;
    noseSym.design.rails.tailHardEdge = true;
    expect(parseSnapshot(noseSym).rails.nose.symmetrical).toBe(true);
  });

  it("a nudge or scale that is not a number reads its default and the board still opens", () => {
    const stored = wire();
    stored.design.rails.nose.nudges = { ...ZERO_RAIL_NUDGES, deckMark1: "lots", apexThickness: inchesToMm(1 / 16) };
    stored.design.rails.center.nudges = "bent";
    stored.design.rails.tail.scaleFromCenter = null;
    const opened = parseSnapshot(stored);
    expect(opened.rails.nose.nudges.deckMark1).toBe(0);
    expect(opened.rails.nose.nudges.apexThickness).toBe(inchesToMm(1 / 16));
    expect(opened.rails.center.nudges).toEqual(ZERO_RAIL_NUDGES);
    expect(opened.rails.tail.scaleFromCenter).toBe(DEFAULT_TIP_RAIL_SCALE);
  });

  it("carries the three legacy keys exactly as stored — an old Bottom Tuck 3 setting included — and they change no mark", () => {
    const stored = wire();
    stored.design.rails.nose.cornerCutOffsetOverride = inchesToMm(3 / 32);
    stored.design.rails.nose.removeCornerCut = true;
    stored.design.rails.nose.bottomTuck3Override = inchesToMm(0.6875);
    const opened = parseSnapshot(stored);
    expect(opened.rails.nose.cornerCutOffsetOverride).toBe(inchesToMm(3 / 32));
    expect(opened.rails.nose.removeCornerCut).toBe(true);
    expect(opened.rails.nose.bottomTuck3Override).toBe(inchesToMm(0.6875));
    expect(computeRailBands(opened.rails)).toEqual(computeRailBands(FIXTURES[0].rails));
  });

  it("a scale and nudges saved on this branch round-trip exactly", () => {
    const fields: DesignSnapshotFields = {
      ...FIXTURES[0],
      rails: {
        ...FIXTURES[0].rails,
        nose: {
          ...FIXTURES[0].rails.nose,
          scaleFromCenter: 0.55,
          nudges: { ...ZERO_RAIL_NUDGES, deckMark3: inchesToMm(-3 / 16), domedDeckBand: mm(-37) },
        },
      },
    };
    expect(roundTrip(fields).rails).toEqual(fields.rails);
  });

  it("a section saved with the retired Deck Mark 2 and Bottom Tuck 2 amounts and no dome nudge opens with the six nudges, the dome at 0, and its marks unmoved (plan 04, R17, R18)", () => {
    const stored = wire();
    const { domedDeckBand: _dome, ...withoutDome } = ZERO_RAIL_NUDGES;
    void _dome;
    stored.design.rails.center.nudges = { ...withoutDome, deckMark2: inchesToMm(1 / 4), bottomTuck2: inchesToMm(-1 / 8) };
    const opened = parseSnapshot(stored);
    expect(Object.keys(opened.rails.center.nudges).sort()).toEqual([...RAIL_NUDGE_KEYS].sort());
    expect(opened.rails.center.nudges).toEqual(ZERO_RAIL_NUDGES);
    expect(opened.rails.center.nudges.domedDeckBand).toBe(0);
    expect(computeRailBands(opened.rails)).toEqual(computeRailBands(FIXTURES[0].rails));
  });

  // Rule 12 (quick 261102-gec plan 05, R22): the Sharp Bottom Tuck box.
  it("a rail section saved without Sharp Bottom Tuck, or with a string or a number in it, opens with the box off (rule 12)", () => {
    const stored = wire();
    delete stored.design.rails.nose.sharpBottomTuck;
    stored.design.rails.center.sharpBottomTuck = "yes";
    stored.design.rails.tail.sharpBottomTuck = 1;
    const opened = parseSnapshot(stored);
    for (const key of ["nose", "center", "tail"] as const) expect(opened.rails[key].sharpBottomTuck).toBe(false);
  });

  it("a Sharp Bottom Tuck ticked on this branch round-trips exactly (rule 12)", () => {
    const fields: DesignSnapshotFields = {
      ...FIXTURES[0],
      rails: {
        ...FIXTURES[0].rails,
        center: { ...FIXTURES[0].rails.center, sharpBottomTuck: true },
      },
    };
    const back = roundTrip(fields).rails;
    expect(back).toEqual(fields.rails);
    expect(back.center.sharpBottomTuck).toBe(true);
    expect(back.nose.sharpBottomTuck).toBe(false);
  });
});

describe("the tail's Hard Edge Blends From and Ends At ride on the rails, read forgivingly (rule 13, Phase 16 D-20/D-30)", () => {
  const KEYS = ["tailHardEdgeBlendsFrom", "tailHardEdgeEndsAt"] as const;
  const wire = () =>
    JSON.parse(JSON.stringify(buildSnapshot(FIXTURES[0]))) as {
      version: number;
      design: { rails: Record<string, unknown> & { tailHardEdgeBlendsFrom?: unknown; tailHardEdgeEndsAt?: unknown } };
    };
  const length = FIXTURES[0].outline.length;

  it("a board saved without either setting opens with no such keys and reads 12\" and the top of Ends At's slider (rule 13; D-30's 18\" and 30\" until quick 261113-psx)", () => {
    const stored = wire();
    for (const key of KEYS) expect(key in stored.design.rails).toBe(false);
    const opened = parseSnapshot(Object.freeze(stored));
    for (const key of KEYS) {
      expect(key in opened.rails).toBe(false);
      expect(JSON.stringify(opened.rails)).not.toContain(key);
    }
    expect(hardEdgeBlendsFrom(opened.rails, length)).toBe(defaultTailRailBlendsFrom(length));
    expect(hardEdgeBlendsFrom(opened.rails, length)).toBe(inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min));
    expect(hardEdgeEndsAt(opened.rails, length)).toBe(defaultTailRailEndsAt(defaultTailRailBlendsFrom(length), length));
  });

  it("a stored 20\"/26\" pair is kept exactly (rule 13)", () => {
    const stored = wire();
    stored.design.rails.tailHardEdgeBlendsFrom = inchesToMm(20);
    stored.design.rails.tailHardEdgeEndsAt = inchesToMm(26);
    const opened = parseSnapshot(Object.freeze(stored));
    expect(opened.rails.tailHardEdgeBlendsFrom).toBe(inchesToMm(20));
    expect(opened.rails.tailHardEdgeEndsAt).toBe(inchesToMm(26));
    expect(hardEdgeBlendsFrom(opened.rails, length)).toBe(inchesToMm(20));
    expect(hardEdgeEndsAt(opened.rails, length)).toBe(inchesToMm(26));
  });

  it("a board saved with only the first, single Hard Edge Ends At keeps it and reads its Blends From as 12\" (rule 13)", () => {
    const stored = wire();
    stored.design.rails.tailHardEdgeEndsAt = inchesToMm(22);
    const opened = parseSnapshot(Object.freeze(stored));
    expect("tailHardEdgeBlendsFrom" in opened.rails).toBe(false);
    expect(opened.rails.tailHardEdgeEndsAt).toBe(inchesToMm(22));
    expect(hardEdgeBlendsFrom(opened.rails, length)).toBe(defaultTailRailBlendsFrom(length));
    expect(hardEdgeEndsAt(opened.rails, length)).toBe(inchesToMm(22));
  });

  it("a value that could sit on no board — not a number, not finite, outside its outer bounds — opens with no key (rule 13)", () => {
    const outside: Record<(typeof KEYS)[number], unknown[]> = {
      tailHardEdgeBlendsFrom: [inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min - 1), inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.max + 1)],
      tailHardEdgeEndsAt: [
        inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min + HARD_EDGE_MIN_BLEND_IN - 1),
        inchesToMm(BOARD_LENGTH_RANGE_IN.max / 2 + 1),
      ],
    };
    for (const key of KEYS) {
      for (const value of ["x", Number.NaN, null, Number.POSITIVE_INFINITY, 1e9, -inchesToMm(18), { inches: 18 }, ...outside[key]]) {
        const stored = wire();
        stored.design.rails[key] = value;
        const opened = parseSnapshot(Object.freeze(stored));
        expect(key in opened.rails, `${key} ${String(value)}`).toBe(false);
        expect(JSON.stringify(opened.rails)).not.toContain(key);
        // The rest of the rails open exactly as saved — a bad value never rejects the board.
        expect(opened.rails).toEqual(parseSnapshot(wire()).rails);
      }
    }
  });

  it("a pair that crosses is kept as stored but read as a valid pair by the readers, never rewritten (rule 13)", () => {
    const stored = wire();
    stored.design.rails.tailHardEdgeBlendsFrom = inchesToMm(26);
    stored.design.rails.tailHardEdgeEndsAt = inchesToMm(20);
    const opened = parseSnapshot(Object.freeze(stored));
    expect(opened.rails.tailHardEdgeBlendsFrom).toBe(inchesToMm(26));
    expect(opened.rails.tailHardEdgeEndsAt).toBe(inchesToMm(20));
    const start = hardEdgeBlendsFrom(opened.rails, length);
    const end = hardEdgeEndsAt(opened.rails, length);
    expect(end - start).toBeGreaterThanOrEqual(inchesToMm(HARD_EDGE_MIN_BLEND_IN) - 1e-9);
  });

  it("a 20\"/26\" pair round-trips through buildSnapshot and parseSnapshot, version still 5 (rule 13)", () => {
    const fields: DesignSnapshotFields = {
      ...FIXTURES[0],
      rails: {
        ...FIXTURES[0].rails,
        tailHardEdge: true,
        tailHardEdgeBlendsFrom: inchesToMm(20),
        tailHardEdgeEndsAt: inchesToMm(26),
      },
    };
    const built = buildSnapshot(fields);
    expect(built.version).toBe(5);
    expect(DESIGN_SNAPSHOT_VERSION).toBe(5);
    const back = roundTrip(fields).rails;
    expect(back).toEqual(fields.rails);
    expect(back.tailHardEdgeBlendsFrom).toBe(inchesToMm(20));
    expect(back.tailHardEdgeEndsAt).toBe(inchesToMm(26));
  });
});

describe("the bottom rides on the board, optional and read forgivingly (rule 14, Phase 17 D-24)", () => {
  const ELEVEN_KEYS = [...V3_KEYS, "blank"];
  type LoosePart = Record<string, unknown>;
  type LooseBottom = { nose: LoosePart; center: LoosePart; tail: LoosePart; channels: LoosePart; wingRule: unknown };
  const PARTS = ["nose", "center", "tail", "channels", "wingRule"] as const;

  const boardOf = (fields: DesignSnapshotFields): BottomBoard =>
    designBottomBoard(
      fields.outline,
      buildOutline(fields.outline),
      designSideProfile(fields, LIVE_DESIGN_RULES),
      designFinPlacement(fields),
    );
  const BOARD = boardOf(FIXTURES[0]);

  /** A bottom with every part moved off its opening value: a cut in each section, six channels, Natural. */
  const FULL: BoardBottom = (() => {
    let bottom = pickCut(DEFAULT_BOTTOM, "nose", "Teardrop Nose Concave", BOARD);
    bottom = pickCut(bottom, "center", "Deep Single Concave", BOARD);
    bottom = pickCut(bottom, "tail", "Spiral Vee", BOARD);
    return {
      ...bottom,
      center: { ...bottom.center, depth: inchesToMm(5 / 16), smoothness: 35 },
      tail: { ...bottom.tail, deepest: inchesToMm(-1.5), veeLift: inchesToMm(1 / 4) },
      channels: {
        ...startingChannels(6, BOARD, bottom.channels),
        startFromFins: inchesToMm(9),
        deepestFromFins: inchesToMm(-2),
        run: "toe",
        angle: 7.5,
        longest: "inner",
        stagger: inchesToMm(3.5),
      },
      wingRule: "natural",
    };
  })();

  /** Every slider on BOTTOM at its far end, on the longest board the app draws. */
  const FAR_END: BoardBottom = (() => {
    const far = inchesToMm(BOARD_LENGTH_RANGE_IN.max);
    const numbers = {
      offRail: inchesToMm(6),
      offStringer: inchesToMm(9),
      troughAt: inchesToMm(8),
      start: far,
      deepest: far,
      end: far,
      depth: inchesToMm(1 / 2),
      veeLift: inchesToMm(1 / 2),
      smoothness: 100,
      closesToPoint: true,
    };
    return {
      nose: { name: "Teardrop Nose Concave", ...numbers },
      center: { name: "Early Double Concave", ...numbers },
      tail: { name: "Spiral Vee", ...numbers, deepest: mm(-far) },
      channels: {
        count: 8,
        width: inchesToMm(4),
        offStringer: inchesToMm(9),
        startFromFins: far,
        deepestFromFins: mm(-far),
        end: far,
        depth: inchesToMm(1 / 2),
        smoothness: 100,
        run: "rail",
        angle: CHANNEL_ANGLE_MAX,
        longest: "same",
        stagger: inchesToMm(8),
      },
      wingRule: "natural",
    };
  })();

  const wire = (fields: DesignSnapshotFields = FIXTURES[0]) =>
    JSON.parse(JSON.stringify(buildSnapshot(fields))) as { version: number; design: Record<string, unknown> };
  const wireWithBottom = (bottom: unknown) => {
    const stored = wire();
    stored.design.bottom = bottom;
    return stored;
  };
  const looseFull = () => structuredClone(FULL) as unknown as LooseBottom;
  /** A read board without its bottom, to hold against the same board saved with none. */
  const withoutBottom = (fields: DesignSnapshotFields): DesignSnapshotFields => {
    const rest = { ...fields };
    delete rest.bottom;
    return rest;
  };

  it("a board saved before BOTTOM has no bottom key, opens with none, and saves again key for key (D-24)", () => {
    for (const fixture of FIXTURES) {
      const stored = wire(fixture);
      expect("bottom" in stored.design).toBe(false);
      const opened = parseSnapshot(Object.freeze(stored));
      expect("bottom" in opened, fixture.boardName).toBe(false);
      expect(Object.keys(opened).sort()).toEqual([...ELEVEN_KEYS].sort());
      const again = JSON.parse(JSON.stringify(buildSnapshot(opened))) as typeof stored;
      expect(again).toEqual(stored);
      expect(Object.keys(again.design).sort()).toEqual(Object.keys(stored.design).sort());
      expect(JSON.stringify(again)).not.toContain('"bottom"');
    }
  });

  it("a whole bottom — a cut in each section, six channels, Natural — comes back exactly, version still 5", () => {
    const fields: DesignSnapshotFields = { ...FIXTURES[0], bottom: FULL };
    const built = buildSnapshot(fields);
    expect(built.version).toBe(5);
    expect(DESIGN_SNAPSHOT_VERSION).toBe(5);
    const opened = parseSnapshot(Object.freeze(JSON.parse(JSON.stringify(built))));
    expect(opened.bottom).toEqual(FULL);
    expect(Object.keys(opened).sort()).toEqual([...ELEVEN_KEYS, "bottom"].sort());
    // Everything else about the board is what it is saved without a bottom.
    expect(withoutBottom(opened)).toEqual(parseSnapshot(wire()));
    expect(roundTrip(opened)).toEqual(opened);
  });

  it("every name's starting cut and every channel count come back exactly, on every preset", () => {
    for (const fixture of FIXTURES) {
      const board = boardOf(fixture);
      for (const section of BOTTOM_SECTIONS) {
        for (const name of BOTTOM_CUT_NAMES[section]) {
          for (const tail of [undefined, "Panel Vee"] as const) {
            const bottom: BoardBottom = { ...DEFAULT_BOTTOM, [section]: startingCut(section, name, board, tail) };
            const back = roundTrip({ ...fixture, bottom }).bottom;
            if (isDefaultBottom(bottom)) expect(back, `${fixture.boardName} · ${name}`).toBeUndefined();
            else expect(back, `${fixture.boardName} · ${name}`).toEqual(bottom);
          }
        }
      }
      for (const count of [4, 6, 8] as const) {
        const bottom: BoardBottom = { ...DEFAULT_BOTTOM, channels: startingChannels(count, board, DEFAULT_BOTTOM.channels) };
        expect(roundTrip({ ...fixture, bottom }).bottom, `${fixture.boardName} · ${count} channels`).toEqual(bottom);
      }
    }
  });

  it("every slider's far end is kept, and a cut slid to no depth keeps its name", () => {
    expect(roundTrip({ ...FIXTURES[0], bottom: FAR_END }).bottom).toEqual(FAR_END);
    const noDepth: BoardBottom = { ...FULL, center: { ...FULL.center, depth: mm(0) }, channels: { ...FULL.channels, depth: mm(0) } };
    expect(roundTrip({ ...FIXTURES[0], bottom: noDepth }).bottom).toEqual(noDepth);
    // A far-end bottom is still a board the app can work out, on every preset.
    for (const fixture of FIXTURES) {
      const opened = roundTrip({ ...fixture, bottom: FAR_END });
      expect(() => summarizeDesign(opened), fixture.boardName).not.toThrow();
      expect(Number.isFinite(summarizeDesign(opened).volumeLitres)).toBe(true);
    }
  });

  it("the Narrowest rule alone is no bottom at all, and Natural alone is kept", () => {
    expect("bottom" in parseSnapshot(wireWithBottom(JSON.parse(JSON.stringify(DEFAULT_BOTTOM))))).toBe(false);
    const natural: BoardBottom = { ...DEFAULT_BOTTOM, wingRule: "natural" };
    expect(roundTrip({ ...FIXTURES[0], bottom: natural }).bottom).toEqual(natural);
  });

  it("a bad part reads its opening value and never rejects the board; every other part is kept", () => {
    const CRAFTED: [string, (typeof PARTS)[number], (bottom: LooseBottom) => void][] = [
      ["a name the app never had", "nose", (b) => { b.nose.name = "Bonzer"; }],
      ["a Center name in the Nose's place", "nose", (b) => { b.nose.name = "Deep Single Concave"; }],
      ["a ticked box that is not yes or no", "nose", (b) => { b.nose.closesToPoint = "yes"; }],
      ["a depth that is not a number", "center", (b) => { b.center.depth = Number.NaN; }],
      ["a depth of nothing (what NaN is once stored)", "center", (b) => { b.center.depth = null; }],
      ["a depth of 1e9", "center", (b) => { b.center.depth = 1e9; }],
      ["a depth below zero", "center", (b) => { b.center.depth = -1; }],
      ["a depth in words", "center", (b) => { b.center.depth = "deep"; }],
      ["an endless Off Rail", "center", (b) => { b.center.offRail = Number.POSITIVE_INFINITY; }],
      ["a station a billion millimetres behind the tail", "tail", (b) => { b.tail.start = -1e9; }],
      ["a station a billion millimetres past the nose", "tail", (b) => { b.tail.end = 1e9; }],
      ["a Smoothness over 100", "tail", (b) => { b.tail.smoothness = 101; }],
      ["a missing number", "tail", (b) => { delete b.tail.veeLift; }],
      ["a section that is not a cut", "center", (b) => { (b as Record<string, unknown>).center = "x"; }],
      ["a missing section", "nose", (b) => { delete (b as Record<string, unknown>).nose; }],
      ["five channels", "channels", (b) => { b.channels.count = 5; }],
      ["a channel run the app never had", "channels", (b) => { b.channels.run = "diagonal"; }],
      ["a longest pair the app never had", "channels", (b) => { b.channels.longest = "middle"; }],
      ["an endless channel width", "channels", (b) => { b.channels.width = Number.POSITIVE_INFINITY; }],
      ["a channel start a billion millimetres off", "channels", (b) => { b.channels.startFromFins = -1e9; }],
      ["channels that are not channels", "channels", (b) => { (b as Record<string, unknown>).channels = [4]; }],
      ["a wing rule the app never had", "wingRule", (b) => { b.wingRule = "widest"; }],
      ["no wing rule", "wingRule", (b) => { delete (b as Record<string, unknown>).wingRule; }],
    ];
    const plain = parseSnapshot(wire());
    for (const [what, part, craft] of CRAFTED) {
      const bottom = looseFull();
      craft(bottom);
      const stored = wireWithBottom(bottom);
      expect(() => parseSnapshot(stored), what).not.toThrow();
      const opened = parseSnapshot(Object.freeze(stored));
      expect(opened.bottom, what).toBeDefined();
      for (const key of PARTS) {
        if (key === part) expect(opened.bottom![key], `${what}: ${key}`).toEqual(DEFAULT_BOTTOM[key]);
        else expect(opened.bottom![key], `${what}: ${key}`).toEqual(FULL[key]);
      }
      // The opening value handed back is the board's own copy, never the app's shared one.
      if (part !== "wingRule") expect(opened.bottom![part], what).not.toBe(DEFAULT_BOTTOM[part]);
      expect(withoutBottom(opened), what).toEqual(plain);
    }
  });

  it("D-44: channels saved before the Angle slider open with every number they had, on the run's own angle", () => {
    // A board saved before the slider has no `angle` among its channels. It is not a bad part: nothing else is reset.
    const bottom = looseFull();
    expect("angle" in bottom.channels).toBe(true);
    delete bottom.channels.angle;
    const stored = wireWithBottom(bottom);
    expect(JSON.stringify(stored.design.bottom)).not.toContain('"angle"');
    const opened = parseSnapshot(Object.freeze(stored));
    expect(opened.bottom!.channels).toEqual({ ...FULL.channels, angle: null });
    for (const key of PARTS) if (key !== "channels") expect(opened.bottom![key], key).toEqual(FULL[key]);
    // ...and it saves again with the angle written as none, then reads back the same board.
    expect(roundTrip(opened).bottom).toEqual(opened.bottom);
    // The old run is still an angled one, so the maths works its own angle out for it.
    const resolved = resolveBottom(opened.bottom!, BOARD);
    expect(resolved.channels.angle).toBe(channelDefaultAngle(resolved.channels.run, resolved.channels, BOARD, resolved.wingRule));
  });

  it("D-44: an angle the slider could never give reads as none and takes nothing else with it", () => {
    const BAD: [string, unknown][] = [
      ["not a number (stored as nothing)", Number.NaN],
      ["endless", Number.POSITIVE_INFINITY],
      ["in words", "steep"],
      ["past the slider's far end", CHANNEL_ANGLE_MAX + 0.5],
      ["a billion degrees", 1e9],
      ["below zero", -0.5],
      ["a box", {}],
      ["a list", [5]],
      ["yes", true],
    ];
    const plain = parseSnapshot(wire());
    for (const [what, angle] of BAD) {
      const bottom = looseFull();
      bottom.channels.angle = angle;
      const stored = wireWithBottom(bottom);
      expect(() => parseSnapshot(stored), what).not.toThrow();
      const opened = parseSnapshot(Object.freeze(stored));
      expect(opened.bottom!.channels, what).toEqual({ ...FULL.channels, angle: null });
      for (const key of PARTS) if (key !== "channels") expect(opened.bottom![key], `${what}: ${key}`).toEqual(FULL[key]);
      expect(withoutBottom(opened), what).toEqual(plain);
    }
  });

  it("D-44: every angle the slider can give — and one it cannot, between two steps — comes back exactly; none stays none", () => {
    for (const angle of [null, 0, CHANNEL_ANGLE_STEP, 7.5, 9.0678, CHANNEL_ANGLE_MAX]) {
      for (const run of ["rail", "toe", "parallel"] as const) {
        const bottom: BoardBottom = { ...FULL, channels: { ...FULL.channels, run, angle } };
        expect(roundTrip({ ...FIXTURES[0], bottom }).bottom, `${run} · ${angle}`).toEqual(bottom);
      }
    }
  });

  it("D-44: the opening bottom is still no bottom at all, written with the angle or without it", () => {
    expect(DEFAULT_BOTTOM.channels.angle).toBeNull();
    expect(isDefaultBottom(DEFAULT_BOTTOM)).toBe(true);
    expect("bottom" in parseSnapshot(wireWithBottom(JSON.parse(JSON.stringify(DEFAULT_BOTTOM))))).toBe(false);
    expect("bottom" in roundTrip({ ...FIXTURES[0], bottom: structuredClone(DEFAULT_BOTTOM) })).toBe(false);
    const old = JSON.parse(JSON.stringify(DEFAULT_BOTTOM)) as LooseBottom;
    delete old.channels.angle;
    expect("bottom" in parseSnapshot(wireWithBottom(old))).toBe(false);
    // An angle alone, with no channels picked, is a change to the bottom and is kept — it cuts nothing.
    const angled: BoardBottom = { ...DEFAULT_BOTTOM, channels: { ...DEFAULT_BOTTOM.channels, angle: 5 } };
    expect(isDefaultBottom(angled)).toBe(false);
    expect(roundTrip({ ...FIXTURES[0], bottom: angled }).bottom).toEqual(angled);
    expect(bottomHasCut(angled)).toBe(false);
  });

  it("a bottom that is not a bottom at all reads as none — the board opens flat, never rejected", () => {
    const plain = parseSnapshot(wire());
    const NOT_A_BOTTOM: unknown[] = [
      "x",
      7,
      null,
      true,
      Number.NaN,
      [],
      [FULL],
      {},
      { nose: "x", center: 3, tail: null, channels: [], wingRule: 9 },
    ];
    for (const value of NOT_A_BOTTOM) {
      const stored = wireWithBottom(value);
      expect(() => parseSnapshot(stored), JSON.stringify(value)).not.toThrow();
      const opened = parseSnapshot(Object.freeze(stored));
      expect("bottom" in opened, JSON.stringify(value)).toBe(false);
      expect(opened).toEqual(plain);
    }
  });

  it("anything extra on a stored bottom is dropped and the bottom itself kept", () => {
    const bottom = looseFull();
    bottom.center.bonzer = true;
    bottom.channels.count9 = 9;
    (bottom as Record<string, unknown>).deck = { name: "Flat Deck" };
    const opened = parseSnapshot(wireWithBottom(bottom));
    expect(opened.bottom).toEqual(FULL);
    expect(JSON.stringify(opened.bottom)).not.toContain("bonzer");
  });

  it("a save keeps the bottom: what arrives is read, renamed and stored with every number as it came", () => {
    // app/design/actions.ts: buildSnapshot → parseSnapshot → buildSnapshot under the trimmed name.
    const incoming = buildSnapshot({ ...FIXTURES[0], bottom: FULL });
    const design = parseSnapshot(JSON.parse(JSON.stringify(incoming)));
    const stored = buildSnapshot({ ...design, boardName: "Twin with a vee" });
    expect(stored.version).toBe(5);
    const reopened = parseSnapshot(JSON.parse(JSON.stringify(stored)));
    expect(reopened.bottom).toEqual(FULL);
    expect(reopened.boardName).toBe("Twin with a vee");
  });

  it("a saved cut is counted: fewer litres than the same board flat, and a bottom that read as none counts none", () => {
    const flat = summarizeDesign(parseSnapshot(wire())).volumeLitres;
    const cut = parseSnapshot(wireWithBottom(JSON.parse(JSON.stringify(FULL))));
    expect(bottomHasCut(cut.bottom!)).toBe(true);
    expect(summarizeDesign(cut).volumeLitres).toBeLessThan(flat);
    expect(summarizeDesign(parseSnapshot(wireWithBottom("x"))).volumeLitres).toBe(flat);
  });

  it("the furthest numbers the reader lets through are still a board the app can work out", () => {
    // Further than any slider goes: 12" across, 1" deep, every station twice the longest board away.
    const far = SNAPSHOT_BOARD_LENGTH_MM.max;
    for (const fixture of [FIXTURES[0], FIXTURES[FIXTURES.length - 1]]) {
      for (let k = 0; k < BOTTOM_CUT_NAMES.nose.length; k += 1) {
        for (const at of [far, 0, -far]) {
          const numbers = {
            offRail: inchesToMm(12),
            offStringer: inchesToMm(12),
            troughAt: inchesToMm(12),
            start: mm(at),
            deepest: mm(at),
            end: mm(at),
            depth: inchesToMm(1),
            veeLift: inchesToMm(1),
            smoothness: 100,
            closesToPoint: true,
          };
          const bottom: BoardBottom = {
            nose: { name: BOTTOM_CUT_NAMES.nose[k], ...numbers },
            center: { name: BOTTOM_CUT_NAMES.center[k], ...numbers },
            tail: { name: BOTTOM_CUT_NAMES.tail[k], ...numbers },
            channels: {
              count: ([4, 6, 8] as const)[k % 3],
              width: inchesToMm(12),
              offStringer: inchesToMm(12),
              startFromFins: mm(at),
              deepestFromFins: mm(at === 0 ? 0 : -at),
              end: mm(at),
              depth: inchesToMm(1),
              smoothness: 100,
              run: (["parallel", "rail", "toe"] as const)[k % 3],
              angle: ([null, 0, CHANNEL_ANGLE_MAX] as const)[k % 3],
              longest: (["inner", "outer", "same"] as const)[k % 3],
              stagger: inchesToMm(12),
            },
            wingRule: k % 2 === 0 ? "natural" : "narrowest",
          };
          const what = `${fixture.boardName} · ${BOTTOM_CUT_NAMES.center[k]} · stations at ${at}`;
          const opened = roundTrip({ ...fixture, bottom });
          expect(opened.bottom, what).toEqual(bottom);
          expect(() => summarizeDesign(opened), what).not.toThrow();
          expect(Number.isFinite(summarizeDesign(opened).volumeLitres), what).toBe(true);
        }
      }
    }
  });
});
