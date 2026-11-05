import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  boardOutlineLoop,
  boardProfileLines,
  boardSlices,
  buildBoardSurface,
  enclosedVolumeMm3,
  meshCheck,
  placedHalfSection,
  SURFACE_FACE,
  SURFACE_POINTS,
  SURFACE_STATION_STEP_IN,
  surfaceStations,
  type BoardSurface,
  type BoardSurfaceInput,
  type SurfaceRing,
} from "./board-surface";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "./design";
import { sectionFinishedRail } from "./finished-rail";
import { foilStationPoints } from "./foil";
import { buildOutline, foamHalfWidth, sampleOutline, tailCutStation } from "./outline";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "./rail-bands";
import { inchesToMm, mm } from "./units";
import {
  boardSectionEnds,
  boardSections,
  computeCrossSectionVolume,
  crossSectionStations,
  railCharacterDifferences,
} from "./volume";
import { outlineWithoutWings, WING_HAIR_MM, wingFootprint, wingStepShape } from "./wings";
import { phase16Boards, phase16RailCharacterBoards, phase16WingBoards } from "./__fixtures__/phase16-boards";

/**
 * The 3D board's surface (Phase 16, D-05): the litres' own sections lofted along the rocker. Every expected
 * figure here is the app's own — VOLUME's litres, the side profile's rocker and deck, the litres' stations,
 * the outline's widths, or a vertex of the same mesh — never a typed number (Rule 1).
 */

/** A board's surface input, built exactly as the litres build theirs, and its side profile. */
function surfaceInputOf(fields: DesignSummaryFields) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const sections = designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  const input: BoardSurfaceInput = { sections, geometry, rockerAt: profile.rockerAt };
  return { input, profile, geometry };
}

/** A ring's vertices (every piece), as [x, y, z]. */
function ringPoints(positions: Float64Array, ring: { pieces: { first: number; count: number }[] }) {
  const out: [number, number, number][] = [];
  for (const piece of ring.pieces) {
    for (let k = 0; k < piece.count; k++) {
      const v = piece.first + k;
      out.push([positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]]);
    }
  }
  return out;
}

/** Every vertex of a mesh as an exact "x,y,z" key — a point is a vertex only if it is the very numbers. */
function vertexKeys(surface: BoardSurface): Set<string> {
  const keys = new Set<string>();
  const p = surface.positions;
  for (let v = 0; v < p.length / 3; v++) keys.add(`${p[3 * v]},${p[3 * v + 1]},${p[3 * v + 2]}`);
  return keys;
}
const keyOf = (p: readonly number[]) => `${p[0]},${p[1]},${p[2]}`;

/**
 * Whether a station's section is drawn wider than the foam, so the surface cuts it at the stringer before
 * its flat deck begins (research "Narrow tips", Pitfall 7): the finished rail's deck end lies inboard of the
 * stringer, for either end of the station's blend.
 */
function cutAtStringer(input: BoardSurfaceInput, station: number): boolean {
  return endSections(input, station).some(
    (section) => section.result && -sectionFinishedRail(section.result, section.domed).samples[0].x > section.halfWidth,
  );
}

/** A station's two end sections under the live rule (D-32) — the base alone and the tip alone. */
function endSections(input: BoardSurfaceInput, station: number) {
  const { base, tip } = boardSectionEnds(input.sections, mm(station));
  return [base, tip] as const;
}

/** Whether a station's section blends two rails (D-32): its tip weight strictly between 0 and 1. */
function isBlending(input: BoardSurfaceInput, station: number): boolean {
  const [section] = boardSections(input.sections, [mm(station)]);
  return section.tipWeight > 0 && section.tipWeight < 1;
}

/** The foam a ring's right half and its mirror enclose (the half closed along the stringer), worked out afresh. */
function halfArea(half: readonly (readonly [number, number])[]): number {
  let sum = 0;
  for (let i = 0; i < half.length; i++) {
    const [a, b] = half[i];
    const [c, d] = half[(i + 1) % half.length];
    sum += a * d - c * b;
  }
  return Math.abs(sum);
}

const BOARDS = phase16Boards();
const boardOf = (label: string) => BOARDS.find((board) => board.label === label)!.fields;

/** A board built once, with what the tests compare it against. */
function built(board: { label: string; fields: DesignSummaryFields }) {
  const { input, profile, geometry } = surfaceInputOf(board.fields);
  const surface = buildBoardSurface(input);
  return { label: board.label, fields: board.fields, input, profile, geometry, surface };
}
/** Each of the forty boards built once. */
const BUILT = BOARDS.map(built);
/** All 74 (D-32): the forty, then the 34 whose rail character the second pin records. */
const BUILT_LIVE = [...BUILT, ...phase16RailCharacterBoards().map(built)];
const isSwallow = (geometry: ReturnType<typeof buildOutline>) => geometry.centreCloseStation > geometry.points[0].station;
const isDiamond = (geometry: ReturnType<typeof buildOutline>) => geometry.centreCloseStation < geometry.points[0].station;

describe("the Shortboard as one closed surface from the litres' own sections (tracer)", () => {
  // The Shortboard as its card opens it: its own tail, Hard Edge on.
  const { input, profile } = surfaceInputOf(boardOf("shortboard|asis|hard"));
  const surface = buildBoardSurface(input);

  it("opens with Hard Edge on, so the fade is in the surface", () => {
    expect(input.sections.rails.tailHardEdge).toBe(true);
  });

  it("is closed, consistently wound and has no zero-area triangle", () => {
    expect(meshCheck(surface)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
    expect(surface.triangleCount).toBe(surface.indices.length / 3);
    expect(surface.faceKinds.length).toBe(surface.triangleCount);
  });

  it("holds a hair less foam than VOLUME counts, never more (within 0.15%)", () => {
    const litres = computeCrossSectionVolume(input.sections).volumeLitres;
    const ratio = enclosedVolumeMm3(surface) / 1e6 / litres;
    expect(ratio).toBeGreaterThan(0.9985);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it("takes a ring at every one of the litres' own stations, the very numbers", () => {
    const ringStations = new Set(surface.rings.map((ring) => ring.station as number));
    const litresStations = crossSectionStations(input.sections.length, tailCutStation(input.geometry));
    for (const s of litresStations) expect(ringStations.has(s)).toBe(true);
    expect(surface.rings.filter((ring) => ring.isSlice).map((ring) => ring.station)).toEqual(litresStations);
    expect(surface.rings.map((ring) => ring.station)).toEqual(surfaceStations(input));
  });

  it("sits on the rocker, and between the 12-inch stations its top is the side profile's deck", () => {
    const anchors = foilStationPoints(input.sections.foil, input.sections.length);
    const tail12 = anchors[1].station;
    const nose12 = anchors[3].station;
    let checked = 0;
    for (const ring of surface.rings) {
      const zs = ringPoints(surface.positions, ring).map((p) => p[2]);
      const low = Math.min(...zs);
      const high = Math.max(...zs);
      // Never below the rocker anywhere.
      expect(low).toBeGreaterThanOrEqual(profile.rockerAt(ring.station) - 1e-6);
      if (ring.station >= tail12 && ring.station <= nose12) {
        expect(Math.abs(low - profile.rockerAt(ring.station))).toBeLessThan(1e-6);
        expect(Math.abs(high - profile.deckAt(ring.station))).toBeLessThan(1e-6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe("where the surface takes its rings", () => {
  for (const { label, input } of BUILT.filter((b) => b.label.endsWith("|asis|hard") || b.label.includes("swallow"))) {
    it(`${label}: never more than half an inch apart, with the 12-inch stations, the centre, the tail cut and the fade's end`, () => {
      const stations = surfaceStations(input);
      const step = inchesToMm(SURFACE_STATION_STEP_IN);
      expect(stations[0]).toBe(0);
      expect(stations[stations.length - 1]).toBe(input.sections.length);
      for (let i = 1; i < stations.length; i++) {
        expect(stations[i] - stations[i - 1]).toBeGreaterThan(1e-6);
        expect(stations[i] - stations[i - 1]).toBeLessThanOrEqual(step + 1e-9);
      }
      const anchors = foilStationPoints(input.sections.foil, input.sections.length);
      const wanted = [anchors[1].station, anchors[2].station, anchors[3].station];
      const cut = tailCutStation(input.geometry);
      if (cut > 0) wanted.push(cut);
      const { rails, length } = input.sections;
      if (railCharacterDifferences(rails, "tail").length > 0) {
        wanted.push(hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length));
      }
      for (const s of wanted) expect(stations).toContain(s);
    });
  }

  it("a fade set off the grid (blends from 20 1/2\", ends at 33\") gets a ring exactly at its start and its end", () => {
    const fields = boardOf("fish|asis|hard");
    const set: DesignSummaryFields = {
      ...fields,
      rails: { ...fields.rails, tailHardEdgeBlendsFrom: inchesToMm(20.5), tailHardEdgeEndsAt: inchesToMm(33) },
    };
    const { input } = surfaceInputOf(set);
    const { rails, length } = input.sections;
    // The board's own readers keep both settings as set.
    expect(hardEdgeBlendsFrom(rails, length)).toBe(inchesToMm(20.5));
    expect(hardEdgeEndsAt(rails, length)).toBe(inchesToMm(33));
    const surface = buildBoardSurface(input);
    const stations = surface.rings.map((ring) => ring.station as number);
    expect(stations).toContain(inchesToMm(20.5));
    expect(stations).toContain(inchesToMm(33));
    // Fully hard up to the start, fading between, gone at the end — as boardSections says.
    const at = (s: number) => surface.rings[stations.indexOf(s)];
    expect(at(inchesToMm(20.5)).sharpness).toBe(1);
    expect(at(inchesToMm(33)).sharpness).toBe(boardSections(input.sections, [inchesToMm(33)])[0].sharpness);
    expect(surface.rings.some((ring) => ring.station > inchesToMm(20.5) && ring.station < inchesToMm(33) && ring.sharpness > 0 && ring.sharpness < 1)).toBe(true);
    expect(meshCheck(surface)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
    const litres = computeCrossSectionVolume(input.sections).volumeLitres;
    const gap = (enclosedVolumeMm3(surface) / 1e6 - litres) / litres;
    expect(gap).toBeLessThanOrEqual(0);
    expect(gap).toBeGreaterThan(-0.0015);
  });
});

describe("a tucked tail with Hard Edge off still gets a ring at each end of its blend (D-32)", () => {
  for (const { label, input, surface } of BUILT_LIVE.filter((b) => /^tucked\|.*\|tail-(sbt|single)$/.test(b.label))) {
    it(`${label}: rings at Tail Rail Blends From and Ends At, the tail's rail behind, the centre's beyond`, () => {
      const { rails, length } = input.sections;
      expect(rails.tailHardEdge).toBe(false);
      expect(railCharacterDifferences(rails, "tail").length).toBeGreaterThan(0);
      const stations = surface.rings.map((ring) => ring.station as number);
      const [from, to] = [hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length)];
      expect(stations).toContain(from);
      expect(stations).toContain(to);
      const sections = boardSections(input.sections, [from, to]);
      expect(sections[0].tipWeight).toBe(1);
      expect(sections[1].tipWeight).toBe(0);
    });
  }
});

describe("the surface reads boardSections element for element, at the fade's new defaults (D-30, D-32)", () => {
  for (const { label, input, geometry, surface } of BUILT_LIVE) {
    it(`${label}: each ring is its boardSections section — station, width and sharpness`, () => {
      const sections = boardSections(input.sections, surfaceStations(input));
      expect(surface.rings.map((ring) => ring.station)).toEqual(sections.map((section) => section.station));
      const crotch = isSwallow(geometry) ? geometry.centreCloseStation : -1;
      surface.rings.forEach((ring, i) => {
        const section = sections[i];
        expect(ring.sharpness).toBe(section.sharpness);
        if (section.halfWidth > 0 && ring.station >= crotch) {
          const widest = Math.max(...ringPoints(surface.positions, ring).map((q) => q[1]));
          expect(Math.abs(widest - section.halfWidth)).toBeLessThan(1e-9);
        }
      });
    });
  }
});

describe("all 74 boards: closed, and a hair under VOLUME's litres (SPEC acceptance 3 and 5, D-32)", () => {
  it("checks every one of the 74", () => {
    expect(BUILT).toHaveLength(40);
    expect(BUILT_LIVE).toHaveLength(74);
  });
  for (const { label, input, surface } of BUILT_LIVE) {
    it(`${label}: watertight, consistently wound, no zero-area triangle; (mesh − litres)/litres in (−0.15%, 0]`, () => {
      expect(meshCheck(surface)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
      const litres = computeCrossSectionVolume(input.sections).volumeLitres;
      const gap = (enclosedVolumeMm3(surface) / 1e6 - litres) / litres;
      expect(gap).toBeLessThanOrEqual(0);
      expect(gap).toBeGreaterThan(-0.0015);
    });
  }
});

describe("the 28 winged boards: the surface steps where TEMPLATE does and the deck runs through (D-33)", () => {
  const BUILT_WINGED = phase16WingBoards().map(built);
  const n = SURFACE_POINTS.deck + SURFACE_POINTS.rail + SURFACE_POINTS.bottom - 2;

  it("checks every one of the 28", () => {
    expect(BUILT_WINGED).toHaveLength(28);
  });

  for (const { label, fields, input, geometry, surface } of BUILT_WINGED) {
    it(`${label}: watertight, and its volume within 0.15% of VOLUME's litres`, () => {
      expect(meshCheck(surface)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
      const litres = computeCrossSectionVolume(input.sections).volumeLitres;
      expect(Math.abs(enclosedVolumeMm3(surface) / 1e6 - litres) / litres).toBeLessThan(0.0015);
    });

    it(`${label}: every ring behind a wing is its section's drawn half`, () => {
      const sections = boardSections(input.sections, surfaceStations(input));
      let drawn = 0;
      surface.rings.forEach((ring, i) => {
        const half = sections[i].drawn;
        if (!half) return;
        drawn++;
        const right = ringPoints(surface.positions, { pieces: [ring.pieces[0]] }).slice(0, n);
        right.forEach(([, y, z], j) => {
          expect(Math.abs(y - (ring.pieces[0].inner + half[j][0]))).toBeLessThan(1e-9);
          expect(Math.abs(z - input.rockerAt(ring.station) - half[j][1])).toBeLessThan(1e-9);
        });
      });
      expect(drawn).toBeGreaterThan(10);
    });

    it(`${label}: rings stand at each step point, a hair either side of a square step's station, and nowhere else new`, () => {
      const plain = surfaceInputOf({ ...fields, outline: outlineWithoutWings(fields.outline) }).input;
      const before = new Set<number>(surfaceStations(plain));
      const added = surfaceStations(input).filter((s) => !before.has(s));
      const stepPoints = geometry.wings!.flatMap((wing) => {
        const { points } = wingStepShape(wing);
        return points.flatMap((point) => {
          const square = points.some((other) => other.station === point.station && other.inward !== point.inward);
          return square ? [point.station - WING_HAIR_MM, point.station + WING_HAIR_MM] : [point.station];
        });
      });
      const stations = surfaceStations(input);
      for (const s of stepPoints) expect(stations.some((t) => Math.abs(t - s) < 1e-6)).toBe(true);
      for (const s of added) expect(stepPoints.some((t) => Math.abs(t - s) < 1e-6)).toBe(true);
    });

    it(`${label}: the 3D outline strays no more than 0.1 mm from TEMPLATE's around each wing`, () => {
      const loop = boardOutlineLoop(surface);
      const nose = loop.findIndex((q) => q[0] === surface.length);
      const right = loop.slice(0, nose + 1);
      for (const wing of geometry.wings!) {
        const { inner, stepStart, shape } = wingFootprint(wing);
        const square = shape.points.some((a, i) => shape.points.some((b, j) => i !== j && a.station === b.station && a.inward !== b.inward));
        const from = inner - inchesToMm(1);
        const to = stepStart + inchesToMm(1);
        let k = 0;
        for (let s = from; s <= to; s += 0.25) {
          if (square && Math.abs(s - wing.station) < 0.001) continue;
          while (right[k + 1][0] < s) k++;
          const [a, b] = [right[k], right[k + 1]];
          const y = a[1] + ((b[1] - a[1]) * (s - a[0])) / (b[0] - a[0]);
          expect(Math.abs(y - sampleOutline(geometry, mm(s)))).toBeLessThan(0.1);
        }
      }
    });
  }
});

describe("inside a blend the litres count the ring the 3D board draws (D-31, level variant; D-32)", () => {
  for (const { label, input, surface } of BUILT.filter((b) => b.input.sections.rails.tailHardEdge)) {
    it(`${label}: each blending station's area is its drawn ring's area plus the end rings' blended shortfalls`, () => {
      const fading = surface.rings.filter((ring) => isBlending(input, ring.station));
      expect(fading.length).toBeGreaterThan(5);
      for (const ring of fading) {
        const [section] = boardSections(input.sections, [ring.station]);
        const w = section.tipWeight;
        // The ring as drawn: the right half of the mesh's own ring, height above the rocker.
        const drawn = ringPoints(surface.positions, ring)
          .slice(0, SURFACE_POINTS.deck + SURFACE_POINTS.rail + SURFACE_POINTS.bottom - 2)
          .map(([, y, z]) => [y, z - input.rockerAt(ring.station)] as [number, number]);
        const [baseEnd, tipEnd] = endSections(input, ring.station);
        const shortfall = (end: typeof baseEnd) => end.area - halfArea(placedHalfSection(end, end.halfWidth, 0));
        const expected = halfArea(drawn) + (1 - w) * shortfall(baseEnd) + w * shortfall(tipEnd);
        expect(Math.abs(section.area - expected) / section.area).toBeLessThan(1e-9);
      }
    });
  }
});

describe("a long fade on any board sits in the same band as every other (D-30, D-31, D-32)", () => {
  const settings = [
    { name: "blends from 12\", ends at the centre", from: 12 },
    { name: "blends from 30\", ends at the centre", from: 30 },
  ];
  const tucked = phase16RailCharacterBoards().filter((b) => b.label.startsWith("tucked|"));
  for (const board of [...BOARDS.filter((b) => b.fields.rails.tailHardEdge), ...tucked]) {
    for (const { name, from } of settings) {
      it(`${board.label}, ${name}: watertight and (mesh − litres)/litres in (−0.15%, 0]`, () => {
        const fields: DesignSummaryFields = {
          ...board.fields,
          rails: { ...board.fields.rails, tailHardEdgeBlendsFrom: inchesToMm(from), tailHardEdgeEndsAt: mm(board.fields.outline.length / 2) },
        };
        const { input } = surfaceInputOf(fields);
        expect(hardEdgeEndsAt(input.sections.rails, input.sections.length)).toBe(input.sections.length / 2);
        const surface = buildBoardSurface(input);
        expect(meshCheck(surface)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
        const litres = computeCrossSectionVolume(input.sections).volumeLitres;
        const gap = (enclosedVolumeMm3(surface) / 1e6 - litres) / litres;
        expect(gap).toBeLessThanOrEqual(0);
        expect(gap).toBeGreaterThan(-0.0015);
      });
    }
  }
});

describe("a swallow's tail: two pieces from the notch wall to the rail, meeting at the crotch (D-05)", () => {
  const swallows = BUILT.filter((b) => isSwallow(b.geometry));
  it("checks every swallow of the set", () => {
    expect(swallows.length).toBe(BUILT.filter((b) => b.label.includes("swallow") || b.label.startsWith("fish|asis")).length);
  });
  for (const { label, geometry, surface } of swallows) {
    it(`${label}: no triangle crosses the notch's inner edge, and the pieces join only along the crotch`, () => {
      const crotch = geometry.centreCloseStation;
      const innerAt = new Map<number, number>();
      for (const ring of surface.rings) if (ring.station < crotch) innerAt.set(ring.station, ring.pieces[0].inner);
      const p = surface.positions;
      let checked = 0;
      for (let t = 0; t < surface.triangleCount; t++) {
        const vs = [0, 1, 2].map((e) => surface.indices[3 * t + e]);
        const xs = vs.map((v) => p[3 * v]);
        if (xs.some((x) => x > crotch)) continue;
        const ys = vs.map((v) => p[3 * v + 1]);
        // The two pieces never share a triangle.
        expect(ys.some((y) => y > 1e-9) && ys.some((y) => y < -1e-9)).toBe(false);
        if (xs.every((x) => x < crotch)) {
          for (let e = 0; e < 3; e++) {
            const inner = innerAt.get(xs[e]);
            if (inner === undefined) continue; // a tip's flat cap
            expect(Math.abs(ys[e])).toBeGreaterThanOrEqual(inner - 1e-9);
          }
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
      // Every stringer-plane vertex behind the crotch is at the crotch itself.
      for (let v = 0; v < p.length / 3; v++) {
        if (p[3 * v] < crotch + 1e-9 && Math.abs(p[3 * v + 1]) <= 1e-9) expect(p[3 * v]).toBe(crotch);
      }
      // Inside the notch every ring is two pieces, each with its wall; at the crotch, one.
      for (const ring of surface.rings) {
        if (ring.station < crotch) {
          expect(ring.pieces).toHaveLength(2);
          expect(ring.pieces[0].inner).toBeGreaterThan(0);
        } else expect(ring.pieces).toHaveLength(1);
      }
      expect(Array.from(surface.faceKinds).filter((k) => k === SURFACE_FACE.wallRight).length).toBeGreaterThan(0);
      // The tail end has no foam (foamHalfWidth is 0 there): each piece comes to a point.
      expect(foamHalfWidth(geometry, mm(0))).toBe(0);
      expect(surface.rings[0].pieces.map((piece) => piece.count)).toEqual([1, 1]);
    });
  }
});

describe("a diamond's V is foam, narrowing to nothing at its tip — no wall", () => {
  const diamonds = BUILT.filter((b) => isDiamond(b.geometry));
  it("checks every diamond of the set", () => {
    expect(diamonds.length).toBe(BUILT.filter((b) => b.label.includes("diamond")).length);
  });
  for (const { label, geometry, surface } of diamonds) {
    it(`${label}: the tip ring is one point and every ring in the V is as wide as foamHalfWidth`, () => {
      expect(surface.rings[0].pieces).toEqual([{ first: surface.rings[0].pieces[0].first, count: 1, inner: 0 }]);
      expect(surface.positions[3 * surface.rings[0].pieces[0].first + 1]).toBe(0);
      let inV = 0;
      for (const ring of surface.rings) {
        expect(ring.pieces).toHaveLength(1);
        if (ring.station > geometry.centreCloseStation && ring.station < geometry.points[0].station) {
          const widest = Math.max(...ringPoints(surface.positions, ring).map((q) => q[1]));
          expect(Math.abs(widest - foamHalfWidth(geometry, ring.station))).toBeLessThan(1e-9);
          inV++;
        }
      }
      expect(inV).toBeGreaterThan(0);
      const kinds = new Set(surface.faceKinds);
      expect(kinds.has(SURFACE_FACE.wallRight) || kinds.has(SURFACE_FACE.wallLeft)).toBe(false);
    });
  }
});

describe("the tips: a point where there is no foam, a flat cap where there is", () => {
  for (const { label, geometry, surface } of BUILT) {
    it(`${label}: the nose tip is one point; the tail end is a point or a capped end`, () => {
      const last = surface.rings[surface.rings.length - 1];
      expect(last.pieces.map((piece) => piece.count)).toEqual([1]);
      const kinds = Array.from(surface.faceKinds);
      const tailWidth = foamHalfWidth(geometry, mm(0));
      if (tailWidth > 0) {
        expect(surface.rings[0].pieces[0].count).toBeGreaterThan(2);
        expect(kinds).toContain(SURFACE_FACE.capTail);
      } else {
        expect(surface.rings[0].pieces.every((piece) => piece.count === 1)).toBe(true);
        expect(kinds).not.toContain(SURFACE_FACE.capTail);
      }
      expect(kinds).not.toContain(SURFACE_FACE.capNose);
    });
  }
});

describe("a board the builder can't build is refused, naming the value", () => {
  const { input } = surfaceInputOf(boardOf("fish|asis|hard"));
  it("refuses a thickness that is not a number", () => {
    const bad: BoardSurfaceInput = { ...input, sections: { ...input.sections, thicknessAt: () => mm(Number.NaN) } };
    expect(() => buildBoardSurface(bad)).toThrow(/thickness .* is not a finite number/);
  });
  it("refuses a rocker or a width that is not a number", () => {
    expect(() => buildBoardSurface({ ...input, rockerAt: () => mm(Number.POSITIVE_INFINITY) })).toThrow(/rocker/);
    const noWidth: BoardSurfaceInput = { ...input, sections: { ...input.sections, halfWidthAt: () => mm(Number.NaN) } };
    expect(() => buildBoardSurface(noWidth)).toThrow(/width/);
  });
  it("refuses a length that is not a number, or outside 60\"–120\"", () => {
    for (const length of [Number.NaN, inchesToMm(50), inchesToMm(130)]) {
      const bad: BoardSurfaceInput = { ...input, sections: { ...input.sections, length: mm(length) } };
      expect(() => buildBoardSurface(bad)).toThrow(/length/);
    }
  });
});

describe("the rail fades smoothly along the board (D-20/D-27, D-32)", () => {
  for (const label of [
    "shortboard|asis|hard",
    "fish|asis|hard",
    "longboard|pin|hard",
    "tucked|shortboard|tail-sbt",
    "tucked|midlength|nose-sbt",
  ]) {
    it(`${label}: a blending ring lies point for point between its base and its tip half`, () => {
      const { input, surface } = BUILT_LIVE.find((b) => b.label === label)!;
      const fading = surface.rings.filter((ring) => isBlending(input, ring.station));
      expect(fading.length).toBeGreaterThan(5);
      for (const ring of fading) {
        const [section] = boardSections(input.sections, [ring.station]);
        expect(section.blended).toBeDefined();
        expect(ring.sharpness).toBe(section.sharpness);
        const [baseEnd, tipEnd] = endSections(input, ring.station);
        const tucked = placedHalfSection(baseEnd, baseEnd.halfWidth, 0);
        const hard = placedHalfSection(tipEnd, tipEnd.halfWidth, 0);
        const w = section.tipWeight;
        // The ring's loop starts with the right half, stringer deck point first — and it IS the section's ring.
        const right = ringPoints(surface.positions, ring).slice(0, tucked.length);
        right.forEach(([, y, z], i) => {
          const h = z - input.rockerAt(ring.station);
          expect(y).toBe(section.blended![i][0]);
          expect(Math.abs(h - section.blended![i][1])).toBeLessThan(1e-9);
          expect(Math.abs(y - ((1 - w) * tucked[i][0] + w * hard[i][0]))).toBeLessThan(1e-9);
          expect(Math.abs(h - ((1 - w) * tucked[i][1] + w * hard[i][1]))).toBeLessThan(1e-9);
        });
      }
    });
  }
});

describe("the slices, the outline and the profile come straight off the mesh (R8, D-24, D-26)", () => {
  for (const { label, input, geometry, profile, surface } of BUILT) {
    it(`${label}: one slice per litres station with foam, every point a vertex; outline and profile vertices too`, () => {
      const keys = vertexKeys(surface);
      const slices = boardSlices(surface);
      const withFoam = boardSections(input.sections).filter((section) => section.halfWidth > 0);
      expect(slices.map((slice) => slice.station)).toEqual(withFoam.map((section) => section.station));
      const crotch = isSwallow(geometry) ? geometry.centreCloseStation : -1;
      for (const slice of slices) {
        expect(slice.loops).toHaveLength(slice.station < crotch ? 2 : 1);
        for (const loop of slice.loops) {
          expect(loop.length).toBeGreaterThan(2);
          for (const q of loop) expect(keys.has(keyOf(q))).toBe(true);
        }
      }

      const outline = boardOutlineLoop(surface);
      for (const q of outline) expect(keys.has(keyOf(q))).toBe(true);
      // Clear of the tail cut, each rail's widest point is the outline's own half-width.
      const clear = Math.max(geometry.points[0].station, geometry.centreCloseStation);
      for (const q of outline) {
        if (q[0] > clear) expect(Math.abs(Math.abs(q[1]) - sampleOutline(geometry, mm(q[0])))).toBeLessThan(1e-9);
      }

      const anchors = foilStationPoints(input.sections.foil, input.sections.length);
      const { deck, bottom } = boardProfileLines(surface);
      let exact = 0;
      expect(deck).toHaveLength(surface.rings.length);
      expect(bottom).toHaveLength(surface.rings.length);
      surface.rings.forEach((ring: SurfaceRing, i) => {
        for (const q of [deck[i], bottom[i]]) expect(keys.has(keyOf(q))).toBe(true);
        const zs = ringPoints(surface.positions, ring).map((q) => q[2]);
        expect(deck[i][2]).toBe(Math.max(...zs));
        expect(bottom[i][2]).toBe(Math.min(...zs));
        // Never above the side profile's deck, never below its rocker.
        expect(deck[i][2]).toBeLessThanOrEqual(profile.deckAt(ring.station) + 1e-6);
        expect(bottom[i][2]).toBeGreaterThanOrEqual(profile.rockerAt(ring.station) - 1e-6);
        if (ring.station >= anchors[1].station && ring.station <= anchors[3].station) {
          expect(Math.abs(bottom[i][2] - profile.rockerAt(ring.station))).toBeLessThan(1e-6);
          expect(deck[i][1]).toBe(0);
          expect(bottom[i][1]).toBe(0);
          // Where the section's flat deck reaches the stringer uncut, the deck IS the side profile's.
          if (!cutAtStringer(input, ring.station)) {
            expect(Math.abs(deck[i][2] - profile.deckAt(ring.station))).toBeLessThan(1e-6);
            exact++;
          }
        }
      });
      expect(exact).toBeGreaterThan(50);
    });
  }
});

describe("the surface file is pure arrangement (SPEC prohibitions, D-05, C5)", () => {
  const source = readFileSync(join(__dirname, "board-surface.ts"), "utf8");
  it("never makes a section of its own: it reads boardSections", () => {
    expect(source).not.toMatch(/computeRailSection|buildRailProfile/);
    expect(source).toMatch(/boardSections\(/);
  });
  it("imports no React, three or browser API", () => {
    expect(source).not.toMatch(/from ["'](react|three)/);
    expect(source).not.toMatch(/document\.|window\./);
  });
  it("draws at the one fineness for screen and files", () => {
    expect(SURFACE_POINTS).toEqual({ deck: 48, rail: 32, bottom: 24, wall: 4 });
  });
});
