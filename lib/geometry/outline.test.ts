import { describe, expect, it } from "vitest";
import type { TailShape } from "./board";
import { buildOutline, sampleOutline } from "./outline";
import { degrees, inchesToMm, mmToInches } from "./units";
import golden from "./__fixtures__/prototype-outline-golden.json";

const TOLERANCE_IN = 1e-6;
const SQ_IN_PER_SQ_MM = 1 / (25.4 * 25.4);

interface GoldenState {
  lengthIn: number;
  centerWidth: number;
  wpOffset: number;
  tailBlockWidth: number;
  tailType: "pin" | "round" | "squash" | "diamond" | "swallow";
  swallowDepth: number;
  diamondDepth: number;
  widepointVector: number;
  tailAngle: number;
  tailVector: number;
  noseAngle: number;
  noseVector: number;
}

function toTailShape(state: GoldenState): TailShape {
  switch (state.tailType) {
    case "pin":
      return { kind: "pin" };
    case "round":
      return { kind: "round" };
    case "squash":
      return { kind: "squash", endWidth: inchesToMm(state.tailBlockWidth) };
    case "diamond":
      return {
        kind: "diamond",
        endWidth: inchesToMm(state.tailBlockWidth),
        depth: inchesToMm(state.diamondDepth),
      };
    case "swallow":
      return {
        kind: "swallow",
        endWidth: inchesToMm(state.tailBlockWidth),
        crotchDepth: inchesToMm(state.swallowDepth),
      };
  }
}

function toOutlineSpec(state: GoldenState) {
  return {
    length: inchesToMm(state.lengthIn),
    widePointWidth: inchesToMm(state.centerWidth),
    widePointOffset: inchesToMm(state.wpOffset),
    railLength: state.widepointVector,
    noseAngle: degrees(state.noseAngle),
    noseFullness: state.noseVector,
    tailAngle: degrees(state.tailAngle),
    tailFullness: state.tailVector,
    tail: toTailShape(state),
  };
}

const goldenEntries = Object.entries(golden) as [string, (typeof golden)[keyof typeof golden]][];

describe("buildOutline golden parity", () => {
  for (const [name, fixture] of goldenEntries) {
    describe(`fixture: ${name}`, () => {
      const spec = toOutlineSpec(fixture.state as GoldenState);
      const geometry = buildOutline(spec);

      it("matches tailWidthAt12", () => {
        expect(mmToInches(geometry.tailWidthAt12in)).toBeCloseTo(
          fixture.tailWidthAt12,
          6,
        );
      });

      it("matches noseWidthAt12", () => {
        expect(mmToInches(geometry.noseWidthAt12in)).toBeCloseTo(
          fixture.noseWidthAt12,
          6,
        );
      });

      it("matches widepoint station (wpY)", () => {
        expect(mmToInches(geometry.widePointStation)).toBeCloseTo(fixture.wpY, 6);
      });

      it("matches half widepoint width (cw)", () => {
        expect(mmToInches(geometry.halfWidePointWidth)).toBeCloseTo(fixture.cw, 6);
      });

      it("matches half tail block width (bw)", () => {
        expect(mmToInches(geometry.halfTailBlockWidth)).toBeCloseTo(fixture.bw, 6);
      });

      it("matches centre close station (centerCloseY)", () => {
        expect(mmToInches(geometry.centreCloseStation)).toBeCloseTo(
          fixture.centerCloseY,
          6,
        );
      });

      it("matches effective diamond depth (diamondDepthEff)", () => {
        expect(mmToInches(geometry.effectiveDiamondDepth)).toBeCloseTo(
          fixture.diamondDepthEff,
          6,
        );
      });

      it("matches area within 1e-6 relative", () => {
        const areaIn = geometry.area * SQ_IN_PER_SQ_MM;
        expect(Math.abs(areaIn - fixture.area) / fixture.area).toBeLessThan(1e-6);
      });

      it("matches half-width sampled every 3 inches along the board", () => {
        for (const { station, halfWidth } of fixture.halfWidthAtStations) {
          const sampled = mmToInches(sampleOutline(geometry, inchesToMm(station)));
          expect(sampled).toBeCloseTo(halfWidth, 6);
        }
      });
    });
  }
});

describe("buildOutline invariants", () => {
  for (const [name, fixture] of goldenEntries) {
    const spec = toOutlineSpec(fixture.state as GoldenState);
    const geometry = buildOutline(spec);

    it(`${name}: points are ordered by station, non-decreasing, half-width >= 0`, () => {
      for (let i = 0; i < geometry.points.length; i++) {
        expect(geometry.points[i].halfWidth).toBeGreaterThanOrEqual(0);
        if (i > 0) {
          expect(geometry.points[i].station).toBeGreaterThanOrEqual(
            geometry.points[i - 1].station,
          );
        }
      }
    });

    it(`${name}: the widepoint is the maximum half-width across all sampled points`, () => {
      const maxHalfWidth = Math.max(...geometry.points.map((p) => p.halfWidth));
      expect(maxHalfWidth).toBeCloseTo(geometry.halfWidePointWidth, 9);
    });

    it(`${name}: area is positive`, () => {
      expect(geometry.area).toBeGreaterThan(0);
    });
  }

  it("default board area falls within 45%-90% of the length-by-width bounding box", () => {
    const fixture = golden.default;
    const boundingBoxSqIn = fixture.state.lengthIn * fixture.state.centerWidth;
    const ratio = fixture.area / boundingBoxSqIn;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.9);
  });

  it("default board plausibility: tail/nose widths at 12in are sane and less than widepoint width", () => {
    const fixture = golden.default;
    expect(fixture.tailWidthAt12).toBeGreaterThan(9);
    expect(fixture.tailWidthAt12).toBeLessThan(16);
    expect(fixture.noseWidthAt12).toBeGreaterThan(8);
    expect(fixture.noseWidthAt12).toBeLessThan(15);
    expect(fixture.tailWidthAt12).toBeLessThan(fixture.state.centerWidth);
    expect(fixture.noseWidthAt12).toBeLessThan(fixture.state.centerWidth);
  });
});

describe("tail-shape rules", () => {
  it("a pin tail forces the tail block half-width to zero", () => {
    const spec = toOutlineSpec({ ...(golden.default.state as GoldenState), tailType: "pin" });
    const geometry = buildOutline(spec);
    expect(geometry.tailBlockPinned).toBe(true);
    expect(geometry.halfTailBlockWidth).toBe(0);
  });

  it("a round tail forces the tail block half-width to zero", () => {
    const spec = toOutlineSpec({ ...(golden.default.state as GoldenState), tailType: "round" });
    const geometry = buildOutline(spec);
    expect(geometry.tailBlockPinned).toBe(true);
    expect(geometry.halfTailBlockWidth).toBe(0);
  });

  it("a diamond tail with 5in requested depth and a 4in tail block clamps to exactly 2in", () => {
    const geometry = buildOutline(toOutlineSpec(golden.diamondClamped.state as GoldenState));
    expect(mmToInches(geometry.effectiveDiamondDepth)).toBeCloseTo(2, 6);
  });

  it("a diamond with 3in depth and a 10in block keeps its full 3in", () => {
    const geometry = buildOutline(toOutlineSpec(golden.diamond.state as GoldenState));
    expect(mmToInches(geometry.effectiveDiamondDepth)).toBeCloseTo(3, 6);
  });

  it("a swallow tail sets the centre closing station to its crotch depth", () => {
    const geometry = buildOutline(toOutlineSpec(golden.swallow.state as GoldenState));
    expect(mmToInches(geometry.centreCloseStation)).toBeCloseTo(
      (golden.swallow.state as GoldenState).swallowDepth,
      6,
    );
  });

  it("every non-swallow tail shape leaves the centre closing station at zero", () => {
    for (const name of ["default", "pin", "round", "diamond", "squash"] as const) {
      const geometry = buildOutline(toOutlineSpec(golden[name].state as GoldenState));
      expect(mmToInches(geometry.centreCloseStation)).toBeCloseTo(0, 9);
    }
  });
});

describe("widepoint station clamp", () => {
  it("clamps to no closer than 16in from either end", () => {
    const base = golden.default.state as GoldenState;

    const forward = buildOutline(toOutlineSpec({ ...base, wpOffset: 30 }));
    expect(mmToInches(forward.widePointStation)).toBeCloseTo(56, 6);

    const backward = buildOutline(toOutlineSpec({ ...base, wpOffset: -30 }));
    expect(mmToInches(backward.widePointStation)).toBeCloseTo(16, 6);
  });
});
