import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { brdText } from "@/lib/export/brd";
import { readAnyBrd } from "@/lib/export/brd-read";
import { brdFitSheet, type BrdFitLook } from "@/lib/export/brd-fit-preview";
import type { P2 } from "@/lib/geometry/bezier-fit";
import { buildBoardSurface } from "@/lib/geometry/board-surface";
import type { SectionHeight } from "@/lib/geometry/bottom-draw";
import { fitBoardToBrd } from "@/lib/geometry/brd-fit";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "@/lib/geometry/design";
import { formatFeetInches, inchesToMm, mm, type UnitsSystem } from "@/lib/geometry/units";
import { buildOutline } from "@/lib/geometry/outline";
import { PAPER_MM } from "@/lib/geometry/template";
import { phase16Boards } from "@/lib/geometry/__fixtures__/phase16-boards";
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

function madeUp(lengthIn: number, widthIn: number): BrdFitLook {
  const L = inchesToMm(lengthIn);
  const half = inchesToMm(widthIn) / 2;
  const outline: P2[] = [[0, 0], [0, half * 0.5], [L * 0.2, half * 0.9], [L * 0.45, half], [L * 0.8, half * 0.75], [L, 0]];
  const bottom: P2[] = [[0, 60], [L * 0.1, 20], [L / 2, 0], [L * 0.9, 25], [L, 90]];
  const deck: P2[] = bottom.map(([x, y]): P2 => [x, y + (x === 0 || x === L ? 25 : 60)]);
  const board = { length: mm(L), width: mm(2 * half), thickness: mm(60), outline, bottom, deck };
  return { board, fit: fitBoardToBrd({ length: board.length, outline, bottom, deck }) };
}

const LOOKS: [string, BrdFitLook][] = [
  ["the Shortboard", appLook("shortboard|asis|hard")],
  ["the Midlength", appLook("midlength|asis|hard")],
  ["a made-up 5'0\" x 25\" board", madeUp(60, 25)],
  ["a made-up 10'0\" board", madeUp(120, 23)],
];

const pageCount = (doc: jsPDF) => doc.getNumberOfPages();

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
        it(`makes one page ${system} at Height x${height}, A4 wide by Letter tall`, () => {
          const sheet = brdFitSheet(look, "Test Board.brd", system);
          const doc = buildBrdOverviewPdf({ look, sheet, fileName: "Test Board.brd", height });
          expect(pageCount(doc)).toBe(1);
          expect(doc.internal.pageSize.getWidth()).toBeCloseTo(BRD_OVERVIEW_PAGE.width, 6);
          expect(doc.internal.pageSize.getHeight()).toBeCloseTo(BRD_OVERVIEW_PAGE.height, 6);
          expect(doc.internal.pageSize.getWidth()).toBeLessThanOrEqual(Math.min(PAPER_MM.letter.width, PAPER_MM.a4.width) + 1e-9);
          expect(doc.internal.pageSize.getHeight()).toBeLessThanOrEqual(Math.min(PAPER_MM.letter.height, PAPER_MM.a4.height) + 1e-9);
        });
      }
    }
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

  it("survives a 200-letter file name, even one with no spaces to wrap at, and still makes one page", () => {
    const [, look] = LOOKS[0];
    for (const name of ["x".repeat(196) + ".brd", `${"Board ".repeat(33)}.brd`]) {
      const sheet = brdFitSheet(look, name, "imperial");
      const doc = buildBrdOverviewPdf({ look, sheet, fileName: name, height: 2 });
      expect(pageCount(doc)).toBe(1);
    }
  });

  it("does not choke on letters a printer's standard font has no shape for", () => {
    const [, look] = LOOKS[0];
    const name = "板 Surf Ünïcode ’quote’.brd";
    const doc = buildBrdOverviewPdf({ look, sheet: brdFitSheet(look, name, "imperial"), fileName: name, height: 1 });
    expect(pageCount(doc)).toBe(1);
  });

  it("mentions a point's own figures when a tip comes to a point", () => {
    const base = madeUp(84, 21).board;
    const L = base.length;
    const bottom: P2[] = [[0, 50], [L / 2, 0], [L - 6.35, 40], [L, 60]];
    const deck: P2[] = [[0, 80], [L / 2, 60], [L - 6.35, 90], [L, 60]];
    const board = { ...base, bottom, deck };
    const look = { board, fit: fitBoardToBrd({ length: board.length, outline: board.outline, bottom, deck }) };
    const sheet = brdFitSheet(look, "Egg.brd", "imperial");
    expect(sheet.pointNotes).toHaveLength(1);
    expect(buildBrdOverviewPdf({ look, sheet, fileName: "Egg.brd", height: 2 }).output()).toContain("comes to a point");
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
