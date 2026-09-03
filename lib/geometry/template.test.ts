import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN, WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { MEASURE_STATION_MM, buildOutline, sampleOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import {
  MARK_LABEL_COLLISION_THRESHOLD_MM,
  NAME_BOX_CLEARANCE_MM,
  NAME_BOX_HEIGHT_MM,
  NAME_BOX_WIDTH_MM,
  PAPER_MM,
  STRIP_FURNITURE_NUMERAL_GAP_MM,
  STRIP_FURNITURE_ROW_GAP_MM,
  STRIP_LABEL_INTERIOR_GAP_MM,
  STRIP_LABEL_MIN_SEPARATION_MM,
  STRIP_NUMERAL_STRINGER_GAP_MM,
  STRIP_RAIL_INSET_MM,
  TEMPLATE_MARGIN_MM,
  TEMPLATE_OVERLAP_MM,
  computeStripLayout,
  computeTailClosure,
  computeTemplateLayout,
  computeTemplateMarks,
  markLineSegments,
  markPlacements,
  nameBlockPlacement,
  stripFurniture,
  stripLabelRows,
  stripMarkSegments,
  stripRegistrationLines,
  tailClosureSegments,
  type PaperSize,
  type StripFurniturePlacement,
  type TemplateLayout,
  type TemplateMarks,
  templatePageBoxes,
} from "./template";
import { degrees, formatInchesFraction, inchesToMm, mm } from "./units";

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

/**
 * Characterisation pin (quick task 260903-18d, Task 1) — captured from
 * `lib/geometry/template.ts` exactly as it stood BEFORE this task's two-sided (curve-side plus
 * stringer-side) name-block clearance change touched a single line of source, and never edited
 * for the rest of this task. It hashes the SEVEN tile-grid functions the cj5 pin above ALSO
 * covers, minus `nameBlockPlacement` — the one function this task deliberately changes on the
 * founder's instruction (give the block 4mm of clearance on the curve side, matching the
 * stringer side it already has).
 *
 * This pin's green, held through Task 2 without being edited, is the proof that recapturing the
 * cj5 pin's eight digests in Task 2 is a name-block move and not a tile-grid regression — the
 * whole point of `design_decision` §1 of this task's plan: split the proof from the pin, then
 * recapture, never overwrite on trust. Without a digest captured before the source moved, "the
 * other seven are fine" would be a claim, not a fact.
 *
 * Captured via: `git diff --quiet lib/geometry/template.ts && git diff --cached --quiet
 * lib/geometry/template.ts` (both exited 0 — the module was provably untouched), then
 * `npx vitest run lib/geometry/template.test.ts` with this digest map empty, reading the eight
 * actual digests out of the failure output and pasting them in below.
 *
 * A characterisation digest has no closed form to derive it from — capturing the current output
 * IS its definition — so this one narrow hand-transcription is a deliberate, documented exception
 * to CLAUDE.md Rule 1's "never hand-transcribe an expected number." Rule 1's prohibition governs
 * geometry FORMULA values, whose authority is the prototype's own fixtures; it was never meant to
 * forbid the one kind of number that only exists as "whatever the unmodified code produced."
 */
describe(
  "existing seven-of-eight tile-grid functions are unchanged by the two-sided clearance work (characterisation pin, quick task 260903-18d, Task 1 — frozen, never edit)",
  () => {
    const EXPECTED_SEVEN_FUNCTION_DIGESTS: Record<string, string> = {
      "shortboard-letter": "5f124970774b6dd7",
      "shortboard-a4": "51fab7d7595ab86e",
      "fish-letter": "b4b8f5d3079c3fdd",
      "fish-a4": "35a80421f8529063",
      "midlength-letter": "64cdca8ff6c905ee",
      "midlength-a4": "f35fc384265d9c84",
      "longboard-letter": "bafd881a02437fc0",
      "longboard-a4": "7c1eb57da94e799b",
    };

    for (const paper of PAPERS) {
      it.each(BOARD_PRESETS)(`$id (${paper}): seven-function tile-grid digest matches the pinned value`, (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeTemplateLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const placements = markPlacements(layout, marks, geometry);
        const lineSegments = markLineSegments(layout, marks, geometry);
        const boxes = templatePageBoxes(layout);
        const closure = computeTailClosure(geometry) ?? null;
        const closureSegments = closure ? tailClosureSegments(layout, closure) : [];
        // namePlacement deliberately excluded — nameBlockPlacement is the one function this task
        // changes; this pin exists to prove the other seven did not move.

        const combined = {
          layout,
          marks,
          placements,
          lineSegments,
          boxes,
          closure,
          closureSegments,
        };
        const digest = createHash("sha256").update(JSON.stringify(combined)).digest("hex").slice(0, 16);

        const key = `${preset.id}-${paper}`;
        expect(digest).toBe(EXPECTED_SEVEN_FUNCTION_DIGESTS[key]);
      });
    }
  },
);

/**
 * Characterisation pin (quick task 260902-kon) — written BEFORE this task's name-block placement
 * scan touches lib/geometry/template.ts, and never edited afterwards for the rest of this task. It
 * exists so moving the board name + dims block inside the outline can never silently perturb
 * anything else the Paper Saver strip already draws: if the digest below ever changes, this task
 * broke something in the strip's own unrelated maths — station bands, sideways slides,
 * stringer-on-page flags, numeral columns, numeral stations, registration lines and their labels,
 * mark segments, or label-row baselines — and THAT is what must be fixed, never this test.
 *
 * One digest per (board preset x paper), over `computeStripLayout`'s full page list (station
 * ranges, half-width ranges, min and max half-widths, stringerOnPage, pageNumberHalfWidth,
 * pageNumber, pageNumberStation) plus `stripRegistrationLines`, `stripMarkSegments` and
 * `stripLabelRows` — every strip function whose output must stay byte-identical. Only the first
 * 16 hex characters of the sha256 are kept, matching the sibling tile-grid pin above.
 *
 * Separately, and in this same frozen describe block, the 2in scale square's own `topStation` and
 * `halfWidthStart` are pinned as LITERAL expected numbers per preset x paper — read straight out
 * of the unmodified `stripPageZeroFurniture`, not folded into the digest. Task 2 renames that
 * function and changes its signature, so a digest over its whole return value would have to be
 * re-captured after the very change this pin exists to check; these two literals per preset x
 * paper survive the signature change intact and are what proves the founder's ruling — "the 2in
 * box is good" — held after the name block moved. These two numbers are the founder's locked
 * constraint, not an implementation detail: they must never change as a result of this task.
 */
describe("Paper Saver strip output is unchanged by the name-block move (characterisation pin, quick task 260902-kon — frozen, never edit)", () => {
  const STRIP_FURNITURE_SIZES = {
    scaleSquareMm: inchesToMm(2),
    nameBoxWidthMm: NAME_BOX_WIDTH_MM,
    nameBoxHeightMm: NAME_BOX_HEIGHT_MM,
  };

  const EXPECTED_STRIP_DIGESTS: Record<string, string> = {
    "shortboard-letter": "8db3300a9fe73343",
    "fish-letter": "5fc398236102754d",
    "midlength-letter": "b519d5721ae9fce2",
    "longboard-letter": "31f93c1bece999bb",
    "shortboard-a4": "4b3eaa420dd33e68",
    "fish-a4": "324dafca30f44e27",
    "midlength-a4": "d84b5dceca37f0f9",
    "longboard-a4": "9812a910f1b136cb",
  };

  const EXPECTED_SCALE_SQUARE: Record<string, { topStation: number; halfWidthStart: number }> = {
    "shortboard-letter": { topStation: 1879.6, halfWidthStart: 195.89999999999998 },
    "fish-letter": { topStation: 1676.3999999999999, halfWidthStart: 195.89999999999998 },
    "midlength-letter": { topStation: 2133.6, halfWidthStart: 195.89999999999998 },
    "longboard-letter": { topStation: 2743.2, halfWidthStart: 195.89999999999998 },
    "shortboard-a4": { topStation: 1879.6, halfWidthStart: 213.5 },
    "fish-a4": { topStation: 1676.3999999999999, halfWidthStart: 213.5 },
    "midlength-a4": { topStation: 2133.6, halfWidthStart: 213.5 },
    "longboard-a4": { topStation: 2743.2, halfWidthStart: 213.5 },
  };

  for (const paper of PAPERS) {
    it.each(BOARD_PRESETS)(`$id (${paper}): strip digest matches the pinned value`, (preset) => {
      const geometry = buildOutline(preset.outline);
      const layout = computeStripLayout(geometry, paper);
      const marks = computeTemplateMarks(geometry);

      const pages = layout.pages.map((page) => ({
        stationRange: page.stationRange,
        halfWidthRange: page.halfWidthRange,
        minHalfWidth: page.minHalfWidth,
        maxHalfWidth: page.maxHalfWidth,
        stringerOnPage: page.stringerOnPage,
        pageNumberHalfWidth: page.pageNumberHalfWidth,
        pageNumber: page.pageNumber,
        pageNumberStation: page.pageNumberStation,
      }));
      const lines = stripRegistrationLines(layout, geometry);
      const segments = stripMarkSegments(layout, marks, geometry);
      const rows = stripLabelRows(layout, marks, geometry);

      const combined = { pages, lines, segments, rows };
      const digest = createHash("sha256").update(JSON.stringify(combined)).digest("hex").slice(0, 16);

      const key = `${preset.id}-${paper}`;
      expect(digest).toBe(EXPECTED_STRIP_DIGESTS[key]);
    });

    it.each(BOARD_PRESETS)(
      `$id (${paper}): the 2in scale square's topStation and halfWidthStart are the founder's locked constraint — literal numbers, not a digest`,
      (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const labelRows = stripLabelRows(layout, marks, geometry);
        const furniture = stripFurniture(layout, geometry, labelRows, STRIP_FURNITURE_SIZES);

        const key = `${preset.id}-${paper}`;
        const expected = EXPECTED_SCALE_SQUARE[key];
        expect(furniture.scaleSquare.pageIndex).toBe(0);
        expect(furniture.scaleSquare.topStation).toBeCloseTo(expected.topStation, 6);
        expect(furniture.scaleSquare.halfWidthStart).toBeCloseTo(expected.halfWidthStart, 6);
      },
    );
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

/**
 * Paper Saver strip tests (quick task 260902-cj5). Every expected value below is derived — from
 * `PAPER_MM` and the existing constants, from the sampled geometry itself via `sampleOutline`, or
 * from a `formatInchesFraction` call made in the test — never a hand-typed millimetre or inch
 * figure, per CLAUDE.md Rule 1.
 */
describe("computeStripLayout", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: every sampled outline point's station falls inside at least one page's own station band",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const uncovered = geometry.points.filter(
            (point) =>
              !layout.pages.some(
                (page) => point.station >= page.stationRange[0] && point.station <= page.stationRange[1],
              ),
          );
          expect(uncovered).toEqual([]);
        },
      );

      it.each(BOARD_PRESETS)("$id: consecutive pages overlap by exactly TEMPLATE_OVERLAP_MM", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        for (let i = 0; i < layout.pages.length - 1; i++) {
          const overlap = overlapLength(layout.pages[i].stationRange, layout.pages[i + 1].stationRange);
          expect(Math.abs(overlap - TEMPLATE_OVERLAP_MM)).toBeLessThan(TOLERANCE_MM);
        }
      });

      it.each(BOARD_PRESETS)("$id: page 0's stationRange[1] equals geometry.length exactly (nose first)", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        expect(layout.pages[0].stationRange[1]).toBe(geometry.length);
      });

      it.each(BOARD_PRESETS)(
        "$id: usableStation is the paper's own SHORT edge minus two margins; usableHalfWidth is the LONG edge minus two margins",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const paperDims = PAPER_MM[paper];
          expect(layout.usableStation).toBeCloseTo(paperDims.width - 2 * TEMPLATE_MARGIN_MM, 6);
          expect(layout.usableHalfWidth).toBeCloseTo(paperDims.height - 2 * TEMPLATE_MARGIN_MM, 6);
        },
      );

      it.each(BOARD_PRESETS)("$id: every page's halfWidthRange is exactly usableHalfWidth wide", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        for (const page of layout.pages) {
          expect(page.halfWidthRange[1] - page.halfWidthRange[0]).toBeCloseTo(layout.usableHalfWidth, 6);
        }
      });

      it.each(BOARD_PRESETS)(
        "$id: the slide obeys its two arms — pinned to the stringer side when the board fits across the page, pinned to the curve's own outer edge otherwise",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const threshold = layout.usableHalfWidth - 2 * STRIP_RAIL_INSET_MM;
          for (const page of layout.pages) {
            if (page.maxHalfWidth <= threshold) {
              expect(page.halfWidthRange[0]).toBeCloseTo(-STRIP_RAIL_INSET_MM, 6);
            } else {
              expect(page.halfWidthRange[1]).toBeCloseTo(page.maxHalfWidth + STRIP_RAIL_INSET_MM, 6);
            }
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: stringerOnPage is true iff halfWidthRange[0] <= 0, and it is true for the nose page and the tail page",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          for (const page of layout.pages) {
            expect(page.stringerOnPage).toBe(page.halfWidthRange[0] <= 0);
          }
          expect(layout.pages[0].stringerOnPage).toBe(true);
          expect(layout.pages[layout.pages.length - 1].stringerOnPage).toBe(true);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: pageNumberHalfWidth sits STRIP_NUMERAL_STRINGER_GAP_MM to the right of the stringer when it prints on the page, otherwise it equals the page's own left printable edge (fix round 1, quick task 260902-cj5 — the numeral must clear the stringer)",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          for (const page of layout.pages) {
            if (page.stringerOnPage) {
              expect(page.pageNumberHalfWidth).toBeCloseTo(STRIP_NUMERAL_STRINGER_GAP_MM, 6);
              // The numeral column must not slide back onto or past the stringer itself.
              expect(page.pageNumberHalfWidth).toBeGreaterThan(0);
            } else {
              expect(page.pageNumberHalfWidth).toBeCloseTo(page.halfWidthRange[0], 6);
            }
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: non-stringer pages keep the numeral at the page's own left printable edge, byte-identical to before this fix",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          for (const page of layout.pages) {
            if (!page.stringerOnPage) {
              expect(page.pageNumberHalfWidth).toBe(page.halfWidthRange[0]);
            }
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the widepoint's own page has no stringer whenever the widepoint's half-width pushes halfWidthStart above zero (max + inset > usableHalfWidth)",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          // stringerOnPage flips to false only once halfWidthStart = max + inset - usableHalfWidth
          // clears zero — a stricter bound than the two-arm selection threshold above (which only
          // decides which FORMULA applies, not whether the result is still <= 0).
          const noStringerThreshold = layout.usableHalfWidth - STRIP_RAIL_INSET_MM;
          if (geometry.halfWidePointWidth <= noStringerThreshold) return; // this preset's widepoint still prints the stringer

          const widepointPage = layout.pages.find(
            (page) =>
              geometry.widePointStation >= page.stationRange[0] && geometry.widePointStation <= page.stationRange[1],
          )!;
          expect(widepointPage).toBeDefined();
          expect(widepointPage.stringerOnPage).toBe(false);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the whole curve stays on the paper — minHalfWidth/maxHalfWidth never fall outside the page's own slid window",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          for (const page of layout.pages) {
            expect(page.minHalfWidth).toBeGreaterThanOrEqual(page.halfWidthRange[0] - TOLERANCE_MM);
            expect(page.maxHalfWidth).toBeLessThanOrEqual(page.halfWidthRange[1] + TOLERANCE_MM);
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the strip uses strictly fewer pages than the tiled template for the same board and paper — the paper saving, measured rather than claimed",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const stripLayout = computeStripLayout(geometry, paper);
          const tiledLayout = computeTemplateLayout(geometry, paper);
          expect(stripLayout.pages.length).toBeLessThan(tiledLayout.pages.length);
        },
      );
    });

    it(`${paper}: the whole curve stays on the paper at both ends of WIDEPOINT_WIDTH_RANGE_IN`, () => {
      for (const widePointWidthIn of [WIDEPOINT_WIDTH_RANGE_IN.min, WIDEPOINT_WIDTH_RANGE_IN.max]) {
        const geometry = buildOutline({
          ...BOARD_PRESETS[0].outline,
          widePointWidth: inchesToMm(widePointWidthIn),
        });
        const layout = computeStripLayout(geometry, paper);
        for (const page of layout.pages) {
          expect(page.minHalfWidth).toBeGreaterThanOrEqual(page.halfWidthRange[0] - TOLERANCE_MM);
          expect(page.maxHalfWidth).toBeLessThanOrEqual(page.halfWidthRange[1] + TOLERANCE_MM);
        }
      }
    });
  }
});

describe("stripRegistrationLines", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: page 0 has exactly one line (edge: tail), the last page exactly one (edge: nose), every interior page exactly two",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const lines = stripRegistrationLines(layout, geometry);
          const lastIndex = layout.pages.length - 1;

          for (const page of layout.pages) {
            const onPage = lines.filter((line) => line.pageIndex === page.index);
            if (page.index === 0) {
              expect(onPage.length).toBe(1);
              expect(onPage[0].edge).toBe("tail");
            } else if (page.index === lastIndex) {
              expect(onPage.length).toBe(1);
              expect(onPage[0].edge).toBe("nose");
            } else {
              expect(onPage.length).toBe(2);
            }
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: page N's tail line and page N+1's nose line share the identical station and the identical label — the mechanism, not a coincidence",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const lines = stripRegistrationLines(layout, geometry);

          for (let i = 0; i < layout.pages.length - 1; i++) {
            const tailLine = lines.find((line) => line.pageIndex === layout.pages[i].index && line.edge === "tail")!;
            const noseLine = lines.find(
              (line) => line.pageIndex === layout.pages[i + 1].index && line.edge === "nose",
            )!;
            expect(tailLine).toBeDefined();
            expect(noseLine).toBeDefined();
            expect(noseLine.station).toBe(tailLine.station);
            expect(noseLine.label).toBe(tailLine.label);
          }
        },
      );

      it.each(BOARD_PRESETS)("$id: every line's station lies strictly inside (0, geometry.length)", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const lines = stripRegistrationLines(layout, geometry);
        for (const line of lines) {
          expect(line.station).toBeGreaterThan(0);
          expect(line.station).toBeLessThan(geometry.length);
        }
      });

      it.each(BOARD_PRESETS)(
        "$id: every line's halfWidth equals sampleOutline at its own station, and its label is built from formatInchesFraction, never a typed string",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const lines = stripRegistrationLines(layout, geometry);
          for (const line of lines) {
            expect(line.halfWidth).toBe(sampleOutline(geometry, line.station));
            expect(line.label).toBe(
              `${formatInchesFraction(line.station)} from tail — rail ${formatInchesFraction(line.halfWidth)}`,
            );
          }
        },
      );
    });
  }
});

describe("stripMarkSegments", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: a mark's tick appears on every page whose station band contains it, matching markPlacements' own behaviour",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const segments = stripMarkSegments(layout, marks, geometry);

          const markNames = (Object.keys(marks) as (keyof TemplateMarks)[]).filter(
            (name) => marks[name] !== undefined,
          );
          for (const markName of markNames) {
            const station = marks[markName]!;
            const expectedPages = layout.pages
              .filter((page) => station >= page.stationRange[0] && station <= page.stationRange[1])
              .map((page) => page.index)
              .sort((a, b) => a - b);
            const actualPages = segments
              .filter((segment) => segment.mark === markName)
              .map((segment) => segment.pageIndex)
              .sort((a, b) => a - b);
            expect(actualPages).toEqual(expectedPages);
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: every segment's halfWidthRange is clipped to its own page's slid window and is never empty",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const segments = stripMarkSegments(layout, marks, geometry);

          for (const segment of segments) {
            const page = layout.pages[segment.pageIndex];
            expect(segment.halfWidthRange[0]).toBeCloseTo(Math.max(0, page.halfWidthRange[0]), 6);
            expect(segment.halfWidthRange[1]).toBeCloseTo(Math.min(segment.halfWidthExtent, page.halfWidthRange[1]), 6);
            expect(segment.halfWidthRange[1]).toBeGreaterThan(segment.halfWidthRange[0]);
          }
        },
      );

      it.each(BOARD_PRESETS)("$id: halfWidthExtent equals sampleOutline at the mark's own station", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const segments = stripMarkSegments(layout, marks, geometry);
        for (const segment of segments) {
          expect(segment.halfWidthExtent).toBe(sampleOutline(geometry, segment.station));
        }
      });

      it.each(BOARD_PRESETS)("$id: tailBlock only appears when this tail actually has a squared block", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const segments = stripMarkSegments(layout, marks, geometry);
        const hasTailBlockSegment = segments.some((segment) => segment.mark === "tailBlock");
        expect(hasTailBlockSegment).toBe(geometry.halfTailBlockWidth > 0);
      });
    });
  }
});

describe("stripLabelRows", () => {
  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: every registration line and every mark segment produces exactly one row per page",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const lines = stripRegistrationLines(layout, geometry);
          const segments = stripMarkSegments(layout, marks, geometry);
          const rows = stripLabelRows(layout, marks, geometry);

          expect(rows.length).toBe(lines.length + segments.length);
          expect(rows.filter((row) => row.kind === "registration").length).toBe(lines.length);
          expect(rows.filter((row) => row.kind === "mark").length).toBe(segments.length);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: no two rows on the same page have baseline stations closer than STRIP_LABEL_MIN_SEPARATION_MM",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const rows = stripLabelRows(layout, marks, geometry);

          const byPage = new Map<number, typeof rows>();
          for (const row of rows) {
            const list = byPage.get(row.pageIndex);
            if (list) list.push(row);
            else byPage.set(row.pageIndex, [row]);
          }
          for (const pageRows of byPage.values()) {
            for (let i = 0; i < pageRows.length; i++) {
              for (let j = i + 1; j < pageRows.length; j++) {
                const distance = Math.abs(pageRows[i].baselineStation - pageRows[j].baselineStation);
                expect(distance).toBeGreaterThanOrEqual(STRIP_LABEL_MIN_SEPARATION_MM - TOLERANCE_MM);
              }
            }
          }
        },
      );

      it.each(BOARD_PRESETS)("$id: every row's baseline station lies inside its own page's stationRange", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const rows = stripLabelRows(layout, marks, geometry);
        for (const row of rows) {
          const page = layout.pages[row.pageIndex];
          expect(row.baselineStation).toBeGreaterThanOrEqual(page.stationRange[0] - TOLERANCE_MM);
          expect(row.baselineStation).toBeLessThanOrEqual(page.stationRange[1] + TOLERANCE_MM);
        }
      });

      it.each(BOARD_PRESETS)(
        "$id: no registration row was moved — its baseline equals its own line's station offset by the fixed interior gap, with no de-collision nudge",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const lines = stripRegistrationLines(layout, geometry);
          const rows = stripLabelRows(layout, marks, geometry);

          for (const line of lines) {
            const row = rows.find(
              (r) => r.kind === "registration" && r.pageIndex === line.pageIndex && r.text === line.label,
            )!;
            expect(row).toBeDefined();
            const expectedBaseline =
              line.edge === "nose" ? line.station - STRIP_LABEL_INTERIOR_GAP_MM : line.station + STRIP_LABEL_INTERIOR_GAP_MM;
            expect(row.baselineStation).toBeCloseTo(expectedBaseline, 6);
          }
        },
      );
    });
  }

  it("a mark placed within 1mm of a registration line's own station moves the MARK, leaving the registration row's baseline unchanged", () => {
    const preset = BOARD_PRESETS[3]; // longboard — the longest board, the most pages to pick a boundary from
    const geometry = buildOutline(preset.outline);
    const layout = computeStripLayout(geometry, "letter");
    const lines = stripRegistrationLines(layout, geometry);
    const targetLine = lines[0];

    const marks = computeTemplateMarks(geometry);
    const constructedMarks: TemplateMarks = { ...marks, center: mm(targetLine.station + 0.5) };

    const rows = stripLabelRows(layout, constructedMarks, geometry);
    const registrationRow = rows.find(
      (row) => row.kind === "registration" && row.pageIndex === targetLine.pageIndex && row.text === targetLine.label,
    )!;
    expect(registrationRow).toBeDefined();
    const expectedRegistrationBaseline =
      targetLine.edge === "nose"
        ? targetLine.station - STRIP_LABEL_INTERIOR_GAP_MM
        : targetLine.station + STRIP_LABEL_INTERIOR_GAP_MM;
    expect(registrationRow.baselineStation).toBeCloseTo(expectedRegistrationBaseline, 6);

    const centerRow = rows.find(
      (row) => row.kind === "mark" && row.pageIndex === targetLine.pageIndex && row.text.startsWith("Centre"),
    );
    expect(centerRow).toBeDefined();

    // The mark's own DEFAULT position ("just above its tick") would collide with the pinned
    // registration row we constructed it to sit within 1mm of — confirm it moved off that default
    // rather than reading on top of the registration row.
    const defaultBaseline = constructedMarks.center + STRIP_LABEL_INTERIOR_GAP_MM;
    expect(centerRow!.baselineStation).not.toBeCloseTo(defaultBaseline, 6);
    expect(Math.abs(centerRow!.baselineStation - registrationRow.baselineStation)).toBeGreaterThanOrEqual(
      STRIP_LABEL_MIN_SEPARATION_MM - TOLERANCE_MM,
    );
  });
});

/** Every strip furniture rectangle is checked against ITS OWN page — a page-aware replacement for
 * the old page-0-only rectangle helper below (quick task 260902-kon: the name block can now land
 * on a page other than the scale square's). */
function pageRectContains(
  page: { stationRange: readonly [number, number]; halfWidthRange: readonly [number, number] },
  placement: StripFurniturePlacement,
  width: number,
  height: number,
): void {
  expect(placement.halfWidthStart).toBeGreaterThanOrEqual(page.halfWidthRange[0] - TOLERANCE_MM);
  expect(placement.halfWidthStart + width).toBeLessThanOrEqual(page.halfWidthRange[1] + TOLERANCE_MM);
  expect(placement.topStation - height).toBeGreaterThanOrEqual(page.stationRange[0] - TOLERANCE_MM);
  expect(placement.topStation).toBeLessThanOrEqual(page.stationRange[1] + TOLERANCE_MM);
}

describe("stripFurniture", () => {
  const SIZES = {
    scaleSquareMm: inchesToMm(2),
    nameBoxWidthMm: NAME_BOX_WIDTH_MM,
    nameBoxHeightMm: NAME_BOX_HEIGHT_MM,
  };
  const SCALE_SQUARE_FULL_HEIGHT_MM = SIZES.scaleSquareMm + 6; // matches the drawing module's own caption reserve

  for (const paper of PAPERS) {
    describe(paper, () => {
      it.each(BOARD_PRESETS)(
        "$id: the scale square's arithmetic is untouched — pageIndex 0, anchored to page 0's own printable top-right corner",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
          const page0 = layout.pages[0];

          expect(furniture.scaleSquare.pageIndex).toBe(0);
          expect(furniture.scaleSquare.topStation).toBeCloseTo(page0.stationRange[1], 6);
          expect(furniture.scaleSquare.halfWidthStart).toBeCloseTo(page0.halfWidthRange[1] - SIZES.scaleSquareMm, 6);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the scale square is fully inside page 0's own printable rectangle, entirely outboard of the outline",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
          const page0 = layout.pages[0];

          pageRectContains(page0, furniture.scaleSquare, SIZES.scaleSquareMm, SCALE_SQUARE_FULL_HEIGHT_MM);

          const bottom = furniture.scaleSquare.topStation - SCALE_SQUARE_FULL_HEIGHT_MM;
          for (let station = bottom; station <= furniture.scaleSquare.topStation; station += 5) {
            expect(sampleOutline(geometry, mm(station))).toBeLessThan(furniture.scaleSquare.halfWidthStart);
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the name block's left edge sits NAME_BOX_CLEARANCE_MM off the stringer, and the outline's minimum half-width over its whole height reaches clearance + box width",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
          const { nameBlock } = furniture;
          const page = layout.pages[nameBlock.pageIndex];

          const expectedLeftEdge = Math.max(0, page.halfWidthRange[0]) + NAME_BOX_CLEARANCE_MM;
          expect(nameBlock.halfWidthStart).toBeCloseTo(expectedLeftEdge, 6);

          const bottom = nameBlock.topStation - SIZES.nameBoxHeightMm;
          const requiredHalfWidth = nameBlock.halfWidthStart + SIZES.nameBoxWidthMm;
          const step = 1;
          let minHalfWidth = Infinity;
          for (let station = bottom; station <= nameBlock.topStation; station += step) {
            minHalfWidth = Math.min(minHalfWidth, sampleOutline(geometry, mm(station)));
          }
          expect(minHalfWidth).toBeGreaterThanOrEqual(requiredHalfWidth - TOLERANCE_MM);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the name block's station band clears every label row on its own page by STRIP_FURNITURE_ROW_GAP_MM, and the numeral's own station by STRIP_FURNITURE_NUMERAL_GAP_MM",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
          const { nameBlock } = furniture;
          const page = layout.pages[nameBlock.pageIndex];
          const bottom = nameBlock.topStation - SIZES.nameBoxHeightMm;

          for (const row of labelRows.filter((r) => r.pageIndex === nameBlock.pageIndex)) {
            const distance = Math.min(
              Math.abs(nameBlock.topStation - row.baselineStation),
              Math.abs(bottom - row.baselineStation),
            );
            const bandCrossesRow = row.baselineStation > bottom && row.baselineStation < nameBlock.topStation;
            if (!bandCrossesRow) {
              expect(distance).toBeGreaterThanOrEqual(STRIP_FURNITURE_ROW_GAP_MM - TOLERANCE_MM);
            }
          }

          const numeralDistance = Math.min(
            Math.abs(nameBlock.topStation - page.pageNumberStation),
            Math.abs(bottom - page.pageNumberStation),
          );
          const bandCrossesNumeral = page.pageNumberStation > bottom && page.pageNumberStation < nameBlock.topStation;
          if (!bandCrossesNumeral) {
            expect(numeralDistance).toBeGreaterThanOrEqual(STRIP_FURNITURE_NUMERAL_GAP_MM - TOLERANCE_MM);
          } else {
            // A band that CONTAINS the numeral's station is never valid — the exclusion always
            // rejects it, so this branch should be unreachable for any preset.
            expect(bandCrossesNumeral).toBe(false);
          }
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: the name block's station band lies inside its own page's searchable range — clear of the shared overlap band on any edge that borders a neighbouring page",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
          const { nameBlock } = furniture;
          const page = layout.pages[nameBlock.pageIndex];
          const bottom = nameBlock.topStation - SIZES.nameBoxHeightMm;

          const hasNosewardNeighbor = page.index > 0;
          const hasTailwardNeighbor = page.index < layout.pages.length - 1;
          const floor = page.stationRange[0] + (hasTailwardNeighbor ? layout.overlap : 0);
          const ceiling = Math.min(page.stationRange[1] - (hasNosewardNeighbor ? layout.overlap : 0), geometry.length);

          expect(bottom).toBeGreaterThanOrEqual(floor - TOLERANCE_MM);
          expect(nameBlock.topStation).toBeLessThanOrEqual(ceiling + TOLERANCE_MM);
        },
      );

      it.each(BOARD_PRESETS)("$id: every preset lands on page 1 (pageIndex 0)", (preset) => {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const labelRows = stripLabelRows(layout, marks, geometry);
        const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
        expect(furniture.nameBlock.pageIndex).toBe(0);
      });

      it.each(BOARD_PRESETS)(
        "$id: when the scale square and the name block share a page, their drawn rectangles do not overlap",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
          if (furniture.scaleSquare.pageIndex !== furniture.nameBlock.pageIndex) return; // different pages, nothing to check

          const scaleLeft = furniture.scaleSquare.halfWidthStart;
          const scaleRight = scaleLeft + SIZES.scaleSquareMm;
          const scaleBottom = furniture.scaleSquare.topStation - SCALE_SQUARE_FULL_HEIGHT_MM;
          const scaleTop = furniture.scaleSquare.topStation;

          const nameLeft = furniture.nameBlock.halfWidthStart;
          const nameRight = nameLeft + SIZES.nameBoxWidthMm;
          const nameBottom = furniture.nameBlock.topStation - SIZES.nameBoxHeightMm;
          const nameTop = furniture.nameBlock.topStation;

          const overlaps =
            scaleLeft < nameRight && scaleRight > nameLeft && scaleBottom < nameTop && scaleTop > nameBottom;
          expect(overlaps).toBe(false);
        },
      );

      it.each(BOARD_PRESETS)(
        "$id: both pieces of furniture are fully inside their own page's printable rectangle",
        (preset) => {
          const geometry = buildOutline(preset.outline);
          const layout = computeStripLayout(geometry, paper);
          const marks = computeTemplateMarks(geometry);
          const labelRows = stripLabelRows(layout, marks, geometry);
          const furniture = stripFurniture(layout, geometry, labelRows, SIZES);

          pageRectContains(
            layout.pages[furniture.scaleSquare.pageIndex],
            furniture.scaleSquare,
            SIZES.scaleSquareMm,
            SCALE_SQUARE_FULL_HEIGHT_MM,
          );
          pageRectContains(
            layout.pages[furniture.nameBlock.pageIndex],
            furniture.nameBlock,
            SIZES.nameBoxWidthMm,
            SIZES.nameBoxHeightMm,
          );
        },
      );
    });
  }

  it("midlength/letter: the name block is pushed below the numeral's own station rather than the naive first-fitting band", () => {
    const preset = BOARD_PRESETS.find((p) => p.id === "midlength")!;
    const geometry = buildOutline(preset.outline);
    const layout = computeStripLayout(geometry, "letter");
    const marks = computeTemplateMarks(geometry);
    const labelRows = stripLabelRows(layout, marks, geometry);
    const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
    const { nameBlock } = furniture;
    const page = layout.pages[nameBlock.pageIndex];

    // The naive first-fitting band (containment only, no furniture clearance) is what Tier 2 would
    // find — derive it directly to prove the real Tier-1 answer moved off it because of the numeral.
    const requiredHalfWidth = Math.max(0, page.halfWidthRange[0]) + NAME_BOX_CLEARANCE_MM + SIZES.nameBoxWidthMm;
    const hasNosewardNeighbor = page.index > 0;
    const hasTailwardNeighbor = page.index < layout.pages.length - 1;
    const floor = page.stationRange[0] + (hasTailwardNeighbor ? layout.overlap : 0);
    const ceiling = Math.min(page.stationRange[1] - (hasNosewardNeighbor ? layout.overlap : 0), geometry.length);

    let naiveTop: number | undefined;
    for (let candidate = ceiling; candidate - SIZES.nameBoxHeightMm >= floor; candidate -= 1) {
      const bottom = candidate - SIZES.nameBoxHeightMm;
      let min = Infinity;
      for (let station = bottom; station <= candidate; station += 1) {
        min = Math.min(min, sampleOutline(geometry, mm(station)));
      }
      if (min >= requiredHalfWidth) {
        naiveTop = candidate;
        break;
      }
    }
    expect(naiveTop).toBeDefined();

    // The naive band collides with the numeral's own station — confirm the real placement moved off it.
    const naiveBottom = naiveTop! - SIZES.nameBoxHeightMm;
    const naiveCollidesWithNumeral =
      page.pageNumberStation >= naiveBottom - STRIP_FURNITURE_NUMERAL_GAP_MM &&
      page.pageNumberStation <= naiveTop! + STRIP_FURNITURE_NUMERAL_GAP_MM;
    expect(naiveCollidesWithNumeral).toBe(true);
    expect(nameBlock.topStation).not.toBeCloseTo(naiveTop!, 6);
    expect(nameBlock.topStation).toBeLessThan(naiveTop!);
  });

  /** A legal, in-range spec a real shaper could draw with the outline editor's own sliders — every
   * one of the four overridden fields sits at its own legal extreme (`BOARD_LENGTH_RANGE_IN.max`,
   * `WIDEPOINT_WIDTH_RANGE_IN.min`, the nose angle slider's own 35deg floor, 0% nose fullness), not
   * a hand-fabricated `OutlineGeometry`. This matters because the narrow-nose fallback this task
   * adds is reachable by a real user's board, not a defensive branch nobody can trigger. */
  function buildNeedleNoseGeometry() {
    return buildOutline({
      ...BOARD_PRESETS[0].outline,
      length: inchesToMm(BOARD_LENGTH_RANGE_IN.max),
      widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.min),
      noseAngle: degrees(35),
      noseFullness: 0,
    });
  }

  for (const paper of PAPERS) {
    it(`needle-nose (${paper}): page 0 genuinely cannot hold the block — no band on page 0 reaches the required half-width over the box's own height`, () => {
      const geometry = buildNeedleNoseGeometry();
      const layout = computeStripLayout(geometry, paper);
      const page0 = layout.pages[0];

      const leftEdge = Math.max(0, page0.halfWidthRange[0]) + NAME_BOX_CLEARANCE_MM;
      const requiredHalfWidth = leftEdge + SIZES.nameBoxWidthMm;
      const hasTailwardNeighbor = layout.pages.length > 1;
      const floor = page0.stationRange[0] + (hasTailwardNeighbor ? layout.overlap : 0);
      const ceiling = Math.min(page0.stationRange[1], geometry.length);

      let anyFits = false;
      for (let candidate = ceiling; candidate - SIZES.nameBoxHeightMm >= floor; candidate -= 1) {
        const bottom = candidate - SIZES.nameBoxHeightMm;
        let min = Infinity;
        for (let station = bottom; station <= candidate; station += 1) {
          min = Math.min(min, sampleOutline(geometry, mm(station)));
        }
        if (min >= requiredHalfWidth) {
          anyFits = true;
          break;
        }
      }
      expect(anyFits).toBe(false);
    });

    it(`needle-nose (${paper}): the block lands on page index 1, not 0, still inside the outline and at the same 4mm stringer clearance`, () => {
      const geometry = buildNeedleNoseGeometry();
      const layout = computeStripLayout(geometry, paper);
      const marks = computeTemplateMarks(geometry);
      const labelRows = stripLabelRows(layout, marks, geometry);
      const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
      const { nameBlock } = furniture;

      expect(nameBlock.pageIndex).toBe(1);
      expect(nameBlock.halfWidthStart).toBeCloseTo(NAME_BOX_CLEARANCE_MM, 6);

      const page = layout.pages[nameBlock.pageIndex];
      const bottom = nameBlock.topStation - SIZES.nameBoxHeightMm;
      const requiredHalfWidth = nameBlock.halfWidthStart + SIZES.nameBoxWidthMm;
      let minHalfWidth = Infinity;
      for (let station = bottom; station <= nameBlock.topStation; station += 1) {
        minHalfWidth = Math.min(minHalfWidth, sampleOutline(geometry, mm(station)));
      }
      expect(minHalfWidth).toBeGreaterThanOrEqual(requiredHalfWidth - TOLERANCE_MM);

      // Never buys its fit outboard, and never at a page other than the printable pages that
      // actually exist.
      expect(nameBlock.pageIndex).toBeGreaterThanOrEqual(0);
      expect(nameBlock.pageIndex).toBeLessThan(page ? layout.pages.length : -1);
    });
  }

  it("every preset at both papers: the name block lands inside the outline, clear of label rows, clear of the numeral, and clear of the overlap bands — recorded per page and station band", () => {
    for (const paper of PAPERS) {
      for (const preset of BOARD_PRESETS) {
        const geometry = buildOutline(preset.outline);
        const layout = computeStripLayout(geometry, paper);
        const marks = computeTemplateMarks(geometry);
        const labelRows = stripLabelRows(layout, marks, geometry);
        const furniture = stripFurniture(layout, geometry, labelRows, SIZES);
        const { nameBlock } = furniture;
        const page = layout.pages[nameBlock.pageIndex];
        const bottom = nameBlock.topStation - SIZES.nameBoxHeightMm;

        // Inside the outline over the box's own height.
        const requiredHalfWidth = nameBlock.halfWidthStart + SIZES.nameBoxWidthMm;
        let minHalfWidth = Infinity;
        for (let station = bottom; station <= nameBlock.topStation; station += 1) {
          minHalfWidth = Math.min(minHalfWidth, sampleOutline(geometry, mm(station)));
        }
        expect(minHalfWidth).toBeGreaterThanOrEqual(requiredHalfWidth - TOLERANCE_MM);

        // Clear of the overlap band on any edge that borders a neighbouring page.
        const hasNosewardNeighbor = page.index > 0;
        const hasTailwardNeighbor = page.index < layout.pages.length - 1;
        const floor = page.stationRange[0] + (hasTailwardNeighbor ? layout.overlap : 0);
        const ceiling = Math.min(page.stationRange[1] - (hasNosewardNeighbor ? layout.overlap : 0), geometry.length);
        expect(bottom).toBeGreaterThanOrEqual(floor - TOLERANCE_MM);
        expect(nameBlock.topStation).toBeLessThanOrEqual(ceiling + TOLERANCE_MM);

        // Clear of every label row on its own page by the row gap, and of the numeral by the numeral gap.
        for (const row of labelRows.filter((r) => r.pageIndex === nameBlock.pageIndex)) {
          const clearsAbove = nameBlock.topStation <= row.baselineStation - STRIP_FURNITURE_ROW_GAP_MM;
          const clearsBelow = bottom >= row.baselineStation + STRIP_FURNITURE_ROW_GAP_MM;
          expect(clearsAbove || clearsBelow).toBe(true);
        }
        const clearsNumeralAbove = nameBlock.topStation <= page.pageNumberStation - STRIP_FURNITURE_NUMERAL_GAP_MM;
        const clearsNumeralBelow = bottom >= page.pageNumberStation + STRIP_FURNITURE_NUMERAL_GAP_MM;
        expect(clearsNumeralAbove || clearsNumeralBelow).toBe(true);
      }
    }
  });
});
