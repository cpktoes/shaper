import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { brdBottomStations, brdText } from "@/lib/export/brd";
import { readAnyBrd } from "@/lib/export/brd-read";
import { BRD_BLANK_COPY, brdBlankWords, type BrdBlankState } from "@/lib/export/brd-blank-words";
import { brdFitLook, brdFitSheet, type BrdFitLook } from "@/lib/export/brd-fit-preview";
import type { P2 } from "@/lib/geometry/bezier-fit";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog, SEED_CSV_DIR } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { suggestBlanks } from "@/lib/geometry/brd-blank-suggest";
import { buildBoardSurface } from "@/lib/geometry/board-surface";
import type { SectionHeight } from "@/lib/geometry/bottom-draw";
import { DEFAULT_BOTTOM, resolveBottom, startingCut } from "@/lib/geometry/bottom";
import { fitBoardToBrd } from "@/lib/geometry/brd-fit";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
} from "@/lib/geometry/design";
import { formatFeetInches, inchesToMm, mm, type UnitsSystem } from "@/lib/geometry/units";
import { buildOutline } from "@/lib/geometry/outline";
import { PAPER_MM } from "@/lib/geometry/template";
import { phase16Boards, phase16WingBoards } from "@/lib/geometry/__fixtures__/phase16-boards";
import {
  BRD_OVERVIEW_LAYOUT,
  BRD_OVERVIEW_PAGE,
  brdOverviewFileName,
  buildBrdOverviewPdf,
} from "./build-brd-overview-pdf";

/**
 * The one-page closest-fit overview (quick 261113-et0, E2). Looks are built the way the preview's own tests build them: the
 * app's own Shortboard and Midlength written by the app's `.brd` writer, read back and fitted, plus two made-up boards.
 */

function appLook(label: string): BrdFitLook {
  const fields = [...phase16Boards(), ...phase16WingBoards()].find((b) => b.label === label)!.fields;
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
  return brdFitLook(b);
}

function madeUp(lengthIn: number, widthIn: number): BrdFitLook {
  const L = inchesToMm(lengthIn);
  const half = inchesToMm(widthIn) / 2;
  const outline: P2[] = [[0, 0], [0, half * 0.5], [L * 0.2, half * 0.9], [L * 0.45, half], [L * 0.8, half * 0.75], [L, 0]];
  const bottom: P2[] = [[0, 60], [L * 0.1, 20], [L / 2, 0], [L * 0.9, 25], [L, 90]];
  const deck: P2[] = bottom.map(([x, y]): P2 => [x, y + (x === 0 || x === L ? 25 : 60)]);
  const board = { length: mm(L), width: mm(2 * half), thickness: mm(60), outline, bottom, deck, sections: [] };
  return { board, fit: fitBoardToBrd({ length: board.length, outline, bottom, deck }), bottom: null, planedBottom: bottom, rails: null };
}

const LOOKS: [string, BrdFitLook][] = [
  ["the Shortboard", appLook("shortboard|asis|hard")],
  ["the Midlength", appLook("midlength|asis|hard")],
  ["a made-up 5'0\" x 25\" board", madeUp(60, 25)],
  ["a made-up 10'0\" board", madeUp(120, 23)],
  ["the Shortboard with a wing", appLook("wing|shortboard|one")],
  ["the Shortboard with two wings", appLook("wing|shortboard|two")],
];

const pageCount = (doc: jsPDF) => doc.getNumberOfPages();

/**
 * A page of the PDF as text: what its content stream says. One page is the aim and two the most there are (quick 261113-gwr: the
 * BOTTOM block goes to a second page when it would squeeze the two views under 45 mm), each A4 wide by Letter tall.
 */
function expectOnePageOrTwo(doc: jsPDF) {
  expect(pageCount(doc)).toBeGreaterThanOrEqual(1);
  expect(pageCount(doc)).toBeLessThanOrEqual(2);
  for (let page = 1; page <= pageCount(doc); page++) {
    doc.setPage(page);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(BRD_OVERVIEW_PAGE.width, 6);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(BRD_OVERVIEW_PAGE.height, 6);
  }
}
const pageText = (doc: jsPDF, page: number): string => (doc.internal.pages as unknown as string[][])[page].join("\n");

/**
 * The longest SUGGESTED BLANKS block there can be: the Shortboard's real four picks (one per maker), each given a Customize
 * Rocker order with a start at either end and a gap that reads in whole figures, so every maker has two lines.
 */
function longestBlanks(): BrdBlankState {
  const [, look] = LOOKS[0];
  const real = suggestBlanks({
    fit: look.fit,
    bottom: look.planedBottom,
    prepared: readSeedCatalog(SEED_CSV_DIR).filter(isPickable).map(prepareBlank),
    makers: ["US Blanks", "Arctic Foam", "Marko Foam", "Millennium Foam"],
    cut: { deckSkin: DEFAULT_FIT_DEFAULTS.deckSkin, tipStyle: DEFAULT_FIT_DEFAULTS.tipStyle },
    settings: toFitSettings(DEFAULT_FIT_DEFAULTS),
  });
  return {
    status: "ready",
    suggestions: real.map(({ vendor, pick }) => ({
      vendor,
      pick: {
        ...pick!,
        gap: { largest: mm(inchesToMm(7 / 8)), at: mm(inchesToMm(111.5)) },
        bends: {
          spec: {
            changes: [
              { end: "nose", amount: mm(-inchesToMm(15 / 16)), fromTip: inchesToMm(18) },
              { end: "tail", amount: inchesToMm(7 / 16), fromTip: inchesToMm(36) },
            ],
          },
          largest: mm(inchesToMm(9 / 16)),
          at: mm(inchesToMm(30)),
        },
      },
    })),
  };
}
const LONGEST = longestBlanks();
const MAKER_NAMES = ["US Blanks", "Arctic Foam", "Marko Foam", "Millennium Foam"];

describe("BRD_OVERVIEW_PAGE", () => {
  it("is the smaller of Letter and A4 on each axis, so it fits either paper at 100%", () => {
    expect(BRD_OVERVIEW_PAGE).toEqual({
      width: Math.min(PAPER_MM.letter.width, PAPER_MM.a4.width),
      height: Math.min(PAPER_MM.letter.height, PAPER_MM.a4.height),
    });
    expect(BRD_OVERVIEW_PAGE.width).toBeCloseTo(210, 9);
    expect(BRD_OVERVIEW_PAGE.height).toBeCloseTo(279.4, 9);
  });
});

describe("buildBrdOverviewPdf", () => {
  describe.each(LOOKS)("for %s", (_name, look) => {
    for (const system of ["imperial", "metric"] as UnitsSystem[]) {
      for (const height of [1, 2, 4, 8] as SectionHeight[]) {
        it(`makes one page, or two when the BOTTOM block needs them, ${system} at Height x${height}, A4 wide by Letter tall`, () => {
          const sheet = brdFitSheet(look, "Test Board.brd", system);
          const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height });
          expectOnePageOrTwo(doc);
          // A file whose bottom could not be read prints the one line on the one page; one that was read prints its BOTTOM block.
          if (look.bottom === null) expect(pageCount(doc)).toBe(1);
          expect(doc.output()).toContain(look.bottom === null ? "couldn't be read" : "CROSS-SECTIONS");
          doc.setPage(1);
          expect(doc.internal.pageSize.getWidth()).toBeLessThanOrEqual(Math.min(PAPER_MM.letter.width, PAPER_MM.a4.width) + 1e-9);
          expect(doc.internal.pageSize.getHeight()).toBeLessThanOrEqual(Math.min(PAPER_MM.letter.height, PAPER_MM.a4.height) + 1e-9);
        });
      }
    }
  });

  describe.each(LOOKS)("with the longest SUGGESTED BLANKS block, for %s", (_name, look) => {
    for (const system of ["imperial", "metric"] as UnitsSystem[]) {
      for (const height of [1, 2, 4, 8] as SectionHeight[]) {
        it(`still makes at most two pages ${system} at Height x${height}, and prints the block and every maker`, () => {
          const sheet = brdFitSheet(look, "Test Board.brd", system);
          const blanks = brdBlankWords(LONGEST, look, system);
          expect(blanks.lines.every((lines) => lines.length === 2)).toBe(true);
          const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height, blanks });
          expectOnePageOrTwo(doc);
          const text = doc.output();
          expect(text).toContain(BRD_BLANK_COPY.caption);
          for (const maker of MAKER_NAMES) expect(text).toContain(maker);
          expect(text).toContain("Customize Rocker to");
        });
      }
    }
  });

  it("leaves the page exactly as it was when the block is absent, null or still loading", () => {
    const [, look] = LOOKS[0];
    const sheet = brdFitSheet(look, "Test Board.brd", "imperial");
    // The PDF stamps its own creation time and id; everything else is what is drawn and written.
    const content = (doc: jsPDF) => doc.output().replace(/\/CreationDate \(D:[^)]*\)/, "").replace(/\/ID \[[^\]]*\]/, "");
    const plain = content(buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height: 2 }));
    expect(plain).not.toContain(BRD_BLANK_COPY.caption);
    expect(content(buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height: 2, blanks: null }))).toBe(plain);
    const loading = brdBlankWords({ status: "loading" }, look, "imperial");
    expect(content(buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height: 2, blanks: loading }))).toBe(plain);
  });

  it("still makes at most two pages when both tips come to a point (two extra note lines) beside the longest block, at Height x8", () => {
    const base = madeUp(84, 21).board;
    const L = base.length;
    const bottom: P2[] = [[0, 50], [6.35, 40], [L / 2, 0], [L - 6.35, 40], [L, 60]];
    const deck: P2[] = [[0, 50], [6.35, 80], [L / 2, 60], [L - 6.35, 90], [L, 60]];
    const board = { ...base, bottom, deck };
    const look = { board, fit: fitBoardToBrd({ length: board.length, outline: board.outline, bottom, deck }), bottom: null, planedBottom: bottom, rails: null };
    for (const system of ["imperial", "metric"] as UnitsSystem[]) {
      const sheet = brdFitSheet(look, "Egg.brd", system);
      expect(sheet.pointNotes).toHaveLength(2);
      const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Egg.brd", height: 8, blanks: brdBlankWords(LONGEST, look, system) });
      expectOnePageOrTwo(doc);
    }
  });

  it("prints the one quiet line when the catalogue did not load", () => {
    const [, look] = LOOKS[0];
    const sheet = brdFitSheet(look, "Test Board.brd", "imperial");
    const blanks = brdBlankWords({ status: "unavailable" }, look, "imperial");
    const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height: 2, blanks });
    expectOnePageOrTwo(doc);
    expect(doc.output()).toContain(BRD_BLANK_COPY.caption);
    expect(doc.output()).toContain("Pick one on ROCKER");
  });

  it("holds the title, the file's name and size, and the table labels", () => {
    const [, look] = LOOKS[0];
    const sheet = brdFitSheet(look, "Test Board.brd", "imperial");
    const text = buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height: 2 }).output();
    expect(text).toContain("Board file");
    expect(text).toContain("Test Board.brd");
    expect(text).toContain("Nose tip");
    expect(text).toContain("Our fit");
    expect(text).toContain("The file");
    expect(text).toContain(formatFeetInches(look.board.length));
    expect(text).toContain("WIDTHS");
  });

  it("keeps every table cell inside its column at the table font", () => {
    const doc = new jsPDF({ unit: "mm", format: [BRD_OVERVIEW_PAGE.width, BRD_OVERVIEW_PAGE.height] });
    const { table } = BRD_OVERVIEW_LAYOUT.fonts;
    const column = (BRD_OVERVIEW_LAYOUT.contentWidth - BRD_OVERVIEW_LAYOUT.labelColumn) / 5;
    for (const [, look] of LOOKS) {
      for (const system of ["imperial", "metric"] as UnitsSystem[]) {
        const sheet = brdFitSheet(look, "x.brd", system);
        for (const t of sheet.tables) {
          for (const row of t.rows) {
            for (const [style, cell] of [["bold", row.label], ["normal", row.file], ["normal", row.fit]] as const) {
              doc.setFont("helvetica", style);
              doc.setFontSize(table);
              expect(doc.getTextWidth(cell)).toBeLessThan(column - 1);
            }
          }
        }
      }
    }
  });

  it("survives a 200-letter file name, even one with no spaces to wrap at, and still makes at most two pages", () => {
    const [, look] = LOOKS[0];
    for (const name of ["x".repeat(196) + ".brd", `${"Board ".repeat(33)}.brd`]) {
      const sheet = brdFitSheet(look, name, "imperial");
      const doc = buildBrdOverviewPdf({ look, sheet, fileName: name, height: 2 });
      expectOnePageOrTwo(doc);
    }
  });

  it("does not choke on letters a printer's standard font has no shape for", () => {
    const [, look] = LOOKS[0];
    const name = "板 Surf Ünïcode ’quote’.brd";
    const doc = buildBrdOverviewPdf({ look, sheet: brdFitSheet(look, name, "imperial"), fileName: name, height: 1 });
    expectOnePageOrTwo(doc);
  });

  it("mentions a point's own figures when a tip comes to a point", () => {
    const base = madeUp(84, 21).board;
    const L = base.length;
    const bottom: P2[] = [[0, 50], [L / 2, 0], [L - 6.35, 40], [L, 60]];
    const deck: P2[] = [[0, 80], [L / 2, 60], [L - 6.35, 90], [L, 60]];
    const board = { ...base, bottom, deck };
    const look = { board, fit: fitBoardToBrd({ length: board.length, outline: board.outline, bottom, deck }), bottom: null, planedBottom: bottom, rails: null };
    const sheet = brdFitSheet(look, "Egg.brd", "imperial");
    expect(sheet.pointNotes).toHaveLength(1);
    expect(buildBrdOverviewPdf({ look, sheet, fileName: "Egg.brd", height: 2 }).output()).toContain("comes to a point");
  });
});

/** A Shortboard with a 1/4" Deep Single Concave and a 3/16" Panel Vee, written by the app's writer and read back: a concave file. */
function concaveLook(): BrdFitLook {
  const fields = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board0 = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom = {
    ...structuredClone(DEFAULT_BOTTOM),
    center: { ...startingCut("center", "Deep Single Concave", board0), depth: inchesToMm(4 / 16) },
    tail: { ...startingCut("tail", "Panel Vee", board0), depth: inchesToMm(3 / 16) },
  };
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board: board0 }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const read = readAnyBrd(Uint8Array.from(brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, board0)) }).text, (ch) => ch.charCodeAt(0)));
  if (!read.ok) throw new Error("the app's own file would not read");
  return brdFitLook(read.board);
}

describe("the BOTTOM block on paper (quick 261113-gwr)", () => {
  const concave = concaveLook();

  it("prints its caption, the cross-sections' caption at the pick, the fitted names and the table's words, in both systems", () => {
    for (const system of ["imperial", "metric"] as UnitsSystem[]) {
      const sheet = brdFitSheet(concave, "Concave.brd", system);
      expect(sheet.bottom.read).toBe(true);
      const text = buildBrdOverviewPdf({ look: concave, sheet, fileName: "Concave.brd", height: 2, sectionHeight: 4 }).output();
      expect(text).toContain("(BOTTOM)");
      expect(text).toContain("CROSS-SECTIONS");
      expect(text).toContain("HEIGHT");
      expect(text).toContain("Deep Single Concave");
      // The tail cut the look itself fitted: on the tail rail's new default blend (quick 261113-psx) the app's own
      // Panel Vee reads back as a Rolled Vee (their known swap), so the page is held to what the look found, not to
      // the name the board was written with.
      expect(text).toContain(concave.bottom!.bottom.tail.name);
      expect(text).toContain("Start");
      // How close the bottom fits reads "within 1/16"" or, when it is closer than the smallest step, "less than 1/16"
      // off" (`closenessSentence`): on the new default blend the fit finds the bottom closer than it used to, so either.
      expect(text).toMatch(/Bottom: (within|less than)/);
      expect(text).toContain("Bottom: ");
      expect(text).toContain(sheet.rockerLines.split(" ")[0]);
      if (sheet.stringerNote) expect(text).toContain("lift its stringer");
    }
  });

  it("says, for a concave, that the rocker it prints is the finished stringer's", () => {
    const sheet = brdFitSheet(concave, "Concave.brd", "imperial");
    expect(sheet.stringerNote).not.toBeNull();
    const doc = buildBrdOverviewPdf({ look: concave, sheet, fileName: "Concave.brd", height: 1, sectionHeight: 4 });
    expect(doc.output()).toContain("lift its stringer");
  });

  it("makes the BOTTOM block the whole of the second page when it would squeeze the two views under the least, and never more than two pages", () => {
    for (const system of ["imperial", "metric"] as UnitsSystem[]) {
      for (const height of [1, 2, 4, 8] as SectionHeight[]) {
        const sheet = brdFitSheet(concave, "Concave.brd", system);
        const doc = buildBrdOverviewPdf({ look: concave, sheet, fileName: "Concave.brd", height, sectionHeight: 4 });
        expectOnePageOrTwo(doc);
        const second = pageCount(doc) === 2;
        expect(pageText(doc, 1).includes("(BOTTOM)")).toBe(!second);
        if (second) {
          expect(pageText(doc, 2)).toContain("(BOTTOM)");
          expect(pageText(doc, 2)).toContain("CROSS-SECTIONS");
          expect(pageText(doc, 1)).not.toContain("CROSS-SECTIONS");
        }
      }
    }
  });

  it("keeps the BOTTOM block on the one page while the two views keep at least the least room, and takes it to page 2 when they would not", () => {
    const sheet = brdFitSheet(concave, "C.brd", "imperial");
    // The same sheet with the words that take most room taken out: the block now fits beside the views.
    const lean = {
      ...sheet,
      tipsNote: "-",
      rockerLines: "-",
      stringerNote: null,
      rockerUse: "-",
      bottom: sheet.bottom.read ? { ...sheet.bottom, notes: ["-"] } : sheet.bottom,
      // The RAILS block rides with BOTTOM (quick 261113-kvo), so it too is cut down to its one line here.
      rails: { read: false as const, caption: sheet.rails.caption, line: "-" },
      closeness: { ...sheet.closeness, rails: null, bottom: null },
      controls: { ...sheet.controls, rails: null, bottom: null },
    };
    const one = buildBrdOverviewPdf({ look: concave, sheet: lean, fileName: "C.brd", height: 1, sectionHeight: 4 });
    expect(pageCount(one)).toBe(1);
    expect(pageText(one, 1)).toContain("(BOTTOM)");
    expect(pageText(one, 1)).toContain("CROSS-SECTIONS");
    const full = buildBrdOverviewPdf({ look: concave, sheet, fileName: "C.brd", height: 1, sectionHeight: 4 });
    expect(pageCount(full)).toBe(2);
    expect(pageText(full, 1)).not.toContain("(BOTTOM)");
    expect(pageText(full, 2)).toContain("(BOTTOM)");
    expect(BRD_OVERVIEW_LAYOUT.minViewsWithBottom).toBe(45);
    expect(BRD_OVERVIEW_LAYOUT.minViewsWithBottom).toBeGreaterThan(BRD_OVERVIEW_LAYOUT.minDrawingHeight);
  });

  it("takes the SUGGESTED BLANKS to the second page too, ahead of the BOTTOM block, when the page would otherwise leave the views no room; beyond that it refuses", () => {
    const sheet = brdFitSheet(concave, "Concave.brd", "metric");
    const blanks = brdBlankWords(LONGEST, concave, "metric");
    const note = (i: number) => `${i + 1}. ${"A long note about a tip that comes to a point. ".repeat(4)}`;
    const build = (notes: number) =>
      buildBrdOverviewPdf({ look: concave, sheet: { ...sheet, pointNotes: Array.from({ length: notes }, (_, i) => note(i)) }, fileName: "Concave.brd", height: 1, sectionHeight: 4, blanks });
    // More and more words on page 1: the BOTTOM block (and the RAILS block that rides with it) goes over, then the blanks go with it,
    // then the page is refused. With the RAILS block's two extra lines on page 1 (its HOW CLOSE and its control line) the blanks go
    // over from the start on this longest case, so the middle stage is gone.
    const stages: string[] = [];
    for (let notes = 0; notes < 30; notes++) {
      let stage: string;
      try {
        const doc = build(notes);
        stage = pageCount(doc) === 1 ? "one page" : pageText(doc, 1).includes("(SUGGESTED BLANKS)") ? "bottom on page 2" : "blanks and bottom on page 2";
        if (stage === "blanks and bottom on page 2") {
          expect(pageText(doc, 2)).toContain("(SUGGESTED BLANKS)");
          expect(pageText(doc, 2)).toContain("(BOTTOM)");
          expect(pageText(doc, 2).indexOf("(SUGGESTED BLANKS)")).toBeLessThan(pageText(doc, 2).indexOf("(BOTTOM)"));
        }
      } catch (error) {
        expect((error as Error).message).toMatch(/no room/);
        stage = "refused";
      }
      if (stages[stages.length - 1] !== stage) stages.push(stage);
    }
    expect(stages).toEqual(["blanks and bottom on page 2", "refused"]);
  });

  it("prints the unread line on the one page when the file's bottom could not be read, never a page of its own", () => {
    const [, look] = LOOKS[2];
    expect(look.bottom).toBeNull();
    const sheet = brdFitSheet(look, "No Sections.brd", "imperial");
    const doc = buildBrdOverviewPdf({ look, sheet, fileName: "No Sections.brd", height: 2 });
    expect(pageCount(doc)).toBe(1);
    expect(doc.output()).toContain("couldn't be read");
    expect(doc.output()).toContain("Rails and bottom contours");
  });

  it("changes with the section Height pick", () => {
    const sheet = brdFitSheet(concave, "Concave.brd", "imperial");
    const at = (sectionHeight: SectionHeight) => buildBrdOverviewPdf({ look: concave, sheet, fileName: "C.brd", height: 1, sectionHeight }).output();
    expect(at(1)).toContain("TRUE HEIGHT");
    expect(at(8)).toContain("HEIGHT");
    expect(at(1)).not.toBe(at(8));
  });
});

describe("the RAILS block on paper (quick 261113-kvo)", () => {
  const concave = concaveLook();
  const looks: [string, BrdFitLook][] = [
    ["the flat Shortboard", LOOKS[0][1]],
    ["the Midlength", LOOKS[1][1]],
    ["the concave Shortboard", concave],
  ];

  it("prints its caption, the cross-sections, the table's words in RAILS' own words, the closeness line and the control line", () => {
    for (const [, look] of looks) {
      for (const system of ["imperial", "metric"] as UnitsSystem[]) {
        const sheet = brdFitSheet(look, "Rails.brd", system);
        const text = buildBrdOverviewPdf({ look, sheet, fileName: "Rails.brd", height: 2, sectionHeight: 4 }).output();
        expect(text).toContain("(RAILS)");
        expect(text).toContain("TRUE HEIGHT");
        expect(text).toContain("Deck Profile");
        expect(text).toContain("Family");
        expect(text).toContain("Rails: within");
        expect(text).toContain("Rails: Nose");
        expect(text).toContain("Fins aren't read");
        expect(text).not.toContain("Rails aren't read");
      }
    }
  });

  it("rides with the BOTTOM block, after it, on whichever page carries it, and is one or two pages at every Height in both systems", () => {
    for (const [, look] of looks) {
      for (const system of ["imperial", "metric"] as UnitsSystem[]) {
        for (const height of [1, 2, 4, 8] as SectionHeight[]) {
          const sheet = brdFitSheet(look, "Rails.brd", system);
          const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Rails.brd", height, sectionHeight: 4 });
          expectOnePageOrTwo(doc);
          for (let page = 1; page <= pageCount(doc); page++) {
            const text = pageText(doc, page);
            expect(text.includes("(BOTTOM)")).toBe(text.includes("(RAILS)"));
            if (text.includes("(RAILS)")) expect(text.indexOf("(BOTTOM)")).toBeLessThan(text.indexOf("(RAILS)"));
          }
        }
      }
    }
  });

  it("keeps every baseline inside its own page", () => {
    for (const [, look] of looks) {
      const sheet = brdFitSheet(look, "Rails.brd", "metric");
      expect(() => buildBrdOverviewPdf({ look, sheet, fileName: "Rails.brd", height: 8, sectionHeight: 8 })).not.toThrow();
    }
  });

  it("gives the RAILS block a page of its own only when the second page cannot hold it beside BOTTOM", () => {
    const sheet = brdFitSheet(concave, "Concave.brd", "imperial");
    const block = sheet.rails;
    if (!block.read) throw new Error("unreachable");
    const note = (i: number) => `${i + 1}. ${"A long note about the rails, so that the page runs out of room. ".repeat(3)}`;
    // More and more notes under RAILS: page 2 holds it beside BOTTOM at first, then RAILS goes to a page of its own.
    const build = (notes: number) =>
      buildBrdOverviewPdf({
        look: concave,
        sheet: { ...sheet, rails: { ...block, notes: [...block.notes, ...Array.from({ length: notes }, (_, i) => note(i))] } },
        fileName: "Concave.brd",
        height: 1,
        sectionHeight: 4,
      });
    expect(pageCount(build(0))).toBe(2);
    const tries = [10, 14, 18, 22, 26, 30];
    // (A sheet so crowded that even a page of its own cannot hold RAILS is refused, as ever: counted as 0.)
    const counts = tries.map((notes) => {
      try {
        return pageCount(build(notes));
      } catch {
        return 0;
      }
    });
    expect(counts).toContain(3);
    const doc = build(tries[counts.indexOf(3)]);
    expect(pageText(doc, 2)).toContain("(BOTTOM)");
    expect(pageText(doc, 2)).not.toContain("(RAILS)");
    expect(pageText(doc, 3)).toContain("(RAILS)");
    expect(pageText(doc, 3)).not.toContain("(BOTTOM)");
  });

  it("prints the one unread line for a file whose rails could not be read", () => {
    const [, look] = LOOKS[2];
    const sheet = brdFitSheet(look, "No Sections.brd", "imperial");
    expect(sheet.rails.read).toBe(false);
    const doc = buildBrdOverviewPdf({ look, sheet, fileName: "No Sections.brd", height: 2 });
    expect(pageCount(doc)).toBe(1);
    expect(doc.output()).toContain("rails couldn't be read");
  });
});

describe("the wing lines on paper (quick 261113-hyy)", () => {
  const winged = LOOKS.find(([name]) => name === "the Shortboard with two wings")![1];
  const one = LOOKS.find(([name]) => name === "the Shortboard with a wing")![1];
  const plain = LOOKS[0][1];

  it("prints one line per wing, the file's beside ours, under HOW CLOSE, and never more than two pages, in both systems at every Height", () => {
    for (const system of ["imperial", "metric"] as UnitsSystem[]) {
      for (const height of [1, 2, 4, 8] as SectionHeight[]) {
        for (const [look, lines] of [[one, 1], [winged, 2]] as const) {
          const sheet = brdFitSheet(look, "Winged.brd", system);
          expect(sheet.wings).toHaveLength(lines);
          const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Winged.brd", height });
          expectOnePageOrTwo(doc);
          const text = doc.output();
          for (let k = 1; k <= lines; k++) expect(text).toContain(`Wing ${k}`);
          expect(text).not.toContain(`Wing ${lines + 1}`);
          expect(text).toContain("sharp corners");
        }
      }
    }
  });

  it("prints no wing line for a file with no wing, and no word of wings in the not-read line", () => {
    const sheet = brdFitSheet(plain, "Plain.brd", "imperial");
    expect(sheet.wings).toEqual([]);
    expect(buildBrdOverviewPdf({ look: plain, sheet, fileName: "Plain.brd", height: 4 }).output()).not.toContain("Wing 1");
    expect(sheet.notRead).not.toMatch(/wing|flyer/i);
  });
});

describe("brdOverviewFileName", () => {
  it("slugs the file's name and says what the sheet is", () => {
    expect(brdOverviewFileName("6'10-Widepoint-Fwd-Egg.brd")).toBe("6-10-widepoint-fwd-egg-closest-fit.pdf");
    expect(brdOverviewFileName("Scoop Noserider.BRD")).toBe("scoop-noserider-closest-fit.pdf");
  });

  it("falls back for a name with no letters or digits", () => {
    expect(brdOverviewFileName("板板.brd")).toBe("board-file-closest-fit.pdf");
    expect(brdOverviewFileName("")).toBe("board-file-closest-fit.pdf");
  });
});
