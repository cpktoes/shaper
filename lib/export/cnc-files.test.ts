import { describe, expect, it } from "vitest";
import {
  boardFileOutlineLoop,
  boardProfileLines,
  boardSlices,
  buildBoardSurface,
  meshCheck,
  type BoardSurface,
  type BoardSurfaceInput,
} from "../geometry/board-surface";
import { DEFAULT_BOTTOM, foamOff, resolveBottom, startingCut } from "../geometry/bottom";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../geometry/design";
import { buildOutline, foamHalfWidth, sampleOutline, tailCutStation } from "../geometry/outline";
import { BOARD_PRESETS } from "../geometry/presets";
import { mm } from "../geometry/units";
import { crossSectionStations } from "../geometry/volume";
import { curveHalfWidthAt, wingStepShape } from "../geometry/wings";
import { phase16Boards, phase16WingBoards } from "../geometry/__fixtures__/phase16-boards";
import { boardFileName, boardFileStem, BOARD_FILE_EXTENSION } from "../models/board-file";
import { CNC_LAYERS, cncFiles, cncZip, sliceFileName } from "./cnc-files";
import { DXF_POLYLINE_3D, DXF_VERTEX_3D, readDxf } from "./dxf";
import { readStl, stlHeader } from "./stl";
import { formatMm, readXyz } from "./xyz";
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

/** A point as the files write it, to three decimals — how a file's point is matched to a mesh vertex. */
const fileKey = (p: readonly number[]) => `${formatMm(p[0])} ${formatMm(p[1])} ${formatMm(p[2])}`;

/** Every vertex of a mesh, to the files' three decimals. */
function vertexFileKeys(surface: BoardSurface): Set<string> {
  const keys = new Set<string>();
  const p = surface.positions;
  for (let v = 0; v < p.length / 3; v++) keys.add(fileKey([p[3 * v], p[3 * v + 1], p[3 * v + 2]]));
  return keys;
}

/** The heavy sweep's per-test allowance (the export plus every reader, on a shared machine). */
const SWEEP_TIMEOUT_MS = 120_000;

describe("the whole export, on every preset and every swallow of the 40-board set (D-14, D-24, D-26)", () => {
  const sweep = BOARDS.filter((b) => /\|(asis|swallow)\|/.test(b.label));
  const presetName = (label: string) => {
    const preset = BOARD_PRESETS.find((p) => label.startsWith(`${p.id}|`));
    if (!preset) throw new Error(`no preset for ${label}`);
    return preset.name;
  };

  it.each(sweep.map((b) => [b.label, b] as const))(
    "%s",
    (_label, board) => {
      const surface = surfaceOf(board.fields);
      const name = presetName(board.label);
      const stem = boardFileStem(name);
      const zip = cncZip(surface, name);
      const entries = readZip(zip.data);
      const entry = (file: string) => {
        const found = entries.find((e) => e.name === file);
        if (!found) throw new Error(`no ${file} in ${zip.name}`);
        return found;
      };
      const text = (file: string) => new TextDecoder().decode(entry(file).data);
      const slices = boardSlices(surface);
      const keys = vertexFileKeys(surface);

      // The names are exactly D-14's set, in order, every CRC good.
      expect(zip.name).toBe(`${stem}-3d.zip`);
      expect(zip.sliceCount).toBe(slices.length);
      expect(entries.map((e) => e.name)).toEqual([
        `${stem}.dxf`,
        `${stem}.stl`,
        `${stem}-outline.txt`,
        `${stem}-profile.txt`,
        ...slices.map((_, i) => sliceFileName(stem, i, slices.length)),
      ]);
      expect(entries.filter((e) => /-slice-\d+\.txt$/.test(e.name)).length).toBe(zip.sliceCount);
      for (const e of entries) expect(e.crcOk, e.name).toBe(true);

      // Slice 01 is the first litres station with foam (on a swallow, not the tail tip).
      const geometry = buildOutline(board.fields.outline);
      const stations = crossSectionStations(board.fields.outline.length, tailCutStation(geometry));
      const withFoam = stations.filter((station) => foamHalfWidth(geometry, station) > 0);
      expect(slices.map((slice) => slice.station)).toEqual(withFoam);

      // Every slice file is its slice: the same loops, on its station, every point a vertex of the mesh.
      slices.forEach((slice, i) => {
        const loops = readXyz(text(sliceFileName(stem, i, slices.length)));
        expect(loops.length).toBe(slice.loops.length);
        loops.forEach((loop, k) => {
          expect(loop.length).toBe(slice.loops[k].length);
          loop.forEach((p, j) => {
            expect(fileKey(p)).toBe(fileKey(slice.loops[k][j]));
            expect(keys.has(fileKey(p))).toBe(true);
            expect(formatMm(p[0])).toBe(formatMm(slice.station));
          });
        });
      });
      // A swallow's slices inside the notch are two pieces; the first such slice is the tail's first.
      if (board.fields.outline.tail.kind === "swallow") {
        expect(slices[0].loops.length).toBe(2);
        expect(slices[0].station).toBeGreaterThan(stations[0]);
        expect(slices.some((slice) => slice.loops.length === 1)).toBe(true);
      }

      // The outline and the profile files: the mesh's own curves, the profile as deck then bottom.
      const outline = boardFileOutlineLoop(surface);
      const profile = boardProfileLines(surface);
      const outlineBack = readXyz(text(`${stem}-outline.txt`));
      expect(outlineBack.length).toBe(1);
      expect(outlineBack[0].map(fileKey)).toEqual(outline.map(fileKey));
      const profileBack = readXyz(text(`${stem}-profile.txt`));
      expect(profileBack.length).toBe(2);
      expect(profileBack[0].map(fileKey)).toEqual(profile.deck.map(fileKey));
      expect(profileBack[1].map(fileKey)).toEqual(profile.bottom.map(fileKey));
      for (const p of [...outlineBack[0], ...profileBack[0], ...profileBack[1]]) expect(keys.has(fileKey(p))).toBe(true);
      // z up toward the deck: the deck line never under the bottom line, and well above it mid-board.
      profile.deck.forEach((p, i) => expect(p[2]).toBeGreaterThanOrEqual(profile.bottom[i][2]));
      const middle = Math.floor(profile.deck.length / 2);
      expect(profile.deck[middle][2]).toBeGreaterThan(profile.bottom[middle][2]);

      // The DXF: one OUTLINE (closed), one PROFILE-DECK and one PROFILE-BOTTOM (open), one SLICES per loop.
      const dxf = readDxf(text(`${stem}.dxf`));
      const onLayer = (layer: string) => dxf.polylines.filter((p) => p.layer === layer);
      expect(onLayer(CNC_LAYERS.outline).length).toBe(1);
      expect(onLayer(CNC_LAYERS.deck).length).toBe(1);
      expect(onLayer(CNC_LAYERS.bottom).length).toBe(1);
      expect(onLayer(CNC_LAYERS.slices).length).toBe(slices.reduce((n, slice) => n + slice.loops.length, 0));
      expect(dxf.polylines.length).toBe(3 + onLayer(CNC_LAYERS.slices).length);
      expect(onLayer(CNC_LAYERS.outline)[0].flags).toBe(DXF_POLYLINE_3D + 1);
      expect(onLayer(CNC_LAYERS.deck)[0].flags).toBe(DXF_POLYLINE_3D);
      expect(onLayer(CNC_LAYERS.bottom)[0].flags).toBe(DXF_POLYLINE_3D);
      for (const p of onLayer(CNC_LAYERS.slices)) expect(p.flags).toBe(DXF_POLYLINE_3D + 1);
      for (const p of dxf.polylines) for (const flag of p.vertexFlags) expect(flag).toBe(DXF_VERTEX_3D);
      expect(onLayer(CNC_LAYERS.outline)[0].points.map(fileKey)).toEqual(outline.map(fileKey));
      expect(onLayer(CNC_LAYERS.deck)[0].points.map(fileKey)).toEqual(profile.deck.map(fileKey));
      expect(onLayer(CNC_LAYERS.bottom)[0].points.map(fileKey)).toEqual(profile.bottom.map(fileKey));
      const dxfSlices = onLayer(CNC_LAYERS.slices);
      let at = 0;
      for (const slice of slices) {
        for (const loop of slice.loops) {
          expect(dxfSlices[at].points.map(fileKey)).toEqual(loop.map(fileKey));
          at++;
        }
      }

      // Shape3D's frame: the tail at x = 0, the nose at the board's length, z = 0 at the bottom's lowest point.
      const stl = readStl(entry(`${stem}.stl`).data);
      expect(stl.count).toBe(surface.triangleCount);
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      for (const triangle of stl.triangles) {
        for (const p of triangle) {
          minX = Math.min(minX, p[0]);
          maxX = Math.max(maxX, p[0]);
          minZ = Math.min(minZ, p[2]);
        }
      }
      expect(formatMm(minX)).toBe(formatMm(0));
      expect(formatMm(maxX)).toBe(formatMm(surface.length));
      expect(formatMm(minZ)).toBe(formatMm(Math.min(...profile.bottom.map((p) => p[2]))));
      expect(formatMm(Math.min(...profile.bottom.map((p) => p[2])))).toBe(formatMm(0));
    },
    SWEEP_TIMEOUT_MS,
  );
});

describe("the CNC files carry the step TEMPLATE draws (R8, D-37)", () => {
  for (const label of ["wing|fish|square", "wing|shortboard|rounded"]) {
    it(
      label,
      () => {
        const board = phase16WingBoards().find((b) => b.label === label)!;
        const surface = surfaceOf(board.fields);
        const geometry = buildOutline(board.fields.outline);
        const { files, sliceCount } = cncFiles(surface, label);
        const text = (suffix: string) =>
          new TextDecoder().decode(files.find((file) => file.name.endsWith(suffix))!.data);

        // A point of the outline file at each corner of the step; a square step's two a hair apart.
        const outline = readXyz(text("-outline.txt"))[0].filter((p) => p[1] > 0);
        for (const wing of geometry.wings!) {
          for (const corner of wingStepShape(wing).points) {
            const width = curveHalfWidthAt(geometry, mm(corner.station)) - corner.inward;
            const near = outline.filter((p) => Math.abs(p[0] - corner.station) < 0.01);
            expect(near.some((p) => Math.abs(p[1] - width) < 0.01)).toBe(true);
          }
        }

        // The slices are the litres' own, each widest on TEMPLATE's outline.
        const stations = crossSectionStations(board.fields.outline.length, tailCutStation(geometry));
        const withFoam = stations.filter((station) => foamHalfWidth(geometry, station) > 0);
        expect(sliceCount).toBe(withFoam.length);
        boardSlices(surface).forEach((slice, i) => {
          const loops = readXyz(text(sliceFileName(boardFileStem(label), i, sliceCount)));
          const widest = Math.max(...loops.flat().map((p) => p[1]));
          expect(Math.abs(widest - sampleOutline(geometry, slice.station))).toBeLessThan(0.01);
        });
      },
      SWEEP_TIMEOUT_MS,
    );
  }
});

describe("the tips in the files: a tip's edge is never a slice, and the outline ends on it (D-34)", () => {
  for (const label of ["fish|asis|hard", "shortboard|pin|hard"]) {
    it(
      label,
      () => {
        const fields = boardFields(label);
        const surface = surfaceOf(fields);
        const geometry = buildOutline(fields.outline);
        const { files, sliceCount } = cncFiles(surface, label);
        const stations = crossSectionStations(fields.outline.length, tailCutStation(geometry));
        expect(sliceCount).toBe(stations.filter((station) => foamHalfWidth(geometry, station) > 0).length);
        expect(files.filter((file) => /-slice-\d+\.txt$/.test(file.name))).toHaveLength(sliceCount);
        const outlineFile = files.find((file) => file.name.endsWith("-outline.txt"))!;
        const outline = readXyz(new TextDecoder().decode(outlineFile.data))[0];
        const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
        const tip = outline.filter((p) => formatMm(p[0]) === formatMm(surface.length));
        expect(tip).toHaveLength(1);
        expect(tip[0][1]).toBe(0);
        expect(tip[0][2]).toBeGreaterThan(profile.rockerAt(surface.length));
        expect(tip[0][2]).toBeLessThan(profile.deckAt(surface.length));
      },
      SWEEP_TIMEOUT_MS,
    );
  }
});

describe("slice file names (D-14)", () => {
  it("count from the tail in two digits", () => {
    expect(sliceFileName("Fish", 0, 50)).toBe("Fish-slice-01.txt");
    expect(sliceFileName("Fish", 49, 50)).toBe("Fish-slice-50.txt");
    expect(sliceFileName("Fish", 98, 99)).toBe("Fish-slice-99.txt");
  });

  it("run to three digits, every one of them, past 99 slices (a synthetic slice list)", () => {
    const names = Array.from({ length: 120 }, (_, i) => sliceFileName("Long", i, 120));
    expect(names[0]).toBe("Long-slice-001.txt");
    expect(names[119]).toBe("Long-slice-120.txt");
    expect(names.every((name) => /^Long-slice-\d{3}\.txt$/.test(name))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("sort in board order as plain text", () => {
    const names = Array.from({ length: 50 }, (_, i) => sliceFileName("Fish", i, 50));
    expect([...names].sort()).toEqual(names);
  });
});

describe("the CNC files carry the bottom's cut (Phase 17, D-21)", () => {
  // The Shortboard with its Deep Single Concave at its starting numbers, read back from cncFiles' own slices.
  const fields = boardFields("shortboard|asis|hard");
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom = { ...structuredClone(DEFAULT_BOTTOM), center: startingCut("center", "Deep Single Concave", board) };
  const resolved = resolveBottom(bottom, board);
  const cutSurface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const flatSurface = surfaceOf(fields);
  const NAME = "Shortboard";

  /** The slice nearest a station, from the exported XYZ file itself, and the lowest point of its loop on the stringer. */
  function stringerBottomAt(surface: BoardSurface, station: number) {
    const { files } = cncFiles(surface, NAME);
    const slices = boardSlices(surface);
    const index = slices.reduce((best, slice, i) => (Math.abs(slice.station - station) < Math.abs(slices[best].station - station) ? i : best), 0);
    const file = files.find((f) => f.name === sliceFileName(boardFileStem(NAME), index, slices.length))!;
    const loops = readXyz(new TextDecoder().decode(file.data));
    const onStringer = loops.flat().filter((p) => Math.abs(p[1]) < 1e-6);
    return { station: slices[index].station, z: Math.min(...onStringer.map((p) => p[2])) };
  }

  it("the slice at the Deep Single's deepest station stands foamOff(station, 0) above the planed bottom at the stringer, within 0.05 mm", () => {
    const cut = stringerBottomAt(cutSurface, resolved.center.deepest);
    const flat = stringerBottomAt(flatSurface, resolved.center.deepest);
    expect(cut.station).toBe(flat.station);
    const lift = foamOff(resolved, board, cut.station, mm(0));
    expect(lift).toBeGreaterThan(0);
    expect(Math.abs(cut.z - flat.z - lift)).toBeLessThan(0.05);
  });

  it("the cut board's STL is still one closed skin, and its files still read back", () => {
    expect(meshCheck(cutSurface)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
    const { files, sliceCount } = cncFiles(cutSurface, NAME);
    expect(sliceCount).toBe(cncFiles(flatSurface, NAME).sliceCount);
    const stl = readStl(files.find((f) => f.name.endsWith(".stl"))!.data);
    expect(stl.triangles.length).toBe(cutSurface.indices.length / 3);
    expect(meshCheck(weld(stl.triangles))).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
    const dxf = readDxf(new TextDecoder().decode(files.find((f) => f.name.endsWith(".dxf"))!.data));
    expect(dxf.polylines.filter((p) => p.layer === CNC_LAYERS.slices).length).toBeGreaterThanOrEqual(sliceCount);
  });
});
