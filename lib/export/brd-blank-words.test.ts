import { describe, expect, it } from "vitest";
import { isPickable } from "../blanks/catalog";
import { readSeedCatalog, SEED_CSV_DIR } from "../blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "../fit-defaults-preference";
import { buildBoardSurface } from "../geometry/board-surface";
import { prepareBlank } from "../geometry/blank-fit";
import { brdFileStations, fitBoardToBrd } from "../geometry/brd-fit";
import { suggestBlanks, type BrdBlankSuggestion } from "../geometry/brd-blank-suggest";
import { formatRockerNote } from "../geometry/custom-rocker";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../geometry/design";
import { formatSignedMark, formatMarkOrLess } from "../geometry/measure-display";
import { buildOutline } from "../geometry/outline";
import { inchesToMm, mm } from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { brdText } from "./brd";
import { BRD_BLANK_COPY, brdBlankWords, type BrdBlankState } from "./brd-blank-words";
import { gapWhere, lessThan, type BrdFitLook } from "./brd-fit-preview";
import { readAnyBrd } from "./brd-read";

/**
 * The words of the suggested-blanks block (quick 261113-gwo), the same for the preview and the printed overview. The look is
 * the app's own Shortboard, written by the `.brd` writer, read back and fitted; the suggestions are the real ones for it.
 */

const MAKERS = ["US Blanks", "Arctic Foam", "Marko Foam", "Millennium Foam"];
const PREPARED = readSeedCatalog(SEED_CSV_DIR).filter(isPickable).map(prepareBlank);

function lookOf(label: string): BrdFitLook {
  const fields = phase16Boards().find((b) => b.label === label)!.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const read = readAnyBrd(Uint8Array.from(brdText(surface).text, (ch) => ch.charCodeAt(0)));
  if (!read.ok) throw new Error("the app's own file would not read");
  const b = read.board;
  return { board: b, fit: fitBoardToBrd({ length: b.length, outline: b.outline, bottom: b.bottom, deck: b.deck }) };
}

const look = lookOf("shortboard|asis|hard");
const real = suggestBlanks({
  fit: look.fit,
  bottom: look.board.bottom,
  prepared: PREPARED,
  makers: MAKERS,
  cut: { deckSkin: DEFAULT_FIT_DEFAULTS.deckSkin, tipStyle: DEFAULT_FIT_DEFAULTS.tipStyle },
  settings: toFitSettings(DEFAULT_FIT_DEFAULTS),
});
const ready = (suggestions: BrdBlankSuggestion[]): BrdBlankState => ({ status: "ready", suggestions });

/** The first real pick, given a made-up gap and a made-up Customize Rocker order. */
function withBends(): BrdBlankSuggestion[] {
  const [first, ...rest] = real;
  const pick = first.pick!;
  return [
    {
      vendor: first.vendor,
      pick: {
        ...pick,
        gap: { largest: mm(inchesToMm(3 / 8)), at: mm(inchesToMm(1)) },
        bends: {
          spec: {
            changes: [
              { end: "nose", amount: mm(-inchesToMm(1 / 4)), fromTip: inchesToMm(18) },
              { end: "tail", amount: inchesToMm(1 / 8) },
            ],
          },
          largest: mm(inchesToMm(1 / 8)),
          at: mm(inchesToMm(30)),
        },
      },
    },
    ...rest,
  ];
}

describe("brdBlankWords — ready", () => {
  const words = brdBlankWords(ready(real), look, "imperial");

  it("gives the caption, the intro and one block of lines per maker, in the makers' order", () => {
    expect(words.caption).toBe("SUGGESTED BLANKS");
    expect(words.caption).toBe(BRD_BLANK_COPY.caption);
    expect(words.intro).toBe(BRD_BLANK_COPY.intro);
    expect(words.lines).toHaveLength(4);
    MAKERS.forEach((vendor, i) => expect(words.lines[i][0].startsWith(`${vendor} `)).toBe(true));
  });

  it("writes the head line: the blank as the maker names it, how close it gets and where, and the four differences", () => {
    const first = real[0].pick!;
    const file = brdFileStations(look.board);
    const length = look.fit.outline.length;
    const diff = (key: "noseTip" | "nose12" | "tail12" | "tailTip") =>
      formatSignedMark(mm(first.lift[key] - file.find((st) => st.key === key)!.lift), "imperial");
    expect(words.lines[0][0]).toBe(
      `US Blanks ${first.record.name}: within ${lessThan(formatMarkOrLess(first.gap.largest, "imperial"))}, the widest gap ${gapWhere(first.gap.at, length, "imperial")}. ` +
        `Nose ${diff("noseTip")}, nose 12" ${diff("nose12")}, tail 12" ${diff("tail12")}, tail ${diff("tailTip")}.`,
    );
  });

  it("says a gap under 1/16\" as 'within less than 1/16\"'", () => {
    expect(real[0].pick!.gap.largest).toBeLessThan(inchesToMm(1 / 16));
    expect(words.lines[0][0]).toContain(': within less than 1/16",');
  });

  it("adds no Customize Rocker line where the pick has no order", () => {
    expect(real[0].pick!.bends).toBeNull();
    expect(words.lines[0]).toHaveLength(1);
  });

  it("adds the maker's order code, always in inches, and how close it then gets, where the pick has one", () => {
    const w = brdBlankWords(ready(withBends()), look, "imperial");
    expect(w.lines[0]).toHaveLength(2);
    expect(w.lines[0][1]).toBe(`Customize Rocker to ${formatRockerNote(withBends()[0].pick!.bends!.spec)}: within 1/8".`);
    expect(w.lines[0][1]).toContain('-1/4"N18" +1/8"T');
    expect(w.lines[0][0]).toContain(': within 3/8", the widest gap 1" from the tail.');
  });

  it("reads a maker with no blank this board fits in as one plain line, never a bad match", () => {
    const w = brdBlankWords(ready([{ vendor: "Marko Foam", pick: null }, ...real.slice(0, 1)]), look, "imperial");
    expect(w.lines[0]).toEqual(["Marko Foam: no blank this board fits in."]);
    expect(w.lines).toHaveLength(2);
  });
});

describe("brdBlankWords — Metric", () => {
  const w = brdBlankWords(ready(withBends()), look, "metric");

  it("reads marks in whole millimetres and where in centimetres", () => {
    expect(w.lines[0][0]).toContain(": within 10 mm, the widest gap 2.5 cm from the tail.");
    expect(w.lines[0][0]).toMatch(/Nose [+-]?\d+ mm, nose 30\.5 cm [+-]?\d+ mm, tail 30\.5 cm [+-]?\d+ mm, tail [+-]?\d+ mm\./);
    expect(w.lines[0][1]).toBe(`Customize Rocker to -1/4"N18" +1/8"T: within 3 mm.`);
  });

  it("keeps the blank's name and the order code exactly as in Imperial", () => {
    const imperial = brdBlankWords(ready(withBends()), look, "imperial");
    expect(w.lines[0][0].split(":")[0]).toBe(imperial.lines[0][0].split(":")[0]);
    expect(w.lines[0][1].split(": within")[0]).toBe(imperial.lines[0][1].split(": within")[0]);
  });
});

describe("brdBlankWords — loading and unavailable", () => {
  it("is one quiet line while the catalogue loads, with no intro", () => {
    expect(brdBlankWords({ status: "loading" }, look, "imperial")).toEqual({
      caption: "SUGGESTED BLANKS",
      intro: null,
      lines: [["Looking for blanks…"]],
    });
  });

  it("is one quiet line when the catalogue did not load, with no intro", () => {
    const w = brdBlankWords({ status: "unavailable" }, look, "imperial");
    expect(w.intro).toBeNull();
    expect(w.lines).toEqual([[BRD_BLANK_COPY.unavailable]]);
    expect(w.lines[0][0]).toContain("Pick one on ROCKER");
  });
});
