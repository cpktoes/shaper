import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { PHASE14_TODAY, type Phase14HiddenEntry } from "./__fixtures__/phase14-today";
import type { BlankRecord, BlankStation } from "./blank";
import { DEFAULT_BOARD_SPEC } from "./board";
import { DEFAULT_FOIL_SPEC, foilStationPoints } from "./foil";
import { pchipMinimum, preparePchip, type SplinePoint } from "./pchip";
import { DEFAULT_FALLBACK_ROCKER, fallbackRockerPoints, rockerStationPositions } from "./rocker";
import { prepareRootCurve, type RootKind } from "./root-curve";
import { inchesToMm } from "./units";

// Every catalogue figure below is read from the committed CSVs through the tested reader, never
// typed into this file (CLAUDE.md Rule 1). The only literals are sample counts and the 1e-9 mm
// slack for floating-point arithmetic.
const CATALOG = readSeedCatalog();

/** Each of a blank's three printed curves, with the rule's kind for it. */
const ATTRIBUTES: { name: string; kind: RootKind; pick: (s: BlankStation) => number | null }[] = [
  { name: "rocker", kind: "rise", pick: (s) => s.rockerMm },
  { name: "thickness", kind: "fall", pick: (s) => s.thicknessMm },
  { name: "width", kind: "fall", pick: (s) => s.widthMm },
];

/** One attribute over its OWN printed stations: an empty cell is not a knot. */
function knotsOf(blank: BlankRecord, pick: (s: BlankStation) => number | null): SplinePoint[] {
  return blank.stations
    .filter((s) => pick(s) !== null)
    .map((s) => ({ x: s.fromTailMm as number, y: pick(s) as number }));
}

/** `count + 1` evenly spaced positions from `from` to `to`, both included. */
function spaced(from: number, to: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => from + ((to - from) * i) / count);
}

const SLACK_MM = 1e-9;
const SAMPLES_PER_INTERVAL = 200;

describe("the square-root curve reads every blank exactly at its printed stations (acceptance 1, D-13)", () => {
  it("every printed station of every curve of every blank reads back exactly", () => {
    let visited = 0;
    let stations = 0;
    for (const blank of CATALOG) {
      visited++;
      for (const { name, kind, pick } of ATTRIBUTES) {
        const knots = knotsOf(blank, pick);
        if (knots.length < 2) continue;
        const curve = prepareRootCurve(knots, kind);
        for (const knot of knots) {
          stations++;
          expect(curve.sample(knot.x), `${blank.vendor} ${blank.name} ${name} at ${knot.x}`).toBe(knot.y);
        }
      }
    }
    expect(CATALOG.length).toBeGreaterThan(0);
    expect(visited).toBe(CATALOG.length);
    expect(stations).toBeGreaterThan(CATALOG.length * 3);
  });

  it("never leaves the range of the two printed stations either side, on any blank", () => {
    let intervals = 0;
    let outside = 0;
    for (const blank of CATALOG) {
      for (const { kind, pick } of ATTRIBUTES) {
        const knots = knotsOf(blank, pick);
        if (knots.length < 2) continue;
        const curve = prepareRootCurve(knots, kind);
        for (let k = 0; k < knots.length - 1; k++) {
          intervals++;
          const [a, b] = [knots[k], knots[k + 1]];
          const lo = Math.min(a.y, b.y) - SLACK_MM;
          const hi = Math.max(a.y, b.y) + SLACK_MM;
          for (const x of spaced(a.x, b.x, SAMPLES_PER_INTERVAL)) {
            const y = curve.sample(x);
            if (y < lo || y > hi) outside++;
          }
        }
      }
    }
    expect(intervals).toBeGreaterThan(CATALOG.length * 3);
    expect(outside).toBe(0);
  });

  it("where a blank's thickness or width falls steadily from its thickest (widest) station to an end, so does the curve", () => {
    let stretches = 0;
    let rises = 0;
    for (const blank of CATALOG) {
      for (const { kind, pick } of ATTRIBUTES) {
        if (kind !== "fall") continue;
        const knots = knotsOf(blank, pick);
        if (knots.length < 2) continue;
        const ys = knots.map((k) => k.y);
        const first = ys.indexOf(Math.max(...ys));
        const curve = prepareRootCurve(knots, kind);

        // Toward the nose: printed values from the thickest station to the last never rise.
        const noseward = knots.slice(first);
        // Toward the tail: walking from the thickest station back to the first, the same.
        const tailward = knots.slice(0, first + 1).reverse();
        for (const stretch of [noseward, tailward]) {
          if (stretch.length < 2) continue;
          const steady = stretch.every((p, i) => i === 0 || p.y <= stretch[i - 1].y);
          if (!steady) continue;
          stretches++;
          let previous = curve.sample(stretch[0].x);
          for (let k = 0; k < stretch.length - 1; k++) {
            for (const x of spaced(stretch[k].x, stretch[k + 1].x, SAMPLES_PER_INTERVAL)) {
              const y = curve.sample(x);
              if (y > previous + SLACK_MM) rises++;
              previous = y;
            }
          }
        }
      }
    }
    expect(stretches).toBeGreaterThan(CATALOG.length);
    expect(rises).toBe(0);
  });
});

/** The message `preparePchip` throws for `points` — read from it, never typed here. */
function pchipError(points: SplinePoint[]): string {
  try {
    preparePchip(points);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("preparePchip accepted these points; the test expected it to refuse them");
}

/** Every position 200 times per interval across a curve's own stations. */
function denseAcross(knots: readonly SplinePoint[]): number[] {
  const xs: number[] = [];
  for (let k = 0; k < knots.length - 1; k++) xs.push(...spaced(knots[k].x, knots[k + 1].x, SAMPLES_PER_INTERVAL));
  return xs;
}

/** Each printed station reads exactly, and every dense sample stays between its two neighbours. */
function expectExactAndContained(knots: readonly SplinePoint[], kind: RootKind, label: string) {
  const curve = prepareRootCurve(knots, kind);
  for (const knot of knots) expect(curve.sample(knot.x), `${label} at ${knot.x}`).toBe(knot.y);
  for (let k = 0; k < knots.length - 1; k++) {
    const [a, b] = [knots[k], knots[k + 1]];
    for (const x of spaced(a.x, b.x, SAMPLES_PER_INTERVAL)) {
      const y = curve.sample(x);
      expect(y, `${label} at ${x}`).toBeGreaterThanOrEqual(Math.min(a.y, b.y) - SLACK_MM);
      expect(y, `${label} at ${x}`).toBeLessThanOrEqual(Math.max(a.y, b.y) + SLACK_MM);
    }
  }
}

describe("the bottom's low point is the blank's lowest printed station (acceptance 2, R11)", () => {
  it("on every blank, the bottom's lowest point is exactly the lowest printed rocker, and nothing reads below it", () => {
    const quarterInch = inchesToMm(0.25);
    let checked = 0;
    for (const blank of CATALOG) {
      const knots = knotsOf(blank, (s) => s.rockerMm);
      if (knots.length < 2) continue;
      checked++;
      const lowest = Math.min(...knots.map((k) => k.y));
      const curve = prepareRootCurve(knots, "rise");
      const label = `${blank.vendor} ${blank.name}`;
      expect(pchipMinimum(curve, 0, blank.lengthMm), label).toBe(lowest);

      const sweep = [...knots.map((k) => k.x), blank.lengthMm];
      for (let x = 0; x <= blank.lengthMm; x += quarterInch) sweep.push(x);
      const lowestSampled = Math.min(...sweep.map((x) => curve.sample(x)));
      expect(lowestSampled, label).toBe(lowest);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("where two or more stations tie for the lowest, the bottom reads exactly that value all the way between them", () => {
    const ties = CATALOG.flatMap((blank) => {
      const knots = knotsOf(blank, (s) => s.rockerMm);
      if (knots.length < 2) return [];
      const lowest = Math.min(...knots.map((k) => k.y));
      const tied = knots.filter((k) => k.y === lowest);
      return tied.length >= 2 ? [{ blank, knots, lowest, from: tied[0].x, to: tied[tied.length - 1].x }] : [];
    });
    expect(ties.length).toBeGreaterThan(0);
    for (const { blank, knots, lowest, from, to } of ties) {
      const curve = prepareRootCurve(knots, "rise");
      for (const x of spaced(from, to, SAMPLES_PER_INTERVAL * 4)) {
        expect(curve.sample(x), `${blank.vendor} ${blank.name} at ${x}`).toBe(lowest);
      }
    }
  });

  it("the bottom curves through its low point rather than flattening out: twice as far away lifts about four times as much", () => {
    // The roots before the lowest station are taken negative, so the curve inside runs straight
    // through 0 there and the bottom is a smooth bowl at its low point. With every root positive
    // it would instead sit flat on the low point and lift about sixteen times as much at twice
    // the distance. Checked on both sides of every blank with a single lowest station inside it.
    const step = 1;
    let sides = 0;
    for (const blank of CATALOG) {
      const knots = knotsOf(blank, (s) => s.rockerMm);
      const lowest = Math.min(...knots.map((k) => k.y));
      const at = knots.findIndex((k) => k.y === lowest);
      if (knots.filter((k) => k.y === lowest).length !== 1 || at === 0 || at === knots.length - 1) continue;
      const curve = prepareRootCurve(knots, "rise");
      for (const direction of [-1, 1]) {
        sides++;
        const near = curve.sample(knots[at].x + direction * step) - lowest;
        const far = curve.sample(knots[at].x + direction * 2 * step) - lowest;
        const ratio = far / near;
        expect(ratio, `${blank.vendor} ${blank.name} side ${direction}`).toBeGreaterThan(2);
        expect(ratio, `${blank.vendor} ${blank.name} side ${direction}`).toBeLessThan(8);
      }
    }
    expect(sides).toBeGreaterThan(CATALOG.length);
  });

  it("a bottom whose lowest station is the first or the last (no catalogue blank does this) keeps its low point at that end", () => {
    // Synthetic inputs: a bottom climbing steadily from the tail, and the same bottom turned round.
    const lowestFirst: SplinePoint[] = [
      { x: 0, y: 0 },
      { x: 300, y: 4 },
      { x: 900, y: 18 },
      { x: 1500, y: 55 },
      { x: 1800, y: 110 },
    ];
    const lowestLast: SplinePoint[] = lowestFirst.map((p, i) => ({
      x: p.x,
      y: lowestFirst[lowestFirst.length - 1 - i].y,
    }));
    for (const [knots, end, label] of [
      [lowestFirst, lowestFirst[0], "lowest first"],
      [lowestLast, lowestLast[lowestLast.length - 1], "lowest last"],
    ] as const) {
      expectExactAndContained(knots, "rise", label);
      const curve = prepareRootCurve(knots, "rise");
      expect(pchipMinimum(curve, knots[0].x, knots[knots.length - 1].x), label).toBe(end.y);
    }
  });
});

describe("blanks drawn as printed (D-14) and the edges of the rule", () => {
  for (const { name, pick } of [
    { name: "thickness", pick: (s: BlankStation) => s.thicknessMm },
    { name: "width", pick: (s: BlankStation) => s.widthMm },
  ]) {
    it(`a blank whose ${name} is greatest away from its centre station is drawn greatest there, as printed`, () => {
      const offCentre = CATALOG.flatMap((blank) => {
        const centre = blank.stations.find((s) => s.label === "C");
        const centreValue = centre ? pick(centre) : null;
        const knots = knotsOf(blank, pick);
        if (centreValue === null || knots.length < 2) return [];
        const greatest = Math.max(...knots.map((k) => k.y));
        return centreValue < greatest ? [{ blank, knots, greatest }] : [];
      });
      expect(offCentre.length).toBeGreaterThan(0);
      for (const { blank, knots, greatest } of offCentre) {
        const label = `${blank.vendor} ${blank.name} ${name}`;
        const curve = prepareRootCurve(knots, "fall");
        const station = knots.find((k) => k.y === greatest)!;
        expect(curve.sample(station.x), label).toBe(greatest);
        const highest = Math.max(...[0, blank.lengthMm, ...denseAcross(knots)].map((x) => curve.sample(x)));
        expect(highest, label).toBe(greatest);
      }
    });
  }

  it("a curve with one point reads that point everywhere, and a curve with none reads 0, as pchip does", () => {
    for (const kind of ["rise", "fall"] as const) {
      const single = prepareRootCurve([{ x: 600, y: 42 }], kind);
      for (const x of [-100, 0, 600, 1200, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(single.sample(x), `${kind} at ${x}`).toBe(42);
      }
      const empty = prepareRootCurve([], kind);
      for (const x of [-100, 0, 600, Number.NaN]) expect(empty.sample(x), `${kind} at ${x}`).toBe(0);
    }
  });

  it("refuses a bad station with exactly the error pchip gives", () => {
    const sameStation: SplinePoint[] = [
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ];
    const notANumber: SplinePoint[] = [
      { x: 0, y: 1 },
      { x: 10, y: Number.NaN },
    ];
    const backwards: SplinePoint[] = [
      { x: 10, y: 1 },
      { x: 0, y: 2 },
    ];
    for (const points of [sameStation, notANumber, backwards]) {
      const message = pchipError(points);
      for (const kind of ["rise", "fall"] as const) {
        expect(() => prepareRootCurve(points, kind)).toThrow(message);
      }
    }
  });

  it("past either end the curve reads that end's printed value, and a nonsense position reads the first", () => {
    const blank = CATALOG.find((b) => knotsOf(b, (s) => s.thicknessMm).length >= 2)!;
    const knots = knotsOf(blank, (s) => s.thicknessMm);
    const curve = prepareRootCurve(knots, "fall");
    expect(curve.sample(knots[0].x - 100)).toBe(knots[0].y);
    expect(curve.sample(knots[knots.length - 1].x + 100)).toBe(knots[knots.length - 1].y);
    expect(curve.sample(Number.NaN)).toBe(knots[0].y);
  });
});

describe("the rule chosen by measurement, US Blanks as the muse (R2, R3, R5)", () => {
  const KINDS: Record<"rocker" | "thickness" | "width", RootKind> = {
    rocker: "rise",
    thickness: "fall",
    width: "fall",
  };

  /** Each rule's miss at one curve's hidden stations: today's from the pin, the root rule's computed here. */
  function misses(entry: Phase14HiddenEntry, kind: RootKind) {
    const curve = prepareRootCurve(entry.kept, kind);
    const root = entry.hidden.map((h) => Math.abs(curve.sample(h.x) - h.printed));
    const pchip = entry.hidden.map((h) => Math.abs(h.pchip - h.printed));
    return { root, pchip };
  }

  const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

  for (const attribute of ["rocker", "thickness", "width"] as const) {
    const curveName = attribute === "rocker" ? "bottom" : attribute;
    it(`the ${curveName} redrawn from five stations lands closer to the hidden US Blanks stations than today's curve`, () => {
      const entries = PHASE14_TODAY.hiddenStations[attribute];
      expect(entries.length).toBeGreaterThan(0);
      const all = { root: [] as number[], pchip: [] as number[] };
      let closer = 0;
      for (const entry of entries) {
        const { root, pchip } = misses(entry, KINDS[attribute]);
        expect(root.length).toBeGreaterThan(0);
        all.root.push(...root);
        all.pchip.push(...pchip);
        if (mean(root) < mean(pchip)) closer++;
      }
      expect(mean(all.root)).toBeLessThan(mean(all.pchip));
      expect(closer).toBeGreaterThan(entries.length / 2);
    });
  }

  it("the first board a visitor sees reads its five rocker numbers and five thicknesses exactly (acceptance 8)", () => {
    const length = DEFAULT_BOARD_SPEC.outline.length;

    const rocker = prepareRootCurve(fallbackRockerPoints(DEFAULT_FALLBACK_ROCKER, length), "rise");
    for (const { key, station } of rockerStationPositions(length)) {
      const typed = key === "center" ? 0 : DEFAULT_FALLBACK_ROCKER[key];
      expect(rocker.sample(station), key).toBe(typed);
    }
    expect(pchipMinimum(rocker, 0, length)).toBe(0);

    const foil = foilStationPoints(DEFAULT_FOIL_SPEC, length);
    const thickness = prepareRootCurve(
      foil.map((p) => ({ x: p.station, y: p.thickness })),
      "fall",
    );
    for (const { key, station } of foil) {
      expect(thickness.sample(station), key).toBe(DEFAULT_FOIL_SPEC[key]);
    }
  });
});
