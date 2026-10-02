import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import type { BlankRecord, BlankStation } from "./blank";
import type { SplinePoint } from "./pchip";
import { prepareRootCurve, type RootKind } from "./root-curve";

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
