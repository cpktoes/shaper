import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { computeTemplateLayout, computeTemplateMarks } from "@/lib/geometry/template";
import { buildTemplatePdf, templateNameBlockText } from "./build-template-pdf";

function buildOptions(paper: "letter" | "a4" = "letter") {
  const preset = BOARD_PRESETS[0];
  const geometry = buildOutline(preset.outline);
  const layout = computeTemplateLayout(geometry, paper);
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
    },
  };
}

describe("buildTemplatePdf", () => {
  it("produces one PDF page per layout page, with valid PDF bytes, marks included", () => {
    const options = buildOptions();

    const doc = buildTemplatePdf(options);

    expect(doc.getNumberOfPages()).toBe(options.layout.pages.length);

    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(0);

    const header = new Uint8Array(bytes.slice(0, 4));
    const magic = String.fromCharCode(...header);
    expect(magic).toBe("%PDF");
  });
});

describe("templateNameBlockText", () => {
  const WIDTH_LIMIT_MM = 39; // NAME_BOX_WIDTH_MM(45) - 2 * NAME_BOX_PADDING_MM(3)

  it("falls back to Untitled Board for an empty name", () => {
    const doc = new jsPDF({ unit: "mm" });
    expect(templateNameBlockText("", WIDTH_LIMIT_MM, doc)).toBe("Untitled Board");
  });

  it("falls back to Untitled Board for a whitespace-only name", () => {
    const doc = new jsPDF({ unit: "mm" });
    expect(templateNameBlockText("   ", WIDTH_LIMIT_MM, doc)).toBe("Untitled Board");
  });

  it("truncates a name too long for the block with a trailing ellipsis no wider than the limit", () => {
    const doc = new jsPDF({ unit: "mm" });
    const longName = "The Founder's Extremely Long And Descriptive Board Name For Testing";

    const result = templateNameBlockText(longName, WIDTH_LIMIT_MM, doc);

    expect(result.endsWith("…")).toBe(true);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    expect(doc.getTextWidth(result)).toBeLessThanOrEqual(WIDTH_LIMIT_MM);
  });

  it("returns a short name unchanged", () => {
    const doc = new jsPDF({ unit: "mm" });
    expect(templateNameBlockText("Shortboard", WIDTH_LIMIT_MM, doc)).toBe("Shortboard");
  });
});
