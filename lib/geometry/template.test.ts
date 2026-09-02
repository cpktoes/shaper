import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { MEASURE_STATION_MM, buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import {
  MARK_LABEL_COLLISION_THRESHOLD_MM,
  NAME_BOX_CLEARANCE_MM,
  NAME_BOX_HEIGHT_MM,
  NAME_BOX_WIDTH_MM,
  TEMPLATE_OVERLAP_MM,
  computeTailClosure,
  computeTemplateLayout,
  computeTemplateMarks,
  markLineSegments,
  markPlacements,
  nameBlockPlacement,
  tailClosureSegments,
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

/**
 * Characterisation pin (quick task 260902-cj5) — written BEFORE any strip-layout code exists in
 * `lib/geometry/template.ts`, and never edited afterwards for the rest of that task. It exists so
 * the new Paper Saver strip work can never silently perturb the Overview Sheet's and the Full
 * Template's own tile-grid math: if the digest below ever changes, the strip work broke something
 * in the existing tiled layout and THAT is what must be fixed — never this test.
 *
 * One digest per (board preset x paper), over the combined JSON of every existing exported
 * function this file's own artifacts read from: `computeTemplateLayout`, `computeTemplateMarks`,
 * `markPlacements`, `markLineSegments`, `templatePageBoxes`, `computeTailClosure`,
 * `tailClosureSegments`, `nameBlockPlacement`. Only the first 16 hex characters of the sha256 are
 * kept — enough to catch any real change, short enough to read at a glance in a failure diff.
 */
describe("existing tile-grid output is unchanged by the strip work (characterisation pin, quick task 260902-cj5 — frozen, never edit)", () => {
  const EXPECTED_TILE_GRID_DIGESTS: Record<string, string> = {
    "shortboard-letter": "b44c287a1203b6e7",
    "shortboard-a4": "cd43ab684592226c",
    "fish-letter": "80dd9f2ae2cc89be",
    "fish-a4": "f8dfa62d670f076e",
    "midlength-letter": "c44a5c300a92802b",
    "midlength-a4": "e0ead812d01197aa",
    "longboard-letter": "a4c29bc92109c090",
    "longboard-a4": "365d2e5e1ba27b50",
  };

  for (const paper of PAPERS) {
    it.each(BOARD_PRESETS)(`$id (${paper}): tile-grid digest matches the pinned value`, (preset) => {
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, paper);
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);
      const lineSegments = markLineSegments(layout, marks, geometry);
      const boxes = templatePageBoxes(layout);
      const closure = computeTailClosure(geometry) ?? null;
      const closureSegments = closure ? tailClosureSegments(layout, closure) : [];
      const namePlacement = nameBlockPlacement(layout, geometry);

      const combined = {
        layout,
        marks,
        placements,
        lineSegments,
        boxes,
        closure,
        closureSegments,
        namePlacement,
      };
      const digest = createHash("sha256").update(JSON.stringify(combined)).digest("hex").slice(0, 16);

      const key = `${preset.id}-${paper}`;
      expect(digest).toBe(EXPECTED_TILE_GRID_DIGESTS[key]);
    });
  }
});

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
        "$id: the four base mark names, plus tailBlock only when this tail has a squared block, each on a valid page inside its stationRange — except when centre and widepoint coincide, which merges into a single 'center' placement (round 4 post-checkpoint fix, defect 1)",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const placements = markPlacements(layout, marks, geometry);

          const uniqueNames = new Set(placements.map((p) => p.mark));
          const centerWidepointCoincide = Math.abs(geometry.widePointStation - geometry.length / 2) < 1e-6;
          const expectedNames = new Set(["noseTwelve", "tailTwelve", "center"]);
          if (!centerWidepointCoincide) expectedNames.add("widepoint");
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

  describe(
    'CENTER/WIDEPOINT label collision (round 4 post-checkpoint fix, defect 1: "Center and widepoint dims overlap when close to eachother or equal")',
    () => {
      it("far apart (shortboard preset, -1in offset): both placements pass through with no labelOffsetMm nudge", () => {
        const preset = BOARD_PRESETS[0]; // shortboard — widePointOffset -1in
        const geometry = buildOutline(preset.outline);
        expect(Math.abs(geometry.widePointStation - geometry.length / 2)).toBeGreaterThan(
          MARK_LABEL_COLLISION_THRESHOLD_MM,
        );
        const layout = computeTemplateLayout(geometry, "letter");
        const marks = computeTemplateMarks(geometry);
        const placements = markPlacements(layout, marks, geometry);

        const center = placements.find((p) => p.mark === "center");
        const widepoint = placements.find((p) => p.mark === "widepoint");
        expect(center).toBeDefined();
        expect(widepoint).toBeDefined();
        expect(center!.labelOffsetMm).toBe(0);
        expect(widepoint!.labelOffsetMm).toBe(0);
        expect(center!.label).toBe("Centre");
        expect(widepoint!.label).toBe("Wide point");
      });

      it("close (a custom 5mm widepoint offset, inside the threshold but not zero): both placements stay, each nudged half the threshold apart in opposite directions", () => {
        const preset = BOARD_PRESETS[0];
        const geometry = buildOutline({ ...preset.outline, widePointOffset: mm(5) });
        const diff = Math.abs(geometry.widePointStation - geometry.length / 2);
        expect(diff).toBeGreaterThan(0);
        expect(diff).toBeLessThan(MARK_LABEL_COLLISION_THRESHOLD_MM);

        const layout = computeTemplateLayout(geometry, "letter");
        const marks = computeTemplateMarks(geometry);
        const placements = markPlacements(layout, marks, geometry);

        const center = placements.find((p) => p.mark === "center");
        const widepoint = placements.find((p) => p.mark === "widepoint");
        expect(center).toBeDefined();
        expect(widepoint).toBeDefined();
        expect(center!.labelOffsetMm).not.toBe(0);
        expect(widepoint!.labelOffsetMm).not.toBe(0);
        // Opposite directions, each half the threshold — a total separation of exactly the
        // threshold regardless of how small the true station difference is.
        expect(center!.labelOffsetMm).toBeCloseTo(-widepoint!.labelOffsetMm, 6);
        expect(Math.abs(center!.labelOffsetMm - widepoint!.labelOffsetMm)).toBeCloseTo(
          MARK_LABEL_COLLISION_THRESHOLD_MM,
          6,
        );
      });

      it("coincident (fish preset, 0in offset): merges into a single 'Widepoint / Center' placement, dropping the separate widepoint entry", () => {
        const preset = BOARD_PRESETS[1]; // fish — widePointOffset 0in
        const geometry = buildOutline(preset.outline);
        expect(geometry.widePointStation).toBe(mm(geometry.length / 2));

        const layout = computeTemplateLayout(geometry, "letter");
        const marks = computeTemplateMarks(geometry);
        const placements = markPlacements(layout, marks, geometry);

        expect(placements.some((p) => p.mark === "widepoint")).toBe(false);
        const merged = placements.find((p) => p.mark === "center");
        expect(merged).toBeDefined();
        expect(merged!.label).toBe("Widepoint / Center");
        expect(merged!.labelOffsetMm).toBe(0);
      });
    },
  );
});

describe(
  'computeTailClosure / tailClosureSegments (round 4 post-checkpoint fix, defect 2: "Swallow and diamond tail appears like a squash — it doesn\'t reflect the depth")',
  () => {
    it("is undefined for a pin or round tail — the curve already meets the stringer on its own", () => {
      const midlength = buildOutline(BOARD_PRESETS[2].outline); // midlength — round
      expect(midlength.halfTailBlockWidth).toBe(0);
      expect(computeTailClosure(midlength)).toBeUndefined();

      const pinTail = buildOutline({ ...BOARD_PRESETS[0].outline, tail: { kind: "pin" } });
      expect(computeTailClosure(pinTail)).toBeUndefined();
    });

    it("squash (shortboard preset): corner and tip share the same station — a straight cut across the tail, unchanged from before", () => {
      const geometry = buildOutline(BOARD_PRESETS[0].outline); // shortboard — squash
      const closure = computeTailClosure(geometry)!;
      expect(closure).toBeDefined();
      expect(closure.corner.station).toBe(closure.tip.station);
      expect(closure.corner.station).toBe(0);
      expect(closure.corner.halfWidth).toBeCloseTo(geometry.halfTailBlockWidth, 6);
      expect(closure.tip.halfWidth).toBe(0);
    });

    it('diamond: the tip (station 0) sits AFT of the corner (station = depth) — "the point extends aft of the tailblock corners"', () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        tail: { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) },
      });
      expect(geometry.tailPodStation).toBeGreaterThan(0);
      const closure = computeTailClosure(geometry)!;
      expect(closure).toBeDefined();
      expect(closure.corner.station).toBe(geometry.tailPodStation);
      expect(closure.tip.station).toBe(0);
      // The tip sits behind (a lower station than) the corner — the point extends aft.
      expect(closure.tip.station).toBeLessThan(closure.corner.station);
      expect(closure.corner.halfWidth).toBeCloseTo(geometry.halfTailBlockWidth, 6);
      expect(closure.tip.halfWidth).toBe(0);
    });

    it('swallow (fish preset): the notch point sits FORWARD of the corner (station 0) — "cut back toward the nose at the stringer"', () => {
      const geometry = buildOutline(BOARD_PRESETS[1].outline); // fish — swallow, crotchDepth 2.5in
      expect(geometry.centreCloseStation).toBeGreaterThan(0);
      const closure = computeTailClosure(geometry)!;
      expect(closure).toBeDefined();
      expect(closure.corner.station).toBe(0);
      expect(closure.tip.station).toBe(geometry.centreCloseStation);
      // The notch point sits ahead of (a higher station than) the corner — cut back toward the nose.
      expect(closure.tip.station).toBeGreaterThan(closure.corner.station);
      expect(closure.corner.halfWidth).toBeCloseTo(geometry.halfTailBlockWidth, 6);
      expect(closure.tip.halfWidth).toBe(0);
    });

    it.each(BOARD_PRESETS)(
      "$id: every clipped segment's endpoints land inside that segment's own page rectangle",
      (preset) => {
        const geometry = buildOutline(preset.outline);
        const closure = computeTailClosure(geometry);
        if (!closure) return; // pin/round — nothing to clip
        for (const paper of PAPERS) {
          const layout = computeTemplateLayout(geometry, paper);
          const segments = tailClosureSegments(layout, closure);
          expect(segments.length).toBeGreaterThan(0);
          for (const segment of segments) {
            const page = layout.pages[segment.pageIndex];
            for (const point of [segment.from, segment.to]) {
              expect(point.station).toBeGreaterThanOrEqual(page.stationRange[0] - 1e-6);
              expect(point.station).toBeLessThanOrEqual(page.stationRange[1] + 1e-6);
              expect(point.halfWidth).toBeGreaterThanOrEqual(page.halfWidthRange[0] - 1e-6);
              expect(point.halfWidth).toBeLessThanOrEqual(page.halfWidthRange[1] + 1e-6);
            }
          }
        }
      },
    );

    it("a wide diamond tail's closure crosses more than one column, and the union of segments spans the full corner-to-tip line with no gap", () => {
      const geometry = buildOutline({
        ...BOARD_PRESETS[0].outline,
        widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
        tail: { kind: "diamond", endWidth: inchesToMm(22), depth: inchesToMm(3) },
      });
      const layout = computeTemplateLayout(geometry, "letter");
      const closure = computeTailClosure(geometry)!;
      const segments = tailClosureSegments(layout, closure);

      const pageIndexes = new Set(segments.map((s) => s.pageIndex));
      expect(pageIndexes.size).toBeGreaterThan(1);

      // Every segment lies on the same corner-to-tip line — its own half-width is a linear
      // function of its own station, matching the true closure line's own slope.
      const dStation = closure.tip.station - closure.corner.station;
      const dHalfWidth = closure.tip.halfWidth - closure.corner.halfWidth;
      for (const segment of segments) {
        for (const point of [segment.from, segment.to]) {
          if (Math.abs(dStation) < 1e-6) continue; // vertical line, nothing to check
          const t = (point.station - closure.corner.station) / dStation;
          const expectedHalfWidth = closure.corner.halfWidth + t * dHalfWidth;
          expect(point.halfWidth).toBeCloseTo(expectedHalfWidth, 4);
        }
      }
    });
  },
);

describe(
  'markLineSegments (round 3 post-checkpoint fix, defect 1: "the station lines should terminate at the outline curve" — every mark\'s line spans stringer-to-curve, clipped per page, never past the curve into blank paper; round 4 post-checkpoint fix, defect 2: tailBlock no longer produces a segment here — its own true closing edge is `computeTailClosure`/`tailClosureSegments`, tested separately below)',
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
              (name) => marks[name] !== undefined && name !== "tailBlock",
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

        it.each(BOARD_PRESETS)("$id: never emits a tailBlock segment, even for a squash-tail preset that has the mark", (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeTemplateLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const segments = markLineSegments(layout, marks, geometry);

          expect(segments.some((s) => s.mark === "tailBlock")).toBe(false);
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

      it("clamps the fallback to page 0's own printable range when the box is taller than the entire available band (WR-01/WR-03 regression: the fallback used to overrun the page)", () => {
        // No BOARD_PRESETS case has a nose narrow enough to reach the "no station band clears the
        // box" fallback branch at all (every preset's own nose is wide enough somewhere on page 0),
        // so this drives into that unexercised branch directly by handing nameBlockPlacement a
        // caller-supplied box height taller than page 0's entire station range — the same
        // "unusually narrow-nosed board" fallback path, forced without needing an extreme outline.
        const preset = BOARD_PRESETS[0];
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const page0 = layout.pages[0];
        const oversizedBoxHeightMm = page0.stationRange[1] - page0.stationRange[0] + 1000;

        const placement = nameBlockPlacement(layout, geometry, NAME_BOX_WIDTH_MM, oversizedBoxHeightMm);

        // The box's nose-most edge must stay inside page 0's own printable station range — before
        // the fix this could exceed searchCeiling and sit partly or fully off the sheet.
        const searchCeiling = Math.min(page0.stationRange[1], geometry.length);
        expect(placement.topStation).toBeLessThanOrEqual(searchCeiling);
        expect(placement.topStation).toBe(searchCeiling);
      });
    });
  }
});
