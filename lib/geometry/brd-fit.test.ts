import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky. A case with its own, longer limit keeps it.
vi.setConfig({ testTimeout: 60_000 });
import { brdText } from "../export/brd";
import { readAnyBrd, type ReadBrdBoard } from "../export/brd-read";
import type { P2 } from "./bezier-fit";
import { BOARD_LENGTH_RANGE_IN, TAIL_PRESETS, WIDEPOINT_WIDTH_RANGE_IN } from "./board";
import { buildBoardSurface } from "./board-surface";
import { buildFallbackProfile, handSetFromProfile } from "./board-profile";
import {
  BRD_FIT_TIP_SKIP_MM,
  BRD_POINT_MM,
  BRD_STRAIGHTEDGE_MM,
  brdFileStations,
  brdFileWidths,
  fitBoardToBrd,
  fitOutlineWidths,
  lineHighestAt,
  lineLowestAt,
  outlineGapSide,
  polylineGap,
  type BrdFit,
} from "./brd-fit";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "./design";
import { FOIL_THICKNESS_RANGE_IN } from "./foil";
import { MEASURE_STATION_MM, buildOutline } from "./outline";
import { OUTLINE_SLIDER_LIMITS } from "./outline-drag";
import { DEFAULT_FALLBACK_ROCKER, ROCKER_LIFT_RANGE_IN, rockerStationPositions } from "./rocker";
import { BRD_WING_ROUND_INSET_MIN_MM } from "./brd-wings";
import { inchesToMm, mm } from "./units";
import { phase16Boards, phase16WingBoards } from "./__fixtures__/phase16-boards";
import {
  MAX_WINGS,
  WING_DEPTH_RANGE_IN,
  WING_POSITION_MIN_IN,
  WING_RUN_RANGE_IN,
  WING_STEP_IN,
  clampWingStations,
  effectiveWingRadius,
  maxWingRadius,
  wingPositionTop,
  wingRadiusTop,
  type Wing,
} from "./wings";

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
  return tripFromFields(key, fields);
}

/** A board written with the app's own `.brd` writer, read back and fitted, timed; kept under `key`. */
function tripFromFields(key: string, fields: DesignSummaryFields): Trip {
  const known = cache.get(key);
  if (known) return known;
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

// ---------------------------------------------------------------------------------------------------------------------
// The file's own figures at our stations (quick 261113-et0, E3)
// ---------------------------------------------------------------------------------------------------------------------

describe("brdFileStations", () => {
  /** A V: the bottom runs from (0, 50) down to (1000, 0) and up to (2000, 80); the deck stands 50 above it. */
  const L = 2000;
  const vBottom: P2[] = [[0, 50], [1000, 0], [2000, 80]];
  const vDeck: P2[] = vBottom.map(([x, y]): P2 => [x, y + 50]);
  const stationOf = (rows: ReturnType<typeof brdFileStations>, key: string) => rows.find((r) => r.key === key)!;

  it("gives the app's five stations tail to nose, the centre exactly 0, and the tips read at the very end", () => {
    const rows = brdFileStations({ length: mm(L), bottom: vBottom, deck: vDeck });
    expect(rows.map((r) => r.key)).toEqual(["tailTip", "tail12", "center", "nose12", "noseTip"]);
    expect(rows.map((r) => r.station)).toEqual(rockerStationPositions(mm(L)).map((p) => p.station));
    expect(stationOf(rows, "center").lift).toBe(0);
    expect(stationOf(rows, "center").thickness).toBeCloseTo(50, 9);
    expect(stationOf(rows, "tailTip").lift).toBeCloseTo(50, 9);
    expect(stationOf(rows, "noseTip").lift).toBeCloseTo(80, 9);
    expect(stationOf(rows, "noseTip").thickness).toBeCloseTo(50, 9);
    expect(rows.every((r) => r.point === null)).toBe(true);
  });

  it("interpolates the 12 inch stations along the V", () => {
    const rows = brdFileStations({ length: mm(L), bottom: vBottom, deck: vDeck });
    expect(stationOf(rows, "tail12").lift).toBeCloseTo(50 * (1 - MEASURE_STATION_MM / 1000), 9);
    expect(stationOf(rows, "nose12").lift).toBeCloseTo(80 * (1 - MEASURE_STATION_MM / 1000), 9);
    expect(stationOf(rows, "nose12").thickness).toBeCloseTo(50, 9);
  });

  /** The nose rolls up over its last 6.35 mm: the bottom rises 20 mm and the deck comes down to meet it. */
  const rolled = (endThickness: number) => {
    const knee = L - 6.35;
    const bottomAtKnee = 80 * ((knee - 1000) / 1000);
    const bottom: P2[] = [[0, 50], [1000, 0], [knee, bottomAtKnee], [L, bottomAtKnee + 20]];
    const deck: P2[] = [[0, 100], [1000, 50], [knee, bottomAtKnee + 50], [L, bottomAtKnee + 20 + endThickness]];
    return { length: mm(L), bottom, deck };
  };

  it("carries the bottom and the deck straight on to a nose that comes to a point, and keeps the point's own figures", () => {
    const rows = brdFileStations(rolled(0));
    const nose = stationOf(rows, "noseTip");
    expect(nose.lift).toBeCloseTo(80, 6);
    expect(nose.thickness).toBeCloseTo(50, 6);
    const knee = L - 6.35;
    const bottomAtKnee = 80 * ((knee - 1000) / 1000);
    expect(nose.point).not.toBeNull();
    expect(nose.point!.lift).toBeCloseTo(bottomAtKnee + 20, 9);
    expect(nose.point!.thickness).toBeCloseTo(0, 9);
    expect(stationOf(rows, "tailTip").point).toBeNull();
  });

  it("calls a tip a point when it is thinner than 1/16 inch at the very end, and not when it is thicker", () => {
    expect(stationOf(brdFileStations(rolled(BRD_POINT_MM - 0.01)), "noseTip").point).not.toBeNull();
    expect(stationOf(brdFileStations(rolled(BRD_POINT_MM + 0.01)), "noseTip").point).toBeNull();
    expect(BRD_POINT_MM).toBeCloseTo(inchesToMm(1 / 16), 12);
    expect(BRD_STRAIGHTEDGE_MM.near).toBeCloseTo(inchesToMm(1), 12);
    expect(BRD_STRAIGHTEDGE_MM.far).toBeCloseTo(inchesToMm(2), 12);
  });

  it("never lets a straightedge read a thickness below nothing", () => {
    const bottom: P2[] = [[0, 0], [L, 0]];
    // A deck that thins fast enough toward the tail that carrying it on goes negative.
    const deck: P2[] = [[0, 0.01], [25.4, 2], [50.8, 20], [L - 50.8, 20], [L, 20]];
    const rows = brdFileStations({ length: mm(L), bottom, deck });
    const tail = stationOf(rows, "tailTip");
    expect(tail.point).not.toBeNull();
    expect(tail.thickness).toBeGreaterThanOrEqual(0);
  });
});

describe("brdFileWidths and fitOutlineWidths", () => {
  const L = 2000;
  const square: P2[] = [[0, 0], [0, 100], [500, 200], [1000, 260], [1500, 180], [L, 0]];
  const closed: P2[] = [[0, 0], [300, 150], [1000, 260], [1500, 180], [L, 0]];

  it("reads the 12 inch widths, the wide point and where it sits, and a square tail's end width", () => {
    const w = brdFileWidths({ length: mm(L), outline: square });
    expect(w.tail12).toBeCloseTo(2 * lineHighestAt(square, MEASURE_STATION_MM), 9);
    expect(w.nose12).toBeCloseTo(2 * lineHighestAt(square, L - MEASURE_STATION_MM), 9);
    expect(w.wide).toBeCloseTo(520, 9);
    expect(w.wideOffset).toBeCloseTo(1000 - L / 2, 9);
    expect(w.tailEnd).toBeCloseTo(200, 9);
  });

  it("says a tail that closes to the stringer has no flat end", () => {
    expect(brdFileWidths({ length: mm(L), outline: closed }).tailEnd).toBeNull();
  });

  it("puts the wide point forward of centre as a plus and back of it as a minus", () => {
    const back: P2[] = [[0, 0], [400, 150], [700, 260], [1500, 180], [L, 0]];
    expect(brdFileWidths({ length: mm(L), outline: back }).wideOffset).toBeCloseTo(-300, 9);
  });

  it("reads our fit the way buildOutline does", () => {
    for (const label of ["shortboard|asis|hard", "midlength|asis|hard"]) {
      const spec = BOARDS.find((b) => b.label === label)!.fields.outline;
      const g = buildOutline(spec);
      const w = fitOutlineWidths(spec);
      expect(w.nose12).toBeCloseTo(g.noseWidthAt12in, 9);
      expect(w.tail12).toBeCloseTo(g.tailWidthAt12in, 9);
      expect(w.wide).toBeCloseTo(2 * g.halfWidePointWidth, 9);
      expect(w.wideOffset).toBeCloseTo(g.widePointStation - spec.length / 2, 9);
      const endHalf = g.points[0].halfWidth;
      if (endHalf * 2 < BRD_POINT_MM) expect(w.tailEnd).toBeNull();
      else expect(w.tailEnd).toBeCloseTo(2 * endHalf, 9);
    }
  });

  it("gives a squash tail its drawn end width and a round or pin tail none", () => {
    const base = BOARDS.find((b) => b.label === "shortboard|asis|hard")!.fields.outline;
    const squash = fitOutlineWidths({ ...base, tail: { kind: "squash", endWidth: inchesToMm(4) } });
    expect(squash.tailEnd).toBeCloseTo(inchesToMm(4), 6);
    expect(fitOutlineWidths({ ...base, tail: { kind: "round" } }).tailEnd).toBeNull();
    expect(fitOutlineWidths({ ...base, tail: { kind: "pin" } }).tailEnd).toBeNull();
  });
});

describe("outlineGapSide", () => {
  const line = (half: number): P2[] => [[0, half], [500, half], [1000, half]];
  it("says wider when the file stands out past ours, narrower when it stands inside, and nothing when they agree", () => {
    expect(outlineGapSide(line(102), line(100), 500)).toBe("wider");
    expect(outlineGapSide(line(98), line(100), 500)).toBe("narrower");
    expect(outlineGapSide(line(100), line(100), 500)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The planed fit (quick 261113-gwr)
// ---------------------------------------------------------------------------------------------------------------------

describe("fitBoardToBrd with a stringer lift: the board is planed lower under a concave", () => {
  const trip = tripOf("shortboard|asis|hard");
  const lines = { length: trip.file.length, outline: trip.file.outline, bottom: trip.file.bottom, deck: trip.file.deck };
  const L = trip.file.length;
  /** A made-up concave lifting the stringer up to 4 mm, smoothly, between 25% and 75% of the board. */
  const lift = (s: number) => 4 * Math.max(0, Math.sin((Math.PI * (s / L - 0.25)) / 0.5)) ** 2;
  const lifted = fitBoardToBrd(lines, (s) => mm(lift(s)));

  it("changes nothing without a lift, to the last digit, and says the lift is nothing at all five stations", () => {
    expect(fitBoardToBrd(lines, undefined)).toEqual(trip.fit);
    expect(Object.values(trip.fit.stringerLift)).toEqual([0, 0, 0, 0, 0]);
  });

  it("leaves the outline alone and records the lift at each of the five rocker stations", () => {
    expect(lifted.outline).toEqual(trip.fit.outline);
    expect(lifted.lines.outline).toEqual(trip.fit.lines.outline);
    for (const { key, station } of rockerStationPositions(mm(L))) expect(lifted.stringerLift[key]).toBeCloseTo(lift(station), 9);
    expect(lifted.stringerLift.center).toBeGreaterThan(3.9);
  });

  it("draws our finished stringer as the planed rocker plus the lift, and the deck as the planed one", () => {
    const profile = buildFallbackProfile(lifted.rocker, lifted.foil, mm(L));
    const planedCentre = lifted.lines.bottom[100][1] - lift(L / 2) - profile.rockerAt(mm(L / 2));
    for (let i = 0; i <= 200; i++) {
      const s = (L * i) / 200;
      expect(lifted.lines.bottom[i][1]).toBeCloseTo(planedCentre + profile.rockerAt(mm(s)) + lift(s), 9);
      expect(lifted.lines.deck[i][1]).toBeCloseTo(planedCentre + profile.rockerAt(mm(s)) + profile.thicknessAt(mm(s)), 9);
    }
    // The planed centre is the file's lowest point at the middle, less the lift there.
    const lowered = lines.bottom.map(([x, y]): P2 => [x, y - lift(x)]);
    expect(planedCentre).toBeCloseTo(lineLowestAt(lowered, L / 2), 9);
  });

  it("plans the foil thicker and the rocker lower by the lift there: the same fit as for the lowered file", () => {
    const lowered = lines.bottom.map(([x, y]): P2 => [x, y - lift(x)]);
    const direct = fitBoardToBrd({ ...lines, bottom: lowered });
    expect(lifted.rocker).toEqual(direct.rocker);
    expect(lifted.foil).toEqual(direct.foil);
    expect(lifted.foil.center).toBeGreaterThan(trip.fit.foil.center + 3.5);
    // The closeness is the finished stringers': within a hair of the lowered file's against the planed board.
    expect(Math.abs(lifted.closeness.rocker.largest - direct.closeness.rocker.largest)).toBeLessThan(0.05);
    expect(Math.abs(lifted.closeness.thickness.largest - direct.closeness.thickness.largest)).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A file with no wing fits exactly as before (quick 261113-hyy)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Recorded on the code as it stood BEFORE wings were found (quick 261113-hyy): twelve wingless boards, each fit's outline
 * controls, rocker, foil and closeness figures written out whole in `__snapshots__/brd-fit.test.ts.snap`. The wingless path
 * must not move by a digit, so this snapshot is never re-recorded: a failure here means the fit changed for a file without a
 * wing, which is the one thing that task promised not to do.
 */
describe("a file with no wing fits exactly as before", () => {
  const SLOW = 120_000;
  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const labels = [...TRIP_LABELS, "fish|asis|hard", "shortboard|diamond|hard"];
  it.each(labels)("%s", (label) => {
    const { fit } = tripOf(label);
    expect({ outline: fit.outline, rocker: fit.rocker, foil: fit.foil, closeness: fit.closeness }).toMatchSnapshot();
  }, SLOW);

  it("a hand-made outline with a smooth hip (1/8 inch, eased over 10 to 14 inches from the tail)", () => {
    const trip = tripOf("shortboard|asis|hard");
    const hip = drawn(trip.fields).map(([x, y]): P2 => [x, y - inchesToMm(1 / 8) * (1 - smoothstep(inchesToMm(10), inchesToMm(14), x))]);
    const fit = fitBoardToBrd({ length: trip.file.length, outline: hip, bottom: trip.file.bottom, deck: trip.file.deck });
    expect({ outline: fit.outline, rocker: fit.rocker, foil: fit.foil, closeness: fit.closeness }).toMatchSnapshot();
  }, SLOW);
});

// ---------------------------------------------------------------------------------------------------------------------
// A file with wings: our curve and our wings fitted around them (quick 261113-hyy)
// ---------------------------------------------------------------------------------------------------------------------

const WING_BOARDS = phase16WingBoards();

/** A winged board as the app writes it, read back and fitted. `secondRadius` sets wing 2's corner radius (the app's own default rounds it as far as it fits). */
function wingTripOf(label: string, secondRadius?: number): Trip {
  const board = WING_BOARDS.find((b) => b.label === label);
  if (!board) throw new Error(`no board ${label}`);
  let fields = board.fields;
  if (secondRadius !== undefined) {
    const wings = fields.outline.wings!.map((w, k): Wing => (k === 1 ? { ...w, radius: mm(secondRadius) } : w));
    fields = { ...fields, outline: { ...fields.outline, wings } };
  }
  return tripFromFields(`${label}|r${secondRadius ?? "default"}`, fields);
}

/** The curve alone (no wings) the fit drew, against the board's own, outside each true wing's stretch: the largest gap between the two lines. */
function baseCurveGap(trip: Trip): number {
  const fitSpec = { ...trip.fit.outline, wings: undefined };
  const ownSpec = { ...trip.fields.outline, wings: undefined };
  const truth = trip.fields.outline.wings ?? [];
  const outside = ([s]: P2) => !truth.some((w) => s >= w.station - w.run - inchesToMm(1) && s <= w.station + inchesToMm(1));
  return polylineGap(drawn({ ...trip.fields, outline: ownSpec }).filter(outside), drawn({ ...trip.fields, outline: fitSpec }).filter(outside)).largest;
}

/** Every wing sits inside the sliders' ranges and the order rule, as the WINGS tab would hold it. */
function expectWingsHoldable(fit: BrdFit, roundedAllowed = false) {
  const wings = fit.outline.wings!;
  const geometry = buildOutline({ ...fit.outline, wings: undefined });
  for (const w of wings) {
    expect(w.station).toBeGreaterThanOrEqual(inchesToMm(WING_POSITION_MIN_IN) - 1e-9);
    expect(w.station).toBeLessThanOrEqual(wingPositionTop(geometry) + 1e-9);
    expect(w.depth).toBeGreaterThanOrEqual(inchesToMm(WING_DEPTH_RANGE_IN.min) - 1e-9);
    expect(w.depth).toBeLessThanOrEqual(inchesToMm(WING_DEPTH_RANGE_IN.max) + 1e-9);
    expect(w.run).toBeGreaterThanOrEqual(0);
    if (roundedAllowed) {
      // A fitted radius is kept as found, never more than fits (quick 261113-m5w).
      expect(w.radius).toBeGreaterThanOrEqual(0);
      expect(w.radius).toBeLessThanOrEqual(maxWingRadius(w) + 1e-9);
      expect(w.run).toBeLessThanOrEqual(inchesToMm(WING_RUN_RANGE_IN.max) + 1e-9);
    } else {
      expect(w.radius).toBe(0);
    }
    expect(w.lock).toBeNull();
    expect(w.finOffset).toBe(0);
  }
  expect(clampWingStations(wings, geometry)).toEqual(wings);
  expect(wings.length).toBeLessThanOrEqual(MAX_WINGS);
}

describe("every file without a wing keeps its fit as it was", () => {
  it("has no wings key on its outline and no file wings, for every wingless round trip", () => {
    for (const label of ["shortboard|asis|hard", "fish|asis|hard", "longboard|round|hard"]) {
      const { fit } = tripOf(label);
      expect("wings" in fit.outline).toBe(false);
      expect(fit.fileWings).toEqual([]);
      expect(fit.fileWingCorners).toEqual([]);
    }
  }, 120_000);
});

describe.each([
  { label: "wing|shortboard|one", radius: undefined, nose: 1 },
  { label: "wing|midlength|square", radius: undefined, nose: 1 },
  { label: "wing|fish|rounded", radius: undefined, nose: 1 },
  { label: "wing|longboard|deep", radius: undefined, nose: 3 },
  { label: "wing|shortboard|two", radius: inchesToMm(1 / 4), nose: 1 },
])("the round trip of $label (wing 2's corners $radius)", ({ label, radius, nose }) => {
  const SLOW = 120_000;
  const slider = inchesToMm(WING_STEP_IN);

  it("finds the file's wings and comes back with ours within two slider steps of the truth", () => {
    const trip = wingTripOf(label, radius);
    const truth = trip.fields.outline.wings!;
    const ours = trip.fit.outline.wings!;
    expect(trip.fit.fileWings).toHaveLength(truth.length);
    expect(ours).toHaveLength(truth.length);
    truth.forEach((w, k) => {
      expect(Math.abs(ours[k].station - w.station), `wing ${k + 1} station`).toBeLessThanOrEqual(2 * slider);
      expect(Math.abs(ours[k].depth - w.depth), `wing ${k + 1} depth`).toBeLessThanOrEqual(2 * slider);
      expect(Math.abs(ours[k].run - w.run), `wing ${k + 1} run`).toBeLessThanOrEqual(2 * slider);
    });
  }, SLOW);

  it("opens the wings sharp, with no fin lock, inside every slider's range and the order rule", () => {
    expectWingsHoldable(wingTripOf(label, radius).fit);
    expectInsideRanges(wingTripOf(label, radius).fit);
  }, SLOW);

  it("comes back the same kind of tail", () => {
    const trip = wingTripOf(label, radius);
    // The same tail kind the same board's wingless fit makes (a swallow or diamond is fitted as a squash, as ever).
    const preset = label.split("|")[1];
    expect(trip.fit.outline.tail.kind).toBe(tripOf(`${preset}|asis|hard`).fit.outline.tail.kind);
  }, SLOW);

  it("draws a winged outline within a millimetre of the file (the Longboard's nose within 3), and the curve alone within a millimetre of the board's own", () => {
    const trip = wingTripOf(label, radius);
    expect(trip.fit.closeness.outline.largest).toBeLessThan(nose === 3 ? 3 : 1);
    expect(baseCurveGap(trip)).toBeLessThan(nose === 3 ? 3 : 1);
    // The drawn line is the winged one: the app's own applyWings on the fitted controls.
    expect(trip.fit.lines.outline).toEqual(drawn({ ...trip.fields, outline: trip.fit.outline }));
  }, SLOW);

  it("beats the smooth curve a file with a wing used to be fitted with", () => {
    const trip = wingTripOf(label, radius);
    const without = polylineGap(trip.file.outline, drawn({ ...trip.fields, outline: { ...trip.fit.outline, wings: undefined } }));
    expect(trip.fit.closeness.outline.largest).toBeLessThan(without.largest);
  }, SLOW);
});

describe("the app's own default second wing", () => {
  // "+ Add wing 2" rounds the wing as far as it fits (1 7/16" on a 1/2" run). Its corners sit only about 0.4 mm inside sharp ones
  // (0.6 mm drawn exactly), too little to tell through the file's half-millimetre drawing (the writer smooths a gentle S within
  // 0.5 mm), so they read sharp, and a sharp wing matches that long S with a longer run (measured 0.80" for 0.5") sitting a
  // little forward. The outline still follows it closely; that is the honest limit, measured, so only the outline and wing 1
  // are held to the truth here.
  it("still finds two wings, draws an outline within a millimetre, and wing 1 within two slider steps", () => {
    const trip = wingTripOf("wing|shortboard|two");
    const truth = trip.fields.outline.wings!;
    const ours = trip.fit.outline.wings!;
    expect(trip.fit.fileWings).toHaveLength(2);
    expect(ours).toHaveLength(2);
    expect(trip.fit.closeness.outline.largest).toBeLessThan(1);
    for (const key of ["station", "depth", "run"] as const) expect(Math.abs(ours[0][key] - truth[0][key])).toBeLessThanOrEqual(2 * inchesToMm(WING_STEP_IN));
    expect(ours[0].station).toBeGreaterThan(ours[1].station);
    expectWingsHoldable(trip.fit);
  }, 120_000);

  it("finishes the winged fit of a two-wing board in under a second and a half", () => {
    const trip = wingTripOf("wing|shortboard|two", inchesToMm(1 / 4));
    console.log(
      `the two-wing Shortboard's whole fit took ${trip.ms.toFixed(0)} ms, the Shortboard with a rounded 1 by 1 inch wing ${roundedTrip("shortboard", 1, 1, "top").ms.toFixed(0)} ms (a wingless Shortboard ${tripOf("shortboard|asis|hard").ms.toFixed(0)} ms)`,
    );
    expect(trip.ms).toBeLessThan(1500);
  }, 120_000);
});

describe("a refit for a stringer lift may reuse the first fit's outline (quick 261113-hyy)", () => {
  const lift = (s: number) => mm(3 * Math.max(0, Math.sin((Math.PI * (s - 600)) / 1000)) ** 2);

  it.each([
    ["a wingless board", () => tripOf("shortboard|asis|hard")],
    ["a board with two wings", () => wingTripOf("wing|shortboard|two", inchesToMm(1 / 4))],
  ])("gives exactly the fit it gives when it searches again, for %s, and says so in far less time", (_name, trip) => {
    const { file, fit } = trip();
    const lines = { length: file.length, outline: file.outline, bottom: file.bottom, deck: file.deck };
    const started = performance.now();
    const searched = fitBoardToBrd(lines, lift);
    const searchedMs = performance.now() - started;
    const reusedAt = performance.now();
    const reused = fitBoardToBrd(lines, lift, fit);
    const reusedMs = performance.now() - reusedAt;
    expect(reused).toEqual(searched);
    expect(reusedMs).toBeLessThan(searchedMs);
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------------------------------
// A sharp-winged file fits exactly as before (quick 261113-m5w)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Recorded on the code as it stood BEFORE a wing's corners were read from the file (quick 261113-m5w): the winged boards of
 * the app's own writer whose corners are sharp, or rounded too slightly to tell from sharp through a half-millimetre drawing,
 * each fit's outline controls (our wings included), closeness and the wings the finder read, written out whole in the
 * snapshot beside the wingless ones. A wing the file does not clearly round must not move by a digit, so this snapshot is
 * never re-recorded either.
 */
describe("a sharp-winged file fits exactly as before (quick 261113-m5w)", () => {
  const SLOW = 120_000;
  const snapshotted: [string, () => Trip][] = [
    ["wing|shortboard|one", () => wingTripOf("wing|shortboard|one")],
    ["wing|shortboard|deep", () => wingTripOf("wing|shortboard|deep")],
    ["wing|shortboard|square", () => wingTripOf("wing|shortboard|square")],
    ["wing|shortboard|infade", () => wingTripOf("wing|shortboard|infade")],
    ["wing|shortboard|rounded", () => wingTripOf("wing|shortboard|rounded")],
    ["wing|fish|rounded", () => wingTripOf("wing|fish|rounded")],
    ["wing|midlength|square", () => wingTripOf("wing|midlength|square")],
    ["wing|longboard|deep", () => wingTripOf("wing|longboard|deep")],
    ["wing|shortboard|two", () => wingTripOf("wing|shortboard|two")],
    ["wing|shortboard|two, wing 2 rounded 1/4 inch", () => wingTripOf("wing|shortboard|two", inchesToMm(1 / 4))],
  ];
  it.each(snapshotted)("%s", (_name, trip) => {
    const { fit } = trip();
    expect({ outline: fit.outline, closeness: fit.closeness, fileWings: fit.fileWings }).toMatchSnapshot();
  }, SLOW);
});

// ---------------------------------------------------------------------------------------------------------------------
// A wing's corners read from the file (quick 261113-m5w)
// ---------------------------------------------------------------------------------------------------------------------

describe("a corner the file does not clearly round opens sharp", () => {
  it.each(["wing|shortboard|one", "wing|shortboard|deep", "wing|shortboard|square", "wing|shortboard|infade", "wing|shortboard|rounded", "wing|fish|rounded", "wing|midlength|square", "wing|longboard|deep", "wing|shortboard|two"])(
    "%s: every corner reads sharp, with its inset under the 1.1 mm line, and every wing's radius is 0",
    (label) => {
      const { fit } = wingTripOf(label);
      expect(fit.fileWingCorners).toHaveLength(fit.fileWings.length);
      fit.fileWingCorners.forEach((corner, k) => {
        expect(corner.rounded, `wing ${k + 1}`).toBe(false);
        expect(corner.inset, `wing ${k + 1} inset`).toBeLessThan(BRD_WING_ROUND_INSET_MIN_MM);
      });
      expectWingsHoldable(fit);
    },
    120_000,
  );

  it("wing 2 rounded 1/4 inch on the two-wing Shortboard also stays sharp", () => {
    const { fit } = wingTripOf("wing|shortboard|two", inchesToMm(1 / 4));
    expect(fit.fileWingCorners.map((corner) => corner.rounded)).toEqual([false, false]);
    expectWingsHoldable(fit);
  }, 120_000);
});

const ONE_WING = (label: string) => WING_BOARDS.find((b) => b.label === label)!.fields;

/** The preset's wing 1 made `depthIn` deep over a `runIn` run with the corner radius `radius` ("top" is the slider's top), written, read back and fitted. */
function roundedTrip(preset: string, depthIn: number, runIn: number, radius: number | "top"): Trip {
  const fields = ONE_WING(`wing|${preset}|one`);
  const step = { depth: inchesToMm(depthIn), run: inchesToMm(runIn) };
  const wing: Wing = { ...fields.outline.wings![0], ...step, radius: radius === "top" ? wingRadiusTop(step, "imperial") : mm(radius) };
  return tripFromFields(`rounded|${preset}|${depthIn}x${runIn}|${radius}`, { ...fields, outline: { ...fields.outline, wings: [wing] } });
}

/** Our wing 1 against the truth, in slider steps: station and depth within one, run and the radius that fits within three. */
function expectRoundedWing(fit: BrdFit, truth: Wing) {
  const ours = fit.outline.wings![0];
  const step = inchesToMm(WING_STEP_IN);
  expect(fit.fileWingCorners).toHaveLength(1);
  expect(fit.fileWingCorners[0].rounded).toBe(true);
  expect(fit.fileWingCorners[0].inset).toBeGreaterThanOrEqual(BRD_WING_ROUND_INSET_MIN_MM);
  expect(ours.radius).toBeGreaterThan(0);
  expect(Math.abs(ours.station - truth.station), "station").toBeLessThanOrEqual(step);
  expect(Math.abs(ours.depth - truth.depth), "depth").toBeLessThanOrEqual(step);
  expect(Math.abs(ours.run - truth.run), "run").toBeLessThanOrEqual(3 * step);
  expect(Math.abs(effectiveWingRadius(ours) - effectiveWingRadius(truth)), "radius").toBeLessThanOrEqual(3 * step);
  expect(ours.radius).toBeLessThanOrEqual(maxWingRadius(ours) + 1e-9);
  expect(fit.fileWingCorners[0].measured).toEqual({ station: ours.station, depth: ours.depth, run: ours.run, radius: ours.radius });
  expectWingsHoldable(fit, true);
  expectInsideRanges(fit);
}

describe("a wing the file clearly rounds comes back rounded, and closer in position and run than a sharp wing was", () => {
  const SLOW = 120_000;
  const cases: [string, () => Trip, number][] = [
    ["a 1 inch by 1 inch step rounded as far as it goes, on the Shortboard", () => roundedTrip("shortboard", 1, 1, "top"), 1],
    ["... on the Fish", () => roundedTrip("fish", 1, 1, "top"), 1],
    ["... on the Midlength", () => roundedTrip("midlength", 1, 1, "top"), 1],
    ["... on the Longboard (its nose reads 2.3 mm either way)", () => roundedTrip("longboard", 1, 1, "top"), 3],
    ["a square 3/8 inch step rounded 1/8 inch, on the Shortboard", () => roundedTrip("shortboard", 3 / 8, 0, inchesToMm(1 / 8)), 1],
    ["... on the Midlength", () => roundedTrip("midlength", 3 / 8, 0, inchesToMm(1 / 8)), 1],
    ["a square 3/8 inch step rounded as far as it goes, on the Shortboard", () => roundedTrip("shortboard", 3 / 8, 0, "top"), 1],
    ["... on the Midlength", () => roundedTrip("midlength", 3 / 8, 0, "top"), 1],
    ["a steep 3/4 inch step over a 1/4 inch run, rounded 1/4 inch, on the Shortboard", () => roundedTrip("shortboard", 3 / 4, 1 / 4, inchesToMm(1 / 4)), 1],
  ];

  it.each(cases)("%s", (_name, trip, widest) => {
    const { fit, fields } = trip();
    expectRoundedWing(fit, fields.outline.wings![0]);
    expect(fit.closeness.outline.largest).toBeLessThan(widest);
    expect(fit.lines.outline).toEqual(drawn({ ...fields, outline: fit.outline }));
  }, SLOW);

  it("moves a deep rounded wing's position and run back toward the truth: 11 1/16 and 1 1/8 inch where a sharp wing sat 11 5/16 and 1 5/8", () => {
    const { fit, fields } = roundedTrip("shortboard", 1, 1, "top");
    const truth = fields.outline.wings![0];
    const sharp = wingTripOf("wing|shortboard|deep").fit.outline.wings![0];
    expect(sharp.radius).toBe(0);
    const ours = fit.outline.wings![0];
    expect(Math.abs(ours.station - truth.station)).toBeLessThan(inchesToMm(0.05));
    expect(Math.abs(ours.run - truth.run)).toBeLessThan(inchesToMm(0.13));
    // What a sharp fit of this very file gave: forward and long. (The sharp fit of the same file, with the corner pass held off,
    // was 11.317 inches and 1.655 inches; the rounded fit must be well inside that.)
    expect(ours.station - truth.station).toBeLessThan(inchesToMm(0.317) / 2);
    expect(ours.run).toBeLessThan(inchesToMm(1.655) - inchesToMm(0.3));
  }, SLOW);

  it("keeps the radius as found: not rounded to the slider's grid, and never more than fits", () => {
    const { fit } = roundedTrip("shortboard", 3 / 8, 0, "top");
    const ours = fit.outline.wings![0];
    const grid = inchesToMm(WING_STEP_IN);
    expect(Math.abs(ours.radius / grid - Math.round(ours.radius / grid))).toBeGreaterThan(1e-6);
    expect(ours.radius).toBeLessThanOrEqual(maxWingRadius(ours) + 1e-9);
  }, SLOW);
});

describe("a file drawn exactly (no writer's smoothing) rounds the corners that are clearly there", () => {
  const SLOW = 120_000;
  /** The same trip's lines, its outline replaced by the board's own drawn outline, fitted again. */
  const exactFit = (trip: Trip): BrdFit =>
    fitBoardToBrd({ length: trip.file.length, outline: drawn(trip.fields), bottom: trip.file.bottom, deck: trip.file.deck });

  it.each([
    ["a 1/2 inch by 1/2 inch step rounded as far as it goes, on the Shortboard", () => roundedTrip("shortboard", 1 / 2, 1 / 2, "top")],
    ["... on the Fish", () => roundedTrip("fish", 1 / 2, 1 / 2, "top")],
    ["a 1 inch by 1 inch step rounded as far as it goes, on the Fish", () => roundedTrip("fish", 1, 1, "top")],
    ["a steep 3/4 inch step over a 1/4 inch run, rounded 1/4 inch, on the Shortboard", () => roundedTrip("shortboard", 3 / 4, 1 / 4, inchesToMm(1 / 4))],
  ])("%s", (_name, trip) => {
    const t = trip();
    expectRoundedWing(exactFit(t), t.fields.outline.wings![0]);
  }, SLOW);

  it("opens a 1/2 inch by 1/2 inch step rounded 1/4 inch sharp: the rounding sits only about half a millimetre inside the sharp corner", () => {
    const t = wingTripOf("wing|shortboard|rounded");
    const fit = exactFit(t);
    expect(fit.fileWingCorners[0].rounded).toBe(false);
    expect(fit.fileWingCorners[0].inset).toBeLessThan(BRD_WING_ROUND_INSET_MIN_MM);
    expect(fit.outline.wings![0].radius).toBe(0);
  }, SLOW);
});

describe("two wings, both clearly rounded", () => {
  it("come back rounded, in order, and the winged outline is within a millimetre of the file (a Fish)", () => {
    const fields = ONE_WING("wing|fish|one");
    const two = WING_BOARDS.find((b) => b.label === "wing|fish|two")!.fields.outline.wings!;
    const deep = { depth: inchesToMm(1), run: inchesToMm(1) };
    const wings: Wing[] = [
      { ...two[0], ...deep, radius: wingRadiusTop(deep, "imperial") },
      { ...two[1], station: inchesToMm(7), depth: inchesToMm(3 / 8), run: mm(0), radius: inchesToMm(3 / 16) },
    ];
    const trip = tripFromFields("rounded|fish|two", { ...fields, outline: { ...fields.outline, wings } });
    const fit = trip.fit;
    expect(fit.fileWingCorners.map((corner) => corner.rounded)).toEqual([true, true]);
    expect(fit.outline.wings![0].station).toBeGreaterThan(fit.outline.wings![1].station);
    expect(fit.outline.wings!.every((w) => w.radius > 0)).toBe(true);
    expectWingsHoldable(fit, true);
    expectInsideRanges(fit);
    expect(fit.closeness.outline.largest).toBeLessThan(1);
    expect(fit.lines.outline).toEqual(drawn({ ...trip.fields, outline: fit.outline }));
  }, 120_000);
});
