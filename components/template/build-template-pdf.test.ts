import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { WIDEPOINT_WIDTH_RANGE_IN } from "@/lib/geometry/board";
import { buildOutline, sampleOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import {
  NAME_BOX_CLEARANCE_MM,
  NAME_BOX_WIDTH_MM,
  computeTemplateLayout,
  computeTemplateMarks,
  markPlacements,
  nameBlockPlacement,
} from "@/lib/geometry/template";
import { inchesToMm, litres, mm } from "@/lib/geometry/units";
import {
  HOWTO_BOX_TEXT_WIDTH_LIMIT_MM,
  buildTemplatePdf,
  nameBlockContent,
  rectContains,
  rectsOverlap,
  templateHowToLines,
  templateHowToWrappedLines,
  templateMarkDimensionText,
  templateMarkLabelText,
  templateNameBlockDimsText,
  templateNameBlockText,
  templatePageZeroBoxRect,
  templatePageZeroFurnitureRects,
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
      noseWidth12in: geometry.noseWidthAt12in,
      tailWidth12in: geometry.tailWidthAt12in,
      widePointOffset: preset.outline.widePointOffset,
      volumeLitres: litres(27.4),
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

  it("builds without throwing for every preset at both paper sizes, including an empty board name", () => {
    for (const preset of BOARD_PRESETS) {
      const geometry = buildOutline(preset.outline);
      for (const paper of ["letter", "a4"] as const) {
        const layout = computeTemplateLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const doc = buildTemplatePdf({
          layout,
          marks,
          geometry,
          paper,
          boardName: "",
          dims: {
            length: geometry.length,
            widePointWidth: geometry.halfWidePointWidth,
            centerThickness: preset.rails.center.boardThickness,
            noseWidth12in: geometry.noseWidthAt12in,
            tailWidth12in: geometry.tailWidthAt12in,
            widePointOffset: preset.outline.widePointOffset,
            volumeLitres: litres(27.4),
          },
        });
        expect(doc.getNumberOfPages()).toBe(layout.pages.length);
      }
    }
  });
});

describe("templateNameBlockText", () => {
  const WIDTH_LIMIT_MM = 68; // NAME_BOX_WIDTH_MM(74) - 2 * NAME_BOX_PADDING_MM(3)

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
    const longName =
      "The Founder's Extremely Long And Descriptive Board Name That Goes On And On For Testing";

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

  it(
    'describes lining up border lines and the overlap, not cutting or match marks (round 2 post-checkpoint fix, defect 2, RESEARCH correction: overlap tiling kept, marks replaced by the box)',
    () => {
      const preset = BOARD_PRESETS[0];
      const geometry = buildOutline({ ...preset.outline, widePointWidth: inchesToMm(10) });
      const layout = computeTemplateLayout(geometry, "letter");
      const lines = templateHowToLines(layout);

      expect(lines[2].toLowerCase()).toContain("border line");
      expect(lines[2].toLowerCase()).toContain("overlap");
      expect(lines.join(" ").toLowerCase()).not.toContain("match mark");
      expect(lines.join(" ").toLowerCase()).not.toContain("cut out");
    },
  );

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

describe("templateMarkLabelText / templateMarkDimensionText (post-checkpoint fix, defect 2: \"the station lines don't have a printed dimension\")", () => {
  it("prints the board's own full width at every mark's station, for every preset and paper size", () => {
    for (const preset of BOARD_PRESETS) {
      const geometry = buildOutline(preset.outline);
      for (const paper of ["letter", "a4"] as const) {
        const layout = computeTemplateLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const placements = markPlacements(layout, marks, geometry);

        for (const placement of placements) {
          const dim = templateMarkDimensionText(placement);
          const label = templateMarkLabelText(placement);

          expect(dim.endsWith('"')).toBe(true);
          expect(label).toContain(placement.label);
          expect(label).toContain(dim);
        }
      }
    }
  });
});

describe(
  'templateMarkLabelText — Tail Block (round 2 post-checkpoint fix, defect 1: "the tip of the tail... is not printing (add tailblock dim)")',
  () => {
    it('prints "Tail Block — 4\\"" for the shortboard preset (squash tail, 4in endWidth)', () => {
      const preset = BOARD_PRESETS[0]; // shortboard — squash, endWidth 4in
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);

      const tailBlock = placements.find((p) => p.mark === "tailBlock");
      expect(tailBlock).toBeDefined();
      expect(templateMarkDimensionText(tailBlock!)).toBe('4"');
      expect(templateMarkLabelText(tailBlock!)).toBe('Tail Block — 4"');
    });

    it("is never emitted for a round-tail preset — no separate block edge to label", () => {
      const preset = BOARD_PRESETS[2]; // midlength — round
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);

      expect(placements.some((p) => p.mark === "tailBlock")).toBe(false);
    });
  },
);

describe("templateNameBlockDimsText / nameBlockContent (post-checkpoint fix, defect 3 refinement: \"add all the station mark dims with the board name\")", () => {
  const dims = {
    length: inchesToMm(74),
    widePointWidth: inchesToMm(18.75),
    centerThickness: inchesToMm(2.375),
    noseWidth12in: inchesToMm(11.25),
    tailWidth12in: inchesToMm(14.1875),
    widePointOffset: inchesToMm(-1),
    volumeLitres: litres(27.4),
  };

  it("carries every value the order form's own dimensions row carries", () => {
    const text = templateNameBlockDimsText(dims);
    expect(text).toContain("Length");
    expect(text).toContain("Nose");
    expect(text).toContain("Widepoint");
    expect(text).toContain("Offset");
    expect(text).toContain("Tail");
    expect(text).toContain("Thickness");
    expect(text).toContain("Volume");
    expect(text).toContain("27.4 L");
  });

  it("wraps the dims row to the box's own inner width and grows the box height to fit every line", () => {
    const doc = new jsPDF({ unit: "mm" });
    const { dimsLines, height } = nameBlockContent(doc, dims);

    expect(dimsLines.length).toBeGreaterThan(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const line of dimsLines) {
      expect(doc.getTextWidth(line)).toBeLessThanOrEqual(NAME_BOX_WIDTH_MM - 6);
    }
    // The box is tall enough to hold the name line plus every dims line.
    expect(height).toBeGreaterThan(8);
  });
});

describe("name block containment (post-checkpoint fix, defect 3: box fully inside the outline on page 1, now at its real, larger size)", () => {
  for (const paper of ["letter", "a4"] as const) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)("$id: every corner of the real (name + full dims row) box lands inside the outline on page 0", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const doc = new jsPDF({ unit: "mm" });
        const dims = {
          length: geometry.length,
          widePointWidth: geometry.halfWidePointWidth,
          centerThickness: preset.rails.center.boardThickness,
          noseWidth12in: geometry.noseWidthAt12in,
          tailWidth12in: geometry.tailWidthAt12in,
          widePointOffset: preset.outline.widePointOffset,
          volumeLitres: litres(27.4),
        };
        const { height } = nameBlockContent(doc, dims);
        const placement = nameBlockPlacement(layout, geometry, NAME_BOX_WIDTH_MM, height, NAME_BOX_CLEARANCE_MM);

        const requiredHalfWidth = NAME_BOX_CLEARANCE_MM + NAME_BOX_WIDTH_MM;
        const bottomStation = mm(placement.topStation - height);

        expect(sampleOutline(geometry, placement.topStation)).toBeGreaterThanOrEqual(requiredHalfWidth);
        expect(sampleOutline(geometry, bottomStation)).toBeGreaterThanOrEqual(requiredHalfWidth);

        const page0 = layout.pages[0];
        expect(placement.topStation).toBeLessThanOrEqual(page0.stationRange[1]);
        expect(bottomStation).toBeGreaterThanOrEqual(page0.stationRange[0]);
      });
    });
  }
});

describe("page-0 furniture never overlaps (post-checkpoint fix, defect 4: scale square, how-to box, name block)", () => {
  it.each(BOARD_PRESETS)("$id (letter): no two furniture rectangles overlap", (preset) => {
    const options = { ...buildOptions("letter"), boardName: preset.name };
    const rects = templatePageZeroFurnitureRects(options);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it(
    "no match-mark rectangles are emitted (round 2 post-checkpoint fix, defect 2: match marks replaced by the per-page alignment box) — exactly the three named furniture pieces",
    () => {
      const options = { ...buildOptions("letter"), boardName: BOARD_PRESETS[0].name };
      const rects = templatePageZeroFurnitureRects(options);
      expect(rects.map((r) => r.name).sort()).toEqual(["how-to-box", "name-block", "scale-square"]);
    },
  );

  it.each(BOARD_PRESETS)("$id (a4): no two furniture rectangles overlap", (preset) => {
    const options = { ...buildOptions("a4"), boardName: preset.name };
    const rects = templatePageZeroFurnitureRects(options);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it("a wide, multi-column board still has no page-0 furniture overlaps", () => {
    const preset = BOARD_PRESETS[0];
    const geometry = buildOutline({
      ...preset.outline,
      widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
    });
    const layout = computeTemplateLayout(geometry, "letter");
    expect(layout.columns).toBeGreaterThan(1);

    const options = {
      layout,
      marks: computeTemplateMarks(geometry),
      geometry,
      paper: "letter" as const,
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
    const rects = templatePageZeroFurnitureRects(options);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });
});

describe(
  'page-0 furniture is fully inside the alignment box (round 3 post-checkpoint fix, defect 2: "the 2in box and instructions are not inside the margin/line up lines")',
  () => {
    it.each(BOARD_PRESETS)("$id (letter): every furniture rectangle is contained inside the alignment box", (preset) => {
      const options = { ...buildOptions("letter"), boardName: preset.name };
      const boxRect = templatePageZeroBoxRect(options.layout);
      const rects = templatePageZeroFurnitureRects(options);
      for (const rect of rects) {
        expect(rectContains(boxRect, rect)).toBe(true);
      }
    });

    it.each(BOARD_PRESETS)("$id (a4): every furniture rectangle is contained inside the alignment box", (preset) => {
      const options = { ...buildOptions("a4"), boardName: preset.name };
      const boxRect = templatePageZeroBoxRect(options.layout);
      const rects = templatePageZeroFurnitureRects(options);
      for (const rect of rects) {
        expect(rectContains(boxRect, rect)).toBe(true);
      }
    });

    it("a wide, multi-column board (the exact case where the box is inset from the printable edge) still keeps every furniture rectangle inside the box", () => {
      const preset = BOARD_PRESETS[0];
      const geometry = buildOutline({
        ...preset.outline,
        widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
      });
      const layout = computeTemplateLayout(geometry, "letter");
      expect(layout.columns).toBeGreaterThan(1);

      const options = {
        layout,
        marks: computeTemplateMarks(geometry),
        geometry,
        paper: "letter" as const,
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
      const boxRect = templatePageZeroBoxRect(layout);
      const rects = templatePageZeroFurnitureRects(options);
      for (const rect of rects) {
        expect(rectContains(boxRect, rect)).toBe(true);
      }
    });
  },
);
