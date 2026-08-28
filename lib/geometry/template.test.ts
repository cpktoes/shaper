import { describe, expect, it } from "vitest";
import { WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { MEASURE_STATION_MM, buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import {
  TEMPLATE_OVERLAP_MM,
  computeTemplateLayout,
  computeTemplateMarks,
  markPlacements,
  matchMarkPositions,
  type PaperSize,
  type TemplateLayout,
} from "./template";
import { inchesToMm } from "./units";

const PAPERS: PaperSize[] = ["letter", "a4"];
const TOLERANCE_MM = 1e-6;

/** Every consecutive pair overlaps by exactly `TEMPLATE_OVERLAP_MM` — computed as a plain range
 * intersection so the assertion doesn't depend on which page's `stationRange`/`halfWidthRange`
 * happens to hold the larger value. */
function overlapLength(aRange: [number, number], bRange: [number, number]): number {
  return Math.min(aRange[1], bRange[1]) - Math.max(aRange[0], bRange[0]);
}

describe("computeTemplateLayout", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)("$id: every sampled outline point falls inside at least one page", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const uncovered = geometry.points.filter(
          (point) =>
            !layout.pages.some(
              (page) =>
                point.station >= page.stationRange[0] &&
                point.station <= page.stationRange[1] &&
                point.halfWidth >= page.halfWidthRange[0] &&
                point.halfWidth <= page.halfWidthRange[1],
            ),
        );
        expect(uncovered).toEqual([]);
      });

      it.each(BOARD_PRESETS)("$id: pages.length equals rows * columns", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        expect(layout.pages.length).toBe(layout.rows * layout.columns);
      });

      it.each(BOARD_PRESETS)("$id: page labels number 1..N with no gap", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const total = layout.pages.length;
        layout.pages.forEach((page, i) => {
          expect(page.index).toBe(i);
          expect(page.label).toBe(`Page ${i + 1} of ${total} — nose to tail`);
        });
      });

      it.each(BOARD_PRESETS)("$id: consecutive rows overlap by exactly TEMPLATE_OVERLAP_MM", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout: TemplateLayout = computeTemplateLayout(geometry, paper);
        for (let row = 0; row < layout.rows - 1; row++) {
          const a = layout.pages.find((p) => p.row === row && p.col === 0);
          const b = layout.pages.find((p) => p.row === row + 1 && p.col === 0);
          expect(a).toBeDefined();
          expect(b).toBeDefined();
          const overlap = overlapLength(a!.stationRange, b!.stationRange);
          expect(Math.abs(overlap - TEMPLATE_OVERLAP_MM)).toBeLessThan(TOLERANCE_MM);
        }
      });

      it.each(BOARD_PRESETS)("$id: consecutive columns overlap by exactly TEMPLATE_OVERLAP_MM", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout: TemplateLayout = computeTemplateLayout(geometry, paper);
        for (let col = 0; col < layout.columns - 1; col++) {
          const a = layout.pages.find((p) => p.col === col && p.row === 0);
          const b = layout.pages.find((p) => p.col === col + 1 && p.row === 0);
          expect(a).toBeDefined();
          expect(b).toBeDefined();
          const overlap = overlapLength(a!.halfWidthRange, b!.halfWidthRange);
          expect(Math.abs(overlap - TEMPLATE_OVERLAP_MM)).toBeLessThan(TOLERANCE_MM);
        }
      });
    });

    it(`${paper}: a board at the maximum widepoint width (25in) tiles more than one column`, () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
      });
      const layout = computeTemplateLayout(geometry, paper);
      expect(layout.columns).toBeGreaterThan(1);
    });
  }
});

describe("markPlacements", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)("$id: exactly four mark names, each on a valid page inside its stationRange", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const placements = markPlacements(layout, marks, geometry);

        const uniqueNames = new Set(placements.map((p) => p.mark));
        expect(uniqueNames).toEqual(new Set(["noseTwelve", "tailTwelve", "center", "widepoint"]));

        for (const placement of placements) {
          expect(placement.pageIndex).toBeGreaterThanOrEqual(0);
          expect(placement.pageIndex).toBeLessThan(layout.pages.length);
          const page = layout.pages[placement.pageIndex];
          expect(placement.station).toBeGreaterThanOrEqual(page.stationRange[0]);
          expect(placement.station).toBeLessThanOrEqual(page.stationRange[1]);
        }
      });

      it.each(BOARD_PRESETS)("$id: tailTwelve/noseTwelve/widepoint stations match the geometry's own values", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        expect(marks.tailTwelve).toBe(MEASURE_STATION_MM);
        expect(marks.noseTwelve).toBeCloseTo(geometry.length - MEASURE_STATION_MM, 6);
        expect(marks.widepoint).toBe(geometry.widePointStation);

        const placements = markPlacements(layout, marks, geometry);
        for (const placement of placements) {
          expect(placement.halfWidthExtent).toBe(sampleOutline(geometry, placement.station));
        }
      });
    });
  }
});

describe("matchMarkPositions", () => {
  /** Asserts that every match mark on `pageA` sharing this specific edge with `pageB` has an
   * identical (station, halfWidth) counterpart on `pageB`'s own entry set for the same edge —
   * filtered by `pairedPageIndex` so a page carrying both a row overlap and a column overlap
   * doesn't get its two edges' marks conflated. */
  function expectSharedEdgeMarksMatch(marks: ReturnType<typeof matchMarkPositions>, pageAIndex: number, pageBIndex: number) {
    const marksA = marks
      .filter((m) => m.pageIndex === pageAIndex && m.pairedPageIndex === pageBIndex)
      .sort((a, b) => a.halfWidth - b.halfWidth || a.station - b.station);
    const marksB = marks
      .filter((m) => m.pageIndex === pageBIndex && m.pairedPageIndex === pageAIndex)
      .sort((a, b) => a.halfWidth - b.halfWidth || a.station - b.station);

    expect(marksA.length).toBe(2);
    expect(marksB.length).toBe(2);
    marksA.forEach((markA, i) => {
      expect(markA.station).toBeCloseTo(marksB[i].station, 6);
      expect(markA.halfWidth).toBeCloseTo(marksB[i].halfWidth, 6);
    });
  }

  for (const paper of PAPERS) {
    it(`${paper}: single-column board — row-adjacent pages carry identical match-mark positions in their shared band`, () => {
      // A real board's own WIDEPOINT_WIDTH_RANGE_IN.min (16in) is already wide enough to need two
      // columns on a portrait short edge — deliberately narrower than the app's own range purely
      // to force layout.columns === 1 and exercise the row-adjacent (nose-to-tail) match-mark
      // invariant on its own, distinct from the column-adjacent case exercised below.
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        widePointWidth: inchesToMm(10),
      });
      const layout = computeTemplateLayout(geometry, paper);
      expect(layout.columns).toBe(1);
      expect(layout.rows).toBeGreaterThan(1);

      const marks = matchMarkPositions(layout);
      for (let row = 0; row < layout.rows - 1; row++) {
        const pageA = layout.pages.find((p) => p.row === row && p.col === 0)!;
        const pageB = layout.pages.find((p) => p.row === row + 1 && p.col === 0)!;
        expectSharedEdgeMarksMatch(marks, pageA.index, pageB.index);
      }
    });

    it(`${paper}: board at the maximum widepoint width — column-adjacent pages carry identical match-mark positions in their shared band`, () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
      });
      const layout = computeTemplateLayout(geometry, paper);
      expect(layout.columns).toBeGreaterThan(1);

      const marks = matchMarkPositions(layout);
      for (let col = 0; col < layout.columns - 1; col++) {
        const pageA = layout.pages.find((p) => p.col === col && p.row === 0)!;
        const pageB = layout.pages.find((p) => p.col === col + 1 && p.row === 0)!;
        expectSharedEdgeMarksMatch(marks, pageA.index, pageB.index);
      }
    });
  }
});
