import { describe, expect, it } from "vitest";
import { boardSlices, buildBoardSurface, meshCheck, type BoardSurface, type BoardSurfaceInput } from "../geometry/board-surface";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../geometry/design";
import { buildOutline } from "../geometry/outline";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { boardFileName, boardFileStem, BOARD_FILE_EXTENSION } from "../models/board-file";
import { cncFiles, cncZip } from "./cnc-files";
import { readStl, stlHeader } from "./stl";
import { readZip } from "./zip";

/**
 * The CNC files (Phase 16, D-14, D-16, D-24, D-26). Every expected figure is the app's own — the surface's
 * triangle count and vertices, its slices, the board file's own stem — read back through each format's own
 * reader; never a typed number (Rule 1).
 */

/** A board's surface, built exactly as the 3D screen and the litres build theirs. */
function surfaceOf(fields: DesignSummaryFields): BoardSurface {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const sections = designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  const input: BoardSurfaceInput = { sections, geometry, rockerAt: profile.rockerAt };
  return buildBoardSurface(input);
}

const BOARDS = phase16Boards();
const boardFields = (label: string) => {
  const board = BOARDS.find((b) => b.label === label);
  if (!board) throw new Error(`no board ${label}`);
  return board.fields;
};

const FISH_NAME = `Fish 5'10"`;
const fish = surfaceOf(boardFields("fish|asis|hard"));

/**
 * The STL's triangles welded back into an indexed mesh: corners with the very same float32 bit patterns
 * are one vertex. A closed skin stays closed only if every shared corner was written identically.
 */
function weld(triangles: readonly (readonly (readonly number[])[])[]): { positions: number[]; indices: number[] } {
  const bits = new Float32Array(3);
  const asBits = new Uint32Array(bits.buffer);
  const index = new Map<string, number>();
  const positions: number[] = [];
  const indices: number[] = [];
  for (const triangle of triangles) {
    for (const corner of triangle) {
      bits[0] = corner[0];
      bits[1] = corner[1];
      bits[2] = corner[2];
      const key = `${asBits[0]},${asBits[1]},${asBits[2]}`;
      let v = index.get(key);
      if (v === undefined) {
        v = positions.length / 3;
        index.set(key, v);
        positions.push(corner[0], corner[1], corner[2]);
      }
      indices.push(v);
    }
  }
  return { positions, indices };
}

describe("cncZip: one board's surface out as a zip with its STL (the tracer)", () => {
  const zip = cncZip(fish, FISH_NAME);
  const entries = readZip(zip.data);
  const stlEntry = entries.find((entry) => entry.name === `${boardFileStem(FISH_NAME)}.stl`);

  it("is named from the board's name exactly as Save board as file… names it", () => {
    expect(zip.name).toBe(`${boardFileStem(FISH_NAME)}-3d.zip`);
    expect(zip.name).toBe("Fish 5'10-3d.zip");
    expect(boardFileName(FISH_NAME)).toBe(`${boardFileStem(FISH_NAME)}${BOARD_FILE_EXTENSION}`);
  });

  it("reads back whole: every entry's CRC checks", () => {
    expect(entries.length).toBe(cncFiles(fish, FISH_NAME).files.length);
    for (const entry of entries) expect(entry.crcOk, entry.name).toBe(true);
  });

  it("holds an STL of the very triangles the surface carries", () => {
    expect(stlEntry).toBeDefined();
    const stl = readStl(stlEntry!.data);
    expect(stl.count).toBe(fish.triangleCount);
    expect(stl.triangles.length).toBe(fish.triangleCount);
    // Each corner is the surface's own vertex, to float32's precision.
    for (const t of [0, Math.floor(fish.triangleCount / 2), fish.triangleCount - 1]) {
      for (let k = 0; k < 3; k++) {
        const v = fish.indices[3 * t + k];
        for (let j = 0; j < 3; j++) expect(stl.triangles[t][k][j]).toBe(Math.fround(fish.positions[3 * v + j]));
      }
    }
  });

  it("is watertight once identical float32 corners are welded", () => {
    const stl = readStl(stlEntry!.data);
    expect(meshCheck(weld(stl.triangles))).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
  });

  it("has an ASCII header that never begins with `solid` and says millimetres", () => {
    const stl = readStl(stlEntry!.data);
    expect(stl.header).toBe(stlHeader(boardFileStem(FISH_NAME)));
    expect(stl.header.startsWith("solid")).toBe(false);
    expect(stl.header.endsWith(" mm")).toBe(true);
    expect(Array.from(stlEntry!.data.subarray(0, 80)).every((byte) => byte >= 0x20 && byte <= 0x7e)).toBe(true);
  });

  it("quotes the surface's own slice count", () => {
    expect(zip.sliceCount).toBe(boardSlices(fish).length);
  });

  it("zips the same board to the same bytes every time", () => {
    const again = cncZip(fish, FISH_NAME);
    expect(again.data.length).toBe(zip.data.length);
    expect(Buffer.from(again.data).equals(Buffer.from(zip.data))).toBe(true);
  });
});

describe("the export's names never leave the zip's top folder (T-16-10)", () => {
  it.each([["../../etc/passwd"], ["a/b"], ["C:\\x"], [".hidden"], ["..\\..\\x"]])("%j", (name) => {
    for (const file of cncFiles(fish, name).files) {
      expect(file.name).not.toMatch(/[/\\:]/);
      expect(file.name.startsWith(".")).toBe(false);
      expect(file.name.startsWith(boardFileStem(name))).toBe(true);
    }
    expect(cncZip(fish, name).name).toBe(`${boardFileStem(name)}-3d.zip`);
  });

  it("masks a name's non-ASCII letters in the STL header", () => {
    const name = "Café 🏄 board";
    const header = stlHeader(boardFileStem(name));
    expect(/^[\x20-\x7e]*$/.test(header)).toBe(true);
    expect(header).toBe(`Shaper Assistant board ${Array.from(boardFileStem(name), (ch) => (/^[\x20-\x7e]$/.test(ch) ? ch : "?")).join("")} mm`);
  });

  it("keeps a long name's header to 80 bytes, ` mm` included", () => {
    const header = stlHeader(boardFileStem("x".repeat(300)));
    expect(header.length).toBeLessThanOrEqual(80);
    expect(header.endsWith(" mm")).toBe(true);
  });
});
