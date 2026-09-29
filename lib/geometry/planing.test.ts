import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import { prepareBlank, type BoardOnBlankInput } from "./blank-fit";
import { buildBlankProfile, buildFallbackProfile } from "./board-profile";
import { formatDeckSkin } from "./blank-reasons";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { formatMark, planerPasses } from "./measure-display";
import { planingTable } from "./planing";
import { DEFAULT_FALLBACK_ROCKER } from "./rocker";
import { inchesToMm, mm, type UnitsSystem } from "./units";

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
    const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8) } };
    const result = planingTable(input, inchesToMm(1 / 8), "imperial");
    expect(result.headers).toEqual({ deck: "Deck", bottom: "Bottom" });
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: '1/8"', bottom: '3/8"' },
      { label: "Passes", deck: "1", bottom: "3" },
    ]);
    expect(result.footnote).toBe('At the center, at 1/8" a pass — your Planer Max Depth.');
  });

  it("the same blank, Metric: 10 printed mm over 3 printed mm rounds up to 4 on the Bottom", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8) } };
    const result = planingTable(input, inchesToMm(1 / 8), "metric");
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: "3 mm", bottom: "10 mm" },
      { label: "Passes", deck: "1", bottom: "4" },
    ]);
    expect(result.footnote).toBe("At the center, at 3 mm a pass — your Planer Max Depth.");
  });

  it("a deck skin of exactly zero prints \"none\" under Foam Off and 0 passes, in both systems", () => {
    for (const system of SYSTEMS) {
      const input = { blank: { cut: { deckSkin: mm(0) }, centerGap: inchesToMm(3 / 8) } };
      const result = planingTable(input, inchesToMm(1 / 8), system);
      expect(result.rows[0].deck).toBe("none");
      expect(result.rows[1].deck).toBe("0");
    }
  });

  it("many passes, Imperial: a thick skin and a wide gap at a fine pass depth", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1) }, centerGap: inchesToMm(19 / 16) } };
    const result = planingTable(input, inchesToMm(1 / 16), "imperial");
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: '1"', bottom: '1 3/16"' },
      { label: "Passes", deck: "16", bottom: "19" },
    ]);
  });

  it("many passes, Metric: the same shape at a metric skin, gap and pass depth", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1) }, centerGap: mm(30) } };
    const result = planingTable(input, mm(2), "metric");
    expect(result.rows).toEqual([
      { label: "Foam Off", deck: "25 mm", bottom: "30 mm" },
      { label: "Passes", deck: "13", bottom: "15" },
    ]);
  });

  it('one pass on the deck in Metric: skin and depth both 3mm', () => {
    const input = { blank: { cut: { deckSkin: mm(3) }, centerGap: inchesToMm(3 / 8) } };
    const result = planingTable(input, mm(3), "metric");
    expect(result.rows[1].deck).toBe("1");
  });

  it("a centre gap that prints as zero reads unsigned on the Bottom — never -0 — with 0 passes", () => {
    const depth = inchesToMm(1 / 8);
    const centerGap = mm(-0.3);

    const imperial = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "imperial");
    expect(imperial.rows[0].bottom).toBe('0"');
    expect(imperial.rows[1].bottom).toBe("0");

    const metric = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "metric");
    expect(metric.rows[0].bottom).toBe("0 mm");
    expect(metric.rows[1].bottom).toBe("0");
  });

  it("a centre gap genuinely below zero prints signed on the Bottom, with 0 passes in both systems", () => {
    const depth = inchesToMm(1 / 8);
    const centerGap = inchesToMm(-1 / 16);

    const imperial = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "imperial");
    expect(imperial.rows[0].bottom).toBe('-1/16"');
    expect(imperial.rows[1].bottom).toBe("0");

    const metric = planingTable({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "metric");
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
  });
});
