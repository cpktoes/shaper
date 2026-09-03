import { writeFileSync } from "node:fs";
import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec } from "@/lib/geometry/board";
import { buildOutline, sampleOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import {
  NAME_BOX_CLEARANCE_MM,
  NAME_BOX_WIDTH_MM,
  computeTailClosure,
  computeTemplateLayout,
  computeTemplateMarks,
  markPlacements,
  nameBlockPlacement,
  type PaperSize,
} from "@/lib/geometry/template";
import { inchesToMm, litres, mm } from "@/lib/geometry/units";
import {
  HOWTO_BOX_TEXT_WIDTH_LIMIT_MM,
  buildTemplatePdf,
  markLabelRect,
  nameBlockContent,
  rectContains,
  rectsOverlap,
  templateHowToBoxPlacement,
  templateHowToLines,
  templateHowToWrappedLines,
  templateMarkDimensionText,
  templateMarkLabelText,
  templateNameBlockDimsText,
  templateNameBlockText,
  templatePageZeroBoxRect,
  templatePageZeroFurnitureRects,
  templateScaleSquarePlacement,
  wrapTextToWidth,
} from "./build-template-pdf";

function buildOptions(paper: "letter" | "a4" = "letter") {
  return buildOptionsFor(BOARD_PRESETS[0], paper);
}

function buildOptionsFor(preset: (typeof BOARD_PRESETS)[number], paper: "letter" | "a4" = "letter") {
  return buildOptionsForOutline(preset, preset.outline, preset.name, paper);
}

/** Like `buildOptionsFor`, but for a wide-variant outline that isn't one of the four named
 * `BOARD_PRESETS` (quick task 260903-fqv — the widest shortboard/longboard and a full-nose
 * longboard, built the same way the geometry-layer tests build their own wide variants: spread
 * `basePreset.outline` and override the one field). `basePreset` supplies everything the wide
 * variant doesn't override — its rails (for `centerThickness`) and its own outline as a base. */
function buildOptionsForOutline(
  basePreset: (typeof BOARD_PRESETS)[number],
  outline: OutlineSpec,
  boardName: string,
  paper: "letter" | "a4" = "letter",
) {
  const geometry = buildOutline(outline);
  const layout = computeTemplateLayout(geometry, paper);
  const marks = computeTemplateMarks(geometry);
  return {
    layout,
    marks,
    geometry,
    paper,
    boardName,
    dims: {
      length: geometry.length,
      widePointWidth: geometry.halfWidePointWidth,
      centerThickness: basePreset.rails.center.boardThickness,
      noseWidth12in: geometry.noseWidthAt12in,
      tailWidth12in: geometry.tailWidthAt12in,
      widePointOffset: outline.widePointOffset,
      volumeLitres: litres(27.4),
    },
  };
}

/** The three wide variants Task 1's geometry-layer tests also cover (`lib/geometry/template.test.ts`
 * — `howToBoxPlacement`'s own describe block), rebuilt here for the drawing-module tests so both
 * layers exercise the same boards. */
const WIDE_TEMPLATE_CASES = [
  {
    id: "widest-shortboard",
    basePreset: BOARD_PRESETS[0],
    outline: { ...BOARD_PRESETS[0].outline, widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max) },
  },
  {
    id: "widest-longboard",
    basePreset: BOARD_PRESETS[3],
    outline: { ...BOARD_PRESETS[3].outline, widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max) },
  },
  {
    id: "fullnose-longboard",
    basePreset: BOARD_PRESETS[3],
    outline: { ...BOARD_PRESETS[3].outline, noseFullness: 100 },
  },
];

/** Every case Task 2's how-to box tests run against — the four named presets (real per-preset
 * geometry via `buildOptionsFor`, never `buildOptions`' always-shortboard shortcut) plus the three
 * wide variants above. Each entry's `build` defers paper selection so the same case list drives
 * both `letter` and `a4` describe blocks. */
const ALL_HOWTO_BOX_CASES = [
  ...BOARD_PRESETS.map((preset) => ({
    id: preset.id,
    build: (paper: "letter" | "a4") => buildOptionsFor(preset, paper),
  })),
  ...WIDE_TEMPLATE_CASES.map(({ id, basePreset, outline }) => ({
    id,
    build: (paper: "letter" | "a4") => buildOptionsForOutline(basePreset, outline, basePreset.name, paper),
  })),
];

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

  // The plan's own opt-in hook (mirrors build-strip-pdf.test.ts's STRIP_PDF_OUT): set
  // TEMPLATE_PDF_OUT to a real path and this test writes a real, renderable Full Sized Template
  // PDF there for a human (or a headless PDF renderer) to inspect page by page. Skipped by default
  // so the suite never touches disk in CI; a permanent part of the suite, not a throwaway.
  it.skipIf(!process.env.TEMPLATE_PDF_OUT)("writes a sample tiled template PDF to TEMPLATE_PDF_OUT for manual review", () => {
    const outPath = process.env.TEMPLATE_PDF_OUT!;
    const presetId = process.env.TEMPLATE_PDF_PRESET ?? "longboard";
    const paper = (process.env.TEMPLATE_PDF_PAPER as PaperSize | undefined) ?? "letter";

    // Quick task 260903-h7t: TEMPLATE_PDF_PRESET also accepts the wide-variant ids from this
    // file's own WIDE_TEMPLATE_CASES (built via buildOptionsForOutline) — the two boards this task
    // actually moves the scale square on (widest-longboard, fullnose-longboard) are not shipped
    // presets, so without this the founder could not be shown the change at all. The four named
    // preset ids keep working exactly as before.
    const wideCase = WIDE_TEMPLATE_CASES.find((c) => c.id === presetId);
    const options = wideCase
      ? buildOptionsForOutline(wideCase.basePreset, wideCase.outline, wideCase.basePreset.name, paper)
      : buildOptionsFor(
          BOARD_PRESETS.find((p) => p.id === presetId) ?? BOARD_PRESETS[BOARD_PRESETS.length - 1],
          paper,
        );

    const doc = buildTemplatePdf(options);
    const bytes = doc.output("arraybuffer");
    writeFileSync(outPath, Buffer.from(bytes));

    expect(doc.getNumberOfPages()).toBe(options.layout.pages.length);
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

  it(
    'instruction line 2 names the square by its own size, not by where it sits on the page (quick task 260903-h7t — the square now prints below the how-to box on two boards, so "the square above" would be false there)',
    () => {
      const preset = BOARD_PRESETS[0];
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, "letter");
      const lines = templateHowToLines(layout);

      expect(lines[1]).toContain('2" x 2"');
      expect(lines[1].toLowerCase()).not.toContain("above");
    },
  );

  it(
    "instruction line 2 (the one this task's wording change touches) wraps to at most two rows inside the how-to box's own inner width, for every preset and paper size — matches today's 80.7mm line and keeps the how-to box the same 8 wrapped rows / 46mm tall it already is; a future wording change that would grow the box is caught here rather than by a founder noticing the layout shifted",
    () => {
      for (const preset of BOARD_PRESETS) {
        const geometry = buildOutline(preset.outline);
        for (const paper of ["letter", "a4"] as const) {
          const layout = computeTemplateLayout(geometry, paper);
          const doc = new jsPDF({ unit: "mm" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);

          const lines = templateHowToLines(layout);
          const rows = wrapTextToWidth(`2. ${lines[1]}`, HOWTO_BOX_TEXT_WIDTH_LIMIT_MM, doc);
          expect(rows.length).toBeLessThanOrEqual(2);
        }
      }
    },
  );
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

describe(
  'markLabelRect — CENTER/WIDEPOINT label collision (round 4 post-checkpoint fix, defect 1: "Center and widepoint dims overlap when close to eachother or equal")',
  () => {
    it("far apart (shortboard preset): each label sits at its own natural station, and the two rects never overlap", () => {
      const preset = BOARD_PRESETS[0]; // shortboard — widePointOffset -1in
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);
      const doc = new jsPDF({ unit: "mm" });

      const center = placements.find((p) => p.mark === "center")!;
      const widepoint = placements.find((p) => p.mark === "widepoint")!;
      const centerRect = markLabelRect(doc, layout.pages[center.pageIndex], layout.margin, center);
      const widepointRect = markLabelRect(doc, layout.pages[widepoint.pageIndex], layout.margin, widepoint);

      expect(rectsOverlap(centerRect, widepointRect)).toBe(false);
    });

    it("close (a custom 5mm widepoint offset): the two nudged label rects never overlap", () => {
      const preset = BOARD_PRESETS[0];
      const geometry = buildOutline({ ...preset.outline, widePointOffset: mm(5) });
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);
      const doc = new jsPDF({ unit: "mm" });

      const center = placements.find((p) => p.mark === "center")!;
      const widepoint = placements.find((p) => p.mark === "widepoint")!;
      expect(center.labelOffsetMm).not.toBe(0);
      expect(widepoint.labelOffsetMm).not.toBe(0);

      const centerRect = markLabelRect(doc, layout.pages[center.pageIndex], layout.margin, center);
      const widepointRect = markLabelRect(doc, layout.pages[widepoint.pageIndex], layout.margin, widepoint);

      expect(rectsOverlap(centerRect, widepointRect)).toBe(false);
    });

    it("coincident (fish preset): only one merged rect is ever drawn — there is no second label to overlap it", () => {
      const preset = BOARD_PRESETS[1]; // fish — widePointOffset 0in
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);

      expect(placements.filter((p) => p.mark === "center" || p.mark === "widepoint")).toHaveLength(1);
      const merged = placements.find((p) => p.mark === "center")!;
      expect(templateMarkLabelText(merged)).toMatch(/^Widepoint \/ Center — /);
    });
  },
);

describe(
  'buildTemplatePdf — tail closure (round 4 post-checkpoint fix, defect 2: "Swallow and diamond tail appears like a squash — it doesn\'t reflect the depth")',
  () => {
    it("builds without throwing for a diamond-tail board, at both paper sizes", () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        tail: { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) },
      });
      for (const paper of ["letter", "a4"] as const) {
        const layout = computeTemplateLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const doc = buildTemplatePdf({
          layout,
          marks,
          geometry,
          paper,
          boardName: "Diamond Test",
          dims: {
            length: geometry.length,
            widePointWidth: geometry.halfWidePointWidth,
            centerThickness: inchesToMm(2.375),
            noseWidth12in: geometry.noseWidthAt12in,
            tailWidth12in: geometry.tailWidthAt12in,
            widePointOffset: BOARD_PRESETS[0].outline.widePointOffset,
            volumeLitres: litres(27.4),
          },
        });
        expect(doc.getNumberOfPages()).toBe(layout.pages.length);
      }
    });

    it("builds without throwing for the swallow-tail fish preset, at both paper sizes", () => {
      const options = buildOptionsFor(BOARD_PRESETS[1], "letter");
      const doc = buildTemplatePdf(options);
      expect(doc.getNumberOfPages()).toBe(options.layout.pages.length);

      const optionsA4 = buildOptionsFor(BOARD_PRESETS[1], "a4");
      const docA4 = buildTemplatePdf(optionsA4);
      expect(docA4.getNumberOfPages()).toBe(optionsA4.layout.pages.length);
    });

    it("a squash tail's closure collapses to a single-station vertical cut, exactly like the pre-fix tailBlock tick did", () => {
      const geometry = buildOutline(BOARD_PRESETS[0].outline); // shortboard — squash
      const closure = computeTailClosure(geometry)!;
      expect(closure.corner.station).toBe(closure.tip.station);
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

        // Quick task 260903-18d: the required half-width now reserves NAME_BOX_CLEARANCE_MM on
        // BOTH sides of the box — the existing inboard gap off the stringer, and a new outboard
        // gap the curve itself must clear past the box's own right edge.
        const requiredHalfWidth = NAME_BOX_CLEARANCE_MM + NAME_BOX_WIDTH_MM + NAME_BOX_CLEARANCE_MM;
        const bottomStation = mm(placement.topStation - height);

        expect(sampleOutline(geometry, placement.topStation)).toBeGreaterThanOrEqual(requiredHalfWidth);
        expect(sampleOutline(geometry, bottomStation)).toBeGreaterThanOrEqual(requiredHalfWidth);

        const page0 = layout.pages[0];
        expect(placement.topStation).toBeLessThanOrEqual(page0.stationRange[1]);
        expect(bottomStation).toBeGreaterThanOrEqual(page0.stationRange[0]);

        // Never reaches the narrow-nose fallback at the box's own real, drawn height: the fallback
        // clamps position without proving containment, so if it had been reached here, the two
        // containment assertions above would (for a real preset) be the ones catching it.
        expect(placement.pageIndex).toBe(0);
      });

      it.each(BOARD_PRESETS)(
        "$id: the outline curve clears the real (name + full dims row) box's outboard (curve-side) edge by at least NAME_BOX_CLEARANCE_MM over the box's whole station span — the founder's requirement, asserted directly rather than merely implied by containment (quick task 260903-18d)",
        (preset) => {
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
          const bottomStation = placement.topStation - height;
          const blockRightEdge = placement.halfWidthStart + NAME_BOX_WIDTH_MM;

          const step = 1;
          let minHalfWidth = Infinity;
          for (let station = bottomStation; station <= placement.topStation; station += step) {
            minHalfWidth = Math.min(minHalfWidth, sampleOutline(geometry, mm(station)));
          }
          minHalfWidth = Math.min(minHalfWidth, sampleOutline(geometry, mm(placement.topStation)));

          expect(minHalfWidth - blockRightEdge).toBeGreaterThanOrEqual(NAME_BOX_CLEARANCE_MM - 1e-6);
        },
      );
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

/**
 * `templateHowToBoxPlacement` / `howToBoxRect` tests (quick task 260903-fqv — the rail curve was
 * running through the how-to instruction box on a wide-nosed board's nose page). Every expected
 * value below is derived — from `sampleOutline`, the layout's own numbers, or arithmetic over
 * named constants — never a millimetre figure read back out of what the new code printed (CLAUDE.md
 * Rule 1). Uses `buildOptionsFor`/`buildOptionsForOutline` for real per-preset geometry — the
 * existing pairwise overlap tests above use `buildOptions(paper)`, which is always the shortboard's
 * own geometry with only the board name swapped, so they never exercise a longboard's page 0.
 */
describe("templateHowToBoxPlacement / howToBoxRect", () => {
  const ROUND_TRIP_TOLERANCE_MM = 1e-6;

  describe("outboard round trip (the founder's own D-10 spot, reproduced through the new geometry layer)", () => {
    for (const paper of ["letter", "a4"] as const) {
      it.each(BOARD_PRESETS)(
        `$id (${paper}): when the placement comes back outboard, the drawn rect matches the historical fixed formula (right-anchored to the alignment box, HOWTO_BOX_TOP_GAP_MM below the scale square) within floating-point tolerance`,
        (preset) => {
          const options = buildOptionsFor(preset, paper);
          const { placement, boxWidthMm } = templateHowToBoxPlacement(options);
          if (placement.position !== "outboard") return; // covered by the interior assertions below

          const boxRect = templatePageZeroBoxRect(options.layout);
          // The historical fixed formula, recomputed here rather than imported, so this test
          // proves the NEW code reproduces the OLD behaviour rather than merely agreeing with
          // itself: x = alignment box's right edge minus the box's own width; y = alignment box's
          // top edge plus the 2in scale square plus its own top gap (both fixed drawing
          // constants, mirrored from build-template-pdf.ts's own SCALE_SQUARE_MM/
          // HOWTO_BOX_TOP_GAP_MM).
          const expectedX = boxRect.x + boxRect.width - boxWidthMm;
          const expectedY = boxRect.y + inchesToMm(2) + 8;

          const rects = templatePageZeroFurnitureRects(options);
          const howTo = rects.find((r) => r.name === "how-to-box")!;

          expect(Math.abs(howTo.x - expectedX)).toBeLessThan(ROUND_TRIP_TOLERANCE_MM);
          expect(Math.abs(howTo.y - expectedY)).toBeLessThan(ROUND_TRIP_TOLERANCE_MM);
        },
      );
    }
  });

  describe("outcome derived from the curve's own clearance (outboard when clear, interior otherwise)", () => {
    for (const paper of ["letter", "a4"] as const) {
      describe(paper, () => {
        it.each(ALL_HOWTO_BOX_CASES)(
          "$id: the how-to box clears the curve by NAME_BOX_CLEARANCE_MM on its curve-side edge (outboard) or on both sides (interior)",
          ({ build }) => {
            const options = build(paper);
            const { placement, boxWidthMm, boxHeightMm } = templateHowToBoxPlacement(options);
            const bottom = placement.topStation - boxHeightMm;

            const step = 1;
            let minHalfWidth = Infinity;
            let maxHalfWidth = -Infinity;
            for (let station = bottom; station <= placement.topStation; station += step) {
              const halfWidth = sampleOutline(options.geometry, mm(station));
              minHalfWidth = Math.min(minHalfWidth, halfWidth);
              maxHalfWidth = Math.max(maxHalfWidth, halfWidth);
            }
            const topHalfWidth = sampleOutline(options.geometry, mm(placement.topStation));
            minHalfWidth = Math.min(minHalfWidth, topHalfWidth);
            maxHalfWidth = Math.max(maxHalfWidth, topHalfWidth);

            if (placement.position === "outboard") {
              expect(placement.halfWidthStart - maxHalfWidth).toBeGreaterThanOrEqual(
                NAME_BOX_CLEARANCE_MM - ROUND_TRIP_TOLERANCE_MM,
              );
            } else {
              expect(placement.halfWidthStart).toBe(NAME_BOX_CLEARANCE_MM);
              const requiredHalfWidth = NAME_BOX_CLEARANCE_MM + boxWidthMm + NAME_BOX_CLEARANCE_MM;
              expect(minHalfWidth).toBeGreaterThanOrEqual(requiredHalfWidth - ROUND_TRIP_TOLERANCE_MM);
            }
          },
        );
      });
    }
  });

  it.each(ALL_HOWTO_BOX_CASES)(
    "$id (letter): when interior, the how-to box never overlaps the name block and keeps at least NAME_BOX_CLEARANCE_MM between the name block's bottom edge and its own top edge",
    ({ build }) => {
      const options = build("letter");
      const { placement } = templateHowToBoxPlacement(options);
      if (placement.position !== "interior") return; // covered by the outboard round-trip test above

      const rects = templatePageZeroFurnitureRects(options);
      const howTo = rects.find((r) => r.name === "how-to-box")!;
      const nameBlockRect = rects.find((r) => r.name === "name-block")!;
      expect(rectsOverlap(howTo, nameBlockRect)).toBe(false);

      const doc = new jsPDF({ unit: "mm" });
      const nameBlockHeight = nameBlockContent(doc, options.dims).height;
      const nameBlock = nameBlockPlacement(
        options.layout,
        options.geometry,
        NAME_BOX_WIDTH_MM,
        nameBlockHeight,
        NAME_BOX_CLEARANCE_MM,
      );
      const nameBlockBottom = nameBlock.topStation - nameBlockHeight;
      const gap = nameBlockBottom - placement.topStation;
      expect(gap).toBeGreaterThanOrEqual(NAME_BOX_CLEARANCE_MM - 1e-6);
    },
  );

  it("derived outcome matches the planning facts: shortboard, midlength and the widest shortboard stay outboard; fish, longboard, the widest longboard and the noseFullness-100 longboard go interior", () => {
    const expectedOutboard = new Set(["shortboard", "midlength", "widest-shortboard"]);
    for (const paper of ["letter", "a4"] as const) {
      for (const { id, build } of ALL_HOWTO_BOX_CASES) {
        const options = build(paper);
        const { placement } = templateHowToBoxPlacement(options);
        expect(placement.position).toBe(expectedOutboard.has(id) ? "outboard" : "interior");
      }
    }
  });
});

/**
 * `templateScaleSquarePlacement` / `scaleSquareRect` tests (quick task 260903-h7t — the rail curve
 * was running into the 2in x 2in scale-check square's own footprint on two extreme boards). Every
 * expected value below is derived — from `sampleOutline`, the layout's own numbers, or arithmetic
 * over named constants — never a millimetre figure read back out of what the new code printed
 * (CLAUDE.md Rule 1). Uses `buildOptionsFor`/`buildOptionsForOutline` for real per-preset geometry
 * — the existing pairwise overlap and containment tests above use `buildOptions(paper)`, which is
 * always the shortboard's own geometry with only the board name swapped, so they never exercise a
 * longboard's page 0. Reuses `ALL_HOWTO_BOX_CASES` so both boxes are exercised on the same boards.
 */
describe("templateScaleSquarePlacement / scaleSquareRect", () => {
  const ROUND_TRIP_TOLERANCE_MM = 1e-6;

  describe('corner round trip (the founder\'s own D-07 spot, reproduced through the new geometry layer)', () => {
    for (const paper of ["letter", "a4"] as const) {
      it.each(BOARD_PRESETS)(
        `$id (${paper}): when the placement comes back "corner", the drawn rect matches the historical fixed formula (right-anchored to the alignment box's own top-outward corner) within floating-point tolerance`,
        (preset) => {
          const options = buildOptionsFor(preset, paper);
          const { placement, squareMm } = templateScaleSquarePlacement(options);
          if (placement.position !== "corner") return; // covered by the interior assertions below

          const boxRect = templatePageZeroBoxRect(options.layout);
          // The historical fixed formula, recomputed here rather than imported, so this test
          // proves the NEW code reproduces the OLD behaviour rather than merely agreeing with
          // itself: x = alignment box's right edge minus the square's own width; y = alignment
          // box's own top edge (`inchesToMm(2)` mirrors build-template-pdf.ts's own SCALE_SQUARE_MM,
          // per CLAUDE.md Rule 2 — never a bare 50.8 literal).
          const expectedX = boxRect.x + boxRect.width - inchesToMm(2);
          const expectedY = boxRect.y;

          const rects = templatePageZeroFurnitureRects(options);
          const square = rects.find((r) => r.name === "scale-square")!;

          expect(square.width).toBeCloseTo(squareMm, 6);
          expect(Math.abs(square.x - expectedX)).toBeLessThan(ROUND_TRIP_TOLERANCE_MM);
          expect(Math.abs(square.y - expectedY)).toBeLessThan(ROUND_TRIP_TOLERANCE_MM);
        },
      );
    }
  });

  describe("outcome derived from the curve's own clearance (corner when clear, interior otherwise)", () => {
    for (const paper of ["letter", "a4"] as const) {
      describe(paper, () => {
        it.each(ALL_HOWTO_BOX_CASES)(
          "$id: when interior, the square's left edge sits exactly NAME_BOX_CLEARANCE_MM off the stringer and clears the curve by NAME_BOX_CLEARANCE_MM on both sides over its own footprint",
          ({ build }) => {
            const options = build(paper);
            const { placement, squareMm, footprintHeightMm } = templateScaleSquarePlacement(options);

            if (placement.position !== "interior") return; // covered by the corner round trip above

            // Assert the 4mm stringer offset against the placement's own halfWidthStart in the
            // board's frame rather than against page millimetres, since halfWidthToX is not
            // exported.
            expect(placement.halfWidthStart).toBe(NAME_BOX_CLEARANCE_MM);

            const bottom = placement.topStation - footprintHeightMm;
            const requiredHalfWidth = NAME_BOX_CLEARANCE_MM + squareMm + NAME_BOX_CLEARANCE_MM;
            const step = 1;
            let minHalfWidth = Infinity;
            for (let station = bottom; station <= placement.topStation; station += step) {
              minHalfWidth = Math.min(minHalfWidth, sampleOutline(options.geometry, mm(station)));
            }
            minHalfWidth = Math.min(minHalfWidth, sampleOutline(options.geometry, mm(placement.topStation)));

            expect(minHalfWidth).toBeGreaterThanOrEqual(requiredHalfWidth - ROUND_TRIP_TOLERANCE_MM);
          },
        );
      });
    }
  });

  it.each(ALL_HOWTO_BOX_CASES)(
    "$id (letter): when interior, the square never overlaps the how-to box and its top sits at least NAME_BOX_CLEARANCE_MM below the how-to box's own bottom edge",
    ({ build }) => {
      const options = build("letter");
      const { placement } = templateScaleSquarePlacement(options);
      if (placement.position !== "interior") return; // covered by the corner round trip above

      const rects = templatePageZeroFurnitureRects(options);
      const square = rects.find((r) => r.name === "scale-square")!;
      const howTo = rects.find((r) => r.name === "how-to-box")!;
      expect(rectsOverlap(square, howTo)).toBe(false);

      // In page-local mm, y grows toward the tail — the how-to box's own bottom edge is
      // howTo.y + howTo.height; the square's own top (square.y) must sit at least
      // NAME_BOX_CLEARANCE_MM further down the page than that, i.e. numerically greater.
      const howToBottom = howTo.y + howTo.height;
      expect(square.y - howToBottom).toBeGreaterThanOrEqual(NAME_BOX_CLEARANCE_MM - 1e-6);
    },
  );

  it.each(BOARD_PRESETS)(
    "$id (letter): every page-0 furniture rectangle stays free of overlaps and fully inside the alignment box, using this board's own real geometry",
    (preset) => {
      const options = buildOptionsFor(preset, "letter");
      const boxRect = templatePageZeroBoxRect(options.layout);
      const rects = templatePageZeroFurnitureRects(options);
      for (let i = 0; i < rects.length; i++) {
        expect(rectContains(boxRect, rects[i])).toBe(true);
        for (let j = i + 1; j < rects.length; j++) {
          expect(rectsOverlap(rects[i], rects[j])).toBe(false);
        }
      }
    },
  );

  it.each(WIDE_TEMPLATE_CASES)(
    "$id (letter): every page-0 furniture rectangle stays free of overlaps and fully inside the alignment box, on the wide variant this task actually changes the square's placement on",
    ({ basePreset, outline }) => {
      const options = buildOptionsForOutline(basePreset, outline, basePreset.name, "letter");
      const boxRect = templatePageZeroBoxRect(options.layout);
      const rects = templatePageZeroFurnitureRects(options);
      for (let i = 0; i < rects.length; i++) {
        expect(rectContains(boxRect, rects[i])).toBe(true);
        for (let j = i + 1; j < rects.length; j++) {
          expect(rectsOverlap(rects[i], rects[j])).toBe(false);
        }
      }
    },
  );

  it("derived outcome matches the planning facts: shortboard, fish, midlength, longboard and the widest shortboard keep the corner; the widest longboard and the noseFullness-100 longboard move interior", () => {
    const expectedCorner = new Set(["shortboard", "fish", "midlength", "longboard", "widest-shortboard"]);
    for (const paper of ["letter", "a4"] as const) {
      for (const { id, build } of ALL_HOWTO_BOX_CASES) {
        const options = build(paper);
        const { placement } = templateScaleSquarePlacement(options);
        expect(placement.position).toBe(expectedCorner.has(id) ? "corner" : "interior");
      }
    }
  });
});
