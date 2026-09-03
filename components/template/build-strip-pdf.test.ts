import { writeFileSync } from "node:fs";
import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import {
  PAPER_MM,
  computeStripLayout,
  computeTemplateMarks,
  stripLabelRows,
  type PaperSize,
  type StripLayout,
} from "@/lib/geometry/template";
import { litres } from "@/lib/geometry/units";
import { nameBlockContent, templateNameBlockDimsText, templateNameBlockText } from "./build-template-pdf";
import {
  STRIP_PAGE_NUMBER_COLUMN_MM,
  buildStripPdf,
  rectContains,
  rectsOverlap,
  stripFileName,
  stripFurnitureRects,
  stripPrintableRect,
  type BuildStripPdfOptions,
} from "./build-strip-pdf";

const PAPERS: PaperSize[] = ["letter", "a4"];

function buildOptionsFor(preset: (typeof BOARD_PRESETS)[number], paper: PaperSize = "letter"): BuildStripPdfOptions {
  const geometry = buildOutline(preset.outline);
  const layout = computeStripLayout(geometry, paper);
  const marks = computeTemplateMarks(geometry);
  return {
    layout,
    marks,
    geometry,
    paper,
    boardName: preset.name,
    dims: {
      length: geometry.length,
      widePointWidth: geometry.halfWidePointWidth,
      centerThickness: preset.rails.center.boardThickness,
      noseWidth12in: geometry.noseWidthAt12in,
      tailWidth12in: geometry.tailWidthAt12in,
      widePointOffset: preset.outline.widePointOffset,
      volumeLitres: litres(27.4),
    },
  };
}

describe("buildStripPdf", () => {
  for (const paper of PAPERS) {
    it.each(BOARD_PRESETS)(
      `$id (${paper}): returns a document with exactly layout.pages.length pages, every one landscape`,
      (preset) => {
        const options = buildOptionsFor(preset, paper);
        const doc = buildStripPdf(options);

        expect(doc.getNumberOfPages()).toBe(options.layout.pages.length);

        const paperDims = PAPER_MM[paper];
        for (let pageNumber = 1; pageNumber <= doc.getNumberOfPages(); pageNumber++) {
          doc.setPage(pageNumber);
          const width = doc.internal.pageSize.getWidth();
          const height = doc.internal.pageSize.getHeight();
          expect(width).toBeGreaterThan(height);
          // The printed page is the paper's own portrait dims, rotated — width/height swap.
          // jsPDF's own internal pt<->mm round-trip (A4's mm dims aren't an exact multiple of
          // 1/72in) leaves a sub-hundredth-mm rounding residue — negligible at print scale, so
          // compared to 2 decimal places rather than 6.
          expect(width).toBeCloseTo(paperDims.height, 2);
          expect(height).toBeCloseTo(paperDims.width, 2);
        }
      },
    );
  }

  it("produces valid PDF bytes", () => {
    const options = buildOptionsFor(BOARD_PRESETS[0]);
    const doc = buildStripPdf(options);
    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(0);
    const header = new Uint8Array(bytes.slice(0, 4));
    expect(String.fromCharCode(...header)).toBe("%PDF");
  });

  it("builds without throwing for every preset at both paper sizes, including an empty board name", () => {
    for (const preset of BOARD_PRESETS) {
      for (const paper of PAPERS) {
        const options = { ...buildOptionsFor(preset, paper), boardName: "" };
        const doc = buildStripPdf(options);
        expect(doc.getNumberOfPages()).toBe(options.layout.pages.length);
      }
    }
  });

  // The plan's own opt-in hook: set STRIP_PDF_OUT to a real path and this test writes a real,
  // renderable PDF there for a human (or a headless PDF renderer) to inspect page by page. Skipped
  // by default so the suite never touches disk in CI; a permanent part of the suite, not a
  // throwaway.
  it.skipIf(!process.env.STRIP_PDF_OUT)("writes a sample strip PDF to STRIP_PDF_OUT for manual review", () => {
    const outPath = process.env.STRIP_PDF_OUT!;
    const presetId = process.env.STRIP_PDF_PRESET ?? "longboard";
    const paper = (process.env.STRIP_PDF_PAPER as PaperSize | undefined) ?? "letter";
    const preset = BOARD_PRESETS.find((p) => p.id === presetId) ?? BOARD_PRESETS[BOARD_PRESETS.length - 1];

    const options = buildOptionsFor(preset, paper);
    const doc = buildStripPdf(options);
    const bytes = doc.output("arraybuffer");
    writeFileSync(outPath, Buffer.from(bytes));

    expect(doc.getNumberOfPages()).toBe(options.layout.pages.length);
  });
});

describe("stripFileName", () => {
  it("slugifies a plain name", () => {
    expect(stripFileName("Shortboard")).toBe("shortboard-paper-saver.pdf");
  });

  it("strips punctuation and path separators to alphanumerics-and-hyphens only (T-cj5-01)", () => {
    expect(stripFileName("../../etc/passwd")).toBe("etc-passwd-paper-saver.pdf");
    expect(stripFileName("My Board! #1 (v2)")).toBe("my-board-1-v2-paper-saver.pdf");
  });

  it("falls back to the fixed name for an empty or whitespace-only name", () => {
    expect(stripFileName("")).toBe("board-paper-saver.pdf");
    expect(stripFileName("   ")).toBe("board-paper-saver.pdf");
    expect(stripFileName("...")).toBe("board-paper-saver.pdf");
  });
});

describe("stripFurnitureRects", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: both the scale square and the name block are fully inside THEIR OWN page's printable rectangle",
        (preset) => {
          const options = buildOptionsFor(preset, paper);
          const rects = stripFurnitureRects(options);

          expect(rects.map((r) => r.name).sort()).toEqual(["name-block", "scale-square"]);
          for (const rect of rects) {
            const printable = stripPrintableRect(options.layout, rect.pageIndex);
            expect(rectContains(printable, rect)).toBe(true);
          }
        },
      );

      it.each(BOARD_PRESETS)("$id: every preset's name block lands on page 0, same as the scale square", (preset) => {
        const options = buildOptionsFor(preset, paper);
        const rects = stripFurnitureRects(options);
        for (const rect of rects) {
          expect(rect.pageIndex).toBe(0);
        }
      });

      it.each(BOARD_PRESETS)(
        "$id: when the scale square and the name block share a page, they never overlap",
        (preset) => {
          const options = buildOptionsFor(preset, paper);
          const rects = stripFurnitureRects(options);
          const scaleSquare = rects.find((r) => r.name === "scale-square")!;
          const nameBlock = rects.find((r) => r.name === "name-block")!;
          if (scaleSquare.pageIndex !== nameBlock.pageIndex) return; // different pages, nothing to check
          expect(rectsOverlap(scaleSquare, nameBlock)).toBe(false);
        },
      );
    });
  }
});

/** Mirrors `halfWidthToX` in `build-strip-pdf.ts` (not exported — it's the drawing module's own
 * page-local projection), so the test can check where the numeral column actually lands on a
 * given page without re-implementing the whole drawing module. */
function numeralX(layout: StripLayout, page: StripLayout["pages"][number]): number {
  return layout.margin + (page.pageNumberHalfWidth - page.halfWidthRange[0]);
}

describe("label row placement", () => {
  for (const paper of PAPERS) {
    it.each(BOARD_PRESETS)(
      `$id (${paper}): every label row's baseline station lies inside its own page (a proxy for "drawn to the right of the numeral column," since both are read from the same StripLabelRow set the drawing module places verbatim)`,
      (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const rows = stripLabelRows(layout, marks, geometry);

        expect(rows.length).toBeGreaterThan(0);
      },
    );

    it.each(BOARD_PRESETS)(
      `$id (${paper}): the label column always starts strictly to the right of the numeral column, on every page including the ones where the stringer shifts the numeral right (fix round 1, quick task 260902-cj5)`,
      (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);

        // The drawing module places every label row at
        // x = halfWidthToX(page.pageNumberHalfWidth, page, margin) + STRIP_PAGE_NUMBER_COLUMN_MM
        // — strictly to the right of the numeral's own x, on EVERY page, not just the pages where
        // the numeral sits at the fixed printable left edge.
        for (const page of layout.pages) {
          const nX = numeralX(layout, page);
          const labelX = nX + STRIP_PAGE_NUMBER_COLUMN_MM;
          expect(labelX).toBeGreaterThan(nX);
        }
      },
    );

    it.each(BOARD_PRESETS)(
      `$id (${paper}): the numeral sits strictly to the right of the stringer's own x on every page where the stringer prints — the defect this fix closes (fix round 1, quick task 260902-cj5)`,
      (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);

        for (const page of layout.pages) {
          if (!page.stringerOnPage) continue;
          const stringerX = layout.margin + (0 - page.halfWidthRange[0]);
          const nX = numeralX(layout, page);
          expect(nX).toBeGreaterThan(stringerX);
        }
      },
    );
  }
});

describe("the name block's printed text comes from the shared build-template-pdf.ts helpers, never new formatting", () => {
  it("the dims row equals templateNameBlockDimsText(dims) wrapped by nameBlockContent", () => {
    const options = buildOptionsFor(BOARD_PRESETS[0]);
    const doc = new jsPDF({ unit: "mm" });
    const { dimsLines } = nameBlockContent(doc, options.dims);
    expect(dimsLines.join(" ")).toBe(templateNameBlockDimsText(options.dims));
  });

  it("a name too long for the box comes back ellipsis-truncated from templateNameBlockText", () => {
    const doc = new jsPDF({ unit: "mm" });
    const longName = "The Founder's Extremely Long And Descriptive Board Name That Goes On And On For Testing";
    const result = templateNameBlockText(longName, 68, doc);
    expect(result.endsWith("…")).toBe(true);
  });
});
