import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import { prepareBlank, type BoardOnBlankInput } from "./blank-fit";
import { buildBlankProfile, buildFallbackProfile } from "./board-profile";
import { formatDeckSkin } from "./blank-reasons";
import { DEFAULT_FOIL_SPEC } from "./foil";
import { formatMark, formatPasses, planerPasses } from "./measure-display";
import { planingBox } from "./planing";
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

describe("planingBox — the order form's PLANING column (Phase 13 item 8)", () => {
  it("no blank picked, both systems: items are empty and the no-blank line says where the numbers come from", () => {
    for (const system of SYSTEMS) {
      const result = planingBox({ blank: null }, inchesToMm(1 / 8), system);
      expect(result.items).toEqual([]);
      expect(result.noBlankLine).toBe("Pick a blank on ROCKER for the planing numbers.");
    }
  });

  it("a blank, Imperial: Deck Skin, Off Bottom @ Center and Planer Passes, worded exactly", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8) } };
    const result = planingBox(input, inchesToMm(1 / 8), "imperial");
    expect(result.items).toEqual([
      { label: "Deck Skin", value: '1/8"', note: null },
      { label: "Off Bottom @ Center", value: '3/8"', note: null },
      { label: "Planer Passes", value: "3 passes", note: 'at 1/8" a pass' },
    ]);
    expect(result.noBlankLine).toBeNull();
  });

  it("the same blank, Metric: 10 printed mm over 3 printed mm rounds up to 4 — one more than Imperial", () => {
    const input = { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8) } };
    const result = planingBox(input, inchesToMm(1 / 8), "metric");
    expect(result.items).toEqual([
      { label: "Deck Skin", value: "3 mm", note: null },
      { label: "Off Bottom @ Center", value: "10 mm", note: null },
      { label: "Planer Passes", value: "4 passes", note: "at 3 mm a pass" },
    ]);
    expect(result.noBlankLine).toBeNull();
  });

  it("a deck skin of exactly zero prints \"none\" in both systems", () => {
    for (const system of SYSTEMS) {
      const input = { blank: { cut: { deckSkin: mm(0) }, centerGap: inchesToMm(3 / 8) } };
      const result = planingBox(input, inchesToMm(1 / 8), system);
      expect(result.items[0]).toEqual({ label: "Deck Skin", value: "none", note: null });
    }
  });

  it("a centre gap that prints as zero reads unsigned — never -0 — with a 0 pass count", () => {
    const depth = inchesToMm(1 / 8);
    const centerGap = mm(-0.3);

    const imperial = planingBox({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "imperial");
    expect(imperial.items[1]).toEqual({ label: "Off Bottom @ Center", value: '0"', note: null });
    expect(imperial.items[2].value).toBe("0 passes");

    const metric = planingBox({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "metric");
    expect(metric.items[1]).toEqual({ label: "Off Bottom @ Center", value: "0 mm", note: null });
    expect(metric.items[2].value).toBe("0 passes");
  });

  it("a centre gap genuinely below zero prints signed, with 0 passes in both systems", () => {
    const depth = inchesToMm(1 / 8);
    const centerGap = inchesToMm(-1 / 16);

    const imperial = planingBox({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "imperial");
    expect(imperial.items[1]).toEqual({ label: "Off Bottom @ Center", value: '-1/16"', note: null });
    expect(imperial.items[2].value).toBe("0 passes");

    const metric = planingBox({ blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap } }, depth, "metric");
    expect(metric.items[1]).toEqual({ label: "Off Bottom @ Center", value: "-2 mm", note: null });
    expect(metric.items[2].value).toBe("0 passes");
  });

  it('one pass reads "1 pass" — Imperial and Metric, each at their own pass depth', () => {
    const imperial = planingBox(
      { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(1 / 8) } },
      inchesToMm(1 / 8),
      "imperial",
    );
    expect(imperial.items[2]).toEqual({ label: "Planer Passes", value: "1 pass", note: 'at 1/8" a pass' });

    const metric = planingBox(
      { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: mm(3) } },
      mm(3),
      "metric",
    );
    expect(metric.items[2]).toEqual({ label: "Planer Passes", value: "1 pass", note: "at 3 mm a pass" });
  });

  it("a finer 1/16\" pass depth counts more passes off the same centre gap", () => {
    const result = planingBox(
      { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(3 / 8) } },
      inchesToMm(1 / 16),
      "imperial",
    );
    expect(result.items[2]).toEqual({ label: "Planer Passes", value: "6 passes", note: 'at 1/16" a pass' });
  });

  describe("wired to a real side profile — Marko Foam 6'0\" M-Regular", () => {
    const prepared = prepareBlank(findBlank(MARKO_VENDOR, M_REGULAR));
    const profile = buildBlankProfile(prepared, boardInput(), mm(0));
    const view = profile.blank!;

    it("has a non-vacuous centre gap", () => {
      expect(view.centerGap).toBeGreaterThan(0);
    });

    it("its own Center OFF BOTTOM reading equals the DATASHEET's foamOffBottom.center", () => {
      for (const system of SYSTEMS) {
        expect(formatMark(view.centerGap, system)).toBe(formatMark(view.foamOffBottom.center, system));
      }
    });

    for (const system of SYSTEMS) {
      it(`computes every value through the same named helpers ROCKER uses (${system})`, () => {
        const depth = inchesToMm(1 / 8);
        const result = planingBox(profile, depth, system);
        expect(result.noBlankLine).toBeNull();
        expect(result.items).toEqual([
          { label: "Deck Skin", value: formatDeckSkin(view.cut.deckSkin, system), note: null },
          { label: "Off Bottom @ Center", value: formatMark(view.centerGap, system), note: null },
          {
            label: "Planer Passes",
            value: formatPasses(planerPasses(view.centerGap, depth, system)),
            note: `at ${formatMark(depth, system)} a pass`,
          },
        ]);
      });
    }
  });

  it("a hand-set profile with no blank gives the no-blank line, exactly like {blank: null}", () => {
    const profile = buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, DEFAULT_FOIL_SPEC, inchesToMm(70));
    const result = planingBox(profile, inchesToMm(1 / 8), "imperial");
    expect(result.items).toEqual([]);
    expect(result.noBlankLine).toBe("Pick a blank on ROCKER for the planing numbers.");
  });
});
