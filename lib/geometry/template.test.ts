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
  markLineSegments,
  markPlacements,
  nameBlockPlacement,
  type PaperSize,
  type TemplateLayout,
  type TemplateMarks,
  templatePageBoxes,
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

describe(
  'markLineSegments (round 3 post-checkpoint fix, defect 1: "the station lines should terminate at the outline curve" — every mark\'s line spans stringer-to-curve, clipped per page, never past the curve into blank paper)',
  () => {
    for (const paper of PAPERS) {
      describe(paper, () => {
        it.each(BOARD_PRESETS)(
          "$id: every mark's segments start at the stringer (half-width 0) and the last one stops exactly at the curve's own half-width extent, with no gap left uncovered",
          (preset) => {
            const geometry = buildOutline(preset.outline);
            const layout = computeTemplateLayout(geometry, paper);
            const marks = computeTemplateMarks(geometry);
            const segments = markLineSegments(layout, marks, geometry);

            const markNames = (Object.keys(marks) as (keyof TemplateMarks)[]).filter(
              (name) => marks[name] !== undefined,
            );
            expect(markNames.length).toBeGreaterThan(0);

            for (const markName of markNames) {
              const markSegments = segments
                .filter((s) => s.mark === markName)
                .sort((a, b) => a.halfWidthRange[0] - b.halfWidthRange[0]);
              expect(markSegments.length).toBeGreaterThan(0);

              expect(markSegments[0].halfWidthRange[0]).toBeCloseTo(0, 6);
              const last = markSegments[markSegments.length - 1];
              expect(last.halfWidthRange[1]).toBeCloseTo(last.halfWidthExtent, 6);
              // Never runs past the curve.
              for (const segment of markSegments) {
                expect(segment.halfWidthRange[1]).toBeLessThanOrEqual(segment.halfWidthExtent + 1e-6);
              }
              // No gap between consecutive segments (adjacent pages overlap, never skip a strip).
              for (let i = 0; i < markSegments.length - 1; i++) {
                expect(markSegments[i + 1].halfWidthRange[0]).toBeLessThanOrEqual(markSegments[i].halfWidthRange[1] + 1e-6);
              }
            }
          },
        );

        it.each(BOARD_PRESETS)("$id: exactly the column-0 segment carries hasLabel=true for every mark", (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const segments = markLineSegments(layout, marks, geometry);

          const labeled = segments.filter((s) => s.hasLabel);
          expect(labeled.length).toBeGreaterThan(0);
          for (const segment of labeled) {
            expect(layout.pages[segment.pageIndex].col).toBe(0);
          }
        });
      });
    }

    it("a maximum-widepoint-width board's widepoint line crosses more than one page — the exact bug the user reported (\"don't extend to the edge\")", () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
      });
      const layout = computeTemplateLayout(geometry, "letter");
      expect(layout.columns).toBeGreaterThan(1);
      const marks = computeTemplateMarks(geometry);
      const segments = markLineSegments(layout, marks, geometry).filter((s) => s.mark === "widepoint");

      expect(segments.length).toBeGreaterThan(1);
      const pageIndexes = new Set(segments.map((s) => s.pageIndex));
      expect(pageIndexes.size).toBeGreaterThan(1);

      // The union of segments, in ascending order, covers [0, halfWidthExtent] with no gap.
      const sorted = segments.slice().sort((a, b) => a.halfWidthRange[0] - b.halfWidthRange[0]);
      expect(sorted[0].halfWidthRange[0]).toBeCloseTo(0, 6);
      expect(sorted[sorted.length - 1].halfWidthRange[1]).toBeCloseTo(sorted[0].halfWidthExtent, 6);
    });
  },
);

describe(
  "templatePageBoxes (round 2 post-checkpoint fix, defect 2: match-mark crosshairs replaced by a page-border box, per the iShaper reference)",
  () => {
    for (const paper of PAPERS) {
      describe(paper, () => {
        it.each(BOARD_PRESETS)("$id: no match marks — every page emits exactly one box, nested inside its own printable range", (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const boxes = templatePageBoxes(layout);

          expect(boxes.length).toBe(layout.pages.length);
          boxes.forEach((box, i) => {
            const page = layout.pages[i];
            expect(box.pageIndex).toBe(page.index);
            expect(box.stationRange[0]).toBeGreaterThanOrEqual(page.stationRange[0]);
            expect(box.stationRange[1]).toBeLessThanOrEqual(page.stationRange[1]);
            expect(box.halfWidthRange[0]).toBeGreaterThanOrEqual(page.halfWidthRange[0]);
            expect(box.halfWidthRange[1]).toBeLessThanOrEqual(page.halfWidthRange[1]);
          });
        });

        it.each(BOARD_PRESETS)("$id: stringerEdge is true only for column-0 pages", (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const boxes = templatePageBoxes(layout);

          boxes.forEach((box) => {
            const page = layout.pages[box.pageIndex];
            expect(box.stringerEdge).toBe(page.col === 0);
          });
        });

        it.each(BOARD_PRESETS)(
          "$id: on any side with a neighbour, the box line is inset from the page's own printable edge by exactly layout.overlap; flush with the edge otherwise",
          (preset) => {
            const geometry = buildOutline(preset.outline);
            const layout = computeTemplateLayout(geometry, paper);
            const boxes = templatePageBoxes(layout);

            boxes.forEach((box) => {
              const page = layout.pages[box.pageIndex];

              const expectedTop = page.row > 0 ? page.stationRange[1] - layout.overlap : page.stationRange[1];
              const expectedBottom = page.row < layout.rows - 1 ? page.stationRange[0] + layout.overlap : page.stationRange[0];
              const expectedLeft = page.col > 0 ? page.halfWidthRange[0] + layout.overlap : page.halfWidthRange[0];
              const expectedRight = page.col < layout.columns - 1 ? page.halfWidthRange[1] - layout.overlap : page.halfWidthRange[1];

              expect(box.stationRange[1]).toBeCloseTo(expectedTop, 6);
              expect(box.stationRange[0]).toBeCloseTo(expectedBottom, 6);
              expect(box.halfWidthRange[0]).toBeCloseTo(expectedLeft, 6);
              expect(box.halfWidthRange[1]).toBeCloseTo(expectedRight, 6);
            });
          },
        );
      });

      it(`${paper}: adjacent pages' own printable ranges still overlap by exactly TEMPLATE_OVERLAP_MM — the box lines mark that shared strip, the underlying tile overlap is unchanged`, () => {
        const geometry = buildOutline({
          ...BOARD_PRESETS[0].outline,
          widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
        });
        const layout = computeTemplateLayout(geometry, paper);
        expect(layout.overlap).toBe(TEMPLATE_OVERLAP_MM);
        expect(layout.columns).toBeGreaterThan(1);

        // Row-adjacent (column 0): a page with a tail neighbour has a box bottom line strictly
        // inside its own printable bottom edge — the strip below it is the duplicate zone the
        // curve still draws into (never clipped to the box).
        if (layout.rows > 1) {
          const page = layout.pages.find((p) => p.row === 0 && p.col === 0)!;
          const box = templatePageBoxes(layout).find((b) => b.pageIndex === page.index)!;
          expect(box.stationRange[0]).toBeGreaterThan(page.stationRange[0]);
        }

        // Column-adjacent: a page with an outward neighbour has a box right line strictly inside
        // its own printable right edge.
        const pageA = layout.pages.find((p) => p.col === 0 && p.row === 0)!;
        const boxA = templatePageBoxes(layout).find((b) => b.pageIndex === pageA.index)!;
        expect(boxA.halfWidthRange[1]).toBeLessThan(pageA.halfWidthRange[1]);
      });
    }
  },
);

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
