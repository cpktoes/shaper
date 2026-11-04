import { describe, expect, it } from "vitest";
import { buildBoardSurface, enclosedVolumeMm3, meshCheck, surfaceStations, type BoardSurfaceInput } from "./board-surface";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES, type DesignSummaryFields } from "./design";
import { foilStationPoints } from "./foil";
import { buildOutline, tailCutStation } from "./outline";
import { computeCrossSectionVolume, crossSectionStations } from "./volume";
import { phase16Boards } from "./__fixtures__/phase16-boards";

/**
 * The 3D board's surface (Phase 16, D-05): the litres' own sections lofted along the rocker. Every expected
 * figure here is the app's own — VOLUME's litres, the side profile's rocker and deck, the litres' stations —
 * never a typed number (Rule 1).
 */

/** A board's surface input, built exactly as the litres build theirs, and its side profile. */
function surfaceInputOf(fields: DesignSummaryFields) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const sections = designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  const input: BoardSurfaceInput = { sections, geometry, rockerAt: profile.rockerAt };
  return { input, profile };
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

const BOARDS = phase16Boards();
const boardOf = (label: string) => BOARDS.find((board) => board.label === label)!.fields;

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
