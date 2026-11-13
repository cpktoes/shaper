import { describe, expect, it } from "vitest";
import { brdText } from "../export/brd";
import { readAnyBrd, type ReadBrdBoard } from "../export/brd-read";
import type { P2 } from "./bezier-fit";
import { BOARD_LENGTH_RANGE_IN, TAIL_PRESETS, WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { buildBoardSurface } from "./board-surface";
import { handSetFromProfile } from "./board-profile";
import { BRD_FIT_TIP_SKIP_MM, fitBoardToBrd, lineHighestAt, lineLowestAt, polylineGap, type BrdFit } from "./brd-fit";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "./design";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { buildOutline } from "./outline";
import { OUTLINE_SLIDER_LIMITS } from "./outline-drag";
import { DEFAULT_FALLBACK_ROCKER, ROCKER_LIFT_RANGE_IN } from "./rocker";
import { inchesToMm, mm } from "./units";
import { phase16Boards } from "./__fixtures__/phase16-boards";

/**
 * The closest-fit maths (quick 261113-d9b). The round trip is the best proof the fit works, because the right answer is
 * known: a preset is written with the app's own `.brd` writer, read back by the forgiving reader and fitted, and the
 * controls it started from must come back. Every expected figure is read off the app's own functions (Rule 1); the
 * surfaces are slow, so each is built once and shared.
 */

// ---------------------------------------------------------------------------------------------------------------------
// The lines
// ---------------------------------------------------------------------------------------------------------------------

describe("lineHighestAt and lineLowestAt", () => {
  const line: P2[] = [
    [0, 0],
    [0, 75],
    [100, 200],
    [200, 120],
  ];

  it("gives both ends of a segment standing straight up at the station", () => {
    expect(lineHighestAt(line, 0)).toBe(75);
    expect(lineLowestAt(line, 0)).toBe(0);
  });

  it("interpolates between points", () => {
    expect(lineHighestAt(line, 50)).toBeCloseTo(75 + (200 - 75) / 2, 9);
    expect(lineLowestAt(line, 150)).toBeCloseTo(160, 9);
  });

  it("reads the nearer end for a station off the line, and is never infinite", () => {
    expect(lineHighestAt(line, 500)).toBe(120);
    expect(lineLowestAt(line, -50)).toBe(0);
    expect(Number.isFinite(lineHighestAt([], 10))).toBe(true);
  });
});

/** The same answer as polylineGap, found the slow way: every point against every segment. */
function bruteGap(file: readonly P2[], ours: readonly P2[]) {
  const toSegment = (p: P2, a: P2, b: P2) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const sq = dx * dx + dy * dy;
    const t = sq > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / sq)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const nearest = (p: P2, line: readonly P2[]) => Math.min(...line.slice(1).map((q, i) => toSegment(p, line[i], q)));
  let largest = 0;
  let sum = 0;
  for (const p of file) {
    const d = nearest(p, ours);
    sum += d;
    largest = Math.max(largest, d);
  }
  for (const p of ours) largest = Math.max(largest, nearest(p, file));
  return { largest, typical: sum / file.length };
}

describe("polylineGap", () => {
  const along = (n: number, f: (x: number) => number): P2[] => Array.from({ length: n }, (_, i) => [i * 10, f(i * 10)]);

  it("is 0 for a line against itself", () => {
    const line = along(30, (x) => 40 + 10 * Math.sin(x / 40));
    const gap = polylineGap(line, line);
    expect(gap.largest).toBe(0);
    expect(gap.typical).toBe(0);
  });

  it("is the distance between two parallel lines 2 mm apart", () => {
    const a = along(20, () => 10);
    const b = along(20, () => 12);
    const gap = polylineGap(a, b);
    expect(gap.largest).toBeCloseTo(2, 9);
    expect(gap.typical).toBeCloseTo(2, 9);
  });

  it("finds a square end missing from one line, as high as the end, at its station", () => {
    const withEnd: P2[] = [[0, 0], [0, 75], ...along(20, () => 75).slice(1)];
    const without: P2[] = along(20, () => 75);
    const gap = polylineGap(withEnd, without);
    expect(gap.largest).toBeCloseTo(75, 9);
    expect(gap.at).toBe(0);
  });

  it("agrees with a brute-force search on wandering lines, in either order", () => {
    // A deterministic wobble: no random source, so a failure reproduces.
    const wobble = (seed: number): P2[] =>
      Array.from({ length: 60 }, (_, i): P2 => [i * 9 + 7 * Math.sin(i * seed), 50 + 30 * Math.sin(i / (3 + seed)) + 5 * Math.cos(i * seed * 2)]);
    for (const [a, b] of [
      [wobble(1.3), wobble(2.1)],
      [wobble(0.7), wobble(3.9)],
    ]) {
      for (const [file, ours] of [[a, b], [b, a]]) {
        const fast = polylineGap(file, ours);
        const slow = bruteGap(file, ours);
        expect(fast.largest).toBeCloseTo(slow.largest, 9);
        expect(fast.typical).toBeCloseTo(slow.typical, 9);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The round trip
// ---------------------------------------------------------------------------------------------------------------------

interface Trip {
  fields: DesignSummaryFields;
  file: ReadBrdBoard;
  fit: BrdFit;
  ms: number;
  profile: ReturnType<typeof designSideProfile>;
}

const BOARDS = phase16Boards();
const cache = new Map<string, Trip>();

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

function tripOf(label: string, handSet = false): Trip {
  const key = `${label}${handSet ? "|hand" : ""}`;
  const known = cache.get(key);
  if (known) return known;
  const board = BOARDS.find((b) => b.label === label);
  if (!board) throw new Error(`no board ${label}`);
  const fields: DesignSummaryFields = handSet ? { ...board.fields, blank: null, rocker: DEFAULT_FALLBACK_ROCKER } : board.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const read = readAnyBrd(ascii(brdText(surface).text));
  if (!read.ok) throw new Error(`the app's own file would not read: ${JSON.stringify(read)}`);
  const started = performance.now();
  const fit = fitBoardToBrd({ length: read.board.length, outline: read.board.outline, bottom: read.board.bottom, deck: read.board.deck });
  const trip = { fields, file: read.board, fit, ms: performance.now() - started, profile };
  cache.set(key, trip);
  return trip;
}

/** The preset's own outline, drawn the way the fit draws its own: a first point off the stringer gets its straight end. */
function drawn(fields: DesignSummaryFields): P2[] {
  const points = buildOutline(fields.outline).points.map((p): P2 => [p.station, p.halfWidth]);
  return points[0][1] > 1e-6 ? [[points[0][0], 0], ...points] : points;
}

/** Every fitted value sits inside its own control's range. */
function expectInsideRanges(fit: BrdFit) {
  const o = fit.outline;
  const within = (value: number, min: number, max: number) => {
    expect(value).toBeGreaterThanOrEqual(min - 1e-9);
    expect(value).toBeLessThanOrEqual(max + 1e-9);
  };
  within(o.length, inchesToMm(BOARD_LENGTH_RANGE_IN.min), inchesToMm(BOARD_LENGTH_RANGE_IN.max));
  within(o.widePointWidth, inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.min), inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max));
  within(o.widePointOffset, inchesToMm(OUTLINE_SLIDER_LIMITS.widePointOffsetIn.min), inchesToMm(OUTLINE_SLIDER_LIMITS.widePointOffsetIn.max));
  within(o.noseAngle, OUTLINE_SLIDER_LIMITS.noseAngle.min, OUTLINE_SLIDER_LIMITS.noseAngle.max);
  within(o.tailAngle, OUTLINE_SLIDER_LIMITS.tailAngle.min, OUTLINE_SLIDER_LIMITS.tailAngle.max);
  for (const v of [o.noseFullness, o.tailFullness]) within(v, OUTLINE_SLIDER_LIMITS.fullness.min, OUTLINE_SLIDER_LIMITS.fullness.max);
  for (const v of [o.noseRailLength, o.tailRailLength]) within(v, OUTLINE_SLIDER_LIMITS.railLength.min, OUTLINE_SLIDER_LIMITS.railLength.max);
  expect(["squash", "pin", "round"]).toContain(o.tail.kind);
  if (o.tail.kind === "squash") {
    within(o.tail.endWidth, inchesToMm(OUTLINE_SLIDER_LIMITS.tailBlockIn.min), inchesToMm(OUTLINE_SLIDER_LIMITS.tailBlockIn.max));
  }
  for (const v of Object.values(fit.rocker)) within(v, inchesToMm(ROCKER_LIFT_RANGE_IN.min), inchesToMm(ROCKER_LIFT_RANGE_IN.max));
  for (const v of Object.values(fit.foil)) within(v, inchesToMm(FOIL_THICKNESS_RANGE_IN.min), inchesToMm(FOIL_THICKNESS_RANGE_IN.max));
}

const TRIP_LABELS = ["shortboard", "midlength", "longboard"].flatMap((id) => [`${id}|asis|hard`, `${id}|pin|hard`, `${id}|round|hard`]);

describe.each(TRIP_LABELS)("the round trip of %s, in its blank", (label) => {
  const SLOW = 120_000;

  it("comes back the length, the width and the wide point it started with", () => {
    const { fields, fit } = tripOf(label);
    expect(Math.abs(fit.outline.length - fields.outline.length)).toBeLessThan(0.01);
    expect(Math.abs(fit.outline.widePointWidth - fields.outline.widePointWidth)).toBeLessThan(0.1);
    expect(Math.abs(fit.outline.widePointOffset - fields.outline.widePointOffset)).toBeLessThanOrEqual(inchesToMm(3 / 8));
  }, SLOW);

  it("comes back the same kind of tail: a squash with its end width, a pin or round pointed", () => {
    const { fields, fit } = tripOf(label);
    const tail = fields.outline.tail;
    if (tail.kind === "squash") {
      expect(fit.outline.tail.kind).toBe("squash");
      const got = fit.outline.tail.kind === "squash" ? fit.outline.tail.endWidth : Number.NaN;
      expect(Math.abs(got - tail.endWidth)).toBeLessThanOrEqual(inchesToMm(1 / 16));
    } else {
      expect(["pin", "round"]).toContain(fit.outline.tail.kind);
    }
  }, SLOW);

  it("is never further from the file than the preset's own drawn outline is, by more than a quarter of a millimetre", () => {
    const { fields, file, fit } = tripOf(label);
    const presetGap = polylineGap(file.outline, drawn(fields));
    expect(fit.closeness.outline.largest).toBeLessThanOrEqual(presetGap.largest + 0.25);
  }, SLOW);

  it("reads the 12\" lifts and the centre and 12\" thicknesses the blank gives, within 0.6 mm", () => {
    const { fields, fit, profile } = tripOf(label);
    const want = handSetFromProfile(profile, fields.foil);
    expect(Math.abs(fit.rocker.tail12 - want.rocker.tail12)).toBeLessThan(0.6);
    expect(Math.abs(fit.rocker.nose12 - want.rocker.nose12)).toBeLessThan(0.6);
    for (const key of ["center", "tail12", "nose12"] as const) {
      expect(Math.abs(fit.foil[key] - profile.effectiveFoil[key])).toBeLessThan(0.6);
    }
  }, SLOW);

  it("holds every fitted value inside its control's range", () => {
    expectInsideRanges(tripOf(label).fit);
  }, SLOW);
});

describe.each(["shortboard", "midlength", "longboard"])("the round trip of the hand-set %s", (id) => {
  const SLOW = 120_000;

  it("comes back all four lifts and all five thicknesses, within half a millimetre", () => {
    const { fit, profile } = tripOf(`${id}|asis|hard`, true);
    for (const key of ["tailTip", "tail12", "nose12", "noseTip"] as const) {
      expect(Math.abs(fit.rocker[key] - DEFAULT_FALLBACK_ROCKER[key])).toBeLessThan(0.5);
    }
    for (const key of ["tailTip", "tail12", "center", "nose12", "noseTip"] as const) {
      expect(Math.abs(fit.foil[key] - profile.effectiveFoil[key])).toBeLessThan(0.5);
    }
  }, SLOW);

  it("says the rocker and the thickness are within half a millimetre of the file", () => {
    const { fit } = tripOf(`${id}|asis|hard`, true);
    expect(fit.closeness.rocker.largest).toBeLessThan(0.5);
    expect(fit.closeness.thickness.largest).toBeLessThan(0.5);
  }, SLOW);

  it("holds every fitted value inside its control's range", () => {
    expectInsideRanges(tripOf(`${id}|asis|hard`, true).fit);
  }, SLOW);
});

describe("the fit's own lines and figures", () => {
  const trip = () => tripOf("shortboard|asis|hard");

  it("draws our outline from the stringer to the nose and our side lines tail to nose, 201 stations", () => {
    const { fit, file } = trip();
    expect(fit.lines.bottom).toHaveLength(201);
    expect(fit.lines.deck).toHaveLength(201);
    expect(fit.lines.bottom[0][0]).toBe(0);
    expect(fit.lines.bottom[200][0]).toBeCloseTo(file.length, 9);
    expect(fit.lines.outline[0][0]).toBeCloseTo(0, 6);
    for (let i = 0; i <= 200; i++) expect(fit.lines.deck[i][1]).toBeGreaterThan(fit.lines.bottom[i][1]);
  }, 120_000);

  it("leaves the inch at each tip out of the rocker and thickness figures, so the largest gap is never there", () => {
    const { fit, file } = trip();
    for (const c of [fit.closeness.rocker, fit.closeness.thickness]) {
      expect(c.at).toBeGreaterThanOrEqual(BRD_FIT_TIP_SKIP_MM - 1e-9);
      expect(c.at).toBeLessThanOrEqual(file.length - BRD_FIT_TIP_SKIP_MM + 1e-9);
      expect(c.typical).toBeLessThanOrEqual(c.largest);
    }
    expect(BRD_FIT_TIP_SKIP_MM).toBeCloseTo(inchesToMm(1), 9);
  }, 120_000);

  it("names a pointed tail pin or round by whichever preset's angle is nearer", () => {
    for (const label of ["midlength|asis|hard", "longboard|pin|hard"]) {
      const { fit } = tripOf(label);
      if (fit.outline.tail.kind === "squash") continue;
      const near = (preset: "pin" | "round") => Math.abs(fit.outline.tailAngle - TAIL_PRESETS[preset].tailAngle);
      expect(fit.outline.tail.kind).toBe(near("pin") <= near("round") ? "pin" : "round");
    }
  }, 120_000);

  it("finishes the Longboard well inside a second", () => {
    expect(tripOf("longboard|asis|hard").ms).toBeLessThan(1000);
  }, 120_000);

  it("keeps the mm brand on what it hands back", () => {
    const { fit } = trip();
    expect(mm(fit.closeness.outline.largest)).toBe(fit.closeness.outline.largest);
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------------------------------
// A hand-made board
// ---------------------------------------------------------------------------------------------------------------------

describe("a hand-made board in AkuShaper's layout", () => {
  const text = [
    "p01 : 183.0",
    "p03 : 6.4",
    "p04 : 47.0",
    "p32 : (",
    "(cp [0.0,0.0,0.0,0.0,0.0,0.0] false false)",
    "(cp [0.0,7.5,0.0,7.5,0.0,7.5] false false)",
    "(cp [91.5,23.5,70.0,23.5,115.0,23.5] true false)",
    "(cp [183.0,0.0,183.0,9.0,183.0,0.0] true false)",
    ")",
    "p33 : (",
    "(cp [0.0,4.0,0.0,4.0,0.0,4.0] true false)",
    "(cp [91.5,0.0,60.0,0.0,120.0,0.0] true true)",
    "(cp [183.0,11.0,170.0,6.0,183.0,11.0] true false)",
    ")",
    "p34 : (",
    "(cp [0.0,5.5,0.0,5.5,0.0,5.5] true false)",
    "(cp [91.5,6.4,60.0,6.4,120.0,6.4] true false)",
    "(cp [183.0,11.0,170.0,9.0,183.0,11.0] true false)",
    ")",
  ].join("\r\n");
  const read = readAnyBrd(ascii(text));
  if (!read.ok) throw new Error("the hand-made board would not read");
  const fit = fitBoardToBrd({ length: read.board.length, outline: read.board.outline, bottom: read.board.bottom, deck: read.board.deck });

  it("takes the square end as a squash about as wide as the end stands", () => {
    expect(fit.outline.tail.kind).toBe("squash");
    const endWidth = fit.outline.tail.kind === "squash" ? fit.outline.tail.endWidth : 0;
    expect(Math.abs(endWidth - 2 * lineHighestAt(read.board.outline, 0))).toBeLessThan(inchesToMm(1));
  });

  it("finds the wide point and the length, and holds every value inside its range", () => {
    expect(fit.outline.length).toBeCloseTo(read.board.length, 6);
    expect(fit.outline.widePointWidth).toBeCloseTo(2 * Math.max(...read.board.outline.map(([, y]) => y)), 6);
    expectInsideRanges(fit);
  });
});
