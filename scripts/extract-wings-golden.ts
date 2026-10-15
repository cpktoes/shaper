/**
 * GENERATED FILE PRODUCER — writes lib/geometry/__fixtures__/wings-golden.json: the founder's chosen
 * wing (sketch 013, construction A, 2026-10-14: "construction wise, we definitely want to go A"; the
 * corner radius by their later rule), as the SKETCH ITSELF draws it, on seven boards with five wing
 * settings each (quick 261014-wii, D10). The output is generated and must never be hand-edited;
 * re-run this script.
 *
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-wings-golden.ts
 *
 * run from the repository root. (Nothing in package.json — no npm script, no dependency;
 * `--no-install` means npx can only run the tsx already in node_modules, never download one. No
 * database is involved.)
 *
 * It EXECUTES the sketch's own code — `reference/sketches/013-wings-curves.js`, a byte-for-byte copy
 * of the sketch's curves.js — so every number in the fixture is the sketch's output, never a
 * transcription of it: the script builds each board with the sketch's own `buildOutline`, then calls
 * its `wingedPoints(g, wings, "a", 0)` (the app's 161 stations, every corner a hair either side, the
 * 0.02" grid through each step, the pod, the widepoint and the length), and per wing its `maxRadius`,
 * `effectiveRadius`, `wingFootprint` and `wingReadouts`. It computes no curve of its own, and the
 * only inch conversion it does is `mmToInches` from lib/geometry/units.ts at full precision, on the
 * app's own board specs (CLAUDE.md Rule 2; F13).
 *
 * What it records (fixture keys):
 * - `provenance`, `units`: where the numbers came from, and what they are measured in.
 * - `boards`: each board's id and the app's own outline spec in millimetres — an INPUT, recorded so
 *   the test builds exactly the board the sketch was given, even after a preset is recaptured.
 * - `cases`: for each board and setting, the wings in inches, each wing's readouts, and `points`
 *   (`{ sIn, widthIn }`, the FULL width — twice the sketch's half-width).
 *
 * Running it twice writes the same bytes.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS, type OutlineSpec } from "@/lib/geometry/board";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { mmToInches } from "@/lib/geometry/units";

const OUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/wings-golden.json");
const REFERENCE = "reference/sketches/013-wings-curves.js";

/** The sketch's outline spec: inches and degrees. */
interface SketchSpec {
  length: number;
  widePointWidth: number;
  widePointOffset: number;
  tailRailLength: number;
  noseRailLength: number;
  noseAngle: number;
  noseFullness: number;
  tailAngle: number;
  tailFullness: number;
  tail: { kind: string; endWidth?: number; depth?: number; crotchDepth?: number };
}

/** The sketch's wing: inches, `smoothing` is the corner radius asked for. */
interface SketchWing {
  on: boolean;
  station: number;
  depth: number;
  run: number;
  smoothing: number;
}

type SketchGeometry = object;

interface SketchCurves {
  buildOutline(spec: SketchSpec): SketchGeometry;
  wingedPoints(g: SketchGeometry, wings: SketchWing[], variant: "a", tailZoomTo: number): [number, number][];
  maxRadius(w: SketchWing): number;
  effectiveRadius(w: SketchWing): number;
  wingFootprint(w: SketchWing): { hi: number; lo: number; inner: number };
  wingReadouts(
    g: SketchGeometry,
    wings: SketchWing[],
    variant: "a",
  ): ({ widthAhead: number; widthBehind: number } | null)[];
}

const sketch = createRequire(path.join(process.cwd(), "package.json"))(
  path.resolve(process.cwd(), REFERENCE),
) as SketchCurves;

function toSketchSpec(outline: OutlineSpec): SketchSpec {
  const tail = outline.tail;
  const sketchTail: SketchSpec["tail"] = { kind: tail.kind };
  if (tail.kind === "squash") sketchTail.endWidth = mmToInches(tail.endWidth);
  if (tail.kind === "diamond") {
    sketchTail.endWidth = mmToInches(tail.endWidth);
    sketchTail.depth = mmToInches(tail.depth);
  }
  if (tail.kind === "swallow") {
    sketchTail.endWidth = mmToInches(tail.endWidth);
    sketchTail.crotchDepth = mmToInches(tail.crotchDepth);
  }
  return {
    length: mmToInches(outline.length),
    widePointWidth: mmToInches(outline.widePointWidth),
    widePointOffset: mmToInches(outline.widePointOffset),
    tailRailLength: outline.tailRailLength,
    noseRailLength: outline.noseRailLength,
    noseAngle: outline.noseAngle,
    noseFullness: outline.noseFullness,
    tailAngle: outline.tailAngle,
    tailFullness: outline.tailFullness,
    tail: sketchTail,
  };
}

const BOARDS: { id: string; outline: OutlineSpec }[] = [
  { id: "default", outline: DEFAULT_BOARD_SPEC.outline },
  ...BOARD_PRESETS.map((preset) => ({ id: preset.id, outline: preset.outline })),
  {
    id: "default-pin",
    outline: {
      ...DEFAULT_BOARD_SPEC.outline,
      tail: TAIL_PRESETS.pin.tail,
      tailAngle: TAIL_PRESETS.pin.tailAngle,
      tailFullness: TAIL_PRESETS.pin.tailFullness,
    },
  },
  {
    id: "default-diamond",
    outline: {
      ...DEFAULT_BOARD_SPEC.outline,
      tail: TAIL_PRESETS.diamond.tail,
      tailAngle: TAIL_PRESETS.diamond.tailAngle,
      tailFullness: TAIL_PRESETS.diamond.tailFullness,
    },
  },
];

/** The five settings (F14), in inches — inputs, the sketch's own units. */
const SETTINGS: { id: string; wings: { stationIn: number; depthIn: number; runIn: number; radiusIn: number }[] }[] = [
  { id: "square", wings: [{ stationIn: 11, depthIn: 3 / 8, runIn: 0, radiusIn: 0 }] },
  { id: "angled", wings: [{ stationIn: 11, depthIn: 3 / 8, runIn: 1 / 2, radiusIn: 0 }] },
  { id: "rounded-max", wings: [{ stationIn: 11, depthIn: 3 / 8, runIn: 1 / 4, radiusIn: 3 }] },
  { id: "stinger", wings: [{ stationIn: 30, depthIn: 1 / 2, runIn: 3 / 4, radiusIn: 1 }] },
  {
    id: "two-wings",
    wings: [
      { stationIn: 11, depthIn: 3 / 8, runIn: 1 / 4, radiusIn: 0 },
      { stationIn: 15.5, depthIn: 1 / 4, runIn: 1 / 2, radiusIn: 3 / 16 },
    ],
  },
];

const cases = [];
for (const board of BOARDS) {
  const g = sketch.buildOutline(toSketchSpec(board.outline));
  for (const setting of SETTINGS) {
    const wings: SketchWing[] = setting.wings.map((w) => ({
      on: true,
      station: w.stationIn,
      depth: w.depthIn,
      run: w.runIn,
      smoothing: w.radiusIn,
    }));
    const readouts = sketch.wingReadouts(g, wings, "a");
    cases.push({
      board: board.id,
      setting: setting.id,
      wings: setting.wings,
      readouts: wings.map((w, i) => {
        const footprint = sketch.wingFootprint(w);
        const r = readouts[i];
        if (!r) throw new Error(`${board.id} ${setting.id}: the sketch drew no readout for wing ${i + 1}`);
        return {
          maxRadiusIn: sketch.maxRadius(w),
          radiusUsedIn: sketch.effectiveRadius(w),
          stepStartIn: footprint.hi,
          innerIn: footprint.inner,
          widthAheadIn: r.widthAhead,
          widthBehindIn: r.widthBehind,
        };
      }),
      points: sketch.wingedPoints(g, wings, "a", 0).map(([s, halfWidth]) => ({ sIn: s, widthIn: 2 * halfWidth })),
    });
  }
}

const fixture = {
  provenance:
    "Generated by scripts/extract-wings-golden.ts, which runs the sketch's own buildOutline, wingedPoints (construction \"a\"), maxRadius, effectiveRadius, wingFootprint and wingReadouts from reference/sketches/013-wings-curves.js (sketch 013, construction A, chosen by the founder on 2026-10-14). Never hand-edited.",
  units:
    "boards: the app's own outline specs, millimetres and degrees. cases: wings, readouts and points in inches; sIn is inches from the tail, widthIn and the readouts' widths are FULL widths in inches (the sketch's half-width, doubled).",
  boards: BOARDS,
  cases,
};

writeFileSync(OUT, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `Wrote ${cases.length} cases, ${cases.reduce((n, c) => n + c.points.length, 0)} points, to ${path.relative(process.cwd(), OUT)}`,
);
