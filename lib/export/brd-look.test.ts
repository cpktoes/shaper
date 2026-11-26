import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky.
vi.setConfig({ testTimeout: 60_000 });
import { buildBoardSurface } from "../geometry/board-surface";
import { bottomStationSlider } from "../geometry/blank-reasons";
import { BOTTOM_MARK_RANGES_IN, DEFAULT_BOTTOM, keepStationsInOrder, resolveBottom, resolveCut, startingCut, storeCutStation } from "../geometry/bottom";
import { BRD_BOTTOM_FLAT_MM } from "../geometry/brd-bottom";
import { designBottomBoard, designCrossSectionInput, designFinPlacement, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../geometry/design";
import { formatBottomDepth, formatMark } from "../geometry/measure-display";
import { inchesToMm, mm, mmToInches, UNITS_SYSTEMS } from "../geometry/units";
import { buildOutline } from "../geometry/outline";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { brdBoardFields } from "../models/brd-board";
import { brdBottomStations, brdText } from "./brd";
import { BRD_FIT_COPY, brdFitLook, brdFitSheet } from "./brd-fit-preview";
import { brdLookFromBytes } from "./brd-look";
import { BRD_READ_MAX_BYTES, readAnyBrd } from "./brd-read";

/**
 * The look in one call (quick 261113-kvo, Task 3), on the app's own Shortboard: written by the app's writer, so the right answer is
 * the look `brdFitLook` makes of the read board and the fields `brdBoardFields` makes of it.
 */
const fields = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
const text = (() => {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({ sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length), geometry, rockerAt: profile.rockerAt });
  return brdText(surface).text;
})();
const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0));

describe("brdLookFromBytes", () => {
  const result = brdLookFromBytes(bytes, "Short.brd");

  it("gives, for a readable file, the very look brdFitLook makes of the read board, and the fields it opens as", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const read = readAnyBrd(bytes);
    if (!read.ok) throw new Error("the app's own file would not read");
    const look = brdFitLook(read.board);
    expect(result.look).toEqual(look);
    expect(result.fields).toEqual(brdBoardFields(look.fit, "Short.brd", look.bottom?.bottom ?? null, look.rails?.rails ?? null));
    expect(result.fields?.boardName).toBe("Short");
    expect(result.fields?.rails).toEqual(look.rails!.rails);
  });

  it("crosses to the page by structured clone: the clone is deep-equal, so nothing in it is a function or a class instance", () => {
    expect(structuredClone(result)).toEqual(result);
    // and nothing but plain data survives a JSON round trip either (no function, no undefined-only key hiding a class)
    const plain = (value: unknown): boolean => {
      if (value === null || typeof value !== "object") return typeof value !== "function";
      if (Array.isArray(value)) return value.every(plain);
      return Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(plain);
    };
    expect(plain(result)).toBe(true);
  });

  it("says unreadable for empty bytes and for junk, and never throws", () => {
    expect(brdLookFromBytes(new Uint8Array(0), "x.brd")).toEqual({ ok: false, problem: "unreadable" });
    expect(brdLookFromBytes(Uint8Array.from("this is not a board file at all", (ch) => ch.charCodeAt(0)), "x.brd")).toEqual({ ok: false, problem: "unreadable" });
    expect(brdLookFromBytes(new Uint8Array([0xff, 0xfe, 0x00, 0x01]), "x.brd")).toEqual({ ok: false, problem: "unreadable" });
  });

  it("says too-big for a file over the reader's cap, before reading it", () => {
    expect(brdLookFromBytes(new Uint8Array(BRD_READ_MAX_BYTES + 1), "big.brd")).toEqual({ ok: false, problem: "too-big" });
  });

  it("says out-of-range, with the board's own length, for a board this app cannot make", () => {
    const longer = text.replace(/^p01 : .*$/m, "p01 : 400.0");
    expect(longer).not.toBe(text);
    const out = brdLookFromBytes(Uint8Array.from(longer, (ch) => ch.charCodeAt(0)), "long.brd");
    expect(out.ok).toBe(false);
    expect(out).toMatchObject({ ok: false, problem: "out-of-range" });
    expect((out as { length: number }).length).toBeCloseTo(4000, 6);
  });
});

describe("brdLookFromBytes on a file with fins (quick 261113-qyz)", () => {
  const twinText = text
    .split("\n")
    .flatMap((line) => (line.startsWith("p50 : ") ? ["p51 : Futures", "p50 : [24.13,13.208,35.814,12.7,0.0,0.0,0.0,0.0,5.4]"] : [line]))
    .join("\n");
  const result = brdLookFromBytes(Uint8Array.from(twinText, (ch) => ch.charCodeAt(0)), "Twin.brd");

  it("opens the fitted fins on FINS: a Modern/Upright twin on the Futures system", () => {
    if (!result.ok) throw new Error("the file would not read");
    expect(result.look.fins).not.toBeNull();
    expect(result.fields?.fins).toEqual(result.look.fins!.spec);
    expect(result.fields?.fins.finSetup).toBe("twin");
    expect(result.fields?.fins.twinTemplate).toBe("upright");
    expect(result.fields?.finSystem).toBe("futures");
  });

  it("survives structured clone with nothing lost", () => {
    expect(structuredClone(result)).toEqual(result);
  });

  it("a file with no fins opens a new board's fins and FCS II", () => {
    const plain = brdLookFromBytes(bytes, "Short.brd");
    if (!plain.ok) throw new Error("the file would not read");
    expect(plain.look.fins).toBeNull();
    expect(plain.fields?.finSystem).toBe("fcs2");
  });
});

/**
 * A Spiral Vee on its own opens as one (quick 261124-x9h, D-01, D-04): the app's own Mid-length with a Spiral Vee tail and no
 * centre cut, the vee started well ahead of the name's own Start, saved as a board file and opened again through the real
 * import. Before this task these opened with a centre Early Double Concave over the tail cut.
 */
describe("brdLookFromBytes on a board with a Spiral Vee tail and no centre cut (quick 261124-x9h)", () => {
  const mid = phase16Boards().find((b) => b.label === "midlength|asis|hard")!.fields;
  const spiralBytes = (sixteenths: number, aheadIn: number) => {
    const geometry = buildOutline(mid.outline);
    const profile = designSideProfile(mid, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(mid.rails, profile.effectiveFoil, mid.railsImportFoilThickness);
    const board = designBottomBoard(mid.outline, geometry, profile, designFinPlacement(mid));
    const base = { ...startingCut("tail", "Spiral Vee", board), depth: inchesToMm(sixteenths / 16) };
    // On BOTTOM's own Start slider: half inches from the nose.
    const slider = bottomStationSlider(mm(0), board.length, "imperial");
    const station = slider.toMm(Math.round(mmToInches(mm(board.length - (resolveCut("tail", base, board).start + inchesToMm(aheadIn)))) * 2) / 2);
    const tail = keepStationsInOrder("tail", { ...base, ...storeCutStation("tail", "start", station, board) }, "start", board, "narrowest");
    const bottom = { ...structuredClone(DEFAULT_BOTTOM), tail };
    const surface = buildBoardSurface({ sections: designCrossSectionInput(geometry, profile, rails, mid.outline.length, { bottom, board }), geometry, rockerAt: profile.rockerAt });
    return Uint8Array.from(brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, board)) }).text, (ch) => ch.charCodeAt(0));
  };

  it.each([
    ["1/8\" deep, started 26\" further up the board", 2, 26],
    ["3/16\" deep, started 26\" further up the board", 3, 26],
  ] as const)("a Spiral Vee %s opens as a Spiral Vee alone, within a millimetre of the file", (_name, sixteenths, ahead) => {
    const result = brdLookFromBytes(spiralBytes(sixteenths, ahead), "Spiral.brd");
    if (!result.ok) throw new Error("the file would not read");
    const fitted = result.look.bottom!;
    expect([fitted.bottom.nose.name, fitted.bottom.center.name, fitted.bottom.tail.name]).toEqual(["Flat Entry", "Flat Center", "Spiral Vee"]);
    expect(fitted.closeness.largest).toBeLessThan(BRD_BOTTOM_FLAT_MM);
    // The board it opens as carries that bottom: one tail cut, nothing in the centre.
    expect(result.fields?.bottom?.center.name).toBe("Flat Center");
    expect(result.fields?.bottom?.tail.name).toBe("Spiral Vee");
  });
});

/**
 * A nose concave with a Rail Roll comes back as one (quick 261125-mf8, D-05, D-08): the app's own Mid-length and Fish, each
 * with a Blended Nose Concave 3/16" deep and a 1/4" Rail Roll at the name's starting stations, saved as a board file and
 * opened again through the real import. Before this task they opened with no roll, over a millimetre off.
 */
describe("brdLookFromBytes on a board with a rolled nose concave (quick 261125-mf8)", () => {
  const rolledBytes = (label: string) => {
    const f = phase16Boards().find((b) => b.label === label)!.fields;
    const geometry = buildOutline(f.outline);
    const profile = designSideProfile(f, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(f.rails, profile.effectiveFoil, f.railsImportFoilThickness);
    const board = designBottomBoard(f.outline, geometry, profile, designFinPlacement(f));
    const nose = { ...startingCut("nose", "Blended Nose Concave", board), depth: inchesToMm(3 / 16), railRoll: inchesToMm(1 / 4) };
    const bottom = { ...structuredClone(DEFAULT_BOTTOM), nose };
    const surface = buildBoardSurface({ sections: designCrossSectionInput(geometry, profile, rails, f.outline.length, { bottom, board }), geometry, rockerAt: profile.rockerAt });
    return Uint8Array.from(brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, board)) }).text, (ch) => ch.charCodeAt(0));
  };

  it.each([
    ["the Mid-length", "midlength|asis|hard"],
    ["the Fish", "fish|asis|hard"],
  ] as const)("%s opens with a Blended Nose Concave and its Rail Roll, within a millimetre, and the preview names the roll", (_name, label) => {
    const result = brdLookFromBytes(rolledBytes(label), "Rolled.brd");
    if (!result.ok) throw new Error("the file would not read");
    const fitted = result.look.bottom!;
    const nose = fitted.bottom.nose;
    expect(nose.name).toBe("Blended Nose Concave");
    expect(nose.railRoll).toBeDefined();
    expect(nose.railRoll!).toBeGreaterThan(inchesToMm(1 / 8));
    expect(nose.railRoll!).toBeLessThanOrEqual(inchesToMm(BOTTOM_MARK_RANGES_IN.railRoll.max) + 1e-9);
    expect(fitted.closeness.largest).toBeLessThan(BRD_BOTTOM_FLAT_MM);
    // The board it opens as carries that very roll on its nose.
    expect(result.fields?.bottom?.nose.name).toBe("Blended Nose Concave");
    expect(result.fields?.bottom?.nose.railRoll).toBe(nose.railRoll);
    // The preview's Across cell for the nose: Off Rail's words, a middle dot, then the Rail Roll read as a depth.
    for (const system of UNITS_SYSTEMS) {
      const sheet = brdFitSheet(result.look, "Rolled.brd", system);
      if (!sheet.bottom.read) throw new Error("the bottom was not read");
      const across = sheet.bottom.rows.find((row) => row.key === "across")!.cells[0];
      expect(across).toBe(`${BRD_FIT_COPY.bottomSliderWords.offRail} ${formatMark(nose.offRail, system)} · ${BRD_FIT_COPY.bottomSliderWords.railRoll} ${formatBottomDepth(nose.railRoll!, system)}`);
    }
  });
});
