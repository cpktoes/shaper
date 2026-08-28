import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { WIDEPOINT_WIDTH_RANGE_IN } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { computeTemplateLayout, computeTemplateMarks } from "@/lib/geometry/template";
import { inchesToMm } from "@/lib/geometry/units";
import {
  HOWTO_BOX_TEXT_WIDTH_LIMIT_MM,
  buildTemplatePdf,
  templateHowToLines,
  templateHowToWrappedLines,
  templateNameBlockText,
  wrapTextToWidth,
} from "./build-template-pdf";

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

describe("templateHowToLines", () => {
  it("returns three lines for a single-column layout", () => {
    const preset = BOARD_PRESETS[0];
    const geometry = buildOutline({ ...preset.outline, widePointWidth: inchesToMm(10) });
    const layout = computeTemplateLayout(geometry, "letter");
    expect(layout.columns).toBe(1);

    const lines = templateHowToLines(layout);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Print at 100%");
  });

  it("returns four lines, with the sideways-taping instruction, for a multi-column layout", () => {
    const preset = BOARD_PRESETS[0];
    const geometry = buildOutline({
      ...preset.outline,
      widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
    });
    const layout = computeTemplateLayout(geometry, "letter");
    expect(layout.columns).toBeGreaterThan(1);

    const lines = templateHowToLines(layout);
    expect(lines).toHaveLength(4);
    expect(lines[3].toLowerCase()).toContain("left to right");
  });
});

describe("wrapTextToWidth (post-checkpoint fix, defect 1)", () => {
  it("returns the text unchanged on one line when it already fits", () => {
    const doc = new jsPDF({ unit: "mm" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    expect(wrapTextToWidth("Short line.", 100, doc)).toEqual(["Short line."]);
  });

  it("wraps a long line onto multiple lines, none wider than the limit", () => {
    const doc = new jsPDF({ unit: "mm" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const text = "Cut out each page and tape them together, nose to tail, matching the marks.";
    const limit = 40;

    const lines = wrapTextToWidth(text, limit, doc);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(doc.getTextWidth(line)).toBeLessThanOrEqual(limit);
    }
    // No words lost in the wrap.
    expect(lines.join(" ")).toBe(text);
  });
});

describe("templateHowToWrappedLines (post-checkpoint fix, defect 1: \"the instructions on page 1 overrun the text box\")", () => {
  it("every wrapped, numbered line fits inside the how-to box's own inner width, for every preset and paper size", () => {
    for (const preset of BOARD_PRESETS) {
      const geometry = buildOutline(preset.outline);
      for (const paper of ["letter", "a4"] as const) {
        const layout = computeTemplateLayout(geometry, paper);
        const doc = new jsPDF({ unit: "mm" });
        const lines = templateHowToWrappedLines(layout, doc, HOWTO_BOX_TEXT_WIDTH_LIMIT_MM);

        expect(lines.length).toBeGreaterThanOrEqual(templateHowToLines(layout).length);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        for (const line of lines) {
          expect(doc.getTextWidth(line)).toBeLessThanOrEqual(HOWTO_BOX_TEXT_WIDTH_LIMIT_MM);
        }
      }
    }
  });

  it("the first line is still numbered '1.' and the sideways-taping line still appears last on a multi-column layout", () => {
    const preset = BOARD_PRESETS[0];
    const geometry = buildOutline({
      ...preset.outline,
      widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
    });
    const layout = computeTemplateLayout(geometry, "letter");
    const doc = new jsPDF({ unit: "mm" });
    const lines = templateHowToWrappedLines(layout, doc, HOWTO_BOX_TEXT_WIDTH_LIMIT_MM);

    expect(lines[0].startsWith("1.")).toBe(true);
    expect(lines.join(" ").toLowerCase()).toContain("left to right");
  });
});
