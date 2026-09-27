import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import type { BlankRecord, BlankShortfall } from "./blank";
import { placementRange } from "./blank-fit";
import {
  blankRowMeta,
  blankRowVolume,
  boardLine,
  type CenterFloorRules,
  emptyListMessage,
  FLAG_HEADLINES,
  floorShortfallMessage,
  formatPlacement,
  formatShortfall,
  listIntro,
  matchesBlankSearch,
  NOTHING_FITS_SENTENCE,
  offerLine,
  placementSlider,
  REASON_SNAP_MM,
} from "./blank-reasons";
import { DEFAULT_BOARD_SPEC } from "./board";
import { formatDim, formatLength, formatMark, stationLabel } from "./measure-display";
import { BOARD_PRESETS } from "./presets";
import { MEASURE_STATION_MM } from "./outline";
import { inchesToMm, litres, mm, mmToInches, UNITS_SYSTEMS, type Mm, type UnitsSystem } from "./units";

// Expected strings are either the 11-UI-SPEC Copywriting Contract's own examples (checked against
// the app's formatters when the contract was written) or composed here from those same formatters —
// never a converted number typed by hand (CLAUDE.md Rule 1).

const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const L = inchesToMm(72);
const BOARD = { length: L, widePointStation: inchesToMm(35.5) };
const shortfall = (kind: BlankShortfall["kind"], station: number, amount: number): BlankShortfall => ({
  kind,
  station: mm(station),
  amount: mm(amount),
});

function findBlank(vendor: string, name: string): BlankRecord {
  const blank = readSeedCatalog().find((b) => b.vendor === vendor && b.name === name);
  if (!blank) throw new Error(`${vendor} ${name} is not in the seeded catalogue`);
  return blank;
}

describe("formatShortfall — the reason line (D-06, R12)", () => {
  const eighth = inchesToMm(1 / 8);
  const half = inchesToMm(1 / 2);

  it("reads the UI-SPEC's own two examples in both systems", () => {
    const thin = shortfall("thin", L - MEASURE_STATION_MM, eighth);
    expect(formatShortfall(thin, BOARD, "imperial")).toBe(`1/8" too thin 12" from the nose`);
    expect(formatShortfall(thin, BOARD, "metric")).toBe("3 mm too thin 30.5 cm from the nose");
    const wide = shortfall("wide", BOARD.widePointStation, half);
    expect(formatShortfall(wide, BOARD, "imperial")).toBe(`1/2" too wide at the widepoint`);
    expect(formatShortfall(wide, BOARD, "metric")).toBe("13 mm too wide at the widepoint");
  });

  describe.each(UNITS_SYSTEMS)("in %s", (system: UnitsSystem) => {
    const amount = formatMark(eighth, system);
    const read = (kind: BlankShortfall["kind"], station: number) =>
      formatShortfall(shortfall(kind, station, eighth), BOARD, system);

    it("names the 12\" stations through stationLabel, from the nearer end", () => {
      expect(read("thin", L - MEASURE_STATION_MM)).toBe(`${amount} too thin ${stationLabel(system)} from the nose`);
      expect(read("thin", MEASURE_STATION_MM)).toBe(`${amount} too thin ${stationLabel(system)} from the tail`);
      // Within the 1" snap of a 12" station, still that station.
      expect(read("thin", MEASURE_STATION_MM + inchesToMm(0.75))).toBe(
        `${amount} too thin ${stationLabel(system)} from the tail`,
      );
    });

    it("width failures within 1\" of the widepoint read 'at the widepoint'; thickness failures there do not", () => {
      expect(read("wide", BOARD.widePointStation + inchesToMm(0.9))).toBe(`${amount} too wide at the widepoint`);
      const station = BOARD.widePointStation - inchesToMm(4);
      expect(read("thin", station)).toBe(`${amount} too thin ${formatDim(mm(station), system)} from the tail`);
      // The widepoint wins over the center when both are within the snap (first match).
      const both = { length: L, widePointStation: mm(L / 2 - inchesToMm(0.5)) };
      expect(formatShortfall(shortfall("wide", L / 2, eighth), both, system)).toBe(
        `${amount} too wide at the widepoint`,
      );
    });

    it("the tips and the center, within 1\"", () => {
      expect(read("thin", L - inchesToMm(0.25))).toBe(`${amount} too thin at the nose tip`);
      expect(read("wide", inchesToMm(0.5))).toBe(`${amount} too wide at the tail tip`);
      expect(read("thin", 0)).toBe(`${amount} too thin at the tail tip`);
      expect(read("thin", L)).toBe(`${amount} too thin at the nose tip`);
      expect(read("thin", L / 2 + inchesToMm(0.75))).toBe(`${amount} too thin at the center`);
    });

    it("the 1\" snap is inclusive: exactly 1\" from the tail tip is the tip, a sixteenth further is not", () => {
      expect(REASON_SNAP_MM).toBe(inchesToMm(1));
      expect(read("thin", REASON_SNAP_MM)).toBe(`${amount} too thin at the tail tip`);
      const past = REASON_SNAP_MM + inchesToMm(1 / 16);
      expect(read("thin", past)).toBe(`${amount} too thin ${formatDim(mm(past), system)} from the tail`);
    });

    it("anywhere else reads its distance from the nearer end", () => {
      const fromTail = inchesToMm(18.5);
      expect(read("thin", fromTail)).toBe(`${amount} too thin ${formatDim(fromTail, system)} from the tail`);
      const fromNose = inchesToMm(20);
      expect(read("wide", L - fromNose)).toBe(`${amount} too wide ${formatDim(fromNose, system)} from the nose`);
    });

    it("a shortfall that rounds to nothing reads 'under' one step, never zero", () => {
      const step = system === "metric" ? mm(1) : inchesToMm(1 / 16);
      const tiny = formatShortfall(shortfall("thin", L - inchesToMm(0.1), 0.01), BOARD, system);
      expect(tiny).toBe(`under ${formatMark(step, system)} too thin at the nose tip`);
    });

    it("every reason names an amount and a station", () => {
      for (let inches = 0; inches <= 72; inches += 0.5) {
        for (const kind of ["thin", "wide"] as const) {
          for (const amountIn of [0.001, 1 / 16, 0.3, 1.5]) {
            const text = formatShortfall(shortfall(kind, inchesToMm(inches), inchesToMm(amountIn)), BOARD, system);
            expect(text).toMatch(/^(under )?\S.* too (thin|wide) (at the (widepoint|nose tip|tail tip|center)|.+ from the (nose|tail))$/);
            expect(text).toMatch(system === "metric" ? /\d mm too/ : /\d" too/);
          }
        }
      }
    });
  });

  it("the imperial 'under' line reads the UI-SPEC's copy", () => {
    expect(formatShortfall(shortfall("thin", L, 0.01), BOARD, "imperial")).toBe(`under 1/16" too thin at the nose tip`);
    expect(formatShortfall(shortfall("thin", L, 0.01), BOARD, "metric")).toBe("under 1 mm too thin at the nose tip");
  });
});

describe("formatPlacement — where the board sits on the blank (R3)", () => {
  it("reads toward nose / toward tail / centered", () => {
    expect(formatPlacement(inchesToMm(0.5), "imperial")).toBe(`1/2" toward nose`);
    expect(formatPlacement(inchesToMm(-0.25), "imperial")).toBe(`1/4" toward tail`);
    expect(formatPlacement(inchesToMm(0.5), "metric")).toBe("13 mm toward nose");
    expect(formatPlacement(mm(0), "imperial")).toBe("centered");
    expect(formatPlacement(mm(0), "metric")).toBe("centered");
  });

  it("is exactly 'centered' whenever the value prints as zero", () => {
    // Under half a step either way prints as zero in that system.
    expect(formatPlacement(inchesToMm(1 / 64), "imperial")).toBe("centered");
    expect(formatPlacement(inchesToMm(-1 / 64), "imperial")).toBe("centered");
    expect(formatPlacement(mm(0.4), "metric")).toBe("centered");
    expect(formatPlacement(mm(-0.4), "metric")).toBe("centered");
    expect(formatPlacement(mm(-0.4), "imperial")).toBe("centered");
  });

  it.each(UNITS_SYSTEMS)("composes the amount through formatMark in %s", (system) => {
    for (const inches of [0.0625, 0.75, 3, 12.3125, 45.25]) {
      const value = inchesToMm(inches);
      expect(formatPlacement(value, system)).toBe(`${formatMark(value, system)} toward nose`);
      expect(formatPlacement(mm(-value), system)).toBe(`${formatMark(value, system)} toward tail`);
    }
  });
});

describe("placementSlider — the nose is the left end (R3)", () => {
  const range = placementRange(inchesToMm(76), inchesToMm(70));

  it("imperial: the left end is the most nose-ward placement, and a drag left raises the placement", () => {
    const view = placementSlider(mm(0), range, "imperial");
    expect(view.value).toBe(0);
    expect(view.toMm(view.min)).toBeCloseTo(range.max, 9);
    expect(view.toMm(view.max)).toBeCloseTo(range.min, 9);
    expect(view.step).toBe(1 / 16);
    expect(view.toMm(view.value - view.step)).toBeGreaterThan(0);
    expect(view.toMm(view.value + view.step)).toBeLessThan(0);
    expect(placementSlider(inchesToMm(1), range, "imperial").value).toBeCloseTo(-1, 12);
  });

  it("metric: the same direction, whole millimetres, never past the range", () => {
    const view = placementSlider(mm(0), range, "metric");
    expect(view.value).toBe(0);
    expect(view.step).toBe(1);
    const noseEnd = view.toMm(view.min);
    expect(noseEnd).toBeLessThanOrEqual(range.max);
    expect(range.max - noseEnd).toBeLessThan(1);
    const tailEnd = view.toMm(view.max);
    expect(tailEnd).toBeGreaterThanOrEqual(range.min);
    expect(tailEnd - range.min).toBeLessThan(1);
    expect(view.toMm(view.value - view.step)).toBe(1);
    expect(view.toMm(view.value + view.step)).toBe(-1);
  });

  it.each(UNITS_SYSTEMS)("a drag back to the middle stores a plain zero in %s", (system) => {
    const view = placementSlider(inchesToMm(1), range, system);
    expect(Object.is(view.toMm(0), 0)).toBe(true);
  });

  it("a board with no room to slide gets a zero-width slider", () => {
    const none = placementRange(inchesToMm(70), inchesToMm(70));
    for (const system of UNITS_SYSTEMS) {
      const view = placementSlider(mm(0), none, system);
      expect(view.min).toBe(0);
      expect(view.max).toBe(0);
      expect(view.toMm(view.min)).toBe(0);
    }
  });

  it("reads the stored value as its negation in the slider's own unit", () => {
    const p = inchesToMm(2.5);
    expect(placementSlider(p, range, "imperial").value).toBeCloseTo(-mmToInches(p), 12);
  });
});

describe("placementSlider — the thumb can always land exactly on centred (IN-01)", () => {
  // Every pickable blank, through the tested reader, under the default board and each preset's
  // board. The slider snaps a drag to `min + k·step` (Base UI's own rounding), so zero is
  // reachable only when it is a whole number of steps from the minimum.
  const pickable = readSeedCatalog().filter(isPickable);
  const boards = [
    { label: "the default board", length: DEFAULT_BOARD_SPEC.outline.length },
    ...BOARD_PRESETS.map((preset) => ({ label: preset.name, length: preset.outline.length })),
  ];

  it.each(UNITS_SYSTEMS)("in %s, zero is on the grid for every pickable blank, and a drag there reads centered", (system) => {
    const offGrid: string[] = [];
    let slidable = 0;
    for (const board of boards) {
      for (const blank of pickable) {
        const range = placementRange(blank.lengthMm, board.length);
        const view = placementSlider(mm(0), range, system);
        if (view.max > view.min) slidable++;
        // The Base UI snap of a drag landing on zero, and what that drag stores.
        const snapped = view.min + Math.round((0 - view.min) / view.step) * view.step;
        const stored = view.toMm(snapped);
        const ok =
          view.min <= 0 &&
          view.max >= 0 &&
          snapped === 0 &&
          Object.is(stored, 0) &&
          formatPlacement(stored, system) === "centered" &&
          view.min === -view.max;
        if (!ok) offGrid.push(`${board.label} on ${blank.vendor} ${blank.name}`);
      }
    }
    expect(offGrid).toEqual([]);
    // Not vacuous: most pairs really can slide.
    expect(slidable).toBeGreaterThan(pickable.length);
  });

  it("imperial bounds never reach past the placement range (beyond float noise)", () => {
    // A reach that is a whole sixteenth mathematically can come out of the millimetre maths a few
    // ULPs short of it; the grid rounding keeps that sixteenth, so allow float noise, not foam.
    const FLOAT_NOISE_MM = 1e-9;
    for (const blank of pickable) {
      const range = placementRange(blank.lengthMm, DEFAULT_BOARD_SPEC.outline.length);
      const view = placementSlider(mm(0), range, "imperial");
      expect(view.toMm(view.min)).toBeLessThanOrEqual(range.max + FLOAT_NOISE_MM);
      expect(view.toMm(view.max)).toBeGreaterThanOrEqual(range.min - FLOAT_NOISE_MM);
      expect(range.max - view.toMm(view.min)).toBeLessThan(inchesToMm(1 / 16));
    }
  });
});

// The centre floor's rules (Phase 12 D-10): the list's Extra Length and Planer Max Depth, and the
// Deck Skin the verdicts use. `DEFAULT_RULES` is what a board with no blank picked quotes out of the
// box; `OTHER_RULES` is a shaper who changed all three, so every sentence below is proven to quote
// the rules it is handed rather than the defaults. Every expected number is formatted here, from
// these values, through `formatMark` — never typed.
const DEFAULT_RULES: CenterFloorRules = {
  extraLength: SETTINGS.extraLength,
  planerMaxDepth: SETTINGS.planerMaxDepth,
  deckSkin: DEFAULT_FIT_DEFAULTS.deckSkin,
};
const OTHER_RULES: CenterFloorRules = {
  extraLength: inchesToMm(4.5),
  planerMaxDepth: inchesToMm(3 / 16),
  deckSkin: inchesToMm(1 / 4),
};
const RULE_CASES = UNITS_SYSTEMS.flatMap((system) =>
  [
    { label: "the defaults", rules: DEFAULT_RULES },
    { label: "a changed skin, pass and length", rules: OTHER_RULES },
  ].map((c) => ({ ...c, system })),
);

describe("floorShortfallMessage — a picked blank that no longer passes a floor (F3, F4)", () => {
  it("reads the UI-SPEC's F3 copy in both systems (unchanged)", () => {
    const short = inchesToMm(1.5);
    expect(floorShortfallMessage("length", short, DEFAULT_RULES, "imperial")).toBe(
      `It's 1 1/2" too short — you've asked for at least 2" of spare length.`,
    );
    expect(floorShortfallMessage("length", short, DEFAULT_RULES, "metric")).toBe(
      "It's 38 mm too short — you've asked for at least 51 mm of spare length.",
    );
  });

  it.each(RULE_CASES)("F4 names the deck skin and the bottom pass it is short of — $label, $system", ({ rules, system }) => {
    const f = (value: Mm) => formatMark(value, system);
    const thin = inchesToMm(1 / 16);
    expect(floorShortfallMessage("center", thin, rules, system)).toBe(
      `It's ${f(thin)} too thin at the center — there isn't room for your ${f(rules.deckSkin)} deck skin and a ${f(rules.planerMaxDepth)} bottom pass.`,
    );
    expect(floorShortfallMessage("center", thin, rules, system)).not.toContain("spare thickness");
  });

  it.each(RULE_CASES)("composes through formatMark, and reads 'under' a step rather than zero — $label, $system", ({ rules, system }) => {
    const f = (value: Mm) => formatMark(value, system);
    const by = inchesToMm(0.8125);
    expect(floorShortfallMessage("length", by, rules, system)).toBe(
      `It's ${f(by)} too short — you've asked for at least ${f(rules.extraLength)} of spare length.`,
    );
    const step = system === "metric" ? mm(1) : inchesToMm(1 / 16);
    expect(floorShortfallMessage("center", mm(0.01), rules, system)).toBe(
      `It's under ${f(step)} too thin at the center — there isn't room for your ${f(rules.deckSkin)} deck skin and a ${f(rules.planerMaxDepth)} bottom pass.`,
    );
  });

  it("quotes the skin and pass it is handed, not the defaults", () => {
    for (const system of UNITS_SYSTEMS) {
      const thin = inchesToMm(1 / 16);
      expect(floorShortfallMessage("center", thin, OTHER_RULES, system)).not.toBe(
        floorShortfallMessage("center", thin, DEFAULT_RULES, system),
      );
    }
  });
});

describe("emptyListMessage — E1, E2, E3", () => {
  const board = {
    boardLength: inchesToMm(150),
    longest: inchesToMm(151.5),
    centre: inchesToMm(4.75),
    thickestCenter: inchesToMm(4.875),
  };

  it("reads the UI-SPEC's E1 copy in both systems (unchanged)", () => {
    const numbers = { ...board, rules: DEFAULT_RULES };
    expect(emptyListMessage("length", numbers, "imperial")).toEqual({
      heading: "No blank is long enough",
      body: `Your board is 12'6" and the longest blank in the three catalogs is 12'7 1/2", so none leaves the 2" of spare length you've asked for. Shorten the board on the TEMPLATE screen, or ask for less spare length.`,
    });
    expect(emptyListMessage("length", numbers, "metric").body).toBe(
      "Your board is 381.0 cm and the longest blank in the three catalogs is 384.8 cm, so none leaves the 51 mm of spare length you've asked for. Shorten the board on the TEMPLATE screen, or ask for less spare length.",
    );
  });

  it("keeps the E2 and E3 headings", () => {
    const numbers = { ...board, rules: DEFAULT_RULES };
    expect(emptyListMessage("thickness", numbers, "imperial").heading).toBe("No blank is thick enough");
    expect(emptyListMessage("both", numbers, "imperial").heading).toBe("No blank passes both rules");
  });

  it.each(RULE_CASES)("composes every number through the display boundary — $label, $system", ({ rules, system }) => {
    const numbers = { ...board, rules };
    const f = (value: Mm) => formatMark(value, system);
    expect(emptyListMessage("length", numbers, system).body).toBe(
      `Your board is ${formatLength(numbers.boardLength, system)} and the longest blank in the three catalogs is ${formatLength(numbers.longest, system)}, so none leaves the ${f(rules.extraLength)} of spare length you've asked for. Shorten the board on the TEMPLATE screen, or ask for less spare length.`,
    );
    expect(emptyListMessage("thickness", numbers, system).body).toBe(
      `Your center is ${f(numbers.centre)} and the thickest blank is ${f(numbers.thickestCenter)} at the center, so none leaves room for a ${f(rules.deckSkin)} deck skin and a ${f(rules.planerMaxDepth)} bottom pass. Try a thinner center, or change your Deck Skin or Planer Max Depth.`,
    );
    expect(emptyListMessage("both", numbers, system).body).toBe(
      `Nothing in the three catalogs is both ${f(rules.extraLength)} longer than your board and thick enough at the center for a ${f(rules.deckSkin)} deck skin and a ${f(rules.planerMaxDepth)} bottom pass.`,
    );
  });
});

describe("listIntro — the line above the list, live from the rules the list is judged by", () => {
  it.each(RULE_CASES)("quotes the extra length, the deck skin and the bottom pass — $label, $system", ({ rules, system }) => {
    const f = (value: Mm) => formatMark(value, system);
    expect(listIntro(rules, system)).toBe(
      `Shortest first. Each is at least ${f(rules.extraLength)} longer than your board, with room at the center for a ${f(rules.deckSkin)} deck skin and a ${f(rules.planerMaxDepth)} bottom pass. Greyed blanks don't fit somewhere — the line under each says where.`,
    );
  });

  it("follows the rules it is handed, and never mentions spare thickness", () => {
    for (const system of UNITS_SYSTEMS) {
      expect(listIntro(OTHER_RULES, system)).not.toBe(listIntro(DEFAULT_RULES, system));
      expect(listIntro(DEFAULT_RULES, system)).not.toContain("thicker at the center");
    }
  });
});


describe("a blank's row and the offer line", () => {
  const mRegular = findBlank("Marko Foam", `6'0" M-Regular`);
  const centre = mRegular.stations.find((s) => s.label === "C")!.thicknessMm!;

  it("the row's meta line reads the UI-SPEC's M-Regular example in both systems", () => {
    expect(blankRowMeta(mRegular, "imperial")).toBe(`Marko Foam · 6'1/16" · 2 15/16" center`);
    expect(blankRowMeta(mRegular, "metric")).toBe("Marko Foam · 183.0 cm · 74 mm center");
  });

  it.each(UNITS_SYSTEMS)("composes the row and the offer through the display boundary in %s", (system) => {
    expect(blankRowMeta(mRegular, system)).toBe(
      `${mRegular.vendor} · ${formatLength(mRegular.lengthMm, system)} · ${formatMark(centre, system)} center`,
    );
    expect(offerLine(mRegular, system)).toBe(
      `Closest blank that fits: ${mRegular.vendor} ${mRegular.name}, ${formatLength(mRegular.lengthMm, system)}`,
    );
  });

  it("a record with no centre thickness shows vendor and length only", () => {
    const noCentre: BlankRecord = {
      ...mRegular,
      stations: mRegular.stations.map((s) => (s.label === "C" ? { ...s, thicknessMm: null } : s)),
    };
    expect(blankRowMeta(noCentre, "imperial")).toBe(`${mRegular.vendor} · ${formatLength(mRegular.lengthMm, "imperial")}`);
  });

  it("keeps the catalogue's own name text, straight quotes and all", () => {
    expect(offerLine(mRegular, "imperial")).toBe(`Closest blank that fits: Marko Foam 6'0" M-Regular, 6'1/16"`);
  });
});

describe("the flag's fixed copy", () => {
  it("headlines and the nothing-fits sentence read the UI-SPEC's words", () => {
    expect(FLAG_HEADLINES).toEqual({
      doesNotFit: "This blank doesn't fit your board",
      notHere: "Doesn't fit at this placement",
    });
    expect(NOTHING_FITS_SENTENCE).toBe("No blank in the three catalogs fits this board right now.");
  });
});

describe("matchesBlankSearch — the list's search box (11-UI-SPEC §2 state B)", () => {
  const sixTwo = { vendor: "Marko Foam", name: `6'2" M-Regular` };
  const bracketed = { vendor: "US Blanks", name: "7'0 (EPS) [SUP]*" };

  it("an empty or all-space query matches every blank", () => {
    expect(matchesBlankSearch(sixTwo, "")).toBe(true);
    expect(matchesBlankSearch(sixTwo, "   ")).toBe(true);
  });

  it("is a case-insensitive substring over vendor and name together", () => {
    expect(matchesBlankSearch(sixTwo, "marko")).toBe(true);
    expect(matchesBlankSearch(sixTwo, "MAR")).toBe(true);
    expect(matchesBlankSearch(sixTwo, "foam 6'2")).toBe(true);
    expect(matchesBlankSearch(sixTwo, "m-reg")).toBe(true);
    expect(matchesBlankSearch(sixTwo, "arctic")).toBe(false);
    expect(matchesBlankSearch(sixTwo, "zzz")).toBe(false);
  });

  it("folds an iPhone's curly quotes to straight ones, in the query and in the name", () => {
    expect(matchesBlankSearch(sixTwo, "6’2")).toBe(true); // 6’2
    expect(matchesBlankSearch(sixTwo, "6‘2")).toBe(true); // 6‘2
    expect(matchesBlankSearch(sixTwo, "6'2”")).toBe(true); // 6'2”
    expect(matchesBlankSearch(sixTwo, "6'2“")).toBe(true); // 6'2“
    expect(matchesBlankSearch({ vendor: "Marko Foam", name: "6’2” M-Regular" }, `6'2"`)).toBe(true);
  });

  it("reads regular-expression characters as plain text and never throws", () => {
    for (const query of ["(", "*", "[", "(eps)", "[sup]*", ".*", "\\", "?", "+", "{2}", "^", "$", "|"]) {
      expect(() => matchesBlankSearch(bracketed, query)).not.toThrow();
    }
    expect(matchesBlankSearch(bracketed, "(eps)")).toBe(true);
    expect(matchesBlankSearch(bracketed, "[sup]*")).toBe(true);
    expect(matchesBlankSearch(bracketed, ".*")).toBe(false);
    expect(matchesBlankSearch(sixTwo, "(")).toBe(false);
    expect(matchesBlankSearch(sixTwo, "*")).toBe(false);
  });
});

describe("blankRowVolume — the volume at the end of a row's first line", () => {
  it("reads one decimal and L, the same in both systems", () => {
    expect(blankRowVolume({ volumeLitres: litres(34) })).toBe("34.0 L");
    expect(blankRowVolume({ volumeLitres: litres(47.04) })).toBe("47.0 L");
  });

  it("is null when the catalogue prints no volume, so nothing takes its place", () => {
    expect(blankRowVolume({ volumeLitres: null })).toBeNull();
  });
});

describe("boardLine — the board's size under the ROCKER subtitle", () => {
  it("reads the UI-SPEC's own example in both systems (metric carries its unit once, at the end)", () => {
    expect(boardLine(inchesToMm(70), inchesToMm(19.5), "imperial")).toBe(
      `Length and width from TEMPLATE: 5'10" × 19 1/2"`,
    );
    expect(boardLine(inchesToMm(70), inchesToMm(19.5), "metric")).toBe(
      "Length and width from TEMPLATE: 177.8 × 49.5 cm",
    );
  });

  it("uses the board-length and width formatters, never its own numbers", () => {
    const length = inchesToMm(74.25);
    const width = inchesToMm(20.375);
    expect(boardLine(length, width, "imperial")).toBe(
      `Length and width from TEMPLATE: ${formatLength(length, "imperial")} × ${formatDim(width, "imperial")}`,
    );
    expect(boardLine(length, width, "metric")).toBe(
      `Length and width from TEMPLATE: ${formatLength(length, "metric").replace(/ cm$/, "")} × ${formatDim(width, "metric")}`,
    );
  });
});
