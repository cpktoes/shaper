import { describe, expect, it } from "vitest";
import { WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { MEASURE_STATION_MM, buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import {
  NAME_BOX_CLEARANCE_MM,
  NAME_BOX_HEIGHT_MM,
  NAME_BOX_WIDTH_MM,
  TEMPLATE_OVERLAP_MM,
  computeTemplateLayout,
  computeTemplateMarks,
  type FurnitureZone,
  markPlacements,
  matchMarkPositions,
  nameBlockPlacement,
  type PaperSize,
  type TemplateLayout,
} from "./template";
import { inchesToMm, mm } from "./units";

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
      it.each(BOARD_PRESETS)(
        "$id: the four base mark names, plus tailBlock only when this tail has a squared block, each on a valid page inside its stationRange",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const placements = markPlacements(layout, marks, geometry);

          const uniqueNames = new Set(placements.map((p) => p.mark));
          const expectedNames = new Set(["noseTwelve", "tailTwelve", "center", "widepoint"]);
          if (geometry.halfTailBlockWidth > 0) expectedNames.add("tailBlock");
          expect(uniqueNames).toEqual(expectedNames);

          for (const placement of placements) {
            expect(placement.pageIndex).toBeGreaterThanOrEqual(0);
            expect(placement.pageIndex).toBeLessThan(layout.pages.length);
            const page = layout.pages[placement.pageIndex];
            expect(placement.station).toBeGreaterThanOrEqual(page.stationRange[0]);
            expect(placement.station).toBeLessThanOrEqual(page.stationRange[1]);
          }
        },
      );

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

  describe("tailBlock (round 2 post-checkpoint fix, defect 1: \"the tip of the tail... is not printing\")", () => {
    it("is present, at geometry.tailPodStation with the tailblock's own half-width extent, for a squash-tail preset", () => {
      const preset = BOARD_PRESETS[0]; // shortboard — squash, endWidth 4in
      const geometry = buildOutline(preset.outline);
      expect(geometry.halfTailBlockWidth).toBeGreaterThan(0);
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      expect(marks.tailBlock).toBe(geometry.tailPodStation);

      const placements = markPlacements(layout, marks, geometry);
      const tailBlock = placements.find((p) => p.mark === "tailBlock");
      expect(tailBlock).toBeDefined();
      expect(tailBlock!.station).toBe(geometry.tailPodStation);
      expect(tailBlock!.halfWidthExtent).toBeCloseTo(geometry.halfTailBlockWidth, 6);
      expect(tailBlock!.label).toBe("Tail Block");
    });

    it("is absent for a round-tail preset (curve already meets the stringer at the tail with no separate block edge)", () => {
      const preset = BOARD_PRESETS[2]; // midlength — round
      const geometry = buildOutline(preset.outline);
      expect(geometry.halfTailBlockWidth).toBe(0);
      const layout = computeTemplateLayout(geometry, "letter");
      const marks = computeTemplateMarks(geometry);
      expect(marks.tailBlock).toBeUndefined();

      const placements = markPlacements(layout, marks, geometry);
      expect(placements.some((p) => p.mark === "tailBlock")).toBe(false);
    });

    it("the tail page's own sampled points reach the board's full length (station 0), for every preset", () => {
      for (const preset of BOARD_PRESETS) {
        const geometry = buildOutline(preset.outline);
        expect(Math.min(...geometry.points.map((p) => p.station))).toBeCloseTo(geometry.tailPodStation, 6);
        expect(Math.max(...geometry.points.map((p) => p.station))).toBeCloseTo(geometry.length, 6);
      }
    });
  });
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
      expect(marks.every((m) => m.edge === "row")).toBe(true);
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
        const marksBetween = marks.filter(
          (m) =>
            (m.pageIndex === pageA.index && m.pairedPageIndex === pageB.index) ||
            (m.pageIndex === pageB.index && m.pairedPageIndex === pageA.index),
        );
        expect(marksBetween.every((m) => m.edge === "column")).toBe(true);
      }
    });
  }

  describe("avoidZones (post-checkpoint fix, defect 4: a match mark must never land on furniture)", () => {
    it("shifts a column-adjacent pair's fractions away from a furniture zone that would otherwise catch the default spacing", () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
      });
      const layout = computeTemplateLayout(geometry, "letter");
      expect(layout.columns).toBeGreaterThan(1);

      const pageA = layout.pages.find((p) => p.col === 0 && p.row === 0)!;
      const pageB = layout.pages.find((p) => p.col === 1 && p.row === 0)!;

      // With no avoid zone, the default fraction set is used.
      const unconstrained = matchMarkPositions(layout).filter(
        (m) => m.pageIndex === pageA.index && m.pairedPageIndex === pageB.index,
      );
      expect(unconstrained.length).toBe(2);

      // A zone that swallows the whole nose-most half of page A's own station range — exactly
      // where the default fraction set (0.25, 0.75) would otherwise place one of the two marks —
      // forces the retry logic onto a different fraction pair.
      const [stStart, stEnd] = pageA.stationRange;
      const zone: FurnitureZone = {
        pageIndex: pageA.index,
        station: [mm(stStart + (stEnd - stStart) * 0.5), stEnd],
        halfWidth: pageA.halfWidthRange,
      };

      const constrained = matchMarkPositions(layout, [zone]).filter(
        (m) => m.pageIndex === pageA.index && m.pairedPageIndex === pageB.index,
      );
      expect(constrained.length).toBe(2);

      // No constrained mark falls inside the reserved zone.
      const inZone = (station: number, halfWidth: number) =>
        station >= zone.station[0] && station <= zone.station[1] && halfWidth >= zone.halfWidth[0] && halfWidth <= zone.halfWidth[1];
      for (const mark of constrained) {
        expect(inZone(mark.station, mark.halfWidth)).toBe(false);
      }

      // The zone did catch one of the two default (unconstrained) positions, proving the retry
      // logic actually had something to avoid rather than trivially matching.
      expect(unconstrained.some((mark) => inZone(mark.station, mark.halfWidth))).toBe(true);
    });
  });
});

describe("nameBlockPlacement", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: the name block's every corner lands inside the outline on page 0 (post-checkpoint fix, defect 3)",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const placement = nameBlockPlacement(layout, geometry);

          expect(placement.pageIndex).toBe(0);
          expect(placement.halfWidthStart).toBe(NAME_BOX_CLEARANCE_MM);

          const requiredHalfWidth = NAME_BOX_CLEARANCE_MM + NAME_BOX_WIDTH_MM;
          const bottomStation = mm(placement.topStation - NAME_BOX_HEIGHT_MM);

          // Every corner of the box is inside the outline: the left corners (at halfWidthStart)
          // trivially are, since the right corners (at halfWidthStart + width) are — checked at
          // both the box's nose-most and tail-most station.
          expect(sampleOutline(geometry, placement.topStation)).toBeGreaterThanOrEqual(requiredHalfWidth);
          expect(sampleOutline(geometry, bottomStation)).toBeGreaterThanOrEqual(requiredHalfWidth);

          // The box stays within page 0's own bounds — never floating onto a neighbouring page.
          const page0 = layout.pages[0];
          expect(placement.topStation).toBeLessThanOrEqual(page0.stationRange[1]);
          expect(bottomStation).toBeGreaterThanOrEqual(page0.stationRange[0]);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the box's bottom edge clears the row-overlap band page 0 shares with the next page (defect 4 — furniture never overlaps a match mark's own band)",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          if (layout.rows <= 1) return; // no row-overlap band to clear on a single-row board

          const placement = nameBlockPlacement(layout, geometry);
          const bottomStation = placement.topStation - NAME_BOX_HEIGHT_MM;
          const page0 = layout.pages[0];
          expect(bottomStation).toBeGreaterThanOrEqual(page0.stationRange[0] + layout.overlap);
        },
      );
    });
  }
});
