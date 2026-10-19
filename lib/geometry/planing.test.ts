import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import { prepareBlank, type BoardOnBlankInput } from "./blank-fit";
import { buildBlankProfile, buildFallbackProfile } from "./board-profile";
import { formatDeckSkin, formatThinningStart, formatThinningStartBare } from "./blank-reasons";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { formatMark, formatWholePasses, planerPasses, stationLabel, wholePasses } from "./measure-display";
import { planingStations, planingTable, thinningLine } from "./planing";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "./units";

// Every blank figure below is read from the committed CSVs through the tested reader, and every
// "wired" expectation is computed by the app's own helpers — never typed (CLAUDE.md Rule 1). The
// two boardInput/findBlank helpers below are board-profile.test.ts's own, copied here rather than
// exported, since this file only needs one blank and one board shape.
const CATALOG = readSeedCatalog();
const MARKO_VENDOR = "Marko Foam";
const M_REGULAR = `6'0" M-Regular`;

function findBlank(vendor: string, name: string): BlankRecord {
  const blank = CATALOG.find((b) => b.vendor === vendor && b.name === name);
  if (!blank) throw new Error(`${vendor} ${name} is not in the seeded catalogue`);
  return blank;
}

const BOARD_LENGTH = inchesToMm(70);

function boardInput(overrides: Partial<BoardOnBlankInput> = {}): BoardOnBlankInput {
  return {
    length: BOARD_LENGTH,
    centerThickness: inchesToMm(2.5),
    noseTip: DEFAULT_FOIL_SPEC.noseTip,
    tailTip: DEFAULT_FOIL_SPEC.tailTip,
    nose12Offset: mm(0),
    tail12Offset: mm(0),
    ...DEFAULT_BLANK_CUT,
    ...overrides,
  };
}

const SYSTEMS: UnitsSystem[] = ["imperial", "metric"];

/** `formatMark`, except a printed minus-zero reads the unsigned zero — the rule the PLANING tab keeps. */
function unsignedMark(value: Mm, system: UnitsSystem): string {
  const zero = formatMark(mm(0), system);
  const printed = formatMark(value, system);
  return printed === `-${zero}` ? zero : printed;
}

/** Both tips' thinning starting at the 12" station — the hand-built inputs below only need a shape. */
const TIPS_AT_12 = { nose: { fromTip: inchesToMm(12) }, tail: { fromTip: inchesToMm(12) } };

/** Count the times `needle` appears in `text`. */
function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe("thinningLine — where each tip's thinning starts, printed under the PLANING footnote (D-12)", () => {
  it("is composed from the same two formatters in both systems, with the unit once at the end in Metric", () => {
    const nose = inchesToMm(12);
    const tail = inchesToMm(25.5);
    for (const system of SYSTEMS) {
      expect(thinningLine(nose, tail, system)).toBe(
        `Thinning starts from the tip: nose ${formatThinningStartBare(nose, system)}, ` +
          `tail ${formatThinningStart(tail, system)}.`,
      );
    }
  });

  it("reads the UI-SPEC's own example in Imperial: nose 12\", tail 25 1/2\"", () => {
    const line = thinningLine(inchesToMm(12), inchesToMm(25.5), "imperial");
    expect(formatThinningStartBare(inchesToMm(12), "imperial")).toBe('12"');
    expect(formatThinningStart(inchesToMm(25.5), "imperial")).toBe('25 1/2"');
    expect(line).toBe('Thinning starts from the tip: nose 12", tail 25 1/2".');
  });

  it("reads the UI-SPEC's own example in Metric: nose 30.5, tail 64.8 cm — cm exactly once", () => {
    const line = thinningLine(inchesToMm(12), inchesToMm(25.5), "metric");
    expect(formatThinningStartBare(inchesToMm(12), "metric")).toBe("30.5");
    expect(formatThinningStart(inchesToMm(25.5), "metric")).toBe("64.8 cm");
    expect(line).toBe("Thinning starts from the tip: nose 30.5, tail 64.8 cm.");
    expect(occurrences(line, " cm")).toBe(1);
    expect(line.endsWith(" cm.")).toBe(true);
  });

  it("planingTable carries the line with a blank and null without one, in both systems", () => {
    for (const system of SYSTEMS) {
      const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8), tips: TIPS_AT_12 } };
      const withBlank = planingTable(input, inchesToMm(1 / 8), system);
      expect(withBlank.thinning).toBe(thinningLine(inchesToMm(12), inchesToMm(12), system));
      expect(withBlank.thinning).toBe(
        `Thinning starts from the tip: nose ${formatThinningStartBare(inchesToMm(12), system)}, ` +
          `tail ${formatThinningStart(inchesToMm(12), system)}.`,
      );
      expect(planingTable({ blank: null }, inchesToMm(1 / 8), system).thinning).toBeNull();
    }
    const metric = planingTable(
      { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8), tips: TIPS_AT_12 } },
      inchesToMm(1 / 8),
      "metric",
    );
    expect(metric.thinning).toBe("Thinning starts from the tip: nose 30.5, tail 30.5 cm.");
    expect(occurrences(metric.thinning!, " cm")).toBe(1);
  });
});

describe("planingTable — the order form's PLANING table (quick 260928-tst)", () => {
  it("no blank picked, both systems: dashes in every cell and the same no-blank footnote", () => {
    for (const system of SYSTEMS) {
      const result = planingTable({ blank: null }, inchesToMm(1 / 8), system);
      expect(result.headers).toEqual({ deck: "Deck", bottom: "Bottom" });
      expect(result.rows).toEqual([
        { label: "Foam Off", deck: "—", bottom: "—" },
        { label: "Passes", deck: "—", bottom: "—" },
      ]);
      expect(result.footnote).toBe("Pick a blank on ROCKER for the planing numbers.");
    }
  });

  it("a blank, Imperial: Foam Off and Passes for both Deck and Bottom, worded exactly", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8), tips: TIPS_AT_12 } };
    const result = planingTable(input, inchesToMm(1 / 8), "imperial");
    expect(result.headers).toEqual({ deck: "Deck", bottom: "Bottom" });
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: '1/8"', bottom: '3/8"' },
      { label: "Passes", deck: "1", bottom: "3" },
    ]);
    expect(result.footnote).toBe('At the center, at 1/8" a pass — your Planer Max Depth.');
  });

  it("the same blank, Metric: 10 printed mm over 3 printed mm rounds up to 4 on the Bottom", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8), tips: TIPS_AT_12 } };
    const result = planingTable(input, inchesToMm(1 / 8), "metric");
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: "3 mm", bottom: "10 mm" },
      { label: "Passes", deck: "1", bottom: "4" },
    ]);
    expect(result.footnote).toBe("At the center, at 3 mm a pass — your Planer Max Depth.");
  });

  it("a deck skin of exactly zero prints \"none\" under Foam Off and 0 passes, in both systems", () => {
    for (const system of SYSTEMS) {
      const input = { blank: { cut: { deckSkin: mm(0) }, centerGap: inchesToMm(3 / 8), tips: TIPS_AT_12 } };
      const result = planingTable(input, inchesToMm(1 / 8), system);
      expect(result.rows[0].deck).toBe("none");
      expect(result.rows[1].deck).toBe("0");
    }
  });

  it("many passes, Imperial: a thick skin and a wide gap at a fine pass depth", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1) }, centerGap: inchesToMm(19 / 16), tips: TIPS_AT_12 } };
    const result = planingTable(input, inchesToMm(1 / 16), "imperial");
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: '1"', bottom: '1 3/16"' },
      { label: "Passes", deck: "16", bottom: "19" },
    ]);
  });

  it("many passes, Metric: the same shape at a metric skin, gap and pass depth", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1) }, centerGap: mm(30), tips: TIPS_AT_12 } };
    const result = planingTable(input, mm(2), "metric");
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: "25 mm", bottom: "30 mm" },
      { label: "Passes", deck: "13", bottom: "15" },
    ]);
  });

  it('one pass on the deck in Metric: skin and depth both 3mm', () => {
    const input = { blank: { cut: { deckSkin: mm(3) }, centerGap: inchesToMm(3 / 8), tips: TIPS_AT_12 } };
    const result = planingTable(input, mm(3), "metric");
    expect(result.rows[1].deck).toBe("1");
  });

  it("a centre gap that prints as zero reads unsigned on the Bottom — never -0 — with 0 passes", () => {
    const depth = inchesToMm(1 / 8);
    const centerGap = mm(-0.3);

    const imperial = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap, tips: TIPS_AT_12 } }, depth, "imperial");
    expect(imperial.rows[0].bottom).toBe('0"');
    expect(imperial.rows[1].bottom).toBe("0");

    const metric = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap, tips: TIPS_AT_12 } }, depth, "metric");
    expect(metric.rows[0].bottom).toBe("0 mm");
    expect(metric.rows[1].bottom).toBe("0");
  });

  it("a centre gap genuinely below zero prints signed on the Bottom, with 0 passes in both systems", () => {
    const depth = inchesToMm(1 / 8);
    const centerGap = inchesToMm(-1 / 16);

    const imperial = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap, tips: TIPS_AT_12 } }, depth, "imperial");
    expect(imperial.rows[0].bottom).toBe('-1/16"');
    expect(imperial.rows[1].bottom).toBe("0");

    const metric = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap, tips: TIPS_AT_12 } }, depth, "metric");
    expect(metric.rows[0].bottom).toBe("-2 mm");
    expect(metric.rows[1].bottom).toBe("0");
  });

  describe("wired to a real side profile — Marko Foam 6'0\" M-Regular", () => {
    const prepared = prepareBlank(findBlank(MARKO_VENDOR, M_REGULAR));
    const profile = buildBlankProfile(prepared, boardInput(), mm(0));
    const view = profile.blank!;

    it("has a non-vacuous deck skin and centre gap", () => {
      expect(view.cut.deckSkin).toBeGreaterThan(0);
      expect(view.centerGap).toBeGreaterThan(0);
    });

    for (const system of SYSTEMS) {
      it(`computes every cell through the same named helpers ROCKER and the DATASHEET use (${system})`, () => {
        const depth = inchesToMm(1 / 8);
        const result = planingTable(profile, depth, system);

        // Foam Off Deck equals both formatDeckSkin(deckSkin) and the DATASHEET's own FOAM OFF Deck
        // cell at Center, formatMark(foamOffDeck.center) — the same figure, worded the same way.
        const expectedDeck = formatDeckSkin(view.cut.deckSkin, system);
        expect(expectedDeck).toBe(formatMark(view.foamOffDeck.center, system));
        expect(result.rows[0].deck).toBe(expectedDeck);

        // Foam Off Bottom equals both formatMark(centerGap) and the DATASHEET's FOAM OFF Bottom
        // cell at Center, formatMark(foamOffBottom.center).
        const expectedBottom = formatMark(view.centerGap, system);
        expect(expectedBottom).toBe(formatMark(view.foamOffBottom.center, system));
        expect(result.rows[0].bottom).toBe(expectedBottom);

        // Passes deck equals planerPasses on both the deck skin and the DATASHEET's own FOAM OFF
        // Deck cell at Center — the same number either way.
        const expectedDeckPasses = String(planerPasses(view.cut.deckSkin, depth, system));
        expect(expectedDeckPasses).toBe(String(planerPasses(view.foamOffDeck.center, depth, system)));
        expect(result.rows[1].deck).toBe(expectedDeckPasses);

        expect(result.rows[1].bottom).toBe(String(planerPasses(view.centerGap, depth, system)));

        expect(result.footnote).toBe(`At the center, at ${formatMark(depth, system)} a pass — your Planer Max Depth.`);

        // The thinning line reads the side profile's own starts in force — the same figures the
        // ROCKER screen shows — so the printed sheet can never disagree with the screen.
        expect(result.thinning).toBe(thinningLine(view.tips.nose.fromTip, view.tips.tail.fromTip, system));
      });
    }
  });

  it("a hand-set profile with no blank gives the same dashes table as {blank: null}", () => {
    const profile = buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, DEFAULT_FOIL_SPEC, inchesToMm(70));
    const result = planingTable(profile, inchesToMm(1 / 8), "imperial");
    expect(result.headers).toEqual({ deck: "Deck", bottom: "Bottom" });
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: "—", bottom: "—" },
      { label: "Passes", deck: "—", bottom: "—" },
    ]);
    expect(result.footnote).toBe("Pick a blank on ROCKER for the planing numbers.");
    expect(result.thinning).toBeNull();
  });
});

// ROCKER's PLANING tab (quick 261019-gqo, plan 02): five stations nose to tail, each with the board's rocker,
// the foam off the deck and off the bottom, and the whole planer passes for each. Every expected string below is
// worked out here with the app's own formatters, never typed (CLAUDE.md Rule 1) — the Longboard's actual
// figures are pinned cell by cell in the browser (e2e/rocker-planing.spec.ts).
describe("planingStations — the PLANING tab's five rows (quick 261019-gqo, D-07)", () => {
  const catalogueProfile = () => {
    const prepared = prepareBlank(findBlank(MARKO_VENDOR, M_REGULAR));
    return buildBlankProfile(prepared, boardInput(), mm(0));
  };
  const STATION_KEYS = ["noseTip", "nose12", "center", "tail12", "tailTip"] as const;
  type Key = (typeof STATION_KEYS)[number];
  /** A hand-built input, so the below-zero cases can be set exactly. */
  function handInput(bottom: Record<Key, Mm>) {
    const eighth = inchesToMm(1 / 8);
    return {
      stationRocker: { noseTip: mm(100), nose12: mm(50), center: mm(0), tail12: mm(40), tailTip: mm(80) },
      blank: {
        foamOffDeck: { noseTip: eighth, nose12: eighth, center: eighth, tail12: eighth, tailTip: eighth },
        foamOffBottom: bottom,
      },
    };
  }

  it("a hand-set profile (no blank) has nothing to plane: null in both systems", () => {
    const fallback = buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, DEFAULT_FOIL_SPEC, BOARD_LENGTH);
    for (const system of SYSTEMS) {
      expect(planingStations(fallback, inchesToMm(1 / 8), system)).toBeNull();
    }
  });

  it("a catalogue blank gives five rows nose to tail, named like the DATASHEET's columns", () => {
    const profile = catalogueProfile();
    for (const system of SYSTEMS) {
      const rows = planingStations(profile, inchesToMm(1 / 8), system);
      expect(rows).not.toBeNull();
      expect(rows!.map((r) => r.key)).toEqual([...STATION_KEYS]);
      expect(rows!.map((r) => r.name)).toEqual([
        "Nose Tip",
        `Nose @ ${stationLabel(system)}`,
        "Center",
        `Tail @ ${stationLabel(system)}`,
        "Tail Tip",
      ]);
    }
  });

  it("every figure is the app's own mark of the profile's value, and every passes figure its own whole passes", () => {
    const profile = catalogueProfile();
    const depth = inchesToMm(1 / 8);
    for (const system of SYSTEMS) {
      const rows = planingStations(profile, depth, system)!;
      for (const row of rows) {
        const key = row.key;
        expect(row.rocker).toBe(unsignedMark(profile.stationRocker[key], system));
        expect(row.offDeck.text).toBe(unsignedMark(profile.blank!.foamOffDeck[key], system));
        expect(row.offBottom.text).toBe(unsignedMark(profile.blank!.foamOffBottom[key], system));
        expect(row.deckPasses).toBe(
          formatWholePasses(wholePasses(profile.blank!.foamOffDeck[key], depth, system), system),
        );
        expect(row.bottomPasses).toBe(
          formatWholePasses(wholePasses(profile.blank!.foamOffBottom[key], depth, system), system),
        );
      }
    }
  });

  it("foam 1/16\" short of the blank at the tail tip reads -1/16\" (Metric -2 mm) in warning, with 0 passes", () => {
    const input = handInput({
      noseTip: inchesToMm(3 / 8),
      nose12: inchesToMm(3 / 8),
      center: inchesToMm(3 / 8),
      tail12: inchesToMm(3 / 8),
      tailTip: inchesToMm(-1 / 16),
    });
    const imperial = planingStations(input, inchesToMm(1 / 8), "imperial")!;
    expect(imperial[4].offBottom).toEqual({ text: '-1/16"', negative: true });
    expect(imperial[4].bottomPasses).toBe("0");
    expect(imperial[0].offBottom.negative).toBe(false);
    const metric = planingStations(input, inchesToMm(1 / 8), "metric")!;
    expect(metric[4].offBottom).toEqual({ text: "-2 mm", negative: true });
    expect(metric[4].bottomPasses).toBe("0");
  });

  it("a shortfall that prints as zero reads the unsigned zero, never -0, and is not in warning", () => {
    const input = handInput({
      noseTip: mm(-0.2),
      nose12: mm(-0.2),
      center: mm(-0.2),
      tail12: mm(-0.2),
      tailTip: mm(-0.2),
    });
    for (const system of SYSTEMS) {
      const rows = planingStations(input, inchesToMm(1 / 8), system)!;
      for (const row of rows) {
        expect(row.offBottom).toEqual({ text: formatMark(mm(0), system), negative: false });
        expect(row.bottomPasses).toBe("0");
      }
    }
    expect(planingStations(input, inchesToMm(1 / 8), "imperial")![0].offBottom.text).toBe('0"');
    expect(planingStations(input, inchesToMm(1 / 8), "metric")![0].offBottom.text).toBe("0 mm");
  });
});
