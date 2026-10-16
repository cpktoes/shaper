import { describe, expect, it } from "vitest";
import { formatDim, formatMark, formatSignedMark } from "./measure-display";
import { UNITS_SYSTEMS, inchesToMm, mm } from "./units";
import { wingFigures, wingPrintName } from "./wing-figures";
import { NO_FIN_EDGES, effectiveWingRadius, type Wing, type WingFinEdges } from "./wings";

/**
 * Each wing's printed figures (quick 261015-sei, 2026-10-15, D1). The rule is the WINGS close-up
 * card's own; every expectation here is read off the same measure-display calls the card makes
 * (CLAUDE.md Rule 1), plus the literal strings the founder's test board prints.
 */

const LOCKED: Wing = {
  station: inchesToMm(7.5),
  depth: inchesToMm(3 / 16),
  run: inchesToMm(1 / 4),
  radius: mm(0),
  lock: "front-trailing",
  finOffset: mm(0),
};
const BY_HAND: Wing = {
  station: inchesToMm(4.5),
  depth: inchesToMm(3 / 16),
  run: inchesToMm(1 / 2),
  radius: inchesToMm(1 + 7 / 16),
  lock: null,
  finOffset: mm(0),
};
const EDGES: WingFinEdges = { front: inchesToMm(7.5), rear: null };

describe("wingFigures (quick 261015-sei)", () => {
  it("reads a locked wing 1 the way its card does, in Imperial", () => {
    const [f] = wingFigures([LOCKED], EDGES, "imperial");
    expect(f.number).toBe(1);
    expect(f.locked).toBe(true);
    expect(f.station).toBe(LOCKED.station);
    expect(f.depthAtPosition).toBe('3/16" @ 7 1/2"');
    expect(f.run).toBe('1/4"');
    expect(f.radius).toBe('0"');
    expect(f.offset).toBe('0"');
  });

  it("reads the same wing in Metric: the position in centimetres, the rest in whole millimetres", () => {
    const [f] = wingFigures([LOCKED], EDGES, "metric");
    expect(f.depthAtPosition).toBe("5 mm @ 19.1 cm");
    expect(f.run).toBe("6 mm");
    expect(f.radius).toBe("0 mm");
    expect(f.offset).toBe("0 mm");
  });

  it("equals the card's own formula calls on every wing, in both systems", () => {
    const wings = [LOCKED, BY_HAND];
    for (const system of UNITS_SYSTEMS) {
      const figures = wingFigures(wings, EDGES, system);
      wings.forEach((w, i) => {
        expect(figures[i].depthAtPosition).toBe(`${formatMark(w.depth, system)} @ ${formatDim(w.station, system)}`);
        expect(figures[i].run).toBe(formatMark(w.run, system));
        expect(figures[i].radius).toBe(formatMark(effectiveWingRadius(w), system));
      });
      expect(figures[0].offset).toBe(formatSignedMark(LOCKED.finOffset, system));
      expect(figures[1].offset).toBeNull();
    }
  });

  it("prints the radius that is drawn, not the one asked for", () => {
    // 4" asked on a 1/2" run, 3/16" deep: far more than fits.
    const greedy: Wing = { ...BY_HAND, radius: inchesToMm(4) };
    expect(effectiveWingRadius(greedy)).toBeLessThan(greedy.radius);
    for (const system of UNITS_SYSTEMS) {
      const [f] = wingFigures([greedy], NO_FIN_EDGES, system);
      expect(f.radius).toBe(formatMark(effectiveWingRadius(greedy), system));
      expect(f.radius).not.toBe(formatMark(greedy.radius, system));
    }
  });

  it("calls a wing locked only when its slot holds the lock with its fins present", () => {
    expect(wingFigures([LOCKED], NO_FIN_EDGES, "imperial")[0]).toMatchObject({ locked: false, offset: null });
    const rear: Wing = { ...BY_HAND, lock: "rear-trailing", finOffset: mm(0) };
    expect(wingFigures([LOCKED, rear], { front: EDGES.front, rear: inchesToMm(4.5) }, "imperial")[1].locked).toBe(true);
    // A rear lock in slot 0 is inert.
    expect(wingFigures([rear], { front: null, rear: inchesToMm(4.5) }, "imperial")[0].locked).toBe(false);
    // A by-hand wing has no offset.
    expect(wingFigures([BY_HAND], EDGES, "imperial")[0].offset).toBeNull();
  });

  it("signs the offset: toward the nose is plus", () => {
    const plus = wingFigures([{ ...LOCKED, finOffset: inchesToMm(1 / 4) }], EDGES, "imperial")[0];
    const minus = wingFigures([{ ...LOCKED, finOffset: inchesToMm(-1 / 2) }], EDGES, "imperial")[0];
    expect(plus.offset).toBe('+1/4"');
    expect(minus.offset).toBe('-1/2"');
    expect(wingFigures([{ ...LOCKED, finOffset: inchesToMm(1 / 4) }], EDGES, "metric")[0].offset).toBe("+6 mm");
  });

  it("gives an empty list for no wings", () => {
    expect(wingFigures([], EDGES, "imperial")).toEqual([]);
  });
});

describe("wingPrintName (quick 261015-sei)", () => {
  it("adds · Fin only for a locked wing", () => {
    expect(wingPrintName({ number: 1, locked: true })).toBe("Wing 1 · Fin");
    expect(wingPrintName({ number: 2, locked: false })).toBe("Wing 2");
  });
});
